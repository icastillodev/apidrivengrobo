import { API } from '../../../api.js';

let typesList = [];
let sevList = [];

function tf() {
    return window.txt?.config_protocolos || {};
}

function escCfg(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function tbodySpinner(colspan) {
    const msg = escCfg(tf().tabla_cargando || window.txt?.generales?.msg_cargando || '…');
    return `<tr><td colspan="${colspan}" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr>`;
}

function tbodyError(colspan) {
    return `<tr><td colspan="${colspan}" class="text-center py-4 text-danger small">${escCfg(tf().tabla_error)}</td></tr>`;
}

export async function initConfigProtocolos() {
    await loadData({ boot: true });
    document.getElementById('form-type').onsubmit = saveType;
    document.getElementById('form-sev').onsubmit = saveSev;
}

async function loadData({ boot = false } = {}) {
    const instId = localStorage.getItem('instId');
    const tbTypes = document.getElementById('table-types');
    const tbSev = document.getElementById('table-sev');
    const t = tf();

    if (!boot) {
        if (tbTypes) tbTypes.innerHTML = tbodySpinner(2);
        if (tbSev) tbSev.innerHTML = tbodySpinner(3);
    }

    try {
        const res = await API.request(`/admin/config/protocols-conf/init?inst=${instId}`);
        if (res.status === 'success') {
            typesList = Array.isArray(res.data?.types) ? res.data.types : [];
            sevList = Array.isArray(res.data?.severities) ? res.data.severities : [];
            renderTypes();
            renderSev();
            return;
        }
        typesList = [];
        sevList = [];
        if (tbTypes) tbTypes.innerHTML = tbodyError(2);
        if (tbSev) tbSev.innerHTML = tbodyError(3);
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.tabla_error || '', 'error');
    } catch (e) {
        console.error(e);
        typesList = [];
        sevList = [];
        if (tbTypes) tbTypes.innerHTML = tbodyError(2);
        if (tbSev) tbSev.innerHTML = tbodyError(3);
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
}

function renderTypes() {
    const tbody = document.getElementById('table-types');
    tbody.innerHTML = '';
    const t = tf();

    if (typesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-muted">${escCfg(t.tabla_sin_tipos)}</td></tr>`;
        return;
    }

    typesList.forEach(tp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">${escCfg(tp.NombreTipoprotocolo)}</td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalType(${tp.idtipoprotocolo})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteType(${tp.idtipoprotocolo})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalType = (id = null) => {
    document.getElementById('form-type').reset();
    document.getElementById('type-id').value = '';

    if (id) {
        const tp = typesList.find(x => x.idtipoprotocolo == id);
        if (tp) {
            document.getElementById('type-id').value = tp.idtipoprotocolo;
            document.getElementById('type-name').value = tp.NombreTipoprotocolo;
        }
    }
    new bootstrap.Modal(document.getElementById('modal-type')).show();
};

async function saveType(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    const t = tf();

    try {
        const res = await API.request('/admin/config/protocols-conf/type/save', 'POST', fd);
        if (res.status === 'success') {
            await loadData({ boot: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-type'))?.hide();
            Swal.fire({ title: t.swal_guardado || '', icon: 'success', timer: 1000, showConfirmButton: false });
            return;
        }
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_error_guardar || '', 'error');
    } catch (err) {
        Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_guardar || '', 'error');
    }
}

window.deleteType = async (id) => {
    const t = tf();
    const confirm = await Swal.fire({
        title: t.swal_eliminar_titulo || '',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t.swal_eliminar_confirm || '',
        cancelButtonText: t.swal_cancelar || ''
    });
    if (!confirm.isConfirmed) return;

    const fd = new FormData();
    fd.append('idTipo', id);
    try {
        const res = await API.request('/admin/config/protocols-conf/type/delete', 'POST', fd);
        if (res.status === 'success') await loadData({ boot: false });
        else Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_delete_en_uso || '', 'error');
    } catch (e) {
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
};

function renderSev() {
    const tbody = document.getElementById('table-sev');
    tbody.innerHTML = '';
    const t = tf();

    if (sevList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">${escCfg(t.tabla_sin_severidades)}</td></tr>`;
        return;
    }

    sevList.forEach(s => {
        const tr = document.createElement('tr');
        const det = (s.detalle && String(s.detalle).trim()) ? escCfg(s.detalle) : escCfg(t.sin_detalle || '-');
        tr.innerHTML = `
            <td class="ps-4 fw-bold">${escCfg(s.NombreSeveridad)}</td>
            <td class="small text-muted text-truncate" style="max-width: 300px;">${det}</td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalSev(${s.IdSeveridadTipo})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteSev(${s.IdSeveridadTipo})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalSev = (id = null) => {
    document.getElementById('form-sev').reset();
    document.getElementById('sev-id').value = '';

    if (id) {
        const s = sevList.find(x => x.IdSeveridadTipo == id);
        if (s) {
            document.getElementById('sev-id').value = s.IdSeveridadTipo;
            document.getElementById('sev-name').value = s.NombreSeveridad;
            document.getElementById('sev-detail').value = s.detalle || '';
        }
    }
    new bootstrap.Modal(document.getElementById('modal-sev')).show();
};

async function saveSev(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    const t = tf();

    try {
        const res = await API.request('/admin/config/protocols-conf/severity/save', 'POST', fd);
        if (res.status === 'success') {
            await loadData({ boot: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-sev'))?.hide();
            Swal.fire({ title: t.swal_guardado || '', icon: 'success', timer: 1000, showConfirmButton: false });
            return;
        }
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_error_guardar || '', 'error');
    } catch (err) {
        Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_guardar || '', 'error');
    }
}

window.deleteSev = async (id) => {
    const t = tf();
    const confirm = await Swal.fire({
        title: t.swal_eliminar_titulo || '',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t.swal_eliminar_confirm || '',
        cancelButtonText: t.swal_cancelar || ''
    });
    if (!confirm.isConfirmed) return;

    const fd = new FormData();
    fd.append('idSev', id);
    try {
        const res = await API.request('/admin/config/protocols-conf/severity/delete', 'POST', fd);
        if (res.status === 'success') await loadData({ boot: false });
        else Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_delete_en_uso || '', 'error');
    } catch (e) {
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
};
