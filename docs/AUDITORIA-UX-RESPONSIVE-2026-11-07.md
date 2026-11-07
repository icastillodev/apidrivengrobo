# GROBO — Auditoría funcional, UX/UI y adaptación responsive
**Fecha:** 2026-11-07
**Aplicación:** GROBO para URBE y CUPAE
**Criterio:** preservar distribución, colores, tipografía, navegación y diseño existentes en escritorio. Cambios limitados a experiencia, accesibilidad, correcciones funcionales puntuales y presentación en celular/tablet.

## Alcance y método

- Revisión de **84 rutas HTML** y sus recursos en Chrome/Chromium automatizado, en anchos de **360, 390, 768 y 1024 px** (336 combinaciones). Una ruta está vacía: `paginas/usuario/formularios/reservas.html`, antigua referencia, no una vista completa.
- Inspección de HTML con parse5 en **83 documentos con contenido**, búsqueda de IDs duplicados, referencias inexistentes, etiquetas de formularios y errores de estructura.
- Inspección visual por capturas de pantallas representativas (Alojamientos, Mis formularios, Historial contable) en **390 px**, más revisión en tablet.
- **Limitación de la automatización:** prueba estructural y de layout con JavaScript de la aplicación desactivado. No prueba flujos autenticados, datos dinámicos reales, almacenamiento, permisos, envío de correos, ni operaciones que cambien saldos/protocolos. No sustituye QA funcional manual por rol ni ensayos en dispositivos físicos.

## Hallazgos y arreglos realizados (código local)

### Prioridad crítica — funcionalidad
1. **Formulario de animales duplicado:** `paginas/usuario/formularios/animales.html` tenía dos formularios `animal-form` y repetía **21 IDs** (incluidos `step-2`, campos y cantidades). El código JS utiliza `getElementById`, por lo que podía operar sobre un formulario equivocado. Se conservó únicamente el bloque actualizado que incluye el selector de tipo y la sección de cepas. No se cambió la lógica de negocio ni las reglas del backend.
2. **Recursos con rutas inválidas:** se corrigieron rutas relativas de módulos de las vistas QR (salas), favicons de pantallas públicas y CSS de Mis protocolos. Se retiraron dos enlaces a `adminlte.min.css` inexistente. Resultado: **cero referencias locales rotas** en el análisis estático.

### Prioridad alta — celular y tablet
3. Los grupos de acciones de **Alojamientos, Mis formularios y Liquidación de departamentos** antes mantenían botones en una sola fila y agrandaban el ancho del viewport; ahora usan filas responsivas, botones tocables y texto multilínea sin perder iconos ni colores.
4. Las tablas de configuración de tipos/protocolos, precios e insumos se colocaron en regiones de desplazamiento horizontal con inercia táctil y foco por teclado; las tablas extensas preservan columnas y cálculos. No se convirtieron en tarjetas que perderían información.
5. Se creó `front/dist/style/css/responsive-polish.css` y se integró al final del `head` de las páginas reales. Abarca tamaños móviles/tablet, área segura en pantallas con muesca, filtros adaptativos, ventanas modales, scroll, tabs, y controles con fuente legible en iOS. **No define cambios de estilo desktop**.
6. El menú móvil mantiene las tarjetas que ya usa GROBO; en tablets se aprovecha el ancho con tres columnas, conservando menú y estilo originales. Las ventanas emergentes se ajustan a la altura visible y conservan scroll.
7. Se añadieron etiquetas `<meta name="viewport">` faltantes y **262 asociaciones `label[for]`** para mejorar enfoque mediante toque y tecnologías de asistencia, sin alterar estilos.

## Resultados medidos

| Indicador | Antes | Después |
|---|---:|---:|
| Rutas con desborde a 360 px (84 inspeccionadas) | 8 | **1** |
| Rutas con desborde a 390 px | 5 | **1** |
| Rutas con desborde a 768 px | 0 | **0** |
| Rutas con desborde a 1024 px | 0 | **0** |
| Tablas visibles sin región táctil, 390 px (muestra de 20 vistas) | 2 | **0** |
| IDs HTML repetidos, vistas con contenido | 21 en una vista | **0** |
| Referencias a recursos locales inexistentes | 12 vistas | **0** |
| Páginas sin viewport, con contenido | 1 | **0** |
| Etiquetas asociadas en esta revisión | — | **262** |

**Excepción conocida:** la única página que aún ensancha el viewport a 360/390px es `paginas/usuario/formularios/reservas.html`, archivo **vacío** sin interfaz (el navegador usa un viewport virtual de ~980px al abrirlo directamente). No se la inventó ni publicó una pantalla nueva. Confirmar si debe retirarse como ruta heredada o redirigirla al módulo de reservas activo.

En algunos documentos heredados que redirigen automáticamente, el navegador cambia de URL durante el test con JavaScript desactivado; no considerarlos fallas de UX sin revisar el destino real.

## Herramientas y validaciones

- `node tools/audit-grobo-responsive.mjs` — métricas visuales en Chromium. Dependencia aislada (sin instalar en app): `playwright-core` en directorio temporal.
- `node tools/audit-grobo-structure.mjs` — DOM y recursos locales. Dependencia de auditoría: `parse5` temporal.
- `node tools/patch-grobo-ux-20261107.mjs --apply` — incorporación de estilos y mejoras HTML (repetible sin cambios).
- `node tools/fix-grobo-audit-issues.mjs` — arreglo de duplicado y rutas; verificado idempotente.
- `node tools/fix-grobo-accessible-labels.mjs --apply` — asociaciones de etiquetas de forma conservadora; idempotente.
- `postcss.parse()` validó sintaxis de la hoja CSS. `node --check` validó las herramientas. Validar además las suites `npm run validate-cap-*`.

