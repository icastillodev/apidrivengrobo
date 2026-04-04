/**
 * Pasos del tutorial interactivo por ruta de menú (mismo criterio que capacitación).
 * titleKey / bodyKey → window.txt.capacitacion.<clave>
 * En el texto del body (i18n):
 * - Doble salto \n\n: primer bloque = para qué sirve la zona en el flujo (función), no una paráfrasis del título ni del texto visible; resto = detalle operativo (etiquetas i18n: «Para qué sirve» / «Detalle y uso»).
 * - Líneas que empiezan por "- " o "• " dentro de un bloque → lista con viñetas.
 * - {{i:nombre}} o {{i:bi-nombre}} → icono Bootstrap Icons (solo nombres alfanuméricos y guiones).
 * - {{svg:click}} | {{svg:hand}} → icono SVG inline (clic / gesto).
 */

/**
 * Primera visita global: qué es GROBO, menú, preferencias (voz, tema, atajos), Gecko Search, barra de ayuda.
 */
const TOUR_STEPS_WELCOME = [
  {
    selector: 'a[href="https://groboapp.com"]',
    titleKey: 'tour_welcome_s1_title',
    bodyKey: 'tour_welcome_s1_body',
  },
  {
    selector: '#main-menu-ul, #side-menu-ul, #mobile-menu-ul',
    titleKey: 'tour_welcome_s2_title',
    bodyKey: 'tour_welcome_s2_body',
  },
  {
    selector: '#side-controls-ul, #main-menu-ul > li:last-child',
    titleKey: 'tour_welcome_s3_title',
    bodyKey: 'tour_welcome_s3_body',
  },
  {
    selector: '#gecko-search-trigger',
    titleKey: 'tour_welcome_s4_title',
    bodyKey: 'tour_welcome_s4_body',
  },
  {
    selector: '#gecko-capacitacion-fab',
    titleKey: 'tour_welcome_s5_title',
    bodyKey: 'tour_welcome_s5_body',
  },
];

const TOUR_STEPS_INVESTIGADOR_DASHBOARD = [
  {
    selector: '#main-menu-ul, #side-menu-ul, #mobile-menu-ul',
    titleKey: 'tour_dashboard_menu_s1_title',
    bodyKey: 'tour_dashboard_menu_s1_body',
  },
  {
    selector: '#dashboard-welcome',
    titleKey: 'tour_panel_dash_s1_title',
    bodyKey: 'tour_panel_dash_s1_body',
  },
  {
    selector: '#dashboard-noticias-mount',
    titleKey: 'tour_panel_dash_s2_title',
    bodyKey: 'tour_panel_dash_s2_body',
  },
  {
    selector: '#dashboard-grid',
    titleKey: 'tour_panel_dash_s3_title',
    bodyKey: 'tour_panel_dash_s3_body',
  },
];

const TOUR_STEPS_ADMIN_DASHBOARD = [
  {
    selector: '#main-menu-ul, #side-menu-ul, #mobile-menu-ul',
    titleKey: 'tour_dashboard_menu_s1_title',
    bodyKey: 'tour_dashboard_menu_s1_body',
  },
  {
    selector: '#dashboard-welcome',
    titleKey: 'tour_admin_dash_s1_title',
    bodyKey: 'tour_admin_dash_s1_body',
  },
  {
    selector: '#dashboard-noticias-mount',
    titleKey: 'tour_admin_dash_s2_title',
    bodyKey: 'tour_admin_dash_s2_body',
  },
  {
    selector: '#dashboard-grid',
    titleKey: 'tour_admin_dash_s3_title',
    bodyKey: 'tour_admin_dash_s3_body',
  },
];

