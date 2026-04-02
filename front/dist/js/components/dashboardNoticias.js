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

/**
 * Inyecta bloque de noticias en dashboards: última noticia local con texto completo + enlaces al portal.
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

    const loc = await API.request(
        '/comunicacion/noticias?alcance=local&page=1&pageSize=1&fullCuerpo=1',
        'GET'
    );

    if (loc?.status !== 'success') {
        if (silent && hadInjected) return;
        mount.innerHTML = `<div class="alert alert-warning border-0 shadow-sm small mb-0">${escapeHtml(t.dash_noticias_error || t.err_generico || '')}</div>`;
        return;
    }

    const rowsLoc = (loc?.data?.rows) ? loc.data.rows : [];
    const first = rowsLoc[0];
    const titulo = first ? escapeHtml(first.Titulo || '—') : '';
    const fp = first ? (first.FechaPublicacion || first.FechaCreacion || '') : '';
    const cuerpoRaw = first ? (first.Cuerpo || first.CuerpoResumen || '') : '';
    const cuerpoHtml = escapeHtml(cuerpoRaw);
    const idNoticia = first ? parseInt(first.IdNoticia, 10) : 0;

    const bloqueLocal = first
        ? `
            <div class="border rounded-3 p-3 bg-white shadow-sm">
                <div class="d-flex flex-wrap align-items-center gap-2 small text-muted text-uppercase mb-1" style="font-size:10px;">
                    <span>${escapeHtml(String(fp).substring(0, 16))}</span>${noticiaCategoriaBadgeHtml(first)}
                </div>
                <h6 class="fw-bold mb-2">${titulo}</h6>
                <div class="small text-dark" style="white-space: pre-wrap;">${cuerpoHtml}</div>
                ${idNoticia ? `<a href="${portalHref()}?id=${encodeURIComponent(String(idNoticia))}" class="d-inline-block mt-2 small text-success fw-semibold">${escapeHtml(t.dash_abrir_noticia || t.ver_mas || '')}</a>` : ''}
            </div>`
        : `<div class="border rounded-3 p-3 bg-white shadow-sm"><p class="text-muted small mb-0">${escapeHtml(t.dash_sin_noticias || '')}</p></div>`;

    mount.innerHTML = `
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
