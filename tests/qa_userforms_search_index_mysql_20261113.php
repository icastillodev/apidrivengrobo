<?php
/**
 * Índice documental GROBO: test destructivo ÚNICAMENTE sobre
 * grobo_myforms_fixture en MySQL Docker interno efímero.
 */
declare(strict_types=1);
require __DIR__.'/qa_userforms_mysql_integration_20261112.php';

use App\Models\UserForms\UserFormsSearchIndexSchema;
use App\Models\UserForms\UserFormsSearchIndexStore;
use App\Services\UserForms\UserFormsSearchIndexBuilder;
use App\Services\UserForms\UserFormsFilterService;

$schema = UserFormsSearchIndexSchema::class;
$preflight = $schema::preflight($db);
requireFixture($preflight['schema_compatible'] && $preflight['missing_tables'] === []
    && $preflight['missing_columns'] === []
    && $preflight['expected_triggers'] === 39,
    'Read-only preflight rejected the valid synthetic source schema');
$schema::install($db);
requireFixture($schema::triggersReady($db), 'Missing one of 39 source triggers');
requireFixture(count($schema::triggerManifest()) === 39,'Expected 39 invalidation triggers');
$installed = $schema::preflight($db);
requireFixture($installed['triggers_present']===39
    && $installed['trigger_conflicts'] === []
    && $installed['index_document_table_exists']
    && $installed['invalidation_shards_present']===64,
    'Read-only preflight cannot detect installed search index');
echo "PASS complete migration, 39 triggers and read-only schema preflight\n";

$store = new UserFormsSearchIndexStore($db);
$builder = new UserFormsSearchIndexBuilder($model,$store);
$startEpoch=$store->epoch();
$built=$builder->rebuild();
requireFixture($built['documents']===7, 'Canonical index count is incorrect');
requireFixture($built['epoch']===$startEpoch && $store->readable()!==null,
    'Cannot publish an atomic, complete search generation');
echo "PASS complete canonical indexing and atomic generation publishing\n";

putenv('GROBO_MYFORMS_SEARCH_INDEX=1');
$service = new UserFormsFilterService($model);
$cases=[
    ['search'=>'Solicitud original de animales'],
    ['search'=>'PROTO-ORIGINAL'],
    ['search'=>'Cientifico'],
    ['search'=>'Cupae'],
    ['search'=>'PROTO-DERIVADO-2'],
    ['search'=>'Biologia'],
    ['search'=>'1001'],
    ['search'=>'2026-11-01'],
    ['search'=>'1002 2026-11-02'],
    ['search'=>'no-needle-here'],
    ['search'=>'='],
    ['search'=>'→'],
    ['search'=>'U.R.B.E.'],
    ['search'=>'URBE','derivation'=>'derived'],
    ['search'=>'CUPAE','origin'=>'URBE'],
    ['search'=>'%', 'status'=>'Proceso'],
];
foreach ([[101,12],[202,22],[404,22],[303,33],[999,33]] as [$uid,$iid]) {
    $legacy = $model->getAllForms($uid,$iid)['list'];
    foreach ($cases as $filters) {
        $normalized=UserFormsFilterService::validateFilters($filters);
        $expected=array_values(array_map('intval',array_column(
            array_values(array_filter($legacy,
                static fn($row)=>UserFormsFilterService::matches($row,$normalized))),
            'idformA')));
        $actual=$service->page($uid,$iid,$filters,12,0);
        requireFixture($actual['total']===count($expected)
            && array_map('intval',array_column($actual['list'],'idformA'))===$expected,
            'Indexed search not identical to legacy: '.json_encode([$uid,$filters]));
    }
}
echo "PASS 80 indexed-vs-legacy queries: unicode, substring, nested and tenant scope\n";

$found=$model->getIndexedTextCandidates(202,22,'PROTO-ORIGINAL');
requireFixture($found!==null && $found['ids']===[1002],
    'Index query must find original derived snapshot without fetching all rows');
