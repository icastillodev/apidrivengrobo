#!/usr/bin/env bash
# Ejecutar EN EL VPS con sudo, después de verificar respaldo y coordinación operativa.
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo 'ERROR: requiere sudo/root'; exit 1; fi
if [[ $(. /etc/os-release; echo "$VERSION_ID") != 24.04 ]]; then echo 'ERROR: solo Ubuntu 24.04'; exit 1; fi
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="/root/grobo-php-security-$STAMP.tar.gz"
tar -czf "$BACKUP" /etc/php/8.3 /etc/nginx 2>/dev/null
chmod 600 "$BACKUP"
echo "Config respaldada en $BACKUP"
export DEBIAN_FRONTEND=noninteractive
apt-get update
CANDIDATE=$(apt-cache policy php8.3-fpm | awk '/Candidate:/ {print $2; exit}')
MINIMUM='8.3.6-0ubuntu0.24.04.13'
if [[ -z "$CANDIDATE" ]] || ! dpkg --compare-versions "$CANDIDATE" ge "$MINIMUM"; then
  echo "ERROR: repositorio no ofrece el parche requerido ($MINIMUM). Candidato=$CANDIDATE"
  exit 2
fi
apt-get install -y --only-upgrade php8.3-fpm php8.3-cli php8.3-common php8.3-mysql php8.3-opcache php8.3-mbstring php8.3-curl php8.3-xml
php-fpm8.3 -t
nginx -t
INSTALLED=$(dpkg-query -W -f='${Version}' php8.3-fpm)
dpkg --compare-versions "$INSTALLED" ge "$MINIMUM" || { echo 'FALLO: PHP sin parche requerido'; exit 3; }
systemctl restart php8.3-fpm
systemctl is-active --quiet php8.3-fpm
systemctl is-active --quiet nginx
echo "OK: php8.3-fpm $INSTALLED actualizado y servicios activos"
