# Checklist — Optimización de tablas, consultas y UX de carga (GROBO / URBE)

**Estado:** backlog técnico vivo — marcar `[x]` por pantalla o por ítem cuando quede verificado en staging.  
En la **sección 6**, la columna **✓ código** marca implementación revisada en front (**2026-05**); sigue pendiente **QA en staging** salvo nota explícita.  
**Objetivo:** que **todas** las grillas/listados carguen **rápido** (consultas y payloads acotados), con **loader global solo en la primera carga** de la vista y **indicador dentro de la tabla** en refetch, cambio de página, filtros y orden.

**Relación:** complementa `CHECKLIST-BACKLOG-PRODUCTO-GROBO.md` (producto); no sustituye índices/migraciones documentadas en `BACKLOG-BASE-DATOS.md` cuando el índice requiera SQL explícito.

---

## 1. Principios de UX (obligatorio al unificar)

| Regla | Detalle |
|--------|---------|
| **Primera carga** | Una sola vez al entrar en la pantalla (o al montar el módulo): `showLoader` / overlay global hasta tener datos mínimos o error manejable; luego `hideLoader`. Referencia: `initAnimalesPage` / `initReactivosPage` / `initInsumosPage` (`showLoader({ upgradeOnly: true })` + flag tipo `*ListBootLocked`). |
| **Cargas siguientes** | Paginación, orden, filtros, búsqueda: **no** bloquear toda la página; usar **spinner/fila placeholder en `<tbody>`** (o overlay solo sobre la tabla). Referencia: `fetchAnimalesList` con `loading === 'inline'`. |
| **Mensajes** | Textos visibles al usuario en **es / en / pt** (`window.txt.*`), no literales sueltos en español. |
| **Errores** | Mantener fila de error en tabla o toast coherente con el resto del módulo; cerrar loader global en `finally` si aplica. |

---

## 2. Contrato API recomendado (listados paginados)

- [ ] Query params consistentes: `limit`, `offset` (o `page` + `pageSize` documentado), filtros y `sort_key` / `sort_dir` donde corresponda.
- [ ] Respuesta con **`total`** (conteo filtrado en servidor) además de `data[]`, para paginación correcta sin traer todo el dataset.
- [ ] **Techo de `limit`** en servidor (evitar `LIMIT 10000` accidental en producción salvo exportaciones explícitas).
- [x] Búsquedas con **debounce** en front (p. ej. 250–400 ms) para no disparar N peticiones por tecla. **2026-05:** `panel/noticias.js` (400 ms); `superadmin/usuarios.js` (400 ms). Listados admin con búsqueda por botón/Enter (p. ej. animales/insumos/reactivos) no requieren debounce por tecla. **Pendiente:** cualquier filtro con `input` live que dispare API sin debounce.
- [ ] Invalidar caché de página al cambiar filtros (patrón `syncFiltersKey` en `adminListPageCache.js`).

---

## 3. Base de datos y consultas (backend PHP / SQL)

Por cada endpoint que alimenta una tabla:

- [ ] **EXPLAIN** (o equivalente en MariaDB/MySQL) sobre la consulta principal con volumen realista.
- [ ] Índices compuestos alineados con `WHERE` + `ORDER BY` + joins frecuentes (documentar en PR si hace falta migración en `docs/migrations/`).
- [ ] Evitar **N+1**: no una query por fila; preferir joins controlados o batch secundario acotado.
- [ ] **SELECT** solo columnas usadas por la grilla (no `SELECT *` en listados grandes).
- [ ] **COUNT** eficiente: misma cláusula `WHERE` que el listado; evitar subconsultas repetidas si se puede una sola pasada o caché de conteo según caso.
- [ ] Paginación estable: si el usuario ordena por campo no único, definir **tie-breaker** (p. ej. PK) para que no “salten” filas entre páginas.

---

## 4. Frontend — patrones reutilizables

