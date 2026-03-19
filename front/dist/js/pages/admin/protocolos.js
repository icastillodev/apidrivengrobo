import { API } from '../../api.js';

let allProtocols = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idprotA', direction: 'desc' };
let formDataCache = null; // Cache para configuración y listas (Usuarios, Deptos, etc.)
let openedFromUrl = false;
const PRIVILEGED_ROLES = new Set([1, 2, 4]);

function isRedProtocol(p) {
    return String(p?.TipoAprobacion || '').toUpperCase() === 'RED';
}

function getScopeType(p) {
    if (isRedProtocol(p)) return 'red';
    const extFlag = Number(p?.DeptoExternoFlag || 1);
    return extFlag === 2 ? 'externo' : 'interno';
}

function escapeHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function validateProtocolAttachmentInput(file) {
    if (!file) return { ok: true };
    const isPdfExt = /\.pdf$/i.test(file.name || '');
    const isPdfMime = (file.type || '').toLowerCase() === 'application/pdf';
    if (!isPdfExt || !isPdfMime) {
        return { ok: false, reason: 'type' };
    }
    if (Number(file.size || 0) > (2 * 1024 * 1024)) {
        return { ok: false, reason: 'size' };
    }
    return { ok: true };
}

function getNetworkStatusBadge(status) {
    const txt = window.txt?.admin_protocolos || {};
    const code = Number(status);
    if (code === 1) return `<span class="badge bg-success">${txt.red_estado_aprobada || 'APROBADA'}</span>`;
    if (code === 2 || code === 4) return `<span class="badge bg-danger">${txt.red_estado_rechazada || 'RECHAZADA'}</span>`;
    if (code === 3) return `<span class="badge bg-warning text-dark">${txt.red_estado_revision || 'EN REVISIÓN'}</span>`;
    return `<span class="badge bg-secondary">${txt.red_estado_no_enviada || 'NO ENVIADA'}</span>`;
}

function isPrivilegedAdmin() {
    const role = Number(localStorage.getItem('userLevel') || sessionStorage.getItem('userLevel') || 0);
    return PRIVILEGED_ROLES.has(role);
}

export async function initProtocolosPage() {
    const instId = localStorage.getItem('instId');
    const instName = localStorage.getItem('NombreInst') || 'Institución';
    const bread = document.getElementById('institucionbread');
    if(bread) bread.innerText = instName;
    console.group('[PROTO-DEBUG] initProtocolosPage');
    console.log('instId:', instId, 'instName:', instName);

    // Actualizar badge de solicitudes pendientes
    updateRequestsBadge();

    try {
        // 1. Cargar Configuración Inicial (incluye has_network, usuarios, deptos, etc.)
        const conf = await API.request(`/protocols/form-data?inst=${instId}`);
        console.log('[PROTO-DEBUG] /protocols/form-data raw:', conf);
        formDataCache = conf.data;
        console.log('[PROTO-DEBUG] formDataCache parsed:', {
            has_network: !!formDataCache?.has_network,
            users: Array.isArray(formDataCache?.users) ? formDataCache.users.length : 'null',
            depts: Array.isArray(formDataCache?.depts) ? formDataCache.depts.length : 'null',
            types: Array.isArray(formDataCache?.types) ? formDataCache.types.length : 'null'
        });
        
        // 2. Configurar visibilidad de filtros prioritarios (Origen / Ámbito)
        const filterOrigin = document.getElementById('filter-origin');
        const labelOrigin = document.getElementById('label-origin');
        const filterScope = document.getElementById('filter-scope');
        const labelScope = document.getElementById('label-scope');
        if (filterOrigin && labelOrigin && filterScope && labelScope) {
            filterOrigin.classList.remove('d-none');
            labelOrigin.classList.remove('d-none');
            filterScope.classList.remove('d-none');
            labelScope.classList.remove('d-none');

            // Opción "RED" visible solo si la institución trabaja en red
            const optRedOrigin = filterOrigin.querySelector('option[value="red"]');
            if (optRedOrigin) {
                if (formDataCache.has_network) {
                    optRedOrigin.classList.remove('d-none');
                } else {
                    optRedOrigin.classList.add('d-none');
                    if (filterOrigin.value === 'red') filterOrigin.value = 'all';
                }
            }

            const optRedScope = filterScope.querySelector('option[value="red"]');
            if (optRedScope) {
                if (formDataCache.has_network) {
                    optRedScope.classList.remove('d-none');
                } else {
                    optRedScope.classList.add('d-none');
                    if (filterScope.value === 'red') filterScope.value = 'all';
                }
            }
        }

        // 3. Cargar Protocolos
        const res = await API.request(`/protocols/institution?inst=${instId}`);
        console.log('[PROTO-DEBUG] /protocols/institution raw:', res);
        if (res && res.status === 'success') {
            allProtocols = res.data;
            console.log('[PROTO-DEBUG] protocolos cargados:', Array.isArray(allProtocols) ? allProtocols.length : 'no-array');
            if (Array.isArray(allProtocols) && allProtocols.length > 0) {
                console.log('[PROTO-DEBUG] primer protocolo sample:', allProtocols[0]);
            }
            updateOriginRedIndicator();
            updateStatsBar();
            renderTableHeader();
            renderTable();
            openProtocolFromUrlIfNeeded();
        } else {
            console.error('[PROTO-DEBUG] /protocols/institution status != success:', res);
        }
    } catch (error) {
        console.error("[PROTO-DEBUG] EXCEPTION initProtocolosPage:", error);
        try {
            console.error('[PROTO-DEBUG] error.message:', error?.message);
            console.error('[PROTO-DEBUG] error.stack:', error?.stack);
        } catch (_) {}
    } finally {
        console.groupEnd();
    }

    // --- EVENTOS ---
    // Inicializar tipo de búsqueda dinámico (y enganchar auto-filtro)
    updateSearchInputType();
    
    // Botón Buscar
    document.getElementById('btn-search-prot').onclick = () => { currentPage = 1; renderTable(); };
    
    // Cambio en el tipo de filtro (Para cambiar Input por Select)
    document.getElementById('filter-type-prot').addEventListener('change', updateSearchInputType);
    document.getElementById('filter-origin')?.addEventListener('change', () => {
        currentPage = 1;
        renderTable();
    });
    document.getElementById('filter-scope')?.addEventListener('change', () => {
        currentPage = 1;
        renderTable();
    });

    // Exportar Excel
    document.getElementById('btn-excel-prot').onclick = exportToExcel;
    
    // Botón Ayuda
    const btnAyuda = document.getElementById('btn-ayuda-prot');
    if (btnAyuda) {
        btnAyuda.onclick = () => new bootstrap.Modal(document.getElementById('modal-protocol-help')).show();
    }
}

function openProtocolFromUrlIfNeeded() {
    if (openedFromUrl) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const action = (params.get('action') || '').toLowerCase();
    if (!id || (action && action !== 'view' && action !== 'edit')) return;

    const protocol = allProtocols.find(p => String(p.idprotA) === String(id));
    if (!protocol) return;
    openedFromUrl = true;
    setTimeout(() => window.openProtocolModal(protocol), 200);
}

