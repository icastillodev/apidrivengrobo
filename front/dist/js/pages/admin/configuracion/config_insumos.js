import { API } from '../../../api.js';

let insumosList = [];

export async function initConfigInsumos() {
    loadData();
    document.getElementById('form-insumo').onsubmit = saveInsumo;
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos/all?inst=${instId}`);
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
        // Lógica: Solo 2 es Inactivo. Cualquier otro valor (1, 0, null) es Activo.
        const isInactive = (i.Existencia == 2);
        const medida = `${parseFloat(i.CantidadInsumo)} ${i.TipoInsumo}`;

        const tr = document.createElement('tr');
        tr.className = isInactive ? 'bg-light opacity-50' : '';
        
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">
                ${isInactive ? '<i class="bi bi-archive text-muted me-2"></i>' : ''}
                ${i.NombreInsumo}
            </td>
            <td class="text-center fw-bold text-secondary">${medida}</td>
            <td class="text-muted small">${i.CategoriaInsumo || '-'}</td>
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
    document.getElementById('status-container').innerHTML = ""; // Limpiar select estado

    if (id) {
        const item = insumosList.find(x => x.idInsumo == id);
        if (item) {
            document.getElementById('ins-id').value = item.idInsumo;
            document.getElementById('ins-nombre').value = item.NombreInsumo;
            document.getElementById('ins-cant').value = item.CantidadInsumo;
            document.getElementById('ins-tipo').value = item.TipoInsumo;
            document.getElementById('ins-cat').value = item.CategoriaInsumo;

            // Inyectar Select de Estado solo si editamos
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

    try {
        const res = await API.request('/admin/config/insumos/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-insumo')).hide();
            loadData();
        }
    } catch (err) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
}

window.toggleInsumo = async (id, currentStatus) => {
    // Si es 2 pasa a 1, sino pasa a 2
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
            const msg = res.mode === 'deactivated' ? 'Insumo desactivado (historial detectado).' : 'Insumo eliminado correctamente.';
            Swal.fire('Procesado', msg, 'success');
            loadData();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
};