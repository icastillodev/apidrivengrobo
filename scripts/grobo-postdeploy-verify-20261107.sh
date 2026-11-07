#!/usr/bin/env bash
set -euo pipefail
STAGE=/home/geckosadm/grobo-ops/staging-20261107-v3
BACKEND=/var/www/html/core-backend-gem
FRONT=/var/www/html/app

matched=0
mismatch=0
missing=0
total=0
while IFS= read -r -d '' file; do
  rel=${file#"$STAGE"/}
  case "$rel" in
    api/*) target="$BACKEND/${rel#api/}" ;;
    front/*) target="$FRONT/${rel#front/}" ;;
    *) echo "INVALID_STAGE_PATH"; exit 2 ;;
  esac
  total=$((total + 1))
  if [[ ! -f "$target" ]]; then
    missing=$((missing + 1))
    if [[ "$missing" -le 10 ]]; then echo "MISSING $rel"; fi
  elif cmp -s "$file" "$target"; then
    matched=$((matched + 1))
  else
    mismatch=$((mismatch + 1))
    if [[ "$mismatch" -le 10 ]]; then echo "MISMATCH $rel"; fi
  fi
done < <(find "$STAGE/api" "$STAGE/front" -type f -print0)
echo "LIVE_FILE_COMPARISON total=$total matched=$matched mismatch=$mismatch missing=$missing"

echo "PHP_PACKAGE=$(dpkg-query -W php8.3-fpm)"
echo "NGINX_STATUS=$(systemctl is-active nginx)"
echo "PHPFPM_STATUS=$(systemctl is-active php8.3-fpm)"
if [[ $EUID -eq 0 ]]; then
  php-fpm8.3 -t
  nginx -t
else
  echo 'PRIVILEGED_CONFIG_SYNTAX_SKIPPED: execute as root for php-fpm8.3 -t and nginx -t'
fi

bad_http=0
for endpoint in \
 "https://app.groboapp.com/dist/style/css/responsive-polish.css" \
 "https://app.groboapp.com/dist/js/utils/qrAuthSession.js" \
 "https://app.groboapp.com/paginas/confirmar.html" \
 "https://app.groboapp.com/paginas/qr-sala.html" \
 "https://app.groboapp.com/paginas/noticia-publica.html" \
 "https://app.groboapp.com/urbe/" \
 "https://app.groboapp.com/cupae/"; do
  status=$(curl -sS -L --connect-timeout 5 --max-time 15 -o /dev/null -w '%{http_code}' "$endpoint") || status='CURL_ERROR'
  echo "HTTP_RESULT $status $endpoint"
  if [[ "$status" != '200' ]]; then bad_http=$((bad_http+1)); fi
done
if [[ "$mismatch" -gt 0 || "$missing" -gt 0 || "$bad_http" -gt 0 ]]; then
  echo "POSTDEPLOY_VALIDATION_FAILED missing=$missing mismatch=$mismatch http_fail=$bad_http"
  exit 2
fi
echo POSTDEPLOY_FILES_PASS
