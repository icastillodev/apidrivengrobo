import { API } from '../../../api.js';

let typesList = [];
let sevList = [];

export async function initConfigProtocolos() {
    loadData();
    document.getElementById('form-type').onsubmit = saveType;
    document.getElementById('form-sev').onsubmit = saveSev;
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/protocols-conf/init?inst=${instId}`);
        if (res.status === 'success') {
            typesList = res.data.types;
            sevList = res.data.severities;
            renderTypes();
            renderSev();
        }
    } catch (e) { console.error(e); }
}

/* --- TIPOS --- */
function renderTypes() {
    const tbody = document.getElementById('table-types');
    tbody.innerHTML = '';
    
    if(typesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">Sin datos</td></tr>';
        return;
    }

    typesList.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">${t.NombreTipoprotocolo}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalType(${t.idtipoprotocolo})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteType(${t.idtipoprotocolo})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalType = (id = null) => {
    document.getElementById('form-type').reset();
    document.getElementById('type-id').value = "";
    
    if(id) {
        const t = typesList.find(x => x.idtipoprotocolo == id);
        if(t) {
            document.getElementById('type-id').value = t.idtipoprotocolo;
            document.getElementById('type-name').value = t.NombreTipoprotocolo;
        }
    }
    new bootstrap.Modal(document.getElementById('modal-type')).show();
};

async function saveType(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    
    const res = await API.request('/admin/config/protocols-conf/type/save', 'POST', fd);
    if(res.status === 'success') {
        loadData();
        bootstrap.Modal.getInstance(document.getElementById('modal-type')).hide();
        Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
    }
}

window.deleteType = async (id) => {
    const confirm = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
    if(!confirm.isConfirmed) return;

    const fd = new FormData(); fd.append('idTipo', id);
    const res = await API.request('/admin/config/protocols-conf/type/delete', 'POST', fd);
    if(res.status === 'success') loadData();
    else Swal.fire('Error', 'No se puede eliminar (en uso)', 'error');
};


/* --- SEVERIDADES --- */
function renderSev() {
    const tbody = document.getElementById('table-sev');
    tbody.innerHTML = '';
    
    if(sevList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Sin datos</td></tr>';
        return;
    }

    sevList.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold">${s.NombreSeveridad}</td>
            <td class="small text-muted text-truncate" style="max-width: 300px;">${s.detalle || '-'}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalSev(${s.IdSeveridadTipo})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteSev(${s.IdSeveridadTipo})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalSev = (id = null) => {
    document.getElementById('form-sev').reset();
    document.getElementById('sev-id').value = "";
    
    if(id) {
        const s = sevList.find(x => x.IdSeveridadTipo == id);
        if(s) {
            document.getElementById('sev-id').value = s.IdSeveridadTipo;
            document.getElementById('sev-name').value = s.NombreSeveridad;
            document.getElementById('sev-detail').value = s.detalle;
        }
    }
    new bootstrap.Modal(document.getElementById('modal-sev')).show();
};

async function saveSev(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    
    const res = await API.request('/admin/config/protocols-conf/severity/save', 'POST', fd);
    if(res.status === 'success') {
        loadData();
        bootstrap.Modal.getInstance(document.getElementById('modal-sev')).hide();
        Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
    }
}

window.deleteSev = async (id) => {
    const confirm = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
    if(!confirm.isConfirmed) return;

    const fd = new FormData(); fd.append('idSev', id);
    const res = await API.request('/admin/config/protocols-conf/severity/delete', 'POST', fd);
    if(res.status === 'success') loadData();
    else Swal.fire('Error', 'No se puede eliminar (en uso)', 'error');
};