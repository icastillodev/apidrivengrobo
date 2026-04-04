# Checklist de tareas – Instrucciones por ítem

**Archivado.** El sprint cerrado está en `docs/checklist-finalizados/CHECKLIST-ACTIVO.md`. Trabajo vivo solo: `docs/CHECKLIST-CAPACITACION-PENDIENTE.md`, `docs/CHECKLIST-BUSQUEDA-IA-VOZ.md`.

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

- [x] **En la lista (tabla) del gestor de usuarios, mostrar cuántos protocolos tiene a su cargo cada usuario.**  
  **Instrucciones:** Backend: en la consulta que devuelve la lista de usuarios de la institución (p. ej. `UserModel::getUsersByInstitution`), añadir un campo que cuente los protocolos de los que el usuario es titular/responsable, p. ej. `(SELECT COUNT(*) FROM protocoloexpe WHERE IdUsrA = u.IdUsrA AND IdInstitucion = u.IdInstitucion) as ProtocolCount`. Front: añadir columna "Protocolos" (o "Protocolos a cargo") en la tabla de `usuarios.html` (thead y tbody), ordenable si se desea; en `usuarios.js` en `renderTable()` mostrar el valor (p. ej. `u.ProtocolCount ?? 0`). Traducir etiqueta en i18n (admin_usuarios.col_protocolos o similar en ES, EN, PT).  
  **Hecho:** UserModel añade `ProtocolCount`; tabla usuarios con columna ordenable; i18n `col_protocolos` en ES, EN, PT. **Ajuste posterior:** La columna "Protocolos" se quitó de la tabla; el total de protocolos se muestra solo en la ficha del usuario (junto con animales, formularios, alojamientos), como las demás fichas.

- [x] **En la ficha/modal del usuario, botón "Ver facturación" cuando tenga protocolos aprobados o formularios.**  
  **Instrucciones:** En el modal de detalle del usuario (gestor de usuarios admin), mostrar un botón "Ver facturación" o "Ver estado de cuenta" cuando el usuario tenga al menos un protocolo a su cargo (titular) o formularios realizados; al hacer clic, abrir la vista de facturación por investigador para ese usuario (p. ej. `admin/facturacion/investigador.html?id=IdUsrA` o equivalente con `idUsr`). Si no tiene protocolos ni formularios, ocultar o deshabilitar el botón. Traducir en i18n (admin_usuarios.ver_facturacion en ES, EN, PT).
  **Hecho:** Ya existía: botón "Ver Facturación" en buildModalHtml con `puedeFacturar` (protocolos.length > 0 || tienePedidosInsumos); `openBillingForUser(idUsr)` abre facturación por investigador; i18n `btn_ver_facturacion` en ES, EN, PT.

- [x] **Gestor de usuarios: mostrar todos los tipos de usuario (no solo investigador).**  
  **Verificado:** La consulta del backend `UserModel::getUsersByInstitution` no filtra por `IdTipousrA`: hace `LEFT JOIN tienetipor t` y `WHERE u.IdInstitucion = ?`, por lo que devuelve todos los usuarios de la institución con cualquier rol. El front (`usuarios.js`) no aplica ningún filtro por tipo de usuario; la lista y los filtros son por búsqueda/columna. Si en algún entorno solo aparecen investigadores, puede deberse a que solo existan esos usuarios en esa institución.

- [x] **Gestor de usuarios: al tocar "Abrir formulario" en la ficha no abre el formulario.**  
  **Hecho:** En `usuarios.js` se usa `getCorrectPath(targetPath)` para construir la URL (compatible con local/producción). En `UrlRouter.js` se reconoce la página por `pathname` o `href` (p. ej. `animales`, `reactivos`, `insumos` sin depender de `.html`). Para animales/reactivos se llama `window.openAnimalModal` / `window.openReactivoModal`; para insumos/misformularios `openFormDetail(id)`. Así, al abrir desde la ficha la ruta correcta (p. ej. `/admin/animales?id=123&action=view`), la página carga y el router abre el modal.

- [x] **Gestor de usuarios: al tocar "Abrir" en un alojamiento no abre la vista de alojamiento.**  
  **Hecho:** `openWithModal('admin/alojamientos', historia, 'historia')` construye la URL con `getCorrectPath`. En `UrlRouter.js`, para la página de alojamientos se llama `window.verHistorial(searchVal)` (función expuesta por `HistorialUI.js`). La detección de página usa `isPage('alojamientos')` (href o pathname), de modo que funciona tanto con `alojamientos.html` como con rutas reescritas.  

- [x] **Ficha de usuario: textos claros para "Eliminar" vs "Eliminación total".**  
  **Instrucciones:** Dejar claro qué hace cada acción: "Eliminar" = solo si el usuario no tiene datos asociados, borra el usuario de la base; "Eliminación total" = borra el perfil y todo lo asociado (protocolos, formularios, alojamientos y dependencias), requiere contraseña y código.  
  **Hecho:** Claves i18n `admin_usuarios.eliminar_leyenda` y `eliminacion_total_leyenda` en ES, EN, PT. En el modal de ficha, los botones tienen `title` con esas leyendas (tooltip) y debajo del formulario se muestra un bloque explicativo con ambas definiciones.

