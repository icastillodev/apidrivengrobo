// front/dist/js/pages/admin/usuarios.js
import { API } from '../../api.js';
import { Auth } from '../../auth.js';

let allUsers = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'IdUsrA', direction: 'none' }; 

function getFormPageByCategoria(categoria = '') {
    const cat = String(categoria || '').toLowerCase();
    if (cat.includes('anim')) return 'animales';
    if (cat.includes('react')) return 'reactivos';
    return 'insumos';
}

function openWithModal(targetPath, id, queryKey = 'id') {
    if (!id) return;
    const basePath = Auth.getBasePath();
    const url = `${window.location.origin}${basePath}${targetPath}?${queryKey}=${encodeURIComponent(id)}&action=view`;
    window.open(url, '_blank');
}

export async function initUsuariosPage() {
    // 1. OBTENCIÓN ROBUSTA DE ID (Corrección del error null)
    const instId = sessionStorage.getItem('instId') || localStorage.getItem('instId');
    
    console.log("🚀 Iniciando carga de usuarios para Inst:", instId);
    
    // Si no hay ID, detenemos para evitar llamada rota a la API
    if (!instId) {
        console.error("❌ Error crítico: No se identificó la institución en la sesión.");
        return;
    }
    
    try {
        // Llamada a la API
        const res = await API.request(`/users/institution?inst=${instId}`);
        console.log("📦 Respuesta recibida:", res);
        
        if (res && res.status === 'success') {
            // Guardamos y ordenamos los datos
            allUsers = res.data.sort((a, b) => a.IdUsrA - b.IdUsrA);
            
            // Debug global
            window.allUsers = allUsers; 
            console.log("✅ Datos procesados. Total:", allUsers.length);

            // Renderizado inicial
            checkOtrosCeuaVisibility();
            setupSortHeaders();
            renderTable();
        } else {
            console.error("❌ La API no devolvió éxito:", res ? res.message : "Sin respuesta");
        }
    } catch (error) {
        console.error("❌ Error crítico al inicializar página:", error);
    }

    // 2. CONFIGURACIÓN DE EVENTOS
    // Buscador
    const btnSearch = document.getElementById('btn-search');
    const searchInput = document.getElementById('search-input');
    if (btnSearch) {
        btnSearch.onclick = () => {
            currentPage = 1;
            renderTable();
        };
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                currentPage = 1;
                renderTable();
            }
        });
    }

    // Botón Excel
    const btnExcel = document.getElementById('btn-excel');
    if (btnExcel) {
        btnExcel.onclick = exportToExcel;
    }

    // Inicializar modal de ayuda
    initAyuda();
}

// --- LÓGICA DE TABLA Y FILTROS ---

function checkOtrosCeuaVisibility() {
    const hasAny = allUsers.some(u => u.OtrosCeuaCount > 0);
    const th = document.querySelector('th[data-key="OtrosCEUAS"]');
    if (th) {
        th.style.display = hasAny ? '' : 'none';
    }
    if (!hasAny) {
        const option = document.querySelector('#filter-type option[value="OtrosCEUAS"]');
        if (option) option.remove();
    }
}

function setupSortHeaders() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        th.style.cursor = 'pointer';
        if (!th.getAttribute('data-label')) {
            th.setAttribute('data-label', th.innerText.trim());
        }
        th.onclick = () => handleSort(th.getAttribute('data-key'));
    });
}

function handleSort(key) {
    if (sortConfig.key === key) {
        if (sortConfig.direction === 'none') sortConfig.direction = 'desc';
        else if (sortConfig.direction === 'desc') sortConfig.direction = 'asc';
        else sortConfig.direction = 'none';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'desc';
    }
    renderTable();
}

