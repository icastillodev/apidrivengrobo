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

  /**
   * Investigadores y admins usan carpetas distintas bajo paginas/ (panel/ vs usuario/) pero el menú
   * y capacitación usan rutas tipo panel/… o admin/…. Sin esto, la barra de ayuda y el tour no
   * aparecen en usuario/misalojamientos, usuario/dashboard, etc.
   */
  if (/^usuario\/misalojamientos$/i.test(rel)) return 'panel/misalojamientos';
  if (/^usuario\/misreservas$/i.test(rel)) return 'panel/misreservas';
  if (/^usuario\/misformularios$/i.test(rel)) return 'panel/misformularios';
  if (/^usuario\/dashboard$/i.test(rel)) {
    const r = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    return [1, 2, 4].includes(r) ? 'admin/dashboard' : 'panel/dashboard';
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
 * Solo el dashboard (admin o panel) debe disparar el asistente de primera configuración.
 * @param {string|null} menuPath resultado de pathnameToMenuPath
 */
export function isDashboardMenuPath(menuPath) {
  if (!menuPath) return false;
  const s = String(menuPath).toLowerCase();
  return s === 'admin/dashboard' || s === 'panel/dashboard';
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