## Superadmin – Usuarios globales

- [x] **Paginación y volver atrás:** En la página de usuarios de superadmin, la paginación no funcionaba (los botones perdían el evento al usar `innerHTML +=`). Se corrigió usando solo `appendChild` y listeners en los enlaces. Se añadió enlace "SUPERADMIN" en el breadcrumb para volver al dashboard.

- [x] **Eliminación total de usuario (con protocolos y formularios asociados).**  
  **Instrucciones:** En el gestor de usuarios (Superadmin – usuarios globales, o admin según contexto), si un usuario tiene formularios, protocolos o alojamientos asociados, permitir una opción especial de eliminación "completa": al activarla, mostrar un modal que liste claramente qué se va a borrar (usuario, protocolos a su cargo, formularios, alojamientos y vínculos). El modal debe pedir la contraseña actual del administrador y un código de verificación generado para esa acción; solo si ambos son correctos, ejecutar el borrado en cascada. Enviar un correo al administrador con el detalle completo de lo eliminado y el código usado. Resumen: (1) listar en el modal todo lo que se eliminará; (2) confirmar con contraseña + código; (3) borrado en cascada; (4) email de resumen.  
  **Hecho:** Superadmin > Usuarios globales: botón "Eliminación total" en el modal de ficha. GET `/superadmin/usuarios/delete-preview` devuelve conteos y **listas detalladas** (`protocolos_list`, `formularios_list`, `alojamientos_list`); el modal muestra ese detalle completo (protocolos con nprot/título, formularios con id/tipo/categoría/protocolo, alojamientos con historia/protocolo). Código por correo; contraseña + código; POST delete-full; cascada y email de resumen. **Admin > Gestión de usuarios:** mismo flujo: botón "Eliminación total" en la ficha (visible cuando el usuario tiene protocolos, formularios o alojamientos). GET `/users/delete-preview?id=X` (misma institución), POST `/users/delete-full` con id, password, code. Modal con listado detallado, contraseña de admin y código. i18n en `admin_usuarios` (btn_eliminacion_total, delete_modal_*, delete_code_sent, delete_success) en ES, EN, PT.

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

## Login y registro – Mejoras (pre-próxima fase)

- [x] **Quitar el tagline "gestor de reactivos biológicos online" del login.**  
  En `index.html` se eliminó la línea que mostraba el tagline debajo del nombre de la institución. La clave `login.tagline` en i18n quedó vacía.

- [x] **Traducir "Desarrollado por [geckos.uy]" en el login según idioma.**  
  Añadida clave `login.desarrollado_por_geckos` en es.js, en.js, pt.js. Usada en `index.html` (bloque izquierdo) y en `MenuRender.js` (sidebar y top bar) con `window.txt?.login?.desarrollado_por_geckos`.

- [x] **Traducir el enlace "regresar web" según idioma.**  
  Clave `login.regresar_web` en ES, EN, PT (con flecha ↫). Enlace en `index.html` con `data-i18n="login.regresar_web"`.

- [x] **Traducir "Opciones de acceso" en el login.**  
  Botón con `<span data-i18n="login.opciones_acceso">`. Clave `login.opciones_acceso` en los 3 idiomas.

- [x] **Traducir bloque "Política de cookies" en el login.**  
  Claves `login.politica_cookies_titulo` y `login.politica_cookies_texto` en es, en, pt. Aplicadas en `index.html` con `data-i18n`.

- [x] **Login y registro: usuario siempre en minúsculas.**  
  Front: `auth.js` envía `username.trim().toLowerCase()`; `registro.js` envía y valida usuario en minúsculas; `recuperar.js` envía `user` en minúsculas. Backend: `AuthController` normaliza `$data['user']`; `AuthModel::getUserByUsername` y `getSuperAdminByUsername` usan `LOWER(TRIM(u.UsrA)) = LOWER(TRIM(?))`; `UserModel::existsUsername`, `registerUser` (guarda en minúsculas), `getUserForRecovery` usan minúsculas; `UserController::register`, `checkUsername`, `forgotPassword` normalizan el usuario.

- [x] **Renombrar "animal vivo" a "Animal" en toda la app y traducir.**  
  i18n: `config_tipos_form.tab_animal` = "ANIMAL", `opcion_animal` = "Animal" en ES, EN, PT. Front: `config_tipos_form.js` `CAT_ANIMAL_LABEL = 'Animal'`; `tipos-form.html` option value="Animal"; `formularioregistroinst.js` default y option "Animal"; `misformularios.js` y `animales.js` comparan/muestran "Animal". Backend: `NotificationController`, `InstitucionModel`, `UserFormsModel`, `AnimalModel` usan categoría `'Animal'`. **Si en BD existe `categoriaformulario = 'Animal vivo'`:** ejecutar `UPDATE tipoformularios SET categoriaformulario = 'Animal' WHERE categoriaformulario = 'Animal vivo';` y análogo en otras tablas que guarden esa categoría.

