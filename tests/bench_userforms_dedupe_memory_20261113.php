<?php
/**
 * Benchmark del patrón JOIN duplicado. Exclusivamente DB ficticia Docker.
 * No usa datos institucionales ni cambia esquema de producción.
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

$dsn = (string)getenv('GROBO_QA_MYSQL_DSN');
if (getenv('GROBO_QA_MYSQL_ISOLATED') !== 'yes'
    || !str_contains($dsn,'dbname=grobo_myforms_fixture;')) {
    throw new RuntimeException('QA_ISOLATED_DATABASE_ONLY');
}
if (($argv[1] ?? '') === '--trial') {
    $mode = $argv[2] ?? '';
    if (!in_array($mode,['old','stream'],true)) throw new RuntimeException('BAD_TRIAL_MODE');
    $db = new PDO($dsn,getenv('GROBO_QA_MYSQL_USER') ?: 'root',
        getenv('GROBO_QA_MYSQL_PASSWORD') ?: '',[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false,
        ]);
    if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'grobo_myforms_fixture') {
        throw new RuntimeException('INVALID_DATABASE');
    }
    $sql="SELECT f.idformA,f.estado,f.IdInstitucion,f.fechainicioA,
                 f.fecRetiroA,du.dup AS joined_department
          FROM formularioe f
          CROSS JOIN (SELECT 1 AS dup UNION ALL SELECT 2 UNION ALL SELECT 3) du
          WHERE f.IdUsrA=101 AND f.IdInstitucion=12
          ORDER BY f.idformA DESC,du.dup ASC";
    $elapsed=[];
    $ids=[];
    for($round=0;$round<11;$round++) {
        $started=hrtime(true);
        $stmt=$db->query($sql);
        $seen=[];
        $unique=[];
        if($mode==='old') {
            $all=$stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach($all as $row) {
                $fid=(int)$row['idformA'];
                if(isset($seen[$fid])) continue;
                $seen[$fid]=true;
                $unique[]=$row;
            }
            unset($all);
        } else {
            while($row=$stmt->fetch(PDO::FETCH_ASSOC)) {
                $fid=(int)$row['idformA'];
                if(isset($seen[$fid])) continue;
                $seen[$fid]=true;
                $unique[]=$row;
            }
            $stmt->closeCursor();
        }
        $ids=array_map('intval',array_column($unique,'idformA'));
        $elapsed[]=round((hrtime(true)-$started)/1000000,3);
        unset($unique,$seen,$stmt);
    }
    sort($elapsed,SORT_NUMERIC);
    echo json_encode([
        'mode'=>$mode,'unique_rows'=>count($ids),
        'ids_sha256'=>hash('sha256',json_encode($ids)),
        'p50_ms'=>$elapsed[5],'p95_ms'=>$elapsed[10],
        'php_peak_bytes'=>memory_get_peak_usage(true),'runs'=>11,
    ],JSON_UNESCAPED_UNICODE).PHP_EOL;
    exit(0);
}
if (($argv[1] ?? '') !== '--benchmark') throw new RuntimeException('MODE_REQUIRED');
require __DIR__.'/qa_userforms_mysql_integration_20261112.php';
require __DIR__.'/bench_userforms_mysql_20261112.php';
$out=[];
foreach (['old','stream'] as $mode) {
    $cmd=[PHP_BINARY,__FILE__,'--trial',$mode];
    $pipes=[];
    $proc=proc_open($cmd,[0=>['file','/dev/null','r'],
        1=>['pipe','w'],2=>['pipe','w']],$pipes,dirname(__DIR__));
    if(!is_resource($proc)) throw new RuntimeException('Cannot launch QA trial');
    $stdout=stream_get_contents($pipes[1]);
    $stderr=stream_get_contents($pipes[2]);
    fclose($pipes[1]);fclose($pipes[2]);
    $exit=proc_close($proc);
    $data=json_decode($stdout,true);
    if($exit!==0||!is_array($data)) {
        throw new RuntimeException('Trial failed '.$mode.': '.substr($stderr,0,250));
    }
    $out[$mode]=$data;
}
if($out['old']['unique_rows']!==$out['stream']['unique_rows']
    || $out['old']['ids_sha256']!==$out['stream']['ids_sha256']) {
    throw new RuntimeException('DEDUP_PARITY_FAILURE');
}
echo 'GROBO_MYFORMS_JOIN_DEDUP_BENCH '
    .json_encode(['synthetic_forms'=>$out['old']['unique_rows'],
        'join_multiplicity'=>3,'results'=>$out],JSON_UNESCAPED_UNICODE).PHP_EOL;
