# Checklist de seguimiento — URBE API-DRIVEN

Uso: ir **un ítem por conversación** (o por PR), marcar estado y anotar rama/commit cuando cierre.

**Leyenda:** `[ ]` pendiente · `[~]` en curso · `[x]` hecho

---

## Rendimiento y grillas

- [x] **1. Carga perezosa en filas y grillas** *(2026-04-30)*  
  - **Qué:** Al abrir listados, cargar **solo la primera grilla** (sin datos del modal). Al abrir el modal, cargar los datos de ese registro.  
  - **Paginación:** Cargar **de a una página por grilla** (no traer de más).  
  - **Criterio:** Reducir recargas; Network muestra peticiones acotadas al ver filas vs. al abrir modal.  
  - **Hecho:** Facturación por institución: tarjetas por institución (5 por página); saldos de billetera solo para el lote visible. **`institucion-report`:** paginación en API (`instPage`, `instPerPage`, máx. 50); respuesta acotada a las instituciones del lote + `meta.instPagination`; totales globales sin cambio; PDF/Excel global con `instPerPage: 0` (petición aparte). **Backend:** con paginación y sin filtro de una sola institución, `BillingModel::getInstitutionDerivedReport` delega en `getInstitutionDerivedReportPaginatedOptimized` (totales agregados + orden de instituciones + `IN (...)` solo para la página). Animales / Insumos / Reactivos: sin prefetch de páginas vecinas. Modales de facturación: detalle al abrir. **Facturación por departamento:** tarjetas de protocolo en cliente (8 por página); API `depto-report` con rango de fechas y EXISTS.

---

## Alojamientos y QR

- [x] **2. QR de alojamientos no funciona** *(cerrado — 2026-04-30)*  
  - **Criterio:** URL pública estable con `token`; resolución correcta ante API vacía o error, sin fallos de cliente ni mensajes engañosos.  
  - **Hecho:** Enlace explícito `paginas/qr-alojamiento.html?token=` (`buildQrAlojamientoPublicPageAbsoluteUrl` en `front/dist/js/api.js`); PDF/etiqueta con la misma URL absoluta; sin `ReferenceError` ante error/vacío y mensaje acorde al API (`qrManager.js`, `mostrarErrorCritico`); token `trim` + minúsculas en front y `getHistoryByToken` en `api/src/Models/Alojamiento/AlojamientoModel.php`; `generarCodigoQR` devuelve código existente sin abrir transacción de inserción innecesaria.

- [x] **3. QR alojamientos: login, retorno y edición de planilla** *(cerrado — 2026-04-30)*  
  - **Qué:** Sin sesión, acceso a login institucional; con sesión, continuar; tras login **volver al mismo QR**; titular puede **cambiar ubicación** de la planilla en trazabilidad sin acciones de staff.  
  - **Criterio:** `redirectAfterLogin` + carpeta de institución coherentes; permisos titular (rol 3, misma sede) vs staff en trazabilidad.  
  - **Hecho:** `irALogin` guarda `redirectAfterLogin` y usa slug `groboQrAlojInstSlug` / `QrNombreInstFolder` (`qrManager.js`); post-login en `front/dist/js/auth.js`; roles staff `QR_STAFF_ROLES` vs titular con `applyTitularQrUbicaciones` y `TrazabilidadUI.isReadOnly` / columna de edición de tramos solo si `qrStaff`.  
  - **Recomendación post-deploy (smoke, una vez por release):** en el entorno publicado comprobar: token → ficha; anónimo → Acceso personal → login → misma URL con token; usuario titular (rol 3) edita ubicación en trazabilidad sin ver finalizar/editar/borrar tramo reservados a staff.

- [x] **8. Tras crear alojamiento, actualizar la grilla** *(2026-04-30)*  
  - **Qué:** Al crear un alojamiento, la lista/grilla debe **refrescar** y mostrar el nuevo registro.  
  - **Criterio:** Sin F5 manual; el ítem aparece de inmediato o tras confirmación OK del API.  
  - **Hecho:** Ya se llamaba `loadAlojamientos()` tras éxito del registro; se añadió `loadAlojamientos({ resetPagination: true })` para **volver a la página 1** (si el usuario estaba en otra página, el nuevo registro no se veía sin F5). Configuración maestra: `await loadAlojamientos()` antes de reabrir el historial para no mezclar datos viejos con el modal.

---

## Reservas

- [x] **4. Reservas: seleccionar varias horas** *(2026-04-30)*  
  - **Criterio:** El usuario puede elegir más de un bloque horario en una misma operación según reglas de negocio definidas.  
  - **Regla aplicada:** varias **franjas atómicas consecutivas** en un mismo día se fusionan en **un** pedido (`Horacomienzo`/`Horafin`). Ya aplicaba en `misreservas.js`; se extendió **admin/reservas** y **qr_sala**. i18n hint en modal admin, página QR sala y texto en ES/EN/PT (`admin_reservas.*`, `qr_sala.*`). **Panel:** hint `misreservas.slots_multi_hint` alineado con usuario.