- [x] **Acceso directo en "Opciones de acceso" del login devuelve TXT en lugar de abrir la página.**  
  **Instrucciones:** Revisar el enlace/botón de acceso directo dentro del bloque "Opciones de acceso" en `index.html` y la lógica asociada en `auth.js` / `UrlRouter.js` (o equivalente). Corregir para que el enlace abra la URL HTML correspondiente en el navegador y no descargue un `.txt`. Validar en ES/EN/PT.
  **Hecho:** (1) Botón "Abrir página de acceso" en el modal Opciones de acceso: abre la URL actual en nueva pestaña (`window.open(currentUrl, '_blank')`) para poder guardar en favoritos sin descargar. (2) Descarga del acceso directo .url: Blob con tipo `application/internet-shortcut`, extensión `.url` asegurada y revokeObjectURL. i18n `opciones_abrir_pagina` y `opciones_abrir_pagina_desc` en ES, EN, PT.

- [x] **Registro: validar correo por institución (mismo mail puede repetirse solo en distintas instituciones).**  
  **Hecho:** En `UserModel::existsEmailInInstitution($email, $instId)` se comprueba si el correo ya existe en la misma institución (personae + usuarioe por IdInstitucion). En `registerUser()` se llama a esta comprobación antes de insertar y, si existe, se devuelve `message: 'email_duplicate_institution'`. El front (`registro.js`) muestra el mensaje traducido cuando `res.message === 'email_duplicate_institution'`. Claves i18n `registro.email_duplicate_institution` en ES, EN, PT. El mismo correo sigue permitido en instituciones distintas.

## Dashboard

- [x] **Al pasar el mouse por los cuadrantes del dashboard, que se iluminen un poco; y que al tocar/hacer clic en cualquier cuadrante se vaya al módulo correspondiente.**  
  **Instrucciones:** En la página del dashboard (admin y/o usuario), localizar los cuadrantes (cards/divs). Añadir estilos hover (p. ej. `hover:bg-success/10` o `filter: brightness(1.05)`) y asegurar que cada cuadrante sea un enlace `<a href="...">` o tenga `onclick` que navegue a la ruta del módulo (usando `getCorrectPath` o la ruta fija correspondiente).

- [x] **Renombrar "Dashboard" en español a "Panel de inicio" y traducir correctamente en portugués.**
  **Instrucciones:** En los archivos i18n (ES/PT), actualizar las claves de título/breadcrumb asociadas al dashboard (`dashboard.titulo`, `dashboard.breadcrumb` o equivalentes) para que en español se muestre "Panel de inicio" y en portugués la traducción correcta (por ejemplo "Painel inicial"). Verificar en el breadcrumb superior y en el título principal de la página.
  **Hecho:** Añadida clave `menu.panel_inicio` (ES "Panel de inicio", EN "Dashboard", PT "Painel inicial"). `bread.dashboard` en ES "Panel de inicio", en PT "Painel inicial". `sesion_activa` actualizado en ES y PT. En `MenuRender.js` las tres apariciones de "— Dashboard" sustituidas por `window.txt?.menu?.panel_inicio`.

---

## Hotkeys

- [x] **Añadir atajo Alt+D para volver al dashboard y documentarlo en el modal de hotkeys.**  
  Implementado en `front/dist/js/utils/hotkeys.js`: se añadió la acción `'d'` que redirige a `admin/dashboard.html` o `usuario/dashboard.html` según el rol, y la entrada "ALT + D - Ir al Dashboard" en la lista de atajos visibles (modal).

---

## i18n – Placeholders y textos pequeños

- [x] **Traducir placeholders de inputs en todas las pantallas que falten (ES, EN, PT).**  
  Primera tanda: añadidas claves en `alojamientos` (es, en, pt): `ph_buscar_global`, `ph_buscar_prot_reg`, `ph_buscar_user_reg`, `ph_obs_opcional`, `ph_filtrar_prot`. Usadas en `paginas/admin/alojamientos.html` con `data-i18n` para que `translatePage()` rellene los placeholders. Otras pantallas pueden seguir el mismo patrón (data-i18n en input/textarea y clave en i18n).

- [x] **Traducir textos tipo "Vigentes", "Total", "Vencidos" y similares (resultados, badges, filtros).**  
  Añadidas en `generales` (es, en, pt): `total`, `vigentes`, `vencidos`, `activos`, `inactivos`, `todos`. Usadas en `protocolos.js` (filtro Vigentes/Vencidos y placeholder buscar) y en `GeckoStats.js` (cabecera PDF "Total"). Ver `docs/checklist-finalizados/CHECKLIST-I18N-REGLA.md`.

---

## Logo en PDF (LogoEnPdf)

- [x] **Si la institución tiene LogoEnPdf = 1, todos los PDF deben llevar el logo de la institución arriba.**
  Implementado: (1) `PreciosModel::getInstData()` devuelve `Logo` y `LogoEnPdf`. (2) Helper `front/dist/js/utils/pdfLogoHeader.js`: `getPdfLogoHeaderHtml(logoEnPdf, logoFilename)` para HTML (html2pdf) y `getPdfLogoHeaderFromStorage()` / `getPdfLogoImageUrl()` para usar desde localStorage o jsPDF. (3) Config institución guarda `instLogoEnPdf` en localStorage al cargar; auth.js guarda `instLogoEnPdf` al validar sede (AuthController devuelve `LogoEnPdf`). (4) PDF con logo: precios.js (exportPreciosPDF), PreciosService.downloadUniversalPDF(), usuarios.js (ficha PDF), GeckoStats.js (exportFastPDF). El botón "Mostrar logo en PDF" en Configuración > Institución ya guardaba en BD; ahora se usa en todas las rutas de export.