const TOUR_STEPS_MENSAJES = [
  {
    selector: '#mensajes-page-header',
    titleKey: 'tour_mensajes_s1_title',
    bodyKey: 'tour_mensajes_s1_body',
  },
  {
    selector: '#lista-hilos',
    titleKey: 'tour_mensajes_s2_title',
    bodyKey: 'tour_mensajes_s2_body',
  },
  {
    selector: '#panel-hilo-wrap',
    titleKey: 'tour_mensajes_s3_title',
    bodyKey: 'tour_mensajes_s3_body',
  },
  {
    selector: '#btn-nuevo-msg',
    titleKey: 'tour_mensajes_s4_title',
    bodyKey: 'tour_mensajes_s4_body',
  },
];

const TOUR_STEPS_MENSAJES_INST = [
  {
    selector: '#mensajes-page-header',
    titleKey: 'tour_mensajes_inst_s1_title',
    bodyKey: 'tour_mensajes_inst_s1_body',
  },
  {
    selector: '#lista-hilos',
    titleKey: 'tour_mensajes_inst_s2_title',
    bodyKey: 'tour_mensajes_inst_s2_body',
  },
  {
    selector: '#panel-hilo-wrap',
    titleKey: 'tour_mensajes_inst_s3_title',
    bodyKey: 'tour_mensajes_inst_s3_body',
  },
  {
    selector: '#btn-nuevo-msg',
    titleKey: 'tour_mensajes_inst_s4_title',
    bodyKey: 'tour_mensajes_inst_s4_body',
  },
];

const TOUR_STEPS_NOTICIAS_PORTAL = [
  {
    selector: '#noticias-page-header',
    titleKey: 'tour_noticias_s1_title',
    bodyKey: 'tour_noticias_s1_body',
  },
  {
    selector: '#filtro-alcance',
    titleKey: 'tour_noticias_s2_title',
    bodyKey: 'tour_noticias_s2_body',
  },
  {
    selector: '#noticias-toolbar',
    titleKey: 'tour_noticias_s3_title',
    bodyKey: 'tour_noticias_s3_body',
  },
  {
    selector: '#noticias-grid',
    titleKey: 'tour_noticias_s4_title',
    bodyKey: 'tour_noticias_s4_body',
  },
];

const TOUR_STEPS_SOPORTE = [
  {
    selector: '#soporte-page-header',
    titleKey: 'tour_soporte_s1_title',
    bodyKey: 'tour_soporte_s1_body',
  },
  {
    selector: '#lista-tickets',
    titleKey: 'tour_soporte_s2_title',
    bodyKey: 'tour_soporte_s2_body',
  },
  {
    selector: '#panel-ticket-wrap',
    titleKey: 'tour_soporte_s3_title',
    bodyKey: 'tour_soporte_s3_body',
  },
  {
    selector: '#btn-nuevo-ticket',
    titleKey: 'tour_soporte_s4_title',
    bodyKey: 'tour_soporte_s4_body',
  },
];

const TOUR_STEPS_PERFIL = [
  {
    selector: '#perfil-page-header',
    titleKey: 'tour_perfil_s1_title',
    bodyKey: 'tour_perfil_s1_body',
  },
  {
    selector: '#perfil-card-resumen',
    titleKey: 'tour_perfil_s2_title',
    bodyKey: 'tour_perfil_s2_body',
  },
  {
    selector: '#perfil-datos-personales',
    titleKey: 'tour_perfil_s3_title',
    bodyKey: 'tour_perfil_s3_body',
  },
  {
    selector: '#perfil-seguridad',
    titleKey: 'tour_perfil_s4_title',
    bodyKey: 'tour_perfil_s4_body',
  },
];

const TOUR_STEPS_VENTAS = [
  {
    selector: '#ventas-page-header',
    titleKey: 'tour_ventas_s1_title',
    bodyKey: 'tour_ventas_s1_body',
  },
  {
    selector: '#ventas-intro',
    titleKey: 'tour_ventas_s2_title',
    bodyKey: 'tour_ventas_s2_body',
  },
  {
    selector: '#ventas-form-card',
    titleKey: 'tour_ventas_s3_title',
    bodyKey: 'tour_ventas_s3_body',
  },
  {
    selector: '#ventas-btn-enviar',
    titleKey: 'tour_ventas_s4_title',
    bodyKey: 'tour_ventas_s4_body',
  },
];

