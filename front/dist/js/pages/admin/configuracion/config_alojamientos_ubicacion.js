/**
 * Configuración: ubicación física de cajas (catálogos por institución + etiquetas UI).
 */
import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

let state = { bundle: null };

function t(k, fb) {
    const o = window.txt?.config_aloj_ubicacion || {};
    return o[k] || fb || k;
}

export async function initConfigAlojamientoUbicacion() {
    document.getElementById('btn-save-labels')?.addEventListener('click', saveLabels);
    document.getElementById('btn-reload')?.addEventListener('click', () => loadAll(true));
    await loadAll(true);
}

async function loadAll(showLoading) {
    if (showLoading) showLoader();
    try {
        const res = await API.request('/admin/config/alojamiento/ubicacion/bundle');
        if (res.status !== 'success' || !res.data) {
            throw new Error(res.message || 'Error al cargar');
        }
        state.bundle = res.data;
        renderLabels(res.data.labels || {});
        renderTables();
    } catch (e) {
        console.error(e);
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
    } finally {
        if (showLoading) hideLoader();
    }
}

function renderLabels(lbl) {
    const ids = ['inp-lbl-uf', 'inp-lbl-salon', 'inp-lbl-rack', 'inp-lbl-lugar', 'inp-lbl-com'];
    const keys = ['LabelLugarFisico', 'LabelSalon', 'LabelRack', 'LabelLugarRack', 'LabelComentarioUbicacion'];
    keys.forEach((k, i) => {
        const el = document.getElementById(ids[i]);
        if (el) el.value = lbl[k] || '';
    });
}

async function saveLabels() {
    const payload = {
        LabelLugarFisico: document.getElementById('inp-lbl-uf')?.value || '',
        LabelSalon: document.getElementById('inp-lbl-salon')?.value || '',
        LabelRack: document.getElementById('inp-lbl-rack')?.value || '',
        LabelLugarRack: document.getElementById('inp-lbl-lugar')?.value || '',
        LabelComentarioUbicacion: document.getElementById('inp-lbl-com')?.value || ''
    };
    showLoader();
    try {
        const res = await API.request('/admin/config/alojamiento/ubicacion/labels', 'POST', payload);
        if (res.status !== 'success') throw new Error(res.message || 'Error');
        Swal.fire(t('swal_ok', 'Listo'), t('msg_labels_saved', 'Etiquetas guardadas.'), 'success');
        await loadAll(false);
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
    } finally {
        hideLoader();
    }
}

function renderTables() {
    const b = state.bundle;
    if (!b) return;

    renderTableBody('tbody-uf', b.ubicacionesFisicas || [], 'uf', [
        r => escapeHtml(r.Nombre),
        r => badgeActivo(r.Activo),
        r => accionesRow('uf', r)
    ]);

    renderTableBody('tbody-salon', b.salones || [], 'salon', [
        r => escapeHtml(r.Nombre),
        r => nombreUf(r.IdUbicacionFisica),
        r => badgeActivo(r.Activo),
        r => accionesRow('salon', r)
    ]);

    renderTableBody('tbody-rack', b.racks || [], 'rack', [
        r => escapeHtml(r.Nombre),
        r => nombreSalon(r.IdSalon),
        r => badgeActivo(r.Activo),
        r => accionesRow('rack', r)
    ]);

    renderTableBody('tbody-lugar', b.lugaresRack || [], 'lugar', [
        r => escapeHtml(r.Nombre),
        r => escapeHtml(r.NombreRack || '-'),
        r => badgeActivo(r.Activo),
        r => accionesRow('lugar', r)
    ]);
}

function nombreUf(id) {
    if (!id) return '—';
    const r = (state.bundle.ubicacionesFisicas || []).find(x => String(x.IdUbicacionFisica) === String(id));
    return r ? escapeHtml(r.Nombre) : `#${id}`;
}

function nombreSalon(id) {
    if (!id) return '—';
    const r = (state.bundle.salones || []).find(x => String(x.IdSalon) === String(id));
    return r ? escapeHtml(r.Nombre) : `#${id}`;
}

