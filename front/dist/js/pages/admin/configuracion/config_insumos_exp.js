import { API } from '../../../api.js';

let insumosList = [];
let speciesList = [];

export async function initConfigInsumosExp() {
    // Carga paralela de datos y catálogo de especies
    await Promise.all([loadData(), loadSpecies()]);
    document.getElementById('form-insumo-exp').onsubmit = saveInsumoExp;
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos-exp/all?inst=${instId}`);
        if (res.status === 'success') {
            insumosList = res.data;
            renderTable();
        }
    } catch (e) { console.error(e); }
}

async function loadSpecies() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos-exp/species?inst=${instId}`);
        if (res.status === 'success') {
            speciesList = res.data;
            populateSpeciesSelect();
        }
    } catch (e) { console.error(e); }
}

function populateSpeciesSelect() {
    const select = document.getElementById('exp-especie');
    // Mantenemos la opción 0 por defecto y agregamos las dinámicas
    select.innerHTML = '<option value="0">-- General / Ninguna --</option>';
    speciesList.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.idespA;
        opt.textContent = s.EspeNombreA;
        select.appendChild(opt);
    });
}

function renderTable() {
    const tbody = document.getElementById('table-insumos-exp');
    tbody.innerHTML = '';

    if (insumosList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay reactivos registrados.</td></tr>';
        return;
    }

    insumosList.forEach(i => {
        // habilitado: 2 es Inactivo, cualquier otro es Activo
        const isInactive = (i.habilitado == 2);
        const medida = `${parseFloat(i.CantidadInsumo)} ${i.TipoInsumo}`;
        const especie = i.NombreEspecie ? `<span class="badge bg-light text-dark border">${i.NombreEspecie}</span>` : '<span class="text-muted small">General</span>';

        const tr = document.createElement('tr');
        tr.className = isInactive ? 'bg-light opacity-50' : '';
        
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">
                ${isInactive ? '<i class="bi bi-slash-circle text-muted me-2"></i>' : ''}
                ${i.NombreInsumo}
            </td>
            <td class="text-center fw-bold text-secondary">${medida}</td>
            <td class="text-start ps-3">${especie}</td>
            <td class="text-center">
                <span class="badge ${isInactive ? 'bg-secondary' : 'bg-primary'} shadow-sm" style="font-size: 10px;">
                    ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                </span>
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm ${isInactive ? 'btn-outline-primary' : 'btn-outline-secondary'} border shadow-sm" 
                        onclick="window.toggleExp(${i.IdInsumoexp}, ${i.habilitado})"
                        title="${isInactive ? 'Habilitar' : 'Deshabilitar'}">
                    <i class="bi ${isInactive ? 'bi-check-lg' : 'bi-slash-circle'}"></i>
                </button>
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalInsumoExp(${i.IdInsumoexp})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteExp(${i.IdInsumoexp})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalInsumoExp = (id = null) => {
    const form = document.getElementById('form-insumo-exp');
    form.reset();
    document.getElementById('exp-id').value = "";
    document.getElementById('exp-status-container').innerHTML = ""; 
    document.getElementById('exp-especie').value = "0"; // Reset select

    if (id) {
        const item = insumosList.find(x => x.IdInsumoexp == id);
        if (item) {
            document.getElementById('exp-id').value = item.IdInsumoexp;
            document.getElementById('exp-nombre').value = item.NombreInsumo;
            document.getElementById('exp-cant').value = item.CantidadInsumo;
            document.getElementById('exp-tipo').value = item.TipoInsumo;
            
            // Asignar especie (si es null o 0, el select se queda en 0)
            document.getElementById('exp-especie').value = item.IdespA || 0;

            const isInactive = (item.habilitado == 2);
            document.getElementById('exp-status-container').innerHTML = `
                <label class="form-label small fw-bold text-muted">ESTADO</label>
                <select name="habilitado" class="form-select fw-bold">
                    <option value="1" ${!isInactive ? 'selected' : ''}>HABILITADO</option>
                    <option value="2" ${isInactive ? 'selected' : ''}>DESHABILITADO</option>
                </select>
            `;
        }
    }
    
    new bootstrap.Modal(document.getElementById('modal-insumo-exp')).show();
};

async function saveInsumoExp(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));

    try {
        const res = await API.request('/admin/config/insumos-exp/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-insumo-exp')).hide();
            loadData();
        }
    } catch (err) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
}

window.toggleExp = async (id, currentStatus) => {
    const newStatus = (currentStatus == 2) ? 1 : 2;
    const fd = new FormData();
    fd.append('id', id);
    fd.append('status', newStatus);

    const res = await API.request('/admin/config/insumos-exp/toggle', 'POST', fd);
    if(res.status === 'success') loadData();
};

window.deleteExp = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar Reactivo?',
        text: "Si tiene historial, pasará a estado inactivo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar'
    });

    if (!confirm.isConfirmed) return;

    const fd = new FormData(); 
    fd.append('id', id);

    try {
        const res = await API.request('/admin/config/insumos-exp/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? 'Reactivo deshabilitado (historial detectado).' : 'Eliminado correctamente.';
            Swal.fire('Listo', msg, 'success');
            loadData();
        }
    } catch (e) { Swal.fire('Error', 'Fallo de red', 'error'); }
};