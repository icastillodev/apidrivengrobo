import { API } from '../../../api.js';

let fullData = [];

/**
 * Inicializa la página de configuración de especies
 */
export async function initConfigEspecies() {
    loadData();
    document.getElementById('form-especie').onsubmit = saveEspecie;
    document.getElementById('form-subespecie').onsubmit = saveSubespecie;
}

/**
 * Carga el árbol completo de especies y subespecies desde el servidor
 */
async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/especies/all?inst=${instId}`);
        if (res.status === 'success') {
            fullData = res.data;
            renderTree();
        }
    } catch (e) { 
        console.error("Error al cargar especies:", e); 
    }
}

/**
 * Renderiza la interfaz con tarjetas para cada especie y tablas para subespecies
 */
function renderTree() {
    const container = document.getElementById('especies-container');
    container.innerHTML = '';

    if (fullData.length === 0) {
        container.innerHTML = '<div class="alert alert-info text-center">No hay especies configuradas. Comience agregando una nueva.</div>';
        return;
    }

    fullData.forEach(esp => {
        const card = document.createElement('div');
        card.className = "card border-0 shadow-sm mb-4 overflow-hidden";
        
        const subRows = esp.subespecies.map(s => {
            // Lógica estricta: Solo el valor 2 es INACTIVO
            const isInactive = (s.Existe == 2);
            // Formateo de medida (ej: 10 Kg, 1 Unid)
            const medidaTexto = `${s.SubEspCantidad || 1} ${s.SubEspTipo || 'Unid.'}`;
            
            return `
            <tr class="${isInactive ? 'opacity-50 bg-light' : ''}">
                <td class="ps-4 fw-bold">
                    ${isInactive ? '<i class="bi bi-pause-circle text-muted me-2"></i>' : '<i class="bi bi-check-circle-fill text-success me-2"></i>'} 
                    ${s.SubEspeNombreA}
                </td>
                <td class="text-center fw-bold text-muted small">${medidaTexto}</td>
                <td class="text-center">
                    <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} shadow-sm" style="font-size: 10px;">
                        ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border shadow-sm" 
                            onclick="window.toggleSub(${s.idsubespA}, ${s.Existe})" 
                            title="${isInactive ? 'Activar' : 'Desactivar'}">
                        <i class="bi ${isInactive ? 'bi-eye-fill' : 'bi-eye-slash-fill'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border shadow-sm" 
                            onclick="window.openModalSub(${esp.idespA}, ${s.idsubespA}, '${s.SubEspeNombreA}', ${s.Existe}, '${s.SubEspTipo || ''}', ${s.SubEspCantidad || 1})">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        card.innerHTML = `
            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <div>
                    <span class="text-uppercase small fw-black text-muted ls-1">Especie Principal</span>
                    <h5 class="mb-0 fw-bold text-dark">${esp.EspeNombreA}</h5>
                </div>
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-outline-dark fw-bold" onclick="window.openModalSub(${esp.idespA})">
                        <i class="bi bi-plus-lg me-1"></i> SUBESPECIE
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.openModalEspecie(${esp.idespA}, '${esp.EspeNombreA}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteEspecie(${esp.idespA})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0 small">
                    <thead class="bg-light text-muted text-uppercase" style="font-size: 10px;">
                        <tr>
                            <th class="ps-4">Subespecie / Cepa</th>
                            <th class="text-center">Cant. Base / Medida</th>
                            <th class="text-center">Estado</th>
                            <th class="text-end pe-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subRows || '<tr><td colspan="4" class="text-center py-4 text-muted fst-italic">No hay subespecies para esta categoría.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * MODALES - APERTURA Y CARGA DE DATOS
 */

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
    if (stateContainer) {
        stateContainer.innerHTML = `
            <label class="form-label small fw-bold">ESTADO DE DISPONIBILIDAD</label>
            <select name="Existe" id="sub-existe" class="form-select fw-bold">
                <option value="1" ${estado != 2 ? 'selected' : ''}>ACTIVO (Disponible en formularios)</option>
                <option value="2" ${estado == 2 ? 'selected' : ''}>INACTIVO (Oculto)</option>
            </select>
        `;
    }

    new bootstrap.Modal(document.getElementById('modal-subespecie')).show();
};

/**
 * ACCIONES (GUARDAR, TOGGLE Y ELIMINAR)
 */

async function saveEspecie(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    
    try {
        const res = await API.request('/admin/config/especies/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Éxito', text: 'Especie guardada.', icon: 'success', timer: 1000, showConfirmButton: false });
            loadData();
            bootstrap.Modal.getInstance(document.getElementById('modal-especie')).hide();
        }
    } catch (err) { Swal.fire('Error', 'No se pudo guardar la especie.', 'error'); }
}

async function saveSubespecie(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    try {
        const res = await API.request('/admin/config/subespecies/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Éxito', text: 'Subespecie actualizada.', icon: 'success', timer: 1000, showConfirmButton: false });
            loadData();
            bootstrap.Modal.getInstance(document.getElementById('modal-subespecie')).hide();
        }
    } catch (err) { Swal.fire('Error', 'No se pudo guardar la subespecie.', 'error'); }
}

window.toggleSub = async (id, currentStatus) => {
    // Invertimos: si es 2 (inactivo), pasa a 1. Si no, pasa a 2.
    const newStatus = (currentStatus == 2) ? 1 : 2; 
    
    const fd = new FormData();
    fd.append('idSub', id);
    fd.append('status', newStatus);

    try {
        const res = await API.request('/admin/config/subespecies/toggle', 'POST', fd);
        if (res.status === 'success') {
            loadData(); 
        }
    } catch (e) { console.error("Error en toggle automático:", e); }
};

window.deleteEspecie = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar Especie?',
        text: 'Si tiene historial (pedidos previos), se desactivarán sus subespecies automáticamente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, proceder',
        cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
        const fd = new FormData();
        fd.append('idEsp', id);
        const res = await API.request('/admin/config/especies/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? 'Especie desactivada y subespecies ocultas (historial detectado).' : 'Registro eliminado permanentemente.';
            Swal.fire('Procesado', msg, 'success');
            loadData();
        }
    } catch (e) { Swal.fire('Error', 'No se pudo completar la operación.', 'error'); }
};