requireFixture($model->getIndexedTextCandidates(303,33,'PROTO-ORIGINAL')['ids'] === [],
    'Index reader leaked a protocol from another institution');
requireFixture($model->getIndexedTextCandidates(101,12,'a phrase not present')['ids']===[],
    'Index must return a verified empty result');
echo "PASS indexed candidate lookup validates owner and derived visibility\n";

$epoch=$store->epoch();
$db->exec("UPDATE precioformulario SET totalpago=totalpago+1 WHERE idformA=1002");
requireFixture($store->epoch()>$epoch, 'Financial mutation did not invalidate index');
requireFixture($store->readable()===null, 'Stale snapshot still published as readable');
requireFixture($model->getIndexedTextCandidates(202,22,'PROTO-ORIGINAL')===null,
    'Stale index should force legacy rather than return a partial result');
requireFixture($service->page(202,22,['search'=>'PROTO-ORIGINAL'])['total']===1,
    'Legacy fallback on stale price index failed');
echo "PASS price change invalidates epoch and restores safe legacy search\n";

$new=$builder->rebuild();
requireFixture($new['documents']===7 && $store->readable()!==null,
    'Rebuild did not publish a fresh snapshot');
$before=$store->epoch();
$db->exec("UPDATE formulario_datos_originales SET datos_json=REPLACE(datos_json,
    'Solicitud original de animales','RECETA MÉDICA ÚNICA') WHERE idformA=1002");
requireFixture($store->epoch()>$before && $store->readable()===null,
    'Snapshot mutation did not invalidate index');
$expected = $service->page(202,22,['search'=>'RECETA MÉDICA ÚNICA']);
requireFixture($expected['total']===1 && (int)$expected['list'][0]['idformA']===1002,
    'Fallback failed to locate changed original snapshot');
$again=$builder->rebuild();
requireFixture($again['documents']===7 && $again['old_documents_purged']>0,
    'Rebuild did not clear previous generations with old sensitive text');
$oldDocs=$db->prepare('SELECT COUNT(*) FROM grobo_form_search_document WHERE generation=?');
$oldDocs->execute([$new['generation']]);
requireFixture((int)$oldDocs->fetchColumn()===0,
    'Old search documents were not purged on successful rebuild');
requireFixture($model->getIndexedTextCandidates(202,22,'RECETA MÉDICA ÚNICA')['ids']===[1002],
    'New accented snapshot was not indexed or binary-matched');
echo "PASS snapshot changes force fallback; rebuild matches unicode and accents\n";

$originalEpoch=$store->epoch();
$generation=bin2hex(random_bytes(16));
$db->exec("UPDATE formularioe SET estado='Entregado' WHERE idformA=1004");
try {
    $store->publish($generation,$originalEpoch);
    throw new RuntimeException('Concurrent mutation allowed stale generation publication');
} catch (RuntimeException $e) {
    requireFixture(str_contains($e->getMessage(),'Fuentes cambiaron'),
        'Unexpected rebuild concurrency failure');
}
echo "PASS concurrent source writes abort stale index publication\n";

// Rebuild then prove that uninstalled/partial invalidation disables readers.
$builder->rebuild();
$db->exec("DROP TRIGGER grobo_fs_pf_au");
requireFixture(!$schema::triggersReady($db),'Partial trigger installation accepted');
$missingTriggerReport = $schema::preflight($db);
requireFixture($missingTriggerReport['triggers_present']===38
    && $missingTriggerReport['schema_compatible'],
    'Read-only preflight did not detect one missing invalidation trigger');
requireFixture($model->getIndexedTextCandidates(101,12,'PROTO-URBE-1')===null,
    'Reader used index after removing a required trigger');
$schema::install($db);
requireFixture($schema::triggersReady($db),'Idempotent schema repair failed');
echo "PASS missing triggers fail closed, installer repairs a partial setup\n";

