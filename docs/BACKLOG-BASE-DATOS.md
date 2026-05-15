# Backlog — impacto en base de datos (GROBO / URBE)

Este documento es la **hoja de ruta de BD**: aquí ves qué toca el backlog y **podés copiar el SQL** para pegarlo en **phpMyAdmin** (pestaña **SQL**) o importar el archivo desde `docs/migrations/`. Los `.sql` del repo son la misma fuente; si cambia algo, actualizá **esta página** y el archivo enlazado.

**Convención para agentes / equipo:** Cursor → `.cursor/rules/urbe-docs-bd-y-checklists.mdc` (misma página para BD + cómo archivar checklists en `docs/checklist-finalizados/`).

**Lista funcional de producto:** `CHECKLIST-BACKLOG-PRODUCTO-GROBO.md`  
**Proyecto aparte (no forma parte del backlog maestro):** [`PROYECTO-CORREOS-MASIVOS.md`](PROYECTO-CORREOS-MASIVOS.md) — envío masivo de correo (diseño, legal, cola, auditoría).  
**Seguridad / bitácora / JWT:** `CHECKLIST-SEGURIDAD-Y-AUDITORIA.md` · regla Cursor `.cursor/rules/urbe-seguridad-auditoria.mdc`  
**Convención de migraciones:** `docs/migrations/README.md`  
**SQL todo-en-uno (mismo contenido que los `.sql` sueltos del pack mayo 2026):** [`docs/migrations/2026-05-09-feature-pack-backlog-maestro.sql`](migrations/2026-05-09-feature-pack-backlog-maestro.sql)  
**Esquema de referencia (dump):** `docs/database.sql`

---

## Índice rápido

