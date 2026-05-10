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

**Verificación código 2026-05:** el inventario **§6** (**✓ código**) revisa estas reglas en cada pantalla con tabla principal (loader 1ª carga vs spinner en tbody, i18n, errores). QA en staging sigue abierto salvo nota explícita.

---

## 2. Contrato API recomendado (listados paginados)

- [x] Query params consistentes: `limit`, `offset` (o `page` + `pageSize` documentado), filtros y `sort_key` / `sort_dir` donde corresponda. **2026-05 (código verificado):** inventario admin — **`AnimalController::getAll`**, **`InsumoController::getAll`**, **`ReactivoController::getAll`** (`limit`, `offset`, filtros por módulo, `sort_key` / `sort_dir`). Usuarios institución — **`UserController::index`** (`limit`, `offset`, `q`, `filter_col`, `sort_key`, `sort_dir`). Comunicación admin / soporte — conversión en front con **`offsetLimitToPagePageSizeQuery`** / **`offsetLimitToPageLimitQuery`** (`page` + `pageSize` o `page` + `limit`). **Rutas:** definidas en **`api/routes.php`**; pantalla ↔ endpoint principal documentado en **§6**. **Pendiente:** OpenAPI o tabla CSV única si el equipo la adopta.
- [x] Respuesta con **`total`** (conteo filtrado en servidor) además de `data[]`, para paginación correcta sin traer todo el dataset. **2026-05:** animales / insumos / reactivos — **`status` + `data` + `total`** cuando hay paginación (**`AnimalController::getAll`** y análogos). Usuarios — **`UserController::index`** con `limit > 0` devuelve **`total`** junto a **`data`**. Comunicación / soporte paginados — **`NoticiaModel`** (portal + admin con `COUNT` alineado al listado), **`InstitucionPoeModel::listAdmin`**, **`SupportTicketModel::listTickets`** (`items` + `total`). **2026-05 — superadmin usuarios:** **`GET /superadmin/usuarios`** — `limit` (1–500 o **`limit=0`** hasta 50 000 para Excel), `offset`, `q` opcional; respuesta **`total`** + **`data`**; front **`superadmin/usuarios.js`**. **2026-05 — instituciones:** **`GET /superadmin/instituciones`** sin query `limit` → lista completa (hasta 50 000) para selects (**`/superadmin/usuarios`**, etc.); con **`limit`/`offset`/`q`** → **`total`** + página. **2026-05 — bitácora:** **`GET /superadmin/bitacora/list`** paginado (`limit`/`offset`/`q`/`accion`/`inst`) + **`total`**; **`GET /superadmin/bitacora/instituciones-filtro`** para el desplegable de sedes.
- [x] **Techo de `limit`** en servidor. **2026-05 (parcial):** hay acotación explícita — **`min(10000, …)`** en controllers/modelos de inventario y **`UserModel::getUsersByInstitutionPaged`** (tope **10000**). Tickets / mensajería — techos más bajos (**`SupportTicketController`**, **`MensajeriaController`** / modelos). **Pendiente política producto:** bajar techo operativo en grillas admin (p. ej. 500) y reservar cargas masivas a export con botón explícito, si se desea evitar picos de **10000** filas.
- [x] Búsquedas con **debounce** en front (p. ej. 250–400 ms) para no disparar N peticiones por tecla. **2026-05:** `panel/noticias.js` (400 ms); `superadmin/instituciones.js` / `superadmin/usuarios.js` (check username: debounce). Listados admin con búsqueda por botón/Enter (p. ej. animales/insumos/reactivos) no requieren debounce por tecla. **2026-05 — utilidad:** `front/dist/js/utils/debounce.js` (`debounce(fn, waitMs)` + `cancel()`); **`protocolos.js`** filtro texto tabla (300 ms, Enter fuerza inmediato); **`historialcontable.js`** panel investigadores (`inv-hist-search`, 280 ms, solo cliente). **Pendiente:** otros `input` live que refilen listas grandes o llamen API sin debounce.
- [x] Invalidar caché de página al cambiar filtros — **`syncFiltersKey()`** en **`adminListPageCache.js`** (borra **`pageCache`** y sube **`listGeneration`** cuando cambia la query `fullLoad`). **2026-05:** usado en **`animales.js`**, **`insumos.js`**, **`reactivos.js`**, **`usuarios.js`**, **`comunicacion_noticias.js`**, **`comunicacion_poe.js`**, **`supportSoporte.js`** (todos los consumidores actuales de **`createAdminListPageCache`**). **Pendiente:** nuevos listados que adopten la caché deben llamar **`syncFiltersKey`** en el mismo punto donde se aplican filtros/orden.

---

## 3. Base de datos y consultas (backend PHP / SQL)

Por cada endpoint que alimenta una tabla:

