/**
 * Convierte la URL actual (pathname) en la ruta de menú usada por capacitación / deep links.
 * @param {string} pathname window.location.pathname
 * @returns {string|null}
 */
export function pathnameToMenuPath(pathname) {
  if (!pathname) return null;
  const raw = String(pathname).replace(/\\/g, '/');
  const lower = raw.toLowerCase();
  const idx = lower.indexOf('/paginas/');
  if (idx === -1) return null;

  let rel = raw.slice(idx + '/paginas/'.length).replace(/\.html$/i, '');
  rel = rel.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!rel) return null;

  if (lower.includes('/paginas/admin/facturacion/')) {
    const m = rel.match(/^admin\/facturacion\/([^/]+)$/i);
    const seg = (m ? m[1] : 'index').toLowerCase();
    const sub = ['depto', 'investigador', 'protocolo', 'institucion', 'org'];
    if (sub.includes(seg)) return `admin/facturacion/${seg}`;
    return 'admin/facturacion/index';
  }
  if (lower.includes('/paginas/admin/configuracion/')) {
    return 'admin/configuracion/config';
  }
  if (lower.includes('/paginas/usuario/formularios')) {
    return 'panel/formularios';
  }
  if (lower.includes('/paginas/usuario/misprotocolos')) {
    return 'panel/misprotocolos';
  }
  if (
    lower.includes('/paginas/usuario/mensajes_institucion') ||
    lower.includes('/paginas/panel/mensajes_institucion')
  ) {
    return 'panel/mensajes_institucion';
  }
  if (lower.includes('/paginas/usuario/mensajes') || lower.includes('/paginas/panel/mensajes')) {
    return 'panel/mensajes';
  }
  if (lower.includes('/paginas/usuario/perfil')) {
    return 'panel/perfil';
  }

  return rel;
}

/**
 * Slug estable para hash (segmentos unidos con __ para no romper guiones bajos en rutas).
 * @param {string} menuPath ej. admin/solicitud_protocolo
 */
export function menuPathToSlug(menuPath) {
  return String(menuPath || '')
    .replace(/^\//, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('__');
}

/**
 * @param {string} slug ej. admin__usuarios
 */
export function slugToMenuPath(slug) {
  if (!slug) return null;
  const s = String(slug).trim();
  if (!s) return null;
  return s.split('__').join('/');
}
