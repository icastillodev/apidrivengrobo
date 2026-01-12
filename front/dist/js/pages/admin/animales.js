// 1. IMPORTACIONES
import { API } from '../../api.js';
import { hideLoader } from '../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';

let allAnimals = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idformA', direction: 'none' };
let formDataCache = null;

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
    document.getElementById('search-input-animal').onkeyup = (e) => { if (e.key === 'Enter') { currentPage = 1; renderTable(); } };
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

        const badgeExterno = a.IsExterno == 1 
            ? '<span class="badge bg-danger mt-1 shadow-sm" style="font-size: 7px; width: fit-content; padding: 2px 4px;">OTROS CEUAS</span>' 
            : '';

        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">${a.idformA}</td>
            <td class="py-2 px-2">
                <div class="d-flex flex-column">
                    <span class="fw-bold" style="font-size: 10px;">${a.TipoNombre}</span>
                    <span class="badge border text-dark bg-light" style="font-size: 7px; width: fit-content; padding: 2px 4px;">Animal vivo</span>
                    ${badgeExterno}
                </div>
            </td>
            <td class="py-2 px-2 small">${a.Investigador}</td>
            <td class="py-2 px-2 small fw-bold text-success">${a.NProtocolo || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Edad || '---'}</td>
            <td class="py-2 px-2 small">${a.CatEspecie}</td>
            <td class="py-2 px-2 text-center fw-bold">${a.CantAnimal}</td>
            <td class="py-2 px-2 small text-muted">${a.Inicio || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Retiro || '---'}</td>
            <td class="py-2 px-2 small text-truncate" style="max-width: 150px;">${a.Aclaracion || '---'}</td>
            <td class="py-2 px-2 small">${a.QuienVio || '---'}</td>
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

    let data = allAnimals.filter(a => {
        const estadoFila = (a.estado || "sin estado").toString().toLowerCase().trim();
        if (statusFilter !== 'all' && estadoFila !== statusFilter) return false;
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
 * 2. MODAL DE DETALLE (REFRACTORIZADO EN PARTES)
 */
window.openAnimalModal = async (a) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-animal');
    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;
    
    const [resMaster, resSex, resNotify] = await Promise.all([
        formDataCache ? Promise.resolve({status:'success', data:formDataCache}) : API.request(`/animals/form-data?inst=${instId}`),
        API.request(`/animals/get-sex-data?id=${a.idformA}`),
        API.request(`/animals/last-notification?id=${a.idformA}`)
    ]);
    formDataCache = resMaster.data;
    const sex = resSex.data || { machoA: 0, hembraA: 0, indistintoA: 0, totalA: 0 };
    const lastNotify = resNotify.data;
    const identity = `${localStorage.getItem('userFull')} (ID: ${localStorage.getItem('userId')})`;

    // ENSAMBLADO MODULAR
    let html = renderModalHeader(a);
    html += renderResearcherContact(a);
    html += `<input type="hidden" id="current-idformA" value="${a.idformA}">`;
    html += renderAdminSection(a, identity);
    html += renderNotificationSection(lastNotify, a.idformA);
    html += renderOrderModificationSection(a, sex, formDataCache);

    container.innerHTML = html;

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
            <h5 class="fw-bold mb-0">Detalle Animal Vivo</h5>
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

function renderAdminSection(a, identity) {
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
                <label class="form-label small fw-bold text-muted uppercase">Revisado por (Auto)</label>
                <input type="text" id="modal-quienvisto" class="form-control form-control-sm bg-light fw-bold text-primary" value="${a.QuienVio || identity}" readonly>
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
    return `
    <h6 class="fw-bold text-success uppercase mb-3" style="font-size: 11px;">MODIFICACIÓN DEL FORMULARIO (DATOS DEL PEDIDO)</h6>
    <div id="alert-otros-ceuas" class="alert alert-danger py-1 px-2 mb-3 fw-bold" style="font-size: 10px; display: ${a.IsExterno == 1 ? 'block' : 'none'};">
        ⚠️ PROTOCOLO PERTENECE A OTROS CEUAS (EXTERNO)
    </div>
    <form id="form-animal-full">
        <input type="hidden" name="idformA" value="${a.idformA}">
        <div class="row g-3">
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase">Tipo de Pedido</label>
                <select name="tipoA" id="select-type-modal" class="form-select form-select-sm" onchange="window.calculateAnimalTotals()">
                    ${cache.types.map(t => `<option value="${t.IdTipoFormulario}" data-exento="${t.exento}" data-desc="${t.descuento}" ${a.TipoNombre === t.nombreTipo ? 'selected' : ''}>${t.nombreTipo}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase">N° Protocolo (Buscar)</label>
                <input type="text" class="form-control form-control-sm mb-1" placeholder="Filtrar..." onkeyup="window.filterProtocolList(this)">
                <select id="select-protocol-modal" name="idprotA" class="form-select form-select-sm" onchange="window.handleProtocolChange(this)">
                    ${cache.protocols.map(p => `<option value="${p.idprotA}" data-externo="${p.protocoloexpe}" ${a.idprotA == p.idprotA ? 'selected' : ''}>${p.nprotA} - ${p.tituloA}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase">Categoría Especie</label>
                <select id="select-species-modal" name="idsubespA" class="form-select form-select-sm" onchange="window.updateSpeciesPrice(this)"></select>
            </div>
            <div class="col-md-3"><label class="form-label small fw-bold uppercase">Edad</label><input type="text" name="edadA" class="form-control form-control-sm" value="${a.Edad || ''}"></div>
            <div class="col-md-3"><label class="form-label small fw-bold uppercase">Peso</label><input type="text" name="pesoA" class="form-control form-control-sm" value="${a.Peso || ''}"></div>

            <div class="col-md-3"><label class="form-label small fw-bold uppercase">Machos</label><input type="number" name="machoA" class="form-control form-control-sm" value="${sex.machoA}" oninput="window.calculateAnimalTotals()"></div>
            <div class="col-md-3"><label class="form-label small fw-bold uppercase">Hembras</label><input type="number" name="hembraA" class="form-control form-control-sm" value="${sex.hembraA}" oninput="window.calculateAnimalTotals()"></div>
            <div class="col-md-3"><label class="form-label small fw-bold uppercase">Indistintos</label><input type="number" name="indistintoA" class="form-control form-control-sm" value="${sex.indistintoA}" oninput="window.calculateAnimalTotals()"></div>
            <div class="col-md-3"><label class="form-label small fw-bold uppercase">Total</label><input type="number" id="total-animals-modal" name="totalA" class="form-control form-control-sm bg-light fw-bold" value="${sex.totalA}" readonly></div>

            <div class="col-md-6"><label class="form-label small fw-bold uppercase">Precio Unit. (BD)</label><input type="text" id="price-unit-modal" class="form-control form-control-sm bg-light" value="${a.PrecioUnit || 0}" readonly></div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase">Precio Final ($)</label>
                <div id="discount-alert" class="small text-danger fw-bold mb-1" style="display:none;"></div>
                <input type="text" id="price-total-modal" class="form-control form-control-sm bg-light fw-bold text-success" value="0.00" readonly>
            </div>

            <div class="col-md-6"><label class="form-label small fw-bold uppercase">Fecha Inicio</label><input type="date" name="fechainicioA" class="form-control form-control-sm" value="${a.Inicio || ''}"></div>
            <div class="col-md-6"><label class="form-label small fw-bold uppercase">Fecha Retiro</label><input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${a.Retiro || ''}"></div>

            <div class="col-12">
                <label class="form-label small fw-bold uppercase">Aclaración Usuario (Lectura)</label>
                <div class="p-2 border rounded bg-light small">${a.Aclaracion || 'Sin aclaración.'}</div>
            </div>

            <div class="mt-4 d-flex justify-content-end gap-2 border-top pt-3">
                <button type="button" class="btn btn-danger btn-sm px-4 fw-bold" onclick="window.downloadAnimalPDF(${a.idformA})">PDF</button>
                <button type="submit" class="btn btn-primary btn-sm px-5 fw-bold shadow">GUARDAR CAMBIOS</button>
            </div>
        </div>
    </form>`;
}

/* --- LOGICA DINAMICA (EVENTOS) --- */

window.updateAnimalStatusQuick = async () => {
    const id = document.getElementById('current-idformA').value;
    const statusSelect = document.getElementById('modal-status');
    const aclara = document.getElementById('modal-aclaracionadm').value;
    const identity = `${localStorage.getItem('userFull')} (ID: ${localStorage.getItem('userId')})`;

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', statusSelect.value);
    fd.append('aclaracionadm', aclara);
    fd.append('userName', identity); 

    try {
        const res = await API.request(`/animals/update-status`, 'POST', fd);
        if (res.status === 'success') {
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
    const isExterno = select.options[select.selectedIndex].dataset.externo == "1";
    document.getElementById('alert-otros-ceuas').style.display = isExterno ? 'block' : 'none';
    window.loadSpeciesForProtocol(select.value);
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
 * NOTIFICACIÓN POR CORREO - GROBO
 */
/**
 * NOTIFICACIÓN POR CORREO - GROBO
 * Corrige bloqueo de teclado y gestiona el flujo de recarga post-envío.
 */
window.openNotifyPopup = async (idformA) => {
    // 1. OBTENER EL MODAL DE BOOTSTRAP QUE ESTÁ ABIERTO
    const animalModalEl = document.getElementById('modal-animal');
    const modalInstance = bootstrap.Modal.getInstance(animalModalEl);

    // 2. DESACTIVAR EL FOCO FORZADO TEMPORALMENTE
    // Guardamos la configuración original para restaurarla después
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
        // 3. ASEGURAR EL FOCO AL ABRIR EL POPUP
        didOpen: () => {
            const input = window.Swal.getInput();
            if (input) {
                input.focus();
                // Detenemos la propagación para que Bootstrap no escuche las teclas
                input.addEventListener('keydown', (e) => e.stopPropagation());
            }
        },
        willClose: () => {
            // 4. RESTAURAR EL FOCO ORIGINAL AL CERRAR
            modalInstance._config.focus = originalFocus;
        }
    });

    if (nota) {
        const instId = localStorage.getItem('instId');
        const adminId = localStorage.getItem('userId');

        try {
            const res = await API.request('/animals/send-notification', 'POST', { 
                idformA, nota, instId, adminId 
            });
            
            if (res.status === 'success') {
                // GUARDAMOS EL ID EN SESSIONSTORAGE PARA REABRIR EL MODAL AL RECARGAR
                sessionStorage.setItem('reopenAnimalId', idformA);

                window.Swal.fire({
                    title: '¡Enviado!',
                    text: 'Los correos han sido enviados. La página se actualizará.',
                    icon: 'success',
                    confirmButtonColor: '#1a5d3b'
                }).then(() => {
                    location.reload(); // Recarga la página
                });
            } else {
                window.Swal.fire('Error', 'La API respondió con error: ' + res.message, 'error');
            }
        } catch (e) { 
            window.Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
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
                <h4 style="margin: 5px 0; color: #444;">FICHA DE PEDIDO: ANIMAL VIVO</h4>
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
                        <strong>Edad:</strong> ${edad} <br> <strong>Peso:</strong> ${peso}
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
        margin: [10, 10, 10, 10],
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
    const headers = ["ID", "Tipo", "Investigador", "Protocolo", "Especie", "Total", "Inicio", "Retiro", "Estado"];
    const csvRows = [headers.join(";")];

    data.forEach(a => {
        const row = [
            a.idformA,
            a.TipoNombre,
            a.Investigador,
            a.NProtocolo || '---',
            a.CatEspecie || '---',
            a.CantAnimal,
            // TRUCO EXCEL: Force texto para que no salgan los #######
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