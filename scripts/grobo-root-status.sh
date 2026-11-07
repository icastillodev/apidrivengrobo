#!/bin/sh
# GROBO: diagnostico administrativo sin contrasena y sin exponer secretos.
set -eu
[ "$(id -u)" -eq 0 ] || { echo 'GROBO_STATUS_REQUIRES_ROOT'; exit 2; }
echo 'GROBO_ADMIN_ACCESS_OK'
dpkg-query -W php8.3-fpm 2>/dev/null || true
for svc in php8.3-fpm nginx; do
  printf 'SERVICE_%s=' "$svc"
  systemctl is-active "$svc" 2>/dev/null || true
done
if [ -f /usr/local/libexec/grobo/check-jwt.php ]; then
  /usr/bin/php /usr/local/libexec/grobo/check-jwt.php || true
fi
[ -f /var/www/html/app/dist/style/css/responsive-polish.css ] && echo 'RESPONSIVE_LIVE=yes' || echo 'RESPONSIVE_LIVE=no'
[ -f /var/www/html/core-backend-gem/src/Utils/JwtSigningKey.php ] && echo 'TENANT_SECURITY_LIVE=yes' || echo 'TENANT_SECURITY_LIVE=no'
