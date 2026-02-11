import { API } from '../../../api.js';

let allTypes = [];

// Definimos las categorías exactas como constantes
const CAT_ANIMAL_LABEL = 'Animal vivo';
const CAT_REACTIVOS_LABEL = 'Otros reactivos biologicos';
const CAT_INSUMOS_LABEL = 'Insumos';

export async function initConfigFormTypes() {
    loadData();
    setupTabEvents(); // <--- NUEVA FUNCIÓN PARA ARREGLAR LO VISUAL
    document.getElementById('form-type-config').onsubmit = saveFormType;
}

/**
 * Lógica visual para que las pestañas se iluminen correctamente al cambiar
 */
function setupTabEvents() {
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            // 1. Apagamos visualmente TODAS las pestañas
            tabs.forEach(t => {
                t.classList.remove('fw-bold', 'text-dark'); // Quitamos estilo activo
                t.classList.add('bg-white', 'text-muted'); // Ponemos estilo inactivo
            });

            // 2. Encendemos SOLO la que se activó
            const activeTab = event.target;
            activeTab.classList.remove('bg-white', 'text-muted'); // Quitamos estilo inactivo
            activeTab.classList.add('fw-bold', 'text-dark'); // Ponemos estilo activo
        });
    });
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/form-types/all?inst=${instId}`);
        if (res.status === 'success') {
            allTypes = res.data;
            renderTables();
        }
    } catch (e) { console.error(e); }
}

function renderTables() {
    // Limpiamos tablas
    document.getElementById('table-animal').innerHTML = '';
    document.getElementById('table-reactivos').innerHTML = '';
    document.getElementById('table-insumos').innerHTML = '';

    if (!allTypes || allTypes.length === 0) return;

    // Encabezado
    const headerHtml = `
        <thead class="bg-light text-secondary text-uppercase small">
            <tr>
                <th class="ps-4">Nombre Tipo</th>
                <th class="text-center">Descuento</th>
                <th class="text-center">Cobro</th>
                <th class="text-end pe-4">Acciones</th>
            </tr>
        </thead>
        <tbody>`;

    // Contenedores
    let htmlAnimal = headerHtml;
    let htmlReactivos = headerHtml;
    let htmlInsumos = headerHtml;

    allTypes.forEach(t => {
        // Normalizamos para comparar (quita espacios extra y minúsculas)
        const catBD = (t.categoriaformulario || '').toLowerCase().trim();
        
        // Detectamos dónde va cada fila
        const isAnimal = catBD.includes('animal'); 
        const isReactivo = catBD.includes('reactivo') || catBD.includes('biologico'); 
        const isInsumo = catBD.includes('insumo');

        const isExempt = t.exento == 1;
        
        const row = `
            <tr>
                <td class="ps-4 fw-bold text-dark">${t.nombreTipo}</td>
                <td class="text-center">
                    ${t.descuento > 0 ? `<span class="badge bg-success">-${t.descuento}% OFF</span>` : '<span class="text-muted small">-</span>'}
                </td>
                <td class="text-center">
                    ${isExempt 
                        ? '<span class="badge bg-info text-dark"><i class="bi bi-gift-fill me-1"></i> EXENTO</span>' 
                        : '<span class="badge bg-light text-secondary border">NORMAL</span>'}
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalFormType(${t.IdTipoFormulario})">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteFormType(${t.IdTipoFormulario})">
                        <i class="bi bi-trash-fill text-danger"></i>
                    </button>
                </td>
            </tr>
        `;

        if (isAnimal) htmlAnimal += row;
        else if (isReactivo) htmlReactivos += row;
        else if (isInsumo) htmlInsumos += row;
    });

    injectHtml('table-animal', htmlAnimal);
    injectHtml('table-reactivos', htmlReactivos);
    injectHtml('table-insumos', htmlInsumos);
}

function injectHtml(tableId, htmlContent) {
    const el = document.getElementById(tableId);
    // Si solo tiene el header (solo 1 <tr>), mostramos "Sin datos"
    if ((htmlContent.match(/<tr>/g) || []).length === 1) { 
        el.innerHTML = `
            ${htmlContent.replace('<tbody>', '')} 
            <tbody><tr><td colspan="4" class="text-center py-4 text-muted fst-italic">No hay tipos configurados en esta categoría.</td></tr></tbody>
        `;
    } else {
        el.innerHTML = htmlContent + '</tbody>';
    }
}

window.openModalFormType = (id = null) => {
    const form = document.getElementById('form-type-config');
    form.reset();
    document.getElementById('type-id').value = "";
    const select = document.getElementById('type-cat');
    
    // CASO 1: EDITAR (Carga datos existentes)
    if (id) {
        const t = allTypes.find(x => x.IdTipoFormulario == id);
        if (t) {
            document.getElementById('type-id').value = t.IdTipoFormulario;
            document.getElementById('type-name').value = t.nombreTipo;
            select.value = t.categoriaformulario; // Debe coincidir exacto
            document.getElementById('type-discount').value = t.descuento;
            document.getElementById('type-exempt').checked = (t.exento == 1);
        }
    } 
    // CASO 2: NUEVO (Detecta pestaña activa para pre-seleccionar)
    else {
        // Buscamos cuál panel está activo visualmente
        const activePane = document.querySelector('.tab-pane.active'); // Bootstrap pone .active al panel visible
        
        if(activePane) {
            if(activePane.id === 'pane-animal') select.value = CAT_ANIMAL_LABEL;
            else if(activePane.id === 'pane-reactivos') select.value = CAT_REACTIVOS_LABEL;
            else if(activePane.id === 'pane-insumos') select.value = CAT_INSUMOS_LABEL;
        }
    }

    new bootstrap.Modal(document.getElementById('modal-form-type')).show();
};

async function saveFormType(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    
    try {
        const res = await API.request('/admin/config/form-types/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-form-type')).hide();
            loadData();
        }
    } catch (err) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
}

window.deleteFormType = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar Tipo?',
        text: "Si ya se ha usado en algún pedido, la operación será rechazada.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Intentar eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    const fd = new FormData(); 
    fd.append('id', id);

    try {
        const res = await API.request('/admin/config/form-types/delete', 'POST', fd);
        
        if (res.status === 'success') {
            Swal.fire('Eliminado', 'El tipo de formulario ha sido borrado.', 'success');
            loadData();
        } else {
            Swal.fire('Operación Bloqueada', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Error de comunicación con el servidor', 'error');
    }
};