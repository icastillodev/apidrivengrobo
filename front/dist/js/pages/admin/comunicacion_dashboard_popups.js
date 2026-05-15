import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function val(id) {
    const el = document.getElementById(id);
    return el ? String(el.value ?? '').trim() : '';
}

function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v ?? '';
}

const b2 = {
    PopupPortadaImagenB2Key: null,
    PopupPortadaImagenNombre: null,
    PopupAdjunto1B2Key: null,
    PopupAdjunto1Nombre: null,
    PopupAdjunto2B2Key: null,
    PopupAdjunto2Nombre: null,
};

/** Vista previa local (object URL) de la imagen del popup; revocar al cambiar o limpiar. */
let dpPortadaObjUrl = null;

function revokeDpPortadaPreview() {
    if (dpPortadaObjUrl) {
        try {
            URL.revokeObjectURL(dpPortadaObjUrl);
        } catch (_) {
            /* ignore */
        }
        dpPortadaObjUrl = null;
    }
    const wrap = document.getElementById('dp-wrap-preview-portada');
    const img = document.getElementById('dp-preview-portada');
    if (wrap) wrap.classList.add('d-none');
    if (img) {
        img.removeAttribute('src');
        img.alt = '';
    }
}

function syncDpPortadaPreview() {
    revokeDpPortadaPreview();
    const f = document.getElementById('dp-file-portada')?.files?.[0];
    const wrap = document.getElementById('dp-wrap-preview-portada');
    const img = document.getElementById('dp-preview-portada');
    if (!f || !wrap || !img) return;
    dpPortadaObjUrl = URL.createObjectURL(f);
    img.src = dpPortadaObjUrl;
    img.alt = window.txt?.comunicacion?.admin_img_preview_alt || '';
    wrap.classList.remove('d-none');
}

function hasPendingDpB2Files() {
    return !!(
        document.getElementById('dp-file-portada')?.files?.[0]
        || document.getElementById('dp-file-d1')?.files?.[0]
        || document.getElementById('dp-file-d2')?.files?.[0]
    );
}

function hydrateB2FromRow(d) {
    if (!d || typeof d !== 'object') return;
    b2.PopupPortadaImagenB2Key = d.PopupPortadaImagenB2Key || null;
    b2.PopupPortadaImagenNombre = d.PopupPortadaImagenNombre || null;
    b2.PopupAdjunto1B2Key = d.PopupAdjunto1B2Key || null;
    b2.PopupAdjunto1Nombre = d.PopupAdjunto1Nombre || null;
    b2.PopupAdjunto2B2Key = d.PopupAdjunto2B2Key || null;
    b2.PopupAdjunto2Nombre = d.PopupAdjunto2Nombre || null;
}

