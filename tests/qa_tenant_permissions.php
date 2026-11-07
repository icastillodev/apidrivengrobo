<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';
use App\Utils\InstitutionScope;
use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;
use App\Models\AdminConfig\AdminConfigReservasModel;

// Fixtures: inst 1 y 12, usuarios 11 y 22. No utiliza MySQL ni la API real.
final class FakeDb {
    public array $protocols=[501=>[11,1],502=>[22,12]];
    public array $rooms=[101=>1,202=>12];
    public array $instruments=[301=>1,402=>12];
    public array $queries=[];
    public int $commitCount=0;
    public int $rollbackCount=0;
    public function prepare(string $sql): FakeStmt {return new FakeStmt($this,$sql);}
    public function beginTransaction():bool{return true;}
    public function commit():bool{$this->commitCount++;return true;}
    public function rollBack():bool{$this->rollbackCount++;return true;}
    public function lastInsertId():string{return '7001';}
    public function writes():array{return array_values(array_filter($this->queries,static fn($v)=>preg_match('/^\s*(UPDATE|DELETE|INSERT)/i',$v[0])===1));}
}
final class FakeStmt {
    private array $params=[];
    public function __construct(private FakeDb $db,private string $sql){}
    public function execute(array $p=[]):bool{
        $this->params=$p;$this->db->queries[]=[$this->sql,$p];return true;
    }
    public function fetchColumn():mixed{
        $p=$this->params;
        if(str_contains($this->sql,'FROM protocoloexpe')){
            $x=$this->db->protocols[(int)($p[0]??0)]??null;
            return $x&&$x===[(int)($p[1]??0),(int)($p[2]??0)]?(int)$p[0]:false;
        }
        if(str_contains($this->sql,'FROM reserva_sala')){
            return ($this->db->rooms[(int)($p[0]??0)]??0)===(int)($p[1]??0)?(int)$p[0]:false;
        }
        if(str_contains($this->sql,'FROM reserva_instrumento')){
            return ($this->db->instruments[(int)($p[0]??0)]??0)===(int)($p[1]??0)?(int)$p[0]:false;
        }
        if(str_contains($this->sql,'FROM solicitudprotocolo'))return 7001;
        return false;
    }
    public function fetch(int $mode=PDO::FETCH_ASSOC):array|false{
        $p=$this->params;
        if(str_contains($this->sql,'FROM reserva_sala')){
            return $this->fetchColumn()?['IdSalaReserva'=>(int)$p[0],'IdInstitucion'=>(int)$p[1]]:false;
        }
        return false;
    }
    public function fetchAll(int $mode=PDO::FETCH_ASSOC):array{return [];}
}
function eq(mixed $a,mixed $b):void{if($a!==$b)throw new RuntimeException('Mismatched expectation');}
function blocked(callable $f,string $exception=DomainException::class):void{
    try{$f();}catch(Throwable $e){if($e instanceof $exception)return;throw new RuntimeException('Wrong exception '.get_class($e));}
    throw new RuntimeException('Operation was not denied');
}
function protocol():array{return ['idprotA'=>501,'tituloA'=>'Fixture','nprotA'=>'QA',
  'InvestigadorACargA'=>'Fixture','departamento'=>'QA','tipoprotocolo'=>1,
  'CantidadAniA'=>5,'severidad'=>1,'FechaIniProtA'=>'2026-11-07',
  'FechaFinProtA'=>'2027-01-01','especies'=>[]];}
function room(int $id):array{return ['IdSalaReserva'=>$id,'IdInstitucion'=>1,'Nombre'=>'Fixture',
  'Lugar'=>'QA','tipohorasalas'=>1,'habilitado'=>1];}
function instrument(int $id):array{return ['IdReservaInstrumento'=>$id,'IdInstitucion'=>1,
  'NombreInstrumento'=>'Fixture','cantidad'=>1,'detalleInstrumento'=>''];}
