import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

let allInsumos = [];
let currentPage = 1;
const rowsPerPage = 15;
window.catalogoInsumos = []; // Global para acceso desde addItemRow

/**
 * 1. INICIALIZACIÓN
 */
export async function initInsumosPage() {
    const instId = localStorage.getItem('instId');
    

// Vinculación del Buscador (Se mantiene con botón o tecla Enter)
    const btnSearch = document.getElementById('btn-search-insumo');
    const inputSearch = document.getElementById('search-input-insumo');

    if(btnSearch) btnSearch.onclick = () => { currentPage = 1; renderTable(); };
    if(inputSearch) {
        inputSearch.onkeyup = (e) => { if(e.key === 'Enter') { currentPage = 1; renderTable(); } };
    }

    // FILTROS AUTOMÁTICOS: Se activan al cambiar la selección
    const filterStatus = document.getElementById('filter-status-insumo');
    const filterColumn = document.getElementById('filter-column-insumo');

    if(filterStatus) {
        filterStatus.onchange = () => { 
            currentPage = 1; 
            renderTable(); // Filtra automáticamente al tocar el estado
        };
    }

    if(filterColumn) {
        filterColumn.onchange = () => { 
            currentPage = 1; 
            renderTable(); // Opcional: También filtra automático al cambiar la columna
        };
    }


    document.addEventListener('focusin', (e) => {
        if (e.target.closest(".swal2-container")) e.stopImmediatePropagation();
    }, true);

    try {
        showLoader();
        const res = await API.request(`/insumos/all?inst=${instId}`);
        if (res && res.status === 'success') {
            allInsumos = res.data;
            renderTable();
        }
    } catch (error) { 
        console.error("Error cargando insumos:", error); 
        hideLoader();
    }



    // Vinculación de botones de la interfaz

    if(btnSearch) btnSearch.onclick = () => { currentPage = 1; renderTable(); };
    
    const btnAyuda = document.getElementById('btn-ayuda-insumo');
    if(btnAyuda) btnAyuda.onclick = () => new bootstrap.Modal(document.getElementById('modal-insumo-help')).show();
    
    const btnExcel = document.getElementById('btn-excel-insumo');
    if(btnExcel) btnExcel.onclick = () => new bootstrap.Modal(document.getElementById('modal-excel-insumo')).show();
}

/**
 * 3. RENDERIZADO DE TABLA Y PAGINACIÓN
 */
