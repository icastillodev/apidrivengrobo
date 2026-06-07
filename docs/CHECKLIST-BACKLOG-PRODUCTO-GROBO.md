# Checklist backlog producto — GROBO / URBE

**Origen:** lista maestra enviada para cerrar **punto por punto**.  
**Estado:** **alcance maestro cerrado en código** (2026-05); este archivo queda como **registro** de lo entregado. Iniciativas con alcance propio (p. ej. envío masivo de correo) → [`docs/PROYECTO-CORREOS-MASIVOS.md`](PROYECTO-CORREOS-MASIVOS.md).  
**Relación con otros docs:** no sustituye `checklist-finalizados/CHECKLIST-I18N-REGLA.md` ni migraciones en `docs/migrations/`; es el inventario **funcional/producto** que pediste.

> **Checklist activo (mayo 2026):** lote operación **Gabriel / Diana / Mariela** — **[`CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md`](CHECKLIST-PRODUCTO-2026-05-OPERACION-GDM.md)** (BD: [`CHECKLIST-BD-2026-05-OPERACION-GDM.md`](CHECKLIST-BD-2026-05-OPERACION-GDM.md)).  
> **Checklist anterior (mismo mes):** búsqueda, hotkeys, Marie — [`CHECKLIST-PRODUCTO-2026-05-GROBO.md`](CHECKLIST-PRODUCTO-2026-05-GROBO.md).

**Rendimiento — tablas y cargas:** checklist técnico vivo en **`docs/CHECKLIST-OPTIMIZACION-TABLAS-CARGAS.md`** (consultas, paginación API, loader primera carga vs spinner en tabla).

**Cambios de base de datos ligados al backlog:** inventario y reglas en **`docs/BACKLOG-BASE-DATOS.md`** (cada cambio de esquema → archivo `.sql` en `docs/migrations/`).

