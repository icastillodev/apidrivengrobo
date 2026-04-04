# Checklist i18n — regla corta (ES / EN / PT)

**Regla del proyecto:** todo texto **visible** en la interfaz debe existir en **español, inglés y portugués**.

## Obligatorio al tocar UI

1. **No** dejar strings fijos en un solo idioma para labels, botones, modales, tablas, Swal, etc.
2. Añadir la misma clave en:
   - `front/dist/js/utils/i18n/es.js`
   - `front/dist/js/utils/i18n/en.js`
   - `front/dist/js/utils/i18n/pt.js`
3. **HTML:** `data-i18n="seccion.clave"` y `loadLanguage()` + `translatePage()`.
4. **JS:** `window.txt?.seccion?.clave` (no traducir datos del API).

## Manual y tours

Si cambias textos del **manual** o de **tours**, mantén paridad en `capacitacionManual.{es,en,pt}.js` y en `capacitacion.tour_*` en los tres i18n.

## Inventario histórico (página por página)

Misma carpeta: **[CHECKLIST-I18N.md](CHECKLIST-I18N.md)**.

Regla en el editor: `.cursor/rules/i18n-siempre-traducir.mdc`.
