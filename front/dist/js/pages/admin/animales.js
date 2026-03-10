// 1. IMPORTACIONES
import { API } from '../../api.js';
import { hideLoader } from '../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';
import { getTipoFormBadgeStyle } from '../../utils/badgeTipoForm.js';

let allAnimals = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idformA', direction: 'none' };
let formDataCache = null;
let openedAnimalFromUrl = false;

/**
 * INICIALIZACIÓN DE LA PÁGINA
 */
export async function initAnimalesPage() {
    const instId = localStorage.getItem('instId');

    const btnAyuda = document.getElementById('btn-ayuda-animal');
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            const helpModal = new bootstrap.Modal(document.getElementById('modal-animal-help'));
            helpModal.show();
        };
    }

    try {
        const res = await API.request(`/animals/all?inst=${instId}`);
        if (res && res.status === 'success') {
            allAnimals = res.data;
            setupSortHeaders();
            renderTable();
            openAnimalFromUrlIfNeeded();
        }
    } catch (error) { console.error("❌ Error:", error); }


// Botón Ayuda
    document.getElementById('btn-ayuda-animal').onclick = () => {
        new bootstrap.Modal(document.getElementById('modal-animal-help')).show();
    };

    // Botón Excel (Abre el popup de fechas)
    document.getElementById('btn-excel-animal').onclick = () => {
        new bootstrap.Modal(document.getElementById('modal-excel-animal')).show();
    };


// LÓGICA DE REAPERTURA AUTOMÁTICA POST-RECARGA
    const reopenId = sessionStorage.getItem('reopenAnimalId');
    if (reopenId) {
        sessionStorage.removeItem('reopenAnimalId'); // Limpiamos para que no se abra siempre
        
        // Esperamos un momento a que la tabla cargue para buscar el objeto
        setTimeout(() => {
            const animalData = allAnimals.find(a => a.idformA == reopenId);
            if (animalData) {
                window.openAnimalModal(animalData); // Abre el popup que estaba
            }
        }, 800); // Ajusta el tiempo según la velocidad de tu API
    }
document.addEventListener('focusin', (e) => {
    if (e.target.closest(".swal2-container")) {
        e.stopImmediatePropagation();
    }
}, true);
    document.getElementById('btn-search-animal').onclick = () => { currentPage = 1; renderTable(); };
    document.getElementById('filter-status-animal').onchange = () => { currentPage = 1; renderTable(); };
    const filterRetiroAnimal = document.getElementById('filter-retiro-animal');
    if (filterRetiroAnimal) filterRetiroAnimal.onchange = () => { currentPage = 1; renderTable(); };
    document.getElementById('search-input-animal').onkeyup = (e) => { if (e.key === 'Enter') { currentPage = 1; renderTable(); } };
}

function openAnimalFromUrlIfNeeded() {
    if (openedAnimalFromUrl) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const action = (params.get('action') || '').toLowerCase();
    if (!id || (action && action !== 'view' && action !== 'edit')) return;

    const animal = allAnimals.find(a => String(a.idformA) === String(id));
    if (!animal) return;
    openedAnimalFromUrl = true;
    setTimeout(() => window.openAnimalModal(animal), 200);
}

/**
 * RECARGA DE DATOS Y SINCRONIZACIÓN TOTAL (TIEMPO REAL)
 */
