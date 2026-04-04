/**
 * Manual de capacitación (ES): capítulos por slug de ruta de menú.
 * Cada capítulo: summary, roles, blocks[{ id, h, html, icon?, cat? }].
 * - icon: nombre Bootstrap Icons (sin prefijo bi-), ej. "funnel".
 * - cat: agrupa apartados; clave i18n capacitacion.cat_<cat>.
 */
export const CHAPTERS = {
  admin__dashboard: {
    overview:
      'Esta pantalla es el punto de llegada habitual del equipo que administra la sede en GROBO. Aquí no se resuelve todo el trabajo a fondo, pero sí se orienta: qué está pendiente, a qué módulos conviene entrar y qué avisos merecen atención.\n\nPiense en ella como la “entrada” del panel de administración: le acerca a protocolos, pedidos, reservas, mensajes y demás áreas sin tener que recordar de memoria todo el menú. Más abajo se explica con detalle el menú lateral, la barra superior y cómo leer números y tarjetas sin confundirlos con el detalle completo de cada módulo.',
    summary:
      'Panel de arranque de la administración de sede: visión rápida de actividad, accesos a módulos críticos y recordatorios operativos.',
    roles:
      'Usuarios con menú administrativo (típicamente perfil maestro en contexto institución, Superadmin de sede, Admin de sede). Lo que vea depende de módulos contratados y permisos.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'info-circle',
        h: 'Qué es esta pantalla',
        html: '<p>Es el <strong>punto de partida</strong> tras iniciar sesión como administración: resume lo urgente y le da accesos directos. <strong>No sustituye</strong> las bandejas completas de protocolos, pedidos o reservas; use esos módulos para el detalle y las acciones masivas.</p>',
      },
      {
        id: 'nav_marco',
        cat: 'navigation',
        icon: 'layout-sidebar-inset',
        h: 'Menú lateral (cada ítem)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-house-door text-success" aria-hidden="true"></i> Panel / Inicio / Dashboard</dt><dd>Vuelve a esta vista de tablero.</dd><dt><i class="bi bi-people text-success" aria-hidden="true"></i> Usuarios</dt><dd>Abre el directorio de cuentas y roles de la sede.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocolos / Solicitudes de protocolo</dt><dd>Gestión operativa o cola de trámites según el ítem exacto de su menú.</dd><dt><i class="bi bi-rabbit text-success" aria-hidden="true"></i> Animales, reactivos, insumos</dt><dd>Bandejas de pedidos por tipo (solo si el módulo está contratado).</dd><dt><i class="bi bi-calendar-week text-success" aria-hidden="true"></i> Reservas / Alojamientos</dt><dd>Agenda e infraestructura o estadías en bioterio.</dd><dt><i class="bi bi-bar-chart-line text-success" aria-hidden="true"></i> Estadísticas</dt><dd>Indicadores y reportes agregados.</dd><dt><i class="bi bi-gear text-success" aria-hidden="true"></i> Configuración</dt><dd>Hub de parámetros de la sede (submenús).</dd><dt><i class="bi bi-currency-dollar text-success" aria-hidden="true"></i> Precios / Facturación / Historial contable</dt><dd>Módulo contable si está habilitado.</dd><dt><i class="bi bi-newspaper text-success" aria-hidden="true"></i> Noticias (admin)</dt><dd>Publicación de avisos del portal.</dd><dt><i class="bi bi-question-circle text-success" aria-hidden="true"></i> Ayuda (Capacitación, Ticket, Ventas)</dt><dd>Manual y tutoriales para todos; <strong>Ticket/Contacto</strong> (Soporte Gecko) suele estar solo en perfiles <strong>administrativos</strong> para fallos de la aplicación; <strong>Ventas</strong> es contacto comercial.</dd></dl><p class="small text-muted mt-2 mb-0">Los ítems que <strong>no ve</strong> suelen estar ocultos por <strong>módulo no contratado</strong> o por <strong>rol</strong>.</p>',
      },
      {
        id: 'nav_superior',
        cat: 'navigation',
        icon: 'window',
        h: 'Barra superior (iconos habituales)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Campana / Notificaciones</dt><dd>Abre o previsualiza avisos recientes (según implementación de su sede).</dd><dt><i class="bi bi-brightness-high text-success" aria-hidden="true"></i> Tema claro / oscuro</dt><dd>Alterna el contraste de la interfaz si está disponible.</dd><dt><i class="bi bi-globe2 text-success" aria-hidden="true"></i> Idioma</dt><dd>Cambia el idioma de la interfaz cuando hay selector global.</dd><dt><i class="bi bi-person-circle text-success" aria-hidden="true"></i> Perfil / usuario</dt><dd>Acceso a <strong>Mi perfil</strong>, cierre de sesión o datos de cuenta.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Institución / sede</dt><dd>Si gestiona varias sedes, aquí puede elegir contexto (cuando aplique).</dd></dl>',
      },
      {
        id: 'dash_bloques',
        cat: 'dashboard',
        icon: 'speedometer2',
        h: 'Bloques del tablero (tarjetas, números, listas)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-graph-up-arrow text-success" aria-hidden="true"></i> Contadores y KPI</dt><dd>Números que resumen pendientes (solicitudes, pedidos, mensajes). Un clic suele llevar al módulo filtrado o a la bandeja relacionada.</dd><dt><i class="bi bi-card-heading text-success" aria-hidden="true"></i> Tarjetas de acceso rápido</dt><dd>Atajos gráficos a un submódulo. Equivalente a abrir el mismo destino desde el menú lateral.</dd><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Listas “últimos movimientos”</dt><dd>Muestran un subconjunto reciente; use <strong>Ver todo</strong> o el menú lateral para la lista completa si existe el enlace.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Actualizar / Refrescar</dt><dd>En algunos tableros hay botón para recargar datos sin pulsar F5.</dd></dl><p class="small text-muted mt-2 mb-0">Si un número <strong>no coincide</strong> con la realidad, abra el módulo origen y use sus filtros: el tablero puede mostrar solo un resumen.</p>',
      },
      {
        id: 'flujo',
        cat: 'content',
        icon: 'diagram-3',
        h: 'Flujo de trabajo recomendado (orden del día)',
        html: '<ol class="mb-0 small"><li><strong>Entrada:</strong> repasar contadores de solicitudes de protocolo, pedidos y mensajes institucionales.</li><li><strong>Operación:</strong> procesar bandejas en el orden acordado con su bioterio (p. ej. protocolos antes de liberar pedidos de animales).</li><li><strong>Cierre:</strong> revisar reservas conflictivas, alojamientos por facturar y, si aplica, vistas de facturación.</li></ol>',
      },
      {
        id: 'fab_otras',
        cat: 'help',
        icon: 'journal-richtext',
        h: 'En otras pantallas: barra verde inferior',
        html: '<p>Fuera de este tablero, muchas páginas muestran una <strong>barra fija inferior</strong> con <strong>«Ver documento de ayuda»</strong> (manual en el tema de esa pantalla) y <strong>«Tutorial interactivo»</strong> (recorrido con zonas resaltadas, si está definido para la ruta).</p><ul class="mb-0"><li>Incidencias técnicas: <strong>Ayuda → Ticket/Contacto</strong>.</li><li>Manual completo por menú: <strong>Ayuda → Capacitación</strong>.</li></ul>',
      },
    ],
  },
  panel__dashboard: {
    overview:
      'Si usted usa GROBO para pedir animales, insumos o reactivos, o para seguir sus protocolos y mensajes, esta es la pantalla de bienvenida después de iniciar sesión.\n\nEstá pensada para ahorrar clics: concentra enlaces a lo que un investigador o técnico suele necesitar a diario. El menú lateral sigue siendo la referencia completa; aquí se ofrece un atajo visual. Los módulos que no ve están desactivados para su usuario o no están contratados en su institución: no es un fallo del sistema.',
    summary:
      'Inicio del panel de investigador: acceso a sus protocolos, pedidos y comunicaciones sin pasar por menús profundos.',
    roles:
      'Investigadores y perfiles de usuario de sede que operan como tal (roles 3, 5, 6 u otros según su institución). Solo verá módulos que el administrador haya habilitado.',
    blocks: [
      {
        id: 'proposito',
        cat: 'navigation',
        icon: 'house-door',
        h: 'Qué es el panel de investigador',
        html: '<p>Vista de <strong>entrada</strong> después del login: concentra enlaces a lo que usted usa a diario (pedidos, protocolos, mensajes). El menú lateral solo muestra módulos <strong>habilitados</strong> para su usuario.</p>',
      },
      {
        id: 'nav_lateral',
        cat: 'navigation',
        icon: 'layout-sidebar-inset',
        h: 'Menú lateral (ítems frecuentes)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-ui-checks text-success" aria-hidden="true"></i> Centro de solicitudes / Formularios</dt><dd>Inicia nuevos pedidos de animales, reactivos o insumos según contratación.</dd><dt><i class="bi bi-card-list text-success" aria-hidden="true"></i> Mis formularios</dt><dd>Historial y estado de todo lo enviado.</dd><dt><i class="bi bi-file-earmark-medical text-success" aria-hidden="true"></i> Mis protocolos</dt><dd>Vigencia y datos del estudio que autorizan sus pedidos.</dd><dt><i class="bi bi-house-heart text-success" aria-hidden="true"></i> Mis alojamientos / Mis reservas</dt><dd>Consulta de estadías o agenda propia.</dd><dt><i class="bi bi-chat-dots text-success" aria-hidden="true"></i> Mensajes / Mensajería institucional</dt><dd>Comunicación 1:1 o avisos oficiales.</dd><dt><i class="bi bi-newspaper text-success" aria-hidden="true"></i> Noticias</dt><dd>Tablón de la institución.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Mi perfil</dt><dd>Datos, idioma, tema y correo para notificaciones.</dd></dl>',
      },
      {
        id: 'dash_tarjetas',
        cat: 'dashboard',
        icon: 'speedometer2',
        h: 'Tarjetas y accesos del tablero',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-link-45deg text-success" aria-hidden="true"></i> Accesos directos (tiles)</dt><dd>Cada tarjeta abre el módulo indicado; equivale a elegir el mismo nombre en el menú.</dd><dt><i class="bi bi-bell text-success" aria-hidden="true"></i> Avisos o recordatorios</dt><dd>Pueden mostrar vencimientos de protocolo o pedidos pendientes de subsanar.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Actualizar</dt><dd>Recarga datos del tablero si existe el botón.</dd></dl>',
      },
      {
        id: 'pedidos',
        cat: 'content',
        icon: 'clipboard-check',
        h: 'Pedidos: de dónde salen y dónde se siguen',
        html: '<ul class="mb-0"><li><strong>Crear:</strong> <em>Centro de solicitudes</em> → elija tipo de formulario y complete campos obligatorios.</li><li><strong>Seguimiento:</strong> <em>Mis formularios</em> → abra el ítem para ver estado, notas del bioterio y adjuntos.</li><li>El texto exacto del botón <strong>Enviar</strong> / <strong>Guardar borrador</strong> puede variar; use borrador si necesita consultar con su equipo antes de enviar.</li></ul>',
      },
      {
        id: 'fab',
        cat: 'help',
        icon: 'journal-richtext',
        h: 'Barra inferior verde (en otras pantallas)',
        html: '<p>En módulos como <strong>Mis formularios</strong> o <strong>Centro de solicitudes</strong> verá la barra fija con <strong>Ver documento de ayuda</strong> y, si aplica, <strong>Tutorial interactivo</strong>.</p>',
      },
      {
        id: 'red',
        cat: 'links',
        icon: 'share',
        h: 'Institución en RED',
        html: '<p>Si su dependencia agrupa varias sedes, revise también el tema <strong>Trabajar en RED</strong>. Los menús y derivaciones pueden diferir entre sedes.</p>',
      },
    ],
  },
  admin__usuarios: {
    overview:
      'En Usuarios y roles se gestiona quién puede entrar a GROBO, con qué permisos y en qué departamento figura. También es el lugar habitual para revisar datos de contacto, restablecer accesos según política de la sede y entender cómo cada persona se relaciona con protocolos o pedidos.\n\nNo es una agenda social: es una herramienta de administración. Las acciones disponibles (crear, editar, exportar) dependen de su rol y de las reglas internas de su institución. Respete siempre la normativa de protección de datos al exportar listas o compartir información.',
    summary:
      'Directorio de personas de la sede: alta, edición, departamento, roles y vínculo con protocolos y formularios.',
    roles:
      'Administración de sede (perfiles 2 y 4 típicamente). El perfil maestro (1) puede operar en contexto superadmin; las acciones concretas dependen de política interna.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'people',
        h: 'Objetivo de Usuarios y roles',
        html: '<p>Administra <strong>quién puede entrar</strong> a GROBO, con qué <strong>rol</strong>, en qué <strong>departamento</strong> figura y cómo se relaciona con <strong>protocolos</strong> y <strong>pedidos</strong>. Los nombres exactos de botones pueden variar una línea según su sede.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Botones típicos en la barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Nuevo usuario / Alta / Invitar</dt><dd>Abre el formulario o asistente para crear una cuenta o enviar invitación. Suele pedir nombre, apellido, correo, usuario y rol inicial.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Actualizar / Refrescar lista</dt><dd>Vuelve a cargar la grilla desde el servidor sin recargar toda la página.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar Excel / CSV</dt><dd>Descarga un archivo tabulado del listado (o de la selección) para auditoría; cumpla la normativa de protección de datos.</dd><dt><i class="bi bi-file-earmark-pdf text-success" aria-hidden="true"></i> Exportar PDF / Imprimir listado</dt><dd>Genera un informe en PDF o vista de impresión según la plantilla de su institución.</dd><dt><i class="bi bi-download text-success" aria-hidden="true"></i> Descargar / Plantilla</dt><dd>En algunas sedes existe plantilla masiva de altas; el botón descarga el modelo o un paquete de importación.</dd><dt><i class="bi bi-upload text-success" aria-hidden="true"></i> Importar usuarios</dt><dd>Si está habilitado, carga un archivo validado; suelen aparecer <strong>ventanas de confirmación</strong> con resumen de filas correctas y errores.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros y campo de búsqueda',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Buscador de texto</dt><dd>Filtra por nombre, apellido, usuario, correo o documento según lo que indexe su sede. Pulse <kbd>Enter</kbd> o el icono de lupa si existe.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filtro por rol</dt><dd>Muestra solo perfiles Admin, Investigador, Laboratorio, etc. Útil para auditorías de permisos.</dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Filtro por departamento / unidad</dt><dd>Acota la lista a una dependencia organizativa.</dd><dt><i class="bi bi-toggle-on text-success" aria-hidden="true"></i> Solo activos / Incluir inactivos</dt><dd>Algunas pantallas permiten ver cuentas deshabilitadas o históricas.</dd><dt><i class="bi bi-x-lg text-success" aria-hidden="true"></i> Limpiar filtros</dt><dd>Restablece criterios y vuelve al listado completo permitido por su rol.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Tabla de usuarios (columnas y ordenación)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-down-up text-success" aria-hidden="true"></i> Cabeceras ordenables</dt><dd>Un clic en la columna ordena ascendente/descendente (nombre, fecha de alta, etc.) cuando la cabecera muestra icono de orden.</dd><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Columna de rol</dt><dd>Resume el nivel de acceso principal; puede haber varias filas o badges si el usuario tiene contextos distintos.</dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Correo / contacto</dt><dd>Verifique que esté actualizado: las notificaciones y recuperación de clave dependen de ello.</dd><dt><i class="bi bi-pencil-square text-success" aria-hidden="true"></i> Icono lápiz en fila</dt><dd>Atajo directo a edición rápida o a la ficha sin hacer clic en toda la fila.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Clic en fila y menú de acciones',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hand-index text-success" aria-hidden="true"></i> Clic en la fila</dt><dd>Abre la <strong>ficha completa</strong> del usuario con pestañas o secciones (datos, rol, vínculos).</dd><dt><i class="bi bi-three-dots-vertical text-success" aria-hidden="true"></i> Menú contextual (⋮)</dt><dd>Puede incluir <strong>Editar</strong>, <strong>Restablecer contraseña</strong>, <strong>Desactivar</strong>, <strong>Ver historial</strong> según permisos.</dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Restablecer / enviar enlace</dt><dd>Dispara correo o genera flujo de nueva clave; confirme identidad antes de usarlo.</dd><dt><i class="bi bi-person-x text-success" aria-hidden="true"></i> Desactivar / bloquear</dt><dd>Impide nuevos accesos; los datos suelen conservarse para trazabilidad. Puede pedir <strong>confirmación</strong> en modal o SweetAlert.</dd></dl>',
      },
      {
        id: 'ficha',
        cat: 'detail',
        icon: 'card-heading',
        h: 'Dentro de la ficha de usuario',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Guardar / Aplicar cambios</dt><dd>Persiste datos personales y asignaciones. Si falla validación, el formulario marca el campo en rojo o muestra mensaje bajo el input.</dd><dt><i class="bi bi-arrow-left text-success" aria-hidden="true"></i> Volver / Cerrar</dt><dd>Regresa al listado; si hay cambios sin guardar, puede aparecer aviso de descarte.</dd><dt><i class="bi bi-diagram-3 text-success" aria-hidden="true"></i> Pestaña Protocolos / Formularios</dt><dd>Lista vínculos del usuario con el mundo operativo; use esto antes de borrar o cambiar rol drásticamente.</dd></dl><p class="small text-muted mt-2 mb-0">Cambiar <strong>rol</strong> puede alterar el menú del usuario <strong>en el próximo inicio de sesión</strong> o de inmediato según configuración.</p>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Ventanas emergentes habituales',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Confirmación de borrado o desactivación</dt><dd>Pide confirmar impacto (pérdida de acceso, datos históricos). Lea el texto antes de aceptar.</dd><dt><i class="bi bi-check-circle text-success" aria-hidden="true"></i> Éxito tras guardar</dt><dd>Confirma que los datos se persistieron; puede ofrecer volver al listado.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Error de permiso o conflicto</dt><dd>Indica que su rol no puede hacer la acción o que otro usuario modificó el registro; reintente o contacte a un superior.</dd></dl>',
      },
      {
        id: 'vinculos',
        cat: 'bulk',
        icon: 'shield-check',
        h: 'Buenas prácticas y trazabilidad',
        html: '<ul class="mb-0"><li>Antes de <strong>dar de baja</strong> un usuario, confirme que no es titular único de protocolos activos.</li><li>No comparta exportaciones con datos personales fuera de la institución sin base legal y autorización.</li><li>Documente cambios de rol sensibles (p. ej. ascenso a Admin) en su procedimiento interno.</li></ul>',
      },
    ],
  },
  admin__protocolos: {
    overview:
      'Este módulo es la “mesa de trabajo” de los protocolos que ya están dados de alta en GROBO o en uso cotidiano: vigencias, especies permitidas, participantes y estados que condicionan si se pueden hacer pedidos de animales u otros trámites.\n\nNo es lo mismo que la cola de «Solicitudes de protocolo»: allí entran los trámites nuevos o renovaciones; aquí se mantiene y ajusta lo ya aprobado para que el laboratorio opere con información al día. Si cambia la vigencia o se suspende un estudio, el impacto se nota en pedidos y alojamientos: por eso conviene revisar con cuidado antes de confirmar cambios.',
    summary:
      'Gestión operativa de protocolos ya registrados o en curso de vida en la plataforma: estados, datos del estudio, especies y vínculo con pedidos y alojamientos.',
    roles:
      'Administración de bioterio / cumplimiento / secretaría técnica según su sede. No confundir con la cola de «Solicitudes de protocolo» (trámites de alta nuevos).',
    blocks: [
      {
        id: 'diferencia',
        cat: 'navigation',
        icon: 'signpost-split',
        h: 'Protocolos (esta pantalla) vs Solicitudes de protocolo',
        html: '<p><strong>Aquí</strong> trabaja sobre protocolos ya existentes en el sistema: vigencia, especies, participantes, límites operativos. <strong>Solicitudes de protocolo</strong> es la <strong>cola de trámites</strong> (altas nuevas, renovaciones) que aún deben aprobarse.</p><ul class="mb-0"><li>Botón o menú <strong>Solicitudes de protocolo</strong> en el lateral → bandeja de trámites entrantes.</li><li>Esta grilla → mantenimiento del ciclo de vida una vez aprobado o activado.</li></ul>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra de herramientas',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Nuevo protocolo manual</dt><dd>Solo si su sede permite alta directa sin pasar por solicitud; suele ser excepcional.</dd><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Refrescar</dt><dd>Actualiza estados y contadores desde servidor.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar listado</dt><dd>Descarga la vista filtrada para comités o auditoría.</dd><dt><i class="bi bi-printer text-success" aria-hidden="true"></i> Imprimir / PDF</dt><dd>Genera versión imprimible de la grilla o ficha según plantilla.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros de la bandeja',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Búsqueda global</dt><dd>Por título, código interno, palabras clave del estudio.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Investigador titular</dt><dd>Filtra protocolos donde figura como responsable.</dd><dt><i class="bi bi-toggle2-on text-success" aria-hidden="true"></i> Estado operativo</dt><dd>Activo, suspendido, vencido, en renovación, etc. (etiquetas locales).</dd><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Vigencia</dt><dd>Rango de fechas de inicio/fin para encontrar vencimientos próximos.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Columnas y lectura de la grilla',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-bookmark text-success" aria-hidden="true"></i> Código / referencia</dt><dd>Identificador único para cruzar con pedidos y alojamientos.</dd><dt><i class="bi bi-calendar-event text-success" aria-hidden="true"></i> Inicio y fin de vigencia</dt><dd>Condicionan si el investigador puede pedir animales o días de alojamiento.</dd><dt><i class="bi bi-bug text-success" aria-hidden="true"></i> Especies autorizadas</dt><dd>Resumen o enlace al detalle de límites por especie.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Clic en protocolo y acciones en ficha',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-pencil-square text-success" aria-hidden="true"></i> Editar datos administrativos</dt><dd>Corrige título, departamento, centros de costo; no reemplaza dictamen ético externo.</dd><dt><i class="bi bi-pause-btn text-success" aria-hidden="true"></i> Suspender / reactivar</dt><dd>Bloquea nuevos pedidos mientras se resuelve incumplimiento o trámite.</dd><dt><i class="bi bi-diagram-2 text-success" aria-hidden="true"></i> Participantes</dt><dd>Alta/baja de co-investigadores o personal autorizado según reglas de su sede.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Documentación</dt><dd>Adjuntos de respaldo (PDF de comité, enmiendas).</dd></dl>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Confirmaciones frecuentes',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Cambio de vigencia</dt><dd>Puede advertir pedidos abiertos que quedarán fuera de alcance.</dd><dt><i class="bi bi-check-lg text-success" aria-hidden="true"></i> Guardar especies / cupos</dt><dd>Valida que las cantidades sean coherentes con política interna.</dd></dl>',
      },
      {
        id: 'integracion',
        cat: 'content',
        icon: 'link-45deg',
        h: 'Impacto en otros módulos',
        html: '<p><strong>Pedidos de animales</strong> y <strong>alojamientos</strong> validan protocolo y vigencia en tiempo real. <strong>Facturación</strong> puede agrupar consumos por protocolo. Un error aquí se propaga a esas bandejas.</p>',
      },
    ],
  },
  admin__solicitud_protocolo: {
    overview:
      'Aquí llegan las solicitudes de protocolo que el investigador (o quien corresponda) envía por el sistema: altas nuevas, renovaciones o cambios que aún deben revisarse antes de quedar operativas en la bandeja principal de Protocolos.\n\nSirve para ordenar el trabajo del comité o de administración: ver qué está pendiente, pedir aclaraciones, adjuntar documentación y marcar avances hasta que el trámite quede resuelto. El flujo exacto y los nombres de estado dependen de cómo su sede configuró GROBO; lo importante es distinguir esta cola del mantenimiento diario de protocolos ya activos.',
    summary:
      'Cola de trámites de protocolo: nuevas altas, renovaciones o modificaciones que el investigador envía y la administración o comité procesan dentro de GROBO.',
    roles:
      'Personal administrativo y de cumplimiento. El investigador inicia la solicitud desde su entorno (cuando esté habilitado); aquí se gestiona la respuesta.',
    blocks: [
      {
        id: 'flujo',
        h: 'Flujo típico',
        html: '<ol class="mb-0 small"><li>El investigador completa el formulario de solicitud y adjunta documentación.</li><li>La solicitud aparece en esta bandeja con estado pendiente o equivalente.</li><li>Administración revisa completitud, puede pedir subsanación o avanzar el estado.</li><li>Al aprobarse, el protocolo pasa a convivir en <strong>Protocolos</strong> para uso operativo diario.</li></ol>',
      },
      {
        id: 'revision',
        h: 'Qué revisar en cada ítem',
        html: '<ul class="mb-0"><li>Identificación del titular y co-investigadores.</li><li>Especies, procedimientos y fechas alineadas al dictamen o documento oficial.</li><li>Archivos obligatorios (PDF del comité, anexos, etc.).</li><li>Coherencia con políticas internas de la sede (departamento, centro de costos si aplica).</li></ul>',
      },
      {
        id: 'estados',
        h: 'Estados y comunicación',
        html: '<p>Los nombres exactos de estado varían por configuración. Documente internamente qué estado significa «listo para bioterio» vs «solo trámite ético».</p><ul class="mb-0"><li>Use comentarios visibles al investigador con lenguaje claro.</li><li>Si el sistema envía notificación por correo, verifique que el usuario tenga email actualizado en su ficha.</li></ul>',
      },
    ],
  },
  admin__animales: {
    overview:
      'En esta bandeja el bioterio u operaciones da seguimiento a cada pedido de animales vivos: desde que el investigador lo envía hasta la entrega o cierre, pasando por estados intermedios y notas que ambas partes pueden ver según configuración.\n\nEs el lugar para filtrar por protocolo, fecha o estado, registrar observaciones y mantener alineado al laboratorio con lo que pidió el usuario. Los detalles en pantalla (columnas, botones) pueden variar, pero la idea es siempre la misma: una fila por pedido y acciones claras al abrirlo.',
    summary:
      'Administración de pedidos de animales vivos: recepción, preparación, estados de entrega y comunicación con el investigador.',
    roles:
      'Bioterio / compras / logística animal según organigrama de la sede.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'rabbit',
        h: 'Rol de la bandeja de animales',
        html: '<p>Gestiona el <strong>ciclo operativo</strong> de cada pedido de animales vivos desde que entra hasta entrega o cancelación. Es la contraparte admin de lo que el investigador ve en <strong>Mis formularios</strong>.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Actualizar</dt><dd>Recarga pedidos y estados en curso.</dd><dt><i class="bi bi-file-earmark-excel text-success" aria-hidden="true"></i> Exportar</dt><dd>Lista filtrada para logística o compras.</dd><dt><i class="bi bi-funnel text-success" aria-hidden="true"></i> Filtros avanzados</dt><dd>Algunas sedes agrupan filtros en panel lateral o modal.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros típicos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> Nº de pedido / referencia</dt><dd>Localiza un trámite concreto citado por el investigador.</dd><dt><i class="bi bi-file-earmark-text text-success" aria-hidden="true"></i> Protocolo</dt><dd>Solo pedidos ligados a ese código.</dd><dt><i class="bi bi-person text-success" aria-hidden="true"></i> Solicitante</dt><dd>Filtra por investigador o usuario que cargó el formulario.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Estado</dt><dd>Pendiente, en preparación, listo para retiro, entregado, cancelado, etc.</dd><dt><i class="bi bi-calendar2-week text-success" aria-hidden="true"></i> Fecha requerida</dt><dd>Priorice fechas cercanas para cumplir plazo de experimento.</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Grilla de pedidos',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-gender-ambiguous text-success" aria-hidden="true"></i> Sexo y cepa</dt><dd>Debe coincidir con lo autorizado en protocolo.</dd><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> Cantidad</dt><dd>Cruce con cupos y disponibilidad de bioterio.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> Ver detalle</dt><dd>Abre ficha con líneas, notas y adjuntos del formulario.</dd></dl>',
      },
      {
        id: 'row_actions',
        cat: 'row',
        icon: 'hand-index',
        h: 'Acciones dentro del pedido',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-repeat text-success" aria-hidden="true"></i> Cambiar estado</dt><dd>Desplegable o botones de flujo: avanza el pedido según su taxonomía de estados.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Nota al investigador</dt><dd>Visible en su vista de detalle; use lenguaje claro.</dd><dt><i class="bi bi-lock text-success" aria-hidden="true"></i> Nota interna</dt><dd>Solo personal admin/bioterio; útil para turnos.</dd><dt><i class="bi bi-x-octagon text-success" aria-hidden="true"></i> Rechazar / cancelar</dt><dd>Suele exigir motivo y confirmación en ventana emergente.</dd></dl>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Ventanas de confirmación',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-check-circle text-success" aria-hidden="true"></i> Marcar entregado</dt><dd>Puede pedir confirmar cantidad efectivamente retirada y responsable que recibe.</dd><dt><i class="bi bi-exclamation-triangle text-success" aria-hidden="true"></i> Cambio de protocolo</dt><dd>Si la herramienta permite reasignar, valide auditoría con su procedimiento.</dd></dl>',
      },
      {
        id: 'trazabilidad',
        cat: 'bulk',
        icon: 'shield-check',
        h: 'Trazabilidad y errores',
        html: '<p>Si el pedido quedó asociado al <strong>protocolo equivocado</strong>, no fuerce correcciones sin coordinar con <strong>Protocolos</strong>: puede afectar facturación y cumplimiento.</p>',
      },
    ],
  },
  admin__reactivos: {
    overview:
      'Algunas sedes separan los pedidos de reactivos o material biológico en una bandeja propia, distinta de los insumos de consumo general. Si ve este módulo, aquí se revisan esas solicitudes, se actualizan estados y se coordina con el investigador.\n\nLa dinámica es similar a otras bandejas: lista filtrable, detalle al abrir una fila y acciones según permisos. Si su institución unificó todo en «Insumos», este ítem puede no aparecer en el menú.',
    summary:
      'Bandeja de solicitudes de reactivos (distinta del flujo genérico de insumos cuando así está configurada la sede).',
    roles:
      'Administración de laboratorio o depósito de reactivos.',
    blocks: [
      {
        id: 'uso',
        h: 'Uso de la pantalla',
        html: '<p>Mantenga estados al día para que en <strong>Mis formularios</strong> el investigador vea el progreso. Verifique unidad de medida, cantidad y condiciones de almacenamiento en el detalle.</p>',
      },
      {
        id: 'prioridad',
        h: 'Priorización',
        html: '<ul class="mb-0"><li>Marque urgencias según fecha de experimento declarada.</li><li>Resuelva primero pedidos bloqueantes de otros módulos (p. ej. ensayo que requiere el reactivo antes de animales).</li></ul>',
      },
      {
        id: 'lista',
        h: 'Lista, columnas y confirmaciones',
        html: '<p>La grilla resume pedidos con columnas típicas: fechas, solicitante, protocolo, estado y referencia interna según su sede.</p><ul class="mb-0"><li>Use búsqueda y <strong>filtros</strong> superiores para acotar el volumen.</li><li>Al cambiar estado o cantidades puede aparecer una <strong>ventana de confirmación</strong>; léala antes de aceptar.</li><li>Los mensajes de validación suelen indicar el campo a corregir.</li></ul>',
      },
    ],
  },
  admin__insumos: {
    overview:
      'Aquí se gestionan los pedidos de insumos de laboratorio o consumibles que los investigadores envían por el sistema: preparación, entrega, cambios de estado y comunicación cuando hace falta aclarar algo.\n\nCada fila suele representar un pedido concreto; al abrirlo verá el detalle y las acciones permitidas. Mantener estados actualizados ayuda a que en «Mis formularios» el investigador vea el avance real de su solicitud.',
    summary:
      'Gestión de pedidos de insumos generales: preparación, stock, entrega y cierre.',
    roles:
      'Depósito / compras / administración de insumos experimentales.',
    blocks: [
      {
        id: 'operativa',
        h: 'Operativa diaria',
        html: '<ul class="mb-0"><li>Confirme disponibilidad o plazo de compra antes de prometer fechas al investigador.</li><li>Si el ítem es substituible, registre el criterio en notas.</li><li>Al entregar, actualice el estado para cerrar el circuito de notificación.</li></ul>',
      },
      {
        id: 'lista_detalle',
        h: 'Lista frente al detalle del pedido',
        html: '<p>La <strong>lista</strong> muestra un resumen por solicitud; al abrir una fila accede al <strong>detalle</strong> con líneas de ítem, notas del investigador y, si aplica, historial de cambios.</p><ul class="mb-0"><li>Filtre por fechas o estado para auditorías rápidas.</li><li>Antes de marcar entrega total, confirme en detalle que las cantidades coinciden con el retiro físico.</li></ul>',
      },
      {
        id: 'config',
        h: 'Relación con configuración',
        html: '<p>Catálogos de insumos y listas permitidas suelen mantenerse en <strong>Configuración → Insumos experimentales</strong>. Si un pedido falla por ítem no catalogado, corrija primero el maestro.</p>',
      },
    ],
  },
  admin__reservas: {
    overview:
      'Este módulo sirve para administrar reservas de salas, equipos o franjas horarias que comparten varios usuarios. Desde aquí se pueden revisar solicitudes, detectar solapamientos y, según la sede, aprobar o ajustar turnos.\n\nLa vista puede incluir calendario y listados; lo importante es entender que cada reserva enlaza con reglas internas (cancelación, duración máxima, quién puede reservar). Si algo no cuadra, suele deberse a política de la institución más que a un fallo puntual del programa.',
    summary:
      'Calendario y administración de reservas de salas, equipos o franjas compartidas.',
    roles:
      'Administración de infraestructura o quien centralice la agenda del bioterio.',
    blocks: [
      {
        id: 'vista',
        h: 'Vistas y conflictos',
        html: '<p>Revise superposiciones de horario y reglas de cancelación. Algunas sedes exigen aprobación explícita del administrador para ciertos espacios.</p>',
      },
      {
        id: 'acciones',
        h: 'Crear, mover o cancelar',
        html: '<ul class="mb-0"><li>Documente motivo de cambios impuestos por administración.</li><li>Comunique al investigador si la reserva se modifica desde back-office.</li></ul>',
      },
    ],
  },
  admin__alojamientos: {
    overview:
      'Los alojamientos registran dónde y durante cuánto tiempo permanecen los animales en el bioterio, vinculados a protocolos y, a menudo, a la facturación. Esta pantalla permite revisar cupos, ubicaciones, estados y cierres de estadía.\n\nAcciones como finalizar o reabrir un período pueden afectar costos: conviene coordinar con su área contable o con las reglas internas antes de confirmar. El detalle de columnas y botones depende de la configuración de la sede.',
    summary:
      'Gestión de estadías de animales en bioterio: cajas, ubicación, responsables y cierre de períodos facturables.',
    roles:
      'Personal de bioterio con permisos de alojamiento.',
    blocks: [
      {
        id: 'grilla',
        h: 'Grilla de alojamientos',
        html: '<p>Cada registro vincula protocolo, especie, cantidad y ventana de fechas. Use filtros para cuadrar con inventario físico.</p>',
      },
      {
        id: 'finalizar',
        h: 'Finalizar y facturación',
        html: '<p><strong>Finalizar</strong> o reabrir afecta cómo se consolidan consumos en facturación. Verifique con su proceso contable antes de deshacer cierres de período.</p><ul class="mb-0"><li>El historial puede mostrar mensajes del responsable de alojamiento cuando esté implementado.</li><li>QR o fichas técnicas pueden exponer datos de solo lectura para visitas.</li></ul>',
      },
    ],
  },
  admin__estadisticas: {
    overview:
      'Las estadísticas concentran gráficos y totales sobre el uso del bioterio o del sistema: pedidos, ocupación, tendencias, etc., según lo que su institución haya contratado y configurado.\n\nSirve para informes de gestión y para detectar picos de demanda; no sustituye el detalle operativo de cada bandeja. Si un indicador llama la atención, abra el módulo correspondiente para ver casos concretos.',
    summary:
      'Reportes y gráficos agregados de uso del sistema y del bioterio (según módulos activos).',
    roles:
      'Dirección del bioterio, calidad o administración que requiera indicadores.',
    blocks: [
      {
        id: 'interpretacion',
        h: 'Cómo interpretar los datos',
        html: '<p>Los totales dependen de la calidad de carga diaria (pedidos cerrados, alojamientos finalizados). Use rangos de fechas amplios para tendencias y cortos para operativa.</p>',
      },
      {
        id: 'export',
        h: 'Exportar y compartir',
        html: '<p>Si exporta datos, anonimice cuando presente fuera de la institución y respete acuerdos de confidencialidad de proyectos.</p>',
      },
    ],
  },
  admin__configuracion__config: {
    overview:
      'Configuración es el lugar donde la sede define “cómo funciona GROBO” para sus usuarios: datos de la institución, listas maestras (especies, tipos de pedido), reglas de reservas, permisos por rol, parámetros de insumos y alojamientos, y mucho más según contratación.\n\nNo es una única pantalla larga: suele organizarse en submenús a la izquierda. Los cambios aquí pueden afectar a todos los usuarios, por eso suele estar restringido a administradores de sede. Antes de modificar algo masivo, documente el criterio y avise a su equipo si hace falta.',
    summary:
      'Centro de parámetros de la sede. No es una sola “página plana”: es un hub con subsecciones (institución, especies, reservas, roles, protocolos, insumos, alojamientos, etc.).',
    roles:
      'Solo personal de configuración autorizado; cambios masivos en datos maestros.',
    blocks: [
      {
        id: 'mapa',
        h: 'Mapa de subsecciones',
        html: '<ul class="mb-0"><li><strong>Institución / departamentos:</strong> datos identitarios y estructura organizativa.</li><li><strong>Especies y categorías:</strong> base para pedidos y alojamientos.</li><li><strong>Reservas y espacios:</strong> salas, equipos, reglas de uso.</li><li><strong>Tipos de formulario / insumos:</strong> qué puede pedir cada perfil.</li><li><strong>Protocolos:</strong> plantillas, estados o validaciones locales.</li><li><strong>Alojamientos:</strong> ubicaciones físicas, tarifas asociadas si aplica.</li><li><strong>Usuarios y roles:</strong> a veces enlazado con la gestión global de usuarios.</li></ul>',
      },
      {
        id: 'riesgos',
        h: 'Riesgos al cambiar parámetros',
        html: '<p>Un cambio en especie o en tipo de formulario puede invalidar pedidos en borrador. Planifique ventanas de mantenimiento y avise a usuarios clave.</p>',
      },
      {
        id: 'documentar',
        h: 'Buena práctica',
        html: '<p>Mantenga un registro externo (wiki interna) de “qué significa cada estado” y “quién autorizó” cambios críticos para auditorías.</p>',
      },
    ],
  },
  panel__formularios: {
    overview:
      'Desde aquí inicia los trámites de pedido que su sede tenga habilitados: por ejemplo animales, reactivos o insumos. La pantalla suele mostrar tarjetas o bloques por institución y tipo de formulario; lo que no ve simplemente no está contratado o no aplica a su rol.\n\nCada botón de “Iniciar” o equivalente abre el asistente correspondiente. No confunda esta página con «Mis formularios»: allí va el historial de lo ya enviado; aquí solo se crean pedidos nuevos.',
    summary:
      'Punto de entrada a los formularios de pedido (animales, reactivos, insumos). Puede mostrar sub-rutas o tarjetas según contratación.',
    roles:
      'Investigadores y usuarios autorizados a generar solicitudes.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'ui-checks-grid',
        h: 'Qué es el Centro de solicitudes',
        html: '<p>Pantalla de <strong>elección del tipo de pedido</strong>. Según módulos contratados verá tarjetas o enlaces: animales vivos, reactivos, insumos, etc. Si solo ve una opción, su sede habilitó un subconjunto.</p>',
      },
      {
        id: 'eleccion',
        cat: 'content',
        icon: 'grid-3x3-gap',
        h: 'Tarjetas o botones de tipo de solicitud',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-rabbit text-success" aria-hidden="true"></i> Solicitud de animales</dt><dd>Abre el asistente de pedido animal: protocolo, especie, sexo, cantidad, fechas, justificación.</dd><dt><i class="bi bi-droplet-half text-success" aria-hidden="true"></i> Solicitud de reactivos</dt><dd>Flujo de laboratorio: catálogo o descripción libre según configuración.</dd><dt><i class="bi bi-box-seam text-success" aria-hidden="true"></i> Solicitud de insumos</dt><dd>Pedido de material de depósito o consumibles.</dd><dt><i class="bi bi-arrow-left text-success" aria-hidden="true"></i> Volver al panel</dt><dd>Regresa sin crear borrador; use si entró por error.</dd></dl>',
      },
      {
        id: 'form_pasos',
        cat: 'forms',
        icon: 'pencil-square',
        h: 'Dentro del formulario (botones habituales)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-chevron-right text-success" aria-hidden="true"></i> Siguiente / Continuar</dt><dd>Avanza entre pasos del asistente cuando el formulario es multipaso.</dd><dt><i class="bi bi-chevron-left text-success" aria-hidden="true"></i> Anterior</dt><dd>Vuelve al paso previo sin perder datos ya validados en memoria.</dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Guardar borrador</dt><dd>Almacena el trabajo incompleto para retomarlo luego desde <strong>Mis formularios</strong>.</dd><dt><i class="bi bi-send text-success" aria-hidden="true"></i> Enviar solicitud</dt><dd>Valida campos obligatorios y adjuntos; tras enviar suele mostrar <strong>mensaje de éxito</strong> con número de pedido.</dd><dt><i class="bi bi-paperclip text-success" aria-hidden="true"></i> Adjuntar archivo</dt><dd>Sube PDF u otros formatos permitidos; respete tamaño máximo indicado.</dd><dt><i class="bi bi-trash text-success" aria-hidden="true"></i> Quitar adjunto / línea</dt><dd>Elimina un archivo o una línea de detalle antes de enviar.</dd></dl>',
      },
      {
        id: 'antes',
        cat: 'forms',
        icon: 'clipboard-check',
        h: 'Antes de pulsar Enviar',
        html: '<ul class="mb-0"><li>Protocolo <strong>vigente</strong> seleccionado en el desplegable.</li><li>Cantidades dentro de <strong>límites</strong> autorizados (si el sistema valida cupos).</li><li>Campos con asterisco (*) obligatorios completos.</li></ul>',
      },
      {
        id: 'modals',
        cat: 'modals',
        icon: 'window-stack',
        h: 'Mensajes y confirmaciones',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-exclamation-circle text-success" aria-hidden="true"></i> Validación</dt><dd>Lista campos faltantes o formatos incorrectos; corrija y reintente.</dd><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Éxito</dt><dd>Confirma recepción del pedido; anote el código interno si se muestra.</dd></dl>',
      },
      {
        id: 'despues',
        cat: 'links',
        icon: 'card-list',
        h: 'Después del envío',
        html: '<p>Abra <strong>Mis formularios</strong> para ver el nuevo ítem en estado pendiente o recibido. Allí recibirá <strong>notas del administrador</strong> y posibles pedidos de subsanación.</p>',
      },
    ],
  },
  panel__misformularios: {
    overview:
      '«Mis formularios» es el archivo vivo de todo lo que usted envió: pedidos de distintos tipos en una sola lista, con estado actual y acceso al detalle. Sirve para saber si el bioterio ya procesó algo, si piden una aclaración o si falta un adjunto.\n\nUse filtros y búsqueda cuando la lista crezca. Abrir una fila muestra el hilo de ese pedido concreto; desde allí suele poder ver notas del administrador o documentos asociados.',
    summary:
      'Historial unificado de todos sus pedidos (animales, reactivos, insumos) con estado y detalle.',
    roles:
      'Cualquier usuario que haya enviado formularios.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'card-list',
        h: 'Qué es Mis formularios',
        html: '<p>Lista <strong>todos sus pedidos</strong> unificados (animales, reactivos, insumos). Cada fila es un envío; el estado lo actualiza el personal del bioterio o laboratorio.</p>',
      },
      {
        id: 'toolbar',
        cat: 'toolbar',
        icon: 'wrench-adjustable',
        h: 'Barra superior',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-arrow-clockwise text-success" aria-hidden="true"></i> Actualizar</dt><dd>Recarga la lista desde el servidor.</dd><dt><i class="bi bi-plus-lg text-success" aria-hidden="true"></i> Nueva solicitud</dt><dd>Atajo al Centro de solicitudes (si su sede lo muestra aquí).</dd><dt><i class="bi bi-download text-success" aria-hidden="true"></i> Exportar</dt><dd>Descarga Excel/PDF del listado visible cuando exista permiso.</dd></dl>',
      },
      {
        id: 'filters',
        cat: 'filters',
        icon: 'funnel',
        h: 'Filtros y búsqueda',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-search text-success" aria-hidden="true"></i> Buscador</dt><dd>Filtra por texto libre (código, protocolo, notas).</dd><dt><i class="bi bi-tag text-success" aria-hidden="true"></i> Tipo de formulario</dt><dd>Muestra solo animales, solo reactivos o solo insumos.</dd><dt><i class="bi bi-calendar-range text-success" aria-hidden="true"></i> Rango de fechas</dt><dd>Acota por fecha de envío o última actualización.</dd><dt><i class="bi bi-flag text-success" aria-hidden="true"></i> Estado</dt><dd>Pendiente, en preparación, entregado, devuelto, cancelado, etc. (nombres según su sede).</dd></dl>',
      },
      {
        id: 'table',
        cat: 'table',
        icon: 'table',
        h: 'Columnas típicas de la grilla',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-hash text-success" aria-hidden="true"></i> ID / código interno</dt><dd>Referencia única para citar el pedido en mensajes al bioterio.</dd><dt><i class="bi bi-info-circle text-success" aria-hidden="true"></i> Estado</dt><dd>Indica en qué etapa está el trámite; es la fuente de verdad operativa.</dd><dt><i class="bi bi-clock-history text-success" aria-hidden="true"></i> Fecha</dt><dd>Última modificación o fecha de solicitud.</dd><dt><i class="bi bi-eye text-success" aria-hidden="true"></i> Ver / Detalle</dt><dd>Icono o botón que abre la ficha completa del pedido.</dd></dl>',
      },
      {
        id: 'row',
        cat: 'row',
        icon: 'hand-index',
        h: 'Al abrir un pedido (detalle)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-list-ul text-success" aria-hidden="true"></i> Líneas del pedido</dt><dd>Cantidades, ítems, observaciones que usted cargó.</dd><dt><i class="bi bi-chat-left-text text-success" aria-hidden="true"></i> Notas del administrador</dt><dd>Instrucciones o pedido de corrección; responda según el canal que indique su sede.</dd><dt><i class="bi bi-file-earmark-arrow-down text-success" aria-hidden="true"></i> Descargar adjunto</dt><dd>Obtiene PDF o archivos asociados al flujo.</dd><dt><i class="bi bi-reply text-success" aria-hidden="true"></i> Subsanar / reenviar</dt><dd>Si el estado lo permite, edita y vuelve a enviar (texto del botón variable).</dd></dl>',
      },
      {
        id: 'alerta',
        cat: 'comms',
        icon: 'chat-dots',
        h: 'Si un pedido lleva mucho tiempo pendiente',
        html: '<p>Contacte por <strong>Mensajes</strong> al área correspondiente citando el <strong>código del pedido</strong>. No asuma fallo del sistema sin antes verificar estado en esta lista.</p>',
      },
    ],
  },
  panel__misalojamientos: {
    overview:
      'Si su trabajo con animales incluye estadías en el bioterio, aquí verá los alojamientos vinculados a sus protocolos: fechas, estado y la información que la sede decida mostrar al investigador.\n\nLe permite hacer seguimiento sin tener que llamar al laboratorio para cada consulta básica. El nivel de detalle (costos, ubicación exacta, etc.) depende de la configuración institucional.',
    summary:
      'Vista de los alojamientos en los que participa como investigador: fechas, protocolo y estado.',
    roles:
      'Investigadores con animales alojados o asociados a sus protocolos.',
    blocks: [
      {
        id: 'consulta',
        h: 'Consulta',
        html: '<p>Use esta lista para planificar experimentos y renovaciones. Si ve discrepancias con el bioterio, abra hilo de mensaje con referencia al código de alojamiento.</p>',
      },
      {
        id: 'lista_ficha',
        h: 'Lista y ficha del alojamiento',
        html: '<p>La tabla lista períodos o cajas vinculados a su usuario o protocolo. Un <strong>clic</strong> en la fila abre la vista detallada (fechas, especie, ubicación, observaciones del bioterio).</p><ul class="mb-0"><li>En pantallas estrechas puede hacer falta desplazamiento horizontal para ver todas las columnas.</li><li>Si el estado no coincide con el animalario, use <strong>Mensajes</strong> citando el código o ID visible en la grilla.</li></ul>',
      },
    ],
  },
  panel__misreservas: {
    overview:
      'Aquí se listan las reservas que usted tiene a su nombre: salas, equipos u otros recursos compartidos según lo que su sede gestione en GROBO. Puede revisar horarios, estado (confirmada, pendiente, cancelada) y las reglas de uso que aplique su institución.\n\nSi necesita cambiar o anular una reserva, hágalo desde esta vista cuando exista el botón correspondiente; en algunos casos el bioterio debe aprobar el cambio.',
    summary:
      'Reservas propias de salas o equipos: horarios, estado y políticas de cancelación.',
    roles:
      'Usuarios con permiso de reserva.',
    blocks: [
      {
        id: 'gestion',
        h: 'Gestión',
        html: '<ul class="mb-0"><li>Cancele con antelación según reglas de su sede para liberar franja.</li><li>Si necesita serie de reservas recurrentes, verifique si la interfaz lo permite o debe pedirlo a administración.</li></ul>',
      },
    ],
  },
  panel__misprotocolos: {
    overview:
      'Esta sección concentra los protocolos en los que usted participa: vigencia, datos esenciales y, a menudo, la posibilidad de cambiar de vista (solo los suyos, los de la sede o los de red si aplica).\n\nAntes de hacer un pedido nuevo conviene comprobar aquí que el protocolo sigue vigente y autoriza lo que necesita. Las acciones de trámite (alta de protocolo nuevo) pueden estar en otro ítem del menú según su sede.',
    summary:
      'Protocolos en los que figura como miembro: consulta de vigencia, datos clave y base para nuevos pedidos.',
    roles:
      'Investigadores y colaboradores según asignación en cada protocolo.',
    blocks: [
      {
        id: 'consulta',
        h: 'Qué revisar siempre',
        html: '<ul class="mb-0"><li>Fechas de inicio y fin de autorización.</li><li>Especies y procedimientos permitidos.</li><li>Roles dentro del protocolo (titular, co-investigador).</li></ul>',
      },
      {
        id: 'solicitud',
        h: 'Renovaciones y cambios',
        html: '<p>Si necesita ampliar vigencia o modificar alcance, el camino administrativo suele ser <strong>Solicitud de protocolo</strong> (desde su perfil o enlace que habilite la sede), no un pedido de animales suelto.</p><ul class="mb-0"><li>Mientras el trámite esté pendiente, puede haber restricciones nuevos pedidos: consulte a secretaría del comité o bioterio.</li></ul>',
      },
      {
        id: 'vinculo',
        h: 'Vínculo con RED',
        html: '<p>En instituciones multi-sede, el protocolo puede tener ámbito definido por su administración. Los pedidos deben hacerse contra la sede que corresponda según reglas internas.</p>',
      },
    ],
  },
  admin__precios: {
    overview:
      'Aquí se administran las tarifas y listas de precios que luego alimentan presupuestos o facturación de servicios del bioterio. Los cambios pueden impactar en informes y en lo que ve el investigador si hay vistas de costos.\n\nCoordine con contabilidad o dirección antes de modificar estructuras de precio. La interfaz exacta depende de la versión desplegada en su sede.',
    summary:
      'Mantenimiento de tarifas y listas de precios usadas en facturación o presupuestos de servicios del bioterio.',
    roles:
      'Administración financiera o bioterio según delegación.',
    blocks: [
      {
        id: 'cambios',
        h: 'Cambios de precio',
        html: '<p>Versionado y fechas efectivas: un cambio mal fechado puede desfasar facturas ya generadas. Coordine con <strong>Historial contable</strong> y reportes abiertos.</p>',
      },
    ],
  },
  admin__facturacion__index: {
    overview:
      'El área de facturación agrupa informes y vistas para cruzar consumos del bioterio con departamentos, investigadores, protocolos u otras dimensiones que su sede utilice.\n\nNo sustituye al sistema contable principal de la institución, pero concentra lo necesario para conciliar cargos y servicios vinculados a GROBO. Desde esta pantalla elige el corte (tarjetas); en la biblioteca de capacitación, cada corte tiene además su propio tema en la lista de la izquierda.',
    summary:
      'Hub de facturación: acceso a liquidaciones por departamento, investigador, protocolo, institución (RED) u organización.',
    roles:
      'Personal con módulo de facturación habilitado.',
    blocks: [
      {
        id: 'lista_manual',
        h: 'Guías en el manual (lista izquierda)',
        html: '<p>Si tiene permisos de facturación, en <strong>Capacitación</strong> verá entradas separadas para <strong>Facturación por departamento / investigador / protocolo / institución / organización</strong>, además de este <strong>Centro de facturación</strong>. Úselas cuando esté en esa subpantalla o quiera leer solo ese flujo.</p>',
      },
      {
        id: 'subvistas',
        h: 'Qué hace cada tarjeta del hub',
        html: '<ul class="mb-0"><li><strong>Por departamento:</strong> liquidación y tablas agrupadas por unidad.</li><li><strong>Por investigador:</strong> deuda y saldos por persona (titular / solicitante según pantalla).</li><li><strong>Por protocolo:</strong> costos asociados a cada protocolo.</li><li><strong>Por institución:</strong> solo si su sede tiene derivación RED; pagos cruzados con saldo de titular.</li><li><strong>Por organización:</strong> visión agregada por organización cuando aplique.</li></ul>',
      },
      {
        id: 'pdf',
        h: 'PDF, Excel y ayuda en pantalla',
        html: '<p>En cada subvista suelen existir botones de <strong>PDF</strong> y/o <strong>Excel</strong> y un botón de <strong>Ayuda</strong> que abre un modal propio de esa pantalla. El detalle de <strong>ventanas emergentes</strong> de cobro (animal, reactivo, insumo, alojamiento) está en el tema <strong>Ventanas emergentes (modales)</strong> del manual.</p>',
      },
    ],
  },
  admin__facturacion__depto: {
    overview:
      'Liquidación por departamento concentra los consumos facturables del bioterio filtrados por la unidad académica o administrativa seleccionada: animales, alojamientos, insumos y, según filtros, reactivos.\n\nSirve para informar a decanatos o centros de costo y para generar documentos de respaldo antes de pasar asientos al sistema contable externo.',
    summary:
      'Informes y tabla maestra por departamento; filtros de ámbito; exportaciones; filas que abren modales de detalle y cobro.',
    roles:
      'Quienes tengan acceso al módulo de facturación.',
    blocks: [
      {
        id: 'filtros',
        h: 'Filtros y consulta',
        html: '<ul class="mb-0"><li><strong>Ámbito / departamento:</strong> debe elegir departamento (y filtros de tipo de consumo) antes de cargar datos; el sistema avisa si falta algún filtro obligatorio.</li><li>Active al menos un eje (p. ej. animales, alojamiento o insumos) según lo que deba facturar en esa corrida.</li></ul>',
      },
      {
        id: 'tabla_modal',
        h: 'Tabla y filas clicables',
        html: '<p>Tras la consulta, cada fila representa un ítem facturable. Al pulsar la fila (evitando inputs) se abre el <strong>modal</strong> correspondiente: animal, reactivo, insumo o alojamiento, con importes y acciones de pago. Eso permite ver ficha completa y registrar pagos o ajustes sin salir del informe.</p>',
      },
      {
        id: 'export',
        h: 'PDF global y Excel',
        html: '<p>Los botones superiores generan exportaciones del <strong>reporte ya cargado</strong>. Si no hubo consulta previa, el sistema lo indicará. Use PDF para archivo y Excel para análisis en hoja de cálculo.</p>',
      },
    ],
  },
  admin__facturacion__investigador: {
    overview:
      'La vista por investigador ordena la deuda y los consumos en torno a la persona: útil para cargar saldos, cobrar proyectos o devolver costos a fondos vinculados a ese investigador.\n\nEl titular del protocolo suele ser quien “paga” en el sentido contable del modal, aunque otro usuario haya sido solicitante del pedido.',
    summary:
      'Selección de investigador, reporte de posiciones, modales de detalle y mismas piezas de cobro que en otros cortes.',
    roles:
      'Personal de facturación o administración con el módulo habilitado.',
    blocks: [
      {
        id: 'seleccion',
        h: 'Selección y carga',
        html: '<p>Debe elegir un <strong>investigador</strong> de la lista antes de ejecutar la consulta. Sin esa elección no se cargan datos.</p>',
      },
      {
        id: 'cobros',
        h: 'Cobros desde la grilla',
        html: '<p>Al igual que en departamento, las filas abren modales con <strong>costo total</strong>, <strong>pagado</strong>, <strong>saldo del titular</strong> y botones <strong>PAGAR</strong> / <strong>QUITAR</strong>. El manual del tema <strong>Ventanas emergentes</strong> describe cada campo.</p>',
      },
    ],
  },
  admin__facturacion__protocolo: {
    overview:
      'La facturación por protocolo alinea gastos con cada proyecto ético-aprobado: sirve para reportes a comités, subsidios o auditorías donde el protocolo es el eje contable.\n\nLos modales de línea son los mismos tipos (animal, reactivo, insumo, alojamiento) que en las otras vistas; cambia el filtro y la agrupación visual.',
    summary:
      'Elegir protocolo, generar informe, abrir modales por ítem y exportar.',
    roles:
      'Facturación / administración con módulo activo.',
    blocks: [
      {
        id: 'protocolo',
        h: 'Consulta por protocolo',
        html: '<p>Seleccione un <strong>protocolo</strong> y ejecute la búsqueda. Sin protocolo no hay datos.</p>',
      },
      {
        id: 'coherencia',
        h: 'Coherencia con otras vistas',
        html: '<p>Un mismo pedido puede verse en departamento, investigador o protocolo; los importes deben coincidir. Si observa diferencias, revise filtros de fecha y ámbito antes de reportar un error.</p>',
      },
    ],
  },
  admin__facturacion__institucion: {
    overview:
      'La facturación por institución aparece cuando la sede participa en una RED con instituciones destino: permite consolidar o pagar ítems que involucran derivación entre sedes.\n\nIncluye lógica de saldo del titular y selección de ítems para pagar en bloque cuando la interfaz lo ofrezca.',
    summary:
      'Reporte institucional RED, saldos, apertura de modales por tipo y pagos con confirmación.',
    roles:
      'Solo perfiles con facturación; la tarjeta del hub puede ocultarse si no hay red configurada.',
    blocks: [
      {
        id: 'red',
        h: 'Visibilidad y RED',
        html: '<p>Si no ve la opción en el hub, su institución no tiene configurada derivación a otras sedes: no es un fallo de permisos sueltos.</p>',
      },
      {
        id: 'pago',
        h: 'Pagos e investigador',
        html: '<p>Algunas acciones masivas exigen que cada ítem tenga <strong>investigador</strong> asociado. Si el sistema advierte que falta, recargue el reporte. Los modales individuales siguen el mismo esquema cabecera / cuerpo / pie descrito en el tema de ventanas emergentes.</p>',
      },
    ],
  },
  admin__facturacion__org: {
    overview:
      'La vista por organización agrega consumos según la organización vinculada (empresa, fundación, unidad externa, etc., según datos cargados en su sede).\n\nEs útil para facturación B2B o informes ejecutivos donde el cliente no es un departamento interno sino una organización.',
    summary:
      'Filtros de consumo, tabla agregada, mismas herramientas de exportación y modales de línea.',
    roles:
      'Facturación habilitada.',
    blocks: [
      {
        id: 'filtros_org',
        h: 'Filtros',
        html: '<p>Mantenga al menos un tipo de consumo activo (animales, alojamiento, insumos) como en departamento; el sistema validará antes de consultar.</p>',
      },
      {
        id: 'uso',
        h: 'Uso típico',
        html: '<p>Genere el informe, revise totales por organización y use PDF/Excel para enviar al área financiera o al cliente externo según procedimiento interno.</p>',
      },
    ],
  },
  admin__historialcontable: {
    overview:
      'El historial contable documenta movimientos y ajustes relacionados con la facturación del bioterio dentro de GROBO: útil para auditoría y para entender correcciones aplicadas con el tiempo.\n\nQuién puede verlo y con qué detalle depende del rol. Si necesita un extracto oficial, combine esta consulta con los procedimientos de su área financiera.',
    summary:
      'Registro de movimientos y correcciones contables asociadas al bioterio.',
    roles:
      'Finanzas o administración con auditoría.',
    blocks: [
      {
        id: 'auditoria',
        h: 'Uso para auditoría',
        html: '<p>Utilice filtros por fecha, usuario o tipo de movimiento. No borre evidencias fuera de los procedimientos aprobados; prefiera asientos reversivos si el sistema lo permite.</p>',
      },
    ],
  },
  panel__mensajes: {
    overview:
      'Mensajes es el buzón para conversar con otras personas dentro de GROBO: cada hilo agrupa un asunto y las respuestas, de forma parecida a un correo interno.\n\nÚselo para coordinar detalles de pedidos, aclarar documentación o cualquier comunicación directa que no sea un aviso institucional masivo. Si su rol es muy restrictivo, puede que solo pueda escribir a ciertos destinatarios (por ejemplo el buzón de la sede): eso lo define su administración, no un fallo del programa.',
    summary:
      'Mensajería personal entre usuarios de la plataforma (conversaciones 1:1 o por hilo).',
    roles:
      'Todos los perfiles con el módulo de mensajes activo.',
    blocks: [
      {
        id: 'hilo',
        h: 'Crear y seguir hilos',
        html: '<ul class="mb-0"><li>Elija destinatario y un asunto claro (p. ej. “Pedido A-1234 — consulta entrega”).</li><li>Mantenga un solo hilo por tema para no perder contexto.</li><li>Compruebe si recibe avisos por correo según su configuración de perfil.</li></ul>',
      },
    ],
  },
  panel__mensajes_institucion: {
    overview:
      'La mensajería institucional es el canal oficial de la sede: comunicados que pueden ver muchas personas, consultas al “buzón” de la institución o mensajes de gestión que no son charlas privadas entre dos usuarios.\n\nSegún su rol verá opciones distintas (por ejemplo crear un comunicado o solo hacer una consulta). Las conversaciones uno a uno con personas concretas siguen en «Mensajes».',
    summary:
      'Canal institucional para comunicación formal entre sedes o broadcast interno, distinto del chat personal.',
    roles:
      'Quienes tengan el módulo; a menudo administradores envían y todos leen.',
    blocks: [
      {
        id: 'red',
        h: 'Mensajes y RED',
        html: '<p>En redes multi-sede, puede usarse para anuncios de una sede a usuarios vinculados o para comunicación oficial. Priorice mensajes breves y enlaces a noticias o documentos en repositorio institucional.</p>',
      },
    ],
  },
  admin__comunicacion__noticias: {
    overview:
      'Desde administración de noticias se redactan y publican los avisos que luego leen investigadores y personal en el portal de noticias: cierres, convocatorias, recordatorios, etc.\n\nPuede definirse alcance (solo sede o también otras sedes de la misma red), fechas de publicación y borradores. No sustituye a la mensajería interna: es contenido pensado para lectura amplia.',
    summary:
      'Publicación y mantenimiento de noticias del portal (avisos, cierres, convocatorias).',
    roles:
      'Comunicación institucional o administración.',
    blocks: [
      {
        id: 'publicar',
        h: 'Publicar con criterio',
        html: '<ul class="mb-0"><li>Fechas de vigencia visibles para que avisos viejos no confundan.</li><li>Tono institucional y datos de contacto ante dudas.</li><li>Revise ortografía y enlaces rotos antes de publicar.</li></ul>',
      },
    ],
  },
  panel__noticias: {
    overview:
      'El portal de noticias es el tablón institucional: avisos oficiales, novedades de la sede y, si aplica, noticias compartidas con otras sedes de su misma red.\n\nPuede filtrar por alcance, buscar por texto y abrir cada tarjeta para leer el texto completo. Para incidencias técnicas o problemas con el sistema use «Ayuda → Ticket/Contacto», no este tablón.',
    summary:
      'Lectura del tablón de noticias para investigadores y personal.',
    roles:
      'Cualquier usuario con acceso al portal de noticias.',
    blocks: [
      {
        id: 'lectura',
        h: 'Cómo usarlo',
        html: '<p>Consulte periódicamente; algunas convocatorias o cortes de servicio solo se anuncian aquí. Puede convivir con correo: no asuma duplicación automática.</p>',
      },
    ],
  },
  panel__perfil: {
    overview:
      'Mi perfil es donde actualiza sus datos personales (nombre, correo, teléfono) y su contraseña. El correo es especialmente importante: allí suelen llegar notificaciones y recuperación de acceso.\n\nEn la misma área de la aplicación pueden aparecer preferencias de interfaz (tamaño de letra, tema claro u oscuro, idioma, accesibilidad) según lo que su versión de GROBO incluya. Los apartados detallados de abajo recorren botón por botón lo que usted pueda ver en pantalla; no todos los usuarios tienen las mismas funciones activas.',
    summary:
      'Guía extensa: qué es la pantalla Mi perfil frente a la barra de preferencias; cada botón (voz, letra, tema claro/oscuro, idioma, atajos, menú superior/lateral) explicado por separado; cómo se guardan datos en servidor; y Gecko Search (píldora, teclado, búsqueda, IA y comandos por voz).',
    roles:
      'Todos los usuarios autenticados.',
    blocks: [
      {
        id: 'intro',
        cat: 'navigation',
        icon: 'person-badge',
        h: 'Qué es el perfil y qué son las preferencias globales',
        html: '<p class="mb-2"><strong>Mi perfil</strong> (esta ruta del menú) es el lugar donde usted cuida la información que lo identifica: correo, teléfono, datos de contacto, y a menudo la <strong>contraseña</strong> y una <strong>foto</strong>. Eso sirve para que el sistema sepa a quién notificar, cómo recuperar el acceso si olvida la clave, y para que otros módulos (por ejemplo Ventas o Soporte) usen un correo válido.</p><p class="mb-2">Las <strong>preferencias de interfaz</strong> son otra cosa: son decisiones sobre <em>cómo se ve y se comporta</em> el programa para usted—idioma, colores (claro u oscuro), tamaño de letras, si el menú va arriba o al costado, y si desea usar el asistente por voz. La mayoría de esos controles <strong>no están solo</strong> en Mi perfil: están en la <strong>barra de iconos redondos</strong> que aparece junto al menú principal, porque así puede cambiarlas desde cualquier pantalla sin ir al perfil.</p><p class="mb-2"><strong>Por qué a veces la página se recarga sola:</strong> al cambiar el <strong>idioma</strong> o el <strong>diseño del menú</strong> (superior ↔ lateral), la aplicación suele <strong>recargar por completo</strong>. No es un fallo: hace falta para que todos los textos, el menú y los estilos se generen otra vez de forma coherente en el nuevo idioma o layout.</p><p class="mb-0 small text-muted">Cuando su sesión e institución lo permiten, esas preferencias también se guardan en el servidor (API <code>/user/config/update</code>) y se vuelven a leer al iniciar sesión (<code>/user/config/get</code>: tema, idioma, tamaño de letra, menú preferido, micrófono). Si algo no “recuerda” su elección, verifique que guardó sesión y que no usa un perfil restringido sin institución.</p>',
      },
      {
        id: 'barra_contexto',
        cat: 'toolbar',
        icon: 'layout-sidebar',
        h: 'Dónde está la barra y en qué orden aparecen los botones',
        html: '<p class="mb-2">La <strong>barra de preferencias</strong> es una franja de controles integrada en el <strong>mismo componente de menú</strong> que usa la aplicación. Visualmente la reconocerá como una <strong>línea de iconos circulares</strong> (micrófono, letra, sol/luna, bandera, teclado, diseño) separada del resto de enlaces del menú por un <strong>borde o espacio</strong> sutil.</p><p class="mb-2"><strong>Menú superior (horizontal):</strong> los iconos suelen alinearse a la <strong>derecha</strong> de la barra superior, después de los accesos a módulos (Dashboard, Protocolos, etc.). El <strong>buscador Gecko</strong> (la píldora alargada) suele estar en la zona central o cercana; los botones redondos quedan agrupados al final de esa barra.</p><p class="mb-2"><strong>Menú lateral (vertical):</strong> los mismos controles se redistribuyen: a menudo en <strong>fila o bloque</strong> dentro del panel lateral, con botones algo <strong>más grandes</strong> para poder pulsarse con comodidad. La <strong>bandera de idioma</strong> abre el menú hacia arriba o hacia un lado según el espacio disponible.</p><p class="mb-2"><strong>Orden habitual de izquierda a derecha</strong> en la agrupación de iconos (puede variar levemente por versión): (1) micrófono, (2) tamaño de letra, (3) tema claro/oscuro, (4) selector de idioma con bandera, (5) ayuda de atajos de teclado, (6) cambio de diseño menú superior/lateral.</p><p class="mb-0 small text-muted"><strong>Pantallas pequeñas:</strong> los botones de <strong>atajos de teclado</strong> y de <strong>cambio de diseño del menú</strong> pueden ocultarse en móviles estrechos (clases responsivas del front). Si no los ve, pruebe en tablet u ordenador o use <kbd>Ctrl</kbd>+<kbd>G</kbd> para el buscador y los atajos documentados en la ayuda cuando el botón esté visible.</p>',
      },
      {
        id: 'ctrl_microfono',
        cat: 'toolbar',
        icon: 'mic-fill',
        h: 'Botón del micrófono (Gecko Voice): qué hace y cuándo usarlo',
        html: '<p class="mb-2"><strong>Qué es este botón:</strong> es el interruptor principal del <strong>asistente de voz</strong> integrado en el navegador. El icono representa un <strong>micrófono</strong>. No graba archivos para enviarlos por correo: activa la API de <strong>reconocimiento de voz del propio navegador</strong> (cuando existe).</p><p class="mb-2"><strong>Qué ocurre al pulsarlo la primera vez:</strong> el navegador mostrará un cuadro pidiendo <strong>permiso para usar el micrófono</strong>. Debe aceptar si desea hablar con el sistema. Si bloquea el permiso, el reconocimiento no funcionará hasta que cambie la configuración del sitio en el navegador.</p><p class="mb-2"><strong>Cómo interpretar el color / estado:</strong> cuando el micrófono está <strong>activo y escuchando</strong>, el estilo visual suele pasar a tonos <strong>verdes</strong> (clase <code>voice-status-1</code> en el front). Cuando está <strong>apagado</strong>, el aspecto es más neutro o <strong>gris</strong> (<code>voice-status-2</code>). Use el botón para encender solo cuando vaya a usar voz; así reduce ruido y consumo.</p><p class="mb-2"><strong>Relación con “Gecko” y el buscador:</strong> con el micrófono encendido, el motor escucha la <strong>palabra de activación</strong> (p. ej. “Gecko”); al reconocerla, puede abrir el <strong>panel de búsqueda</strong> y pasar a modo comando. Los detalles del flujo están en el apartado “Gecko: voz e IA”.</p><p class="mb-2"><strong>Navegadores:</strong> <strong>Mozilla Firefox</strong> no implementa la API estándar que usa el producto: verá un aviso de <strong>navegador no compatible</strong>. Use <strong>Chrome, Edge u otro basado en Chromium</strong> para voz, o trabaje solo con teclado y ratón.</p><p class="mb-0 small text-muted"><strong>Atajo:</strong> <kbd>Alt</kbd>+<kbd>V</kbd> hace clic programático en este botón cuando los atajos globales están activos y el foco no está capturado por otro gesto.</p>',
      },
      {
        id: 'ctrl_tamano_letra',
        cat: 'toolbar',
        icon: 'type',
        h: 'Botón de tamaño de letra: los tres niveles y qué cambia en pantalla',
        html: '<p class="mb-2"><strong>Qué es:</strong> un botón que no abre menús: cada vez que lo pulsa, la aplicación pasa al <strong>siguiente tamaño de tipografía</strong> en un ciclo de tres pasos. Sirve para quien necesita leer más grande (accesibilidad) o más compacto (más datos en pantalla).</p><p class="mb-2"><strong>Los tres tamaños (orden del ciclo):</strong> <strong>chica</strong> → <strong>mediana</strong> → <strong>grande</strong> → vuelve a chica. Internamente el valor queda guardado en un atributo <code>data-font-size</code> en el elemento raíz del documento (<code>&lt;html&gt;</code>), y las hojas de estilo del producto escalan márgenes, tablas y textos en consecuencia.</p><p class="mb-2"><strong>Qué notará usted:</strong> títulos, celdas de tablas, textos de formularios y menús crecerán o se reducirán de forma <strong>uniforme</strong> en toda la sesión. No cambia el <strong>zoom</strong> del navegador (Ctrl+rueda): solo la escala tipográfica que define la aplicación.</p><p class="mb-2"><strong>Persistencia:</strong> el tamaño elegido se puede sincronizar con su usuario en servidor (junto al resto de preferencias) para que al volver a entrar recupere el mismo nivel.</p><p class="mb-0 small text-muted"><strong>Consejo:</strong> si tras cambiar el tamaño algo se ve cortado, pruebe también el <strong>tema claro</strong> o amplíe la ventana; algunos módulos tienen tablas anchas que requieren scroll horizontal.</p>',
      },
      {
        id: 'ctrl_tema',
        cat: 'toolbar',
        icon: 'brightness-high',
        h: 'Botón de tema: modo claro (light) y modo oscuro (dark)',
        html: '<p class="mb-2"><strong>Qué es el “tema”:</strong> es el <strong>esquema de colores global</strong> de la interfaz. El <strong>modo claro</strong> (light) usa fondos blancos o grises muy claros y texto oscuro, similar a un documento impreso. El <strong>modo oscuro</strong> (dark) invierte la lógica: fondos oscuros y texto claro, pensado para reducir fatiga visual con poca luz ambiental.</p><p class="mb-2"><strong>Qué hace el botón:</strong> al pulsarlo, la aplicación conmuta entre ambos modos. Técnicamente se actualiza el atributo <code>data-bs-theme</code> en la raíz del documento, que es el mecanismo que usa <strong>Bootstrap 5</strong> para aplicar variables de color coherentes en botones, tarjetas, menús y modales.</p><p class="mb-2"><strong>El icono sol / luna:</strong> el propio botón muestra un símbolo que indica el modo <em>hacia el que puede cambiar</em> o el activo según versión; lo importante es que un mismo control centraliza el cambio—no hace falta buscar la opción dentro de Mi perfil si ya está en la barra.</p><p class="mb-2"><strong>Para quién es útil:</strong> usuarios que trabajan muchas horas seguidas, pantallas con brillo alto, o políticas de accesibilidad que recomiendan alto contraste. Puede combinar tema oscuro con <strong>letra grande</strong>.</p><p class="mb-0 small text-muted">El tema se guarda como preferencia de usuario cuando el backend lo acepta, para no tener que reconfigurarlo en cada equipo.</p>',
      },
      {
        id: 'ctrl_idioma',
        cat: 'toolbar',
        icon: 'flag',
        h: 'Selector de idioma (bandera): Español, English y Português',
        html: '<p class="mb-2"><strong>Qué es:</strong> un botón circular que muestra la <strong>bandera del idioma actual</strong> (España, EE. UU. o Brasil según el locale). Al hacer clic <strong>no cambia el idioma al instante dentro del mismo menú desplegable</strong>: abre una <strong>lista de tres opciones</strong> con bandera y nombre del idioma.</p><p class="mb-2"><strong>Las tres opciones y qué significan:</strong> <strong>Español</strong> (etiquetas y mensajes en castellano), <strong>English</strong> (interfaz en inglés), <strong>Português</strong> (interfaz en portugués de Brasil en la implementación actual). El reconocimiento de voz del asistente también alinea el <strong>acento del motor de voz</strong> con el idioma elegido (p. ej. español de España, inglés de EE. UU., portugués de Brasil).</p><p class="mb-2"><strong>Qué ocurre al elegir una opción:</strong> la función <code>setAppLang</code> guarda el código (<code>es</code>, <code>en</code>, <code>pt</code>) en almacenamiento local y en servidor cuando corresponde, y luego la página se <strong>recarga</strong>. Hasta que no termine la recarga no verá todos los textos nuevos.</p><p class="mb-2"><strong>Dónde cae el menú:</strong> con menú superior, el desplegable suele abrirse <strong>hacia abajo</strong> alineado a la derecha del botón. Con menú lateral, puede abrirse <strong>hacia arriba</strong> para no quedar fuera de la pantalla.</p><p class="mb-0 small text-muted">Si comparte equipo, recuerde que el idioma queda asociado a su sesión y preferencias guardadas, no solo al navegador anónimo.</p>',
      },
      {
        id: 'ctrl_atajos',
        cat: 'toolbar',
        icon: 'keyboard',
        h: 'Botón de atajos de teclado: qué lista muestra y qué hace cada atajo principal',
        html: '<p class="mb-2"><strong>Qué es:</strong> un botón con icono de <strong>teclado</strong> que abre una ventana o panel de ayuda con la <strong>tabla de atajos</strong> definidos por el producto. Sirve como “chuleta” para no memorizar combinaciones.</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd> — Abrir o cerrar Gecko Search (IA):</strong> conmuta el gran panel de búsqueda. Es <strong>global</strong>: se procesa incluso si el cursor está dentro de un campo de texto. Úselo para buscar rápido o lanzar comandos sin ir al ratón a la píldora.</p><p class="mb-2"><strong><kbd>Esc</kbd> — Cerrar:</strong> cierra el buscador Gecko si está abierto, u otros modales según qué tenga el foco delante.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>K</kbd> — Esta ayuda de atajos:</strong> equivale a pulsar el botón del teclado (cuando está visible y los atajos no están bloqueados por un campo que consuma todas las teclas).</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>D</kbd> — Ir al panel principal (Dashboard):</strong> redirige al tablero que corresponda a su rol (administración o panel de investigador según nivel).</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>V</kbd> — Micrófono:</strong> activa o desactiva el mismo interruptor que el botón redondo del micrófono.</p><p class="mb-2"><strong>Otros atajos <kbd>Alt</kbd> + letra (comportamiento del código):</strong> <kbd>Alt</kbd>+<kbd>F</kbd> abre la ruta de <strong>formularios</strong> del segmento que le toque (panel o admin); <kbd>Alt</kbd>+<kbd>Q</kbd> abre <strong>Mis formularios</strong>; <kbd>Alt</kbd>+<kbd>P</kbd> → <strong>Mis protocolos</strong>; <kbd>Alt</kbd>+<kbd>A</kbd> → <strong>Mis alojamientos</strong>. Los administradores tienen además <kbd>Alt</kbd>+<kbd>X</kbd> luego <kbd>P</kbd> o <kbd>A</kbd> hacia protocolos y alojamientos de administración. La ventana de ayuda del teclado puede mostrar textos distintos en un ítem puntual (p. ej. etiqueta de <kbd>Alt</kbd>+<kbd>Q</kbd>); si algo no coincide, priorice la ruta que abre realmente al pulsar la tecla.</p><p class="mb-2"><strong><kbd>Alt</kbd> + <kbd>Q</kbd> + <kbd>S</kbd> (secuencia) — Cerrar sesión:</strong> dispara el cierre de sesión sin pasar por menús.</p><p class="mb-0 small text-muted">En pantallas &lt; md el botón físico del teclado puede estar oculto; los atajos siguen activos si el gestor de teclado está inicializado.</p>',
      },
      {
        id: 'ctrl_layout_menu',
        cat: 'toolbar',
        icon: 'layout-sidebar-reverse',
        h: 'Botón de diseño del menú: barra superior frente a menú lateral',
        html: '<p class="mb-2"><strong>Qué es:</strong> conmuta entre dos formas de mostrar la navegación principal. En un modo el menú es una <strong>franja horizontal</strong> arriba de todo (estilo “web clásica”). En el otro, los enlaces viven en una <strong>columna lateral</strong> que suele ocupar la izquierda (estilo “panel de aplicación”).</p><p class="mb-2"><strong>Qué ocurre al pulsarlo:</strong> el sistema guarda la preferencia (<code>menu_top</code> frente a <code>menu_lateral</code> o equivalente interno) y <strong>recarga la página</strong>. Tras la recarga verá el mismo contenido pero con el armazón de navegación distinto. Los iconos de preferencias (micrófono, tema, etc.) se <strong>redibujan</strong> adaptados al nuevo layout.</p><p class="mb-2"><strong>Cuándo elegir cada uno:</strong> el menú superior aprovecha bien pantallas anchas y muchos módulos visibles de un vistazo. El lateral suele gustar en portátiles o cuando se prefiere jerarquía vertical y más espacio central para tablas.</p><p class="mb-0 small text-muted">Este botón puede ocultarse en móviles; si no lo ve, use ancho de ventana mayor o cambie de dispositivo.</p>',
      },
      {
        id: 'prefs_servidor',
        cat: 'toolbar',
        icon: 'cloud-arrow-down',
        h: 'Cómo se guardan y recuperan las preferencias en el servidor',
        html: '<p class="mb-2"><strong>Por qué importa:</strong> si solo se guardara en el navegador, al cambiar de ordenador o limpiar datos perdería tema, idioma, tamaño de letra, etc. El producto intenta <strong>unificar</strong> esas opciones con su cuenta.</p><p class="mb-2"><strong>Al guardar cambios:</strong> cuando corresponde, el front envía un cuerpo JSON a <code>POST /user/config/update</code> con campos como <code>theme</code>, <code>lang</code>, tamaño de fuente, <code>menu_preferido</code> y estado del micrófono. No todos los campos se envían en cada clic; cada control dispara lo que necesita.</p><p class="mb-2"><strong>Al iniciar sesión:</strong> tras autenticarse, si aplica su tipo de usuario, se llama a <code>GET /user/config/get</code> y se aplican valores almacenados (p. ej. <code>idioma_preferido</code>) antes de que interactúe.</p><p class="mb-2"><strong>Excepciones:</strong> ciertos roles “maestros” sin institución pueden seguir un flujo donde no se sincroniza igual; en ese caso prevalece lo guardado en <strong>localStorage</strong> del navegador.</p><p class="mb-0 small text-muted">Si dos pestañas están abiertas y cambia preferencias en una, la otra puede mostrar estado antiguo hasta recargar.</p>',
      },
      {
        id: 'gecko_buscar',
        cat: 'content',
        icon: 'search',
        h: 'Gecko Search: la píldora, el panel y la búsqueda por texto',
        html: '<p class="mb-2"><strong>Qué es Gecko Search:</strong> es el <strong>buscador unificado</strong> de la aplicación: un solo lugar para escribir consultas sobre datos que el motor de búsqueda del front puede resolver, y para encadenar con la <strong>IA</strong> cuando el texto se procesa como comando (ver apartado de voz e IA).</p><p class="mb-2"><strong>La píldora (elemento disparador):</strong> en la interfaz verá una forma alargada redondeada con icono de lupa y a menudo un texto guía del estilo “Escribe un comando o di Gecko…”. Ese elemento es el <code>gecko-search-trigger</code>. <strong>Hacer clic</strong> en él abre el panel grande. En modo menú lateral la píldora puede mostrarse como <strong>flotante</strong> centrada arriba; en menú superior suele ser <strong>estática</strong> en la barra.</p><p class="mb-2"><strong>El panel (overlay):</strong> al abrirse, aparece una <strong>capa semitransparente</strong> que cubre el resto de la página (<code>gecko-omni-overlay</code>) y un <strong>cuadro central</strong> que “crece” desde la píldora con una animación. El scroll del fondo se bloquea para que se centre la atención en la búsqueda.</p><p class="mb-2"><strong>Cabecera del cuadro:</strong> contiene el <strong>campo de texto</strong> principal (<code>gecko-omni-input</code>) y el botón de <strong>micrófono</strong> propio del panel (<code>gecko-omni-voice-btn</code>). El placeholder le recuerda que puede escribir o usar voz.</p><p class="mb-2"><strong>Zona de resultados:</strong> debajo se lista el área <code>gecko-omni-results</code>. Mientras escribe, el código dispara búsquedas incrementales y va pintando coincidencias. Si no hay nada que mostrar, verá un estado vacío amigable (mensaje centrado con icono de lupa).</p><p class="mb-2"><strong><kbd>Ctrl</kbd> + <kbd>G</kbd>:</strong> abre o cierra este mismo panel desde cualquier sitio, con prioridad sobre otros manejadores de teclado, incluso si está escribiendo en un input.</p><p class="mb-2"><strong><kbd>Esc</kbd>:</strong> cierra el overlay y devuelve el foco a la página; la caja vuelve a animarse hacia la píldora.</p><p class="mb-2"><strong>Micrófono dentro del panel:</strong> alterna escucha sin tener que volver al botón de la barra; está enlazado al mismo subsistema Gecko Voice (enciende o apaga el modo escucha coordinado).</p><p class="mb-2"><strong>Navegación por teclado en resultados:</strong> con el foco en el campo de búsqueda, las teclas <kbd>↓</kbd> y <kbd>↑</kbd> mueven un resaltado entre las filas de resultados (el cursor de texto no salta de línea: el evento se intercepta). El elemento activo recibe estilo verde y hace <code>scrollIntoView</code> suave.</p><p class="mb-2"><strong>Tecla <kbd>Enter</kbd>:</strong> si había bajado con flechas y hay un ítem seleccionado, <kbd>Enter</kbd> equivale a <strong>hacer clic</strong> en ese resultado (navega si es un enlace). Si <strong>no</strong> hay selección en lista pero el cuadro de texto <strong>no está vacío</strong>, <kbd>Enter</kbd> envía el texto completo a la <strong>IA</strong> (mismo flujo que la voz tras terminar la frase): verá un indicador de carga “Consultando a GROBO IA…” mientras el servidor responde.</p><p class="mb-0 small text-muted"><strong>Mensajes de IA:</strong> cuando la IA devuelve texto explicativo, puede mostrarse en el área reservada (<code>gecko-ai-message</code>) además de en los resultados.</p>',
      },
      {
        id: 'gecko_voz_ia',
        cat: 'modals',
        icon: 'robot',
        h: 'Gecko: escucha continua, palabra de activación, envío a la IA y tipos de respuesta',
        html: '<p class="mb-2"><strong>Visión general:</strong> el flujo de voz tiene dos capas: (1) el <strong>navegador</strong> convierte su audio en texto (reconocimiento), (2) el <strong>servidor</strong> interpreta ese texto con un modelo o reglas (<code>POST /ia/procesar</code>) y devuelve una <strong>acción estructurada</strong> (navegar, buscar, manipular la página, hablar).</p><p class="mb-2"><strong>Paso 1 — Encender el micrófono en la barra:</strong> pulse el botón del micrófono hasta que quede en estado activo. El motor de reconocimiento queda en modo <strong>continuo</strong> (<code>continuous = true</code>), es decir, no se apaga tras una sola frase corta.</p><p class="mb-2"><strong>Paso 2 — Palabra de activación (“wake word”):</strong> mientras escucha, el programa busca en el texto reconocido alguna forma del nombre del asistente. El diccionario incluye muchas variantes fonéticas: <strong>gecko, geco, gueco, eco, jeco, yecko, gico, guco, gako, gicko, jecko, jeko, ghecko, getko, keko</strong>, etc. No necesita pronunciación perfecta; sirve despertar el modo comando.</p><p class="mb-2"><strong>Paso 3 — Apertura del buscador:</strong> si <strong>no</strong> hay un <strong>modal de Bootstrap</strong> abierto (<code>.modal.show</code>), al detectar la wake word se abre automáticamente <strong>Gecko Search</strong> y se marca el estado “escuchando comando”. Si hay un modal abierto, por diseño <strong>no</strong> se abre el buscador para no tapar formularios críticos; la voz puede seguir activa pero el feedback es distinto (consola / futuros indicadores en el propio modal).</p><p class="mb-2"><strong>Paso 4 — Frase de comando:</strong> después de la palabra de activación, siga hablando. El texto intermedio (provisional) y el final se muestran en el <strong>campo del buscador</strong> para que vea lo que el sistema entiende. Las wake words se <strong>eliminan</strong> del texto antes de enviar el comando.</p><p class="mb-2"><strong>Paso 5 — Fin de la frase y envío:</strong> cuando el motor marca un resultado como <strong>final</strong> (fin de enunciado) y queda texto útil, el micrófono se <strong>detiene</strong> y se llama al despachador de IA. El payload incluye el texto, institución, usuario y nivel de rol para que el backend acote permisos.</p><p class="mb-2"><strong>Tipos de respuesta que puede dar la IA (campo <code>action_type</code>):</strong></p><ul class="small mb-3"><li><strong>navegacion:</strong> redirige tras una breve pausa a una ruta interna (p. ej. módulo de usuarios o protocolos). La URL se compone con la base correcta según si entra por localhost o producción.</li><li><strong>busqueda:</strong> rellena la lista de resultados del panel con lo que devolvió el servidor (término buscado + filas).</li><li><strong>comando_dom:</strong> en la página actual puede <strong>escribir valores en inputs</strong> por su <code>id</code> HTML y disparar eventos <code>input</code>, o <strong>pulsar un botón</strong> por id. Útil para asistentes que ayudan a rellenar formularios.</li></ul><p class="mb-2"><strong>Mensaje hablado o en pantalla:</strong> si la respuesta trae <code>mensaje_texto</code>, puede mostrarse en el buscador y además leerse en voz alta con la <strong>síntesis de voz</strong> del navegador (<code>speechSynthesis</code>) en el idioma coherente con <code>es</code>, <code>en</code> o <code>pt</code>.</p><p class="mb-2"><strong>Errores:</strong> si el servidor responde error, verá un diálogo (SweetAlert si existe) con el mensaje; si falla la red, la consola registrará el error y se limpiará la vista de resultados.</p><p class="mb-0 small text-muted"><strong>Privacidad y entorno:</strong> hable en un sitio adecuado; el audio lo procesa el motor del navegador (según política del proveedor del navegador). No active el micrófono en entornos donde la confidencialidad lo prohíba.</p>',
      },
      {
        id: 'form_perfil',
        cat: 'forms',
        icon: 'person-lines-fill',
        h: 'Pantalla Mi perfil: cada campo y botón del formulario',
        html: '<p class="mb-3">Esta sección describe los elementos <strong>típicos</strong> de la página de perfil. Su institución puede ocultar campos o añadir otros; use esto como mapa mental.</p><dl class="manual-glossary mb-0"><dt><i class="bi bi-person-badge text-success" aria-hidden="true"></i> Identidad y datos básicos</dt><dd><p class="mb-1">Suele incluir <strong>nombre</strong> y <strong>apellidos</strong> o un único campo de nombre completo, según diseño. Es la etiqueta humana que ven compañeros en listas y mensajes.</p></dd><dt><i class="bi bi-envelope text-success" aria-hidden="true"></i> Correo electrónico</dt><dd><p class="mb-1"><strong>Para qué sirve:</strong> es la dirección a la que el sistema envía <strong>notificaciones</strong> (tickets, avisos, recuperación de cuenta). Muchos formularios de contacto rellenan el destinatario o el remitente a partir de este dato.</p><p class="mb-0"><strong>Qué debe hacer:</strong> manténgalo actualizado y accesible; si cambia de dominio institucional, actualícelo antes de pedir soporte para no perder respuestas.</p></dd><dt><i class="bi bi-telephone text-success" aria-hidden="true"></i> Teléfono</dt><dd><p class="mb-1"><strong>Para qué sirve:</strong> contacto urgente, verificación en algunas sedes, o campos legales de consentimiento.</p><p class="mb-0"><strong>Formato:</strong> use el prefijo internacional si el formulario lo pide (p. ej. +34…) para evitar errores de validación.</p></dd><dt><i class="bi bi-key text-success" aria-hidden="true"></i> Contraseña actual / nueva / confirmación</dt><dd><p class="mb-1"><strong>Flujo típico:</strong> se pide la <strong>contraseña actual</strong> por seguridad; luego la <strong>nueva</strong> dos veces para evitar erratas.</p><p class="mb-0"><strong>Buenas prácticas:</strong> longitud adecuada, mezcla de caracteres, no reutilizar la del correo personal. Tras guardar, cierre sesión en dispositivos que no controla si sospecha filtración.</p></dd><dt><i class="bi bi-image text-success" aria-hidden="true"></i> Foto o avatar</dt><dd><p class="mb-1"><strong>Qué es:</strong> imagen circular o cuadrada que identifica su cuenta en cabeceras y listas.</p><p class="mb-0"><strong>Cómo usarlo:</strong> botón “Examinar” o arrastrar archivo; respete <strong>formato</strong> (jpg, png…) y <strong>tamaño máximo</strong> indicado para no rechazar el guardado.</p></dd><dt><i class="bi bi-building text-success" aria-hidden="true"></i> Institución o rol (solo lectura)</dt><dd><p class="mb-0">A veces verá su <strong>centro</strong> o <strong>rol</strong> sin poder editarlos: los cambia un administrador. Sirve para confirmar que entró en la cuenta correcta.</p></dd><dt><i class="bi bi-save text-success" aria-hidden="true"></i> Botón Guardar / Actualizar perfil</dt><dd><p class="mb-1"><strong>Qué hace:</strong> envía los cambios al backend; mientras procesa, el botón puede deshabilitarse o mostrar carga.</p><p class="mb-0"><strong>Importante:</strong> espere el mensaje de éxito o error antes de cerrar la pestaña; si sale antes, puede perder ediciones.</p></dd></dl>',
      },
    ],
  },
  panel__soporte: {
    overview:
      'Soporte Gecko es el canal de tickets hacia el equipo que mantiene el software GROBO: fallos de la aplicación (pantallas que no cargan, errores al guardar, mensajes de error inesperados, comportamientos claramente anómalos del programa). No sustituye al comité ni resuelve dudas de trámite científico dentro de su institución.\n\nFunciona por turnos: usted escribe, responde soporte, y así sucesivamente; no es un chat en tiempo real. Cada envío suele generar notificación por correo. Use un asunto claro y describa qué estaba haciendo cuando ocurrió el problema.',
    summary:
      'Ticket a soporte técnico del producto (Gecko) por fallos o comportamiento anómalo de la aplicación; habitualmente solo perfiles administrativos ven esta opción en el menú.',
    roles:
      'En la configuración habitual, administración del bioterio y otros perfiles administrativos de la sede. Los investigadores y usuarios del panel de pedidos no suelen tener Ayuda → Ticket/Contacto: deben avisar a administración local para que abra o escale el ticket si la incidencia es del programa.',
    blocks: [
      {
        id: 'para_que',
        h: 'Para qué sirve el ticket (y para qué no)',
        html: '<p><strong>Sí use el ticket</strong> cuando algo <strong>del programa GROBO</strong> falle o se comporte mal: errores al enviar formularios, pantallas en blanco, mensajes de error del sistema, funciones que dejaron de responder sin que nadie haya cambiado permisos en su sede, etc.</p><p class="mb-0"><strong>No use el ticket</strong> como canal general de consultas operativas con el bioterio (plazos de pedidos, interpretación de protocolos): eso corresponde a <strong>mensajería</strong> o procedimientos internos de su institución. <strong>Ventas GROBO</strong> es solo para lo comercial (presupuestos, contratación).</p>',
      },
      {
        id: 'buenas',
        h: 'Cómo abrir un ticket útil',
        html: '<ul class="mb-0"><li>Asunto corto que identifique el módulo (ej. “Reservas — error al guardar”).</li><li>Primer mensaje con pasos para reproducir, captura si puede, navegador y rol.</li><li>Un ticket por incidencia distinta; no mezcle temas.</li></ul>',
      },
      {
        id: 'turnos',
        h: 'Turnos y cierre',
        html: '<p>Cuando soporte responde, podrá enviar un mensaje en su turno o cerrar si quedó resuelto. Cada envío genera notificación por correo al equipo de soporte.</p>',
      },
    ],
  },
  panel__ventas: {
    overview:
      'Ventas GROBO es el canal para presupuestos, contratación de módulos o consultas comerciales. Su mensaje se envía por correo al equipo de ventas; la respuesta llegará al email registrado en su perfil.\n\nNo use esta pantalla para reportar fallos del sistema: para eso está «Ayuda → Ticket/Contacto». Escriba con suficiente detalle (mínimo unas líneas) para que el equipo comercial pueda orientarle.',
    summary:
      'Contacto comercial con GROBO: un solo envío por correo electrónico al equipo de ventas (no es un ticket de soporte técnico).',
    roles:
      'Usuarios con el ítem Ayuda → Ventas. Requiere correo válido en Mi perfil.',
    blocks: [
      {
        id: 'proposito',
        h: 'Para qué sirve esta pantalla',
        html: '<p>Sirve para <strong>presupuestos</strong>, consultas de contratación o comentarios positivos sobre el producto. El mensaje se envía a <strong>ventas@groboapp.com</strong> con categoría <strong>venta</strong>.</p><ul class="mb-0"><li>No use esta pantalla para fallos de la aplicación: <strong>Ayuda → Ticket/Contacto</strong> (soporte Gecko) es para incidencias técnicas del programa y suele estar disponible solo para perfiles <strong>administrativos</strong>; si no tiene ese ítem, pida a administración de sede que abra el ticket.</li><li>Puede mencionar plazos, módulos de interés o referencia a <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
      },
      {
        id: 'lista_ui',
        h: 'Qué verá en pantalla (lista de elementos de interfaz)',
        html: '<ul class="mb-0"><li><strong>Texto introductorio:</strong> contexto y beneficios (implementación en menos de una semana según oferta).</li><li><strong>“Responderemos a”:</strong> muestra el correo de su perfil; ventas contestará a esa dirección.</li><li><strong>Área de mensaje:</strong> un solo campo de texto (mínimo 10 caracteres).</li><li><strong>Botón Enviar:</strong> dispara el envío por API; mientras procesa puede verse estado de carga en el botón.</li></ul>',
      },
      {
        id: 'popup',
        h: 'Ventana emergente (popup) de confirmación',
        html: '<p>Tras un envío correcto, suele abrirse un <strong>cuadro de diálogo</strong> (SweetAlert) indicando éxito, el correo de destino y que la respuesta llegará a su email de usuario.</p><ul class="mb-0"><li>Si falta correo en el perfil o el texto es muy corto, verá un aviso para corregirlo.</li><li>Si falla el servidor, aparecerá mensaje de error genérico; reintente más tarde.</li></ul>',
      },
    ],
  },
  panel__capacitacion: {
    overview:
      'Usted está leyendo la biblioteca de capacitación: un manual organizado por las mismas áreas que su menú lateral, para que encuentre ayuda exactamente donde la necesita.\n\nCada tema empieza con una explicación amplia (“Sobre esta sección”), un resumen breve y apartados que puede abrir o cerrar. La lista izquierda cambia el contenido de la derecha; si guarda o comparte la dirección del navegador después de elegir un tema, podrá volver directamente a esa página. Los iconos son orientativos: el aspecto exacto de los botones puede variar un poco entre sedes.',
    summary:
      'Esta biblioteca: manual estructurado por las mismas rutas que su menú lateral.',
    roles:
      'Quien tenga el ítem Ayuda → Capacitación.',
    blocks: [
      {
        id: 'como',
        cat: 'navigation',
        icon: 'book',
        h: 'Cómo está organizado el manual',
        html: '<ul class="mb-0"><li><strong>Lista a la izquierda:</strong> un botón por cada tema, alineado con lo que usted tiene en el menú (según su rol y lo contratado en la sede).</li><li><strong>Zona derecha:</strong> primero la explicación amplia de la sección, el resumen corto, a quién suele aplicar, y después los apartados que se abren y cierran.</li><li><strong>Títulos de categoría en verde:</strong> agrupan temas por tipo de pantalla (por ejemplo menú, filtros, tabla principal, formularios).</li><li><strong>Listas con iconos:</strong> cada ítem describe un control habitual (un botón, una zona); el dibujo exacto puede cambiar, pero la función es la que se indica.</li></ul>',
      },
      {
        id: 'iconos',
        cat: 'content',
        icon: 'palette',
        h: 'Iconos en títulos y en el texto',
        html: '<p>Los iconos Bootstrap (<i class="bi bi-lightbulb text-success"></i>) son <strong>referencia visual</strong>; el botón real en su sede puede tener otro dibujo o solo texto. Priorice la <strong>posición</strong> (barra superior, grilla, menú ⋮) y la <strong>función</strong> descrita.</p>',
      },
      {
        id: 'lista',
        cat: 'sidebar',
        icon: 'list',
        h: 'Botones de la biblioteca (columna izquierda)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-cursor text-success" aria-hidden="true"></i> Cada tema de la lista</dt><dd>Al pulsarlo, carga la guía a la derecha y deja guardada en la barra de direcciones la ubicación de ese tema, para poder marcar favoritos o compartir el enlace.</dd><dt><i class="bi bi-check2-circle text-success" aria-hidden="true"></i> Tema resaltado en verde</dt><dd>Indica en qué capítulo está leyendo ahora.</dd></dl>',
      },
      {
        id: 'acordeon',
        cat: 'content',
        icon: 'arrows-expand',
        h: 'Acordeón del tema (derecha)',
        html: '<dl class="manual-glossary mb-0"><dt><i class="bi bi-chevron-down text-success" aria-hidden="true"></i> Cabecera de apartado</dt><dd>Expande o colapsa el contenido detallado.</dd><dt><i class="bi bi-lightbulb text-success" aria-hidden="true"></i> Cinta verde superior</dt><dd>Recuerda cómo leer el tutorial y que los textos pueden variar levemente por sede.</dd></dl>',
      },
      {
        id: 'roles',
        cat: 'help',
        icon: 'person-lock',
        h: 'Por qué no ve ciertos temas',
        html: '<p>Si falta una sección en la lista, no es un error: su institución no asignó ese módulo o ítem de menú. Solicite habilitación a administración de sede.</p>',
      },
      {
        id: 'ticket_grobo',
        cat: 'help',
        icon: 'ticket-perforated',
        h: 'Ticket Soporte Gecko: fallos de la aplicación (suelen verlo solo administradores)',
        html: '<p>El ítem <strong>Ayuda → Ticket/Contacto</strong> abre la pantalla de <strong>Soporte Gecko</strong>: sirve para reportar <strong>fallos técnicos del programa</strong> (errores, bloqueos, comportamiento anómalo de GROBO) al equipo que mantiene el producto.</p><ul class="mb-0"><li><strong>Quién lo ve:</strong> en la configuración habitual del menú, ese acceso lo tienen perfiles <strong>administrativos</strong> de la sede (personal del bioterio, administración). Los <strong>investigadores</strong> suelen <strong>no</strong> tenerlo: no es un olvido, evita duplicar canales.</li><li><strong>Si usted es investigador</strong> y la aplicación falla, comuníquese con <strong>administración del bioterio</strong> o el contacto que su sede defina; ellos pueden abrir o escalar el ticket con los datos adecuados.</li><li>El tema <strong>Soporte / tickets</strong> en esta biblioteca (si figura en su lista) amplía turnos, buenas prácticas y diferencias con <strong>Ventas</strong>.</li></ul>',
      },
      {
        id: 'barra_ayuda',
        cat: 'help',
        icon: 'layout-text-window-reverse',
        h: 'Barra inferior, menú Ayuda y tutoriales sin barra',
        html:
          '<p>La <strong>barra verde inferior</strong> enlaza al manual del tema actual y al tutorial interactivo de la <strong>pantalla</strong> (listado o vista principal).</p><ul class="mb-0"><li><strong>Ventana emergente abierta:</strong> aparecen la franja de ayuda encima del fondo oscuro, el botón en la barra (solo entonces) y la opción en <strong>Ayuda</strong> del menú para el tutorial de <em>esa</em> ventana (estructura cabecera/cuerpo/pie). En la lista izquierda del manual, el tema <strong>Ventanas emergentes (modales y diálogos)</strong> describe qué campos son editables y qué hace cada botón en los modales de cobro habituales.</li><li><strong>Ocultar barra:</strong> «No mostrar más esta barra» en la propia barra o en la franja del modal; oculta ambas.</li><li><strong>Volver a mostrar:</strong> interruptor en Capacitación o <strong>Ayuda → Mostrar barra inferior de ayuda</strong>.</li><li><strong>Tutoriales automáticos:</strong> las opciones para no volver a mostrarlos al entrar en una pantalla aparecen al <strong>final</strong> del recorrido interactivo, no al principio.</li><li><strong>Autores de guías:</strong> pasos por ruta en <code>capacitacionTours.js</code>, textos <code>tour_*</code> en i18n ES/EN/PT; menú Ayuda (?): <code>MenuTemplates.js</code> + <code>CapacitacionPageHelpMenu.js</code>; barra <code>CapacitacionHelpFab.js</code>. Documentación de seguimiento: <code>docs/CHECKLIST-CAPACITACION.md</code> §13 y §13.6.</li></ul>',
      },
    ],
  },
  capacitacion__tema__red: {
    overview:
      'En GROBO, “RED” significa que varias sedes o bioterios comparten un marco común (misma dependencia, políticas alineadas o contrato agrupado), sin dejar de ser instituciones distintas con sus propios datos y menús.\n\nEste tema explica cómo pueden cruzarse flujos (pedidos, mensajes, noticias, facturación) cuando su organización trabaja así. Si usted solo opera una sede aislada, puede leerlo como referencia o omitir lo que no aplique.',
    summary:
      'Guía conceptual para instituciones que operan como RED: varias sedes bajo una misma dependencia o contrato, con usuarios y flujos compartidos o derivados.',
    roles:
      'Todos los perfiles; la aplicación práctica depende de cómo su institución haya configurado sedes, módulos y permisos.',
    blocks: [
      {
        id: 'concepto',
        h: 'Qué es la RED en GROBO',
        html: '<p>No es una “red social”: es un <strong>modelo organizativo</strong> donde varias sedes comparten marco (marca, contrato, políticas) pero pueden tener bioterios, listas de precios y administradores propios.</p><ul class="mb-0"><li>Cada usuario sigue perteneciendo a una <strong>institución/sede</strong> concreta para datos y menú.</li><li>Algunos flujos permiten <strong>derivar</strong> pedidos o mensajes entre sedes si la configuración y los permisos lo habilitan.</li></ul>',
      },
      {
        id: 'formularios',
        h: 'Formularios y pedidos entre sedes',
        html: '<p>El investigador normalmente carga pedidos contra protocolos y reglas de <strong>su</strong> sede. Si un pedido debe ejecutarse en otra sede de la red, suele haber un procedimiento interno (mensaje institucional, campo específico o derivación administrativa). No asuma que el sistema envía físicamente bienes a otra ciudad sin validación humana.</p>',
      },
      {
        id: 'mensajes',
        h: 'Mensajes personales vs institucionales',
        html: '<ul class="mb-0"><li><strong>Mensajes:</strong> conversaciones entre personas; útil para coordinar detalles operativos.</li><li><strong>Mensajería institucional:</strong> avisos oficiales; en RED puede usarse para comunicar políticas transversales o prioridades de varias sedes.</li></ul>',
      },
      {
        id: 'noticias',
        h: 'Noticias locales y alcance',
        html: '<p>Las noticias pueden estar pensadas para todo el portal o segmentadas; lea siempre el contexto (¿afecta solo a una sede?).</p>',
      },
      {
        id: 'protocolos',
        h: 'Protocolos en RED',
        html: '<p>Un protocolo puede estar limitado a una sede o tener anexos que autoricen colaboraciones. Las solicitudes de alta/modificación siguen el circuito del comité correspondiente; la RED no reemplaza aprobaciones éticas.</p>',
      },
      {
        id: 'facturacion',
        h: 'Facturación y trazabilidad',
        html: '<p>Los reportes contables suelen filtrarse por sede o departamento. En RED, cuadre que los costos no se dupliquen entre sedes cuando un mismo proyecto tiene presencia en varias.</p>',
      },
      {
        id: 'buenas',
        h: 'Buenas prácticas',
        html: '<ul class="mb-0"><li>Identifique siempre <strong>sede</strong> y <strong>código interno</strong> en mensajes y pedidos.</li><li>Documente acuerdos entre sedes fuera del software si el flujo lo requiere.</li><li>Ante duda de permiso, pregunte a su administrador local antes de usar datos de otra sede.</li></ul>',
      },
    ],
  },
  capacitacion__tema__modales: {
    overview:
      'Las ventanas emergentes (modales Bootstrap) concentran una tarea sin abandonar la pantalla de fondo: en facturación muestran la ficha de un pedido y permiten cobrar o ajustar importes. Los cuadros de SweetAlert2 son diálogos breves (aviso, confirmación, error).\n\nEste tema describe qué es solo lectura, qué puede editar y qué hace cada botón en los modales habituales de cobro. Complementa al tutorial interactivo «Ventanas emergentes» del menú Ayuda.',
    summary:
      'Anatomía cabecera/cuerpo/pie; campos informativos vs editables; PAGAR/QUITAR; PDF; diálogos de confirmación.',
    roles:
      'Quienes usen facturación o pantallas con detalle en modal; el resto puede leer la parte genérica.',
    blocks: [
      {
        id: 'anatomia',
        cat: 'modals',
        h: 'Partes comunes de un modal grande',
        html: '<dl class="manual-glossary mb-0"><dt>Cabecera oscura</dt><dd>Título (tipo de ficha y número de pedido), a veces <strong>saldo disponible del titular</strong> en un distintivo verde, y la <strong>X</strong> para cerrar sin guardar cambios pendientes que no haya confirmado.</dd><dt>Cuerpo</dt><dd>Columna izquierda: datos del protocolo, especies, cantidades, fechas, reactivo, etc. — en general <strong>solo lectura</strong> salvo lo indicado. Columna derecha: bloque de <strong>cobro</strong> (importes y acciones).</dd><dt>Pie</dt><dd>Suele incluir <strong>PDF</strong> (descarga de la ficha) y <strong>CERRAR</strong>. No confunda cerrar con registrar pago: el pago se confirma con los botones del bloque de cobro y los SweetAlert que aparecen después.</dd></dl>',
      },
      {
        id: 'badges',
        cat: 'modals',
        h: 'Badges de estado (animal, reactivo, insumo)',
        html: '<p><strong>EXENTO</strong>, <strong>PAGO COMPLETO</strong>, <strong>PAGO PARCIAL</strong>, <strong>SIN PAGAR</strong> y descuentos se calculan con total, pagado y reglas de exención. Son informativos: no se “editan” directamente.</p>',
      },
      {
        id: 'animal_campos',
        cat: 'modals',
        h: 'Modal pedido de animales',
        html: '<ul class="mb-0"><li><strong>Solo lectura:</strong> titular del protocolo, solicitante del pedido, tipo de pedido, id/nombre de protocolo, taxonomía, edad/peso, recuadros machos/hembra/indistintos/total, fechas, <strong>nota administrativa</strong>, <strong>pagado actualmente</strong>.</li><li><strong>Costo total del formulario:</strong> campo numérico en solo lectura por defecto; el <strong>lápiz</strong> habilita edición para correcciones autorizadas (tras guardar, el backend valida).</li><li><strong>Monto a mover:</strong> campo donde escribe cuánto desea <strong>PAGAR</strong> (descontar del saldo del titular) o <strong>QUITAR</strong> (revertir parte del pago registrado). Si el monto no es válido o no hay saldo/deuda, verá un aviso.</li><li><strong>PAGAR / QUITAR:</strong> disparan confirmación; tras éxito el modal puede recargarse con datos frescos.</li><li><strong>PDF:</strong> genera documento de respaldo del ítem.</li></ul>',
      },
      {
        id: 'reactivo_insumo',
        cat: 'modals',
        h: 'Modal reactivo e insumo',
        html: '<p><strong>Reactivo:</strong> mismas ideas — titular/pagador, datos del insumo biológico y fechas son informativos; <strong>nota administrativa</strong>; <strong>costo total</strong> con lápiz; <strong>pagado</strong>; campo de monto y <strong>PAGAR</strong>/<strong>QUITAR</strong>; <strong>PDF</strong>.</p><p class="mb-0"><strong>Insumo experimental:</strong> lista de renglones del pedido (solo lectura); bloque de saldo, costo total con lápiz, pagado y mismos botones de acción. El detalle llega como texto estructurado desde el servidor.</p>',
      },
      {
        id: 'alojamiento',
        cat: 'modals',
        h: 'Modal alojamiento',
        html: '<p>Muestra <strong>titular (paga)</strong> frente a <strong>responsable de la estadía</strong>, tipo de alojamiento, tramos y días calculados. La parte financiera resume <strong>costo histórico</strong> y <strong>total pagado</strong> con campos para aplicar pagos o quitas según la implementación de la vista. <strong>PDF</strong> y <strong>CERRAR</strong> en el pie.</p>',
      },
      {
        id: 'sweetalert',
        cat: 'modals',
        h: 'Diálogos pequeños (SweetAlert)',
        html: '<p>No son formularios de datos: informan errores de validación (“seleccione departamento”), éxito de pago, o piden <strong>confirmación</strong> antes de un movimiento sensible. Debe leer el texto y elegir confirmar o cancelar; cancelar no altera el servidor.</p>',
      },
      {
        id: 'ayuda_billing',
        cat: 'help',
        h: 'Modal «Ayuda» dentro de facturación',
        html: '<p>El botón de ayuda de cada subpantalla de facturación abre un <strong>modal propio</strong> con texto estático sobre esa vista: es independiente de este manual. Use la biblioteca de capacitación para profundizar por tema.</p>',
      },
    ],
  },
};