// --- LÓGICA DE FILTROS DINÁMICOS ---
function updateSearchInputType() {
    const type = document.getElementById('filter-type-prot').value;
    const container = document.getElementById('dynamic-search-container');
    let html = '';

    // Si filtra por TIPO -> Mostrar Select con Tipos cargados
    if (type === 'TipoNombre') {
        let opts = `<option value="">-- Todos los Tipos --</option>`;
        if(formDataCache && formDataCache.types) {
            formDataCache.types.forEach(t => opts += `<option value="${t.NombreTipoprotocolo}">${t.NombreTipoprotocolo}</option>`);
        }
        html = `<select id="search-input-prot" class="form-select form-select-sm border-start-0 fw-bold">${opts}</select>`;
    } 
    // Si filtra por DEPARTAMENTO -> Mostrar Select con Deptos cargados
    else if (type === 'DeptoFormat') {
        let opts = `<option value="">-- Todos los Departamentos --</option>`;
        if(formDataCache && formDataCache.depts) {
            formDataCache.depts.forEach(d => opts += `<option value="${d.NombreDeptoA}">${d.NombreDeptoA}</option>`);
        }
        html = `<select id="search-input-prot" class="form-select form-select-sm border-start-0 fw-bold">${opts}</select>`;
    }
    // Si filtra por VENCIMIENTO -> Select Vigente/Vencido
    else if (type === 'Vencimiento') {
        const t = window.txt?.generales;
        html = `<select id="search-input-prot" class="form-select form-select-sm border-start-0 fw-bold">
                    <option value="">-- ${t?.todos ?? 'Todos'} --</option>
                    <option value="vigente">${t?.vigentes ?? 'Vigentes'}</option>
                    <option value="vencido">${t?.vencidos ?? 'Vencidos'}</option>
                </select>`;
    }
    else if (type === 'AmbitoAdmin') {
        const txt = window.txt?.admin_protocolos;
        html = `<select id="search-input-prot" class="form-select form-select-sm border-start-0 fw-bold">
                    <option value="">-- ${(window.txt?.generales?.todos ?? 'Todos')} --</option>
                    <option value="interno">${txt?.filter_internos ?? 'INTERNOS'}</option>
                    <option value="externo">${txt?.filter_externos ?? 'EXTERNOS'}</option>
                    ${(formDataCache?.has_network ? `<option value="red">${txt?.filter_red ?? 'RED'}</option>` : '')}
                </select>`;
    }
    // Default -> Input Texto
    else {
        html = `<input type="text" id="search-input-prot" class="form-control form-control-sm border-start-0" placeholder="${(window.txt?.generales?.escribebuscar || 'Escribe para buscar...')}">`;
    }
    container.innerHTML = html;

    // Auto-búsqueda según tipo de control
    const inputEl = document.getElementById('search-input-prot');
    if (inputEl) {
        const triggerSearch = () => {
            currentPage = 1;
            renderTable();
        };

        if (inputEl.tagName === 'INPUT') {
            inputEl.addEventListener('input', triggerSearch);
            inputEl.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') triggerSearch();
            });
        } else {
            inputEl.addEventListener('change', triggerSearch);
        }
    }
}

// --- ESTADÍSTICAS ---
function updateStatsBar() {
    const total = allProtocols.length;
    const today = new Date().toISOString().split('T')[0];
    const vencidos = allProtocols.filter(p => p.Vencimiento && p.Vencimiento < today).length;
    const activos = total - vencidos;

    document.getElementById('protocol-stats').innerHTML = `
        <div class="stat-item fw-bold text-primary"><i class="bi bi-folder2-open me-1"></i> TOTAL: ${total}</div>
        <div class="stat-item fw-bold text-success"><i class="bi bi-check-circle me-1"></i> VIGENTES: ${activos}</div>
        <div class="stat-item fw-bold text-danger"><i class="bi bi-exclamation-triangle me-1"></i> VENCIDOS: ${vencidos}</div>
    `;
}

// --- RENDERIZADO TABLA ---
function renderTableHeader() {
    const thead = document.querySelector('#main-table-prot thead');
    let html = `
        <tr>
            <th data-key="idprotA" class="py-3 px-2 cursor-pointer" onclick="window.sortTable('idprotA')">ID</th>
            <th data-key="nprotA" class="py-3 px-2 cursor-pointer" onclick="window.sortTable('nprotA')">N° Prot.</th>
            <th data-key="tituloA" class="py-3 px-2 cursor-pointer" onclick="window.sortTable('tituloA')">Título</th>
            <th data-key="InvestigadorACargA" class="py-3 px-2">Responsable de proyecto</th>
            <th data-key="ResponsableFormat" class="py-3 px-2">Responsable protocolo</th>
            <th data-key="DeptoFormat" class="py-3 px-2">Departamento</th>
            <th data-key="DeptoExternoFlag" class="py-3 px-2 text-center" style="width: 80px;">Ámbito</th>
            <th data-key="TipoNombre" class="py-3 px-2 text-center">Tipo</th>
            <th data-key="RedConfigCompleta" class="py-3 px-2 text-center">Estado Red</th>
            <th data-key="AnimalesUsados" class="py-3 px-2 text-center">Gastados</th>
            <th data-key="SaldoAnimales" class="py-3 px-2 text-center">Saldo</th>
    `;

    // Columna Origen (red) solo si hay red
    if (formDataCache && formDataCache.has_network) {
        html += `<th data-key="OrigenRed" class="py-3 px-2 text-center">Origen</th>`;
    }

    html += `
            <th data-key="FechaFinProtA" class="py-3 px-2">Vence</th>
        </tr>
    `;
    thead.innerHTML = html;
}

window.sortTable = (key) => {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else { sortConfig.key = key; sortConfig.direction = 'asc'; }
    renderTable();
};

