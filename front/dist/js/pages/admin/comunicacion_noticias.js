import { API } from '../../api.js';
import { NotificationManager } from '../../NotificationManager.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
import { createAdminListPageCache, offsetLimitToPagePageSizeQuery } from '../../utils/adminListPageCache.js';
import { hydrateNoticiaPortadaThumbs, fillNoticiaPreviewWindow } from '../../utils/noticiaPortadaThumb.js';

/** Cupos de fijación en el panel (OrdenFijo 1…N); debe coincidir con backend y dashboard. */
const NOTICIA_ORDEN_FIJO_MAX = 6;

/** Tras guardar, reabrir edición en la siguiente carga de esta página (p. ej. F5), con caducidad. */
const RESUME_EDIT_STORAGE_KEY = 'urbe_admin_noticia_resume_edit_v1';
const RESUME_EDIT_TTL_MS = 30 * 60 * 1000;

function setResumeEditAfterSave(idNoticia) {
    const id = parseInt(String(idNoticia), 10);
    if (!id || id <= 0) return;
    try {
        sessionStorage.setItem(
            RESUME_EDIT_STORAGE_KEY,
            JSON.stringify({ id, exp: Date.now() + RESUME_EDIT_TTL_MS })
        );
    } catch (_) {
        /* ignore */
    }
}

function consumeResumeEditId() {
    try {
        const raw = sessionStorage.getItem(RESUME_EDIT_STORAGE_KEY);
        if (!raw) return 0;
        sessionStorage.removeItem(RESUME_EDIT_STORAGE_KEY);
        let id = 0;
        let exp = 0;
        try {
            const o = JSON.parse(raw);
            id = parseInt(String(o?.id ?? ''), 10);
            exp = parseInt(String(o?.exp ?? ''), 10);
        } catch (_) {
            id = parseInt(raw, 10);
            exp = Date.now() + RESUME_EDIT_TTL_MS;
        }
        if (!id || id <= 0) return 0;
        if (exp && Date.now() > exp) return 0;
        return id;
    } catch (_) {
        return 0;
    }
}

/** Vista previa local de la imagen de portada de la noticia (object URL). */
let noticiaLocalImgObjUrl = null;

function revokeNoticiaLocalImgPreview() {
    if (noticiaLocalImgObjUrl) {
        try {
            URL.revokeObjectURL(noticiaLocalImgObjUrl);
        } catch (_) {
            /* ignore */
        }
        noticiaLocalImgObjUrl = null;
    }
    const wrap = document.getElementById('noticia-wrap-img-preview');
    const img = document.getElementById('noticia-img-local-preview');
    if (wrap) wrap.classList.add('d-none');
    if (img) {
        img.removeAttribute('src');
        img.alt = '';
    }
}

function syncNoticiaLocalImgPreview() {
    revokeNoticiaLocalImgPreview();
    const f = document.getElementById('noticia-file-img')?.files?.[0];
    const wrap = document.getElementById('noticia-wrap-img-preview');
    const img = document.getElementById('noticia-img-local-preview');
    if (!f || !wrap || !img) return;
    noticiaLocalImgObjUrl = URL.createObjectURL(f);
    img.src = noticiaLocalImgObjUrl;
    img.alt = window.txt?.comunicacion?.admin_img_preview_alt || '';
    wrap.classList.remove('d-none');
}

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
    revokeNoticiaLocalImgPreview();
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

function hasPendingNoticiaFiles() {
    return !!(
        document.getElementById('noticia-file-img')?.files?.[0]
        || document.getElementById('noticia-file-d1')?.files?.[0]
        || document.getElementById('noticia-file-d2')?.files?.[0]
    );
}

/** Vista previa del archivo pendiente (input) en una pestaña ya abierta en el clic (evita bloqueo de popups). */
function openLocalPendingNoticiaPreviewInWindow(previewWin, tipo) {
    const map = { imagen: 'noticia-file-img', doc1: 'noticia-file-d1', doc2: 'noticia-file-d2' };
    const fid = map[tipo];
    if (!fid || !previewWin || previewWin.closed) return false;
    const file = document.getElementById(fid)?.files?.[0];
    if (!file) return false;
    const objUrl = URL.createObjectURL(file);
    previewWin.location.href = objUrl;
    setTimeout(() => URL.revokeObjectURL(objUrl), 180000);
    return true;
}

async function runNoticiaPreviewInWindow(previewWin, idNoticia, tipo) {
    if (openLocalPendingNoticiaPreviewInWindow(previewWin, tipo)) return;
    await fillNoticiaPreviewWindow(previewWin, idNoticia, tipo);
}