- [x] **PDF Total y PDF Ficha de usuario: incluir precios de servicios institucionales (serviciosinst).**  
  **Hecho:** En `usuarios.js`, al generar PDF Total o Solo Ficha se obtienen los servicios con `API.request('/precios/all-data')` y se pasan a `buildFichaSimpleHTML` y `buildFichaTotalHTML`. Ambas plantillas incluyen una sección "Servicios institucionales" con tabla (Servicio, Medida, Precio). Clave i18n `pdf_servicios_institucionales` en ES, EN, PT. **Ajuste posterior:** La sección "Servicios institucionales" se quitó de la ficha de usuario (modal y PDF); esos datos corresponden a la página Precios, no a la ficha del usuario.

- [x] **Todos los PDF: márgenes consistentes (arriba, abajo, izquierda, derecha).**  
  **Hecho:** Se aplicó margen de 18 mm en todos los puntos de generación de PDF. html2pdf: `margin: [18, 18, 18, 18]` en usuarios.js, precios.js, PreciosService.js, protocolos.js, animales.js, reactivos.js, insumos.js, misformularios.js, misAlojamientos.js, alojamientos/ExportUI.js. jsPDF (GeckoStats, facturación): constante `M = 18`, uso en posiciones iniciales y `margin: { left: M, right: M }` en autoTable; mismo criterio en billingProtocolo, billingDepto, billingInvestigador y modals/manager.js.

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

- [x] **(PRIORITARIO)** Añadir facturación/accounting por organización (además de por departamento, persona y protocolo).  
  **Instrucciones:** Crear una nueva página (o pestaña) en el área de facturación para "Por organización". Añadir un contenedor/enlace en el menú o en la página índice de facturación que lleve a esta vista. Reutilizar el patrón de las otras vistas (por departamento, persona, protocolo) y filtrar/agrupar por organización, mostrando las organizaciones y dentro de cada una los departamentos asociados. Traducir en i18n.  
  **Hecho:** Nueva tarjeta "Por Organización" en índice de facturación; página `org.html` y `billingOrg.js`; endpoint POST `/billing/org-report` y `BillingModel::getOrganizacionesConDeptos`. Vista muestra organizaciones con totales y tabla de departamentos; enlace "Ver detalle" abre facturación por departamento con depto y fechas en URL. i18n: por_organizacion, desc_organizacion, titulo_liquidacion_org, link_ver_detalle (ES, EN, PT).

- [x] **(PRIORITARIO)** En facturación por departamento: permitir elegir qué mostrar (Todos / Internos / Externos).  
  En la vista de facturación por departamento, añadir un selector para filtrar y mostrar: **Todos**, **Internos** o **Externos**, según el atributo interno/externo del departamento (y/o organización). Traducir en i18n y asegurar que el filtro afecta tanto al resumen como al detalle/exportaciones.  
  **Hecho:** Selector "Ámbito" (TODOS / INTERNOS / EXTERNOS) en `depto.html`; `DeptoModel` devuelve `externodepto` y `externoorganismo`; `billingDepto.js` guarda lista completa y filtra el select de departamentos según ámbito. Claves i18n ya existían (filtro_ambito, ambito_todos, ambito_internos, ambito_externos).

- [x] **(PRIORITARIO)** En billing: añadir facturación por protocolo para insumos.  
  Incluir en facturación la posibilidad de ver/agrupar insumos por protocolo, igual que protocolos y pagos, identificando los pedidos de insumos por protocolo. Traducir en i18n.
  **Hecho:** BillingModel::getInsumosByProtocolo($idProt, $desde, $hasta) devuelve pedidos de tipo insumo vinculados al protocolo vía protformr. getProtocolReport incluye insumos y totales.deudaInsumos. Vista por protocolo: tarjeta "Insumos" en dashboard, tabla "Insumos del protocolo" y sección en PDF. i18n insumos_protocolo en ES, EN, PT.

- [x] **(PRIORITARIO)** En facturación por departamento: mostrar formato viejo (depto sin protocolo) y por protocolo.
  Si un pedido tiene departamento pero no protocolo (formato viejo), debe seguir apareciendo en la vista por departamento. Los asociados a protocolo se muestran como el resto de formularios. Compatibilidad con ambos formatos.

- [x] **Facturación por Institución: vista tipo departamento, estado de cuenta, pago y PDFs (total + por fila).**
  **Instrucciones:** La facturación por institución debe funcionar como la de departamento: selector de institución (no estado de cobro), vista tipo estado de cuenta (Total, Pagado, Debe), checkboxes para seleccionar formularios y botón "Pagar Selección". Incluir **PDF total** (todas las instituciones), **PDF por institución** (cada card) y **PDF por fila** (cada formulario derivado).
  **Hecho:** `institucion.html` + `billingInstitucion.js`. Selector institución, fechas, stats cards, tabla con checkboxes y footer "Pagar Selección". API `POST /billing/process-payment-institucion` registra pagos en `facturacion_formulario_derivado`. PDFs: `downloadInstGlobalPDF()` (total), `downloadInstItemPDF(idInstSol)` (por institución), `downloadInstFilaPDF(idformA, idInstSol)` (por fila). Excel global. i18n ES/EN/PT.