**Migración única para adjuntos comunicación (Backblaze B2):** [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) — documentada en [`docs/BACKLOG-BASE-DATOS.md` § Comunicación — adjuntos B2](BACKLOG-BASE-DATOS.md#sql-comunicacion-b2-adjuntos). Variables `.env`: `B2_*_{MENSAJES|NOTICIASPOPUP|POES|PROTOCOLOS}`.

> **Aclaración:** Las marcas `[x]` refieren código + migración cuando aplica. Si un ítem incluye **validación de negocio en staging** (facturación, pagos), el checklist lo indica en la propia viñeta; **BD** siempre debe estar enlazada arriba cuando hubo `ALTER`/`CREATE`.

### Ya cerrados o cubiertos en parte (referencia)

Referencia cruzada con `docs/CHECKLIST-FINALIZACION-2026-04.md` y trabajo en repo (facturación / i18n). **Conviene verificar en staging** antes de dar por cerrado negocio.

| Tema | Estado |
|------|--------|
| Facturación **institución / derivados** — dos investigadores, vista + PDF + Excel | **Hecho en código** según FINALIZACION abr.2026 (comprobar reglas de negocio «contable» completas) |
| Estadísticas **red** — SQL/API `getGeneralStatsRed`, front `GeckoStats.js` | **Hecho en código** abr.2026 |
| PDF **ficha animal** (`html2pdf`, errores i18n) | **Hecho en código** según FINALIZACION abr.2026 |
| Noticias — **listado dashboard** (p. ej. hasta 3 por petición) + modal crear (borrador / publicar / programar) | **Hecho en código** según FINALIZACION abr.2026 |
| Noticias — **fijar hasta 3 arriba en fila** (orden fijo, clicables) | **Hecho en código** (2026-05) — [`OrdenFijo`](BACKLOG-BASE-DATOS.md#sql-noticias-fijo) en **`docs/BACKLOG-BASE-DATOS.md`** + `admin/comunicacion/noticias` + dashboard |
| Comunicación — **adjuntos B2** (portada/popup + noticias + POE + mensajes UI 2026-05) | **API + migración** [`2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) → [`§ adjuntos B2`](BACKLOG-BASE-DATOS.md#sql-comunicacion-b2-adjuntos) |
| Lista **alojamientos** (`instId`, errores i18n) | **Hecho en código** según FINALIZACION abr.2026 |
| **Reservas** franjas consecutivas + fix hora API | **Hecho en código** según FINALIZACION abr.2026 |
| **Mensajería** correo al recibir + adjuntos B2 (API + buzón / compose Swal 2026-05) | **Hecho en código** según FINALIZACION + migración [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) → **`docs/BACKLOG-BASE-DATOS.md`** |
| Login **acceso directo / manifest** | **Hecho en código** según FINALIZACION abr.2026 |
| **Protocolos** — solicitudes en local (`Auth.checkAccess` roles admin/asistente/lab) | **Hecho en código** según FINALIZACION abr.2026 |
| **i18n facturación** modales, Swals, PDFs (`manager.js`, `billingHelper.js`, `es.js` / `en.js` / `pt.js`) | **Hecho en código** (sesión; solo textos/comportamiento fallback, sin BD) |

---

## Facturación, contable y derivados

- [x] **Pedidos derivados en contable (vista institución):** implementado según FINALIZACION abr.2026 (`getInstitutionDerivedReport`, `billingInstitucion.js`). **Sin cambios de BD** (usa `formulario_derivacion` / `formularioe` existentes). *Seguir recomendando una pasada de **QA en staging** sobre casos límite (derivado, depto, institución cobradora).*
  - *Código (2026-05):* API expone **`departamentoPedidoDestino`** (prioridad `formulario_derivacion.depto_destino` → `departamentoe` si `hasColumn`; si falta, **`formularioe.depto`** del pedido en sede cobradora); grilla / PDF ficha / PDF tabla / Excel en `billingInstitucion.js`; i18n `billing_institucion.*` (es/en/pt).
  - *Capacitación (2026-05):* bloque `derivados_contabilidad` en manual `admin__facturacion__institucion` (`capacitacionManual.es.js` / `.en.js` / `.pt.js`).

---

## Insumos y precios

- [x] **Editar valor por ítem (2026-05):** modal de insumos en facturación — tabla de líneas con **precio unitario** editable; `POST /billing/update-insumo-line-precio` actualiza `forminsumo.PrecioMomentoInsumo` y recalcula `precioinsumosformulario.preciototal` (validación ≥ pagado); bloqueo exento / derivación destino / `facturacion_formulario_derivado`. `BillingModel::updateInsumoLinePrecioMomento`, `insumoModal.js` + `manager.js` (`guardarPrecioLineaInsumo`); claves `billing_modal.ins_*` (es/en/pt).

- [x] **Pago 0 / exento (flujo viejo, 2026-05):** pedidos **no exentos** con total/pagado en **0** ya no muestran fila verde ni badge «PAGO» (`billingPedidoSinMontoNoExento` + `pedido_sin_total_cobrable`) en investigador / protocolo / departamento; pie del protocolo en **investigador** usa sumas `billingSum*` coherentes con las filas. Vista persona legacy: **POST** `/billing/investigador-report` + filas `items` desde API.

- [x] **Viejo vs nuevo (2026-05):** pedidos **sin protocolo** (`getPedidosDeptoSinProtocolo`) llevan `es_pedido_depto_sin_protocolo`; **no** se aplica `facturacion_formulario_derivado` ni badge «Derivado» (`mergeFacturacionDerivadaIntoPedidoFacturacionRow` sale antes); se limpian columnas `derivado_*` en ese listado.

- [x] **Insumos por pedido — reactivos vs demás (2026-05):** API `getInsumosByProtocolo` / `getInsumosGenerales` / `getInsumosByUser` incluyen `categoria` (`tipoformularios`); front parte filas con `billingPartitionInsumosPedidoReactivoOtros` + subtítulos `insumos_prot_subtitulo_*` en **investigador**, **protocolo** y **insumos generales depto**; fila común `billingHtmlRowInsumoPedidoFacturacion` (es/en/pt).

---

## Dashboard de precios / deudas

- [x] **Total total (2026-05):** tarjeta **TOTAL AGREGADO (DEUDA + PAGADO)** en `billingDashboard.js` (investigador / departamento) y bloque superior en `protocolo.html` + `renderDashboardProtocolo`; clave `facturacion.dashboard_total_agregado` (es/en/pt).

---

## Historial de pagos

- [x] **Historial en popup / filtro de fechas (2026-05):** el modal de historial de saldo (`openSaldoHistorialPopup` en `billingPayments.js`) **no** aplica por defecto `f-desde` / `f-hasta` del informe; `fetchSaldoHistorialData` resuelve `from`/`to` con `'from' in opts` / `'to' in opts` para que `from: null` (p. ej. panel depto) no sea sustituido por el DOM — el operador `??` trataba `null` como “falta de valor” y rellenaba fechas, excluyendo movimientos con `CURDATE()`.
- [x] **Historial no se muestra** *(correcciones de código 2026-05; si en un entorno sigue vacío → datos o configuración).*  
  - *BD (solo lectura/diagnóstico):* tabla **`historialpago`** — sin migración nueva en este ítem.
  - *Verificación sugerida:* comprobar `historialpago` y que el pago inserte filas; revisar scope `refId` y usuario.
  - *Código (2026-05):* vista **departamento** (`scope=depto`) filtraba pagos con `protocoloexpe.departamento = iddeptoA` (texto vs id); corregido en `BillingModel::getSaldoHistorialSplit` usando **`protdeptor`** + `formularioe.depto` y EXISTS sobre `protformr` / `alojamiento`.
  - *Código (2026-05):* si la API recibe solo **`from`** o solo **`to`**, el historial aplica `fecha >= from` o `fecha <= to` (antes solo había filtro con ambos).
  - *Código (2026-05):* JOIN **`formularioe`** en scope `depto` solo por **`idformA`** (PK global), para no perder pagos cuando `IdInstitucion` del pedido ≠ sede del **`historialpago`**; API y front exigen **`refId`** válido en `depto` / `protocolo`.
  - *UX (2026-05):* en `billingPayments.js`, el modal/panel de historial muestra un **texto guía** bajo las tablas cuando el alcance es **departamento** o **protocolo** (`saldo_hist_hint_filtrado_*`, es/en/pt), para reducir falsos positivos de «no muestra nada».
  - *UX (2026-05):* mismo bloque: guía en vista **investigador** (`saldo_hist_hint_investigador`) y mensaje si **ambas tablas están vacías** (`saldo_hist_hint_sin_movimientos`, es/en/pt).
  - *Capacitación (2026-05):* bloque `historial_saldo` en manual `admin__facturacion__index` (`capacitacionManual.es.js` / `.en.js` / `.pt.js`).
  - *Capacitación (2026-05):* bloque `vs_historial_saldo_facturacion` en `admin__historialcontable` — diferencia entre historial **contable** (auditoría) e historial de **saldo** en facturación (popup).

---

## Pagos (crítico)

- [x] **Loader / feedback en errores (front, 2026-05):** en modales PAGAR·QUITAR (`modals/manager.js`), pago masivo investigador legacy (`billingInvestigador.js`), liquidación institución (`billingInstitucion.js`) y `ejecutarPagoAPI` en `billingPayments.js` el loader se cierra con **`finally`** y se muestra error si la API devuelve `status !== 'success'` o lanza excepción.

- [x] **Pago no efectúa / saldo** *(feedback de loader corregido 2026-05; incidencias residuales → soporte con log/API en staging).*  
  - *BD:* revisar tablas de facturación/pagos según caso (`historialpago`, etc.) — **sin migración** asociada a este ítem.
  - *Capacitación (2026-05):* bloque `pago_feedback` en tema `capacitacion__tema__modales` (`capacitacionManual.es.js` / `.en.js` / `.pt.js`) — qué esperar tras PAGAR/QUITAR y cómo escalar si el UI y los datos no coinciden.

---

## Alojamientos — facturación vs modal

- [x] **Columna período (2026-05):** quitada la columna **período** en grillas de alojamiento (`getAlojTableHTML` en `billingProtocolo.js`, `billingInvestigador.js`, `billingDepto.js`). El detalle por tramos/fechas sigue en el modal (`modals/alojamientos/alojModal.js`).

---

## Protocolos (texto UI)

- [x] **Activar / desactivar cirugía (2026-05):** textos `solicitudprotocolo.modal.label_cirugia` y `admin_protocolos.cirugia_btn_lbl` / `cirugia_btn_title` en es/en/pt (no había literal «Cirugía: Anestesia» en repo; se unifica redacción al toggle).

---

## Reactivos — popup

- [x] **Proceso anestésico / protocolo (2026-05):** modal `reactiveModal.js` muestra badge según `protocolo_con_cirugia` devuelto por `GET /billing/detail-reactive/:id` (`BillingModel::getReactiveDetailById`: columna `con_cirugia`/`cirugia` en `protocoloexpe` si existe). Textos `billing_modal.lbl_proceso_anestesico`, `rea_proceso_anest_*`, `rea_proceso_anest_help` (es/en/pt).

---

## Formularios — anestésicos (nuevo atributo)

- [x] **Anestésicos en pedido + protocolo (2026-05):** migración [`docs/migrations/2026-05-09-formulario-anestesicos.sql`](migrations/2026-05-09-formulario-anestesicos.sql) (`TieneAnestesicos`, `PermiteAnestesicos`). Documentación BD: [`docs/BACKLOG-BASE-DATOS.md` § Anestésicos (pedido / protocolo)](BACKLOG-BASE-DATOS.md#sql-anestesicos-formulario). API `POST /animals/update-anestesicos`, `AnimalModel::updateTieneAnestesicosAdmin`; admin animales `animales.js` (`renderAnestesicosAdminBlock`, `saveAnestesicosAnimalAdmin`); protocolos `protocolos.js` + `ProtocolController`; detalle usuario `UserFormsModel::getDetail` expone cabecera; **Mis formularios** `misformularios.js` (badge / mensaje si no hay aprobación). i18n `admin_protocolos.perm_anest_*`, `admin_animales.modal.anestesicos_*`, `misformularios.anestesicos_*` (es/en/pt). **Marcar en staging** tras ejecutar SQL.

- [x] **Solo si el protocolo permite:** la API rechaza el cambio si `PermiteAnestesicos = 0` (`updateTieneAnestesicosAdmin`); en admin el selector queda deshabilitado y se muestra aviso (misma idea que otros toggles por protocolo).

---

## Estadísticas

- [x] **Propios vs recibidos por derivación (2026-05):** API `derivacion_pedidos` en `getGeneralStats` / `getGeneralStatsRed` (`StatisticsModel::getDerivacionVsPropios`, `getDerivacionVsPropiosRed`); vista sede + red en `GeckoStats.js` / `estadisticas.html`; claves `admin_estadisticas.seccion_deriv_pedidos`, `deriv_*` (es/en/pt).

- [x] **Red institucional — corrección base + pestañas por institución (2026-05):** placeholders SQL `StatisticsModel::getGeneralStatsRed` + `GeckoStats.js` (`madre_grupo` / instituciones en red); pestañas `#red-institution-tabs-wrap` / hint `#red-inst-filter-hint`, filtro `getRedStatsPayload()` en tablas, gráficos y export Excel/PDF; i18n `red_tab_all`, `red_tabs_inst_label`, `red_filter_hint` (es/en/pt).

---

## PDF reporte estadístico

- [x] **Periodo en PDF (2026-05):** encabezados sede/red (`exportFastPDF` / `exportFastPDFRed` en `GeckoStats.js`) con **periodo consultado** (`stats-from` / `stats-to`), **total de días inclusive** y línea **generado**; claves `admin_estadisticas.pdf_*` (es/en/pt).

- [x] **Completitud PDF (2026-05):** resumen con **trazabilidad aloj.** si viene en API; tablas **departamento (incl. Aloj.)**, **propios vs derivación** (`derivacion_pedidos` si `activo`), **organización**, **aloj. por especie**, **ranking especies/cepas**, **detalle cepas**, **categorías**, **detalle especies**, **protocolos**; en sede, export con gráficos incluye **depto + uso de especies**. Excel: hojas `Deriv_pedidos` / `Deriv_pedidos_Red`. Implementado en `GeckoStats.js` (`statsPdfAppendExtendedTables`, `statsAppendDerivacionPedidosSheet`, …) y claves `admin_estadisticas.*` / `pdf_*` (es/en/pt).

- [x] **Gráficas (2026-05):** colores fijos por métrica (`STATS_METRIC_COLORS`), barras horizontales tipo **torres** como uso de especies (`indexAxis: 'y'`), valores **encima/final de barra** (plugin `groboStatsBarValues`) y en **queso** leyenda `etiqueta: valor`; especies en barras con **color por ítem** (HSL). `GeckoStats.js` (`renderMainChart`, `renderSpeciesChart`).

---

## Alojamientos — «activo» y departamento

- [x] **«Aloj activo» (2026-05):** estadísticas por departamento (`StatisticsModel` sede/red) cuentan **historias distintas** con tramo vigente (`finalizado = 0`), no tramos; atribución por `protdeptor` + `alojamiento.idprotA`. Total global en tarjetas (`globales.total_alojamientos`): `COUNT(DISTINCT historia)` en la sede/red. Etiquetas `admin_estadisticas.label/th/box_aloj_*` (es/en/pt).

- [x] **Columna departamento + buscador (2026-05):** API `getAlojamientosProtocolo` añade `nombre_departamento` (depto del protocolo); `getActiveProtocols` expone `nombreDepartamento`; grillas aloj. en `billingProtocolo.js`, `billingInvestigador.js`, `billingDepto.js`; filtro `#busqueda-protocolo` incluye departamento; clave `facturacion.billing_protocolo.th_aloj_departamento` y `ph_busqueda_protocolo` (es/en/pt).

---

## Usuarios (admin)

- [x] **Rendimiento (2026-05):** eliminada la **segunda petición** que cargaba **todos** los usuarios en segundo plano (`triggerFullLoad`); la tabla usa solo paginación servidor (`limit`/`offset`). Listado paginado **sin subconsultas por fila** (`OtrosCeuaCount` / `ProtocolCount` / bitácora → literales en `getUsersByInstitutionPaged`); ficha completa vía `GET /users/one` en **paralelo** con protocols/forms/aloj. en `openUserModal`. Enlaces `?id=` / `UrlRouter`: `UserModel::getUserSummaryForInstitution`.

- [x] **Refresco tras guardar (2026-05):** `saveUserData` en `usuarios.js` invalida `pageUsersFull`, vuelve a pedir la lista (`forceServer: true`) y **reabre** la ficha con `openUserModal(uMerged)` para que el modal muestre datos alineados con el servidor sin cerrarlo.

---

## Noticias + portada + adjuntos **Backblaze** (API 2026-05)

- [x] **Solo listado + crear noticia (sin «fijar»):** hasta **3** noticias en petición de dashboard (`dashboardNoticias.js`) + modal **Borrador / Publicar ahora / Programar** según FINALIZACION abr.2026. **Esto no implementa** las noticias **fijadas** de la fila siguiente.

- [x] **Portada + máximo 2 adjuntos documento + imagen (2026-05):** tabla `institucion_portada_popup` + `GET /comunicacion/portada-popup` + bloque en `dashboardNoticias.js`. Admin: `paginas/admin/comunicacion/portada-popup.html`, API `GET`/`POST /admin/comunicacion/portada-popup`. Migraciones: creación [`docs/migrations/2026-05-09-institucion-portada-popup.sql`](migrations/2026-05-09-institucion-portada-popup.sql); **columnas B2** [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) → **`docs/BACKLOG-BASE-DATOS.md`**. URLs `http/https` siguen válidas; **subida API** `POST /comunicacion/b2/upload/portada-imagen`, `.../portada-documento`, `.../popup-documento`. **Front admin (2026-05):** `dist/js/pages/admin/comunicacion_portada_popup.js` — multipart, guardado JSON con claves B2, vista previa autenticada. i18n `comunicacion.pp_*` (es/en/pt).

- [x] **Popup único (2026-05):** mismo modelo/API/pantalla admin; interruptor `PopupActivo`, texto + 2 URLs + `PopupIdNoticia` validado contra noticia publicada; modal una vez por sesión y `FechaActualizacion` en `injectDashboardNoticias`.

- [x] **Fijar noticias:** máximo **3** arriba; **3 en fila** clicables — columna `OrdenFijo` + API + panel admin + fila en dashboard. SQL en [`docs/BACKLOG-BASE-DATOS.md` § Noticias fijadas — OrdenFijo](BACKLOG-BASE-DATOS.md#sql-noticias-fijo) · [`docs/migrations/2026-05-09-noticia-orden-fijo.sql`](migrations/2026-05-09-noticia-orden-fijo.sql).

- [x] **Borrar noticias** *(API + UI existentes; `AdminNoticiaController@delete` + botón en administración).*

- [x] **Noticia — imagen portada + hasta 2 documentos (API + BD + admin):** columnas en migración B2 (`ImagenPortadaB2Key`, `AdjuntoDoc1/2*`); subida `POST /comunicacion/b2/upload/noticia-imagen-portada`, `.../noticia-documento`; guardado JSON admin con claves; descarga `GET /comunicacion/noticias/:id/archivo/:tipo`. Documentación BD: **`docs/BACKLOG-BASE-DATOS.md`**. **Front admin (2026-05):** modal en `paginas/admin/comunicacion/noticias.html` + `dist/js/pages/admin/comunicacion_noticias.js` (multipart, vista previa si hay `IdNoticia`, i18n es/en/pt).

---

## Mensajes + adjuntos **Backblaze**

- [x] **Correo al recibir / hilos institucionales** *(abr.2026)* — primer mensaje y respuestas disparan correo según tipo (`MailService`).

- [x] **Adjuntos en mensajes (2026-05):** máximo **1** archivo por mensaje — **jpg / jpeg / pdf**, ≤ **50 KB** (validación API). **BD:** `mensaje.AdjuntoB2Key`, `mensaje.AdjuntoNombreOriginal` en [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) → **`docs/BACKLOG-BASE-DATOS.md`**. Subida `POST /comunicacion/b2/upload/mensaje-adjunto`; envío JSON con `AdjuntoB2Key` + `AdjuntoNombreOriginal`; descarga `GET /comunicacion/mensajes/adjunto/:id`. **Front (2026-05):** `paginas/panel/mensajes*.html`, `usuario/mensajes*.html` + `dist/js/pages/usuario/mensajes.js` (respuesta, nuevo mensaje institucional/personal); `dist/js/utils/mensajeriaCompose.js` (Swal desde animales/usuarios/etc.); en hilo, enlace por mensaje con adjunto; i18n `msg_adjunto_*` (es/en/pt). **Ayuda (modal):** `comunicacion.cap_help_s3_text` y `cap_help_inst_s3_text` describen adjuntos en es/en/pt.

- [x] **Contexto en correo de respuesta (2026-05):** tras `responder`, `MensajeriaModel::getPenultimoMensajeEnHilo` + `MailService::sendInternalMessageNotification` añade bloque «mensaje anterior» (autor + texto, tope ~4000 caracteres) en notificaciones a destinatarios de hilos **personales** e **institucionales**. Textos `MailLang`: `msg_int_previous_heading`, `msg_int_previous_from` (es/en/pt).

---

## Configuración — ubicación física de cajas

- [x] **Borrar ítems del catálogo (2026-05):** `POST /admin/config/alojamiento/ubicacion/catalog/delete` + `AlojamientoUbicacionModel::deleteCatalog` (tipos `uf|salon|rack|lugar`); UI botón **Eliminar** y confirmación en `config_alojamientos_ubicacion.js`. Eliminar rack borra posiciones en cascada (FK estándar); referencias en `alojamiento_caja` pasan a NULL según esquema.

- [x] **Orden + filtro rápido (2026-05):** racks ordenados por **nombre de salón**, luego `Orden` y nombre; posiciones en rack por salón del rack → rack → orden/nombre. Campo de **búsqueda en tiempo real** (`inp-filter-ubic`) sobre las cuatro tablas. i18n `config_aloj_ubicacion.filter_*`, `btn_delete`, `delete_*`, `msg_cat_deleted` (es/en/pt); bloque en `alojamientos-ubicacion.html`.

---

## Trazabilidad

- [x] **Revisión general (2026-05):** repaso de PDFs críticos alineados (`html2canvas` fondo blanco, `logging: false`, `useCORS` donde aplica) — protocolo investigador (`modulesprotocolos/modals_view.js`); ficha animal/caja/alojamiento (`alojamientos/animalFicha.js`); resto citado en ítems siguientes. Reabrir si QA encuentra una pantalla suelta fuera de ese patrón.

- [x] **PDF ficha animal — generación** *(abr.2026, `CHECKLIST-FINALIZACION`)* — `html2pdf`, mensajes si falla librería (`animales.js`).

- [x] **PDF historia alojamiento — ficha + tema oscuro (2026-05):** `ExportUI.js` — `html2canvas` con fondo **blanco**, contenedor PDF `#ffffff`; bloque traz incluye **ficha inicial** (`valores_inicio` ordenado con `categorias_inicio`) y **mediciones** (`observaciones_pivot`); cabeceras i18n `export_traz_*`, `export_pdf_*`, mensaje vacío ampliado (`export_sin_variables`) en es/en/pt. **Excel** mismo archivo: columnas `{Inicio: …}` por categoría en cada fila clínica; si solo hay ficha inicial, una fila por animal con `export_excel_solo_inicio`; placeholder sin datos `export_excel_sin_registro_clinico`.
- [x] **PDF / trazabilidad (ampliar, tema oscuro):** `protocolos.js`, `insumos.js`, `reactivos.js`, ficha pedido `animales.js`, tarifario `precios.js`, PDF pedido investigador `misformularios.js` — contenedor `#ffffff` y `html2canvas` con `backgroundColor: '#ffffff'`, `logging: false`, `useCORS` donde corresponde. **Mis alojamientos (`misAlojamientos.js`, 2026-05):** ya alineado (`valores_inicio` + pivot, fondo blanco, `misalojamientos.pdf_*` es/en/pt). **Ficha animal/caja/aloj. (`animalFicha.js`):** mismo criterio `html2canvas` (`logging: false`, fondo blanco).

- [x] **Ficha inicial — texto en configuración (2026-05):** la pestaña **Trazabilidad — inicio** (`configuracion/alojamientos.html`) usa `config_alojamientos.desc_traz_inicio` ampliado (es/en/pt): aclara que son datos al crear la unidad/sujeto en el tramo, que alimentan ficha/PDF/QR, que IDs físicos de caja/sujeto siguen el flujo de alojamientos y que el seguimiento temporal va en **Trazabilidad — datos**.

- [x] **Nuevo sujeto:** flujo inicial para **completar fichita** de configuración *(mejoras 2026-05: API devuelve id unidad, mensaje guía, highlight tarjeta, manual `fichita_tras_alta`).* **Sin migración nueva** en este ítem. Un rediseño completo del formulario «fichita» puede quedar como mejora futura aparte.
  - *Código (2026-05):* `POST /trazabilidad/add-subject` devuelve **`IdEspecieAlojUnidad`** (`TrazabilidadModel::addSujeto`); tras crear sujeto, `trazabilidad.js` muestra mensaje guía (datos biológicos + variables de inicio en el árbol) y botón opcional **«Abrir datos biológicos»** (`editSubjectFicha`). i18n `alojamientos.trace_subject_added_*` (es/en/pt). **Ruta duplicada** `/trazabilidad/add-subject` eliminada en `routes.php`.
  - *Código (2026-05):* tarjeta de sujeto con `data-traz-unidad-id`; tras cerrar el Swal de éxito, **`highlightUnidadCard`** hace scroll suave y borde verde temporal para ubicar el sujeto nuevo en el árbol.
  - *Capacitación (2026-05):* bloque `fichita_tras_alta` en manual `admin__alojamientos` (`capacitacionManual.es.js` / `.en.js` / `.pt.js`) — pasos recomendados tras el alta (datos biológicos + variables de inicio vs seguimiento en «datos»).

---

## POE — Protocolos Operativos Estandarizados

- [x] **Núcleo (2026-05):** tabla `institucion_poe` + `GET /comunicacion/poe` + `GET /comunicacion/poe/:id` + panel `panel/poe.html` (`poe.js`), bloque en `dashboardNoticias.js` (hasta 5 enlaces + «Ver todos»). Admin: `admin/comunicacion/poe.html`, API `GET`/`POST` bajo `/admin/comunicacion/poe` (listado, detalle, crear, actualizar, eliminar). Permisos alineados con noticias/portada. Migración [`docs/migrations/2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql). i18n `comunicacion.poe_*`, `dash_poe_*`, títulos `poe_portal` / `poe_admin` (es/en/pt). Enlaces desde portal noticias y admin noticias. **QR** en detalle portal y en modal admin (URL absoluta al ítem). Adjuntos: **URLs http/https** o **B2** (`Adjunto1B2Key` / `Adjunto2B2Key` en [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql)); subida `POST /comunicacion/b2/upload/poe-instructivo`; descarga `GET /comunicacion/poe/:id/adjunto/:slot` (admin puede previsualizar con POE inactivo). Documentación BD: **`docs/BACKLOG-BASE-DATOS.md`**. **Front admin POE B2 (2026-05):** `dist/js/pages/admin/comunicacion_poe.js` — multipart, claves en create/update, vista previa autenticada; i18n `poe_b2_*` + botones `pp_b2_*`.

---

## Cierre — adjuntos comunicación (Backblaze B2) *(API 2026-05)*

- **Adjuntos Backblaze (noticias, portada, mensajes, POE):** migración única [`docs/migrations/2026-05-09-comunicacion-b2-adjuntos.sql`](migrations/2026-05-09-comunicacion-b2-adjuntos.sql) + **`docs/BACKLOG-BASE-DATOS.md`**. **Mensajería:** máx. **1** adjunto por mensaje (no 2). **POE / noticias:** límites y tipos según API (`ComunicacionArchivoValidacion`). **Front multipart / JSON** listo en **portada/popup**, **noticias**, **POE** y **mensajería** (buzón + compose reutilizado, 2026-05).

---

## Proyectos aparte del alcance de este checklist

No hay filas pendientes en este documento. El **envío masivo de correo** («comunicado a todos», campañas) se documenta como iniciativa independiente en **[`docs/PROYECTO-CORREOS-MASIVOS.md`](PROYECTO-CORREOS-MASIVOS.md)** (factibilidad, checklist de implementación y enlaces al repo).

---

*Última actualización (2026-05): backlog maestro de producto cerrado en alcance documentado; correos masivos movidos a proyecto aparte.*  
*Archivo:* `docs/CHECKLIST-BACKLOG-PRODUCTO-GROBO.md`
