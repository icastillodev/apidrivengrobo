# Checklist producto — Mayo 2026 (GROBO / URBE)

**Estado:** lista viva — backlog activo (separado del maestro cerrado en [`CHECKLIST-BACKLOG-PRODUCTO-GROBO.md`](CHECKLIST-BACKLOG-PRODUCTO-GROBO.md)).

> **Checklist activo (lote operación Gabriel / Diana / Mariela):** **[`CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md`](CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md)** · BD: [`CHECKLIST-BD-2026-05-OPERACION-GDM.md`](CHECKLIST-BD-2026-05-OPERACION-GDM.md)

**Origen:** pedidos de operación (Gabriel, Marie) + mejora transversal de **búsqueda** y **atajos de teclado**.

**Convención:** `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[?]` bloqueado / decisión pendiente.

## 0. Índice maestro — todo lo pedido (origen operación)

Cada fila debe quedar en `[x]` al cerrar en staging. Detalle en las épicas §3–§6.

| # | Pedido | Épica | Estado |
|---|--------|-------|--------|
| M1 | Insumo duplicado (ej. microcirugía) — una sola fila cobrable | Marie §6.1 | [x] |
| M2 | Al pagar: insumos **aparte** de animales/reactivos | Marie §6.2 | [x] |
| M3 | Derivado en **sede origen**: no suma deuda; liquida en destino | Marie §6.3 | [x] |
| M4 | Derivado en **sede destino**: cobra PI del protocolo | Marie §6.3 | [x] |
| M5 | Fechas inicio pedido en tablas facturación | Marie §6.4 | [x] tablas + export PDF/Excel |
| M6 | Facturación por **organismos** visible (org → depto) | Marie §6.5 | [x] |
| G1 | Mensajería — mejoras acordadas con Gabriel | Gabriel §5.1 | [~] filtro hilos en lista |
| G2 | Pedido directo animales: no solo Docencia al **crear** (editable al modificar) | Gabriel §5.2 | [~] API+front tipos; QA staging |
| G3 | Modificar formulario: protocolos **derivados** en selector | Gabriel §5.3 | [~] animal+reactivo admin; QA |
| C1 | Búsqueda global **sin IA**, categoría + nombre | Épica C §3 | [~] QA: [`CHECKLIST-QA-STAGING-2026-05-GROBO.md`](CHECKLIST-QA-STAGING-2026-05-GROBO.md) |
| C2 | Micrófono / panel IA **fuera** del buscador principal | Épica C §3 | [x] |
| D1 | Hotkeys: más atajos (búsqueda, creación, menús) | Épica D §4 | [~] Alt+N/J, X+D/F, C modal, Ctrl+Shift+F; QA §4.3 |

**Relacionados (no duplicar aquí):**

| Tema | Documento |
|------|-----------|
| Búsqueda + IA + voz (histórico v1) | [`CHECKLIST-BUSQUEDA-IA-VOZ.md`](CHECKLIST-BUSQUEDA-IA-VOZ.md) — **cerrado v1**; este sprint **reemplaza IA por búsqueda determinística** |
| Mensajería (implementación base) | [`checklist-finalizados/CHECKLIST-MENSAJERIA.md`](checklist-finalizados/CHECKLIST-MENSAJERIA.md) |
| Seguridad / auditoría | [`CHECKLIST-SEGURIDAD-Y-AUDITORIA.md`](CHECKLIST-SEGURIDAD-Y-AUDITORIA.md) |
| BD / migraciones | [`BACKLOG-BASE-DATOS.md`](BACKLOG-BASE-DATOS.md) + `docs/migrations/` |
| i18n UI | regla `.cursor/rules/i18n-siempre-traducir.mdc` |

---

## 1. Forma de trabajo (cómo usar este checklist)

### 1.1 Principios

