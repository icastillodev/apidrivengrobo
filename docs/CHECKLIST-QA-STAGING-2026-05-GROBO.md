# QA staging — Mayo 2026 (GROBO)

Lista de verificación para **cerrar** el índice maestro en [`CHECKLIST-PRODUCTO-2026-05-GROBO.md`](CHECKLIST-PRODUCTO-2026-05-GROBO.md). Marcar cada fila **OK** en staging antes de pasar ítems a `[x]` en el checklist de producto.

**Entorno:** staging con JWT, al menos una sede con red de derivación y dos usuarios investigadores.

---

## SQL previo (phpMyAdmin)

| Migración | Archivo | OK |
|-----------|---------|-----|
| Mensajería (`mensaje_hilo`, `mensaje`, `mensaje_leido`) | [`migrations/20260401_mensajeria_noticias.sql`](migrations/20260401_mensajeria_noticias.sql) | [ ] |
| Hilos institucionales (si aplica) | [`migrations/20260405_mensaje_hilo_institucional.sql`](migrations/20260405_mensaje_hilo_institucional.sql) | [ ] |
| `historialpago.fecha` → DATETIME | [`migrations/2026-05-09-historialpago-fecha-datetime.sql`](migrations/2026-05-09-historialpago-fecha-datetime.sql) | [ ] |
| Trazabilidad `con_cirugia` (M20 / BD-05) | [`migrations/2026-05-21-trazabilidad-con-cirugia.sql`](migrations/2026-05-21-trazabilidad-con-cirugia.sql) | [ ] |

Detalle e inventario: [`BACKLOG-BASE-DATOS.md`](BACKLOG-BASE-DATOS.md).

---

## C — Búsqueda global (sin IA)

| # | Paso | Rol | OK |
|---|------|-----|-----|
| C1 | `Ctrl+G` / `Ctrl+K` abre Gecko Search; no aparece panel IA en el overlay | Todos | [ ] |
| C2 | Buscar **ID numérico** de pedido existente → resultado en «Pedidos» | Admin | [ ] |
| C3 | Buscar n° protocolo y nombre investigador | Admin | [ ] |
| C4 | Prefijo `pedido 123` limita a pedidos | Admin | [ ] |
| C5 | Investigador: no ve pedidos de otros usuarios | Inv. | [ ] |
| C6 | Sin sesión / token expirado: mensaje genérico (no detalle técnico) | Todos | [ ] |

---

## D — Hotkeys

| # | Paso | Rol | OK |
|---|------|-----|-----|
| D1 | `Alt+N` → centro formularios | Todos | [ ] |
| D2 | `Alt+J` → noticias portal | Todos | [ ] |
| D3 | `Ctrl+Shift+F` → foco en filtro de tabla (mensajes, formularios, DataTables) | Contextual | [ ] |
| D4 | `Alt+B` → facturación índice | Admin sede | [ ] |
| D5 | `Alt+X` luego `D` → config. departamentos (en pantalla: abre «Nuevo departamento») | Admin | [ ] |
| D6 | `Alt+X` luego `F` → facturación por departamento | Admin | [ ] |
| D7 | Modal abierto: `C` confirma; `Alt+letra` no navega | Todos | [ ] |
| D8 | Rol investigador: atajos admin (`Alt+X`+`B`) no abren rutas admin | Inv. | [ ] |
| D9 | macOS: `⌘+G`, `⌘+Shift+F` equivalentes | Todos | [ ] |

---

## Gabriel — Formularios / protocolos

| # | Paso | OK |
|---|------|-----|
| G2a | Crear pedido **animales vivos**: selector «Tipo de solicitud» lista todos los tipos con categoría Animal / Animal vivo en BD | [ ] |
| G2b | Si la sede solo tiene un tipo (ej. Docencia): mensaje de ayuda visible; tras crear, **modificar** permite otro tipo si está configurado | [ ] |
| G3a | Admin **animales** / **reactivos**: modificar formulario → protocolos derivados en combo con etiqueta derivado | [ ] |
| G3b | Derivación cruzada: en sede destino, reasignar protocolo destino visible | [ ] |

---

## Gabriel — Mensajería

| # | Paso | OK |
|---|------|-----|
| M1 | Dos usuarios: hilo nuevo, enviar, leer, badge menú baja | [ ] |
| M2 | Filtro `#hilos-filtro` por asunto, nombre, ID | [ ] |
| M3 | Volver a pestaña: lista se refresca | [ ] |

---

## Marie — Facturación

| # | Paso | OK |
|---|------|-----|
| F1 | Pagar: insumos en bloque aparte (no mezclados con animales) | [ ] |
| F2 | Derivado **origen**: sin deuda local / exento | [ ] |
| F3 | Derivado **destino**: cobra PI del protocolo | [ ] |
| F4 | Columna **FECHAS** en tablas y export PDF/Excel | [ ] |
| F5 | Historial de pagos muestra **hora** tras migración DATETIME | [ ] |
| F6 | Insumo duplicado (caso microcirugía): una sola fila en depto/org | [ ] |
| F7 | Facturación por **organismos** lista org → deptos | [ ] |

---

## Operación G/D/M — lote mayo 2026

Referencia: [`CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md`](CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md)

### Gabriel — derivados / facturación / mensajería

| # | Paso | OK |
|---|------|-----|
| G1 | Formulario derivado en sede destino: cambiar cepa a una de la institución local | [ ] |
| G2 | Pedido derivado entregado visible en facturación depto, investigador y protocolo (local vs derivado) | [ ] |
| G5 | Email mensajería: solo link, sin cuerpo del mensaje | [ ] |
| G6 | Mensajería móvil: volver a lista, composer sticky, safe-area | [ ] |

### Mariela — trazabilidad / ficha / QR

| # | Paso | OK |
|---|------|-----|
| M9 | Config tipo dato **Sexo** → dropdown - / macho / hembra en inicio y datos | [ ] |
| M10 | Tipo **text** → textarea; pivot con word-wrap | [ ] |
| M16 | PDF ficha: no blanco; selector simple vs completa | [ ] |
| M20 | Tras migración BD-05: cirugía en alta/inicio, badge y toggle | [ ] |
| M21 | Excel ficha completa por animal/caja | [ ] |
| M22 | QR en móvil/tablet: título protocolo completo; trazabilidad expandida usable | [ ] |
| M18 | Config inicio tipo **Subespecie** / **Cepa** → dropdown catálogo especie | [ ] |
| M23 | PDF/Excel: tramo actual vs todos los tramos | [ ] |
| M5 | Tras migración BD-01: precios modo cobro + tarifa sujeto; facturación respeta modo | [ ] |
| M13 | Ficha animal: badge cobro por sujeto vs contenido | [ ] |

---

## Cierre

Cuando todas las filas críticas estén **OK**, actualizar §0 del checklist de producto y archivar notas de IDs de prueba en la viñeta correspondiente (sin PII en git).

*Última revisión: BD-01 modo cobro (`2026-05-21-alojamiento-modo-cobro.sql`) + M5/M13 en código; BD-05 `con_cirugia` pendiente QA.*
