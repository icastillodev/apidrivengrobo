import { API } from '../../../api.js';
import { getTipoFormBadgeStyle } from '../../../utils/badgeTipoForm.js';

let allTypes = [];

const CAT_ANIMAL_LABEL = 'Animal';
const CAT_REACTIVOS_LABEL = 'Otros reactivos biologicos';
const CAT_INSUMOS_LABEL = 'Insumos';

function tf() {
    return window.txt?.config_tipos_form || {};
}

function escCfg(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function tableSpinnerInner() {
    const t = tf();
    const msg = escCfg(t.tabla_cargando || window.txt?.generales?.msg_cargando || '…');
    return `<thead></thead><tbody><tr><td colspan="5" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr></tbody>`;
}

function tableErrorInner() {
    const msg = escCfg(tf().tabla_error || window.txt?.generales?.error || '');
    return `<thead></thead><tbody><tr><td colspan="5" class="text-center py-4 text-danger small">${msg}</td></tr></tbody>`;
}

function setThreeTables(htmlInnerFn) {
    const inner = typeof htmlInnerFn === 'function' ? htmlInnerFn() : htmlInnerFn;
    ['table-animal', 'table-reactivos', 'table-insumos'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = inner;
    });
}

function buildHeaderHtml() {
    const t = tf();
    const thNombre = escCfg(t.label_nombre_tipo || '');
    const thColor = escCfg(t.label_color || '');
    const thDesc = escCfg(t.label_descuento || '');
    const thCobro = escCfg(t.th_cobro || '');
    const thAcc = escCfg(t.th_acciones || '');
    return `
        <thead class="bg-light text-secondary text-uppercase small">
            <tr>
                <th class="ps-4">${thNombre}</th>
                <th class="text-center">${thColor}</th>
                <th class="text-center">${thDesc}</th>
                <th class="text-center">${thCobro}</th>
                <th class="text-end pe-4">${thAcc}</th>
            </tr>
        </thead>
        <tbody>`;
}

export async function initConfigFormTypes() {
    await loadData({ boot: true });
    setupTabEvents();
    document.getElementById('form-type-config').onsubmit = saveFormType;
}

function setupTabEvents() {
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');

    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            tabs.forEach(t => {
                t.classList.remove('fw-bold', 'text-dark');
                t.classList.add('bg-white', 'text-muted');
            });

            const activeTab = event.target;
            activeTab.classList.remove('bg-white', 'text-muted');
            activeTab.classList.add('fw-bold', 'text-dark');
        });
    });
}

async function loadData({ boot = false } = {}) {
    const instId = localStorage.getItem('instId');
    const t = tf();

    if (!boot) setThreeTables(tableSpinnerInner);

    try {
        const res = await API.request(`/admin/config/form-types/all?inst=${instId}`);
        if (res.status === 'success') {
            allTypes = Array.isArray(res.data) ? res.data : [];
            renderTables();
            return;
        }
        allTypes = [];
        setThreeTables(tableErrorInner);
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.tabla_error || '', 'error');
    } catch (e) {
        console.error(e);
        allTypes = [];
        setThreeTables(tableErrorInner);
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
}

