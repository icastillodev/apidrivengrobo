import { API } from '../../../api.js';

let insumosList = [];
let speciesList = [];

function tf() {
    return window.txt?.config_insumos_exp || {};
}

function escCfg(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escAttr(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/'/g, '&#39;');
}

function tbodySpinner(colspan) {
    const msg = escCfg(tf().tabla_cargando || window.txt?.generales?.msg_cargando || '…');
    return `<tr><td colspan="${colspan}" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr>`;
}

export async function initConfigInsumosExp() {
    await Promise.all([loadData({ boot: true }), loadSpecies()]);
    document.getElementById('form-insumo-exp').onsubmit = saveInsumoExp;
}

async function loadData({ boot = false } = {}) {
    const instId = localStorage.getItem('instId');
    const tbody = document.getElementById('table-insumos-exp');
    const t = tf();

    if (!boot && tbody) tbody.innerHTML = tbodySpinner(5);

    try {
        const res = await API.request(`/admin/config/insumos-exp/all?inst=${instId}`);
        if (res.status === 'success') {
            insumosList = Array.isArray(res.data) ? res.data : [];
            renderTable();
            return;
        }
        insumosList = [];
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger small">${escCfg(t.tabla_error)}</td></tr>`;
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.tabla_error || '', 'error');
    } catch (e) {
        console.error(e);
        insumosList = [];
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger small">${escCfg(t.tabla_error)}</td></tr>`;
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
}

async function loadSpecies() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos-exp/species?inst=${instId}`);
        if (res.status === 'success') {
            speciesList = Array.isArray(res.data) ? res.data : [];
        } else {
            speciesList = [];
        }
    } catch (e) {
        console.error(e);
        speciesList = [];
    }
    populateSpeciesSelect();
}

function populateSpeciesSelect() {
    const select = document.getElementById('exp-especie');
    if (!select) return;
    const t = tf();
    select.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '0';
    opt0.textContent = t.opcion_general || '';
    select.appendChild(opt0);
    speciesList.forEach(s => {
        const opt = document.createElement('option');
        opt.value = String(s.idespA);
        opt.textContent = s.EspeNombreA || '';
        select.appendChild(opt);
    });
}

function renderTable() {
    const tbody = document.getElementById('table-insumos-exp');
    tbody.innerHTML = '';
    const t = tf();

    if (insumosList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">${escCfg(t.tabla_sin_filas)}</td></tr>`;
        return;
    }

    insumosList.forEach(i => {
        const isInactive = (i.habilitado == 2);
        const medida = `${escCfg(String(parseFloat(i.CantidadInsumo)))} ${escCfg(i.TipoInsumo || '')}`;
        const especieGeneral = t.especie_general || '';
        const especie = i.NombreEspecie
            ? `<span class="badge bg-light text-dark border">${escCfg(i.NombreEspecie)}</span>`
            : `<span class="text-muted small">${escCfg(especieGeneral)}</span>`;

        const estadoTxt = isInactive ? (t.estado_inactivo || '') : (t.estado_activo || '');
        const tipTog = isInactive ? (t.tooltip_habilitar || '') : (t.tooltip_deshabilitar || '');

        const tr = document.createElement('tr');
        tr.className = isInactive ? 'bg-light opacity-50' : '';

        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">
                ${isInactive ? '<i class="bi bi-slash-circle text-muted me-2"></i>' : ''}
                ${escCfg(i.NombreInsumo)}
            </td>
            <td class="text-center fw-bold text-secondary">${medida}</td>
            <td class="text-start ps-3">${especie}</td>
            <td class="text-center">
                <span class="badge ${isInactive ? 'bg-secondary' : 'bg-primary'} shadow-sm" style="font-size: 10px;">
                    ${escCfg(estadoTxt)}
                </span>
            </td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-sm ${isInactive ? 'btn-outline-primary' : 'btn-outline-secondary'} border shadow-sm"
                        onclick="window.toggleExp(${i.IdInsumoexp}, ${i.habilitado})"
                        title="${escAttr(tipTog)}">
                    <i class="bi ${isInactive ? 'bi-check-lg' : 'bi-slash-circle'}"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalInsumoExp(${i.IdInsumoexp})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteExp(${i.IdInsumoexp})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalInsumoExp = (id = null) => {
    populateSpeciesSelect();

    const form = document.getElementById('form-insumo-exp');
    form.reset();
    document.getElementById('exp-id').value = '';
    document.getElementById('exp-status-container').innerHTML = '';
    document.getElementById('exp-especie').value = '0';

    const loc = tf();

    if (id) {
        const item = insumosList.find(x => x.IdInsumoexp == id);
        if (item) {
            document.getElementById('exp-id').value = item.IdInsumoexp;
            document.getElementById('exp-nombre').value = item.NombreInsumo;
            document.getElementById('exp-cant').value = item.CantidadInsumo;
            document.getElementById('exp-tipo').value = item.TipoInsumo;

            document.getElementById('exp-especie').value = String(item.IdespA || 0);

            const isInactive = (item.habilitado == 2);
            document.getElementById('exp-status-container').innerHTML = `
                <label class="form-label small fw-bold text-muted">${escCfg(loc.label_estado_modal || '')}</label>
                <select name="habilitado" class="form-select fw-bold">
                    <option value="1" ${!isInactive ? 'selected' : ''}>${escCfg(loc.opcion_habilitado || '')}</option>
                    <option value="2" ${isInactive ? 'selected' : ''}>${escCfg(loc.opcion_deshabilitado || '')}</option>
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
    const t = tf();

    try {
        const res = await API.request('/admin/config/insumos-exp/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: t.swal_guardado || '', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-insumo-exp'))?.hide();
            await loadData({ boot: false });
            return;
        }
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_error_guardar || '', 'error');
    } catch (err) {
        Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_guardar || '', 'error');
    }
}

window.toggleExp = async (id, currentStatus) => {
    const newStatus = (currentStatus == 2) ? 1 : 2;
    const fd = new FormData();
    fd.append('id', id);
    fd.append('status', newStatus);

    try {
        const res = await API.request('/admin/config/insumos-exp/toggle', 'POST', fd);
        if (res.status === 'success') await loadData({ boot: false });
    } catch (e) {
        console.error(e);
    }
};

window.deleteExp = async (id) => {
    const t = tf();
    const confirm = await Swal.fire({
        title: t.swal_eliminar_titulo || '',
        text: t.swal_eliminar_texto || '',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t.swal_eliminar_confirm || '',
        cancelButtonText: t.swal_cancelar || ''
    });

    if (!confirm.isConfirmed) return;

    const fd = new FormData();
    fd.append('id', id);

    try {
        const res = await API.request('/admin/config/insumos-exp/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? (t.msg_reactivo_desactivado || '') : (t.msg_reactivo_eliminado || '');
            Swal.fire(t.swal_listo || '', msg, 'success');
            await loadData({ boot: false });
        } else {
            Swal.fire(t.swal_error_titulo || 'Error', res.message || '', 'error');
        }
    } catch (e) {
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
};
