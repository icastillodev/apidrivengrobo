<?php
/**
 * Benchmark de filtrado en memoria, NO del SQL completo.
 * Exclusivo de grobo_myforms_fixture, MySQL 8.4 efímero.
 * Compara semántica search-first del código anterior contra structured-first.
 */
declare(strict_types=1);
require_once __DIR__.'/qa_userforms_mysql_integration_20261112.php';
require __DIR__.'/bench_userforms_mysql_20261112.php';

use App\Services\UserForms\UserFormsFilterService as Filter;

$full=$model->getAllForms(101,12);
$forms=$full['list'];
if (count($forms)<4000) throw new RuntimeException('Synthetic fixture missing 4k forms');

function matchesOldSearchFirst(array $form,array $filter): bool
{
    $term=mb_strtolower($filter['search'] ?? '','UTF-8');
    if ($term !== '' && !str_contains(Filter::searchText($form),$term)) {
        return false;
    }
    $withoutText=$filter;
    $withoutText['search']='';
    return Filter::matches($form,$withoutText);
}
function sampleFilterTime(array $forms,array $filters,bool $optimized,int $runs=11): array
{
    $results=[];
    $samples=[];
    for($i=0;$i<$runs;$i++) {
        $start=hrtime(true);
        $ids=[];
        foreach($forms as $form) {
            $match=$optimized
                ? Filter::matches($form,$filters)
                : matchesOldSearchFirst($form,$filters);
            if($match) $ids[]=(int)$form['idformA'];
        }
        $samples[]=round((hrtime(true)-$start)/1e6,3);
        $results=$ids;
    }
    sort($samples,SORT_NUMERIC);
    return [
        'p50_ms'=>$samples[(int)ceil($runs*.5)-1],
        'p95_ms'=>$samples[(int)ceil($runs*.95)-1],
        'matched'=>count($results),
        'ids'=>$results,
        'runs'=>$runs,
    ];
}
$cases=[
    'cross_tenant_institution'=>['search'=>'CUPAE','inst'=>'CUPAE'],
    'derived_status'=>['search'=>'PROTO-ORIGINAL',
                       'derivation'=>'derived','status'=>'Proceso'],
    'rare_institution'=>['search'=>'URBE','inst'=>'CUPAE','status'=>'Proceso'],
    'all_search'=>['search'=>'NONEXISTENT-LAB-TEXT'],
];
$results=[];
foreach($cases as $name=>$source) {
    $filters=Filter::validateFilters($source);
    $before=sampleFilterTime($forms,$filters,false);
    $after=sampleFilterTime($forms,$filters,true);
    if ($before['ids']!==$after['ids']) {
        throw new RuntimeException('Filter parity changed: '.$name);
    }
    unset($before['ids'],$after['ids']);
    $results[$name]=['old_search_first'=>$before,'new_structured_first'=>$after];
}
echo 'GROBO_FILTER_CPU_ORDER_BENCH '
    .json_encode(['synthetic_rows'=>count($forms),'results'=>$results],
        JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE)
    .PHP_EOL;
