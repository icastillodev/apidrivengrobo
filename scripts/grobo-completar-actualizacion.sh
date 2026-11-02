#!/usr/bin/env bash
set -euo pipefail
OPS=/home/geckosadm/grobo-ops
if [[ ${1:-} == --check ]]; then
    bash -n "$OPS/grobo-upgrade-php-security.sh"
    bash -n "$OPS/grobo-rotate-resend-smtp.sh"
    bash -n "$OPS/grobo-deploy-release-5ec4a55.sh"
    bash "$OPS/grobo-deploy-release-5ec4a55.sh" --check
    echo 'CHECKS_OK'
    exit 0
fi
echo 'GROBO | Parche PHP + SMTP Resend + despliegue controlado'
echo 'La clave de sudo y la nueva API key se introducen solo en esta terminal, nunca en el chat.'
sudo -v
sudo bash "$OPS/grobo-upgrade-php-security.sh"
sudo bash "$OPS/grobo-rotate-resend-smtp.sh"
sudo bash "$OPS/grobo-deploy-release-5ec4a55.sh"
echo 'GROBO_UPDATE_DONE: realizar QA funcional de cuentas, pagos y protocolos.'
