# GROBO — Filtros globales de Mis Formularios en el servidor

**Fecha:** 12/11/2026. **Alcance:** formularios personales del investigador, filtros y búsqueda global. No incluye escritura en base de datos ni cambios de stock, pagos o protocolos.

## Problema anterior

El modo de paginación normal cargaba 12 formularios y era rápido, pero al aplicar cualquier filtro (texto, estado, institución, derivación, institución origen) el navegador llamaba al contrato legacy `GET /user/my-forms` y recibía **todos los objetos**, incluso los de otras páginas.

La búsqueda original recorría recursivamente todas las propiedades del objeto recibido, incluidos participantes de derivaciones y campos restaurados de snapshots. Reducirlo a `LIKE` en una sola columna SQL produciría falsos negativos.

## Implementación

- Nueva modalidad opcional del endpoint existente: `GET /user/my-forms?filtered=1&limit=12&offset=0&search=...&status=...&inst_name=...&derivation=...&origin_inst=...`.
- El controlador recibe **userId e instId exclusivamente del JWT validado**. No admite scope de institución ni usuario impuesto por el cliente. Validación de tamaño/valores, parámetros arrays rechazados y paginación limitada a 100.
- `UserFormsFilterService` obtiene los formularios ya autorizados por `UserFormsModel`; aplica el predicado equivalente al del navegador sobre **todos los campos finales**, incluidas instituciones participantes, valores de factura y datos restaurados de snapshots. Mantiene el orden descendente de IDs canónicos.
- El servidor responde **solamente la página filtrada** y metadatos `total`, `limit`, `offset`. El navegador no baja el historial completo cuando aplica filtros, no almacena miles de registros y sólo pinta 12 filas.
- La interfaz muestra estado vacío comprensible, usa retardo de búsqueda de 280 ms, ignora respuestas antiguas y permite paginar por cualquier combinación de filtros.
- Se corrigió una inconsistencia: **“Sin estado”** ahora exige que ningún estado significativo esté definido; anteriormente los formularios con estado normal pero sin columnas extra de derivación podían aparecer erróneamente.
- El contrato legacy (sin `filtered` ni `paged`) y el paginado anterior permanecen. Si se conecta a un backend viejo que devuelve un listado `success` sin el campo `total`, el frontend conserva el mecanismo histórico como respaldo. **Nunca** hace fallback de historial ante errores de permiso o API.
- La página importa `misformularios.js?v=20261112i` para invalidar versiones antiguas de CDN.

## Validaciones

- `tests/qa_userforms_filter_mysql_20261112.php`: **7/7 bloques** en MySQL 8.4 aislado con datos ficticios. Incluye nombres de participantes, estados, búsquedas por texto y protocolo original, derivaciones, scope interinstitucional, filtros simultáneos, páginas vacías, parámetros inválidos y “Sin estado”.
- `tests/qa_userforms_mysql_integration_20261112.php`: **6/6** bloques de integración original.
- `tests/qa_myforms_paged_browser_20261112.mjs`: **13/13** escenarios de Chrome con 205 formularios sintéticos: búsqueda remota, paginación de 41 coincidencias, estado/origen/derivación combinados, CSV, respuesta 403 sin fallback, soporte para backend antiguo, borrado de filtros y mensaje de búsqueda sin resultados.
- Pruebas de regresión general PHP, CSV y auditoría JS deben registrarse al ejecutar esta versión.

## Benchmark con MySQL 8.4 sintético

Se partió de una base temporal con **5.000 formularios adicionales** y los registros del fixture; no son tiempos de producción. Backend PHP y MySQL se ejecutaron localmente en red Docker interna sin datos reales.

| Búsqueda | Muestras | p50 | p95 | JSON recibido por navegador |
|---|---:|---:|---:|---:|
| ID `20001` (1 resultado) | 11 | 178,62 ms | 255,56 ms | 824 bytes |
| Estado Proceso (2.669 coincidencias) | 11 | 153,56 ms | 199,15 ms | 8.494 bytes |
| Institución URBE (4.006 coincidencias) | 11 | 178,56 ms | 255,50 ms | 8.502 bytes |
| Texto sin coincidencias | 11 | 254,83 ms | 314,74 ms | 128 bytes |

**Interpretación prudente:** mejora muy importante de bytes transmitidos y memoria del navegador, pero **la consulta MySQL actual todavía recorre el historial completo autorizado en el servidor** y filtra los objetos en PHP. No se debe afirmar que el motor SQL, ni el p50/p95 de producción, ya esté optimizado. Próxima fase técnica: construir una ruta SQL selectiva verificable con las reglas de snapshots y participantes, sin falsos negativos. No añadir índices ni migraciones a producción sin plan y `EXPLAIN` previo.

## Pendiente institucional

Con cuentas de ensayo autorizadas de URBE y CUPAE: verificar búsquedas contra registros reales, rol investigador, derivaciones activas/antiguas, estados, cambios concurrentes y p50/p95 de `Server-Timing: user-forms-db`. **No se accedió a datos científicos, inventario o cobros de producción en estas pruebas.**

## Regresiones generales completadas

- `sh tests/run_grobo_qa.sh`: **96/96** fixtures PHP, incluidas autorizaciones entre tenants, JWT, facturación, protocolos, reservas y configuración.
- `tests/qa_userforms_pagination_20261112.php`: **8/8**.
- `tests/qa_myforms_render_export_20261112.mjs`: **6/6**.
- `tests/qa_paged_csv_export_20261112.mjs`: **7/7**.
- `tests/qa_myforms_paged_browser_20261112.mjs`: **13/13**.
- Auditoría de JavaScript/HTML: **187 JS y 84 HTML**, sin errores de sintaxis/imports/exports.
- Auditoría estructural: sin nuevas referencias rotas, HTML inválido ni IDs duplicados. Persiste la deuda anterior de etiquetas accesibles en otros formularios.
- `git diff --check`: sin errores nuevos.
- Entorno MySQL de prueba desmontado al finalizar.
