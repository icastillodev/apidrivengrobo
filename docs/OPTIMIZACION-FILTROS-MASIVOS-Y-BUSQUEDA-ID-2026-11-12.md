# GROBO — Filtros masivos ligeros y búsqueda rápida por ID

**Fecha local:** 12/11/2026. **Módulo:** Mis Formularios. **Acceso:** sólo lectura, bajo el mismo JWT y la misma regla de visibilidad institucional.

## Problema y mejora

La versión anterior ya limitaba la respuesta al navegador a 12 formularios, pero ante filtros comunes con más de 500 coincidencias el backend seguía ejecutando `getAllForms` completo: todos los `JOIN` de protocolos y departamentos, precios, participantes, snapshots originales y transformación de fichas.

### Camino ligero para filtros sin texto

- `UserFormsModel::getFilterSummaryRows` obtiene mediante un único SELECT sólo `idformA`, `estado`, indicador de derivación, nombre de origen y estados de derivación más recientes, más la sede del formulario. **No consulta precios, protocolos ni snapshots** en esta fase.
- Cuando el filtro de institución participante está activo, reconstruye esa información mediante la misma función batch histórica, con lotes de 400 IDs para evitar cantidades excesivas de parámetros PDO. No replica ni simplifica las reglas interinstitucionales.
- `UserFormsFilterService` aplica el **mismo predicado de filtros** a esas filas ligeras, cuenta el total y conserva únicamente los IDs de la página solicitada. Finalmente obtiene esas fichas mediante `getAllForms(...,['ids'=>...])`, que vuelve a aplicar los permisos y resuelve datos originales y saldos sin pérdida.
- Para filtros muy selectivos se mantiene la preselección SQL conservadora ya publicada (`getFilteredCandidateIds`, máximo 500 candidatos).
- Para texto libre arbitrario se mantiene el recorrido completo con el fin de no perder coincidencias en atributos anidados, participantes o snapshots. No se presenta como búsqueda Full-Text indexada.

### Búsqueda rápida por ID exacto

- Nuevo atajo opcional: escribir **`#12345`** en la búsqueda de Mis Formularios solicita **sólo el formulario con ID 12345** mediante SQL, sin recorrer miles de fichas.
- Se vuelven a comprobar el `WHERE` de JWT, copias históricas y todos los demás filtros (estado, institución, origen y derivación). No permite ver formularios de otros usuarios o instituciones.
- La búsqueda convencional `12345` mantiene su semántica anterior de texto libre, incluyendo coincidencias fuera del ID.
- Ayuda accesible y localizada en la interfaz ES/EN/PT, ligada a `aria-describedby`; no se duplica si se reinicializa la pantalla. Se actualiza el import de la página a `misformularios.js?v=20261112j` para invalidar JS antiguo.

## Pruebas de integración

- **MySQL 8.4 aislado, PDO nativo:** `tests/qa_userforms_filter_mysql_20261112.php`, **11/11 bloques**, incluyendo 75 combinaciones comparadas contra la lista original, aislamiento entre URBE/CUPAE ficticias, estados, instituciones participantes y datos de derivación, ID exacto autorizado/no autorizado y fila de proyección liviana.
- **5.000 registros sintéticos:** `tests/bench_userforms_filtered_20261112.php` mantiene **6 comparaciones** de igualdad con la lista legacy para filtros grandes y selectivos, y comprueba la respuesta de una búsqueda sin coincidencias.
- **Chrome ficticio con 205 registros:** `tests/qa_myforms_paged_browser_20261112.mjs` **16/16**: búsqueda libre, atajo `#ID`, paginación, filtros combinados, errores HTTP, exportación, mensaje vacío, compatibilidad con backend anterior y ayuda ES/EN/PT.
- **Regresión general PHP:** 96/96; paginación personal: 8/8; render/PDF: 6/6; exportación administrativa: 7/7. Auditoría de módulos: 187 JS, 84 HTML, cero errores.
- Todo el QA usa registros sintéticos con contenedores MySQL temporales que se retiran. **Nunca se ejecutaron consultas de ensayo sobre datos científicos ni la base productiva de URBE o CUPAE**.

