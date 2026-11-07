#!/bin/sh
# QA GROBO: sin MySQL, sin API real, sin credenciales.
set -eu
cd /code
for file in     api/index.php     api/src/Controllers/AuthController.php     api/src/Controllers/ProtocolController.php     api/src/Controllers/ControllerusuarioTodosProtocolos.php     api/src/Controllers/AdminConfigReservasController.php     api/src/Models/Protocol/ProtocolModel.php     api/src/Models/TodosProtocolos/UsuarioTodosProtocolosModel.php     api/src/Models/AdminConfig/AdminConfigReservasModel.php     api/src/Models/Billing/BillingModel.php     api/src/Utils/Auditoria.php     api/src/Utils/ApiExceptionHandler.php     api/src/Utils/AuthenticationException.php     api/src/Utils/InstitutionScope.php     api/src/Utils/JwtSigningKey.php; do
  php -l "/code/$file" >/dev/null
done
echo 'PHP_LINT_OK'

php -d log_errors=0 /code/tests/qa_api_error_responses.php
php -d log_errors=0 /code/tests/qa_tenant_permissions.php
php -d log_errors=0 /code/tests/qa_billing_read_scope.php
php -d log_errors=0 /code/tests/qa_jwt_secret_safety.php
php -d log_errors=0 /code/tests/qa_protocol_species_scope.php
php -d log_errors=0 /code/tests/qa_red_protocol_approval.php

for op in getByInstitution getFormData getPendingCount; do
  for role in own other superadmin invalid no-session bad-token; do
    php -d log_errors=0 /code/tests/qa_protocol_controller_case.php "$op" "$role"
  done
done
sh /code/tests/run_qa_admin_save.sh
sh /code/tests/run_qa_network_config.sh
sh /code/tests/run_qa_reservas_admin_roles.sh
echo 'GROBO_QA_COMPLETE: 96 fixtures PHP passed'
