# GROBO — Evitar multiplicación del JOIN de protocolos/departamentos

**Fecha:** 13/11/2026 · **Módulo:** Mis Formularios · **Archivo funcional:** `api/src/Models/UserForms/UserFormsModel.php`

## Motivación y solución

La lista de formularios combina su departamento original `f.depto` con departamentos del protocolo a través de `protformr`, `protocoloexpe` y `protdeptor`. Aunque una ficha ya tenga un departamento propio con nombre válido, el `LEFT JOIN protdeptor` generaba **una fila por cada departamento del protocolo**. Luego `getAllForms` deduplicaba por `idformA` en PHP, pero MySQL ya había ejecutado el trabajo redundante.

Se modificó exclusivamente el `JOIN` de la cabecera principal de `getAllForms`:

- Resolver primero `departamentoe d ON f.depto=d.iddeptoA`.
- Condicionar `LEFT JOIN protdeptor pd` a `d.NombreDeptoA IS NULL`.
- Mantener el `LEFT JOIN departamentoe dp` y el `COALESCE(d.NombreDeptoA,dp.NombreDeptoA,'---')` originales.
- No cambiar orden de formularios, consulta de autorización JWT, participación interinstitucional, cálculo de deuda, snapshots, filtros de búsqueda, columnas devueltas ni exportaciones.

Si el departamento propio existe, la salida ya no se multiplica por departamentos secundarios irrelevantes. **Si no existe o su nombre es NULL**, el camino alternativo sigue recorriendo todos los departamentos asociados al protocolo. Se conserva la deduplicación defensiva PHP para otros posibles JOIN con múltiples filas. No hay SQL DDL ni nuevos índices/triggers.

## Benchmark y paridad en MySQL 8.4 aislado

`tests/qa_userforms_protocol_join_mysql_20261113.php`: datos ficticios, **4.005 formularios visibles** y **2.000 nuevas asociaciones de protocolo** a uno con dos departamentos. Se excluyen las copias históricas derivadas utilizando la misma regla canónica que `getAllForms`.

| Métrica | JOIN anterior | JOIN condicionado |
|---|---:|---:|
| Filas proyectadas antes de deduplicar | 6.006 | **4.005** |
| Tiempo mediano SQL para proyección mínima, 7 muestras | 9,64 ms | **6,75 ms** |
| Tiempo p95 SQL mínimo | 15,19 ms | **8,12 ms** |
| Total de formularios canónicos visibles | 4.005 | 4.005 |

`tests/bench_userforms_protocol_fanout_model_20261113.php`: A/B de **la llamada completa a `UserFormsModel::getAllForms(101,12)`**, con 11 muestras por variante, mismas filas ficticias y mismos parámetros, usando el modelo previo de Git y el modelo nuevo en procesos PHP/Docker separados:

| Métrica | Modelo previo | Modelo optimizado |
|---|---:|---:|
| p50 carga completa | 145,52 ms | **81,91 ms** |
| p95 carga completa | 250,75 ms | **141,07 ms** |
| Memoria pico PHP | 22 MB | 22 MB |

El **SHA-256 del JSON completo** coincidió exactamente en ambos modelos: `96ee68c27b1b2c965db6cc0b0cd6bffbc36bfed7344fe7fd39e64f95ba7f9ccf`. Las consultas de fallback con departamento faltante conservaron las dos opciones del protocolo; sin cambios en pagos, snapshots ni acceso a formularios ajenos.

El p50 se redujo un **~43,7 % en este caso sintético de alta multiplicación de filas**. No significa que toda búsqueda real en URBE/CUPAE vaya a ser 44 % más rápida: el beneficio depende de cuántos protocolos tengan múltiples departamentos y de la carga/distribución del VPS. Benchmark secuencial, no prueba de concurrencia productiva.

## Investigación alternativa descartada

Se estudió reemplazar las dos subconsultas de estado más reciente de derivación por un solo JOIN. No apareció una mejora uniforme de rendimiento en la comparación del servicio completo. **No se incluye esa propuesta en este parche**; el comportamiento y la definición SQL de los estados de origen/destino quedan intactos.

## Validación y seguridad

- Comparación completa de JSON A/B, valores canónicos, condiciones fallback, permisos, snapshots y deuda, MySQL aislado: aprobado.
- Suite PHP general: **96/96**; paginación PHP **8/8**.
- Filtros MySQL **11/11**, incluido el banco de 100 combinaciones con cuatro offsets.
- CSV MySQL **7/7**; índice opcional sintético **16/16**.
- Navegador simulado **19/19**, render/PDF **6/6**, exportación paginada CSV **7/7**.
- Auditoría estática: 187 archivos JS, 84 HTML y 447 relaciones de importación sin errores.
- Todo el ensayo MySQL se hizo con `GROBO_QA_MYSQL_ISOLATED=yes`, base efímera `grobo_myforms_fixture` y sin credenciales ni datos institucionales.

## Pendientes

Validación con cuentas de ensayo autenticadas de URBE/CUPAE y medición de `Server-Timing` real. El índice documental materializado con 39 triggers y 64 contadores se mantiene desactivado por requisitos de seguridad y pruebas de carga de escrituras. Esta optimización **no requiere activar ese índice ni modificar la base productiva**.