function resetB2() {
    hydrateB2FromRow(null);
    revokeDpPortadaPreview();
    ['dp-file-portada', 'dp-file-d1', 'dp-file-d2'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function renderPortadaUi(tc) {
    const prefix = tc.pp_b2_status_uploaded || '';
    const pending = document.getElementById('dp-file-portada')?.files?.[0];
    const st = document.getElementById('dp-status-portada');
    const prev = document.getElementById('dp-btn-prev-portada');
    const clr = document.getElementById('dp-btn-clear-portada');
    const id = parseInt(document.getElementById('dp-edit-id')?.value || '0', 10);
    const hasSaved = b2.PopupPortadaImagenB2Key && String(b2.PopupPortadaImagenB2Key).length > 0;

    if (pending && st) {
        st.textContent = `${tc.popup_admin_file_selected || ''} ${pending.name}`.trim();
        if (prev) prev.classList.remove('d-none');
        if (clr) clr.classList.remove('d-none');
        return;
    }

    if (st) {
        st.textContent = hasSaved && b2.PopupPortadaImagenNombre ? `${prefix} ${b2.PopupPortadaImagenNombre}`.trim() : '';
    }
    if (prev) {
        prev.classList.toggle('d-none', !hasSaved || !id);
    }
    if (clr) {
        clr.classList.toggle('d-none', !hasSaved);
    }
}

function renderB2Ui(tc) {
    renderPortadaUi(tc);
    const prefix = tc.pp_b2_status_uploaded || '';
    const rows = [
        { keyK: 'PopupAdjunto1B2Key', keyN: 'PopupAdjunto1Nombre', statusId: 'dp-status-d1', prevId: 'dp-btn-prev-d1', clearId: 'dp-btn-clear-d1', fileId: 'dp-file-d1' },
        { keyK: 'PopupAdjunto2B2Key', keyN: 'PopupAdjunto2Nombre', statusId: 'dp-status-d2', prevId: 'dp-btn-prev-d2', clearId: 'dp-btn-clear-d2', fileId: 'dp-file-d2' },
    ];
    for (const row of rows) {
        const k = b2[row.keyK];
        const n = b2[row.keyN];
        const st = document.getElementById(row.statusId);
        const prev = document.getElementById(row.prevId);
        const clr = document.getElementById(row.clearId);
        const pending = document.getElementById(row.fileId)?.files?.[0];
        const id = parseInt(document.getElementById('dp-edit-id')?.value || '0', 10);
        const has = k && String(k).length > 0;

        if (pending && st) {
            st.textContent = `${tc.popup_admin_file_selected || ''} ${pending.name}`.trim();
            if (prev) prev.classList.remove('d-none');
            if (clr) clr.classList.remove('d-none');
            continue;
        }

        if (st) st.textContent = has && n ? `${prefix} ${n}`.trim() : '';
        if (prev) {
            prev.classList.toggle('d-none', !has || !id);
        }
        if (clr) clr.classList.toggle('d-none', !has);
    }
}

/**
 * Abre una pestaña en blanco en el clic (síncrono) y luego asigna el blob.
 * Si primero se hace await fetch y después window.open, el navegador suele bloquear la ventana emergente.
 */
async function openPreviewAdmin(idPopup, tipo) {
    const tc = window.txt?.comunicacion || {};
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const url = `${API.urlBase}/admin/comunicacion/dashboard-popup/archivo/${idPopup}/${tipo}`;
    const previewWin = window.open('about:blank', '_blank');
    if (!previewWin) {
        throw new Error(tc.admin_noticia_preview_popup_blocked || tc.pp_b2_preview_fail || '');
    }
    try {
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) {
            let detail = String(res.status);
            try {
                const txt = await res.clone().text();
                const plain = String(txt || '').trim();
                if (plain && plain.length < 500 && !plain.startsWith('{')) {
                    detail = plain;
                }
            } catch (_) {}
            previewWin.close();
            throw new Error(detail);
        }
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        previewWin.location.href = objUrl;
        setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
    } catch (e) {
        try {
            previewWin.close();
        } catch (_) {}
        throw e;
    }
}

function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

/** @type {null|unknown[]} null = aún no se cargó desde la API */
let newsPickerCache = null;
let newsPickerSelectedId = '';

function renderNewsSelect(tc) {
    const sel = document.getElementById('dp-noticia-select');
    if (!sel) return;
    const rows = Array.isArray(newsPickerCache) ? newsPickerCache : [];
    const filterRaw = (document.getElementById('dp-noticia-filter')?.value || '').trim().toLowerCase();
    const wantId = newsPickerSelectedId ? String(newsPickerSelectedId) : '';

    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = tc.popup_admin_noticia_sin_enlace || '—';
    sel.appendChild(opt0);

    for (const r of rows) {
        const id = String(r.IdNoticia ?? '');
        const tit = String(r.Titulo || '—');
        if (filterRaw && wantId !== id && !tit.toLowerCase().includes(filterRaw)) continue;
        const o = document.createElement('option');
        o.value = id;
        o.textContent = `#${id} — ${tit}`;
        sel.appendChild(o);
    }

    if (wantId && !Array.from(sel.options).some((o) => o.value === wantId)) {
        const o = document.createElement('option');
        o.value = wantId;
        o.textContent = `#${wantId} ${tc.popup_admin_noticia_fuera_lista || ''}`;
        sel.appendChild(o);
    }

    sel.value = wantId;
}

async function ensureNewsPickerCache(tc) {
    if (newsPickerCache !== null) return;
    const collected = [];
    let page = 1;
    const pageSize = 50;
    let warned = false;
    try {
        while (page <= 40) {
            const res = await API.request(`/admin/comunicacion/noticias?page=${page}&pageSize=${pageSize}`, 'GET');
            if (res.status !== 'success' || !Array.isArray(res.data)) {
                if (!warned && page === 1) {
                    warned = true;
                    await window.Swal?.fire?.({
                        icon: 'warning',
                        text: res.message || tc.popup_admin_err_cargar_noticias || tc.err_generico || '',
                    });
                }
                break;
            }
            const total = parseInt(res.total, 10) || 0;
            for (const r of res.data) {
                if (parseInt(r.Publicado, 10) === 1) {
                    collected.push(r);
                }
            }
            if (res.data.length < pageSize) break;
            if (page * pageSize >= total) break;
            page += 1;
        }
        collected.sort((a, b) => {
            const ta = new Date(a.FechaPublicacion || a.FechaCreacion || 0).getTime();
            const tb = new Date(b.FechaPublicacion || b.FechaCreacion || 0).getTime();
            return tb - ta;
        });
    } catch (e) {
        console.error(e);
    }
    newsPickerCache = collected;
}

async function refreshNewsPicker(tc) {
    await ensureNewsPickerCache(tc);
    renderNewsSelect(tc);
}

/**
 * Sube a B2 solo los inputs con archivo elegido (al guardar).
 * @param {number} idPopupEdicion Id del popup en edición (0 si es nuevo).
 */
async function uploadPendingB2Files(tc, idPopupEdicion) {
    const portadaInp = document.getElementById('dp-file-portada');
    const pf = portadaInp?.files?.[0];
    if (pf) {
        const fd = new FormData();
        fd.append('file', pf);
        const res = await API.request('/comunicacion/b2/upload/popup-portada-imagen', 'POST', fd);
        if (res.status !== 'success' || !res.data) {
            throw new Error(res.message || tc.pp_b2_err_upload || '');
        }
        const d = res.data;
        b2.PopupPortadaImagenB2Key = d.PopupPortadaImagenB2Key ?? null;
        b2.PopupPortadaImagenNombre = d.PopupPortadaImagenNombre ?? null;
    }

    for (const slot of [1, 2]) {
        const inp = document.getElementById(slot === 1 ? 'dp-file-d1' : 'dp-file-d2');
        const file = inp?.files?.[0];
        if (!file) continue;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('slot', String(slot));
        if (idPopupEdicion > 0) fd.append('idPopup', String(idPopupEdicion));
        const res = await API.request('/comunicacion/b2/upload/popup-documento', 'POST', fd);
        if (res.status !== 'success' || !res.data) {
            throw new Error(res.message || tc.pp_b2_err_upload || '');
        }
        const d = res.data;
        if (slot === 1) {
            b2.PopupAdjunto1B2Key = d.PopupAdjunto1B2Key ?? null;
            b2.PopupAdjunto1Nombre = d.PopupAdjunto1Nombre ?? null;
            setVal('dp-url1', '');
            setVal('dp-nombre1', '');
        } else {
            b2.PopupAdjunto2B2Key = d.PopupAdjunto2B2Key ?? null;
            b2.PopupAdjunto2Nombre = d.PopupAdjunto2Nombre ?? null;
            setVal('dp-url2', '');
            setVal('dp-nombre2', '');
        }
    }
}

export async function initDashboardPopupsAdmin() {
    const tc = window.txt?.comunicacion || {};
    const tbody = document.getElementById('dp-tbody');
    const modalEl = document.getElementById('modal-dashboard-popup');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    let editingId = 0;

    function fillModalFromRow(row) {
        revokeDpPortadaPreview();
        editingId = row ? parseInt(row.IdDashboardPopup, 10) : 0;
        const hid = document.getElementById('dp-edit-id');
        if (hid) hid.value = editingId ? String(editingId) : '';
        hydrateB2FromRow(row || null);
        setVal('dp-nombre-interno', row?.NombreInterno || '');
        setVal('dp-titulo', row?.PopupTitulo || '');
        setVal('dp-cuerpo', row?.PopupCuerpo || '');
        const nf = document.getElementById('dp-noticia-filter');
        if (nf) nf.value = '';
        const pid = row?.PopupIdNoticia;
        newsPickerSelectedId =
            pid != null && String(pid).trim() !== '' && String(pid).trim() !== '0'
                ? String(pid).trim()
                : '';
        setVal('dp-url1', row?.PopupUrlAdjunto1 || '');
        setVal('dp-nombre1', row?.PopupNombreAdjunto1 || '');
        setVal('dp-url2', row?.PopupUrlAdjunto2 || '');
        setVal('dp-nombre2', row?.PopupNombreAdjunto2 || '');
        const chk = document.getElementById('dp-activo');
        if (chk) chk.checked = row ? parseInt(row.PopupActivo, 10) === 1 : false;
        ['dp-file-portada', 'dp-file-d1', 'dp-file-d2'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        renderB2Ui(tc);
        const mt = document.getElementById('dp-modal-title');
        if (mt) {
            mt.textContent = editingId
                ? (tc.popup_admin_modal_editar || '')
                : (tc.popup_admin_modal_nuevo || '');
        }
    }

    function buildPayload() {
        const rawNews = val('dp-noticia-select');
        const parsedNews = rawNews ? parseInt(rawNews, 10) : NaN;
        return {
            ...(editingId ? { IdDashboardPopup: editingId } : {}),
            NombreInterno: val('dp-nombre-interno') || null,
            PopupTitulo: val('dp-titulo') || null,
            PopupCuerpo: val('dp-cuerpo') || null,
            PopupPortadaImagenB2Key: b2.PopupPortadaImagenB2Key,
            PopupPortadaImagenNombre: b2.PopupPortadaImagenNombre,
            PopupUrlAdjunto1: val('dp-url1') || null,
            PopupNombreAdjunto1: val('dp-nombre1') || null,
            PopupUrlAdjunto2: val('dp-url2') || null,
            PopupNombreAdjunto2: val('dp-nombre2') || null,
            PopupAdjunto1B2Key: b2.PopupAdjunto1B2Key,
            PopupAdjunto1Nombre: b2.PopupAdjunto1Nombre,
            PopupAdjunto2B2Key: b2.PopupAdjunto2B2Key,
            PopupAdjunto2Nombre: b2.PopupAdjunto2Nombre,
            PopupIdNoticia: Number.isFinite(parsedNews) && parsedNews > 0 ? parsedNews : null,
            PopupActivo: document.getElementById('dp-activo')?.checked ? 1 : 0,
        };
    }

    async function cargarLista() {
        const res = await API.request('/admin/comunicacion/dashboard-popups', 'GET');
        if (res.status !== 'success' || !Array.isArray(res.data)) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-danger p-3">${escapeHtml(res.message || tc.popup_admin_err_list || tc.err_generico || '')}</td></tr>`;
            return;
        }
        if (!res.data.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-muted p-3">${escapeHtml(tc.popup_admin_empty || '')}</td></tr>`;
            return;
        }
        tbody.innerHTML = res.data.map((r) => {
            const id = parseInt(r.IdDashboardPopup, 10);
            const act = parseInt(r.PopupActivo, 10) === 1;
            const badge = act
                ? `<span class="badge bg-success">${escapeHtml(tc.popup_admin_activo_si || '')}</span>`
                : `<span class="badge bg-secondary">${escapeHtml(tc.popup_admin_activo_no || '')}</span>`;
            const fa = r.FechaActualizacion || r.FechaCreacion || '';
            return `
            <tr>
                <td>${escapeHtml(r.NombreInterno || '—')}</td>
                <td>${escapeHtml(r.PopupTitulo || '—')}</td>
                <td class="text-center">${badge}</td>
                <td class="text-muted small">${escapeHtml(String(fa).substring(0, 19))}</td>
                <td class="text-end text-nowrap">
                    ${act ? '' : `<button type="button" class="btn btn-sm btn-outline-success dp-act" data-id="${id}">${escapeHtml(tc.popup_admin_btn_activar || '')}</button>`}
                    ${act ? `<button type="button" class="btn btn-sm btn-outline-warning dp-deact" data-id="${id}">${escapeHtml(tc.popup_admin_btn_desactivar || '')}</button>` : ''}
                    <button type="button" class="btn btn-sm btn-outline-primary dp-edit" data-id="${id}">${escapeHtml(tc.admin_editar || '')}</button>
                    <button type="button" class="btn btn-sm btn-outline-danger dp-del" data-id="${id}">${escapeHtml(tc.admin_eliminar || '')}</button>
                </td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('.dp-edit').forEach((btn) => {
            btn.addEventListener('click', async () => abrirEditar(parseInt(btn.getAttribute('data-id'), 10)));
        });
        tbody.querySelectorAll('.dp-del').forEach((btn) => {
            btn.addEventListener('click', async () => eliminar(parseInt(btn.getAttribute('data-id'), 10)));
        });
        tbody.querySelectorAll('.dp-act').forEach((btn) => {
            btn.addEventListener('click', async () => setActivo(parseInt(btn.getAttribute('data-id'), 10), true));
        });
        tbody.querySelectorAll('.dp-deact').forEach((btn) => {
            btn.addEventListener('click', async () => setActivo(parseInt(btn.getAttribute('data-id'), 10), false));
        });
    }

    async function abrirEditar(id) {
        const res = await API.request(`/admin/comunicacion/dashboard-popup/detail?id=${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || tc.err_generico || '' });
            return;
        }
        fillModalFromRow(res.data);
        modal?.show();
        await refreshNewsPicker(tc);
    }

    async function eliminar(id) {
        const ok = await window.Swal?.fire?.({
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc.admin_eliminar || 'OK',
            cancelButtonText: tc.admin_cancelar || '',
            text: tc.popup_admin_confirm_delete || '',
        });
        if (!ok?.isConfirmed) return;
        const res = await API.request('/admin/comunicacion/dashboard-popup/delete', 'POST', { IdDashboardPopup: id });
        if (res.status === 'success') {
            await cargarLista();
        } else {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || tc.err_generico || '' });
        }
    }

    async function setActivo(id, activo) {
        const res = await API.request('/admin/comunicacion/dashboard-popup/set-activo', 'POST', {
            IdDashboardPopup: id,
            Activo: activo ? 1 : 0,
        });
        if (res.status === 'success') {
            await cargarLista();
        } else {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || tc.err_generico || '' });
        }
    }

    document.getElementById('btn-dp-nuevo')?.addEventListener('click', async () => {
        editingId = 0;
        fillModalFromRow(null);
        modal?.show();
        await refreshNewsPicker(tc);
    });

    document.getElementById('dp-noticia-select')?.addEventListener('change', () => {
        newsPickerSelectedId = val('dp-noticia-select');
    });
    const debouncedNewsFilter = debounce(() => renderNewsSelect(tc), 200);
    document.getElementById('dp-noticia-filter')?.addEventListener('input', debouncedNewsFilter);

    document.getElementById('dp-file-portada')?.addEventListener('change', () => {
        syncDpPortadaPreview();
        renderB2Ui(tc);
    });
    document.getElementById('dp-file-d1')?.addEventListener('change', () => renderB2Ui(tc));
    document.getElementById('dp-file-d2')?.addEventListener('change', () => renderB2Ui(tc));

    document.getElementById('btn-dp-guardar')?.addEventListener('click', async () => {
        const msgUp = tc.b2_subiendo_cloud || tc.admin_noticia_uploading_files || '';
        const msgSav = tc.b2_guardando || tc.pp_btn_guardar || '';
        try {
            const pending = hasPendingDpB2Files();
            if (pending) {
                showLoader({ staticPhrase: msgUp });
                await uploadPendingB2Files(tc, editingId);
                showLoader({ upgradeOnly: true, staticPhrase: msgSav });
            } else {
                showLoader({ staticPhrase: msgSav });
            }
            const payload = buildPayload();
            const ep = editingId ? '/admin/comunicacion/dashboard-popup/update' : '/admin/comunicacion/dashboard-popup';
            const res = await API.request(ep, 'POST', payload);
            hideLoader();
            if (res.status !== 'success') {
                await window.Swal?.fire?.({ icon: 'error', text: res.message || tc.err_generico || '' });
                return;
            }
            const rid =
                editingId
                || parseInt(String(res.data?.IdDashboardPopup ?? res.data?.idDashboardPopup ?? ''), 10)
                || 0;
            await window.Swal?.fire?.({
                icon: 'success',
                title: tc.pp_save_ok || '',
                timer: 1600,
                showConfirmButton: false,
            });
            newsPickerCache = null;
            if (rid > 0) {
                const det = await API.request(`/admin/comunicacion/dashboard-popup/detail?id=${rid}`, 'GET');
                if (det.status === 'success' && det.data) {
                    fillModalFromRow(det.data);
                    await refreshNewsPicker(tc);
                }
            }
            await cargarLista();
        } catch (e) {
            hideLoader();
            await window.Swal?.fire?.({ icon: 'error', text: escapeHtml(e.message || '') });
        }
    });

    document.getElementById('dp-btn-clear-portada')?.addEventListener('click', () => {
        const fi = document.getElementById('dp-file-portada');
        const pending = fi?.files?.length > 0;
        const hadSaved = !!(b2.PopupPortadaImagenB2Key && String(b2.PopupPortadaImagenB2Key).length > 0);
        if (pending && hadSaved) {
            if (fi) fi.value = '';
            revokeDpPortadaPreview();
            renderB2Ui(tc);
            return;
        }
        b2.PopupPortadaImagenB2Key = null;
        b2.PopupPortadaImagenNombre = null;
        if (fi) fi.value = '';
        revokeDpPortadaPreview();
        renderB2Ui(tc);
    });

    document.getElementById('dp-btn-clear-d1')?.addEventListener('click', () => {
        const fi = document.getElementById('dp-file-d1');
        const pending = fi?.files?.length > 0;
        const hadSaved = !!(b2.PopupAdjunto1B2Key && String(b2.PopupAdjunto1B2Key).length > 0);
        if (pending && hadSaved) {
            if (fi) fi.value = '';
            renderB2Ui(tc);
            return;
        }
        b2.PopupAdjunto1B2Key = null;
        b2.PopupAdjunto1Nombre = null;
        if (fi) fi.value = '';
        renderB2Ui(tc);
    });
    document.getElementById('dp-btn-clear-d2')?.addEventListener('click', () => {
        const fi = document.getElementById('dp-file-d2');
        const pending = fi?.files?.length > 0;
        const hadSaved = !!(b2.PopupAdjunto2B2Key && String(b2.PopupAdjunto2B2Key).length > 0);
        if (pending && hadSaved) {
            if (fi) fi.value = '';
            renderB2Ui(tc);
            return;
        }
        b2.PopupAdjunto2B2Key = null;
        b2.PopupAdjunto2Nombre = null;
        if (fi) fi.value = '';
        renderB2Ui(tc);
    });

    document.getElementById('dp-btn-prev-portada')?.addEventListener('click', async () => {
        const pf = document.getElementById('dp-file-portada')?.files?.[0];
        if (pf) {
            const u = URL.createObjectURL(pf);
            const previewWin = window.open(u, '_blank', 'noopener,noreferrer');
            if (!previewWin) {
                URL.revokeObjectURL(u);
                await window.Swal?.fire?.({
                    icon: 'warning',
                    text: tc.admin_noticia_preview_popup_blocked || tc.pp_b2_preview_fail || '',
                });
                return;
            }
            setTimeout(() => URL.revokeObjectURL(u), 120000);
            return;
        }
        const id = parseInt(document.getElementById('dp-edit-id')?.value || '0', 10);
        if (!id) return;
        try {
            await openPreviewAdmin(id, 'popup_imagen');
        } catch (err) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: tc.pp_b2_preview_fail || tc.err_generico || '',
                text: escapeHtml(err?.message || ''),
            });
        }
    });

    document.getElementById('dp-btn-prev-d1')?.addEventListener('click', async () => {
        const pf = document.getElementById('dp-file-d1')?.files?.[0];
        if (pf) {
            const u = URL.createObjectURL(pf);
            const previewWin = window.open(u, '_blank', 'noopener,noreferrer');
            if (!previewWin) {
                URL.revokeObjectURL(u);
                await window.Swal?.fire?.({
                    icon: 'warning',
                    text: tc.admin_noticia_preview_popup_blocked || tc.pp_b2_preview_fail || '',
                });
                return;
            }
            setTimeout(() => URL.revokeObjectURL(u), 120000);
            return;
        }
        const id = parseInt(document.getElementById('dp-edit-id')?.value || '0', 10);
        if (!id) return;
        try {
            await openPreviewAdmin(id, 'popup_doc1');
        } catch (err) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: tc.pp_b2_preview_fail || tc.err_generico || '',
                text: escapeHtml(err?.message || ''),
            });
        }
    });
    document.getElementById('dp-btn-prev-d2')?.addEventListener('click', async () => {
        const pf = document.getElementById('dp-file-d2')?.files?.[0];
        if (pf) {
            const u = URL.createObjectURL(pf);
            const previewWin = window.open(u, '_blank', 'noopener,noreferrer');
            if (!previewWin) {
                URL.revokeObjectURL(u);
                await window.Swal?.fire?.({
                    icon: 'warning',
                    text: tc.admin_noticia_preview_popup_blocked || tc.pp_b2_preview_fail || '',
                });
                return;
            }
            setTimeout(() => URL.revokeObjectURL(u), 120000);
            return;
        }
        const id = parseInt(document.getElementById('dp-edit-id')?.value || '0', 10);
        if (!id) return;
        try {
            await openPreviewAdmin(id, 'popup_doc2');
        } catch (err) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: tc.pp_b2_preview_fail || tc.err_generico || '',
                text: escapeHtml(err?.message || ''),
            });
        }
    });

    ['dp-url1', 'dp-url2'].forEach((id, idx) => {
        document.getElementById(id)?.addEventListener('blur', () => {
            const url = val(id);
            if (!url) return;
            if (idx === 0) {
                b2.PopupAdjunto1B2Key = null;
                b2.PopupAdjunto1Nombre = null;
                document.getElementById('dp-file-d1').value = '';
            } else {
                b2.PopupAdjunto2B2Key = null;
                b2.PopupAdjunto2Nombre = null;
                document.getElementById('dp-file-d2').value = '';
            }
            renderB2Ui(tc);
        });
    });

    await cargarLista();
}
