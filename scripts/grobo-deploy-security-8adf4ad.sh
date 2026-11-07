#!/usr/bin/env bash
# GROBO — release de seguridad. Exige preflight JWT y sudo.
set -eEuo pipefail
umask 077
OPS=/home/geckosadm/grobo-ops
STAGE="$OPS/staging-security-8adf4ad"
ZIP="$OPS/grobo-security-8adf4ad.zip"
API=/var/www/html/core-backend-gem
EXPECTED_SHA=9e524e7d7f3ff51754d75a008376bcd46d9af9d3f7bdfb1358509ddc71cb821f
MIN_PHP=8.3.6-0ubuntu0.24.04.13
RELATIVE=(
 api/index.php
 api/src/Controllers/AdminConfigReservasController.php
 api/src/Controllers/AuthController.php
 api/src/Controllers/ControllerusuarioTodosProtocolos.php
 api/src/Controllers/ProtocolController.php
 api/src/Models/AdminConfig/AdminConfigReservasModel.php
 api/src/Models/Protocol/ProtocolModel.php
 api/src/Models/TodosProtocolos/UsuarioTodosProtocolosModel.php
 api/src/Utils/ApiExceptionHandler.php
 api/src/Utils/Auditoria.php
 api/src/Utils/AuthenticationException.php
 api/src/Utils/InstitutionScope.php
 api/src/Utils/JwtSigningKey.php
)
[[ -d "$STAGE/api" && -f "$ZIP" ]] || { echo 'SECURITY_STAGE_MISSING'; exit 2; }
printf '%s  %s\n' "$EXPECTED_SHA" "$ZIP" | sha256sum -c - >/dev/null || {
  echo 'SECURITY_PACKAGE_SHA_MISMATCH'; exit 2;
}
[[ $(find "$STAGE/api" -type f -name '*.php' | wc -l) -eq 13 ]] || {
  echo 'SECURITY_FILE_COUNT_MISMATCH'; exit 2;
}
[[ $(find "$STAGE" -type l | wc -l) -eq 0 ]] || {
  echo 'SECURITY_SYMLINK_NOT_ALLOWED'; exit 2;
}
for rel in "${RELATIVE[@]}"; do
  src="$STAGE/$rel"
  dest="$API/${rel#api/}"
  [[ -f "$src" && ! -L "$src" && ! -L "$dest" ]] || {
    echo "SECURITY_STAGE_FILE_INVALID $rel"; exit 2;
  }
  php -l "$src" >/dev/null
done
echo 'SECURITY_RELEASE_CHECK_OK count=13'
if [[ ${1:-} == --check ]]; then exit 0; fi

[[ $EUID -eq 0 ]] || { echo 'SECURITY_NEEDS_SUDO'; exit 2; }
# Una clave JWT corta rompería los logins: se prohíbe publicar hasta validarla.
php "$OPS/grobo-check-jwt-secret.php"
phpver=$(dpkg-query -W -f='${Version}' php8.3-fpm)
dpkg --compare-versions "$phpver" ge "$MIN_PHP"
php-fpm8.3 -t
nginx -t

stamp=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="/root/grobo-security-backup-$stamp"
mkdir -p "$BACKUP/existing"
for rel in "${RELATIVE[@]}"; do
  dest="$API/${rel#api/}"
  if [[ -f "$dest" ]]; then
    mkdir -p "$BACKUP/existing/$(dirname "$rel")"
    cp -p "$dest" "$BACKUP/existing/$rel"
  else
    printf '%s\n' "$rel" >> "$BACKUP/new_files.txt"
  fi
done
chmod -R go-rwx "$BACKUP"
echo "SECURITY_BACKUP_OK $BACKUP"
APPLIED=0
rollback() {
  rc=$?
  trap - ERR
  if [[ $APPLIED -eq 1 ]]; then
    echo 'SECURITY_DEPLOY_FAILED_RESTORING_BACKUP'
    set +e
    for rel in "${RELATIVE[@]}"; do
      dest="$API/${rel#api/}"
      if [[ -f "$BACKUP/existing/$rel" ]]; then
        cp -p "$BACKUP/existing/$rel" "$dest"
      else
        rm -f -- "$dest"
      fi
    done
    systemctl reload php8.3-fpm
    echo 'SECURITY_ROLLBACK_ATTEMPTED'
  fi
  exit "$rc"
}
trap rollback ERR
APPLIED=1
for rel in "${RELATIVE[@]}"; do
  install -D -o www-data -g www-data -m 0644 "$STAGE/$rel" "$API/${rel#api/}"
done
for rel in "${RELATIVE[@]}"; do
  php -l "$API/${rel#api/}" >/dev/null
  cmp -s "$STAGE/$rel" "$API/${rel#api/}"
done
php-fpm8.3 -t
nginx -t
systemctl reload php8.3-fpm
systemctl is-active --quiet php8.3-fpm
systemctl is-active --quiet nginx
for url in https://app.groboapp.com/urbe/ https://app.groboapp.com/cupae/; do
  status=$(curl -sS -L --connect-timeout 8 --max-time 17 -o /dev/null -w '%{http_code}' "$url")
  [[ "$status" == 200 ]] || { echo "SECURITY_SMOKE_FAIL $status"; false; }
done
APPLIED=0
trap - ERR
echo "SECURITY_DEPLOY_OK count=13 backup=$BACKUP"