const TOUR_STEPS_MISPROTOCOLOS = [
  {
    selector: 'nav[aria-label="breadcrumb"]',
    titleKey: 'tour_misprotocolos_s1_title',
    bodyKey: 'tour_misprotocolos_s1_body',
  },
  {
    selector: '#view-tabs',
    titleKey: 'tour_misprotocolos_s2_title',
    bodyKey: 'tour_misprotocolos_s2_body',
  },
  {
    selector: '#misprotocolos-filtros-row',
    titleKey: 'tour_misprotocolos_s3_title',
    bodyKey: 'tour_misprotocolos_s3_body',
  },
  {
    selector: '#tabla-misprotocolos',
    titleKey: 'tour_misprotocolos_s4_title',
    bodyKey: 'tour_misprotocolos_s4_body',
  },
];

const TOUR_STEPS_PANEL_FORMULARIOS = [
  {
    selector: 'nav[aria-label="breadcrumb"]',
    titleKey: 'tour_formularios_s1_title',
    bodyKey: 'tour_formularios_s1_body',
  },
  {
    selector: '#header-container',
    titleKey: 'tour_formularios_s2_title',
    bodyKey: 'tour_formularios_s2_body',
  },
  {
    selector: '#forms-grid',
    titleKey: 'tour_formularios_s3_title',
    bodyKey: 'tour_formularios_s3_body',
  },
];

/**
 * Ventana emergente abierta (Bootstrap `.modal.show`): solo se ofrece con modal visible.
 * Cubre estructura (diálogo → cabecera → cuerpo → pie) de **cualquier** modal, incluidos
 * `#modal-container` (contenido dinámico facturación) y `#modal-billing-help` en páginas F7.
 * Claves i18n: `tour_modal_in_s1_*` … `tour_modal_in_s4_*` (ES/EN/PT).
 * Pasos **campo a campo** por ventana concreta → backlog §13.6 en maestro archivado (incremental).
 */
const TOUR_STEPS_MODALES = [
  {
    selector: '.modal.show .modal-dialog',
    titleKey: 'tour_modal_in_s1_title',
    bodyKey: 'tour_modal_in_s1_body',
  },
  {
    selector: '.modal.show .modal-header',
    titleKey: 'tour_modal_in_s2_title',
    bodyKey: 'tour_modal_in_s2_body',
  },
  {
    selector: '.modal.show .modal-body',
    titleKey: 'tour_modal_in_s3_title',
    bodyKey: 'tour_modal_in_s3_body',
  },
  {
    selector: '.modal.show .modal-footer',
    titleKey: 'tour_modal_in_s4_title',
    bodyKey: 'tour_modal_in_s4_body',
  },
];

const TOUR_STEPS_MISFORMULARIOS = [
  {
    selector: '.container-fluid.my-5 .d-flex.justify-content-between.align-items-center.mb-4.border-bottom h4.fw-bold',
    titleKey: 'tour_misformularios_s1_title',
    bodyKey: 'tour_misformularios_s1_body',
  },
  {
    selector: '#search-input',
    titleKey: 'tour_misformularios_s2_title',
    bodyKey: 'tour_misformularios_s2_body',
  },
  {
    selector: '#btn-export-excel',
    titleKey: 'tour_misformularios_s3_title',
    bodyKey: 'tour_misformularios_s3_body',
  },
  {
    selector: '#tabla-misformularios',
    titleKey: 'tour_misformularios_s4_title',
    bodyKey: 'tour_misformularios_s4_body',
  },
];

const TOUR_STEPS_ADMIN_RESERVAS = [
  {
    selector: '.container.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom',
    titleKey: 'tour_admin_reservas_s1_title',
    bodyKey: 'tour_admin_reservas_s1_body',
  },
  {
    selector: '.container.my-5 .card.shadow-sm.border-0.mb-4 .card-body',
    titleKey: 'tour_admin_reservas_s2_title',
    bodyKey: 'tour_admin_reservas_s2_body',
  },
  {
    selector: '#btn-nueva-reserva',
    titleKey: 'tour_admin_reservas_s3_title',
    bodyKey: 'tour_admin_reservas_s3_body',
  },
  {
    selector: '#table-agenda',
    titleKey: 'tour_admin_reservas_s4_title',
    bodyKey: 'tour_admin_reservas_s4_body',
  },
];

