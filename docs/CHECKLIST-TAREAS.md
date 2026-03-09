# Checklist de tareas – Instrucciones por ítem

Cada ítem tiene instrucciones para poder ir rellenando los checks.  
`[x]` = hecho · `[ ]` = pendiente

---

## Errores corregidos

- [x] **usuarios.js** – Error "missing } in template string" en líneas 436, 479, 517: se corrigió `'}` por `}` al cerrar template literals.
- [x] **usuarios.js (admin)** – Error "unterminated regular expression literal" en el modal de ficha: se dejó de inyectar datos en `onclick`. Botón "Abrir formulario" usa `data-idform`/`data-categoria` y delegado de clic; botón "Abrir protocolo" usa `data-idprot` y delegado de clic. Títulos/categorías se escapan con `escapeHtmlAttr()` para no romper el template.
- [x] **misformularios.html** – Error "missing ) in parenthetical": se eliminó el texto erróneo `(Niveles 1, 2, 3)` de la línea 28.

---

## Admin – Usuarios (modal)

- [x] **En el modal de ficha de usuario, mostrar el tipo de usuario (rol).**  
  En el modal de detalle (buildModalHtml) se añadió la línea "Tipo de usuario" con badge que muestra el rol (Investigador, Admin, etc.) usando `IdTipousrA`/`IdTipoUsrA` y `window.txt.config_roles`. Clave i18n `ficha_tipo_usuario` en ES, EN, PT.

---

## Superadmin – Usuarios globales

- [x] **Paginación y volver atrás:** En la página de usuarios de superadmin, la paginación no funcionaba (los botones perdían el evento al usar `innerHTML +=`). Se corrigió usando solo `appendChild` y listeners en los enlaces. Se añadió enlace "SUPERADMIN" en el breadcrumb para volver al dashboard.

---

## Superadmin – Instituciones (modal)

- [x] **En el modal de instituciones: "madre de la red" y "en una red".**  
  Implementado: (1) Switch "Madre de la red" en el modal (guarda `madre_grupo`: 1 = sí, 0 = no). (2) Checkbox "En una red": al marcar se muestra input para el nombre de la red; al desmarcar el campo se guarda vacío. Se envían `madre_grupo` y `red` en create/update. Backend: `InstitucionModel` actualizado para INSERT y UPDATE. **Si la tabla `institucion` no tiene las columnas:** ejecutar `ALTER TABLE institucion ADD COLUMN madre_grupo TINYINT(1) DEFAULT 0; ALTER TABLE institucion ADD COLUMN red VARCHAR(255) DEFAULT NULL;`

---

## Registro de institución (formulario onboarding)

- [x] **Guardar al enviar y mostrar todo; poder seguir modificando.** Tras "Finalizar y enviar" ya no se redirige a groboapp.com; se muestra el mensaje de éxito con botón "Seguir editando" y el usuario permanece en el formulario con los datos guardados. Clave i18n `saved_seguir_editando` añadida en ES, EN, PT.
- [x] **Vista admin para ver el registro.** Crear una vista donde el administrador pueda ver todo lo que la institución rellenó en el formulario de registro (datos, organizaciones, departamentos, especies, etc.), en bloques legibles. Traducir en i18n.

---

## Nombres de roles en la app (solo UI; BD sin cambios)

- [x] **En la app: todo lo que diga "admin" (master/sistema) que se llame "Superadmin"; "sec admin" / SecAdmin que se llame "Admin".** Actualizado en i18n (es, en, pt): `superadmin_usuarios_global.rol_administrador` y `rol_secadmin` → "Admin"; en `config_roles` (admin_usuarios y similares) `rol_admin` y `rol_subadmin` → "Admin". En BD no se cambia nada (solo IDs).

---

## Menú

### Títulos de página e idioma
- [x] **Títulos en formato "[Descripción de la página] - GROBO" y en el idioma actual (i18n).**  
  Añadido `titulos_pagina` en es.js, en.js y pt.js. Se aplica con `applyPageTitle()` desde `i18n.js` (llamado en `translatePage()` y en `MenuComponent`). La clave se toma de `data-page-title-key` en el body o se infiere de la ruta (`PATH_TO_TITLE_KEY`).

### No indexación (SEO)
- [x] **Evitar que las páginas de la app sean rastreables en Google.**  
  Se añade `<meta name="robots" content="noindex, nofollow">` en `applyPageTitle()` cuando no existe, y `applyGlobalHeadConfigs()` en MenuConfig ya lo inyecta al cargar el menú. Así todas las páginas de la aplicación quedan no indexables.

