<?php
/**
 * Benchmark: no prepara fixture; requiere 13030 fichas sintéticas existentes
 * en grobo_myforms_fixture. No permite DSN productivo.
 */
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Models\UserForms\UserFormsModel;
use App\Services\UserForms\UserFormsFilterService;

$dsn=(string)(getenv('GROBO_QA_MYSQL_DSN') ?: '');
if (getenv('GROBO_QA_MYSQL_ISOLATED')!=='yes'
    || !str_contains($dsn,'dbname=grobo_myforms_fixture;')) {
    throw new RuntimeException('ISOLATED_MYSQL_ONLY');
}
function qaDb(): PDO {
    $db=new PDO((string)getenv('GROBO_QA_MYSQL_DSN'),
        getenv('GROBO_QA_MYSQL_USER') ?: 'root',
        getenv('GROBO_QA_MYSQL_PASSWORD') ?: '',[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false
        ]);
    if($db->query('SELECT DATABASE()')->fetchColumn()!=='grobo_myforms_fixture'){
        throw new RuntimeException('WRONG_DATABASE');
    }
    return $db;
}
$mode=$argv[1] ?? '';
if ($mode==='--worker') {
    $variant=$argv[2] ?? '';
    if(!in_array($variant,['legacy','keyset'],true)){
        throw new RuntimeException('INVALID_BENCH_VARIANT');
    }
    $db=qaDb();
    $model=new UserFormsModel($db);
    if($model->countVisibleCanonicalForms(101,12)!==13030){
        throw new RuntimeException('FIXTURE_13030_REQUIRED');
    }
    $filters=UserFormsFilterService::validateFilters(['search'=>'PROTO-LOTE-40424']);
    $start=hrtime(true);
    if($variant==='legacy'){
        $raw=$model->getAllForms(101,12);
        $matching=[];
        foreach($raw['list'] as $form) {
            if (UserFormsFilterService::matches($form,$filters)) {
                $matching[]=$form;
            }
        }
        $result=['total'=>count($matching),'list'=>array_slice($matching,0,12)];
    } else {
        $result=(new UserFormsFilterService($model))->page(101,12,$filters,12,0);
    }
    echo json_encode([
        'mode'=>$variant,
        'time_ms'=>round((hrtime(true)-$start)/1e6,2),
        'peak_memory_mb'=>round(memory_get_peak_usage(true)/1048576,2),
        'matched'=>$result['total'],
        'ids'=>array_map('intval',array_column($result['list'],'idformA')),
    ],JSON_UNESCAPED_UNICODE).PHP_EOL;
    exit(0);
}
if($mode!=='--benchmark')throw new RuntimeException('BENCHMARK_MODE_REQUIRED');
$db=qaDb();
$model=new UserFormsModel($db);
if($model->countVisibleCanonicalForms(101,12)!==13030){
    throw new RuntimeException('FIXTURE_13030_REQUIRED');
}
$results=[];
foreach(['legacy','keyset'] as $variant){
    $cmd=[PHP_BINARY,__FILE__,'--worker',$variant];
    $pipes=[];
    $proc=proc_open($cmd,[
        0=>['file','/dev/null','r'],
        1=>['pipe','w'],
        2=>['pipe','w']
    ],$pipes,dirname(__DIR__));
    if (!is_resource($proc)) throw new RuntimeException('BENCH_WORKER_START_FAILED');
    $stdout=stream_get_contents($pipes[1]);
    $stderr=stream_get_contents($pipes[2]);
    fclose($pipes[1]);fclose($pipes[2]);
    if (proc_close($proc)!==0){
        throw new RuntimeException('BENCH_WORKER_FAILED:'.substr($stderr,0,400));
    }
    $data=json_decode($stdout,true);
    if(!is_array($data))throw new RuntimeException('BENCH_BAD_JSON');
    $results[$variant]=$data;
}
if($results['legacy']['matched']!==$results['keyset']['matched']
    || $results['legacy']['ids']!==$results['keyset']['ids']){
    throw new RuntimeException('SEARCH_LEGACY_KEYSET_PARITY_FAILED');
}
echo 'GROBO_MYFORMS_KEYSET_MEMORY_BENCH '
    .json_encode(['synthetic_forms'=>13030,'results'=>$results],
        JSON_UNESCAPED_UNICODE).PHP_EOL;