const TOUR_STEPS_ADMIN_ESTADISTICAS = [
  {
    selector: '.content-wrapper .card.shadow-sm nav[aria-label="breadcrumb"]',
    titleKey: 'tour_admin_estadisticas_s1_title',
    bodyKey: 'tour_admin_estadisticas_s1_body',
  },
  {
    selector: '.content-wrapper .card.shadow-sm .d-flex.flex-wrap.justify-content-between.align-items-start.gap-2.mb-4',
    titleKey: 'tour_admin_estadisticas_s2_title',
    bodyKey: 'tour_admin_estadisticas_s2_body',
  },
  {
    selector: '#stats-from',
    titleKey: 'tour_admin_estadisticas_s3_title',
    bodyKey: 'tour_admin_estadisticas_s3_body',
  },
  {
    selector: '#chk-ani',
    titleKey: 'tour_admin_estadisticas_s4_title',
    bodyKey: 'tour_admin_estadisticas_s4_body',
  },
];

const TOUR_STEPS_ADMIN_PRECIOS = [
  {
    selector: '.card.shadow-sm.border-0.p-4 nav[aria-label="breadcrumb"]',
    titleKey: 'tour_admin_precios_s1_title',
    bodyKey: 'tour_admin_precios_s1_body',
  },
  {
    selector: '#titulo-precios',
    titleKey: 'tour_admin_precios_s2_title',
    bodyKey: 'tour_admin_precios_s2_body',
  },
  {
    selector: '#search-input-precios',
    titleKey: 'tour_admin_precios_s3_title',
    bodyKey: 'tour_admin_precios_s3_body',
  },
  {
    selector: '#tbody-precios-animales',
    titleKey: 'tour_admin_precios_s4_title',
    bodyKey: 'tour_admin_precios_s4_body',
  },
];

const TOUR_STEPS_ADMIN_SOLICITUD_PROTOCOLO = [
  {
    selector: '.container-fluid.my-5 .card.shadow-sm nav[aria-label="breadcrumb"]',
    titleKey: 'tour_solicitud_protocolo_s1_title',
    bodyKey: 'tour_solicitud_protocolo_s1_body',
  },
  {
    selector: '.container-fluid.my-5 .mb-4.d-flex.flex-wrap.justify-content-between',
    titleKey: 'tour_solicitud_protocolo_s2_title',
    bodyKey: 'tour_solicitud_protocolo_s2_body',
  },
  {
    selector: '#table-requests',
    titleKey: 'tour_solicitud_protocolo_s3_title',
    bodyKey: 'tour_solicitud_protocolo_s3_body',
  },
  {
    selector: 'a.btn.btn-outline-primary[href*="protocolos.html"]',
    titleKey: 'tour_solicitud_protocolo_s4_title',
    bodyKey: 'tour_solicitud_protocolo_s4_body',
  },
];

const TOUR_STEPS_PANEL_MISALOJAMIENTOS = [
  {
    selector: '.container-fluid.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom',
    titleKey: 'tour_misalojamientos_s1_title',
    bodyKey: 'tour_misalojamientos_s1_body',
  },
  {
    selector: '.container-fluid.my-5 .card.shadow-sm.border-0.p-3.mb-4',
    titleKey: 'tour_misalojamientos_s2_title',
    bodyKey: 'tour_misalojamientos_s2_body',
  },
  {
    selector: '#btn-export-excel',
    titleKey: 'tour_misalojamientos_s3_title',
    bodyKey: 'tour_misalojamientos_s3_body',
  },
  {
    selector: '#table-body',
    titleKey: 'tour_misalojamientos_s4_title',
    bodyKey: 'tour_misalojamientos_s4_body',
  },
];

