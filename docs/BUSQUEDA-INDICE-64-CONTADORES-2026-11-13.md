# GROBO — Índice documental con 64 contadores: seguridad, carga y decisión de activación

**13/11/2026. Módulo:** Mis Formularios (URBE/CUPAE).
**Estado:** diseño y código probados con MySQL 8.4 aislado. **Base productiva NO migrada; lector desactivado por defecto.**

## Motivo del cambio

La versión inicial del índice tenía **39 triggers** (INSERT/UPDATE/DELETE sobre 13 tablas) que incrementaban una sola fila `grobo_form_search_state.epoch`. Esa fila se convierte en punto de contención entre distintos investigadores cuando se escriben formularios, precios, instituciones y derivaciones.

Se sustituyó la invalidación global por la tabla `grobo_form_search_invalidation` con **64 filas** (`shard=0..63`, `epoch` creciente). Cada trigger utiliza `CRC32` del nombre de tabla y el ID del objeto para incrementar un contador concreto. Para validar la vigencia del índice, el lector calcula **SUM(epoch)** de las 64 filas: dado que los contadores solo incrementan, toda modificación confirmada aumenta esa suma, independientemente del orden de commits. El lector comprueba también que existan las 64 filas y los 39 triggers previstos.

La generación documental se construye aparte. El publicador comprueba la suma inicial y final, valida las 39 definiciones y la cobertura de todos los IDs canónicos, y publica el ID de generación de forma atómica. Cualquier escritura durante la reconstrucción fuerza un nuevo backfill en lugar de activar documentos incompletos. Cada lectura confirma la suma de nuevo al final, y si cambió vuelve a buscar con el mecanismo anterior, ya autorizado.

**Seguridad adicional:** si una fila de invalidación desaparece y luego se recupera, `UserFormsSearchIndexSchema::install` **borra la referencia a la generación publicada** antes de reconstruir la tabla de contadores. Esto evita que el restablecimiento de un contador a cero resucite un índice obsoleto.

### Compatibilidad operativa

- La migración nueva añade una tercera tabla auxiliar de 64 contadores; no cambia las tablas científicas.
- Si un entorno ya instaló la primera versión de triggers globales, esta versión no intenta sobreescribirlos silenciosamente: detecta incompatibilidad, aborta y requiere migración supervisada. **Producción no recibió la primera migración.**
- `GROBO_MYFORMS_SEARCH_INDEX=1` sigue siendo requisito explícito para utilizar el índice; si está ausente, el comportamiento de producción permanece intacto.
- El usuario MySQL que lee el índice debe poder verificar el manifiesto de triggers mediante `information_schema.TRIGGERS`. Si los permisos no permiten verlos, el lector **debe fallar cerrado** y usar la búsqueda convencional, sin conceder privilegios en forma automática.
- Se mantiene la reconstrucción por lotes de 100 documentos, bloqueo administrativo entre builders, limpieza de generaciones antiguas y purga de documentos de formularios físicamente eliminados.

## Comprobaciones realizadas

1. **Esquema documentado:** `tests/qa_search_index_schema_snapshot_20261113.php` cotejó `docs/database.sql`: **13 tablas**, todas las columnas requeridas y **39 operaciones**, sin faltantes. Es una inspección estática y **no sustituye el esquema del VPS**.
2. **MySQL 8.4 aislado:** `tests/qa_userforms_search_index_mysql_20261113.php`: **16/16 bloques**. Incluye 80 búsquedas comparadas con legacy, casos de derivación y alcance interinstitucional, 39 invalidaciones reales, concurrencia, generación incompleta y pérdida/reparación de un contador. El script solo acepta una base efímera `grobo_myforms_fixture`.
3. **Lectura productiva sin datos privados:** `grobo-status` mostró Nginx, PHP-FPM y JWT operativos. Se intentó ejecutar un preflight temporal, exclusivamente SQL de metadatos. La cuenta SSH `geckosadm` **no tiene `GROBO_SEARCH_INDEX_DSN/USER/PASSWORD` en su entorno y no puede leer el `.env` protegido**. El preflight no abrió la conexión y su script temporal se eliminó. **No hubo lecturas de datos científicos ni cambios productivos.**