1. **Un ítem = un criterio de aceptación verificable** (staging o caso de prueba documentado).
2. **Orden sugerido:** primero bugs de facturación/derivados (Marie) → formularios/protocolos (Gabriel) → búsqueda → hotkeys → mensajería (nuevas mejoras).
3. **PR pequeños** por épica o sub-épica (ej. «Facturación — insumos en pestaña» aparte de «Derivados — sede cobradora»).
4. Al cerrar un ítem: marcar `[x]`, fecha breve, enlace a commit/PR si existe; si hubo **SQL**, actualizar [`BACKLOG-BASE-DATOS.md`](BACKLOG-BASE-DATOS.md) en el mismo cambio.
5. **QA obligatorio** con datos reales anonimizados cuando el bug es de duplicados o derivación (anotar IDs de ejemplo en la viñeta, no en commits).

### 1.2 Estados por ítem (opcional en PR)

| Etiqueta | Significado |
|----------|-------------|
| `spec` | Falta definir regla de negocio |
| `api` | Backend |
| `front` | UI / JS |
| `i18n` | Claves es/en/pt |
| `qa` | Caso de prueba en staging |
| `bd` | Migración o consulta pesada |

### 1.3 Definición de hecho (DoD) común

- [ ] Comportamiento acordado reproducible en **staging**.
- [ ] Sin regresión obvia en el flujo hermano (ej. depto vs investigador vs protocolo).
- [ ] Textos nuevos en **es / en / pt**.
- [ ] Rutas privadas con `Auditoria::getDatosSesion()` y filtros por `instId` donde aplique.
- [ ] Si el ítem tocó POST/PUT/DELETE sensibles: línea en bitácora según [`CHECKLIST-SEGURIDAD-Y-AUDITORIA.md`](CHECKLIST-SEGURIDAD-Y-AUDITORIA.md).

### 1.4 Fases recomendadas

| Fase | Épica | Objetivo |
|------|--------|----------|
| **A** | Marie — facturación / derivados / UI pagos | Corregir doble conteo, tablas y sede cobradora |
| **B** | Gabriel — formularios y protocolos | Docencia, selector de protocolo con derivados |
| **C** | Búsqueda global sin IA | Omnibúsqueda robusta en toda la app |
| **D** | Hotkeys | Atajos de creación y navegación |
| **E** | Mensajería (mejoras) | Lo que quede fuera del checklist archivado |

---

## 2. Inventario técnico (punto de partida)

| Ámbito | Ubicación principal |
|--------|---------------------|
| Omnibúsqueda UI | `front/dist/js/components/GeckoSearch.js`, `GeckoSearchEngine.js` |
| API búsqueda | `api/src/Controllers/GlobalSearchController.php`, `api/src/Models/Search/GlobalSearchModel.php` |
| IA (a retirar o desacoplar del flujo principal) | `GeckoAiDispatcher.js`, `AiService.php`, `POST /ia/procesar` |
| Atajos | `front/dist/js/utils/hotkeys.js`, i18n `generales.hotkeys.*` |
| Facturación depto / inv / prot | `billingDepto.js`, `investigador/billingInvestigador.js`, `protocolo/billingProtocolo.js`, `BillingModel.php`, `BillingController.php` |
| Facturación organismo | `billingOrg.js`, `POST /billing/org-report`, `getOrganizacionesConDeptos` |
| Derivación | `facturacion_formulario_derivado`, `formulario_derivacion`, `billingInstitucion.js`, `billingDerivacionFiltros.js` |
| Pagos / modal ítems | `billingPayments.js`, `modals/manager.js` |
| Mensajería | `MensajeriaController.php`, `paginas/usuario/mensajes.html`, `paginas/panel/mensajes.html` |
| Formulario animal / tipo | `tipoformularios`, flujo nuevo pedido (grilla animales / registro) |

---

## 3. Épica C — Búsqueda global **sin IA** (más acertada, toda la app)

**Objetivo:** lo que el usuario escribe muestra resultados con **categoría visible** + **nombre/título** legible; búsqueda **determinística** (SQL + ranking local), sin depender de Gemini para el listado principal.

