import { API } from '../../api.js';
import { showLoader, hideLoader } from '../../components/LoaderComponent.js';
import { setTbodyLoadingSpinner, setTbodyMessageRow } from '../../utils/tableInlineLoading.js';

let modalInst;
/** Filas de la página actual (API paginada). */
let pageRows = [];
let totalInst = 0;
let currentPage = 1;
const rowsPerPage = 15;
let currentSearch = '';
let searchDebounceTimer = null;
let catalogoModulos = [];

// Exportamos la función principal para que el HTML la llame de forma controlada
export async function initSuperInstituciones() {
    modalInst = new bootstrap.Modal(document.getElementById('modalInst'));
    
    // Conectamos botones globales a window (necesario para onclicks en HTML)
    window.abrirModalCrear = abrirModalCrear;
    window.abrirModalEditar = abrirModalEditar;
    window.guardarCambios = guardarCambios;

    setupGrupoClearButton();
    setupDependenciaEnRedSync();
    showLoader();
    try {
        await cargarCatalogoModulos();
        await cargarInstituciones({ mode: 'initial' });
    } finally {
        hideLoader();
    }
    setupBusqueda();
}

async function cargarCatalogoModulos() {
    try {
        const res = await API.request('/superadmin/modulos/catalogo');
        if (res.status === 'success') {
            catalogoModulos = res.data;
        }
    } catch (e) { console.error("Error al cargar módulos maestros:", e); }
}

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function cargarInstituciones({ mode = 'initial' } = {}) {
    const tbody = document.getElementById('tabla-sedes');
    const t = window.txt?.superadmin_instituciones || {};
    if (mode === 'inline' && tbody) {
        setTbodyLoadingSpinner(tbody, {
            colspan: 10,
            spinnerTone: 'primary',
            message: t.tabla_cargando || window.txt?.generales?.msg_cargando || '…',
        });
    }
    try {
        const limit = rowsPerPage;
        const offset = (currentPage - 1) * rowsPerPage;
        const q = encodeURIComponent(currentSearch);
        const res = await API.request(`/superadmin/instituciones?limit=${limit}&offset=${offset}&q=${q}`);
        if (res.status === 'success') {
            pageRows = Array.isArray(res.data) ? res.data : [];
            totalInst = typeof res.total === 'number' ? res.total : pageRows.length;
            const totalPages = Math.max(1, Math.ceil(totalInst / rowsPerPage));
            if (totalInst > 0 && currentPage > totalPages) {
                currentPage = totalPages;
                await cargarInstituciones({ mode: 'inline' });
                return;
            }
            renderizarTabla(pageRows);
            updateInstTableInfo();
            renderInstPagination();
        } else if (tbody) {
            pageRows = [];
            totalInst = 0;
            renderizarTabla([]);
            updateInstTableInfo();
            renderInstPagination();
        }
    } catch (err) {
        console.error('Error al recuperar sedes:', err);
        pageRows = [];
        totalInst = 0;
        renderizarTabla([]);
        updateInstTableInfo();
        renderInstPagination();
    }
}

function updateInstTableInfo() {
    const el = document.getElementById('inst-table-info');
    const tx = window.txt?.superadmin_instituciones || {};
    if (!el) return;
    if (totalInst === 0 || pageRows.length === 0) {
        el.textContent = '';
        return;
    }
    const start = (currentPage - 1) * rowsPerPage;
    const tpl = tx.table_info || '';
    el.textContent = tpl
        .replace('{a}', String(start + 1))
        .replace('{b}', String(Math.min(start + pageRows.length, totalInst)))
        .replace('{total}', String(totalInst));
}

