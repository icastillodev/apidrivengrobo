<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Controllers\StatisticsController;

$controller = new StatisticsController(new stdClass());
$method = new ReflectionMethod($controller, 'resolveStatsInstitution');
$cases = [
    ['admin propia', ['role'=>2,'instId'=>1], null, 1],
    ['admin ignora inst ajena', ['role'=>2,'instId'=>1], '12', 1],
    ['rol investigador bloqueado', ['role'=>3,'instId'=>1], '1', \DomainException::class],
    ['rol desconocido bloqueado', ['role'=>9,'instId'=>1], null, \DomainException::class],
    ['contador de institución', ['role'=>5,'instId'=>12], null, 12],
    ['sede faltante bloqueada', ['role'=>4,'instId'=>0], null, \InvalidArgumentException::class],
    ['superadmin elige institución', ['role'=>1,'instId'=>0], '12', 12],
    ['superadmin sin institución bloqueado', ['role'=>1,'instId'=>0], null, \InvalidArgumentException::class],
    ['superadmin institución inválida', ['role'=>1,'instId'=>0], 'abc', \InvalidArgumentException::class],
];
$passed = 0;
foreach ($cases as [$name, $session, $requested, $expected]) {
    $_GET = $requested === null ? [] : ['inst' => $requested];
    try {
        $result = $method->invoke($controller, $session);
        $ok = is_int($expected) && $result === $expected;
    } catch (\Throwable $e) {
        $ok = is_string($expected) && $e instanceof $expected;
    }
    if (!$ok) {
        echo 'FAIL: ' . $name . PHP_EOL;
        exit(1);
    }
    $passed++;
}
echo 'GROBO_STATS_ROLES_QA_OK cases=' . $passed . PHP_EOL;