function getFilteredAndSortedData() {
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-type');
    
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filterType = filterSelect ? filterSelect.value : 'all';

    let data = allUsers.filter(u => {
        if (!term) return true;
        
        // Búsqueda especial para CEUAS
        if (filterType === 'OtrosCEUAS') {
            if (term.includes('otro')) return u.OtrosCeuaCount > 0;
            if (term === 'no') return u.OtrosCeuaCount == 0;
            return true;
        }

        // Búsqueda general o por columna
        const val = filterType === 'all' 
            ? `${u.Usuario} ${u.ApellidoA} ${u.NombreA} ${u.Correo}`.toLowerCase() 
            : String(u[filterType] || '').toLowerCase();
            
        return val.includes(term);
    });

    if (sortConfig.direction === 'none') {
        data.sort((a, b) => a.IdUsrA - b.IdUsrA);
    } else {
        data.sort((a, b) => {
            let valA = a[sortConfig.key] || '';
            let valB = b[sortConfig.key] || '';
            return sortConfig.direction === 'asc' 
                ? (typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB)
                : (typeof valA === 'string' ? valB.localeCompare(valA) : valB - valA);
        });
    }
    return data;
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const data = getFilteredAndSortedData();
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tbody.innerHTML = '';
    const showOtros = allUsers.some(u => u.OtrosCeuaCount > 0);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron usuarios</td></tr>`;
        // IMPORTANTE: Incluso si no hay datos, debemos limpiar la paginación
        const pagContainer = document.getElementById('pagination');
        if(pagContainer) pagContainer.innerHTML = '';
        return;
    }

    pageData.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => openUserModal(u);
        const fullNombre = `${u.ApellidoA || ''} ${u.NombreA || ''}`.trim();
        
        tr.innerHTML = `
            <td class="py-3 px-3">${u.IdUsrA}</td>
            <td class="py-3 px-3 text-muted">${u.Usuario || '-'}</td>
            <td class="py-3 px-3 fw-bold">${fullNombre || 'Sin Datos'}</td>
            <td class="py-3 px-3">${u.CelularA || '-'}</td>
            <td class="py-3 px-3 text-secondary">${u.Correo || '-'}</td>
            <td class="py-3 px-3 text-muted">${u.Laboratorio || '-'}</td>
            ${showOtros ? `<td class="py-3 px-3 text-center"><span class="badge ${u.OtrosCeuaCount > 0 ? 'bg-danger' : 'bg-light text-secondary border'}">${u.OtrosCeuaCount > 0 ? 'OTROS CEUAS' : 'NO'}</span></td>` : ''}
        `;
        tbody.appendChild(tr);
    });

    updateHeaderIcons();
    
    // ***************************************************
    // FIX: PASAR ARGUMENTOS FALTANTES
    // ***************************************************
    renderPagination(data.length, 'pagination', renderTable);
    
    // Ocultamos el loader si existe (opcional pero recomendado)
    if (typeof hideLoader === 'function') hideLoader();
}
function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const arrow = (sortConfig.key === key && sortConfig.direction !== 'none') ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';
        th.innerHTML = `${th.getAttribute('data-label')}${arrow}`;
    });
}

function renderPagination(totalRows, containerId, targetRenderTable) {
    const pagination = document.getElementById(containerId);
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const createBtn = (label, targetPage, isDisabled, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
        if (!isDisabled) li.onclick = (e) => { 
            e.preventDefault(); 
            currentPage = targetPage; 
            targetRenderTable(); 
        };
        return li;
    };

    // Botón Anterior
    pagination.appendChild(createBtn('Anterior', currentPage - 1, currentPage === 1));

    // Lógica de números: Primer número
    pagination.appendChild(createBtn(1, 1, false, currentPage === 1));

    let start = Math.max(2, currentPage - 4);
    let end = Math.min(totalPages - 1, currentPage + 4);

    if (start > 2) {
        const ellipsis = document.createElement('li');
        ellipsis.className = 'page-item disabled';
        ellipsis.innerHTML = '<span class="page-link">...</span>';
        pagination.appendChild(ellipsis);
    }

    for (let i = start; i <= end; i++) {
        pagination.appendChild(createBtn(i, i, false, i === currentPage));
    }

    if (end < totalPages - 1) {
        const ellipsis = document.createElement('li');
        ellipsis.className = 'page-item disabled';
        ellipsis.innerHTML = '<span class="page-link">...</span>';
        pagination.appendChild(ellipsis);
    }

    // Último número
    pagination.appendChild(createBtn(totalPages, totalPages, false, currentPage === totalPages));

    // Botón Siguiente
    pagination.appendChild(createBtn('Siguiente', currentPage + 1, currentPage === totalPages));
}

// --- GESTIÓN DEL MODAL ---

window.openUserModal = async (u) => {
    const instId = localStorage.getItem('instId');
    const instName = localStorage.getItem('NombreInst') || 'URBE - Gestión';
    const modalElement = document.getElementById('modal-user');
    const content = document.getElementById('modal-content');
    
    // 1. Loader visual
    content.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-success" role="status"></div>
            <p class="mt-2 text-muted">Obteniendo historial completo...</p>
        </div>`;
    
    // Usamos getOrCreateInstance para evitar duplicidad de modales
    const myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    myModal.show();

    // 2. Carga paralela de datos (RUTA DE DEPARTAMENTOS CORREGIDA)
    const [resProt, resForms, resDeptos, resAloj, resProtocolsUsed, resInsumosPedidos, resInsumosExpPedidos] = await Promise.all([
        API.request(`/users/protocols?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/users/forms?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/deptos/list?inst=${instId}`),
        API.request(`/users/alojamientos?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/users/protocols-used-in-forms?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/users/insumos-pedidos?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/users/insumos-exp-pedidos?id=${u.IdUsrA}&inst=${instId}`)
    ]);

    const protocolos = resProt.status === 'success' ? resProt.data : [];
    const formularios = resForms.status === 'success' ? resForms.data : [];
    const departamentos = resDeptos.status === 'success' ? resDeptos.data : [];
    const alojamientos = resAloj.status === 'success' ? resAloj.data : [];
    const protocolsUsed = resProtocolsUsed.status === 'success' ? (resProtocolsUsed.data || []) : [];
    const insumosPedidos = resInsumosPedidos.status === 'success' ? (resInsumosPedidos.data || []) : [];
    const insumosExpPedidos = resInsumosExpPedidos.status === 'success' ? (resInsumosExpPedidos.data || []) : [];
    const isDisabled = String(u.ActivoA) === '0';
    const tienePedidosInsumos = formularios.some(f => (String(f.CategoriaFormulario || '').toLowerCase()).includes('insumo'));
    const puedeFacturar = protocolos.length > 0 || tienePedidosInsumos;
    const puedeEliminar = formularios.length === 0 && protocolos.length === 0 && alojamientos.length === 0 && (u.IdTipousrA == 3 || u.IdTipousrA === '3');
    const disableLegend = isDisabled
        ? `<div class="small text-danger mt-2"><i class="bi bi-info-circle me-1"></i>Usuario deshabilitado. Motivo: baja administrativa o deshabilitación previa.</div>`
        : '';
    const facturacionLegend = !puedeFacturar
        ? `<div class="small text-warning mt-2"><i class="bi bi-receipt me-1"></i>Ver facturación solo disponible si tiene protocolos a cargo o pedidos de formularios de insumos.</div>`
        : '';
    const eliminarLegend = !puedeEliminar
        ? `<div class="small text-muted mt-2"><i class="bi bi-info-circle me-1"></i>Solo se puede eliminar si es investigador y no tiene formularios, protocolos ni alojamientos efectuados.</div>`
        : '';

    content.innerHTML = `
        <div id="ficha-print-area" class="ficha-print-area">
            <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4 ficha-print-header">
                <div class="fw-black text-success text-uppercase small">${instName}</div>
                <div class="text-muted small uppercase fw-bold">Ficha de Usuario N° ${u.IdUsrA}</div>
            </div>

            <form id="form-usuario-detalle" class="ficha-datos-persona">
                <div class="row g-3">
                    <div class="col-12 bg-light p-3 rounded border-start border-4 border-success mb-2">
                        <label class="text-muted small fw-bold text-uppercase">Usuario de Sistema</label>
                        <input type="text" class="form-control-plaintext fw-bold h5 mb-0" value="${u.Usuario || '---'}" readonly>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="form-label text-muted small fw-bold uppercase">Apellido</label>
                        <input type="text" name="ApellidoA" class="form-control form-control-sm fw-bold" value="${u.ApellidoA || ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small fw-bold uppercase">Nombre</label>
                        <input type="text" name="NombreA" class="form-control form-control-sm fw-bold" value="${u.NombreA || ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small fw-bold uppercase">Correo</label>
                        <input type="email" name="EmailA" class="form-control form-control-sm fw-bold text-primary" value="${u.Correo || ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small fw-bold uppercase">Celular</label>
                        <input type="text" name="CelularA" class="form-control form-control-sm fw-bold" value="${u.CelularA || ''}">
                    </div>

                    <div class="col-12">
                        <label class="form-label text-muted small fw-bold uppercase">Departamento / División</label>
                        <select name="iddeptoA" class="form-select form-select-sm fw-bold">
                            <option value="">-- Sin Departamento Asignado --</option>
                            ${departamentos.map(d => {
                                const isSelected = (u.iddeptoA == d.iddeptoA) ? 'selected' : '';
                                return `<option value="${d.iddeptoA}" ${isSelected}>
                                            ${d.NombreDeptoA} ${d.DetalledeptoA ? `(${d.DetalledeptoA})` : ''}
                                        </option>`;
                            }).join('')}
                        </select>
                    </div>

                <div class="mt-4 d-flex gap-2 flex-wrap">
                    <button type="button" class="btn btn-success btn-sm fw-bold px-4 uppercase" onclick="saveUserData(${u.IdUsrA})">Guardar Cambios</button>
                    <button type="button" class="btn btn-warning btn-sm fw-bold px-3 uppercase" onclick="resetPassword(${u.IdUsrA})">Resetear Clave</button>
                    <button type="button" class="btn btn-outline-dark btn-sm fw-bold px-3 uppercase" onclick="deleteUser(${u.IdUsrA})" ${puedeEliminar ? '' : 'disabled title="Solo se puede eliminar si es investigador y no tiene formularios, protocolos ni alojamientos"'}>
                        <i class="bi bi-person-x"></i> Eliminar
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm fw-bold px-3 uppercase" onclick="openBillingForUser(${u.IdUsrA})" ${puedeFacturar ? '' : 'disabled title="Sin protocolos ni pedidos de insumos"'}>
                        <i class="bi bi-receipt"></i> Ver Facturación
                    </button>
                </div>
                ${facturacionLegend}
                ${eliminarLegend}
                ${disableLegend}
            </form>

            <hr class="my-4 border-2 border-secondary">

            <div class="row g-3 mb-4">
                <div class="col-4">
                    <div class="border rounded p-3 text-center bg-light h-100">
                        <div class="text-primary small fw-bold text-uppercase mb-1">Animales utilizados en protocolos</div>
                        <div class="fs-3 fw-bold text-primary">${protocolsUsed.reduce((s, p) => s + (parseInt(p.animales_usados, 10) || 0), 0)}</div>
                        <div class="small text-muted">total en formularios entregados</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border rounded p-3 text-center bg-light h-100">
                        <div class="text-success small fw-bold text-uppercase mb-1">Insumos pedidos</div>
                        <div class="fs-3 fw-bold text-success">${insumosPedidos.length}</div>
                        <div class="small text-muted">pedidos de insumos</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border rounded p-3 text-center bg-light h-100">
                        <div class="text-info small fw-bold text-uppercase mb-1">Insumos experimentales pedidos</div>
                        <div class="fs-3 fw-bold text-info">${insumosExpPedidos.length}</div>
                        <div class="small text-muted">pedidos de reactivos</div>
                    </div>
                </div>
            </div>

            <hr class="my-5">

            <div class="mt-5">
                <h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2">
                    <i class="bi bi-file-earmark-medical me-2"></i>Protocolos a su cargo
                </h6>
                <div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;">
                    <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th class="px-3">ID Prot.</th>
                                <th class="px-3">N° Prot.</th>
                                <th>Título del Proyecto</th>
                                <th class="text-center">Vencimiento</th>
                                <th class="text-end pe-3">Abrir</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${protocolos.length ? protocolos.map(p => `
                                <tr>
                                    <td class="px-3 fw-bold text-muted">${p.idprotA}</td>
                                    <td class="px-3 fw-bold text-success">${p.nprotA}</td>
                                    <td>${p.tituloA}</td>
                                    <td class="text-center text-muted">${p.FechaFinProtA || 'N/A'}</td>
                                    <td class="text-end pe-3">
                                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); window.openProtocolFromUserCard(${p.idprotA})" title="Abrir protocolo">
                                            <i class="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>`).join('') : '<tr><td colspan="5" class="text-center py-4 text-muted italic">No tiene protocolos asignados actualmente.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mt-4">
                <h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2">
                    <i class="bi bi-clipboard-check me-2"></i>Historial de Formularios
                </h6>
                <div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;">
                    <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th class="px-3">Fecha</th>
                                <th class="px-3">ID Form.</th>
                                <th class="px-3">ID Prot.</th>
                                <th>Tipo de Trámite</th>
                                <th class="text-center">Estado</th>
                                <th class="text-end pe-3">Abrir</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${formularios.length ? formularios.map(f => `
                                <tr>
                                    <td class="px-3 text-muted">${f.fechainicioA}</td>
                                    <td class="px-3 fw-bold text-muted">${f.idformA}</td>
                                    <td class="px-3 fw-bold text-secondary">${f.idprotA || '---'}</td>
                                    <td class="fw-bold">
                                        ${f.TipoTramiteNombre || `Tipo ${f.tipoA}`}
                                        <div class="small text-muted">${f.CategoriaFormulario || 'Sin categoría'}</div>
                                    </td>
                                    <td class="text-center">
                                        <span class="badge rounded-pill bg-opacity-10 text-uppercase" 
                                              style="background-color: #e8f5e9; color: #1a5d3b; font-size: 10px;">
                                            ${f.estado}
                                        </span>
                                    </td>
                                    <td class="text-end pe-3">
                                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); window.openFormFromUserCard(${f.idformA}, '${f.CategoriaFormulario || ''}')" title="Abrir formulario">
                                            <i class="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted italic">No registra pedidos de formularios.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mt-4">
                <h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2">
                    <i class="bi bi-houses me-2"></i>Historial de Alojamientos
                </h6>
                <div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;">
                    <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th class="px-3">Historia</th>
                                <th class="px-3">ID Aloj.</th>
                                <th class="px-3">ID Prot.</th>
                                <th>Especie</th>
                                <th>Período</th>
                                <th class="text-end pe-3">Abrir</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alojamientos.length ? alojamientos.map(a => `
                                <tr>
                                    <td class="px-3 fw-bold text-muted">#${a.historia || '---'}</td>
                                    <td class="px-3 text-muted">${a.IdAlojamiento || '---'}</td>
                                    <td class="px-3 fw-bold text-secondary">${a.idprotA || '---'}</td>
                                    <td class="fw-bold">${a.Especie || '---'}</td>
                                    <td class="small text-muted">${a.fechavisado || '---'} → ${a.hastafecha || '---'}</td>
                                    <td class="text-end pe-3">
                                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); window.openAlojamientoFromUserCard(${a.historia || 0})" title="Abrir alojamiento">
                                            <i class="bi bi-box-arrow-up-right"></i>
                                        </button>
                                    </td>
                                </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted italic">No registra alojamientos.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mt-5 pt-3 border-top d-flex flex-wrap gap-2 justify-content-between">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-danger btn-sm fw-bold px-3 uppercase" onclick="event.preventDefault(); downloadPDF(${u.IdUsrA}, 'total')">
                        <i class="bi bi-file-pdf"></i> PDF Total
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold px-3 uppercase" onclick="event.preventDefault(); downloadPDF(${u.IdUsrA}, 'simple')">
                        <i class="bi bi-person-badge"></i> Solo Ficha
                    </button>
                </div>
                <button type="button" class="btn btn-light btn-sm fw-bold text-muted uppercase" data-bs-dismiss="modal">Cerrar</button>
            </div>
    `;

    window._lastUserFichaData = {
        u,
        protocolos,
        formularios,
        alojamientos,
        protocolsUsed,
        insumosPedidos,
        insumosExpPedidos,
        departamentos,
        instName
    };
};
// --- ACCIONES ---

window.saveUserData = async (id) => {
    const form = document.getElementById('form-usuario-detalle');
    const formData = new FormData(form);

    // Enviamos: 1. Endpoint, 2. Método, 3. Datos
    const res = await API.request(`/users/update?id=${id}`, 'POST', formData);
    
    if (res.status === 'success') {
        alert("¡Datos actualizados con éxito!");
        // Refrescamos la tabla para que se vean los cambios
        initUsuariosPage(); 
        
        // Cerramos el modal usando Bootstrap
        const modalEl = document.getElementById('modal-user');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    } else {
        alert("Hubo un error: " + res.message);
    }
};

window.resetPassword = async (id) => {
    if (!confirm("¿Estás seguro de resetear la clave a '12345678'?")) return;
    
    // Petición POST sin cuerpo de datos
    const res = await API.request(`/users/reset-pass?id=${id}`, 'POST');
    
    if (res.status === 'success') {
        alert("Contraseña reseteada correctamente.");
    } else {
        alert("Error: " + res.message);
    }
};

window.openProtocolFromUserCard = (idprotA) => {
    const role = parseInt(localStorage.getItem('userLevel') || sessionStorage.getItem('userLevel') || '0', 10);
    if (![1, 2, 4, 5, 6].includes(role)) {
        return window.Swal.fire('Sin permisos', 'Tu rol no tiene acceso a protocolos de administración.', 'warning');
    }
    openWithModal('admin/protocolos', idprotA, 'id');
};

window.openFormFromUserCard = (idformA, categoria) => {
    const role = parseInt(localStorage.getItem('userLevel') || sessionStorage.getItem('userLevel') || '0', 10);
    if (![1, 2, 4, 5, 6].includes(role)) {
        return window.Swal.fire('Sin permisos', 'Tu rol no tiene acceso a formularios de administración.', 'warning');
    }
    const page = getFormPageByCategoria(categoria);
    openWithModal(`admin/${page}`, idformA, 'id');
};

window.openAlojamientoFromUserCard = (historia) => {
    const role = parseInt(localStorage.getItem('userLevel') || sessionStorage.getItem('userLevel') || '0', 10);
    if (![1, 2, 4, 5, 6].includes(role)) {
        return window.Swal.fire('Sin permisos', 'Tu rol no tiene acceso a alojamientos de administración.', 'warning');
    }
    openWithModal('admin/alojamientos', historia, 'historia');
};

window.openBillingForUser = (idUsr) => {
    const role = parseInt(localStorage.getItem('userLevel') || sessionStorage.getItem('userLevel') || '0', 10);
    if (![1, 2, 4, 5, 6].includes(role)) {
        return window.Swal.fire('Sin permisos', 'Tu rol no tiene acceso a facturación.', 'warning');
    }
    const basePath = Auth.getBasePath();
    const url = `${window.location.origin}${basePath}admin/facturacion/investigador?idUsr=${encodeURIComponent(idUsr)}&all=1`;
    window.open(url, '_blank');
};

window.deleteUser = async (id) => {
    const Swal = window.Swal;
    const data = window._lastUserFichaData;
    const u = data && data.u && String(data.u.IdUsrA) === String(id) ? data.u : null;
    const idText = id;
    const usuarioText = (u ? (u.Usuario || '—') : '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const nombreCompleto = (u ? [u.ApellidoA, u.NombreA].filter(Boolean).join(', ') || '—' : '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Cerrar el modal de la ficha primero para que el SweetAlert quede encima y el input sea clickeable
    const modalEl = document.getElementById('modal-user');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    await new Promise(r => setTimeout(r, 200));

    if (!Swal) {
        const ok = confirm(`¿Eliminar usuario de la base de datos?\n\nID: ${idText}\nUsuario: ${usuarioText}\nNombre y apellido: ${nombreCompleto}\n\nDeberás confirmar con tu contraseña.`);
        if (!ok) return;
        const password = prompt('Ingresa tu contraseña para confirmar la eliminación:');
        if (password === null || password === '') return;
        try {
            const res = await API.request('/users/delete', 'POST', { id, password });
            if (res.status === 'success') {
                alert(res.message || 'Usuario eliminado.');
                initUsuariosPage();
            } else alert('Error: ' + (res.message || 'No se pudo eliminar'));
        } catch (e) {
            console.error(e);
            alert('No se pudo procesar la eliminación.');
        }
        return;
    }

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: 'Eliminar usuario',
        html: `
            <div class="text-start small mb-3">
                <p class="text-muted mb-2">Se eliminará de la base de datos al siguiente usuario. Solo se permite para investigadores sin formularios, protocolos ni alojamientos.</p>
                <table class="table table-sm table-bordered mb-0">
                    <tr><td style="width: 120px;" class="text-muted">ID</td><td class="fw-bold">${idText}</td></tr>
                    <tr><td class="text-muted">Usuario</td><td class="fw-bold">${usuarioText}</td></tr>
                    <tr><td class="text-muted">Nombre y apellido</td><td class="fw-bold">${nombreCompleto}</td></tr>
                </table>
            </div>
        `,
        input: 'password',
        inputPlaceholder: 'Tu contraseña para confirmar',
        inputAttributes: { id: 'swal-delete-password', autocomplete: 'current-password' },
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'swal-delete-popup' },
        didOpen: () => {
            const input = document.querySelector('.swal-delete-popup .swal2-input');
            if (input) { input.focus(); input.style.pointerEvents = 'auto'; }
        },
        preConfirm: (value) => value && value.trim() ? value.trim() : null
    });

    if (!isConfirmed || !formValues) return;

    try {
        const res = await API.request('/users/delete', 'POST', { id, password: formValues });
        if (res.status === 'success') {
            await Swal.fire('Listo', res.message || 'Usuario eliminado correctamente.', 'success');
            initUsuariosPage();
            return;
        }
        const d = res.details || {};
        const extra = (d.formularios !== undefined)
            ? `\nFormularios: ${d.formularios}\nProtocolos: ${d.protocolos}\nAlojamientos: ${d.alojamientos}`
            : '';
        await Swal.fire('No se puede eliminar', `${res.message || 'Tiene datos asociados.'}${extra}`, 'warning');
    } catch (error) {
        console.error(error);
        await Swal.fire('Error', 'No se pudo procesar la eliminación del usuario.', 'error');
    }
};

// front/dist/js/pages/admin/usuarios.js

function esc(s) {
    if (s == null || s === undefined) return '';
    const t = String(s);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildFichaSimpleHTML(data) {
    const { u, departamentos, instName } = data;
    const deptoNombre = (departamentos || []).find(d => d.iddeptoA == u.iddeptoA);
    const deptoText = deptoNombre ? (deptoNombre.NombreDeptoA + (deptoNombre.DetalledeptoA ? ' (' + deptoNombre.DetalledeptoA + ')' : '')) : '—';
    return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #333; max-width: 210mm; background: #fff;">
        <div style="border-bottom: 3px solid #1a5d3b; padding-bottom: 12px; margin-bottom: 24px;">
            <div style="font-weight: bold; color: #1a5d3b; text-transform: uppercase; font-size: 12px;">${esc(instName)}</div>
            <div style="color: #666; font-size: 11px; text-transform: uppercase; font-weight: bold;">Ficha de Usuario N° ${esc(u.IdUsrA)}</div>
        </div>
        <div style="font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; width: 140px; color: #666;">Usuario de sistema</td><td style="padding: 6px 0; font-weight: bold;">${esc(u.Usuario || '—')}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Apellido</td><td style="padding: 6px 0;">${esc(u.ApellidoA || '—')}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Nombre</td><td style="padding: 6px 0;">${esc(u.NombreA || '—')}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Correo</td><td style="padding: 6px 0;">${esc(u.Correo || '—')}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Celular</td><td style="padding: 6px 0;">${esc(u.CelularA || '—')}</td></tr>
                <tr><td style="padding: 6px 0; color: #666;">Departamento / División</td><td style="padding: 6px 0;">${esc(deptoText)}</td></tr>
            </table>
        </div>
    </div>`;
}

