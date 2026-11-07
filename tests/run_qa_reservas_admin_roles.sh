#!/bin/sh
set -eu
php -l /code/tests/qa_reservas_admin_roles.php
for role in 1 2 3 4 5 6 7 8; do php /code/tests/qa_reservas_admin_roles.php "$role"; done
