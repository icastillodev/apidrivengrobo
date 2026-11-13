<?php
/** Benchmark del índice materializado, exclusivamente MySQL ficticio/aislado. */
declare(strict_types=1);
require __DIR__ . '/bench_userforms_mysql_20261112.php';

use App\Models\UserForms\UserFormsSearchIndexSchema;
use App\Models\UserForms\UserFormsSearchIndexStore;
use App\Services\UserForms\UserFormsSearchIndexBuilder;
use App\Services\UserForms\UserFormsFilterService;

UserFormsSearchIndexSchema::install($db);
$store = new UserFormsSearchIndexStore($db);
$builder = new UserFormsSearchIndexBuilder($model,$store);
$built = $builder->rebuild();
if ($built['documents'] !== 5007) {
    throw new RuntimeException('Expected 5007 canonical forms in 5k benchmark, got '.$built['documents']);
}
$service = new UserFormsFilterService($model);

function runSearchBench(UserFormsFilterService $service, string $query, string $featureFlag,
    int $runs = 11): array
{
    putenv('GROBO_MYFORMS_SEARCH_INDEX='.$featureFlag);
    $elapsed = [];
    $result = null;
    for ($i=0;$i<$runs;$i++) {
        $start=hrtime(true);
        $result=$service->page(101,12,['search'=>$query],12,0);
        $elapsed[]=(hrtime(true)-$start)/1000000;
    }
    sort($elapsed);
    return [
        'total'=>$result['total'],'rows'=>array_map('intval',array_column($result['list'],'idformA')),
        'p50_ms'=>round($elapsed[(int)ceil($runs*.5)-1],2),
        'p95_ms'=>round($elapsed[(int)ceil($runs*.95)-1],2),
        'runs'=>$runs,
    ];
}
$queries=['20001','NONEXISTENT-MARKER-FOR-SEARCH','PROTO-ORIGINAL','URBE'];
$summary=[];
foreach ($queries as $term) {
    $legacy=runSearchBench($service,$term,'0');
    $indexed=runSearchBench($service,$term,'1');
    if ($indexed['total']!==$legacy['total'] || $indexed['rows']!==$legacy['rows']) {
        throw new RuntimeException('Indexed result not identical to legacy: '.$term);
    }
    $summary[$term]=[
        'legacy'=>$legacy,
        'indexed'=>$indexed,
    ];
}
echo 'GROBO_MYFORMS_MATERIALIZED_SEARCH_5K_BENCH '
    . json_encode([
        'documents'=>$built['documents'],
        'build_ms'=>$built['elapsed_ms'],
        'results'=>$summary,
    ],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE).PHP_EOL;
