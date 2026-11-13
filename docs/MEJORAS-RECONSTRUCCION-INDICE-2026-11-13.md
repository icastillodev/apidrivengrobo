# GROBO — Endurecimiento y optimización de reconstrucción de índice

**Fecha:** 13/11/2026.
**Alcance:** código preparatorio del índice documental de Mis Formularios. No incluye migraciones, scripts DDL ejecutados ni cambios al comportamiento por defecto de producción.

## Cambios implementados

### 1. Reconstrucción más económica

- `UserFormsSearchIndexStore::writeDocumentsBatch` inserta **hasta 100 fichas por statement preparado** (`generation,idformA,text_flat`). Reduce el número de inserciones individuales y viajes a MySQL; mantiene parámetros PDO nativos y validación estricta de IDs/generación.
- `UserFormsSearchIndexBuilder` acumula como máximo 100 documentos por lote y mantiene la misma validación de cobertura canónica antes de publicar la generación.
- No se reporta una aceleración de porcentaje numérico de esta tanda hasta comparar un benchmark reproducible, en la misma infraestructura y con la misma carga.

### 2. Concurrencia, fallos y privacidad

- `acquireRebuildLock` usa `GET_LOCK` de MySQL con un nombre determinístico derivado de `DATABASE()`. Impide dos reconstrucciones simultáneas que consuman CPU/disco y genera un error explícito si otra conexión ya está construyendo el índice.
- El builder utiliza `try/catch/finally` para liberar siempre el bloqueo. Si falla antes de publicar, `discardUnpublishedGeneration` borra **sólo** los documentos de esa generación, sin afectar la publicada.
- `purgeOldGenerations` elimina las copias antiguas en transacciones de **hasta 500 filas**, y recorre lotes hasta completar la purga. El objetivo es acotar el tiempo de bloqueo por sentencia.
- Las operaciones CLI `--migrate`, `--disable` y `--purge` usan el mismo bloqueo de reconstrucción. `--rebuild` lo adquiere desde el builder. El modo de desactivación continúa exigiendo aprobación y debe acompañarse de detener el cron antes de desactivar definitivamente.
- Se mantiene el conteo global `epoch` de 39 triggers, publicación atómica y la búsqueda legacy si una fuente cambia o se pierde una invalidación. Esto **no soluciona** la contención sobre la fila epoch en un sistema de escrituras intensivas; hay que medirla.

### 3. Preflight sin escrituras

Se incorporó el comando CLI:

```bash
php scripts/grobo-search-index.php --preflight
```

Requiere DSN, usuario y contraseña desde variables de entorno privadas, como el resto del CLI. **No exige `GROBO_SEARCH_INDEX_APPROVED`**, porque realiza solamente `SELECT` sobre `information_schema`. Compara las 13 tablas fuente, columnas indispensables, manifest de 39 triggers y presencia de tablas auxiliares, y devuelve `schema_compatible`, `missing_tables`, `missing_columns`, `trigger_conflicts` y conteos. Finaliza con código 3 si la estructura no es compatible.

El preflight **no** confirma privilegios `TRIGGER`, el estado de los backups ni la seguridad de aplicar DDL sobre un VPS real. Su resultado es una condición necesaria, no una autorización para migrar.

## QA y alcance

- MySQL 8.4 aislado + PDO nativo: **15/15** controles específicos en `tests/qa_userforms_search_index_mysql_20261113.php`. Incluye:
  - Igualdad de 80 búsquedas con legacy y aislamiento entre instituciones
  - 39 invalidaciones DML, invalidación concurrente, borrado de fichas
  - Dos conexiones que intentan reconstruir simultáneamente
  - Escritura de lotes <=100 y rechazo de 101
  - Descarte seguro e idempotente de una generación fallida
  - Purga de **1.120 documentos** en lotes de 500, sin borrar la generación vigente
  - Preflight sano, 1 trigger perdido, columna obligatoria faltante y tabla fuente ausente
- PHP lint del builder, store, esquema y CLI: correcto.
- Suite PHP general y auditoría de navegador: ejecutar tras esta tanda y registrar abajo.

## Pendientes y restricciones

