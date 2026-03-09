# Checklist i18n – Traducción ES / EN / PT

**ESTADO: ✅ TRADUCCIÓN COMPLETA** — Todas las páginas HTML y archivos JS de interfaz listados están traducidos en **español**, **inglés** y **portugués**. Cualquier texto nuevo que se agregue al proyecto **debe** seguir la regla permanente más abajo.

---

## ⛔ REGLA PERMANENTE (OBLIGATORIA)

**Todo texto visible al usuario (títulos, etiquetas, botones, mensajes, placeholders, columnas de tablas, modales, alertas) DEBE estar traducido en los 3 idiomas (ES, EN, PT).**

- **En HTML:** usar `data-i18n="seccion.clave"` y asegurar `loadLanguage()` + `translatePage()` al cargar la página.
- **En JS:** nunca poner strings fijos en español/inglés/portugués para la UI. Usar siempre `window.txt?.seccion?.clave` y definir la clave en `front/dist/js/utils/i18n/es.js`, `en.js` y `pt.js` con la misma estructura.
- **Al añadir una nueva pantalla, modal o mensaje:** añadir las claves en los 3 archivos de idioma (es, en, pt) y usar esas claves en el código. No dejar textos “para traducir después”.

Si se agrega algo nuevo sin traducir, debe corregirse de inmediato (añadir claves en es/en/pt y usar `window.txt` o `data-i18n`).

---

## Cómo funciona el traductor

- **Archivos de idioma:** `front/dist/js/utils/i18n/es.js`, `en.js`, `pt.js`. Cada uno exporta un objeto (ej. `es`, `en`, `pt`) con la misma estructura de claves.
- **Carga:** `loadLanguage(lang)` importa dinámicamente `./i18n/{lang}.js` y asigna `window.txt = module[lang]`.
- **Idioma elegido:** Se guarda en `localStorage` como `lang` (en la mayoría de la app) o `idioma` (en qrManager). Conviene unificar en `lang`.
- **En HTML:** Los elementos con `data-i18n="ruta.clave"` (ej. `data-i18n="menu.users"`) se rellenan con `translatePage()` después de `loadLanguage()`. En inputs se usa el texto como `placeholder`.
- **En JS:** Donde se construyen modales, tablas o leyendas, usar `window.txt?.seccion?.clave` o `window.txt?.generales?.buscar` en lugar de strings fijos. No traducir datos que vienen del servidor, solo UI (títulos de columnas, botones, mensajes, labels).

---

## Páginas HTML (por área)

Para cada página: [ ] = pendiente traducir/revisar en los 3 idiomas (HTML + JS asociado).  
**ES** = textos en español en i18n y/o HTML. **EN** = inglés. **PT** = portugués.

### Públicas / Login / Registro

| Página | ES | EN | PT | JS principal |
|--------|----|----|-----|--------------|
| `front/index.html` | [x] | [x] | [x] | (login form + i18n) |
| `front/superadmin_login.html` | [x] | [x] | [x] | superAuth.js + i18n |
| `front/paginas/registro.html` | [x] | [x] | [x] | registro.js + i18n |
| `front/paginas/recuperar.html` | [x] | [x] | [x] | recuperar.js + i18n |
| `front/paginas/confirmar.html` | [x] | [x] | [x] | confirmar.js + i18n |
| `front/paginas/resetear.html` | [x] | [x] | [x] | resetear.js + i18n |
| `front/paginas/error404.html` | [x] | [x] | [x] | (script inline + i18n) |
| `front/paginas/construccion.html` | [x] | [x] | [x] | (MenuComponent + i18n) |
| `front/paginas/formulario/index.html` | [x] | [x] | [x] | formularioregistroinst.js + i18n |

### Usuario (panel)

| Página | ES | EN | PT | JS principal |
|--------|----|----|-----|--------------|
| `front/paginas/usuario/dashboard.html` | [x] | [x] | [x] | dashboard.js + i18n |
| `front/paginas/usuario/formularios.html` | [x] | [x] | [x] | formSelector.js + i18n |
| `front/paginas/usuario/formularios/animales.html` | [x] | [x] | [x] | animales.js (formularios) + i18n |
| `front/paginas/usuario/formularios/reactivos.html` | [x] | [x] | [x] | reactivos.js (formularios) + i18n |
| `front/paginas/usuario/formularios/insumos.html` | [x] | [x] | [x] | insumos.js (formularios) + i18n |
| `front/paginas/usuario/misformularios.html` | [x] | [x] | [x] | misformularios.js + i18n |
| `front/paginas/usuario/misprotocolos.html` | [x] | [x] | [x] | modulesprotocolos/main.js + i18n |
| `front/paginas/usuario/misalojamientos.html` | [x] | [x] | [x] | misAlojamientos.js + i18n |
| `front/paginas/usuario/perfil.html` | [x] | [x] | [x] | perfil.js + i18n |

