<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Controllers\ProtocolController;
use App\Controllers\AuthController;

final class FakeAdminSaveDb {
    public int $sqlAttempts = 0;
    public function inTransaction(): bool {return false;}
    public function beginTransaction(): void {throw new RuntimeException('fixture-no-database');}
    public function prepare(string $sql): never {$this->sqlAttempts++;throw new RuntimeException('fixture-no-database');}
}
$role=(int)($argv[1]??3);
$tenant=(int)($argv[2]??1);
$mode=(string)($argv[3]??'own');
$requested=match($mode){'cross'=>12,'none'=>null,default=>$tenant};
$_ENV['JWT_SECRET']='qa-only-jwt-key-6d05ea759b8d47fa85ed61ecb83c';
$auth=new AuthController(new FakeAdminSaveDb());
$jwt=(new ReflectionMethod($auth,'generateJWT'))->invoke($auth,11,$role,$tenant);
$_SERVER['HTTP_AUTHORIZATION']='Bearer '.$jwt;
$_POST=$requested===null?[]:['IdInstitucion'=>(string)$requested];
$_GET=[];
if(!in_array($role,[1,2,4],true))$expected=403;
elseif($role===1&&$requested===null)$expected=400;
elseif($role!==1&&$requested!==$tenant)$expected=403;
else $expected=500;
$db=new FakeAdminSaveDb();
ob_start();
register_shutdown_function(static function()use($role,$tenant,$requested,$db,$expected):void {
    $body=(string)ob_get_contents();
    while(ob_get_level()>0)ob_end_clean();
    $value=json_decode($body,true);
    $status=http_response_code();
    $correct=$status===$expected&&is_array($value)&&($value['status']??null)==='error';
    if($expected!==500&&$db->sqlAttempts!==0)$correct=false;
    echo ($correct?'PASS':'FAIL').' role='.$role.' tenant='.$tenant.
     ' request='.($requested===null?'none':$requested).' status='.$status.
     ' dbAccess='.$db->sqlAttempts."\n";
    if(!$correct)exit(1);
});
(new ProtocolController($db))->save();
