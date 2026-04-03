/**
 * Manual de capacitación (ES): capítulos por slug de ruta de menú.
 * Cada capítulo: summary, roles (texto), blocks[{ id, h, html }].
 */
export const CHAPTERS = {
  admin__dashboard: {
    summary:
      'Panel de arranque de la administración de sede: visión rápida de actividad, accesos a módulos críticos y recordatorios operativos.',
    roles:
      'Usuarios con menú administrativo (típicamente perfil maestro en contexto institución, Superadmin de sede, Admin de sede). Lo que vea depende de módulos contratados y permisos.',
    blocks: [
      {
        id: 'proposito',
        h: 'Propósito del tablero',
        html: '<p>Centraliza indicadores y atajos para no tener que abrir cada módulo para saber si hay trabajo pendiente. No sustituye las bandejas detalladas (protocolos, pedidos, reservas): sirve para <strong>priorizar</strong> y <strong>navegar</strong>.</p><ul class="mb-0"><li>Revise tarjetas o bloques que muestren contadores o listas recientes.</li><li>Use enlaces directos al módulo donde deba actuar.</li><li>Si un número no cuadra con la realidad, refresque o abra el módulo origen: el tablero puede mostrar un subconjunto.</li></ul>',
      },
      {
        id: 'navegacion',
        h: 'Navegación y menú lateral',
        html: '<p>El menú lateral agrupa todas las áreas administrativas habilitadas para su institución. Los ítems que no aparecen suelen estar <strong>desactivados por módulo</strong> o por rol.</p><ul class="mb-0"><li>Confirme que está en la sede correcta (institución) si gestiona varias.</li><li>La barra superior puede incluir notificaciones, tema claro/oscuro o acceso al perfil según configuración.</li><li>Desde cualquier pantalla puede volver al tablero con el ítem correspondiente del menú.</li></ul>',
      },
      {
        id: 'flujo',
        h: 'Flujo de trabajo recomendado',
        html: '<ul class="mb-0"><li><strong>Mañana:</strong> revisar solicitudes nuevas (protocolo, animales, insumos) y mensajes institucionales.</li><li><strong>Continuo:</strong> mantener estados de pedidos y reservas actualizados para que investigadores vean avance en «Mis formularios» / «Mis reservas».</li><li><strong>Cierre de mes:</strong> facturación e historial contable si su sede los usa.</li></ul>',
      },
      {
        id: 'ayuda',
        h: 'Si algo no responde como espera',
        html: '<p>Use la barra inferior <strong>«Ver tutorial en capacitación»</strong> en la pantalla concreta, o <strong>Ayuda → Capacitación</strong> para el manual por sección. Para incidencias técnicas: <strong>Ayuda → Ticket/Contacto</strong>.</p>',
      },
    ],
  },
  panel__dashboard: {
    summary:
      'Inicio del panel de investigador: acceso a sus protocolos, pedidos y comunicaciones sin pasar por menús profundos.',
    roles:
      'Investigadores y perfiles de usuario de sede que operan como tal (roles 3, 5, 6 u otros según su institución). Solo verá módulos que el administrador haya habilitado.',
    blocks: [
      {
        id: 'proposito',
        h: 'Qué encontrará aquí',
        html: '<p>Resumen de su actividad en GROBO: enlaces a <strong>Mis protocolos</strong>, <strong>Centro de solicitudes</strong>, <strong>Mis formularios</strong>, mensajes o noticias según contratación.</p><ul class="mb-0"><li>Compruebe que los protocolos activos tienen vigencia antes de generar pedidos.</li><li>Los avisos del tablero no reemplazan el correo institucional: úselos como guía rápida.</li></ul>',
      },
      {
        id: 'pedidos',
        h: 'Relación con pedidos y formularios',
        html: '<p>Los pedidos de animales, reactivos o insumos se originan en <strong>Centro de solicitudes</strong> y se siguen en <strong>Mis formularios</strong>. El estado visible allí lo actualiza administración.</p><ul class="mb-0"><li>Guarde borradores si el formulario es largo.</li><li>Adjunte documentación pedida para evitar devoluciones.</li></ul>',
      },
      {
        id: 'red',
        h: 'Si su institución trabaja en RED',
        html: '<p>Varias sedes bajo la misma dependencia pueden compartir flujos (formularios, mensajes institucionales, noticias). Consulte también el tema dedicado <strong>«Trabajar en RED»</strong> en la biblioteca de capacitación.</p>',
      },
    ],
  },
  admin__usuarios: {
    summary:
      'Directorio de personas de la sede: alta, edición, departamento, roles y vínculo con protocolos y formularios.',
    roles:
      'Administración de sede (perfiles 2 y 4 típicamente). El perfil maestro (1) puede operar en contexto superadmin; las acciones concretas dependen de política interna.',
    blocks: [
      {
        id: 'lista',
        h: 'Lista y búsqueda',
        html: '<p>La grilla suele permitir buscar por nombre, apellido o usuario y filtrar por rol o departamento.</p><ul class="mb-0"><li>Un clic en la fila abre la <strong>ficha del usuario</strong>.</li><li>Exportaciones (Excel/PDF) sirven para auditorías o reportes a RR.HH.; respete normativa de datos personales.</li><li>No comparta listados completos fuera de la institución sin autorización.</li></ul>',
      },
      {
        id: 'ficha',
        h: 'Ficha de usuario',
        html: '<p>Desde la ficha puede corregir datos de contacto, asignar <strong>departamento</strong>, revisar <strong>protocolos</strong> y <strong>formularios</strong> vinculados según lo que exponga el sistema.</p><ul class="mb-0"><li>El cambio de rol puede afectar de inmediato el menú visible: confirme con el interesado.</li><li>Restablecimiento de contraseña: use el flujo indicado por su institución (correo de recuperación, etc.).</li></ul>',
      },
      {
        id: 'vinculos',
        h: 'Protocolos y trazabilidad',
        html: '<p>Antes de dar de baja o modificar fuerte un usuario, verifique que no sea titular único de protocolos activos o responsable de pedidos abiertos.</p>',
      },
    ],
  },
  admin__protocolos: {
    summary:
      'Gestión operativa de protocolos ya registrados o en curso de vida en la plataforma: estados, datos del estudio, especies y vínculo con pedidos y alojamientos.',
    roles:
      'Administración de bioterio / cumplimiento / secretaría técnica según su sede. No confundir con la cola de «Solicitudes de protocolo» (trámites de alta nuevos).',
    blocks: [
      {
        id: 'diferencia',
        h: 'Protocolos vs solicitud de protocolo',
        html: '<p><strong>Esta pantalla</strong> administra protocolos como <strong>entidades de trabajo</strong> (vigencia, participantes, límites). <strong>Solicitud de protocolo</strong> es el flujo para <strong>ingresar o modificar</strong> un protocolo ante el comité o la administración.</p><ul class="mb-0"><li>Si busca aprobar un trámite nuevo, vaya a <strong>Administración → Solicitudes de protocolo</strong>.</li><li>Aquí ajusta metadatos operativos y coherencia con pedidos ya cargados.</li></ul>',
      },
      {
        id: 'bandeja',
        h: 'Bandeja y filtros',
        html: '<p>Use búsqueda por título, código interno, investigador o estado. Los estados posibles dependen de la configuración de protocolos de su sede.</p><ul class="mb-0"><li>Revise columnas de vigencia (inicio/fin) antes de autorizar consumos.</li><li>Los adjuntos o versiones pueden estar en el detalle del protocolo o en la solicitud asociada.</li></ul>',
      },
      {
        id: 'acciones',
        h: 'Acciones habituales',
        html: '<ul class="mb-0"><li>Activar/desactivar o marcar estados que reflejen aprobación institucional.</li><li>Corregir datos administrativos (sin suplantar dictamen ético: eso es proceso externo a la herramienta).</li><li>Vincular o revisar especies y límites que condicionan pedidos de animales y alojamientos.</li></ul>',
      },
      {
        id: 'integracion',
        h: 'Integración con otros módulos',
        html: '<p>Los <strong>pedidos de animales</strong>, <strong>alojamientos</strong> y parte de <strong>facturación</strong> leen el protocolo como referencia. Un protocolo vencido o mal configurado genera rechazos en cadena.</p>',
      },
    ],
  },
  admin__solicitud_protocolo: {
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
    summary:
      'Administración de pedidos de animales vivos: recepción, preparación, estados de entrega y comunicación con el investigador.',
    roles:
      'Bioterio / compras / logística animal según organigrama de la sede.',
    blocks: [
      {
        id: 'grilla',
        h: 'Lista de pedidos',
        html: '<p>Filtre por protocolo, solicitante, fechas, estado o especie. Priorice pedidos con fecha de necesidad cercana.</p><ul class="mb-0"><li>Abra el detalle para ver cantidades, sexo, cepa y observaciones del formulario.</li><li>Cruce siempre con <strong>protocolo vigente</strong> y cupos autorizados.</li></ul>',
      },
      {
        id: 'estados',
        h: 'Actualización de estado',
        html: '<ul class="mb-0"><li>Registre hitos: en preparación, listo para retiro, entregado, cancelado, etc., según su taxonomía.</li><li>Las notas internas sirven para turnos sucesivos; las notas al investigador deben ser entendibles sin contexto técnico interno.</li><li>Antes de marcar «entregado», confirme retiro firmado o registro requerido por su sede.</li></ul>',
      },
      {
        id: 'trazabilidad',
        h: 'Trazabilidad y errores',
        html: '<p>Si el pedido fue creado contra un protocolo incorrecto, coordine con administración de protocolos antes de forzar cambios que rompan auditoría.</p>',
      },
    ],
  },
  admin__reactivos: {
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
    ],
  },
  admin__insumos: {
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
        id: 'config',
        h: 'Relación con configuración',
        html: '<p>Catálogos de insumos y listas permitidas suelen mantenerse en <strong>Configuración → Insumos experimentales</strong>. Si un pedido falla por ítem no catalogado, corrija primero el maestro.</p>',
      },
    ],
  },
  admin__reservas: {
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
    summary:
      'Punto de entrada a los formularios de pedido (animales, reactivos, insumos). Puede mostrar sub-rutas o tarjetas según contratación.',
    roles:
      'Investigadores y usuarios autorizados a generar solicitudes.',
    blocks: [
      {
        id: 'subsecciones',
        h: 'Subsecciones típicas',
        html: '<ul class="mb-0"><li><strong>Solicitud de animales:</strong> elige protocolo vigente, especie, cantidades y fechas; puede exigir archivos adjuntos.</li><li><strong>Solicitud de reactivos:</strong> catálogo o texto libre según configuración.</li><li><strong>Solicitud de insumos:</strong> similar con ítems de depósito.</li></ul>',
      },
      {
        id: 'antes',
        h: 'Antes de enviar',
        html: '<ul class="mb-0"><li>Confirme que el <strong>protocolo</strong> está aprobado y vigente en <strong>Mis protocolos</strong>.</li><li>Revise límites de especies/autorizaciones.</li><li>Guarde borrador si debe consultar con el director del proyecto.</li></ul>',
      },
      {
        id: 'despues',
        h: 'Después del envío',
        html: '<p>El seguimiento es en <strong>Mis formularios</strong>. Allí verá estados, comentarios del administrador y posibles solicitudes de subsanación.</p>',
      },
    ],
  },
  panel__misformularios: {
    summary:
      'Historial unificado de todos sus pedidos (animales, reactivos, insumos) con estado y detalle.',
    roles:
      'Cualquier usuario que haya enviado formularios.',
    blocks: [
      {
        id: 'filtros',
        h: 'Filtros y lectura de estados',
        html: '<p>Use filtros por tipo, fechas o texto para localizar un pedido antiguo. El estado es la fuente de verdad operativa; si está “pendiente” largo tiempo, contacte al bioterio por <strong>Mensajes</strong> o el canal oficial.</p>',
      },
      {
        id: 'detalle',
        h: 'Detalle y adjuntos',
        html: '<ul class="mb-0"><li>Abra el ítem para ver líneas del pedido, notas y archivos.</li><li>No elimine correos de notificación si su sede los usa como comprobante.</li></ul>',
      },
    ],
  },
  panel__misalojamientos: {
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
    ],
  },
  panel__misreservas: {
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
    summary:
      'Módulo contable: informes por departamento, investigador, protocolo u organización, según despliegue de su sede.',
    roles:
      'Personal con módulo de facturación habilitado.',
    blocks: [
      {
        id: 'subvistas',
        h: 'Subsecciones habituales',
        html: '<ul class="mb-0"><li><strong>Por departamento:</strong> consolida cargos agrupados por unidad académica o administrativa.</li><li><strong>Por investigador:</strong> útil para devolver costos a grupos o fondos.</li><li><strong>Por protocolo:</strong> alinea gasto con proyectos y cumplimiento de grants.</li><li><strong>Organización / resumen:</strong> visión ejecutiva cuando exista.</li></ul>',
      },
      {
        id: 'pdf',
        h: 'PDF, ajustes y cierre',
        html: '<p>Los PDF o exportaciones suelen generarse por período. Los ajustes manuales deben quedar justificados en historial contable o notas según política interna.</p>',
      },
    ],
  },
  admin__historialcontable: {
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
    summary:
      'Datos personales, preferencias (idioma, tema), y a veces cambio de contraseña o foto.',
    roles:
      'Todos los usuarios autenticados.',
    blocks: [
      {
        id: 'datos',
        h: 'Datos y preferencias',
        html: '<ul class="mb-0"><li>Mantenga <strong>correo</strong> y <strong>teléfono</strong> actuales para notificaciones y recuperación de acceso.</li><li>El <strong>idioma</strong> afecta etiquetas de interfaz y puede alinearse con el idioma preferido guardado en servidor.</li><li>El <strong>tema</strong> claro/oscuro mejora lectura prolongada.</li></ul>',
      },
    ],
  },
  panel__soporte: {
    summary:
      'Tickets hacia el equipo de soporte del producto (Gecko): un turno de conversación por ticket hasta nueva respuesta.',
    roles:
      'Perfiles con ítem de ayuda/ticket habilitado.',
    blocks: [
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
    summary:
      'Contacto comercial con GROBO: un solo envío por correo electrónico al equipo de ventas (no es un ticket de soporte técnico).',
    roles:
      'Usuarios con el ítem Ayuda → Ventas. Requiere correo válido en Mi perfil.',
    blocks: [
      {
        id: 'proposito',
        h: 'Para qué sirve esta pantalla',
        html: '<p>Sirve para <strong>presupuestos</strong>, consultas de contratación o comentarios positivos sobre el producto. El mensaje se envía a <strong>ventas@groboapp.com</strong> con categoría <strong>venta</strong>.</p><ul class="mb-0"><li>No use esta pantalla para errores del sistema: para eso existe <strong>Ayuda → Ticket/Contacto</strong> (soporte Gecko).</li><li>Puede mencionar plazos, módulos de interés o referencia a <a href="https://groboapp.com" target="_blank" rel="noopener">groboapp.com</a>.</li></ul>',
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
    summary:
      'Esta biblioteca: manual estructurado por las mismas rutas que su menú lateral.',
    roles:
      'Quien tenga el ítem Ayuda → Capacitación.',
    blocks: [
      {
        id: 'como',
        h: 'Cómo sacarle provecho',
        html: '<ul class="mb-0"><li>Use la lista izquierda: solo aparecen temas de módulos que su rol puede abrir.</li><li>Cada tema puede desplegar <strong>apartados</strong> (acordeón): léalos en orden la primera vez.</li><li>El enlace en la barra inferior de otras pantallas lo trae directamente al tema de esa pantalla.</li><li>El buscador del navegador (Ctrl+F) ayuda dentro de un tema largo.</li></ul>',
      },
      {
        id: 'roles',
        h: 'Por qué no ve ciertos temas',
        html: '<p>Si falta una sección, no es un error: su institución no le asignó ese módulo o ese ítem de menú. Pida a administración de sede la habilitación o un usuario con más alcance.</p>',
      },
    ],
  },
  capacitacion__tema__red: {
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
};
