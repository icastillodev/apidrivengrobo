# Checklist — Seguridad, autorización y auditoría (GROBO / URBE)

**Estado:** estándar vivo del proyecto — marcar `[x]` cuando el ítem quede verificado (código + revisión o staging).  
**Relación:** complementa `CHECKLIST-OPTIMIZACION-TABLAS-CARGAS.md` (rendimiento/UX); las reglas operativas para el día a día están en **`.cursor/rules/urbe-seguridad-auditoria.mdc`**.

**Implementación de referencia (backend):**

- `api/src/Utils/Auditoria.php` — JWT (`getDatosSesion`), bitácora (`log`, `logManual`).
- `api/src/Controllers/AuthController.php` — login, 2FA, rate limit por IP en intentos fallidos, `Auditoria::logManual` en login exitoso.
- Tabla **`bitacora`** — columnas usadas en `Auditoria::logManual`: `id_usuario`, `accion`, `tabla_afectada`, `detalle`, `fecha_hora`.

---

## 1. Autenticación y tokens

- [ ] **`JWT_SECRET`** definido en `.env` en **todos** los entornos desplegados; **nunca** confiar en el fallback del código (`Auditoria` / `AuthController` hoy usan `$_ENV['JWT_SECRET'] ?? '…'` — riesgo si falta env).
- [ ] Tiempo de vida del JWT (`exp`) acorde a política (hoy ~7 días en `generateJWT`); documentar si se acorta en entornos sensibles.
- [ ] Header **`Authorization: Bearer <jwt>`** como vía principal; entender límites de `apache_request_headers` vs `HTTP_AUTHORIZATION` (Nginx) ya contemplados en `Auditoria::getDatosSesion`.
- [ ] Rutas **públicas** (login, registro, endpoints QR/export públicos acordados) **no** llaman `getDatosSesion` sin manejar excepción; el resto debe exigir token válido.
- [ ] **2FA** donde aplique: flujos `2fa_required` y `verify2FA` no emiten token final hasta validar código.

---

## 2. Autorización (multi-sede y roles)

- [ ] Tras `getDatosSesion`, **cada** operación que lea o mut datos de institución filtra por **`instId`** de la sesión (o reglas explícitas para superadmin `instId = 0`).
- [ ] **No** confiar en `instId` / `userId` enviados solo en el body o query para autorizar: validar coherencia con el JWT salvo flujos documentados (p. ej. superadmin con contexto de sede).
- [ ] Comprobar **rol** (`role` / `userLevel` en payload) antes de rutas admin, superadmin o facturación.
- [ ] IDs en URL (`:id`, `?id=`) resueltos siempre con comprobación de pertenencia a la institución / permiso del usuario.

---

## 3. Bitácora (auditoría) — obligatoria en mutaciones sensibles

- [ ] **Login / logout / 2FA exitoso:** usar `Auditoria::logManual` como ya hace `AuthController` (no hay JWT previo en login).
- [ ] **Mutaciones con JWT:** tras operación exitosa, registrar con `Auditoria::log($db, $accion, $tabla_afectada, $detalle)` o `logManual` si el contexto lo requiere.
- [ ] **Convención de `accion`:** coherente (`INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `LOGIN_2FA`, acciones de dominio como `CLONADO`, etc.).
- [ ] **`detalle`:** suficiente para soporte forense (qué entidad, IDs relevantes); **evitar** datos personales innecesarios o secretos en claro.
- [ ] **Fallos de bitácora:** hoy se registran en `error_log` sin tumbar la petición — valorar alertas si la tabla `bitacora` falla en producción.
- [ ] **Superadmin:** auditoría con `userId` real aunque `instId` sea 0 (comportamiento actual de `Auditoria::log`).

---

## 4. Inyección SQL y acceso a datos

- [ ] **Consultas parametrizadas** (`PDO::prepare` + `execute`); no concatenar entrada de usuario en SQL.
- [ ] **ORDER BY dinámico:** lista blanca de columnas (patrón `UserModel` con `$allowedSort`), no sort raw desde `$_GET`.

---

## 5. Salida, XSS y API JSON

- [ ] Respuestas JSON **sin** mezclar warnings/HTML por **`display_errors`** en producción (revisar `api/index.php`: hoy fuerza reporte alto — adecuar entorno prod).
- [ ] **Front:** datos dinámicos en DOM con escape (`textContent`, helpers existentes); evitar `innerHTML` con strings del API sin sanitizar.
- [ ] **404 router:** respuesta incluye `debug_uri` / `debug_base` — conveniente en dev; **suprimir o acotar en producción** para no filtrar estructura interna.

---

## 6. CORS y transporte

- [ ] **`Access-Control-Allow-Origin: *`** en `api/index.php` — revisar si en producción debe restringirse a orígenes del front y credenciales.
- [ ] **HTTPS** obligatorio en producción; cookies sensibles con flags `Secure`/`HttpOnly` si se usan además del JWT en header.

---

## 7. Brute force y abuso

- [ ] Rate limiting / bloqueo por IP en login (`AuthModel::isIpBlocked` / `recordFailedLogin`) activo y umbrales revisados.
- [ ] Endpoints pesados o de enumeración (`/search/global`, listados sin paginación) con **límites** en servidor donde aplique (ver checklist de optimización §2).

---

## 8. Secretos, archivos y subidas

- [ ] **`.env`** fuera de control de versiones; rotación de `JWT_SECRET` si compromiso.
- [ ] Subidas (adjuntos, imágenes): validar tipo/tamaño, almacenamiento fuera de webroot o con nombres no adivinables; URLs firmadas si aplica (Backblaze u otro — ver `BACKLOG-BASE-DATOS.md`).

---

## 9. Dependencias y cabeceras

- [ ] **`composer audit`** / actualizaciones periódicas de dependencias PHP.
- [ ] Valorar cabeceras de seguridad en el edge (NGINX/Cloudflare): `X-Content-Type-Options`, restricción `frame-ancestors`, CSP según despliegue del front.

---

## 10. Criterio de “hecho” por feature nueva

| Criterio | OK |
|----------|:--:|
| Token y rol comprobados | [ ] |
| Aislamiento por institución where aplique | [ ] |
| Bitácora en mutaciones / eventos de seguridad relevantes | [ ] |
| Sin secretos ni stack traces en respuestas cliente en prod | [ ] |
| Entradas validadas y consultas parametrizadas | [ ] |
| UI/i18n sin filtrar datos sensibles en mensajes de error genéricos | [ ] |

---

*Última revisión: estándar inicial documentado + regla Cursor `urbe-seguridad-auditoria.mdc` (2026-05).*
