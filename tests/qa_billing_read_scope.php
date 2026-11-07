<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Models\Billing\BillingModel;

// Mock del acceso PDO; nunca abre una base de datos ni usa credenciales reales.
final class FakeBillingDb {
    public array $queries=[];
    public function prepare(string $sql): FakeBillingStmt {
        return new FakeBillingStmt($this,$sql);
    }
}
final class FakeBillingStmt {
    private array $p=[];
    public function __construct(private FakeBillingDb $db,private string $sql){}
    public function execute(array $params=[]):bool {
        $this->p=$params;$this->db->queries[]=[$this->sql,$params];return true;
    }
    public function fetchColumn():mixed{return false;}
    public function fetchAll(int $mode=PDO::FETCH_ASSOC):array {
        if(str_contains($this->sql,'FROM historialpago h')){
            // Dos instituciones ficticias; las filas del fixture se filtran con el parámetro tenant.
            $inst=(int)($this->p[0]??0);
            $user=(int)($this->p[1]??0);
            if($user!==0 && $user!==77)return [];
            return match($inst){
                1=>[['IdHistoPago'=>901,'IdInstitucion'=>1,'Monto'=>50]],
                12=>[['IdHistoPago'=>902,'IdInstitucion'=>12,'Monto'=>70]],
                default=>[],
            };
        }
        return [];
    }
}
function assertTest(bool $condition):void{if(!$condition)throw new RuntimeException('Test failed');}
$passed=0;$failed=0;
function testIt(string $label,callable $task):void {
    global $passed,$failed;
    try {$task();$passed++;echo "PASS ".$label."\n";}
    catch(Throwable $e){$failed++;echo "FAIL ".$label." [".get_class($e)."]\n";}
}
testIt('billing-audit-filters-institution-urbe',static function(){
    $db=new FakeBillingDb();$rows=(new BillingModel($db))->getFinancialAudit(1);
    assertTest(count($rows)===1&&$rows[0]['IdInstitucion']===1);
    [$sql,$params]=end($db->queries);
    assertTest(str_contains($sql,'WHERE h.IdInstitucion = ?')&&$params===[1]);
});
testIt('billing-audit-filters-institution-cupae',static function(){
    $db=new FakeBillingDb();$rows=(new BillingModel($db))->getFinancialAudit(12);
    assertTest(count($rows)===1&&$rows[0]['IdInstitucion']===12);
    [$sql,$params]=end($db->queries);
    assertTest(str_contains($sql,'WHERE h.IdInstitucion = ?')&&$params===[12]);
});
foreach(['investigador'=>0,'protocolo'=>2,'depto'=>3] as $scope=>$expectedExtra){
    foreach([1,12] as $inst){
        testIt("billing-ledger-$scope-tenant-$inst",static function()use($scope,$inst,$expectedExtra){
            $db=new FakeBillingDb();
            $result=(new BillingModel($db))->getSaldoHistorialSplit($inst,77,null,null,$scope,$scope==='investigador'?null:55);
            assertTest(isset($result['movimientos_saldo'],$result['pagos']));
            $histQueries=array_values(array_filter($db->queries,static fn($entry)=>str_contains($entry[0],'FROM historialpago h')));
            assertTest(count($histQueries)===2);
            [$saldoSql,$saldoParams]=$histQueries[0];
            [$pagoSql,$pagoParams]=$histQueries[1];
            assertTest(str_contains($saldoSql,'WHERE h.IdInstitucion = ? AND h.IdUsrA = ?'));
            assertTest(str_contains($pagoSql,'WHERE h.IdInstitucion = ? AND h.IdUsrA = ?'));
            assertTest($saldoParams===[ $inst, 77 ]);
            assertTest(count($pagoParams)===2+$expectedExtra);
            assertTest($pagoParams[0]===$inst&&$pagoParams[1]===77);
            if($expectedExtra>0)assertTest(array_slice($pagoParams,2)===array_fill(0,$expectedExtra,55));
        });
    }
}
echo "QA_BILLING_READ_RESULT passed=$passed failed=$failed\n";
exit($failed===0?0:1);