## Ensayos de escritura con 500 filas ficticias (5 repeticiones por escenario)

`tests/bench_search_epoch_writes_mysql_20261113.php` realiza UPDATE autocommit sobre IDs diferentes de formularios. Incluye procesos independientes que comparten MySQL, pero **no** tráfico institucional ni tiempos del VPS. Los resultados varían entre ejecuciones por carga del equipo.

| Escenario | Sin triggers, p50 | Con versión global, p50 | Con 64 contadores, p50 |
|---|---:|---:|---:|
| 1 escritor, 500 updates | 207,18 ms (global) / 191,06 ms (shards) | 210,59 ms | 197,61 ms |
| 2 escritores, 500 updates | 202,62 ms (global) / 101,54 ms (shards) | 123,52 ms | 120,01 ms |
| 8 escritores, 480 updates | 88,76 ms (global) / **64,33 ms** (shards) | **136,88 ms** | **92,87 ms** |

En la pasada con 64 contadores y ocho procesos, el p50 aumentó **aprox. 44 %** frente al escenario sin triggers de esa misma pasada. El throughput estimado cayó de **7.462 a 5.169 updates/segundo** bajo ese fixture. No sería correcto atribuir una mejora exacta entre la versión global y la versión distribuida, porque sus cifras vienen de ejecuciones diferentes.

## Ensayo de búsqueda con 5.007 documentos ficticios

`tests/bench_userforms_search_index_mysql_20261113.php`, reconstrucción de **700,07 ms** y **11 muestras** por consulta:

| Búsqueda | Sin índice p50 | Índice p50 |
|---|---:|---:|
| Texto de ID | 66,95 ms | **14,34 ms** |
| Sin coincidencias | 68,05 ms | **12,39 ms** |
| Protocolo original derivado | 64,86 ms | **14,22 ms** |
| Institución masiva (4.005 coincidencias) | 69,27 ms | 79,97 ms |

Las búsquedas muy amplias vuelven al contrato anterior. El índice es eficaz para consultas selectivas, pero el costo de los triggers **aún no está justificado** para instalarse sin pruebas representativas de escrituras.

## Decisión de despliegue: NO-GO para activar la migración productiva

**Condiciones que faltan:**

- Una conexión de mantenimiento **autorizada y auditada** para `--preflight` de la estructura real. No publicar ni extraer contraseñas; ofrecer un acceso temporal de solo lectura a `information_schema` o un helper restrictivo aprobado por el administrador del VPS.
- Copia/restauración verificada de la base, incluyendo `DEFINER`, permisos `TRIGGER` y triggers preexistentes.
- Ensayo de carga con una distribución representativa de escrituras reales de URBE/CUPAE, incluyendo concurrencia, p95 y tasa de errores/deadlocks. Definir un límite aceptable de degradación **antes de habilitar**.
- Cuentas de ensayo institucionales autorizadas para verificar derivaciones, estados, carteras, búsqueda y tiempos privados.
- Política aprobada de reconstrucción y borrado de texto indexado; definir intervalos de actualización/TTL y pruebas de recuperación.

**Hasta cumplir esas condiciones, mantener `GROBO_MYFORMS_SEARCH_INDEX` desactivado y no ejecutar `--migrate` en producción.** La versión anterior de búsqueda permanece íntegra y funcional.

## Reversión propuesta si se habilita en una ventana futura

1. Desactivar la variable de PHP-FPM y detener reconstrucciones programadas.
2. Confirmar que la API responde consultas con el buscador original y permisos JWT.
3. En mantenimiento aprobado, invalidar publicación y retirar triggers auxiliares. Respaldar antes de cualquier DROP y limpiar datos duplicados del índice según la política institucional.
4. Verificar restauración, uso de disco, integridad de formularios y funciones de facturación/derivación.
