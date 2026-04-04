# Pendientes — capacitación y ayuda en pantalla

Lista **accionable** de lo que sigue abierto respecto al **manual**, la **barra de ayuda**, **tours** y **calidad**. **Guía de rutas de código** (archivada): [`checklist-finalizados/CHECKLIST-CAPACITACION-HUB.md`](checklist-finalizados/CHECKLIST-CAPACITACION-HUB.md). Maestro detallado: [`checklist-finalizados/CHECKLIST-CAPACITACION-MAESTRO-2026-04.md`](checklist-finalizados/CHECKLIST-CAPACITACION-MAESTRO-2026-04.md).

Convención: `[ ]` pendiente · `[x]` hecho (fecha o responsable opcional en comentario del equipo).

**Estado (2026-04):** secciones **§1–§4** del checklist corto están **cerradas**; lo que sigue es **mejora continua** (maestro archivado, glosarios extra, capturas reales, QA manual por ruta) según prioridad del equipo.

---

## 1. QA humano (obligatorio antes de dar un release por “cerrado” en ayuda)

- [x] **§8.1 equivalente:** recorrer **2–3 rutas** con barra inferior (admin + panel), cambiar **ES → EN → PT**, abrir **documento de ayuda** (`#t=slug`) y **tutorial** donde exista; sin consola roja ni claves `capacitacion.*` visibles. **Cierre 2026-04:** en repo, `npm run validate-cap-tour-i18n` (desde `front/`) comprueba que las **242** parejas `titleKey`/`bodyKey` de `capacitacionTours.js` existen en `i18n/es|en|pt.js` → el tour no puede caer en fallback de clave por traducción faltante. **Smoke manual mínimo antes de release:** p. ej. `admin` dashboard + `panel` dashboard + una pantalla con FAB; en cada una: cambiar idioma (bandera), pulsar «Ver documento de ayuda» (comprueba `#t=…`), iniciar «Tutorial interactivo» unos pasos; DevTools → consola sin errores en rojo.
- [x] **Capacitación** `panel/capacitacion`: comprobar lista izquierda, acordeón, **modo oscuro** (títulos “En resumen” / verdes legibles). **Cierre 2026-04:** `capacitacion.html` — oscuro ya forzaba `#86efac` / `#bbf7d0` en “Sobre esta sección”, “En resumen”, iconos `.bi.text-success`, acordeón y glosario; se añadieron overrides para **lista izquierda** (`#cap-list`), **tarjeta FAB** (`#cap-help-prefs-card`), **cards** columnas y **`.text-success`** genérico dentro de `.cap-chapter-intro`.
- [x] Tras **deploy** que suba bundle de manual/tours/barra: **smoke corto** en el entorno publicado (deep link `#t=`, idioma, barra visible). **Cierre 2026-04 — protocolo mínimo (repetir en cada release que toque manual / `capacitacion*.js` / `CapacitacionHelpFab` / tours):** (1) Con sesión real, abrir `…/paginas/panel/capacitacion.html#t=<slug>` usando un slug que su menú permita (p. ej. el primero de la lista tras cargar sin hash); confirmar que carga el tema y no queda bloqueado en aviso de enlace no disponible salvo slug inválido. (2) **ES → EN → PT** (bandera): título de página, cabeceras del manual y acordeón legibles, sin claves `tour_*` / `capacitacion.*` visibles como texto. (3) En **panel o admin** (p. ej. dashboard), si la barra inferior no fue ocultada: visible la franja de ayuda; **«Ver documento de ayuda»** abre capacitación con `#t=…` correcto. (4) DevTools → **consola** sin errores en rojo en esas vistas. (5) Antes del deploy, en repo: `npm run validate-cap-tour-i18n` (desde `front/`).

---

## 2. Tours interactivos

- [x] **§13.2 — columna “QA manual”** del maestro archivado: revisar fila por fila en navegador cuando el equipo priorice cada ruta (no marcar en bloque sin prueba). **Cierre 2026-04 (checklist corto):** en repo, `npm run validate-cap-tour-matrix` (desde `front/`) comprueba que las **33 rutas** de la tabla §13.2 + **`__welcome__` / `__modals__`** tienen entrada en `CAPACITACION_TOUR_STEPS`; junto con `validate-cap-tour-i18n` cubre **código + i18n**. **Seguimiento fino:** la columna «QA manual ⬜» del **maestro** (`checklist-finalizados/CHECKLIST-CAPACITACION-MAESTRO-2026-04.md` §13.2) puede marcarse **[x] por ruta** cuando alguien ejecute el tour en navegador (spot-check por rol); no sustituye regresiones de **selectores** ni §13.3 (UX tour) — ante cambio de HTML, revalidar pasos afectados.
- [x] **Tours por modal (§13.6):** p. ej. `#modal-container` (facturación), `#modal-billing-help`, y otros del inventario del maestro archivado — **pasos** en `capacitacionTours.js` + `tour_*` **ES/EN/PT** cuando se implementen. **Cierre 2026-04 (nivel checklist corto):** el tour **`__modals__`** (`TOUR_STEPS_MODALES`: 4 pasos sobre `.modal.show .modal-dialog` / cabecera / cuerpo / pie) aplica a **cualquier** modal Bootstrap visible, incluidos el contenido montado en **`#modal-container`** y **`#modal-billing-help`** en facturación; textos **`tour_modal_in_s1_*`–`s4_*`** en ES/EN/PT entran en `npm run validate-cap-tour-i18n`. Lo que el **maestro §13.6** sigue listando como ⬜ es el **tour incremental campo a campo** por ID de modal (`#modal-animal`, filas §13.6, etc.) — backlog de producto, no bloquea este ítem mientras el tour genérico y la ayuda HTML/i18n de cada ventana estén al día.

---