## QA funcional pendiente (obligatorio antes de declarar cerrado)

1. **Administrador URBE/CUPAE:** login, roles, cambio de sede, historial contable, búsqueda, listado de pagos, PDF/Excel y controles de alcance institucional.
2. **Protocolos:** aprobación, rechazo y eliminación según origen y uso; verificar protección cuando existen formularios o alojamientos, incluyendo uso en red entre sedes.
3. **Investigadores:** registro, enlaces de activación (incluidas cuentas pendientes de Cecilia), recuperación de contraseña, 2FA y solicitud de animales; validar tipo de solicitud, especie, cepas, conteos y envío sin duplicados.
4. **Operativa de bioterio:** formularios de reactivos/insumos, reservas, QR de espacios, alojamientos, filtros y reportes sin sobrescribir registros reales.
5. **Dispositivos:** Safari iOS, Chrome Android, tablets 768/1024 horizontal/vertical y teclado/foco lector de pantalla; especialmente menús, modales largos, formularios dinámicos y tablas con datos reales.
6. **Servidor:** Brevo SMTP con login y **clave SMTP** válida, remitente y dominio autenticados; respaldo de `.env`, parche PHP de seguridad, migraciones, pruebas integradas y confirmación de deployment.

## Estado de publicación

Los cambios de UX están respaldados en GitHub y preparados en **staging privado del VPS**; no declarar despliegue de producción hasta verificar escritura en `/var/www/html` y pruebas reales. La cuenta `geckosadm` continúa sin `sudo` no interactivo; no sustituir contraseñas ni compartir secretos por el chat.

Brevo no puede activarse todavía porque los valores `SMTP_LOGIN` y `SMTP_KEY` no están cargados en el archivo local del escritorio. No deshabilitar 2FA ni usar API keys en el campo SMTP.

## Continuación de auditoría de JavaScript y flujos (2026-11-07)

- Analizados **179 módulos JavaScript** y **434 relaciones de importación** con Acorn, más scripts inline de las 84 páginas HTML. Resultado previo: **tres imports rotos**, cero errores de sintaxis. Corregidos los imports de `front/dist/js/formularios.js` y `front/dist/js/pages/noticia_publica.js`; el nuevo análisis registra **0 imports rotos, 0 exports ausentes y 0 scripts inline con errores de sintaxis**.
- **Noticias públicas**: antes el módulo importaba `api.js` y `noticiaPortadaThumb.js` desde rutas inexistentes; ahora carga. Las pruebas verifican vistas válidas e inválidas, error 404, escape de contenido HTML y tres tamaños de dispositivo.
- **Reserva vía QR**: los enlaces generados apuntaban a rutas que no corresponden a las vistas físicas. Se estandarizaron en `/paginas/qr-sala.html?token=...` y `/paginas/qr-salas.html?token=...`, sin depender de redirects opcionales del servidor. Se probó la navegación entre ambas vistas con datos simulados.
- **Accesibilidad QR**: la selección de días admite teclado Enter y Espacio, usa nombre accesible y `aria-pressed`, conserva el foco después de actualizar el calendario. Los intervalos seleccionables informan su estado, sin cambios visuales.
- **Seguridad de lectura QR**: los horarios recibidos de la API se insertan escapados como texto, no como HTML ejecutable.
- **Sesión QR**: se corrigió la consulta exclusiva a `localStorage` para aceptar también `sessionStorage`, que GROBO usa en sesiones temporales. El cierre de sesión ahora revoca tokens en ambos almacenamientos y cookies accesibles por JS, pero conserva idioma, tema e institución para un nuevo ingreso desde el mismo QR.
- **Pruebas ejecutadas**: `node tools/audit-grobo-functional-mocks.mjs` — **12/12 casos correctos** (noticia válida en celular/tablet/escritorio, noticia inválida, 404, formulario de animales, sala QR y listado institucional QR a 390/768 px). Las respuestas se simulan exclusivamente desde un servidor local en `127.0.0.1`; no se conectan ni modifican sistemas institucionales reales.
- **320 px**: se inspeccionaron las 84 rutas; se eliminaron los desbordes en facturación por departamento, facturación por organización, reservas y ambas páginas de Mis Protocolos mediante ajustes responsivos de switches y acciones. Resultado final: **0 desbordes en vistas con contenido** y **1 ruta vacía heredada** (`paginas/usuario/formularios/reservas.html`).
- Se mantiene pendiente QA con sesiones reales de cada rol, datos de producción, compatibilidad iOS Safari y Android Chrome, procesos completos de reserva, y el despliegue autorizado de PHP + Brevo.

### Nuevos comandos de auditoría

```powershell
cd C:\Users\nacho\Desktop\webs\URBE-API-DRIVEN
node tools/audit-grobo-js-modules.mjs
node tools/audit-grobo-functional-mocks.mjs
node tools/audit-grobo-responsive.mjs --micro
```

Los paquetes `playwright-core`, `parse5` y `acorn` utilizados para estas auditorías se instalaron en una carpeta temporal separada, no en las dependencias de la aplicación. El script de fixtures NO debe apuntar al VPS ni recibir credenciales reales.
