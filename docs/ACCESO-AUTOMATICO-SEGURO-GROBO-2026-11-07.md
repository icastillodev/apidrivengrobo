# GROBO — Acceso administrativo acotado sin contraseña

**Estado: instalado y verificado en el VPS**, 7 de noviembre de 2026.

## Qué quedó funcionando

- SSH `geckosadm@104.251.212.54` autentica mediante clave SSH desde Tojito, sin contraseña.
- El usuario `geckosadm` puede ejecutar **solo tres comandos root** sin contraseña:
  - `sudo -n /usr/local/sbin/grobo-status`: versión PHP, Nginx, PHP-FPM y comprobación JWT sin revelar secretos.
  - `sudo -n /usr/local/sbin/grobo-deploy-check`: validación de un manifiesto de despliegue.
  - `sudo -n /usr/local/sbin/grobo-deploy-apply`: instalación controlada de archivos de aplicación con copia de seguridad y reversión ante errores.
- Permisos sudo limitados en `/etc/sudoers.d/grobo-limited`, propiedad root:root, modo 0440. Cada ruta exacta lleva `""` para **no admitir argumentos**.
- Ejecutores propiedad root en `/usr/local/sbin`; código verificador protegido en `/usr/local/libexec/grobo`.
- No se cambió la contraseña del VPS, el método de ingreso a la aplicación ni el acceso root general.
- Pruebas: comprobación permitida devuelve `GROBO_ADMIN_ACCESS_OK`, intento `sudo -n /bin/sh -c true` rechazado (código 1), y ejecución de helper con argumentos extra rechazada (código 1).

## En el escritorio de Tojito

- `GROBO - entrar directo.cmd`: consola SSH directa al VPS.
- `GROBO - comprobar servidor.cmd`: estado de producción sin pedir contraseña.
- `GROBO - activar acceso automatico seguro.cmd`: instalador inicial, ya ejecutado.

## Qué publica el ejecutor controlado

- Recibe un manifiesto en `/home/geckosadm/grobo-ops/incoming/current/manifest.json`, con `release_id`, rutas y SHA-256 de cada archivo.
- Rechaza rutas fuera del código de `/var/www/html/core-backend-gem` y `/var/www/html/app`, rutas relativas peligrosas, enlaces simbólicos, otros tipos de archivo, duplicados, hashes falsos y paquetes de tamaño excesivo.
- No permite modificar `.env`, instalar paquetes, cambiar configuración Nginx ni ejecutar scripts, SQL o migraciones arbitrarios como root.
- Realiza respaldo de archivos anteriores en `/root/grobo-managed-backup-<fecha>`. Escribe código con propietario `www-data`; valida sintaxis PHP, comprueba servicios y recarga PHP-FPM.
- La copia de seguridad no equivale a una validación funcional completa: después de cada publicación hacen falta pruebas HTTP de los módulos afectados.

## Bloqueo de seguridad JWT que permanece activo

Producción **tiene `JWT_SECRET_TOO_SHORT`**. El nuevo release de seguridad `8adf4ad` sigue en *staging*, sin publicar, porque modifica autenticación. El helper de comprobación devolvió:

```text
GROBO_DEPLOY_ERROR AUTH_DEPLOY_BLOCKED_BY_JWT_PREFLIGHT JWT_SECRET_TOO_SHORT
```

Esto es correcto. Antes de publicarlo se necesita **planificar una rotación de JWT** con una clave criptográfica fuerte, respaldar `.env`, prever que las sesiones actuales se invalidarán y verificar el acceso de cada institución. No guardar, enviar ni mostrar la clave en chats, logs o repositorios.

## Reversión de acceso automático

Si se quiere volver a requerir contraseña para todas las operaciones administrativas, desde una sesión autorizada:

```bash
sudo rm -f /etc/sudoers.d/grobo-limited
sudo visudo -c
```

El comando de eliminación anterior requiere la contraseña ordinaria porque no está en la lista sin contraseña. También puede hacerse desde la consola del proveedor del VPS con privilegios de administrador. No borrar `/etc/sudoers` ni desactivar SSH.

## Nota de límites

El NOPASSWD no equivale a conceder `sudo` universal. Para tareas fuera de los tres comandos aprobados (actualización del SO, cambiar `.env`, restauración compleja de base de datos o modificación de ejecutores) se seguirá necesitando una autorización administrativa explícita.