- [ ] **EXPLAIN** (o equivalente en MariaDB/MySQL) sobre la consulta principal con volumen realista. **2026-05:** procedimiento detallado en **§5 Fase 1.2**; **pendiente:** ejecutarlo en staging sobre `/animals/all`, `/insumos/all`, `/reactivos/all`, `/users/institution` y comunicación admin según prioridad.
- [ ] Índices compuestos alineados con `WHERE` + `ORDER BY` + joins frecuentes (documentar en PR si hace falta migración en `docs/migrations/`). **2026-05:** `BACKLOG-BASE-DATOS.md` cubre índices / `ALTER` de **producto** (noticias, POE, etc.); **`docs/database.sql`** es esquema de referencia (puede diferir del servidor). **2026-05 — propuesta (validar en staging):** [`docs/migrations/2026-05-11-performance-bitacora-modulos-usuarioe.sql`](migrations/2026-05-11-performance-bitacora-modulos-usuarioe.sql) — `bitacora(id_usuario)`, `usuarioe(IdInstitucion)`, `modulosactivosinst(IdInstitucion)`; ver [`BACKLOG-BASE-DATOS.md` § Rendimiento superadmin](BACKLOG-BASE-DATOS.md#sql-rendimiento-superadmin-bitacora). **Pendiente:** EXPLAIN antes/después y cerrar ítem al ejecutar en servidor.
- [ ] Evitar **N+1**: no una query por fila; preferir joins controlados o batch secundario acotado. **2026-05 (parcial, código):** **`AnimalModel::getByInstitution`** — última derivación vía subconsulta agregada + join (`fd_last`), no dos subconsultas correlacionadas por fila; post-procesado snapshots **`formulario_datos_originales`** en **una** query batch por IDs. **`UserModel::getUsersByInstitutionPaged`** — listado sin subconsultas correlacionadas por fila (conteos/fechas en **`getUserSummaryForInstitution`**). **`BitacoraModel::getLogsPaged`** / **`getFullLogs`** — **una** consulta con **`LEFT JOIN`** `usuarioe` / `personae` / `institucion` (sin N+1 por fila); UI superadmin paginada (**2026-05**); **`getFullLogs`** conserva tope **5000**. **`InstitucionModel::getAllInstitutions`** — módulos en batch **`IN (...)`** + PHP. **`Admin/UsuarioModel::getGlobalUsersPaged`** / **`getAllGlobal`** — **`FechaCreacion`** vía **`LEFT JOIN`** subconsulta agregada **`MIN(id_bitacora)`** + join a **`bitacora`** (sustituye subselect correlacionado). **`FormRegistroModel::getAllConfigs`** — **`campos_completados`** vía **`LEFT JOIN`** agregado **`COUNT(*)`** por **`id_form_config`**. **`FormRegistroModel::buildPlanModulosJson`** — **`modulosapp`** en **una** query **`IN (...)`** (antes N lookups). **`UserFormsModel::getAllForms`** — **`getInstitucionesParticipantesBatch`** (derivaciones + **`institucion`** por **`IN (IdInstitucion…)`**, antes N×por fila). **`UserFormsModel::getInsumosPedidosByUser`** — líneas de ítem en **una** query **`pif.idformA IN (…)`**. **`TrazabilidadModel::getArbolBiologico`** — unidades por **`IdCajaAlojamiento IN (…)`**; **`observacion_alojamiento_unidad`** para pivot + inicio en **dos** queries batch por conjunto de **`IdEspecieAlojUnidad`** (antes 2× por sujeto). **`TrazabilidadModel::insertarObservaciones`** / **`upsertObservacionesInicio`** — **`TipoDeDato`** en **`categoriadatosunidadalojamiento`** con **`IN (IdDatosUnidadAloj…)`** (**`fetchTiposDatoCategoriaBatch`**), antes 1× por categoría enviada. **`getCajasTramoAnterior`** — unidades históricas **`IN (IdCajaAlojamiento)`** + **`IdUnidadAlojamiento`** ya presentes en el tramo actual en **una** lista (antes 1× por sujeto). **`getFichaAlojamientoAgrupada`** — **`IdEspecieAlojUnidad`** por caja en **`IN`** (antes 1 query por caja). **`clonarCajasBajoDemanda`** — mismos **`PDOStatement`** para SELECT/INSERT por iteración (menos parse SQL). **`StatisticsModel::getGeneralStatsRed`** — **`alojamientos_activos`**: **una** query **`d.IdInstitucion IN (…)`**; **`por_departamento`**: un solo **`prepare`** SQL + **`execute`** por sede de la red (antes **`prepare`** repetido por sede); **`por_organizacion`**: **`fetchOrganismosPorInstitucionesBatch`** (**`organismoe`** **`IdInstitucion IN (…)`**) + **`getPorOrganizacion(..., $orgsPrecargadas)`** en ruta red (antes **`SELECT`** organismos por sede en cada iteración). **`getFichaAnimalCompleta`** — pivot de observaciones de **todos** los tramos del historial en **una** query (**`fetchObservacionesPivotForUnidadesBatch`**, antes 1× por tramo). **`StatisticsModel::aggregateByDeptoList`** — **`organismopertenece IS NULL`**: **`PDOStatement`** cacheado en instancia (**`stmtAggregateByDeptoSinOrganismo`**). **Pendiente (ampliación):** **`aggregateByDeptoList`** por organismo en **`getPorOrganizacion`** sigue **`prepare`** por iteración; **`por_departamento`** sigue **`execute`** por sede; **`getFichaCajaAgrupada`** / **`getFichaAlojamientoAgrupada`** — una llamada **`getFichaAnimalCompleta`** por sujeto — **EXPLAIN** en staging; auditoría continua.
- [x] **SELECT** solo columnas usadas por la grilla — **2026-05 (parcial, código):** **`AuthModel::getUserByUsernameForInstitutionLogin`** — **`usuarioe`** sin **`u.*`** (**`sqlSelectUsuarioeAllColumnsPrefixed`**). **`Admin/InstitucionModel::getAllInstitutions`** — **`institucion`** sin **`i.*`** (**`sqlSelectInstitucionAllColumnsIPrefixed`**, alineado a `docs/database.sql`). **`ProtocolModel::getByInstitution`** / **`getProtocolosValidos`** — **`protocoloexpe`** explícito (**`sqlSelectProtocoloexpeBasePrefixed`**; columna **`PermiteAnestesicos`** si existe en BD). **`UserProtocolsModel::getDetail`** — mismo patrón con alias **`p`**. **`UserFormsModel::getDetail`** — **`formularioe`** sin **`f.*`** (**`sqlSelectFormularioeAllColumnsPrefixed`**; **`TieneAnestesicos`** opcional). **`UserHousingModel::getDetail`** — **`alojamiento`** sin **`a.*`** (lista alineada a **`AlojamientoModel::sqlSelectAlojamientoAllColumns`**). **Auditoría `api/src/Models/**/*.php` (2026-05):** sin **`SELECT *`** ni proyecciones **`alias.*`** en strings SQL de modelos (solo menciones en PHPDoc). **Pendiente:** EXPLAIN por endpoint crítico; **`api/src/Controllers`** / scripts / SQL armado en tiempo de ejecución; índices / N+1 en las líneas anteriores de §3.
- [x] **COUNT** eficiente: misma cláusula `WHERE` que el listado; evitar subconsultas repetidas si se puede una sola pasada o caché de conteo según caso. **2026-05 (código):** **`AnimalModel`**, **`InsumoModel`**, **`ReactivoModel`** — `SELECT COUNT(DISTINCT f.idformA) …` con mismos `WHERE` / joins base que el listado (joins extra solo cuando hay filtros que lo exigen, alineado al patrón del SELECT). **`UserModel::getUsersByInstitutionPaged`** — `COUNT(*)` sobre el mismo `$fromSql` + `$searchSql` que el SELECT. **`SupportTicketModel::listTickets`** — `COUNT(*)` sobre el mismo ámbito que el listado (global para rol Gecko / filtrado por `IdUsrA` para usuario). **`InstitucionPoeModel`** — **`countAdmin`** misma tabla y **`WHERE IdInstitucion`** que **`listAdmin`**. **`NoticiaModel`** — `COUNT(*)` acoplado a los filtros de cada listado (portal/admin). **`FormRegistroModel::getAllConfigs`** — conteo de respuestas vía subconsulta agregada en **`LEFT JOIN`** (misma idea que COUNT compartido). **`UsuarioModel::countGlobalUsers`** — mismo **`WHERE`** / joins que **`getGlobalUsersPaged`** (directorio superadmin). **`BitacoraModel::countLogsFiltered`** — mismos filtros que **`getLogsPaged`**. **`Admin/InstitucionModel::countInstitutionsFiltered`** — mismo **`WHERE`** (`institutionSearchWhere`) que **`getInstitutionsPaged`**. **Pendiente:** EXPLAIN en staging.
- [x] Paginación estable — **tie-breaker PK/formulario.** **2026-05 (código):** **`resolveAnimalListOrderBy`** / **`resolveInsumoListOrderBy`** / **`resolveReactivoListOrderBy`** — sufijo **`, f.idformA DESC`** tras la columna sorteada. **`UserModel::getUsersByInstitutionPaged`** — **`, u.IdUsrA DESC`** tras `$orderExpr`. **`SupportTicketModel::listTickets`** — **`ORDER BY FechaActualizacion DESC, IdSupportTicket DESC`**. **`InstitucionPoeModel::listAdmin`** — **`ORDER BY Orden ASC, IdPoe DESC`**. **`BitacoraModel::getLogsPaged`** — **`ORDER BY b.id_bitacora DESC`** (**PK** estable; paginación servidor **2026-05**). **`InstitucionModel::getAllInstitutions`** / **`getInstitutionsPaged`** — **`ORDER BY i.IdInstitucion DESC`** (PK). **`UsuarioModel::getGlobalUsersPaged`** — **`ORDER BY … , u.IdUsrA ASC`** (sedes + apellido + PK). **Pendiente:** otros listados no revisados.

---

## 4. Frontend — patrones reutilizables

- [x] **Caché por página + prefetch idle** — **`createAdminListPageCache`**. **2026-05 (código):** ya integrado en **`animales.js`**, **`insumos.js`**, **`reactivos.js`**, **`usuarios.js`**, **`comunicacion_noticias.js`**, **`comunicacion_poe.js`**, **`supportSoporte.js`** (véase §2 / §8). **Pendiente:** valorar adopción en listados pesados **sin** este patrón (p. ej. hist. contable u otros superadmin sin caché por página).
- [x] **Un solo lugar** para “primera carga vs inline”: helper para filas en `<tbody>`. **2026-05:** **`front/dist/js/utils/tableInlineLoading.js`** — **`setTbodyLoadingSpinner`** (`layout: 'inventory'` para pedidos / inventario), **`setTbodyMessageRow`** (`variant: 'mutedEmpty'` sin resultados, **`layout: 'inventory'`** en errores); **`superadmin/bitacora.js`**, **`superadmin/usuarios.js`**, **`superadmin/instituciones.js`**, **`admin/animales.js`**, **`admin/insumos.js`**, **`admin/reactivos.js`**. **Pendiente (opcional):** comunicación admin, **`usuarios.js`** (institución), etc.; boot global en **`LoaderComponent`** + `*ListBootLocked`.
- [x] **Facturación:** revisar `billingDepto.js`, `billingInstitucion.js`, `billingPayments.js`, etc.; **2026-05:** informes depto/inst/inv/prot/org/legacy con 1ª carga global + spinner inline en recargas; `billingResultsLoading.js`; popup historial saldo en Swal (`billingPayments`).
- [x] Listados que **renderizan todo en cliente** (`misformularios.js`): **2026-05** — loader 1ª visita + tabla inline en `reloadMyForms`; **pendiente:** paginación servidor si el volumen crece.

---

## 5. Ruta de trabajo (fases)

### Fase 0 — Inventario (sin cambiar comportamiento)

- [x] 1. Listar **todas** las pantallas con tabla principal (admin + panel + facturación + comunicación). **2026-05:** cubierto en **§6** (tablas por área + vistas sin tabla principal).
- [x] 2. Por cada una: archivo JS, endpoint(s), ¿paginación servidor?, ¿`total`?, ¿loader global siempre? **2026-05:** columnas **JS / API / Pag / 1ª / Inline** en **§6**.
- [x] 3. Definir **presupuesto** objetivo (ej. p95 &lt; 400 ms API + render en staging con dataset medio). **2026-05 — línea base acordada (validar en staging):** p95 de listados paginados admin (`/animals/all`, `/insumos/all`, `/reactivos/all`, `/users/institution`) **&lt; 400 ms** TTFB/API con sede de tamaño mediano; ajustar si la infra real es más lenta. Mediciones: **`API_SERVER_TIMING=1`** + Network panel (cabecera `Server-Timing`) o APM externo.

### Fase 1 — Línea base

- [x] 1. Cabecera **`Server-Timing`** opcional (duración del controlador en ms). **2026-05:** `api/src/Utils/Router.php` — si en `.env` está **`API_SERVER_TIMING=1`** (también acepta `true` / `yes` / `on`), cada respuesta JSON correctamente enrutada incluye `Server-Timing: app;dur=…` (útil en Chrome DevTools → red → cabeceras). Desactivado por defecto en producción. Endpoints prioritarios para comparar: **`GET …/animals/all`**, **`…/insumos/all`**, **`…/reactivos/all`**, **`…/users/institution`**, **`GET …/comunicacion/noticias`** (admin).
- [x] 2. **Procedimiento EXPLAIN + payload (staging).** Con volumen realista, para cada consulta principal del listado: (1) obtener el SQL desde logs de consulta lenta, depuración temporal en modelo o `EXPLAIN` sobre una copia del `SELECT` final con los mismos `WHERE`/`ORDER BY`/joins; (2) en MariaDB/MySQL: `EXPLAIN ANALYZE …` si está disponible, si no `EXPLAIN FORMAT=JSON …`; (3) anotar tipo de acceso (ALL vs index), filas estimadas y si aparecen **Using filesort** / **Using temporary** sin necesidad; (4) tamaño aproximado de respuesta JSON (columna Content-Length o copiar cuerpo en DevTools). Documentar hallazgos en PR o nota interna; índices → **§5 Fase 2**.

### Fase 2 — Quick wins (alto impacto / bajo riesgo)

- [ ] 1. Índices faltantes acordes a EXPLAIN (con migración si aplica). **2026-05:** propuesta base superadmin en `docs/migrations/2026-05-11-performance-bitacora-modulos-usuarioe.sql` + §3 índices (enlace backlog); confirmar con EXPLAIN en staging.
- [x] 2. Reducir columnas en SELECT de listados. **2026-05:** §3 SELECT — auditoría **`api/src/Models`** sin `*` / `alias.*`; listados con columnas explícitas (p. ej. **`SupportTicketModel::listTickets`** comentario “solo columnas que usa `supportSoporte.js`”). **Pendiente:** nuevos endpoints / revisión tras cambios de UI.
- [x] 3. Unificar **primera carga = loader global**, **resto = tbody** en módulos ya paginados (animales / insumos / reactivos como plantilla). **2026-05:** familia inventario + usuarios admin + comunicación admin + soporte (§4 / §6); **`LoaderComponent.js`** enlaza este checklist.

### Fase 3 — Refactors de consulta

- [x] 1. Fusionar subconsultas duplicadas; eliminar N+1 en modelos `api/src/Models/**`. **2026-05 (alcance auditoría checklist):** **`InstitucionModel::getAllInstitutions`**, **`Admin/UsuarioModel::getGlobalUsersPaged`** (**`getAllGlobal`** hereda query), **`FormRegistroModel::getAllConfigs`** + **`buildPlanModulosJson`**, **`UserFormsModel`**, **`TrazabilidadModel`** (**`getArbolBiologico`**, obs., **`getCajasTramoAnterior`**, **`getFichaAlojamientoAgrupada`**, **`clonarCajasBajoDemanda`**, **`getFichaAnimalCompleta`**), **`StatisticsModel::getGeneralStatsRed`** (**`alojamientos_activos`**, **`por_departamento`** **`prepare`** único, **`organismoe`** batch + **`getPorOrganizacion`** con precarga; **`aggregateByDeptoList`** **`IS NULL`** — **`prepare`** cacheado en modelo) — §3. **Pendiente:** nuevos listados y seguimiento EXPLAIN.
- [x] 2. Endpoints sin `total`: añadir conteo eficiente o estimación documentada si el COUNT fuera prohibitivo. **2026-05:** **`UsuarioController::list`**, **`BitacoraController::listAll`**, **`InstitucionController::list`** (modo paginado con **`countInstitutionsFiltered`**); modo sin **`limit`** sin **`total`** (compat. selects).

### Fase 4 — Consolidación

- [x] 1. Documentar convención en README interno de front (o comentario en `LoaderComponent.js`). **2026-05:** `front/dist/js/components/LoaderComponent.js` — comentario cabecera enlaza **`docs/CHECKLIST-OPTIMIZACION-TABLAS-CARGAS.md`** (primera carga vs spinner en tabla).
- [ ] 2. Marcar filas del inventario (sección 6) como `[x]` cuando staging valide. **2026-05:** §6 ya marca **✓ código**; falta cierre QA staging por pantalla donde aplique.

---

## 6. Inventario por área (marcar al cerrar cada pantalla)

**Leyenda columnas:** **✓ código** = revisión UX carga en front (2026-05). · API = endpoint principal · Pag = ¿paginación servidor? · 1ª / Inline = comportamiento de loaders.

### Admin — pedidos / inventario

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Animales | `animales.js` | `/animals/all` | sí | ref. | ref. | **`tableInlineLoading`** `layout: 'inventory'` / **`mutedEmpty`** (**2026-05**) |
| [x] | Insumos | `insumos.js` | `/insumos/all` | sí | ref. | ref. | Igual **`tableInlineLoading`** (**2026-05**) |
| [x] | Reactivos | `reactivos.js` | `/reactivos/all` | sí | ref. | ref. | Igual **`tableInlineLoading`** (**2026-05**) |
| [x] | Precios / tarifarios | `precios.js` | `/precios/all-data`, `/precios/update-all` | no (dataset completo) | **2026-05:** 1ª `showLoader`; tras guardar `initPreciosPage({ inline: true })` en 4 `<tbody>` | | |
| [x] | Reservas salas (admin) | `reservas.js` | `/admin/reservas/agenda`, `/admin/reservas/sala/agenda`, `/admin/reservas/pending/list` | no (por rango fecha) | — | `#table-agenda`, `#table-pendientes`, lista instrumentos modal | **2026-05:** spinner + `generales.msg_cargando` fallback |

### Admin — usuarios, protocolos, alojamientos

| ✓ código | Pantalla | JS / entrada | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|----------------|-----|-----|-----|--------|--------|
| [x] | Usuarios | `usuarios.js` | `/users/institution` | sí | **2026-05:** `usuariosListBootLocked` + `showLoader({ upgradeOnly })` | `admin_usuarios.cargando_lista` | |
| [x] | Roles / permisos (config) | `configuracion/config_roles.js` | `/admin/config/roles/init`, `/admin/comunicacion/noticias/roles-publicar` | cliente (`renderUsers`) | spinner `#table-users` + `noticias-roles-tbody` | refetch solo al init | **2026-05:** `config_roles.tabla_cargando` es/en/pt; error API → fila tabla; **`roles.html` `await initConfigRoles()`** alinea loader global |
| [x] | Protocolos | `protocolos.js` | `/protocols/form-data`, `/protocols/institution` | no | **2026-05:** `showLoader({ upgradeOnly })` | `#table-body-protocols` + `admin_protocolos.cargando_lista` | **2026-05:** debounce 300 ms en filtro texto (`debounce.js`); Enter inmediato; API **`ProtocolModel::getByInstitution`** / **`getProtocolosValidos`** (§3) |
| [x] | Solicitudes de protocolo (aprobar/rechazar) | `solicitudesprotocolo/main.js`, `api_service.js` | `/admin/requests/list`, `/admin/requests/process` | no | `showLoader` en página hasta **`await initAdminRequests()`** (`solicitud_protocolo.html`) | fila spinner `#table-requests` al refetch (p. ej. tras decisión en modal) | **2026-05:** `generales.msg_cargando` en fila carga; errores `tabla.error_api` / `error_conexion` es/en/pt |
| [x] | Alojamientos / trazabilidad | `alojamientos/trazabilidad.js` (+ `HistorialUI.js`, `RegistroUI.js`, `TableUI.js`) | `/trazabilidad/get-arbol`, POST mutaciones; especies `/protocols/current-species` | cliente tabla principal | `showLoader` en flujos Historial/Registro | `#trazabilidad-content-{id}` + spinners modales cfg | **2026-05:** árbol inline sin overlay página; `trace_loading` + `generales.msg_cargando`; especies Historial/Registro; API **`TrazabilidadModel::getArbolBiologico`** batch cajas/unidades/obs.; POST guardado obs. — **`fetchTiposDatoCategoriaBatch`** (§3 / §8) |
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
| [x] | Historial contable (auditoría) | `historialcontable.js` | `/billing/audit-history`, `/users/list-investigators` | cliente (`itemsPerPage`) | `showLoader` en init | filtros/paginación en cliente | **2026-05:** debounce 280 ms en `#inv-hist-search` (`debounce.js`); panel + tabla |

### Panel investigador

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Mis formularios | `usuario/misformularios.js` | `/user/my-forms`, `/forms/derivation/targets`, modales protocolos/insumos/pagos | cliente | `showLoader({ upgradeOnly })` | `#table-body` + spinners modales | **2026-05:** `escapeMisFormsHtml`; textos carga modales vía `misformularios` + `generales.msg_cargando`; valorar paginación servidor; detalle **`UserFormsModel::getDetail`** sin **`f.*`** (§3) |
| [x] | Mis reservas | `usuario/misreservas.js` | `/user/reservas/mine`, `/user/reservas/salas`, bundle mes | no | — | `#table-mis-reservas` | **2026-05:** spinner + fallback `generales.msg_cargando` |
| [x] | Mis alojamientos | `usuario/misAlojamientos.js` | `/user/my-housings` | cliente (`rowsPerPage`) | fila spinner `#table-body` | filtros/paginación client-side | **2026-05:** carga inicial + vacío/filtro/error i18n; modal detalle `msg_cargando` fallback; **`UserHousingModel::getDetail`** sin **`a.*`** (§3) |
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
| [x] | Estadísticas | `GeckoStats.js` | `/stats/dashboard`, `/stats/dashboard-red` | n/a | `#stats-content` oculto hasta datos | botón Actualizar + `admin_estadisticas.cargando` + fallback `generales.msg_cargando` | Exportaciones PDF/Excel aparte; **`StatisticsModel::getGeneralStatsRed`** — **`alojamientos_activos`** batch, deptos **`prepare`** único, organismos batch; **`aggregateByDeptoList`** **`IS NULL`** — **`prepare`** cacheado (§3 / §8) |

### Público / QR institución

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | QR todas las salas | `qr_salas.js` | `/reservas/institucion/public-bundle` | no | — | `#salas-list` | Token en URL; **2026-05:** spinner + `qr_salas.cargando` / `generales.msg_cargando` |
| [x] | QR ficha alojamiento (manager) | `qrManager.js` | `/alojamiento/history`, `/alojamiento/public-history` | — | `#qr-loader` | `#tbody-historial` fila spinner al refetch | **2026-05:** tras editar/eliminar tramo; `trace_loading`; error escapado; API ficha: **`getFichaAnimalCompleta`** — obs. tramos en batch (§3 / §8) |
| [x] | QR vista historia (view) | `qrView.js` | `/alojamiento/history` | — | `#qr-loader` | inline refetch + errores en loader | **2026-05:** sin datos / excepción → panel; **`getFichaAnimalCompleta`** obs. batch |

### Admin — ubicación física

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Ubicación de cajas | `configuracion/config_alojamientos_ubicacion.js` | `/admin/config/alojamiento/ubicacion/bundle` + mutaciones | no | Solo **1ª visita:** loader global en `alojamientos-ubicacion.html` hasta `await init`; boot **`loadAll('boot')`** | **Recarga + mutaciones** (etiquetas, toggle, delete, save catálogo): `withUbicTablesInlineBusy` → spinners en `#tbody-*`; **sin** `LoaderComponent` | **2026-05:** `fetchUbicBundleAndApply`; filtro cliente; fallos refetch restauran `state.bundle` o `error_recarga_catalogo` |

### Superadmin

| ✓ código | Pantalla | JS | API | Pag | 1ª | Inline | Notas |
|:--------:|----------|-----|-----|-----|-----|--------|--------|
| [x] | Instituciones (sedes) | `superadmin/instituciones.js` | `/superadmin/instituciones` (`limit`/`offset`/`q` en grilla; sin `limit` en otros clientes), **`GET /superadmin/instituciones/:id`** (detalle modal si la fila no está en página actual), `/superadmin/modulos/catalogo` | sí (srv en pantalla sedes) | `showLoader` en init | `#tabla-sedes` inline en búsqueda/página y tras guardar | **2026-05:** debounce 400 ms; paginación + **`total`**; **`getInstitutionsPaged`** / **`countInstitutionsFiltered`**; **`getInstitutionByIdForSuperadmin`**; módulos **`IN`** (§3) |
| [x] | Bitácora / auditoría sistema | `superadmin/bitacora.js` | `/superadmin/bitacora/list`, `/superadmin/bitacora/instituciones-filtro` | sí | `showLoader` init | spinner tabla en página/filtro | **2026-05:** paginación servidor + filtros `q`/`accion`/`inst`; Excel `limit=0`; **`BitacoraModel::getLogsPaged`** / **`countLogsFiltered`**; i18n `tabla_cargando` |
| [x] | Directorio global usuarios | `superadmin/usuarios.js` | `/superadmin/usuarios` (`limit`,`offset`,`q`; Excel `limit=0`), `/superadmin/instituciones` | sí (srv) | `showLoader` init | spinner `#table-body` tras guardar / borrado / página | **2026-05:** paginación servidor + **`total`**; búsqueda **`q`** en API; **`UsuarioModel::getGlobalUsersPaged`** / **`countGlobalUsers`** |
| [x] | Links registro (onboarding) | `superadmin/formRegistroManager.js` | `/superadmin/form-registros/all`, toggle/delete | no | spinner `#table-body-forms` al cargar | mismo tbody tras toggle/borrar | **2026-05:** vacío/error separados; slug seguro en URL; **API:** **`getAllConfigs`** con **`LEFT JOIN`** agregado respuestas |

*(Ampliar tablas con cada HTML que tenga `<table>` principal.)*

**Vistas sin tabla principal (referencia rápida, no requieren patrón tbody):**

| ✓ | Pantalla | JS | Notas |
|:-:|----------|-----|--------|
| [x] | Hub configuración (tarjetas) | `configuracion/config.js` | `config.html`: `initConfigDashboard()` síncrono; loader global solo hasta menú/i18n. **2026-05.** |
| [x] | Panel contacto ventas | `usuario/panelVentas.js` | `panel/ventas.html`: formulario; `await initVentasContacto()` (perfil); sin grilla. **2026-05.** |

---

## 7. Criterios de “hecho” por pantalla

- [x] Primera visita: usuario ve loader global acotado y no pantalla “vacía” sin feedback prolongado. **2026-05:** cubierto en inventario §6 (**✓ código**); **pendiente:** QA staging puntual por pantalla.
- [x] Cambio de página / filtro / orden: feedback **solo en la tabla**, sin flash de loader de página completa salvo error grave recuperable. **2026-05:** mismo criterio §6 para módulos paginados admin/panel revisados; **pendiente:** staging + nuevas pantallas.
- [ ] Tiempo de API o tamaño de respuesta mejorado vs línea base **o** justificado (ej. exportación completa bajo botón explícito). **Pendiente:** mediciones en staging (`API_SERVER_TIMING`, EXPLAIN §5 Fase 1.2) y comparar vs presupuesto §5 Fase 0.3.
- [x] Sin regresiones i18n ni roturas de paginación. **2026-05:** revisión código §6 + §2 (`total`, tie-breaker §3); **pendiente:** QA regression en staging.

**Marcado incremental (código revisado; QA staging sigue pendiente salvo nota):**

- [x] **Ubicación de cajas — refetch manual:** botón Recargar sin overlay global; spinners en los cuatro `<tbody>`. **2026-05.**
- [x] **Ubicación de cajas — mutaciones:** guardar etiquetas, toggle, borrar, guardar ítem catálogo usan el mismo patrón inline (sin overlay de página). **2026-05.**
- [x] **Panel soporte — 1ª carga:** `initSupportSoporte` es async y la página espera `await` antes de `hideLoader` (lista inicial no queda bajo overlay truncado). **2026-05.**
- [x] **Login sede — `usuarioe`:** `AuthModel::getUserByUsernameForInstitutionLogin` sin `u.*` (**2026-05**).
- [x] **Superadmin instituciones — listado:** `InstitucionModel::getAllInstitutions` sin `i.*` (**2026-05**).
- [x] **Protocolos admin + panel usuario:** `ProtocolModel` (lista por institución + protocolos válidos), `UserProtocolsModel::getDetail`, `UserFormsModel::getDetail`, `UserHousingModel::getDetail` — SELECT acotados (**2026-05**).
- [x] **Backend modelos — barrido wildcards:** revisión en código de `api/src/Models` sin `SELECT *` / `t.*` en consultas (**2026-05**); siguen abiertos controladores y validación en staging (§3).
- [x] **Listados inventario + usuarios — COUNT + orden estable:** §3 marcado según **`AnimalModel`**, **`InsumoModel`**, **`ReactivoModel`**, **`UserModel`** (**2026-05**).
- [x] **Comunicación admin / portal + soporte — COUNT + `total` + tie-breaker:** **`NoticiaModel`**, **`InstitucionPoeModel::listAdmin`**, **`SupportTicketModel::listTickets`** (**2026-05**).
- [x] **§5 Fase 0 — inventario:** puntos 1–3 cerrados en alcance documentación (**2026-05**); QA mediciones reales en staging abierto.
- [x] **§5 Fase 1 — línea base:** cabecera `Server-Timing` + procedimiento EXPLAIN documentado (**2026-05**); ejecución en staging pendiente (no bloquea código).
- [x] **§5 Fase 2 — puntos 2–3:** SELECT acotado (§3) + patrón loaders paginados (**2026-05**).
- [x] **§5 Fase 3.2 — `total` en paginación servidor:** **`/superadmin/usuarios`** cerrado (**2026-05**); bitácora / instituciones según §2.
- [x] **Bitácora superadmin — listado paginado:** **`BitacoraModel::getLogsPaged`** + **`countLogsFiltered`**; orden **`id_bitacora DESC`**; **`getFullLogs`** delega en página 5000 (**2026-05**).
- [x] **Auditoría N+1 / subconsultas (2026-05):** hotspots documentados en §3; §5 Fase 3.1 enlazada.
- [x] **Superadmin sedes — N+1 módulos resuelto:** **`InstitucionModel::getAllInstitutions`** carga **`modulosactivosinst`** en batch (**2026-05**).
- [x] **Superadmin usuarios globales + onboarding configs:** **`Admin/UsuarioModel`** (listado global con JOIN **`bitacora`**) y **`FormRegistroModel::getAllConfigs`** — subconsultas correlacionadas sustituidas por JOINs agregados (**2026-05**); **2026-05** paginación API **`getGlobalUsersPaged`** + **`countGlobalUsers`**.
- [x] **Onboarding — `plan_modulos`:** **`FormRegistroModel::buildPlanModulosJson`** deja de consultar **`modulosapp`** fila a fila (**2026-05**).
- [x] **Mis formularios — participantes + insumos:** **`UserFormsModel::getAllForms`** (batch derivaciones/institución) y **`getInsumosPedidosByUser`** (ítems por **`IN (idformA)`**) (**2026-05**).
- [x] **Trazabilidad — árbol (`/trazabilidad/get-arbol`):** **`TrazabilidadModel::getArbolBiologico`** reduce queries por caja/sujeto (**2026-05**).
- [x] **Trazabilidad — guardar métricas / inicio:** **`insertarObservaciones`** + **`upsertObservacionesInicio`** — lookup **`TipoDeDato`** en batch (**2026-05**).
- [x] **Trazabilidad — clonar cajas / ficha alojamiento / tramo anterior:** **`getCajasTramoAnterior`**, **`getFichaAlojamientoAgrupada`**, **`clonarCajasBajoDemanda`** — menos round-trips (**2026-05**).
- [x] **Trazabilidad — ficha animal (QR / detalle sujeto):** **`getFichaAnimalCompleta`** — **`fetchObservacionesPivotForUnidadesBatch`** para todos los **`IdEspecieAlojUnidad`** del historial de tramos (**2026-05**).
- [x] **Estadísticas red — alojamientos activos:** **`StatisticsModel::getGeneralStatsRed`** (`alojamientos_activos` en una pasada SQL) (**2026-05**).
- [x] **Estadísticas red — departamentos / organismos:** **`getGeneralStatsRed`** — **`prepare`** único para **`por_departamento`**; **`fetchOrganismosPorInstitucionesBatch`** + **`getPorOrganizacion`** con organismos precargados (**2026-05**).
- [x] **Estadísticas — `aggregateByDeptoList` sin organismo:** **`stmtAggregateByDeptoSinOrganismo`** reutiliza **`prepare`** para **`organismopertenece IS NULL`** entre llamadas (**2026-05**).

---

## 8. Referencias en código (punto de partida)

- `api/src/Utils/Router.php` — **`API_SERVER_TIMING=1`** en `.env` → cabecera **`Server-Timing: app;dur=…`** (ms en controlador); §5 Fase 1.
- **`UsuarioController::list`** / **`Admin/UsuarioModel::getGlobalUsersPaged`** — directorio global superadmin paginado + **`total`**; **`GlobalSearchController`** — tope longitud término **`q`** (120 caracteres).
- **`BitacoraController::listAll`** / **`institucionesFiltro`** — **`BitacoraModel::getLogsPaged`**, **`countLogsFiltered`**, **`listInstitucionesDistinctForFilter`**.
- **`InstitucionController::list`** / **`getOne(:id)`** — sin **`limit`** → **`getAllInstitutions`**; con **`limit`** → **`getInstitutionsPaged`** + **`countInstitutionsFiltered`**; detalle una sede → **`getInstitutionByIdForSuperadmin`**.
- `front/dist/js/utils/tableInlineLoading.js` — **`setTbodyLoadingSpinner`** / **`setTbodyMessageRow`** (§4); superadmin bitácora / usuarios / sedes + inventario animales / insumos / reactivos (**2026-05**).
- `front/dist/js/utils/debounce.js` — **`debounce`** para filtros en vivo (§2); usado en **`protocolos.js`**, **`historialcontable.js`** (**2026-05**).
- `front/dist/js/utils/adminListPageCache.js` — caché por página + prefetch; **`syncFiltersKey`** en todos los JS que instancian **`createAdminListPageCache`** (2026-05: animales, insumos, reactivos, usuarios, noticias/POE admin, soporte panel).
- `front/dist/js/pages/admin/animales.js` — `animalesListBootLocked`, `loading: 'inline'`, `showLoader` inicial (misma familia: `insumos.js`, `reactivos.js`, `usuarios.js`).
- `front/dist/js/components/LoaderComponent.js` — loader global; convención UX + enlace a este checklist (cabecera).
- Modelos con `LIMIT` / `OFFSET`: `api/src/Models/Animal/AnimalModel.php`, `InsumoModel.php`, `ReactivoModel.php`, `User/UserModel.php`, `Comunicacion/MensajeriaModel.php`, etc.
- **`resolveAnimalListOrderBy`** / **`resolveInsumoListOrderBy`** / **`resolveReactivoListOrderBy`** — orden usuario + tie-breaker **`f.idformA DESC`**. **`UserModel::getUsersByInstitutionPaged`** — **`ORDER BY … , u.IdUsrA DESC`**; COUNT comparte **`$fromSql`** con el SELECT.
- **`Support/SupportTicketModel.php`** — **`listTickets`**: columnas explícitas, `total`, orden **`IdSupportTicket DESC`** como desempate.
- **`Comunicacion/NoticiaModel.php`** — listados paginados con **`total`** y `COUNT` acorde a filtros.
- **`Comunicacion/InstitucionPoeModel.php`** — **`listAdmin`** + **`countAdmin`**; **`ORDER BY Orden ASC, IdPoe DESC`**.
- **`Admin/BitacoraModel.php`** — **`getFullLogs`**: un SELECT + JOINs + **`LIMIT 5000`** (`BitacoraController::listAll`); índices opcionales JOIN — **`2026-05-11-performance-bitacora-modulos-usuarioe.sql`** (`bitacora.id_usuario`, `usuarioe.IdInstitucion`).
- `api/routes.php` — registro central de rutas HTTP (enlazar con columnas API de **§6**).
- `api/src/Models/Auth/AuthModel.php` — **`sqlSelectUsuarioeAllColumnsPrefixed`** (login sede).
- `api/src/Models/Admin/InstitucionModel.php` — **`sqlSelectInstitucionAllColumnsIPrefixed`** (`getAllInstitutions`); módulos: **una** query **`IN (IdInstitucion…)`** + agrupación PHP (**2026-05**, §3); índice opcional **`modulosactivosinst(IdInstitucion)`** — migración **`2026-05-11-performance-bitacora-modulos-usuarioe.sql`**.
- `api/src/Models/Admin/UsuarioModel.php` — **`getGlobalUsersPaged`** / **`getAllGlobal`**: JOIN agregado **`MIN(id_bitacora)`** por usuario + **`bitacora.fecha_hora`**; **`ORDER BY`** sede / apellido / **`u.IdUsrA`**.
- `api/src/Models/FormRegistro/FormRegistroModel.php` — **`getAllConfigs`**: **`LEFT JOIN`** subconsulta **`COUNT(*)`** agrupada por **`id_form_config`**. **`buildPlanModulosJson`**: **`SELECT … FROM modulosapp WHERE IdModulosApp IN (…)`**.
- `api/src/Models/UserForms/UserFormsModel.php` — **`getInstitucionesParticipantesBatch`** + uso en **`getAllForms`**; **`getInsumosPedidosByUser`** batch ítems; **`sqlSelectFormularioeAllColumnsPrefixed`** (`getDetail`).
- `api/src/Models/Alojamiento/TrazabilidadModel.php` — **`getArbolBiologico`** / **`getCajasTramoAnterior`** / **`getFichaAlojamientoAgrupada`**: unidades o IDs por **`IN (IdCajaAlojamiento)`** donde aplica; **`fetchObservacionesPivotForUnidadesBatch`** / **`fetchValoresInicioForUnidadesBatch`**; **`getFichaAnimalCompleta`** — **`fetchObservacionesPivotForUnidadesBatch`** una vez por historial de tramos; **`fetchTiposDatoCategoriaBatch`** (**`insertarObservaciones`**, **`upsertObservacionesInicio`**); **`clonarCajasBajoDemanda`**: **`prepare`** fuera del bucle de cajas.
- `api/src/Models/Estadisticas/StatisticsModel.php` — **`getGeneralStatsRed`**: **`alojamientos_activos`** **`WHERE d.IdInstitucion IN (…)`** + agrupación PHP; **`por_departamento`** — **`prepare`** fuera del bucle por sede; **`fetchOrganismosPorInstitucionesBatch`** + **`getPorOrganizacion($id, $from, $to, $orgsPrecargadas)`** en ruta red (`getGeneralStats` sin precarga, comportamiento anterior de queries por sede); **`aggregateByDeptoList`** — cache de **`PDOStatement`** para **`organismopertenece IS NULL`** (`stmtAggregateByDeptoSinOrganismo`).
- `api/src/Models/Protocol/ProtocolModel.php` — **`sqlSelectProtocoloexpeBasePrefixed`** (`getByInstitution`, `getProtocolosValidos`).
- `api/src/Models/UserProtocols/UserProtocolsModel.php` — detalle protocolo usuario.
- `api/src/Models/UserHousing/UserHousingModel.php` — **`sqlSelectAlojamientoAllColumnsPrefixed`** (`getDetail`).
- Convención **2026-05:** capa **`api/src/Models`** — evitar `*` / `alias.*` en SQL estático; nuevos listados deben listar columnas o reutilizar helpers `sqlSelect*`.

---

*Última revisión: **`tableInlineLoading.js`** — inventario admin (animales / insumos / reactivos) + layouts `inventory` / `mutedEmpty`; §4/§8.*
