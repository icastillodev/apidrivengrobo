<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\Protocol\ProtocolModel;

final class ProtocolFixturePDO {
    public array $queries=[];
    public function prepare(string $sql):ProtocolFixtureStmt{return new ProtocolFixtureStmt($this,$sql);}
}
final class ProtocolFixtureStmt {
    private array $params=[];
    public function __construct(private ProtocolFixturePDO $db,private string $sql){}
    public function execute(array $params=[]):bool{
        $this->params=$params;
        $this->db->queries[]=['sql'=>$this->sql,'params'=>$params];
        return true;
    }
    public function fetch(int $mode=PDO::FETCH_ASSOC):array|false {return false;}
    public function fetchAll(int $mode=PDO::FETCH_ASSOC):array {
        if(str_contains($this->sql,'SHOW TABLES')||str_contains($this->sql,'SHOW COLUMNS'))return [];
        return [
            ['idprotA'=>501,'SaldoAnimales'=>20,'AnimalesComprometidos'=>13,'AnimalesUsados'=>7],
            ['idprotA'=>502,'SaldoAnimales'=>0,'AnimalesComprometidos'=>15,'AnimalesUsados'=>2],
            ['idprotA'=>503,'SaldoAnimales'=>18,'AnimalesComprometidos'=>0,'AnimalesUsados'=>0]
        ];
    }
}
$db=new ProtocolFixturePDO();
$model=new ProtocolModel($db);
$result=$model->getByInstitution(12);
if(count($result)!==3)throw new RuntimeException('Rows missing');
foreach([33,15,18] as $i=>$expected){
    if((int)$result[$i]['AnimalesTotales']!==$expected)throw new RuntimeException('Different calculation');
}
$q=end($db->queries);
$sql=$q['sql'];
if(str_contains($sql,'LEFT JOIN protinstr pi') ||
   !str_contains($sql,'EXISTS (') ||
   !str_contains($sql,'FROM protinstr pi') ||
   str_contains($sql,') + pe.CantidadAniA) as AnimalesTotales')){
    throw new RuntimeException('Unoptimized protocol SQL');
}
if(count($q['params'])!==7 || count(array_unique($q['params']))!==1 ||
   (int)$q['params'][0]!==12){
    throw new RuntimeException('Wrong tenant parameters');
}
echo "GROBO_PROTOCOL_QUERY_QA_OK records=3 params=7 double_sum_removed=yes network_fanout_removed=yes\n";
