<?php
/**
 * Read-only full UserFormsModel::getAllForms A/B on a preseeded fixture.
 * No mutation, no institution credentials. Requires 4005 visible, 2000
 * protformr links created by qa_userforms_protocol_join_mysql_20261113.php.
 */
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Models\UserForms\UserFormsModel;

$dsn=(string)(getenv('GROBO_QA_MYSQL_DSN') ?: '');
if(getenv('GROBO_QA_MYSQL_ISOLATED')!=='yes'
    || !str_contains($dsn,'dbname=grobo_myforms_fixture;')) {
    throw new RuntimeException('QA_ISOLATED_ONLY');
}
$db=new PDO($dsn,getenv('GROBO_QA_MYSQL_USER') ?: 'root',
    getenv('GROBO_QA_MYSQL_PASSWORD') ?: '',[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false,
]);
if($db->query('SELECT DATABASE()')->fetchColumn()!=='grobo_myforms_fixture') {
    throw new RuntimeException('WRONG_DATABASE');
}
$amount=(int)$db->query('SELECT COUNT(*) FROM protformr
    WHERE idformA BETWEEN 20000 AND 24999 AND idprotA=12')->fetchColumn();
if($amount!==2000)throw new RuntimeException('QA_FANOUT_FIXTURE_REQUIRED '.$amount);
$model=new UserFormsModel($db);
$elapsed=[];
$hash='';
for($i=0;$i<11;$i++){
    $start=hrtime(true);
    $data=$model->getAllForms(101,12);
    $elapsed[]=round((hrtime(true)-$start)/1e6,2);
    if(count($data['list'])!==4005)throw new RuntimeException('CANONICAL_COUNT_CHANGED');
    $canonical=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    $nextHash=hash('sha256',$canonical);
    if($hash!==''&&$nextHash!==$hash)throw new RuntimeException('NONDETERMINISTIC_QA');
    $hash=$nextHash;
    unset($data,$canonical);
}
sort($elapsed,SORT_NUMERIC);
echo 'GROBO_MYFORMS_FANOUT_FULL_MODEL_BENCH '
    .json_encode([
      'visible_forms'=>4005,'protocol_links'=>2000,
      'full_json_sha256'=>$hash,
      'p50_ms'=>$elapsed[5],
      'p95_ms'=>$elapsed[10],
      'php_peak_mb'=>round(memory_get_peak_usage(true)/1048576,2),
      'runs'=>11
    ],JSON_UNESCAPED_UNICODE).PHP_EOL;