- [x] **5. Reservas en serie / recurrentes** *(2026-04-30)*  
  - **Qué:** Hoy no permite reservar en serie (o equivalente); corregir para que el flujo permita el patrón esperado (serie, repetición o multi-fecha según especificación).  
  - **Criterio:** Crear serie sin error; conflictos horarios bien manejados.  
  - **Hecho:** El flujo usuario (`misreservas.js` + `POST /user/reservas/series/create`) ya existía; se alineó **fecha “hasta”** con el **tope de servidor** (1 mes desde inicio): `min`/`max` en el input y `FechaFin` efectiva acotada. Mensajes parciales si **0 creadas** o **omitidas** (`serie_sin_ocurrencias`, `serie_resumen_partial` en es/en/pt). En **PHP** (`UserReservasSeriesModel` y `AdminReservasSeriesModel`): recurrencia semanal por **lunes calendario** en lugar de `format('W')` (evita errores al pasar de año); **normalización HH:MM** y `diffMinutes` con `DateTime::createFromFormat('H:i', …)`.

---

## Facturación y derivaciones

- [x] **6. Facturación “derivado”: cobrar al titular original del protocolo** *(2026-04-30)*  
  - **Qué:** Mostrar datos del **protocolo original** (no sustituir por el derivado como sujeto de cobro).  
  - **Mostrar igual:** institución que envió / derivó y quién derivó (como dato aclaratorio).  
  - **Facturación:** El cobro es a la persona **original** del protocolo.  
  - **Hecho:** `BillingModel` unifica titular para **liquidación** (`processPaymentInstitucionDerivada`), **PAGAR/QUITAR** modal (`procesarAjustePagoDerivada`) y merge en detalle modal animal/reactivo/insumo: `COALESCE(pe_o.IdUsrA, fo.IdUsrA, ffd.IdUsrSolicitante)` desde pedido/formulario origen (`idformAOrigen` si existe). Reporte institución derivada (`getInstitutionDerivedReport`): `idInvestigador` + nombre para **billetera** y columna pedido muestran titular protocolo cuando aplica; filas siguen exponiendo institución/origen/responsable destino vía SQL existente (`investigador_*`, badges en front sin cambios de contrato obligatorio).

- [x] **7. Facturación por departamento, protocolo e investigador** *(2026-04-30)*  
  - **Qué:** Debe aparecer **quién derivó** aunque **no** pertenezca a la misma institución del filtro/vista.  
  - **Hecho:** `BillingModel` añade por formulario (`derivado_por_id`, `derivado_por_nombre`, `derivado_desde_institucion`) vía subconsultas sobre `formulario_derivacion` activa + `personae`/`institucion` **sin** filtrar por la sede del informe. Aplica a `getPedidosProtocolo`, `getPedidosDeptoSinProtocolo`, `getInsumosGenerales`, `getInsumosByProtocolo`, `getInsumosByUser` (cubre depto, protocolo e investigador). Front: columna **Derivado por (origen)** en `billingDepto.js`, `investigador/billingInvestigador.js`, `protocolo/billingProtocolo.js`; Excel depto incluye columna `excel_quien_derivo` (es/en/pt: `th_quien_derivo`, `excel_quien_derivo`). Helper `billingDerivacionPlainText` en `billingLocale.js`.

- [x] **12. Menú: marcar “Contable” al entrar a cualquier sección de facturación** *(2026-04-30)*  
  - **Criterio:** Cualquier ítem de facturación activa/resalta el menú Contable como corresponda al patrón actual de navegación.  
  - **Hecho:** En `MenuRender.js`, el desplegable Contable (id 202) recibe `active-gecko-link` si coincide algún hijo (precios, facturación índice, historial contable) **o** la URL está bajo `admin/facturacion/` (subpantallas: depto, protocolo, investigador, org, institución, etc.). El hijo «Facturación» queda `active-sub-link` en esas subpantallas para alinear con el patrón de resaltado del resto del menú.