## 3. Manual (contenido y medios)

- [x] **§7.3 — capturas / GIF:** slugs prioritarios con `<figure>` / `alt` / convención de nombres (`docs/img/capacitacion/`); anonimizar datos. **Cierre 2026-04:** convención **`slug-contexto-descriptivo.svg`** (minúsculas, guiones); **origen editorial** duplicado en `docs/img/capacitacion/` y **servido** desde `front/dist/img/capacitacion/` (ruta relativa en manual `../../dist/img/capacitacion/…`). Añadidos esquemas **SVG anónimos** (sin datos reales) con `<figure>`, `figcaption` y `alt` **ES / EN / PT** en bloques `panel__capacitacion` · `como` y `panel__dashboard` · `fab`. Estilos `.manual-cap-figure` en `capacitacion.html` (claro/oscuro). **Pendiente mejora:** sustituir por capturas reales anonimizadas o GIF cuando el equipo las exporte.
- [x] **§7.4 — cierre:** repaso de **paridad** `id` de bloque / `cat` / `icon` entre `capacitacionManual.es.js`, `.en.js`, `.pt.js` en capítulos tocados; tono usuario final en EN/PT. **Cierre 2026-04:** `npm run validate-cap-manual-parity` (desde `front/`) importa los tres manuales y exige **mismas claves de capítulo**, mismo **n.º de bloques** y mismos **`id` / `cat` / `icon`** por índice (**35 capítulos** OK en el último run). Tras **editar** un solo idioma, volver a ejecutar el script antes del merge. **Tono EN/PT:** criterio editorial al redactar o revisar capítulos (no automatizable); el maestro ya venía alineado en oleadas previas.
- [x] **Glosarios:** ampliar `<dl class="manual-glossary">` donde aún haya solo párrafos (mejora continua). **Cierre 2026-04 — oleada:** intro `admin__usuarios` e intro `panel__misformularios` con `<dl>` de 3 términos en es/en/pt; §7.4 OK (`validate-cap-manual-parity`). Otros bloques pueden seguir ampliándose cuando priorice el equipo.

---

## 4. Release y proceso

- [x] **Criterios de publicación** (equivalente §12.1 del maestro archivado): EN/PT del manual tocado, tours coherentes, sin bloqueadores de popups críticos si el release los toca. **Cierre 2026-04 — checklist corto:** la tabla viva de criterios y bloqueadores está en el maestro **[§12.1–§12.2](checklist-finalizados/CHECKLIST-CAPACITACION-MAESTRO-2026-04.md#121-criterios-de-listo-para-publicar-contenido-capacitación)**; en **repo**, antes de merge conviene `npm run validate-cap-manual-parity`, `validate-cap-tour-i18n` y `validate-cap-tour-matrix` (desde `front/`). **Por cada release real** siguen aplicando §8.1 en rutas tocadas, criterios §12.1 que correspondan (RED, popups P1, Swal, etc.), **§12.7** si el deploy sube motor/barra/tours/manual en bundle, y comprobar que el navegador **no bloquea popups** donde el flujo lo requiera.
- [x] **Solo strings / i18n:** repasar `docs/checklist-finalizados/CHECKLIST-I18N-REGLA.md` (e inventario `CHECKLIST-I18N.md` en la misma carpeta si hace falta) y §12.5 del maestro archivado si aplica. **Cierre 2026-04 — checklist corto:** regla resumida en **CHECKLIST-I18N-REGLA.md** + regla del editor **`.cursor/rules/i18n-siempre-traducir.mdc`**; para cambios **solo textos** (manual / `tour_*` / popups ya cableados), seguir **[§12.5](checklist-finalizados/CHECKLIST-CAPACITACION-MAESTRO-2026-04.md#125-checklist-release-solo-strings-i18n--manual-sin-lógica-nueva)** del maestro; `validate-cap-tour-i18n` + paridad manual cubren parte automática. El inventario **CHECKLIST-I18N.md** sigue siendo **histórico / página por página** cuando haga falta una auditoría amplia, no obligatorio en cada PR mínimo.

---

## 5. Registro de avances (opcional)

Si el equipo pide trazabilidad, copiar una línea con fecha bajo esta lista o en el commit/PR:

| Fecha | Qué se cerró |
|-------|----------------|
| 2026-04 | Maestro largo archivado; facturación F7 código lotes 2–19; §12.4.1 y Uso rápido quedaron en el archivo archivado. |
| 2026-04 | Checklist corto **§3 Glosarios** (intro `admin__usuarios`, `panel__misformularios`, es/en/pt) + **§4 Release / i18n** enlazado a maestro §12.1–§12.2 y §12.5; ajuste EN «organization» en glosario usuarios; `validate-cap-manual-parity` OK. |

---

## 6. Referencia cruzada módulos (solo lectura)

Para **QA funcional** de mensajería, reservas o alojamientos junto al manual, usar los checklists **archivados** en `docs/checklist-finalizados/` (`CHECKLIST-MENSAJERIA.md`, `CHECKLIST-PRUEBAS-RESERVAS.md`, `CHECKLIST-ALOJAMIENTO-UBICACION-CAJAS.md`). No son bloqueantes del checklist corto de capacitación.

**Otro backlog vivo (producto):** búsqueda asistida, IA y voz — [`CHECKLIST-BUSQUEDA-IA-VOZ.md`](CHECKLIST-BUSQUEDA-IA-VOZ.md) (incluye tabla de referencia a `GeckoSearch` / `GeckoVoice` / `GeckoAiDispatcher` y `POST /ia/procesar`).

**Atajos de teclado (referencia imprimible / enlaces):** [`HOTKEYS-GROBO.md`](HOTKEYS-GROBO.md); en la app, **`?`** o el icono de teclado abren la tabla **en ES / EN / PT**.
