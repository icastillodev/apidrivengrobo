/**
 * NETWISE - Gestión de Reactivos Biológicos (Versión Pro)
 * Sistema: GROBO 2026
 */
import { API } from '../../api.js';
import { hideLoader } from '../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';

let allReactivos = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idformA', direction: 'none' };
let formDataCache = null;

/**
 * 1. INICIALIZACIÓN DE PÁGINA DE REACTIVOS
 */
export async function initReactivosPage() {
    const instId = localStorage.getItem('instId');

    // Blindaje de teclado para SweetAlert (evita que Bootstrap robe el foco)
    // Esto es lo que permite que el cuadro de texto de notificación sea escribible
    document.addEventListener('focusin', (e) => {
        if (e.target.closest(".swal2-container")) {
            e.stopImmediatePropagation();
        }
    }, true);
    const btnExcel = document.getElementById('btn-excel-reactivo');
        if (btnExcel) {
            btnExcel.onclick = () => {
                const modalExcel = new bootstrap.Modal(document.getElementById('modal-excel-reactivo'));
                modalExcel.show();
            };
        }
        const btnAyuda = document.getElementById('btn-ayuda-reactivo');
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            // Asegúrate de que el Modal en el HTML tenga el ID: modal-reactivo-help
            const modalHelp = new bootstrap.Modal(document.getElementById('modal-reactivo-help'));
            modalHelp.show();
        };
    }
    try {
        // Carga inicial de datos de la institución
        const res = await API.request(`/reactivos/all?inst=${instId}`);
        
        if (res && res.status === 'success') {
            allReactivos = res.data;
            setupSortHeaders();
            renderTable();

            // LÓGICA DE RE-APERTURA POST-RECARGA
            // Se ejecuta aquí dentro para garantizar que 'allReactivos' ya tiene datos
            const reopenId = sessionStorage.getItem('reopenReactivoId');
            if (reopenId) {
                sessionStorage.removeItem('reopenReactivoId');
                
                // Un pequeño delay para asegurar que el DOM y los componentes estén listos
                setTimeout(() => {
                    const data = allReactivos.find(r => r.idformA == reopenId);
                    if (data) {
                        window.openReactivoModal(data);
                    }
                }, 400); 
            }
        }
    } catch (error) { 
        console.error("❌ Error crítico en API de Reactivos:", error); 
    }

    // Eventos de búsqueda y filtros
    const btnSearch = document.getElementById('btn-search-reactivo');
    const filterStatus = document.getElementById('filter-status-reactivo');
    const searchInput = document.getElementById('search-input-reactivo');

    if (btnSearch) btnSearch.onclick = () => { currentPage = 1; renderTable(); };
    if (filterStatus) filterStatus.onchange = () => { currentPage = 1; renderTable(); };
    if (searchInput) {
        searchInput.onkeyup = (e) => { 
            if (e.key === 'Enter') { currentPage = 1; renderTable(); } 
        };
    }
}

/**
 * 2. MODAL DE DETALLE
 */
/**
 * 2. MODAL DE DETALLE (Versión Blindada y Sincronizada)
 */
window.openReactivoModal = async (r) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-reactivo');
    
    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;
    
    try {
        const [resMaster, resUsage, resNotify] = await Promise.all([
            API.request(`/reactivos/form-data?inst=${instId}`),
            // Cambiamos el endpoint para obtener organo y totalA desde Reactivos
            API.request(`/reactivos/usage?id=${r.idformA}`), 
            API.request(`/reactivos/last-notification?id=${r.idformA}`)
        ]);

        const cache = resMaster.data || {};
        const protocols = cache.protocols || cache.protocolos || [];
        const insumos = cache.insumos || [];
        
        // Mapeamos los datos de la entidad sexoe
        const usage = resUsage.data || { totalA: 0, organo: 0 };
        const lastNotify = resNotify.data;
        const identity = `${localStorage.getItem('userFull')} (ID: ${localStorage.getItem('userId')})`;

        let html = renderModalHeader(r);
        html += renderResearcherContact(r);
        html += `<input type="hidden" id="current-idformA" value="${r.idformA}">`;
        html += renderAdminSection(r, identity);
        html += renderNotificationSection(lastNotify, r.idformA);
        
        // Pasamos usage (con organo y totalA) y las listas
        html += renderOrderModificationSection(r, usage, { protocols, insumos });

        container.innerHTML = html;

        document.getElementById('form-reactivo-full').onsubmit = (e) => window.saveFullReactivoForm(e);
        
        const modalEl = document.getElementById('modal-reactivo');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();

    } catch (e) {
        console.error("❌ Error abriendo modal:", e);
        container.innerHTML = `<div class="alert alert-danger">Error al cargar los datos del pedido.</div>`;
    }
};

