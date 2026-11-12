<?php
/**
 * Benchmark de filtros y bytes transferidos con MySQL sintético.
 * Ejecuta primero el banco previo de 5.000 formularios (base efímera).
 */
declare(strict_types=1);
require_once __DIR__ . '/bench_userforms_mysql_20261112.php';

use App\Services\UserForms\UserFormsFilterService;

$service = new UserFormsFilterService($model);
function sampleFiltered(callable $fn, int $runs = 11): array
{
    $times = [];
    $bytes = 0;
    $count = null;
    for ($n = 0; $n < $runs; $n++) {
        $start = hrtime(true);
        $result = $fn();
        $times[] = (hrtime(true) - $start) / 1e6;
        $bytes = strlen(json_encode($result, JSON_INVALID_UTF8_SUBSTITUTE));
        $count = $result['total'] ?? null;
    }
    sort($times, SORT_NUMERIC);
    return [
        'p50_ms'=>round($times[(int)ceil($runs*.5)-1],2),
        'p95_ms'=>round($times[(int)ceil($runs*.95)-1],2),
        'json_bytes'=>$bytes,
        'total'=>$count,
        'rows_returned'=>count($result['list']),
        'runs'=>$runs,
    ];
}
$bench = [
    'search_id' => sampleFiltered(fn()=>$service->page(101,12,['search'=>'20001'],12,0)),
    'status_proceso' => sampleFiltered(fn()=>$service->page(101,12,['status'=>'Proceso'],12,0)),
    'institution_urbe' => sampleFiltered(fn()=>$service->page(101,12,['inst'=>'URBE'],12,0)),
    'empty' => sampleFiltered(fn()=>$service->page(101,12,['search'=>'NONEXISTENT-REF'],12,0)),
];
if (($bench['search_id']['total'] ?? 0) !== 1
    || ($bench['search_id']['rows_returned'] ?? -1) !== 1) {
    throw new RuntimeException('Filter benchmark returned incorrect ID');
}
if (($bench['empty']['total'] ?? -1) !== 0) {
    throw new RuntimeException('Empty search benchmark returned records');
}
echo 'GROBO_MYFORMS_FILTER_SYNTHETIC_MYSQL_BENCH '
    . json_encode(['fixture_rows'=>5000,'results'=>$bench],
        JSON_INVALID_UTF8_SUBSTITUTE|JSON_UNESCAPED_UNICODE) . PHP_EOL;
