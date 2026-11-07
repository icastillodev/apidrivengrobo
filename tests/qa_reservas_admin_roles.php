<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';
use App\Controllers\AdminConfigReservasController;

$role=(int)($argv[1]??3);
$allowed=in_array($role,[1,2,4,5,6],true);
ob_start();
register_shutdown_function(static function()use($role,$allowed):void{
    $body=(string)ob_get_contents();
    while(ob_get_level())ob_end_clean();
    $json=json_decode($body,true);
    $status=http_response_code();
    if($status===false)$status=200;
    $correct=$status===($allowed?200:403)&&is_array($json)&&
        ($json['status']??'')===($allowed?'success':'error');
    echo ($correct?'PASS':'FAIL').' admin-reservas-role='.$role.' http='.$status."\n";
    if(!$correct)exit(1);
});
$controller=new AdminConfigReservasController(new stdClass());
(new ReflectionMethod($controller,'requireAdminReservaRole'))->invoke($controller,['role'=>$role,'instId'=>1]);
echo json_encode(['status'=>'success']);