const TOUR_STEPS_PANEL_MISRESERVAS = [
  {
    selector: '.container-fluid.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom',
    titleKey: 'tour_misreservas_s1_title',
    bodyKey: 'tour_misreservas_s1_body',
  },
  {
    selector: '#select-sala',
    titleKey: 'tour_misreservas_s2_title',
    bodyKey: 'tour_misreservas_s2_body',
  },
  {
    selector: '#calendar-grid',
    titleKey: 'tour_misreservas_s3_title',
    bodyKey: 'tour_misreservas_s3_body',
  },
  {
    selector: '#btn-reservar',
    titleKey: 'tour_misreservas_s4_title',
    bodyKey: 'tour_misreservas_s4_body',
  },
];

const TOUR_STEPS_ADMIN_CONFIG = [
  {
    selector: 'nav[aria-label="breadcrumb"]',
    titleKey: 'tour_config_s1_title',
    bodyKey: 'tour_config_s1_body',
  },
  {
    selector: '.config-hub-header',
    titleKey: 'tour_config_s2_title',
    bodyKey: 'tour_config_s2_body',
  },
  {
    selector: '#config-grid',
    titleKey: 'tour_config_s3_title',
    bodyKey: 'tour_config_s3_body',
  },
];

const TOUR_STEPS_ADMIN_FACTURACION_INDEX = [
  {
    selector: 'nav[aria-label="breadcrumb"]',
    titleKey: 'tour_fact_index_s1_title',
    bodyKey: 'tour_fact_index_s1_body',
  },
  {
    selector: '.facturacion-hub-header',
    titleKey: 'tour_fact_index_s2_title',
    bodyKey: 'tour_fact_index_s2_body',
  },
  {
    selector: '#billing-hub-grid',
    titleKey: 'tour_fact_index_s3_title',
    bodyKey: 'tour_fact_index_s3_body',
  },
  {
    selector: '.card-billing-option',
    titleKey: 'tour_fact_index_s4_title',
    bodyKey: 'tour_fact_index_s4_body',
  },
];

const TOUR_STEPS_ADMIN_HISTORIAL_CONTABLE = [
  {
    selector: 'nav[aria-label="breadcrumb"]',
    titleKey: 'tour_hist_cont_s1_title',
    bodyKey: 'tour_hist_cont_s1_body',
  },
  {
    selector: '#historial-contable-title',
    titleKey: 'tour_hist_cont_s2_title',
    bodyKey: 'tour_hist_cont_s2_body',
  },
  {
    selector: '.row.align-items-end.mb-4.pb-3.border-bottom',
    titleKey: 'tour_hist_cont_s3_title',
    bodyKey: 'tour_hist_cont_s3_body',
  },
  {
    selector: '#table-body-historial',
    titleKey: 'tour_hist_cont_s4_title',
    bodyKey: 'tour_hist_cont_s4_body',
  },
];

const TOUR_STEPS_ADMIN_COMUNICACION_NOTICIAS = [
  {
    selector: '.admin-noticias-page-header',
    titleKey: 'tour_admin_noticias_s1_title',
    bodyKey: 'tour_admin_noticias_s1_body',
  },
  {
    selector: '#btn-nueva-noticia',
    titleKey: 'tour_admin_noticias_s2_title',
    bodyKey: 'tour_admin_noticias_s2_body',
  },
  {
    selector: '#admin-noticias-table-wrap',
    titleKey: 'tour_admin_noticias_s3_title',
    bodyKey: 'tour_admin_noticias_s3_body',
  },
  {
    selector: '#admin-noticias-footer',
    titleKey: 'tour_admin_noticias_s4_title',
    bodyKey: 'tour_admin_noticias_s4_body',
  },
];