function badgeActivo(a) {
    const on = Number(a) === 1;
    return on
        ? `<span class="badge bg-success">${escapeHtml(t('estado_activo', 'Activo'))}</span>`
        : `<span class="badge bg-secondary">${escapeHtml(t('estado_inactivo', 'Inactivo'))}</span>`;
}

function accionesRow(tipo, row) {
    const id = tipo === 'uf' ? row.IdUbicacionFisica
        : tipo === 'salon' ? row.IdSalon
        : tipo === 'rack' ? row.IdRack
        : row.IdLugarRack;
    return `
        <button type="button" class="btn btn-sm btn-outline-primary me-1">${t('btn_edit', 'Editar')}</button>
        <button type="button" class="btn btn-sm btn-outline-warning" onclick="window._toggleUbicCat('${tipo}',${id},${Number(row.Activo) === 1 ? 0 : 1})">${Number(row.Activo) === 1 ? t('btn_deactivate', 'Desactivar') : t('btn_activate', 'Activar')}</button>`;
}

function renderTableBody(tbodyId, rows, tipo, colFns) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="${colFns.length}" class="text-center text-muted py-3">${escapeHtml(t('tab_vacio', 'Sin registros.'))}</td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(r => {
        const tds = colFns.map(fn => `<td>${fn(r)}</td>`).join('');
        return `<tr>${tds}</tr>`;
    }).join('');

    tbody.querySelectorAll('button.btn-outline-primary').forEach((btn, idx) => {
        btn.onclick = () => openEditModal(tipo, rows[idx]);
    });
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window._toggleUbicCat = async function (tipo, id, activo) {
    showLoader();
    try {
        const res = await API.request('/admin/config/alojamiento/ubicacion/catalog/toggle', 'POST', { tipo, id, activo });
        if (res.status !== 'success') throw new Error(res.message || 'Error');
        await loadAll(false);
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
    } finally {
        hideLoader();
    }
};

