# GROBO — Índice documental de búsqueda libre en Mis Formularios

**13/11/2026 — versión de preparación y QA, NO migración productiva.**

## Alcance

Se implementó un **índice materializado optativo** para acelerar las búsquedas libres por fragmento de texto sin cambiar lo que cuenta como coincidencia. El índice conserva exactamente `UserFormsFilterService::searchText`: incluye datos originales de los formularios derivados, participantes, nombres de instituciones y campos que afectan a la pantalla; usa el mismo `mb_strtolower`.

No usa `FULLTEXT` por tokens porque no equivale a `str_contains` para cadenas de pocos caracteres, fragmentos, signos o nombres específicos. Guarda la cadena resultante en una tabla auxiliar con colación binaria `utf8mb4_bin`; la consulta de búsqueda usa `LOCATE` y **luego aplica otra vez el filtro original sobre las fichas completas**, siempre con `WHERE` JWT y sin copiar permisos desde el índice.

## Arquitectura implementada

- `api/src/Models/UserForms/UserFormsSearchIndexSchema.php`: migración explícita de dos tablas auxiliares (`grobo_form_search_state` y `grobo_form_search_document`) y **39 triggers** (`INSERT`, `UPDATE` y `DELETE` en 13 tablas fuente). Comprueba tablas y columnas requeridas antes de crear nada. Valida número, tabla origen, evento y contenido de todos los triggers.
- `api/src/Models/UserForms/UserFormsSearchIndexStore.php`: SQL de persistencia, estado y publicación atómica. El contador global `epoch` aumenta en cualquier escritura relevante; un `published_epoch` diferente obliga a usar la búsqueda legacy.
- `api/src/Services/UserForms/UserFormsSearchIndexBuilder.php`: backfill del contenido efectivo de cada ficha canónica, de 100 en 100, desde el mismo modelo que utiliza el investigador. Construye una generación nueva con ID aleatorio, verifica la **cobertura exacta** de todas las fichas canónicas y, solo si el contador no cambió durante el proceso, publica la generación con una transacción corta que bloquea la fila del contador.
- `api/src/Models/UserForms/UserFormsModel.php`: nueva consulta opcional de hasta 500 IDs candidatos, con los filtros de visibilidad de usuario e institución originales. Siempre valida que el índice esté vigente, completo y con los 39 disparadores presentes.
- `api/src/Services/UserForms/UserFormsFilterService.php`: consulta el índice solo si está habilitado; hidrata como máximo lotes de 100 IDs y aplica nuevamente los filtros. Vuelve a comprobar la generación/epoch **después** de cargar los resultados; si cambió, recurre al contrato completo para evitar falsos negativos por un índice antiguo.
- `scripts/grobo-search-index.php`: utilidad CLI para inspección, migración explícita, reconstrucción, desactivación o limpieza de generaciones obsoletas. Las operaciones que escriben exigen la variable `GROBO_SEARCH_INDEX_APPROVED=yes`.
- **Activación del lector:** `GROBO_MYFORMS_SEARCH_INDEX=1` en el proceso PHP-FPM; está **desactivado por defecto**. Si faltan tablas, triggers, generación, vigencia o cobertura, se ejecuta el buscador anterior.

### Fuentes cubiertas por los 39 triggers

`formularioe`, `formulario_derivacion`, `formulario_owner_actual`, `formulario_datos_originales`, `tipoformularios`, `precioformulario`, `precioinsumosformulario`, `protformr`, `protocoloexpe`, `protdeptor`, `departamentoe`, `organismoe` e `institucion`.

**Advertencia operativa:** el índice queda desactivado automáticamente después de cualquier modificación relevante y requiere otro backfill para recuperarse. No se agregaron workers, cron ni modificaciones al sistema de escrituras productivo. Una institución con muchas escrituras puede pasar la mayor parte del tiempo usando el buscador anterior. El contador global puede introducir contención al escribir; hay que medirla antes de instalar los triggers en producción.

## QA aislado con MySQL 8.4