- [x] **Derivación: crear NUEVO formulario (copia) en destino; el original NO se modifica.**
  **Instrucciones:** Al derivar, no debe cambiar nada del formulario de origen. Se crean nuevas entidades: un nuevo formulario (copia) para la institución destino. El original permanece intacto en la institución origen.
  **Hecho:** Migración `docs/migrations/add_idformAOrigen_formulario_derivacion.sql` añade `idformAOrigen` a `formulario_derivacion`. `FormDerivacionModel::derive()` crea copia del formulario (formularioe, sexoe, protformr, precioformulario, precioinsumosformulario, forminsumo, formespe) en destino; `formulario_derivacion` guarda `idformA` = copia derivada, `idformAOrigen` = original. Al devolver/rechazar/cancelar, se elimina la copia derivada; el original nunca se toca. UserFormsModel, getHistory, assertCanSeeForm actualizados para `idformAOrigen`. **Ejecutar la migración** antes de usar.

---

## Protocolos – Filtro internos / externos / red

- [x] **(PRIORITARIO)** En la página de protocolos: botón o filtro para ver internos, externos y (si aplica) de red.  
  Añadir en la lista de protocolos filtro o botones: **Internos**, **Externos** y, si hay red, **De red**. Usar lógica de departamento/organismo interno-externo. Traducir en i18n.

---

## Insumos por protocolo (formulario y listado)

- [x] **(PRIORITARIO)** Formulario de insumos por protocolo (no por departamento), igual que formularios animales.  
  Cambiar el flujo del pedido de insumos para que se asocie a **protocolo** como los formularios de animales. No quita animales; es la forma estándar del formulario.

- [x] **(PRIORITARIO)** Lista de formularios de insumos (admin): mostrar por protocolo; si tiene departamento mostrarlo también; modal con protocolo.  
  La lista de pedidos de insumos debe mostrarse por **protocolo**. Si el pedido tiene departamento (formato viejo), seguir mostrándolo en tabla y modal. El modal debe mostrar la información con **protocolo** como referencia principal.

---

## Departamento / Organismo – Interno y externo (BD y configuración)

- [x] **(PRIORITARIO)** BD: atributos externodepto (departamentoe) y externoorganismo (organismoe).  
  En `departamentoe` agregar `externodepto`; en `organismoe` agregar `externoorganismo`. Si valor = **2** → externo; cualquier otro o NULL → interno. Ej.: `ALTER TABLE departamentoe ADD COLUMN externodepto TINYINT DEFAULT 1;` y análogo para organismoe.

- [x] **(PRIORITARIO)** Al crear/editar departamento y asignar organización: definir interno/externo; el departamento puede cambiarlo.  
  Al asignar organismo (1 o 2) al departamento, se puede setear interno/externo. El departamento puede modificar su propio flag aunque la organización sea distinta; al elegir organización se actualiza el valor por defecto del departamento, pero el usuario puede sobrescribir en el departamento.

- [x] **(PRIORITARIO)** Config departamentos y organismos: checkboxes para marcar interno / externo.  
  En Configuración > Departamentos y en organismos, añadir controles para marcar si cada uno es **interno** o **externo** (2 = externo, otro = interno). Traducir en i18n.

- [x] **(PRIORITARIO)** En listados de departamentos (solo admin): mostrar interno/externo además de departamento y organización.  
  En vistas de **administrador** donde se listen departamentos/organismos, añadir columna o indicador **interno/externo**. En vistas de **usuario** no mostrar esta información. Traducir en i18n.

---

## Departamento + Organización

- [x] **En todas las partes donde se muestre el departamento, mostrar al lado la organización (si tiene). Si no tiene (usuario): no mostrar nada. Si es vista de administrador y no tiene: mostrar "- (sin organización)".**  
  **Implementado:** (1) **Config > Departamentos:** la tabla de departamentos muestra el badge de organismo usando `generales.sin_organizacion` cuando no hay organismo. (2) **Admin > Usuarios:** en la ficha (modal) se añadió la fila "Organización" junto a Departamento usando `ficha_organizacion` y `generales.sin_organizacion`; mismo criterio en PDF Ficha simple y PDF Total. (3) **Admin > Insumos:** el API devuelve `Organizacion` (NombreOrganismoSimple); tabla con columna "Organización" (sin org → sin_organizacion); modal y PDF con línea Organización; export Excel incluye columna Organización; filtro por columna "Organización". (4) **Usuario > Mis formularios:** el API devuelve `Organizacion`; tabla con columna "Organización" (vacía si no hay); export Excel con columna Organización. (5) **Facturación por Departamento:** el selector de departamento ya mostraba el organismo entre paréntesis cuando existe (`NombreOrganismoSimple`). Claves i18n añadidas/usadas: `ficha_organizacion`, `col_organizacion`, `filter_organizacion` (admin_insumos), `col_organizacion` (misformularios), `generales.sin_organizacion`.

---

## Perfil / Configuración de usuario