function renderTable() {
    const tbody = document.getElementById('table-body-insumos');
    if (!tbody) return;

    const data = getFilteredAndSortedData(); 
    tbody.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    data.slice(start, start + rowsPerPage).forEach(f => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => window.openInsumoModal(f);
        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">#${f.idformA}</td>
            <td class="py-2 px-2 small fw-bold">${f.Investigador}</td>
            <td class="py-2 px-2 small text-primary fw-bold">${f.Departamento || '---'}</td>
            <td class="py-2 px-2" style="font-size: 13px;">${f.ResumenInsumos || '---'}</td>
            <td class="py-2 px-2 small">${f.Inicio || '---'}</td>
            <td class="py-2 px-2 small">${f.Retiro || '---'}</td>
            <td class="py-2 px-2 small text-muted text-truncate" style="max-width: 150px;">${f.aclaracionadm || '---'}</td>
            <td class="py-2 px-2 text-center">${getStatusBadge(f.estado)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateHeaderIcons(); // Actualiza flechas de orden
    renderPagination(data.length, 'pagination-insumo', renderTable); // Paginación reactiva
    hideLoader();
}
/**
 * 3. ORQUESTACIÓN DEL MODAL (CON TODAS LAS FUNCIONES DEFINIDAS)
 */
window.openInsumoModal = async (f) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-insumo');
    
    try {
        // Hacemos las peticiones: detalles del pedido y la lista de departamentos
        const [resItems, resFormData, resCat, resNotify] = await Promise.all([
            API.request(`/insumos/details?id=${f.idPrecioinsumosformulario}`),
            API.request(`/insumos/form-data?inst=${instId}`), // <--- Trae la lista de departamentoe
            API.request(`/insumos/catalog?inst=${instId}`),
            API.request(`/reactivos/last-notification?id=${f.idformA}`)
        ]);

        window.catalogoInsumos = resCat.data || [];
        const items = resItems.data || [];
        
        // Extraemos el array de departamentos
        const deptos = (resFormData.data && resFormData.data.deptos) ? resFormData.data.deptos : [];
        
        const identity = `${localStorage.getItem('userFull')} (ID: ${localStorage.getItem('userId')})`;

        // Construimos el HTML
        let html = renderModalHeader(f);
        html += renderResearcherContact(f);
        html += renderAdminSection(f, identity);
        html += renderNotificationSection(resNotify.data, f.idformA);
        
        // Pasamos f (que tiene f.depto) y el array deptos
        html += renderOrderModificationSection(f, items, deptos);

        container.innerHTML = html;
        document.getElementById('form-insumo-full').onsubmit = (e) => window.saveFullInsumoForm(e);
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-insumo')).show();
    } catch (e) { console.error("Error:", e); }
};

/* --- FUNCIONES DE APOYO (DEFINICIONES FALTANTES) --- */

function renderModalHeader(f) {
    return `<div class="p-4 border-bottom d-flex justify-content-between align-items-center bg-light">
        <div><h5 class="fw-bold mb-0 text-success">Ficha de Pedido de Insumos</h5><span class="small text-muted">ID: <strong>#${f.idformA}</strong></span></div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>`;
}

function renderResearcherContact(f) {
    return `<div class="row g-2 p-3 small border-bottom text-center bg-white shadow-sm">
        <div class="col-md-4"><strong>Investigador:</strong><br>${f.Investigador}</div>
        <div class="col-md-4"><strong>Email:</strong><br>${f.EmailInvestigador || '---'}</div>
        <div class="col-md-4"><strong>Celular:</strong><br>${f.CelularInvestigador || '---'}</div>
    </div>`;
}

function renderAdminSection(f, identity) {
    return `
    <div class="p-4 bg-white border-bottom shadow-sm">
        <div class="row g-3">
            <div class="col-md-6 text-start">
                <label class="small fw-bold text-muted uppercase">Estado Pedido</label>
                <div class="d-flex align-items-center gap-2">
                    <select id="insumo-status" class="form-select form-select-sm fw-bold shadow-sm" onchange="window.updateInsumoStatusQuick(${f.idformA})">
                        <option value="Sin estado" ${f.estado === 'Sin estado' ? 'selected' : ''}>Sin estado</option>
                        <option value="Proceso" ${f.estado === 'Proceso' ? 'selected' : ''}>Proceso</option>
                        <option value="Reservado" ${f.estado === 'Reservado' ? 'selected' : ''}>Reservado</option>
                        <option value="Listo para entrega" ${f.estado === 'Listo para entrega' ? 'selected' : ''}>Listo para entrega</option>
                        <option value="Entregado" ${f.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                        <option value="Suspendido" ${f.estado === 'Suspendido' ? 'selected' : ''}>Suspendido</option>
                    </select>
                    <div id="insumo-status-badge-container">${getStatusBadge(f.estado)}</div>
                </div>
            </div>
            <div class="col-md-6 text-start">
                <label class="small fw-bold text-muted uppercase">Revisado por</label>
                <input type="text" id="insumo-reviewer" class="form-control form-control-sm bg-light fw-bold" value="${f.quienvisto || identity}" readonly>
            </div>
            <div class="col-12 text-start">
                <label class="small fw-bold text-muted uppercase">Aclaración Administrativa (Auto-guardado)</label>
                <textarea id="insumo-admin-note" class="form-control form-control-sm" rows="2" onblur="window.updateInsumoStatusQuick(${f.idformA})">${f.aclaracionadm || ''}</textarea>
            </div>
        </div>
    </div>`;
}

function renderNotificationSection(lastNotify, idformA) {
    const hasData = lastNotify && lastNotify.NotaNotificacion;
    
    // Mapeo de estilos para el badge del historial
    const states = {
        'entregado': 'bg-success text-white',
        'proceso': 'bg-primary text-white',
        'listo para entrega': 'bg-warning text-dark',
        'suspendido': 'bg-danger text-white',
        'reservado': 'bg-info text-dark',
        'sin estado': 'bg-secondary text-white'
    };
    const e = (lastNotify?.estado || "sin estado").toLowerCase().trim();
    const badgeClass = states[e] || states['sin estado'];

    return `
    <div id="insumo-notify-container" class="p-4 bg-white border-bottom">
        <div class="alert alert-success border-success mb-0 p-3 shadow-sm d-flex justify-content-between align-items-center">
            <div style="max-width: 75%; text-align: left;">
                <p class="mb-1 fw-bold small uppercase text-success">
                    <i class="bi bi-envelope-check me-1"></i> ÚLTIMA NOTIFICACIÓN ENVIADA:
                </p>
                <div class="small text-dark" style="font-size: 11px; line-height: 1.5;">
                    ${hasData ? `
                        <b>Fecha:</b> ${lastNotify.fecha} <br>
                        <b>Estado al notificar:</b> <span class="badge ${badgeClass} ms-1" style="font-size: 8px; vertical-align: middle;">${lastNotify.estado}</span> <br>
                        <b>Mensaje:</b> ${lastNotify.NotaNotificacion}`
                    : 'No hay historial de comunicaciones para este pedido.'}
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="window.openNotifyPopupInsumo(${idformA})">
                NOTIFICAR
            </button>
        </div>
    </div>`;
}

function renderOrderModificationSection(f, items, deptos) {
    const listaDeptos = Array.isArray(deptos) ? deptos : [];

    return `
    <div class="p-4 bg-white">
        <h6 class="fw-bold text-success uppercase mb-3 small text-start">Modificación Técnica (Formulario)</h6>
        <form id="form-insumo-full">
            <input type="hidden" name="idformA" value="${f.idformA}">
            <input type="hidden" name="idPrecioinsumosformulario" value="${f.idPrecioinsumosformulario}">
            
            <div class="row g-3 mb-4 text-start">
                <div class="col-md-12">
                    <label class="small fw-bold uppercase text-muted">Departamento (departamentoe)</label>
                    <select name="depto" class="form-select form-select-sm fw-bold border-primary text-primary">
                        <option value="">Seleccione Departamento...</option>
                        ${listaDeptos.map(d => {
                            // CORRECCIÓN: Comparamos d.iddeptoA con f.idDepto (que es el alias del SQL)
                            // Usamos == para permitir comparación entre string y número
                            const isSelected = (d.iddeptoA == f.idDepto) ? 'selected' : '';
                            return `<option value="${d.iddeptoA}" ${isSelected}>${d.NombreDeptoA}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold uppercase">Fecha Inicio</label>
                    <input type="date" name="fechainicioA" class="form-control form-control-sm" value="${f.Inicio || ''}">
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold uppercase">Fecha Retiro</label>
                    <input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${f.Retiro || ''}">
                </div>
            </div>

            <table class="table table-sm border align-middle shadow-sm" id="table-edit-items">
                <thead class="bg-light small uppercase">
                    <tr><th>Producto / Insumo</th><th style="width: 130px;" class="text-center">Cantidad</th><th style="width: 50px;"></th></tr>
                </thead>
                <tbody id="tbody-items-edit">
                    ${items.map((item, index) => renderItemRow(item, index)).join('')}
                </tbody>
            </table>
            <button type="button" class="btn btn-sm btn-outline-success fw-bold w-100 mb-4" onclick="window.addItemRow()">+ AGREGAR PRODUCTO</button>

            <div class="alert alert-secondary py-2 mb-4 border-0 text-start">
                <label class="small fw-bold uppercase text-muted d-block" style="font-size: 9px;">Aclaración del Investigador</label>
                <p class="mb-0 small italic" style="font-size: 11px;">${f.AclaracionUsuario || 'Sin observaciones.'}</p>
            </div>

            <div class="mt-2 d-flex justify-content-end gap-2 border-top pt-3">
                <button type="button" class="btn btn-danger btn-sm px-4 fw-bold shadow-sm" onclick="window.downloadInsumoPDF(${f.idformA})">PDF</button>
                <button type="submit" class="btn btn-primary btn-sm px-5 fw-bold shadow">GUARDAR CAMBIOS</button>
            </div>
        </form>
    </div>`;
}
function renderItemRow(item = {}, index) {
    return `
        <tr class="item-row">
            <td>
                <select name="items[${index}][idInsumo]" class="form-select form-select-sm">
                    <option value="">Seleccione insumo...</option>
                    ${window.catalogoInsumos.map(c => `
                        <option value="${c.idInsumo}" ${c.idInsumo == item.idInsumo ? 'selected' : ''}>
                            ${c.NombreInsumo} [${c.TipoInsumo}]
                        </option>`).join('')}
                </select>
            </td>
            <td><input type="number" name="items[${index}][cantidad]" class="form-control form-control-sm fw-bold text-center" value="${item.cantidad || 1}"></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="window.removeItemRow(this)">
                    <i class="bi bi-trash fs-5"></i>
                </button>
            </td>
        </tr>`;
}

/**
 * 4. EVENTOS DINÁMICOS
 */
window.addItemRow = () => {
    const tbody = document.getElementById('tbody-items-edit');
    const index = tbody.children.length;
    tbody.insertAdjacentHTML('beforeend', renderItemRow({}, index));
};

window.removeItemRow = (btn) => {
    const tbody = document.getElementById('tbody-items-edit');
    if (tbody.children.length > 1) btn.closest('tr').remove();
    else window.Swal.fire('Atención', 'El pedido debe contener al menos un producto.', 'warning');
};

window.updateInsumoStatusQuick = async (id) => {
    const status = document.getElementById('insumo-status').value;
    const badgeContainer = document.getElementById('insumo-status-badge-container');
    const aclara = document.getElementById('insumo-admin-note').value;
    const identity = `${localStorage.getItem('userFull')} (ID: ${localStorage.getItem('userId')})`;

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', status);
    fd.append('aclaracionadm', aclara);
    fd.append('userName', identity); 

    try {
        const res = await API.request(`/insumos/update-status`, 'POST', fd);
        if (res.status === 'success') {
            document.getElementById('insumo-reviewer').value = identity;
            if (badgeContainer) badgeContainer.innerHTML = getStatusBadge(status);
            
            // Refrescar grilla de fondo
            const r = await API.request(`/insumos/all?inst=${localStorage.getItem('instId')}`);
            allInsumos = r.data;
            renderTable();
        }
    } catch (e) { console.error(e); }
};

window.saveFullInsumoForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
        const res = await API.request(`/insumos/update-full`, 'POST', fd);
        if (res.status === 'success') {
            window.Swal.fire({ title: '¡Guardado!', icon: 'success', timer: 1000, showConfirmButton: false }).then(() => location.reload());
        }
    } catch (err) { console.error(err); }
};



/**
 * LÓGICA DE FILTRADO Y ORDENAMIENTO (ESTILO GROBO 2026)
 * Optimizada para búsqueda en tiempo real y filtrado por columnas.
 */
function getFilteredAndSortedData() {
    // 1. Captura de filtros desde el DOM
    const statusFilter = document.getElementById('filter-status-insumo').value.toLowerCase().trim();
    const term = document.getElementById('search-input-insumo').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-column-insumo').value;

    let data = allInsumos.filter(f => {
        // A. Normalización del estado
        // Si el estado es nulo o vacío, lo tratamos como "sin estado"
        const estadoFila = (f.estado || "sin estado").toString().toLowerCase().trim();
        const matchStatus = statusFilter === 'all' || estadoFila === statusFilter;
        
        // B. Validación de Búsqueda (Texto en tiempo real)
        let matchSearch = true;
        if (term) {
            if (filterType === 'all') {
                // Búsqueda global robusta (ID, Investigador, Depto e Insumos)
                matchSearch = String(f.idformA || '').includes(term) || 
                              String(f.Investigador || '').toLowerCase().includes(term) || 
                              String(f.Departamento || '').toLowerCase().includes(term) ||
                              String(f.ResumenInsumos || '').toLowerCase().includes(term);
            } else {
                // Búsqueda específica por columna
                matchSearch = String(f[filterType] || '').toLowerCase().includes(term);
            }
        }

        return matchStatus && matchSearch;
    });

    // 2. Lógica de Ordenamiento Dinámico
    if (typeof sortConfig !== 'undefined' && sortConfig.direction !== 'none') {
        data.sort((a, b) => {
            let valA = a[sortConfig.key] || ''; 
            let valB = b[sortConfig.key] || '';
            const factor = sortConfig.direction === 'asc' ? 1 : -1;

            // Si los valores son numéricos, restamos; si no, comparamos como texto
            if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
                return (Number(valA) - Number(valB)) * factor;
            }
            return valA.toString().localeCompare(valB.toString()) * factor;
        });
    } else { 
        // Orden por defecto: ID de formulario descendente (# más alto primero)
        data.sort((a, b) => (Number(b.idformA) || 0) - (Number(a.idformA) || 0)); 
    }

    return data;
}

// Stubs para evitar errores de referencia
window.downloadInsumoPDF = (id) => { console.log("Generando PDF para ID:", id); };
window.openNotifyPopupInsumo = (id) => { console.log("Abriendo popup notificación para ID:", id); };


/**
 * 4. COMPONENTES VISUALES (BADGES Y PAGINADOR)
 */
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

function renderPagination(totalItems, containerId, refreshCallback) {
    const pag = document.getElementById(containerId); 
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (!pag) return;
    pag.innerHTML = ''; 
    if (totalPages <= 1) return;

    const createBtn = (label, page, disabled, active = false) => {
        const li = document.createElement('li'); 
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
        if (!disabled) li.onclick = (e) => { e.preventDefault(); currentPage = page; refreshCallback(); window.scrollTo({top:0, behavior:'smooth'}); }; 
        return li;
    };

    pag.appendChild(createBtn('Anterior', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pag.appendChild(createBtn(i, i, false, i === currentPage));
        }
    }
    pag.appendChild(createBtn('Siguiente', currentPage + 1, currentPage === totalPages));
}

/**
 * 5. GESTIÓN DE ORDENAMIENTO DE CABECERAS
 */
function setupSortHeaders() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        th.style.cursor = 'pointer';
        th.setAttribute('data-label', th.innerText.trim());
        th.onclick = () => {
            const key = th.getAttribute('data-key');
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : (sortConfig.direction === 'desc' ? 'none' : 'asc');
            } else { 
                sortConfig.key = key; 
                sortConfig.direction = 'asc'; 
            }
            renderTable();
        };
    });
}

function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : '')) : '';
        th.innerHTML = `${th.getAttribute('data-label')}<span class="small text-muted">${icon}</span>`;
    });
}
/**
 * POPUP DE NOTIFICACIÓN PARA INSUMOS
 * Gestiona el envío de correos y el registro en 'notificacioncorreo'
 */
window.openNotifyPopupInsumo = async (idformA) => {
    // 1. Buscamos los datos actuales del pedido en el estado local
    const f = allInsumos.find(item => item.idformA == idformA);

    // 2. Abrimos el cuadro de diálogo para redactar el mensaje
    const { value: text } = await window.Swal.fire({
        title: `<span class="small fw-bold uppercase">NOTIFICAR A: ${f.Investigador}</span>`,
        input: 'textarea',
        inputLabel: `El investigador recibirá un correo (Estado: ${f.estado})`,
        inputPlaceholder: 'Escriba aquí el mensaje o aclaración técnica...',
        showCancelButton: true,
        confirmButtonText: 'ENVIAR NOTIFICACIÓN',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: 'CANCELAR',
        allowOutsideClick: false,
        inputAttributes: {
            'autocapitalize': 'off',
            'autocorrect': 'off'
        }
    });

    // 3. Si hay mensaje, procesamos el envío
    if (text) {
        showLoader();
        
        // Preparamos los datos exactos para la entidad 'notificacioncorreo'
        const fd = new FormData();
        fd.append('idformA', idformA);               // Mapea al campo 'ID'
        fd.append('mensaje', text);               // Mapea al campo 'NotaNotificacion'
        fd.append('email', f.EmailInvestigador);     // Para el envío del PHPMailer
        fd.append('investigador', f.Investigador);   // Para el saludo del template
        fd.append('estado', f.estado);               // Mapea al campo 'estado'
        fd.append('instId', localStorage.getItem('instId')); // Mapea a 'IdInstitucion'
        fd.append('adminId', localStorage.getItem('userId'));

        try {
            // Llamada al endpoint que ejecuta MailService y guarda en BD
            const res = await API.request('/insumos/send-notification', 'POST', fd);
            
            if (res.status === 'success') {
                // Notificamos éxito al usuario
                await window.Swal.fire({
                    title: '¡Mensaje Enviado!',
                    text: 'El historial de comunicaciones ha sido actualizado.',
                    icon: 'success',
                    confirmButtonColor: '#1a5d3b'
                });

                // 4. Actualizamos el historial en el modal sin recargar la página
                // Consultamos la última notificación recién creada en 'notificacioncorreo'
                const resNotify = await API.request(`/reactivos/last-notification?id=${idformA}`);
                const notifyDiv = document.getElementById('insumo-notify-container');
                
                if (notifyDiv) {
                    // Re-renderizamos solo el componente de notificación
                    notifyDiv.outerHTML = renderNotificationSection(resNotify.data, idformA);
                }
            } else {
                throw new Error(res.message || "Error al procesar la notificación.");
            }
        } catch (e) {
            console.error("Error en notificación:", e);
            window.Swal.fire('Error', 'No se pudo enviar el correo o registrar la actividad.', 'error');
        } finally {
            hideLoader();
        }
    }
};

/**
 * GENERACIÓN DE PDF - INSUMOS EXPERIMENTALES
 * Captura la lista dinámica de productos y datos del departamento.
 */
window.downloadInsumoPDF = async (id) => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // 1. Helpers para captura de datos del DOM
    const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '---';
    
    const getSelTextByName = (name) => {
        const s = document.querySelector(`select[name="${name}"]`);
        if (!s || s.selectedIndex === -1) return '---';
        return s.options[s.selectedIndex].text;
    };

    // 2. Captura de información de cabecera y contacto
    const invHeader = document.querySelector('#modal-content-insumo h5 + span + strong')?.innerText 
                      || document.querySelector('#modal-content-insumo h5')?.innerText || '---';
    
    // Capturamos el bloque de contacto (Investigador, Email, Celular)
    const contactoInfo = Array.from(document.querySelectorAll('#modal-content-insumo .row.g-2.p-3 div'))
                              .map(div => div.innerText.replace('\n', ': ')).join(' | ');

    const estadoActual = document.getElementById('insumo-status')?.options[document.getElementById('insumo-status').selectedIndex]?.text || '---';
    const deptoNombre = getSelTextByName('depto');

    // 3. CAPTURA DINÁMICA DE PRODUCTOS (La tabla del modal)
    const productRows = document.querySelectorAll('#tbody-items-edit tr');
    let itemsHtml = '';
    
    productRows.forEach(row => {
        const select = row.querySelector('select');
        const nombre = select.options[select.selectedIndex]?.text || '---';
        const cantidad = row.querySelector('input[type="number"]')?.value || '0';
        
        itemsHtml += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${nombre}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${cantidad}</td>
            </tr>`;
    });

    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; line-height: 1.4;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1a5d3b;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; text-transform: uppercase;">Ficha de Pedido: Insumos Experimentales</h4>
                <p style="margin: 0; font-size: 11px; color: #666;">Solicitud ID: #${id} | Generado: ${new Date().toLocaleString()}</p>
            </div>

            <div style="margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Investigador Responsable:</strong> ${invHeader}</p>
                <p style="margin: 5px 0; font-size: 11px; color: #555;">${contactoInfo}</p>
                <p style="margin: 10px 0 0 0;"><strong>Departamento Destino:</strong> <span style="color: #0d6efd;">${deptoNombre}</span></p>
                <p style="margin: 15px 0 0 0; font-size: 14px;"><strong>ESTADO DEL PEDIDO:</strong> <span style="color: #1a5d3b; font-weight: bold; text-transform: uppercase;">${estadoActual}</span></p>
            </div>

            <p style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #1a5d3b;">DETALLE DE PRODUCTOS SOLICITADOS:</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #1a5d3b; color: white;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Descripción del Producto / Insumo</th>
                        <th style="width: 100px; padding: 10px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px; background: #fff;">
                    <strong style="font-size: 10px; color: #666;">FECHA ESTIMADA INICIO:</strong><br>${getVal('fechainicioA')}
                </div>
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px; background: #fff;">
                    <strong style="font-size: 10px; color: #666;">FECHA ESTIMADA RETIRO:</strong><br>${getVal('fecRetiroA')}
                </div>
            </div>



            <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #999;">
                Documento generado por GROBO - Sistema de Gestión de Bioterios
            </div>
        </div>
    `;

    const opt = { 
        margin: [10, 10], 
        filename: `Pedido_Insumos_${id}_${new Date().getTime()}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfTemplate).save();
};

