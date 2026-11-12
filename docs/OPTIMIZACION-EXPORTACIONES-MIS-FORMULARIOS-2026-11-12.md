# GROBO — Continuación de rendimiento: Mis Formularios y exportaciones

**Fecha:** 2026-11-12
**Alcance:** interfaz personal de Mis Formularios y CSV administrativo de Animales, Reactivos e Insumos.
**Protección:** sin cambios de base de datos, saldos, stock, fórmulas científicas, permisos ni movimientos reales.

## Qué cambió

### Mis Formularios
- La dependencia `html2pdf` deja de descargarse al entrar en la página: se solicita sólo al descargar una ficha y se comparte la petición simultánea. Si falla la carga se permite reintentar.
- Se espera la generación del PDF para cerrar correctamente el aviso de progreso y se muestran errores si no se puede obtener la ficha.
- Se escapan los campos procedentes del servidor antes de interpolarlos en tablas y en la ficha PDF.
- El buscador guarda temporalmente el texto indexado por objeto en una `WeakMap`, para no volver a recorrer las propiedades al filtrar el mismo listado.
- Las filas se insertan mediante `DocumentFragment`; no cambia el diseño ni el número de filas por página.
- El CSV personal protege contra fórmulas de hojas de cálculo y escapado incorrecto de comillas y punto y coma. Se eliminan fechas codificadas mediante expresiones `="..."` que Excel podría evaluar.

### Animales, Reactivos e Insumos
- Exportación CSV por solicitudes autenticadas de **500 filas** en lugar de descargar sólo las primeras 8.000 o 10.000.
- Se fija orden `idformA ASC` durante la exportación; conserva institución, búsquedas y otros filtros existentes. Animales también aplica el rango de fechas en la API; Reactivos e Insumos conservan su filtro de fechas sobre las filas descargadas.
- Se valida el total informado por la API y se descarta la exportación si hay una página incompleta, un identificador repetido, un cambio del total o error de autorización. Así se evitan archivos silenciosamente truncados.
- CSV con comillas correctas, control de fórmulas maliciosas y nombre de archivo normalizado.
- No se elimina ni sustituye ninguna operación de escritura: sólo lecturas y descargas.

## Comprobaciones locales
- `node tests/qa_myforms_render_export_20261112.mjs`: **6/6** pruebas (carga diferida/reintento PDF, caché, CSV, escapado y renderizado).
- `node tests/qa_paged_csv_export_20261112.mjs`: **7/7** pruebas (tres módulos, 1.205 filas, vacíos, páginas truncadas, cambios de total, duplicados, permisos y seguridad CSV).
- `node tests/qa_forms_reference_cache_20261112.mjs`: **6/6**.
- `node tools/audit-grobo-functional-mocks.mjs`: **12/12**.
- `node tools/audit-grobo-js-modules.mjs`: **187 JS y 84 HTML; 0 errores de sintaxis/importación/exports**.
- `node tools/audit-grobo-structure.mjs`: sin nuevas referencias rotas, IDs duplicados ni errores HTML. Conserva una deuda previa de etiquetado accesible en otras páginas.
- `git diff --check`: sin problemas en el cambio.

## Límites y QA pendiente
- No se usaron datos reales de URBE/CUPAE: la equivalencia de resultados con bases de producción y los tiempos p50/p95 se deben medir con cuentas institucionales de ensayo y consultas de sólo lectura.
- La descarga consume las respuestas por páginas pero **aún construye el CSV en el navegador** y conserva las filas necesarias en memoria. Para cientos de miles de registros, preferir CSV streaming desde una ruta autenticada con filtros y validación del ámbito institucional.
- La página personal `/user/my-forms` sigue recibiendo el historial completo: la paginación del servidor debe implementarse con cuidado para mantener filtros globales, derivaciones, exportaciones e instituciones participantes.
- Si el listado cambia mientras se exporta y el total no cambia, puede requerirse un snapshot o paginación por cursor para garantía transaccional fuerte; el control de ID repetido mitiga, pero no elimina por completo esta carrera.
- La prueba de navegador autenticado, móvil/tablet/escritorio, PDF con datos representativos y exportaciones largas reales sigue pendiente antes de dar por cerrado el QA operativo.
- Un commit local no implica despliegue: confirmar la instalación remota mediante manifiesto SHA-256, respaldos y verificaciones públicas/privadas.

## Publicación controlada y verificación (12/11/2026)

- Commit de aplicación y pruebas: `f9aaafd`, rama `fix/grobo-seguridad-facturacion-20261102`.
- Paquete `forms-export-f9aaafd`: **9 archivos de aplicación**, sin cambios PHP/SQL/configuración del servidor.
- `grobo-deploy-check`: manifiesto SHA-256 aceptado con 9 archivos.
- `grobo-deploy-apply`: `GROBO_CONTROLLED_DEPLOY_OK`; respaldo privado en `/root/grobo-managed-backup-20261112T183601Z`.
- Relectura de los archivos instalados desde el VPS y comparación con el manifiesto: **9/9 hashes coincidentes**.
- PHP-FPM y Nginx activos; verificación JWT aprobada.
- Comprobación HTTP desde Chrome: **5 JS accesibles (HTTP 200 y SHA coincidente con URL versionada)** y **4 HTML accesibles (HTTP 200, referencia a la versión `20261112f` presente)**.
- Chrome sin sesión: **12/12** pruebas de acceso a Animales, Reactivos, Insumos y Mis Formularios a anchos **390/768/1366 px**: redirección al login de URBE, sin errores JavaScript ni desbordes horizontales observados.
- Durante el smoke inicial, la URL sin versión de `misformularios.js` llegó desde una **copia antigua en caché CDN** (`CF-Cache-Status: HIT`, `Cache-Control: max-age=14400`). La versión referenciada desde el HTML (`?v=20261112f`) entregó el código nuevo y hash correcto. La igualdad de bytes no se exige a los HTML, pues el servidor/CDN los sirve con modificaciones dinámicas; se validó la versión importada y la carga real.
- Sin cuentas institucionales autorizadas no se ejecutaron pedidos ni cobros ni se comprobó Excel/PDF con información de producción. La publicación y el smoke **no sustituyen** ese QA funcional.
