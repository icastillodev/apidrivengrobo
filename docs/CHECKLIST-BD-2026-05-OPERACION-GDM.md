# Checklist BD — Operación Gabriel / Diana / Mariela (GROBO / URBE)

**Propósito:** inventario **solo de cambios de base de datos** del lote [`CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md`](CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md).  
Cuando preguntes «**qué SQL ejecuto**», vení acá primero.

**Convención al implementar:**

1. Crear `docs/migrations/YYYY-MM-DD-descripcion.sql` (ver [`migrations/README.md`](migrations/README.md)).
2. Copiar el mismo bloque en [`BACKLOG-BASE-DATOS.md`](BACKLOG-BASE-DATOS.md) con ancla.
3. Marcar `[x]` aquí y en el ítem de producto vinculado.

**Estado:** `[ ]` pendiente diseño/SQL · `[~]` SQL en repo, no aplicado en prod · `[x]` aplicado staging/prod documentado.

---

## Resumen ejecutivo (qué vas a tocar en phpMyAdmin)

| ID | Tema | Tablas / área (previsto) | Producto |
|----|------|-------------------------|----------|
| **BD-01** | Modo cobro alojamiento (sujeto vs contenido) | `institucion` y/o tarifario alojamiento, posible columna en trazabilidad/precio | M5, M13 |
| **BD-02** | Tipos de dato trazabilidad (Sexo, texto largo) | `categoriadatosunidadalojamiento.TipoDeDato` (varchar) | M9, M10, M14 | [~] |
| **BD-03** | Subespecie + cepa en config/inicio trazabilidad | `especie_alojamiento_unidad` (ya existe) | M11, M18 | [~] |
| **BD-04** | Inicio **por tramo** de alojamiento (override) | Tabla tramo/historia alojamiento o JSON por fila | M19 |
| **BD-05** | Flag **tiene cirugía** en trazabilidad | `especie_alojamiento_unidad.con_cirugia` | M20 | [~] |

**Sin BD en este lote (solo código):** G1–G6, D1, M1–M4, M6–M8, M12, M15–M17, M21–M23 (salvo que implementación revele gap).

---

## BD-01 — Modo de cobro alojamiento (por sujeto vs por contenido)

**Estado:** [~] — migración + API + UI precios/ficha; falta QA staging  
**Producto:** M5, M13  
**Archivo migración:** [`docs/migrations/2026-05-21-alojamiento-modo-cobro.sql`](migrations/2026-05-21-alojamiento-modo-cobro.sql)

### Intención

- Institución con trazabilidad habilitada puede definir si el periodo de alojamiento se factura:
  - **por sujeto** (requiere sujetos trazados; sin sujetos → monto 0), o
  - **por contenido** (cantidad especie/unidades del periodo; no exige trazabilidad de cajas).
- Tarifario: `PrecioXunidad` (contenido/día) y `PrecioXSujeto` (sujeto/día, opcional).
- Snapshot al visar tramo: `PrecioCajaMomento` + `PrecioSujetoMomento`.

### Diseño cerrado (2026-05-21)

| Pregunta | Decisión |
|----------|----------|
| ¿Columna en `institucion` o tabla tarifario? | `institucion.AlojamientoCobroModo` ENUM |
| Precio por sujeto | `tipoalojamiento.PrecioXSujeto` (NULL → fallback `PrecioXunidad`) |
| Snapshot tramo | `alojamiento.PrecioSujetoMomento` al crear/reconfigurar tramo |
| UI modo cobro | Solo si módulo trazabilidad estado ≥ 2 (`PreciosController` + pantalla precios) |
| Facturación | `BillingModel::getAlojamientosProtocolo` vía `AlojamientoCobro` |

### SQL (ejecutar en staging)

Ver archivo [`2026-05-21-alojamiento-modo-cobro.sql`](migrations/2026-05-21-alojamiento-modo-cobro.sql).

### Verificación post-migración

- [ ] Institución sin trazabilidad: columna ignorada en UI.
- [ ] Institución con trazabilidad: precios muestran modo + columna precio sujeto.
- [ ] Facturación alojamiento usa modo en cálculo (sujeto vs cantidad).
- [ ] Ficha animal: badge cobro en cabecera (M13).

---

## BD-02 — Tipos de dato trazabilidad (Sexo, texto largo)

**Estado:** [~] — tipos `sexo` y `text` implementados en front; sin SQL obligatorio  
**Producto:** M9, M10, M14  
**Archivo migración:** opcional / no requerido si `TipoDeDato` sigue siendo `varchar(100)`

