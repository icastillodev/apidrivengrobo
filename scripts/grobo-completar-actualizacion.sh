#!/usr/bin/env bash
set -euo pipefail
OPS=/home/geckosadm/grobo-ops
if [[ ${1:-} == --check ]]; then
    bash -n "$OPS/grobo-upgrade-php-security.sh"
    bash -n "$OPS/grobo-configurar-brevo-smtp.sh"
    test -f "$OPS/grobo-brevo-smtp-auth-check.py" || { echo 'ERROR: falta verificador SMTP de Brevo'; exit 2; }
    bash -n "$OPS/grobo-deploy-release-20261107.sh"
    bash "$OPS/grobo-deploy-release-20261107.sh" --check
    echo 'CHECKS_OK'
    exit 0
fi
echo 'GROBO | Parche PHP + SMTP Brevo + despliegue controlado'
echo 'La clave sudo se introduce solo en esta terminal; SMTP login y clave se leen desde un archivo protegido, nunca desde el chat.'
test -s "$OPS/.brevo-smtp-credentials" || { echo 'ERROR: faltan credenciales SMTP Brevo; ejecutar el acceso directo de Tojito.'; exit 2; }
# Comprobar SMTP y autorizacion de IP ANTES de aplicar parches de PHP o modificar produccion.
python3 "$OPS/grobo-brevo-smtp-auth-check.py"
sudo -v
sudo bash "$OPS/grobo-upgrade-php-security.sh"
sudo bash "$OPS/grobo-configurar-brevo-smtp.sh"
sudo bash "$OPS/grobo-deploy-release-20261107.sh"
sudo php "$OPS/grobo-reactivar-usuarios-pendientes.php"
echo 'GROBO_UPDATE_DONE: revisar los correos de activación y realizar QA de cuentas, pagos y protocolos.'