**Referencia actual:** `GlobalSearchModel` ya devuelve buckets (`protocolos`, `usuarios`, `alojamientos`, `formularios`, `insumos`); el overlay mezcla IA en paralelo.

### 3.1 Producto / UX

- [x] **Decisión (2026-05-21):** sin IA en el buscador principal — micrófono oculto; Enter abre primer resultado SQL (no `GeckoAiDispatcher`).
- [x] Cada resultado muestra: **categoría** (i18n), **título principal**, **subtítulo** (investigador, estado, protocolo, etc.).
- [x] Agrupación por categoría en el overlay (encabezados por bucket).
- [ ] Encabezados colapsables si hay muchos hits (opcional).
- [x] Prefijos: `protocolo`, `pedido`, `usuario`, `alojamiento`, `insumo`, `departamento`, `organismo` (`GeckoSearchEngine`).
- [x] Enter → primer resultado; flechas ↑↓ (`GeckoSearch.js`).
- [x] Rol + `instId` vía JWT en `GlobalSearchController` (no confiar en GET).
- [x] Vacío / sin resultados: i18n + sugerencias de prefijos; error genérico en API.

### 3.2 Backend — ampliar cobertura

- [ ] Inventario de **entidades buscables** acordado con negocio (mínimo ampliar):

| Categoría | ¿Hoy? | Ampliación sugerida |
|-----------|--------|---------------------|
| Formularios / pedidos | Sí | Incluir `nprotA`, especie, departamento, estado; JOIN `tipoformularios` (nombre categoría) |
| Protocolos | Sí | Departamento, organismo |
| Usuarios | Sí | DNI, legajo si existe |
| Alojamientos | Sí | Especie, caja, fechas |
| Insumos catálogo | Sí | Código interno si existe |
| Departamentos | Sí (2026-05-21) | `departamentoe.NombreDeptoA` |
| Organismos | Sí (2026-05-21) | `organismoe` |
| Reservas / salas | No | según prioridad |
| Mensajes (asunto/hilo) | No | solo si no filtra PII en listado |
| Menús / ayuda capacitación | No | índice estático JSON por rol (búsqueda local sin SQL) |

- [x] Endpoint `GET /search/global` — buckets ampliados (`GlobalSearchModel` 2026-05-21).
- [ ] Respuesta normalizada plana `items[]` (opcional; hoy buckets por categoría):

```json
{
  "items": [
    { "category": "protocolo", "id": 12, "title": "PROT-2024-01", "subtitle": "Título…", "url": "…", "score": 100 }
  ]
}
```

- [x] Ranking parcial: ID exacto formulario/protocolo antes en `ORDER BY`.
- [x] Límite 20 por categoría (`LIMIT_PER_BUCKET`).
- [ ] **Performance:** índices si LIKE pesado en prod.
- [x] Debounce 300 ms + cancelación por generación (`GeckoSearch.js`).

### 3.3 Front

- [x] `GeckoSearch.js`: render por categoría + icono; **sin** `GeckoAiDispatcher`.
- [x] `Ctrl+K` / `Ctrl+G` (overlay).
- [x] Actualizar tour/capacitación que mencione IA en el buscador (es/en/pt) — `capacitacionManual.*.js` panel__perfil §Gecko Search.
- [ ] Puntero en [`CHECKLIST-BUSQUEDA-IA-VOZ.md`](CHECKLIST-BUSQUEDA-IA-VOZ.md).

### 3.4 QA búsqueda

- [ ] Admin: buscar por ID formulario, nombre investigador, n° protocolo, nombre insumo.
- [ ] Investigador: solo ve sus protocolos/pedidos.
- [ ] Prefijos `protocolo 123` limitan scope.
- [x] Sin token / sesión expirada: mensaje i18n `search_omni_session_expired` en overlay.

---

## 4. Épica D — Hotkeys (más accesos, creación, navegación)

**Referencia:** `front/dist/js/utils/hotkeys.js` — ya hay Alt+D, Alt+F, Alt+X luego letra (admin), etc.

### 4.1 Auditoría

