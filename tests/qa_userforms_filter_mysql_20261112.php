<?php
/** Filtros globales de Mis Formularios, MySQL 8.4 aislado y datos ficticios. */
declare(strict_types=1);
require_once __DIR__ . '/qa_userforms_mysql_integration_20261112.php';

use App\Services\UserForms\UserFormsFilterService;

$service = new UserFormsFilterService($model);
function filterIds(UserFormsFilterService $service, int $userId, int $instId, array $filters): array {
    $result = $service->page($userId,$instId,$filters,12,0);
    return array_map('intval', array_column($result['list'],'idformA'));
}

requireFixture(filterIds($service,202,22,['derivation'=>'derived']) === [1005,1002],
    'Derived source/destination forms incorrect');
requireFixture(filterIds($service,202,22,['derivation'=>'local']) === [1004],
    'Local forms incorrect');
requireFixture(filterIds($service,202,22,['origin'=>'URBE']) === [1005,1002],
    'Origin filter missing derived forms');
echo "PASS derived/local/origin exact filters\n";

requireFixture(filterIds($service,202,22,['inst'=>'URBE']) === [1005,1002],
    'Participant institution filter wrong');
requireFixture(filterIds($service,202,22,['inst'=>'CUPAE']) === [1005,1004,1002],
    'Destination institution filter wrong');
requireFixture(filterIds($service,303,33,['inst'=>'CUPAE']) === [],
    'Cross-institution filtering leaked private records');
echo "PASS cross-institution participant name and scope filters\n";

requireFixture(filterIds($service,202,22,['search'=>'PROTO-ORIGINAL']) === [1002],
    'Search should match original protocol snapshot');
requireFixture(filterIds($service,202,22,['search'=>'solicitud ORIGINAL']) === [1002],
    'Search should be Unicode case-insensitive');
requireFixture(filterIds($service,202,22,['search'=>'Cientifico']) === [1002],
    'Original protocol title missing from indexed search');
requireFixture(filterIds($service,202,22,['search'=>'1002 2026-11-02']) === [1002],
    'Legacy search token alignment across columns changed');
requireFixture(filterIds($service,202,22,['search'=>'1004']) === [1004],
    'ID search wrong');
echo "PASS global ID, snapshots and nested searchable values\n";

requireFixture(filterIds($service,101,12,['status'=>'Entregado']) === [1008,1006,1001],
    'Status filter changed');
requireFixture(filterIds($service,202,22,['status'=>'Proceso','derivation'=>'derived','inst'=>'URBE'])
    === [1005,1002], 'Combined status/derived/institution filter wrong');
requireFixture(filterIds($service,202,22,['origin'=>'URBE','inst'=>'PRIVATE']) === [],
    'Combined filter wrongly returned unrelated tenant');
echo "PASS combined status/institution/derivation semantics\n";

$first = $service->page(202,22,[],2,0);
$second = $service->page(202,22,[],2,2);
$pastEnd = $service->page(202,22,['search'=>'no such record'],2,2);
requireFixture($first['total']===3 && $first['limit']===2 && $first['offset']===0,
    'Page metadata incorrect');
requireFixture(array_column($first['list'],'idformA') === [1005,1004],
    'First page order incorrect');
requireFixture(array_column($second['list'],'idformA') === [1002] && $second['total']===3,
    'Last page incorrect');
requireFixture($pastEnd['total']===0 && $pastEnd['list']===[],
    'Empty filter result incorrect');
echo "PASS pagination and empty result metadata\n";

foreach ([
    ['search'=>str_repeat('x',161)],
    ['derivation'=>'x'],
    ['inst'=>['CUPAE']],
    ['status'=>"\x01Process"],
] as $input) {
    try {
        $service->page(202,22,$input);
        throw new RuntimeException('Invalid filter accepted');
    } catch (InvalidArgumentException $expected) {}
}
echo "PASS invalid search, derivation and array inputs rejected\n";

$db->exec("INSERT INTO formularioe (
    idformA,IdUsrA,IdInstitucion,tipoA,depto,fechainicioA,fecRetiroA,estado,EstadoWorkflow,DerivadoActivo,IdInstitucionOrigen
) VALUES (1009,101,12,1,1,'2026-11-09','2026-11-11',NULL,NULL,0,NULL)");
requireFixture(filterIds($service,101,12,['status'=>'Sin estado']) === [1009],
    'Empty status normalization changed');
echo "PASS null status normalization preserves Sin estado\n";

echo "GROBO_USERFORMS_FILTER_MYSQL_QA_OK checks=7\n";
