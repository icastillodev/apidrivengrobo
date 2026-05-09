import { API } from '../../../api.js';

let insumosList = [];
let formTypesList = [];

function tf() {
    return window.txt?.config_insumos_cat || {};
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

export async function initConfigInsumos() {
    await Promise.all([loadFormTypes(), loadData({ boot: true })]);
    document.getElementById('form-insumo').onsubmit = saveInsumo;
}

async function loadFormTypes() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/insumos/types?inst=${instId}`);
        if (res.status === 'success') {
            formTypesList = Array.isArray(res.data) ? res.data : [];
        } else {
            formTypesList = [];
        }
    } catch (e) {
        console.error(e);
        formTypesList = [];
    }
}

async function loadData({ boot = false } = {}) {
    const instId = localStorage.getItem('instId');
    const tbody = document.getElementById('table-insumos');
    const t = tf();

    if (!boot && tbody) tbody.innerHTML = tbodySpinner(5);

    try {
        const res = await API.request(`/admin/config/insumos/all?inst=${instId}&t=${Date.now()}`);
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

function renderTable() {
    const tbody = document.getElementById('table-insumos');
    tbody.innerHTML = '';
    const t = tf();

    if (insumosList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">${escCfg(t.tabla_sin_filas)}</td></tr>`;
        return;
    }

    insumosList.forEach(i => {
        const isInactive = (i.Existencia == 2);
        const medida = `${escCfg(String(parseFloat(i.CantidadInsumo)))} ${escCfg(i.TipoInsumo || '')}`;
        const catGeneral = t.cat_general || '';
        const catCell = i.NombreCategoria
            ? `<span class="text-primary small fw-bold">${escCfg(i.NombreCategoria)}</span>`
            : `<span class="text-muted fst-italic">${escCfg(catGeneral)}</span>`;

        const estadoTxt = isInactive ? (t.estado_inactivo || '') : (t.estado_activo || '');
        const tipAct = isInactive ? (t.tooltip_activar || '') : (t.tooltip_desactivar || '');

        const tr = document.createElement('tr');
        tr.className = isInactive ? 'bg-light opacity-50' : '';

        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">
                ${isInactive ? '<i class="bi bi-archive text-muted me-2"></i>' : ''}
                ${escCfg(i.NombreInsumo)}
            </td>
            <td class="text-center fw-bold text-secondary">${medida}</td>
            <td>${catCell}</td>
            <td class="text-center">
                <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} shadow-sm" style="font-size: 10px;">
                    ${escCfg(estadoTxt)}
                </span>
            </td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border shadow-sm"
                        onclick="window.toggleInsumo(${i.idInsumo}, ${i.Existencia})"
                        title="${escAttr(tipAct)}">
                    <i class="bi ${isInactive ? 'bi-eye-fill' : 'bi-eye-slash-fill'}"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalInsumo(${i.idInsumo})">
                    <i class="bi bi-pencil-fill text-primary"></i>
                </button>
                <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteInsumo(${i.idInsumo})">
                    <i class="bi bi-trash-fill text-danger"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalInsumo = (id = null) => {
    const loc = tf();
    const form = document.getElementById('form-insumo');
    form.reset();
    document.getElementById('ins-id').value = '';
    document.getElementById('status-container').innerHTML = '';

    const catContainer = document.getElementById('cat-container');

    if (formTypesList.length > 0) {
        let options = `<option value="">${escCfg(loc.ph_sel_categoria || '')}</option>`;
        formTypesList.forEach(tp => {
            options += `<option value="${escAttr(String(tp.IdTipoFormulario))}">${escCfg(tp.nombreTipo)}</option>`;
        });
        catContainer.innerHTML = `
            <label class="form-label small fw-bold text-muted">${escCfg(loc.label_cat_pedido || '')}</label>
            <select name="CategoriaInsumo" id="ins-cat" class="form-select fw-bold border-secondary" required>
                ${options}
            </select>
            <div class="form-text small">${escCfg(loc.cat_help || '')}</div>
        `;
    } else {
        catContainer.innerHTML = `
            <label class="form-label small fw-bold text-muted">${escCfg(loc.label_categoria_fallback || '')}</label>
            <input type="text" class="form-control text-muted" value="${escCfg(loc.cat_general_input || '')}" disabled>
            <input type="hidden" name="CategoriaInsumo" id="ins-cat" value="0">
            <div class="form-text small text-warning"><i class="bi bi-exclamation-circle"></i> ${escCfg(loc.warn_sin_tipos_form || '')}</div>
        `;
    }

    if (id) {
        const item = insumosList.find(x => x.idInsumo == id);
        if (item) {
            document.getElementById('ins-id').value = item.idInsumo;
            document.getElementById('ins-nombre').value = item.NombreInsumo;
            document.getElementById('ins-cant').value = item.CantidadInsumo;
            document.getElementById('ins-tipo').value = item.TipoInsumo;

            if (formTypesList.length > 0) {
                const sel = document.getElementById('ins-cat');
                if (sel) sel.value = item.CategoriaInsumo || '';
            }

            const isInactive = (item.Existencia == 2);
            document.getElementById('status-container').innerHTML = `
                <label class="form-label small fw-bold text-muted">${escCfg(loc.label_disponibilidad || '')}</label>
                <select name="Existencia" class="form-select fw-bold">
                    <option value="1" ${!isInactive ? 'selected' : ''}>${escCfg(loc.estado_activo || '')}</option>
                    <option value="2" ${isInactive ? 'selected' : ''}>${escCfg(loc.estado_inactivo || '')}</option>
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
    const t = tf();

    if (formTypesList.length > 0 && !fd.get('CategoriaInsumo')) {
        Swal.fire(t.swal_atencion || '', t.swal_sel_categoria || '', 'warning');
        return;
    }

    try {
        const res = await API.request('/admin/config/insumos/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: t.swal_guardado || '', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-insumo'))?.hide();
            await loadData({ boot: false });
            return;
        }
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_error_guardar || '', 'error');
    } catch (err) {
        Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_guardar || '', 'error');
    }
}

window.toggleInsumo = async (id, currentStatus) => {
    const newStatus = (currentStatus == 2) ? 1 : 2;
    const fd = new FormData();
    fd.append('idInsumo', id);
    fd.append('status', newStatus);
    try {
        const res = await API.request('/admin/config/insumos/toggle', 'POST', fd);
        if (res.status === 'success') await loadData({ boot: false });
    } catch (e) {
        console.error(e);
    }
};

window.deleteInsumo = async (id) => {
    const t = tf();
    const confirm = await Swal.fire({
        title: t.swal_eliminar_titulo || '',
        text: t.swal_eliminar_texto || '',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t.swal_proceder || '',
        cancelButtonText: t.swal_cancelar || ''
    });
    if (!confirm.isConfirmed) return;

    const fd = new FormData();
    fd.append('id', id);
    try {
        const res = await API.request('/admin/config/insumos/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? (t.msg_insumo_desactivado || '') : (t.msg_insumo_eliminado || '');
            Swal.fire(t.swal_procesado || '', msg, 'success');
            await loadData({ boot: false });
        } else {
            Swal.fire(t.swal_error_titulo || 'Error', res.message || '', 'error');
        }
    } catch (e) {
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
};