function renderNoticiaB2Ui() {
    const tc = window.txt?.comunicacion || {};
    const pref = tc.pp_b2_status_uploaded || '';
    const pend = tc.admin_noticia_b2_pending_on_save || '';
    const nid = getEditNoticiaId();
    const pendingImg = document.getElementById('noticia-file-img')?.files?.[0]?.name || '';
    const pendingD1 = document.getElementById('noticia-file-d1')?.files?.[0]?.name || '';
    const pendingD2 = document.getElementById('noticia-file-d2')?.files?.[0]?.name || '';

    const slots = [
        {
            keyK: 'ImagenPortadaB2Key',
            keyN: 'ImagenPortadaNombre',
            statusId: 'noticia-status-img',
            prevId: 'noticia-btn-prev-img',
            clearId: 'noticia-btn-clear-img',
            pendingName: pendingImg,
        },
        {
            keyK: 'AdjuntoDoc1B2Key',
            keyN: 'AdjuntoDoc1Nombre',
            statusId: 'noticia-status-d1',
            prevId: 'noticia-btn-prev-d1',
            clearId: 'noticia-btn-clear-d1',
            pendingName: pendingD1,
        },
        {
            keyK: 'AdjuntoDoc2B2Key',
            keyN: 'AdjuntoDoc2Nombre',
            statusId: 'noticia-status-d2',
            prevId: 'noticia-btn-prev-d2',
            clearId: 'noticia-btn-clear-d2',
            pendingName: pendingD2,
        },
    ];

    for (const sl of slots) {
        const k = noticiaB2[sl.keyK];
        const n = noticiaB2[sl.keyN];
        const has = k && String(k).length > 0;
        const st = document.getElementById(sl.statusId);
        const prev = document.getElementById(sl.prevId);
        const clr = document.getElementById(sl.clearId);
        if (st) {
            let txt = '';
            if (has && n) txt = `${pref} ${n}`.trim();
            else if (sl.pendingName) txt = `${pend} ${sl.pendingName}`.trim();
            st.textContent = txt;
        }
        if (prev) {
            const canPrev = !!sl.pendingName || (nid > 0 && has);
            prev.classList.toggle('d-none', !canPrev);
        }
        if (clr) clr.classList.toggle('d-none', !has && !sl.pendingName);
    }

    const hint = document.getElementById('noticia-b2-preview-hint');
    if (hint) {
        const anyUploaded = !!(noticiaB2.ImagenPortadaB2Key || noticiaB2.AdjuntoDoc1B2Key || noticiaB2.AdjuntoDoc2B2Key);
        const pendingAny = !!(pendingImg || pendingD1 || pendingD2);
        hint.classList.toggle('d-none', nid > 0 || (!anyUploaded && !pendingAny));
    }
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

    function previewFailMessage(err) {
        const raw = String(err?.message || '').trim();
        return raw || t.pp_b2_preview_fail || t.err_generico || '';
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
            tbody.innerHTML = `<tr><td colspan="7" class="text-muted p-3">${escapeHtml(t.dash_sin_noticias || '')}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map((r) => {
            const id = parseInt(r.IdNoticia, 10);
            const fp = r.FechaPublicacion || r.FechaCreacion || '';
            const est = estadoLabel(r);
            const pin = parseInt(r.OrdenFijo, 10);
            const pinHtml =
                pin >= 1 && pin <= NOTICIA_ORDEN_FIJO_MAX
                    ? `<span class="badge bg-success">${escapeHtml(String(pin))}</span>`
                    : `<span class="text-muted">—</span>`;
            const hasPortada = r.ImagenPortadaB2Key && String(r.ImagenPortadaB2Key).trim() !== '';
            const portadaTd = hasPortada
                ? `<td class="align-middle p-1" style="width:56px"><div class="rounded overflow-hidden bg-light d-none mx-auto border" style="width:48px;height:48px" data-noticia-portada-id="${id}"><img alt="" class="w-100 h-100" style="object-fit:cover" /></div></td>`
                : `<td class="align-middle text-center text-muted small">—</td>`;
            return `
                    <tr>
                        ${portadaTd}
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
        hydrateNoticiaPortadaThumbs(tbody);
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
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></td></tr>`;
        }

        const res = await noticiasPageCacheApi.fetchPage(currentPage);

        if (res.status !== 'success') {
            tbody.innerHTML = `<tr><td colspan="7" class="text-danger p-3">${escapeHtml(res.message || t.err_forbidden || t.err_generico || '')}</td></tr>`;
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
            selOrden.value = o >= 1 && o <= NOTICIA_ORDEN_FIJO_MAX ? String(o) : '';
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

    async function flushPendingNoticiaB2Uploads() {
        const errUpload = t.pp_b2_err_upload || '';
        const imgIn = document.getElementById('noticia-file-img');
        const fImg = imgIn?.files?.[0];
        if (fImg) {
            const fd = new FormData();
            fd.append('file', fImg);
            const res = await API.request('/comunicacion/b2/upload/noticia-imagen-portada', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || errUpload);
            noticiaB2.ImagenPortadaB2Key = res.data.ImagenPortadaB2Key ?? null;
            noticiaB2.ImagenPortadaNombre = res.data.ImagenPortadaNombre ?? null;
            imgIn.value = '';
            revokeNoticiaLocalImgPreview();
        }
        for (const slot of [1, 2]) {
            const inp = document.getElementById(slot === 1 ? 'noticia-file-d1' : 'noticia-file-d2');
            const file = inp?.files?.[0];
            if (!file) continue;
            const fd = new FormData();
            fd.append('file', file);
            const res = await API.request('/comunicacion/b2/upload/noticia-documento', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || errUpload);
            const d = res.data;
            if (slot === 1) {
                noticiaB2.AdjuntoDoc1B2Key = d.AdjuntoDocB2Key ?? null;
                noticiaB2.AdjuntoDoc1Nombre = d.AdjuntoDocNombre ?? null;
            } else {
                noticiaB2.AdjuntoDoc2B2Key = d.AdjuntoDocB2Key ?? null;
                noticiaB2.AdjuntoDoc2Nombre = d.AdjuntoDocNombre ?? null;
            }
            inp.value = '';
        }
        renderNoticiaB2Ui();
    }

    async function guardar() {
        const pendingFiles = hasPendingNoticiaFiles();
        const tc = window.txt?.comunicacion || {};
        const msgUp = tc.b2_subiendo_cloud || tc.admin_noticia_uploading_files || '';
        showLoader({
            upgradeOnly: true,
            staticPhrase: pendingFiles
                ? msgUp
                : (tc.admin_noticia_saving_news || ''),
        });
        try {
            await flushPendingNoticiaB2Uploads();
        } catch (e) {
            hideLoader();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: e.message || t.err_generico || '' });
            return;
        }

        showLoader({ upgradeOnly: true, staticPhrase: t.admin_noticia_saving_news || '' });

        try {
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
                let savedId = parseInt(idStr, 10);
                if (!savedId || savedId <= 0) {
                    savedId = parseInt(String(res.data?.IdNoticia ?? ''), 10);
                }
                if (savedId > 0) {
                    setResumeEditAfterSave(savedId);
                }
                invalidateNoticiasListCache();
                await cargarLista({ silent: true });
                if (savedId > 0) {
                    await abrirEdicion(savedId);
                }
                NotificationManager.check();
            } else if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
        } finally {
            hideLoader();
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

    ['noticia-file-img', 'noticia-file-d1', 'noticia-file-d2'].forEach((fid) => {
        document.getElementById(fid)?.addEventListener('change', () => {
            if (fid === 'noticia-file-img') syncNoticiaLocalImgPreview();
            renderNoticiaB2Ui();
        });
    });

    document.getElementById('noticia-btn-clear-img')?.addEventListener('click', () => {
        noticiaB2.ImagenPortadaB2Key = null;
        noticiaB2.ImagenPortadaNombre = null;
        const fi = document.getElementById('noticia-file-img');
        if (fi) fi.value = '';
        revokeNoticiaLocalImgPreview();
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

    function bindNoticiaB2PreviewBtn(btnId, tipo) {
        document.getElementById(btnId)?.addEventListener('click', () => {
            const previewWin = window.open('about:blank', '_blank');
            if (!previewWin) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        text: t.admin_noticia_preview_popup_blocked || t.pp_b2_preview_fail || '',
                    });
                }
                return;
            }
            const id = getEditNoticiaId();
            void (async () => {
                try {
                    await runNoticiaPreviewInWindow(previewWin, id || 0, tipo);
                } catch (err) {
                    try {
                        previewWin.close();
                    } catch (_) {
                        /* ignore */
                    }
                    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: previewFailMessage(err) });
                }
            })();
        });
    }
    bindNoticiaB2PreviewBtn('noticia-btn-prev-img', 'imagen');
    bindNoticiaB2PreviewBtn('noticia-btn-prev-d1', 'doc1');
    bindNoticiaB2PreviewBtn('noticia-btn-prev-d2', 'doc2');

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

    const resumeId = consumeResumeEditId();
    if (resumeId > 0) {
        await abrirEdicion(resumeId);
    }
}