function renderInstPagination() {
    const ul = document.getElementById('pagination-inst');
    if (!ul) return;
    ul.innerHTML = '';
    const totalPages = Math.ceil(totalInst / rowsPerPage);
    if (totalPages <= 1) return;

    const tx = window.txt?.superadmin_instituciones || {};
    const pagPrev = tx.pag_anterior || 'Anterior';
    const pagNext = tx.pag_siguiente || 'Siguiente';

    const addBtn = (label, page, disabled, active = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link shadow-none';
        a.href = '#';
        a.textContent = label;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!disabled) {
                currentPage = page;
                cargarInstituciones({ mode: 'inline' });
            }
        });
        li.appendChild(a);
        ul.appendChild(li);
    };

    addBtn(pagPrev, currentPage - 1, currentPage === 1);
    addBtn('1', 1, false, currentPage === 1);

    let start = Math.max(2, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2) {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = '<span class="page-link border-0">…</span>';
        ul.appendChild(li);
    }
    for (let i = start; i <= end; i++) addBtn(String(i), i, false, i === currentPage);
    if (end < totalPages - 1) {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = '<span class="page-link border-0">…</span>';
        ul.appendChild(li);
    }

    if (totalPages > 1) addBtn(String(totalPages), totalPages, false, currentPage === totalPages);
    addBtn(pagNext, currentPage + 1, currentPage === totalPages);
}

function renderizarTabla(data) {
    const tbody = document.getElementById('tabla-sedes');
    if (!tbody) return;
    const tx = window.txt?.superadmin_instituciones || {};
    const tEmpty = tx.tabla_sin_filas || '';
    const tFilter = tx.sin_resultados_filtro || tEmpty;
    if (data.length === 0) {
        const hasSearch = String(currentSearch || '').trim() !== '';
        const msg = hasSearch ? tFilter : tEmpty;
        setTbodyMessageRow(tbody, { colspan: 10, variant: 'muted', message: msg || '—' });
        return;
    }

    tbody.innerHTML = data.map(inst => {
        const estadoBadge = inst.Activo == 1 
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2">ACTIVA</span>' 
            : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2">INACTIVA</span>';

        // LÓGICA DE DIBUJADO DE MÓDULOS EN LA TABLA
        const depTxt = (inst.DependenciaInstitucion != null ? String(inst.DependenciaInstitucion) : '').trim();
        const mgRaw = inst.MadreGrupo ?? inst.madre_grupo ?? inst.Madre ?? inst.MADREGRUPO;
        const esMadre = mgRaw == 1 || mgRaw === '1' || mgRaw === true;
        const grupoCell = depTxt
            ? `<span class="badge bg-light text-dark border small">${escHtml(depTxt)}</span>`
            : '<span class="text-muted small">—</span>';
        const madreCell = esMadre
            ? '<span class="badge bg-primary-subtle text-primary border border-primary-subtle small">1</span>'
            : '<span class="text-muted small">0</span>';

        let modulosHtml = '';
        if (inst.modulos && inst.modulos.length > 0) {
            const modulosArr = inst.modulos.map(m => {
                const nombreCorto = m.NombreModulo.substring(0, 3).toUpperCase();
                
                if (m.estado_logico === 1) return `<span class="text-muted opacity-25 text-decoration-line-through" title="${m.NombreModulo} (Off)">${nombreCorto}</span>`;
                if (m.estado_logico === 2) return `<span class="text-warning fw-bold" title="${m.NombreModulo} (Solo Admin)">${nombreCorto}*</span>`;
                if (m.estado_logico === 3) return `<span class="text-success fw-bold" title="${m.NombreModulo} (Full)">${nombreCorto}</span>`;
            });
            modulosHtml = `<div class="d-flex flex-wrap gap-2 justify-content-center small bg-light rounded py-1 px-2 border">${modulosArr.join('')}</div>`;
        } else {
            modulosHtml = `<span class="text-muted small italic">Sin módulos asignados</span>`;
        }

        return `
            <tr onclick="abrirModalEditar(${inst.IdInstitucion})" class="cursor-pointer hover:bg-blue-50 transition-all border-b leading-tight">
                <td class="px-4 fw-bold text-primary small">#${inst.IdInstitucion}</td>
                <td>
                    <div class="fw-bold text-dark">${inst.NombreInst}</div>
                    <div class="text-muted smaller uppercase" style="font-size: 0.75rem;">${inst.NombreCompletoInst || ''}</div>
                </td>
                <td class="small">
                    <div class="text-dark"><i class="bi bi-envelope me-1 text-muted"></i>${inst.InstCorreo || '---'}</div>
                </td>
                <td>
                    <span class="d-block small fw-bold text-dark">${inst.Pais}</span>
                    <span class="text-muted smaller">${inst.Localidad || '---'}</span>
                </td>
                <td>
                    <div class="small fw-bold text-dark">Ciclo: ${inst.TipoFacturacion || 1}m</div>
                </td>
                <td class="text-center align-middle">${modulosHtml}</td>
                <td class="text-center small">${grupoCell}</td>
                <td class="text-center small">${madreCell}</td>
                <td class="small text-center">
                    <div class="${inst.UltimoPago ? 'text-success' : 'text-danger'} fw-bold">
                        ${inst.UltimoPago || 'PENDIENTE'}
                    </div>
                </td>
                <td class="text-center">${estadoBadge}</td>
            </tr>
        `;
    }).join('');
}