- [ ] Listar atajos **rotos** o que no respetan `Auth` / ruta panel vs usuario (`getCorrectPath`).
- [ ] Detectar conflictos con el navegador (Ctrl+K en Chrome, etc.) y documentar alternativas.
- [ ] Comprobar que `?` y `Esc` funcionan fuera de inputs (ya previsto).

### 4.2 Nuevos atajos propuestos (validar con equipo)

| Atajo | Acción propuesta | Rol |
|-------|------------------|-----|
| `Alt+N` | **Nuevo pedido** — centro formularios (`formularios.html`) | Todos con permiso |
| `Alt+J` | Noticias portal (antes `Alt+N`) | Todos |
| `Alt+B` | Facturación índice | Admin |
| `Alt+H` | Ayuda contextual de la página actual | Todos |
| `Ctrl+Shift+F` | Foco en filtro principal de la tabla visible | Contextual |
| `Alt+X luego D` | Nuevo departamento (config) | Admin config |
| `Alt+X luego F` | Facturación por departamento | Admin |
| Secuencia `C` tras abrir modal | Confirmar (guardar) si hay botón primario | Modales |

- [x] Modal de ayuda (`getHotkeyRowDefinitions`) actualizado en **es / en / pt** (Alt+N/J, Alt+X+D/F, C modal, Ctrl+Shift+F).
- [x] Opción en preferencias usuario: **desactivar atajos** (accesibilidad) — casilla en modal atajos (`grobo_hotkeys_disabled` en localStorage).
- [x] Chips en botones frecuentes («Nuevo pedido») mostrando atajo (solo desktop) — `data-hotkey-chip` + `hotkeyChips.js`.

### 4.3 QA hotkeys

- [ ] Windows + macOS (⌘ vs Ctrl).
- [ ] Con foco en SweetAlert / modal Bootstrap no dispara navegación indebida.
- [ ] Rol investigador no abre rutas admin.

---

## 5. Épica E — Gabriel

### 5.1 Mensajería

**Base:** código y checklist archivado en [`checklist-finalizados/CHECKLIST-MENSAJERIA.md`](checklist-finalizados/CHECKLIST-MENSAJERIA.md).

- [ ] Confirmar migración ejecutada en producción (`mensaje_hilo`, `mensaje`, `mensaje_leido`) — SQL: [`migrations/20260401_mensajeria_noticias.sql`](migrations/20260401_mensajeria_noticias.sql), [`migrations/20260405_mensaje_hilo_institucional.sql`](migrations/20260405_mensaje_hilo_institucional.sql); QA: [`CHECKLIST-QA-STAGING-2026-05-GROBO.md`](CHECKLIST-QA-STAGING-2026-05-GROBO.md) §Mensajería.
- [x] **Filtro en lista de hilos** (asunto, nombre, usuario, ID) — cliente en `mensajes.js`; i18n `msg_hilos_filtro*`.
- [ ] **Otras mejoras** (definir con Gabriel): adjunto preview, notificación email (parcial en backlog comunicación), carpetas/archivados, mensajes institucionales masivos → ver [`PROYECTO-CORREOS-MASIVOS.md`](PROYECTO-CORREOS-MASIVOS.md) si aplica.
- [ ] QA dos usuarios misma sede + badge menú + B2 adjunto.

### 5.2 Pedidos directos → solo «Docencia» al crear (animales vivos)

**Síntoma:** pedidos directos llegan forzados a categoría **Docencia**; en **modificar** formulario sí puede cambiarse.

- [ ] Reproducir flujo: pedido directo **animales vivos** → capturar `tipoA` / `tipoformularios` al crear vs al editar.
- [x] Causa: `search-protocols` / `saveOrder` filtraban solo `categoriaformulario = 'Animal'` (tipos legacy «Animal vivo» quedaban fuera).
- [x] **Fix:** `LOWER(TRIM(categoriaformulario)) IN ('animal', 'animal vivo')` en `getActiveProtocolsForUser`, `getFormData`, `saveOrder`.
- [x] Front: selector muestra todos los `form_types` de la API; hints i18n si un solo tipo vs varios (`tipo_unico_hint` / `tipos_multiples_hint`).
- [ ] **Regla negocio (D2):** si la sede solo tiene «Docencia» en `tipoformularios`, configurar más tipos en admin — no es bug de código.
- [ ] Si el negocio exige default docencia: documentar por qué y mostrar aviso i18n al usuario.
- [ ] QA: crear directo → cambiar categoría en modificar → facturación refleja categoría correcta.

