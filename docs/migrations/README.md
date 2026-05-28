# Migraciones SQL (referencia manual)

Los cambios de esquema o datos que no estén ya automatizados en otro sitio se documentan aquí **en archivos `.sql` nuevos**, para poder ejecutarlos en el servidor cuando corresponda y conservar el historial.

## Convención de nombres

`YYYY-MM-DD-descripcion-corta-en-kebab.sql`

Ejemplo: `2026-05-09-facturacion-indice-saldo.sql`

Ejemplos recientes en este repo: `2026-05-09-noticia-orden-fijo.sql` (noticias pin), `2026-05-09-institucion-portada-popup.sql` (portada/popup dashboard por sede), `2026-05-09-institucion-poe.sql` (POE por institución, URLs de adjuntos), `2026-05-09-comunicacion-b2-adjuntos.sql` (mensajes/noticias/portada popup/POE — columnas clave B2), `2026-05-09-noticia-adjuntos-storage-plantilla.sql` (plantilla de referencia).

**Un solo archivo con todo el pack maestro (orden correcto + índices opcionales al final):** `2026-05-09-feature-pack-backlog-maestro.sql`.

**Parche sin re-ejecutar el maestro:** si ya aplicaste el maestro viejo y falta solo la tabla de popups del panel → `2026-05-09-patch-institucion-dashboard-popup-idempotente.sql` (seguro repetir).

**Facturación — hora en historial de pagos:** `2026-05-09-historialpago-fecha-datetime.sql` (`historialpago.fecha` → `DATETIME`). Inventario: [`BACKLOG-BASE-DATOS.md`](../BACKLOG-BASE-DATOS.md#sql-historialpago-fecha-datetime).

**Mensajería (tablas):** `20260401_mensajeria_noticias.sql`, `20260405_mensaje_hilo_institucional.sql`. QA: [`CHECKLIST-QA-STAGING-2026-05-GROBO.md`](../CHECKLIST-QA-STAGING-2026-05-GROBO.md).

**Solo copiar y pegar en phpMyAdmin:** `COPIAR-PARCHE-popup-dashboard.sql` (mismo SQL, nombre obvio).

## Contenido de cada archivo

1. **Cabecera en comentarios**: qué problema resuelve, pantalla/API relacionada, orden de ejecución si hay varios pasos.
2. **Todo el SQL necesario** en ese cambio: `ALTER TABLE`, `CREATE INDEX`, `INSERT` de configuración, vistas, etc.
3. Si hace falta **revertir**, opcionalmente comentar al final el SQL inverso (rollback comentado).

## Convención para el asistente / desarrollo

Cuando se propongan **cambios en base de datos** (tablas, columnas, índices, datos semilla):

- Crear **un archivo nuevo** en esta carpeta con la fecha del día y una descripción breve.
- Incluir **el SQL completo** listo para ejecutar (MySQL/MariaDB según el proyecto).
- No mezclar en el mismo archivo cambios no relacionados; si son dos temas distintos, dos archivos o dos secciones claramente separadas y comentadas.

## Otros scripts sueltos

Hay también `docs/sql/` para alteraciones puntuales documentadas aparte; si prefieres **una sola carpeta**, puedes moverlas aquí con el mismo criterio de nombre por fecha.

## Inventario backlog ↔ BD

Los ítems del backlog de producto que impliquen esquema se listan en **`docs/BACKLOG-BASE-DATOS.md`**; al implementarlos, crear aquí el `.sql` correspondiente y enlazar desde ese documento.
