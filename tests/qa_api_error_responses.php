<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';

use App\Utils\ApiExceptionHandler;
use App\Utils\AuthenticationException;
use App\Utils\Auditoria;

$checks=0;$failed=0;
function verify(string $name,callable $run):void{
    global $checks,$failed;
    try{$run();$checks++;echo "PASS $name\n";}
    catch(\Throwable $e){$failed++;echo "FAIL $name ".get_class($e)."\n";}
}
function expected(array $result,int $code,string $text):void{
    if($result['http']!==$code || $result['status']!=='error' || $result['message']!==$text)throw new \RuntimeException('Incorrect status or response');
}
verify('no-session-has-typed-auth-exception',static function(){
    unset($_SERVER['HTTP_AUTHORIZATION'],$_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    try{Auditoria::getDatosSesion();}catch(AuthenticationException){return;}
    throw new \RuntimeException('No auth error');
});
verify('malformed-token-has-typed-auth-exception',static function(){
    $_SERVER['HTTP_AUTHORIZATION']='Bearer invalid';
    try{Auditoria::getDatosSesion();}catch(AuthenticationException){unset($_SERVER['HTTP_AUTHORIZATION']);return;}
    throw new \RuntimeException('No auth error');
});
verify('missing-auth-is-401',static fn()=>expected(ApiExceptionHandler::format(new AuthenticationException('internal token details')),401,'Token inválido o expirado. Inicie sesión nuevamente.'));
verify('tenant-denied-is-403',static fn()=>expected(ApiExceptionHandler::format(new \DomainException('internal tenant details')),403,'No tiene permisos para realizar esta operación.'));
verify('invalid-argument-is-400',static fn()=>expected(ApiExceptionHandler::format(new \InvalidArgumentException('internal input details')),400,'Solicitud inválida. Verifique los datos.'));
verify('generic-application-error-is-500',static fn()=>expected(ApiExceptionHandler::format(new \RuntimeException('sensitive diagnostic')),500,'Error interno del servidor.'));
verify('php-errors-return-json-only',static function(){
    ob_start();
    ApiExceptionHandler::respond(new AuthenticationException('should not leak'));
    $raw=ob_get_clean();
    $data=json_decode($raw,true);
    if(!is_array($data)||($data['status']??null)!=='error'||($data['message']??null)!=='Token inválido o expirado. Inicie sesión nuevamente.'||str_contains($raw,'should not leak'))throw new \RuntimeException('Unexpected API response');
});
echo "QA_API_ERROR_RESULT passed=$checks failed=$failed\n";
exit($failed===0?0:1);
