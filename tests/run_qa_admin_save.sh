#!/bin/sh
set -eu
php -l /code/tests/qa_protocol_admin_save.php
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 3 1 own
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 7 1 own
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 2 1 cross
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 4 1 cross
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 2 1 own
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 1 0 none
php -d log_errors=0 /code/tests/qa_protocol_admin_save.php 1 0 cross
