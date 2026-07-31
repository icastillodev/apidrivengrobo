# Checklist — pedidos Gabriel / Mariela / Martín (2026-07-26)

Estado de implementación en código + SQL pendiente de servidor.

## SQL (vos en phpMyAdmin / prod)

- [ ] Ejecutar [`docs/migrations/2026-07-26-comprobante-pdf-historialpago-y-rol-contador.sql`](migrations/2026-07-26-comprobante-pdf-historialpago-y-rol-contador.sql)
- [ ] Guía: [`docs/SQL-PARA-EJECUTAR-2026-07-26.md`](SQL-PARA-EJECUTAR-2026-07-26.md)
- [ ] Configurar `.env` API: `B2_KEY_ID_FACTURACION`, `B2_APPLICATION_KEY_FACTURACION`, `B2_BUCKET_ID_FACTURACION`, `B2_BUCKET_NAME_FACTURACION`
- [ ] Asignar usuario(s) a rol 7 (`tienetipor`) donde corresponda

## Gabriel — Contable

- [x] Comprobante PDF opcional al subir saldo (máx. 150 KB) + adjuntar luego desde historial
- [x] Pagar selección: muestra **saldo actual** + total a pagar + saldo después
- [x] Especie/cepa null → vacío (no literal `null`)
- [x] Fechas In/Out en español: Entrada/Salida (`es.js`)
- [x] Historial: modal ~80%, agrupación en acordeón si varios ítems mismo lote
- [ ] QA staging: B2 FACTURACION + PDF real

## Gabriel — POEs

- [x] Imprimir QR: quitado `noopener` que anulaba la ventana + abrir `about:blank` en gesto Swal

## Mariela — Mensajes

- [x] Toast de éxito al contestar (antes solo avisaba si fallaba el correo)
- [ ] QA: hilo 1:1 / institucional con roles staff (si sigue sin poder contestar, revisar participación en hilo)

## Martín — Prod / dios / Contador

- [x] Dashboard admin (dios/rol 1): cards usan `getCorrectPath` (como el menú)
- [x] Rol Contador (7): tipousuarioe + menú 202; API bloquea escrituras de billing; front checkAccess + guard
- [ ] **502 cupaeadm en producción:** no es código de app típico — revisar PHP-FPM / nginx socket / Cloudflare (ver nota en SQL-PARA-EJECUTAR). Pedir logs del host al momento del error.
