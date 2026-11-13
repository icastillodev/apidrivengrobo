<?php
/** Verifica estructura, jamás datos, del volcado canónico docs/database.sql. */
declare(strict_types=1);
require_once __DIR__.'/../api/autoload.php';

use App\Models\UserForms\UserFormsSearchIndexSchema as Schema;

$file=__DIR__.'/../docs/database.sql';
$dump=file_get_contents($file);
if($dump === false) throw new RuntimeException('CANONICAL_SCHEMA_DUMP_NOT_FOUND');
$missing=[];
foreach(Schema::requiredColumns() as $table=>$columns) {
    $marker="CREATE TABLE " . chr(96) . $table . chr(96);
    $from=strpos($dump,$marker);
    if($from===false) {
        $missing[]=$table;
        continue;
    }
    $to=strpos($dump,') ENGINE=',$from);
    if($to===false) {
        $missing[]=$table.' [definition end]';
        continue;
    }
    $definition=substr($dump,$from,$to-$from);
    foreach($columns as $column) {
        $fieldRegex='/^\s*'.preg_quote(chr(96).$column.chr(96),'/').'\s+/m';
        if(!preg_match($fieldRegex,$definition)) {
            $missing[]=$table.'.'.$column;
        }
    }
}
$triggers=Schema::triggerManifest();
if(count($triggers)!==39) throw new RuntimeException('TRIGGER_MANIFEST_SIZE_CHANGED');
if($missing!==[]) {
    throw new RuntimeException('CANONICAL_SCHEMA_MISSING_FIELDS '.json_encode($missing));
}
echo 'GROBO_SEARCH_INDEX_CANONICAL_SCHEMA_OK '
   .json_encode(['required_tables'=>count(Schema::requiredColumns()),
      'trigger_sources'=>13,'trigger_events'=>39,'missing_fields'=>0]).PHP_EOL;