| Sección | Qué encontrás |
|---------|-----------------|
| [Noticias fijadas (OrdenFijo)](#sql-noticias-fijo) | `ALTER TABLE noticia` listo para ejecutar |
| [Anestésicos (pedido / protocolo)](#sql-anestesicos-formulario) | `formularioe` + `protocoloexpe` |
| [Portada / popup dashboard](#sql-portada-popup) | `institucion_portada_popup` + tabla `institucion_dashboard_popup` (popups admin) |
| [Rendimiento superadmin / bitácora](#sql-rendimiento-superadmin-bitacora) | Índices opcionales `bitacora`, `usuarioe`, `modulosactivosinst` |
| [POE institucional](#sql-poe-institucional) | Tabla `institucion_poe` (texto + hasta 2 URLs) |
| [Comunicación — adjuntos B2](#sql-comunicacion-b2-adjuntos) | `mensaje`, `noticia`, `institucion_portada_popup`, `institucion_poe` (claves B2) |
| [Adjuntos / Backblaze (plantilla)](#plantilla-backblaze) | Ideas legacy; columnas reales en migración B2 de comunicación |
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

<a id="sql-rendimiento-superadmin-bitacora"></a>

## Rendimiento — bitácora y sedes (índices opcionales)

**Archivo en el repo:** [`docs/migrations/2026-05-11-performance-bitacora-modulos-usuarioe.sql`](migrations/2026-05-11-performance-bitacora-modulos-usuarioe.sql)

**Antes:** backup; ejecutar en **staging** y comparar `EXPLAIN` / tiempos con `API_SERVER_TIMING=1` donde aplique.

Propuesta alineada al esquema de referencia (`docs/database.sql`), donde **`bitacora`** y **`usuarioe`** no traían índices secundarios sobre las FK usadas en joins del listado superadmin, y **`modulosactivosinst`** no tenía índice por **`IdInstitucion`** (batch de módulos por sede).

```sql
ALTER TABLE `bitacora`
  ADD INDEX `idx_bitacora_id_usuario` (`id_usuario`);

ALTER TABLE `usuarioe`
  ADD INDEX `idx_usuarioe_IdInstitucion` (`IdInstitucion`);

ALTER TABLE `modulosactivosinst`
  ADD INDEX `idx_modulosactivosinst_IdInstitucion` (`IdInstitucion`);
```

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

**Extensión Backblaze (columnas B2):** si vas a usar subida por API, ejecutá también [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) (bloque `ALTER TABLE institucion_portada_popup`).

**Popups del modal del panel (código actual):** el API y el admin usan la tabla **`institucion_dashboard_popup`** (varios registros por sede, solo uno con `PopupActivo = 1`). Si **ya aplicaste el maestro mayo 2026** y no querés re-ejecutarlo entero, usá solo el parche idempotente **[`docs/migrations/2026-05-09-patch-institucion-dashboard-popup-idempotente.sql`](migrations/2026-05-09-patch-institucion-dashboard-popup-idempotente.sql)** (`CREATE TABLE IF NOT EXISTS` + migración solo donde la sede aún no tiene filas en la nueva tabla). Alternativa: [`2026-05-09-institucion-dashboard-popup.sql`](migrations/2026-05-09-institucion-dashboard-popup.sql) (misma lógica idempotente) o la **Parte 5b** del maestro actualizado **después** del `ALTER` B2 de `institucion_portada_popup`.

**Antes:** backup de la base.

---

<a id="sql-poe-institucional"></a>

## POE — protocolos operativos por institución

**Archivo en el repo:** [`docs/migrations/2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql)

Varias filas por institución: **título**, **resumen**, **cuerpo**, **orden**, **activo** y hasta **dos URLs de adjuntos** (`UrlAdjunto1/2` + nombre mostrado). El portal usa `GET /comunicacion/poe` y `GET /comunicacion/poe/:id`; la administración replica el criterio de permisos de noticias/portada.

**Extensión Backblaze:** instructivos subidos al bucket — columnas `Adjunto1B2Key` / `Adjunto2B2Key` en [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql).

**Antes:** backup de la base.

---

<a id="sql-comunicacion-b2-adjuntos"></a>

## Comunicación — adjuntos Backblaze B2 (mensajes, noticias, portada/popup, POE)

**Archivo en el repo:** [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql)

Añade columnas para **claves de objeto B2** (no URLs públicas obligatorias):

| Tabla | Uso |
|-------|-----|
| `mensaje` | Hasta 1 adjunto por mensaje (`AdjuntoB2Key`, `AdjuntoNombreOriginal`) — perfil **MENSAJES** |
| `noticia` | Imagen portada + hasta 2 documentos — perfil **NOTICIASPOPUP** |
| `institucion_portada_popup` | Imagen portada dashboard + hasta 2 documentos portada + columnas legacy del popup — mismo bucket |
| `institucion_dashboard_popup` | Popups del modal del panel (varios por sede; máx. uno activo) — mismo bucket que portada/noticias según API |
| `institucion_poe` | Hasta 2 instructivos — perfil **POES** |

**Prerrequisitos:** tablas y migraciones previas ya aplicadas (`institucion_portada_popup`, `institucion_dashboard_popup` si usás admin de popups, `institucion_poe`, etc.). **Variables .env:** `B2_KEY_ID_*`, `B2_APPLICATION_KEY_*`, `B2_BUCKET_ID_*`, `B2_BUCKET_NAME_*` con sufijos `MENSAJES`, `NOTICIASPOPUP`, `POES`, `PROTOCOLOS`.

**Antes:** backup de la base. Si *Duplicate column*, omití solo el `ALTER` ya existente.

El contenido completo está en el `.sql` enlazado arriba (copiar/pegar desde ese archivo en phpMyAdmin).

---

<a id="plantilla-backblaze"></a>

## Adjuntos / Backblaze — plantilla (referencia histórica)

**Archivo en el repo:** [`docs/migrations/2026-05-09-noticia-adjuntos-storage-plantilla.sql`](migrations/2026-05-09-noticia-adjuntos-storage-plantilla.sql)

Las **columnas operativas** para noticias/portada/mensajes/POE están en [`2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql). Este archivo plantilla sirve solo como ideas si necesitás otro modelo (tabla separada `noticia_adjunto`, etc.). Referencia:

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
| Portada + popup dashboard (URLs) | `institucion_portada_popup` + **`institucion_dashboard_popup`** | **Código listo** — ejecutar SQL en servidor | [Bloque](#sql-portada-popup) · Maestro Parte 5b · Parche solo popups: [`2026-05-09-patch-institucion-dashboard-popup-idempotente.sql`](migrations/2026-05-09-patch-institucion-dashboard-popup-idempotente.sql) · [`2026-05-09-institucion-dashboard-popup.sql`](migrations/2026-05-09-institucion-dashboard-popup.sql) |
| **POE** (portal + admin, URLs) | `institucion_poe` | **Código listo** — ejecutar SQL en servidor | [Bloque](#sql-poe-institucional) · [`2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql) |
| **Comunicación — adjuntos B2** | `mensaje`, `noticia`, `institucion_portada_popup`, `institucion_poe` | **Código listo** — ejecutar SQL + `.env` buckets | [Bloque](#sql-comunicacion-b2-adjuntos) · [`2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) |
| Portada + adjuntos noticia / Backblaze (ideas extra) | Plantilla opcional | Ver migración B2 arriba | [Plantilla](#plantilla-backblaze) · [`2026-05-09-noticia-adjuntos-storage-plantilla.sql`](migrations/2026-05-09-noticia-adjuntos-storage-plantilla.sql) |
| Atributo formulario **anestésicos** | `formularioe.TieneAnestesicos`, `protocoloexpe.PermiteAnestesicos` | **Código listo** — ejecutar SQL en el servidor antes de usar | [Bloque SQL](#sql-anestesicos-formulario) · [`2026-05-09-formulario-anestesicos.sql`](migrations/2026-05-09-formulario-anestesicos.sql) |
| Historial de pagos no muestra | Quizá bug; si falta persistencia, `historialpago` | Depto: filtro por `protdeptor` + `formularioe.depto`; JOIN formulario por **`idformA` solo** (`getSaldoHistorialSplit`, 2026-05); **refId** obligatorio API/UI para `depto`/`protocolo`; **UX (2026-05):** textos guía en popup (`saldo_hist_hint_*`, `billingPayments.js`); **manual:** `historial_saldo` (`admin__facturacion__index`) y `vs_historial_saldo_facturacion` (`admin__historialcontable`, no confundir pantallas); si sigue vacío, revisar datos | — |
| Facturación institución — depto cobro derivado | Sin migración: `formulario_derivacion.depto_destino` y/o `formularioe.depto` en sede cobradora | **Código listo** — `getInstitutionDerivedReport*` + `billingInstitucion.js` (2026-05); capacitación `derivados_contabilidad` en `admin__facturacion__institucion` | — |
| POEs (institución, URLs + B2 opcional) | `institucion_poe` + columnas B2 | **Código listo** — base [`2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql) + [`2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) | [POE](#sql-poe-institucional) · [B2](#sql-comunicacion-b2-adjuntos) |
| **Índices rendimiento superadmin** | `bitacora(id_usuario)`, `usuarioe(IdInstitucion)`, `modulosactivosinst(IdInstitucion)` | **Propuesta** — validar con EXPLAIN en staging; ejecutar si mejora plan | [Bloque](#sql-rendimiento-superadmin-bitacora) · [`2026-05-11-performance-bitacora-modulos-usuarioe.sql`](migrations/2026-05-11-performance-bitacora-modulos-usuarioe.sql) |

---

## Cuando cierres un cambio de BD

1. Actualizar este documento: bloque SQL + fila del inventario + enlace al `.sql` en `docs/migrations/`.
2. Si el cambio forma parte del backlog maestro de producto, marcar el ítem en `CHECKLIST-BACKLOG-PRODUCTO-GROBO.md` **después** de probar en staging; iniciativas aparte (p. ej. correos masivos) tienen su propio doc (`PROYECTO-CORREOS-MASIVOS.md`).

---

*Última revisión: propuesta índices rendimiento superadmin (`2026-05-11-performance-bitacora-modulos-usuarioe.sql`) en índice + inventario.*
