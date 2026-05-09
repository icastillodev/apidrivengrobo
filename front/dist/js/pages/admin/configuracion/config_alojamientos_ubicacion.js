/**
 * Configuración: ubicación física de cajas (catálogos por institución + etiquetas UI).
 */
import { API } from '../../../api.js';

let state = { bundle: null };

/** Filas de carga/error alineadas con `<thead>` de cada tabla en `alojamientos-ubicacion.html`. */
const UBIC_TBODY_META = [
    { id: 'tbody-uf', colspan: 3 },
    { id: 'tbody-salon', colspan: 4 },
    { id: 'tbody-rack', colspan: 4 },
    { id: 'tbody-lugar', colspan: 4 }
];

function t(k, fb) {
    const o = window.txt?.config_aloj_ubicacion || {};
    return o[k] || fb || k;
}

export async function initConfigAlojamientoUbicacion() {
    document.getElementById('btn-save-labels')?.addEventListener('click', saveLabels);
    document.getElementById('btn-reload')?.addEventListener('click', () => loadAll('inline'));
    const finp = document.getElementById('inp-filter-ubic');
    if (finp) {
        finp.placeholder = t('filter_catalog_ph', finp.placeholder || '');
        finp.addEventListener('input', () => renderTables());
    }
    // La página (`alojamientos-ubicacion.html`) ya muestra el loader global; `boot` no llama showLoader aquí.
    await loadAll('boot');
}

async function fetchUbicBundleAndApply() {
    const res = await API.request('/admin/config/alojamiento/ubicacion/bundle');
    if (res.status !== 'success' || !res.data) {
        throw new Error(res.message || 'Error al cargar');
    }
    state.bundle = res.data;
    renderLabels(res.data.labels || {});
    renderTables();
}

/**
 * Spinners en tablas + deshabilita recarga/guardar etiquetas; ejecuta `work()` y luego refresca el bundle.
 * Errores: restaura filas desde `state.bundle` si existe; el llamador puede mostrar Swal.
 */
async function withUbicTablesInlineBusy(work) {
    const btnReload = document.getElementById('btn-reload');
    const btnSave = document.getElementById('btn-save-labels');
    setUbicTablesLoadingRows();
    if (btnReload) btnReload.disabled = true;
    if (btnSave) btnSave.disabled = true;
    try {
        await work();
        await fetchUbicBundleAndApply();
    } catch (e) {
        console.error(e);
        if (state.bundle) renderTables();
        else setUbicTablesErrorRows(t('error_recarga_catalogo', 'No se pudo cargar el catálogo.'));
        throw e;
    } finally {
        if (btnReload) btnReload.disabled = false;
        if (btnSave) btnSave.disabled = false;
    }
}

/**
 * @param {'boot'|'inline'|'none'} loadingMode
 * - `boot`: primera carga; el HTML ya muestra loader global (no overlay aquí).
 * - `inline`: recarga manual → spinners en los cuatro `<tbody>` (sin overlay de página).
 * - `none`: solo refresca bundle (uso interno legado; preferir `withUbicTablesInlineBusy`).
 */
async function loadAll(loadingMode = 'none') {
    const inline = loadingMode === 'inline';
    const btnReload = document.getElementById('btn-reload');
    if (inline) {
        setUbicTablesLoadingRows();
        if (btnReload) btnReload.disabled = true;
    }
    try {
        await fetchUbicBundleAndApply();
    } catch (e) {
        console.error(e);
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
        if (inline) {
            if (state.bundle) renderTables();
            else setUbicTablesErrorRows(t('error_recarga_catalogo', 'No se pudo cargar el catálogo.'));
        }
    } finally {
        if (inline && btnReload) btnReload.disabled = false;
    }
}

function setUbicTablesLoadingRows() {
    const msg = escapeHtml(t('tabla_cargando', window.txt?.generales?.msg_cargando || '…'));
    const rowHtml = (colspan) =>
        `<tr><td colspan="${colspan}" class="text-center py-4">` +
        `<div class="spinner-border spinner-border-sm text-primary" role="status"></div>` +
        `<div class="small text-muted mt-2">${msg}</div></td></tr>`;
    UBIC_TBODY_META.forEach(({ id, colspan }) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = rowHtml(colspan);
    });
}