function renderTables() {
    const headerHtml = buildHeaderHtml();

    if (!allTypes || allTypes.length === 0) {
        injectHtml('table-animal', headerHtml);
        injectHtml('table-reactivos', headerHtml);
        injectHtml('table-insumos', headerHtml);
        return;
    }

    document.getElementById('table-animal').innerHTML = '';
    document.getElementById('table-reactivos').innerHTML = '';
    document.getElementById('table-insumos').innerHTML = '';

    let htmlAnimal = headerHtml;
    let htmlReactivos = headerHtml;
    let htmlInsumos = headerHtml;

    const loc = tf();

    allTypes.forEach(t => {
        const catBD = (t.categoriaformulario || '').toLowerCase().trim();

        const isAnimal = catBD.includes('animal');
        const isReactivo = catBD.includes('reactivo') || catBD.includes('biologico');
        const isInsumo = catBD.includes('insumo');

        const isExempt = t.exento == 1;
        const badgeStyle = getTipoFormBadgeStyle(t.color || '');
        const nombreEsc = escCfg(t.nombreTipo || '');
        const badgePreview = `<span class="${badgeStyle.className}" style="${badgeStyle.style} font-size: 9px; padding: 2px 6px;">${nombreEsc.substring(0, 20)}</span>`;

        const descFmt = (loc.descuento_format || '-{pct}% OFF').replace('{pct}', String(t.descuento ?? 0));
        const descCell = t.descuento > 0
            ? `<span class="badge bg-success">${escCfg(descFmt)}</span>`
            : `<span class="text-muted small">${escCfg(loc.sin_descuento || '-')}</span>`;

        const cobroCell = isExempt
            ? `<span class="badge bg-info text-dark"><i class="bi bi-gift-fill me-1"></i> ${escCfg(loc.badge_exento || '')}</span>`
            : `<span class="badge bg-light text-secondary border">${escCfg(loc.badge_normal || '')}</span>`;

        const row = `
            <tr>
                <td class="ps-4 fw-bold text-dark">${nombreEsc}</td>
                <td class="text-center">${badgePreview}</td>
                <td class="text-center">${descCell}</td>
                <td class="text-center">${cobroCell}</td>
                <td class="text-end pe-4">
                    <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.openModalFormType(${t.IdTipoFormulario})">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-light border shadow-sm" onclick="window.deleteFormType(${t.IdTipoFormulario})">
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
    const emptyMsg = escCfg(tf().tabla_sin_filas || '');
    if ((htmlContent.match(/<tr>/g) || []).length === 1) {
        el.innerHTML = `
            ${htmlContent.replace('<tbody>', '')}
            <tbody><tr><td colspan="5" class="text-center py-4 text-muted fst-italic">${emptyMsg}</td></tr></tbody>
        `;
    } else {
        el.innerHTML = htmlContent + '</tbody>';
    }
}

window.openModalFormType = (id = null) => {
    const form = document.getElementById('form-type-config');
    form.reset();
    document.getElementById('type-id').value = '';
    const select = document.getElementById('type-cat');

    if (id) {
        const t = allTypes.find(x => x.IdTipoFormulario == id);
        if (t) {
            document.getElementById('type-id').value = t.IdTipoFormulario;
            document.getElementById('type-name').value = t.nombreTipo;
            select.value = t.categoriaformulario;
            document.getElementById('type-discount').value = t.descuento;
            document.getElementById('type-exempt').checked = (t.exento == 1);
            const colorEl = document.getElementById('type-color');
            if (colorEl) colorEl.value = (t.color || '');
        }
    } else {
        const activePane = document.querySelector('.tab-pane.active');

        if (activePane) {
            if (activePane.id === 'pane-animal') select.value = CAT_ANIMAL_LABEL;
            else if (activePane.id === 'pane-reactivos') select.value = CAT_REACTIVOS_LABEL;
            else if (activePane.id === 'pane-insumos') select.value = CAT_INSUMOS_LABEL;
        }
    }

    new bootstrap.Modal(document.getElementById('modal-form-type')).show();
};

async function saveFormType(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId'));
    const t = tf();

    try {
        const res = await API.request('/admin/config/form-types/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: t.swal_guardado || '', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-form-type')).hide();
            await loadData({ boot: false });
            return;
        }
        Swal.fire(t.swal_error_titulo || 'Error', res?.message || t.swal_error_guardar || '', 'error');
    } catch (err) {
        Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_guardar || '', 'error');
    }
}

window.deleteFormType = async (id) => {
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
        const res = await API.request('/admin/config/form-types/delete', 'POST', fd);

        if (res.status === 'success') {
            Swal.fire(t.swal_eliminado || '', t.swal_eliminado_texto || '', 'success');
            await loadData({ boot: false });
        } else {
            Swal.fire(t.swal_operacion_bloqueada || '', res.message || '', 'error');
        }
    } catch (e) {
        Swal.fire(t.swal_error_titulo || 'Error', t.swal_error_comunicacion || '', 'error');
    }
};