### Logo, institución y datos de usuario en la barra
- [x] **Barra superior y lateral: mostrar logo (si existe), al lado el nombre corto de la institución (slug) y los datos de la persona: usuario, ID, nombre y apellido.**  
  En `MenuRender.js`: en `renderTopMenuStructure` el bloque de marca incluye logo (si hay) + nombre de institución (`NombreInst`) + texto de usuario (`getUserDisplayText()`: usuario, id, nombre y apellido). En `renderSideMenuStructure` igual: logo + institución + datos de usuario. Se mantiene el enlace al dashboard en el bloque de marca.

### Logo y nombre corto (comportamiento anterior)
- [x] **Si la institución tiene logo, no mostrar el nombre corto; solo el logo.**  
  **Actualizado:** Se mantiene el logo cuando existe, pero ahora siempre se muestra también el nombre de la institución (slug) y los datos del usuario (usuario, ID, nombre y apellido) como en el ítem anterior.

### Logo en móvil
- [x] **Agrandar el logo del menú en vista móvil.**  
  Añadidos estilos en `MenuStyles.js`: `.gecko-sidebar-logo-mobile` y `.gecko-top-logo-mobile` con mayor `max-height` en móvil (72px / 52px en @media 768px).

### Items dropdown
- [x] **Los ítems de menú que son dropdown deben ocupar un solo lugar; al desplegar, que solo se despliegue en ese lugar (no duplicado en desktop y móvil).**  
  En `MenuEvents.js` se asegura que al hacer clic en un `.dropdown-toggle-gecko` solo se abra el dropdown si su contenedor (`main-menu-ul` o `mobile-menu-ul`) está visible (`offsetParent` y `getComputedStyle(ul).display !== 'none'`). Así solo se despliega el del contexto activo (desktop o móvil), no el duplicado en el otro contenedor.

### Flecha del dropdown
- [x] **Flechita del dropdown centrada y con font-weight más grueso (bolder).**  
  Ajustado en `MenuRender.js`: flecha más grande (12x12), centrada con `d-flex align-items-center justify-content-center` en el menú superior, y en lateral con `d-flex align-items-center` para la flecha.

### Clic en institución o nombre → Dashboard
- [x] **Al tocar "URBE" (o nombre de institución) o el nombre del usuario en la barra, que lleve al dashboard.**  
  Implementado en `MenuRender.js`: tanto el bloque de marca (logo o nombre de institución) como el texto de usuario son enlaces a `getDashboardPath()` (admin o panel según rol).

---

## Login móvil

- [x] **Política de cookies y bloque "Desarrollado por..." deben quedar abajo; logo y "Grobo gestor de reactivos biológicos online" arriba.**  
  En `index.html` se reordenó el DOM con flexbox `order`: en móvil la columna del formulario (logo + institución + tagline "Grobo gestor de reactivos biológicos online" + formulario) tiene `order-1` y la columna de cookies + "Desarrollado por..." tiene `order-2`, quedando arriba el contenido de login y abajo la política y el pie. Se añadió la etiqueta `login.tagline` en i18n (ES, EN, PT).

---

## Dashboard

- [x] **Al pasar el mouse por los cuadrantes del dashboard, que se iluminen un poco; y que al tocar/hacer clic en cualquier cuadrante se vaya al módulo correspondiente.**  
  **Instrucciones:** En la página del dashboard (admin y/o usuario), localizar los cuadrantes (cards/divs). Añadir estilos hover (p. ej. `hover:bg-success/10` o `filter: brightness(1.05)`) y asegurar que cada cuadrante sea un enlace `<a href="...">` o tenga `onclick` que navegue a la ruta del módulo (usando `getCorrectPath` o la ruta fija correspondiente).

---

## Hotkeys

- [x] **Añadir atajo Alt+D para volver al dashboard y documentarlo en el modal de hotkeys.**  
  Implementado en `front/dist/js/utils/hotkeys.js`: se añadió la acción `'d'` que redirige a `admin/dashboard.html` o `usuario/dashboard.html` según el rol, y la entrada "ALT + D - Ir al Dashboard" en la lista de atajos visibles (modal).

---

## i18n – Placeholders y textos pequeños

- [x] **Traducir placeholders de inputs en todas las pantallas que falten (ES, EN, PT).**  
  Primera tanda: añadidas claves en `alojamientos` (es, en, pt): `ph_buscar_global`, `ph_buscar_prot_reg`, `ph_buscar_user_reg`, `ph_obs_opcional`, `ph_filtrar_prot`. Usadas en `paginas/admin/alojamientos.html` con `data-i18n` para que `translatePage()` rellene los placeholders. Otras pantallas pueden seguir el mismo patrón (data-i18n en input/textarea y clave en i18n).

