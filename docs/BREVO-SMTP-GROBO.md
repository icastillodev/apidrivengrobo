# GROBO: correo transaccional con Brevo (2026-11-02)

GROBO utiliza PHPMailer y variables `MAIL_*` en `/var/www/html/core-backend-gem/.env`.
Brevo SMTP reemplaza al SMTP Resend para registro, activacion, recuperacion de contrasena, segundo factor y avisos. No se cambia la estructura de las cuentas, formularios ni protocolos.

## Credenciales requeridas

En Brevo, abrir **Settings > SMTP & API > SMTP**. Crear una **SMTP key**, no una API key. Copiar tambien el **SMTP login**, que puede ser un email de la cuenta o una direccion generada por Brevo. Verificar un dominio y un remitente transaccional correspondiente a `MAIL_FROM` antes de probar el envio. Una autenticacion SMTP aceptada no garantiza entrega a la bandeja.

En Tojito, rellenar solo:
```ini
SMTP_LOGIN=
SMTP_KEY=
```
en `Desktop/GROBO-BREVO-CREDENCIALES.txt`. No escribir credenciales en el chat, Git, comentarios o incidencias. Archivo local con acceso restringido al usuario.

Se usa `smtp-relay.brevo.com:587` con STARTTLS, usuario SMTP especifico y clave SMTP.
El despliegue escribe y verifica:
```ini
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_SECURE=tls
MAIL_USER=<login SMTP Brevo>
MAIL_PASS=<clave SMTP Brevo>
MAIL_ENABLED=1
MAIL_DEBUG=0
GROBO_SKIP_EMAIL_AUTH=0
```
`MAIL_FROM` se conserva y debe pertenecer al remitente/dominio validado en Brevo.

## Despliegue autorizado

- Acceso directo en escritorio: `GROBO - configurar Brevo y publicar.cmd`.
- Transfiere por SSH las credenciales al usuario `geckosadm` (`chmod 600`), sin imprimir su contenido.
- `scripts/grobo-completar-actualizacion.sh` necesita `sudo` para parchear PHP, hacer backup, probar Brevo y reemplazar `.env` atomicamente, desplegar los 31 archivos del hotfix y enviar los nuevos enlaces a cuentas pendientes.
- El script de SMTP prueba STARTTLS, autenticacion y aceptacion del mensaje antes de cambiar `.env`. Se crea un respaldo privado en `/root`. La credencial temporal se elimina del VPS al finalizar. El acceso directo elimina el archivo local si todo termina correctamente.
- Si falla el test SMTP, se detiene antes de modificar `.env`.
- No ejecutar antiguas instrucciones de Resend: fueron reemplazadas.

## Comprobacion funcional

Verificar primero la llegada del email de prueba y la autenticacion del dominio (SPF/DKIM en Brevo). Revisar en URBE y CUPAE registro, activacion, solicitud de contraseña, segundo factor, historial contable, protocolos y separacion de cargos institucionales. Revisar especificamente las dos cuentas URBE pendientes de Cecilia sin modificar registros cientificos; no fusionar con su cuenta CUPAE.

Los scripts solo estaran *preparados* hasta disponer de permisos administrativos y credenciales validas. No decir que Brevo o PHP estan activos en produccion sin verificar.

Fuentes: https://help.brevo.com/hc/es/articles/7924908994450-Enviar-emails-transaccionales-con-Brevo-SMTP y https://help.brevo.com/hc/es/articles/7959631848850-Crear-y-administrar-claves-SMTP

## Diagnóstico SMTP 525 (7 de noviembre de 2026)

La conexión desde el VPS al relay `smtp-relay.brevo.com:587` negoció STARTTLS, pero Brevo rechazó AUTH con código **525**: IP de salida no autorizada. No confundir con 535 (credenciales inválidas). La IP de salida debe verificarse desde el servidor antes de autorizarla en **Brevo → Configuración → Seguridad → IP autorizadas**. Evitar desactivar el bloqueo de IP global.

El runner `scripts/grobo-completar-actualizacion.sh` ahora ejecuta `scripts/grobo-brevo-smtp-auth-check.py` **antes de usar sudo y actualizar producción**. El test no envía emails, solo verifica conectividad, STARTTLS y AUTH sin registrar los secretos. Si Brevo responde 525 o 535, se detiene con un estado explicativo, sin editar PHP ni `.env`.

Fuente: https://help.brevo.com/hc/es/articles/115000188150-Soluci%C3%B3n-de-problemas-relacionados-con-Brevo-SMTP
