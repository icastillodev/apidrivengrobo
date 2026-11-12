# GROBO — Acta de optimización de listados y formularios

**Fecha:** 12 de noviembre de 2026

## Cambios publicados

Se publicaron en el VPS de GROBO dos tandas de código, mediante el ejecutor controlado autorizado. No se ejecutaron migraciones ni se modificaron saldos, pedidos científicos o inventario.

**Tanda 1:** `perf-2491b2a`, **28 archivos**, con respaldo privado `/root/grobo-managed-backup-20261112T180354Z`. Comprende:
- Contable: paginación, filtros SQL y exportación CSV del historial sin cargar toda la institución en memoria.
- Alojamientos: conteos y configuraciones por lotes, aislamiento institucional en último tramo.
- Protocolos: consulta de red sin multiplicación de filas, suma de animales sin subconsulta duplicada, carga paralela del catálogo.
- Usuarios y formularios de Animales, Reactivos e Insumos: caché temporal de departamentos por sesión, precarga reducida y acotada, filtros auxiliares no bloqueantes, `Server-Timing` para listas y control de caché de respuestas privadas.

**Tanda 2:** `auth-d6ef778`, **5 archivos**, con respaldo privado `/root/grobo-managed-backup-20261112T181004Z`. Homogeneiza las respuestas HTTP 401 de lecturas administrativas cuando falta autenticación.

## Pruebas y verificación

- Comparación SHA-256 contra manifiestos de ambas tandas: **28 de 28 archivos** coincidentes, sin diferencias, incluyendo los cinco actualizados en el segundo parche.
- `php -l` de todos los archivos PHP del paquete: sin errores; PHP-FPM y Nginx permanecen activos y la política de JWT supera el control.
- **96/96 fixtures PHP** anteriores aprobados.
- **12/12 pruebas UI simuladas** anteriores aprobadas.
- **5/5 pruebas de Historial Contable** en Chrome (paginación, búsqueda, filtros, CSV y escapado de nombres).
- **6/6 pruebas de caché y precarga** en Chrome (aislamiento, token, errores, dos páginas vecinas y límite de doce).
- **5/5 pruebas PHP de autenticación** sin sesión aprobadas.
- **5/5 verificaciones reales en Chrome** de las rutas Usuarios, Animales, Reactivos, Insumos y Contable sin sesión: HTTP 401 y `status:error`.
- **13/13 recursos públicos** de los módulos optimizados HTTP 200; **3/3 anchos** comprobados con redirección al login; cero errores JS observados.
- SQLite con 3.000 movimientos de prueba: 2.100 de una institución y 900 de otra correctamente separados, exportación cursor de 450 movimientos y página de 15.
- Alojamientos, 620 registros ficticios: siete consultas agrupadas para metadatos en lugar de unas 1.240 consultas por fila estimadas; no equivale a una medición real de tiempos del VPS.

## Límites y próximos controles

La validación con datos simulados **no certifica** todos los flujos autenticados ni demuestra un porcentaje real de velocidad. Para completar el QA final se necesitan cuentas controladas por rol, mediciones `Server-Timing`, perfiles P50/P95 y comparaciones con registros anónimos de varios tamaños.

**Siguientes focos:**
1. Listado personal `/user/my-forms`: actualmente devuelve todo el historial de una cuenta; estudiar paginación sin romper la vista agrupada.
2. Exportación grande de formularios de Animales/Reactivos/Insumos: evitar el techo de 8.000/10.000 registros mediante exportaciones paginadas/streaming.
3. Consultas complejas y derivaciones multiinstitución: medir `EXPLAIN` antes de proponer índices de MySQL.
4. Auditoría funcional real de formularios, stock, trazabilidad y facturación con registros de ensayo autorizados.

El repositorio público no contiene credenciales, backups privados ni registros institucionales.