function setupBusqueda() {
    const input = document.getElementById('busqueda');
    if (!input) return;
    input.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentSearch = (input.value || '').trim();
            currentPage = 1;
            cargarInstituciones({ mode: 'inline' });
        }, 400);
    });
}

/** El switch refleja si hay texto de grupo; al escribir/borrar en dependencia se actualiza solo. */
function syncEnRedCheckboxFromDep() {
    const dep = document.getElementById('DependenciaInstitucion');
    const enRed = document.getElementById('en_red_check');
    if (!enRed || !dep) return;
    enRed.checked = !!String(dep.value || '').trim();
}

function setupDependenciaEnRedSync() {
    const dep = document.getElementById('DependenciaInstitucion');
    const enRed = document.getElementById('en_red_check');
    if (dep) {
        dep.addEventListener('input', syncEnRedCheckboxFromDep);
        dep.addEventListener('blur', syncEnRedCheckboxFromDep);
    }
    if (enRed) {
        enRed.addEventListener('change', () => {
            if (!enRed.checked) {
                if (dep) dep.value = '';
                return;
            }
            if (dep && !String(dep.value || '').trim()) {
                dep.focus();
            }
        });
    }
}

function setupGrupoClearButton() {
    const btn = document.getElementById('btn_vaciar_grupo');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const dep = document.getElementById('DependenciaInstitucion');
        if (dep) dep.value = '';
        syncEnRedCheckboxFromDep();
    });
}