### Nota (2026-05)

- La columna `categoriadatosunidadalojamiento.TipoDeDato` ya admite valores libres (`varchar(100)`).
- **M9/M10** se resolvieron en código: config añade `sexo`; `text` usa textarea en trazabilidad.
- Migración SQL solo haría falta si se formaliza ENUM o catálogo separado (decisión pendiente).

---

## BD-03 — Subespecie y cepa en config / inicio trazabilidad

**Estado:** [~] — columnas existentes; tipos dato + UI implementados  
**Producto:** M11, M18  
**Archivo migración:** no requerido (columnas en `docs/database.sql`)

### Nota (2026-05)

- `especie_alojamiento_unidad.idsubespA_sujeto` e `idcepaA_sujeto` ya existen con FK a catálogo.
- **M18:** tipos `subespecie` y `cepa` en config; dropdowns en inicio/alta sujeto guardan vía `update-subject-ficha-bio`.
- Migración solo haría falta si se requiere otro modelo de datos (p. ej. solo EAV sin columnas bio).

### Verificación post-implementación

- [ ] Configurar categoría inicio tipo Subespecie/Cepa por protocolo+especie.
- [ ] Alta sujeto: seleccionar valores → visibles en ficha animal.
- [ ] Editar inicio: cambiar cepa → persiste tras refrescar árbol.

---

## BD-04 — Inicio local por tramo de alojamiento

**Estado:** [ ]  
**Producto:** M19  
**Archivo migración:** `docs/migrations/2026-05-XX-alojamiento-inicio-tramo.sql`

### Intención

- Cada **fila/tramo** de alojamiento puede tener snapshot de «cómo llegó» distinto del inicio global del animal.
- Campos no editados en el tramo **heredan** el global; editados **solo** aplican a ese tramo.

### Diseño pendiente

| Pregunta | Decisión |
|----------|----------|
| ¿Tabla `alojamiento_tramo_inicio` vs JSON en `alojamiento`? | _TBD_ |
| ¿Qué campos son overridables? | _TBD_ (lista blanca) |

### SQL (placeholder)

```sql
-- Contexto: BD-04 — override inicio por id alojamiento/tramo
```

---

## BD-05 — Flag «tiene cirugía» en trazabilidad

**Estado:** [~] — SQL listo; ejecutar en staging/prod  
**Producto:** M20  
**Archivo migración:** [`docs/migrations/2026-05-21-trazabilidad-con-cirugia.sql`](migrations/2026-05-21-trazabilidad-con-cirugia.sql)

### Intención

- Booleano **tiene cirugía** editable en inicio trazabilidad y visible en cabecera ficha.
- Por **sujeto** en el tramo actual (`especie_alojamiento_unidad.con_cirugia`); no sincroniza automáticamente con protocolo del pedido.

### SQL

```sql
-- Contexto: BD-05 — ver docs/migrations/2026-05-21-trazabilidad-con-cirugia.sql
ALTER TABLE especie_alojamiento_unidad
  ADD COLUMN con_cirugia TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Sujeto con cirugía en el tramo actual (trazabilidad)';
```

### Verificación post-migración

- [ ] Alta sujeto con checkbox cirugía → badge visible en árbol y ficha.
- [ ] Guardar inicio con checkbox → persiste tras F5.
- [ ] Toggle botón corazón alterna 0/1 sin error.

---

## Ítems de producto revisados — sin migración prevista

| Producto | Motivo |
|----------|--------|
| G1–G4 | Lógica API/front facturación y formularios derivados |
| G5–G6 | Plantillas email y UI mensajería |
| D1 | Bug carga listado (investigar antes de ALTER) |
| M1–M4, M6–M8 | UI/refresh/CSS |
| M12, M15–M17, M21–M23 | PDF/Excel/QR front o generación sin esquema nuevo |

Si al implementar D1 o M17 hace falta índice o DROP columna legacy, agregar **BD-06** en este archivo.

---

## Registro de aplicación en servidores

| ID | Fecha staging | Fecha prod | Archivo `.sql` | Notas |
|----|---------------|------------|----------------|-------|
| BD-01 | | | `2026-05-21-alojamiento-modo-cobro.sql` | Código listo; pendiente ejecutar |
| BD-02 | | | | |
| BD-03 | | | | |
| BD-04 | | | | |
| BD-05 | | | | |
