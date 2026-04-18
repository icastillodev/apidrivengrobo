import { API } from '../api.js';
import { getCorrectPath } from './menujs/MenuConfig.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const NOTICIA_BADGE_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];

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

const refreshBound = new Set();

const DASH_NOTICIAS_PAGE_SIZE = 3;
const DASH_MENSAJES_UNREAD_MAX = 5;

function mensajesPanelHref(alcance, hiloId) {
    const base = getCorrectPath('panel/mensajes');
    const a = encodeURIComponent(alcance === 'institucional' ? 'institucional' : 'personal');
    const h = encodeURIComponent(String(hiloId));
    const sep = base.includes('?') ? '&' : '?';
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

    const [loc, unreadHilos] = await Promise.all([
        API.request(
            `/comunicacion/noticias?alcance=local&page=1&pageSize=${DASH_NOTICIAS_PAGE_SIZE}&fullCuerpo=1`,
            'GET'
        ),
        fetchUnreadHilosDashboard(),
    ]);

    if (loc?.status !== 'success') {
        if (silent && hadInjected) return;
        mount.innerHTML = `<div class="alert alert-warning border-0 shadow-sm small mb-0">${escapeHtml(t.dash_noticias_error || t.err_generico || '')}</div>`;
        return;
    }

    const rowsLoc = (loc?.data?.rows) ? loc.data.rows : [];

    const bloqueLocal = rowsLoc.length
        ? rowsLoc.map((row) => {
            const titulo = escapeHtml(row.Titulo || '—');
            const fp = row.FechaPublicacion || row.FechaCreacion || '';
            const cuerpoRaw = row.Cuerpo || row.CuerpoResumen || '';
            const cuerpoHtml = escapeHtml(cuerpoRaw);
            const idNoticia = parseInt(row.IdNoticia, 10) || 0;
            return `
            <div class="border rounded-3 p-3 bg-white shadow-sm mb-3">
                <div class="d-flex flex-wrap align-items-center gap-2 small text-muted text-uppercase mb-1" style="font-size:10px;">
                    <span>${escapeHtml(String(fp).substring(0, 16))}</span>${noticiaCategoriaBadgeHtml(row)}
                </div>
                <h6 class="fw-bold mb-2">${titulo}</h6>
                <div class="small text-dark dash-noticia-cuerpo" style="white-space: pre-wrap; max-height: 140px; overflow-y: auto;">${cuerpoHtml}</div>
                ${idNoticia ? `<a href="${portalHref()}?id=${encodeURIComponent(String(idNoticia))}" class="d-inline-block mt-2 small text-success fw-semibold">${escapeHtml(t.dash_abrir_noticia || t.ver_mas || '')}</a>` : ''}
            </div>`;
        }).join('')
        : `<div class="border rounded-3 p-3 bg-white shadow-sm"><p class="text-muted small mb-0">${escapeHtml(t.dash_sin_noticias || '')}</p></div>`;

    const bloqueMensajes = (() => {
        const tit = escapeHtml(t.dash_mensajes_titulo || '');
        const verTodos = escapeHtml(t.dash_mensajes_ver_todos || '');
        const sinNuevos = escapeHtml(t.dash_mensajes_sin_nuevos || '');
        const hrefBandeja = getCorrectPath('panel/mensajes');
        if (!unreadHilos.length) {
            return `
        <div class="col-12 mb-3">
            <p class="text-muted small mb-0">${sinNuevos}</p>
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

    mount.innerHTML = `
        ${bloqueMensajes}
        <div class="col-12">
            <div class="fw-black text-uppercase small text-muted mb-2">${escapeHtml(t.dash_noticias_locales || '')}</div>
            ${bloqueLocal}
            <div class="d-flex flex-wrap justify-content-center align-items-center gap-2 mt-3">
                <a href="${portalHref()}" class="btn btn-sm btn-outline-success fw-bold">${escapeHtml(t.dash_ver_todas || '')}</a>
                <a href="${portalHref()}?alcance=red" class="btn btn-sm btn-outline-secondary fw-bold">${escapeHtml(t.dash_ver_noticias_red || '')}</a>
            </div>
        </div>`;

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
