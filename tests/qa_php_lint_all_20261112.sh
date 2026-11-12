#!/bin/sh
# Sintaxis PHP completa sin acceso a MySQL.
set -eu
find /code/api -type f -name '*.php' -exec php -l '{}' ';' |
awk '
  /^No syntax errors detected/ {ok++; next}
  {bad++; print}
  END {
    printf "GROBO_FULL_PHP_LINT ok=%d bad=%d\n",ok,bad
    exit (bad>0||ok<100)
  }'
