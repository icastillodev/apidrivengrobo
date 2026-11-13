<?php
/**
 * QA DE RENDIMIENTO DE ESCRITURAS: exclusivamente grobo_myforms_fixture
 * en MySQL 8.4 efímero y red Docker interna.
 * Compara 500 UPDATE autocommit individuales, serial y desde dos procesos,
 * antes y después de instalar los 39 triggers de epoch.
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\UserForms\UserFormsSearchIndexSchema;
use App\Models\UserForms\UserFormsSearchIndexStore;

$dsn=(string)(getenv('GROBO_QA_MYSQL_DSN') ?: '');
if (getenv('GROBO_QA_MYSQL_ISOLATED') !== 'yes'
    || !str_contains($dsn,'dbname=grobo_myforms_fixture;')) {
    throw new RuntimeException('ISOLATED_FIXTURE_ONLY');
}
function fixtureDb(): PDO {
    $db=new PDO((string)getenv('GROBO_QA_MYSQL_DSN'),
        getenv('GROBO_QA_MYSQL_USER') ?: 'root',
        getenv('GROBO_QA_MYSQL_PASSWORD') ?: '',[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false,
        ]);
    if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'grobo_myforms_fixture') {
        throw new RuntimeException('WRONG_DATABASE');
    }
    return $db;
}
if (($argv[1] ?? '') === '--worker') {
    $kind = $argv[2] ?? '';
    $count = (int)($argv[3] ?? 0);
    if (!in_array($kind,['serial','left','right'],true)
        && !preg_match('/^p([48])_([0-7])$/', $kind)) {
        throw new RuntimeException('BAD_WORKER');
    }
    if ($count < 1 || $count > 1000) throw new RuntimeException('BAD_WORKER');
    $db=fixtureDb();
    $update=$db->prepare(
        "UPDATE formularioe SET estado =
          CASE WHEN estado='Proceso' THEN 'Entregado' ELSE 'Proceso' END
          WHERE idformA=?"
    );
    $begin=hrtime(true);
    for ($i=0;$i<$count;$i++) {
        if (preg_match('/^p([48])_([0-7])$/', $kind, $match)) {
            $perWorker = (int)$match[1] === 8 ? 60 : 125;
            $id = 30000 + (int)$match[2]*$perWorker + ($i%$perWorker);
        } else {
            $id=30000+($kind==='right' ? 250 : 0)
                +($i%($kind==='serial'?500:250));
        }
        $update->execute([$id]);
        if ($update->rowCount()!==1) throw new RuntimeException('WRONG_WRITE_COUNT');
    }
    echo 'WORKER_OK ' . json_encode([
        'writes'=>$count,'ms'=>round((hrtime(true)-$begin)/1e6,2),
    ]) . PHP_EOL;
    exit(0);
}
if (($argv[1] ?? '') !== '--benchmark') {
    throw new RuntimeException('BENCHMARK_OR_WORKER_FLAG_REQUIRED');
}
require __DIR__.'/qa_userforms_mysql_integration_20261112.php';
$insert=$db->prepare(
    "INSERT INTO formularioe
       (idformA,IdUsrA,IdInstitucion,tipoA,depto,
        fechainicioA,fecRetiroA,estado,EstadoWorkflow,DerivadoActivo,IdInstitucionOrigen)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)"
);
$db->beginTransaction();
foreach (range(30000,30499) as $id) {
    $insert->execute([$id,101,12,1,1,'2026-11-01','2026-11-05',
        'Proceso',null,0,null]);
}
$db->commit();

function workerBatch(array $workers): float {
    $processes=[];
    $started=hrtime(true);
    foreach ($workers as [$role,$count]) {
        $cmd=[PHP_BINARY,__FILE__,'--worker',$role,(string)$count];
        $desc=[
            0=>['file','/dev/null','r'],
            1=>['pipe','w'],
            2=>['pipe','w'],
        ];
        $pipes=[];
        $proc=proc_open($cmd,$desc,$pipes,dirname(__DIR__));
        if (!is_resource($proc)) throw new RuntimeException('Cannot launch isolated QA worker');
        $processes[]=[$proc,$pipes];
    }
    foreach ($processes as [$proc,$pipes]) {
        $output=stream_get_contents($pipes[1]);
        $error=stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        if (proc_close($proc)!==0 || !str_contains($output,'WORKER_OK')) {
            throw new RuntimeException('QA worker failed '.substr($error,0,250));
        }
    }
    return round((hrtime(true)-$started)/1e6,2);
}
function collectWrites(bool $parallel,int $runs=5): array {
    $samples=[];
    for($i=0;$i<$runs;$i++) {
        $workers=$parallel ? [['left',250],['right',250]] : [['serial',500]];
        $samples[]=workerBatch($workers);
    }
    sort($samples,SORT_NUMERIC);
    $p50=$samples[(int)ceil(count($samples)*.5)-1];
    $p95=$samples[(int)ceil(count($samples)*.95)-1];
    return [
        'p50_ms'=>$p50,'p95_ms'=>$p95,
        'ops_per_second'=>round(500000/$p50,1),
        'runs'=>$runs,'writes_each_run'=>500,'workers'=>$parallel?2:1,
    ];
}

function collectWritesMany(int $workerCount,int $runs=5): array {
    $perWorker = $workerCount===8 ? 60 : 125;
    $workers=[];
    for($i=0;$i<$workerCount;$i++){
        $workers[]=['p'.$workerCount.'_'.$i,$perWorker];
    }
    $samples=[];
    for($n=0;$n<$runs;$n++)$samples[]=workerBatch($workers);
    sort($samples,SORT_NUMERIC);
    $p50=$samples[(int)ceil($runs*.5)-1];
    return [
        'p50_ms'=>$p50,
        'p95_ms'=>$samples[(int)ceil($runs*.95)-1],
        'ops_per_second'=>round(($workerCount*$perWorker)*1000/$p50,1),
        'runs'=>$runs,
        'writes_each_run'=>$workerCount*$perWorker,
        'workers'=>$workerCount,
    ];
}

$baselineSingle=collectWrites(false);
$baselineParallel=collectWrites(true);
$baselineEight=collectWritesMany(8);
UserFormsSearchIndexSchema::install($db);
if (!UserFormsSearchIndexSchema::triggersReady($db)) throw new RuntimeException('TRIGGERS_INVALID');
$store=new UserFormsSearchIndexStore($db);
$beforeEpoch=$store->epoch();
$triggerSingle=collectWrites(false);
$triggerParallel=collectWrites(true);
$triggerEight=collectWritesMany(8);
$epoch=$store->epoch();
$expectedEpoch=(5+5)*500 + 5*480;
if($epoch-$beforeEpoch!==$expectedEpoch) {
    throw new RuntimeException('EPOCH_WRITE_COUNT_CHANGED '.$epoch);
}

echo 'GROBO_SEARCH_EPOCH_WRITE_BENCH '
    .json_encode([
        'fixture_rows'=>500,
        'trigger_manifest'=>39,
        'single'=>['baseline'=>$baselineSingle,'triggers'=>$triggerSingle],
        'parallel_2_workers'=>['baseline'=>$baselineParallel,'triggers'=>$triggerParallel],
        'parallel_8_workers'=>['baseline'=>$baselineEight,'triggers'=>$triggerEight],
        'trigger_writes_counted'=>$epoch-$beforeEpoch,
        'lab_only'=>true,
    ],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE)
    .PHP_EOL;
