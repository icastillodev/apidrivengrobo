# Checklist QA — POE / Popup / Reservas (2026-07-12)

Validación post-fix local. Marcar en staging/prod tras desplegar + migración SQL.

**Ejecutado local:** 2026-07-12 (Docker `localhost:8080`).  
**Fix hallado en QA:** `UserReservasSeriesController` / `AdminReservasSeriesController` sin `$db` → 500 en series; corregido con `private $db` en constructor.

## A. Migración BD (obligatoria en servidores)

- [x] Ejecutar `docs/migrations/2026-07-12-dashboard-popup-imagen-b2.sql` (añade `PopupPortadaImagenB2Key` / `PopupPortadaImagenNombre`) — **local OK**
- [x] Verificar: `SHOW COLUMNS FROM institucion_dashboard_popup LIKE 'PopupPortada%';` — **ambas columnas presentes**
- [ ] **Pendiente staging/prod:** correr la misma migración en servidor

## B. POEs (usuario)

- [x] Admin comunicación → POE: hay al menos uno con estado **Visible** (`Activo=1`) en la sede del usuario — cupae IdPoe=2 “Eutanasia”
- [x] Usuario investigador (rol 3) misma sede → menú **POEs** visible
- [x] `panel/poe.html`: lista cards (no vacío silencioso) — “Eutanasia” + `window.__GROBO_ASSET_VERSION__=20260712`
- [x] Dashboard: bloque POE con título “Eutanasia”
- [x] Click POE en dashboard → modal local `#grobo-modal-poe-dashboard` (no navega) — adjunto PDF + botones QR
- [ ] Detalle: adjuntos B2 abren con JWT; QR funciona — **parcial:** UI/botones OK; click descarga/QR no ejercitado end-to-end
- [ ] Si `Activo=0` en admin: usuario **no** lo ve (esperado) — no forzado en esta pasada

Datos locales verificados: cupae (12) tiene POE “Eutanasia” Activo=1; urbe (1) no tiene POEs.

## C. Popups (admin + display)

- [x] Admin → Popups del panel: listado carga — “Test local QA / Aviso de prueba GROBO / Sí”
- [x] Nuevo popup: título + cuerpo → Guardar OK (HTTP 200, IdDashboardPopup=2; luego eliminado)
- [ ] Editar: **vista previa** de imagen guardada muestra miniatura en el modal — sin imagen B2 en seed
- [ ] Botón “Vista previa” abre pestaña con blob autenticado — no ejercitado (sin imagen)
- [x] Solo un popup activo por sede — listado muestra 1 activo; API set-activo documentada
- [x] Usuario abre dashboard → modal con título/cuerpo (“Aviso de prueba GROBO”)
- [ ] Imagen del popup se ve (fetch con Bearer) — seed sin imagen
- [ ] Adjuntos B2 del popup abren con botón autenticado — seed sin adjuntos
- [x] Si fallan noticias del dashboard, el popup **igual** se muestra — UI: “No hay noticias” + modal popup visible

Local: popup de prueba activo en cupae (Id=1, “Aviso de prueba GROBO”).

## D. Reservas — visibilidad del módulo

Semántica `modulosactivosinst`: `Habilitado=2` ⇒ módulo **apagado** (estado_logico=1).

Datos locales:

| Sede | Habilitado | ActivoInvestigador | estado_logico | Esperado UI |
|------|------------|--------------------|---------------|-------------|
| cupae (12) | **2** | 2 | **1 off** | **No** menú Reservas, ni card config, ni formSelector |
| urbe (1) | 1 | 2 | **2 solo admin** | Admin ve; investigador no |

### Checklist funcionalidades reserva

- [x] Menú admin id 6 oculto si módulo off — cupae admin: sin ítem Reservas
- [x] Menú usuario id 14 / misreservas oculto si off o solo-admin — cupae investigador: sin Reservas
- [x] Hub config: card “Reservas y Espacios” oculto si off — cupae admin config
- [x] Centro solicitudes: tarjeta Reservas ausente en cupae (animales/reactivos/insumos sí)
- [x] Hotkeys Alt+R no navegan si módulo off
- [x] API `/admin/reservas/*` y `/user/reservas/*` → 403 si off (cupae)
- [x] Series: `/user/reservas/series/create` y admin series → **403** tras fix `$db`
- [ ] Con módulo **Admin y Usuarios** (3): crear reserva única, listar mine, cancelar — no hay sede local en estado 3 para smoke
- [x] Con **Solo Admin** (2): urbe admin `/admin/reservas/salas` → **200**; investigador `/user/reservas/mine` → **403**
- [ ] Aprobación pendiente (si `ReservasRequierenAprobacion`) — no ejercitado
- [ ] Config salas / instrumentos / QR sala e institución — no ejercitado
- [ ] QR público sin login sigue; create autenticado respeta módulo — no ejercitado

## E. Cache front

- [x] `?v=20260712` en dashboards, popup admin, poe, etc. (HTML servido)
- [x] Consola: `window.__GROBO_ASSET_VERSION__` → `20260712` (página POE)

## F. Regresión rápida

- [x] Login admin (2FA) + investigador cupae
- [x] Noticias dashboard (empty state OK)
- [x] Popup portada/activo vía `/comunicacion/portada-popup`
- [x] Menú sin ítems fantasma de módulos apagados (Reservas)

---

## Notas de entorno QA

- Bloqueo inicial: `grobo_db` sin red Docker por conflicto puerto **3306** con `mvc_mysql_db`. Solución: stop `mvc_mysql_db` + `docker compose up -d --force-recreate db`.
- Credenciales locales usadas (solo local): `cupaeadm` / `sarafabius` / `urbe` / `usuario` → `TestQa2026!` (passwords tocadas en BD local para la prueba).
- Revisión código paralela: [QA revisión checklist](37a27cbb-547e-42d7-998f-b33499cf821d) (Opus) — confianza 8/10; confirma fix series.