- [x] **13. Facturación y alojamiento: no usar “solo fecha” para alojamiento** *(2026-04-30)*  
  - **Qué:** Ajustar presentación/reglas para alojamiento (no limitar la información al solo campo fecha; aclarar con negocio si aplica período, ítems, etc.).  
  - **Hecho:** Helper `billingAlojPeriodoParaInforme` en `billingLocale.js` (texto `periodo` del API con tramos, fallback inicio–fin, sufijo de días). **PDF masivo depto** (`downloadGlobalPDF`): una columna de período completo en lugar de solo ingreso/salida agregados. **Excel depto:** concepto de fila alojamiento incluye período + días. **PDF ficha por protocolo (investigador):** concepto con período/días; **PDF integral** columna de “fecha” para aloj usa el mismo texto enriquecido. **Facturación por protocolo (pantalla + PDF):** tabla HTML con columna **Días**; PDF de ficha usa `billingAlojPeriodoParaInforme`. Claves i18n `billing_depto_export.pdf_th_periodo_aloj_informe`, `pdf_aloj_dias_unit`, `excel_aloj_dias_unit` (es/en/pt).

---

## Saldos, pagos e historial

- [x] **9. Historial de saldo del investigador** *(2026-04-30)*  
  - **Qué:** Al ajustar saldo con **comentario** (y movimientos de débito/crédito), debe **registrarse** y **verse** el motivo; hoy no suma/resta ni deja trazabilidad correcta.  
  - **Hecho:** Validación en `updateBalance` (usuario y monto). **Compat:** `POST /billing/ajustar-saldo` implementado (`ajustarSaldo`) con comentario/transferencia y mismo modelo que `/billing/balance`. **Legacy persona** (`billingInvestigador.js`): mismo Swal + `POST /billing/balance` con trazabilidad. **Historial contable:** columnas y filtros transferencia/comentario, escape en celdas, export CSV (botón Excel), `getFinancialAudit` devuelve siempre claves `IdentificadorTransferencia` / `Comentario`. i18n es/en/pt (`admin_historialcontable.*`, `facturacion.error_balance`). Errores de saldo visibles en `billingPayments.js`.

- [x] **10. Pagos de formularios: descuento e historial** *(2026-04-30)*  
  - **Qué:** Al pagar formularios debe **descontarse** saldo/importe correspondiente y **guardarse en historial** visible **por investigador**.  
  - **Criterio:** Consistencia entre saldo, movimientos y lo mostrado en UI.  
  - **Hecho:** `processPaymentTransaction`: bloqueo `SELECT … FOR UPDATE` en `dinero`, comprobación de fila de billetera, saldo suficiente, `UPDATE … SaldoDinero >= ?` con verificación de filas afectadas, coherencia **suma ítems vs. monto** total, rollback seguro si falla (evita historial/saldo desalineados si no había billetera o saldo). `procesarAjustePago` (PAGAR formulario): mismo patrón de débito con saldo mínimo, formulario inexistente → error claro, `QUITAR` mantiene abono + creación de billetera si hace falta; errores propagados al API (mensaje en modal). `ejecutarPagoFinal` en `billingPayments.js`: `finally hideLoader` y Swal en error. El historial del usuario (`/user/my-payments-history` + `getMyPaymentsHistory`) ya listaba `LIQUIDACION` / `PAGO_INDIVIDUAL` distinto de `CARGA_SALDO`.

---

## Infra / rendimiento servidor

- [x] **11. Estadísticas: error 504 (Gateway Timeout)** *(2026-04-30)*  
  - **Contexto observado:** `groboapp.com` / Cloudflare — timeout al cargar estadísticas.  
  - **Qué:** Revisar consultas pesadas, timeouts del origen, workers, límites de PHP/Node/proxy según stack; objetivo respuesta estable o paginación/proceso async.  
  - **Hecho (aplicación):** `StatisticsController`: validación de fechas `AAAA-MM-DD`, tope de **400 días** entre desde/hasta (400 en front `GeckoStats.js` alineado), `max_execution_time` / `set_time_limit(180)` en `/stats/dashboard` y `/stats/dashboard-red`. `StatisticsModel::getGeneralStatsRed`: una consulta batched para nombres de institución (`getInstitutionNamesBatch`); `getAlojamientoTrazabilidadStatsRed` reescrito con **5 consultas agregadas** en lugar de N×5 por sede. `API.request` acepta opciones de `fetch` (p. ej. `signal`); `GeckoStats.js`: `AbortController` 120 s, mensajes i18n `admin_estadisticas.err_*`.  
  - **Infra (referencia operativa):** ajustes de proxy en `docs/nginx-app-groboapp-production.md` (`proxy_read_timeout` / `fastcgi_read_timeout`, rewrites). Si tras deploy aún hubiera 504 con rangos cortos: revisar límite de **Cloudflare** (origen) e índices en `formularioe` (`fechainicioA`, `estado`, `IdInstitucion`) o proceso async — fuera del alcance mínimo de este checklist.

---

## Cómo continuar en el próximo chat

Este seguimiento quedó **sin ítems abiertos** (`[~]` / `[ ]`). Para nuevas tareas, abrir entradas nuevas abajo o en otro documento de seguimiento.

---

*Checklist de seguimiento — última pasada de cierre 2026-04-30.*
