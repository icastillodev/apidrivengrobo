import { API } from '../../api.js';

let allProtocols = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idprotA', direction: 'desc' };
let formDataCache = null; // Cache para configuración y listas (Usuarios, Deptos, etc.)

export async function initProtocolosPage() {
    const instId = localStorage.getItem('instId');
    const instName = localStorage.getItem('NombreInst') || 'Institución';
    const bread = document.getElementById('institucionbread');
    if(bread) bread.innerText = instName;

    // Actualizar badge de solicitudes pendientes
    updateRequestsBadge();

    try {
        // 1. Cargar Configuración Inicial (incluye has_network, usuarios, deptos, etc.)
        const conf = await API.request(`/protocols/form-data?inst=${instId}`);
        formDataCache = conf.data;
        
        // 2. Configurar Visibilidad de Filtro Origen (Solo si tiene RED)
        const filterOrigin = document.getElementById('filter-origin');
        const labelOrigin = document.getElementById('label-origin');
        if (formDataCache.has_network) {
            filterOrigin.classList.remove('d-none');
            labelOrigin.classList.remove('d-none');
        }

        // 3. Cargar Protocolos
        const res = await API.request(`/protocols/institution?inst=${instId}`);
        if (res && res.status === 'success') {
            allProtocols = res.data;
            updateStatsBar();
            renderTableHeader();
            renderTable();
        }
    } catch (error) { console.error("❌ Error:", error); }

    // --- EVENTOS ---
    
    // Botón Buscar
    document.getElementById('btn-search-prot').onclick = () => { currentPage = 1; renderTable(); };
    
    // Cambio en el tipo de filtro (Para cambiar Input por Select)
    document.getElementById('filter-type-prot').addEventListener('change', updateSearchInputType);

    // Exportar Excel
    document.getElementById('btn-excel-prot').onclick = exportToExcel;
    
    // Botón Ayuda
    const btnAyuda = document.getElementById('btn-ayuda-prot');
    if (btnAyuda) {
        btnAyuda.onclick = () => new bootstrap.Modal(document.getElementById('modal-protocol-help')).show();
    }
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
        html = `<select id="search-input-prot" class="form-select form-select-sm border-start-0 fw-bold">
                    <option value="">-- Todos --</option>
                    <option value="vigente">Vigentes</option>
                    <option value="vencido">Vencidos</option>
                </select>`;
    }
    // Default -> Input Texto
    else {
        html = `<input type="text" id="search-input-prot" class="form-control form-control-sm border-start-0" placeholder="Escribe para buscar...">`;
    }
    container.innerHTML = html;
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
            <th data-key="InvestigadorACargA" class="py-3 px-2">Inv. Cargo</th>
            <th data-key="ResponsableFormat" class="py-3 px-2">Responsable</th>
            <th data-key="DeptoFormat" class="py-3 px-2">Departamento</th>
            <th data-key="TipoNombre" class="py-3 px-2 text-center">Tipo</th>
    `;

    // Solo mostrar columna Origen si hay RED
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
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const today = new Date().toISOString().split('T')[0];

    tbody.innerHTML = '';
    if(pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">No se encontraron protocolos.</td></tr>';
        return;
    }

    pageData.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = (e) => window.openProtocolModal(p);
        
        // Columna Tipo: Nombre + Badge Externo si aplica
        let tipoHtml = `<span class="fw-bold text-dark">${p.TipoNombre || '---'}</span>`;
        if(p.IsExterno == 1) {
            tipoHtml += `<br><span class="badge bg-danger mt-1" style="font-size:9px;">OTROS CEUAS</span>`;
        }

        // Columna Origen (Solo si hay red)
        let origenTd = '';
        if (formDataCache && formDataCache.has_network) {
            let origenText = `<span class="badge bg-light text-secondary border">PROPIA</span>`;
            if (p.InstitucionOrigen && p.InstitucionOrigen !== formDataCache.NombreCompletoInst) {
                origenText = `<span class="badge bg-info text-white" title="Protocolo de Red">RED</span><br><span class="small text-muted" style="font-size:9px">Creada en: ${p.InstitucionOrigen}</span>`;
            }
            origenTd = `<td class="text-center px-2 align-middle">${origenText}</td>`;
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
            <td class="small text-wrap px-2" style="max-width: 220px;">${p.tituloA || '---'}</td>
            <td class="small px-2">${p.InvestigadorACargA || '---'}</td>
            <td class="small fw-bold px-2 text-muted" style="font-size:10px;">${p.ResponsableFormat || '---'}</td>
            <td class="small text-muted px-2">${p.DeptoFormat || p.DeptoOriginal || '-'}</td>
            <td class="text-center px-2 align-middle">${tipoHtml}</td>
            ${origenTd}
            <td class="${fechaStyle}">${fechaText}</td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(data.length, 'pagination-prot', renderTable);
}

function getFilteredAndSortedData() {
    const originFilter = document.getElementById('filter-origin').value;
    const filterType = document.getElementById('filter-type-prot').value;
    
    // Obtenemos el valor sea input o select dinámico
    let inputEl = document.getElementById('search-input-prot');
    const term = inputEl ? inputEl.value.toLowerCase().trim() : '';
    
    const today = new Date().toISOString().split('T')[0];

    let data = allProtocols.filter(p => {
        // 1. Filtro Origen
        if (originFilter === 'interno' && p.IsExterno == 1) return false;
        if (originFilter === 'externo' && p.IsExterno != 1) return false;

        // 2. Filtro de Búsqueda
        if (!term) return true;

        if (filterType === 'Vencimiento') {
            if (term === 'vencido') return (p.Vencimiento && p.Vencimiento < today);
            if (term === 'vigente') return (!p.Vencimiento || p.Vencimiento >= today);
            return true;
        }

        if (filterType === 'all') return JSON.stringify(p).toLowerCase().includes(term);
        
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
    if (p) {
        const resSpec = await API.request(`/protocols/current-species?id=${p.idprotA}`);
        if (resSpec.status === 'success') currentSpeciesIds = resSpec.data;
    }

    const showOtrosCeuas = formDataCache.otrosceuas_enabled || (p && p.IsExterno == 1);

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
            <h5 class="fw-bold mb-0">${p ? 'Editar Protocolo' : 'Nuevo Protocolo'}</h5>
            <div class="d-flex gap-2">
                ${p ? `<button type="button" class="btn btn-outline-secondary btn-sm fw-bold" onclick="window.downloadProtocolPDF(${p.idprotA})"><i class="bi bi-file-pdf"></i> FICHA PDF</button>` : ''}
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
        </div>
        
        <form id="form-protocolo">
            <input type="hidden" name="IdInstitucion" value="${instId}">
            
            ${showOtrosCeuas ? `
            <div class="form-check form-switch mb-3 bg-light p-2 ps-5 rounded border">
                <input class="form-check-input" type="checkbox" name="protocoloexpe" id="chk-otros-ceuas" value="1" ${p?.IsExterno == 1 ? 'checked' : ''} onchange="window.toggleDeptoInput(this)">
                <label class="form-check-label fw-bold text-secondary" for="chk-otros-ceuas">PROTOCOLO EXTERNO (OTROS CEUAS)</label>
            </div>` : ''}

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
                    <label class="form-label small fw-bold text-muted">RESP. PROYECTO (Texto)</label>
                    <input type="text" name="InvestigadorACargA" class="form-control" value="${p?.InvestigadorACargA || ''}" required>
                </div>

                <div class="col-md-6">
                    <label class="form-label small fw-bold text-muted">RESP. PROTOCOLO (Usuario)</label>
                    <select name="IdUsrA" id="select-user" class="form-select" required>
                        <option value="">-- Seleccionar --</option>
                        ${formDataCache.users.map(u => 
                            `<option value="${u.IdUsrA}" ${p?.IdUsrA == u.IdUsrA ? 'selected' : ''}>${u.ApellidoA} ${u.NombreA} (${u.UsrA})</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="col-md-6" id="wrapper-depto-select">
                    <label class="form-label small fw-bold text-muted">DEPARTAMENTO</label>
                    <select name="departamento" id="select-depto" class="form-select">
                        <option value="">-- Seleccionar --</option>
                        ${formDataCache.depts.map(d => 
                            `<option value="${d.iddeptoA}" ${p?.departamento == d.iddeptoA ? 'selected' : ''}>${d.NombreDeptoA} ${d.OrgName ? '- ['+d.OrgName+']' : ''}</option>`
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
                        ${formDataCache.types.map(t => `<option value="${t.idtipoprotocolo}" ${p?.tipoprotocolo == t.idtipoprotocolo ? 'selected' : ''}>${t.NombreTipoprotocolo}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">CANT. ANIMALES</label>
                    <input type="number" name="CantidadAniA" class="form-control" value="${p?.CantidadAniA || 0}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold text-muted">SEVERIDAD</label>
                    <select name="severidad" class="form-select">
                        ${formDataCache.severities.map(s => `<option value="${s.IdSeveridadTipo}" ${p?.severidad == s.IdSeveridadTipo ? 'selected' : ''}>${s.NombreSeveridad}</option>`).join('')}
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
    
    // Switch depto manual
    const chk = document.getElementById('chk-otros-ceuas');
    if(chk) window.toggleDeptoInput(chk, p?.DeptoOriginal);
    else window.toggleDeptoInput({checked: false});

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
    // Clonar para PDF
    const element = document.getElementById('protocol-print-area');
    if (!element) return;
    const cloned = element.cloneNode(true);
    
    // Convertir Inputs a Texto
    cloned.querySelectorAll('input, select').forEach(el => {
        let txt = el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || '-') : el.value;
        if(el.type === 'checkbox' && el.id === 'chk-otros-ceuas') {
            txt = el.checked ? 'PROTOCOLO EXTERNO (OTROS CEUAS)' : '';
            if(el.checked) {
                const badge = document.createElement('div');
                badge.className = 'alert alert-danger fw-bold text-center p-1 mb-2';
                badge.innerText = txt;
                el.parentNode.replaceChild(badge, el);
                return;
            }
        }
        const p = document.createElement('div');
        p.className = 'border-bottom pb-1 mb-2 fw-bold small';
        p.innerText = txt;
        el.parentNode.replaceChild(p, el);
    });
    
    cloned.querySelectorAll('button, .btn, .spinner-border, .form-text').forEach(e => e.remove());
    
    // Mostrar header oculto
    const h = cloned.querySelector('.d-none.d-print-block');
    if(h) h.classList.remove('d-none');

    const opt = { margin: 10, filename: `Protocolo_${id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    await html2pdf().set(opt).from(cloned).save();
};

function exportToExcel() {
    const data = getFilteredAndSortedData();
    const exportData = data.map(p => ({
        ID: p.idprotA, Nro: p.nprotA, Titulo: p.tituloA, Inv: p.InvestigadorACargA,
        Resp: p.ResponsableFormat, Depto: p.DeptoFormat, Tipo: p.TipoNombre,
        Vence: p.Vencimiento, Origen: p.InstitucionOrigen || 'PROPIA'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Protocolos");
    XLSX.writeFile(wb, "Listado_Protocolos.xlsx");
}