- [x] **Al entrar a configuración del usuario (panel perfil), no debe redirigir a "Validando" ni expulsar de la app.**  
  En `auth.js`, `checkAccess(allowed, options)` admite `options.skipInstCheck`. En `perfil.html` se llama `Auth.checkAccess([1, 2, 3, 4, 5, 6], { skipInstCheck: true })` para no expulsar por sede/inst nula; solo se exige token y rol en [1–6]. Así los usuarios con rol permitido entran sin redirección al login.

- [x] **Cuando la app expulsa al usuario, debe redirigir a la institución donde estaba, no a la raíz.**  
  En `auth.js`, `logout(forceRoot)` ya guardaba el slug antes de limpiar y lo pasaba a `redirectToLogin`. Se mejoró con fallback: si no hay `NombreInst` en almacenamiento, se intenta obtener el slug desde la URL actual antes de redirigir, y por defecto se usa `urbe`. `redirectToLogin(slug)` ya enviaba a `basePath + slug` para instituciones válidas.

- [x] **Rol 1 (Superadmin de sede) debe poder entrar a su propia configuración de usuario.**  
  En `auth.js`, `checkAccess` ya devuelve `true` para `userLevel === 1` antes de validar sede o roles, por lo que el rol 1 siempre puede acceder a cualquier página protegida. El ítem "Configuración" del menú (profile_group) apunta a `panel/perfil`, que el .htaccess reescribe a `paginas/usuario/perfil.html`. Con eso, el tipo de usuario 1 puede abrir su perfil desde el menú y editar datos y contraseña sin ser expulsado. Si en algún entorno la URL base no incluye el slug de la institución, el enlace sigue siendo `basePath + 'panel/perfil'` (p. ej. `/panel/perfil` o `/urbe/panel/perfil` según configuración).

---

## Mejoras estéticas