function buildFichaTotalHTML(data) {
    const { u, protocolos, formularios, alojamientos, protocolsUsed, insumosPedidos, insumosExpPedidos, departamentos, instName } = data;
    const deptoNombre = (departamentos || []).find(d => d.iddeptoA == u.iddeptoA);
    const deptoText = deptoNombre ? (deptoNombre.NombreDeptoA + (deptoNombre.DetalledeptoA ? ' (' + deptoNombre.DetalledeptoA + ')' : '')) : '—';
    const totalAnimales = (protocolsUsed || []).reduce((s, p) => s + (parseInt(p.animales_usados, 10) || 0), 0);

    const rowsProt = (protocolos || []).length ? protocolos.map(p => `
        <tr><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(p.idprotA)}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(p.nprotA)}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(p.tituloA)}</td><td style="padding: 5px 6px; border: 1px solid #ddd; text-align: center;">${esc(p.FechaFinProtA || 'N/A')}</td></tr>`).join('')
        : '<tr><td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #666;">No tiene protocolos asignados.</td></tr>';
    const rowsForm = (formularios || []).length ? formularios.map(f => `
        <tr><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(f.fechainicioA)}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(f.idformA)}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(f.idprotA || '—')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(f.TipoTramiteNombre || '')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(f.CategoriaFormulario || '')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(f.estado)}</td></tr>`).join('')
        : '<tr><td colspan="6" style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #666;">No registra pedidos de formularios.</td></tr>';
    const rowsAloj = (alojamientos || []).length ? alojamientos.map(a => `
        <tr><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(a.historia || '—')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(a.IdAlojamiento || '—')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(a.idprotA || '—')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(a.Especie || '—')}</td><td style="padding: 5px 6px; border: 1px solid #ddd;">${esc(a.fechavisado || '—')} → ${esc(a.hastafecha || '—')}</td></tr>`).join('')
        : '<tr><td colspan="5" style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #666;">No registra alojamientos.</td></tr>';

    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 11px; background: #fff;">
        <div style="border-bottom: 3px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 16px;">
            <div style="font-weight: bold; color: #1a5d3b; text-transform: uppercase; font-size: 12px;">${esc(instName)}</div>
            <div style="color: #666; font-size: 10px; text-transform: uppercase; font-weight: bold;">Ficha de Usuario N° ${esc(u.IdUsrA)} (Completa)</div>
        </div>

        <div style="margin-bottom: 16px;">
            <div style="font-weight: bold; color: #1a5d3b; font-size: 11px; margin-bottom: 8px;">DATOS PERSONALES</div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; width: 140px; color: #666;">Usuario</td><td style="padding: 4px 0;">${esc(u.Usuario || '—')}</td></tr>
                <tr><td style="padding: 4px 0; color: #666;">Apellido</td><td style="padding: 4px 0;">${esc(u.ApellidoA || '—')}</td></tr>
                <tr><td style="padding: 4px 0; color: #666;">Nombre</td><td style="padding: 4px 0;">${esc(u.NombreA || '—')}</td></tr>
                <tr><td style="padding: 4px 0; color: #666;">Correo</td><td style="padding: 4px 0;">${esc(u.Correo || '—')}</td></tr>
                <tr><td style="padding: 4px 0; color: #666;">Celular</td><td style="padding: 4px 0;">${esc(u.CelularA || '—')}</td></tr>
                <tr><td style="padding: 4px 0; color: #666;">Departamento</td><td style="padding: 4px 0;">${esc(deptoText)}</td></tr>
            </table>
        </div>

        <div style="margin-bottom: 16px;">
            <div style="font-weight: bold; color: #1a5d3b; font-size: 11px; margin-bottom: 8px;">RESUMEN</div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 33%; padding: 10px; border: 1px solid #ddd; text-align: center; background: #f8f9fa;">
                        <div style="font-size: 10px; color: #1a5d3b;">Animales en protocolos</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1a5d3b;">${totalAnimales}</div>
                    </td>
                    <td style="width: 33%; padding: 10px; border: 1px solid #ddd; text-align: center; background: #f8f9fa;">
                        <div style="font-size: 10px; color: #1a5d3b;">Insumos pedidos</div>
                        <div style="font-size: 18px; font-weight: bold;">${(insumosPedidos || []).length}</div>
                    </td>
                    <td style="width: 34%; padding: 10px; border: 1px solid #ddd; text-align: center; background: #f8f9fa;">
                        <div style="font-size: 10px; color: #1a5d3b;">Insumos experimentales</div>
                        <div style="font-size: 18px; font-weight: bold;">${(insumosExpPedidos || []).length}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div style="margin-bottom: 14px;">
            <div style="font-weight: bold; color: #1a5d3b; font-size: 11px; margin-bottom: 6px;">PROTOCOLOS A SU CARGO</div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr style="background: #f0f0f0;"><th style="padding: 6px; border: 1px solid #ddd;">ID</th><th style="padding: 6px; border: 1px solid #ddd;">N° Prot.</th><th style="padding: 6px; border: 1px solid #ddd;">Título</th><th style="padding: 6px; border: 1px solid #ddd;">Vencimiento</th></tr></thead>
                <tbody>${rowsProt}</tbody>
            </table>
        </div>

        <div style="margin-bottom: 14px;">
            <div style="font-weight: bold; color: #1a5d3b; font-size: 11px; margin-bottom: 6px;">HISTORIAL DE FORMULARIOS</div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr style="background: #f0f0f0;"><th style="padding: 6px; border: 1px solid #ddd;">Fecha</th><th style="padding: 6px; border: 1px solid #ddd;">ID Form.</th><th style="padding: 6px; border: 1px solid #ddd;">ID Prot.</th><th style="padding: 6px; border: 1px solid #ddd;">Tipo</th><th style="padding: 6px; border: 1px solid #ddd;">Categoría</th><th style="padding: 6px; border: 1px solid #ddd;">Estado</th></tr></thead>
                <tbody>${rowsForm}</tbody>
            </table>
        </div>

        <div>
            <div style="font-weight: bold; color: #1a5d3b; font-size: 11px; margin-bottom: 6px;">HISTORIAL DE ALOJAMIENTOS</div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr style="background: #f0f0f0;"><th style="padding: 6px; border: 1px solid #ddd;">Historia</th><th style="padding: 6px; border: 1px solid #ddd;">ID Aloj.</th><th style="padding: 6px; border: 1px solid #ddd;">ID Prot.</th><th style="padding: 6px; border: 1px solid #ddd;">Especie</th><th style="padding: 6px; border: 1px solid #ddd;">Período</th></tr></thead>
                <tbody>${rowsAloj}</tbody>
            </table>
        </div>
    </div>`;
}

window.downloadPDF = async (id, mode = 'total') => {
    const data = window._lastUserFichaData;
    if (!data || String(data.u.IdUsrA) !== String(id)) {
        if (typeof window.Swal !== 'undefined') {
            window.Swal.fire('Aviso', 'Abre la ficha del usuario y vuelve a intentar descargar el PDF.', 'info');
        } else {
            alert('Abre la ficha del usuario y vuelve a intentar descargar el PDF.');
        }
        return;
    }

    const modalEl = document.getElementById('modal-user');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    await new Promise(r => setTimeout(r, 400));
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const htmlString = mode === 'simple' ? buildFichaSimpleHTML(data) : buildFichaTotalHTML(data);
    const wrapper = document.createElement('div');
    wrapper.setAttribute('id', 'pdf-export-container');
    wrapper.style.cssText = 'position:fixed;top:0;left:0;width:794px;min-height:1122px;background:#fff;z-index:99999;padding:20px;box-sizing:border-box;overflow:auto;visibility:visible;opacity:1;';
    wrapper.innerHTML = htmlString;
    document.body.appendChild(wrapper);
    const contentEl = wrapper.firstElementChild;
    if (contentEl) {
        contentEl.setAttribute('style', (contentEl.getAttribute('style') || '') + ';width:754px;min-height:1080px;');
    }
    await new Promise(r => setTimeout(r, 300));

    const fileName = mode === 'simple' ? `Ficha_Datos_Personales_${id}.pdf` : `Ficha_Completa_${id}.pdf`;
    const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(contentEl || wrapper).save();
    } catch (error) {
        console.error('Error al generar PDF:', error);
        if (typeof window.Swal !== 'undefined') {
            window.Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
        } else {
            alert('No se pudo generar el PDF.');
        }
    } finally {
        const el = document.getElementById('pdf-export-container');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }
};

function exportToExcel() {
    const dataToExport = getFilteredAndSortedData();
    const excelRows = dataToExport.map(u => ({ "ID": u.IdUsrA, "Usuario": u.Usuario, "Apellido": u.ApellidoA, "Nombre": u.NombreA, "Correo": u.Correo, "Laboratorio": u.Laboratorio }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(workbook, `Reporte_Usuarios.xlsx`);
}


export function initAyuda() {
    const btnAyuda = document.getElementById('btn-ayuda');
    const modalElement = document.getElementById('modal-ayuda');

    if (btnAyuda && modalElement) {
        btnAyuda.onclick = (e) => {
            e.preventDefault();
            
            // 1. Intentamos obtener la instancia si ya existe
            let modalAyuda = bootstrap.Modal.getInstance(modalElement);
            
            // 2. Si no existe, la creamos una sola vez
            if (!modalAyuda) {
                modalAyuda = new bootstrap.Modal(modalElement);
            }
            
            modalAyuda.show();
        };
    }
}