/* --- MÓDULOS DE RENDERIZADO DEL MODAL --- */

function renderModalHeader(r) {
    const t = window.txt.reactivos.modal;
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <div>
            <h5 class="fw-bold mb-0">${t.detail_title}</h5>
            <span class="small text-muted">ID: <strong>${r.idformA}</strong> | Investigador: ${r.Investigador}</span>
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>`;
}

/**
 * MÓDULO DE CONTACTO - AHORA CON DEPARTAMENTO
 */
function renderResearcherContact(r) {
    const t = window.txt.reactivos.modal;
    return `
    <div class="row g-2 mb-3 small border-bottom pb-3 text-center">
        <div class="col-md-4 text-truncate"><strong>${t.email}:</strong> ${r.EmailInvestigador || '---'}</div>
        <div class="col-md-4"><strong>${t.phone}:</strong> ${r.CelularInvestigador || '---'}</div>
        <div class="col-md-4 text-truncate"><strong>${t.dept}:</strong> <span class="text-primary fw-bold">${r.Departamento || '---'}</span></div>
    </div>`;
}

function renderAdminSection(r, identity) {
    const t = window.txt.reactivos;
    const estado = (r.estado || "Sin estado").trim();
    return `
    <div class="bg-light p-3 rounded border shadow-sm mb-3">
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">${t.modal.order_status}</label>
                <div class="d-flex align-items-center gap-2">
                    <select id="modal-status" class="form-select form-select-sm fw-bold" onchange="window.updateReactivoStatusQuick()">
                        <option value="Sin estado" ${estado === 'Sin estado' ? 'selected' : ''}>${t.status.none}</option>
                        <option value="Proceso" ${estado === 'Proceso' ? 'selected' : ''}>${t.status.process}</option>
                        <option value="Listo para entrega" ${estado === 'Listo para entrega' ? 'selected' : ''}>${t.status.ready}</option>
                        <option value="Entregado" ${estado === 'Entregado' ? 'selected' : ''}>${t.status.delivered}</option>
                        <option value="Suspendido" ${estado === 'Suspendido' ? 'selected' : ''}>${t.status.suspended}</option>
                        <option value="Reservado" ${estado === 'Reservado' ? 'selected' : ''}>${t.status.reserved}</option>
                    </select>
                    <div id="modal-status-badge-container">${getStatusBadge(estado)}</div>
                </div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">${t.modal.reviewed_by}</label>
                <input type="text" id="modal-quienvisto" class="form-control form-control-sm bg-light fw-bold text-primary" value="${r.quienvisto || identity}" readonly>
            </div>
            <div class="col-12">
                <label class="form-label small fw-bold text-muted uppercase">${t.modal.admin_notes}</label>
                <textarea id="modal-aclaracionadm" class="form-control form-control-sm" rows="2" onblur="window.updateReactivoStatusQuick()">${r.aclaracionadm || ''}</textarea>
            </div>
        </div>
    </div>`;
}
/**
 * Renderiza la sección usando el estado guardado en la notificación
 */
function renderNotificationSection(lastNotify, idformA) {
    const t = window.txt.reactivos.modal;
    const hasData = lastNotify && lastNotify.NotaNotificacion;
    const badgeHtml = hasData ? getStatusBadge(lastNotify.estado) : '';

    return `
    <div class="alert alert-success border-success mb-3 p-3 shadow-sm">
        <div class="d-flex justify-content-between align-items-center">
            <div style="max-width: 80%;">
                <p class="mb-1 fw-bold small uppercase"><i class="bi bi-envelope-check me-1"></i> ${t.last_notify}:</p>
                <div class="mb-0 small" style="font-size: 11px;">
                    ${hasData ? `
                        <span class="text-muted fw-bold">${lastNotify.fecha}:</span> 
                        <span class="text-dark">${lastNotify.NotaNotificacion}</span>
                        <div class="mt-1"><span class="small text-muted me-1">${t.notified_status}:</span> ${badgeHtml}</div>
                    ` : `<span class="text-muted italic">${t.not_notified}</span>`}
                </div>
            </div>
            <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="window.openNotifyPopupReactivo(${idformA})">${t.notify_btn}</button>
        </div>
    </div>`;
}
/**
 * RENDERIZADO TÉCNICO - CORRECCIÓN DE SELECTORES Y CANTIDADES
 */
/**
 * RENDERIZADO TÉCNICO - VERSIÓN FINAL PRECISIÓN TÉCNICA
 */
function renderOrderModificationSection(r, usage, cache) {
    const t = window.txt.reactivos.modal;
    const protocolos = cache.protocols || cache.protocolos || [];
    const reactivos = cache.insumos || [];
    const isExterno = r.EsOtrosCeuas == 1;

    return `
    <h6 class="fw-bold text-success uppercase mb-3" style="font-size: 11px;">${t.tech_mod}</h6>
    <div class="alert alert-danger py-1 px-2 mb-3 fw-bold" style="font-size: 10px; display: ${isExterno ? 'block' : 'none'};">${t.external_warning}</div>

    <form id="form-reactivo-full">
        <input type="hidden" name="idformA" value="${r.idformA}">
        <div class="row g-3">
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase">${t.protocol_label}</label>
                <input type="text" class="form-control form-control-sm mb-1" placeholder="${t.filter_placeholder}" onkeyup="window.filterProtocolList(this)">
                <select id="select-protocol-modal" name="idprotA" class="form-select form-select-sm">
                    <option value="">${t.select_proto}</option>
                    ${protocolos.map(p => {
                        const isSelected = (p.idprotA == r.idprotA) ? 'selected' : '';
                        return `<option value="${p.idprotA}" ${isSelected}>${p.nprotA} - ${p.tituloA} (ID:${p.idprotA})</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase">${t.reagent_bio}</label>
                <select name="idinsumoA" class="form-select form-select-sm">
                    ${reactivos.map(i => `<option value="${i.IdInsumoexp}" ${r.Reactivo === i.NombreInsumo ? 'selected' : ''}>${i.NombreInsumo} [${i.TipoInsumo}]</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase">${t.qty_req} (${r.Medida || ''})</label>
                <input type="number" step="any" name="organo" class="form-control form-control-sm fw-bold text-primary" value="${usage.organo || 0}">
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase">${t.animals_used}</label>
                <input type="number" name="totalA" class="form-control form-control-sm fw-bold text-danger" value="${usage.totalA || 0}">
            </div>
            <div class="col-md-6"><label class="form-label small fw-bold uppercase">${t.start_date}</label><input type="date" name="fechainicioA" class="form-control form-control-sm" value="${r.Inicio || ''}"></div>
            <div class="col-md-6"><label class="form-label small fw-bold uppercase">${t.end_date}</label><input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${r.Retiro || ''}"></div>
            <div class="mt-4 d-flex justify-content-end gap-2 border-top pt-3">
                <button type="button" class="btn btn-danger btn-sm px-4 fw-bold shadow-sm" onclick="window.downloadReactivoPDF(${r.idformA})">PDF</button>
                <button type="submit" class="btn btn-primary btn-sm px-5 fw-bold shadow">${t.save_btn}</button>
            </div>
        </div>
    </form>`;
}
/* --- EVENTOS DINÁMICOS --- */

window.updateReactivoStatusQuick = async () => {
    const id = document.getElementById('current-idformA').value;
    const statusSelect = document.getElementById('modal-status');
    const badgeContainer = document.getElementById('modal-status-badge-container');
    const aclara = document.getElementById('modal-aclaracionadm').value;
    const identity = `${localStorage.getItem('userFull')} (ID: ${localStorage.getItem('userId')})`;

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', statusSelect.value);
    fd.append('aclaracionadm', aclara);
    fd.append('userName', identity); 

    try {
        const res = await API.request(`/reactivos/update-status`, 'POST', fd);
        if (res.status === 'success') {
            // Cambio de color instantáneo en el modal
            if (badgeContainer) {
                badgeContainer.innerHTML = getStatusBadge(statusSelect.value);
            }
            document.getElementById('modal-quienvisto').value = identity;
            
            // Sincronizamos la tabla principal de fondo sin cerrar el modal
            syncAllData(); 
        }
    } catch (e) { 
        console.error("❌ Error 500 en servidor al actualizar estado");
    }
};

/**
 * REPARACIÓN DEL FILTRADO DE PROTOCOLOS
 */
/**
 * FILTRADO DE PROTOCOLOS EN TIEMPO REAL
 */
window.filterProtocolList = (input) => {
    const term = input.value.toLowerCase().trim();
    const select = document.getElementById('select-protocol-modal');
    if (!select) return;

    const options = Array.from(select.options);
    
    options.forEach(opt => {
        // No filtramos la opción vacía (placeholder)
        if (opt.value === "") return;

        const text = opt.text.toLowerCase();
        // Si el término está en el texto (N°, Título o ID), se muestra
        if (text.includes(term)) {
            opt.style.display = "";
            opt.disabled = false;
        } else {
            opt.style.display = "none";
            opt.disabled = true;
        }
    });

    // Si la opción seleccionada actualmente quedó oculta, reseteamos el select al primer visible
    if (select.selectedOptions[0] && select.selectedOptions[0].style.display === "none") {
        select.value = "";
    }
};
window.saveFullReactivoForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const instId = localStorage.getItem('instId');

    try {
        const res = await API.request(`/reactivos/update-full?inst=${instId}`, 'POST', fd);
    if (res.status === 'success') {
        const t = window.txt.reactivos.alerts;
        window.Swal.fire({ 
            title: t.tech_update_title, 
            text: t.tech_update_msg, 
            icon: 'success', 
            confirmButtonColor: '#1a5d3b' 
        }).then(() => { location.reload(); });
    }
    } catch (err) { console.error("❌ Error actualización técnica:", err); }
};

/**
 * GENERACIÓN DE PDF - REACTIVOS
 * Captura datos por 'name' y recupera la especie del estado global.
 */
window.downloadReactivoPDF = async (id) => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // 1. Buscamos los datos originales del reactivo para obtener la Especie
    const rData = allReactivos.find(item => item.idformA == id);
    const especie = rData ? (rData.Especie || '---') : '---';

    // 2. Capturadores inteligentes por nombre de atributo
    const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '---';
    
    // Captura el texto del select usando el atributo 'name' ya que no tiene ID
    const getSelTextByName = (name) => {
        const s = document.querySelector(`select[name="${name}"]`);
        if (!s || s.selectedIndex === -1) return '---';
        return s.options[s.selectedIndex].text;
    };

    // Datos del modal abierto
    const invHeader = document.querySelector('#modal-content-reactivo h5 + span')?.innerText || '---';
    const contactoInfo = document.querySelector('#modal-content-reactivo .row.g-2.mb-3')?.innerText || '---';
    const estadoActual = document.getElementById('modal-status')?.options[document.getElementById('modal-status').selectedIndex]?.text || '---';
    
    // Captura técnica corregida
    const reactivoNombre = getSelTextByName('idinsumoA'); // Usa el name del renderOrderModificationSection
    const nProtocolo = getSelTextByName('idprotA');

    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 15px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1a5d3b;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0;">FICHA DE PEDIDO: REACTIVO BIOLÓGICO</h4>
                <p style="margin: 0; font-size: 11px; color: #666;">ID Solicitud: ${id} | Generado: ${new Date().toLocaleString()}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Investigador:</strong> ${invHeader}</p>
                <p style="margin: 5px 0; font-size: 11px; color: #555;">${contactoInfo}</p>
                <p style="margin: 15px 0; font-size: 14px;"><strong>ESTADO DEL PEDIDO:</strong> <span style="color: #1a5d3b; font-weight: bold;">${estadoActual}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 50%;"><strong>Protocolo Asociado:</strong><br>${nProtocolo}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Especie:</strong><br>${especie}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; border: 1px solid #ddd;"><strong>Reactivo:</strong><br>${reactivoNombre}</td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; border: 1px solid #ddd;">Cantidad Solicitada</th>
                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #e9f5ee;">Animales Utilizados</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${getVal('organo')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${getVal('totalA')}</td>
                </tr>
            </table>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;"><strong>Fecha Inicio:</strong><br>${getVal('fechainicioA')}</div>
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;"><strong>Fecha Retiro:</strong><br>${getVal('fecRetiroA')}</div>
            </div>

            <div style="border-top: 2px solid #eee; padding-top: 15px; background: #fcfcfc; padding: 10px;">
                <p style="font-size: 12px; font-weight: bold; color: #1a5d3b; margin-bottom: 5px;">ÚLTIMA OBSERVACIÓN REGISTRADA:</p>
                <p style="font-size: 11px; font-style: italic; color: #444;">
                    ${document.querySelector('.alert-success div.small')?.innerText || 'Sin observaciones.'}
                </p>
            </div>
            
            <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                <div style="width: 200px; border-top: 1px solid #999; text-align: center; font-size: 10px; padding-top: 5px;">
                    Firma Responsable Bioterio
                </div>
                <div style="width: 200px; border-top: 1px solid #999; text-align: center; font-size: 10px; padding-top: 5px;">
                    Sello Institucional
                </div>
            </div>
        </div>
    `;

    const opt = { 
        margin: 10, 
        filename: `Pedido_Reactivo_${id}.pdf`, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        html2canvas: { scale: 2 } 
    };
    html2pdf().set(opt).from(pdfTemplate).save();
};
/**
 * AUXILIARES (TABLA)
 */
async function syncAllData() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/reactivos/all?inst=${instId}`);
    if (res && res.status === 'success') {
        allReactivos = res.data;
        renderTable(); 
        refreshMenuNotifications(); 
    }
}

function renderTable() {
    const tbody = document.getElementById('table-body-reactivos');
    const data = getFilteredAndSortedData(); 
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const t = window.txt.reactivos; // Alias corto

    tbody.innerHTML = '';
    pageData.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => window.openReactivoModal(r);

        const badgeCeua = (r.EsOtrosCeuas == 1) 
            ? `<div class="mt-1"><span class="badge bg-danger shadow-sm" style="font-size: 8px;">${t.table.others_ceuas}</span></div>` 
            : '';

        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">${r.idformA}</td>
            <td class="py-2 px-2 small fw-bold">${r.Investigador}</td>
            <td class="py-2 px-2 small fw-bold text-success">
                ${r.NProtocolo || '---'}
                ${badgeCeua}
            </td>
            <td class="py-2 px-2 small text-uppercase text-muted" style="font-size: 10px;">
                ${r.Especie || `<span class="opacity-50 italic">${t.table.no_species}</span>`}
            </td>
            <td class="py-2 px-2 text-center small fw-bold text-muted">${r.AnimalesUsados || 0}</td>
            <td class="py-2 px-2 small fw-bold text-dark">${r.Reactivo || t.table.not_assigned}</td> 
            <td class="py-2 px-2 text-center">
                <span class="fw-bold text-primary" style="font-size: 11px;">${r.CantidadReactivo || 0}</span>
                <span class="text-muted fw-bold" style="font-size: 10px;">${r.Medida || ''}</span> 
            </td>
            <td class="py-2 px-2 small text-muted">${r.Inicio || '---'}</td>
            <td class="py-2 px-2 small text-muted">${r.Retiro || '---'}</td>
            <td class="py-2 px-2 small text-truncate" style="max-width: 120px;" title="${r.Aclaracion || ''}">
                ${r.Aclaracion || '---'}
            </td>
            <td class="py-2 px-2 text-center">${getStatusBadge(r.estado)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateHeaderIcons();
    renderPagination(data.length, 'pagination-reactivo', renderTable);
    hideLoader();
}
// ... (getStatusBadge, setupSortHeaders, getFilteredAndSortedData, updateHeaderIcons se mantienen iguales al patrón de animales)

function getStatusBadge(estado) {
    const e = (estado || "Sin estado").toString().toLowerCase().trim();
    const states = {
        'entregado': { label: 'Entregado', class: 'bg-success text-white' },
        'proceso': { label: 'Proceso', class: 'bg-primary text-white' },
        'listo para entrega': { label: 'Listo para entrega', class: 'bg-warning text-dark' },
        'suspendido': { label: 'Suspendido', class: 'bg-danger text-white' },
        'reservado': { label: 'Reservado', class: 'bg-info text-dark' },
        'sin estado': { label: 'Sin estado', class: 'bg-secondary text-white' }
    };
    const s = states[e] || states['sin estado'];
    return `<span class="badge ${s.class} shadow-sm" style="font-size: 8px; font-weight: 700; padding: 4px 8px; min-width: 90px; display: inline-block;">${s.label}</span>`;
}

function getFilteredAndSortedData() {
    const statusFilter = document.getElementById('filter-status-reactivo').value.toLowerCase();
    const term = document.getElementById('search-input-reactivo').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-column-reactivo').value;

    let data = allReactivos.filter(r => {
        const estadoFila = (r.estado || "sin estado").toString().toLowerCase().trim();
        if (statusFilter !== 'all' && estadoFila !== statusFilter) return false;
        if (!term) return true;
        if (filterType === 'all') return JSON.stringify(r).toLowerCase().includes(term);
        return String(r[filterType] || '').toLowerCase().includes(term);
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

function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
        th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
    });
}

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
function renderPagination(t, c, r) {
    const pag = document.getElementById(c); const total = Math.ceil(t / rowsPerPage);
    if (!pag) return;
    pag.innerHTML = ''; if (total <= 1) return;
    const btn = (l, p, d, a = false) => {
        const li = document.createElement('li'); li.className = `page-item ${d ? 'disabled' : ''} ${a ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${l}</a>`;
        if (!d) li.onclick = (e) => { e.preventDefault(); currentPage = p; r(); }; return li;
    };
    pag.appendChild(btn('Anterior', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pag.appendChild(btn(i, i, false, i === currentPage));
        }
    }
    pag.appendChild(btn('Siguiente', currentPage + 1, currentPage === total));
}

/**
 * FUNCIÓN AUXILIAR PARA CAMBIAR DE PÁGINA
 */
window.changePage = (page) => {
    currentPage = page;
    renderTable(); // Re-renderiza la tabla con el nuevo índice
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube al inicio de la tabla
};
/**
 * 2. POPUP DE NOTIFICACIÓN (Con blindaje de foco y validación)
 */
window.openNotifyPopupReactivo = async (idformA) => {
    // Si llegara a fallar el paso del parámetro, lo detectamos aquí
    if (!idformA || idformA === 'undefined') {
        console.error("ID no válido recibido:", idformA);
        return window.Swal.fire('Error', 'ID de formulario no válido o vacío', 'error');
    }

    const modalEl = document.getElementById('modal-reactivo');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    const originalFocus = modalInstance._config.focus;
    modalInstance._config.focus = false;

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
        willClose: () => { modalInstance._config.focus = originalFocus; }
    });

    if (nota) {
        window.Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => { window.Swal.showLoading(); }});

        try {
            const res = await API.request('/reactivos/send-notification', 'POST', { 
                idformA, 
                nota, 
                instId: localStorage.getItem('instId'), 
                adminId: localStorage.getItem('userId') 
            });
            
            if (res && res.status === 'success') {
                sessionStorage.setItem('reopenReactivoId', idformA);
                window.Swal.fire({ title: '¡Enviado!', icon: 'success', timer: 1000, showConfirmButton: false })
                      .then(() => { location.reload(); });
            } else {
                window.Swal.fire('Error', res.message || 'Fallo en el servidor', 'error');
            }
        } catch (e) { 
            window.Swal.fire('Error', 'Fallo de conexión', 'error');
        }
    }
};

/**
 * PROCESAR EXPORTACIÓN A EXCEL - REACTIVOS BIOLÓGICOS
 */
window.processExcelExportReactivos = () => {
    // 1. Captura de fechas y configuración inicial
    const start = document.getElementById('excel-start-date-reactivo').value;
    const end = document.getElementById('excel-end-date-reactivo').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    const t = window.txt.reactivos.alerts;
    if (!start || !end) {
        window.Swal.fire('Atención', t.excel_warn, 'warning');
        return;
    }

    // 2. Obtención de datos filtrados desde el estado global
    let data = getFilteredAndSortedData();

    // 3. Filtro por rango de fechas basado en la fecha de Inicio
    data = data.filter(r => {
        const fechaPedido = r.Inicio || '0000-00-00';
        return fechaPedido >= start && fechaPedido <= end;
    });

    if (data.length === 0) {
        window.Swal.fire('Sin resultados', t.no_results, 'info');
        return;
    }

    // 4. Encabezados Técnicos (Adaptados para Reactivos)
    const headers = [
        "ID", 
        "Investigador", 
        "Protocolo", 
        "Especie", 
        "Animales Usados", 
        "Reactivo", 
        "Cantidad", 
        "Medida", 
        "Inicio", 
        "Retiro", 
        "Estado"
    ];
    
    const csvRows = [headers.join(";")];

    // 5. Procesamiento de filas
    data.forEach(r => {
        const row = [
            r.idformA,
            r.Investigador,
            r.NProtocolo || '---',
            r.Especie || '---',
            r.AnimalesUsados || 0,
            r.Reactivo || 'No asignado',
            r.CantidadReactivo || 0,
            r.Medida || '',
            // TRUCO EXCEL: Forzar formato texto para fechas
            `="${r.Inicio || '---'}"`, 
            `="${r.Retiro || '---'}"`,
            r.estado || 'Sin estado'
        ];
        
        // Limpiar el texto (quitar puntos y coma y saltos de línea)
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // 6. Generación y descarga del archivo
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // BOM para caracteres especiales
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `GROBO_${nombreInst}_Reactivos_${start}_al_${end}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 7. Cerrar el modal de Excel
    const modalEl = document.getElementById('modal-excel-reactivo');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }
};