putenv('GROBO_MYFORMS_SEARCH_INDEX=0');
requireFixture($model->getIndexedTextCandidates(101,12,'PROTO-URBE-1')===null,
    'Index must be off unless feature flag is explicitly enabled');
echo "PASS production feature flag defaults to safe legacy behavior\n";
// Cada tabla fuente debe invalidar con INSERT/UPDATE/DELETE. La prueba usa
// filas que existen únicamente en la BD ficticia efímera (sin FKs de producción).
$mutationCases = [
    ['formularioe',
        "INSERT INTO formularioe (idformA,IdUsrA,IdInstitucion,tipoA,depto,fechainicioA,fecRetiroA,estado) VALUES (9999,101,12,1,1,'2026-11-01','2026-11-02','Proceso')",
        "UPDATE formularioe SET estado='Entregado' WHERE idformA=9999",
        "DELETE FROM formularioe WHERE idformA=9999"],
    ['formulario_derivacion',
        "INSERT INTO formulario_derivacion (IdFormularioDerivacion,idformA,idformAOrigen,IdInstitucionOrigen,IdInstitucionDestino,Activo) VALUES (9999,1001,NULL,12,22,0)",
        "UPDATE formulario_derivacion SET Activo=1 WHERE IdFormularioDerivacion=9999",
        "DELETE FROM formulario_derivacion WHERE IdFormularioDerivacion=9999"],
    ['formulario_owner_actual',
        "INSERT INTO formulario_owner_actual (idformA,IdInstitucionActual) VALUES (9999,12)",
        "UPDATE formulario_owner_actual SET IdInstitucionActual=22 WHERE idformA=9999",
        "DELETE FROM formulario_owner_actual WHERE idformA=9999"],
    ['formulario_datos_originales',
        "INSERT INTO formulario_datos_originales (IdFormularioDerivacion,idformA,datos_json) VALUES (9999,1001,'{}')",
        "UPDATE formulario_datos_originales SET datos_json='{\"qa\":true}' WHERE IdFormularioDerivacion=9999",
        "DELETE FROM formulario_datos_originales WHERE IdFormularioDerivacion=9999"],
    ['tipoformularios',
        "INSERT INTO tipoformularios (IdTipoFormulario,IdInstitucion,nombreTipo) VALUES (9999,12,'QA')",
        "UPDATE tipoformularios SET nombreTipo='QA2' WHERE IdTipoFormulario=9999",
        "DELETE FROM tipoformularios WHERE IdTipoFormulario=9999"],
    ['precioformulario',
        "INSERT INTO precioformulario (idformA,precioformulario,totalpago) VALUES (9999,10,0)",
        "UPDATE precioformulario SET totalpago=1 WHERE idformA=9999",
        "DELETE FROM precioformulario WHERE idformA=9999"],
    ['precioinsumosformulario',
        "INSERT INTO precioinsumosformulario (idformA,preciototal,totalpago) VALUES (9999,10,0)",
        "UPDATE precioinsumosformulario SET totalpago=1 WHERE idformA=9999",
        "DELETE FROM precioinsumosformulario WHERE idformA=9999"],
    ['protformr',
        "INSERT INTO protformr (idformA,idprotA) VALUES (9999,11)",
        "UPDATE protformr SET idprotA=12 WHERE idformA=9999",
        "DELETE FROM protformr WHERE idformA=9999"],
    ['protocoloexpe',
        "INSERT INTO protocoloexpe (idprotA,nprotA) VALUES (9999,'QA')",
        "UPDATE protocoloexpe SET nprotA='QA2' WHERE idprotA=9999",
        "DELETE FROM protocoloexpe WHERE idprotA=9999"],
    ['protdeptor',
        "INSERT INTO protdeptor (idprotA,iddeptoA) VALUES (9999,1)",
        "UPDATE protdeptor SET iddeptoA=2 WHERE idprotA=9999",
        "DELETE FROM protdeptor WHERE idprotA=9999"],
    ['departamentoe',
        "INSERT INTO departamentoe (iddeptoA,NombreDeptoA,organismopertenece) VALUES (9999,'QA',1)",
        "UPDATE departamentoe SET NombreDeptoA='QA2' WHERE iddeptoA=9999",
        "DELETE FROM departamentoe WHERE iddeptoA=9999"],
    ['organismoe',
        "INSERT INTO organismoe (IdOrganismo,NombreOrganismoSimple) VALUES (9999,'QA')",
        "UPDATE organismoe SET NombreOrganismoSimple='QA2' WHERE IdOrganismo=9999",
        "DELETE FROM organismoe WHERE IdOrganismo=9999"],
    ['institucion',
        "INSERT INTO institucion (IdInstitucion,NombreInst) VALUES (9999,'QA')",
        "UPDATE institucion SET NombreInst='QA2' WHERE IdInstitucion=9999",
        "DELETE FROM institucion WHERE IdInstitucion=9999"],
];
foreach ($mutationCases as [$table,$insert,$update,$delete]) {
    $before=$store->epoch();
    $db->exec($insert);
    $db->exec($update);
    $db->exec($delete);
    requireFixture($store->epoch()===$before+3,
        'One or more insert/update/delete triggers failed on '.$table);
}
$activeShards=(int)$db->query(
    'SELECT COUNT(*) FROM grobo_form_search_invalidation WHERE epoch>0'
)->fetchColumn();
requireFixture($activeShards>=6,
    'Global epoch contention was not distributed across multiple counter rows');
