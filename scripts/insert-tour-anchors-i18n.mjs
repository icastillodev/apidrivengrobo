/**
 * Inserta claves tour_*_anchor y tour_focus_label en es.js / en.js / pt.js (objeto capacitacion).
 * Ejecutar desde la raíz: node scripts/insert-tour-anchors-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_DIR = path.join(__dirname, '../front/dist/js/utils/i18n');

const ANCHORS = {
  es: {
    tour_welcome_s1_anchor:
      '{{svg:hand}} El marco verde rodea solo el {{i:link-45deg}} enlace de la cabecera hacia groboapp.com (marca GROBO). No incluye el menú de textos ni los iconos redondos de preferencias.',
    tour_welcome_s2_anchor:
      'Se resaltan las listas `#main-menu-ul`, `#side-menu-ul` o `#mobile-menu-ul` (según anchura): cada fila visible es una entrada del menú o un submenú desplegable del portal.',
    tour_welcome_s3_anchor:
      'Zona de iconos circulares `#side-controls-ul` (o el último bloque del menú superior): {{i:globe2}} idioma, {{i:brightness-high}} tema, {{i:fonts}} tamaño de letra, {{i:mic}} voz Gecko, {{i:keyboard}} atajos y {{i:layout-sidebar-reverse}} menú lateral o superior.',
    tour_welcome_s4_anchor:
      'El disparador `#gecko-search-trigger`: la píldora {{i:search}} Gecko Search junto al borde inferior antes de la barra de ayuda.',
    tour_welcome_s5_anchor:
      'Toda la franja fija `#gecko-capacitacion-fab` en el borde inferior: {{i:book-half}} manual, {{i:lightning-charge}} tutorial interactivo y {{i:x-lg}} ocultar barra.',
    tour_dashboard_menu_s1_anchor:
      'Las mismas listas de menú `#main-menu-ul` / `#side-menu-ul` / `#mobile-menu-ul` que en la bienvenida: aquí las ve desde el panel de inicio.',
    tour_panel_dash_s1_anchor:
      'El bloque `#dashboard-welcome`: tarjeta o franja de bienvenida con su nombre y resumen del {{i:person-workspace}} panel del investigador.',
    tour_panel_dash_s2_anchor:
      'El contenedor `#dashboard-noticias-mount` donde la aplicación inserta {{i:newspaper}} noticias o avisos del escritorio.',
    tour_panel_dash_s3_anchor:
      'La rejilla `#dashboard-grid` de accesos rápidos o tarjetas de módulos del panel.',
    tour_admin_dash_s1_anchor:
      'El mismo nodo `#dashboard-welcome` en contexto {{i:shield-lock}} administrador: saludo y contexto del panel de gestión del bioterio.',
    tour_admin_dash_s2_anchor:
      '`#dashboard-noticias-mount` en el dashboard admin: columna o tarjeta de {{i:newspaper}} novedades para quien administra la sede.',
    tour_admin_dash_s3_anchor:
      '`#dashboard-grid` del panel de administración: indicadores, accesos o tarjetas de trabajo operativo.',
    tour_mensajes_s1_anchor:
      'La cabecera `#mensajes-page-header`: título «Mensajes» y franja superior de la bandeja de conversaciones personales.',
    tour_mensajes_s2_anchor:
      'El panel izquierdo `#lista-hilos` con la lista de conversaciones o contactos. {{svg:click}} Al elegir una fila se carga el hilo en el panel derecho.',
    tour_mensajes_s3_anchor:
      'El contenedor `#panel-hilo-wrap`: mensajes del hilo activo, campo de respuesta y zona de adjuntos si su sede los usa.',
    tour_mensajes_s4_anchor:
      'El botón `#btn-nuevo-msg` que abre el flujo para redactar un mensaje nuevo.',
    tour_mensajes_inst_s1_anchor:
      'La cabecera `#mensajes-page-header` de la mensajería institucional: título y contexto de la vista de circulares o hilos oficiales.',
    tour_mensajes_inst_s2_anchor:
      '`#lista-hilos` en modo institucional: lista de hilos o avisos de la institución. {{svg:click}} Clic en una fila para ver el detalle a la derecha.',
    tour_mensajes_inst_s3_anchor:
      '`#panel-hilo-wrap` con el contenido del mensaje institucional seleccionado y el área para responder si está habilitada.',
    tour_mensajes_inst_s4_anchor:
      '`#btn-nuevo-msg` para iniciar un mensaje nuevo en el canal institucional.',
    tour_noticias_s1_anchor:
      '`#noticias-page-header`: título del portal de noticias y línea superior de la página.',
    tour_noticias_s2_anchor:
      'El bloque `#filtro-alcance` (pestañas o botones) que cambia entre noticias {{i:building}} locales y {{i:diagram-3}} red, según contratación.',
    tour_noticias_s3_anchor:
      '`#noticias-toolbar`: búsqueda, orden y acciones sobre el listado de noticias.',
    tour_noticias_s4_anchor:
      '`#noticias-grid`: mosaico de tarjetas; cada tarjeta es una noticia publicada.',
    tour_soporte_s1_anchor:
      '`#soporte-page-header`: título «Soporte Gecko» y cabecera de la bandeja de tickets.',
    tour_soporte_s2_anchor:
      '`#lista-tickets`: columna con sus solicitudes de soporte; {{svg:click}} seleccione una para abrir el hilo.',
    tour_soporte_s3_anchor:
      '`#panel-ticket-wrap`: detalle del ticket elegido, mensajes del equipo y su respuesta.',
    tour_soporte_s4_anchor:
      '`#btn-nuevo-ticket` para crear una nueva solicitud de soporte.',
    tour_perfil_s1_anchor:
      '`#perfil-page-header`: título «Mi perfil» y franja superior de la página de cuenta.',
    tour_perfil_s2_anchor:
      '`#perfil-card-resumen`: tarjeta con avatar, nombre, rol e institución en un vistazo.',
    tour_perfil_s3_anchor:
      '`#perfil-datos-personales`: formulario de nombre, correo, teléfono y datos editables del usuario.',
    tour_perfil_s4_anchor:
      '`#perfil-seguridad`: sección de contraseña y opciones sensibles de la cuenta.',
    tour_ventas_s1_anchor:
      '`#ventas-page-header`: título «Ventas GROBO» y encabezado del formulario de contacto comercial.',
    tour_ventas_s2_anchor:
      '`#ventas-intro`: texto explicativo sobre el proceso de ventas o consultas comerciales.',
    tour_ventas_s3_anchor:
      '`#ventas-form-card`: tarjeta con campos del mensaje, correo y datos que enviará al equipo comercial.',
    tour_ventas_s4_anchor:
      '`#ventas-btn-enviar`: botón que dispara el envío del formulario de ventas.',
    tour_misprotocolos_s1_anchor:
      'La `nav[aria-label="breadcrumb"]` de esta pantalla: migas desde el panel hasta «Mis protocolos».',
    tour_misprotocolos_s2_anchor:
      '`#view-tabs`: pestañas para cambiar entre vistas (p. ej. mis protocolos, sede, red) según lo que muestre su sede.',
    tour_misprotocolos_s3_anchor:
      '`#misprotocolos-filtros-row`: fila de filtros y búsqueda aplicados a la tabla de protocolos.',
    tour_misprotocolos_s4_anchor:
      '`#tabla-misprotocolos` (o su contenedor inmediato): grilla con filas de protocolos; {{svg:click}} una fila abre detalle o modal.',
    tour_formularios_s1_anchor:
      'Migas `nav[aria-label="breadcrumb"]` del centro de solicitudes: ruta hasta Formularios o el nombre que muestre su menú.',
    tour_formularios_s2_anchor:
      '`#header-container`: bloque con el título de la página de formularios y el párrafo introductorio bajo él.',
    tour_formularios_s3_anchor:
      '`#forms-grid`: cuadrícula de tarjetas ({{i:egg}} animales, {{i:moisture}} reactivos, {{i:box-seam}} insumos, etc.).',
    tour_modal_in_s1_anchor:
      'La ventana flotante completa `.modal.show .modal-dialog`: tarjeta centrada con borde redondeado sobre el fondo atenuado.',
    tour_modal_in_s2_anchor:
      '`.modal.show .modal-header`: franja superior con título del modal, {{i:x-lg}} cerrar y a veces acciones.',
    tour_modal_in_s3_anchor:
      '`.modal.show .modal-body`: zona central scrolleable con formulario, texto largo o tabla del detalle.',
    tour_modal_in_s4_anchor:
      '`.modal.show .modal-footer`: fila inferior con botones Guardar, Cancelar, Eliminar u otros según el formulario.',
    tour_misformularios_s1_anchor:
      'Solo el `h4.fw-bold` de la barra superior (selector `.container-fluid.my-5 … border-bottom h4`): el título «Mis formularios», no los botones de la misma fila.',
    tour_misformularios_s2_anchor:
      'El campo de texto `#search-input` que filtra filas de la tabla de sus pedidos.',
    tour_misformularios_s3_anchor:
      'El botón `#btn-export-excel` de esta pantalla para descargar el listado de mis formularios.',
    tour_misformularios_s4_anchor:
      'La tabla `#tabla-misformularios` con columnas de tipo de trámite, estado y fechas.',
    tour_admin_reservas_s1_anchor:
      'La fila superior `.container.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom` con el título de la agenda y acciones de cabecera.',
    tour_admin_reservas_s2_anchor:
      'El `.card-body` de la tarjeta principal (`.card.shadow-sm.border-0.mb-4`): selectores de sala y rango de fechas de la agenda.',
    tour_admin_reservas_s3_anchor:
      'El botón `#btn-nueva-reserva` que inicia el alta de una reserva.',
    tour_admin_reservas_s4_anchor:
      '`#table-agenda`: tabla o rejilla de franjas y reservas según la vista cargada.',
    tour_admin_estadisticas_s1_anchor:
      'Migas `.content-wrapper .card.shadow-sm nav[aria-label="breadcrumb"]` dentro de la tarjeta de estadísticas.',
    tour_admin_estadisticas_s2_anchor:
      'La barra `.content-wrapper .card.shadow-sm .d-flex.flex-wrap.justify-content-between.align-items-start.gap-2.mb-4` con título del informe y textos de ayuda.',
    tour_admin_estadisticas_s3_anchor:
      'El control `#stats-from` (fecha o inicio de periodo del informe).',
    tour_admin_estadisticas_s4_anchor:
      'El interruptor o casilla `#chk-ani` que ajusta la serie (p. ej. incluir animales o comparativa) según la pantalla.',
    tour_admin_precios_s1_anchor:
      'Migas dentro de `.card.shadow-sm.border-0.p-4 nav[aria-label="breadcrumb"]` en la página de precios.',
    tour_admin_precios_s2_anchor:
      'El bloque `#titulo-precios` con el encabezado del tarifario.',
    tour_admin_precios_s3_anchor:
      'El campo `#search-input-precios` para acotar filas del listado de precios.',
    tour_admin_precios_s4_anchor:
      '`#tbody-precios-animales`: cuerpo de la tabla con filas de categorías o ítems tarifados.',
    tour_solicitud_protocolo_s1_anchor:
      'Migas `.container-fluid.my-5 .card.shadow-sm nav[aria-label="breadcrumb"]` de solicitudes de protocolo.',
    tour_solicitud_protocolo_s2_anchor:
      'La franja `.container-fluid.my-5 .mb-4.d-flex.flex-wrap.justify-content-between` con título de la página y botones de acción (p. ej. nueva solicitud).',
    tour_solicitud_protocolo_s3_anchor:
      '`#table-requests`: tabla de solicitudes entrantes o en trámite.',
    tour_solicitud_protocolo_s4_anchor:
      'El enlace `a.btn.btn-outline-primary[href*="protocolos.html"]` que lleva al gestor completo de protocolos.',
    tour_misalojamientos_s1_anchor:
      'La barra `.container-fluid.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom` con el título «Mis alojamientos».',
    tour_misalojamientos_s2_anchor:
      'La tarjeta `.container-fluid.my-5 .card.shadow-sm.border-0.p-3.mb-4` con filtros y resumen antes de la tabla.',
    tour_misalojamientos_s3_anchor:
      '`#btn-export-excel` en **esta** ruta (mis alojamientos): exporta el listado de lotes visibles.',
    tour_misalojamientos_s4_anchor:
      '`#table-body`: filas del listado de alojamientos o lotes asignados.',
    tour_misreservas_s1_anchor:
      'La misma barra superior `.container-fluid.my-5 > .d-flex…border-bottom` en «Mis reservas».',
    tour_misreservas_s2_anchor:
      'El desplegable `#select-sala` para elegir sala o recurso antes del calendario.',
    tour_misreservas_s3_anchor:
      '`#calendar-grid`: rejilla del calendario mensual con días seleccionables.',
    tour_misreservas_s4_anchor:
      '`#btn-reservar` (o confirmar) tras elegir día y franja horaria.',
    tour_cap_s1_anchor:
      'El `h1.h3` o `h1` principal de la página: título de la biblioteca de capacitación.',
    tour_cap_s2_anchor:
      'La lista lateral `#cap-list` con los temas del manual; la fila activa resalta el capítulo cargado.',
    tour_cap_s3_anchor:
      'La región `#cap-content-region` donde se renderiza el artículo del tema seleccionado.',
    tour_usuarios_s1_anchor:
      'El título `.container.my-5 h1.h4` del módulo de usuarios (directorio de cuentas).',
    tour_usuarios_s2_anchor:
      '`#filter-type`: control para acotar por tipo o ámbito de cuenta antes de exportar o editar.',
    tour_usuarios_s3_anchor:
      '`#btn-excel`: exportación del listado filtrado a Excel.',
    tour_usuarios_s4_anchor:
      '`#tabla-usuarios`: grilla principal con filas de usuarios.',
    tour_animales_s1_anchor:
      'El `h5.fw-bold.mb-4` dentro de `.card.shadow-sm.border-0`: título visible de la bandeja de {{i:egg}} animales.',
    tour_animales_s2_anchor:
      '`#filter-column-animal`: desplegable o columna de filtro sobre la tabla de pedidos de animales.',
    tour_animales_s3_anchor:
      '`#btn-excel-animal`: descarga Excel del listado filtrado de animales.',
    tour_animales_s4_anchor:
      '`#tabla-animales`: tabla de solicitudes o filas de la bandeja.',
    tour_insumos_s1_anchor:
      'El `h5.fw-bold.mb-4` de la tarjeta: título de la bandeja de {{i:box-seam}} insumos.',
    tour_insumos_s2_anchor:
      '`#filter-column-insumo`: filtro por columna o criterio del listado de insumos.',
    tour_insumos_s3_anchor:
      '`#btn-excel-insumo`: exportar insumos filtrados.',
    tour_insumos_s4_anchor:
      '`#tabla-insumos`: grilla de pedidos de insumos.',
    tour_reactivos_s1_anchor:
      'El `h5.fw-bold.mb-4`: título de la bandeja de {{i:moisture}} reactivos.',
    tour_reactivos_s2_anchor:
      '`#filter-column-reactivo`: filtro aplicado a la tabla de reactivos.',
    tour_reactivos_s3_anchor:
      '`#btn-excel-reactivo`: exportar reactivos a Excel.',
    tour_reactivos_s4_anchor:
      '`#tabla-reactivos`: tabla principal de la bandeja.',
    tour_alojamientos_s1_anchor:
      'El `h5` dentro de `.d-flex.justify-content-between.align-items-center.mb-4`: título «Gestión de alojamientos» u homólogo.',
    tour_alojamientos_s2_anchor:
      '`#search-alojamiento`: campo de búsqueda del listado de alojamientos.',
    tour_alojamientos_s3_anchor:
      '`#btn-excel-alojamiento`: exportar la grilla de alojamientos.',
    tour_alojamientos_s4_anchor:
      '`#tabla-alojamientos`: filas de jaulas, salas o unidades según su modelo.',
    tour_protocolos_s1_anchor:
      'Migas `.container.my-5 nav[aria-label="breadcrumb"]` del gestor de protocolos.',
    tour_protocolos_s2_anchor:
      '`#filter-type-prot`: filtro por tipo o estado de protocolo.',
    tour_protocolos_s3_anchor:
      '`#btn-excel-prot`: exportar listado de protocolos.',
    tour_protocolos_s4_anchor:
      '`#main-table-prot`: tabla maestra de protocolos administrados.',
  },
  en: {
    tour_welcome_s1_anchor:
      '{{svg:hand}} The green frame wraps only the {{i:link-45deg}} header link to groboapp.com (GROBO branding). It does not include the text menu or the round preference icons.',
    tour_welcome_s2_anchor:
      'Highlights the menu lists `#main-menu-ul`, `#side-menu-ul`, or `#mobile-menu-ul` (by width): each visible row is a nav item or submenu.',
    tour_welcome_s3_anchor:
      'Round icon strip `#side-controls-ul` (or last block in the top menu): {{i:globe2}} language, {{i:brightness-high}} theme, {{i:fonts}} font size, {{i:mic}} Gecko voice, {{i:keyboard}} shortcuts, {{i:layout-sidebar-reverse}} sidebar vs top menu.',
    tour_welcome_s4_anchor:
      'Trigger `#gecko-search-trigger`: the {{i:search}} Gecko Search pill near the bottom edge before the help bar.',
    tour_welcome_s5_anchor:
      'The fixed strip `#gecko-capacitacion-fab` at the bottom: {{i:book-half}} manual, {{i:lightning-charge}} interactive tour, {{i:x-lg}} hide bar.',
    tour_dashboard_menu_s1_anchor:
      'Same menu lists `#main-menu-ul` / `#side-menu-ul` / `#mobile-menu-ul` as in welcome, shown from the home dashboard.',
    tour_panel_dash_s1_anchor:
      'Block `#dashboard-welcome`: welcome card or banner with your name and investigator dashboard summary.',
    tour_panel_dash_s2_anchor:
      'Container `#dashboard-noticias-mount` where the app injects {{i:newspaper}} news or notices.',
    tour_panel_dash_s3_anchor:
      'Grid `#dashboard-grid` of quick links or module cards.',
    tour_admin_dash_s1_anchor:
      'Same `#dashboard-welcome` node in {{i:shield-lock}} admin context: greeting and management summary.',
    tour_admin_dash_s2_anchor:
      '`#dashboard-noticias-mount` on the admin dashboard: {{i:newspaper}} news column for facility managers.',
    tour_admin_dash_s3_anchor:
      '`#dashboard-grid` on the admin dashboard: KPIs, shortcuts, or operational cards.',
    tour_mensajes_s1_anchor:
      '`#mensajes-page-header`: “Messages” title and top band of the personal inbox.',
    tour_mensajes_s2_anchor:
      'Left pane `#lista-hilos` with threads or contacts. {{svg:click}} Pick a row to load it on the right.',
    tour_mensajes_s3_anchor:
      '`#panel-hilo-wrap`: messages for the active thread, reply field, and attachments if enabled.',
    tour_mensajes_s4_anchor:
      '`#btn-nuevo-msg` starts a new message flow.',
    tour_mensajes_inst_s1_anchor:
      '`#mensajes-page-header` for institutional messaging: title and context for official threads.',
    tour_mensajes_inst_s2_anchor:
      '`#lista-hilos` in institutional mode: list of institution threads. {{svg:click}} Select one for detail on the right.',
    tour_mensajes_inst_s3_anchor:
      '`#panel-hilo-wrap` showing the selected institutional message and reply area if allowed.',
    tour_mensajes_inst_s4_anchor:
      '`#btn-nuevo-msg` to start a new institutional message.',
    tour_noticias_s1_anchor:
      '`#noticias-page-header`: news portal title and page header.',
    tour_noticias_s2_anchor:
      'Block `#filtro-alcance` (tabs or buttons) switching {{i:building}} local vs {{i:diagram-3}} network news when contracted.',
    tour_noticias_s3_anchor:
      '`#noticias-toolbar`: search, sort, and actions on the feed.',
    tour_noticias_s4_anchor:
      '`#noticias-grid`: card mosaic; each card is a published item.',
    tour_soporte_s1_anchor:
      '`#soporte-page-header`: “Gecko Support” title and ticket inbox header.',
    tour_soporte_s2_anchor:
      '`#lista-tickets`: column of your tickets. {{svg:click}} Open one to see the thread.',
    tour_soporte_s3_anchor:
      '`#panel-ticket-wrap`: ticket detail, staff replies, and your response.',
    tour_soporte_s4_anchor:
      '`#btn-nuevo-ticket` creates a new support ticket.',
    tour_perfil_s1_anchor:
      '`#perfil-page-header`: “My profile” title and account page header.',
    tour_perfil_s2_anchor:
      '`#perfil-card-resumen`: card with avatar, name, role, and institution snapshot.',
    tour_perfil_s3_anchor:
      '`#perfil-datos-personales`: editable name, email, phone, and profile fields.',
    tour_perfil_s4_anchor:
      '`#perfil-seguridad`: password and sensitive account options.',
    tour_ventas_s1_anchor:
      '`#ventas-page-header`: “GROBO Sales” title and commercial contact header.',
    tour_ventas_s2_anchor:
      '`#ventas-intro`: explanatory text about the sales or inquiry process.',
    tour_ventas_s3_anchor:
      '`#ventas-form-card`: card with message, email, and fields sent to sales.',
    tour_ventas_s4_anchor:
      '`#ventas-btn-enviar` submits the sales form.',
    tour_misprotocolos_s1_anchor:
      '`nav[aria-label="breadcrumb"]` on this page: trail from panel to “My protocols”.',
    tour_misprotocolos_s2_anchor:
      '`#view-tabs`: tabs for views (mine, site, network) as your site exposes.',
    tour_misprotocolos_s3_anchor:
      '`#misprotocolos-filtros-row`: filter and search row for the protocols table.',
    tour_misprotocolos_s4_anchor:
      '`#tabla-misprotocolos` (or its immediate wrapper): protocol rows; {{svg:click}} opens detail/modal.',
    tour_formularios_s1_anchor:
      '`nav[aria-label="breadcrumb"]` for the request center path to Forms.',
    tour_formularios_s2_anchor:
      '`#header-container`: page title block and intro paragraph below it.',
    tour_formularios_s3_anchor:
      '`#forms-grid`: card grid ({{i:egg}} animals, {{i:moisture}} reagents, {{i:box-seam}} supplies, etc.).',
    tour_modal_in_s1_anchor:
      'Full floating window `.modal.show .modal-dialog`: centered card on the dimmed backdrop.',
    tour_modal_in_s2_anchor:
      '`.modal.show .modal-header`: top bar with title, {{i:x-lg}} close, sometimes actions.',
    tour_modal_in_s3_anchor:
      '`.modal.show .modal-body`: scrollable middle with form, long text, or table.',
    tour_modal_in_s4_anchor:
      '`.modal.show .modal-footer`: bottom row with Save, Cancel, Delete, etc.',
    tour_misformularios_s1_anchor:
      'Only the `h4.fw-bold` in the top bar (`.container-fluid.my-5 … border-bottom h4`): the “My forms” title, not the buttons on the same row.',
    tour_misformularios_s2_anchor:
      'Text field `#search-input` filtering rows in your submissions table.',
    tour_misformularios_s3_anchor:
      'Button `#btn-export-excel` on this page to download the my-forms list.',
    tour_misformularios_s4_anchor:
      'Table `#tabla-misformularios` with type, status, and date columns.',
    tour_admin_reservas_s1_anchor:
      'Top row `.container.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom` with agenda title and header actions.',
    tour_admin_reservas_s2_anchor:
      '`.card-body` of the main `.card.shadow-sm.border-0.mb-4`: room and date range pickers.',
    tour_admin_reservas_s3_anchor:
      'Button `#btn-nueva-reserva` to start a new booking.',
    tour_admin_reservas_s4_anchor:
      '`#table-agenda`: table or grid of slots and reservations.',
    tour_admin_estadisticas_s1_anchor:
      'Breadcrumbs `.content-wrapper .card.shadow-sm nav[aria-label="breadcrumb"]` inside the stats card.',
    tour_admin_estadisticas_s2_anchor:
      'Bar `.content-wrapper .card.shadow-sm .d-flex.flex-wrap.justify-content-between.align-items-start.gap-2.mb-4` with report title and hints.',
    tour_admin_estadisticas_s3_anchor:
      'Control `#stats-from` (start date or report period).',
    tour_admin_estadisticas_s4_anchor:
      'Toggle or checkbox `#chk-ani` adjusting the series (e.g. include animals).',
    tour_admin_precios_s1_anchor:
      'Breadcrumbs in `.card.shadow-sm.border-0.p-4 nav[aria-label="breadcrumb"]` on pricing.',
    tour_admin_precios_s2_anchor:
      'Block `#titulo-precios` with the tariff header.',
    tour_admin_precios_s3_anchor:
      'Field `#search-input-precios` narrowing price rows.',
    tour_admin_precios_s4_anchor:
      '`#tbody-precios-animales`: table body with priced categories/items.',
    tour_solicitud_protocolo_s1_anchor:
      'Breadcrumbs `.container-fluid.my-5 .card.shadow-sm nav[aria-label="breadcrumb"]` for protocol requests.',
    tour_solicitud_protocolo_s2_anchor:
      'Strip `.container-fluid.my-5 .mb-4.d-flex.flex-wrap.justify-content-between` with page title and actions (e.g. new request).',
    tour_solicitud_protocolo_s3_anchor:
      '`#table-requests`: table of incoming or in-progress requests.',
    tour_solicitud_protocolo_s4_anchor:
      'Link `a.btn.btn-outline-primary[href*="protocolos.html"]` to the full protocol manager.',
    tour_misalojamientos_s1_anchor:
      'Bar `.container-fluid.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom` with “My accommodations” title.',
    tour_misalojamientos_s2_anchor:
      'Card `.container-fluid.my-5 .card.shadow-sm.border-0.p-3.mb-4` with filters and summary before the grid.',
    tour_misalojamientos_s3_anchor:
      '`#btn-export-excel` on **this** route exports visible batch rows.',
    tour_misalojamientos_s4_anchor:
      '`#table-body`: rows of assigned lots or housing.',
    tour_misreservas_s1_anchor:
      'Same top bar `.container-fluid.my-5 > .d-flex…border-bottom` on “My reservations”.',
    tour_misreservas_s2_anchor:
      'Dropdown `#select-sala` to pick room/resource before the calendar.',
    tour_misreservas_s3_anchor:
      '`#calendar-grid`: month grid with selectable days.',
    tour_misreservas_s4_anchor:
      '`#btn-reservar` after choosing day and time slot.',
    tour_cap_s1_anchor:
      'Main `h1.h3` or `h1`: training library title.',
    tour_cap_s2_anchor:
      'Left list `#cap-list` of manual topics; active row marks the loaded chapter.',
    tour_cap_s3_anchor:
      'Region `#cap-content-region` rendering the selected article.',
    tour_usuarios_s1_anchor:
      'Title `.container.my-5 h1.h4` for the user directory module.',
    tour_usuarios_s2_anchor:
      '`#filter-type`: scope or account type filter before export/edit.',
    tour_usuarios_s3_anchor:
      '`#btn-excel`: export filtered grid to Excel.',
    tour_usuarios_s4_anchor:
      '`#tabla-usuarios`: main user table.',
    tour_animales_s1_anchor:
      '`h5.fw-bold.mb-4` inside `.card.shadow-sm.border-0`: visible {{i:egg}} animals tray title.',
    tour_animales_s2_anchor:
      '`#filter-column-animal`: filter control on the animals table.',
    tour_animales_s3_anchor:
      '`#btn-excel-animal`: Excel export for filtered animals.',
    tour_animales_s4_anchor:
      '`#tabla-animales`: request rows grid.',
    tour_insumos_s1_anchor:
      '`h5.fw-bold.mb-4`: {{i:box-seam}} supplies tray title.',
    tour_insumos_s2_anchor:
      '`#filter-column-insumo`: filter on the supplies list.',
    tour_insumos_s3_anchor:
      '`#btn-excel-insumo`: export filtered supplies.',
    tour_insumos_s4_anchor:
      '`#tabla-insumos`: supplies data grid.',
    tour_reactivos_s1_anchor:
      '`h5.fw-bold.mb-4`: {{i:moisture}} reagents tray title.',
    tour_reactivos_s2_anchor:
      '`#filter-column-reactivo`: reagents table filter.',
    tour_reactivos_s3_anchor:
      '`#btn-excel-reactivo`: export reagents.',
    tour_reactivos_s4_anchor:
      '`#tabla-reactivos`: main reagents table.',
    tour_alojamientos_s1_anchor:
      '`h5` in `.d-flex.justify-content-between.align-items-center.mb-4`: “Housing management” title.',
    tour_alojamientos_s2_anchor:
      '`#search-alojamiento`: search field for housing list.',
    tour_alojamientos_s3_anchor:
      '`#btn-excel-alojamiento`: export housing grid.',
    tour_alojamientos_s4_anchor:
      '`#tabla-alojamientos`: rows for cages, rooms, or units.',
    tour_protocolos_s1_anchor:
      'Breadcrumbs `.container.my-5 nav[aria-label="breadcrumb"]` for protocol admin.',
    tour_protocolos_s2_anchor:
      '`#filter-type-prot`: protocol type or status filter.',
    tour_protocolos_s3_anchor:
      '`#btn-excel-prot`: export protocol list.',
    tour_protocolos_s4_anchor:
      '`#main-table-prot`: master protocols table.',
  },
  pt: {
    tour_welcome_s1_anchor:
      '{{svg:hand}} O contorno verde envolve só o {{i:link-45deg}} link do cabeçalho para groboapp.com (marca GROBO). Não inclui o menu de texto nem os ícones redondos de preferências.',
    tour_welcome_s2_anchor:
      'Realça as listas `#main-menu-ul`, `#side-menu-ul` ou `#mobile-menu-ul`: cada linha visível é uma entrada ou submenu do portal.',
    tour_welcome_s3_anchor:
      'Faixa de ícones `#side-controls-ul` (ou último bloco do menu superior): {{i:globe2}} idioma, {{i:brightness-high}} tema, {{i:fonts}} letra, {{i:mic}} voz Gecko, {{i:keyboard}} atalhos, {{i:layout-sidebar-reverse}} menu lateral ou superior.',
    tour_welcome_s4_anchor:
      'O gatilho `#gecko-search-trigger`: a pílula {{i:search}} Gecko Search junto à margem inferior antes da barra de ajuda.',
    tour_welcome_s5_anchor:
      'Toda a faixa fixa `#gecko-capacitacion-fab` em baixo: {{i:book-half}} manual, {{i:lightning-charge}} tour interativo, {{i:x-lg}} ocultar barra.',
    tour_dashboard_menu_s1_anchor:
      'As mesmas listas `#main-menu-ul` / `#side-menu-ul` / `#mobile-menu-ul` da boas-vindas, vistas a partir do painel inicial.',
    tour_panel_dash_s1_anchor:
      'Bloco `#dashboard-welcome`: cartão ou faixa de boas-vindas com o seu nome e resumo do painel do investigador.',
    tour_panel_dash_s2_anchor:
      'Contentor `#dashboard-noticias-mount` onde a aplicação insere {{i:newspaper}} notícias ou avisos.',
    tour_panel_dash_s3_anchor:
      'Grelha `#dashboard-grid` de atalhos ou cartões de módulos.',
    tour_admin_dash_s1_anchor:
      'O mesmo nó `#dashboard-welcome` em contexto {{i:shield-lock}} de administração: saudação e resumo de gestão.',
    tour_admin_dash_s2_anchor:
      '`#dashboard-noticias-mount` no painel admin: coluna de {{i:newspaper}} novidades para gestores.',
    tour_admin_dash_s3_anchor:
      '`#dashboard-grid` do painel de administração: indicadores ou cartões operacionais.',
    tour_mensajes_s1_anchor:
      '`#mensajes-page-header`: título «Mensagens» e faixa superior da caixa pessoal.',
    tour_mensajes_s2_anchor:
      'Painel esquerdo `#lista-hilos` com conversas ou contactos. {{svg:click}} Escolha uma linha para carregar à direita.',
    tour_mensajes_s3_anchor:
      '`#panel-hilo-wrap`: mensagens do fio ativo, campo de resposta e anexos se existirem.',
    tour_mensajes_s4_anchor:
      'Botão `#btn-nuevo-msg` para iniciar uma nova mensagem.',
    tour_mensajes_inst_s1_anchor:
      '`#mensajes-page-header` da mensagem institucional: título e contexto de avisos oficiais.',
    tour_mensajes_inst_s2_anchor:
      '`#lista-hilos` em modo institucional: lista de fios. {{svg:click}} Selecione para ver o detalhe à direita.',
    tour_mensajes_inst_s3_anchor:
      '`#panel-hilo-wrap` com o aviso institucional selecionado e área de resposta se permitido.',
    tour_mensajes_inst_s4_anchor:
      '`#btn-nuevo-msg` para nova mensagem no canal institucional.',
    tour_noticias_s1_anchor:
      '`#noticias-page-header`: título do portal de notícias.',
    tour_noticias_s2_anchor:
      'Bloco `#filtro-alcance` (separadores ou botões) para notícias {{i:building}} locais vs {{i:diagram-3}} rede.',
    tour_noticias_s3_anchor:
      '`#noticias-toolbar`: pesquisa, ordenação e ações sobre a lista.',
    tour_noticias_s4_anchor:
      '`#noticias-grid`: mosaico de cartões de notícias.',
    tour_soporte_s1_anchor:
      '`#soporte-page-header`: título de suporte e cabeçalho dos tickets.',
    tour_soporte_s2_anchor:
      '`#lista-tickets`: coluna dos seus pedidos. {{svg:click}} Abra um para ver o fio.',
    tour_soporte_s3_anchor:
      '`#panel-ticket-wrap`: detalhe do ticket, respostas da equipa e a sua mensagem.',
    tour_soporte_s4_anchor:
      '`#btn-nuevo-ticket` para criar novo ticket.',
    tour_perfil_s1_anchor:
      '`#perfil-page-header`: título «O meu perfil».',
    tour_perfil_s2_anchor:
      '`#perfil-card-resumen`: cartão com avatar, nome, função e instituição.',
    tour_perfil_s3_anchor:
      '`#perfil-datos-personales`: formulário de dados editáveis.',
    tour_perfil_s4_anchor:
      '`#perfil-seguridad`: palavra-passe e opções sensíveis.',
    tour_ventas_s1_anchor:
      '`#ventas-page-header`: título comercial GROBO.',
    tour_ventas_s2_anchor:
      '`#ventas-intro`: texto introdutório sobre vendas ou contacto.',
    tour_ventas_s3_anchor:
      '`#ventas-form-card`: cartão com campos da mensagem e email.',
    tour_ventas_s4_anchor:
      '`#ventas-btn-enviar` para enviar o formulário.',
    tour_misprotocolos_s1_anchor:
      '`nav[aria-label="breadcrumb"]` desta página: trilho até «Os meus protocolos».',
    tour_misprotocolos_s2_anchor:
      '`#view-tabs`: separadores de vista (meus, sede, rede) conforme a sua instalação.',
    tour_misprotocolos_s3_anchor:
      '`#misprotocolos-filtros-row`: filtros e pesquisa sobre a tabela.',
    tour_misprotocolos_s4_anchor:
      '`#tabla-misprotocolos`: grelha de protocolos; {{svg:click}} abre detalhe/modal.',
    tour_formularios_s1_anchor:
      'Migas `nav[aria-label="breadcrumb"]` do centro de pedidos até Formulários.',
    tour_formularios_s2_anchor:
      '`#header-container`: título da página e parágrafo introdutório.',
    tour_formularios_s3_anchor:
      '`#forms-grid`: grelha de cartões ({{i:egg}} animais, {{i:moisture}} reagentes, {{i:box-seam}} consumíveis, etc.).',
    tour_modal_in_s1_anchor:
      'Janela flutuante completa `.modal.show .modal-dialog` sobre o fundo escurecido.',
    tour_modal_in_s2_anchor:
      '`.modal.show .modal-header`: barra superior com título, {{i:x-lg}} fechar e por vezes ações.',
    tour_modal_in_s3_anchor:
      '`.modal.show .modal-body`: zona central com formulário, texto ou tabela.',
    tour_modal_in_s4_anchor:
      '`.modal.show .modal-footer`: botões Guardar, Cancelar, Eliminar, etc.',
    tour_misformularios_s1_anchor:
      'Só o `h4.fw-bold` da barra superior (`.container-fluid.my-5 … border-bottom h4`): título «Os meus formulários», não os botões da mesma linha.',
    tour_misformularios_s2_anchor:
      'Campo `#search-input` que filtra linhas da tabela de pedidos.',
    tour_misformularios_s3_anchor:
      'Botão `#btn-export-excel` nesta página para exportar a lista.',
    tour_misformularios_s4_anchor:
      'Tabela `#tabla-misformularios` com colunas de tipo, estado e datas.',
    tour_admin_reservas_s1_anchor:
      'Linha superior `.container.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom` com título da agenda.',
    tour_admin_reservas_s2_anchor:
      '`.card-body` do `.card.shadow-sm.border-0.mb-4`: sala e intervalo de datas.',
    tour_admin_reservas_s3_anchor:
      'Botão `#btn-nueva-reserva` para nova reserva.',
    tour_admin_reservas_s4_anchor:
      '`#table-agenda`: tabela ou grelha de reservas.',
    tour_admin_estadisticas_s1_anchor:
      'Migas `.content-wrapper .card.shadow-sm nav[aria-label="breadcrumb"]` nas estatísticas.',
    tour_admin_estadisticas_s2_anchor:
      'Barra `.content-wrapper .card.shadow-sm .d-flex.flex-wrap.justify-content-between.align-items-start.gap-2.mb-4` com título e textos de ajuda.',
    tour_admin_estadisticas_s3_anchor:
      'Controlo `#stats-from` (data ou início do período).',
    tour_admin_estadisticas_s4_anchor:
      'Caixa `#chk-ani` que ajusta a série (ex.: incluir animais).',
    tour_admin_precios_s1_anchor:
      'Migas em `.card.shadow-sm.border-0.p-4 nav[aria-label="breadcrumb"]` na página de preços.',
    tour_admin_precios_s2_anchor:
      'Bloco `#titulo-precios` com cabeçalho do tarifário.',
    tour_admin_precios_s3_anchor:
      'Campo `#search-input-precios` para filtrar linhas.',
    tour_admin_precios_s4_anchor:
      '`#tbody-precios-animales`: corpo da tabela com itens tarifados.',
    tour_solicitud_protocolo_s1_anchor:
      'Migas `.container-fluid.my-5 .card.shadow-sm nav[aria-label="breadcrumb"]` de pedidos de protocolo.',
    tour_solicitud_protocolo_s2_anchor:
      'Faixa `.container-fluid.my-5 .mb-4.d-flex.flex-wrap.justify-content-between` com título e ações.',
    tour_solicitud_protocolo_s3_anchor:
      '`#table-requests`: tabela de pedidos.',
    tour_solicitud_protocolo_s4_anchor:
      'Ligação `a.btn.btn-outline-primary[href*="protocolos.html"]` para o gestor de protocolos.',
    tour_misalojamientos_s1_anchor:
      'Barra `.container-fluid.my-5 > .d-flex.justify-content-between.align-items-center.mb-4.border-bottom` com título «Os meus alojamentos».',
    tour_misalojamientos_s2_anchor:
      'Cartão `.container-fluid.my-5 .card.shadow-sm.border-0.p-3.mb-4` com filtros antes da tabela.',
    tour_misalojamientos_s3_anchor:
      '`#btn-export-excel` **nesta** rota exporta lotes visíveis.',
    tour_misalojamientos_s4_anchor:
      '`#table-body`: linhas do alojamento ou lote.',
    tour_misreservas_s1_anchor:
      'A mesma barra superior `.container-fluid.my-5 > .d-flex…border-bottom` em «As minhas reservas».',
    tour_misreservas_s2_anchor:
      'Lista `#select-sala` para escolher sala antes do calendário.',
    tour_misreservas_s3_anchor:
      '`#calendar-grid`: grelha mensal com dias clicáveis.',
    tour_misreservas_s4_anchor:
      '`#btn-reservar` após escolher dia e horário.',
    tour_cap_s1_anchor:
      '`h1.h3` ou `h1` principal: título da biblioteca de capacitação.',
    tour_cap_s2_anchor:
      'Lista lateral `#cap-list` com temas do manual.',
    tour_cap_s3_anchor:
      'Região `#cap-content-region` com o artigo selecionado.',
    tour_usuarios_s1_anchor:
      'Título `.container.my-5 h1.h4` do módulo de utilizadores.',
    tour_usuarios_s2_anchor:
      '`#filter-type`: filtro de tipo ou âmbito de conta.',
    tour_usuarios_s3_anchor:
      '`#btn-excel`: exportar grelha filtrada.',
    tour_usuarios_s4_anchor:
      '`#tabla-usuarios`: tabela principal.',
    tour_animales_s1_anchor:
      '`h5.fw-bold.mb-4` dentro de `.card.shadow-sm.border-0`: título da bandeja de {{i:egg}} animais.',
    tour_animales_s2_anchor:
      '`#filter-column-animal`: filtro sobre a tabela de animais.',
    tour_animales_s3_anchor:
      '`#btn-excel-animal`: exportar animais filtrados.',
    tour_animales_s4_anchor:
      '`#tabla-animales`: linhas de pedidos.',
    tour_insumos_s1_anchor:
      '`h5.fw-bold.mb-4`: título da bandeja de {{i:box-seam}} consumíveis.',
    tour_insumos_s2_anchor:
      '`#filter-column-insumo`: filtro da lista de insumos.',
    tour_insumos_s3_anchor:
      '`#btn-excel-insumo`: exportar.',
    tour_insumos_s4_anchor:
      '`#tabla-insumos`: grelha de insumos.',
    tour_reactivos_s1_anchor:
      '`h5.fw-bold.mb-4`: título da bandeja de {{i:moisture}} reagentes.',
    tour_reactivos_s2_anchor:
      '`#filter-column-reactivo`: filtro da tabela.',
    tour_reactivos_s3_anchor:
      '`#btn-excel-reactivo`: exportar reagentes.',
    tour_reactivos_s4_anchor:
      '`#tabla-reactivos`: tabela principal.',
    tour_alojamientos_s1_anchor:
      '`h5` em `.d-flex.justify-content-between.align-items-center.mb-4`: título de gestão de alojamentos.',
    tour_alojamientos_s2_anchor:
      '`#search-alojamiento`: pesquisa na lista.',
    tour_alojamientos_s3_anchor:
      '`#btn-excel-alojamiento`: exportar grelha.',
    tour_alojamientos_s4_anchor:
      '`#tabla-alojamientos`: linhas de gaiolas ou salas.',
    tour_protocolos_s1_anchor:
      'Migas `.container.my-5 nav[aria-label="breadcrumb"]` do gestor de protocolos.',
    tour_protocolos_s2_anchor:
      '`#filter-type-prot`: filtro por tipo ou estado.',
    tour_protocolos_s3_anchor:
      '`#btn-excel-prot`: exportar lista.',
    tour_protocolos_s4_anchor:
      '`#main-table-prot`: tabela mestre de protocolos.',
  },
};

const FOCUS_LABEL = {
  es: 'Lo que marca el recuadro verde',
  en: 'What the green highlight marks',
  pt: 'O que o contorno verde realça',
};

function formatCapacitacionLines(lang) {
  const keys = Object.keys(ANCHORS[lang]).sort();
  const lines = keys.map((k) => `        ${k}: ${JSON.stringify(ANCHORS[lang][k])},`);
  return lines.join('\n');
}

function patchFile(filename, lang) {
  const filePath = path.join(I18N_DIR, filename);
  let s = fs.readFileSync(filePath, 'utf8');
  if (s.includes('tour_focus_label:')) {
    console.log(`Skip ${filename} (already patched)`);
    return;
  }
  const m = s.match(/\n        tour_detail_label: [^\n]+\n/);
  if (!m) throw new Error(`tour_detail_label line not found in ${filename}`);
  s = s.replace(
    /\n        tour_detail_label: [^\n]+\n/,
    (block) => `${block}        tour_focus_label: ${JSON.stringify(FOCUS_LABEL[lang])},\n`
  );

  const anchorBlock = `${formatCapacitacionLines(lang)}\n`;
  const navNeedle = '        nav_library:';
  const navIdx = s.indexOf(navNeedle);
  if (navIdx === -1) throw new Error(`nav_library not found in ${filename}`);
  s = `${s.slice(0, navIdx)}${anchorBlock}${s.slice(navIdx)}`;

  fs.writeFileSync(filePath, s, 'utf8');
  console.log(`Patched ${filename} (+ tour_focus_label + ${Object.keys(ANCHORS[lang]).length} anchors)`);
}

['es.js', 'en.js', 'pt.js'].forEach((f) => {
  const lang = f.replace('.js', '');
  patchFile(f, lang);
});
