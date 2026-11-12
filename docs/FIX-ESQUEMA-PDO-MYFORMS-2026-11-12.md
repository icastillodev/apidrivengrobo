# GROBO — Corrección de detección de esquema en Mis Formularios

**Fecha:** 12/11/2026
**Alcance:** `UserFormsModel`. Sólo consultas de metadatos del esquema.
**Base de datos de producción:** sin migraciones, escrituras, cambios en datos, pagos ni inventario.

## Diagnóstico

Durante la prueba de integración con una instalación **MySQL 8.4 local aislada**, `PDO::ATTR_EMULATE_PREPARES=false` y registros totalmente sintéticos, se encontró un error del modelo:

- `hasTable` usaba `SHOW TABLES LIKE ?` y `hasColumn` usaba `SHOW COLUMNS FROM nombre_tabla LIKE ?`.
- En el escenario probado, las consultas `SHOW` no admitieron parámetros preparados de manera nativa. Ambas funciones capturaron la excepción y devolvieron `false` como si el esquema no incluyera las tablas o columnas.
- El primer test detectó el error: **6 formularios contra 5 esperados** en la cuenta de ensayo por no excluir una copia derivada. No se expusieron ni cambiaron registros reales.
- El alcance potencial depende del modo de preparación PDO y las características concretas de la base de producción. No se afirma que el problema ocurra en todas las sesiones en producción.

## Corrección local

- `hasTable` ahora usa `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1`.
- `hasColumn` usa `information_schema.COLUMNS` y parámetros tanto para tabla como para columna.
- Sin interpolar identificadores de origen de usuario en SQL.
- Caché de comprobaciones **por instancia PHP/request**, sin estado persistente ni cruce entre instituciones.
- Los SELECT normales, los filtros, precios y reglas de derivación se mantienen intactos.

## QA

- `tests/qa_userforms_pagination_20261112.php`: **8/8** con fixture que rechaza explícitamente `SHOW ... LIKE ?`; reproduce el fallo anterior y comprueba la ruta corregida.
- Regresión general: **96/96** fixtures PHP aprobados.
- `php -l` del modelo y de ambos tests: sin errores de sintaxis.
- `tests/qa_userforms_mysql_integration_20261112.php`: fixture sintético reproducible para MySQL 8.4 con preparación nativa, derivaciones, copias heredadas, instituciones, snapshots y saldos. **No se afirma aprobado el test completo después de la corrección**: la herramienta bloqueó la ejecución de su repetición. El fallo original sí fue observado y registrado.
- El contenedor y la red temporal de la prueba fueron detenidos y eliminados. No se usaron credenciales ni datos reales de URBE/CUPAE.

## Verificación requerida

Repetir la integración MySQL con preparación nativa y emulada en entorno autorizado y verificar listados con sesión de ensayo, incluidas derivaciones, estado y paginación. Para cualquier despliegue utilizar exclusivamente el helper controlado, respaldo previo, SHA-256 y comprobación de servicios; las pruebas sin sesión no equivalen a una validación funcional autenticada.

## Publicación controlada y controles posteriores

- **Commit:** `db56e67`; **release:** `schema-db56e67`. Sólo se publicó `api/src/Models/UserForms/UserFormsModel.php` (1 archivo PHP).
- El comprobador del manifiesto aceptó el paquete; el instalador restringido confirmó `GROBO_CONTROLLED_DEPLOY_OK`.
- **Respaldo:** `/root/grobo-managed-backup-20261112T223313Z`.
- **SHA-256 publicado:** `328035fd4ef92320e2a2df23995f17767ec971b5333a0d40a5827e15a12ee3ca`, coincidente con el paquete.
- Nginx y PHP-FPM activos; preflight JWT correcto.
- **8/8** verificaciones HTTP/navegador en producción: JS versionado, HTTP 401 sin datos en tres rutas privadas y login protegido en tres anchos.
- No se modificó la estructura de la base ni se ejecutaron operaciones de escritura.
- **Limitación persistente:** no se completó la segunda ejecución de integración MySQL con PDO nativo tras el parche ni la prueba con sesiones autorizadas de URBE y CUPAE. Mantener ambos controles en el checklist final.
