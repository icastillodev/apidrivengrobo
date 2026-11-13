# GROBO — Búsqueda de texto libre con memoria limitada en historiales grandes

**Fecha:** 13/11/2026. **Área:** Mis Formularios. **Componentes:** `UserFormsFilterService` y `UserFormsModel`. Sin migración de base de datos, sin nuevos índices, tablas, triggers o permiso de usuario.

## Motivo y estrategia

El fallback de texto libre, incluso luego de las mejoras de paginación y deduplicación de JOIN, seguía llamando a `getAllForms()` **sin paginar**. En usuarios con muchos pedidos, esto hidrata simultáneamente miles de fichas completas con precios, estados, ruta institucional y snapshots antes de filtrar. El consumo de PHP crece con cada nuevo formulario, aunque el navegador solo muestre 12.

Se agregó una ruta de búsqueda **limitada por memoria** para casos en que el usuario tiene **más de 12.000 formularios canónicos visibles**. El umbral se detecta con `UserFormsModel::countVisibleCanonicalForms`, que utiliza exactamente el `WHERE` de la API autenticada. Los historiales más pequeños conservan la búsqueda anterior.

La ruta grande usa `getVisibleCanonicalIdWindow(user, institucion, beforeId, limit<=100)`: recupera IDs decrecientes en páginas de hasta 100 mediante `idformA < beforeId`, evitando `OFFSET` SQL. El servicio vuelve a hidratar cada lote mediante `getAllForms(['ids'=>...])`, que **repite el WHERE de autorización** y devuelve todas las relaciones y snapshots. Se aplican los mismos `matches` que antes. Solo se retienen los **12 resultados de la página** y el total acumulado, no las fichas históricas ya procesadas. Si no quedan filas, se devuelve también `info_inst` según el contrato existente.

El límite `getVisibleCanonicalIds(..., 20000)` utilizado por **exportaciones CSV se conserva sin cambios**. La búsqueda keyset no utiliza ese método ni comparte su límite.

## Igualdad, aislamiento y casos extremos

- MySQL 8.4 sintético: comparación de **4 búsquedas** en **13.030 formularios** con resultados originales: protocolo derivado, estado masivo con página avanzada, nombre de institución con página avanzada y texto sin coincidencias. Mismos IDs y total.
- Los lotes canónicos 1 y 2 coincidieron exactamente con el orden global. Usuario sin permisos vio cero filas y recibió conteo cero.
- Prueba ampliada a **21.030 formularios**: se recorrieron todos los IDs por keyset sin duplicados ni truncamiento; búsquedas selectiva y sin coincidencias correctas; otro tenant no obtuvo IDs; el límite de exportación CSV siguió rechazando más de 20.000.
- La separación entre instituciones se mantiene al seleccionar los IDs y se vuelve a imponer en cada hidratación. En ningún momento se habilita buscar arbitrariamente por usuario de una petición pública; los IDs provienen del servicio y de los datos del JWT del controlador.
- Como en la lectura legacy, una escritura concurrente entre consultas puede alterar el recuento de resultados. **No se incorporó una transacción de larga duración ni se prometió una instantánea perfecta durante cambios concurrentes.**

## Medición reproducible en MySQL ficticio, no VPS

`tests/bench_userforms_keyset_memory_mysql_20261113.php`: dos procesos PHP separados, usuario ficticio con **13.030 registros**, búsqueda de un protocolo derivado `PROTO-LOTE-40424`; idénticos resultados:

| Ensayo | Legacy tiempo | Keyset tiempo | Legacy memoria pico | Keyset memoria pico |
|---|---:|---:|---:|---:|
| 1 | 3.102,58 ms | 3.105,02 ms | 38 MB | 2 MB |
| 2 | 3.625,96 ms | 4.044,00 ms | 38 MB | 2 MB |
| 3 | 4.053,45 ms | 4.405,41 ms | 38 MB | 2 MB |

En las tres ejecuciones, el pico de memoria PHP reportado bajó **38 MB → 2 MB (aprox. 94,7 %)**. El tiempo fue similar en la primera y de **~9 a 12 % mayor** en las otras. Es una mejora de **uso de memoria y resistencia a históricos extensos**, no de latencia garantizada.

La memoria medida es la reportada por `memory_get_peak_usage(true)` en PHP dentro del fixture; no equivale a toda la memoria del proceso MySQL/PHP-FPM del VPS. Los resultados y umbrales deberán verificarse con datos institucionales autorizados antes de sacar conclusiones sobre carga real.

## Reglas de despliegue y reversión

