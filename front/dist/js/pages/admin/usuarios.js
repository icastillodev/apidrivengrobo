// front/dist/js/pages/admin/usuarios.js
import { API } from '../../api.js';

let allUsers = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'IdUsrA', direction: 'none' }; 

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
    if (btnSearch) {
        btnSearch.onclick = () => {
            currentPage = 1;
            renderTable();
        };
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
    const [resProt, resForms, resDeptos] = await Promise.all([
        API.request(`/users/protocols?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/users/forms?id=${u.IdUsrA}&inst=${instId}`),
        API.request(`/deptos/list?inst=${instId}`) // <--- CAMBIO AQUÍ
    ]);

    const protocolos = resProt.status === 'success' ? resProt.data : [];
    const formularios = resForms.status === 'success' ? resForms.data : [];
    const departamentos = resDeptos.status === 'success' ? resDeptos.data : [];

    content.innerHTML = `
        <div id="ficha-print-area">
            <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                <div class="fw-black text-success text-uppercase small">${instName}</div>
                <div class="text-muted small uppercase fw-bold">Ficha de Usuario N° ${u.IdUsrA}</div>
            </div>

            <form id="form-usuario-detalle">
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

                <div class="mt-4 d-flex gap-2">
                    <button type="button" class="btn btn-success btn-sm fw-bold px-4 uppercase" onclick="saveUserData(${u.IdUsrA})">Guardar Cambios</button>
                    <button type="button" class="btn btn-warning btn-sm fw-bold px-3 uppercase" onclick="resetPassword(${u.IdUsrA})">Resetear Clave</button>
                </div>
            </form>

            <hr class="my-5">

            <div class="mt-5">
                <h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2">
                    <i class="bi bi-file-earmark-medical me-2"></i>Protocolos a su cargo
                </h6>
                <div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;">
                    <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th class="px-3">N° Prot.</th>
                                <th>Título del Proyecto</th>
                                <th class="text-center">Vencimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${protocolos.length ? protocolos.map(p => `
                                <tr>
                                    <td class="px-3 fw-bold text-success">${p.nprotA}</td>
                                    <td>${p.tituloA}</td>
                                    <td class="text-center text-muted">${p.FechaFinProtA || 'N/A'}</td>
                                </tr>`).join('') : '<tr><td colspan="3" class="text-center py-4 text-muted italic">No tiene protocolos asignados actualmente.</td></tr>'}
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
                                <th>Tipo de Trámite</th>
                                <th class="text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${formularios.length ? formularios.map(f => `
                                <tr>
                                    <td class="px-3 text-muted">${f.fechainicioA}</td>
                                    <td class="fw-bold">${f.tipoA}</td>
                                    <td class="text-center">
                                        <span class="badge rounded-pill bg-opacity-10 text-uppercase" 
                                              style="background-color: #e8f5e9; color: #1a5d3b; font-size: 10px;">
                                            ${f.estado}
                                        </span>
                                    </td>
                                </tr>`).join('') : '<tr><td colspan="3" class="text-center py-4 text-muted italic">No registra pedidos de formularios.</td></tr>'}
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

// front/dist/js/pages/admin/usuarios.js

window.downloadPDF = async (id, mode = 'total') => {
    const element = document.getElementById('ficha-print-area');
    if (!element) return;

    // 1. Clonamos la ficha
    const clonedElement = element.cloneNode(true);
    
    // 2. Si es modo simple, buscamos y eliminamos las secciones de tablas
    if (mode === 'simple') {
        // Buscamos los divs que contienen los h6 de Protocolos y Formularios
        const extraSections = clonedElement.querySelectorAll('.mt-5, .mt-4');
        const hr = clonedElement.querySelector('hr');
        
        if (hr) hr.remove(); // Quitamos la línea divisoria
        extraSections.forEach(section => {
            // Verificamos que sea la sección de tablas y no otra cosa
            if (section.querySelector('h6')) {
                section.remove();
            }
        });
    }

    // 3. LIMPIEZA GENERAL (Botones, Iconos y Errores de Imagen)
    const toRemove = clonedElement.querySelectorAll('button, .btn, .spinner-border, i, svg, .bi');
    toRemove.forEach(el => el.remove());

    const allNodes = clonedElement.querySelectorAll('*');
    allNodes.forEach(el => {
        el.style.backgroundImage = 'none'; // Evita error "Unsupported image type"
        el.style.boxShadow = 'none';
    });

    // 4. CONFIGURACIÓN FINAL
    const fileName = mode === 'simple' ? `Ficha_Basica_${id}.pdf` : `Ficha_Completa_${id}.pdf`;
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(clonedElement).save();
    } catch (error) {
        console.error("Error al generar PDF:", error);
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