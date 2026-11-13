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

// Comprobar equivalencia de IDs y total con el contrato completo anterior.
$cases = [
    [], ['derivation'=>'derived'], ['derivation'=>'local'],
    ['origin'=>'URBE'], ['inst'=>'CUPAE'], ['inst'=>'URBE'],
    ['status'=>'Proceso'], ['status'=>'Entregado'], ['status'=>'Sin estado'],
    ['search'=>'PROTO-ORIGINAL'], ['search'=>'1002 2026-11-02'],
    ['status'=>'Proceso','derivation'=>'derived','inst'=>'URBE'],
    ['origin'=>'URBE','inst'=>'CUPAE','status'=>'Proceso'],
    ['inst'=>'PRIVATE'], ['derivation'=>'local','search'=>'1004'],
    ['search'=>'URBE','status'=>'Entregado'],
    ['search'=>'PROTO-ORIGINAL','derivation'=>'derived','inst'=>'CUPAE'],
    ['search'=>'CUPAE','status'=>'Proceso','origin'=>'URBE'],
    ['search'=>'Biologia','status'=>'Proceso','derivation'=>'derived'],
    ['search'=>'NO-MATCH-2345','inst'=>'URBE','derivation'=>'derived'],
];
foreach ([[101,12],[202,22],[404,22],[303,33],[999,33]] as [$uid,$iid]) {
    $legacy = $model->getAllForms($uid,$iid)['list'];
    foreach ($cases as $filter) {
        $normalized = UserFormsFilterService::validateFilters($filter);
        // Verificar contra el orden ORIGINAL de comparación:
        // búsqueda textual primero, y después filtros estructurados.
        $expected = array_values(array_map('intval', array_column(
            array_values(array_filter($legacy, static function($form) use ($normalized) {
                $term=mb_strtolower($normalized['search'],'UTF-8');
                if ($term !== ''
                    && !str_contains(UserFormsFilterService::searchText($form),$term)) {
                    return false;
                }
                $otherFilters=$normalized;
                $otherFilters['search']='';
                return UserFormsFilterService::matches($form,$otherFilters);
            })), 'idformA')));
        $selected = [];
        foreach ([0,2,4,6] as $offset) {
            $page = $service->page($uid,$iid,$filter,2,$offset);
            requireFixture($page['total'] === count($expected),
                'Total changed in SQL preselection: '.json_encode([$uid,$filter,$offset]));
            array_push($selected,...array_map('intval',array_column($page['list'],'idformA')));
        }
        requireFixture($selected === $expected,
            'Wrong ID order or missing results in SQL preselection: '.json_encode([$uid,$filter]));
    }
}
echo "PASS 100 search-first legacy-vs-filtered combinations with four page offsets\n";

requireFixture($model->getFilteredCandidateIds(202,22,['derivation'=>'derived']) === [1005,1002],
    'SQL preselection for derived forms did not return exact possible IDs');
requireFixture($model->getFilteredCandidateIds(202,22,['origin'=>'URBE']) === [1005,1002],
    'SQL preselection for origin is missing a derived form');
requireFixture($model->getFilteredCandidateIds(202,22,['status'=>'Proceso','inst'=>'URBE'])
    === [1005,1002], 'Combined SQL candidate selection differs from original scope');
requireFixture($model->getFilteredCandidateIds(202,22,['search'=>'1002']) === null,
    'Search-only must retain full semantic safety (no lossy SQL prefilter)');
requireFixture($model->getFilteredCandidateIds(202,22,['status'=>'Proceso']) === null,
    'Common unselective status should avoid additional SQL query');
requireFixture($model->getFilteredCandidateIds(303,33,['inst'=>"URBE' OR 1=1 --"]) === [],
    'Malformed institution label should never become executable SQL');
requireFixture($model->getFilteredCandidateIds(202,22,['derivation'=>'derived'],1) === null,
    'Threshold fallback should avoid a partial list of candidates');
requireFixture($model->getFilteredCandidateIds(303,33,['inst'=>'URBE']) === [],
    'SQL preselection crossed institution boundary');
echo "PASS bounded, parametric SQL candidate selection and safe fallback\n";

// Ruta rápida de búsqueda exacta opcional. El ID siempre pasa por
// getAllForms, que vuelve a exigir el WHERE de usuario e institución.
requireFixture(filterIds($service,202,22,['search'=>'#1002']) === [1002],
    'Exact ID should find derived original form');
requireFixture(filterIds($service,101,12,['search'=>'#1003']) === [],
    'Exact ID must not leak unrelated institution');
requireFixture(filterIds($service,101,12,['search'=>'#1007']) === [],
    'Legacy copy should not become directly visible by ID');
requireFixture(filterIds($service,404,22,['search'=>'#1005','origin'=>'URBE']) === [1005],
    'Exact ID with origin filter must preserve recipient institution sharing');
requireFixture(filterIds($service,202,22,['search'=>'#1002','derivation'=>'local']) === [],
    'Exact ID must still obey other active filters');
echo "PASS exact #ID search with JWT scope, legacy copies and combined filters\n";

$light = $model->getFilterSummaryRows(202,22,true);
requireFixture(array_map('intval',array_column($light,'idformA')) === [1005,1004,1002],
    'Summary scope/order differs from full forms');
requireFixture(array_column($light,'estado') === ['Proceso','Proceso','Proceso'],
    'Summary statuses changed');
requireFixture(count($light[2]['institucionesParticipantes']) === 2,
    'Summary participants missing historical destination');
requireFixture(!array_key_exists('monto_pagado',$light[0]),
    'Lightweight projection must not fetch prices');
echo "PASS lightweight SQL projection preserves filter fields without hydration\n";

echo "GROBO_USERFORMS_FILTER_MYSQL_QA_OK checks=11\n";
