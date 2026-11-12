<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

$routes=[
    'users' => [\App\Controllers\UserController::class, 'index'],
    'animals' => [\App\Controllers\AnimalController::class, 'getAll'],
    'reactives' => [\App\Controllers\ReactivoController::class, 'getAll'],
    'supplies' => [\App\Controllers\InsumoController::class, 'getAll'],
    'billing' => [\App\Controllers\BillingController::class, 'getAuditHistory'],
];
$name=(string)($argv[1] ?? '');
if (!isset($routes[$name])) {
    throw new RuntimeException('Invalid fixture name');
}
[$class,$method]=$routes[$name];
unset($_SERVER['HTTP_AUTHORIZATION'],$_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
$_GET=[];
ob_start();
register_shutdown_function(static function() use($name):void {
    $body=(string)ob_get_contents();
    while(ob_get_level())ob_end_clean();
    $json=json_decode($body,true);
    $code=http_response_code();
    $ok=$code===401 && is_array($json)
        && ($json['status']??null)==='error'
        && !isset($json['data']);
    echo ($ok?'PASS':'FAIL').' unauthorized-admin-list='.$name.' HTTP='.$code.PHP_EOL;
    if(!$ok)exit(1);
});
$controller=new $class(new stdClass());
$controller->{$method}();
