/** Base del front (local vs producción). Módulo liviano: no depende de api.js. */
export function getGroboFrontBasePathForPoe() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '/URBE-API-DRIVEN/front/'
        : '/';
}

/** Portal POE — ruta explícita a paginas/panel/poe.html (no depende del rewrite nginx /panel/poe). */
export function buildPanelPoePublicPageRelativeUrl(idPoe) {
    const base = `${getGroboFrontBasePathForPoe()}paginas/panel/poe.html`;
    const id = String(idPoe ?? '').trim();
    if (!id) return base;
    return `${base}?id=${encodeURIComponent(id)}`;
}

export function buildPanelPoePublicPageAbsoluteUrl(idPoe) {
    return window.location.origin + buildPanelPoePublicPageRelativeUrl(idPoe);
}
