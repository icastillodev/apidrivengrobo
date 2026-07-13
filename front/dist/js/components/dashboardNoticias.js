import { API } from '../api.js';
import { buildPanelPoePublicPageRelativeUrl } from '../utils/panelPoeUrl.js?v=20260703';
import { openPoeDashboardModal } from '../utils/poeDetailUi.js?v=20260703';
import { getCorrectPath } from './menujs/MenuConfig.js';
import { hydrateNoticiaPortadaThumbs, bindNoticiaAdjuntoOpenButtons } from '../utils/noticiaPortadaThumb.js?v=20260703';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const NOTICIA_BADGE_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];

function noticiaPortadaThumbBlock(row) {
    const id = parseInt(row.IdNoticia, 10) || 0;
    if (!id || !row.ImagenPortadaB2Key || String(row.ImagenPortadaB2Key).trim() === '') return '';
    return `<div class="mb-2 rounded overflow-hidden bg-light d-none border dash-noticia-portada-wrap dash-noticia-portada--adaptive" data-noticia-portada-id="${id}" data-dash-portada-adaptive="1">
        <img alt="" class="w-100 d-block dash-noticia-portada-img" />
    </div>`;
}

function noticiaAdjuntosBlock(row) {
    const tc = window.txt?.comunicacion || {};
    const idNoticia = parseInt(row.IdNoticia, 10) || 0;
    if (!idNoticia) return '';
    const btns = [];
    if (row.AdjuntoDoc1B2Key && String(row.AdjuntoDoc1B2Key).trim()) {
        const nm = escapeHtml(String(row.AdjuntoDoc1Nombre || '').trim() || tc.noticia_adjunto_sin_nombre || '—');
        btns.push(
            `<button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" data-open-noticia-archivo="${idNoticia}" data-noticia-tipo="doc1">${nm}</button>`
        );
    }
    if (row.AdjuntoDoc2B2Key && String(row.AdjuntoDoc2B2Key).trim()) {
        const nm = escapeHtml(String(row.AdjuntoDoc2Nombre || '').trim() || tc.noticia_adjunto_sin_nombre || '—');
        btns.push(
            `<button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" data-open-noticia-archivo="${idNoticia}" data-noticia-tipo="doc2">${nm}</button>`
        );
    }
    if (!btns.length) return '';
    const lab = escapeHtml(tc.noticia_adjuntos_label || '');
    return `<div class="mt-2 pt-2 border-top border-opacity-50"><div class="small text-muted text-uppercase mb-1" style="font-size:10px;">${lab}</div><div class="d-flex flex-wrap gap-1">${btns.join('')}</div></div>`;
}

function noticiaCategoriaBadgeHtml(r) {
    const name = String(r?.Categoria ?? '').trim();
    if (!name) return '';
    let v = String(r?.CategoriaBadge ?? 'primary').toLowerCase();
    if (!NOTICIA_BADGE_VARIANTS.includes(v)) v = 'primary';
    return `<span class="badge text-bg-${v} ms-1" style="font-size:10px;vertical-align:middle;">${escapeHtml(name)}</span>`;
}

function portalHref() {
    return getCorrectPath('panel/noticias');
}

function poePortalHref() {
    return buildPanelPoePublicPageRelativeUrl();
}

