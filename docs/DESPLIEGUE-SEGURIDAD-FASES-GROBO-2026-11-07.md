# GROBO — Despliegue de seguridad por fases

**Fecha:** 7 de noviembre de 2026

## Fase 1: publicada y verificada

Por el control `JWT_SECRET_TOO_SHORT`, se publicaron inicialmente tres archivos PHP que no alteran los mecanismos de inicio de sesión:

- `api/src/Controllers/AdminConfigReservasController.php`
- `api/src/Models/AdminConfig/AdminConfigReservasModel.php`
- `api/src/Models/Protocol/ProtocolModel.php`

Se utilizó `sudo -n /usr/local/sbin/grobo-deploy-apply`, con manifiesto de tres archivos y hashes SHA-256. El servidor respondió:

```text
GROBO_CONTROLLED_DEPLOY_OK version=tenant-reservas-phase1-8adf4ad files=3
```

Respaldo automático privado: `/root/grobo-managed-backup-20261107T180235Z`.

Comprobaciones posteriores:
- 3/3 archivos idénticos byte a byte al staging.
- `php -l` correcto en los tres.
- Nginx y php8.3-fpm activos; PHP `8.3.6-0ubuntu0.24.04.13`.
- Chrome: 18 verificaciones públicas en 390, 768 y 1366 px, sin errores JS ni desbordes; accesos URBE/CUPAE, noticias públicas, QR y activación.
- No se usaron credenciales de investigadores ni se alteraron registros reales.
- Algunos endpoints privados antiguos siguen devolviendo error con estado HTTP incorrecto sin sesión; esos están cubiertos en la fase 2.

## Fase 2: JWT y demás 13 archivos

Se restauró el manifiesto `security-8adf4ad` de 13 archivos en `incoming/current`, manteniendo una copia del manifiesto y contenido de fase 1 en `incoming/completed-phase1-8adf4ad`.

El control de instalación sin cambiar JWT respondió correctamente:
`GROBO_DEPLOY_ERROR AUTH_DEPLOY_BLOCKED_BY_JWT_PREFLIGHT JWT_SECRET_TOO_SHORT`.

Se prepararon verificaciones previas de:
- Sintaxis de los 13 archivos PHP;
- PHP-FPM y Nginx;
- Acceso de solo lectura a MySQL y nueve tablas con sus columnas esperadas;
- Hash de los archivos del manifiesto;
- Clave JWT de producción (mínimo 32 caracteres y sin respaldo conocido).

La operación administrativa en `scripts/grobo-rotate-jwt-and-deploy.py` pide contraseña `sudo` y una confirmación `ROTAR`. Genera en el VPS una clave aleatoria de **256 bits**, guarda respaldo privado de `.env`, hace reemplazo atómico, utiliza el deploy root limitado con backups y reversión, comprueba la firma JWT con un token ficticio, la base de datos y las páginas públicas.

**Consecuencia intencional:** al rotar JWT se invalidan los tokens anteriores y los usuarios deben volver a iniciar sesión. No se eliminan cuentas, protocolos, formularios ni pagos. Si la publicación falla después de rotar la clave, no se vuelve automáticamente a la clave antigua por seguridad; debe diagnosticarse el fallo y completarse/recuperarse el despliegue.

Los archivos en el escritorio de Tojito contienen solo instrucciones; ninguna clave aparece en Git, en el chat o en la consola. La clave se genera únicamente en el VPS.

## Validación funcional aún requerida

Tras instalar fase 2: comprobar login real con cuentas controladas de administrador URBE/CUPAE, investigador, contador y superadmin; facturación por institución, historial de pagos, permisos de protocolos, reservas y recuperación/activación por Brevo. Los 96 fixtures PHP y las pruebas públicas anteriores **no sustituyen** esa revisión autenticada.

**Estado:** actualizar conforme a los resultados reales de la consola; no declarar completa la fase 2 antes de `GROBO_ROTATION_AND_FULL_SECURITY_DEPLOY_DONE` y pruebas posteriores.