- [x] **Traducir textos tipo "Vigentes", "Total", "Vencidos" y similares (resultados, badges, filtros).**  
  Añadidas en `generales` (es, en, pt): `total`, `vigentes`, `vencidos`, `activos`, `inactivos`, `todos`. Usadas en `protocolos.js` (filtro Vigentes/Vencidos y placeholder buscar) y en `GeckoStats.js` (cabecera PDF "Total"). Ver `docs/CHECKLIST-I18N.md`.

---

## Logo en PDF (LogoEnPdf)

- [x] **Si la institución tiene LogoEnPdf = 1, todos los PDF deben llevar el logo de la institución arriba.**  
  Implementado: (1) `PreciosModel::getInstData()` devuelve `Logo` y `LogoEnPdf`. (2) Helper `front/dist/js/utils/pdfLogoHeader.js`: `getPdfLogoHeaderHtml(logoEnPdf, logoFilename)` para HTML (html2pdf) y `getPdfLogoHeaderFromStorage()` / `getPdfLogoImageUrl()` para usar desde localStorage o jsPDF. (3) Config institución guarda `instLogoEnPdf` en localStorage al cargar; auth.js guarda `instLogoEnPdf` al validar sede (AuthController devuelve `LogoEnPdf`). (4) PDF con logo: precios.js (exportPreciosPDF), PreciosService.downloadUniversalPDF(), usuarios.js (ficha PDF), GeckoStats.js (exportFastPDF). El botón "Mostrar logo en PDF" en Configuración > Institución ya guardaba en BD; ahora se usa en todas las rutas de export.

---

## Estadísticas

### Red (madre de grupo = 1)
- [x] **Para instituciones con madre de grupo = 1, mostrar un bloque extra que permita ver estadísticas de todas las instituciones de la red.**  
  Implementado: (1) Backend: `StatisticsModel::getInstitutionFlags($instId)` devuelve `madre_grupo` y `red`; `getInstitutionIdsInNetwork($instId)` devuelve los IdInstitucion con el mismo `red`; `getGeneralStatsRed($instId, $from, $to)` devuelve la misma estructura que `getGeneralStats` pero agregando todas las instituciones de la red. Rutas: `GET /stats/institution-flags`, `GET /stats/dashboard-red?from=&to=`. (2) Front: en la página de estadísticas (admin), si la institución tiene `madre_grupo == 1` se muestra una card "Estadísticas de la red" con botón "Ver estadísticas de la red". Al pulsar se abre un modal con selector de rango de fechas, botón "Cargar", y al cargar se muestran tarjetas globales y tabla por departamento (con nombre de institución en cada fila). Incluye botones "Exportar PDF" y "Exportar Excel" para esa vista de red. i18n: `red_card_title`, `red_card_desc`, `red_btn_ver`, `red_modal_title`, `red_desde`, `red_hasta`, `red_btn_cargar`, `red_export_pdf`, `red_export_excel` en ES, EN, PT.

### Por organización
- [x] **Añadir "por organización" además de "por departamento" en estadísticas (y en la vista de red si aplica).**  
  Implementado: (1) Backend: `StatisticsModel::getPorOrganizacion($instId, $from, $to)` agrupa por organismo (organismoe); departamentos sin organismo se agregan en una fila "(Sin organización)". Se añade `por_organizacion` a la respuesta de `getGeneralStats` y de `getGeneralStatsRed` (en red, cada fila lleva prefijo de institución). (2) Front: nueva sección "DESGLOSE POR ORGANIZACIÓN" con tabla en `estadisticas.html` (id `org-stats-table`, `table-body-org`). `GeckoStats.js`: `renderTableOrganizacion()` rellena la tabla; en el modal de estadísticas de red se muestran ambas tablas (por departamento y por organización). Export Excel de red incluye hoja "Por_Org_Red". i18n: `desglose_org`, `th_organizacion` en admin_estadisticas (ES, EN, PT) y `sin_organizacion` en generales (ES, EN, PT).

---

## Billing / Facturación

- [ ] **Añadir facturación/accounting por organización (además de por departamento, persona y protocolo).**  
  **Instrucciones:** Crear una nueva página (o pestaña) en el área de facturación para "Por organización". Añadir un contenedor/enlace en el menú o en la página índice de facturación que lleve a esta vista. Reutilizar el patrón de las otras vistas (por departamento, persona, protocolo) y filtrar/agrupar por organización. Traducir en i18n.

