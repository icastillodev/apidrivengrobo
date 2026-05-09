# Checklist backlog producto — GROBO / URBE

**Origen:** lista maestra enviada para cerrar **punto por punto**.  
**Estado:** backlog vivo — marcar `[x]` al cerrar cada ítem.  
**Relación con otros docs:** no sustituye `checklist-finalizados/CHECKLIST-I18N-REGLA.md` ni migraciones en `docs/migrations/`; es el inventario **funcional/producto** que pediste.

**Rendimiento — tablas y cargas:** checklist técnico vivo en **`docs/CHECKLIST-OPTIMIZACION-TABLAS-CARGAS.md`** (consultas, paginación API, loader primera carga vs spinner en tabla).

**Cambios de base de datos ligados al backlog:** inventario y reglas en **`docs/BACKLOG-BASE-DATOS.md`** (cada cambio de esquema → archivo `.sql` en `docs/migrations/`).

> **Aclaración:** Las marcas `[x]` cruzadas con `CHECKLIST-FINALIZACION-2026-04.md` refieren **entregas descritas ahí** o trabajo de código **documentado en repo**. No significan que **todo** el enunciado largo del backlog esté resuelto. Si algo exige **BD** (p. ej. **noticias fijadas en fila**), sigue pendiente hasta tener migración y prueba — ver `BACKLOG-BASE-DATOS.md`.

### Ya cerrados o cubiertos en parte (referencia)

Referencia cruzada con `docs/CHECKLIST-FINALIZACION-2026-04.md` y trabajo en repo (facturación / i18n). **Conviene verificar en staging** antes de dar por cerrado negocio.

| Tema | Estado |
|------|--------|
| Facturación **institución / derivados** — dos investigadores, vista + PDF + Excel | **Hecho en código** según FINALIZACION abr.2026 (comprobar reglas de negocio «contable» completas) |
| Estadísticas **red** — SQL/API `getGeneralStatsRed`, front `GeckoStats.js` | **Hecho en código** abr.2026 |
| PDF **ficha animal** (`html2pdf`, errores i18n) | **Hecho en código** según FINALIZACION abr.2026 |
| Noticias — **listado dashboard** (p. ej. hasta 3 por petición) + modal crear (borrador / publicar / programar) | **Hecho en código** según FINALIZACION abr.2026 |
| Noticias — **fijar hasta 3 arriba en fila** (orden fijo, clicables) | **Hecho en código** (2026-05) — requiere migración `OrdenFijo` en `docs/BACKLOG-BASE-DATOS.md` + `admin/comunicacion/noticias` + dashboard |
| Lista **alojamientos** (`instId`, errores i18n) | **Hecho en código** según FINALIZACION abr.2026 |
| **Reservas** franjas consecutivas + fix hora API | **Hecho en código** según FINALIZACION abr.2026 |
| **Mensajería** correo al recibir (hilos institucionales) | **Hecho en código** según FINALIZACION + **contexto del mensaje anterior** en correo de respuesta (2026-05, `MailService` / `MailLang`) |
| Login **acceso directo / manifest** | **Hecho en código** según FINALIZACION abr.2026 |
| **Protocolos** — solicitudes en local (`Auth.checkAccess` roles admin/asistente/lab) | **Hecho en código** según FINALIZACION abr.2026 |
| **i18n facturación** modales, Swals, PDFs (`manager.js`, `billingHelper.js`, `es.js` / `en.js` / `pt.js`) | **Hecho en código** (sesión; solo textos/comportamiento fallback, sin BD) |
| Consulta **correos masivos** | **Respondida** (factible; **feature + posible BD** pendientes) |

---

## Facturación, contable y derivados

- [ ] **Pedidos derivados en contable (vista institución):** implementado según FINALIZACION abr.2026 (`getInstitutionDerivedReport`, `billingInstitucion.js`). **Marcar `[x]` solo tras validación negocio:** que cumpla «aparecer para pagar», departamento, protocolo, etiqueta **derivado** e **institución derivada** en todos los casos que pediste.
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
- [ ] **Historial no se muestra** si persiste tras lo anterior: revisar **BD** o registro (API `GET /billing/saldo-historial`).  
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

- [ ] **Pago no efectúa / saldo:** si tras lo anterior **sigue** sin descontarse saldo o aparece **saldo insuficiente** con saldo real, revisar **backend** (`/billing/*`), concurrencia y datos en BD — reproducir en staging y priorizar según log/API.
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

- [x] **Anestésicos en pedido + protocolo (2026-05):** migración [`docs/migrations/2026-05-09-formulario-anestesicos.sql`](migrations/2026-05-09-formulario-anestesicos.sql) (`TieneAnestesicos`, `PermiteAnestesicos`). API `POST /animals/update-anestesicos`, `AnimalModel::updateTieneAnestesicosAdmin`; admin animales `animales.js` (`renderAnestesicosAdminBlock`, `saveAnestesicosAnimalAdmin`); protocolos `protocolos.js` + `ProtocolController`; detalle usuario `UserFormsModel::getDetail` expone cabecera; **Mis formularios** `misformularios.js` (badge / mensaje si no hay aprobación). i18n `admin_protocolos.perm_anest_*`, `admin_animales.modal.anestesicos_*`, `misformularios.anestesicos_*` (es/en/pt). **Marcar en staging** tras ejecutar SQL.

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

## Noticias (dejar adjuntos/imágenes para fase **Backblaze** al final)

- [x] **Solo listado + crear noticia (sin «fijar»):** hasta **3** noticias en petición de dashboard (`dashboardNoticias.js`) + modal **Borrador / Publicar ahora / Programar** según FINALIZACION abr.2026. **Esto no implementa** las noticias **fijadas** de la fila siguiente.

