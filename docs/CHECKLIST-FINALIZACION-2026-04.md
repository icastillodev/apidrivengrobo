# Checklist – Finalización (abril 2026)

Lista de trabajo para cerrar bugs y mejoras acordadas. Leyenda: `[ ]` pendiente · `[x]` hecho / verificado en entorno.

---

## Animales / fichas

- [x] **PDF ficha animal** — Generación vía `html2pdf` usando nodo DOM temporal + mensajes si falla la librería o la exportación (`animales.js`, i18n `generales.err_pdf_*`).

---

## Alojamientos

- [x] **Página de alojamientos** — `alojamientos.js`: `instId` desde **localStorage o sessionStorage** (antes solo localStorage); refresco en cada carga; aviso traducido si el API devuelve error (`err_carga_lista` ES/EN/PT). Cache bust `?v=rev5` en `alojamientos.html`.

---

## Reservas (horarios)

- [x] **Selección múltiple de franjas** — Varias franjas **consecutivas** en `misreservas.js`; se envía un solo rango `Horacomienzo`–`Horafin` al API.
- [x] **Reserva no funciona (parcial)** — API: normalización **HH:MM** y comparación por minutos (evita rechazos por formato de hora); solapamiento con `TIME()`. Probar en entorno real; si sigue fallando, revisar permisos/módulo o datos de sala.

---

## Red / estadísticas

- [x] **Estadísticas de red** — **API** `StatisticsModel::getGeneralStatsRed`: corregidos los **placeholders** del bloque de globales (5n+6 parámetros; antes sobraban ids y fallaba el SQL). **Red:** `getInstitutionIdsInNetwork` usa campo `red` y, si vacío, **DependenciaInstitucion** (misma lógica que mensajería). **Front** `GeckoStats.js`: `madre_grupo` / `instituciones_en_red` con `Number(...)`. Verificar en staging con sede madre y ≥2 sedes en la misma red o dependencia.

---

## Facturación (institucional)

- [x] **Dos investigadores en vista** — API `BillingModel::getInstitutionDerivedReport`: `investigadorInicial` (`formulario_derivacion.IdUsrOrigen`, fallback `IdUsrSolicitante`) + `investigadorInstitucion` (`IdUsrDestinoResponsable`). Vista/PDF/Excel en `billingInstitucion.js`.

---

## Protocolos (local)

- [x] **Solicitudes de protocolos en local** — `solicitud_protocolo.html`: `Auth.checkAccess([1, 2, 4, 5, 6])` (antes `[1, 2]` impedía roles admin frecuentes).

---

## Dashboard y noticias

- [x] **Noticias en dashboard** — `dashboardNoticias.js`: hasta **3** noticias locales por petición (`pageSize=3`).
- [x] **Crear noticia – solo 3 estados** — Modal admin: **Borrador**, **Publicar ahora**, **Programar** + i18n y ayuda de fecha acotada a «Programar».

---

## Login / acceso directo (PWA o shortcut)

- [x] **Indicador “crear acceso directo”** — Modal «Opciones de acceso» en `index.html`: bloque titulado **Crear acceso directo a la aplicación**, textos por dispositivo (escritorio / iOS / Android) en **i18n** (`login.*`).
- [x] **Icono del acceso directo** — `manifest.json` con icono SVG de la app; `index.html`: `<link rel="manifest">`, `apple-touch-icon` → favicon GROBO; instrucciones indican icono en inicio cuando el SO lo permite.

---

## Mensajería (reglas y correo)

- [x] **Envío desde popup** — API valida que, con `OrigenTipo` **formulario** o **notificacion** y `OrigenId`, el **destinatario** sea el titular del formulario en la sede (`getTitularFormularioInstitucion`); evita desajustes con otro usuario.
- [x] **Institución → investigadores propios** — Personal: en mensaje institucional tipo **consulta**, selector opcional de investigador (`IdInvestigadorDestino`); hilo institucional con ambos participantes y visibilidad ajustada.
- [x] **Investigador → destinos permitidos** — Sin cambios necesarios: `getDestinatarios` + `enviar` ya restringen rol 3 a institución / red (`MensajeriaController`).
- [x] **Institución → otras instituciones de red** — Flujo existente con `inst-` / `IdInstitucionDestino` en mensajes personales hacia sede remota; se mantiene.
- [x] **Correo siempre al recibir** — Primer mensaje en hilo institucional y **respuestas** en hilos institucionales disparan correo según tipo (comunicado → investigadores; consulta con 2 participantes → la otra parte; consulta abierta → personal / autor) vía `notificarCorreoVariosUsuarios` + plantilla existente del `MailService`.

---

## Pruebas de cierre sugeridas

- [ ] Recorrer cada ítem arriba en **staging** y, si aplica, **producción** (smoke manual: reservas, alojamientos, estadísticas sede/red, mensajes, login/shortcut, noticias, facturación institucional, PDF ficha animal).

### i18n (ES / EN / PT) — revisión en código (repo)

- [x] **Claves alineadas** para los módulos tocados en esta oleada: `comunicacion.*` (mensajería institucional + destinatario investigador), `login.*` (acceso directo / PWA modal), `alojamientos.err_carga_lista`, `generales.err_pdf_*`, `misreservas.*` (reservas usuario), `misalojamientos.*` (PDF/contacto/Excel/contador + `instId` local/session), `admin_estadisticas.*` (red), facturación institucional si aplica. Los textos visibles nuevos van con `data-i18n` o `window.txt` y entrada en **los tres** `front/dist/js/utils/i18n/{es,en,pt}.js`.

- [ ] **Paso final en entorno** — Cambiar idioma en la app (ES → EN → PT) en **staging** y comprobar pantallas críticas por si queda algún literal suelto o caché antigua (`?v=` en imports de páginas).

---

*Documento vivo: marcar casillas al cerrar cada punto. Referencia mensajería histórica: `docs/checklist-finalizados/CHECKLIST-MENSAJERIA.md`.*