function renderTable() {
    const tbody = document.getElementById('table-body-protocols');
    const data = getFilteredAndSortedData();
    console.log('[PROTO-DEBUG] renderTable total filtered:', Array.isArray(data) ? data.length : 'no-array');
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const today = new Date().toISOString().split('T')[0];

    tbody.innerHTML = '';
    if(pageData.length === 0) {
        console.warn('[PROTO-DEBUG] renderTable pageData vacio', {
            currentPage,
            rowsPerPage,
            totalFiltered: Array.isArray(data) ? data.length : 'no-array',
            filterType: document.getElementById('filter-type-prot')?.value,
            filterOrigin: document.getElementById('filter-origin')?.value,
            filterScope: document.getElementById('filter-scope')?.value,
            term: (document.getElementById('search-input-prot')?.value || '').trim()
        });
        tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">No se encontraron protocolos.</td></tr>';
        return;
    }

    pageData.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = (e) => window.openProtocolModal(p);
        const redCount = Number(p.RedAprobadaCount || 0);
        const redBadgeText = window.txt?.admin_protocolos?.red_badge || 'RED';
        
        // Columna Tipo: solo nombre del tipo
        const tipoHtml = `<span class="fw-bold text-dark">${p.TipoNombre || '---'}</span>`;

        // Columna Ámbito (RED / Interno / Externo)
        const scopeType = getScopeType(p);
        let ambitoHtml = '';
        if (scopeType === 'red') {
            const labelRed = window.txt?.admin_protocolos?.filter_red || 'RED';
            ambitoHtml = `<span class="badge bg-info text-white" style="font-size:9px;">${labelRed}</span>`;
        } else if (scopeType === 'externo') {
            const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
            ambitoHtml = `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>`;
        } else {
            const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
            ambitoHtml = `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;
        }

        // Columna Origen (Solo si hay red)
        let origenTd = '';
        if (formDataCache && formDataCache.has_network) {
            let origenText = `<span class="badge bg-light text-secondary border">PROPIA</span>`;
            if (isRedProtocol(p)) {
                origenText = `<span class="badge bg-info text-white" title="Protocolo de Red">RED</span><br><span class="small text-muted" style="font-size:9px">Creada en: ${p.InstitucionOrigen}</span>`;
            }
            origenTd = `<td class="text-center px-2 align-middle">${origenText}</td>`;
        }

        let redConfigHtml = '<span class="text-muted">-</span>';
        if (isRedProtocol(p)) {
            const done = Number(p.RedConfigCompleta || 0) === 1;
            if (done) {
                redConfigHtml = `<span class="badge bg-success">${window.txt?.admin_protocolos?.red_cfg_completa || 'Completa'}</span>`;
            } else {
                redConfigHtml = `<span class="badge bg-danger">${window.txt?.admin_protocolos?.red_cfg_falta || 'Falta rellenar'}</span>`;
            }
        }

        // Columna Vencimiento: Rojo si vencido
        let fechaStyle = "small px-2 fw-bold text-secondary";
        let fechaText = p.Vencimiento || '-';
        if (p.Vencimiento && p.Vencimiento < today) {
            fechaStyle = "small px-2 fw-bold text-danger text-decoration-underline";
            fechaText += " (Vencido)";
        }

        tr.innerHTML = `
            <td class="text-muted small px-2">${p.idprotA}</td>
            <td class="fw-bold text-primary px-2">${p.nprotA}</td>
            <td class="small text-wrap px-2" style="max-width: 220px;">
                ${p.tituloA || '---'}
                ${redCount > 0 ? `<div class="mt-1"><span class="badge bg-info text-white" style="font-size:9px;">${redBadgeText}: ${redCount}</span><span class="small text-muted ms-1">${window.txt?.admin_protocolos?.red_verificar_modal || 'Verificar en el modal'}</span></div>` : ''}
            </td>
            <td class="small px-2">${p.InvestigadorACargA || '---'}</td>
            <td class="small fw-bold px-2 text-muted" style="font-size:10px;">${p.ResponsableFormat || '---'}</td>
            <td class="small text-muted px-2">${p.DeptoFormat || p.DeptoOriginal || '-'}</td>
            <td class="text-center px-2 align-middle">${ambitoHtml}</td>
            <td class="text-center px-2 align-middle">${tipoHtml}</td>
            <td class="text-center px-2 align-middle">${redConfigHtml}</td>
            <td class="text-center px-2 small fw-bold text-secondary">${p.AnimalesUsados ?? 0}</td>
            <td class="text-center px-2 small fw-bold ${ (p.SaldoAnimales ?? 0) <= 0 ? 'text-danger' : 'text-success' }">${p.SaldoAnimales ?? 0}</td>
            ${origenTd}
            <td class="${fechaStyle}">${fechaText}</td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(data.length, 'pagination-prot', renderTable);
}

function getFilteredAndSortedData() {
    const filterType = document.getElementById('filter-type-prot').value;
    const filterOrigin = document.getElementById('filter-origin')?.value || 'all';
    const filterScope = document.getElementById('filter-scope')?.value || 'all';
    
    // Obtenemos el valor sea input o select dinámico
    let inputEl = document.getElementById('search-input-prot');
    const term = inputEl ? inputEl.value.toLowerCase().trim() : '';
    
    const today = new Date().toISOString().split('T')[0];

    let data = allProtocols.filter(p => {
        // Filtro de origen (Propios / Red)
        if (filterOrigin === 'propio' && isRedProtocol(p)) return false;
        if (filterOrigin === 'red' && !isRedProtocol(p)) return false;

        // Filtro de ámbito (Interno / Externo / Red)
        const scopeType = getScopeType(p);
        if (filterScope !== 'all' && scopeType !== filterScope) return false;

        // Filtro de Búsqueda
        if (!term) return true;

        if (filterType === 'Vencimiento') {
            if (term === 'vencido') return (p.Vencimiento && p.Vencimiento < today);
            if (term === 'vigente') return (!p.Vencimiento || p.Vencimiento >= today);
            return true;
        }

        if (filterType === 'all') {
            const raw = JSON.stringify(p).toLowerCase();
            if (raw.includes(term)) return true;
            const scope = scopeType;
            const scopeWords = scope === 'interno'
                ? 'interno internos'
                : (scope === 'externo' ? 'externo externos' : 'red');
            const originWords = isRedProtocol(p) ? 'red' : 'propio propia propios propias';
            return `${scopeWords} ${originWords}`.includes(term);
        }
        
        // Búsqueda en columna específica (Funciona para ID, Titulo, etc.)
        // Al convertir a String, el ID numérico se vuelve texto y el includes funciona perfecto.
        const val = String(p[filterType] || '').toLowerCase();
        return val.includes(term);
    });

    // 3. Ordenamiento
    data.sort((a, b) => {
        let valA = a[sortConfig.key] || ''; let valB = b[sortConfig.key] || '';
        const factor = sortConfig.direction === 'asc' ? 1 : -1;
        
        // Detección numérica para ordenar IDs correctamente
        if(!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
            return (valA - valB) * factor;
        }
        return valA.toString().localeCompare(valB.toString()) * factor;
    });
    return data;
}

function updateOriginRedIndicator() {
    const filterOrigin = document.getElementById('filter-origin');
    if (!filterOrigin) return;
    const optRed = filterOrigin.querySelector('option[value="red"]');
    if (!optRed) return;
    const badge = document.getElementById('origin-alert-badge');

    const base = window.txt?.admin_protocolos?.filter_red || 'RED';
    const redTotal = allProtocols.filter(p => isRedProtocol(p)).length;
    const pending = allProtocols.filter(p => isRedProtocol(p) && Number(p.RedConfigCompleta || 0) !== 1).length;

    // En opción RED mostrar cuántos hay
    optRed.textContent = redTotal > 0 ? `${base} (${redTotal})` : base;

    // Badge rojo junto a "Origen" para pendientes de completar
    if (badge) {
        if (pending > 0) {
            badge.classList.remove('d-none');
            badge.textContent = `${window.txt?.admin_protocolos?.red_cfg_falta_short || 'falta'}: ${pending}`;
            badge.title = window.txt?.admin_protocolos?.red_cfg_falta_title || 'Protocolos de red pendientes de completar';
        } else {
            badge.classList.add('d-none');
            badge.textContent = '0';
            badge.title = '';
        }
    }
}
function renderPagination(totalItems, containerId, renderFunc) {
    const pag = document.getElementById(containerId);
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    pag.innerHTML = ''; 
    
    if (totalPages <= 1) return;

    const createBtn = (label, pageNum, isDisabled, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
        if (!isDisabled) {
            li.onclick = (e) => { 
                e.preventDefault(); 
                currentPage = pageNum; 
                renderFunc(); 
            };
        }
        return li;
    };

    pag.appendChild(createBtn('«', currentPage - 1, currentPage === 1));
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        pag.appendChild(createBtn(i, i, false, i === currentPage));
    }
    pag.appendChild(createBtn('»', currentPage + 1, currentPage === totalPages));
}

