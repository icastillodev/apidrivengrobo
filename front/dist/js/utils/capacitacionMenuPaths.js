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

/** Orden sugerido de secciones en la biblioteca (filtrado por lo que el rol tiene). */
export const CAPACITACION_PATH_ORDER = [
  'admin/dashboard',
  'panel/dashboard',
  'capacitacion/tema/red',
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
  'panel/formularios',
  'panel/misformularios',
  'panel/misalojamientos',
  'panel/misreservas',
  'panel/misprotocolos',
  'admin/precios',
  'admin/facturacion/index',
  'admin/historialcontable',
  'panel/mensajes',
  'panel/mensajes_institucion',
  'admin/comunicacion/noticias',
  'panel/noticias',
  'panel/perfil',
  'panel/soporte',
  'panel/ventas',
  'panel/capacitacion',
];
