import { API } from '../../api.js';
import { NotificationManager } from '../../NotificationManager.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
import { createAdminListPageCache, offsetLimitToPagePageSizeQuery } from '../../utils/adminListPageCache.js';

/** Adjuntos B2 en modal noticia (persistidos vía POST create/update). */
const noticiaB2 = {
    ImagenPortadaB2Key: null,
    ImagenPortadaNombre: null,
    AdjuntoDoc1B2Key: null,
    AdjuntoDoc1Nombre: null,
    AdjuntoDoc2B2Key: null,
    AdjuntoDoc2Nombre: null,
};

function hydrateNoticiaB2FromRow(row) {
    if (!row || typeof row !== 'object') {
        Object.keys(noticiaB2).forEach((k) => { noticiaB2[k] = null; });
        return;
    }
    noticiaB2.ImagenPortadaB2Key = row.ImagenPortadaB2Key || null;
    noticiaB2.ImagenPortadaNombre = row.ImagenPortadaNombre || null;
    noticiaB2.AdjuntoDoc1B2Key = row.AdjuntoDoc1B2Key || null;
    noticiaB2.AdjuntoDoc1Nombre = row.AdjuntoDoc1Nombre || null;
    noticiaB2.AdjuntoDoc2B2Key = row.AdjuntoDoc2B2Key || null;
    noticiaB2.AdjuntoDoc2Nombre = row.AdjuntoDoc2Nombre || null;
}