### Admin

| Página | ES | EN | PT | JS principal |
|--------|----|----|-----|--------------|
| `front/paginas/admin/dashboard.html` | [x] | [x] | [x] | dashboard.js + i18n |
| `front/paginas/admin/usuarios.html` | [x] | [x] | [x] | usuarios.js + i18n |
| `front/paginas/admin/protocolos.html` | [x] | [x] | [x] | protocolos.js + i18n |
| `front/paginas/admin/animales.html` | [x] | [x] | [x] | animales.js + i18n |
| `front/paginas/admin/reactivos.html` | [x] | [x] | [x] | reactivos.js + i18n |
| `front/paginas/admin/insumos.html` | [x] | [x] | [x] | insumos.js + i18n |
| `front/paginas/admin/alojamientos.html` | [x] | [x] | [x] | alojamientos.js + módulos + i18n |
| `front/paginas/admin/precios.html` | [x] | [x] | [x] | precios.js + i18n |
| `front/paginas/admin/estadisticas.html` | [x] | [x] | [x] | GeckoStats.js |
| `front/paginas/admin/solicitud_protocolo.html` | [x] | [x] | [x] | solicitudesprotocolo/*.js |
| `front/paginas/admin/historialcontable.html` | [x] | [x] | [x] | historialcontable.js |
| `front/paginas/admin/configuracion/config.html` | [x] | [x] | [x] | configuracion/config.js |
| `front/paginas/admin/configuracion/institucion.html` | [x] | [x] | [x] | config_institucion.js |
| `front/paginas/admin/configuracion/roles.html` | [x] | [x] | [x] | config_roles.js |
| `front/paginas/admin/configuracion/departamentos.html` | [x] | [x] | [x] | config_departamentos.js |
| `front/paginas/admin/configuracion/especies.html` | [x] | [x] | [x] | config_especies.js |
| `front/paginas/admin/configuracion/insumos.html` | [x] | [x] | [x] | config_insumos.js |
| `front/paginas/admin/configuracion/insumos-exp.html` | [x] | [x] | [x] | config_insumos_exp.js |
| `front/paginas/admin/configuracion/alojamientos.html` | [x] | [x] | [x] | config_alojamientos.js |
| `front/paginas/admin/configuracion/reservas.html` | [x] | [x] | [x] | config_reservas.js |
| `front/paginas/admin/configuracion/protocolos-config.html` | [x] | [x] | [x] | config_protocolos.js |
| `front/paginas/admin/configuracion/tipos-form.html` | [x] | [x] | [x] | config_tipos_form.js |
| `front/paginas/admin/facturacion/index.html` | [x] | [x] | [x] | — |
| `front/paginas/admin/facturacion/depto.html` | [x] | [x] | [x] | — |
| `front/paginas/admin/facturacion/investigador.html` | [x] | [x] | [x] | — |
| `front/paginas/admin/facturacion/protocolo.html` | [x] | [x] | [x] | facturacion/*.js |

### Superadmin

| Página | ES | EN | PT | JS principal |
|--------|----|----|-----|--------------|
| `front/paginas/superadmin/dashboard.html` | [x] | [x] | [x] | — |
| `front/paginas/superadmin/instituciones.html` | [x] | [x] | [x] | — |
| `front/paginas/superadmin/institucionformulario.html` | [x] | [x] | [x] | — |
| `front/paginas/superadmin/bitacora.html` | [x] | [x] | [x] | bitacora.js |
| `front/paginas/superadmin/usuarios_global.html` | [x] | [x] | [x] | usuarios.js |

### QR (pública)

| Página | ES | EN | PT | JS principal |
|--------|----|----|-----|--------------|
| `front/paginas/qr-alojamiento.html` | [x] | [x] | [x] | qrManager.js |

---

## Archivos JS con textos de interfaz (modals, columnas, leyendas)

Estos archivos construyen HTML/strings que deben salir de `window.txt` (no traducir datos del API). Revisar que usen claves de `es.js` / `en.js` / `pt.js` y que esas claves existan en los 3 idiomas.

| Archivo | Sección en txt (ej.) | ES | EN | PT |
|---------|----------------------|----|----|-----|
| `dist/js/pages/admin/usuarios.js` | (ficha, modales, columnas) | [x] | [x] | [x] |
| `dist/js/pages/admin/reactivos.js` | reactivos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/precios.js` | precios.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos/TableUI.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos/TramosUI.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos/HistorialUI.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos/TrazabilidadUI.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos/ExportUI.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/alojamientos/QRPageUI.js` | alojamientos.* | [x] | [x] | [x] |
| `dist/js/pages/admin/qrManager.js` | alojamientos.*, generales | [x] | [x] | [x] |
| `dist/js/pages/admin/solicitudesprotocolo/ui_render.js` | solicitudprotocolo.* | [x] | [x] | [x] |
| `dist/js/pages/admin/solicitudesprotocolo/modals_action.js` | solicitudprotocolo.* | [x] | [x] | [x] |
| `dist/js/pages/admin/GeckoStats.js` | admin_estadisticas (cargando, btn_actualizar) | [x] | [x] | [x] |
| `dist/js/pages/usuario/misformularios.js` | (estados, botones, columnas) | [x] | [x] | [x] |
| `dist/js/pages/usuario/modulesprotocolos/main.js` | misprotocolos.* | [x] | [x] | [x] |
| `dist/js/pages/usuario/misAlojamientos.js` | misalojamientos.* | [x] | [x] | [x] |
| `dist/js/formularioregistroinst.js` | onboarding.* | [x] | [x] | [x] |
| `dist/js/components/menujs/MenuConfig.js` | menu.*, bread.* | [x] | [x] | [x] |
| `dist/js/components/menujs/MenuTemplates.js` | menu.* | [x] | [x] | [x] |
| `dist/js/components/MenuComponent.js` | menu.* | [x] | [x] | [x] |

---

## ⚠️ Revisión opcional (modales y contenido generado en JS)

**Incluir siempre los modales en la traducción.** Todo lo que ve el usuario debe estar traducido (títulos, labels, botones, mensajes de ayuda). La lista de archivos JS ya está completada; esta sección es para revisión puntual si se detecta algún texto suelto.

| Área / Página | Qué revisar | Estado |
|---------------|-------------|--------|
| **Admin > Usuarios** | Modales de alta/edición de usuario, ficha, columnas de tabla, mensajes | Revisión opcional |
| **Usuario (panel)** | Modales en dashboard, misformularios, perfil, formularios (animales/reactivos/insumos) | Revisión opcional |
| **Admin (otras)** | Modales en protocolos, animales, reactivos, insumos, alojamientos, precios (si se generan por JS) | Revisión opcional |

- Si el modal está en el **HTML**: poner `data-i18n` en cada texto y asegurar `translatePage()` después de `loadLanguage()`.
- Si el modal se **arma en JS** (innerHTML, createElement, plantillas): usar `window.txt?.seccion?.clave` para todos los textos y tener las claves en es/en/pt.

---

## Orden sugerido para ir de a poco

1. Unificar `localStorage`: usar siempre `lang` (y opcionalmente sincronizar `idioma` con `lang` en qrManager).
2. Completar en `es.js`, `en.js`, `pt.js` las claves que falten para una misma página antes de marcar esa página.
3. Por sesión, elegir **una página o un módulo** (ej. “solo Admin > Usuarios” o “solo QR”). Hacer:
   - HTML: `data-i18n` en todos los textos **y en todos los modales** (títulos, labels, botones) y llamar `loadLanguage()` + `translatePage()` al iniciar.
   - JS: reemplazar strings fijos por `window.txt?.seccion?.clave` y añadir las claves en los 3 idiomas. **Incluir siempre los modales** (los que están en HTML y los que se generan por JS).
4. Al terminar una página/módulo, marcar [x] en este checklist para ES/EN/PT según corresponda.

---

## Próximo paso (solo para cambios nuevos)

Al agregar **cualquier** texto de interfaz (título, botón, mensaje, modal, columna):
1. Añadir la clave en `front/dist/js/utils/i18n/es.js`, `en.js` y `pt.js` en la misma ruta.
2. En HTML usar `data-i18n="ruta.clave"`; en JS usar `window.txt?.ruta?.clave`.
3. No commitear strings fijos en español/inglés/portugués para la UI.

---

## Pendiente de traducir (placeholders y textos pequeños)

- [x] **Placeholders de inputs:** Primera tanda en Admin > Alojamientos: claves `alojamientos.ph_buscar_global`, `ph_buscar_prot_reg`, `ph_buscar_user_reg`, `ph_obs_opcional`, `ph_filtrar_prot` en es/en/pt; usadas con `data-i18n` en `paginas/admin/alojamientos.html`. Otras pantallas pueden seguir el mismo patrón.
- [x] **Textos tipo resultados/filtros:** "Vigentes", "Total", "Vencidos", "Activos", "Inactivos" en tablas, badges y filtros. Añadidas claves en `generales` (es.js, en.js, pt.js): `total`, `vigentes`, `vencidos`, `activos`, `inactivos`, `todos`. Usadas en `protocolos.js` (filtro por vencimiento y placeholder buscar) y en `GeckoStats.js` (cabecera PDF).
- [ ] Al completar cada uno, marcar [x] y actualizar los archivos JS/HTML correspondientes en la tabla de "Archivos JS con textos de interfaz" más arriba.

---
- *“Seguir con la página de usuarios (admin)”*
- *“Seguir con la página QR”*
- *“Seguir con Reactivos (admin)”*

y se hará solo esa página o módulo (HTML + JS) en los 3 idiomas y se actualizará este checklist.