function setUbicTablesErrorRows(text) {
    const cell = escapeHtml(text);
    UBIC_TBODY_META.forEach(({ id, colspan }) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-danger small py-3">${cell}</td></tr>`;
    });
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
    try {
        await withUbicTablesInlineBusy(async () => {
            const res = await API.request('/admin/config/alojamiento/ubicacion/labels', 'POST', payload);
            if (res.status !== 'success') throw new Error(res.message || 'Error');
            Swal.fire(t('swal_ok', 'Listo'), t('msg_labels_saved', 'Etiquetas guardadas.'), 'success');
        });
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
    }
}

function catalogFilterQuery() {
    return (document.getElementById('inp-filter-ubic')?.value || '').trim().toLowerCase();
}

function rowMatchesFilter(tipo, row) {
    const q = catalogFilterQuery();
    if (!q) return true;
    const hay = (s) => String(s ?? '').toLowerCase().includes(q);
    if (tipo === 'uf') return hay(row.Nombre);
    if (tipo === 'salon') {
        return hay(row.Nombre) || hay(nombreUfPlain(row.IdUbicacionFisica));
    }
    if (tipo === 'rack') {
        return hay(row.Nombre) || hay(nombreSalonPlain(row.IdSalon));
    }
    if (tipo === 'lugar') {
        const rack = (state.bundle?.racks || []).find(x => String(x.IdRack) === String(row.IdRack));
        return hay(row.Nombre) || hay(row.NombreRack) || hay(nombreSalonPlain(rack?.IdSalon));
    }
    return true;
}

function nombreUfPlain(id) {
    if (!id) return '';
    const r = (state.bundle?.ubicacionesFisicas || []).find(x => String(x.IdUbicacionFisica) === String(id));
    return r ? String(r.Nombre) : '';
}

function nombreSalonPlain(id) {
    if (!id) return '';
    const r = (state.bundle?.salones || []).find(x => String(x.IdSalon) === String(id));
    return r ? String(r.Nombre) : '';
}

function sortedRacks(rows) {
    const copy = [...rows];
    copy.sort((a, b) => {
        const sa = nombreSalonPlain(a.IdSalon).toLowerCase();
        const sb = nombreSalonPlain(b.IdSalon).toLowerCase();
        if (sa !== sb) return sa.localeCompare(sb);
        const oa = Number(a.Orden) || 0;
        const ob = Number(b.Orden) || 0;
        if (oa !== ob) return oa - ob;
        return String(a.Nombre || '').localeCompare(String(b.Nombre || ''), undefined, { sensitivity: 'base' });
    });
    return copy;
}

function sortedLugares(rows) {
    const racks = state.bundle?.racks || [];
    const salonOfRack = (idRack) => {
        const rack = racks.find(x => String(x.IdRack) === String(idRack));
        return nombreSalonPlain(rack?.IdSalon).toLowerCase();
    };
    const copy = [...rows];
    copy.sort((a, b) => {
        const sa = salonOfRack(a.IdRack);
        const sb = salonOfRack(b.IdRack);
        if (sa !== sb) return sa.localeCompare(sb);
        const ra = String(a.NombreRack || '').toLowerCase();
        const rb = String(b.NombreRack || '').toLowerCase();
        if (ra !== rb) return ra.localeCompare(rb);
        const oa = Number(a.Orden) || 0;
        const ob = Number(b.Orden) || 0;
        if (oa !== ob) return oa - ob;
        return String(a.Nombre || '').localeCompare(String(b.Nombre || ''), undefined, { sensitivity: 'base' });
    });
    return copy;
}

function renderTables() {
    const b = state.bundle;
    if (!b) return;

    const ufs = (b.ubicacionesFisicas || []).filter(r => rowMatchesFilter('uf', r));
    const salones = (b.salones || []).filter(r => rowMatchesFilter('salon', r));
    const racks = sortedRacks(b.racks || []).filter(r => rowMatchesFilter('rack', r));
    const lugares = sortedLugares(b.lugaresRack || []).filter(r => rowMatchesFilter('lugar', r));

    renderTableBody('tbody-uf', ufs, 'uf', [
        r => escapeHtml(r.Nombre),
        r => badgeActivo(r.Activo),
        r => accionesRow('uf', r)
    ]);

    renderTableBody('tbody-salon', salones, 'salon', [
        r => escapeHtml(r.Nombre),
        r => nombreUf(r.IdUbicacionFisica),
        r => badgeActivo(r.Activo),
        r => accionesRow('salon', r)
    ]);

    renderTableBody('tbody-rack', racks, 'rack', [
        r => escapeHtml(r.Nombre),
        r => nombreSalon(r.IdSalon),
        r => badgeActivo(r.Activo),
        r => accionesRow('rack', r)
    ]);

    renderTableBody('tbody-lugar', lugares, 'lugar', [
        r => escapeHtml(r.Nombre),
        r => escapeHtml(r.NombreRack || '-'),
        r => badgeActivo(r.Activo),
        r => accionesRow('lugar', r)
    ]);
}