- `tests/qa_userforms_search_index_mysql_20261113.php`: **11/11 bloques**, incluyendo 80 búsquedas equivalentes a legacy en cinco pares de usuario/institución ficticios; coincidencias con snapshots, minúsculas, fragmentos, flecha, símbolos y Unicode.
- Verificó propietario, receptor, colega institucional y tercero ajeno: **ninguna consulta del índice puede reemplazar el WHERE del usuario**.
- Se validó el recuento exacto de documentos y una publicación atómica; una mutación de precio o snapshot invalida la generación antes de volver a responder.
- Se provocó una escritura concurrente: la publicación de una generación desfasada fue rechazada. Se eliminó a propósito un trigger y el lector volvió al método anterior; una reinstalación recuperó el esquema.
- Se ejecutaron **las 39 operaciones de prueba** (tres por tabla) y se comprobó el aumento del contador para cada una.
- La suite que simula MySQL nativo, PDO con parámetros, aislamiento y derivaciones no se modificó.
- No se usaron registros ni credenciales reales de URBE o CUPAE.

### Benchmark local

Con **5.007 documentos** indexados y 11 muestras por modalidad (PHP + MySQL en Docker local; no VPS):

| Búsqueda | Legacy p50 | Índice p50 | Legacy p95 | Índice p95 |
|---|---:|---:|---:|---:|
| Texto de ID `20001` | 104,42 ms | **25,16 ms** | 120,04 ms | 30,75 ms |
| Sin coincidencias | 81,37 ms | **18,93 ms** | 121,75 ms | 24,65 ms |
| Protocolo original | 84,05 ms | **23,35 ms** | 107,96 ms | 42,01 ms |
| Institución URBE (4.005 coincidencias) | 83,93 ms | 99,70 ms | 145,22 ms | 129,49 ms |

Construcción sintética de 5.007 documentos: **4.194 ms**. El lector limita los candidatos a 500; en la búsqueda masiva se vuelve a usar legacy. Son cifras experimentales; **no** extrapolar velocidades o mejoras porcentuales a datos institucionales.

## Despliegue propuesto, NO ejecutado en producción

1. Hacer respaldo verificado de base de datos, triggers y definers. Probar recuperación en una copia. Revisar los **privilegios `TRIGGER`** y un definer estable que no caduque.
2. Confirmar que la estructura MySQL real coincide con `docs/database.sql`, los 13 orígenes y las columnas requeridas. Ejecutar primero `php scripts/grobo-search-index.php --status` con un DSN explícito de **pruebas**.
3. En una réplica o staging con datos anonimizados, aplicar la migración de tablas+triggers, medir bloqueo y rendimiento de escrituras, validar aislamiento y permisos autenticados. **La instalación aún no se ha probado contra el esquema real del VPS.**
4. Ejecutar el backfill manual; si hay escrituras concurrentes, la publicación falla correctamente. Preparar un cron de reconstrucción con cadencia y límites acordados después de medir carga.
5. Activar **solo después** la variable `GROBO_MYFORMS_SEARCH_INDEX=1` en PHP-FPM y comprobar búsquedas autenticadas de URBE/CUPAE, estado del índice, resultados, métricas p50/p95 y uso de disco.
6. Para volver atrás sin tocar datos científicos: desactivar primero la flag PHP-FPM, usar `--disable` y comprobar que todas las búsquedas vuelven al modo anterior. Retirar triggers y tablas auxiliares únicamente en mantenimiento controlado, tras respaldos.

El CLI no usa credenciales en el repositorio; recibe por variables privadas `GROBO_SEARCH_INDEX_DSN`, `GROBO_SEARCH_INDEX_USER`, `GROBO_SEARCH_INDEX_PASSWORD`. `--migrate`, `--rebuild`, `--disable` y `--purge` exigen `GROBO_SEARCH_INDEX_APPROVED=yes`. No ejecutar estos comandos sobre producción sin una aprobación y ventana de cambio específica.

**Limitaciones:** `TRUNCATE` y ciertos restores de administrador no disparan triggers; ante mantenimientos que alteren tablas, deshabilitar el índice antes y reconstruirlo después. La cobertura de fuentes debe ampliarse si la proyección de Mis Formularios añade más tablas o campos. El texto libre con miles de coincidencias conserva el modo anterior para evitar resultados incompletos. La seguridad interinstitucional en producción requiere QA autenticado autorizado.