function renderPoeDashboardBlock(poeRows, t) {
    const tit = escapeHtml(t.dash_poe_label || '');
    const ver = escapeHtml(t.dash_poe_ver_todos || '');
    if (!poeRows || !poeRows.length) {
        return `
        <div class="col-12 mb-3">
            <div class="border rounded-3 overflow-hidden bg-white shadow-sm">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-bottom bg-light">
                    <div class="fw-black text-uppercase small text-muted mb-0">${tit}</div>
                    <a href="${poePortalHref()}" class="btn btn-sm btn-outline-success fw-bold">${ver}</a>
                </div>
                <div class="px-3 py-3 text-muted small mb-0">${escapeHtml(t.dash_poe_empty || t.poe_empty || '')}</div>
            </div>
        </div>`;
    }
    const max = 5;
    const slice = poeRows.slice(0, max);
    const lines = slice
        .map((r) => {
            const id = parseInt(r.IdPoe, 10) || 0;
            if (!id) return '';
            const title = escapeHtml(r.Titulo || '—');
            return `<li class="list-group-item py-2">
                <button type="button" class="btn btn-link p-0 fw-semibold text-success text-decoration-none text-start" data-dash-poe-open="${id}">${title}</button>
            </li>`;
        })
        .join('');
    return `
        <div class="col-12 mb-3">
            <div class="border rounded-3 overflow-hidden bg-white shadow-sm">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-bottom bg-light">
                    <div class="fw-black text-uppercase small text-muted mb-0">${tit}</div>
                    <a href="${poePortalHref()}" class="btn btn-sm btn-outline-success fw-bold">${ver}</a>
                </div>
                <ul class="list-group list-group-flush">${lines}</ul>
            </div>
        </div>`;
}

function renderPortadaDashboardBlock(pp, t) {
    if (!pp) return '';
    const tit = (pp.PortadaTitulo || '').trim();
    const cue = (pp.PortadaCuerpo || '').trim();
    const adj = pp.portada_adjuntos || [];
    if (!tit && !cue && adj.length === 0) return '';
    const adjHtml = adj.length
        ? `<div class="d-flex flex-wrap gap-2 mt-2">${adj
              .map(
                  (a) =>
                      `<a href="${escapeHtml(a.url)}" class="btn btn-sm btn-outline-success fw-bold" target="_blank" rel="noopener noreferrer">${escapeHtml(
                          a.nombre || a.url
                      )}</a>`
              )
              .join('')}</div>`
        : '';
    return `
        <div class="col-12 mb-3">
            <div class="card border-0 shadow-sm border-start border-success border-4 overflow-hidden">
                <div class="card-body">
                    <div class="fw-black text-uppercase small text-muted mb-2">${escapeHtml(t.dash_portada_label || '')}</div>
                    ${tit ? `<h5 class="fw-bold mb-2">${escapeHtml(tit)}</h5>` : ''}
                    ${cue ? `<div class="small text-dark" style="white-space: pre-wrap;">${escapeHtml(cue)}</div>` : ''}
                    ${adjHtml}
                </div>
            </div>
        </div>`;
}

function maybeShowPortadaPopup(pp, t) {
    if (!pp || parseInt(pp.PopupActivo, 10) !== 1) return;
    const tit = (pp.PopupTitulo || '').trim();
    const cue = (pp.PopupCuerpo || '').trim();
    const adj = pp.popup_adjuntos || [];
    const news = pp.PopupNoticia;
    const imgUrl = (pp.PopupImagenUrl || '').trim();
    if (!tit && !cue && adj.length === 0 && !news && !imgUrl) return;

    const modalId = 'grobo-modal-portada-popup';
    document.getElementById(modalId)?.remove();

    const titleModal = tit || (t.pp_popup_fallback_title || '');
    const newsHtml =
        news && news.IdNoticia
            ? `<div class="mt-3 pt-2 border-top">
            <a href="${portalHref()}?id=${encodeURIComponent(String(news.IdNoticia))}" class="btn btn-success btn-sm fw-bold">${escapeHtml(
                  t.pp_popup_ver_noticia || t.dash_abrir_noticia || ''
              )}</a>
            <div class="small text-muted mt-2 text-break">${escapeHtml(news.Titulo || '')}</div>
        </div>`
            : '';
    const adjHtml = adj.length
        ? `<div class="d-flex flex-wrap gap-2 mt-3">${adj
              .map((a) => {
                  const url = String(a?.url || '').trim();
                  const nombre = escapeHtml(a?.nombre || a?.url || 'adjunto');
                  const isB2 = a?.origen === 'b2' || /\/comunicacion\/portada-popup\/archivo\//.test(url);
                  if (isB2 && url) {
                      return `<button type="button" class="btn btn-sm btn-outline-secondary" data-popup-auth-file="${escapeHtml(url)}">${nombre}</button>`;
                  }
                  return `<a href="${escapeHtml(url)}" class="btn btn-sm btn-outline-secondary" target="_blank" rel="noopener noreferrer">${nombre}</a>`;
              })
              .join('')}</div>`
        : '';
    const imgHtml = imgUrl
        ? `<div class="mb-3 text-center"><img data-popup-auth-img="${escapeHtml(imgUrl)}" class="img-fluid rounded shadow-sm d-none" alt="" loading="lazy"></div>`
        : '';

    document.body.insertAdjacentHTML(
        'beforeend',
        `<div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">${escapeHtml(titleModal)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-2">
                        ${imgHtml}
                        ${cue ? `<div class="small text-dark" style="white-space:pre-wrap">${escapeHtml(cue)}</div>` : ''}
                        ${adjHtml}
                        ${newsHtml}
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-success fw-bold px-4" data-bs-dismiss="modal">${escapeHtml(t.modal_cerrar || '')}</button>
                    </div>
                </div>
            </div>
        </div>`
    );

    const el = document.getElementById(modalId);
    if (el && window.bootstrap?.Modal) {
        const m = new window.bootstrap.Modal(el);
        el.addEventListener('hidden.bs.modal', () => el.remove(), { once: true });
        m.show();
        hydratePopupAuthAssets(el, t.err_generico || '');
    }
}

