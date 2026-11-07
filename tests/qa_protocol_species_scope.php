<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';
use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;

// Datos 100% ficticios. La clase nunca abre una conexión ni escribe.
final class SpeciesFixtureDb {
    public array $sqlCalls = [];
    public array $protocols = [
        501 => ['owner'=>11,'inst'=>1,'species'=>[['idespA'=>1,'EspeNombreA'=>'QA A']]],
        502 => ['owner'=>22,'inst'=>12,'species'=>[['idespA'=>2,'EspeNombreA'=>'QA B']]],
        503 => ['owner'=>22,'inst'=>12,'shared'=>1,'species'=>[['idespA'=>3,'EspeNombreA'=>'QA C']]],
    ];
    public function prepare(string $sql): SpeciesStmt {
        return new SpeciesStmt($this,$sql);
    }
}
final class SpeciesStmt {
    private array $params = [];
    public function __construct(private SpeciesFixtureDb $db,private string $sql){}
    public function execute(array $p=[]):bool{
        $this->params=$p;
        $this->db->sqlCalls[]=[$this->sql,$p];
        return true;
    }
    public function fetchAll(int $fetchMode=PDO::FETCH_ASSOC):array{
        [$id,$userId,$instId,$networkInstId]=$this->params;
        $protocol=$this->db->protocols[(int)$id]??null;
        if(!$protocol)return [];
        $authorized=(int)$protocol['owner']===(int)$userId ||
          (int)$protocol['inst']===(int)$instId ||
          (isset($protocol['shared']) && (int)$protocol['shared']===(int)$instId &&
          (int)$networkInstId===(int)$instId);
        return $authorized?$protocol['species']:[];
    }
}
$ok=0;$failed=0;
function test(string $name,callable $task):void{
    global $ok,$failed;
    try{$task();echo "PASS ".$name."\n";$ok++;}
    catch(Throwable $e){echo "FAIL ".$name." [".get_class($e)."]\n";$failed++;}
}
function species(int $id,int $uid,int $inst):array{
    $db=new SpeciesFixtureDb();
    $out=(new UsuarioTodosProtocolosModel($db))->getProtocolSpecies($id,$uid,$inst);
    $q=$db->sqlCalls[0];
    if(!str_contains($q[0],'p.IdUsrA = ?')||
       !str_contains($q[0],'p.IdInstitucion = ?')||
       !str_contains($q[0],'s.TipoPedido = 2')||
       !str_contains($q[0],'s.Aprobado = 1')||
       !str_contains($q[0],'pi.IdInstitucion = ?'))throw new RuntimeException('Missing authorization conditions');
    if($q[1]!==[$id,$uid,$inst,$inst])throw new RuntimeException('Wrong query parameter ordering');
    return $out;
}
test('owner-own-institution',static function(){if(count(species(501,11,1))!==1)throw new RuntimeException();});
test('colleague-local-institution',static function(){if(count(species(501,44,1))!==1)throw new RuntimeException();});
test('cross-institution-not-shared-denied',static function(){if(count(species(502,11,1))!==0)throw new RuntimeException();});
test('shared-network-protocol-visible',static function(){if(count(species(503,11,1))!==1)throw new RuntimeException();});
test('unknown-user-cannot-view-unrelated-tenant',static function(){if(count(species(502,99,7))!==0)throw new RuntimeException();});
test('owner-can-view-own-protocol',static function(){if(count(species(502,22,12))!==1)throw new RuntimeException();});
test('missing-protocol-empty',static function(){if(count(species(987654,11,1))!==0)throw new RuntimeException();});
test('invalid-id-rejected',static function(){
    try{species(0,11,1);}catch(InvalidArgumentException){return;}
    throw new RuntimeException('Expected invalid ID rejection');
});
test('invalid-institution-rejected',static function(){
    try{species(501,11,0);}catch(InvalidArgumentException){return;}
    throw new RuntimeException('Expected invalid institution');
});
echo "QA_SPECIES_SCOPE passed=$ok failed=$failed\n";
exit($failed===0?0:1);