- [ ] **Caché por página + prefetch idle:** extender `createAdminListPageCache` (u homólogo) a otros listados admin que hoy cargan demasiado de golpe.
- [ ] **Un solo lugar** para “primera carga vs inline”: helper opcional (p. ej. `withTableLoading({ bootLocked, tbodyId, colspan, i18nKey })`) para no duplicar lógica. **2026-05 (parcial):** `config_alojamientos_ubicacion.js` — `withUbicTablesInlineBusy` + `loadAll('boot'|'inline')` (sin overlay salvo primera carga HTML).
- [x] **Facturación:** revisar `billingDepto.js`, `billingInstitucion.js`, `billingPayments.js`, etc.; **2026-05:** informes depto/inst/inv/prot/org/legacy con 1ª carga global + spinner inline en recargas; `billingResultsLoading.js`; popup historial saldo en Swal (`billingPayments`).
- [x] Listados que **renderizan todo en cliente** (`misformularios.js`): **2026-05** — loader 1ª visita + tabla inline en `reloadMyForms`; **pendiente:** paginación servidor si el volumen crece.

---

## 5. Ruta de trabajo (fases)

### Fase 0 — Inventario (sin cambiar comportamiento)

1. Listar **todas** las pantallas con tabla principal (admin + panel + facturación + comunicación).
2. Por cada una: archivo JS, endpoint(s), ¿paginación servidor?, ¿`total`?, ¿loader global siempre?
3. Definir **presupuesto** objetivo (ej. p95 &lt; 400 ms API + render en staging con dataset medio).

### Fase 1 — Línea base

1. Activar log temporal de tiempos (middleware PHP o cabecera `Server-Timing` opcional) en 3–5 endpoints más pesados.
2. Capturar EXPLAIN + tamaño de respuesta JSON por endpoint crítico.

### Fase 2 — Quick wins (alto impacto / bajo riesgo)

1. Índices faltantes acordes a EXPLAIN (con migración si aplica).
2. Reducir columnas en SELECT de listados.
3. Unificar **primera carga = loader global**, **resto = tbody** en módulos ya paginados (animales / insumos / reactivos como plantilla).

### Fase 3 — Refactors de consulta

1. Fusionar subconsultas duplicadas; eliminar N+1 en modelos `api/src/Models/**`.
2. Endpoints sin `total`: añadir conteo eficiente o estimación documentada si el COUNT fuera prohibitivo.

### Fase 4 — Consolidación

1. Documentar convención en README interno de front (o comentario en `LoaderComponent.js`).
2. Marcar filas del inventario (sección 6) como `[x]` cuando staging valide.

---

## 6. Inventario por área (marcar al cerrar cada pantalla)

**Leyenda columnas:** **✓ código** = revisión UX carga en front (2026-05). · API = endpoint principal · Pag = ¿paginación servidor? · 1ª / Inline = comportamiento de loaders.

### Admin — pedidos / inventario

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Animales | `animales.js` | `/animals/all` | sí | ref. | ref. | Patrón objetivo (plantilla) |
| [x] | Insumos | `insumos.js` | `/insumos/all` | sí | ref. | ref. | Misma familia que animales |
| [x] | Reactivos | `reactivos.js` | `/reactivos/all` | sí | ref. | ref. | Misma familia que animales |
| [x] | Precios / tarifarios | `precios.js` | `/precios/all-data`, `/precios/update-all` | no (dataset completo) | **2026-05:** 1ª `showLoader`; tras guardar `initPreciosPage({ inline: true })` en 4 `<tbody>` | | |
| [x] | Reservas salas (admin) | `reservas.js` | `/admin/reservas/agenda`, `/admin/reservas/sala/agenda`, `/admin/reservas/pending/list` | no (por rango fecha) | — | `#table-agenda`, `#table-pendientes`, lista instrumentos modal | **2026-05:** spinner + `generales.msg_cargando` fallback |