## Benchmark sintético (no producción)

Con 5.000 formularios adicionales en MySQL local (11 muestras por caso):

| Operación | p50 nueva | p95 nueva | Observación |
|---|---:|---:|---|
| `#20001` ID exacto | **3,50 ms** | 16,26 ms | Consulta directa por ID |
| `20001` texto libre | 253,07 ms | 406,94 ms | Conserva búsqueda profunda |
| Estado `Proceso` (2.669 coincidencias) | **70,81 ms** | 105,06 ms | Filtrado ligero sin hidratar 2.669 fichas |
| Institución URBE (4.006 coincidencias) | **170,85 ms** | 219,88 ms | Reconstrucción segura de participantes |
| Texto inexistente | 257,31 ms | 288,52 ms | Todavía usa búsqueda profunda |
| Solo derivados (2) | 15,19 ms | 23,17 ms | Camino SQL selectivo anterior |
| Origen (2) | 6,96 ms | 22,32 ms | Camino SQL selectivo anterior |

Las cifras son de una ejecución sintética y no deben interpretarse como p50/p95 del VPS, ni como promesa de velocidad. Las mejoras observadas en búsquedas de estado y en ID se contrastan con benchmarks anteriores, realizados en distintas pasadas.

## Límites y siguientes controles

- Las coincidencias por **texto arbitrario** siguen siendo costosas sin un índice documental actualizado de forma transaccional. Una futura mejora completa necesita diseñar indexación incremental, backfill y reglas de invalidación para snapshots/derivaciones sin exponer datos entre tenants. **No instalar** una tabla de búsqueda o índices nuevos en producción sin plan de migración y pruebas de escrituras.
- El camino masivo filtra una proyección pequeña de todos los formularios visibles. Su memoria y tiempo de DB dependen todavía del tamaño del historial y de la cantidad de derivaciones.
- Los cambios concurrentes entre selección de IDs y lectura de fichas pueden afectar resultados; no hay snapshot transaccional de toda la búsqueda.
- Falta validación autenticada real con cuentas autorizadas de ensayo de URBE/CUPAE y tiempos `Server-Timing` de endpoints privados del VPS. No sustituirla por respuestas HTTP 401 sin sesión.

## Publicación controlada y comprobación posterior

- **Commit de aplicación:** `2faa597`, rama `fix/grobo-seguridad-facturacion-20261102`; enviado a GitHub.
- **Release:** `myforms-broad-2faa597`. Se publicaron exactamente **4 archivos**: modelo de formularios, servicio de filtros, JavaScript de Mis Formularios y HTML que actualiza su versión.
- `grobo-deploy-check`: `GROBO_MANIFEST_OK version=myforms-broad-2faa597 files=4`.
- `grobo-deploy-apply`: `GROBO_CONTROLLED_DEPLOY_OK`. **Respaldo:** `/root/grobo-managed-backup-20261113T011846Z` (fecha UTC del VPS).
- **4/4 hashes SHA-256** leídos de los archivos ya instalados en el VPS coinciden con el paquete local de la misma versión.
- Estado posterior: servicio `nginx=active`, `php8.3-fpm=active`, `JWT_SECRET_PREFLIGHT_OK`, protección multitenant y responsive activos.
- Chrome real sin sesión: **10/10** comprobaciones: HTML versionado `20261112j`, hash de JS exacto, cinco rutas privadas devuelven **HTTP 401** con JSON sin datos y login protegido en 390, 768 y 1366 píxeles.
- Pruebas sintéticas previas al despliegue: **96/96 PHP generales**, **11/11 integración MySQL para filtros**, **8/8 paginación**, **16/16 Chrome de navegación y búsqueda exacta ES/EN/PT**, **6/6 PDF/render** y **7/7 exportaciones administrativas**.
- **Limitación:** estas pruebas públicas no comprueban la funcionalidad con un JWT real de URBE/CUPAE; siguen pendientes esas sesiones autorizadas, la lectura de tiempos `Server-Timing` reales y la futura indexación transaccional de texto libre arbitrario.
