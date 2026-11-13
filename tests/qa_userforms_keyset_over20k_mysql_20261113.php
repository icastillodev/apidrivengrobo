<?php
/**
 * QA exclusivo grobo_myforms_fixture: 21.030 formularios visibles y búsqueda
 * por keyset sin límite artificial de exportación (20.000).
 * Fuente de datos: qa_userforms_large_history_mysql_20261113.php
 */
declare(strict_types=1);
require __DIR__.'/qa_userforms_large_history_mysql_20261113.php';

use App\Services\UserForms\UserFormsFilterService;

if ($model->countVisibleCanonicalForms(101,12)!==13030) {
    throw new RuntimeException('KEYSET_BASE_FIXTURE_MISSING');
}
$add=$db->prepare(
    "INSERT INTO formularioe
     (idformA,IdUsrA,IdInstitucion,tipoA,depto,fechainicioA,fecRetiroA,
      estado,EstadoWorkflow,DerivadoActivo,IdInstitucionOrigen)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)"
);
$db->beginTransaction();
for($i=0;$i<8000;$i++) {
    $add->execute([70000+$i,101,12,1,1,'2026-11-01','2026-11-05',
        'Proceso',null,0,null]);
}
$db->commit();

$count=$model->countVisibleCanonicalForms(101,12);
requireFixture($count===21030, 'Keyset count capped at 20k or lost new forms');

$seen=[];
$last=PHP_INT_MAX;
do {
    $ids=$model->getVisibleCanonicalIdWindow(101,12,$last,100);
    foreach($ids as $id) {
        requireFixture($id<$last && !isset($seen[$id]),
            'Keyset lost strict descending ordering or duplicated ID');
        $seen[$id]=true;
        $last=$id;
    }
} while(count($ids)===100);
requireFixture(count($seen)===21030
    && isset($seen[40424],$seen[1002],$seen[1001],$seen[77999]),
    'Keyset silently truncated or lost derived source IDs');
requireFixture($model->getVisibleCanonicalIdWindow(999,33)===[],
    'Keyset leaked unrelated institution');

$service=new UserFormsFilterService($model);
$selective=$service->page(101,12,['search'=>'PROTO-LOTE-40424'],12,0);
requireFixture($selective['total']===1
    && (int)($selective['list'][0]['idformA']??0)===40424,
    'Free text after 20k limit lost derived snapshot');

$none=$service->page(101,12,['search'=>'NO-RESULTS-THIS-WORD'],12,0);
requireFixture($none['total']===0 && $none['list']===[],
    'Free text after 20k limit did not return empty results');

try {
    $model->getVisibleCanonicalIds(101,12,20000);
    throw new RuntimeException('CSV 20k cap was bypassed');
} catch (LengthException $expected) {}

echo 'GROBO_MYFORMS_KEYSET_ABOVE_20K_MYSQL_OK '
    .json_encode([
        'visible_forms'=>$count,
        'keyset_unique_ids'=>count($seen),
        'selective_total'=>$selective['total'],
        'no_match_total'=>$none['total'],
        'outside_tenant_access'=>0,
        'csv_export_cap_intact'=>true,
    ]).PHP_EOL;