async function syncAllData() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/animals/all?inst=${instId}`);
    if (res && res.status === 'success') {
        allAnimals = res.data;
        renderTable(); 
        refreshMenuNotifications(); 
    }
}

/**
 * GESTIÓN DE TABLA Y ORDENAMIENTO
 */
function setupSortHeaders() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        th.style.cursor = 'pointer';
        th.setAttribute('data-label', th.innerText.trim());
        th.onclick = () => {
            const key = th.getAttribute('data-key');
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : (sortConfig.direction === 'desc' ? 'none' : 'asc');
            } else { sortConfig.key = key; sortConfig.direction = 'asc'; }
            renderTable();
        };
    });
}

function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
        th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
    });
}

function renderTable() {
    const tbody = document.getElementById('table-body-animals');
    const data = getFilteredAndSortedData();
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tbody.innerHTML = '';
    pageData.forEach(a => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => window.openAnimalModal(a);

        const tipoBadgeStyle = getTipoFormBadgeStyle(a.colorTipo);
        const tipoBadgeHtml = `<span class="${tipoBadgeStyle.className}" style="${tipoBadgeStyle.style} font-size: 9px; padding: 3px 6px;">${(a.TipoNombre || 'Animal').replace(/</g, '&lt;')}</span>`;

        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">${a.idformA}</td>
            <td class="py-2 px-2">${tipoBadgeHtml}</td>
            <td class="py-2 px-2 small">${a.Investigador}</td>
            <td class="py-2 px-2 small fw-bold text-success">${a.NProtocolo || '---'}</td>
            <td class="py-2 px-2 small">${a.CatEspecie}</td>
            <td class="py-2 px-2 small text-muted">${a.raza || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Edad || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Peso || '---'}</td>
            <td class="py-2 px-2 text-center fw-bold">${a.CantAnimal}</td>
            <td class="py-2 px-2 text-center">
                ${(() => {
                    const extFlag = Number(a.DeptoExternoFlag || 1);
                    const isExt = extFlag === 2;
                    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
                    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
                    if (isExt) {
                        return `<span class="badge bg-danger text-white" style="font-size:8px;">${labelExt}</span>`;
                    }
                    return `<span class="badge bg-success text-white" style="font-size:8px;">${labelInt}</span>`;
                })()}
            </td>
            <td class="py-2 px-2 small text-muted">${a.Inicio || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Retiro || '---'}</td>
            <td class="py-2 px-2 text-center">${getStatusBadge(a.estado)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateHeaderIcons();
    renderPagination(data.length, 'pagination-animal', renderTable);
    hideLoader();
}

function getFilteredAndSortedData() {
    const statusFilter = document.getElementById('filter-status-animal').value.toLowerCase();
    const term = document.getElementById('search-input-animal').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-column-animal').value;
    const retiroDate = document.getElementById('filter-retiro-animal');
    const retiroVal = retiroDate ? (retiroDate.value || '').trim() : '';

    let data = allAnimals.filter(a => {
        const estadoFila = (a.estado || "sin estado").toString().toLowerCase().trim();
        if (statusFilter !== 'all' && estadoFila !== statusFilter) return false;
        if (retiroVal) {
            const aRetiro = (a.Retiro || '').toString().substring(0, 10);
            if (aRetiro !== retiroVal) return false;
        }
        if (!term) return true;
        if (filterType === 'all') return JSON.stringify(a).toLowerCase().includes(term);
        return String(a[filterType] || '').toLowerCase().includes(term);
    });

    if (sortConfig.direction !== 'none') {
        data.sort((a, b) => {
            let valA = a[sortConfig.key] || ''; let valB = b[sortConfig.key] || '';
            const factor = sortConfig.direction === 'asc' ? 1 : -1;
            return isNaN(valA) ? valA.toString().localeCompare(valB) * factor : (valA - valB) * factor;
        });
    } else { data.sort((a, b) => b.idformA - a.idformA); }
    return data;
}

/**
 * 2. MODAL DE DETALLE (CORREGIDO)
 */
window.openAnimalModal = async (a) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-animal');
    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;
    
    const [resMaster, resSex, resNotify, resDeptos] = await Promise.all([
        formDataCache ? Promise.resolve({status:'success', data:formDataCache}) : API.request(`/animals/form-data?inst=${instId}`),
        API.request(`/animals/get-sex-data?id=${a.idformA}`),
        API.request(`/animals/last-notification?id=${a.idformA}`),
        API.request(`/deptos/list?inst=${instId}`)
    ]);
    formDataCache = resMaster.data;
    if (resDeptos && resDeptos.status === 'success' && resDeptos.data) formDataCache.deptos = resDeptos.data;
    const sex = resSex.data || { machoA: 0, hembraA: 0, indistintoA: 0, totalA: 0 };
    const lastNotify = resNotify.data;

    // --- CORRECCIÓN IDENTIDAD ---
    // Evitamos que salga "null" si falla el localStorage
    const userFull = localStorage.getItem('userFull') || 'Usuario';
    const userId = localStorage.getItem('userId') || '?';
    const identity = `${userFull} (ID: ${userId})`;

    // ENSAMBLADO MODULAR
    let html = renderModalHeader(a);
    html += renderResearcherContact(a);
    html += `<input type="hidden" id="current-idformA" value="${a.idformA}">`;
    // Pasamos la identidad limpia
    html += renderAdminSection(a, identity);
    html += renderNotificationSection(lastNotify, a.idformA);
    html += renderOrderModificationSection(a, sex, formDataCache);

    container.innerHTML = html;

    // Actualizar org/ámbito al cambiar departamento
    const selDepto = document.getElementById('modal-depto-animal');
    if (selDepto) selDepto.onchange = function() { window.updateDeptoOrgAmbito(this, 'modal-org-animal', 'modal-ambito-animal'); };

    // Inicialización de eventos
    document.getElementById('form-animal-full').onsubmit = (e) => window.saveFullAnimalForm(e);
    if (a.idprotA) window.loadSpeciesForProtocol(a.idprotA, a.idsubespA);
    
    new bootstrap.Modal(document.getElementById('modal-animal')).show();
};

/* --- FUNCIONES DE RENDERIZADO (MODULOS) --- */

function renderModalHeader(a) {
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <div>
            <h5 class="fw-bold mb-0">Detalle Animal</h5>
            <span class="small text-muted">ID: <strong>${a.idformA}</strong> | Investigador: ${a.Investigador}</span>
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>`;
}

