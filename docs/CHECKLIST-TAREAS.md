# Checklist de tareas – Instrucciones por ítem

Cada ítem tiene instrucciones para poder ir rellenando los checks.  
`[x]` = hecho · `[ ]` = pendiente

---

## Errores corregidos

- [x] **usuarios.js** – Error "missing } in template string" en líneas 436, 479, 517: se corrigió `'}` por `}` al cerrar template literals.
- [x] **usuarios.js (admin)** – Error "unterminated regular expression literal" en el modal de ficha: se dejó de inyectar datos en `onclick`. Botón "Abrir formulario" usa `data-idform`/`data-categoria` y delegado de clic; botón "Abrir protocolo" usa `data-idprot` y delegado de clic. Títulos/categorías se escapan con `escapeHtmlAttr()` para no romper el template.
- [x] **misformularios.html** – Error "missing ) in parenthetical": se eliminó el texto erróneo `(Niveles 1, 2, 3)` de la línea 28.

---

## Superadmin – Usuarios globales

- [x] **Paginación y volver atrás:** En la página de usuarios de superadmin, la paginación no funcionaba (los botones perdían el evento al usar `innerHTML +=`). Se corrigió usando solo `appendChild` y listeners en los enlaces. Se añadió enlace "SUPERADMIN" en el breadcrumb para volver al dashboard.

---

## Superadmin – Instituciones (modal)

- [ ] **En el modal de instituciones: "madre de la red" y "en una red".**  
  **Instrucciones:** En la vista de superadministrador donde se listan las instituciones, dentro del modal de cada institución: (1) Añadir un botón/toggle para marcar la institución como **madre de la red** (habilitar/deshabilitar). (2) Añadir un **checkbox** "En una red": si está sin marcar, el campo de red queda vacío; si está marcado, mostrar un **input** para escribir el nombre de la red. Al guardar: si el checkbox está marcado y el input tiene valor, guardar ese valor; si está sin marcar, guardar vacío. Persistir en backend los campos correspondientes (p. ej. `madre_grupo`, `red` o los que use la API).

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
- [ ] **Los ítems de menú que son dropdown deben ocupar un solo lugar; al desplegar, que solo se despliegue en ese lugar (no duplicado en desktop y móvil).**  
  **Instrucciones:** Revisar `MenuRender.js` y `MenuEvents.js`: en layout "top" se inserta el mismo ítem en `main-menu-ul` y en el sidebar móvil `mobile-menu-ul`. Asegurar que el dropdown (clase `dropdown-menu-gecko`) esté asociado a un único botón por vista. Ver instrucciones detalladas en el párrafo del checklist.

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

- [ ] **Traducir placeholders de inputs en todas las pantallas que falten (ES, EN, PT).**  
  **Instrucciones:** Revisar cada página/JS que use `placeholder="..."` y sustituir por claves de `window.txt` (p. ej. `placeholder="${window.txt?.seccion?.ph_campo}"`). Añadir las claves en `es.js`, `en.js` y `pt.js`.

- [ ] **Traducir textos tipo "Vigentes", "Total", "Vencidos" y similares (resultados, badges, filtros).**  
  **Instrucciones:** Buscar en el proyecto strings como "Vigentes", "Total", "Vencidos", "Activos", "Inactivos" en tablas, filtros y badges. Añadir claves en la sección correspondiente de i18n (ej. `admin_estadisticas.vigentes`, `generales.total`, `generales.vencidos`) y usarlas en HTML/JS. Actualizar `docs/CHECKLIST-I18N.md` con los archivos/áreas tocados.

---

## Logo en PDF (LogoEnPdf)

- [ ] **Si la institución tiene LogoEnPdf = 1, todos los PDF deben llevar el logo de la institución arriba.**  
  **Instrucciones:** (1) Donde se generen PDFs (front y/o backend), recibir o leer el valor `LogoEnPdf` de la institución (desde API de institución o desde datos ya cargados). (2) Si `LogoEnPdf == 1`, incluir en la generación del PDF (html2pdf, jsPDF o servidor) una cabecera con el logo de la institución (URL o base64). (3) El botón "Mostrar logo en PDF" en Configuración > Institución ya guarda `LogoEnPdf` (config_institucion.js); asegurar que ese valor se use en todas las rutas de export PDF (fichas de usuario, reportes, etc.).

---

## Estadísticas

### Red (madre de grupo = 1)
- [ ] **Para instituciones con madre de grupo = 1, mostrar un bloque extra que permita ver estadísticas de todas las instituciones de la red.**  
  **Instrucciones:** En la página de estadísticas (admin), si la institución tiene `madre_grupo == 1` (o el campo que identifique "madre"), mostrar un botón o card adicional. Al pulsar, abrir una vista (página o modal) con selector de rango de fechas y generar estadísticas agregadas de todas las instituciones de la red. Incluir opciones de exportar PDF y Excel para esa vista de red.

### Por organización
- [ ] **Añadir "por organización" además de "por departamento" en estadísticas (y en la vista de red si aplica).**  
  **Instrucciones:** En la lógica y UI de estadísticas (GeckoStats.js y HTML), añadir un desglose o filtro "Por organización" (además del existente por departamento). Incluir lo mismo en la vista de estadísticas de red si se implementa. Traducir etiquetas en ES/EN/PT.

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

- [ ] **Al entrar a configuración del usuario (panel perfil), no debe redirigir a "Validando" ni expulsar de la app.**  
  Revisar la página `panel/perfil` y su JS (perfil.js): comprobar que no se llame a `Auth.checkAccess` de forma que fuerce redirección al login, o que no se limpie la sesión. Ajustar la lógica para que usuarios con rol permitido puedan entrar sin ser expulsados. En `perfil.html` se corrigió la llamada a `checkAccess([1,2,3,4,5,6])` (sin comas vacías) y se hace `hideLoader()` antes de return si el acceso es denegado.

- [x] **Cuando la app expulsa al usuario, debe redirigir a la institución donde estaba, no a la raíz.**  
  En `auth.js`, `logout(forceRoot)` ya guardaba el slug antes de limpiar y lo pasaba a `redirectToLogin`. Se mejoró con fallback: si no hay `NombreInst` en almacenamiento, se intenta obtener el slug desde la URL actual antes de redirigir, y por defecto se usa `urbe`. `redirectToLogin(slug)` ya enviaba a `basePath + slug` para instituciones válidas.

---

## Mejoras estéticas

- [ ] **Mejorar la estética de la pantalla donde se elige el formulario (selector de formularios): nombre de cada institución más claro en escritorio y móvil.**  
  **Instrucciones:** En la página de selector de formularios (formSelector o similar), revisar el diseño de las cards o listas donde aparece el nombre de la institución. Ajustar tipografía, contraste y espaciado para escritorio y móvil (clases responsive y si hace falta texto más grande o badge para el nombre de institución).

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
