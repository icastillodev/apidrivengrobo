// front/dist/js/pages/admin/usuarios.js
// v: modal construido por concatenación (sin template literals) + cache-bust
import { API } from '../../api.js';
import { Auth } from '../../auth.js';
import { getCorrectPath } from '../../components/menujs/MenuConfig.js';
import { getPdfLogoHeaderFromStorage } from '../../utils/pdfLogoHeader.js';

console.log('[usuarios.js] módulo cargado (parse OK)');

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

/** Escapa texto para uso en atributos HTML (sin usar regex dentro de templates). */
function escapeHtmlAttr(str) {
    const s = String(str == null ? '' : str);
    return s.split('&').join('&amp;').split('"').join('&quot;').split('<').join('&lt;');
}

function openWithModal(targetPath, id, queryKey = 'id') {
    if (!id) return;
    const pathWithBase = getCorrectPath(targetPath);
    const url = `${window.location.origin}${pathWithBase}${pathWithBase.includes('?') ? '&' : '?'}${queryKey}=${encodeURIComponent(id)}&action=view`;
    window.open(url, '_blank');
}

export async function initUsuariosPage() {
    try {
        return await _initUsuariosPage();
    } catch (err) {
        console.error('[admin/usuarios] Error al inicializar:', err.message);
        console.error('[admin/usuarios] Línea/columna aproximadas:', err.lineNumber, err.columnNumber);
        console.error('[admin/usuarios] Stack:', err.stack);
        if (typeof window !== 'undefined') window.__lastUsuariosError = { message: err.message, stack: err.stack, line: err.lineNumber, col: err.columnNumber };
        throw err;
    }
}

async function _initUsuariosPage() {
    console.log('[usuarios] _initUsuariosPage inicio');
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

    // Delegación de clic para botones "Abrir formulario", "Abrir protocolo", "Abrir alojamiento" y "PDF" en la ficha (evita inyectar datos en onclick)
    const modalUser = document.getElementById('modal-user');
    if (modalUser) {
        modalUser.addEventListener('click', (e) => {
            const btnForm = e.target.closest('.btn-form-from-card');
            if (btnForm && btnForm.dataset.idform != null) {
                e.stopPropagation();
                window.openFormFromUserCard(btnForm.dataset.idform, btnForm.dataset.categoria || '');
                return;
            }
            const btnProt = e.target.closest('.btn-protocol-from-card');
            if (btnProt && btnProt.dataset.idprot != null) {
                e.stopPropagation();
                window.openProtocolFromUserCard(btnProt.dataset.idprot);
                return;
            }
            const btnAloj = e.target.closest('.btn-alojamiento-from-card');
            if (btnAloj && btnAloj.dataset.historia != null) {
                e.stopPropagation();
                window.openAlojamientoFromUserCard(btnAloj.dataset.historia);
                return;
            }
            const btnPdf = e.target.closest('.btn-download-pdf');
            if (btnPdf && btnPdf.dataset.idusr != null) {
                e.preventDefault();
                downloadPDF(parseInt(btnPdf.dataset.idusr, 10), btnPdf.dataset.tipo || 'total');
            }
        });
    }

    // Inicializar modal de ayuda
    initAyuda();
}

// --- LÓGICA DE TABLA Y FILTROS ---

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
    const colCount = 6;

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4 text-muted">${(window.txt?.admin_usuarios?.empty_usuarios || 'No se encontraron usuarios')}</td></tr>`;
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
    pagination.appendChild(createBtn((window.txt?.admin_usuarios?.pag_anterior || 'Anterior'), currentPage - 1, currentPage === 1));

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
    pagination.appendChild(createBtn((window.txt?.admin_usuarios?.pag_siguiente || 'Siguiente'), currentPage + 1, currentPage === totalPages));
}

// --- GESTIÓN DEL MODAL ---
// v: modal construido por concatenación (sin template literals) + cache-bust

