/** Claves i18n por ruta de menú (capacitación, FAB, listas). */
export const CAPACITACION_MENU_LABEL_KEYS = {
  'admin/dashboard': 'titulos_pagina.dashboard_admin',
  'panel/dashboard': 'titulos_pagina.dashboard_usuario',
  'usuario/dashboard': 'titulos_pagina.dashboard_usuario',
  'admin/usuarios': 'menu.users',
  'admin/protocolos': 'menu.protocols',
  'admin/solicitud_protocolo': 'titulos_pagina.solicitud_protocolo',
  'admin/animales': 'menu.animals',
  'admin/reactivos': 'menu.reagents',
  'admin/insumos': 'menu.supplies',
  'admin/reservas': 'menu.reservations',
  'admin/alojamientos': 'menu.accommodations',
  'admin/estadisticas': 'menu.stats',
  'admin/configuracion/config': 'menu.admin_config',
  'panel/formularios': 'menu.forms',
  'panel/misformularios': 'menu.my_forms',
  'usuario/misformularios': 'menu.my_forms',
  'panel/misalojamientos': 'menu.my_accommodations',
  'usuario/misalojamientos': 'menu.my_accommodations',
  'panel/misreservas': 'menu.my_reservations',
  'usuario/misreservas': 'menu.my_reservations',
  'panel/misprotocolos': 'menu.my_protocols',
  'usuario/misprotocolos': 'menu.my_protocols',
  'admin/precios': 'menu.prices',
  'admin/facturacion/index': 'menu.billing',
  'admin/facturacion/depto': 'titulos_pagina.facturacion_depto',
  'admin/facturacion/investigador': 'titulos_pagina.facturacion_investigador',
  'admin/facturacion/protocolo': 'titulos_pagina.facturacion_protocolo',
  'admin/facturacion/institucion': 'titulos_pagina.facturacion_institucion',
  'admin/facturacion/org': 'titulos_pagina.facturacion_org',
  'admin/historialcontable': 'menu.historialpagos',
  'panel/mensajes': 'menu.messages_personal',
  'usuario/mensajes': 'menu.messages_personal',
  'panel/mensajes_institucion': 'menu.messages_institucional',
  'usuario/mensajes_institucion': 'menu.messages_institucional',
  'admin/comunicacion/noticias': 'menu.news_admin',
  'panel/noticias': 'menu.news_portal',
  'panel/perfil': 'menu.config',
  'usuario/perfil': 'menu.config',
  'panel/soporte': 'menu.help_ticket',
  'panel/ventas': 'menu.help_ventas',
  'panel/capacitacion': 'menu.help_capacitacion',
  'capacitacion/tema/red': 'capacitacion.red_menu_label',
  'capacitacion/tema/modales': 'capacitacion.modals_menu_label',
};

/**
 * @param {string} path ruta menú ej. admin/usuarios
 * @param {(key: string, fallback?: string) => string} translate ej. t de i18n
 */
export function labelCapacitacionMenuPath(path, translate) {
  const key = CAPACITACION_MENU_LABEL_KEYS[path];
  if (key) {
    const v = translate(key, '');
    if (v) return v;
  }
  return path;
}
