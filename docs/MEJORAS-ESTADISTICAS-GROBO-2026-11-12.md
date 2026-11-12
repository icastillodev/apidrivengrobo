# GROBO — Estadísticas: rendimiento, PDF integral y UX/UI

**Versión:** 12 de noviembre de 2026
**Objetivo:** mejorar el módulo sin rediseñar la identidad de GROBO ni modificar datos científicos.

## Cambios realizados

- **PDF integral multipágina:** elección de las 12 secciones disponibles (resumen, departamentos, organizaciones, ranking/detalle de especies y cepas, protocolos, categorías, alojamientos, trazabilidad y derivaciones). Se pueden incluir gráficos y, si se consultaron ambos ámbitos con autorización, unir sede y red. Incluye período, institución, fecha y paginación.
- **Exportación por sección:** control junto a las fechas para descargar solo una parte; se mantienen las exportaciones Excel y los PDF de gráficos.
- **Carga diferida:** jsPDF, jsPDF-AutoTable y XLSX solo se descargan cuando el usuario solicita una exportación. Se retira html2pdf de la carga inicial, pues la exportación actual usa jsPDF.
- **Carga no bloqueante:** el indicador global se retira sin esperar la respuesta potencialmente larga de Estadísticas; la propia sección informa carga, error o finalización.
- **Períodos rápidos:** 7, 30 y 90 días y mes actual, con fechas locales (sin desviación por UTC).
- **Caché privada en memoria:** 90 segundos y un máximo de seis consultas, separadas por usuario, institución, ámbito y período. No se usa caché compartida ni almacenamiento persistente de respuestas.
- **Control de concurrencia:** aborta las solicitudes anteriores y descarta resultados que ya no corresponden al filtro visible.
- **Render:** preindexación de especies, cepas y protocolos por departamento; evita recorrer repetidamente todas las listas al generar tarjetas; se escapan valores al interpolar HTML.
- **Diseño adaptable:** barra de acciones y filtros, botones accesibles, mejor distribución en pantallas pequeñas, mensajes de estado.
- **API:** comprobación de rol administrativo e institución a partir del JWT; solamente el superadministrador puede elegir otra institución de forma explícita. Se agrega `Cache-Control: private, no-store` y `Server-Timing: stats-db` para medir la duración del cálculo.
- **Idiomas:** interfaz del PDF y nombres de secciones en ES/EN/PT (el contenido proveniente de la base se mantiene en su idioma original).

## Pruebas de esta tanda

| Prueba | Resultado |
|---|---|
| PDF con dos ámbitos y 12 secciones | 30 páginas y 24 secciones, correcto en fixture sintético |
| PDF de una sola sección | Correcto: 6 páginas de protocolos ficticios |
| Exportación PDF desde Chrome | Descarga PDF correcta |
| Chrome: móvil 390, tablet 768, escritorio 1366 | 5/5 casos aprobados |
| Fechas rápidas, caché 90 s y botón Actualizar | Comprobados en navegador contra API simulada |
| Acceso sede/red, separación institucional y roles | 9/9 pruebas de permisos |
| Regresión existente de seguridad y negocios | 96/96 fixtures PHP |
| Análisis estático JS e importaciones | Sin errores |

## Límites de la validación

Las pruebas usan datos ficticios; no contienen información institucional ni alteran MySQL. No se simularon conjuntos masivos reales ni sesiones autenticadas de cada rol en producción. El incremento de velocidad de la consulta SQL **no tiene aún un porcentaje demostrado**. El nuevo header `Server-Timing` permite recoger mediciones en el entorno real con autorización antes de reescribir SQL.

El servidor contiene consultas complejas, en especial agregaciones por departamento e institución. La siguiente etapa de optimización del backend debe partir de `EXPLAIN ANALYZE` en staging/solo lectura y de índices medidos antes/después. Evitar índices o caching compartido sin validación científica y de aislamiento URBE/CUPAE.

## Próximas mejoras transversales de toda la app

1. Medir p50/p95 de endpoints protegidos sin registrar datos personales.
2. Verificar los listados con 100, 1000 y 10 000 filas ficticias: paginación del servidor y filtros conservados al navegar.
3. Optimizar imágenes y scripts no críticos de otras pantallas con carga diferida, tras auditoría de regresión.
4. Instrumentar fallos y Web Vitals con consentimiento y sin datos sensibles.
5. Completar pruebas por rol en celular, tablet y escritorio con cuentas institucionales de ensayo.
