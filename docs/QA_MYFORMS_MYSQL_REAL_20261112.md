# GROBO — QA de Mis Formularios con MySQL real y rendimiento

**Fecha:** 12/11/2026. **Instalación de ensayo:** MySQL 8.4 y PHP 8.3 en contenedores locales, sobre una red Docker interna sin puertos publicados. Base `grobo_myforms_fixture` y volúmenes temporales; únicamente datos ficticios. Ambos contenedores y la red se eliminaron tras las pruebas. Nunca se accedió a MySQL institucional.

## Integración de datos y reglas de negocio

Script: `tests/qa_userforms_mysql_integration_20261112.php` (requiere DSN de la base ficticia exacta y permiso de entorno explícito; rechaza otras bases de datos).

**6/6 bloques de pruebas aprobados con PDO MySQL nativo y `ATTR_EMULATE_PREPARES=false`:**
1. Detección de tablas y columnas vía `information_schema`.
2. Visibilidad de pedidos propios y exclusión de copias antiguas.
3. Paginación canónica 2+1 con derivaciones entre sedes ficticias URBE/CUPAE.
4. Preservación de snapshot del pedido original, participantes y `falta_pagar`.
5. Aislamiento de usuario titular, destinatario, colega de sede y tercero ajeno.
6. Metadatos de instituciones/orígenes y contrato completo de historial sin formularios repetidos.

### Hallazgo y corrección

El `JOIN protdeptor` generaba una fila adicional para un protocolo asignado a dos departamentos. La versión publicada anteriormente ya desduplicaba el modo paginado, pero no el historial completo usado por los filtros y el Excel.

Se hizo que `UserFormsModel::getAllForms` elimine filas con `idformA` repetido **en ambos modos** antes de recuperar snapshots y rutas. El contrato mantiene las mismas claves, campos y orden de formularios canónicos. La prueba MySQL comprueba que el historial completo no contiene IDs repetidos.

## Benchmark sintético

Se añadieron 5.000 formularios de ensayo (4.000 visibles para la cuenta simulada URBE y 1.000 para CUPAE) más el conjunto de integración. Las cifras son **tiempos de laboratorio PHP + MySQL**, no medidas del VPS ni de usuarios de URBE/CUPAE.

| Medición | Muestras | p50 | p95 | Tamaño JSON |
|---|---:|---:|---:|---:|
| Primera página (12) | 15 | 12,60 ms | 27,42 ms | 8.502 B |
| Página 21 (12) | 15 | 11,84 ms | 18,23 ms | 8.504 B |
| Catálogos para filtros | 15 | 33,10 ms | 55,22 ms | 54 B |
| Historial completo (4.005) | 3 | 101,98 ms | 191,91 ms | 2.794.615 B |

Comparando la primera página con el historial completo: **99,7 % menos bytes** en ese caso ficticio. La muestra del historial completo es de sólo 3 ejecuciones; su p95 no es estadísticamente robusto. No inferir una mejora porcentual equivalente en producción.

## Regresiones

- `tests/qa_userforms_pagination_20261112.php`: 8/8.
- `tests/run_grobo_qa.sh`: **96/96**.
- `tests/qa_myforms_paged_browser_20261112.mjs`: **6/6** con 205 pedidos ficticios.
- `tools/audit-grobo-js-modules.mjs`: 187 módulos JS y 84 HTML, 0 errores de sintaxis/importación.
- No hubo nuevas escrituras en información científica, inventario, pagos ni datos de producción.

## Pendientes honestos

- No hay cuentas institucionales de ensayo acreditadas disponibles para iniciar sesión en URBE/CUPAE; por tanto, **no se certifica aún la validación funcional autenticada real** de roles, derivaciones, filtros y descargas.
- Tampoco se midieron p50/p95 de endpoints privados del VPS con una sesión legítima. Su medición depende de esas cuentas y permisos; no usar JWT o credenciales de cuentas reales en los fixtures.
- La segunda ejecución de integración con PDO emulado no se completó; quedó aprobada la variante nativa, que reprodujo el problema de `SHOW ... LIKE ?` original.
- Las búsquedas globales todavía usan temporalmente el contrato completo bajo demanda; trasladar a SQL exige garantizar equivalencia de snapshots originales y relaciones.