function buildModalHtml(opts) {
    var u = opts.u, t = opts.t, instName = opts.instName;
    var protocolos = opts.protocolos, formularios = opts.formularios, alojamientos = opts.alojamientos, departamentos = opts.departamentos;
    var protocolsUsed = opts.protocolsUsed, insumosPedidos = opts.insumosPedidos, insumosExpPedidos = opts.insumosExpPedidos;
    var disableLegend = opts.disableLegend, facturacionLegend = opts.facturacionLegend, eliminarLegend = opts.eliminarLegend;
    var puedeEliminar = opts.puedeEliminar, puedeFacturar = opts.puedeFacturar;
    var rolNombre = opts.rolNombre || '';

    var html = '<div id="ficha-print-area" class="ficha-print-area">';
    html += '<div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4 ficha-print-header">';
    html += '<div class="fw-black text-success text-uppercase small">' + (instName || '') + '</div>';
    html += '<div class="text-muted small uppercase fw-bold">' + (t && t.ficha_title ? t.ficha_title : 'Ficha de Usuario N°') + ' ' + (u.IdUsrA || '') + '</div></div>';
    html += '<form id="form-usuario-detalle" class="ficha-datos-persona"><div class="row g-3">';
    html += '<div class="col-12 bg-light p-3 rounded border-start border-4 border-success mb-2"><label class="text-muted small fw-bold text-uppercase">' + (t && t.ficha_usuario_sistema ? t.ficha_usuario_sistema : 'Usuario de Sistema') + '</label>';
    html += '<input type="text" class="form-control-plaintext fw-bold h5 mb-0" value="' + (u.Usuario || '---') + '" readonly></div>';
    html += '<div class="col-12"><label class="text-muted small fw-bold text-uppercase">' + (t && t.ficha_tipo_usuario ? t.ficha_tipo_usuario : 'Tipo de usuario') + '</label>';
    html += '<div class="form-control-plaintext fw-bold border-0 px-0"><span class="badge bg-primary">' + (rolNombre || '—') + '</span></div></div>';
    html += '<div class="col-md-6"><label class="form-label text-muted small fw-bold uppercase">' + (t && t.ficha_apellido ? t.ficha_apellido : 'Apellido') + '</label><input type="text" name="ApellidoA" class="form-control form-control-sm fw-bold" value="' + (u.ApellidoA || '') + '"></div>';
    html += '<div class="col-md-6"><label class="form-label text-muted small fw-bold uppercase">' + (t && t.ficha_nombre ? t.ficha_nombre : 'Nombre') + '</label><input type="text" name="NombreA" class="form-control form-control-sm fw-bold" value="' + (u.NombreA || '') + '"></div>';
    html += '<div class="col-md-6"><label class="form-label text-muted small fw-bold uppercase">' + (t && t.ficha_correo ? t.ficha_correo : 'Correo') + '</label><input type="email" name="EmailA" class="form-control form-control-sm fw-bold text-primary" value="' + (u.Correo || '') + '"></div>';
    html += '<div class="col-md-6"><label class="form-label text-muted small fw-bold uppercase">' + (t && t.ficha_celular ? t.ficha_celular : 'Celular') + '</label><input type="text" name="CelularA" class="form-control form-control-sm fw-bold" value="' + (u.CelularA || '') + '"></div>';
    html += '<div class="col-12"><label class="form-label text-muted small fw-bold uppercase">' + (t && t.ficha_departamento ? t.ficha_departamento : 'Departamento / División') + '</label><select name="iddeptoA" class="form-select form-select-sm fw-bold"><option value="">' + (t && t.ficha_sin_departamento ? t.ficha_sin_departamento : '-- Sin Departamento Asignado --') + '</option>';
    for (var i = 0; i < departamentos.length; i++) {
        var d = departamentos[i];
        var isSelected = (u.iddeptoA == d.iddeptoA) ? ' selected' : '';
        var detallePart = d.DetalledeptoA ? (' (' + d.DetalledeptoA + ')') : '';
        html += '<option value="' + (d.iddeptoA || '') + '"' + isSelected + '>' + (d.NombreDeptoA || '') + detallePart + '</option>';
    }
    html += '</select></div>';
    var deptoSel = (departamentos || []).find(function(d) { return d.iddeptoA == u.iddeptoA; });
    var orgLabel = (t && t.ficha_organizacion ? t.ficha_organizacion : 'Organización');
    var orgVal = (deptoSel && deptoSel.NombreOrganismoSimple && String(deptoSel.NombreOrganismoSimple).trim()) ? deptoSel.NombreOrganismoSimple : (window.txt && window.txt.generales && window.txt.generales.sin_organizacion ? window.txt.generales.sin_organizacion : '– (sin organización)');
    html += '<div class="col-12"><label class="form-label text-muted small fw-bold uppercase">' + orgLabel + '</label><div class="form-control-plaintext fw-bold border-0 px-0">' + (orgVal || '') + '</div></div>';
    html += '<div class="mt-4 d-flex gap-2 flex-wrap">';
    html += '<button type="button" class="btn btn-success btn-sm fw-bold px-4 uppercase" onclick="saveUserData(' + (u.IdUsrA || '') + ')">' + (t && t.btn_guardar_cambios ? t.btn_guardar_cambios : 'Guardar Cambios') + '</button>';
    html += '<button type="button" class="btn btn-warning btn-sm fw-bold px-3 uppercase" onclick="resetPassword(' + (u.IdUsrA || '') + ')">' + (t && t.btn_resetear_clave ? t.btn_resetear_clave : 'Resetear Clave') + '</button>';
    if (t && t.reset_leyenda) html += '<span class="small text-muted align-middle ms-1" title="' + (t.reset_leyenda || '').replace(/"/g, '&quot;') + '"><i class="bi bi-info-circle"></i></span>';
    var tieneDatosEliminar = (protocolos ? protocolos.length : 0) + (formularios ? formularios.length : 0) + (alojamientos ? alojamientos.length : 0) > 0;
    if (puedeEliminar) {
    html += '<button type="button" class="btn btn-outline-dark btn-sm fw-bold px-3 uppercase" onclick="deleteUser(' + (u.IdUsrA || '') + ')" title="' + (t && t.eliminar_leyenda ? t.eliminar_leyenda.replace(/"/g, '&quot;') : 'Solo se puede eliminar si es investigador y no tiene formularios, protocolos ni alojamientos') + '"><i class="bi bi-person-x"></i> ' + (t && t.btn_eliminar ? t.btn_eliminar : 'Eliminar') + '</button>';
    }
    if (tieneDatosEliminar) {
    html += '<button type="button" class="btn btn-outline-danger btn-sm fw-bold px-3 uppercase" onclick="abrirModalEliminacionTotalAdmin(' + (u.IdUsrA || '') + ')" title="' + (t && t.eliminacion_total_leyenda ? t.eliminacion_total_leyenda.replace(/"/g, '&quot;') : 'Elimina el perfil y todo lo asociado; requiere contraseña y código') + '"><i class="bi bi-trash"></i> ' + (t && t.btn_eliminacion_total ? t.btn_eliminacion_total : 'Eliminación total') + '</button>';
    }
    html += '<button type="button" class="btn btn-outline-primary btn-sm fw-bold px-3 uppercase" onclick="openBillingForUser(' + (u.IdUsrA || '') + ')"' + (puedeFacturar ? '' : ' disabled title="Sin protocolos ni pedidos de insumos"') + '><i class="bi bi-receipt"></i> ' + (t && t.btn_ver_facturacion ? t.btn_ver_facturacion : 'Ver Facturación') + '</button></div>';
    html += (facturacionLegend || '') + (disableLegend || '') + '</form>';
    var leyendaAcciones = '';
    if (puedeEliminar) leyendaAcciones = (t && t.eliminar_leyenda ? t.eliminar_leyenda : 'Eliminar: solo si no tiene datos asociados.');
    else if (tieneDatosEliminar) leyendaAcciones = (t && t.eliminacion_total_leyenda ? t.eliminacion_total_leyenda : 'Eliminación total: borra perfil y todo lo asociado (protocolos, formularios, alojamientos).');
    else leyendaAcciones = (t && t.leyenda_acciones ? t.leyenda_acciones : '');
    html += '<div class="small text-muted mt-2 border-top pt-2">' + leyendaAcciones + '</div>';
    html += '<hr class="my-4 border-2 border-secondary"><div class="row g-3 mb-4">';
    html += '<div class="col-3"><div class="border rounded p-3 text-center bg-light h-100"><div class="text-secondary small fw-bold text-uppercase mb-1">' + (t && t.ficha_protocolos_cargo ? t.ficha_protocolos_cargo : 'Protocolos a su cargo') + '</div><div class="fs-3 fw-bold text-secondary">' + (protocolos ? protocolos.length : 0) + '</div><div class="small text-muted">' + (t && t.ficha_protocolos_total ? t.ficha_protocolos_total : 'total') + '</div></div></div>';
    var totalAnimales = 0;
    for (var j = 0; j < protocolsUsed.length; j++) totalAnimales += (parseInt(protocolsUsed[j].animales_usados, 10) || 0);
    html += '<div class="col-3"><div class="border rounded p-3 text-center bg-light h-100"><div class="text-primary small fw-bold text-uppercase mb-1">Animales utilizados en protocolos</div><div class="fs-3 fw-bold text-primary">' + totalAnimales + '</div><div class="small text-muted">total en formularios entregados</div></div></div>';
    html += '<div class="col-3"><div class="border rounded p-3 text-center bg-light h-100"><div class="text-success small fw-bold text-uppercase mb-1">Insumos pedidos</div><div class="fs-3 fw-bold text-success">' + insumosPedidos.length + '</div><div class="small text-muted">pedidos de insumos</div></div></div>';
    html += '<div class="col-3"><div class="border rounded p-3 text-center bg-light h-100"><div class="text-info small fw-bold text-uppercase mb-1">Insumos experimentales pedidos</div><div class="fs-3 fw-bold text-info">' + insumosExpPedidos.length + '</div><div class="small text-muted">pedidos de reactivos</div></div></div></div>';
    html += '<hr class="my-5"><div class="mt-5"><h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2"><i class="bi bi-file-earmark-medical me-2"></i>Protocolos a su cargo</h6>';
    html += '<div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;"><table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;"><thead class="table-light sticky-top"><tr><th class="px-3">ID Prot.</th><th class="px-3">N° Prot.</th><th>Título del Proyecto</th><th class="text-center">Vencimiento</th><th class="text-end pe-3">Abrir</th></tr></thead><tbody>';
    if (protocolos.length === 0) html += '<tr><td colspan="5" class="text-center py-4 text-muted italic">' + (t && t.empty_protocolos ? t.empty_protocolos : 'No tiene protocolos asignados actualmente.') + '</td></tr>';
    else for (var pi = 0; pi < protocolos.length; pi++) { var p = protocolos[pi]; var tituloEsc = escapeHtmlAttr(p.tituloA); html += '<tr><td class="px-3 fw-bold text-muted">' + (p.idprotA || '') + '</td><td class="px-3 fw-bold text-success">' + (p.nprotA || '') + '</td><td>' + (tituloEsc || '') + '</td><td class="text-center text-muted">' + (p.FechaFinProtA || 'N/A') + '</td><td class="text-end pe-3"><button type="button" class="btn btn-sm btn-outline-primary btn-protocol-from-card" data-idprot="' + (p.idprotA || '') + '" title="Abrir protocolo"><i class="bi bi-box-arrow-up-right"></i></button></td></tr>'; }
    html += '</tbody></table></div></div><div class="mt-4"><h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2"><i class="bi bi-clipboard-check me-2"></i>Historial de Formularios</h6>';
    html += '<div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;"><table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;"><thead class="table-light sticky-top"><tr><th class="px-3">Fecha</th><th class="px-3">ID Form.</th><th class="px-3">ID Prot.</th><th>Tipo de Trámite</th><th class="text-center">Estado</th><th class="text-end pe-3">Abrir</th></tr></thead><tbody>';
    if (formularios.length === 0) html += '<tr><td colspan="6" class="text-center py-4 text-muted italic">' + (t && t.empty_formularios ? t.empty_formularios : 'No registra pedidos de formularios.') + '</td></tr>';
    else for (var fi = 0; fi < formularios.length; fi++) { var f = formularios[fi]; var catAttr = escapeHtmlAttr(f.CategoriaFormulario); var tipoTramiteText = f.TipoTramiteNombre || ('Tipo ' + (f.tipoA || '')); html += '<tr><td class="px-3 text-muted">' + (f.fechainicioA || '') + '</td><td class="px-3 fw-bold text-muted">' + (f.idformA || '') + '</td><td class="px-3 fw-bold text-secondary">' + (f.idprotA || '---') + '</td><td class="fw-bold">' + tipoTramiteText + '<div class="small text-muted">' + (f.CategoriaFormulario || 'Sin categoría') + '</div></td><td class="text-center"><span class="badge rounded-pill bg-opacity-10 text-uppercase" style="background-color: #e8f5e9; color: #1a5d3b; font-size: 10px;">' + (f.estado || '') + '</span></td><td class="text-end pe-3"><button type="button" class="btn btn-sm btn-outline-primary btn-form-from-card" data-idform="' + (f.idformA || '') + '" data-categoria="' + catAttr + '" title="Abrir formulario"><i class="bi bi-box-arrow-up-right"></i></button></td></tr>'; }
    html += '</tbody></table></div></div><div class="mt-4"><h6 class="fw-bold text-uppercase text-success small mb-3 border-bottom pb-2"><i class="bi bi-houses me-2"></i>Historial de Alojamientos</h6>';
    html += '<div class="table-responsive border rounded bg-white shadow-sm" style="max-height: 250px;"><table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;"><thead class="table-light sticky-top"><tr><th class="px-3">Historia</th><th class="px-3">ID Aloj.</th><th class="px-3">ID Prot.</th><th>Especie</th><th>Período</th><th class="text-end pe-3">Abrir</th></tr></thead><tbody>';
    if (alojamientos.length === 0) html += '<tr><td colspan="6" class="text-center py-4 text-muted italic">' + (t && t.empty_alojamientos ? t.empty_alojamientos : 'No registra alojamientos.') + '</td></tr>';
    else for (var ai = 0; ai < alojamientos.length; ai++) { var a = alojamientos[ai]; var historiaAttr = escapeHtmlAttr(a.historia); html += '<tr><td class="px-3 fw-bold text-muted">#' + (a.historia || '---') + '</td><td class="px-3 text-muted">' + (a.IdAlojamiento || '---') + '</td><td class="px-3 fw-bold text-secondary">' + (a.idprotA || '---') + '</td><td class="fw-bold">' + (a.Especie || '---') + '</td><td class="small text-muted">' + (a.fechavisado || '---') + ' → ' + (a.hastafecha || '---') + '</td><td class="text-end pe-3"><button type="button" class="btn btn-sm btn-outline-primary btn-alojamiento-from-card" data-historia="' + historiaAttr + '" title="Abrir alojamiento"><i class="bi bi-box-arrow-up-right"></i></button></td></tr>'; }
    html += '</tbody></table></div></div><div class="mt-5 pt-3 border-top d-flex flex-wrap gap-2 justify-content-between"><div class="d-flex gap-2">';
    html += '<button type="button" class="btn btn-danger btn-sm fw-bold px-3 uppercase btn-download-pdf" data-idusr="' + (u.IdUsrA || '') + '" data-tipo="total"><i class="bi bi-file-pdf"></i> ' + (t && t.btn_pdf_total ? t.btn_pdf_total : 'PDF Total') + '</button>';
    html += '<button type="button" class="btn btn-outline-danger btn-sm fw-bold px-3 uppercase btn-download-pdf" data-idusr="' + (u.IdUsrA || '') + '" data-tipo="simple"><i class="bi bi-person-badge"></i> ' + (t && t.btn_solo_ficha ? t.btn_solo_ficha : 'Solo Ficha') + '</button></div>';
    html += '<button type="button" class="btn btn-light btn-sm fw-bold text-muted uppercase" data-bs-dismiss="modal">' + (t && t.btn_cerrar ? t.btn_cerrar : 'Cerrar') + '</button></div></div>';
    return html;
}

window.openUserModal = async (u) => {
    console.log('[usuarios] openUserModal inicio', u && u.IdUsrA);
    const instId = localStorage.getItem('instId');
    const instName = localStorage.getItem('NombreInst') || 'URBE - Gestión';
    const modalElement = document.getElementById('modal-user');
    const content = document.getElementById('modal-content');
    const t = window.txt && window.txt.admin_usuarios ? window.txt.admin_usuarios : {};
    content.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div><p class="mt-2 text-muted">' + (t.ficha_loading || 'Obteniendo historial completo...') + '</p></div>';
    console.log('[usuarios] loader mostrado');
    const myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
    myModal.show();
    console.log('[usuarios] peticiones API...');
    const [resProt, resForms, resDeptos, resAloj, resProtocolsUsed, resInsumosPedidos, resInsumosExpPedidos] = await Promise.all([
        API.request('/users/protocols?id=' + encodeURIComponent(u.IdUsrA) + '&inst=' + encodeURIComponent(instId)),
        API.request('/users/forms?id=' + encodeURIComponent(u.IdUsrA) + '&inst=' + encodeURIComponent(instId)),
        API.request('/deptos/list?inst=' + encodeURIComponent(instId)),
        API.request('/users/alojamientos?id=' + encodeURIComponent(u.IdUsrA) + '&inst=' + encodeURIComponent(instId)),
        API.request('/users/protocols-used-in-forms?id=' + encodeURIComponent(u.IdUsrA) + '&inst=' + encodeURIComponent(instId)),
        API.request('/users/insumos-pedidos?id=' + encodeURIComponent(u.IdUsrA) + '&inst=' + encodeURIComponent(instId)),
        API.request('/users/insumos-exp-pedidos?id=' + encodeURIComponent(u.IdUsrA) + '&inst=' + encodeURIComponent(instId))
    ]);
    console.log('[usuarios] API respondida');
    const protocolos = resProt.status === 'success' ? resProt.data : [];
    const formularios = resForms.status === 'success' ? resForms.data : [];
    const departamentos = resDeptos.status === 'success' ? resDeptos.data : [];
    const alojamientos = resAloj.status === 'success' ? resAloj.data : [];
    const protocolsUsed = resProtocolsUsed.status === 'success' ? (resProtocolsUsed.data || []) : [];
    const insumosPedidos = resInsumosPedidos.status === 'success' ? (resInsumosPedidos.data || []) : [];
    const insumosExpPedidos = resInsumosExpPedidos.status === 'success' ? (resInsumosExpPedidos.data || []) : [];
    const tienePedidosInsumos = formularios.some(function(f) { return (String(f.CategoriaFormulario || '').toLowerCase()).includes('insumo'); });
    const puedeFacturar = protocolos.length > 0 || tienePedidosInsumos;
    const puedeEliminar = formularios.length === 0 && protocolos.length === 0 && alojamientos.length === 0 && (u.IdTipousrA == 3 || u.IdTipousrA === '3');
    const isDisabled = String(u.ActivoA) === '0';
    const disableLegend = isDisabled ? '<div class="small text-danger mt-2"><i class="bi bi-info-circle me-1"></i>Usuario deshabilitado. Motivo: baja administrativa o deshabilitación previa.</div>' : '';
    const facturacionLegend = !puedeFacturar ? '<div class="small text-warning mt-2"><i class="bi bi-receipt me-1"></i>Ver facturación solo disponible si tiene protocolos a cargo o pedidos de formularios de insumos.</div>' : '';
    const eliminarLegend = '';
    var rolesMap = (window.txt && window.txt.config_roles) ? { 1: window.txt.config_roles.rol_superadmin_sistema, 2: window.txt.config_roles.rol_superadmin, 3: window.txt.config_roles.rol_investigador, 4: window.txt.config_roles.rol_administrador, 5: window.txt.config_roles.rol_tecnico, 6: window.txt.config_roles.rol_laboratorio } : {};
    var idTipo = u.IdTipousrA != null ? u.IdTipousrA : u.IdTipoUsrA;
    var rolNombre = (rolesMap[idTipo] || rolesMap[Number(idTipo)] || '').trim() || (idTipo != null && idTipo !== '' ? 'Rol ' + idTipo : '—');
    console.log('[usuarios] buildModalHtml...');
    content.innerHTML = buildModalHtml({
        u: u,
        t: t,
        instName: instName,
        protocolos: protocolos,
        formularios: formularios,
        alojamientos: alojamientos,
        departamentos: departamentos,
        protocolsUsed: protocolsUsed,
        insumosPedidos: insumosPedidos,
        insumosExpPedidos: insumosExpPedidos,
        disableLegend: disableLegend,
        facturacionLegend: facturacionLegend,
        eliminarLegend: eliminarLegend,
        puedeEliminar: puedeEliminar,
        puedeFacturar: puedeFacturar,
        rolNombre: rolNombre
    });
    console.log('[usuarios] modal HTML asignado');
    window._lastUserFichaData = { u: u, protocolos: protocolos, formularios: formularios, alojamientos: alojamientos, protocolsUsed: protocolsUsed, insumosPedidos: insumosPedidos, insumosExpPedidos: insumosExpPedidos, departamentos: departamentos, instName: instName };
}
// --- ACCIONES ---

window.saveUserData = async (id) => {
    const form = document.getElementById('form-usuario-detalle');
    const formData = new FormData(form);

    // Enviamos: 1. Endpoint, 2. Método, 3. Datos
    const res = await API.request(`/users/update?id=${id}`, 'POST', formData);
    
    if (res.status === 'success') {
        alert(window.txt?.admin_usuarios?.saved_ok || "¡Datos actualizados con éxito!");
        // Refrescamos la tabla para que se vean los cambios
        initUsuariosPage(); 
        
        // Cerramos el modal usando Bootstrap
        const modalEl = document.getElementById('modal-user');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    } else {
        alert((window.txt?.admin_usuarios?.error_msg || "Hubo un error:") + " " + res.message);
    }
};

window.resetPassword = async (id) => {
    const t = window.txt?.admin_usuarios;
    if (!confirm(t?.reset_confirm || "¿Estás seguro de resetear la clave a '12345678'?")) return;
    
    // Petición POST sin cuerpo de datos
    const res = await API.request(`/users/reset-pass?id=${id}`, 'POST');
    
    if (res.status === 'success') {
        alert(t?.reset_ok || "Contraseña reseteada correctamente.");
    } else {
        alert((t?.reset_error || "Error:") + " " + res.message);
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
        title: (window.txt?.admin_usuarios?.delete_title || 'Eliminar usuario'),
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
        inputPlaceholder: (window.txt?.admin_usuarios?.delete_placeholder || 'Tu contraseña para confirmar'),
        inputAttributes: { id: 'swal-delete-password', autocomplete: 'current-password' },
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: (window.txt?.admin_usuarios?.delete_confirm || 'Eliminar'),
        cancelButtonText: (window.txt?.admin_usuarios?.delete_cancel || 'Cancelar'),
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

let adminDeletePreviewUserId = null;
let adminDeletePreviewData = null;

window.abrirModalEliminacionTotalAdmin = async function(id) {
    if (!id) return;
    const t = window.txt?.admin_usuarios || {};
    try {
        const res = await API.request('/users/delete-preview?id=' + encodeURIComponent(id));
        if (res.status !== 'success' || !res.data) {
            (window.mostrarNotificacion || alert)(res.message || (t.delete_error || 'Error'));
            return;
        }
        adminDeletePreviewUserId = id;
        adminDeletePreviewData = res.data;
        const listEl = document.getElementById('admin-delete-preview-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        const items = [
            [t.delete_modal_usuario || 'Usuario', res.data.usuario + ' (' + (res.data.nombre || res.data.usuario) + ')'],
            [t.delete_modal_institucion || 'Institución', res.data.institucion],
            [t.delete_modal_protocolos || 'Protocolos', res.data.protocolos],
            [t.delete_modal_formularios || 'Formularios', res.data.formularios],
            [t.delete_modal_alojamientos || 'Alojamientos', res.data.alojamientos]
        ];
        items.forEach(function(item) {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between small';
            li.innerHTML = '<span class="text-muted">' + item[0] + '</span><span class="fw-bold">' + item[1] + '</span>';
            listEl.appendChild(li);
        });
        const pl = res.data.protocolos_list || [];
        const fl = res.data.formularios_list || [];
        const al = res.data.alojamientos_list || [];
        if (pl.length > 0) {
            const sec = document.createElement('li');
            sec.className = 'list-group-item small fw-bold text-danger bg-light';
            sec.textContent = t.delete_modal_list_protocolos || 'Protocolos que se eliminarán:';
            listEl.appendChild(sec);
            pl.forEach(function(p) {
                const li = document.createElement('li');
                li.className = 'list-group-item small ps-4';
                li.textContent = (p.nprotA || '') + ' — ' + (p.tituloA || '');
                listEl.appendChild(li);
            });
        }
        if (fl.length > 0) {
            const sec = document.createElement('li');
            sec.className = 'list-group-item small fw-bold text-danger bg-light';
            sec.textContent = t.delete_modal_list_formularios || 'Formularios que se eliminarán:';
            listEl.appendChild(sec);
            fl.forEach(function(f) {
                const li = document.createElement('li');
                li.className = 'list-group-item small ps-4';
                li.textContent = '#' + (f.idformA || '') + ' ' + (f.tipo_nombre || f.tipoA || '') + (f.categoria ? ' (' + f.categoria + ')' : '') + (f.nprot ? ' — Protocolo ' + f.nprot : '');
                listEl.appendChild(li);
            });
        }
        if (al.length > 0) {
            const sec = document.createElement('li');
            sec.className = 'list-group-item small fw-bold text-danger bg-light';
            sec.textContent = t.delete_modal_list_alojamientos || 'Alojamientos que se eliminarán:';
            listEl.appendChild(sec);
            al.slice(0, 100).forEach(function(a) {
                const li = document.createElement('li');
                li.className = 'list-group-item small ps-4';
                li.textContent = 'Historia ' + (a.historia || '') + (a.idprotA ? ' (Protocolo ' + a.idprotA + ')' : '');
                listEl.appendChild(li);
            });
            if (al.length > 100) {
                const more = document.createElement('li');
                more.className = 'list-group-item small ps-4 text-muted';
                more.textContent = '... y ' + (al.length - 100) + ' más.';
                listEl.appendChild(more);
            }
        }
        document.getElementById('admin-delete-password').value = '';
        document.getElementById('admin-delete-code').value = '';
        const codeSentEl = document.getElementById('admin-delete-code-sent');
        if (codeSentEl) {
            if (res.data.code_sent) {
                codeSentEl.textContent = t.delete_code_sent || 'Código enviado a tu correo.';
                codeSentEl.classList.remove('d-none');
            } else {
                codeSentEl.classList.add('d-none');
            }
        }
        const modalUserEl = document.getElementById('modal-user');
        if (modalUserEl && bootstrap.Modal.getInstance(modalUserEl)) bootstrap.Modal.getInstance(modalUserEl).hide();
        const modalDelEl = document.getElementById('modal-delete-full');
        if (modalDelEl) bootstrap.Modal.getOrCreateInstance(modalDelEl).show();
    } catch (e) {
        (window.mostrarNotificacion || alert)(t.delete_error || 'Error');
        console.error(e);
    }
};

window.confirmarEliminacionTotalAdmin = async function() {
    if (!adminDeletePreviewUserId || !adminDeletePreviewData) return;
    const t = window.txt?.admin_usuarios || {};
    const password = document.getElementById('admin-delete-password');
    const codeEl = document.getElementById('admin-delete-code');
    const passwordVal = password ? password.value.trim() : '';
    const codeVal = codeEl ? codeEl.value.trim() : '';
    if (!passwordVal || !codeVal) {
        (window.mostrarNotificacion || alert)(t.delete_modal_password ? 'Ingresa contraseña y código.' : 'Ingresa contraseña y código.');
        return;
    }
    const btn = document.getElementById('btn-admin-confirm-delete-full');
    if (btn) btn.disabled = true;
    try {
        const res = await API.request('/users/delete-full', 'POST', {
            id: parseInt(adminDeletePreviewUserId, 10),
            password: passwordVal,
            code: codeVal
        });
        if (res.status === 'success') {
            const modalDelEl = document.getElementById('modal-delete-full');
            if (modalDelEl && bootstrap.Modal.getInstance(modalDelEl)) bootstrap.Modal.getInstance(modalDelEl).hide();
            adminDeletePreviewUserId = null;
            adminDeletePreviewData = null;
            await initUsuariosPage();
            (window.mostrarNotificacion || alert)(t.delete_success || res.message);
        } else {
            (window.mostrarNotificacion || alert)(res.message || (t.delete_error || 'Error'));
        }
    } catch (e) {
        (window.mostrarNotificacion || alert)(e?.message || (t.delete_error || 'Error'));
        console.error(e);
    } finally {
        if (btn) btn.disabled = false;
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
    const orgText = (deptoNombre && deptoNombre.NombreOrganismoSimple && String(deptoNombre.NombreOrganismoSimple).trim()) ? deptoNombre.NombreOrganismoSimple : (window.txt?.generales?.sin_organizacion || '– (sin organización)');
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
                <tr><td style="padding: 6px 0; color: #666;">Organización</td><td style="padding: 6px 0;">${esc(orgText)}</td></tr>
            </table>
        </div>
    </div>`;
}

function buildFichaTotalHTML(data) {
    const { u, protocolos, formularios, alojamientos, protocolsUsed, insumosPedidos, insumosExpPedidos, departamentos, instName } = data;
    const deptoNombre = (departamentos || []).find(d => d.iddeptoA == u.iddeptoA);
    const deptoText = deptoNombre ? (deptoNombre.NombreDeptoA + (deptoNombre.DetalledeptoA ? ' (' + deptoNombre.DetalledeptoA + ')' : '')) : '—';
    const orgText = (deptoNombre && deptoNombre.NombreOrganismoSimple && String(deptoNombre.NombreOrganismoSimple).trim()) ? deptoNombre.NombreOrganismoSimple : (window.txt?.generales?.sin_organizacion || '– (sin organización)');
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
                <tr><td style="padding: 4px 0; color: #666;">Organización</td><td style="padding: 4px 0;">${esc(orgText)}</td></tr>
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
    const logoHeader = getPdfLogoHeaderFromStorage();
    const wrapper = document.createElement('div');
    wrapper.setAttribute('id', 'pdf-export-container');
    wrapper.style.cssText = 'position:fixed;top:0;left:0;width:794px;min-height:1122px;background:#fff;z-index:99999;padding:20px;box-sizing:border-box;overflow:auto;visibility:visible;opacity:1;';
    wrapper.innerHTML = (logoHeader ? logoHeader + htmlString : htmlString);
    document.body.appendChild(wrapper);
    const contentEl = wrapper.firstElementChild;
    if (contentEl) {
        contentEl.setAttribute('style', (contentEl.getAttribute('style') || '') + ';width:754px;min-height:1080px;');
    }
    await new Promise(r => setTimeout(r, 300));

    const fileName = mode === 'simple' ? `Ficha_Datos_Personales_${id}.pdf` : `Ficha_Completa_${id}.pdf`;
    const PDF_MARGIN_MM = 18;
    const opt = {
        margin: [PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_MARGIN_MM, PDF_MARGIN_MM],
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