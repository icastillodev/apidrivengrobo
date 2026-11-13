<?php
/**
 * CLI explícito de indexación de Mis Formularios.
 * No obtiene secretos del código ni crea tablas automáticamente en un request.
 *
 * GROBO_SEARCH_INDEX_DSN='mysql:host=...;dbname=...;charset=utf8mb4'
 * GROBO_SEARCH_INDEX_USER=...
 * GROBO_SEARCH_INDEX_PASSWORD=...
 * GROBO_SEARCH_INDEX_APPROVED=yes php scripts/grobo-search-index.php --migrate
 * GROBO_SEARCH_INDEX_APPROVED=yes php scripts/grobo-search-index.php --rebuild
 * php scripts/grobo-search-index.php --status
 */
declare(strict_types=1);
require dirname(__DIR__) . '/api/autoload.php';

use App\Models\UserForms\UserFormsModel;
use App\Models\UserForms\UserFormsSearchIndexSchema;
use App\Models\UserForms\UserFormsSearchIndexStore;
use App\Services\UserForms\UserFormsSearchIndexBuilder;

$mode = $argv[1] ?? '--status';
if (!in_array($mode,['--status','--migrate','--rebuild','--disable','--purge'],true)) {
    fwrite(STDERR,"Modo no reconocido: --status, --migrate, --rebuild, --disable, --purge\n");
    exit(2);
}
$dsn = (string)getenv('GROBO_SEARCH_INDEX_DSN');
if ($dsn === '' || !str_contains($dsn,'dbname=') || !str_contains($dsn,'charset=utf8mb4')) {
    fwrite(STDERR, "Debe definirse DSN con dbname y charset=utf8mb4 explícitos\n");
    exit(2);
}
if ($mode !== '--status' && getenv('GROBO_SEARCH_INDEX_APPROVED') !== 'yes') {
    fwrite(STDERR,"Una migración/reconstrucción requiere aprobación explícita\n");
    exit(2);
}
$db = new PDO($dsn, getenv('GROBO_SEARCH_INDEX_USER') ?: '',
    getenv('GROBO_SEARCH_INDEX_PASSWORD') ?: '',[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES=>false,
    ]);
$dbName = $db->query('SELECT DATABASE()')->fetchColumn();
if (!$dbName) throw new RuntimeException('No hay base seleccionada');

if ($mode === '--migrate') {
    UserFormsSearchIndexSchema::install($db);
    echo "GROBO_SEARCH_SCHEMA_READY triggers="
        . count(UserFormsSearchIndexSchema::triggerManifest()) . "\n";
} elseif ($mode === '--rebuild') {
    if (!UserFormsSearchIndexSchema::triggersReady($db)) {
        throw new RuntimeException('Hay triggers ausentes o alterados; no publicar índice');
    }
    $builder=new UserFormsSearchIndexBuilder(
        new UserFormsModel($db), new UserFormsSearchIndexStore($db)
    );
    $result=$builder->rebuild();
    echo 'GROBO_SEARCH_REBUILT '.json_encode($result).PHP_EOL;
} elseif ($mode === '--disable') {
    $db->exec('UPDATE grobo_form_search_state
              SET published_generation=NULL,published_epoch=NULL,published_count=0
              WHERE id=1');
    echo "GROBO_SEARCH_DISABLED\n";
} elseif ($mode === '--purge') {
    $purged=(new UserFormsSearchIndexStore($db))->purgeOldGenerations();
    echo "GROBO_SEARCH_PURGED_OLD count={$purged}\n";
} else {
    $store=new UserFormsSearchIndexStore($db);
    try {
        $ready=UserFormsSearchIndexSchema::triggersReady($db);
        $state=$store->readable();
        echo 'GROBO_SEARCH_STATUS '.json_encode([
            'triggers_ok'=>$ready,'active'=>$state!==null,
            'epoch'=>$store->epoch(),
        ]).PHP_EOL;
    } catch (PDOException $e) {
        echo "GROBO_SEARCH_NOT_INSTALLED\n";
    }
}
