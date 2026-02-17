import { API } from '../../../api.js';

let insumosList = [];
let formTypesList = []; // Aquí guardaremos los tipos de formulario disponibles

export async function initConfigInsumos() {
    await loadFormTypes(); // Primero cargamos los tipos para tenerlos listos
    loadData();
    document.getElementById('form-insumo').onsubmit = saveInsumo;
}

// 1. Cargar Tipos de Formulario (Categoría: Insumos)
async function loadFormTypes() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos/types?inst=${instId}`);
        if (res.status === 'success') {
            formTypesList = res.data;
        }
    } catch (e) { console.error("Error cargando tipos:", e); }
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos/all?inst=${instId}&t=${Date.now()}`);
        if (res.status === 'success') {
            insumosList = res.data;
            renderTable();
        }
    } catch (e) { console.error(e); }
}

function renderTable() {
    const tbody = document.getElementById('table-insumos');
    tbody.innerHTML = '';

    if (insumosList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay insumos registrados.</td></tr>';
        return;
    }

    insumosList.forEach(i => {
        const isInactive = (i.Existencia == 2);
        const medida = `${parseFloat(i.CantidadInsumo)} ${i.TipoInsumo}`;
        
        // i.NombreCategoria viene del JOIN en el modelo. Si es null, mostramos "General" o "-"
        const catName = i.NombreCategoria || '<span class="text-muted fst-italic">General</span>';

        const tr = document.createElement('tr');
        tr.className = isInactive ? 'bg-light opacity-50' : '';
        
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">
                ${isInactive ? '<i class="bi bi-archive text-muted me-2"></i>' : ''}
                ${i.NombreInsumo}
            </td>
            <td class="text-center fw-bold text-secondary">${medida}</td>
            <td class="text-primary small fw-bold">${catName}</td>
            <td class="text-center">
                <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} shadow-sm" style="font-size: 10px;">
                    ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                </span>
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border shadow-sm" 
                        onclick="window.toggleInsumo(${i.idInsumo}, ${i.Existencia})"
                        title="${isInactive ? 'Activar' : 'Desactivar'}">
                    <i class="bi ${isInactive ? 'bi-eye-fill' : 'bi-eye-slash-fill'}"></i>
                </button>
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalInsumo(${i.idInsumo})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteInsumo(${i.idInsumo})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalInsumo = (id = null) => {
    const form = document.getElementById('form-insumo');
    form.reset();
    document.getElementById('ins-id').value = "";
    document.getElementById('status-container').innerHTML = ""; 

    // --- LÓGICA DE CATEGORÍA ---
    const catContainer = document.getElementById('cat-container');
    
    if (formTypesList.length > 0) {
        // Hay tipos disponibles: Mostrar SELECT
        let options = '<option value="">-- Seleccionar Categoría --</option>';
        formTypesList.forEach(t => {
            options += `<option value="${t.IdTipoFormulario}">${t.nombreTipo}</option>`;
        });
        catContainer.innerHTML = `
            <label class="form-label small fw-bold text-muted">CATEGORÍA DEL PEDIDO</label>
            <select name="CategoriaInsumo" id="ins-cat" class="form-select fw-bold border-secondary" required>
                ${options}
            </select>
            <div class="form-text small">Seleccione el formulario donde aparecerá este insumo.</div>
        `;
    } else {
        // No hay tipos: Mostrar INPUT DESHABILITADO (Valor 0/General)
        catContainer.innerHTML = `
            <label class="form-label small fw-bold text-muted">CATEGORÍA</label>
            <input type="text" class="form-control text-muted" value="Insumos Generales" disabled>
            <input type="hidden" name="CategoriaInsumo" id="ins-cat" value="0">
            <div class="form-text small text-warning"><i class="bi bi-exclamation-circle"></i> No hay tipos de formularios de insumos configurados.</div>
        `;
    }

    if (id) {
        const item = insumosList.find(x => x.idInsumo == id);
        if (item) {
            document.getElementById('ins-id').value = item.idInsumo;
            document.getElementById('ins-nombre').value = item.NombreInsumo;
            document.getElementById('ins-cant').value = item.CantidadInsumo;
            document.getElementById('ins-tipo').value = item.TipoInsumo;
            
            // Asignar categoría si existe el select
            if (formTypesList.length > 0) {
                document.getElementById('ins-cat').value = item.CategoriaInsumo || "";
            }

            const isInactive = (item.Existencia == 2);
            document.getElementById('status-container').innerHTML = `
                <label class="form-label small fw-bold text-muted">DISPONIBILIDAD</label>
                <select name="Existencia" class="form-select fw-bold">
                    <option value="1" ${!isInactive ? 'selected' : ''}>ACTIVO</option>
                    <option value="2" ${isInactive ? 'selected' : ''}>INACTIVO</option>
                </select>
            `;
        }
    }
    
    new bootstrap.Modal(document.getElementById('modal-insumo')).show();
};

async function saveInsumo(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));

    // Validación básica
    if(formTypesList.length > 0 && !fd.get('CategoriaInsumo')){
        return Swal.fire('Atención', 'Debe seleccionar una categoría.', 'warning');
    }

    try {
        const res = await API.request('/admin/config/insumos/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-insumo')).hide();
            loadData();
        }
    } catch (err) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
}

// ... (toggleInsumo y deleteInsumo quedan igual) ...
window.toggleInsumo = async (id, currentStatus) => {
    const newStatus = (currentStatus == 2) ? 1 : 2;
    const fd = new FormData();
    fd.append('idInsumo', id);
    fd.append('status', newStatus);
    const res = await API.request('/admin/config/insumos/toggle', 'POST', fd);
    if(res.status === 'success') loadData();
};

window.deleteInsumo = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar Insumo?',
        text: "Si se ha usado en pedidos anteriores, solo se desactivará.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Proceder',
        cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;
    const fd = new FormData(); 
    fd.append('id', id);
    try {
        const res = await API.request('/admin/config/insumos/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? 'Insumo desactivado.' : 'Insumo eliminado.';
            Swal.fire('Procesado', msg, 'success');
            loadData();
        } else { Swal.fire('Error', res.message, 'error'); }
    } catch (e) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
};