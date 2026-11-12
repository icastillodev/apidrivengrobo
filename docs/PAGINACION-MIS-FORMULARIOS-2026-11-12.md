# GROBO — Paginación efectiva de Mis Formularios

**Fecha:** 12/11/2026
**Objetivo:** evitar que la carga y la navegación inicial descarguen el historial completo.
**Alcance:** consultas personales, metadatos de filtros, navegación y CSV global.

## Implementación

- `GET /user/my-forms?paged=1&limit=12&offset=0`: obtiene el total visible y 12 IDs canónicos de `formularioe` antes de consultar precios, protocolos, departamentos, snapshots y participantes. El count se realiza con la misma regla de visibilidad que el listado legacy y JOIN a institución. El límite máximo es **100** por petición.
- En la respuesta se incluyen `data.list`, `data.total`, `data.limit` y `data.offset`. Los resultados se desduplican por ID canónico si los JOINs de protocolo/departamento multiplican registros. No se alteran valores de pagos, fechas o procedencias.
- `GET /user/my-forms?meta=1`: devuelve solamente nombres distintos de instituciones participantes y orígenes asociados a formularios visibles, para que los selectores globales no dependan de la primera página.
- `GET /user/my-forms` **sin opciones conserva** el contrato completo previo. Se utiliza **bajo demanda** para los filtros globales (texto, estado, institución, derivación, origen) hasta disponer de pruebas de equivalencia de búsqueda del servidor, especialmente snapshots originales y relaciones entre bioterios.
- El frontend usa paginación del servidor para navegar sin filtros; descarta respuestas antiguas ante cambios de búsqueda, espera 280 ms antes de consultar texto y reutiliza el historial completo sólo mientras dura esa sesión y no hay cambios de derivación.
- El Excel global obtiene **todas las páginas** por llamadas de máximo 100 formularios, aplica fechas sobre los valores finales de la ficha (incluidos snapshots) y no depende de la página o filtro activos. Se detectan fallos de API, totales cambiantes y pedidos duplicados antes de descargar.
- El endpoint obtiene `userId` e `instId` del JWT, **no acepta el identificador declarado por el cliente**. Respuestas privadas con `Cache-Control: private, no-store`; errores normalizados, sin mensajes internos.
- Se versionó el import de la pantalla a `20261112g` para evitar cargar un JS antiguo desde la CDN.

## QA y límites

- Test PHP sintético: `tests/qa_userforms_pagination_20261112.php`: aislamiento por parámetros del JWT, paginación estable, deduplicación de JOIN, preservación de saldos/exentos y filtros de instituciones.
- Test Chrome con 205 formularios sintéticos: `tests/qa_myforms_paged_browser_20261112.mjs`: primera página pequeña, segunda página, búsqueda global, filtro institucional, limpieza de filtros y exportación CSV completa.
- Carga normal reduce tamaño de transferencia de la bandeja, **pero sin mediciones p50/p95 del VPS ni de una cuenta real no se declara ganancia porcentual**.
- Los filtros complejos aún usan la consulta completa del contrato legacy cuando se activan. Siguiente fase: trasladar búsquedas a SQL después de validar todos los campos visibles, derivaciones, snapshots y equivalencia de orden.
- La exportación sigue formando el CSV en el navegador; para muchísimas filas se recomienda una ruta de streaming desde backend con snapshot/cursor y controles de visibilidad. El control de total y duplicados mitiga, no elimina totalmente las carreras de escrituras concurrentes.
- Para validar toda la UX y los datos científicos se requiere una sesión de pruebas autorizada en URBE y CUPAE; los tests sintéticos no prueban permisos y cálculos frente a datos reales.

## Resultado de pruebas locales

- Sintaxis de dos PHP: sin errores; test específico de paginación/tenancy **8/8** en PHP 8.3 con base ficticia.
- Regresión general en contenedor desconectado, volumen de sólo lectura: **96/96 fixtures PHP**.
- Chrome con 205 pedidos ficticios: **6/6**, incluida exportación completa en tres páginas y filtro entre instituciones.
- Pruebas de render/exportación preexistentes: **6/6**; exportación de bandejas administrativas: **7/7**.
- Auditoría estática: **187 JS, 84 HTML, 0 errores de sintaxis, imports o exports**.
- Se corrigió además la tabla HTML, que mostraba **10 encabezados para 13 columnas**. Ahora incluye Pagado, Falta pagar y Estado del pago, total **13 encabezados**.
- **Estado de publicación de esta tanda:** código preparado y validado localmente; pendiente de publicación verificada en el VPS. No confundir el commit con un despliegue. El bloqueo de la última operación remota impidió completar la comprobación final contra el VPS.

## Publicación confirmada posteriormente

- **Release:** `myforms-8c0791c`, **4 archivos de aplicación**.
- El helper restringido devolvió `GROBO_CONTROLLED_DEPLOY_OK`; respaldo en `/root/grobo-managed-backup-20261112T221938Z`.
- **4/4 SHA-256** de los archivos publicados coincidieron con los del paquete.
- Nginx, PHP-FPM y el preflight de JWT activos/correctos.
- Chrome de producción, sin sesión: JS versionado exacto, tres rutas privadas HTTP 401 JSON sin datos y tres resoluciones de navegador con redirección al login; **8/8 controles**.
- Las pruebas de lectura y exportación autenticada con datos institucionales de ensayo y tiempos p50/p95 de MySQL **siguen pendientes**.