function resetNoticiaB2State() {
    hydrateNoticiaB2FromRow(null);
    ['noticia-file-img', 'noticia-file-d1', 'noticia-file-d2'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function getEditNoticiaId() {
    const s = document.getElementById('edit-id')?.value?.trim() || '';
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function renderNoticiaB2Ui() {
    const tc = window.txt?.comunicacion || {};
    const pref = tc.pp_b2_status_uploaded || '';
    const nid = getEditNoticiaId();

    const slots = [
        {
            keyK: 'ImagenPortadaB2Key',
            keyN: 'ImagenPortadaNombre',
            statusId: 'noticia-status-img',
            prevId: 'noticia-btn-prev-img',
            clearId: 'noticia-btn-clear-img',
        },
        {
            keyK: 'AdjuntoDoc1B2Key',
            keyN: 'AdjuntoDoc1Nombre',
            statusId: 'noticia-status-d1',
            prevId: 'noticia-btn-prev-d1',
            clearId: 'noticia-btn-clear-d1',
        },
        {
            keyK: 'AdjuntoDoc2B2Key',
            keyN: 'AdjuntoDoc2Nombre',
            statusId: 'noticia-status-d2',
            prevId: 'noticia-btn-prev-d2',
            clearId: 'noticia-btn-clear-d2',
        },
    ];

    for (const sl of slots) {
        const k = noticiaB2[sl.keyK];
        const n = noticiaB2[sl.keyN];
        const has = k && String(k).length > 0;
        const st = document.getElementById(sl.statusId);
        const prev = document.getElementById(sl.prevId);
        const clr = document.getElementById(sl.clearId);
        if (st) st.textContent = has && n ? `${pref} ${n}`.trim() : '';
        if (prev) {
            const canPrev = has && nid > 0;
            prev.classList.toggle('d-none', !canPrev);
        }
        if (clr) clr.classList.toggle('d-none', !has);
    }

    const hint = document.getElementById('noticia-b2-preview-hint');
    if (hint) {
        const anyUploaded = !!(noticiaB2.ImagenPortadaB2Key || noticiaB2.AdjuntoDoc1B2Key || noticiaB2.AdjuntoDoc2B2Key);
        hint.classList.toggle('d-none', nid > 0 || !anyUploaded);
    }
}

async function openNoticiaArchivoPreview(idNoticia, tipo) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const pathRel = `/comunicacion/noticias/${idNoticia}/archivo/${tipo}`;
    const url = `${API.urlBase}${pathRel}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
}

function mergeNoticiaB2IntoPayload(base) {
    base.ImagenPortadaB2Key = noticiaB2.ImagenPortadaB2Key;
    base.ImagenPortadaNombre = noticiaB2.ImagenPortadaNombre;
    base.AdjuntoDoc1B2Key = noticiaB2.AdjuntoDoc1B2Key;
    base.AdjuntoDoc1Nombre = noticiaB2.AdjuntoDoc1Nombre;
    base.AdjuntoDoc2B2Key = noticiaB2.AdjuntoDoc2B2Key;
    base.AdjuntoDoc2Nombre = noticiaB2.AdjuntoDoc2Nombre;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toDatetimeLocal(val) {
    if (!val) return '';
    const s = String(val).replace(' ', 'T');
    return s.length >= 16 ? s.substring(0, 16) : s;
}

const NOTICIA_BADGE_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];

function noticiaCategoriaBadgeHtml(r) {
    const name = String(r?.Categoria ?? '').trim();
    if (!name) return '';
    let v = String(r?.CategoriaBadge ?? 'primary').toLowerCase();
    if (!NOTICIA_BADGE_VARIANTS.includes(v)) v = 'primary';
    return `<span class="badge text-bg-${v} ms-1" style="font-size:10px;vertical-align:middle;">${escapeHtml(name)}</span>`;
}

export async function initAdminNoticias() {
    const t = window.txt?.comunicacion || {};
    const pageSize = 15;
    let currentPage = 1;
    let total = 0;
    const buildNoticiasListQuery = (extra) => offsetLimitToPagePageSizeQuery(pageSize, extra);
    const noticiasPageCacheApi = createAdminListPageCache(pageSize, buildNoticiasListQuery, '/admin/comunicacion/noticias');

    function invalidateNoticiasListCache() {
        noticiasPageCacheApi.bustPages();
    }
    const tbody = document.getElementById('admin-noticias-tbody');
    const infoEl = document.getElementById('admin-noticias-pag-info');
    const btnPrev = document.getElementById('admin-noticias-prev');
    const btnNext = document.getElementById('admin-noticias-next');
    const editEstado = document.getElementById('edit-estado');
    const wrapFechaCompartir = document.getElementById('wrap-fecha-compartir');

    const modalEl = document.getElementById('modal-noticia-admin');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    function totalPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    function estadoLabel(r) {
        const pub = parseInt(r.Publicado, 10) === 1;
        if (!pub) return t.admin_estado_borrador || '';
        const raw = r.FechaPublicacion;
        const fp = raw ? new Date(String(raw).replace(' ', 'T')) : null;
        if (fp && !Number.isNaN(fp.getTime()) && fp.getTime() > Date.now()) {
            return t.admin_estado_programada || 'Programada';
        }
        return t.admin_estado_publicada || '';
    }

    function enRedBadge(r) {
        const legacy = (r.Alcance || '').toLowerCase() === 'red';
        const comp = r.CompartirEnRed !== undefined && r.CompartirEnRed !== null
            ? parseInt(r.CompartirEnRed, 10) === 1
            : legacy;
        return comp
            ? `<span class="badge bg-info text-dark">${escapeHtml(t.admin_si || '')}</span>`
            : `<span class="badge bg-secondary">${escapeHtml(t.admin_no || '')}</span>`;
    }

    function syncEstadoUI() {
        const estado = editEstado?.value;
        const wrapFc = document.getElementById('wrap-fecha-compartir');
        const wrapProgramada = document.getElementById('wrap-fecha-programada');
        const wrapOrden = document.getElementById('wrap-orden-fijo');

        if (estado === 'borrador') {
            wrapFc?.classList.add('d-none');
            wrapOrden?.classList.add('d-none');
        } else {
            wrapFc?.classList.remove('d-none');
            wrapOrden?.classList.remove('d-none');
            if (estado === 'programada') {
                wrapProgramada?.classList.remove('d-none');
            } else {
                wrapProgramada?.classList.add('d-none');
            }
        }
    }

    editEstado?.addEventListener('change', syncEstadoUI);

    function paintNoticiasRows(rows) {
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-muted p-3">${escapeHtml(t.dash_sin_noticias || '')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map((r) => {
            const id = parseInt(r.IdNoticia, 10);
            const fp = r.FechaPublicacion || r.FechaCreacion || '';
            const est = estadoLabel(r);
            const pin = parseInt(r.OrdenFijo, 10);
            const pinHtml =
                pin >= 1 && pin <= 3
                    ? `<span class="badge bg-success">${escapeHtml(String(pin))}</span>`
                    : `<span class="text-muted">—</span>`;
            return `
                    <tr>
                        <td class="text-muted text-nowrap">${escapeHtml(String(fp).substring(0, 16))}${noticiaCategoriaBadgeHtml(r)}</td>
                        <td class="fw-semibold">${escapeHtml(r.Titulo || '—')}</td>
                        <td class="text-center">${pinHtml}</td>
                        <td class="text-center">${enRedBadge(r)}</td>
                        <td class="text-center"><span class="badge bg-light text-dark border">${escapeHtml(est)}</span></td>
                        <td class="text-end text-nowrap">
                            <button type="button" class="btn btn-outline-primary btn-sm btn-edit" data-id="${id}">${escapeHtml(t.admin_editar || '')}</button>
                            <button type="button" class="btn btn-outline-danger btn-sm btn-del" data-id="${id}">${escapeHtml(t.admin_eliminar || '')}</button>
                        </td>
                    </tr>`;
        }).join('');

        tbody.querySelectorAll('.btn-edit').forEach((btn) => {
            btn.addEventListener('click', () => abrirEdicion(parseInt(btn.getAttribute('data-id'), 10)));
        });
        tbody.querySelectorAll('.btn-del').forEach((btn) => {
            btn.addEventListener('click', () => eliminar(parseInt(btn.getAttribute('data-id'), 10)));
        });
    }

    function updateNoticiasPaginationUi() {
        if (infoEl) {
            const tpl = t.portal_pag_info || '';
            const tp = totalPages();
            infoEl.textContent = tpl
                .replace('{page}', String(currentPage))
                .replace('{totalPages}', String(tp))
                .replace('{total}', String(total));
        }
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages();
    }

    async function cargarLista(options = {}) {
        const silent = options.silent === true;
        const forceServer = options.forceServer === true;
        if (!tbody) return;

        const prefetchGen = noticiasPageCacheApi.syncFiltersKey();

        if (!forceServer && noticiasPageCacheApi.pageCache.has(currentPage)) {
            const cached = noticiasPageCacheApi.pageCache.get(currentPage);
            paintNoticiasRows(Array.isArray(cached) ? cached : []);
            updateNoticiasPaginationUi();
            noticiasPageCacheApi.schedulePrefetchAround(total, currentPage, prefetchGen);
            return;
        }

        if (!silent) {
            const loadingMsg = escapeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></td></tr>`;
        }

        const res = await noticiasPageCacheApi.fetchPage(currentPage);

        if (res.status !== 'success') {
            tbody.innerHTML = `<tr><td colspan="6" class="text-danger p-3">${escapeHtml(res.message || t.err_forbidden || t.err_generico || '')}</td></tr>`;
            return;
        }

        const rows = Array.isArray(res.data) ? res.data : [];
        total = parseInt(res.total, 10) || 0;

        if (!rows.length && total > 0 && currentPage > 1) {
            currentPage = 1;
            invalidateNoticiasListCache();
            await cargarLista(options);
            return;
        }

        noticiasPageCacheApi.pageCache.set(currentPage, [...rows]);
        paintNoticiasRows(rows);
        updateNoticiasPaginationUi();
        noticiasPageCacheApi.schedulePrefetchAround(total, currentPage, prefetchGen);
    }

    async function abrirEdicion(id) {
        const res = await API.request(`/admin/comunicacion/noticias/detail?id=${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
            return;
        }
        const row = res.data;
        document.getElementById('edit-id').value = String(row.IdNoticia || id);
        document.getElementById('edit-titulo').value = row.Titulo || '';
        document.getElementById('edit-categoria').value = row.Categoria || '';
        const selBadge = document.getElementById('edit-categoria-badge');
        if (selBadge) {
            const v = String(row.CategoriaBadge || 'primary').toLowerCase();
            selBadge.value = NOTICIA_BADGE_VARIANTS.includes(v) ? v : 'primary';
        }
        document.getElementById('edit-cuerpo').value = row.Cuerpo || '';

        const legacyRed = (row.Alcance || '').toLowerCase() === 'red';
        const legacyHint = document.getElementById('edit-legacy-red-hint');
        if (legacyHint) {
            legacyHint.classList.toggle('d-none', !legacyRed);
        }

        const pub = parseInt(row.Publicado, 10) === 1;
        const refPub = row.FechaPublicacion || row.FechaCreacion || '';
        const fp = refPub ? new Date(String(refPub).replace(' ', 'T')) : null;
        const isProgramada = pub && fp && !Number.isNaN(fp.getTime()) && fp.getTime() > Date.now();

        if (editEstado) {
            editEstado.value = !pub ? 'borrador' : (isProgramada ? 'programada' : 'publicada');
        }
        const compartir = legacyRed || parseInt(row.CompartirEnRed, 10) !== 0;
        const cb = document.getElementById('edit-compartir-red');
        if (cb) cb.checked = compartir;

        const selOrden = document.getElementById('edit-orden-fijo');
        if (selOrden) {
            const o = parseInt(row.OrdenFijo, 10);
            selOrden.value = o >= 1 && o <= 3 ? String(o) : '';
        }

        const fechaIn = document.getElementById('edit-fecha-pub');
        if (fechaIn) {
            fechaIn.value = (pub && isProgramada) ? toDatetimeLocal(refPub) : '';
        }

        syncEstadoUI();
        hydrateNoticiaB2FromRow(row);
        renderNoticiaB2Ui();
        const tituloModal = document.getElementById('modal-admin-titulo');
        if (tituloModal) tituloModal.textContent = t.admin_editar || '';
        modal?.show();
    }

    function abrirNueva() {
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-titulo').value = '';
        document.getElementById('edit-categoria').value = '';
        document.getElementById('edit-categoria-badge').value = 'primary';
        document.getElementById('edit-cuerpo').value = '';
        document.getElementById('edit-legacy-red-hint')?.classList.add('d-none');
        if (editEstado) editEstado.value = 'borrador';
        document.getElementById('edit-fecha-pub').value = '';
        const selOrden = document.getElementById('edit-orden-fijo');
        if (selOrden) selOrden.value = '';
        const cb = document.getElementById('edit-compartir-red');
        if (cb) cb.checked = true;
        syncEstadoUI();
        resetNoticiaB2State();
        renderNoticiaB2Ui();
        const tituloModal = document.getElementById('modal-admin-titulo');
        if (tituloModal) tituloModal.textContent = t.admin_nueva || '';
        modal?.show();
    }

    async function guardar() {
        const idStr = document.getElementById('edit-id')?.value || '';
        const titulo = document.getElementById('edit-titulo')?.value?.trim() || '';
        const categoria = document.getElementById('edit-categoria')?.value?.trim() || '';
        const categoriaBadge = document.getElementById('edit-categoria-badge')?.value || 'primary';
        const cuerpo = document.getElementById('edit-cuerpo')?.value?.trim() || '';
        const estado = editEstado?.value || 'borrador';
        const publicado = estado === 'borrador' ? 0 : 1;
        const fechaVal = document.getElementById('edit-fecha-pub')?.value || '';
        const compartir = document.getElementById('edit-compartir-red')?.checked ? 1 : 0;

        const base = {
            Titulo: titulo,
            Cuerpo: cuerpo,
            Publicado: publicado,
            Categoria: categoria,
            CategoriaBadge: categoria ? categoriaBadge : ''
        };

        if (publicado) {
            if (estado === 'programada' && fechaVal) {
                base.FechaPublicacion = fechaVal;
            } else {
                base.FechaPublicacion = null;
            }
            base.CompartirEnRed = compartir;
            const ov = document.getElementById('edit-orden-fijo')?.value ?? '';
            base.OrdenFijo = ov === '' ? '' : parseInt(ov, 10);
        }

        mergeNoticiaB2IntoPayload(base);

        let res;
        if (idStr) {
            res = await API.request('/admin/comunicacion/noticias/update', 'POST', {
                IdNoticia: parseInt(idStr, 10),
                ...base
            });
        } else {
            res = await API.request('/admin/comunicacion/noticias', 'POST', base);
        }

        if (res.status === 'success') {
            modal?.hide();
            invalidateNoticiasListCache();
            await cargarLista();
            NotificationManager.check();
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
        }
    }

    async function eliminar(id) {
        const ok = typeof Swal !== 'undefined'
            ? (await Swal.fire({
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: t.admin_eliminar || 'OK',
                cancelButtonText: t.admin_cancelar || '',
                text: t.admin_confirm_eliminar || ''
            })).isConfirmed
            : window.confirm(t.admin_confirm_eliminar || '');

        if (!ok) return;

        const res = await API.request('/admin/comunicacion/noticias/delete', 'POST', { IdNoticia: id });
        if (res.status === 'success') {
            invalidateNoticiasListCache();
            await cargarLista();
            NotificationManager.check();
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
        }
    }

    async function uploadNoticiaImagen() {
        const inp = document.getElementById('noticia-file-img');
        const file = inp?.files?.[0];
        if (!file) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await API.request('/comunicacion/b2/upload/noticia-imagen-portada', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || t.pp_b2_err_upload || '');
            noticiaB2.ImagenPortadaB2Key = res.data.ImagenPortadaB2Key ?? null;
            noticiaB2.ImagenPortadaNombre = res.data.ImagenPortadaNombre ?? null;
            renderNoticiaB2Ui();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: e.message || t.err_generico || '' });
        } finally {
            hideLoader();
        }
    }

    async function uploadNoticiaDoc(slot) {
        const inp = document.getElementById(slot === 1 ? 'noticia-file-d1' : 'noticia-file-d2');
        const file = inp?.files?.[0];
        if (!file) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await API.request('/comunicacion/b2/upload/noticia-documento', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || t.pp_b2_err_upload || '');
            const d = res.data;
            if (slot === 1) {
                noticiaB2.AdjuntoDoc1B2Key = d.AdjuntoDocB2Key ?? null;
                noticiaB2.AdjuntoDoc1Nombre = d.AdjuntoDocNombre ?? null;
            } else {
                noticiaB2.AdjuntoDoc2B2Key = d.AdjuntoDocB2Key ?? null;
                noticiaB2.AdjuntoDoc2Nombre = d.AdjuntoDocNombre ?? null;
            }
            renderNoticiaB2Ui();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: e.message || t.err_generico || '' });
        } finally {
            hideLoader();
        }
    }

    document.getElementById('noticia-btn-upload-img')?.addEventListener('click', () => uploadNoticiaImagen());
    document.getElementById('noticia-btn-upload-d1')?.addEventListener('click', () => uploadNoticiaDoc(1));
    document.getElementById('noticia-btn-upload-d2')?.addEventListener('click', () => uploadNoticiaDoc(2));

    document.getElementById('noticia-btn-clear-img')?.addEventListener('click', () => {
        noticiaB2.ImagenPortadaB2Key = null;
        noticiaB2.ImagenPortadaNombre = null;
        const fi = document.getElementById('noticia-file-img');
        if (fi) fi.value = '';
        renderNoticiaB2Ui();
    });
    document.getElementById('noticia-btn-clear-d1')?.addEventListener('click', () => {
        noticiaB2.AdjuntoDoc1B2Key = null;
        noticiaB2.AdjuntoDoc1Nombre = null;
        const fi = document.getElementById('noticia-file-d1');
        if (fi) fi.value = '';
        renderNoticiaB2Ui();
    });
    document.getElementById('noticia-btn-clear-d2')?.addEventListener('click', () => {
        noticiaB2.AdjuntoDoc2B2Key = null;
        noticiaB2.AdjuntoDoc2Nombre = null;
        const fi = document.getElementById('noticia-file-d2');
        if (fi) fi.value = '';
        renderNoticiaB2Ui();
    });

    document.getElementById('noticia-btn-prev-img')?.addEventListener('click', async () => {
        const id = getEditNoticiaId();
        if (!id) return;
        try {
            await openNoticiaArchivoPreview(id, 'imagen');
        } catch (_) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: t.pp_b2_preview_fail || t.err_generico || '' });
        }
    });
    document.getElementById('noticia-btn-prev-d1')?.addEventListener('click', async () => {
        const id = getEditNoticiaId();
        if (!id) return;
        try {
            await openNoticiaArchivoPreview(id, 'doc1');
        } catch (_) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: t.pp_b2_preview_fail || t.err_generico || '' });
        }
    });
    document.getElementById('noticia-btn-prev-d2')?.addEventListener('click', async () => {
        const id = getEditNoticiaId();
        if (!id) return;
        try {
            await openNoticiaArchivoPreview(id, 'doc2');
        } catch (_) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: t.pp_b2_preview_fail || t.err_generico || '' });
        }
    });

    document.getElementById('btn-nueva-noticia')?.addEventListener('click', abrirNueva);
    document.getElementById('btn-guardar-noticia')?.addEventListener('click', guardar);
    btnPrev?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            cargarLista();
        }
    });
    btnNext?.addEventListener('click', () => {
        if (currentPage < totalPages()) {
            currentPage += 1;
            cargarLista();
        }
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState !== 'visible') return;
        if (document.getElementById('modal-noticia-admin')?.classList.contains('show')) return;
        await cargarLista({ silent: true, forceServer: true });
    });

    await cargarLista();
}