### Admin — usuarios, protocolos, alojamientos

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Usuarios | `usuarios.js` | `/users/institution` | sí | **2026-05:** `usuariosListBootLocked` + `showLoader({ upgradeOnly })` | `admin_usuarios.cargando_lista` | |
| [x] | Roles / permisos (config) | `configuracion/config_roles.js` | `/admin/config/roles/init`, `/admin/comunicacion/noticias/roles-publicar` | cliente (`renderUsers`) | spinner `#table-users` + `noticias-roles-tbody` | refetch solo al init | **2026-05:** `config_roles.tabla_cargando` es/en/pt; error API → fila tabla; **`roles.html` `await initConfigRoles()`** alinea loader global |
| [x] | Protocolos | `protocolos.js` | `/protocols/form-data`, `/protocols/institution` | no | **2026-05:** `showLoader({ upgradeOnly })` | `#table-body-protocols` + `admin_protocolos.cargando_lista` | `protocolosEventsBound` |
| [x] | Solicitudes de protocolo (aprobar/rechazar) | `solicitudesprotocolo/main.js`, `api_service.js` | `/admin/requests/list`, `/admin/requests/process` | no | `showLoader` en página hasta **`await initAdminRequests()`** (`solicitud_protocolo.html`) | fila spinner `#table-requests` al refetch (p. ej. tras decisión en modal) | **2026-05:** `generales.msg_cargando` en fila carga; errores `tabla.error_api` / `error_conexion` es/en/pt |
| [x] | Alojamientos / trazabilidad | `alojamientos/trazabilidad.js` (+ `HistorialUI.js`, `RegistroUI.js`, `TableUI.js`) | `/trazabilidad/get-arbol`, POST mutaciones; especies `/protocols/current-species` | cliente tabla principal | `showLoader` en flujos Historial/Registro | `#trazabilidad-content-{id}` + spinners modales cfg | **2026-05:** árbol inline sin overlay página; `trace_loading` + `generales.msg_cargando`; especies Historial/Registro |
| [x] | Especies / categorías / cepas | `configuracion/config_especies.js` | `/admin/config/especies/all`, `/admin/config/cepas/all`, save/delete cepas | no | spinner `#especies-container` | listas cepas modal + inline | **2026-05:** catálogo + cepas con spinner; errores en panel; **`await loadData()` en init + `await initConfigEspecies()` en `especies.html`** |
| [x] | Infraestructura / clínica (tipos + traz.) | `configuracion/config_alojamientos.js` | `/admin/config/especies/all`, `/admin/config/alojamiento/details` | no | spinner `#list-species` | tablas tipos + traz. con texto i18n | **2026-05:** `config_alojamientos.cargando` + vacío/error es/en/pt; **`initConfigAlojamientos` async + `await` en `alojamientos.html`** (1ª carga especies) |

### Admin — estructura organizativa

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Departamentos y organismos | `configuracion/config_departamentos.js` | `/admin/config/deptos-init`, save/delete depto/org | no | `showLoader` 1ª visita | spinners `#table-deptos` + `#table-orgs` tras guardar/borrar | **2026-05:** `lista_cargando`, vacíos y error `error_cargar_listas`; **`departamentos.html` `await initConfigDeptos()`** |

### Admin — configuración reservas y espacios

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Reservas / espacios (config salas + instrumentos) | `configuracion/config_reservas.js` | `/admin/config/reservas/sala/all`, `/admin/config/reservas/inst/all`, saves/toggles | no | `showLoader` en página hasta `await initConfigReservas()` | `#table-salas` + `#table-inst` tras guardar/toggle/masivo | **2026-05:** vacío/error/carga i18n; días modal `dia_semana_*`; edición instrumento `data-*` + delegación (sin XSS en onclick); celdas escapadas |

### Admin — datos institución (sede)

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Configuración institucional + catálogo servicios | `configuracion/config_institucion.js` | `/admin/config/institution`, service add/update/toggle/delete | no | `showLoader` en página hasta `await initConfigInstitution()` | `#table-services-body` tras guardar sede / alta / edición / borrado servicio | **2026-05:** spinner fila + vacío/error `tabla_*_servicios`; Swals y validaciones logo/servicios i18n; celdas y `data-*` escapados |