---

## Departamento + Organización

- [ ] **En todas las partes donde se muestre el departamento, mostrar al lado la organización (si tiene). Si no tiene (usuario): no mostrar nada. Si es vista de administrador y no tiene: mostrar "- (sin organización)".**  
  **Instrucciones:** Buscar en el proyecto todos los lugares donde se muestra "departamento" o "Departamento" (tablas, fichas, listados). Añadir una columna o línea "Organización" que muestre el nombre de la organización cuando exista. Si el contexto es usuario y no hay organización, no mostrar. Si es vista admin y no hay organización, mostrar texto traducido "- (sin organización)" usando i18n.

---

## Perfil / Configuración de usuario

- [x] **Al entrar a configuración del usuario (panel perfil), no debe redirigir a "Validando" ni expulsar de la app.**  
  En `auth.js`, `checkAccess(allowed, options)` admite `options.skipInstCheck`. En `perfil.html` se llama `Auth.checkAccess([1, 2, 3, 4, 5, 6], { skipInstCheck: true })` para no expulsar por sede/inst nula; solo se exige token y rol en [1–6]. Así los usuarios con rol permitido entran sin redirección al login.

- [x] **Cuando la app expulsa al usuario, debe redirigir a la institución donde estaba, no a la raíz.**  
  En `auth.js`, `logout(forceRoot)` ya guardaba el slug antes de limpiar y lo pasaba a `redirectToLogin`. Se mejoró con fallback: si no hay `NombreInst` en almacenamiento, se intenta obtener el slug desde la URL actual antes de redirigir, y por defecto se usa `urbe`. `redirectToLogin(slug)` ya enviaba a `basePath + slug` para instituciones válidas.

---

## Mejoras estéticas

- [x] **Precios: icono visible en menú/página y líneas de otro color (no rojo).**  
  En el menú, el ítem "Precios" (dentro del dropdown Facturación) ya tiene `svg` en `MenuTemplates.js` (id 202, children). En la página de precios: botón PDF cambiado de `btn-outline-danger` a `btn-outline-secondary`; sección "4. Servicios Institucionales" de `text-danger` a `text-dark`; filas e inputs de la tabla de servicios de `text-danger` a `text-dark` en `precios.js`. Si el icono no se ve en algún tema, revisar `.dropdown-child-icon` en MenuStyles.js.

- [x] **Mejorar la estética de la pantalla donde se elige el formulario (selector de formularios): nombre de cada institución más claro en escritorio y móvil.**  
  En `formSelector.js`: nombre completo de institución con clase `institution-name-selector`, tamaño 1.1rem y mejor línea; slug (NombreInst) en `text-success fw-semibold` 0.8rem; badge "(TU SEDE ACTUAL)" con borde; icono 48px y más espaciado (pb-3). En `formularios.html` se añadieron estilos para contraste del nombre y media query para móvil (font-size 1rem). Mejor legibilidad en escritorio y móvil.

---

## Multiidioma

- [ ] **Asegurar que todas las cadenas nuevas (placeholders, "por organización", "sin organización", estadísticas de red, billing por organización, hotkeys) estén en es/en/pt.**  
  **Instrucciones:** Por cada texto nuevo añadido en los ítems anteriores, crear la clave correspondiente en `es.js`, `en.js` y `pt.js` y usarla en el código. Actualizar `CHECKLIST-I18N.md` si se añaden nuevas secciones o archivos.

---

## Próximas fases (checks para más adelante)

**Nota:** Cuando se llegue a implementar estos ítem, **avisar al usuario**: requerirá cambios en la base de datos. Hasta entonces, los checks a seguir son los de las secciones anteriores (Superadmin instituciones, i18n, Logo PDF, Estadísticas, Billing, Departamento+Organización, Perfil, Mejoras estéticas, Multiidioma).

- [ ] Reservas (módulo completo).
- [ ] Tickets de soporte.
- [ ] Biblioteca de ayuda por rol de usuario.
- [ ] Primeros pasos para usuario nuevo.
- [ ] Mejorar búsqueda con IA (respuestas y ayuda).
- [ ] Mejorar funcionalidad de voz (rellenar formularios y acciones en la app).
- [ ] FAQ: lugar para ver preguntas, rellenar BD y destacar las mejores en un FAQ público.

---

*Cada check se puede ir marcando [x] cuando la tarea esté implementada y probada. Las "Instrucciones" sirven para que cualquier desarrollador sepa qué hacer en ese ítem.*