/**
 * PROCESAR EXPORTACIÓN A EXCEL - INSUMOS EXPERIMENTALES
 */
window.processExcelExportInsumos = () => {
    // 1. Captura de fechas y configuración inicial
    const start = document.getElementById('excel-start-date-insumo').value;
    const end = document.getElementById('excel-end-date-insumo').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    if (!start || !end) {
        window.Swal.fire('Atención', 'Debe seleccionar un rango de fechas.', 'warning');
        return;
    }

    // 2. Obtención de datos filtrados desde el estado global de insumos
    let data = getFilteredAndSortedData();

    // 3. Filtro por rango de fechas basado en la fecha de Inicio
    data = data.filter(r => {
        const fechaPedido = r.Inicio || '0000-00-00';
        return fechaPedido >= start && fechaPedido <= end;
    });

    if (data.length === 0) {
        window.Swal.fire('Sin resultados', 'No hay registros de insumos en ese rango.', 'info');
        return;
    }

    // 4. Encabezados Técnicos para Insumos
    const headers = [
        "ID", 
        "Investigador", 
        "Departamento", 
        "Insumos (Cantidad/Medida)", 
        "Fecha Inicio", 
        "Fecha Retiro", 
        "Aclaracion Admin",
        "Estado"
    ];
    
    const csvRows = [headers.join(";")];

    // 5. Procesamiento de filas
    data.forEach(r => {
        // Limpiamos el HTML del resumen de insumos (quitamos <b>, </b>, etc.)
        const insumosLimpio = (r.ResumenInsumos || '---').replace(/<[^>]*>?/gm, '');

        const row = [
            r.idformA,
            r.Investigador,
            r.Departamento || '---',
            insumosLimpio,
            `="${r.Inicio || '---'}"`, // Truco Excel para mantener formato fecha
            `="${r.Retiro || '---'}"`,
            r.aclaracionadm || '---',
            r.estado || 'Sin estado'
        ];
        
        // Limpieza de caracteres que rompen el CSV (punto y coma y saltos de línea)
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // 6. Generación y descarga del archivo
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // BOM para compatibilidad con Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `GROBO_${nombreInst}_INSUMOS_${start}_al_${end}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 7. Cerrar el modal de Excel de insumos
    const modalEl = document.getElementById('modal-excel-insumo');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }
};