function renderResearcherContact(a) {
    return `
    <div class="row g-2 mb-3 small border-bottom pb-3 text-center">
        <div class="col-md-3"><strong>ID Inv:</strong> ${a.IdInvestigador}</div>
        <div class="col-md-3 text-truncate"><strong>Email:</strong> ${a.EmailInvestigador}</div>
        <div class="col-md-3"><strong>Cel:</strong> ${a.CelularInvestigador}</div>
        <div class="col-md-3 text-truncate"><strong>Depto:</strong> ${a.DeptoProtocolo}</div>
    </div>`;
}

// --- CORRECCIÓN VISUALIZACIÓN "REVISADO POR" ---
function renderAdminSection(a, identity) {
    // Si a.QuienVio es null/vacío, mostramos el texto por defecto.
    // Si tiene dato, mostramos el dato.
    const visorTexto = (a.QuienVio && a.QuienVio !== 'null') ? a.QuienVio : "Sin visor asignado";

    return `
    <div class="bg-light p-3 rounded border shadow-sm mb-3">
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">Estado Pedido</label>
                <div class="d-flex align-items-center gap-2">
                    <select id="modal-status" class="form-select form-select-sm fw-bold" onchange="window.updateAnimalStatusQuick()">
                        <option value="Sin estado" ${a.estado === 'Sin estado' ? 'selected' : ''}>Sin estado</option>
                        <option value="Proceso" ${a.estado === 'Proceso' ? 'selected' : ''}>Proceso</option>
                        <option value="Listo para entrega" ${a.estado === 'Listo para entrega' ? 'selected' : ''}>Listo para entrega</option>
                        <option value="Entregado" ${a.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                        <option value="Suspendido" ${a.estado === 'Suspendido' ? 'selected' : ''}>Suspendido</option>
                        <option value="Reservado" ${a.estado === 'Reservado' ? 'selected' : ''}>Reservado</option>
                    </select>
                    <div id="modal-status-badge-container">${getStatusBadge(a.estado)}</div>
                </div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">Revisado por</label>
                <input type="text" id="modal-quienvisto" class="form-control form-control-sm bg-light fw-bold text-primary" value="${visorTexto}" readonly>
            </div>
            <div class="col-12">
                <label class="form-label small fw-bold text-muted uppercase">Aclaración Admin (Auto-guardado)</label>
                <textarea id="modal-aclaracionadm" class="form-control form-control-sm" rows="2" onblur="window.updateAnimalStatusQuick()">${a.AclaracionAdm || ''}</textarea>
            </div>
        </div>
    </div>`;
}

function renderNotificationSection(lastNotify, idformA) {
    return `
    <div class="alert alert-success border-success mb-3 p-3 d-flex justify-content-between align-items-center shadow-sm">
        <div style="max-width: 70%;">
            <p class="mb-1 fw-bold small uppercase"><i class="bi bi-envelope-check me-1"></i> Notificación por Correo:</p>
            <p id="notify-text" class="mb-0 small" style="font-size: 11px;">
                ${lastNotify ? `<strong>${lastNotify.fecha}:</strong> ${lastNotify.NotaNotificacion}` : 'No se han enviado correos.'}
            </p>
        </div>
        <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="window.openNotifyPopup(${idformA})">NOTIFICAR</button>
    </div>
    <hr class="my-4 border-2 border-success opacity-25">`;
}