### 5.3 Asignar / cambiar protocolo en formulario (incl. derivados)

**Síntoma:** al modificar formulario y elegir protocolo, **no aparecen protocolos derivados**; solo manuales o del investigador.

- [ ] Reproducir en **todos los tipos** de formulario con selector de protocolo.
- [x] API combo admin: `FormDerivacionModel::mergeProtocolsListWithDerivaciones` en `/animals/form-data` y `/reactivos/form-data`.
- [x] Etiqueta front: `protocolo_derivado_de` + `formatAdminProtocolOptionLabel` (es/en/pt).
- [ ] No romper permisos: investigador solo ve los suyos + derivados que le competen; admin ve alcance de sede.
- [ ] QA: derivar formulario → en sede destino, modificar y reasignar protocolo destino visible.

---

## 6. Épica A — Marie (facturación, insumos, derivados, organismos)

### 6.1 Duplicado insumo (ej. microcirugía 01/01/2026–21/05/2026)

- [x] Partición API `partitionProtocoloPedidosAndInsumos` en depto/org (2026-05-21).
- [ ] Caso de prueba documentado en staging (ID formulario).
- [x] Mismo `idformA` no aparece en grilla animal y en insumos del protocolo (depto).
- [ ] QA regresión en investigador/protocolo si reaparece.

### 6.2 Pantalla de pago: insumos separados de animales/reactivos

**Síntoma:** al pagar, insumos aparecen mezclados en la tabla de pedidos de animales/reactivos; deben ir en **pestaña / bloque aparte** «Insumos del protocolo» o «Insumos generales (sin protocolo)».

- [x] Depto + investigador: bloque insumos protocolo + botón `procesarPagoInsumosProtocolo` (2026-05-21).
- [x] `procesarPagoProtocolo` solo animales/alojamiento (no mezcla insumos).
- [x] i18n `btn_pagar_insumos_prot`, `seleccion_insumos_lbl` es/en/pt.
- [ ] QA staging: pagar solo insumos.

### 6.3 Derivados — contabilidad en sede **equivocada**

**Regla de negocio (resumen):**

| Sede | Qué debe ver | Monto / deuda institución |
|------|----------------|---------------------------|
| **Origen** (quien derivó) | Opcional informativo | **No** debe ni pago local; marcar derivado, total 0, exento «paga en sede destino» |
| **Destino** (cobradora) | Sí, para cobrar | Deuda real; paga **investigador dueño del protocolo** en sede destino, no la institución origen |

- [x] `findFacturacionDerivadaSalienteForForm` + merge exento en origen (`BillingModel`).
- [x] Badge «Liquida en {inst}» i18n `derivacion_saliente_hint`.
- [ ] PDF / Excel derivación saliente.
- [ ] QA cruzado staging origen/destino.

### 6.4 Fechas de inicio de pedido en facturación

- [x] Columna FECHAS en facturación **depto** (animales/reactivos).
- [x] Misma columna en protocolo / investigador (animales/reactivos) y tablas **insumos** (API `fecha`/`fecRetiroA`).
- [x] PDF/Excel con columna fechas In/Out (`billingFormatPedidoFechasPlain` en export depto e investigador).

### 6.5 Facturación por **organismos**

- [x] `org-report` respeta chk; deptos con actividad; front lista orgs con deptos.
- [ ] Profundidad UX (editar precios inline vs solo resumen) — decisión D4.
- [ ] QA staging.

---

## 7. Matriz QA rápida (staging)