// INYECTA LOS SELECTS DINÁMICOS BASADOS EN catalogoModulos
function dibujarSelectsModulos(valoresPrevios = []) {
    const contenedor = document.getElementById('contenedor-modulos');
    contenedor.innerHTML = '';

    catalogoModulos.forEach(mod => {
        const prev = valoresPrevios.find(v => v.IdModulosApp == mod.IdModulosApp);
        let valorSeleccionado = prev ? prev.estado_logico : 1; 

        const html = `
            <div class="col-md-3 col-6">
                <label class="form-label small fw-bold text-secondary">${mod.NombreModulo}</label>
                <select class="form-select form-select-sm module-selector" data-idmod="${mod.IdModulosApp}">
                    <option value="1" ${valorSeleccionado == 1 ? 'selected' : ''}>Desactivado</option>
                    <option value="2" ${valorSeleccionado == 2 ? 'selected' : ''}>Solo Admin</option>
                    <option value="3" ${valorSeleccionado == 3 ? 'selected' : ''}>Admin y Usuarios</option>
                </select>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', html);
    });
}

function abrirModalCrear() {
    const tx = window.txt?.superadmin_instituciones || {};
    document.getElementById('form-inst').reset();
    document.getElementById('IdInstitucion').value = "";
    const ml = document.getElementById('modalLabel');
    if (ml) ml.textContent = tx.modal_nueva || 'Nueva institución';
    
    document.getElementById('Pais').value = 'Uruguay';
    document.getElementById('Moneda').value = 'UYU';
    
    const madreGrupo = document.getElementById('madre_grupo');
    if (madreGrupo) madreGrupo.checked = false;
    syncEnRedCheckboxFromDep();

    dibujarSelectsModulos([]); 
    modalInst.show();
}

async function abrirModalEditar(id) {
    const tx = window.txt?.superadmin_instituciones || {};
    let inst = pageRows.find((i) => i.IdInstitucion == id);
    if (!inst) {
        showLoader();
        try {
            const res = await API.request(`/superadmin/instituciones/${encodeURIComponent(id)}`);
            if (res.status === 'success' && res.data && typeof res.data === 'object') {
                inst = res.data;
            }
        } catch (e) {
            console.error('Error al cargar sede:', e);
        } finally {
            hideLoader();
        }
        if (!inst) {
            alert(tx.error_cargar_sede || 'No se pudo cargar la sede.');
            return;
        }
    }

    const modalTituloTpl = tx.modal_editando || 'Editando: {nombre}';
    const ml = document.getElementById('modalLabel');
    if (ml) ml.textContent = modalTituloTpl.replace('{nombre}', String(inst.NombreInst ?? ''));
    document.getElementById('IdInstitucion').value = inst.IdInstitucion;
    
    document.getElementById('NombreInst').value = inst.NombreInst;
    document.getElementById('NombreCompletoInst').value = inst.NombreCompletoInst || '';
    document.getElementById('DependenciaInstitucion').value = inst.DependenciaInstitucion || '';
    document.getElementById('InstCorreo').value = inst.InstCorreo || '';
    document.getElementById('Pais').value = inst.Pais || 'Uruguay';
    document.getElementById('Localidad').value = inst.Localidad || '';
    document.getElementById('Moneda').value = inst.Moneda || 'UYU';
    document.getElementById('Web').value = inst.Web || '';
    document.getElementById('Logo').value = inst.Logo || '';
    document.getElementById('TipoApp').value = inst.TipoApp || 1;
    document.getElementById('Activo').value = inst.Activo;
    document.getElementById('UltimoPago').value = inst.UltimoPago || '';
    document.getElementById('TipoFacturacion').value = inst.TipoFacturacion || 1;
    document.getElementById('FechaContrato').value = inst.FechaContrato || '';
    document.getElementById('Detalle').value = inst.Detalle || '';

    const madreGrupo = document.getElementById('madre_grupo');
    const mg = inst.MadreGrupo ?? inst.madre_grupo ?? inst.Madre ?? inst.MADREGRUPO;
    if (madreGrupo) madreGrupo.checked = (mg == 1 || mg === '1' || mg === true);
    syncEnRedCheckboxFromDep();

    dibujarSelectsModulos(inst.modulos || []);

    modalInst.show();
}

async function guardarCambios() {
    const id = document.getElementById('IdInstitucion').value;
    
    const data = {
        NombreInst: document.getElementById('NombreInst').value,
        NombreCompletoInst: document.getElementById('NombreCompletoInst').value,
        DependenciaInstitucion: document.getElementById('DependenciaInstitucion').value,
        InstCorreo: document.getElementById('InstCorreo').value,
        Pais: document.getElementById('Pais').value,
        Localidad: document.getElementById('Localidad').value,
        Moneda: document.getElementById('Moneda').value,
        Web: document.getElementById('Web').value,
        Logo: document.getElementById('Logo').value || '',
        otrosceuas: 2,
        TipoApp: document.getElementById('TipoApp').value,
        Activo: document.getElementById('Activo').value,
        UltimoPago: document.getElementById('UltimoPago').value || null,
        TipoFacturacion: document.getElementById('TipoFacturacion').value,
        FechaContrato: document.getElementById('FechaContrato').value || null,
        Detalle: document.getElementById('Detalle').value,
        madre_grupo: document.getElementById('madre_grupo') && document.getElementById('madre_grupo').checked ? 1 : 0,
        modulos: [] 
    };

    document.querySelectorAll('.module-selector').forEach(select => {
        data.modulos.push({
            IdModulosApp: parseInt(select.getAttribute('data-idmod')),
            estado_logico: parseInt(select.value)
        });
    });

    const endpoint = id ? '/superadmin/instituciones/update' : '/superadmin/instituciones/create';
    if (id) data.IdInstitucion = id;

    try {
        const res = await API.request(endpoint, 'POST', data);
        
        const txi = window.txt?.superadmin_instituciones || {};
        if (res.status === 'success') {
            modalInst.hide();
            await cargarInstituciones({ mode: 'inline' });
            mostrarNotificacion(id ? (txi.toast_ok || '') : (txi.toast_creada || ''));
        } else {
            alert((txi.error_servidor_prefix || 'Error del servidor: ') + (res.message || ''));
        }
    } catch (err) {
        console.error("Detalle del fallo:", err);
        const txi = window.txt?.superadmin_instituciones || {};
        alert(txi.error_comunicacion || 'Fallo de comunicación con la API.');
    }
}

function mostrarNotificacion(mensaje) {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-msg');
    if (toastEl && msgEl) {
        msgEl.innerText = mensaje;
        new bootstrap.Toast(toastEl).show();
    }
}