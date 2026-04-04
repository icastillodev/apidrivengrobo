/**
 * Convierte la URL actual (pathname) en la ruta de menú usada por capacitación / deep links.
 * @param {string} pathname window.location.pathname
 * @returns {string|null}
 *
 * Notas checklist §9 (extras):
 * - **Configuración:** cualquier `admin/configuracion/*` se mapea al hub `admin/configuracion/config`
 *   (un solo capítulo en el manual). Subpantallas no tienen slug propio en capacitación.
 * - **Superadmin / rutas fuera de panel estándar:** si `pathname` no contiene `/paginas/`, devuelve `null`;
 *   la barra inferior de ayuda no enlazará al manual hasta haber mapeo explícito (documentar en §9 si se amplía).
 * - **QR / salas:** si la URL no pasa por `/paginas/...` típico, mismo criterio: ampliar aquí cuando haya ruta estable.
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

  /** Misma página `panel/capacitacion`: el hash distingue el tema RED para tour y barra contextual. */
  if (/^panel\/capacitacion$/i.test(rel) && typeof window !== 'undefined' && window.location?.hash) {
    const hm = window.location.hash.match(/[#&]t=([^&]+)/);
    if (hm) {
      try {
        const slug = decodeURIComponent(hm[1].replace(/\+/g, ' ')).trim();
        if (slug === 'capacitacion__tema__red') return 'capacitacion/tema/red';
      } catch {
        /* ignore */
      }
    }
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