- La función `GROBO_MYFORMS_SEARCH_INDEX` está **apagada por defecto**. No instalar tablas/triggers de búsqueda en la base institucional sin preflight sobre la estructura real, respaldo y ventana de mantenimiento.
- Verificar antes de habilitar cron cómo afecta el contador global `epoch` a transacciones con muchos formularios, precios o derivaciones. `GET_LOCK` solo serializa builders; no reduce esa contención.
- El backfill aún realiza la lectura original por usuario/fragmentos y su memoria guarda IDs vistos; para volúmenes extraordinarios convendría analizar un recorrido canónico por keyset y capacidad incremental, sin cambiar las reglas de visibilidad.
- La limpieza de una generación fallida puede fallar si se corta abruptamente el proceso. Una reconstrucción posterior exitosa ejecutará la purga de generaciones anteriores; el operador puede usar `--purge` en modo mantenimiento con aprobación.
- No hay QA autenticado con cuentas reales de ensayo de URBE/CUPAE ni métricas de rendimiento privado del VPS. No reclamar equivalencia institucional definitiva sin esas pruebas.

## Verificaciones completadas y modo de publicación

- MySQL 8.4 aislado, con PDO nativo: **15/15 controles de índice aprobados**, incluyendo 80 búsquedas de equivalencia, bloqueos de dos sesiones, 39 triggers, descarte de generación fallida, limpieza de 1120 documentos en lotes y detección por preflight de tablas y columnas eliminadas.
- CLI `--preflight` ejecutado en una base sintética: `schema_compatible=true`, `missing_tables=[]`, `missing_columns=[]`, 39 triggers esperados y 39 presentes. La consulta fue solo de metadatos.
- Regresión PHP de GROBO **96/96**, paginación **8/8**. Navegador ficticio **16/16**. Auditoría JS/HTML: 187/84 archivos, cero errores de sintaxis, imports o exports.
- `php -l` sin errores en las clases de esquema, store, builder, script CLI y test. `git diff --check` sin errores tras normalizar el final del archivo de QA.
- El despliegue de este parche, si se hace, debe incluir **únicamente** las tres clases PHP de esquema, store y builder. El script CLI nuevo queda disponible en GitHub, pero no se habilitará una migración desde la aplicación web.
- El valor productivo `GROBO_MYFORMS_SEARCH_INDEX` continúa sin habilitarse. Ninguna de estas mejoras justifica por sí sola aplicar los 39 triggers sobre la base real sin comprobar privilegios, definers, impacto en transacciones y plan de reversión.

## Publicación de código y verificación (13/11/2026)

- **Commit funcional:** `d7173ca`, rama `fix/grobo-seguridad-facturacion-20261102`, sincronizado en GitHub.
- **Release de 3 clases PHP:** `myforms-index-rebuild-d7173ca`. Únicos archivos: `UserFormsSearchIndexSchema.php`, `UserFormsSearchIndexStore.php`, `UserFormsSearchIndexBuilder.php`.
- Despliegue autorizado: `GROBO_MANIFEST_OK version=myforms-index-rebuild-d7173ca files=3` y `GROBO_CONTROLLED_DEPLOY_OK`.
- **Respaldo:** `/root/grobo-managed-backup-20261113T040347Z`.
- Revisión en el VPS: **3/3 hashes SHA-256 correctos**; Nginx y PHP-FPM 8.3 activos; preflight de JWT y multitenencia correctos.
- Chrome público sin sesión: **10/10 controles**, HTML/JS vigente sin modificación, cinco rutas privadas responden HTTP 401 sin exponer datos y redirecciones de login en móvil, tablet y escritorio.
- **No se ejecutó ninguna migración, actualización de triggers ni backfill en la base productiva.** `GROBO_MYFORMS_SEARCH_INDEX` continúa apagado por defecto.
- El CLI `scripts/grobo-search-index.php` actualizado (incluido `--preflight`) se encuentra en GitHub, **no** en el paquete PHP de producción. Para usarlo en una ventana de mantenimiento habrá que desplegarlo por un procedimiento administrativo separado.
- QA aislado: **15/15 pruebas MySQL** del índice; suite general **96/96 PHP**, pruebas de navegador **16/16**, auditoría JS/HTML sin errores y **8/8** paginación personal. Contenedor y red de MySQL sintético eliminados al finalizar.
- Continúa pendiente: preflight de la estructura real mediante acceso de mantenimiento autorizado, backups comprobados, medida de contención de `epoch`, QA autenticado de instituciones de ensayo y aprobación separada para instalar 39 triggers. No atribuir a los usuarios de producción una aceleración de búsqueda libre que todavía no está activa.