### Admin — tipos de formulario (pedidos)

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Tipos de formulario (tabs Animal / Reactivos / Insumos) | `configuracion/config_tipos_form.js` | `/admin/config/form-types/all`, save, delete | no | `showLoader` en página hasta `await initConfigFormTypes()` | las 3 tablas `#table-animal`, `#table-reactivos`, `#table-insumos` tras guardar/eliminar | **2026-05:** spinner + vacío/error i18n; cabeceras `th_cobro`/`th_acciones`; badges cobro/descuento i18n; nombre escapado |

### Admin — protocolos e insumos (catálogo config)

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Tipos y severidades de protocolo | `configuracion/config_protocolos.js` | `/admin/config/protocols-conf/init`, type/severity save/delete | no | `showLoader` hasta `await initConfigProtocolos()` | `#table-types` + `#table-sev` tras guardar/eliminar | **2026-05:** spinners dual + vacío/error i18n `config_protocolos.*`; `escCfg` en celdas; Swals i18n |
| [x] | Insumos generales (catálogo sede) | `configuracion/config_insumos.js` | `/admin/config/insumos/types`, `/admin/config/insumos/all`, save/toggle/delete | no | `showLoader` hasta `await initConfigInsumos()` | `#table-insumos` tras guardar/toggle/delete | **2026-05:** `config_insumos_cat.*` carga/vacío/error; modal categoría sin strings fijos críticos; badges estado/tooltips i18n |
| [x] | Insumos experimentales / reactivos | `configuracion/config_insumos_exp.js` | `/admin/config/insumos-exp/all`, species, save/toggle/delete | no | `showLoader` hasta `await initConfigInsumosExp()` | `#table-insumos-exp` tras mutaciones | **2026-05:** mismo patrón; select especies `opcion_general`; modal estado `opcion_habilitado` / `opcion_deshabilitado` |

### Facturación

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Depto | `billingDepto.js` | `/billing/depto-report`… | — | `showLoader` 1ª | `#billing-results` + `billing_loading_inline` | `billingResultsLoading.js`; tabla agregada vía `billingDashboard.js` |
| [x] | Dashboard tabla investigadores (compartido) | `facturacion/billingDashboard.js` | *(datos desde informes depto/investigador)* | — | — | `#tbody-investigadores` | **2026-05:** fila vacía `dashboard_sin_investigadores`; nombre escapado |
| [x] | Institución | `billingInstitucion.js` | *billing institution* | srv pag | igual | `#billing-results-inst` | |
| [x] | Investigador | `investigador/billingInvestigador.js` | `/billing/investigador-report` | — | igual | `#billing-results` | restore en error |
| [x] | Protocolo | `protocolo/billingProtocolo.js` | `/billing/protocol-report` | — | igual | `#billing-results` | |
| [x] | Organización | `billingOrg.js` | `/billing/org-report` | — | igual | `#billing-results-org` | |
| [x] | Legacy persona | `billingInvestigador.js` | mismo informe | — | igual | `#investigador-results` | PDF/pago masivo: loader global |
| [x] | Pagos / historial | `billingPayments.js` | balance, process-payment, saldo-historial | — | mutaciones: global | historial: Swal interno | **2026-05:** popup historial sin overlay página |
| [x] | Historial contable (auditoría) | `historialcontable.js` | `/billing/audit-history`, `/users/list-investigators` | cliente (`itemsPerPage`) | `showLoader` en init | filtros/paginación en cliente | Panel lateral investigadores + tabla `#table-body-historial`; ya cubierto |

