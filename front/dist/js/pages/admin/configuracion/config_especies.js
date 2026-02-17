import { API } from '../../../api.js';

let fullData = [];

export async function initConfigEspecies() {
    loadData();
    document.getElementById('form-especie').onsubmit = saveEspecie;
    document.getElementById('form-subespecie').onsubmit = saveSubespecie;
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        // Timestamp para evitar caché
        const res = await API.request(`/admin/config/especies/all?inst=${instId}&t=${Date.now()}`);
        if (res.status === 'success') {
            fullData = res.data;
            renderTree();
        }
    } catch (e) { 
        console.error("Error al cargar especies:", e); 
    }
}

function renderTree() {
    const container = document.getElementById('especies-container');
    container.innerHTML = '';

    if (fullData.length === 0) {
        container.innerHTML = '<div class="alert alert-light border text-center p-5 shadow-sm"><h5><i class="bi bi-box-seam me-2"></i>Catálogo Vacío</h5><p class="text-muted">Comience agregando una nueva especie (Ej: Ratón).</p></div>';
        return;
    }

    fullData.forEach(esp => {
        // Especie Deshabilitada (Habilitado == 2)
        const isEspInactive = (esp.Habilitado == 2);
        const cardClass = isEspInactive ? "card border-0 shadow-sm mb-4 opacity-75" : "card border-0 shadow-sm mb-4";
        const headerClass = isEspInactive ? "card-header bg-light border-bottom py-3" : "card-header bg-white border-bottom py-3";

        const card = document.createElement('div');
        card.className = cardClass;
        
        const subRows = esp.subespecies.map(s => {
            // Subespecie Deshabilitada (Existe == 2)
            const isInactive = (s.Existe == 2);
            const medidaTexto = `${s.SubEspCantidad || 1} ${s.SubEspTipo || 'Unid.'}`;
            
            return `
            <tr class="${isInactive ? 'bg-light text-muted' : ''}">
                <td class="ps-4 fw-bold">
                    ${isInactive ? '<i class="bi bi-circle text-muted me-2" style="font-size:10px;"></i>' : '<i class="bi bi-circle-fill text-success me-2" style="font-size:10px;"></i>'} 
                    ${s.SubEspeNombreA}
                </td>
                <td class="text-center small font-monospace">${medidaTexto}</td>
                <td class="text-center">
                    <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} rounded-pill" style="font-size: 10px; font-weight: normal; width: 80px;">
                        ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border-0" 
                            onclick="window.toggleSub(${s.idsubespA}, ${s.Existe})" 
                            title="${isInactive ? 'Activar' : 'Desactivar'}">
                        <i class="bi ${isInactive ? 'bi-toggle-off fs-5' : 'bi-toggle-on fs-5'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1" 
                            onclick="window.openModalSub(${esp.idespA}, ${s.idsubespA}, '${s.SubEspeNombreA}', ${s.Existe}, '${s.SubEspTipo || ''}', ${s.SubEspCantidad || 1})">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        card.innerHTML = `
            <div class="${headerClass} d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <span class="badge bg-dark me-3 rounded-pill">${esp.idespA}</span>
                    <div>
                        <h5 class="mb-0 fw-bold text-dark text-uppercase">${esp.EspeNombreA}</h5>
                        ${isEspInactive ? '<span class="badge bg-danger ms-1" style="font-size:9px">DESHABILITADO</span>' : ''}
                    </div>
                </div>
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-light border fw-bold text-success" onclick="window.openModalSub(${esp.idespA})">
                        <i class="bi bi-plus-lg me-1"></i> Subespecie
                    </button>
                    <button class="btn btn-sm btn-light border" onclick="window.openModalEspecie(${esp.idespA}, '${esp.EspeNombreA}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-light border text-danger" onclick="window.deleteEspecie(${esp.idespA})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" style="font-size: 13px;">
                    <thead class="bg-light text-muted text-uppercase small">
                        <tr>
                            <th class="ps-4">Subespecie / Cepa</th>
                            <th class="text-center">Unidad Ref.</th>
                            <th class="text-center">Estado</th>
                            <th class="text-end pe-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subRows || '<tr><td colspan="4" class="text-center py-4 text-muted small fst-italic">No hay subespecies registradas.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- MODALES ---

window.openModalEspecie = (id = "", nombre = "") => {
    document.getElementById('esp-id').value = id;
    document.getElementById('esp-nombre').value = nombre;
    new bootstrap.Modal(document.getElementById('modal-especie')).show();
};

window.openModalSub = (espId, subId = "", nombre = "", estado = 1, tipo = "", cantidad = 1) => {
    document.getElementById('sub-esp-id-parent').value = espId;
    document.getElementById('sub-id').value = subId;
    document.getElementById('sub-nombre').value = nombre;
    document.getElementById('sub-tipo').value = tipo;
    document.getElementById('sub-cantidad').value = cantidad;

    const stateContainer = document.getElementById('sub-status-container');
    if (subId !== "") {
        stateContainer.innerHTML = `
            <label class="form-label small fw-bold">ESTADO</label>
            <select name="Existe" class="form-select fw-bold">
                <option value="1" ${estado != 2 ? 'selected' : ''}>ACTIVO</option>
                <option value="2" ${estado == 2 ? 'selected' : ''}>INACTIVO</option>
            </select>
        `;
    } else {
        stateContainer.innerHTML = '';
    }

    new bootstrap.Modal(document.getElementById('modal-subespecie')).show();
};

// --- GUARDAR ---

async function saveEspecie(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId')); // Importante para insertar
    
    try {
        const res = await API.request('/admin/config/especies/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            loadData();
            bootstrap.Modal.getInstance(document.getElementById('modal-especie')).hide();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
}

async function saveSubespecie(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    try {
        const res = await API.request('/admin/config/subespecies/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            loadData();
            bootstrap.Modal.getInstance(document.getElementById('modal-subespecie')).hide();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
}

window.toggleSub = async (id, currentStatus) => {
    // Si es 2 (Inactivo) pasa a 1 (Activo), sino a 2
    const newStatus = (currentStatus == 2) ? 1 : 2; 
    const fd = new FormData();
    fd.append('idSub', id);
    fd.append('status', newStatus);

    try {
        const res = await API.request('/admin/config/subespecies/toggle', 'POST', fd);
        if (res.status === 'success') loadData();
    } catch (e) { console.error(e); }
};

window.deleteEspecie = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar Especie?',
        text: 'Se eliminará o desactivará si tiene datos asociados.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Eliminar'
    });

    if (!confirm.isConfirmed) return;

    try {
        const fd = new FormData();
        fd.append('idEsp', id);
        const res = await API.request('/admin/config/especies/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? 'Especie desactivada por tener historial.' : 'Especie eliminada permanentemente.';
            Swal.fire('Procesado', msg, 'success');
            loadData();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Error de conexión', 'error'); }
};