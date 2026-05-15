import { getMenuTemplates } from '../components/menujs/MenuTemplates.js';

/**
 * Recorre plantillas de menú para los IDs permitidos y devuelve rutas `path` visibles.
 * @param {number[]} menuIds
 * @param {number} roleId
 * @returns {Set<string>}
 */
export function collectMenuPathsFromIds(menuIds, roleId) {
  const templates = getMenuTemplates(roleId) || {};
  const paths = new Set();

  (menuIds || []).forEach((mid) => {
    const t = templates[mid];
    if (!t) return;
    if (t.path && t.path !== 'construccion' && t.path !== 'logout') {
      paths.add(String(t.path).replace(/^\//, ''));
    }
    if (Array.isArray(t.children)) {
      t.children.forEach((c) => {
        if (c.path && c.path !== 'construccion' && c.path !== 'logout') {
          paths.add(String(c.path).replace(/^\//, ''));
        }
      });
    }
  });

  return paths;
}

/** Subrutas de facturación (no salen del menú 202; se añaden si el rol tiene el hub). */
export const FACTURACION_SUB_PATHS = [
  'admin/facturacion/depto',
  'admin/facturacion/investigador',
  'admin/facturacion/protocolo',
  'admin/facturacion/institucion',
  'admin/facturacion/org',
];

/** Si el usuario puede abrir el centro de facturación, habilita guías FAB/manual por subpantalla. */
export function expandFacturacionPathsIfAllowed(allowedSet) {
  if (!allowedSet || typeof allowedSet.has !== 'function') return;
  if (allowedSet.has('admin/facturacion/index')) {
    FACTURACION_SUB_PATHS.forEach((p) => allowedSet.add(p));
  }
}

/** Subpantallas de configuración enlazadas desde el hub (no siempre aparecen como `path` propio en el menú lateral). */
export const CONFIG_SUB_PATHS = ['admin/configuracion/alojamientos'];

/** Si el usuario tiene el hub de configuración, habilita manual/tour en subpantallas habituales. */
export function expandConfigSubpathsIfAllowed(allowedSet) {
  if (!allowedSet || typeof allowedSet.has !== 'function') return;
  if (allowedSet.has('admin/configuracion/config')) {
    CONFIG_SUB_PATHS.forEach((p) => allowedSet.add(p));
  }
}

/** Pantallas enlazadas desde noticias / comunicación (no siempre tienen ítem propio en el menú lateral). */
export const COMUNICACION_PANEL_SUB_PATHS = ['panel/poe'];

export const COMUNICACION_ADMIN_SUB_PATHS = [
  'admin/comunicacion/poe',
  'admin/comunicacion/portada-popup',
];

/** Habilita manual/tour en subpantallas de comunicación según el hub que el rol tenga en menú. */
export function expandComunicacionSubpathsIfAllowed(allowedSet) {
  if (!allowedSet || typeof allowedSet.has !== 'function') return;
  if (allowedSet.has('panel/noticias') || allowedSet.has('panel/poe')) {
    COMUNICACION_PANEL_SUB_PATHS.forEach((p) => allowedSet.add(p));
  }
  if (allowedSet.has('admin/comunicacion/noticias')) {
    COMUNICACION_ADMIN_SUB_PATHS.forEach((p) => allowedSet.add(p));
  } else if (allowedSet.has('admin/comunicacion/poe')) {
    allowedSet.add('admin/comunicacion/poe');
  }
}

/** Orden sugerido de secciones en la biblioteca (filtrado por lo que el rol tiene). */
export const CAPACITACION_PATH_ORDER = [
  'admin/dashboard',
  'panel/dashboard',
  'capacitacion/tema/red',
  'capacitacion/tema/modales',
  'admin/usuarios',
  'admin/protocolos',
  'admin/solicitud_protocolo',
  'admin/animales',
  'admin/reactivos',
  'admin/insumos',
  'admin/reservas',
  'admin/alojamientos',
  'admin/estadisticas',
  'admin/configuracion/config',
  'admin/configuracion/alojamientos',
  'panel/formularios',
  'panel/misformularios',
  'panel/misalojamientos',
  'usuario/misalojamientos',
  'panel/misreservas',
  'usuario/misreservas',
  'panel/misprotocolos',
  'admin/precios',
  'admin/facturacion/index',
  'admin/facturacion/depto',
  'admin/facturacion/investigador',
  'admin/facturacion/protocolo',
  'admin/facturacion/institucion',
  'admin/facturacion/org',
  'admin/historialcontable',
  'panel/mensajes',
  'panel/mensajes_institucion',
  'admin/comunicacion/noticias',
  'admin/comunicacion/portada-popup',
  'admin/comunicacion/poe',
  'panel/noticias',
  'panel/poe',
  'panel/perfil',
  'panel/soporte',
  'panel/ventas',
  'panel/capacitacion',
];