- [x] **Portada + máximo 2 adjuntos (2026-05):** tabla `institucion_portada_popup` + `GET /comunicacion/portada-popup` + bloque en `dashboardNoticias.js` (texto + enlaces `http/https`). Admin: `admin/comunicacion/portada-popup.html`, API `GET`/`POST /admin/comunicacion/portada-popup`. Migración [`docs/migrations/2026-05-09-institucion-portada-popup.sql`](migrations/2026-05-09-institucion-portada-popup.sql). i18n `comunicacion.pp_*`, `dash_portada_label` (es/en/pt). **Subida de archivos** sigue pendiente de Backblaze (URLs manuales).

- [x] **Popup único (2026-05):** mismo modelo/API/pantalla admin; interruptor `PopupActivo`, texto + 2 URLs + `PopupIdNoticia` validado contra noticia publicada; modal una vez por sesión y `FechaActualizacion` en `injectDashboardNoticias`.

- [x] **Fijar noticias:** máximo **3** arriba; **3 en fila** clicables — columna `OrdenFijo` + API + panel admin + fila en dashboard. SQL en **`docs/BACKLOG-BASE-DATOS.md`**.

- [x] **Borrar noticias** *(API + UI existentes; `AdminNoticiaController@delete` + botón en administración).*

*(Implementación de almacenamiento de archivos en conjunto con **Backblaze** al cerrar esa fase.)*

---

## Mensajes (adjuntos al final con Backblaze)

- [x] **Correo al recibir / hilos institucionales** *(abr.2026)* — primer mensaje y respuestas disparan correo según tipo (`MailService`). **Pendiente:** adjuntos en mensajes (Backblaze).

- [ ] Adjuntos (máx. **2**) — mismo criterio que noticias cuando exista storage.

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

- [ ] **Nuevo sujeto:** flujo inicial para **completar fichita** de configuración (no igual al actual si se redefine).
  - *Código (2026-05):* `POST /trazabilidad/add-subject` devuelve **`IdEspecieAlojUnidad`** (`TrazabilidadModel::addSujeto`); tras crear sujeto, `trazabilidad.js` muestra mensaje guía (datos biológicos + variables de inicio en el árbol) y botón opcional **«Abrir datos biológicos»** (`editSubjectFicha`). i18n `alojamientos.trace_subject_added_*` (es/en/pt). **Ruta duplicada** `/trazabilidad/add-subject` eliminada en `routes.php`.
  - *Código (2026-05):* tarjeta de sujeto con `data-traz-unidad-id`; tras cerrar el Swal de éxito, **`highlightUnidadCard`** hace scroll suave y borde verde temporal para ubicar el sujeto nuevo en el árbol.
  - *Capacitación (2026-05):* bloque `fichita_tras_alta` en manual `admin__alojamientos` (`capacitacionManual.es.js` / `.en.js` / `.pt.js`) — pasos recomendados tras el alta (datos biológicos + variables de inicio vs seguimiento en «datos»).

---

## POE — Protocolos Operativos Estandarizados

- [x] **Núcleo (2026-05):** tabla `institucion_poe` + `GET /comunicacion/poe` + `GET /comunicacion/poe/:id` + panel `panel/poe.html` (`poe.js`), bloque en `dashboardNoticias.js` (hasta 5 enlaces + «Ver todos»). Admin: `admin/comunicacion/poe.html`, API `GET`/`POST` bajo `/admin/comunicacion/poe` (listado, detalle, crear, actualizar, eliminar). Permisos alineados con noticias/portada. Migración [`docs/migrations/2026-05-09-institucion-poe.sql`](migrations/2026-05-09-institucion-poe.sql). i18n `comunicacion.poe_*`, `dash_poe_*`, títulos `poe_portal` / `poe_admin` (es/en/pt). Enlaces desde portal noticias y admin noticias. **QR** en detalle portal y en modal admin (URL absoluta al ítem). Adjuntos: **URLs http/https** manualmente (misma regla que portada).
- [ ] **Fase final — subida Backblaze:** reemplazar o complementar URLs manuales para los **dos adjuntos** por POE, en el mismo cierre que noticias/mensajería/correos masivos.

---

## Fase final — comunicación masiva, adjuntos cloud y correos

*(Agrupado al cerrar producto: **Backblaze** u otro storage para adjuntos de **noticias**, **mensajería** (máx. 2), **POE** (máx. 2), más la **feature** de **correos masivos** descrita abajo.)*

---

## Consultas (solo descartar / diseño)

- [x] **¿Correos masivos?** — *Respondido:* es **posible** (SMTP/API, colas, auditoría). La **feature** de producto (botón «enviar a todos») sigue **sin implementar**; ver nota debajo.

---

## Nota — correos masivos (factibilidad)

**Sí puede hacerse** a nivel de producto: típicamente un job que envía a la lista de emails de usuarios activos de la sede (con permisos de admin), usando el mismo `MailService`/proveedor ya existente, con:

- Cola o envío por lotes para no saturar.
- Registro de «quién disparó» y cuándo.
- Opcional: enlace de baja o categoría «solo avisos institucionales».

No implica nueva pestaña en BD por sí solo; sí implica **carga legal/operativa** (spam, RGPD si aplica). Tratarlo como **feature** aparte del checklist funcional anterior.

---

*Última actualización: casillas revisadas según `CHECKLIST-FINALIZACION-2026-04.md` y trabajo en código (facturación i18n).*  
*Archivo:* `docs/CHECKLIST-BACKLOG-PRODUCTO-GROBO.md`