$ok=0;$bad=0;
function qa(string $name,callable $f):void{
    global $ok,$bad;
    try{$f();$ok++;echo "PASS $name\n";}
    catch(Throwable $e){$bad++;echo "FAIL $name ".get_class($e)."\n";}
}
qa('role-admin-own-inst',static fn()=>eq(InstitutionScope::resolve(['role'=>2,'instId'=>1],null),1));
qa('role-investigator-own-inst',static fn()=>eq(InstitutionScope::resolve(['role'=>3,'instId'=>12],12),12));
qa('role-admin-cross-inst-rejected',static fn()=>blocked(static fn()=>InstitutionScope::resolve(['role'=>2,'instId'=>1],12)));
qa('role-investigator-cross-inst-rejected',static fn()=>blocked(static fn()=>InstitutionScope::resolve(['role'=>3,'instId'=>12],1)));
qa('role-superadmin-explicit-cross-inst',static fn()=>eq(InstitutionScope::resolve(['role'=>1,'instId'=>0],12),12));
qa('role-invalid-inst-rejected',static fn()=>blocked(static fn()=>InstitutionScope::resolve(['role'=>2,'instId'=>1],'xyz'),InvalidArgumentException::class));
qa('role-superadmin-must-select-inst',static fn()=>blocked(static fn()=>InstitutionScope::resolve(['role'=>1,'instId'=>0],null),InvalidArgumentException::class));
qa('protocol-foreign-user-no-write',static function(){
    $db=new FakeDb();blocked(static fn()=>(new UsuarioTodosProtocolosModel($db))->updateInternal(protocol(),22,1));
    eq(count($db->writes()),0);eq($db->rollbackCount,1);
});
qa('protocol-foreign-inst-no-write',static function(){
    $db=new FakeDb();blocked(static fn()=>(new UsuarioTodosProtocolosModel($db))->updateInternal(protocol(),11,12));
    eq(count($db->writes()),0);eq($db->rollbackCount,1);
});
qa('protocol-bad-id-no-transaction',static function(){
    $db=new FakeDb();$v=protocol();$v['idprotA']=0;
    blocked(static fn()=>(new UsuarioTodosProtocolosModel($db))->updateInternal($v,11,1),InvalidArgumentException::class);
    eq(count($db->queries),0);
});
qa('protocol-owner-update-succeeds',static function(){
    $db=new FakeDb();(new UsuarioTodosProtocolosModel($db))->updateInternal(protocol(),11,1);
    eq($db->commitCount,1);if(count($db->writes())<2)throw new RuntimeException('No writes executed');
});
qa('sala-foreign-read-rejected',static function(){
    $db=new FakeDb();blocked(static fn()=>(new AdminConfigReservasModel($db))->getSalaDetail(202,1));
    eq(count($db->writes()),0);
});
qa('sala-local-read-allowed',static function(){
    $db=new FakeDb();$v=(new AdminConfigReservasModel($db))->getSalaDetail(101,1);
    eq($v['sala']['IdInstitucion'],1);
});
qa('sala-foreign-toggle-denied',static function(){
    $db=new FakeDb();blocked(static fn()=>(new AdminConfigReservasModel($db))->toggleSala(202,1,1));
    eq(count($db->writes()),0);
});
qa('sala-local-toggle-scoped',static function(){
    $db=new FakeDb();(new AdminConfigReservasModel($db))->toggleSala(101,0,1);
    $sql=$db->writes()[0][0];if(!str_contains($sql,'IdInstitucion = ?'))throw new RuntimeException();
});
qa('sala-foreign-update-denied',static function(){
    $db=new FakeDb();blocked(static fn()=>(new AdminConfigReservasModel($db))->saveSala(room(202),[]));
    eq(count($db->writes()),0);eq($db->rollbackCount,1);
});
qa('sala-local-update-scoped',static function(){
    $db=new FakeDb();(new AdminConfigReservasModel($db))->saveSala(room(101),[]);
    eq($db->commitCount,1);
    if(!str_contains($db->writes()[0][0],'IdInstitucion=?'))throw new RuntimeException();
});
qa('instrument-foreign-toggle-denied',static function(){
    $db=new FakeDb();blocked(static fn()=>(new AdminConfigReservasModel($db))->toggleInst(402,1,1));
    eq(count($db->writes()),0);
});
qa('instrument-local-toggle-scoped',static function(){
    $db=new FakeDb();(new AdminConfigReservasModel($db))->toggleInst(301,1,1);
    if(!str_contains($db->writes()[0][0],'IdInstitucion = ?'))throw new RuntimeException();
});
qa('instrument-foreign-update-denied',static function(){
    $db=new FakeDb();blocked(static fn()=>(new AdminConfigReservasModel($db))->saveInst(instrument(402),[]));
    eq(count($db->writes()),0);eq($db->rollbackCount,1);
});
qa('instrument-cross-tenant-room-rollback',static function(){
    $db=new FakeDb();blocked(static fn()=>(new AdminConfigReservasModel($db))->saveInst(instrument(301),[202]));
    eq($db->commitCount,0);eq($db->rollbackCount,1);
});
qa('instrument-local-save-allowed',static function(){
    $db=new FakeDb();(new AdminConfigReservasModel($db))->saveInst(instrument(301),[101]);
    eq($db->commitCount,1);
});
qa('instrument-room-list-query-scoped',static function(){
    $db=new FakeDb();(new AdminConfigReservasModel($db))->getInstSalasPermitidas(402,1);
    $sql=$db->queries[0][0];if(!str_contains($sql,'instr.IdInstitucion = ?')||!str_contains($sql,'sala.IdInstitucion = ?'))throw new RuntimeException();
    eq($db->queries[0][1],[402,1,1]);
});
echo "QA_TENANT_RESULT passed=$ok failed=$bad\n";exit($bad===0?0:1);
