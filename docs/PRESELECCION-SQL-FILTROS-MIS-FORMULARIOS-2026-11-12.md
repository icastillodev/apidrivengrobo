# GROBO — Preselección SQL segura para filtros personales

**Fecha:** 12/11/2026. **Módulo:** Mis Formularios, investigador.
**Ámbito:** sólo lecturas; sin cambios de estructura MySQL, saldos, protocolos, inventario, roles ni migraciones.

## Objetivo y diseño

La versión anterior enviaba al navegador sólo 12 resultados, pero el servidor hidrataba y filtraba **todo el historial autorizado** en PHP. Se agrega `UserFormsModel::getFilteredCandidateIds`, que genera una **preselección SQL conservadora** antes de recuperar fichas completas.

- El `WHERE` siempre incluye las condiciones previas de visibilidad del usuario y sus derivaciones y mantiene `IdInstitucion` según sesión JWT; no acepta scopes nuevos desde el cliente.
- Los filtros estructurados que aportan selectividad (derivación activa/local, institución origen, institución participante, estado) se expresan como predicados parametrizados `EXISTS`, `LIKE` amplio y/o columnas del workflow. Se incluyen las derivaciones históricas y el vínculo de copias `idformAOrigen` cuando existe.
- El SQL es **un superset** de los verdaderos resultados. Después se usa `UserFormsFilterService::matches` sin modificaciones, sobre las fichas finales con snapshots originales, participantes y saldos. Puede devolver candidatos extra, pero el segundo filtro los elimina. Nunca se limita el conjunto de IDs sin validar el total candidato.
- Si no hay criterios estructurales, si el conjunto potencial supera **500 formularios**, o si el estado común `Proceso/Entregado` es el único filtro, el servicio conserva el camino anterior. Esta estrategia evita que listas grandes reciban una paginación parcial o 5 consultas de 100 sin beneficio.
- Para menos de 501 candidatos, el servicio pide sus datos en lotes de hasta **100**, con el `WHERE` institucional repetido por lote, y guarda en memoria sólo las filas de la página solicitada. El total se calcula sobre todas las coincidencias verificadas.
- Se mantiene el orden descendente por ID canónico. Buscar texto en propiedades arbitrarias del objeto aún usa el camino completo si no hay otro criterio selectivo, para no omitir palabras dentro de JSON, instantáneas y atributos anidados.
- Todo es compatible con la ruta `/user/my-forms?filtered=1` ya publicada. No requiere cambiar JS, HTML, rutas ni datos.

## Pruebas

- **MySQL 8.4 aislado:** `tests/qa_userforms_filter_mysql_20261112.php` pasó **9/9 bloques**, incluidos **75 combinaciones** de usuarios/filtros contrastadas con el resultado legacy sobre cuatro desplazamientos de paginación, y ocho comprobaciones explícitas de preselección (SQL parametrizado, umbral y scope).
- **5.000 filas sintéticas:** `tests/bench_userforms_filtered_20261112.php` confirmó **6/6 casos** de equivalencia legacy/nuevo para filtros selectivos y poco selectivos.
- Regresión general PHP: **96/96** fixtures; `tests/qa_userforms_pagination_20261112.php`: **8/8**.
- Navegador Chrome sintético: **13/13**; controles de render y exportación: **6/6**.
- Auditoría módulos: **187 archivos JavaScript y 84 HTML**, sin errores de sintaxis, importación ni exports.
- Se usaron fixtures sintéticos en Docker sin red externa, y nunca credenciales ni registros institucionales de producción.

## Benchmark de laboratorio (MySQL 8.4 + PHP 8.3, no VPS)

En la ejecución anterior al pequeño ajuste que evita consultar previamente los estados mayoritarios, con 5.000 formularios adicionales y 11 muestras por filtro:

| Consulta | p50 | p95 | Resultado |
|---|---:|---:|---|
| Sólo derivados | **7,63 ms** | 14,37 ms | 2 fichas |
| Institución origen URBE | **9,91 ms** | 20,67 ms | 2 fichas |
| Institución participante CUPAE | **29,56 ms** | 43,63 ms | 3 fichas |
| Origen + estado + derivación | **13,34 ms** | 35,61 ms | 2 fichas |
| Búsqueda libre por ID (sin filtro estructurado) | 279,29 ms | 471,97 ms | 1 ficha |
| Estado Proceso (2.669 coincidencias) | 307,49 ms | 386,64 ms | 12 fichas |
| Institución URBE (4.005 coincidencias) | 258,33 ms | 345,14 ms | 12 fichas |

**Lectura:** los criterios muy selectivos pueden pasar de hidratar miles de fichas a recuperar pocas decenas o menos. La búsqueda libre y los filtros masivos **siguen teniendo un costo alto**. Estos son tiempos de Docker local y no indicadores p50/p95 de producción, ni garantizan un porcentaje uniforme de mejora.

## Límites y siguiente fase

- Falta indexación/plan `EXPLAIN` sobre una copia anonimizada de la estructura y distribución de datos productivos; no crear índices sin evaluación de tamaño y bloqueo.
- El SQL hace una preselección segura, **no constituye búsqueda Full-Text global**. Búsquedas libres y filtros con más de 500 candidatos todavía hidratan el historial autorizado completo en PHP.
- Una modificación concurrente entre la preselección y la hidratación puede alterar las filas incluidas; para coherencia transaccional fuerte se requiere snapshot/versión, sin retener transacciones grandes en PHP-FPM.
- Continúa pendiente QA autenticado con cuentas de ensayo autorizadas de URBE/CUPAE y mediciones privadas en VPS por `Server-Timing`. No marcar ese punto aprobado con los fixtures.
