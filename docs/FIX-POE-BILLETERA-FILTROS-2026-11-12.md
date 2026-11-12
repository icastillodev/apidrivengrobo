# GROBO — Correcciones POE, billetera por protocolo y filtros de Facturación

**Fecha:** 12/11/2026. Cambios puntuales sin rediseñar la interfaz.

## Incidencias reportadas

1. QR de POEs que no abre el documento exacto, especialmente al escanear desde otro celular/sin sesión.
2. En Facturación por protocolo, carga de saldo visible en Historial pero billetera del titular en cero en la pantalla. En las imágenes se ve una carga `+$27.880,00` y dos pedidos con importes pendientes. El historial de saldo del protocolo filtra **pagos** por el protocolo, mientras que los movimientos de carga de saldo se muestran por usuario/institución: no representa que el dinero esté asignado al protocolo. No se deben sumar o trasladar movimientos manualmente sin conciliación.
3. Filtro `Solo pendientes de pago` y búsqueda dentro de resultados en las seis vistas del hub.

## Soluciones

### Billetera de titular

- `BillingModel::getProtocolHeaderInfo()` ahora recibe obligatoriamente la institución cobradora del JWT y une `dinero` por `IdUsrA` del titular y **esa institución**.
- `BillingController::getProtocolReport()` pasa `$instId` de la sesión en lugar de consultar la billetera de la sede propietaria del protocolo.
- El saldo de la cabecera y el que se utiliza para liquidar quedan alineados dentro de la sede cobradora. **No se insertan movimientos, no se modifica el saldo real, no se pagan ítems automáticamente**.
- Si el saldo sigue siendo cero en un caso particular: revisar desde una sesión admin autorizada las filas `dinero(IdUsrA, IdInstitucion)`, movimientos `historialpago`, saldo actual y pagos realizados en esa institución (solo lectura). La captura por sí sola no prueba saldo disponible positivo; pudo haberse consumido por otros pedidos.

### QR de los POE

- QR nuevos: `/paginas/panel/poe.html?id=<IdPoe>&inst=<slug>`.
- Se conserva la identidad de la sede y del POE al pasar por login y volver al documento.
- QR heredados con `?id` sin sede: selector URBE/CUPAE en lugar de redirigir siempre a URBE.
- El documento no es público anónimo; sigue protegido por sesión y ámbito institucional.
- Se actualizaron versiones de caché de módulos QR y sus importadores relevantes.

### Filtros facturación

- Nuevo componente modular `billingQuickFilters.js` cargado en Centro, Departamento, Organización, Investigador, Protocolo e Institución.
- `Solo pendientes de pago` + campo `Buscar en los resultados` con textos ES/EN/PT y adaptación Bootstrap responsive.
- Aplica a filas ya cargadas, no crea un nuevo endpoint ni consulta automáticamente todas las cuentas. Los totales globales siguen mostrando el total de la consulta; la barra indica el número de filas visibles.
- Para proteger el proceso de cobro, al ocultar una fila desmarca y deshabilita sus casillas seleccionadas; las restituye al volver a mostrarla. Filas cuyo estado de pago no puede determinarse inequívocamente se mantienen visibles para no ocultar una deuda.
- Si se requiere filtrado global del selector **antes de cargar un informe**, hará falta una segunda etapa de indexación de pendientes en el backend, siempre con controles institucionales.

## Pruebas ejecutadas

- `tests/qa_billing_protocol_wallet.php`: **4/4** casos con datos falsos y sedes distintas.
- `tests/qa_grobo_qr_billing_20261112.mjs`: **4/4** casos con Chrome local: QR CUPAE sin sesión, QR antiguo, enlace QR nuevo, búsqueda/pendientes y seguridad de selecciones.
- `tests/run_grobo_qa.sh`: **96/96** fixtures PHP preexistentes sin regresiones.
- `tools/audit-grobo-functional-mocks.mjs`: **12/12** casos UI antiguos sin regresiones.
- `tools/audit-grobo-js-modules.mjs` y `tools/audit-grobo-structure.mjs`: sin errores de sintaxis, imports o estructura HTML.

## Pendiente de comprobar con cuenta de ensayo

- Abrir POE existente con QR desde un teléfono real, ingresar desde URBE/CUPAE y confirmar que abre su modal de detalle, descarga los adjuntos y respeta permisos.
- Acreditar un saldo ficticio en entorno de pruebas y liquidar un pedido ficticio del protocolo derivado; verificar persistencia de `dinero`, `historialpago` y facturas, sin tocar dinero real.
- Revisar los filtros sobre datos grandes y tablas de cada categoría en móvil/tablet y lector de pantalla.