const TOUR_STEPS_CAPACITACION_RED = [
  {
    selector: 'h1.h3, h1',
    titleKey: 'tour_cap_red_s1_title',
    bodyKey: 'tour_cap_red_s1_body',
  },
  {
    selector: '#cap-list',
    titleKey: 'tour_cap_red_s2_title',
    bodyKey: 'tour_cap_red_s2_body',
  },
  {
    selector: '#cap-content-region',
    titleKey: 'tour_cap_red_s3_title',
    bodyKey: 'tour_cap_red_s3_body',
  },
  {
    selector: '#cap-help-prefs-card',
    titleKey: 'tour_cap_red_s4_title',
    bodyKey: 'tour_cap_red_s4_body',
  },
];

export const CAPACITACION_TOUR_STEPS = {
  __welcome__: TOUR_STEPS_WELCOME,
  __modals__: TOUR_STEPS_MODALES,
  'panel/capacitacion': [
    {
      selector: 'h1.h3, h1',
      titleKey: 'tour_cap_s1_title',
      bodyKey: 'tour_cap_s1_body',
    },
    {
      selector: '#cap-list',
      titleKey: 'tour_cap_s2_title',
      bodyKey: 'tour_cap_s2_body',
    },
    {
      selector: '#cap-content-region',
      titleKey: 'tour_cap_s3_title',
      bodyKey: 'tour_cap_s3_body',
    },
  ],
  'capacitacion/tema/red': TOUR_STEPS_CAPACITACION_RED,
  'admin/usuarios': [
    {
      selector: '.container.my-5 h1.h4',
      titleKey: 'tour_usuarios_s1_title',
      bodyKey: 'tour_usuarios_s1_body',
    },
    {
      selector: '#filter-type',
      titleKey: 'tour_usuarios_s2_title',
      bodyKey: 'tour_usuarios_s2_body',
    },
    {
      selector: '#btn-excel',
      titleKey: 'tour_usuarios_s3_title',
      bodyKey: 'tour_usuarios_s3_body',
    },
    {
      selector: '#tabla-usuarios',
      titleKey: 'tour_usuarios_s4_title',
      bodyKey: 'tour_usuarios_s4_body',
    },
  ],
  'admin/animales': [
    {
      selector: '.card.shadow-sm.border-0 h5.fw-bold.mb-4',
      titleKey: 'tour_animales_s1_title',
      bodyKey: 'tour_animales_s1_body',
    },
    {
      selector: '#filter-column-animal',
      titleKey: 'tour_animales_s2_title',
      bodyKey: 'tour_animales_s2_body',
    },
    {
      selector: '#btn-excel-animal',
      titleKey: 'tour_animales_s3_title',
      bodyKey: 'tour_animales_s3_body',
    },
    {
      selector: '#tabla-animales',
      titleKey: 'tour_animales_s4_title',
      bodyKey: 'tour_animales_s4_body',
    },
  ],
  'admin/insumos': [
    {
      selector: '.card.shadow-sm.border-0 h5.fw-bold.mb-4',
      titleKey: 'tour_insumos_s1_title',
      bodyKey: 'tour_insumos_s1_body',
    },
    {
      selector: '#filter-column-insumo',
      titleKey: 'tour_insumos_s2_title',
      bodyKey: 'tour_insumos_s2_body',
    },
    {
      selector: '#btn-excel-insumo',
      titleKey: 'tour_insumos_s3_title',
      bodyKey: 'tour_insumos_s3_body',
    },
    {
      selector: '#tabla-insumos',
      titleKey: 'tour_insumos_s4_title',
      bodyKey: 'tour_insumos_s4_body',
    },
  ],
  'admin/reactivos': [
    {
      selector: '.card.shadow-sm.border-0 h5.fw-bold.mb-4',
      titleKey: 'tour_reactivos_s1_title',
      bodyKey: 'tour_reactivos_s1_body',
    },
    {
      selector: '#filter-column-reactivo',
      titleKey: 'tour_reactivos_s2_title',
      bodyKey: 'tour_reactivos_s2_body',
    },
    {
      selector: '#btn-excel-reactivo',
      titleKey: 'tour_reactivos_s3_title',
      bodyKey: 'tour_reactivos_s3_body',
    },
    {
      selector: '#tabla-reactivos',
      titleKey: 'tour_reactivos_s4_title',
      bodyKey: 'tour_reactivos_s4_body',
    },
  ],
  'admin/alojamientos': [
    {
      selector: '.d-flex.justify-content-between.align-items-center.mb-4 h5',
      titleKey: 'tour_alojamientos_s1_title',
      bodyKey: 'tour_alojamientos_s1_body',
    },
    {
      selector: '#search-alojamiento',
      titleKey: 'tour_alojamientos_s2_title',
      bodyKey: 'tour_alojamientos_s2_body',
    },
    {
      selector: '#btn-excel-alojamiento',
      titleKey: 'tour_alojamientos_s3_title',
      bodyKey: 'tour_alojamientos_s3_body',
    },
    {
      selector: '#tabla-alojamientos',
      titleKey: 'tour_alojamientos_s4_title',
      bodyKey: 'tour_alojamientos_s4_body',
    },
  ],
  'admin/protocolos': [
    {
      selector: '.container.my-5 nav[aria-label="breadcrumb"]',
      titleKey: 'tour_protocolos_s1_title',
      bodyKey: 'tour_protocolos_s1_body',
    },
    {
      selector: '#filter-type-prot',
      titleKey: 'tour_protocolos_s2_title',
      bodyKey: 'tour_protocolos_s2_body',
    },
    {
      selector: '#btn-excel-prot',
      titleKey: 'tour_protocolos_s3_title',
      bodyKey: 'tour_protocolos_s3_body',
    },
    {
      selector: '#main-table-prot',
      titleKey: 'tour_protocolos_s4_title',
      bodyKey: 'tour_protocolos_s4_body',
    },
  ],
  'admin/reservas': TOUR_STEPS_ADMIN_RESERVAS,
  'admin/estadisticas': TOUR_STEPS_ADMIN_ESTADISTICAS,
  'admin/configuracion/config': TOUR_STEPS_ADMIN_CONFIG,
  'admin/facturacion/index': TOUR_STEPS_ADMIN_FACTURACION_INDEX,
  'admin/historialcontable': TOUR_STEPS_ADMIN_HISTORIAL_CONTABLE,
  'admin/comunicacion/noticias': TOUR_STEPS_ADMIN_COMUNICACION_NOTICIAS,
  'admin/precios': TOUR_STEPS_ADMIN_PRECIOS,
  'admin/solicitud_protocolo': TOUR_STEPS_ADMIN_SOLICITUD_PROTOCOLO,
  'panel/misformularios': TOUR_STEPS_MISFORMULARIOS,
  'usuario/misformularios': TOUR_STEPS_MISFORMULARIOS,
  'panel/dashboard': TOUR_STEPS_INVESTIGADOR_DASHBOARD,
  'usuario/dashboard': TOUR_STEPS_INVESTIGADOR_DASHBOARD,
  'admin/dashboard': TOUR_STEPS_ADMIN_DASHBOARD,
  'panel/formularios': TOUR_STEPS_PANEL_FORMULARIOS,
  'panel/misprotocolos': TOUR_STEPS_MISPROTOCOLOS,
  'panel/mensajes': TOUR_STEPS_MENSAJES,
  'panel/mensajes_institucion': TOUR_STEPS_MENSAJES_INST,
  'panel/noticias': TOUR_STEPS_NOTICIAS_PORTAL,
  'panel/soporte': TOUR_STEPS_SOPORTE,
  'panel/perfil': TOUR_STEPS_PERFIL,
  'panel/ventas': TOUR_STEPS_VENTAS,
  'panel/misalojamientos': TOUR_STEPS_PANEL_MISALOJAMIENTOS,
  'usuario/misalojamientos': TOUR_STEPS_PANEL_MISALOJAMIENTOS,
  'panel/misreservas': TOUR_STEPS_PANEL_MISRESERVAS,
  'usuario/misreservas': TOUR_STEPS_PANEL_MISRESERVAS,
};

export function getTourStepsForMenuPath(menuPath) {
  return CAPACITACION_TOUR_STEPS[menuPath] || null;
}
