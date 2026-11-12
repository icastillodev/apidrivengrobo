<?php
/**
 * BENCHMARK EXCLUSIVO DE GROBO_MYFORMS_FIXTURE (MySQL 8.4 local en red Docker interna).
 * NO usar contra producción, no imprime PII ni credenciales.
 * Cargar fixture de qa_userforms_mysql_integration_20261112.php antes.
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\UserForms\UserFormsModel;

$dsn = (string)(getenv('GROBO_QA_MYSQL_DSN') ?: '');
if (getenv('GROBO_QA_MYSQL_ISOLATED') !== 'yes'
    || !str_contains($dsn, 'dbname=grobo_myforms_fixture;')) {
    throw new RuntimeException('ISOLATED_FIXTURE_ONLY');
}
$db = new PDO($dsn, getenv('GROBO_QA_MYSQL_USER') ?: 'root',
    getenv('GROBO_QA_MYSQL_PASSWORD') ?: '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'grobo_myforms_fixture') {
    throw new RuntimeException('WRONG_DATABASE');
}
$seedRecord = $db->query('SELECT COUNT(*) FROM formularioe WHERE idformA=1001')->fetchColumn();
if ((int)$seedRecord !== 1) throw new RuntimeException('INTEGRATION_FIXTURE_NOT_SEEDED');

$rows = 5000;
$startId = 20000;
$insert = $db->prepare("INSERT INTO formularioe
    (idformA,IdUsrA,IdInstitucion,tipoA,depto,fechainicioA,fecRetiroA,estado,EstadoWorkflow,DerivadoActivo,IdInstitucionOrigen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)");
$db->beginTransaction();
for ($i = 0; $i < $rows; $i++) {
    $own = $i % 5 !== 0; // 4.000 de usuario 101 en URBE; 1.000 de 202 en CUPAE.
    $insert->execute([
        $startId + $i, $own ? 101 : 202, $own ? 12 : 22,
        $own ? 1 : 2, $own ? 1 : 2,
        '2026-11-01', '2026-11-05', $i % 3 === 0 ? 'Entregado' : 'Proceso',
        null, 0, null,
    ]);
}
$db->commit();
$model = new UserFormsModel($db);

function sample(callable $fn, int $times): array {
    $elapsed = [];
    $payloadBytes = null;
    $n = null;
    for ($k = 0; $k < $times; $k++) {
        $start = hrtime(true);
        $result = $fn();
        $elapsed[] = (hrtime(true) - $start) / 1000000.0;
        $payloadBytes = strlen(json_encode($result, JSON_INVALID_UTF8_SUBSTITUTE));
        $n = isset($result['list']) ? count($result['list']) : null;
    }
    sort($elapsed, SORT_NUMERIC);
    $quantile = static function (float $percent) use ($elapsed): float {
        $index = max(0, (int)ceil($percent * count($elapsed)) - 1);
        return round($elapsed[$index], 2);
    };
    return [
        'p50_ms' => $quantile(.50),
        'p95_ms' => $quantile(.95),
        'size_bytes' => $payloadBytes,
        'rows_returned' => $n,
        'runs' => $times,
    ];
}
$checks = [
    'first_page_12' => sample(fn() => $model->getAllForms(101, 12, ['limit'=>12, 'offset'=>0]), 15),
    'later_page_12' => sample(fn() => $model->getAllForms(101, 12, ['limit'=>12, 'offset'=>240]), 15),
    'filter_metadata' => sample(fn() => $model->getMyFormsFilterMeta(101, 12), 15),
    'legacy_full' => sample(fn() => $model->getAllForms(101,12), 3),
];
$first = $checks['first_page_12']['size_bytes'];
$all = $checks['legacy_full']['size_bytes'];
if ($first <= 0 || $all <= $first) throw new RuntimeException('EXPECTED_PAGED_PAYLOAD_SMALLER');
$ratio = round(100 * (1 - ($first / $all)), 2);

echo 'GROBO_MYFORMS_SYNTHETIC_MYSQL_BENCH '
  . json_encode([
      'fixture_rows_inserted' => $rows,
      'total_visible_owner' => 4005,
      'transfer_reduction_pct' => $ratio,
      'results' => $checks,
  ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) . PHP_EOL;
