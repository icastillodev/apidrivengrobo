<?php
/** Verifica historiales grandes exclusivamente en grobo_myforms_fixture aislada. */
declare(strict_types=1);
require __DIR__.'/qa_userforms_mysql_integration_20261112.php';

use App\Services\UserForms\UserFormsFilterService;

$insert=$db->prepare(
  'INSERT INTO formularioe
   (idformA,IdUsrA,IdInstitucion,tipoA,depto,fechainicioA,
    fecRetiroA,estado,EstadoWorkflow,DerivadoActivo,IdInstitucionOrigen)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)'
);
$insertDeriv=$db->prepare(
  'INSERT INTO formulario_derivacion
   (IdFormularioDerivacion,idformA,idformAOrigen,
    IdInstitucionOrigen,IdInstitucionDestino,Activo,IdUsrDestinoResponsable,
    estado_origen,estado_destino) VALUES (?,?,?,?,?,?,?,?,?)'
);
$insertSnap=$db->prepare(
  'INSERT INTO formulario_datos_originales
   (IdFormularioDerivacion,idformA,datos_json) VALUES (?,?,?)'
);
$db->beginTransaction();
for ($i=0; $i<6500; $i++) {
    $fid=30000+$i;
    $insert->execute([
        $fid,101,12,1,1,'2026-11-01','2026-11-05','Proceso',
        null,0,null,
    ]);
}
for ($i=0; $i<425; $i++) {
    $fid=40000+$i;
    $did=50000+$i;
    $insert->execute([
        $fid,101,12,1,1,'2026-11-02','2026-11-06','Proceso',
        'DERIVADO',1,12,
    ]);
    $insertDeriv->execute([
        $did,$fid,null,12,22,1,202,'Proceso','Proceso',
    ]);
    $insertSnap->execute([
        $did,$fid,json_encode([
            'nombreTipo'=>'Pedido original '. $fid,
            'categoria'=>'Animal',
            'header'=>[
                'nprotA'=>'PROTO-LOTE-'.$fid,
                'TituloProtocolo'=>'Ensayo canónico',
                'NombreDeptoA'=>'Departamento histórico',
                'NombreOrganismoSimple'=>'Organismo histórico',
            ]
        ],JSON_UNESCAPED_UNICODE),
    ]);
}
$db->commit();

$start=hrtime(true);
$all=$model->getAllForms(101,12);
$elapsed=round((hrtime(true)-$start)/1000000,2);
$ids=array_map('intval',array_column($all['list'],'idformA'));
$canonical=$model->getVisibleCanonicalIds(101,12,20000);
requireFixture(count($ids)===6930,
    'Large owner history size changed: '.count($ids));
requireFixture($ids===$canonical,'Large full history canonical ID order differs');
requireFixture(count(array_unique($ids))===count($ids),
    'Protocol/departments joins duplicated canonical forms');
requireFixture($ids[0]===40424 && $ids[count($ids)-1]===1001,
    'First and last canonical IDs changed');

$indexed = [];
foreach($all['list'] as $row) $indexed[(int)$row['idformA']]=$row;
foreach ([40000,40399,40424] as $fid) {
    $row=$indexed[$fid] ?? null;
    requireFixture($row!==null && $row['TipoPedido']==='Pedido original '.$fid
        && $row['Protocolo']==='PROTO-LOTE-'.$fid.' - Ensayo canónico',
        'Original snapshot lost after 400-ID batch boundary: '.$fid);
    requireFixture(count($row['institucionesParticipantes'])===2,
        'Participant route missing after 6000-row batch boundary: '.$fid);
}
requireFixture(count($indexed[30000]['institucionesParticipantes'])===1,
    'Local forms unexpectedly acquired cross-institution participants');

$recipient=$model->getAllForms(202,22);
requireFixture(count($recipient['list'])===428,
    'Recipient visibility differs with 425 new derivations');
requireFixture((int)$recipient['list'][0]['idformA']===40424,
    'Recipient canonical order changed');

$service=new UserFormsFilterService($model);
$page=$service->page(101,12,['search'=>'PROTO-LOTE-40424'],12,0);
requireFixture($page['total']===1
    && (int)$page['list'][0]['idformA']===40424,
    'Free-text search lost a derived original snapshot in large history');
$last=$service->page(101,12,['search'=>'Proceso'],12,6000);
requireFixture($last['total']>=6000 && count($last['list'])===12,
    'Large global search lost offset/page semantics');

// Forzar también el camino de >12.000 fichas: los participantes deben
// resolverse en lotes de 2.000 sin perder accesos entre instituciones.
$db->beginTransaction();
for ($i=0; $i<6100; $i++) {
    $insert->execute([
        60000+$i,101,12,1,1,'2026-11-01','2026-11-05',
        'Proceso',null,0,null,
    ]);
}
$db->commit();

$highStarted=hrtime(true);
$huge=$model->getAllForms(101,12);
$highElapsed=round((hrtime(true)-$highStarted)/1000000,2);
$hugeIds=array_map('intval',array_column($huge['list'],'idformA'));
requireFixture(count($hugeIds)===13030,
    'High-volume batch history lost canonical IDs: '.count($hugeIds));
requireFixture($hugeIds===$model->getVisibleCanonicalIds(101,12,20000),
    'High-volume canonical order differs after participant batches');
requireFixture(count($hugeIds)===count(array_unique($hugeIds)),
    'High-volume duplicates returned after deduplication');
requireFixture($hugeIds[0]===66099 && end($hugeIds)===1001,
    'High-volume first/last IDs incorrect');
$mapped=[];
foreach($huge['list'] as $row) {
    if (in_array((int)$row['idformA'],[1002,40000,40399,40424],true)) {
        $mapped[(int)$row['idformA']]=$row;
    }
}
foreach([1002,40000,40399,40424] as $fid) {
    requireFixture(count($mapped[$fid]['institucionesParticipantes'] ?? [])===2,
        'High-volume cross-institution route lost in participant chunk: '.$fid);
}
requireFixture($mapped[40424]['TipoPedido']==='Pedido original 40424',
    'High-volume original snapshot overwritten');
unset($huge,$mapped);

echo 'GROBO_MYFORMS_LARGE_HISTORY_MYSQL_OK '
    .json_encode([
        'medium_forms'=>count($ids),
        'huge_forms'=>count($hugeIds),
        'snapshot_forms'=>425,
        'recipient_visible'=>count($recipient['list']),
        'first'=>$hugeIds[0],
        'last'=>end($hugeIds),
        'medium_hydration_ms'=>$elapsed,
        'huge_hydration_ms'=>$highElapsed,
        'php_peak_mb'=>round(memory_get_peak_usage(true)/1048576,2),
    ],JSON_UNESCAPED_UNICODE).PHP_EOL;