function popupAuthHeaders() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Imagen/adjuntos B2 del popup requieren JWT: no se pueden poner en src/href crudo. */
async function hydratePopupAuthAssets(root, errFallback) {
    if (!root) return;
    const imgs = [...root.querySelectorAll('[data-popup-auth-img]')];
    await Promise.all(
        imgs.map(async (img) => {
            const url = img.getAttribute('data-popup-auth-img');
            if (!url) return;
            try {
                const res = await fetch(url, { headers: popupAuthHeaders() });
                if (!res.ok) {
                    img.remove();
                    return;
                }
                const blob = await res.blob();
                if (!blob.size || !(blob.type || '').startsWith('image/')) {
                    img.remove();
                    return;
                }
                const objUrl = URL.createObjectURL(blob);
                img.src = objUrl;
                img.classList.remove('d-none');
                img.addEventListener('load', () => URL.revokeObjectURL(objUrl), { once: true });
            } catch (_) {
                img.remove();
            }
        })
    );

    root.querySelectorAll('[data-popup-auth-file]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const url = btn.getAttribute('data-popup-auth-file');
            if (!url) return;
            const previewWin = window.open('about:blank', '_blank');
            try {
                const res = await fetch(url, { headers: popupAuthHeaders() });
                if (!res.ok) throw new Error(String(res.status));
                const blob = await res.blob();
                const objUrl = URL.createObjectURL(blob);
                if (previewWin) {
                    previewWin.location.href = objUrl;
                } else {
                    window.location.href = objUrl;
                }
                setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
            } catch (e) {
                try {
                    previewWin?.close();
                } catch (_) {}
                window.Swal?.fire?.({ icon: 'error', text: errFallback || String(e?.message || e) });
            }
        });
    });
}

const refreshBound = new Set();

/** Máximo de noticias con `OrdenFijo` visibles en el bloque destacado del panel (dos filas de 3 en `md+`). */
const DASH_NOTICIAS_PIN_MAX = 6;

/** Listado API: suficientes ítems para destacadas + recientes debajo. */
const DASH_NOTICIAS_PAGE_SIZE = 14;
const DASH_MENSAJES_UNREAD_MAX = 5;

function mensajesPanelHref(alcance, hiloId) {
    const inst = alcance === 'institucional';
    const base = getCorrectPath(inst ? 'panel/mensajes_institucion' : 'panel/mensajes');
    const h = encodeURIComponent(String(hiloId));
    const sep = base.includes('?') ? '&' : '?';
    if (inst) {
        return `${base}${sep}hilo=${h}`;
    }
    const a = encodeURIComponent('personal');
    return `${base}${sep}alcance=${a}&hilo=${h}`;
}

