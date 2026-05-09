# Backlog — impacto en base de datos (GROBO / URBE)

Este documento es la **hoja de ruta de BD**: aquí ves qué toca el backlog y **podés copiar el SQL** para pegarlo en **phpMyAdmin** (pestaña **SQL**) o importar el archivo desde `docs/migrations/`. Los `.sql` del repo son la misma fuente; si cambia algo, actualizá **esta página** y el archivo enlazado.

**Convención para agentes / equipo:** Cursor → `.cursor/rules/urbe-docs-bd-y-checklists.mdc` (misma página para BD + cómo archivar checklists en `docs/checklist-finalizados/`).

**Lista funcional de producto:** `CHECKLIST-BACKLOG-PRODUCTO-GROBO.md`  
**Convención de migraciones:** `docs/migrations/README.md`  
**Esquema de referencia (dump):** `docs/database.sql`

---

## Índice rápido

| Sección | Qué encontrás |
|---------|-----------------|
| [Noticias fijadas (OrdenFijo)](#sql-noticias-fijo) | `ALTER TABLE noticia` listo para ejecutar |
| [Anestésicos (pedido / protocolo)](#sql-anestesicos-formulario) | `formularioe` + `protocoloexpe` |
| [Portada / popup dashboard](#sql-portada-popup) | Tabla `institucion_portada_popup` (URLs adjuntos) |
| [POE institucional](#sql-poe-institucional) | Tabla `institucion_poe` (texto + hasta 2 URLs) |
| [Adjuntos / Backblaze (plantilla)](#plantilla-backblaze) | Ejemplos comentados para cuando armes storage |
| [Inventario backlog](#inventario-backlog) | Tabla resumen + estado |

---

<a id="sql-noticias-fijo"></a>

## Noticias fijadas — OrdenFijo (phpMyAdmin)

**Archivos en el repo (misma lógica que el bloque de abajo):**

- Versión corta MySQL / phpMyAdmin: [`docs/migrations/snippet_mysql_noticia_orden_fijo.sql`](migrations/snippet_mysql_noticia_orden_fijo.sql)
- Versión completa (MariaDB `IF NOT EXISTS`, bloques alternativos): [`docs/migrations/2026-05-09-noticia-orden-fijo.sql`](migrations/2026-05-09-noticia-orden-fijo.sql)

**Antes:** backup de la base.

**En phpMyAdmin:** entrá a tu base → pestaña **SQL** → pegá lo siguiente → Ejecutar.

Si ya corrías esto antes y aparece *Duplicate column* o *Duplicate key*, omití esa parte.

```sql
ALTER TABLE noticia
    ADD COLUMN OrdenFijo TINYINT UNSIGNED NULL DEFAULT NULL
        COMMENT 'Fila superior: 1..3 = posición fija por institución; NULL = no fijada'
        AFTER FechaActualizacion;

ALTER TABLE noticia
    ADD UNIQUE KEY uq_noticia_inst_orden_fijo (IdInstitucion, OrdenFijo);
```

**Semántica:** `OrdenFijo` = `NULL` (no fijada) o `1`…`3` (posición en la fila superior). La unicidad por `(IdInstitucion, OrdenFijo)` evita dos noticias con el mismo orden fijo en la misma sede; el tope de **tres** noticias pin lo valida la aplicación.

---

<a id="sql-anestesicos-formulario"></a>

## Anestésicos — pedido y protocolo (phpMyAdmin)

**Archivo en el repo:** [`docs/migrations/2026-05-09-formulario-anestesicos.sql`](migrations/2026-05-09-formulario-anestesicos.sql)

**Antes:** backup de la base.

Añade `formularioe.TieneAnestesicos` (si el pedido tiene registro de anestésicos aprobado por administración) y `protocoloexpe.PermiteAnestesicos` (si el protocolo permite que el admin gestione ese flag en pedidos de animales). Si aparece *Duplicate column*, omití el `ALTER` correspondiente.

```sql
ALTER TABLE formularioe
    ADD COLUMN TieneAnestesicos TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = formulario prevé anestésicos; 0 = sin aprobación / no aplica'
        AFTER nocuenta;

ALTER TABLE protocoloexpe
    ADD COLUMN PermiteAnestesicos TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = admin puede marcar TieneAnestesicos en pedidos del protocolo'
        AFTER variasInst;
```

---

<a id="sql-portada-popup"></a>

## Portada del panel y popup (dashboard)

**Archivo en el repo:** [`docs/migrations/2026-05-09-institucion-portada-popup.sql`](migrations/2026-05-09-institucion-portada-popup.sql)

Una fila por institución: texto de portada, hasta **dos URLs de adjuntos**, popup activable con texto/adjuntos y **ID opcional** de noticia publicada (`PopupIdNoticia`). Las URLs pueden ser enlaces públicos a PDF/Office u objetos en bucket cuando exista Backblaze.

**Antes:** backup de la base.

---

<a id="sql-poe-institucional"></a>

## POE — protocolos operativos por institución

**Archivo en el repo:** [`docs/migrations/2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql)

Varias filas por institución: **título**, **resumen**, **cuerpo**, **orden**, **activo** y hasta **dos URLs de adjuntos** (`UrlAdjunto1/2` + nombre mostrado). El portal usa `GET /comunicacion/poe` y `GET /comunicacion/poe/:id`; la administración replica el criterio de permisos de noticias/portada. La **subida** de archivos a bucket (Backblaze) queda para la **fase final** junto con adjuntos de noticias, mensajería (máx. 2) y correos masivos.

**Antes:** backup de la base.

---

<a id="plantilla-backblaze"></a>

## Adjuntos / Backblaze — plantilla (no ejecutar aún)

**Archivo en el repo:** [`docs/migrations/2026-05-09-noticia-adjuntos-storage-plantilla.sql`](migrations/2026-05-09-noticia-adjuntos-storage-plantilla.sql)

Cuando definas bucket Backblaze y el modelo (una URL vs varios adjuntos), descomentá y ajustá. Referencia para copiar ideas:

```sql
-- PLANTILLA — NO ejecutar tal cual hasta definir Backblaze (URLs, claves, políticas).
--
-- ALTER TABLE noticia
--     ADD COLUMN UrlAdjunto VARCHAR(768) NULL DEFAULT NULL
--         COMMENT 'URL o key del objeto en almacenamiento externo (ej. Backblaze B2)'
--         AFTER Cuerpo;
--
-- ALTER TABLE noticia
--     ADD COLUMN NombreAdjuntoOriginal VARCHAR(255) NULL DEFAULT NULL
--         COMMENT 'Nombre de archivo mostrado al usuario'
--         AFTER UrlAdjunto;
--
-- CREATE TABLE IF NOT EXISTS noticia_adjunto (
--     IdNoticiaAdjunto INT UNSIGNED NOT NULL AUTO_INCREMENT,
--     IdNoticia INT NOT NULL,
--     UrlObjeto VARCHAR(768) NOT NULL,
--     ...
-- );
```

---

<a id="inventario-backlog"></a>

## Inventario backlog

| Backlog (resumen) | Impacto BD típico | Estado | Dónde ejecutarlo |
|-------------------|-------------------|--------|------------------|
| **Fijar hasta 3 noticias arriba** | `noticia.OrdenFijo` + `UNIQUE (IdInstitucion, OrdenFijo)` | **Código listo** — ejecutar SQL en el servidor antes de usar | [Bloque SQL](#sql-noticias-fijo) · [`snippet_mysql_noticia_orden_fijo.sql`](migrations/snippet_mysql_noticia_orden_fijo.sql) · [`2026-05-09-noticia-orden-fijo.sql`](migrations/2026-05-09-noticia-orden-fijo.sql) |
| Portada + popup dashboard (URLs) | `institucion_portada_popup` | **Código listo** — ejecutar SQL en servidor | [Bloque](#sql-portada-popup) · [`2026-05-09-institucion-portada-popup.sql`](migrations/2026-05-09-institucion-portada-popup.sql) |
| **POE** (portal + admin, URLs) | `institucion_poe` | **Código listo** — ejecutar SQL en servidor | [Bloque](#sql-poe-institucional) · [`2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql) |
| Portada + adjuntos noticia / Backblaze | URLs o tabla `noticia_adjunto` | Pendiente storage masivo | [Plantilla](#plantilla-backblaze) · [`2026-05-09-noticia-adjuntos-storage-plantilla.sql`](migrations/2026-05-09-noticia-adjuntos-storage-plantilla.sql) |
| Atributo formulario **anestésicos** | `formularioe.TieneAnestesicos`, `protocoloexpe.PermiteAnestesicos` | **Código listo** — ejecutar SQL en el servidor antes de usar | [Bloque SQL](#sql-anestesicos-formulario) · [`2026-05-09-formulario-anestesicos.sql`](migrations/2026-05-09-formulario-anestesicos.sql) |
| Historial de pagos no muestra | Quizá bug; si falta persistencia, `historialpago` | Depto: filtro por `protdeptor` + `formularioe.depto`; JOIN formulario por **`idformA` solo** (`getSaldoHistorialSplit`, 2026-05); **refId** obligatorio API/UI para `depto`/`protocolo`; **UX (2026-05):** textos guía en popup (`saldo_hist_hint_*`, `billingPayments.js`); **manual:** `historial_saldo` (`admin__facturacion__index`) y `vs_historial_saldo_facturacion` (`admin__historialcontable`, no confundir pantallas); si sigue vacío, revisar datos | — |
| Facturación institución — depto cobro derivado | Sin migración: `formulario_derivacion.depto_destino` y/o `formularioe.depto` en sede cobradora | **Código listo** — `getInstitutionDerivedReport*` + `billingInstitucion.js` (2026-05); capacitación `derivados_contabilidad` en `admin__facturacion__institucion` | — |
| POEs (institución, 2 adjuntos por URL) | `institucion_poe` | **Código listo** — ejecutar SQL en servidor; **subida** Backblaze en fase final | [Bloque](#sql-poe-institucional) · [`2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql) |
| Correos masivos | Cola, logs | Futuro | — |

---

## Cuando cierres un cambio de BD

1. Actualizar este documento: bloque SQL + fila del inventario + enlace al `.sql` en `docs/migrations/`.
2. En el checklist de producto, marcar el ítem **después** de probar en staging.

---

*Última revisión: inventario — historial de pagos: bloque manual `vs_historial_saldo_facturacion` (`admin__historialcontable`) frente a popup de saldo; facturación institución `derivados_contabilidad`; POE/portada en ciclos anteriores.*
