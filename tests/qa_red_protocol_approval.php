<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Models\Protocol\ProtocolModel;

final class RedFixtureDb {
    public int $writes=0;
    public array $statements=[];
    public function prepare(string $sql):RedStmt{
        $this->statements[]=$sql;
        return new RedStmt($this,$sql);
    }
}
final class RedStmt {
    private array $params=[];
    public function __construct(private RedFixtureDb $db,private string $sql){}
    public function execute(array $p=[]):bool{$this->params=$p;if(preg_match('/^\s*(UPDATE|INSERT|DELETE)/i',$this->sql))$this->db->writes++;return true;}
    public function fetchColumn():mixed {
        // Una solicitud pendiente no es una red aprobada.
        if(!str_contains($this->sql,'sr.Aprobado = 1'))return 101;
        return false;
    }
}
$passed=0;$failed=0;
function testCase(string $label, callable $cb):void{
    global $passed,$failed;
    try{$cb();echo "PASS $label\n";$passed++;}
    catch(Throwable $e){echo "FAIL $label [".get_class($e)."]\n";$failed++;}
}
testCase('pending-red-request-cannot-edit-config',static function(){
    $db=new RedFixtureDb();
    try{
        (new ProtocolModel($db))->saveRedInstitutionConfig(501,12,['IdUsrA'=>22]);
    }catch(Exception $e){
        if($db->writes!==0)throw new RuntimeException('DML before network approval');
        $sql=$db->statements[0]??'';
        foreach(['sr.TipoPedido = 2','sr.Aprobado = 1','sr.IdInstitucion = pi.IdInstitucion','pi.IdInstitucion = ?'] as $needle){
            if(!str_contains($sql,$needle))throw new RuntimeException('Missing approved network requirement');
        }
        return;
    }
    throw new RuntimeException('Pending network access unexpectedly allowed');
});
testCase('invalid-protocol-id-denied',static function(){
    $db=new RedFixtureDb();
    try{(new ProtocolModel($db))->saveRedInstitutionConfig(0,12,[]);}
    catch(Exception $e){if($db->writes||$db->statements)throw new RuntimeException('SQL on invalid ID');return;}
    throw new RuntimeException('Invalid ID permitted');
});
testCase('invalid-institution-denied',static function(){
    $db=new RedFixtureDb();
    try{(new ProtocolModel($db))->saveRedInstitutionConfig(501,0,[]);}
    catch(Exception $e){if($db->writes||$db->statements)throw new RuntimeException('SQL on invalid tenant');return;}
    throw new RuntimeException('Invalid tenant permitted');
});
echo "QA_RED_APPROVAL passed=$passed failed=$failed\n";
exit($failed===0?0:1);