/**
 * Hilos con mensajes sin leer (personal + institucional si la API responde).
 * @returns {Promise<Array<{ IdMensajeHilo: number|string, Asunto?: string, NoLeidos?: number|string, FechaUltimoMensaje?: string, FechaCreacion?: string, _alcance: 'personal'|'institucional' }>>}
 */
async function fetchUnreadHilosDashboard() {
    const [pers, inst] = await Promise.all([
        API.request('/comunicacion/mensajes/hilos?alcance=personal', 'GET'),
        API.request('/comunicacion/mensajes/hilos?alcance=institucional', 'GET'),
    ]);
    const out = [];
    const pushUnread = (res, alcance) => {
        if (res?.status !== 'success' || !Array.isArray(res.data)) return;
        for (const h of res.data) {
            const n = parseInt(h.NoLeidos || 0, 10);
            if (n > 0) out.push({ ...h, _alcance: alcance });
        }
    };
    pushUnread(pers, 'personal');
    pushUnread(inst, 'institucional');
    const seen = new Set();
    const uniq = out.filter((h) => {
        const id = parseInt(h.IdMensajeHilo, 10) || 0;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
    uniq.sort((a, b) => String(b.FechaUltimoMensaje || b.FechaCreacion || '').localeCompare(String(a.FechaUltimoMensaje || a.FechaCreacion || '')));
    return uniq.slice(0, DASH_MENSAJES_UNREAD_MAX);
}

/**
 * Inyecta bloque de noticias en dashboards: hasta 3 noticias locales + enlaces al portal.
 * @param {string} mountId
 * @param {{ silent?: boolean }} [options] — silent: no vacía el bloque ni muestra "cargando" si ya hay contenido (refresco al volver a la pestaña).
 */
export async function injectDashboardNoticias(mountId, options = {}) {
    const silent = options.silent === true;
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const t = window.txt?.comunicacion || {};
    const hadInjected = mount.dataset.newsDashboardInjected === '1';

    if (!silent || mount.childElementCount === 0) {
        mount.innerHTML = `<div class="text-center text-muted py-3 small">${escapeHtml(t.msg_cargando || '')}</div>`;
    }

    const [loc, unreadHilos, ppRes, poeRes] = await Promise.all([
        API.request(
            `/comunicacion/noticias?alcance=local&page=1&pageSize=${DASH_NOTICIAS_PAGE_SIZE}&fullCuerpo=1`,
            'GET'
        ),
        fetchUnreadHilosDashboard(),
        API.request('/comunicacion/portada-popup', 'GET'),
        API.request('/comunicacion/poe', 'GET'),
    ]);

    const ppConfig = ppRes?.status === 'success' && ppRes.data ? ppRes.data : null;
    const poeRows = poeRes?.status === 'success' && poeRes.data?.rows ? poeRes.data.rows : [];

    const wirePoeButtons = () => {
        mount.querySelectorAll('[data-dash-poe-open]').forEach((btn) => {
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const id = parseInt(btn.getAttribute('data-dash-poe-open'), 10);
                if (id > 0) openPoeDashboardModal(id);
            });
        });
    };

    if (loc?.status !== 'success') {
        if (silent && hadInjected) return;
        const bloquePortadaErr = renderPortadaDashboardBlock(ppConfig, t);
        const bloquePoeErr = renderPoeDashboardBlock(poeRows, t);
        mount.innerHTML = `
            ${bloquePortadaErr}
            ${bloquePoeErr}
            <div class="alert alert-warning border-0 shadow-sm small mb-0">${escapeHtml(t.dash_noticias_error || t.err_generico || '')}</div>`;
        if (!silent) {
            maybeShowPortadaPopup(ppConfig, t);
        }
        wirePoeButtons();
        mount.dataset.newsDashboardInjected = '1';
        return;
    }

    const rowsLoc = (loc?.data?.rows) ? loc.data.rows : [];

    function noticiaCardInner(row) {
        const titulo = escapeHtml(row.Titulo || '—');
        const fp = row.FechaPublicacion || row.FechaCreacion || '';
        const cuerpoRaw = row.Cuerpo || row.CuerpoResumen || '';
        const cuerpoHtml = escapeHtml(cuerpoRaw);
        const idNoticia = parseInt(row.IdNoticia, 10) || 0;
        return `
            ${noticiaPortadaThumbBlock(row)}
            <div class="d-flex flex-wrap align-items-center gap-2 small text-muted text-uppercase mb-1" style="font-size:10px;">
                <span>${escapeHtml(String(fp).substring(0, 16))}</span>${noticiaCategoriaBadgeHtml(row)}
            </div>
            <h6 class="fw-bold mb-2">${titulo}</h6>
            <div class="small text-dark dash-noticia-cuerpo" style="white-space: pre-wrap; max-height: 140px; overflow-y: auto;">${cuerpoHtml}</div>
            ${noticiaAdjuntosBlock(row)}
            ${idNoticia ? `<a href="${portalHref()}?id=${encodeURIComponent(String(idNoticia))}" class="d-inline-block mt-2 small text-success fw-semibold">${escapeHtml(t.dash_abrir_noticia || t.ver_mas || '')}</a>` : ''}`;
    }

    const pinned = [];
    const rest = [];
    for (const row of rowsLoc) {
        const o = row.OrdenFijo != null && row.OrdenFijo !== '' ? parseInt(row.OrdenFijo, 10) : NaN;
        if (o >= 1 && o <= DASH_NOTICIAS_PIN_MAX) {
            pinned.push(row);
        } else {
            rest.push(row);
        }
    }
    pinned.sort((a, b) => parseInt(a.OrdenFijo, 10) - parseInt(b.OrdenFijo, 10));
    const pinnedShow = pinned.slice(0, DASH_NOTICIAS_PIN_MAX);

    const bloquePinned =
        pinnedShow.length > 0
            ? `
        <div class="mb-3">
            <div class="fw-black text-uppercase small text-muted mb-2">${escapeHtml(t.dash_noticias_destacadas || '')}</div>
            <div class="row g-2">
                ${pinnedShow
                    .map(
                        (row) => `
                <div class="col-12 col-md-4">
                    <div class="border rounded-3 p-3 bg-white shadow-sm h-100 pointer transition-hover" style="cursor:pointer" role="link" tabindex="0"
                         data-dash-noticia-id="${parseInt(row.IdNoticia, 10) || 0}">
                        ${noticiaCardInner(row)}
                    </div>
                </div>`
                    )
                    .join('')}
            </div>
        </div>`
            : '';

    const bloqueLocal =
        rest.length > 0
            ? rest
                  .map((row) => {
                      const idNoticia = parseInt(row.IdNoticia, 10) || 0;
                      const inner = noticiaCardInner(row);
                      return `
            <div class="border rounded-3 p-3 bg-white shadow-sm mb-3">
                ${inner}
            </div>`;
                  })
                  .join('')
            : pinnedShow.length === 0
              ? `<div class="border rounded-3 p-3 bg-white shadow-sm"><p class="text-muted small mb-0">${escapeHtml(t.dash_sin_noticias || '')}</p></div>`
              : '';

    const bloqueMensajes = (() => {
        const tit = escapeHtml(t.dash_mensajes_titulo || '');
        const verTodos = escapeHtml(t.dash_mensajes_ver_todos || '');
        const sinNuevos = escapeHtml(t.dash_mensajes_sin_nuevos || '');
        const hrefBandeja = getCorrectPath('panel/mensajes');
        if (!unreadHilos.length) {
            return `
        <div class="col-12 mb-4">
            <div class="border rounded-3 overflow-hidden bg-white shadow-sm">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-bottom bg-light">
                    <div class="fw-black text-uppercase small text-muted mb-0">${tit}</div>
                    <a href="${hrefBandeja}" class="btn btn-sm btn-success fw-bold">${verTodos}</a>
                </div>
                <div class="px-3 py-4 text-center text-muted small mb-0">${sinNuevos}</div>
            </div>
        </div>`;
        }
        const lines = unreadHilos.map((h) => {
            const asunto = escapeHtml(String(h.Asunto || '').trim() || (t.msg_hilo_sin_asunto || '—'));
            const n = parseInt(h.NoLeidos || 0, 10) || 0;
            const badge = n > 1 ? ` <span class="badge bg-danger rounded-pill">${escapeHtml(String(n))}</span>` : '';
            const href = mensajesPanelHref(h._alcance, h.IdMensajeHilo);
            return `
            <a href="${href}" class="list-group-item list-group-item-action py-3 d-flex justify-content-between align-items-start gap-2">
                <div class="flex-grow-1" style="min-width:0">
                    <div class="small text-uppercase text-muted mb-1" style="font-size:10px;">${escapeHtml(t.msg_asunto || '')}</div>
                    <div class="fw-semibold text-dark text-break">${asunto}${badge}</div>
                </div>
                <i class="bi bi-chat-dots text-success fs-5 flex-shrink-0 mt-1"></i>
            </a>`;
        }).join('');
        return `
        <div class="col-12 mb-4">
            <div class="border rounded-3 overflow-hidden bg-white shadow-sm">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-bottom bg-light">
                    <div class="fw-black text-uppercase small text-muted mb-0">${tit}</div>
                    <a href="${hrefBandeja}" class="btn btn-sm btn-success fw-bold">${verTodos}</a>
                </div>
                <div class="list-group list-group-flush">${lines}</div>
            </div>
        </div>`;
    })();

    const showListaTitulo = rest.length > 0 || rowsLoc.length === 0;
    const bloqueTituloYLista = showListaTitulo
        ? `<div class="fw-black text-uppercase small text-muted mb-2">${escapeHtml(t.dash_noticias_locales || '')}</div>${bloqueLocal}`
        : '';

    const bloquePortada = renderPortadaDashboardBlock(ppConfig, t);
    const bloquePoe = renderPoeDashboardBlock(poeRows, t);

    mount.innerHTML = `
        ${bloquePortada}
        ${bloquePoe}
        ${bloqueMensajes}
        <div class="col-12">
            ${bloquePinned}
            ${bloqueTituloYLista}
            <div class="d-flex flex-wrap justify-content-center align-items-center gap-2 mt-3">
                <a href="${portalHref()}" class="btn btn-sm btn-outline-success fw-bold">${escapeHtml(t.dash_ver_todas || '')}</a>
                <a href="${portalHref()}?alcance=red" class="btn btn-sm btn-outline-secondary fw-bold">${escapeHtml(t.dash_ver_noticias_red || '')}</a>
            </div>
        </div>`;

    if (!silent) {
        maybeShowPortadaPopup(ppConfig, t);
    }

    mount.querySelectorAll('[data-dash-noticia-id]').forEach((el) => {
        const id = el.getAttribute('data-dash-noticia-id');
        if (!id || id === '0') return;
        const go = () => {
            window.location.href = `${portalHref()}?id=${encodeURIComponent(id)}`;
        };
        el.addEventListener('click', go);
        el.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                go();
            }
        });
    });

    await hydrateNoticiaPortadaThumbs(mount);
    bindNoticiaAdjuntoOpenButtons(mount, t.err_generico || '');

    wirePoeButtons();

    mount.dataset.newsDashboardInjected = '1';

    if (!refreshBound.has(mountId)) {
        refreshBound.add(mountId);
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState !== 'visible') return;
            if (!document.getElementById(mountId)) return;
            await injectDashboardNoticias(mountId, { silent: true });
        });
    }
}