echo "PASS 39 source events increment a monotonic sum across "
    . $activeShards . " active shards\n";

// El índice contiene texto con nombres y contactos; un borrado físico debe
// eliminar toda copia de ese formulario en el mismo commit de la tabla origen.
$builder->rebuild();
$docsBefore=(int)$db->query(
    "SELECT COUNT(*) FROM grobo_form_search_document WHERE idformA=1001"
)->fetchColumn();
requireFixture($docsBefore>0, 'Expected indexed data before deletion');
$db->exec("DELETE FROM formularioe WHERE idformA=1001");
$docsAfter=(int)$db->query(
    "SELECT COUNT(*) FROM grobo_form_search_document WHERE idformA=1001"
)->fetchColumn();
requireFixture($docsAfter===0, 'Deleted form still present in one or more index generations');
requireFixture($store->readable()===null, 'Deleted form did not invalidate indexed search');
echo "PASS deleted canonical form purges all document generations in the same transaction\n";


// Dos conexiones independientes no pueden reconstruir el mismo índice a la vez.
// El cierre siempre debe liberar el GET_LOCK incluso ante una excepción.
$otherPdo = new PDO($dsn,getenv('GROBO_QA_MYSQL_USER') ?: 'root',
    getenv('GROBO_QA_MYSQL_PASSWORD') ?: '',[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES=>false,
    ]);
$otherStore = new UserFormsSearchIndexStore($otherPdo);
$store->acquireRebuildLock();
try {
    try {
        $otherStore->acquireRebuildLock();
        throw new RuntimeException('Concurrent rebuild lock was ignored');
    } catch (RuntimeException $e) {
        requireFixture(str_contains($e->getMessage(),'en curso'),
            'Unexpected concurrent rebuild error');
    }
} finally {
    $store->releaseRebuildLock();
}
$otherStore->acquireRebuildLock();
$otherStore->releaseRebuildLock();
echo "PASS separate MySQL sessions serialize rebuilds and release locks\n";