1. Publicar **solo** las clases PHP de modelo y servicio después de QA. No ejecutar scripts de estructura ni habilitar `GROBO_MYFORMS_SEARCH_INDEX`.
2. Verificar hashes en VPS, Nginx/PHP-FPM, JWT y accesos no autenticados 401; los tests del navegador sin sesión **no reemplazan** el QA con usuarios autorizados.
3. Ante regresiones en historiales grandes, restaurar únicamente esos archivos desde el backup controlado; no es necesario tocar tablas científicas.
4. Sigue pendiente resolver un índice de texto de baja carga de escrituras o una arquitectura de proyección aprobada para lograr una mejora fuerte de latencia.

## Limitaciones

- Las búsquedas libres de texto deben inspeccionar todas las fichas autorizadas para contar resultados exactos. Keyset limita memoria, pero mantiene esfuerzo total aproximado proporcional al historial.
- Para historiales muy grandes, pueden requerirse muchas consultas con JOIN y nuevas verificaciones de autorización. Conviene monitorizar tiempo `Server-Timing`, cancelaciones HTTP y los límites de ejecución PHP-FPM.
- No hay métricas autenticadas del VPS ni confirmación de sesiones de ensayo URBE/CUPAE. El índice experimental de 39 triggers y 64 contadores continúa **desactivado**.

## QA general completado

- Test de **21.030 fichas**, incluyendo protocolo derivado, conteo de todos los IDs, límites de la exportación y aislamiento: `GROBO_MYFORMS_KEYSET_ABOVE_20K_MYSQL_OK`.
- Suite de filtros MySQL: **11/11 bloques**, con 100 combinaciones contra la semántica anterior y cuatro offsets por combinación.
- Exportación CSV MySQL: **7/7**, incluida validación de estados, precios, rutas, límites de descarga y cambios concurrentes.
- Índice opcional inactivo: **16/16**, comparando 80 búsquedas, 39 triggers de ensayo, derivaciones y aislamiento.
- PHP general: **96/96**; paginación PHP: **8/8**.
- Chrome sintético: **19/19**; render/PDF: **6/6**; exportación paginada CSV: **7/7**. Auditoría JS/HTML: 187 JS, 84 HTML y 447 importaciones sin errores.
- `php -l` validó clases y pruebas modificadas. En el banco de 5.000 registros, nueve comparaciones de filtros se mantuvieron idénticas; la ruta de 12.000 fichas no se activó.

**Importante:** la medición de 5.000 fichas usa condiciones locales distintas a las de historiales de 13.030. No se atribuyen ganancias de velocidad a la aplicación completa. El camino de lectura por lotes prioriza memoria y solo opera sobre el historial del JWT.

## Despliegue de código y verificación posterior

- **Commit funcional:** `b7e6adb` en la rama `fix/grobo-seguridad-facturacion-20261102`, subida a GitHub.
- **Release:** `myforms-keyset-b7e6adb`, exclusivamente dos archivos PHP: `api/src/Models/UserForms/UserFormsModel.php` y `api/src/Services/UserForms/UserFormsFilterService.php`.
- `GROBO_MANIFEST_OK version=myforms-keyset-b7e6adb files=2`; `GROBO_CONTROLLED_DEPLOY_OK version=myforms-keyset-b7e6adb files=2`.
- **Respaldo automático:** `/root/grobo-managed-backup-20261113T232243Z`.
- **SHA-256 comprobados en VPS:** modelo `ae8dc69133be343729351def8279e579a044f44055cbc9e53017dfddb5b3f17c`; servicio `e23ee7d1e2b5faff941ec6aef367420e6a8fee2e8ae9432b8c4c025d0c80f8eb`. Ambos idénticos a los hashes del paquete.
- Estado en VPS: Nginx/PHP-FPM activos, JWT preflight correcto y seguridad multiinstitucional vigente.
- **10/10 controles públicos postdeploy**: HTML/JS de versión vigente, cinco rutas privadas devolviendo 401 JSON sin exposición, redirecciones a login en 390/768/1366 px.
- **Sin DDL en producción**, no se instalaron tablas/triggers ni se alteró la base de datos o `GROBO_MYFORMS_SEARCH_INDEX`. La nueva ruta grande está incorporada al servicio PHP con umbral de 12.000 formularios visibles.
- **Pendiente:** medir `Server-Timing` con cuentas de ensayo institucionales autorizadas, comprobar memoria real de PHP-FPM en VPS y completar pruebas autenticadas URBE/CUPAE. Las verificaciones de navegador sin sesión no sustituyen esos controles.