### Panel investigador

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Mis formularios | `usuario/misformularios.js` | `/user/my-forms`, `/forms/derivation/targets`, modales protocolos/insumos/pagos | cliente | `showLoader({ upgradeOnly })` | `#table-body` + spinners modales | **2026-05:** `escapeMisFormsHtml`; textos carga modales vía `misformularios` + `generales.msg_cargando`; valorar paginación servidor |
| [x] | Mis reservas | `usuario/misreservas.js` | `/user/reservas/mine`, `/user/reservas/salas`, bundle mes | no | — | `#table-mis-reservas` | **2026-05:** spinner + fallback `generales.msg_cargando` |
| [x] | Mis alojamientos | `usuario/misAlojamientos.js` | `/user/my-housings` | cliente (`rowsPerPage`) | fila spinner `#table-body` | filtros/paginación client-side | **2026-05:** carga inicial + vacío/filtro/error i18n; modal detalle `msg_cargando` fallback |
| [x] | Portal noticias | `panel/noticias.js` | `/comunicacion/noticias` | sí (`page`/`pageSize`) | — | `#noticias-grid` | Debounce búsqueda 400 ms; spinner inline |
| [x] | Portal POE | `panel/poe.js` | `/comunicacion/poe` | no (lista según API) | — | `#poe-grid` | Spinner inline + fallback |
| [x] | Soporte (tickets) | `usuario/supportSoporte.js` | `/support/tickets` (`page`, `limit`) | sí | `showLoader` en `panel/soporte.html` hasta **`await initSupportSoporte()`** (1ª carga lista) | `#lista-tickets` en refetch | **2026-05:** `soporte.cargando` + fallback `generales.msg_cargando` |

### Comunicación / estadísticas

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | POE admin | `admin/comunicacion_poe.js` | `/admin/comunicacion/poe` | sí | — | siempre fila en `#admin-poe-tbody` | **2026-05:** spinner Bootstrap + `generales.msg_cargando` fallback |
| [x] | Noticias admin | `admin/comunicacion_noticias.js` | `/admin/comunicacion/noticias` | sí | — | fila `#admin-noticias-tbody` + spinner | **2026-05:** mismo criterio que POE; refetch paginación inline |
| [x] | Portada + popup admin | `admin/comunicacion_portada_popup.js` | `/admin/comunicacion/portada-popup` | n/a | **2026-05:** `showLoader({ upgradeOnly })` 1ª carga | POST guardar sin overlay página | Formulario; recarga tras guardar |
| [x] | Mensajes (hilos) | `usuario/mensajes.js` | `/comunicacion/mensajes/hilos` | no | — | `#lista-hilos` spinner + fallback | Personal / institucional; compose con spinners en botones |
| [x] | Estadísticas | `GeckoStats.js` | `/stats/dashboard`, `/stats/dashboard-red` | n/a | `#stats-content` oculto hasta datos | botón Actualizar + `admin_estadisticas.cargando` + fallback `generales.msg_cargando` | Exportaciones PDF/Excel aparte |

### Público / QR institución

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | QR todas las salas | `qr_salas.js` | `/reservas/institucion/public-bundle` | no | — | `#salas-list` | Token en URL; **2026-05:** spinner + `qr_salas.cargando` / `generales.msg_cargando` |
| [x] | QR ficha alojamiento (manager) | `qrManager.js` | `/alojamiento/history`, `/alojamiento/public-history` | — | `#qr-loader` | `#tbody-historial` fila spinner al refetch | **2026-05:** tras editar/eliminar tramo; `trace_loading`; error escapado |
| [x] | QR vista historia (view) | `qrView.js` | `/alojamiento/history` | — | `#qr-loader` | inline refetch + errores en loader | **2026-05:** sin datos / excepción → panel |

### Admin — ubicación física

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Ubicación de cajas | `configuracion/config_alojamientos_ubicacion.js` | `/admin/config/alojamiento/ubicacion/bundle` + mutaciones | no | Solo **1ª visita:** loader global en `alojamientos-ubicacion.html` hasta `await init`; boot **`loadAll('boot')`** | **Recarga + mutaciones** (etiquetas, toggle, delete, save catálogo): `withUbicTablesInlineBusy` → spinners en `#tbody-*`; **sin** `LoaderComponent` | **2026-05:** `fetchUbicBundleAndApply`; filtro cliente; fallos refetch restauran `state.bundle` o `error_recarga_catalogo` |

