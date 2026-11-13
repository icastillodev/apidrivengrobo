# GROBO — Optimización segura de búsqueda libre y filtros combinados

**Fecha:** 13/11/2026. **Área:** Mis Formularios / UserForms.
**Ámbito:** solo backend PHP, lecturas autenticadas; sin DDL, nuevas tablas, triggers, permisos ni migraciones.

## Qué se modificó

1. `UserFormsFilterService::matches` comprueba primero filtros baratos de **estado, institución participante, derivación y origen**. Sólo después aplana el objeto completo de un formulario para comparar el texto, incluidas instantáneas originales, participantes y valores financieros. Antes generaba el texto de todos los objetos incluso cuando el filtro estructural ya los descartaba.
2. Para **búsqueda libre sin otros filtros**, existe una rama directa de comparación de texto. Conserva exactamente la semántica de `str_contains` sobre el objeto normalizado, sin incurrir en todos los predicados estructurales. No exige usar `#ID`; este atajo exacto ya publicado permanece disponible.
3. El camino completo sin índice transaccional ya no almacena **todas las filas coincidentes en un segundo array**. Cuenta el total y conserva únicamente `limit` filas a partir de `offset`, sin modificar ni el orden descendente de ID canónico ni el JSON `{list,total,limit,offset,info_inst}`. Esto se aplica también cuando se invalida el índice en mitad de un request y es necesario regresar al mecanismo legacy.
4. `UserFormsModel::getFilteredCandidateIds` devuelve `null` inmediatamente si hay texto libre y ninguno de los filtros estructurales está activo, evitando metadatos y SELECT de preselección que siempre se descartaban para esa consulta.

**Garantías:** los filtros siguen operando exclusivamente sobre el historial autorizado por el JWT; no se cambiaron consultas de permisos, montos, derivaciones ni scripts del navegador. La búsqueda textual de todo el objeto, incluidas propiedades anidadas y snapshots, sigue siendo exacta. La memoria de hidratación del historial original todavía depende de su tamaño; solo se redujo el array adicional de coincidencias.

## Validaciones ejecutadas con datos de ensayo

- MySQL 8.4 aislado + PDO nativo: `tests/qa_userforms_filter_mysql_20261112.php`: **11/11 bloques** y **100 combinaciones de usuarios/filtros** comparadas contra el orden **original** (texto primero, filtros estructurales después), con 4 offsets por caso. Se conservaron IDs, orden y totales.
- Fixture de **5.000 formularios**: `tests/bench_userforms_filtered_20261112.php` añade búsqueda masiva en página posterior, texto más filtros institucionales y búsqueda sin coincidencias. Confirmó **9 comparaciones** con la semántica del historial legacy. La consulta de texto “URBE” con 4.005 coincidencias entregó 12 filas en la página solicitada y `total=4005`.
- `tests/bench_userforms_match_order_20261113.php`: CPU **solo del predicado PHP**, 4.005 formularios, 11 muestras por caso, comparando implementación anterior con la nueva; ambos resultados idénticos.
- Regressión PHP general **96/96**, paginación **8/8**, navegador Chrome sintético **16/16**, pruebas de exportación/render **6/6**, CSV administrativo **7/7**. Auditoría JavaScript: 187 JS, 84 HTML, cero errores de sintaxis o importación. `php -l` y `git diff --check` sin errores.

## Benchmark de CPU PHP (no API completa, no VPS)

Mediciones p50 de la última pasada, 4.005 fichas sintéticas:

| Predicado | Texto primero | Estructura primero | Coincidencias |
|---|---:|---:|---:|
| Texto + institución | 15,97 ms | **2,31 ms** | 3 |
| Texto + derivación + estado | 15,85 ms | **1,85 ms** | 1 |
| Texto + institución + estado | 30,88 ms | **4,56 ms** | 2 |
| Solo texto sin otros filtros | 39,44 ms | **32,29 ms** | 0 |

Son muestras sintéticas de **CPU de filtrado**. La hidración SQL y la red añaden costos que no están reflejados aquí. En una pasada del endpoint de 5.000 registros: búsqueda libre ID textual p50 83,89 ms, coincidencias masivas en página 21 p50 86,58 ms, filtros combinados p50 13,86 ms y búsqueda `#ID` p50 2,74 ms. No inferir una reducción porcentual uniforme de la API o de producción.

## Pendientes diferentes

- La indexación documental con 64 contadores sigue siendo **experimental y desactivada**, porque el costo de escrituras bajo concurrencia y el acceso de mantenimiento al esquema productivo no superaron el criterio de activación.
- La búsqueda libre sin otro filtro aún hidrata el historial completo en PHP; esta tanda mejora el predicado y su ventana de resultados, **no** implementa un índice persistente ni elimina el trabajo SQL de esa búsqueda.
- Faltan QA autenticado institucional con usuarios de ensayo autorizados de URBE/CUPAE y mediciones privadas `Server-Timing` en VPS. No considerar respuestas HTTP 401 sin sesión como sustituto de esos controles.