function renderOrderModificationSection(a, sex, cache) {
    const deptos = Array.isArray(cache.deptos) ? cache.deptos : [];
    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
    const sinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
    const idDepto = a.idDepto != null ? a.idDepto : '';
    const orgActual = (a.Organizacion && String(a.Organizacion).trim()) ? a.Organizacion : sinOrg;
    const extFlag = Number(a.DeptoExternoFlag || 1);
    const isExt = extFlag === 2;
    const ambitoBadge = isExt ? `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;
    const optionsDepto = deptos.map(d => {
        const ext = (d.externodepto == 2) || (d.externodepto == null && d.externoorganismo == 2) ? 2 : 1;
        const org = (d.NombreOrganismoSimple && String(d.NombreOrganismoSimple).trim()) ? d.NombreOrganismoSimple : sinOrg;
        const sel = (d.iddeptoA == idDepto) ? ' selected' : '';
        return `<option value="${d.iddeptoA}" data-org="${(org || '').replace(/"/g, '&quot;')}" data-externo="${ext}"${sel}>${d.NombreDeptoA || ''}</option>`;
    }).join('');

    return `
    <h6 class="fw-bold text-success uppercase mb-3" style="font-size: 13px;">MODIFICACIÓN DEL FORMULARIO (DATOS DEL PEDIDO)</h6>
    
    <form id="form-animal-full" class="bg-white p-3 border rounded shadow-sm">
        <input type="hidden" name="idformA" value="${a.idformA}">
        <div class="row g-3">
            
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Tipo de Pedido</label>
                <select name="tipoA" id="select-type-modal" class="form-select form-select-sm" onchange="window.calculateAnimalTotals()">
                    ${cache.types.map(t => `<option value="${t.IdTipoFormulario}" data-exento="${t.exento}" data-desc="${t.descuento}" ${a.TipoNombre === t.nombreTipo ? 'selected' : ''}>${t.nombreTipo}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">N° Protocolo (Buscar)</label>
                <input type="text" class="form-control form-control-sm mb-1 bg-light border-0" placeholder="Filtrar protocolo..." onkeyup="window.filterProtocolList(this)">
                <select id="select-protocol-modal" name="idprotA" class="form-select form-select-sm" onchange="window.handleProtocolChange(this)">
                    ${cache.protocols.map(p => `<option value="${p.idprotA}" data-externo="${p.protocoloexpe}" ${a.idprotA == p.idprotA ? 'selected' : ''}>${p.nprotA} - ${p.tituloA}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Departamento</label>
                <select name="depto" id="modal-depto-animal" class="form-select form-select-sm fw-bold">
                    <option value="">— Sin departamento —</option>
                    ${optionsDepto}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Organización</label>
                <div id="modal-org-animal" class="form-control-plaintext form-control-sm bg-light border rounded px-2 py-1 small">${orgActual}</div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Ámbito</label>
                <div id="modal-ambito-animal" class="pt-1">${ambitoBadge}</div>
            </div>

            <div class="col-12 mt-4">
                <h6 class="fw-bold text-success border-bottom border-success border-opacity-25 pb-2 mb-1" style="font-size: 11px;">1. CARACTERÍSTICAS DEL ANIMAL</h6>
            </div>
            
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Especie</label>
                <select id="select-species-modal" name="idsubespA" class="form-select form-select-sm" onchange="window.updateSpeciesPrice(this)"></select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Cepa</label>
                <input type="text" name="razaA" class="form-control form-control-sm" value="${a.raza || ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Edad</label>
                <input type="text" name="edadA" class="form-control form-control-sm" value="${a.Edad || ''}">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Peso</label>
                <input type="text" name="pesoA" class="form-control form-control-sm" value="${a.Peso || ''}">
            </div>

            <div class="col-12 mt-4">
                <h6 class="fw-bold text-success border-bottom border-success border-opacity-25 pb-2 mb-1" style="font-size: 11px;">2. CANTIDADES Y COSTOS</h6>
            </div>

            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Machos</label>
                <input type="number" name="machoA" class="form-control form-control-sm" value="${sex.machoA}" oninput="window.calculateAnimalTotals()">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Hembras</label>
                <input type="number" name="hembraA" class="form-control form-control-sm" value="${sex.hembraA}" oninput="window.calculateAnimalTotals()">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Indistintos</label>
                <input type="number" name="indistintoA" class="form-control form-control-sm" value="${sex.indistintoA}" oninput="window.calculateAnimalTotals()">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Total</label>
                <input type="number" id="total-animals-modal" name="totalA" class="form-control form-control-sm bg-light fw-bold text-center" value="${sex.totalA}" readonly>
            </div>

            <div class="col-md-6 mt-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Precio Unitario (BD)</label>
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-light fw-bold">$</span>
                    <input type="text" id="price-unit-modal" class="form-control bg-light text-end" value="${a.PrecioUnit || 0}" readonly>
                </div>
            </div>
            <div class="col-md-6 mt-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Precio Final</label>
                <div id="discount-alert" class="small text-danger fw-bold mb-1" style="display:none;"></div>
                <div class="input-group input-group-sm">
                    <span class="input-group-text alert-success border-success fw-bold">$</span>
                    <input type="text" id="price-total-modal" class="form-control alert-success border-success fw-bold text-end" value="0.00" readonly>
                </div>
            </div>

            <div class="col-12 mt-4">
                <h6 class="fw-bold text-success border-bottom border-success border-opacity-25 pb-2 mb-1" style="font-size: 11px;">3. FECHAS Y OBSERVACIONES</h6>
            </div>

            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Fecha de Inicio</label>
                <input type="date" name="fechainicioA" class="form-control form-control-sm" value="${a.Inicio || ''}">
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Fecha de Retiro</label>
                <input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${a.Retiro || ''}">
            </div>

            <div class="col-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Aclaración Usuario (Lectura)</label>
                <div class="p-2 border rounded bg-light small" style="min-height: 40px;">${a.Aclaracion || '<span class="text-muted fst-italic">Sin aclaración adicional enviada por el usuario.</span>'}</div>
            </div>

            <div class="mt-4 d-flex justify-content-end gap-2 border-top pt-3 w-100">
                <button type="button" class="btn btn-outline-danger btn-sm px-4 fw-bold shadow-sm" onclick="window.downloadAnimalPDF(${a.idformA})">
                    <i class="bi bi-file-pdf"></i> DESCARGAR PDF
                </button>
                <button type="submit" class="btn btn-success btn-sm px-5 fw-bold shadow-sm" style="background-color: #1a5d3b;">GUARDAR CAMBIOS</button>
            </div>
        </div>
    </form>`;
}
// --- ACTUALIZACIÓN DINÁMICA ---
window.updateAnimalStatusQuick = async () => {
    const id = document.getElementById('current-idformA').value;
    const statusSelect = document.getElementById('modal-status');
    const aclara = document.getElementById('modal-aclaracionadm').value;
    
    // Generamos la identidad fresca para enviar al backend
    const userFull = localStorage.getItem('userFull') || 'Admin';
    const userId = localStorage.getItem('userId') || '?';
    const identity = `${userFull} (ID: ${userId})`;

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', statusSelect.value);
    fd.append('aclaracionadm', aclara);
    fd.append('userName', identity); 

    try {
        const res = await API.request(`/animals/update-status`, 'POST', fd);
        if (res.status === 'success') {
            // Al guardar éxito, actualizamos el input visualmente con el nombre actual
            document.getElementById('modal-quienvisto').value = identity;
            document.getElementById('modal-status-badge-container').innerHTML = getStatusBadge(statusSelect.value);
            syncAllData(); 
        }
    } catch (e) { console.error(e); }
};

/**
 * CÁLCULO DE PRECIOS CON EXENTO Y DESCUENTO
 */
window.calculateAnimalTotals = () => {
    const m = parseInt(document.querySelector('input[name="machoA"]').value) || 0;
    const h = parseInt(document.querySelector('input[name="hembraA"]').value) || 0;
    const i = parseInt(document.querySelector('input[name="indistintoA"]').value) || 0;
    const total = m + h + i;
    document.getElementById('total-animals-modal').value = total;

    const typeSelect = document.getElementById('select-type-modal');
    const selectedType = typeSelect.options[typeSelect.selectedIndex];
    
    // Lógica de Modificadores (Exento y Descuento)
    const isExento = selectedType.dataset.exento == "1";
    const discountPercent = parseFloat(selectedType.dataset.desc) || 0;
    const unitPrice = parseFloat(document.getElementById('price-unit-modal').value) || 0;

    let finalPrice = total * unitPrice;

    const alertBox = document.getElementById('discount-alert');
    if (isExento) {
        finalPrice = 0;
        alertBox.style.display = 'block';
        alertBox.innerText = "⚠️ EXENTO DE PAGO (100%)";
    } else if (discountPercent > 0) {
        finalPrice = finalPrice * (1 - (discountPercent / 100));
        alertBox.style.display = 'block';
        alertBox.innerText = `🎁 DESCUENTO POR ${selectedType.text}: ${discountPercent}%`;
    } else {
        alertBox.style.display = 'none';
    }

    document.getElementById('price-total-modal').value = finalPrice.toFixed(2);
};

window.loadSpeciesForProtocol = async (protId, selectedSubId = null) => {
    const select = document.getElementById('select-species-modal');
    if (!select) return;

    try {
        const res = await API.request(`/animals/protocol-species?id=${protId}`);
        if (res.status === 'success' && res.data) {
            // Filtro: No inactivos (existe=2)
            const filtered = res.data.filter(s => s.existe != 2);
            if (filtered.length > 0) {
                select.innerHTML = filtered.map(s => `
                    <option value="${s.idsubespA}" data-price="${s.Psubanimal}" ${selectedSubId == s.idsubespA ? 'selected' : ''}>
                        ${s.EspeNombreA} - ${s.SubEspeNombreA}
                    </option>`).join('');
                window.updateSpeciesPrice(select);
            } else {
                select.innerHTML = '<option value="">Sin especies aprobadas</option>';
            }
        }
    } catch (e) { console.error(e); }
};

window.updateSpeciesPrice = (select) => {
    const selected = select.options[select.selectedIndex];
    if (selected) {
        document.getElementById('price-unit-modal').value = selected.dataset.price || 0;
        window.calculateAnimalTotals();
    }
};

window.handleProtocolChange = async (select) => {
    window.loadSpeciesForProtocol(select.value);
};

window.updateDeptoOrgAmbito = (selectEl, idOrg, idAmbito) => {
    const opt = selectEl && selectEl.options[selectEl.selectedIndex];
    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
    const sinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
    const orgEl = idOrg ? document.getElementById(idOrg) : null;
    const ambitoEl = idAmbito ? document.getElementById(idAmbito) : null;
    if (opt && opt.value) {
        const org = opt.dataset.org || sinOrg;
        const ext = parseInt(opt.dataset.externo, 10) === 2;
        if (orgEl) orgEl.textContent = org;
        if (ambitoEl) ambitoEl.innerHTML = ext ? `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;
    } else {
        if (orgEl) orgEl.textContent = sinOrg;
        if (ambitoEl) ambitoEl.innerHTML = '';
    }
};

window.filterProtocolList = (input) => {
    const term = input.value.toLowerCase();
    const select = document.getElementById('select-protocol-modal');
    Array.from(select.options).forEach(opt => opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none');
};

window.saveFullAnimalForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const instId = localStorage.getItem('instId');

    try {
        const res = await API.request(`/animals/update-full?inst=${instId}`, 'POST', fd);
        if (res.status === 'success') {
            window.Swal.fire({ 
                title: '¡Guardado!', 
                text: 'Los datos del pedido se han actualizado.', 
                icon: 'success', 
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#1a5d3b'
            }).then(() => { location.reload(); });
        }
    } catch (err) { console.error(err); }
};

/**
 * NOTIFICACIÓN POR CORREO - GROBO (CON LOADER DE CARGA)
 */
window.openNotifyPopup = async (idformA) => {
    // 1. GESTIÓN DE FOCO (Para evitar conflictos con Bootstrap)
    const animalModalEl = document.getElementById('modal-animal');
    const modalInstance = bootstrap.Modal.getInstance(animalModalEl);
    const originalFocus = modalInstance._config.focus;
    modalInstance._config.focus = false;

    // 2. INPUT DE MENSAJE
    const { value: nota } = await window.Swal.fire({
        title: 'Enviar Notificación',
        input: 'textarea',
        inputLabel: 'Mensaje para el investigador',
        inputPlaceholder: 'Escriba aquí la observación...',
        showCancelButton: true,
        confirmButtonText: 'Enviar Correo',
        confirmButtonColor: '#1a5d3b',
        didOpen: () => {
            const input = window.Swal.getInput();
            if (input) {
                input.focus();
                input.addEventListener('keydown', (e) => e.stopPropagation());
            }
        },
        willClose: () => {
            modalInstance._config.focus = originalFocus;
        }
    });

    // 3. PROCESO DE ENVÍO CON FEEDBACK VISUAL
    if (nota) {
        const instId = localStorage.getItem('instId');
        const adminId = localStorage.getItem('userId');

        // --- AQUÍ ESTÁ LA MAGIA: MOSTRAR "ENVIANDO..." ---
        window.Swal.fire({
            title: 'Enviando...',
            text: 'Conectando con el servidor de correo, por favor espere.',
            allowOutsideClick: false, // Bloquea clics fuera
            allowEscapeKey: false,    // Bloquea tecla ESC
            didOpen: () => {
                window.Swal.showLoading(); // Muestra el spinner girando
            }
        });

        try {
            const res = await API.request('/animals/send-notification', 'POST', { 
                idformA, nota, instId, adminId 
            });
            
            if (res.status === 'success') {
                sessionStorage.setItem('reopenAnimalId', idformA);

                // El nuevo Swal reemplaza automáticamente al de "Cargando"
                window.Swal.fire({
                    title: '¡Enviado!',
                    text: 'Los correos han sido enviados correctamente.',
                    icon: 'success',
                    timer: 2000, // Se cierra solo a los 2 seg
                    showConfirmButton: false
                }).then(() => {
                    location.reload(); 
                });
            } else {
                window.Swal.fire('Error', res.message || 'Fallo en el servidor', 'error');
            }
        } catch (e) { 
            window.Swal.fire('Error', 'Fallo de conexión', 'error');
        }
    }
};
/* --- AUXILIARES --- */

function getStatusBadge(estado) {
    const e = (estado || "Sin estado").toString().toLowerCase().trim();
    const states = {
        'entregado':          { label: 'Entregado',          class: 'bg-success text-white' },
        'proceso':            { label: 'Proceso',            class: 'bg-primary text-white' },
        'listo para entrega': { label: 'Listo para entrega', class: 'bg-warning text-dark' },
        'suspendido':         { label: 'Suspendido',         class: 'bg-danger text-white' },
        'reservado':          { label: 'Reservado',          class: 'bg-info text-dark' },
        'sin estado':         { label: 'Sin estado',         class: 'bg-secondary text-white' }
    };
    const s = states[e] || states['sin estado'];
    return `<span class="badge ${s.class} shadow-sm" style="font-size: 9px; font-weight: 700; padding: 5px 10px; min-width: 90px; display: inline-block;">${s.label}</span>`;
}

function renderPagination(t, c, r) {
    const pag = document.getElementById(c); const total = Math.ceil(t / rowsPerPage);
    pag.innerHTML = ''; if (total <= 1) return;
    const btn = (l, p, d, a = false) => {
        const li = document.createElement('li'); li.className = `page-item ${d ? 'disabled' : ''} ${a ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${l}</a>`;
        if (!d) li.onclick = (e) => { e.preventDefault(); currentPage = p; r(); }; return li;
    };
    pag.appendChild(btn('Anterior', currentPage - 1, currentPage === 1));
    pag.appendChild(btn(1, 1, false, currentPage === 1));
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(total - 1, currentPage + 2); i++) pag.appendChild(btn(i, i, false, i === currentPage));
    if (total > 1) pag.appendChild(btn(total, total, false, currentPage === total));
    pag.appendChild(btn('Siguiente', currentPage + 1, currentPage === total));
}

/**
 * GENERACIÓN DE FICHA PDF PERSONALIZADA - GROBO
 * Versión final con corrección de campos y lógica de exención.
 */
window.downloadAnimalPDF = async (id) => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // Captura mejorada de selectores por 'name' para evitar el problema de Edad/Peso
    const getValByName = (name) => document.querySelector(`input[name="${name}"], textarea[name="${name}"]`)?.value || '---';
    const getSel = (id) => {
        const sel = document.getElementById(id);
        return sel ? sel.options[sel.selectedIndex]?.text : '---';
    };

    // Datos principales
    const investigador = document.querySelector('#modal-content-animal h5 + span')?.innerText || '---';
    const contacto = document.querySelector('#modal-content-animal .row.g-2.mb-3')?.innerText || '---';
    const tipoPedido = getSel('select-type-modal');
    const nProtocolo = getSel('select-protocol-modal');
    const especie = getSel('select-species-modal');
    const estado = getSel('modal-status');
    
    // Corrección Edad y Peso
    const edad = getValByName('edadA');
    const peso = getValByName('pesoA');
    const raza = getValByName('razaA');

    
    const machos = getValByName('machoA') || '0';
    const hembras = getValByName('hembraA') || '0';
    const indistintos = getValByName('indistintoA') || '0';
    const total = document.getElementById('total-animals-modal')?.value || '0';
    
    const precioUnit = document.getElementById('price-unit-modal')?.value || '0';
    const precioTotalRaw = document.getElementById('price-total-modal')?.value || '0';
    
    // Lógica Exento de Pago
    let precioFinalDisplay = `$${precioTotalRaw}`;
    if (parseFloat(precioTotalRaw) === 0) {
        precioFinalDisplay = `$${precioTotalRaw} (Exento de pago)`;
    }

    const fInicio = getValByName('fechainicioA');
    const fRetiro = getValByName('fecRetiroA');
    const aclaracion = document.querySelector('#form-animal-full .bg-light.small')?.innerText || 'Sin aclaraciones.';

    // HTML del Template para PDF
    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 10px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1a5d3b;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; color: #444;">FICHA DE PEDIDO: ANIMAL</h4>
                <p style="margin: 0; font-size: 12px; color: #666;">ID Pedido: ${id} | Generado: ${new Date().toLocaleString()}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; margin: 5px 0;"><strong>Investigador:</strong> ${investigador}</p>
                <p style="font-size: 11px; margin: 5px 0; color: #555;">${contacto}</p>
                <p style="font-size: 14px; margin: 15px 0;"><strong>ESTADO DEL PEDIDO:</strong> <span style="color: #1a5d3b; font-weight: bold;">${estado}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 50%;"><strong>Tipo de Pedido:</strong><br>${tipoPedido}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>N° Protocolo:</strong><br>${nProtocolo}</td>
                </tr>
            <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Categoría Especie:</strong><br>${especie}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">
                        <strong>Cepa:</strong> ${raza} <br> <strong>Edad:</strong> ${edad} <br> <strong>Peso:</strong> ${peso}
                    </td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Machos</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Hembras</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Indistintos</th>
                        <th style="padding: 10px; border: 1px solid #ddd; background-color: #e9f5ee;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${machos}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${hembras}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${indistintos}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${total}</td>
                    </tr>
                </tbody>
            </table>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #eee;">
                <p style="margin: 5px 0; font-size: 12px;"><strong>Precio Unitario:</strong> $${precioUnit}</p>
                <p style="margin: 5px 0; font-size: 18px; color: #1a5d3b;"><strong>PRECIO TOTAL: ${precioFinalDisplay}</strong></p>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;">
                    <strong>Fecha Inicio:</strong><br>${fInicio}
                </div>
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;">
                    <strong>Fecha Retiro:</strong><br>${fRetiro}
                </div>
            </div>

            <div style="border-top: 1px solid #eee; padding-top: 10px;">
                <p style="font-size: 11px; margin-bottom: 5px;"><strong>Aclaración del Usuario:</strong></p>
                <p style="font-size: 11px; font-style: italic; color: #555; background: #fff; padding: 5px; border: 1px dashed #ccc;">${aclaracion}</p>
            </div>
        </div>
    `;

    // Configuración de html2pdf
    const opt = {
        margin: [18, 18, 18, 18],
        filename: `GROBO_${inst}_Pedido_${id}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(pdfTemplate).save();
    } catch (error) {
        console.error("Error al generar PDF:", error);
    }
};

/**
 * PROCESAR EXPORTACIÓN A EXCEL - GROBO
 */
window.processExcelExport = () => {
    const start = document.getElementById('excel-start-date').value;
    const end = document.getElementById('excel-end-date').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    if (!start || !end) {
        window.Swal.fire('Atención', 'Debe seleccionar un rango de fechas.', 'warning');
        return;
    }

    let data = getFilteredAndSortedData();

    // Filtro por rango de fechas
    data = data.filter(a => {
        const fechaPedido = a.Inicio || '0000-00-00';
        return fechaPedido >= start && fechaPedido <= end;
    });

    if (data.length === 0) {
        window.Swal.fire('Sin resultados', 'No hay registros en ese rango.', 'info');
        return;
    }

    // Encabezados con punto y coma
    const headers = ["ID", "Tipo", "Investigador", "Protocolo", "Especie", "Cepa", "Edad", "Peso", "Total", "Inicio", "Retiro", "Estado"];
    const csvRows = [headers.join(";")];

    data.forEach(a => {
        const row = [
            a.idformA,
            a.TipoNombre,
            a.Investigador,
            a.NProtocolo || '---',
            a.CatEspecie || '---',
            a.raza || '---',  // NUEVO
            a.Edad || '---',  // NUEVO
            a.Peso || '---',  // NUEVO
            a.CantAnimal,
            `="${a.Inicio || '---'}"`, 
            `="${a.Retiro || '---'}"`,
            a.estado
        ];
        // Limpiar el texto para que no rompa las columnas
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // Generación del archivo con nombre detallado
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Nombre de archivo con fechas incluido
    link.setAttribute("href", url);
    link.setAttribute("download", `GROBO_${nombreInst}_Animales_${start}_al_${end}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modal-excel-animal'));
    if (modalInstance) modalInstance.hide();
};