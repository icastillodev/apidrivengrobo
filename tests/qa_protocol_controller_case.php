<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Controllers\ProtocolController;
use App\Models\Protocol\ProtocolModel;

final class FixtureProtocolModel extends ProtocolModel {
    public function getByInstitution($instId): array { return ['tenant' => (int)$instId]; }
    public function getFormData($instId): array { return ['tenant' => (int)$instId]; }
    public function getPendingRequestsCount($instId): int { return (int)$instId; }
}

$action = (string)($argv[1]??'getByInstitution');
$scenario = (string)($argv[2]??'own');
$expectedStatus = match($scenario) {
    'own','superadmin' => 200,
    'other' => 403,
    'invalid' => 400,
    'no-session','bad-token' => 401,
    default => 999,
};
$expectedTenant = $scenario==='superadmin'?12:1;
$_ENV['JWT_SECRET']='fixture-only-not-a-real-secret-4bce40872de3a108';
$_SERVER['REQUEST_METHOD']='GET';
if($scenario==='no-session') {
    unset($_SERVER['HTTP_AUTHORIZATION']);
} elseif($scenario==='bad-token') {
    $_SERVER['HTTP_AUTHORIZATION']='Bearer corrupted';
} else {
    $payload=['userId'=>11,'instId'=>$scenario==='superadmin'?0:1,'role'=>$scenario==='superadmin'?1:2,'exp'=>time()+3600];
    $encode=static fn($v)=>rtrim(strtr(base64_encode(json_encode($v)),'+/','-_'),'=');
    $h=$encode(['alg'=>'HS256','typ'=>'JWT']);
    $p=$encode($payload);
    $sig=rtrim(strtr(base64_encode(hash_hmac('sha256',$h.'.'.$p,$_ENV['JWT_SECRET'],true)),'+/','-_'),'=');
    $_SERVER['HTTP_AUTHORIZATION']='Bearer '.$h.'.'.$p.'.'.$sig;
}
$_GET['inst']=match($scenario){
    'other','superadmin' => '12',
    'invalid' => 'abc',
    default => '1'
};
ob_start();
register_shutdown_function(static function() use($action,$scenario,$expectedStatus,$expectedTenant):void {
    $body=ob_get_contents();
    while(ob_get_level()>0)ob_end_clean();
    $json=json_decode((string)$body,true);
    $status=http_response_code();
    // PHP CLI retorna false para el código 200 implícito; el servidor HTTP usa 200.
    if($status===false)$status=200;
    $okay=is_array($json)&&$status===$expectedStatus;
    if($expectedStatus===200) {
        $expected = $action==='getPendingCount'
            ? (int)($json['count']??0)
            : (int)($json['data']['tenant']??0);
        $okay=$okay&&($json['status']??'')==='success'&&$expected===$expectedTenant;
    } else {
        $okay=$okay&&($json['status']??'')==='error'&& !isset($json['data']);
    }
    echo ($okay?'PASS':'FAIL').' action='.$action.' role='.$scenario.' status='.$status."\n";
    if(!$okay)exit(1);
});
$controller=new ProtocolController(new stdClass());
$ref=new ReflectionProperty(ProtocolController::class,'model');
$ref->setValue($controller,new FixtureProtocolModel(new stdClass()));
if(!in_array($action,['getByInstitution','getFormData','getPendingCount'],true))throw new RuntimeException('Unsupported action');
$controller->{$action}();
