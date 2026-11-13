# GROBO — Historiales grandes de Mis Formularios: memoria y lotes SQL

**Fecha:** 13/11/2026 · **Componente:** `UserFormsModel::getAllForms`
**Tipo de cambio:** mejora de lectura sin migración ni escritura institucional.

## Problema y modificación

El SELECT principal une formularios con protocolos y departamentos. Si un protocolo tiene varias entradas de `protdeptor`, una ficha canónica puede aparecer varias veces. El modelo anterior ejecutaba `fetchAll(PDO::FETCH_ASSOC)` y creaba una segunda lista de filas para quedarse con la primera coincidencia de cada `idformA`. Eso multiplicaba la memoria temporal durante las búsquedas de texto libre y las exportaciones grandes.

**Implementación:**
- Usar `fetch(PDO::FETCH_ASSOC)` dentro de un `while`, con el mismo `seen[idformA]` y el mismo orden `ORDER BY f.idformA DESC`. La primera fila de cada ficha sigue siendo la seleccionada. No se altera la consulta SQL, ni los datos calculados ni la autorización de usuario/institución.
- Cerrar el cursor explícitamente no es necesario después de consumirlo; el modelo mantiene compatibilidad con los dobles PDO de QA.
- Fraccionar `getOriginalRowDataMap` en lotes de **400 IDs** de derivados, evitando consultas con enormes listas `IN` a medida que crece el historial.
- Para participantes, conservar la llamada agregada existente para **hasta 12.000 fichas**. En historiales mayores, dividir IDs en lotes de **2.000**: como la consulta puede usar el mismo listado dos veces (`idformA`/`idformAOrigen`), cada lote se mantiene muy lejos del máximo de marcadores de PDO/MySQL. Todos los IDs continúan bajo el `WHERE` de usuario/institución del modelo principal.
- No se cambia ninguna estructura de BD ni se instala o habilita el índice textual experimental.

## Bench de deduplicación (MySQL 8.4, datos ficticios)

`tests/bench_userforms_dedupe_memory_20261113.php` creó 5.000 filas ficticias (4.005 visibles para el usuario) y simuló un JOIN con **3 filas por formulario**. En dos procesos PHP separados, 11 muestras por modalidad:

| Métrica | `fetchAll` más lista deduplicada | `fetch` y deduplicación al vuelo |
|---|---:|---:|
| IDs canónicos | 4.005 | 4.005 |
| Hash SHA-256 del orden de IDs | idéntico | idéntico |
| Pico de memoria PHP del experimento | 8 MB | **4 MB** |
| p50 deduplicación | **19,50 ms** | 21,13 ms |
| p95 | 34,42 ms | 22,70 ms |

**Interpretación:** memoria temporal aproximadamente a la mitad en la consulta sintética con filas duplicadas; **p50 ligeramente peor**, por lo que no se promete aceleración de API, ni se extrapola el 50 % a toda la carga de una ficha. La ganancia es principalmente menor duplicación de estructuras PHP.

## QA con historiales de más de 12.000 formularios

`tests/qa_userforms_large_history_mysql_20261113.php` usa exclusivamente `grobo_myforms_fixture` en Docker aislado:

- Crea un historial de **6.930 formularios**, incluidos **425 derivados con snapshots propios**. Verifica que los IDs coincidan con `getVisibleCanonicalIds`, sin duplicados, que los datos originales se restauren después de los lotes de snapshots y que los formularios de la institución receptora sigan visibles solo bajo las reglas actuales.
- Amplía a **13.030 formularios** para forzar los lotes de participantes (2.000 IDs). Verifica mismo orden de IDs, primera/última ficha, rutas institucionales de formularios antiguos y recientes y conservación del snapshot original.
- En el entorno local ficticio, la hidratación completa de 13.030 fichas duró aproximadamente **3,07 s**, con pico de PHP de **56 MB**. No es una cifra productiva ni un objetivo de rendimiento; confirma que la búsqueda de texto libre sin índice sigue escalando con el tamaño del historial. Para 6.930 fichas se ensayó también la consulta agregada (umbral 12.000), aproximadamente **1,43 s**, conservando la paridad. Las distintas pasadas no permiten atribuir mejoras estables de latencia a un cambio del tamaño de lote.

## Regresiones

- `tests/qa_userforms_pagination_20261112.php`: **8/8** tras actualizar el simulador `MyFormsFixtureStmt::fetch` para que reproduzca el mismo JOIN duplicado que `fetchAll`. El primer intento reveló esa incompatibilidad del doble de PDO y fue corregido antes de publicar.
- `tests/run_grobo_qa.sh`: **96/96** pruebas generales.
- `tests/qa_userforms_filter_mysql_20261112.php`: **11/11** bloques, incluida igualdad contra búsquedas originales.
- `tests/qa_userforms_csv_mysql_20261112.php`: **7/7** (snapshots, precios, permisos, lotes y consistencia de CSV).
- `tests/qa_userforms_search_index_mysql_20261113.php`: **16/16** (incluye 39 invalidaciones, derivaciones y aislamiento).
- Chrome sintético de Mis Formularios **19/19** (paginación, búsqueda, cancelación, JWT y errores). Render/PDF **6/6**, CSV administrativo **7/7**. Auditoría: **187 JS, 84 HTML y 447 importaciones** sin errores de módulos.

## Limitaciones y pendientes

Los grandes historiales siguen cargando fichas completas para búsquedas de texto sin un índice aprobado. Esta optimización evita mantener filas duplicadas dentro de PHP y previene listas SQL excesivas, **no** elimina el coste de lecturas de miles de fichas. El índice con 39 triggers y 64 contadores permanece desactivado en producción por el coste de escrituras concurrentes observado en QA y porque aún falta preflight autorizado de esquema real y QA autenticado URBE/CUPAE.

No se ha instalado ningún trigger, tabla ni cambio de estructura; no se han modificado datos institucionales.

## Publicación controlada y verificación final

- **Commit funcional:** `a961867`, sincronizado en GitHub en la rama `fix/grobo-seguridad-facturacion-20261102`.
- **Release:** `myforms-join-dedupe-a961867`, con **un único archivo PHP** instalado: `api/src/Models/UserForms/UserFormsModel.php`. Los cambios de pruebas y documentación no se instalaron en el servidor web.
- `grobo-deploy-check`: `GROBO_MANIFEST_OK version=myforms-join-dedupe-a961867 files=1`.
- `grobo-deploy-apply`: `GROBO_CONTROLLED_DEPLOY_OK`, respaldo automático en `/root/grobo-managed-backup-20261113T230754Z`.
- SHA-256 verificado directamente sobre el archivo del VPS: `64e0f28fedf78ba400f2037aa0a5b22471ce36a01bf9f6a37102dc7c504106fc`, idéntico al paquete.
- `grobo-status`: Nginx/PHP-FPM 8.3 activos, JWT preflight correcto, seguridad multiinstitucional vigente.
- Navegador público sin credenciales: **10/10** comprobaciones después del despliegue, incluyendo HTML/JS versionados, 5 rutas privadas con HTTP 401 JSON y redirecciones al login de 390/768/1366 px.
- El historial ficticio de **13.030 fichas**, las 425 derivaciones, los permisos y los importes se validaron **antes de publicar**, en MySQL 8.4 aislado. La prueba de carga de memoria es representativa del algoritmo PHP, **no** una medición del VPS ni una prueba con datos institucionales reales.
- No se instaló ni activó el índice documental experimental, no se ejecutó ninguna migración y no se modificó la base productiva. QA autenticado de URBE/CUPAE y tiempos privados reales siguen pendientes.
