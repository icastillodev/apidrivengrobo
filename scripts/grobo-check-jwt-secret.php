<?php
declare(strict_types=1);
/**
 * GROBO: preflight de JWT_SECRET en el VPS. Lectura solamente y nunca imprime el secreto.
 * Ejecutar con acceso autorizado: sudo php scripts/grobo-check-jwt-secret.php
 * Adaptar path para usar el entorno .env de producción (no el local).
 */
$root = getenv('GROBO_PRODUCTION_API_ROOT') ?: '/var/www/html/core-backend-gem';
if (!is_string($root) || $root === '' || !is_dir($root)) {
    fwrite(STDERR, "JWT_CONFIG_ROOT_INVALID\n"); exit(2);
}
$envPath = rtrim($root,'/') . '/.env';
if (!is_readable($envPath)) {
    fwrite(STDERR, "JWT_CONFIG_ENV_NOT_READABLE\n"); exit(2);
}
$lines = file($envPath, FILE_IGNORE_NEW_LINES);
$keys = [];
foreach ($lines ?: [] as $line) {
    if (preg_match('/^\s*JWT_SECRET\s*=\s*(.*)$/', $line, $m)) {
        $keys[] = trim($m[1], " \t\r\n\"'");
    }
}
if (count($keys) !== 1) {
    fwrite(STDERR, "JWT_SECRET_MISSING_OR_DUPLICATED\n"); exit(2);
}
$key = $keys[0];
if (strlen($key) < 32) {
    fwrite(STDERR, "JWT_SECRET_TOO_SHORT\n"); exit(2);
}
if (hash_equals('TuClaveSuperSecretaGROBO2026', $key)) {
    fwrite(STDERR, "JWT_SECRET_IS_UNSAFE_LEGACY_DEFAULT\n"); exit(2);
}
echo "JWT_SECRET_PREFLIGHT_OK\n";
