/**
 * Versiones de cache-bust del front GROBO.
 * Al desplegar: bump la sección que cambió y los ?v= en HTML/imports que la referencian.
 */
export const ASSET_VERSION = '20260521';

/** Portal POE, QR e URLs (poe_portal, poeQrPrint, panelPoeUrl, comunicacion_poe). */
export const POE_ASSET_VERSION = '20260521';

export const MODULE_VERSIONS = {
    core: ASSET_VERSION,
    poe: POE_ASSET_VERSION,
    poeQrPrint: POE_ASSET_VERSION,
    poePortal: POE_ASSET_VERSION,
    panelPoeUrl: POE_ASSET_VERSION,
    comunicacionPoe: POE_ASSET_VERSION,
};

/** Añade ?v= a rutas de módulos estáticos (imports ES). */
export function withAssetVersion(modulePath, version = ASSET_VERSION) {
    const path = String(modulePath ?? '').trim();
    if (!path) return path;
    const base = path.split('?')[0];
    return `${base}?v=${encodeURIComponent(String(version))}`;
}

/** Expone versión POE en window para depuración post-deploy. */
export function exposePoeAssetVersion() {
    if (typeof window === 'undefined') return;
    window.__GROBO_POE_VERSION__ = POE_ASSET_VERSION;
    window.__GROBO_ASSET_VERSION__ = ASSET_VERSION;
}