### Superadmin

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Instituciones (sedes) | `superadmin/instituciones.js` | `/superadmin/instituciones`, `/superadmin/modulos/catalogo` | no | `showLoader` en init | `#tabla-sedes` tras guardar crear/editar | **2026-05:** spinner fila + `tabla_cargando` / `generales.msg_cargando`; vacío `tabla_sin_filas` |
| [x] | Bitácora / auditoría sistema | `superadmin/bitacora.js` | `/superadmin/bitacora/list` | cliente | `showLoader` init | filtros/paginación cliente | **2026-05:** vacío/error/excel i18n `superadmin_bitacora`; escape celdas |
| [x] | Directorio global usuarios | `superadmin/usuarios.js` | `/superadmin/usuarios`, `/superadmin/instituciones` | cliente | `showLoader` init | spinner `#table-body` tras guardar / borrado | **2026-05:** `tabla_cargando`, vacío/filtro/error |
| [x] | Links registro (onboarding) | `superadmin/formRegistroManager.js` | `/superadmin/form-registros/all`, toggle/delete | no | spinner `#table-body-forms` al cargar | mismo tbody tras toggle/borrar | **2026-05:** vacío/error separados; slug seguro en URL |

*(Ampliar tablas con cada HTML que tenga `<table>` principal.)*

**Vistas sin tabla principal (referencia rápida, no requieren patrón tbody):**

| ✓ | Pantalla | JS | Notas |
|:-:|----------|-----|--------|
| [x] | Hub configuración (tarjetas) | `configuracion/config.js` | `config.html`: `initConfigDashboard()` síncrono; loader global solo hasta menú/i18n. **2026-05.** |
| [x] | Panel contacto ventas | `usuario/panelVentas.js` | `panel/ventas.html`: formulario; `await initVentasContacto()` (perfil); sin grilla. **2026-05.** |

---

## 7. Criterios de “hecho” por pantalla

- [ ] Primera visita: usuario ve loader global acotado y no pantalla “vacía” sin feedback prolongado.
- [ ] Cambio de página / filtro / orden: feedback **solo en la tabla**, sin flash de loader de página completa salvo error grave recuperable.
- [ ] Tiempo de API o tamaño de respuesta mejorado vs línea base **o** justificado (ej. exportación completa bajo botón explícito).
- [ ] Sin regresiones i18n ni roturas de paginación.

**Marcado incremental (código revisado; QA staging sigue pendiente salvo nota):**

- [x] **Ubicación de cajas — refetch manual:** botón Recargar sin overlay global; spinners en los cuatro `<tbody>`. **2026-05.**
- [x] **Ubicación de cajas — mutaciones:** guardar etiquetas, toggle, borrar, guardar ítem catálogo usan el mismo patrón inline (sin overlay de página). **2026-05.**
- [x] **Panel soporte — 1ª carga:** `initSupportSoporte` es async y la página espera `await` antes de `hideLoader` (lista inicial no queda bajo overlay truncado). **2026-05.**

---

## 8. Referencias en código (punto de partida)

- `front/dist/js/utils/adminListPageCache.js` — caché por página + prefetch.
- `front/dist/js/pages/admin/animales.js` — `animalesListBootLocked`, `loading: 'inline'`, `showLoader` inicial.
- `front/dist/js/components/LoaderComponent.js` — loader global.
- Modelos con `LIMIT` / `OFFSET`: `api/src/Models/Animal/AnimalModel.php`, `InsumoModel.php`, `ReactivoModel.php`, `User/UserModel.php`, `Comunicacion/MensajeriaModel.php`, etc.

---

*Última revisión: §2 debounce (nota ampliada); §6 soporte `await initSupportSoporte` + tabla hub/ventas sin grilla; §7 incremental panel soporte (2026-05).*
