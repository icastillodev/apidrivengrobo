import { API } from '../../api.js';
import { getCorrectPath } from '../../components/menujs/MenuConfig.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
import { createAdminListPageCache, offsetLimitToPagePageSizeQuery } from '../../utils/adminListPageCache.js';

const poeB2 = {
    Adjunto1B2Key: null,
    Adjunto2B2Key: null,
};

function hydratePoeB2FromRow(d) {
    if (!d || typeof d !== 'object') {
        poeB2.Adjunto1B2Key = null;
        poeB2.Adjunto2B2Key = null;
        return;
    }
    poeB2.Adjunto1B2Key = d.Adjunto1B2Key || null;
    poeB2.Adjunto2B2Key = d.Adjunto2B2Key || null;
}

function resetPoeB2UiFields() {
    hydratePoeB2FromRow(null);
    ['poe-file-d1', 'poe-file-d2'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function getPoeEditId() {
    const s = document.getElementById('poe-id')?.value?.trim() || '';
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function mergePoeB2IntoPayload(payload) {
    payload.Adjunto1B2Key = poeB2.Adjunto1B2Key;
    payload.Adjunto2B2Key = poeB2.Adjunto2B2Key;
}

function renderPoeB2Ui() {
    const tc = window.txt?.comunicacion || {};
    const pref = tc.pp_b2_status_uploaded || '';
    const pid = getPoeEditId();

    const slots = [
        { key: 'Adjunto1B2Key', nomId: 'poe-nombre1', statusId: 'poe-status-d1', prevId: 'poe-btn-prev-d1', clearId: 'poe-btn-clear-d1', slot: 1 },
        { key: 'Adjunto2B2Key', nomId: 'poe-nombre2', statusId: 'poe-status-d2', prevId: 'poe-btn-prev-d2', clearId: 'poe-btn-clear-d2', slot: 2 },
    ];

    for (const sl of slots) {
        const k = poeB2[sl.key];
        const has = k && String(k).length > 0;
        const nom = document.getElementById(sl.nomId)?.value?.trim() || '';
        const st = document.getElementById(sl.statusId);
        const prev = document.getElementById(sl.prevId);
        const clr = document.getElementById(sl.clearId);
        if (st) {
            st.textContent = has ? (nom ? `${pref} ${nom}`.trim() : `${pref}`.trim()) : '';
        }
        if (prev) prev.classList.toggle('d-none', !(has && pid > 0));
        if (clr) clr.classList.toggle('d-none', !has);
    }

    const hint = document.getElementById('poe-b2-preview-hint');
    if (hint) {
        const any = !!(poeB2.Adjunto1B2Key || poeB2.Adjunto2B2Key);
        hint.classList.toggle('d-none', pid > 0 || !any);
    }
}

async function openPoeAdjuntoPreview(idPoe, slot) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const pathRel = `/comunicacion/poe/${idPoe}/adjunto/${slot}`;
    const url = `${API.urlBase}${pathRel}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
}

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

function panelPoeUrlWithId(idPoe) {
    const base = getCorrectPath('panel/poe');
    const sep = base.includes('?') ? '&' : '?';
    try {
        return new URL(`${base}${sep}id=${encodeURIComponent(String(idPoe))}`, window.location.origin).href;
    } catch (e) {
        return `${window.location.origin}/${base}${sep}id=${encodeURIComponent(String(idPoe))}`;
    }
}

export async function initAdminPoe() {
    const t = window.txt?.comunicacion || {};
    const tbody = document.getElementById('admin-poe-tbody');
    const infoEl = document.getElementById('admin-poe-pag-info');
    const modalEl = document.getElementById('modal-poe-admin');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    let currentPage = 1;
    const pageSize = 15;
    let total = 0;
    const buildPoeListQuery = (extra) => offsetLimitToPagePageSizeQuery(pageSize, extra);
    const poePageCacheApi = createAdminListPageCache(pageSize, buildPoeListQuery, '/admin/comunicacion/poe');

    function invalidatePoeListCache() {
        poePageCacheApi.bustPages();
    }

    function totalPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    function paintPoeRows(rows) {
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">${escapeHtml(t.poe_admin_vacio || '')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map((r) => {
                const id = parseInt(r.IdPoe, 10) || 0;
                const activo = parseInt(r.Activo, 10) === 1;
                const est = activo ? t.poe_estado_activo || '' : t.poe_estado_inactivo || '';
                const badge = activo ? 'success' : 'secondary';
                return `<tr>
                        <td class="ps-3 fw-semibold">${escapeHtml(r.Titulo || '—')}</td>
                        <td class="text-center">${escapeHtml(String(r.Orden ?? 0))}</td>
                        <td class="text-center"><span class="badge text-bg-${badge}">${escapeHtml(est)}</span></td>
                        <td class="text-end pe-3">
                            <button type="button" class="btn btn-sm btn-outline-primary me-1" data-poe-edit="${id}">${escapeHtml(t.poe_btn_editar || t.admin_editar || '')}</button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-poe-del="${id}">${escapeHtml(t.poe_btn_eliminar || t.admin_eliminar || '')}</button>
                        </td>
                    </tr>`;
            })
            .join('');
        tbody.querySelectorAll('[data-poe-edit]').forEach((b) => {
            b.addEventListener('click', () => abrirEdit(parseInt(b.getAttribute('data-poe-edit'), 10)));
        });
        tbody.querySelectorAll('[data-poe-del]').forEach((b) => {
            b.addEventListener('click', () => eliminar(parseInt(b.getAttribute('data-poe-del'), 10)));
        });
    }

    function updatePoePaginationUi() {
        if (infoEl) {
            const tp = totalPages();
            infoEl.textContent = `${currentPage} / ${tp} · ${total}`;
        }
    }

    async function cargarTabla(options = {}) {
        const forceServer = options.forceServer === true;
        if (!tbody) return;

        const prefetchGen = poePageCacheApi.syncFiltersKey();

        if (!forceServer && poePageCacheApi.pageCache.has(currentPage)) {
            const cached = poePageCacheApi.pageCache.get(currentPage);
            paintPoeRows(Array.isArray(cached) ? cached : []);
            updatePoePaginationUi();
            poePageCacheApi.schedulePrefetchAround(total, currentPage, prefetchGen);
            return;
        }

        const loadingMsg = escapeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></td></tr>`;
        const res = await poePageCacheApi.fetchPage(currentPage);
        if (res.status !== 'success' || !Array.isArray(res.data)) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">${escapeHtml(res.message || t.err_generico || '')}</td></tr>`;
            return;
        }
        total = parseInt(res.total, 10) || 0;
        const rows = res.data;
        if (!rows.length && total > 0 && currentPage > 1) {
            currentPage = 1;
            invalidatePoeListCache();
            await cargarTabla(options);
            return;
        }
        poePageCacheApi.pageCache.set(currentPage, [...rows]);
        paintPoeRows(rows);
        updatePoePaginationUi();
        poePageCacheApi.schedulePrefetchAround(total, currentPage, prefetchGen);
    }

    function resetForm() {
        setVal('poe-id', '');
        setVal('poe-titulo', '');
        setVal('poe-resena', '');
        setVal('poe-cuerpo', '');
        setVal('poe-url1', '');
        setVal('poe-nombre1', '');
        setVal('poe-url2', '');
        setVal('poe-nombre2', '');
        setVal('poe-orden', '0');
        resetPoeB2UiFields();
        renderPoeB2Ui();
        const chk = document.getElementById('poe-activo');
        if (chk) chk.checked = true;
        const qrBtn = document.getElementById('btn-poe-admin-qr');
        if (qrBtn) qrBtn.disabled = true;
        const mt = document.getElementById('modal-poe-admin-title');
        if (mt) mt.textContent = t.poe_modal_nuevo || '';
    }

    async function abrirEdit(id) {
        const res = await API.request(`/admin/comunicacion/poe/detail?id=${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || '' });
            return;
        }
        const d = res.data;
        setVal('poe-id', String(d.IdPoe || ''));
        setVal('poe-titulo', d.Titulo || '');
        setVal('poe-resena', d.Resena || '');
        setVal('poe-cuerpo', d.Cuerpo || '');
        setVal('poe-url1', d.UrlAdjunto1 || '');
        setVal('poe-nombre1', d.NombreAdjunto1 || '');
        setVal('poe-url2', d.UrlAdjunto2 || '');
        setVal('poe-nombre2', d.NombreAdjunto2 || '');
        setVal('poe-orden', d.Orden != null ? String(d.Orden) : '0');
        const chk = document.getElementById('poe-activo');
        if (chk) chk.checked = parseInt(d.Activo, 10) === 1;
        const qrBtn = document.getElementById('btn-poe-admin-qr');
        if (qrBtn) {
            qrBtn.disabled = parseInt(d.Activo, 10) !== 1;
            qrBtn.dataset.poePublicUrl = panelPoeUrlWithId(parseInt(d.IdPoe, 10));
        }
        hydratePoeB2FromRow(d);
        renderPoeB2Ui();
        const mt = document.getElementById('modal-poe-admin-title');
        if (mt) mt.textContent = t.poe_modal_editar || '';
        modal?.show();
    }

    async function eliminar(id) {
        const ok = await window.Swal?.fire?.({
            icon: 'warning',
            title: t.poe_confirm_delete_title || '',
            text: t.poe_confirm_delete || '',
            showCancelButton: true,
            confirmButtonText: t.admin_eliminar || '',
            cancelButtonText: t.admin_cancelar || '',
        });
        if (!ok?.isConfirmed) return;
        const res = await API.request('/admin/comunicacion/poe/delete', 'POST', { IdPoe: id });
        if (res.status === 'success') {
            await window.Swal?.fire?.({ icon: 'success', timer: 1400, showConfirmButton: false });
            invalidatePoeListCache();
            await cargarTabla();
        } else {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || '' });
        }
    }

    document.getElementById('poe-nombre1')?.addEventListener('input', () => renderPoeB2Ui());
    document.getElementById('poe-nombre2')?.addEventListener('input', () => renderPoeB2Ui());

    document.getElementById('poe-url1')?.addEventListener('input', () => {
        if ((val('poe-url1') || '').trim()) {
            poeB2.Adjunto1B2Key = null;
            const fi = document.getElementById('poe-file-d1');
            if (fi) fi.value = '';
            renderPoeB2Ui();
        }
    });
    document.getElementById('poe-url2')?.addEventListener('input', () => {
        if ((val('poe-url2') || '').trim()) {
            poeB2.Adjunto2B2Key = null;
            const fi = document.getElementById('poe-file-d2');
            if (fi) fi.value = '';
            renderPoeB2Ui();
        }
    });

    async function uploadPoeDoc(slot) {
        const inp = document.getElementById(slot === 1 ? 'poe-file-d1' : 'poe-file-d2');
        const file = inp?.files?.[0];
        if (!file) {
            await window.Swal?.fire?.({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('slot', String(slot));
            const res = await API.request('/comunicacion/b2/upload/poe-instructivo', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || t.pp_b2_err_upload || '');
            const d = res.data;
            const nom = d.nombreSeguro ? String(d.nombreSeguro) : '';
            if (slot === 1) {
                poeB2.Adjunto1B2Key = d.Adjunto1B2Key ?? null;
                setVal('poe-url1', '');
                if (nom) setVal('poe-nombre1', nom);
            } else {
                poeB2.Adjunto2B2Key = d.Adjunto2B2Key ?? null;
                setVal('poe-url2', '');
                if (nom) setVal('poe-nombre2', nom);
            }
            renderPoeB2Ui();
            await window.Swal?.fire?.({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            await window.Swal?.fire?.({ icon: 'error', text: e.message || t.err_generico || '' });
        } finally {
            hideLoader();
        }
    }

    document.getElementById('poe-btn-upload-d1')?.addEventListener('click', () => uploadPoeDoc(1));
    document.getElementById('poe-btn-upload-d2')?.addEventListener('click', () => uploadPoeDoc(2));

    document.getElementById('poe-btn-clear-d1')?.addEventListener('click', () => {
        poeB2.Adjunto1B2Key = null;
        const fi = document.getElementById('poe-file-d1');
        if (fi) fi.value = '';
        renderPoeB2Ui();
    });
    document.getElementById('poe-btn-clear-d2')?.addEventListener('click', () => {
        poeB2.Adjunto2B2Key = null;
        const fi = document.getElementById('poe-file-d2');
        if (fi) fi.value = '';
        renderPoeB2Ui();
    });

    document.getElementById('poe-btn-prev-d1')?.addEventListener('click', async () => {
        const id = getPoeEditId();
        if (!id) return;
        try {
            await openPoeAdjuntoPreview(id, 1);
        } catch (_) {
            await window.Swal?.fire?.({ icon: 'error', text: t.pp_b2_preview_fail || t.err_generico || '' });
        }
    });
    document.getElementById('poe-btn-prev-d2')?.addEventListener('click', async () => {
        const id = getPoeEditId();
        if (!id) return;
        try {
            await openPoeAdjuntoPreview(id, 2);
        } catch (_) {
            await window.Swal?.fire?.({ icon: 'error', text: t.pp_b2_preview_fail || t.err_generico || '' });
        }
    });

    document.getElementById('btn-poe-nuevo')?.addEventListener('click', () => {
        resetForm();
        modal?.show();
    });

    document.getElementById('btn-poe-guardar')?.addEventListener('click', async () => {
        const id = parseInt(val('poe-id'), 10);
        const payload = {
            Titulo: val('poe-titulo') || null,
            Resena: val('poe-resena') || null,
            Cuerpo: val('poe-cuerpo') || null,
            UrlAdjunto1: val('poe-url1') || null,
            NombreAdjunto1: val('poe-nombre1') || null,
            UrlAdjunto2: val('poe-url2') || null,
            NombreAdjunto2: val('poe-nombre2') || null,
            Orden: parseInt(val('poe-orden'), 10) || 0,
            Activo: document.getElementById('poe-activo')?.checked ? 1 : 0,
        };
        mergePoeB2IntoPayload(payload);
        let res;
        if (id > 0) {
            res = await API.request('/admin/comunicacion/poe/update', 'POST', { ...payload, IdPoe: id });
        } else {
            res = await API.request('/admin/comunicacion/poe', 'POST', payload);
        }
        if (res.status === 'success') {
            await window.Swal?.fire?.({
                icon: 'success',
                title: t.poe_save_ok || t.pp_save_ok || '',
                timer: 1600,
                showConfirmButton: false,
            });
            modal?.hide();
            invalidatePoeListCache();
            await cargarTabla();
        } else {
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || '', text: escapeHtml(res.message || '') });
        }
    });

    document.getElementById('admin-poe-prev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            cargarTabla();
        }
    });
    document.getElementById('admin-poe-next')?.addEventListener('click', () => {
        if (currentPage < totalPages()) {
            currentPage += 1;
            cargarTabla();
        }
    });

    document.getElementById('btn-poe-admin-qr')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-poe-admin-qr');
        const url = btn?.dataset?.poePublicUrl || '';
        if (!url || typeof QRCode === 'undefined') return;
        await window.Swal?.fire?.({
            title: t.poe_qr_title || '',
            html: `<p class="small text-muted mb-3">${escapeHtml(t.poe_qr_hint || '')}</p><div class="d-flex justify-content-center"><div id="swal-qr-poe-admin"></div></div><p class="small text-break mt-3 mb-0">${escapeHtml(url)}</p>`,
            width: 420,
            didOpen: () => {
                const host = document.getElementById('swal-qr-poe-admin');
                if (!host) return;
                host.innerHTML = '';
                try {
                    new QRCode(host, { text: url, width: 220, height: 220 });
                } catch (e) {
                    console.error(e);
                }
            },
        });
    });

    await cargarTabla();
}
