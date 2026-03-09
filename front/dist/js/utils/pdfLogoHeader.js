/**
 * Cabecera con logo de institución para PDF cuando LogoEnPdf = 1.
 * Usar en precios, fichas de usuario, estadísticas, facturación, etc.
 */

function getBasePath() {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '/URBE-API-DRIVEN/front/' : '/';
}

/**
 * Devuelve HTML de cabecera con logo para insertar arriba del contenido del PDF.
 * @param {number|string} logoEnPdf - 1 si debe mostrar logo
 * @param {string} logoFilename - Nombre del archivo de logo (ej. "urbe.png") o URL completa
 * @returns {string} HTML de la cabecera o cadena vacía
 */
export function getPdfLogoHeaderHtml(logoEnPdf, logoFilename) {
    if (logoEnPdf != 1 && logoEnPdf !== '1') return '';
    const logo = (logoFilename || '').trim();
    if (!logo) return '';
    const basePath = getBasePath();
    const logoUrl = logo.startsWith('http') ? logo : `${window.location.origin}${basePath}dist/multimedia/imagenes/logos/${logo}`;
    return `<div style="text-align:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e0e0e0;"><img src="${logoUrl}" alt="" style="max-height:56px;max-width:220px;object-fit:contain;" /></div>`;
}

/**
 * Obtiene cabecera de logo usando valores de localStorage (instLogoEnPdf, instLogo).
 * Útil cuando no se tiene objeto institución (ej. GeckoStats, fichas usuario).
 */
export function getPdfLogoHeaderFromStorage() {
    const logoEnPdf = localStorage.getItem('instLogoEnPdf');
    const logo = localStorage.getItem('instLogo');
    return getPdfLogoHeaderHtml(logoEnPdf, logo);
}

/**
 * Devuelve la URL del logo para usarlo en jsPDF (ej. addImage).
 * @returns {string|null} URL del logo o null si no debe mostrarse
 */
export function getPdfLogoImageUrl(logoEnPdf, logoFilename) {
    if (logoEnPdf != 1 && logoEnPdf !== '1') return null;
    const logo = (logoFilename || '').trim();
    if (!logo) return null;
    const basePath = getBasePath();
    return logo.startsWith('http') ? logo : `${window.location.origin}${basePath}dist/multimedia/imagenes/logos/${logo}`;
}