async function updateRequestsBadge() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/protocols/requests/count?inst=${instId}`);
        const badge = document.getElementById('badge-requests');
        if(badge) {
            if(res.status === 'success' && res.count > 0) {
                badge.innerText = res.count;
                badge.classList.remove('d-none');
                badge.classList.add('badge-pulse');
            } else { badge.classList.add('d-none'); }
        }
    } catch(e) {}
}

// --- MODAL DE CREACIÓN / EDICIÓN ---

window.openProtocolModal = async (p = null) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-prot');
    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-secondary"></div></div>`;
    new bootstrap.Modal(document.getElementById('modal-protocol')).show();

    if (!formDataCache) {
        const res = await API.request(`/protocols/form-data?inst=${instId}`);
        formDataCache = res.data;
    }

    let currentSpeciesIds = [];
    let protocolAttachments = [];
    if (p) {
        const resSpec = await API.request(`/protocols/current-species?id=${p.idprotA}`);
        if (resSpec.status === 'success') currentSpeciesIds = resSpec.data;

        const resAtt = await API.request(`/protocols/attachments-by-protocol?idprot=${p.idprotA}`);
        if (resAtt && resAtt.status === 'success' && Array.isArray(resAtt.data)) {
            protocolAttachments = resAtt.data;
        }
    }

    const showOtrosCeuas = false; // Funcionalidad Otros CEUAS retirada

    const usados = p?.AnimalesUsados ?? 0;
    const saldo = p?.SaldoAnimales ?? (p?.CantidadAniA ?? 0);
    const totalAprob = p ? (p.AnimalesTotales ?? (usados + saldo)) : 0;

    const extFlag = p ? Number(p.DeptoExternoFlag || 1) : 1;
    const isExtLocal = (extFlag === 2);
    const txtProt = window.txt?.admin_protocolos || {};
    const redApprovedCount = Number(p?.RedAprobadaCount || 0);
    const redApprovedNamesRaw = String(p?.RedAprobadaInstituciones || '').trim();
    const redApprovedNames = redApprovedNamesRaw ? redApprovedNamesRaw.split('|').map(x => x.trim()).filter(Boolean) : [];
    const effectiveUserId = p?.IdUsrEditable ?? p?.IdUsrA;
    const effectiveDepto = p?.DeptoEditable ?? p?.departamento;
    const effectiveTipo = p?.TipoEditable ?? p?.tipoprotocolo;
    const effectiveSeveridad = p?.SeveridadEditable ?? p?.severidad;
    let networkStatusRows = [];
    if (p?.idprotA) {
        try {
            const netRes = await API.request(`/protocols/network-status?idprot=${p.idprotA}`);
            if (netRes?.status === 'success' && Array.isArray(netRes.data)) {
                networkStatusRows = netRes.data;
            }
        } catch (_) {}
    }
    const currentInstId = Number(localStorage.getItem('instId') || 0);
    const isLocalProtocol = p ? Number(p.IdInstitucion || 0) === currentInstId : false;
    const hasSolicitudLocal = p ? Number(p.TieneSolicitudLocal || 0) === 1 : false;
    const canDeleteManual = Boolean(p && isPrivilegedAdmin() && isLocalProtocol && !hasSolicitudLocal);
    const canRejectSolicitud = Boolean(p && isPrivilegedAdmin() && isLocalProtocol && Number(p.IdSolicitudLocalAprobada || 0) > 0);
    const canTransmitToNetwork = Boolean(p && isPrivilegedAdmin() && isLocalProtocol && formDataCache?.has_network);
    const canManageManualAttachments = Boolean(isPrivilegedAdmin() && (!p || (isLocalProtocol && !hasSolicitudLocal)));
    const usersForSelect = [...(formDataCache.users || [])];
    if (p && effectiveUserId && !usersForSelect.some(u => String(u.IdUsrA) === String(effectiveUserId))) {
        usersForSelect.unshift({
            IdUsrA: effectiveUserId,
            ApellidoA: '',
            NombreA: '',
            UsrA: '',
            __extraLabel: p.ResponsableOrigenFormat || p.ResponsableFormat || `ID:${effectiveUserId}`
        });
    }
    const manualAttachmentInputs = canManageManualAttachments ? `
            <div class="col-12 mt-2 mb-2 p-2 border rounded bg-white">
                <label class="form-label small fw-bold text-muted mb-2">${txtProt.label_adjuntos_subida || 'Adjuntar PDFs (manuales)'}</label>
                <div class="row g-2">
                    <div class="col-md-4">
                        <label class="small text-muted d-block mb-1">${txtProt.adjunto_slot_1 || 'Adjunto 1'}</label>
                        <input type="file" name="adjunto1" class="form-control form-control-sm" accept="application/pdf,.pdf">
                    </div>
                    <div class="col-md-4">
                        <label class="small text-muted d-block mb-1">${txtProt.adjunto_slot_2 || 'Adjunto 2'}</label>
                        <input type="file" name="adjunto2" class="form-control form-control-sm" accept="application/pdf,.pdf">
                    </div>
                    <div class="col-md-4">
                        <label class="small text-muted d-block mb-1">${txtProt.adjunto_slot_3 || 'Adjunto 3'}</label>
                        <input type="file" name="adjunto3" class="form-control form-control-sm" accept="application/pdf,.pdf">
                    </div>
                </div>
                <div class="small text-muted mt-2">${txtProt.adjuntos_help || 'Solo PDF, máximo 2MB por archivo.'}</div>
            </div>
    ` : '';
    const attachmentsBlock = p ? `
            <div class="col-12 mt-2 mb-2 p-2 border rounded bg-light">
                <label class="form-label small fw-bold text-muted mb-2">${txtProt.label_adjuntos || 'Adjuntos'}</label>
                <div class="d-flex flex-wrap gap-2">
                    ${protocolAttachments.length > 0
                        ? protocolAttachments.map(att => `
                            <button type="button"
                                    class="btn btn-outline-primary btn-sm"
                                    onclick="window.downloadProtocolAttachment(${Number(att.IdManualAdjuntoProtocolo || att.Id_adjuntos_protocolos)}, '${String(att.source || 'solicitud')}')">
                                <i class="bi bi-paperclip me-1"></i>${escapeHtml(att.nombre_original || `Adjunto ${att.tipoadjunto || ''}`)}
                            </button>
                            ${canManageManualAttachments && String(att.source || '') === 'manual'
                                ? `<button type="button"
                                           class="btn btn-outline-danger btn-sm"
                                           title="${txtProt.btn_borrar_adjunto || 'Borrar adjunto'}"
                                           onclick="window.deleteManualProtocolAttachment(${Number(att.IdManualAdjuntoProtocolo)})">
                                       <i class="bi bi-trash"></i>
                                   </button>`
                                : ''
                            }
                          `).join('')
                        : `<span class="small text-muted">${txtProt.sin_adjuntos || 'Sin adjuntos'}</span>`
                    }
                </div>
            </div>
    ` : manualAttachmentInputs;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
            <h5 class="fw-bold mb-0">${p ? 'Editar Protocolo' : 'Nuevo Protocolo'}</h5>
            <div class="d-flex gap-2">
                ${canTransmitToNetwork ? `<button type="button" class="btn btn-outline-info btn-sm fw-bold" onclick="window.openTransmitModal(${p.idprotA})"><i class="bi bi-share-fill me-1"></i>${txtProt.btn_transmitir_red || ''}</button>` : ''}
                ${canRejectSolicitud ? `<button type="button" class="btn btn-outline-warning btn-sm fw-bold" onclick="window.rejectProtocolRequest(${p.idprotA})"><i class="bi bi-x-octagon me-1"></i>${txtProt.btn_rechazar_solicitud || 'Rechazar solicitud'}</button>` : ''}
                ${canDeleteManual ? `<button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.deleteManualProtocol(${p.idprotA})"><i class="bi bi-trash me-1"></i>${txtProt.btn_borrar_manual || 'Borrar protocolo'}</button>` : ''}
                ${p ? `<button type="button" class="btn btn-outline-secondary btn-sm fw-bold" onclick="window.downloadProtocolPDF(${p.idprotA})"><i class="bi bi-file-pdf"></i> FICHA PDF</button>` : ''}
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
        </div>
        
        <form id="form-protocolo">
            <input type="hidden" name="IdInstitucion" value="${instId}">
            
            ${p ? `
            <div class="row g-2 mb-3 bg-light border rounded p-2">
                <div class="col-md-4">
                    <label class="small fw-bold text-muted d-block">ANIMALES APROBADOS</label>
                    <span class="fw-bold text-primary">${totalAprob}</span>
                </div>
                <div class="col-md-4">
                    <label class="small fw-bold text-muted d-block">GASTADOS</label>
                    <span class="fw-bold text-secondary">${usados}</span>
                </div>
                <div class="col-md-4">
                    <label class="small fw-bold text-muted d-block">SALDO DISPONIBLE</label>
                    <span class="fw-bold ${saldo <= 0 ? 'text-danger' : 'text-success'}">${saldo}</span>
                </div>
                <div class="col-md-12 mt-2">
                    <small class="small fw-bold text-muted me-2">ÁMBITO LOCAL:</small>
                    ${isExtLocal 
                        ? `<span class="badge bg-danger text-white" style="font-size:10px;">${window.txt?.config_departamentos?.badge_externo || 'EXTERNO'}</span>`
                        : `<span class="badge bg-success text-white" style="font-size:10px;">${window.txt?.config_departamentos?.badge_interno || 'INTERNO'}</span>`
                    }
                </div>
                <div class="col-md-12 mt-2">
                    <small class="small fw-bold text-muted me-2">${txtProt.label_red_aprobada || 'APROBADO EN RED:'}</small>
                    ${redApprovedCount > 0
                        ? `<span class="badge bg-info text-white" style="font-size:10px;">${txtProt.red_aprobada_count || 'Instituciones aprobadas'}: ${redApprovedCount}</span>
                           <div class="small mt-1 text-dark"><strong>${txtProt.red_aprobada_en || 'Instituciones'}:</strong> ${escapeHtml(redApprovedNames.join(', '))}</div>`
                        : `<span class="badge bg-secondary text-white" style="font-size:10px;">${txtProt.red_no_aprobada || 'Sin aprobaciones en red'}</span>`
                    }
                </div>
                ${isRedProtocol(p) ? `
                <div class="col-md-12 mt-2">
                    <div class="alert alert-info py-2 mb-0 small">
                        <div class="fw-bold mb-1">${txtProt.red_source_title || 'Datos de institución propietaria'}</div>
                        <div><strong>${txtProt.red_source_user || 'Responsable origen'}:</strong> ${escapeHtml(p.ResponsableOrigenFormat || p.ResponsableFormat || '---')}</div>
                        <div><strong>${txtProt.red_source_depto || 'Departamento origen'}:</strong> ${escapeHtml(p.DeptoOrigenFormat || p.DeptoFormat || '---')}</div>
                        <div><strong>${txtProt.red_source_tipo || 'Tipo origen'}:</strong> ${escapeHtml(p.TipoNombreOrigen || p.TipoNombre || '---')}</div>
                        <div><strong>${txtProt.red_source_severidad || 'Severidad origen'}:</strong> ${escapeHtml(p.SeveridadNombreOrigen || p.SeveridadNombre || '---')}</div>
                        <div><strong>${txtProt.red_source_especies || 'Especies origen'}:</strong> ${escapeHtml(p.EspeciesOrigenList || p.EspeciesList || '---')}</div>
                        <div class="mt-1 text-muted">${txtProt.red_source_note || 'Edite abajo para la configuración local de esta institución.'}</div>
                    </div>
                </div>
                ` : ''}
                <div class="col-md-12 mt-2">
                    <small class="small fw-bold text-muted me-2">${txtProt.red_estado_todas || 'ESTADO EN TODAS LAS INSTITUCIONES DE RED:'}</small>
                    ${networkStatusRows.length > 0
                        ? `<div class="table-responsive mt-1">
                                <table class="table table-sm table-bordered mb-0 bg-white">
                                    <thead>
                                        <tr>
                                            <th style="font-size:10px;">${txtProt.red_col_institucion || 'Institución'}</th>
                                            <th style="font-size:10px;">${txtProt.red_col_estado || 'Estado'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${networkStatusRows.map(r => `
                                            <tr>
                                                <td class="small">
                                                    ${escapeHtml(r.NombreInst || '-')}
                                                    ${Number(r.esPropietaria) === 1 ? `<span class="badge bg-primary ms-1" style="font-size:9px;">${txtProt.red_owner_tag || 'PROPIETARIA'}</span>` : ''}
                                                </td>
                                                <td class="small">${getNetworkStatusBadge(r.estado)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                           </div>`
                        : `<span class="small text-muted">${txtProt.red_estado_sin_datos || 'Sin datos para mostrar.'}</span>`
                    }
                </div>
            </div>
            <hr class="mb-3">
            ` : ''}

            <div class="row g-3">
                <div class="col-md-8">
                    <label class="form-label small fw-bold text-muted">TÍTULO</label>
                    <input type="text" name="tituloA" class="form-control fw-bold" value="${p?.tituloA || ''}" required>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold text-muted">N° PROTOCOLO</label>
                    <input type="text" name="nprotA" class="form-control fw-bold" value="${p?.nprotA || ''}" required>
                </div>
                
                <div class="col-md-6">
                    <label class="form-label small fw-bold text-muted">RESPONSABLE DE PROYECTO (Texto)</label>
                    <input type="text" name="InvestigadorACargA" class="form-control" value="${p?.InvestigadorACargA || ''}" required>
                </div>

                <div class="col-md-6">
                    <label class="form-label small fw-bold text-muted d-flex justify-content-between align-items-center">
                        <span>RESPONSABLE PROTOCOLO (Usuario)</span>
                        <input type="text" id="user-search" class="form-control form-control-sm ms-2" style="max-width: 160px;" placeholder="Buscar usuario...">
                    </label>
                    <select name="IdUsrA" id="select-user" class="form-select" required>
                        <option value="">-- Seleccionar --</option>
                        ${usersForSelect.map(u => {
                            const apellido = (u.ApellidoA || '').trim();
                            const nombre = (u.NombreA || '').trim();
                            const fullName = `${apellido} ${nombre}`.trim();
                            const label = u.__extraLabel ? u.__extraLabel : (fullName ? fullName : (u.UsrA || `ID:${u.IdUsrA}`));
                            return `<option value="${u.IdUsrA}" ${String(effectiveUserId) == String(u.IdUsrA) ? 'selected' : ''}>[ID:${u.IdUsrA}] ${label}${u.UsrA ? ` (${u.UsrA})` : ''}</option>`;
                        }).join('')}
                    </select>
                </div>

                <div class="col-md-6" id="wrapper-depto-select">
                    <label class="form-label small fw-bold text-muted">DEPARTAMENTO</label>
                    <select name="departamento" id="select-depto" class="form-select">
                        <option value="">-- Seleccionar --</option>
                        ${formDataCache.depts.map(d => 
                            `<option value="${d.iddeptoA}" ${String(effectiveDepto) == String(d.iddeptoA) ? 'selected' : ''}>${d.NombreDeptoA} ${d.OrgName ? '- ['+d.OrgName+']' : ''}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="col-md-6" id="wrapper-depto-manual" style="display:none;">
                    <label class="form-label small fw-bold text-muted">DEPARTAMENTO (Manual)</label>
                    <input type="text" name="departamento_manual" id="depto-manual" class="form-control" value="${p?.DeptoOriginal || ''}">
                </div>

                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">TIPO</label>
                    <select name="tipoprotocolo" class="form-select">
                        ${formDataCache.types.map(t => `<option value="${t.idtipoprotocolo}" ${String(effectiveTipo) == String(t.idtipoprotocolo) ? 'selected' : ''}>${t.NombreTipoprotocolo}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">CANT. ANIMALES</label>
                    <input type="number" name="CantidadAniA" class="form-control" value="${p?.CantidadAniA || 0}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">SEVERIDAD</label>
                    <select name="severidad" class="form-select">
                        ${formDataCache.severities.map(s => `<option value="${s.IdSeveridadTipo}" ${String(effectiveSeveridad) == String(s.IdSeveridadTipo) ? 'selected' : ''}>${s.NombreSeveridad}</option>`).join('')}
                    </select>
                </div>

                <div class="col-md-6">
                    <label class="form-label small fw-bold text-muted">FECHA INICIO</label>
                    <input type="date" name="FechaIniProtA" class="form-control" value="${p?.FechaIniProtA || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small fw-bold text-muted">FECHA VENCIMIENTO</label>
                    <input type="date" name="FechaFinProtA" class="form-control" value="${p?.FechaFinProtA || ''}">
                </div>

                ${attachmentsBlock}
                ${p ? manualAttachmentInputs : ''}
                
                <div class="col-12 mt-3 bg-light p-2 border rounded">
                    <label class="form-label small fw-bold text-muted uppercase">Especies Asociadas</label>
                    <div id="species-container">
                        ${currentSpeciesIds.length > 0 ? currentSpeciesIds.map(item => window.renderSpeciesRow(item.idespA)).join('') : window.renderSpeciesRow()}
                    </div>
                    <button type="button" class="btn btn-outline-success btn-sm mt-2" onclick="window.addSpeciesRow()">+ Especie</button>
                </div>
            </div>

            <div class="mt-4 text-end">
                <button type="submit" class="btn btn-primary px-5 fw-bold">GUARDAR</button>
            </div>
        </form>
    `;

    document.getElementById('form-protocolo').onsubmit = (e) => saveProtocol(e, p?.idprotA);
    
    // Filtro rápido de usuarios por ID, usuario, nombre o apellido
    const userSearch = document.getElementById('user-search');
    const userSelect = document.getElementById('select-user');
    if (userSearch && userSelect) {
        userSearch.addEventListener('input', () => {
            const term = userSearch.value.toLowerCase().trim();
            Array.from(userSelect.options).forEach(opt => {
                if (!opt.value) return; // dejar placeholder siempre
                const text = opt.textContent.toLowerCase();
                opt.hidden = term && !text.includes(term);
            });
        });
    }
    
    // Departamento: siempre selector (sin opción Otros CEUAS)
    window.toggleDeptoInput({ checked: false });

    window.updateAvailableSpecies();
};

window.toggleDeptoInput = (c,v)=>{ 
    const sel = document.getElementById('wrapper-depto-select');
    const man = document.getElementById('wrapper-depto-manual');
    if(c.checked){ 
        sel.style.display='none'; man.style.display='block'; 
        document.getElementById('select-depto').required = false;
        document.getElementById('depto-manual').required = true;
        document.getElementById('depto-manual').value = v || '';
    } else { 
        sel.style.display='block'; man.style.display='none'; 
        document.getElementById('select-depto').required = true;
        document.getElementById('depto-manual').required = false;
        document.getElementById('depto-manual').value = '';
    }
};

window.renderSpeciesRow = (s=null) => {
    const picked = Array.from(document.querySelectorAll('select[name="especies[]"]')).map(x=>x.value);
    const opts = formDataCache.species.map(e=>`<option value="${e.idespA}" ${s==e.idespA?'selected':''} ${picked.includes(String(e.idespA))&&s!=e.idespA?'disabled':''}>${e.EspeNombreA}</option>`).join('');
    return `<div class="row g-2 mb-2 species-row"><div class="col-10"><select name="especies[]" class="form-select form-select-sm" onchange="window.updateAvailableSpecies()" required><option value="">-- Seleccionar Especie --</option>${opts}</select></div><div class="col-2"><button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="window.removeSpeciesRow(this)">X</button></div></div>`;
};

window.addSpeciesRow = ()=>{ document.getElementById('species-container').insertAdjacentHTML('beforeend', window.renderSpeciesRow()); window.updateAvailableSpecies(); };
window.updateAvailableSpecies = ()=>{ const p=Array.from(document.querySelectorAll('select[name="especies[]"]')).map(x=>x.value).filter(x=>x); document.querySelectorAll('select[name="especies[]"]').forEach(s=>{ Array.from(s.options).forEach(o=>{ if(o.value) o.disabled = p.includes(o.value) && o.value!=s.value; }); }); };
window.removeSpeciesRow = (b)=>{ if(document.querySelectorAll('.species-row').length>1){ b.closest('.species-row').remove(); window.updateAvailableSpecies(); }else alert('Mínimo 1 especie'); };

async function saveProtocol(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const instId = localStorage.getItem('instId');
    if(fd.get('tituloA').length < 3) return alert('Título corto');

    // Validación básica de rango de fechas en el cliente
    const ini = fd.get('FechaIniProtA') || '';
    const fin = fd.get('FechaFinProtA') || '';
    if (ini && fin && fin < ini) {
        alert('La fecha de vencimiento no puede ser anterior a la fecha de inicio.');
        return;
    }

    const txtProt = window.txt?.admin_protocolos || {};
    for (const name of ['adjunto1', 'adjunto2', 'adjunto3']) {
        const file = fd.get(name);
        if (!file || !(file instanceof File) || !file.name) continue;
        const val = validateProtocolAttachmentInput(file);
        if (!val.ok) {
            if (val.reason === 'type') {
                alert(txtProt.error_adjunto_tipo || 'Solo se permiten archivos PDF.');
            } else {
                alert(txtProt.error_adjunto_size || 'Cada adjunto debe ser PDF y no superar 2MB.');
            }
            return;
        }
    }
    
    // Loader
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;

    try {
        const res = await API.request(`/protocols/save?id=${id||''}&inst=${instId}`, 'POST', fd);
        if(res.status==='success') { 
            bootstrap.Modal.getInstance(document.getElementById('modal-protocol')).hide(); 
            initProtocolosPage(); // Recargar tabla y stats
        } else { 
            alert(res.message); 
            btn.innerHTML = 'GUARDAR';
            btn.disabled = false;
        }
    } catch(e){ console.error(e); btn.disabled = false; }
}

window.downloadProtocolPDF = async (id) => { 
    // Clonar contenido actual del modal (la ficha visible)
    const source = document.getElementById('modal-content-prot');
    if (!source) return;
    const cloned = source.cloneNode(true);
    cloned.id = 'protocol-print-area';
    
    // Quitar bloque de adjuntos para que no aparezca en la ficha PDF
    const attachmentsLabel = window.txt?.admin_protocolos?.label_adjuntos || 'Adjuntos';
    cloned.querySelectorAll('label, span, div').forEach(el => {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (txt === attachmentsLabel.toLowerCase()) {
            const block = el.closest('.col-12');
            if (block) block.remove();
        }
    });

    // Convertir inputs/selects a texto plano
    cloned.querySelectorAll('input, select').forEach(el => {
        let txt = el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || '-') : el.value;
        const p = document.createElement('div');
        p.className = 'border-bottom pb-1 mb-2 fw-bold small';
        p.innerText = txt;
        el.parentNode.replaceChild(p, el);
    });
    
    // Limpiar elementos interactivos/no imprimibles
    cloned.querySelectorAll('button, .btn, .spinner-border, .form-text, .btn-close').forEach(e => e.remove());
    
    // Forzar modo de impresión legible (independiente de dark mode)
    const printStyle = document.createElement('style');
    printStyle.textContent = `
        #protocol-print-area,
        #protocol-print-area * {
            color: #000 !important;
            text-shadow: none !important;
            box-shadow: none !important;
        }
        #protocol-print-area {
            background: #fff !important;
            padding: 8px !important;
        }
        #protocol-print-area .bg-light,
        #protocol-print-area .bg-dark,
        #protocol-print-area .bg-primary,
        #protocol-print-area .bg-info,
        #protocol-print-area .bg-success,
        #protocol-print-area .bg-danger,
        #protocol-print-area .bg-warning,
        #protocol-print-area .table-light,
        #protocol-print-area .badge {
            background: #fff !important;
            border-color: #000 !important;
        }
        #protocol-print-area .text-muted,
        #protocol-print-area .text-secondary,
        #protocol-print-area .text-primary,
        #protocol-print-area .text-success,
        #protocol-print-area .text-danger,
        #protocol-print-area .text-warning,
        #protocol-print-area .text-info,
        #protocol-print-area .text-dark {
            color: #000 !important;
        }
    `;
    cloned.prepend(printStyle);

    // Mostrar header oculto (si existiera)
    const h = cloned.querySelector('.d-none.d-print-block');
    if(h) h.classList.remove('d-none');

    const opt = { margin: [18, 18, 18, 18], filename: `Protocolo_${id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    await html2pdf().set(opt).from(cloned).save();
};

window.downloadProtocolAttachment = async (attId, source = 'solicitud') => {
    const txtProt = window.txt?.admin_protocolos || {};
    try {
        window.Swal?.fire({
            title: txtProt.descargando_archivo || 'Descargando archivo...',
            html: txtProt.espere_momento || 'Espere un momento',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => window.Swal.showLoading()
        });

        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const endpoint = String(source) === 'manual'
            ? `/protocols/manual-attachments/download?id=${attId}`
            : `/admin/requests/attachments/download?id=${attId}`;
        const res = await fetch(`${API.urlBase}${endpoint}`, { headers });
        if (!res.ok) {
            const text = await res.text();
            console.error('Error descargando adjunto en modal de protocolos:', text);
            window.Swal?.close();
            window.Swal?.fire('Error', txtProt.error_descarga || 'No se pudo descargar el archivo.', 'error');
            return;
        }
        const blob = await res.blob();
        window.Swal?.close();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
        console.error('Error de red al descargar adjunto en modal de protocolos:', err);
        window.Swal?.close();
        window.Swal?.fire('Error', txtProt.error_descarga || 'Error de red al descargar el archivo.', 'error');
    }
};

window.deleteManualProtocolAttachment = async (attId) => {
    const txtProt = window.txt?.admin_protocolos || {};
    const q = await window.Swal.fire({
        title: txtProt.borrar_adjunto_title || 'Borrar adjunto',
        text: txtProt.borrar_adjunto_confirm || 'Se eliminará el archivo de la nube y de la base de datos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: txtProt.confirmar_borrado || 'Confirmar borrado',
        cancelButtonText: txtProt.cancelar || 'Cancelar'
    });
    if (!q.isConfirmed) return;

    const res = await API.request('/protocols/manual-attachments/delete', 'POST', { id: Number(attId) });
    if (res?.status === 'success') {
        window.Swal.fire('OK', txtProt.adjunto_borrado_ok || 'Adjunto eliminado correctamente.', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('modal-protocol'));
        if (modal) modal.hide();
        await initProtocolosPage();
    } else {
        window.Swal.fire('Error', res?.message || (txtProt.error_accion || 'No se pudo completar la accion.'), 'error');
    }
};

window.deleteManualProtocol = async (idprot) => {
    const txt = window.txt?.admin_protocolos || {};
    const pre = await window.Swal.fire({
        title: txt.borrar_manual_title || 'Borrar protocolo manual',
        text: txt.borrar_manual_confirm || 'Esta accion eliminara el protocolo. Se requiere contraseña.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: txt.continuar || 'Continuar',
        cancelButtonText: txt.cancelar || 'Cancelar'
    });
    if (!pre.isConfirmed) return;

    const ask = await window.Swal.fire({
        title: txt.ingresar_password || 'Ingrese su contraseña',
        input: 'password',
        inputLabel: txt.password_label || 'Contraseña de administrador',
        inputPlaceholder: '********',
        showCancelButton: true,
        confirmButtonText: txt.confirmar_borrado || 'Confirmar borrado',
        cancelButtonText: txt.cancelar || 'Cancelar',
        inputValidator: (value) => (!value ? (txt.password_obligatoria || 'Debe ingresar su contraseña') : undefined)
    });
    if (!ask.isConfirmed) return;

    const res = await API.request('/protocols/delete-manual', 'POST', { idprot, password: ask.value });
    if (res?.status === 'success') {
        window.Swal.fire('OK', txt.borrado_ok || 'Protocolo borrado correctamente.', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('modal-protocol'));
        if (modal) modal.hide();
        await initProtocolosPage();
    } else {
        window.Swal.fire('Error', res?.message || (txt.error_accion || 'No se pudo completar la accion.'), 'error');
    }
};

window.openTransmitModal = async (idprotA) => {
    const txt = window.txt?.admin_protocolos || {};
    const listEl = document.getElementById('transmit-targets-list');
    const btnEnviar = document.getElementById('btn-transmitir-enviar');
    if (!listEl || !btnEnviar) return;

    // Aseguramos que el modal no rompa si SweetAlert2 no cargó (window.Swal podría ser undefined)
    const fireSwal = (title, message, icon) => {
        try {
            if (window.Swal && typeof window.Swal.fire === 'function') {
                return window.Swal.fire(title, message, icon);
            }
        } catch (_) {}
        // Fallback mínimo para evitar crash
        const msg = [title, message].filter(Boolean).join(' - ');
        alert(msg);
    };

    listEl.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-info"></div></div>';
    btnEnviar.disabled = true;

    const modalTransmit = new bootstrap.Modal(document.getElementById('modal-transmitir-protocolo'));
    modalTransmit.show();

    try {
        const res = await API.request('/protocols/transmission-targets');
        if (res?.status !== 'success' || !Array.isArray(res.data)) {
            listEl.innerHTML = `<p class="text-muted small mb-0">${txt.transmitir_sin_destinos || ''}</p>`;
            return;
        }
        const targets = res.data;
        if (targets.length === 0) {
            listEl.innerHTML = `<p class="text-muted small mb-0">${txt.transmitir_sin_destinos || ''}</p>`;
            return;
        }

        listEl.innerHTML = targets.map(t => `
            <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" value="${Number(t.IdInstitucion)}" id="transmit-chk-${t.IdInstitucion}">
                <label class="form-check-label small" for="transmit-chk-${t.IdInstitucion}">${escapeHtml(t.NombreInst || '')}</label>
            </div>
        `).join('');

        btnEnviar.disabled = false;
        btnEnviar.onclick = async () => {
            const checked = listEl.querySelectorAll('input[type="checkbox"]:checked');
            const selected = Array.from(checked).map(c => Number(c.value)).filter(v => v > 0);
            if (selected.length === 0) {
                fireSwal('', txt.transmitir_seleccione || '', 'warning');
                return;
            }
            btnEnviar.disabled = true;
            try {
                const r = await API.request('/protocols/transmit', 'POST', { idprot: idprotA, targets: selected });
                if (r?.status === 'success') {
                    fireSwal('OK', txt.transmitir_ok || '', 'success');
                    modalTransmit.hide();
                    bootstrap.Modal.getInstance(document.getElementById('modal-protocol'))?.hide();
                    await initProtocolosPage();
                } else {
                    fireSwal('Error', r?.message || (txt.transmitir_error || ''), 'error');
                }
            } catch (err) {
                fireSwal('Error', txt.transmitir_error || '', 'error');
            } finally {
                btnEnviar.disabled = false;
            }
        };
    } catch (err) {
        listEl.innerHTML = `<p class="text-danger small mb-0">${txt.transmitir_error || ''}</p>`;
    }
};

window.rejectProtocolRequest = async (idprot) => {
    const txt = window.txt?.admin_protocolos || {};
    const ask = await window.Swal.fire({
        title: txt.rechazar_title || 'Rechazar solicitud aprobada',
        input: 'textarea',
        inputLabel: txt.rechazar_motivo_label || 'Motivo del rechazo',
        inputPlaceholder: txt.rechazar_motivo_ph || 'Escriba el motivo para enviar al usuario...',
        inputAttributes: { 'aria-label': 'Motivo del rechazo' },
        showCancelButton: true,
        confirmButtonText: txt.rechazar_confirmar || 'Rechazar y notificar',
        cancelButtonText: txt.cancelar || 'Cancelar',
        inputValidator: (value) => (!value || !value.trim() ? (txt.rechazar_motivo_req || 'Debe escribir un motivo') : undefined)
    });
    if (!ask.isConfirmed) return;

    const res = await API.request('/protocols/reject-request', 'POST', { idprot, motivo: ask.value.trim() });
    if (res?.status === 'success') {
        window.Swal.fire('OK', txt.rechazar_ok || 'Solicitud rechazada y notificada.', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('modal-protocol'));
        if (modal) modal.hide();
        await initProtocolosPage();
    } else {
        window.Swal.fire('Error', res?.message || (txt.error_accion || 'No se pudo completar la accion.'), 'error');
    }
};

function exportToExcel() {
    const data = getFilteredAndSortedData();
    const exportData = data.map(p => ({
        ID: p.idprotA, Nro: p.nprotA, Titulo: p.tituloA, Inv: p.InvestigadorACargA,
        Resp: p.ResponsableFormat, Depto: p.DeptoFormat, Tipo: p.TipoNombre,
        Vence: p.Vencimiento,
        Origen: (String(p.TipoAprobacion || '').toUpperCase() === 'RED' ? 'RED' : 'PROPIA'),
        RedAprobadas: Number(p.RedAprobadaCount || 0),
        InstitucionesRedAprobadas: (p.RedAprobadaInstituciones || '')
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Protocolos");
    XLSX.writeFile(wb, "Listado_Protocolos.xlsx");
}