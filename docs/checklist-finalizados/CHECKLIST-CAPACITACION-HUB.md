# Checklist capacitación GROBO (archivado — guía)

Documento **corto** de referencia: qué tocar en el producto. **Lista viva de pendientes:** [`../CHECKLIST-CAPACITACION-PENDIENTE.md`](../CHECKLIST-CAPACITACION-PENDIENTE.md).

| Documento | Para qué |
|-----------|----------|
| **[CHECKLIST-CAPACITACION-PENDIENTE.md](../CHECKLIST-CAPACITACION-PENDIENTE.md)** | Lista **solo pendientes** (QA, tours, capturas, release). |
| **[CHECKLIST-I18N-REGLA.md](CHECKLIST-I18N-REGLA.md)** | Regla **ES / EN / PT** (corta); inventario largo: **[CHECKLIST-I18N.md](CHECKLIST-I18N.md)**. |
| **Maestro histórico** | [CHECKLIST-CAPACITACION-MAESTRO-2026-04.md](CHECKLIST-CAPACITACION-MAESTRO-2026-04.md) — §5–§14, lotes facturación. |
| **Índice archivados** | [README.md](README.md) |

## Archivos clave (código)

| Área | Ruta |
|------|------|
| Manual (ES / EN / PT) | `front/dist/js/utils/capacitacionManual.{es,en,pt}.js` |
| Motor página biblioteca | `front/dist/js/pages/usuario/capacitacion.js` |
| Rutas / slugs / menú | `front/dist/js/utils/capacitacionPaths.js`, `capacitacionMenuPaths.js`, `capacitacionLabels.js` |
| Tours | `front/dist/js/utils/capacitacionTours.js` + claves `capacitacion.tour_*` en `i18n/{es,en,pt}.js` |
| Barra ayuda / FAB | `front/dist/js/components/CapacitacionHelpFab.js`, `CapacitacionPageHelpMenu.js` |
| Estilos manual (claro / oscuro) | `front/paginas/panel/capacitacion.html` (`<style>` inline) |

## Reglas rápidas

1. **Texto visible al usuario** → siempre **3 idiomas** (véase [CHECKLIST-I18N-REGLA.md](CHECKLIST-I18N-REGLA.md) y `.cursor/rules/i18n-siempre-traducir.mdc`).
2. **Nueva pantalla en el menú** → slug en los tres `capacitacionManual.*`, `pathnameToMenuPath` / `CAPACITACION_PATH_ORDER` si aplica, `titulos_pagina` + `PATH_TO_TITLE_KEY` en `i18n.js` si hay `data-page-title-key`.
3. **Cambio que afecta ayuda en pantalla** → manual o tour; anotar en **CHECKLIST-CAPACITACION-PENDIENTE.md** (en `docs/`).

## Otros temas

- **Búsqueda, IA y voz:** [`../CHECKLIST-BUSQUEDA-IA-VOZ.md`](../CHECKLIST-BUSQUEDA-IA-VOZ.md)
- **Sprint cerrado:** [CHECKLIST-ACTIVO.md](CHECKLIST-ACTIVO.md)

---

*Archivado en `checklist-finalizados/` (2026-04). Trabajo diario: solo `CHECKLIST-CAPACITACION-PENDIENTE.md` + `CHECKLIST-BUSQUEDA-IA-VOZ.md` en `docs/`.*