**Lista ampliada:** [`CHECKLIST-QA-STAGING-2026-05-GROBO.md`](CHECKLIST-QA-STAGING-2026-05-GROBO.md) (SQL previo, hotkeys, mensajería, facturación).

| # | Caso | Épica | OK |
|---|------|-------|-----|
| 1 | Buscar ID pedido en omnibúsqueda sin IA | C | [~] |
| 2 | Alt+N abre formularios; Alt+J noticias | D | [ ] |
| 3 | Pedido animal — tipos Animal/Animal vivo; hint si un solo tipo | Gabriel | [~] |
| 4 | Modificar formulario — protocolo derivado en lista | Gabriel | [~] |
| 5 | Pagar — insumos en pestaña separada | Marie | [x] |
| 6 | Derivado — origen no suma deuda institución | Marie | [x] |
| 7 | Derivado — destino cobra investigador protocolo | Marie | [x] |
| 8 | Facturación — fechas inicio en tablas animal/rea/insumo | Marie | [x] |
| 9 | Facturación org — lista organismos con deptos | Marie | [x] |
| 10 | Insumo microcirugía — una sola fila | Marie | [x] depto/org partition |
| 11 | `historialpago.fecha` DATETIME + hora en historial | Marie / BD | [ ] |

---

## 8. Riesgos y decisiones abiertas

| ID | Pregunta | Responsable |
|----|----------|-------------|
| D1 | IA fuera del buscador principal (solo SQL). Voz/IA legacy fuera de overlay. | **Cerrado** |
| D2 | Pedido directo: ¿default docencia configurable por institución? | Gabriel / negocio |
| D3 | Derivado en origen: ¿visible en listado informativo o oculto del todo? | Marie / contable |
| D4 | Facturación org: ¿misma profundidad que depto (editar precios inline) o solo resumen + link? | Marie |
| D5 | Mensajería: alcance exacto de esta fase vs correos masivos | Gabriel |

---

## 9. Registro de cierre (rellenar al avanzar)

| Fecha | Ítem | Notas |
|-------|------|-------|
| 2026-05-21 | — | Checklist creado; ítems en `[ ]` |
| 2026-05-21 | §0 índice maestro | Todos los pedidos Gabriel/Marie/C/D indexados |
| 2026-05-21 | Marie M1–M4, M6 | Facturación derivación, insumos, org |
| 2026-05-21 | C1–C2 | Búsqueda sin IA: `GeckoSearch.js`, `GlobalSearchModel` |
| 2026-05-21 | G2–G3 (código) | Tipos Animal+Animal vivo al crear; protocolos derivados en combo admin animales/reactivos |
| 2026-05-21 | M5 + D1 parcial | FECHAS en insumos facturación; atajos Alt+B (facturación admin), Alt+H (ayuda pantalla) |
| 2026-05-21 | G1 + C1 + D1 | Filtro hilos mensajería; manual capacitación sin IA en buscador (es/en/pt); pref. desactivar atajos |
| 2026-05-21 | M5 + D1 | Export PDF/Excel fechas In/Out; chips atajo Alt+F (formularios) y Alt+B (facturación) |
| 2026-05-21 | BD + D1 | Migración `historialpago.fecha` DATETIME; Alt+N→formularios, Alt+J→noticias; Ctrl+Shift+F filtro tabla |
| 2026-05-21 | D1 | Alt+X+D/F (deptos config / fact. depto); **C** confirmar modal; bloqueo Alt con overlay; `database.sql` DATETIME |
| 2026-05-21 | C1 + G2 + QA | `search_omni_session_expired`; hint tipos formulario animales; doc [`CHECKLIST-QA-STAGING-2026-05-GROBO.md`](CHECKLIST-QA-STAGING-2026-05-GROBO.md) |

---

*Archivo:* `docs/CHECKLIST-PRODUCTO-2026-05-GROBO.md`  
*Siguiente paso sugerido:* priorizar Fase **A** (Marie — derivados/insumos) o **C** (búsqueda) según urgencia operativa.
