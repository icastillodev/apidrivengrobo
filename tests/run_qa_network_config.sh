#!/bin/sh
set -eu
php -l /code/tests/qa_network_config_controller.php
php -d log_errors=0 /code/tests/qa_network_config_controller.php own
php -d log_errors=0 /code/tests/qa_network_config_controller.php allowed-network
php -d log_errors=0 /code/tests/qa_network_config_controller.php not-network
php -d log_errors=0 /code/tests/qa_network_config_controller.php wrong-value
php -d log_errors=0 /code/tests/qa_network_config_controller.php invalid-zero
php -d log_errors=0 /code/tests/qa_network_config_controller.php superadmin
