# GROBO — Optimización de Usuarios y formularios

**Fecha:** 12 de noviembre de 2026
**Alcance:** bandejas administrativas de Usuarios, Animales, Reactivos e Insumos, y consulta de Mis Formularios. No se cambiaron importes, validaciones de stock, datos científicos ni las reglas de negocio.

## Resultado implementado

**Listados:** los cuatro módulos ya tenían paginación en el servidor (15 filas por defecto), filtros y búsquedas. Se conservó esa implementación en vez de duplicarla.

**Departamentos:** nuevo módulo `referenceDataCache.js` compartido. Concurrencias de `/deptos/list` para la misma institución se convierten en una sola petición. Caché de **45 segundos en memoria**, con máximo 6 instituciones; no contiene saldos, formularios ni datos personales. Un cambio de token invalida todas las entradas. Respuestas fallidas nunca se guardan.

**Formularios:** las bandejas de Animales, Reactivos e Insumos muestran el primer listado sin esperar a que finalice `/filtros-meta`, que es independiente. La ficha individual sigue verificando datos contra la API y conserva todos sus controles.

**Páginas precargadas:** `adminListPageCache.js` pasa de intentar precargar 4 páginas vecinas a un máximo de 2 (siguiente/anterior), elimina solicitudes duplicadas simultáneas e impone un máximo de **12 páginas en memoria**. Reduce tráfico especulativo y memoria en sesiones administrativas largas; no cambia los datos, el tamaño de página ni el orden.

**Visibilidad y diagnóstico:** los GET principales de las cuatro bandejas incorporan `Server-Timing` con la duración de la consulta de base de datos y `Cache-Control: private, no-store`. `/user/my-forms` incorpora los mismos encabezados. Son métricas pasivas: no se registran nombres ni detalles de formularios.

## QA

- **6/6 pruebas Chrome de caché:** concurrencia, aislamiento institucional, cambio de token, no caché de errores, precarga de 2 páginas y límite de 12.
- **96/96 pruebas PHP de regresión** anteriores aprobadas.
- **12/12 casos UI** de regresión aprobados.
- **5/5 pruebas Chrome de historial contable** aprobadas.
- Inspección estática de **186 JS y 84 HTML:** sin nuevos errores de sintaxis, importaciones faltantes o referencias rotas.

## Límites y continuidad

- Las mejoras de volumen aquí se midieron con datos ficticios. Las ganancias reales deben evaluarse con `Server-Timing` de usuarios autorizados y datos anonimizados.
- `UserFormsModel::getAllForms` conserva la consulta completa por usuario; si aparecen miles de pedidos en una cuenta, incorporar paginación e índices tras perfilado y mantener el contrato de exportación.
- Excel/CSV de Animales, Reactivos e Insumos aún puede solicitar hasta 8.000/10.000 registros **bajo demanda**. Revisar procesamiento por páginas y exportación en streaming con permisos y filtros, evitando truncamiento.
- El caché de catálogos es de duración corta. Una actualización administrativa puede requerir recargar la página o invalidar el caché; no se utiliza para decidir stock, pagos ni permisos.
- Próxima etapa: evaluar en staging formularios derivados, trazabilidad, consolidación de consultas y rendimiento P50/P95 de MySQL; no publicar índices sin comparar `EXPLAIN`.

**Despliegue:** solo publicar archivos del cambio con manifiesto SHA-256 y respaldo previo. Probar luego URL y módulos en los tres tamaños y autenticación de cada institución con cuentas controladas.
