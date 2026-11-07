#!/usr/bin/env bash
set -euo pipefail
STAGE=/home/geckosadm/grobo-ops/staging-20261107-ux
APP=/var/www/html/app
API=/var/www/html/core-backend-gem
MINIMUM=8.3.6-0ubuntu0.24.04.13
[[ -d "$STAGE/api" && -d "$STAGE/front" ]] || { echo 'ERROR: paquete incompleto'; exit 1; }
mapfile -d '' FILES < <(find "$STAGE/api" "$STAGE/front" -type f -print0 | sort -z)
[[ ${#FILES[@]} -ge 30 ]] || { echo 'ERROR: no hay suficientes archivos'; exit 1; }
for source in "${FILES[@]}"; do
  rel=${source#"$STAGE/"}
  case "$rel" in
    api/*) destination="$API/${rel#api/}" ;;
    front/*) destination="$APP/${rel#front/}" ;;
    *) echo 'ERROR: ruta fuera de la aplicación'; exit 1;;
  esac
  [[ ! -L "$destination" ]] || { echo "ERROR: enlace simbólico inesperado: $rel"; exit 1; }
done
echo "RELEASE_CHECK_OK file_count=${#FILES[@]}"
if [[ ${1:-} == --check ]]; then
  exit 0
fi
[[ $EUID -eq 0 ]] || { echo 'ERROR: ejecutar con sudo'; exit 1; }
CURRENT=$(dpkg-query -W -f='${Version}' php8.3-fpm)
dpkg --compare-versions "$CURRENT" ge "$MINIMUM" || { echo 'ERROR: PHP requiere actualización de seguridad antes de deploy'; exit 2; }
php-fpm8.3 -t
nginx -t
for source in "${FILES[@]}"; do
  case "$source" in
    *.php) php -l "$source" >/dev/null ;;
    *.js) : ;;  # JS fue comprobado con node --check en Tojito.
  esac
done
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="/root/grobo-backup-release-$STAMP"
mkdir -p "$BACKUP/existing"
echo "PREPARE_BACKUP $BACKUP"
for source in "${FILES[@]}"; do
  rel=${source#"$STAGE/"}
  case "$rel" in
    api/*) destination="$API/${rel#api/}" ;;
    front/*) destination="$APP/${rel#front/}" ;;
  esac
  if [[ -f "$destination" ]]; then
    mkdir -p "$BACKUP/existing/$(dirname "$rel")"
    cp -p "$destination" "$BACKUP/existing/$rel"
  else
    echo "$rel" >> "$BACKUP/new_files.txt"
  fi
done
chmod -R go-rwx "$BACKUP"
echo 'BACKUP_OK'
# Solo se actualizan los archivos declarados por el release verificado.
for source in "${FILES[@]}"; do
  rel=${source#"$STAGE/"}
  case "$rel" in
    api/*) destination="$API/${rel#api/}" ;;
    front/*) destination="$APP/${rel#front/}" ;;
  esac
  install -D -o www-data -g www-data -m 0644 "$source" "$destination"
done
for source in "${FILES[@]}"; do
  [[ "$source" == *.php ]] || continue
  rel=${source#"$STAGE/api/"}
  [[ "$source" == "$STAGE/api/"* ]] || continue
  php -l "$API/$rel" >/dev/null
done
systemctl reload php8.3-fpm
systemctl is-active --quiet php8.3-fpm
systemctl is-active --quiet nginx
echo "DEPLOY_OK count=${#FILES[@]} backup=$BACKUP php=$CURRENT"
echo 'Mantener el respaldo privado; verificar login, cobros y protocolos con usuarios de prueba.'