## Privacidad, limpieza y permisos de MySQL

- El trigger especial `grobo_fs_fo_ad` sobre `formularioe` hace dos cosas en el mismo `AFTER DELETE`: aumenta el epoch y borra de `grobo_form_search_document` **todas las generaciones** del formulario físicamente eliminado.
- Tras una reconstrucción publicable, `UserFormsSearchIndexBuilder` llama a `purgeOldGenerations()`. Las generaciones anteriores, que pueden contener datos antiguos de contactos o importes, se eliminan; las lecturas concurrentes que observan un cambio de generación se descartan y vuelven al contrato legacy.
- La eliminación de contenido de documentos de otras tablas (por ejemplo, una corrección de nombre sin borrar el formulario) invalida el índice, pero la copia histórica permanece hasta la **próxima reconstrucción exitosa**. Por lo tanto, antes de un despliegue real hay que definir cadencia de reconstrucción y retención de datos conforme a la política institucional.
- Los borrados en cascada vía claves foráneas pueden no invocar triggers de la tabla hija en MySQL. Ante una purga institucional o restauración, **desactivar y reconstruir** el índice, limpiar generaciones antiguas y comprobar la cobertura; no considerar los triggers suficientes para cualquier modalidad de borrado administrativo.
- El lector verifica el manifiesto completo desde `information_schema.TRIGGERS`. Un usuario MySQL de aplicación sin permiso de visibilidad sobre triggers puede ver el índice como no disponible; en ese caso vuelve al modo anterior. **No ampliar privilegios del usuario web sin una revisión de seguridad**. Alternativamente se puede evaluar un preflight firmado y verificable por un componente de mantenimiento.
- Esta preparación no modifica respaldos existentes ni políticas de conservación de información sensible. Las tablas de búsqueda deben entrar en el inventario de datos personales si se instalan.

## Estado comprobado del despliegue de código

- **Commit de implementación:** `3893f31` en la rama `fix/grobo-seguridad-facturacion-20261102`, confirmado en GitHub.
- **Release de código PHP únicamente:** `myforms-docindex-code-3893f31`. El despliegue restringido autorizó exactamente **cinco archivos**: modelo personal, servicio de filtrado, esquema auxiliar, almacén del índice y constructor del índice.
- Verificación del manifiesto: `GROBO_MANIFEST_OK version=myforms-docindex-code-3893f31 files=5`.
- Publicación: `GROBO_CONTROLLED_DEPLOY_OK version=myforms-docindex-code-3893f31 files=5`. **Respaldo:** `/root/grobo-managed-backup-20261113T034701Z`.
- **5/5 hashes SHA-256 coincidentes**, comparados contra los archivos instalados en el VPS. Nginx y PHP-FPM activos, preflight JWT correcto.
- Chrome en la web pública, sin sesión: **10/10 comprobaciones aprobadas**, incluyendo las cinco rutas privadas protegidas con HTTP 401, integridad del JavaScript y redirecciones al login para 390/768/1366 px.
- **No se migró MySQL de producción.** No se crearon `grobo_form_search_state`, `grobo_form_search_document` ni sus 39 triggers en producción. No se activó la variable `GROBO_MYFORMS_SEARCH_INDEX`; el lector de documentos sigue **desactivado por defecto**.
- Suite aislada: **11/11 bloques del índice**, con 80 consultas de equivalencia, 39 invalidaciones DML y purga de documentos de formularios borrados; **96/96 fixtures PHP generales**, **16/16 Chrome sintético** y **6/6 pruebas de render/PDF**. Se retiraron el contenedor MySQL efímero y su red interna al terminar.
- El comando CLI de mantenimiento quedó creado y pasó revisión sintáctica, pero **no se ejecutó separadamente en el VPS**. La migración y el constructor sí se ejercitaron por sus clases directamente con datos ficticios en MySQL 8.4.
- Pendiente de activación: aprobar migración con backups/definers y prueba de carga de escrituras sobre un staging representativo, validar sesiones institucionales autorizadas, definir retención/cron de reconstrucción y medir `Server-Timing` real. Hasta entonces, no afirmar que la mejora de búsqueda libre del benchmark esté activa para usuarios de producción.
