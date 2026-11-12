# GROBO — Optimización de listados: Contable, Protocolos y Alojamientos

**Fecha:** 12 de noviembre de 2026
**Objetivo:** reducir latencia y memoria en listados grandes, manteniendo el diseño, los permisos, los importes, los cálculos y los datos institucionales.
**Alcance:** lecturas; **no** se modificaron movimientos, pagos, precios snapshot, protocolos o alojamientos de producción durante los ensayos.

## Cambios entregados

### 1. Contable / Historial de movimientos

**Antes:** `BillingModel::getFinancialAudit` devolvía todos los movimientos de una institución (sin límite ni filtros SQL). El navegador cargaba la respuesta completa y recién después paginaba a 15 registros.

**Después:** la nueva clase `BillingAuditReader` ofrece consultas de solo lectura parametrizadas por institución y usuario, tipo de movimiento y búsqueda; `LIMIT/OFFSET`, orden estable por fecha + ID y total filtrado. Cada página devuelve como máximo 100 filas (15 por defecto). La nueva respuesta es compatible con el endpoint histórico añadiendo `?paged=1`; las integraciones legacy que no lo envían mantienen el contrato original.

- El frontend de Historial usa páginas server-side y búsqueda con debounce; cancela consultas obsoletas para evitar mostrar resultados de filtros anteriores.
- El botón CSV descarga todo el filtro, incluso si abarca muchas páginas, desde una ruta autenticada independiente: `/billing/audit-history-csv`.
- El CSV no carga una colección de miles de objetos en JavaScript y neutraliza posibles fórmulas peligrosas en nombres/comentarios.
- Conserva las reglas de visibilidad existentes para administradores/contadores y restringe todos los SELECT a `IdInstitucion` obtenido de la sesión (no del navegador).
- Se escaparon nombres de investigadores interpolados en HTML para evitar ejecución de etiquetas.

### 2. Alojamientos

**Antes:** cada fila hacía consultas independientes para contar sujetos trazados y resolver el modo de cobro, provocando el patrón N+1 (aproximadamente dos consultas por registro, más metadatos opcionales).

**Después:** `AlojamientoListMetadata::load` reúne IDs de alojamientos y tipos y consulta lotes de hasta 250, agrupando sujetos y modos por ID. No cambia precios, cálculos de cargo ni snapshots. Se usa en el listado y el historial detallado. Se evita agrupar las últimas estadías de otra institución, aplicando `IdInstitucion` también dentro del subquery `MAX(IdAlojamiento)`. `Server-Timing` informa la duración en ms de la lectura.

### 3. Protocolos

- En `ProtocolModel::getByInstitution` se eliminó una repetición del SUM de animales comprometidos: `AnimalesTotales` se deriva de `AnimalesComprometidos + SaldoAnimales` por fila, preservando el resultado previo.
- Se reemplazó un `LEFT JOIN protinstr` que multiplicaba registros por un `EXISTS` que comprueba asignación a la institución sin duplicar filas. Mantiene el flujo para protocolos propios, aprobados en red y formularios derivados.
- `protocolos.js` obtiene el catálogo del formulario y el listado en paralelo, sin sumar los tiempos de dos requests independientes.
- Se añadió `Server-Timing: protocol-db`, y `Cache-Control: private, no-store` para respuestas de datos sensibles.

## Evidencia de las pruebas (sin datos de producción)

| Prueba | Resultado |
|---|---|
| Alojamientos, 620 registros de ensayo | **7 consultas agrupadas** versus aprox. **1240 consultas individuales** del patrón anterior; resultados equivalentes en fixture |
| Alojamientos entre instituciones | Subconsulta de última estadía con `IdInstitucion` en ambas consultas SQL; parámetros [12,12] |
| Contable, 3000 movimientos SQLite | 2100 en institución 1 y 900 en institución 12, correctamente separados |
| Contable, transferencia de datos estimada | Página de 15: **3506 bytes**; listado de 2100 aproximado **490 840 bytes** con mismo tamaño medio; no son métricas de producción |
| Contable, filtrado y CSV | 12 fixtures de SQL, 5 pruebas Chrome de navegación/filtros/descarga, streaming de 450 filas |
| Protocolos | Cálculo de animales y parámetros institucionales equivalentes; sin subconsulta SUM duplicada ni JOIN amplio |
| Pruebas PHP anteriores | 96 fixtures aprobados |
| Pruebas UI anteriores | 12 mocks aprobados |
| Sintaxis PHP | 142 archivos, ningún error |
| Integridad JS / HTML | Sin errores nuevos de importación, parseo ni estructura |

## Verificación de producción y límites

El despliegue debe realizarse **solo mediante manifiesto SHA256**, con 13 archivos de aplicación autorizados y rollback del helper `grobo-deploy-apply`. Confirmar versiones y respuestas públicas en Chrome, permisos de endpoints nuevos sin token y hashes 13/13.

Estas mediciones prueban una reducción teórica del número de queries en los ejemplos y una transferencia menor para el historial, pero **no** demuestran la mejora real de p95 en el VPS. Para cuantificar tiempos reales se necesita un administrador de ensayo, datos despersonalizados, revisar `Server-Timing` y eventualmente analizar `EXPLAIN`/índices de las consultas grandes, sin alterar información científica.

El backend sigue admitiendo contratos legacy no paginados por compatibilidad; si todos los consumidores se migran, se podrá deshabilitarlos para evitar cargas completas accidentales.

**No rediseñar** las tablas ni cambiar la semántica de los pagos al optimizar. El objetivo es hacer más rápida la misma app.