// La escritura masiva admite hasta 100 fichas; al fallar una reconstrucción,
// descartar su generación NO debe borrar una generación publicada.
$orphan=bin2hex(random_bytes(16));
$store->writeDocumentsBatch($orphan,[1002=>'QA one',1003=>'QA two']);
requireFixture((int)$db->query(
    "SELECT COUNT(*) FROM grobo_form_search_document WHERE generation='{$orphan}'"
)->fetchColumn()===2,'Batch upsert did not persist both synthetic records');
requireFixture($store->discardUnpublishedGeneration($orphan)===2,
    'Failed generation left copied personal data on disk');
requireFixture($store->discardUnpublishedGeneration($orphan)===0,
    'Repeated cleanup should be idempotent');
try {
    $store->writeDocumentsBatch($orphan,array_fill_keys(range(10001,10101),'QA'));
    throw new RuntimeException('101-document batch was accepted');
} catch (RuntimeException $e) {
    requireFixture(str_contains($e->getMessage(),'inválido'),
        'Unexpected error on oversized batch');
}
echo "PASS bounded 100-document SQL batches and failed-generation cleanup\n";

// Purgar más de un lote de 500 sin borrar la generación actual.
$stale=bin2hex(random_bytes(16));
foreach (array_chunk(range(20000,21119),100) as $chunk) {
    $store->writeDocumentsBatch($stale,array_fill_keys($chunk,'historical QA'));
}
$activeGeneration=$db->query(
    'SELECT published_generation FROM grobo_form_search_state WHERE id=1'
)->fetchColumn();
$activeCount=$db->prepare(
    'SELECT COUNT(*) FROM grobo_form_search_document WHERE generation=?'
);
$activeCount->execute([$activeGeneration]);
$preserved=(int)$activeCount->fetchColumn();
requireFixture($preserved>0,'No published generation to protect during cleanup');
$purged=$store->purgeOldGenerations();
requireFixture($purged===1120,
    'Cleanup did not traverse all of the 500-row delete batches');
$activeCount->execute([$activeGeneration]);
requireFixture((int)$activeCount->fetchColumn()===$preserved,
    'Bounded cleanup modified documents of the published generation');
echo "PASS 1120 old documents purged in bounded batches; live generation preserved\n";

// La pérdida accidental de un contador invalida el índice inmediatamente.
$db->exec('DELETE FROM grobo_form_search_invalidation WHERE shard=63');
requireFixture(!$schema::triggersReady($db)
    && $store->readable()===null,
    'Missing invalidation shard should reject indexed search');
$reportAfterLoss=$schema::preflight($db);
requireFixture($reportAfterLoss['invalidation_shards_present']===63,
    'Read-only schema preflight did not report a missing counter shard');
$schema::install($db);
requireFixture($schema::triggersReady($db),
    'Idempotent sharded counter repair did not restore all 64 rows');
$publishedAfterRepair=$db->query(
    'SELECT published_generation FROM grobo_form_search_state WHERE id=1'
)->fetchColumn();
requireFixture($publishedAfterRepair===null && $store->readable()===null,
    'Repair of a missing shard must invalidate any previously published index');
echo "PASS missing shard fails closed; repair cannot resurrect stale search\n";

// Ensayo destructivo final SÓLO en grobo_myforms_fixture: una columna o
// tabla faltante deben reportarse antes de cualquier migración.
$db->exec('ALTER TABLE formularioe DROP COLUMN estado');
$missingColumnReport = $schema::preflight($db);
requireFixture(!$missingColumnReport['schema_compatible']
    && in_array('formularioe.estado',$missingColumnReport['missing_columns'],true),
    'Preflight did not warn about a missing critical source column');
$db->exec('DROP TABLE formulario_owner_actual');
$missingTableReport = $schema::preflight($db);
requireFixture(!$missingTableReport['schema_compatible']
    && in_array('formulario_owner_actual',$missingTableReport['missing_tables'],true),
    'Preflight did not warn about a missing source table');
echo "PASS read-only preflight detects incompatible source tables and columns\n";

echo "GROBO_MYFORMS_SEARCH_INDEX_MYSQL_QA_OK checks=16\n";
