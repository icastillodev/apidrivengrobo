<?php
/**
 * GROBO QA MySQL 8.4 aislado: no multiplicar filas por departamentos del
 * protocolo cuando formularioe.depto ya resuelve su propio departamento.
 * No usa ni toca base productiva.
 */
declare(strict_types=1);
require __DIR__.'/qa_userforms_mysql_integration_20261112.php';
require __DIR__.'/bench_userforms_mysql_20261112.php';

use App\Services\UserForms\UserFormsFilterService;

$insert=$db->prepare('INSERT INTO protformr (idformA,idprotA) VALUES (?,?)');
$db->beginTransaction();
$added=0;
for($i=0;$i<5000;$i++){
 if($i%2!==0 && $i%5!==0) {
  $insert->execute([20000+$i,12]);
  $added++;
 }
}
$db->commit();

$sqlOld="SELECT f.idformA,
 COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '---') AS Departamento
 FROM formularioe f
 LEFT JOIN protformr pf ON f.idformA=pf.idformA
 LEFT JOIN protocoloexpe px ON pf.idprotA=px.idprotA
 LEFT JOIN protdeptor pd ON px.idprotA=pd.idprotA
 LEFT JOIN departamentoe dp ON pd.iddeptoA=dp.iddeptoA
 LEFT JOIN departamentoe d ON f.depto=d.iddeptoA
 WHERE f.IdUsrA=101
 AND NOT EXISTS (
   SELECT 1 FROM formulario_derivacion fd_copy
   WHERE fd_copy.idformA=f.idformA
     AND fd_copy.idformAOrigen IS NOT NULL
     AND fd_copy.idformAOrigen<>fd_copy.idformA
 )
 ORDER BY f.idformA DESC";
$sqlNew="SELECT f.idformA,
 COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '---') AS Departamento
 FROM formularioe f
 LEFT JOIN protformr pf ON f.idformA=pf.idformA
 LEFT JOIN protocoloexpe px ON pf.idprotA=px.idprotA
 LEFT JOIN departamentoe d ON f.depto=d.iddeptoA
 LEFT JOIN protdeptor pd ON px.idprotA=pd.idprotA
                        AND d.NombreDeptoA IS NULL
 LEFT JOIN departamentoe dp ON pd.iddeptoA=dp.iddeptoA
 WHERE f.IdUsrA=101
 AND NOT EXISTS (
   SELECT 1 FROM formulario_derivacion fd_copy
   WHERE fd_copy.idformA=f.idformA
     AND fd_copy.idformAOrigen IS NOT NULL
     AND fd_copy.idformAOrigen<>fd_copy.idformA
 )
 ORDER BY f.idformA DESC";

$old=$db->query($sqlOld)->fetchAll(PDO::FETCH_ASSOC);
$new=$db->query($sqlNew)->fetchAll(PDO::FETCH_ASSOC);
$oldUnique=[];$newUnique=[];
foreach($old as $row) { $id=(int)$row['idformA'];$oldUnique[$id] ??= $row; }
foreach($new as $row) { $id=(int)$row['idformA'];$newUnique[$id] ??= $row; }
requireFixture($oldUnique===$newUnique,
 'A canonical form changed department when skipping fanout');
requireFixture(count($old)>count($new)+1000,
 'Synthetic multi-department protocol did not create appreciable row fanout');
requireFixture(count($new)===count($newUnique),
 'Unexpected new duplicate rows when primary department is set');

$owned=$model->getAllForms(101,12);
requireFixture(count($owned['list'])===4005,'Canonical owner count wrong');
requireFixture(array_column($owned['list'],'idformA')===array_keys($newUnique),
 'Canonical IDs or ordering changed');
$indexed=[];
foreach($owned['list'] as $form)$indexed[(int)$form['idformA']]=$form;
requireFixture($indexed[1002]['TipoPedido']==='Solicitud original de animales'
 && $indexed[1002]['Protocolo']==='PROTO-ORIGINAL - Cientifico'
 && (float)$indexed[1002]['falta_pagar']===55.0,
 'Snapshot or payable amount changed');
requireFixture($model->getAllForms(303,33)['list'][0]['idformA']===1003,
 'Tenant private form changed');

$service=new UserFormsFilterService($model);
$filters=['search'=>'Departamento','inst'=>'URBE'];
$page=$service->page(202,22,$filters,12,0);
$expect=array_values(array_filter($model->getAllForms(202,22)['list'],
    static fn($form)=>UserFormsFilterService::matches(
        $form,UserFormsFilterService::validateFilters($filters))));
requireFixture($page['total']===count($expect)
 && array_column($page['list'],'idformA')===
    array_column(array_slice($expect,0,12),'idformA'),
 'Combined filter/tenant visibility changed');

// Cuando el departamento propio no existe, la consulta debe conservar
// TODAS las opciones fallback que existían en protdeptor, no omitirlas.
$db->exec('UPDATE formularioe SET depto=NULL WHERE idformA=1002');
$oldFallback=$db->query($sqlOld)->fetchAll(PDO::FETCH_ASSOC);
$newFallback=$db->query($sqlNew)->fetchAll(PDO::FETCH_ASSOC);
$oldRows=array_values(array_filter($oldFallback,
    static fn($row)=>(int)$row['idformA']===1002));
$newRows=array_values(array_filter($newFallback,
    static fn($row)=>(int)$row['idformA']===1002));
usort($oldRows,static fn($a,$b)=>strcmp((string)$a['Departamento'],(string)$b['Departamento']));
usort($newRows,static fn($a,$b)=>strcmp((string)$a['Departamento'],(string)$b['Departamento']));
requireFixture($oldRows===$newRows && count($newRows)===2,
 'Fallback department rows changed when primary department is missing');
$db->exec('UPDATE formularioe SET depto=1 WHERE idformA=1002');

function joinSample(PDO $db,string $sql,int $runs=7):array{
 $samples=[];
 for($i=0;$i<$runs;$i++){
  $t=hrtime(true);
  $rows=$db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
  $samples[]=round((hrtime(true)-$t)/1000000,2);
 }
 sort($samples,SORT_NUMERIC);
 return ['p50_ms'=>$samples[(int)ceil($runs/2)-1],
  'p95_ms'=>$samples[$runs-1], 'rows_returned'=>count($rows),'runs'=>$runs];
}
$benchOld=joinSample($db,$sqlOld);
$benchNew=joinSample($db,$sqlNew);
echo 'GROBO_MYFORMS_PROTOCOL_JOIN_MYSQL_OK '.json_encode([
 'synthetic_visible'=>count($newUnique),
 'synthetic_form_protocol_assignments'=>$added,
 'rows_before'=>count($old),
 'rows_after'=>count($new),
 'fallback_exact'=>true,
 'permissions_snapshots_payments'=>true,
 'projection_sql_only_bench'=>['old'=>$benchOld,'new'=>$benchNew],
],JSON_UNESCAPED_UNICODE).PHP_EOL;
