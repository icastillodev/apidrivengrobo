<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\Billing\BillingAuditReader;

final class AuditFakePDO extends PDO {
    public array $queries = [];
    public int $total = 2400;
    public function __construct(){}
    public function prepare(string $sql, array $options=[]): PDOStatement|false {
        return new AuditFakeStmt($this,$sql);
    }
}
final class AuditFakeStmt extends PDOStatement {
    private array $bound = [];
    public function __construct(private AuditFakePDO $db, private string $sql){}
    public function execute(?array $params=null):bool {
        if($params !== null) $this->bound = $params;
        $this->db->queries[]=['sql'=>$this->sql,'params'=>array_values($this->bound)];
        return true;
    }
    public function bindValue(string|int $param,mixed $value,int $type=PDO::PARAM_STR):bool {
        $this->bound[(int)$param]=$value;
        return true;
    }
    public function fetchColumn(int $column=0):mixed {
        if(str_contains($this->sql,'SHOW COLUMNS'))return true;
        if(str_contains($this->sql,'COUNT(*)'))return $this->db->total;
        return false;
    }
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args):array {
        $values=array_values($this->bound);
        $count=(int)($values[count($values)-1]??0);
        $limit=(int)($values[count($values)-2]??0);
        if($limit<=0)return [];
        return array_map(static fn($i)=>[
            'IdHistoPago'=>$count+$i+1,'IdUsrA'=>77,'Monto'=>12.50,
            'TipoHistorial'=>'CARGA_SALDO','UsrCompleto'=>'QA','AdminCompleto'=>'QA',
        ],range(0,$limit-1));
    }
}
function qa(bool $condition,string $label):void {
    if(!$condition)throw new RuntimeException($label);
    echo 'PASS '.$label.PHP_EOL;
}
$db=new AuditFakePDO();
$reader=new BillingAuditReader($db);
$result=$reader->page(12,[
    'user_id'=>77,'type'=>'CARGA_SALDO','column'=>'Investigador',
    'search'=>"QA%_\' OR 1=1 --"
],3,15);
qa($result['total']===2400 && $result['page']===3 && $result['pages']===160,'metadata correct');
qa(count($result['rows'])===15 && $result['rows'][0]['IdHistoPago']===31,'limit and offset');
$list=array_values(array_filter($db->queries,static fn($e)=>str_contains($e['sql'],'SELECT h.IdHistoPago')));
qa(count($list)===1,'one page query');
$page=$list[0];
qa(str_contains($page['sql'],'h.IdInstitucion = ?')&&str_contains($page['sql'],'h.IdUsrA = ?'),'tenant and payer scope');
qa(str_contains($page['sql'],'ORDER BY h.fecha DESC') && str_contains($page['sql'],'LIMIT ? OFFSET ?'),'stable order and page');
qa(!str_contains($page['sql'],"QA%_"),'user search never interpolated into SQL');
qa($page['params'][0]===12 && $page['params'][1]===77,'parameterized tenant & user');
qa(end($page['params'])===30 && $page['params'][count($page['params'])-2]===15,'offset values');
$bounded=$reader->page(12,[],1000000,300);
qa($bounded['per_page']===100 && $bounded['page']===24,'sensible pagination limits');
$cursor=$reader->cursor(1,['column'=>'Ref','search'=>'#78']);
qa($cursor instanceof PDOStatement,'streaming export cursor');
try{$reader->page(1,['column'=>'malicious'],1,10);throw new RuntimeException('invalid column accepted');}
catch(InvalidArgumentException){echo "PASS invalid column rejected\n";}
try{$reader->page(0,[],1,10);throw new RuntimeException('invalid institution accepted');}
catch(InvalidArgumentException){echo "PASS invalid tenant rejected\n";}
echo 'GROBO_BILLING_PAGINATION_QA_OK cases=12'.PHP_EOL;
