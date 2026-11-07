<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Controllers\ControllerusuarioTodosProtocolos;
use App\Controllers\AuthController;
use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;

final class NetworkModelFixture extends UsuarioTodosProtocolosModel {
    public function getConfig($instId): array{return ['tenant'=>(int)$instId];}
    public function getNetworkTargets($instId): array {
        return (int)$instId===1 ? [['IdInstitucion'=>12],['IdInstitucion'=>15]] : [];
    }
    public function userHasApprovedVigentProtocol($userId): bool{return false;}
}
$scenario=$argv[1]??'own';
$role=$scenario==='superadmin'?1:3;
$home=$scenario==='superadmin'?0:1;
$target=match($scenario){
    'own'=>null,'allowed-network'=>'12','not-network'=>'77',
    'wrong-value'=>'abc','superadmin'=>'77','invalid-zero'=>'0',
    default=>null,
};
$_ENV['JWT_SECRET']='qa-only-jwt-key-f3ff405b77d148b5ac41981d';
$fake=new stdClass();
$auth=new AuthController($fake);
$jwt=(new ReflectionMethod($auth,'generateJWT'))->invoke($auth,11,$role,$home);
$_SERVER['HTTP_AUTHORIZATION']='Bearer '.$jwt;
$_GET=$target===null?[]:['inst'=>$target];
$expected=match($scenario){
    'own','allowed-network','superadmin'=>200,
    'not-network'=>403,'wrong-value','invalid-zero'=>400,default=>999
};
$wanted=match($scenario){'allowed-network'=>12,'superadmin'=>77,default=>1};
ob_start();
register_shutdown_function(static function()use($scenario,$expected,$wanted):void{
    $body=(string)ob_get_contents();while(ob_get_level())ob_end_clean();
    $json=json_decode($body,true);$status=http_response_code();if($status===false)$status=200;
    $pass=is_array($json)&&$status===$expected;
    if($expected===200){
        $pass=$pass&&($json['status']??null)==='success'&&
            (int)($json['data']['tenant']??0)===$wanted;
    } else {
        $pass=$pass&&($json['status']??null)==='error';
    }
    echo ($pass?'PASS':'FAIL').' network-config='.$scenario.' status='.$status."\n";
    if(!$pass)exit(1);
});
$ctrl=new ControllerusuarioTodosProtocolos($fake);
(new ReflectionProperty(ControllerusuarioTodosProtocolos::class,'model'))
    ->setValue($ctrl,new NetworkModelFixture($fake));
$ctrl->getConfig();
