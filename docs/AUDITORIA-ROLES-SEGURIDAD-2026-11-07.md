# GROBO — Auditoría de permisos y flujos de URBE/CUPAE
**Corte:** 7 de noviembre de 2026

## Alcance verificado

- Producción: solo GET sin cookies ni tokens, sin datos modificados. 17 endpoints.
- Código local: PHP 8.3 en contenedor aislado, sin red ni conexión a MySQL. **96 pruebas con fixtures**, todas aprobaron.
- NO se utilizaron cuentas reales ni se probaron pagos, rechazos, borrados o reservas reales.
- El front publicado el 7/11 y Brevo no se modificaron en esta ronda.

## Hallazgos y correcciones en la rama (todavía NO desplegadas)

| Severidad | Área | Hallazgo | Mitigación | Prueba |
|---|---|---|---|---|
| Alta | Solicitudes propias | `update-internal` podía editar cualquier `idprotA` con sesión válida | Valida IdUsrA + IdInstitucion bajo bloqueo de fila antes de DML | Fixtures de usuarios e instituciones |
| Alta | Administración reservas | Consultas y cambios de salas/instrumentos usaban IDs sin cotejar institución | Restricción por IdInstitucion y validación de rol administrativo | 23 + 8 casos |
| Alta | Protocolos admin | `/protocols/save` no validaba el rol antes de crear/editar | Roles 1/2/4, institución del JWT salvo superadmin, UPDATE con IdInstitucion | 7 casos |
| Alta | Protocolos en red | Configuración de red editable solo por relación `protinstr`, incluso antes de aprobación | Requiere solicitud TipoPedido=2, Aprobado=1 y destinatario exacto | 3 casos |
| Alta | Especies protocolo | GET de especies solo comprobaba JWT, no vínculo con usuario/sede/red | Lectura propia/local o red explícitamente aprobada | 9 casos |
| Media | Selector red | `GET /user/protocols/config?inst=` ignoraba el parámetro usado por el frontend | Permite sede vinculada/activa; bloquea sede ajena; superadmin explícito | 6 casos |
| Media | HTTP | Ausencia de token podía resultar en 500, errores internos visibles y HTML/JSON confuso | AuthenticationException, ApiExceptionHandler (401/403/400/500), display_errors desactivado | 7 + 18 casos |
| Crítica, pendiente de preflight | JWT | Código antiguo tenía un secreto de respaldo conocido. No sabemos aún la fortaleza de producción. | JwtSigningKey elimina fallback y exige mínimo 32 caracteres; no desplegar hasta validar `.env` y planificar rotación si procede | 7 casos |

**Riesgo de compatibilidad:** el `JWT_SECRET` del entorno local de desarrollo tiene longitud inferior a 32 caracteres. Este cambio impedirá iniciar sesión en local hasta que el valor se reemplace de forma privada. NO publicar el código de JwtSigningKey en producción sin comprobar primero la fortaleza de su secreto. Una rotación en producción invalidará sesiones activas.

## Respuestas sin autenticación: 17 GET contra producción

- 14 rutas privadas investigadas, 3 públicas con tokens inválidos o ID inexistente.
- Privadas: **3** con HTTP de rechazo correcto, **7** con JSON de error pero estado HTTP heredado (200/404), **2** con HTTP 500 aunque no devolvieron `status=success`, **2** con respuesta no JSON e HTTP 200: **sin verificación concluyente**.
- Cero respuestas JSON privadas con estado de éxito.
- Este test confirma únicamente falta de filtración evidente en la muestra, NO garantiza aislamiento entre usuarios autenticados. No clasificar rutas no JSON como fuga sin evidencia.
- El controlador de protocolos y el manejador global nuevos corrigen parte de las respuestas HTTP. Algunas rutas contables conservan manejadores heredados; revisar por fases.

## Pruebas automatizadas (96 aprobadas)

`docker run --rm --network none -v "<repo>:/code:ro" php:8.3-cli sh /code/tests/run_grobo_qa.sh`

Resumen:
- 23 aislamiento institucional en modelos y edición.
- 7 respuestas API y autenticación.
- 8 facturación de solo lectura y alcance institucional.
- 7 firma JWT y validación de clave.
- 9 acceso a especies.
- 3 aprobación de protocolo de red.
- 18 rutas de protocolos por rol.
- 7 ruta administrativa de guardar protocolos.
- 6 configuración de red desde investigador.
- 8 permisos de roles para reservas.

Las pruebas son fixtures y no sustituyen pruebas HTTP autenticadas con cuentas controladas.

## Puerta obligatoria previa al despliegue

1. Ejecutar lectura segura **sin imprimir secretos**: `sudo php /home/geckosadm/grobo-ops/grobo-check-jwt-secret.php`.
2. Si devuelve `JWT_SECRET_PREFLIGHT_OK`, se puede programar despliegue del backend con respaldo y QA.
3. Si devuelve `JWT_SECRET_TOO_SHORT`, `JWT_SECRET_MISSING_OR_DUPLICATED` o `JWT_SECRET_IS_UNSAFE_LEGACY_DEFAULT`, detener la instalación de JwtSigningKey; diseñar rotación privada con aviso de expiración de sesiones y respaldos. Nunca copiar claves al chat ni Git.
4. Validar `php-fpm8.3 -t`, `nginx -t`, hash de archivos y GET de URBE/CUPAE antes de probar login.
5. En staging con cuentas de prueba: admin URBE, admin CUPAE, investigador URBE, investigador CUPAE, contador, superadmin; verificar acceso legítimo, aislamiento, facturación, solicitudes en red, aprobación, rechazos y sesiones expiradas.
6. Solo entonces publicar y cerrar el checklist. No borrar protocolos ni cobrar dinero como test en producción.

## Estado al cerrar esta auditoría

- Infraestructura, Brevo y release responsive anterior: **en producción** (acta anterior).
- Correcciones de seguridad y 96 tests: **preparadas en la rama de seguridad**, sin despliegue en producción.
- JWT en VPS: **clasificación pendiente** de permiso sudo; la contraseña nunca debe quedar registrada.
- No se han enviado nuevos emails ni creado/borrado datos durante esta auditoría.

## Paquete de instalación preparado (no ejecutado)

- Código de seguridad: commit `8adf4ad`, 13 archivos PHP.
- ZIP de seguridad en staging VPS: `/home/geckosadm/grobo-ops/grobo-security-8adf4ad.zip`, SHA-256 `9e524e7d7f3ff51754d75a008376bcd46d9af9d3f7bdfb1358509ddc71cb821f`.
- Directorio de archivos verificados: `/home/geckosadm/grobo-ops/staging-security-8adf4ad`.
- Instalador de seguridad: `/home/geckosadm/grobo-ops/grobo-deploy-security-8adf4ad.sh`.
- Se verificó `bash -n`, integridad ZIP, `php -l` de 13 archivos y `SECURITY_RELEASE_CHECK_OK count=13`.
- Antes de copiar archivos, el instalador requiere **`JWT_SECRET_PREFLIGHT_OK`**, PHP actualizado, `php-fpm8.3 -t` y `nginx -t`.
- Antes de instalar guarda respaldos privados; ante errores tras la primera copia, intenta revertir los archivos previos y recargar PHP-FPM. Verificar la reversión antes de reintentar.
- La comprobación JWT se dejó abierta como consola de solo lectura en Tojito, requiere entrada manual de `sudo`. **No ejecutar el instalador ni rotar la clave hasta ver ese resultado.**