- [x] **Precios: icono visible en menú/página y líneas de otro color (no rojo).**
  En el menú, el ítem "Precios" (dentro del dropdown Facturación) debe mostrar correctamente su icono `svg` en `MenuTemplates.js` (id 202, children). Revisar clases CSS (`.dropdown-child-icon`) y rutas del ícono para que se vea en todos los temas. En la página de precios ya se cambió el botón PDF a `btn-outline-secondary` y la sección "4. Servicios Institucionales" a `text-dark`; se añadió `.dropdown-child-icon { display: inline-flex; color: inherit; }` en MenuStyles.js y las tablas/cajas con fondo rojizo (#fff4f4) se cambiaron a #f0f2f5 en precios.js y PreciosService.js.

- [x] **Mejorar la estética de la pantalla donde se elige el formulario (selector de formularios): nombre de cada institución más claro en escritorio y móvil.**  
  En `formSelector.js`: nombre completo de institución con clase `institution-name-selector`, tamaño 1.1rem y mejor línea; slug (NombreInst) en `text-success fw-semibold` 0.8rem; badge "(TU SEDE ACTUAL)" con borde; icono 48px y más espaciado (pb-3). En `formularios.html` se añadieron estilos para contraste del nombre y media query para móvil (font-size 1rem). Mejor legibilidad en escritorio y móvil.

- [x] **Unificar estética de Insumos con Reactivos (solo UI).**  
  En `paginas/admin/insumos.html`: eliminado el layout AdminLTE (wrapper, navbar-placeholder, sidebar-placeholder, content-wrapper) y el loader overlay local; body ahora usa `bg-light` y el contenido sigue la misma estructura que Reactivos: `container-fluid my-5 px-4 px-md-5` > `card shadow-sm border-0 p-4` con breadcrumb (incluido role-bread con getRoleName), título, fila de filtros con input-group y botones Excel/Ayuda, tabla y paginación con `mt-5`. Añadido import de `getRoleName` desde MenuConfig. Estilos unificados (th[data-sortable] con position y hover). Modales: modal de detalle con `modal-body p-4 p-md-5`; modal Excel con pie `bg-light`, botón Cancelar (excel_export.btn_cancel), texto de instrucción (excel_export.instruction) y inputs con `border-success`. Sin cambios en la lógica de negocio ni en insumos.js.

- [x] **Corregir la sección de "Servicios" en el tarifario (texto/tabla cortada).**  
  **Instrucciones:** En la página de precios/tarifario (`precios.html` + `precios.js`), revisar el bloque correspondiente a servicios institucionales: verificar que el texto de ayuda y las filas de la tabla no queden truncados (overflow, altura fija, etc.). Ajustar HTML y estilos (clases Bootstrap o CSS) para que toda la descripción y filas sean visibles en escritorio y móvil.
  **Hecho:** Sección con clase `precios-seccion-servicios`: overflow visible, table-responsive sin max-height, celdas con white-space: normal y word-wrap. Texto de ayuda añadido (`sec_services_desc`) en ES, EN, PT; precios.js actualiza el label al cargar idioma.

---

## Configuración – Especies y Subespecies

- [x] **Agregar botón para borrar subespecies (categoría de especies).**  
  Backend: `AdminConfigEspeciesModel::deleteSubespecie($idSub, $instId)` verifica que la subespecie pertenezca a la institución y que no tenga formularios asociados; si está en uso lanza excepción; si no, hace DELETE y auditoría. `AdminConfigEspeciesController::deleteSubespecie()` recibe `idSub` por POST. Ruta `POST /admin/config/subespecies/delete`. Front: en cada fila de subespecie se añadió botón con icono de papelera que llama a `window.deleteSubespecie(idSub)` con confirmación SweetAlert; mensajes usando `config_especies` (confirm_eliminar_sub_titulo, confirm_eliminar_sub_texto, btn_eliminar_subespecie, success_eliminar_sub, error_eliminar_sub) en ES, EN, PT.

## Multiidioma

- [x] **Asegurar que todas las cadenas nuevas (placeholders, "por organización", "sin organización", estadísticas de red, billing por organización, hotkeys) estén en es/en/pt.**  
  **Instrucciones:** Por cada texto nuevo añadido en los ítems anteriores, crear la clave correspondiente en `es.js`, `en.js` y `pt.js` y usarla en el código. Actualizar el inventario i18n en `checklist-finalizados/CHECKLIST-I18N.md` si añadís secciones o archivos nuevos.
  **Hecho:** Revisión de facturación: añadidas en facturacion (ES, EN, PT) claves aviso_protocolo, aviso_investigador, monto_invalido, monto_invalido_saldo, operacion_cancelada, operacion_cancelada_msg, operacion_no_requerida, operacion_no_requerida_msg, sin_datos_cargados, error_info_no_encontrada, error_pdf, confirmar_pago_btn, items_liquidados, ingrese_monto_antes, seleccione_que_pagar, error_cargar_reporte, no_se_obtuvieron_datos, filtro_al_menos, saldo_actualizado_ok, confirmar_pago_titulo, procesado_titulo, exito_titulo, seleccione_insumo_pagar. Reemplazados en billingDepto.js, billingPayments.js, billingProtocolo.js, billingInvestigador.js, billingOrg.js y modals/manager.js los Swal y mensajes fijos por window.txt. Las claves ya existentes (aviso_filtro, aviso_depto, saldo_act, saldo_insuficiente, confirm_pago, pago_procesado, etc.) se usan donde corresponde.

---

## Próximas fases (checks para más adelante)

**Nota:** Cuando se llegue a implementar estos ítem, **avisar al usuario**: requerirá cambios en la base de datos. Hasta entonces, los checks a seguir son los de las secciones anteriores (Superadmin instituciones, i18n, Logo PDF, Estadísticas, Billing, Departamento+Organización, Perfil, Mejoras estéticas, Multiidioma).

### Prioridad 1 (próxima fase)

- [x] **Tipos de pedido de animales con colores (badges configurables).**  
  **Hecho:** Atributo `color` en tipoformularios (10 colores + sin color). Config > Tipos de formulario: selector en modal; tabla con columna Color. Utilidad `badgeTipoForm.js`; badges en Admin > Animales y Mis formularios. i18n ES/EN/PT. Ver `docs/sql/tipoformularios_add_color.sql` si la columna no existe.

- [x] **Nueva etapa – Eliminar "Otros CEUAS" (deprecated).**  
  **Hecho:** Eliminada toda la funcionalidad y UI de "Otros CEUAS": alert en modales de animales y reactivos; badge y checkbox en protocolos; botón, modal y flujo en formulario animales (usuario); opción en Config institución y Superadmin instituciones; badge en usuario mis protocolos. Backend (columnas BD, APIs) se mantiene por compatibilidad; el front ya no muestra ni usa la opción.

- [x] **Insumos y Reactivos – misma lógica de externos/internos que en Animales.**  
  **Instrucciones:** En Admin > Insumos y Admin > Reactivos, aplicar la misma forma de externos e internos que en Animales: indicador o badge "Otros CEUAS" (o equivalente) cuando el pedido sea externo; interno en caso contrario. En Reactivos ya existe `EsOtrosCeuas` y el badge en tabla; en Insumos revisar si existe campo equivalente en BD/API y añadir columna e indicador en tabla y modal si falta. Unificar criterio entre animales, insumos y reactivos (campo en BD, columna en tabla, badge).  
  **Hecho:** Se unificó por **Ámbito (interno/externo)** sin usar "Otros CEUAS". Animales: columna Ámbito en posición correcta (después de Cant, antes de Inicio), badge INTERNO/EXTERNO según DeptoExternoFlag. Insumos: API devuelve DeptoExternoFlag; columna Ámbito en tabla y badge INTERNO/EXTERNO. Reactivos: API devuelve DeptoExternoFlag; columna Ámbito en tabla y badge INTERNO/EXTERNO. i18n: admin_animales.col_ambito, admin_insumos.col_ambito, generales.ambito en ES, EN, PT.

- [x] **Insumos y Reactivos – badge de tipo de pedido con color (como en Animales).**  
  **Instrucciones:** En la tabla de Reactivos (y en la de Insumos si aplica), mostrar el badge del tipo de pedido con color configurable, de la misma manera que en Animales: usar `getTipoFormBadgeStyle` (o utilidad equivalente) y el color del tipo de formulario; columna "Tipo" con badge en tabla. Asegurar que el listado de reactivos e insumos reciba en la API el nombre del tipo y el color (`TipoNombre`, `colorTipo` o equivalente) y mostrar el badge en ambas listas de la misma forma que en Admin > Animales.
  **Hecho:** Backend: ReactivoModel e InsumoModel devuelven TipoNombre y colorTipo en getAllByInstitution. Front: columna "Tipo" en reactivos.html e insumos.html; reactivos.js e insumos.js importan getTipoFormBadgeStyle y muestran badge con color (mismo estilo que animales). i18n: admin_reactivos.col_tipo y admin_insumos.col_tipo en ES, EN, PT.

- [x] **Cepa para animales (dropdown obligatorio si existen cepas).**  
  **⚠️ AVISO: Requiere cambios en la base de datos.**  
  **Instrucciones:** En el formulario de animales, agregar un campo de "Cepa" asociado a la especie/subespecie: si hay cepas configuradas para esa combinación, mostrar un dropdown obligatorio (y si no hay, mostrar opción "Sin cepa / no aplica" seleccionable). Si existen cepas para esa especie/subespecie y el usuario no selecciona ninguna, bloquear el envío del pedido con mensaje claro (i18n). Guardar la relación en BD (nueva tabla o campo según diseño).
  **Hecho:** BD: script `docs/sql/cepa_add.sql` crea tabla `cepa` (por categoría `idsubespA`) y agrega `formularioe.idcepaA` nullable (ejecutar en la BD). API: `GET /animals/cepas?inst&idsubespA` lista cepas habilitadas; `POST /animals/create-order` guarda `idcepaA` y valida pertenencia a la institución. Front: `front/paginas/usuario/formularios/animales.html` + `front/dist/js/pages/usuario/formularios/animales.js` muestran dropdown de Cepa al elegir categoría, lo hacen obligatorio si existen cepas, y muestran "Sin cepa / no aplica" si no hay. i18n ES/EN/PT: `form_animales.cepa`, `sin_cepa`, `cepa_help`, `cargando_cepas`, `debe_seleccionar_cepa_*`.

- [x] **Configuración de especies: renombrar "Subespecie" a "Categoría de especie" y preparar estructura para cepas.**  
  **⚠️ AVISO: Puede requerir cambios en BD (nueva capa de cepas).**  
  **Instrucciones:** En Configuración > Especies, cambiar la etiqueta y textos de "Subespecie" a "Categoría de especie" en ES/EN/PT. Mantener la estructura actual para categorías, y planificar la capa siguiente de "Cepa" que dependa de esa categoría: en la próxima implementación, desde esta pantalla se deberán poder definir también las cepas asociadas a cada categoría de especie.
  **Hecho:** Renombrado en toda la app: config_especies (titulo, modal, labels, confirmaciones, botón "+ Categoría de especie", columna tabla, mensaje vacío); form_animales (cepa_subespecie → "Categoría de especie", seleccione_categoria, label_categoria); admin_animales help_3_desc; precios badge_var; menu y seccion_especies; campo_subespecie en formulario registro. i18n ES/EN/PT. Estructura actual de categorías se mantiene; la capa "Cepa" (dropdown obligatorio en formulario animales) queda para el ítem siguiente con cambios en BD.

- [ ] **Correos sin botones de acción (revisión global).**  
  **Instrucciones:** Revisar todos los correos HTML y eliminar botones clickeables ("CTA"), reemplazándolos por texto informativo cuando corresponda. Priorizar primero los correos de protocolos (ya aplicado: se quitó "Ver protocolos"), y luego completar registro, reseteo de contraseña e insumos evaluando el flujo alternativo sin botones.

### Módulos grandes (a futuro)

- [ ] Reservas (módulo completo).
- [ ] Tickets de soporte.
- [ ] Biblioteca de ayuda por rol de usuario.
- [ ] Primeros pasos para usuario nuevo.
- [ ] Mejorar búsqueda con IA (respuestas y ayuda).
- [ ] Mejorar funcionalidad de voz (rellenar formularios y acciones en la app).
- [ ] FAQ: lugar para ver preguntas, rellenar BD y destacar las mejores en un FAQ público.

### Fase IA (limitaciones y entrenamiento) – después de las fases anteriores

- [ ] **Limitar el uso de IA en la app (sin preguntas cotidianas / fuera de contexto).**  
  **Instrucciones:** Revisar el módulo de IA (chat/ayuda) para restringir las preguntas a temas estrictamente relacionados con la plataforma (protocolos, formularios, facturación, etc.). Implementar filtros de contenido o reglas de negocio que bloqueen preguntas cotidianas o no relacionadas y devuelvan un mensaje educado explicando la limitación.

- [ ] **Limitar la IA en usuarios (según rol / permisos).**  
  **Instrucciones:** En el gestor de usuarios y en la configuración de roles, añadir opciones para habilitar/deshabilitar el acceso a IA por rol o por usuario. Si un rol/usuario no tiene permiso, ocultar o desactivar el acceso al módulo de IA.

- [ ] **Entrenamiento de voz y mejoras de interacción por voz.**  
  **Instrucciones:** Diseñar una fase posterior donde se mejore la funcionalidad de voz (dictado de formularios, comandos básicos en la app). Esta fase debe planificarse luego de tener sólidos los módulos principales y las restricciones de IA.

---

*Cada check se puede ir marcando [x] cuando la tarea esté implementada y probada. Las "Instrucciones" sirven para que cualquier desarrollador sepa qué hacer en ese ítem.*