function openEditModal(tipo, row) {
    const b = state.bundle;
    const commonNombre = row?.Nombre || '';
    const commonActivo = Number(row?.Activo) === 1 ? 1 : 0;

    if (tipo === 'uf') {
        Swal.fire({
            title: t('modal_uf_titulo', 'Lugar físico'),
            html: buildFieldsNombreActivo(commonNombre, commonActivo),
            showCancelButton: true,
            confirmButtonText: t('btn_guardar', 'Guardar'),
            preConfirm: () => ({
                tipo: 'uf',
                IdUbicacionFisica: row.IdUbicacionFisica,
                Nombre: document.getElementById('swal-nom').value,
                Orden: 0,
                Activo: document.getElementById('swal-act').checked ? 1 : 0
            })
        }).then(async (r) => { if (r.isConfirmed && r.value) await saveCatalog(r.value); });
        return;
    }

    if (tipo === 'salon') {
        const optsUf = (b.ubicacionesFisicas || []).map(u =>
            `<option value="${u.IdUbicacionFisica}" ${String(row.IdUbicacionFisica) === String(u.IdUbicacionFisica) ? 'selected' : ''}>${escapeHtml(u.Nombre)}</option>`
        ).join('');
        Swal.fire({
            title: t('modal_salon_titulo', 'Salón / sala'),
            html: `
                <label class="form-label small">${t('lbl_opcional_uf', 'Lugar físico (opcional)')}</label>
                <select id="swal-uf" class="form-select mb-2"><option value="">—</option>${optsUf}</select>
                ${buildFieldsNombreActivo(commonNombre, commonActivo)}`,
            showCancelButton: true,
            confirmButtonText: t('btn_guardar', 'Guardar'),
            didOpen: () => { document.getElementById('swal-uf').value = row.IdUbicacionFisica || ''; },
            preConfirm: () => ({
                tipo: 'salon',
                IdSalon: row.IdSalon,
                IdUbicacionFisica: document.getElementById('swal-uf').value || null,
                Nombre: document.getElementById('swal-nom').value,
                Orden: 0,
                Activo: document.getElementById('swal-act').checked ? 1 : 0
            })
        }).then(async (r) => { if (r.isConfirmed && r.value) await saveCatalog(r.value); });
        return;
    }

    if (tipo === 'rack') {
        const optsS = (b.salones || []).map(s =>
            `<option value="${s.IdSalon}" ${String(row.IdSalon) === String(s.IdSalon) ? 'selected' : ''}>${escapeHtml(s.Nombre)}</option>`
        ).join('');
        Swal.fire({
            title: t('modal_rack_titulo', 'Rack'),
            html: `
                <label class="form-label small">${t('lbl_opcional_salon', 'Salón (opcional)')}</label>
                <select id="swal-salon" class="form-select mb-2"><option value="">—</option>${optsS}</select>
                ${buildFieldsNombreActivo(commonNombre, commonActivo)}`,
            showCancelButton: true,
            confirmButtonText: t('btn_guardar', 'Guardar'),
            didOpen: () => { document.getElementById('swal-salon').value = row.IdSalon || ''; },
            preConfirm: () => ({
                tipo: 'rack',
                IdRack: row.IdRack,
                IdSalon: document.getElementById('swal-salon').value || null,
                Nombre: document.getElementById('swal-nom').value,
                Orden: 0,
                Activo: document.getElementById('swal-act').checked ? 1 : 0
            })
        }).then(async (r) => { if (r.isConfirmed && r.value) await saveCatalog(r.value); });
        return;
    }

    if (tipo === 'lugar') {
        const optsR = (b.racks || []).map(x =>
            `<option value="${x.IdRack}" ${String(row.IdRack) === String(x.IdRack) ? 'selected' : ''}>${escapeHtml(x.Nombre)}</option>`
        ).join('');
        Swal.fire({
            title: t('modal_lugar_titulo', 'Posición en rack'),
            html: `
                <label class="form-label small">${t('lbl_rack_req', 'Rack')}</label>
                <select id="swal-rack" class="form-select mb-2">${optsR}</select>
                ${buildFieldsNombreActivo(commonNombre, commonActivo)}`,
            showCancelButton: true,
            confirmButtonText: t('btn_guardar', 'Guardar'),
            didOpen: () => { document.getElementById('swal-rack').value = row.IdRack || ''; },
            preConfirm: () => ({
                tipo: 'lugar',
                IdLugarRack: row.IdLugarRack,
                IdRack: parseInt(document.getElementById('swal-rack').value, 10),
                Nombre: document.getElementById('swal-nom').value,
                Orden: 0,
                Activo: document.getElementById('swal-act').checked ? 1 : 0
            })
        }).then(async (r) => { if (r.isConfirmed && r.value) await saveCatalog(r.value); });
    }
}

function buildFieldsNombreActivo(nombre, activo) {
    return `
        <input id="swal-nom" class="form-control mb-2" placeholder="${t('ph_nombre', 'Nombre')}" value="${escapeHtml(nombre)}">
        <div class="form-check text-start">
            <input class="form-check-input" type="checkbox" id="swal-act" ${activo ? 'checked' : ''}>
            <label class="form-check-label" for="swal-act">${t('lbl_activo', 'Activo')}</label>
        </div>`;
}

async function saveCatalog(payload) {
    showLoader();
    try {
        const res = await API.request('/admin/config/alojamiento/ubicacion/catalog/save', 'POST', payload);
        if (res.status !== 'success') throw new Error(res.message || 'Error');
        Swal.fire(t('swal_ok', 'Listo'), t('msg_cat_saved', 'Guardado.'), 'success');
        await loadAll(false);
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
    } finally {
        hideLoader();
    }
}

window.openNewUbic = function (tipo) {
    if (tipo === 'uf') return openEditModal('uf', {});
    if (tipo === 'salon') return openEditModal('salon', { Nombre: '', Activo: 1, IdUbicacionFisica: null });
    if (tipo === 'rack') return openEditModal('rack', { Nombre: '', Activo: 1, IdSalon: null });
    if (tipo === 'lugar') {
        const firstRack = (state.bundle?.racks || [])[0];
        if (!firstRack) {
            Swal.fire(t('swal_error', 'Error'), t('msg_sin_rack', 'Cree al menos un rack antes de cargar posiciones.'), 'warning');
            return;
        }
        return openEditModal('lugar', { Nombre: '', Activo: 1, IdRack: firstRack.IdRack });
    }
};
