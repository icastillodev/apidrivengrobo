<?php
/**
 * Benchmark de filtros y bytes transferidos con MySQL sintético.
 * Ejecuta primero el banco previo de 5.000 formularios (base efímera).
 */
declare(strict_types=1);
require_once __DIR__ . '/qa_userforms_mysql_integration_20261112.php';
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
    'search_many_later_page' => sampleFiltered(fn()=>$service->page(
        101,12,['search'=>'URBE'],12,240
    )),
    'search_combined' => sampleFiltered(fn()=>$service->page(
        101,12,['search'=>'URBE','inst'=>'CUPAE','status'=>'Proceso'],12,0
    )),
    'search_exact_id' => sampleFiltered(fn()=>$service->page(101,12,['search'=>'#20001'],12,0)),
    'status_proceso' => sampleFiltered(fn()=>$service->page(101,12,['status'=>'Proceso'],12,0)),
    'institution_urbe' => sampleFiltered(fn()=>$service->page(101,12,['inst'=>'URBE'],12,0)),
    'empty' => sampleFiltered(fn()=>$service->page(101,12,['search'=>'NONEXISTENT-REF'],12,0)),
    'derived_selective' => sampleFiltered(fn()=>$service->page(101,12,['derivation'=>'derived'],12,0)),
    'origin_selective' => sampleFiltered(fn()=>$service->page(202,22,['origin'=>'URBE'],12,0)),
    'participant_selective' => sampleFiltered(fn()=>$service->page(101,12,['inst'=>'CUPAE'],12,0)),
    'combined_selective' => sampleFiltered(fn()=>$service->page(202,22,[
        'origin'=>'URBE', 'derivation'=>'derived', 'status'=>'Proceso'
    ],12,0)),
];
if (($bench['search_id']['total'] ?? 0) !== 1
    || ($bench['search_id']['rows_returned'] ?? -1) !== 1) {
    throw new RuntimeException('Filter benchmark returned incorrect ID');
}
if (($bench['empty']['total'] ?? -1) !== 0) {
    throw new RuntimeException('Empty search benchmark returned records');
}
// Comparar contra la semántica original también con 5.000 formularios:
foreach ([
    [101,12,['derivation'=>'derived']],
    [202,22,['origin'=>'URBE']],
    [101,12,['inst'=>'CUPAE']],
    [202,22,['origin'=>'URBE','derivation'=>'derived','status'=>'Proceso']],
    [101,12,['status'=>'Proceso']],
    [101,12,['search'=>'20001']],
    [101,12,['search'=>'URBE']],
    [101,12,['search'=>'URBE','inst'=>'CUPAE','status'=>'Proceso']],
    [101,12,['search'=>'NONEXISTENT-REF']],
] as [$uid,$iid,$criteria]) {
    $expected = array_values(array_filter(
        $model->getAllForms($uid,$iid)['list'],
        static fn($row) => UserFormsFilterService::matches(
            $row, UserFormsFilterService::validateFilters($criteria))
    ));
    $page = $service->page($uid,$iid,$criteria,12,0);
    if ($page['total'] !== count($expected)
        || array_column($page['list'],'idformA') !==
           array_column(array_slice($expected,0,12),'idformA')) {
        throw new RuntimeException('5k fixture result parity violated: '.json_encode($criteria));
    }
}
echo "GROBO_MYFORMS_SQL_PREFILTER_5K_PARITY_OK cases=9\n";
echo 'GROBO_MYFORMS_FILTER_SYNTHETIC_MYSQL_BENCH '
    . json_encode(['fixture_rows'=>5000,'results'=>$bench],
        JSON_INVALID_UTF8_SUBSTITUTE|JSON_UNESCAPED_UNICODE) . PHP_EOL;
