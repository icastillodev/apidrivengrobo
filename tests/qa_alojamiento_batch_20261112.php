<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Utils\AlojamientoListMetadata;
use App\Utils\AlojamientoCobro;
use App\Models\Alojamiento\AlojamientoModel;

final class BatchFakePDO extends PDO {
    public array $calls=[];
    public function __construct(){}
    public function prepare(string $query, array $options=[]): PDOStatement|false {
        return new BatchFakeStmt($this, $query);
    }
}
final class BatchFakeStmt extends PDOStatement {
    private array $params=[];
    public function __construct(private BatchFakePDO $db, private string $query){}
    public function execute(?array $params=null):bool {
        $this->params=$params ?? [];
        $this->db->calls[]=[$this->query,$this->params];return true;
    }
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT, mixed ...$args):array {
        if (str_contains($this->query,'FROM alojamiento_caja ac')) {
            return array_map(static fn($id)=>['id'=>$id,'cantidad'=>($id%3)+1],$this->params);
        }
        if (str_contains($this->query,'FROM tipoalojamiento WHERE')) {
            return array_map(static fn($id)=>['IdTipoAlojamiento'=>$id,'AlojamientoCobroModo'=>
                $id===11?'SUJETO':'CONTENIDO'],$this->params);
        }
        return [];
    }
    public function fetch(int $mode=PDO::FETCH_DEFAULT, int $cursorOrientation=PDO::FETCH_ORI_NEXT,
        int $cursorOffset=0):mixed {
        return str_starts_with($this->query, 'SHOW COLUMNS') ? ['Field'=>'departamento'] : false;
    }
    public function fetchColumn(int $column=0):mixed {
        if (str_starts_with($this->query,'SHOW COLUMNS'))return 'AlojamientoCobroModo';
        if (str_contains($this->query,'FROM institucion'))return 'SUJETO';
        return false;
    }
}

$db=new BatchFakePDO();
$rows=[];
for ($id=1;$id<=620;$id++) {
    $rows[]=['IdAlojamiento'=>$id,'IdTipoAlojamiento'=>($id%2===0?11:13)];
}
$begin=microtime(true);
$metadata=AlojamientoListMetadata::load($db,$rows,1);
$elapsed=(microtime(true)-$begin)*1000;
foreach ($rows as $row) {
    $id=$row['IdAlojamiento'];
    if(($metadata['counts'][$id]??null)!==($id%3)+1)throw new RuntimeException('Incorrect subjects');
}
if($metadata['modos'][11]!==AlojamientoCobro::MODO_SUJETO
   ||$metadata['modos'][13]!==AlojamientoCobro::MODO_CONTENIDO
   ||$metadata['modos'][0]!==AlojamientoCobro::MODO_SUJETO){
    throw new RuntimeException('Incorrect mode mapping');
}
$queryCount=count($db->calls);
if ($queryCount>7 || $queryCount<5)throw new RuntimeException('N+1 persisted: '.$queryCount);
$subjectQueries=count(array_filter($db->calls,static fn($c)=>str_contains($c[0],'FROM alojamiento_caja ac')));
if($subjectQueries!==3)throw new RuntimeException('Chunks mismatch: '.$subjectQueries);
// La subconsulta de último alojamiento no puede agrupar historias de
// instituciones distintas; preservar ambos IdInstitucion y parámetros.
(new AlojamientoModel($db))->getAllGrouped(12);
$last=end($db->calls);
if(!str_contains($last[0],"FROM alojamiento\n                    WHERE IdInstitucion = ?")
   || !str_contains($last[0],'WHERE a.IdInstitucion = ?')
   || $last[1]!==[12,12]){
    throw new RuntimeException('Tenant scope missing from housing history selection.');
}
echo 'GROBO_ALOJAMIENTO_BATCH_QA_OK rows='.count($rows).' queries='.$queryCount.
    ' old_estimated_queries=1240 elapsed_fixture_ms='.round($elapsed,2).' tenant_subquery=scoped'.PHP_EOL;
