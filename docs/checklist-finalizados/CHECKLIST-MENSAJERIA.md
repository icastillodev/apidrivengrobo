# Checklist – Mensajería institucional (solo mensajes)

Ámbito: **conversaciones 1:1** dentro de la institución (`mensaje_hilo`, `mensaje`, `mensaje_leido`).  
**No incluye** noticias ni admin de noticias (ver módulo aparte / `READMEBD.md`).

Leyenda: `[x]` hecho en código · `[ ]` pendiente de ejecutar en entorno o de decidir

---

## Base de datos

- [ ] Ejecutar migración `docs/migrations/20260401_mensajeria_noticias.sql` (tablas `mensaje_hilo`, `mensaje`, `mensaje_leido` + `noticia*` si se aplica el script completo).
- [ ] Verificar índices y FKs en entorno de prueba / producción (backup previo recomendado en el propio SQL).

---

## API (`api/`)

- [x] Rutas registradas en `routes.php`:
  - `GET /comunicacion/mensajes/hilos`
  - `GET /comunicacion/mensajes/no-leidos`
  - `GET /comunicacion/mensajes/hilo/:id`
  - `POST /comunicacion/mensajes/hilo/:id/leer`
  - `POST /comunicacion/mensajes/enviar`
- [x] Controlador: `MensajeriaController.php`
- [x] Modelo: `MensajeriaModel.php`
- [x] Contador menú: `NotificationController::getMenuNotifications` → `data.mensajes` (si existen tablas).

---

## Front (`front/`)

- [x] Página **usuario**: `paginas/usuario/mensajes.html` + `dist/js/pages/usuario/mensajes.js`
- [x] Página **panel** (misma lógica, ruta estable): `paginas/panel/mensajes.html`
- [x] Menú ítem **204** → `panel/mensajes` (`MenuTemplates.js`)
- [x] Título pestaña / ruta: `i18n.js` → `usuario/mensajes` y `panel/mensajes` → clave `mensajes`
- [x] i18n: textos bajo `comunicacion.*` en `es.js` / `en.js` / `pt.js`
- [x] Refresco al volver a la pestaña (`visibilitychange`) en `mensajes.js` (lista + hilo abierto + badge)

---

## Pruebas manuales recomendadas

- [ ] Dos usuarios misma institución: crear hilo nuevo, enviar mensajes, marcar leído, contador badge en menú baja.
- [ ] Cambiar de pestaña y volver: lista y hilo se actualizan sin parpadeo brusco.
- [ ] Rol permitido por `Auth` en la página (niveles según `mensajes.html`).
- [ ] Con tablas **no** creadas: la app no debe romper menú (comprobación `tableExists` en notificaciones).

---

## Mejoras futuras (no implementadas en v1)

- Mensajes **solo texto**: no hay ni habrá adjuntos en hilos institucionales.
- [ ] Notificación por correo al recibir mensaje (si se define política).
- [ ] Búsqueda / filtro de hilos por asunto o contraparte.

---

*Última revisión alineada con el código del repositorio. Actualizar casillas `[ ]` cuando el entorno BD y las pruebas estén cerradas.*