function nombreUf(id) {
    if (!id) return '—';
    const r = (state.bundle?.ubicacionesFisicas || []).find(x => String(x.IdUbicacionFisica) === String(id));
    return r ? escapeHtml(r.Nombre) : `#${id}`;
}

function nombreSalon(id) {
    if (!id) return '—';
    const r = (state.bundle?.salones || []).find(x => String(x.IdSalon) === String(id));
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
    const idNum = Number(id);
    const delBtn = idNum > 0
        ? `<button type="button" class="btn btn-sm btn-outline-danger ms-1" onclick="window._deleteUbicCat('${tipo}',${idNum})">${escapeHtml(t('btn_delete', 'Eliminar'))}</button>`
        : '';
    return `
        <button type="button" class="btn btn-sm btn-outline-primary me-1">${t('btn_edit', 'Editar')}</button>
        <button type="button" class="btn btn-sm btn-outline-warning" onclick="window._toggleUbicCat('${tipo}',${idNum},${Number(row.Activo) === 1 ? 0 : 1})">${Number(row.Activo) === 1 ? t('btn_deactivate', 'Desactivar') : t('btn_activate', 'Activar')}</button>${delBtn}`;
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
    try {
        await withUbicTablesInlineBusy(async () => {
            const res = await API.request('/admin/config/alojamiento/ubicacion/catalog/toggle', 'POST', { tipo, id, activo });
            if (res.status !== 'success') throw new Error(res.message || 'Error');
        });
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
    }
};

function rowNombreForDelete(tipo, id) {
    const b = state.bundle;
    if (!b) return '';
    if (tipo === 'uf') return (b.ubicacionesFisicas || []).find(r => Number(r.IdUbicacionFisica) === id)?.Nombre || '';
    if (tipo === 'salon') return (b.salones || []).find(r => Number(r.IdSalon) === id)?.Nombre || '';
    if (tipo === 'rack') return (b.racks || []).find(r => Number(r.IdRack) === id)?.Nombre || '';
    return (b.lugaresRack || []).find(r => Number(r.IdLugarRack) === id)?.Nombre || '';
}

window._deleteUbicCat = async function (tipo, id) {
    const idNum = Number(id);
    if (!idNum || idNum <= 0) return;
    const nom = rowNombreForDelete(tipo, idNum);
    const extra = tipo === 'rack' ? `<p class="small text-muted mb-0">${escapeHtml(t('delete_warn_rack', ''))}</p>` : '';
    const r = await Swal.fire({
        icon: 'warning',
        title: t('delete_confirm_title', '¿Eliminar?'),
        html: `<p>${escapeHtml(t('delete_confirm_text', 'Se eliminará del catálogo.'))}</p><p class="fw-bold">${escapeHtml(nom || `#${idNum}`)}</p>${extra}`,
        showCancelButton: true,
        confirmButtonText: t('delete_confirm_btn', 'Eliminar'),
        cancelButtonText: t('delete_cancel_btn', 'Cancelar'),
        confirmButtonColor: '#dc3545'
    });
    if (!r.isConfirmed) return;
    try {
        await withUbicTablesInlineBusy(async () => {
            const res = await API.request('/admin/config/alojamiento/ubicacion/catalog/delete', 'POST', { tipo, id: idNum });
            if (res.status !== 'success') throw new Error(res.message || 'Error');
            Swal.fire(t('swal_ok', 'Listo'), t('msg_cat_deleted', 'Eliminado.'), 'success');
        });
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
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
    try {
        await withUbicTablesInlineBusy(async () => {
            const res = await API.request('/admin/config/alojamiento/ubicacion/catalog/save', 'POST', payload);
            if (res.status !== 'success') throw new Error(res.message || 'Error');
            Swal.fire(t('swal_ok', 'Listo'), t('msg_cat_saved', 'Guardado.'), 'success');
        });
    } catch (e) {
        Swal.fire(t('swal_error', 'Error'), String(e.message || e), 'error');
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
