<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Utils\JwtSigningKey;
use App\Utils\Auditoria;
use App\Utils\AuthenticationException;
use App\Controllers\AuthController;

$passed=0;$failed=0;
function verify(string $label,callable $task):void {
    global $passed,$failed;
    try{$task();$passed++;echo 'PASS '.$label."\n";}
    catch(\Throwable $e){$failed++;echo 'FAIL '.$label.' ['.get_class($e).']'."\n";}
}
function expectThrow(callable $task,string $clazz):void {
    try {$task();}
    catch(\Throwable $e){if($e instanceof $clazz)return;throw new \RuntimeException('Unexpected exception '.get_class($e));}
    throw new \RuntimeException('Exception was not raised');
}
function setSecret(?string $secret):void {
    if($secret===null) {
        unset($_ENV['JWT_SECRET'],$_SERVER['JWT_SECRET']);
        putenv('JWT_SECRET');
    } else {
        $_ENV['JWT_SECRET']=$secret;
        unset($_SERVER['JWT_SECRET']);
        putenv('JWT_SECRET');
    }
}
verify('jwt-key-missing-fails-closed',static function(){
    setSecret(null);
    expectThrow(static fn()=>JwtSigningKey::get(),\RuntimeException::class);
});
verify('jwt-key-default-fails-closed',static function(){
    setSecret('TuClaveSuperSecretaGROBO2026');
    expectThrow(static fn()=>JwtSigningKey::get(),\RuntimeException::class);
});
verify('jwt-key-short-fails-closed',static function(){
    setSecret(str_repeat('a',31));
    expectThrow(static fn()=>JwtSigningKey::get(),\RuntimeException::class);
});
verify('jwt-key-random-length-32-supported',static function(){
    setSecret(str_repeat('b',32));
    if(JwtSigningKey::get()!==str_repeat('b',32))throw new \RuntimeException('Unexpected secret');
});
verify('jwt-token-issued-and-verified',static function(){
    setSecret('qa-only-hs256-secret-6ba84da0f79a0a53f5ce6e86');
    $auth=new AuthController(new stdClass());
    $method=new \ReflectionMethod($auth,'generateJWT');
    $token=$method->invoke($auth,11,3,1);
    $_SERVER['HTTP_AUTHORIZATION']='Bearer '.$token;
    $session=Auditoria::getDatosSesion();
    if((int)$session['userId']!==11||(int)$session['role']!==3||(int)$session['instId']!==1){
        throw new \RuntimeException('Incorrect claims');
    }
});
verify('jwt-tampered-token-rejected',static function(){
    setSecret('qa-only-hs256-secret-6ba84da0f79a0a53f5ce6e86');
    $auth=new AuthController(new stdClass());
    $method=new \ReflectionMethod($auth,'generateJWT');
    $token=$method->invoke($auth,11,3,1);
    $parts=explode('.',$token);
    $parts[2]=str_repeat('a',strlen($parts[2]));
    $_SERVER['HTTP_AUTHORIZATION']='Bearer '.implode('.',$parts);
    expectThrow(static fn()=>Auditoria::getDatosSesion(),AuthenticationException::class);
});
verify('jwt-verify-secret-missing-denied',static function(){
    setSecret('qa-only-hs256-secret-6ba84da0f79a0a53f5ce6e86');
    $auth=new AuthController(new stdClass());
    $method=new \ReflectionMethod($auth,'generateJWT');
    $token=$method->invoke($auth,11,3,1);
    setSecret(null);
    $_SERVER['HTTP_AUTHORIZATION']='Bearer '.$token;
    expectThrow(static fn()=>Auditoria::getDatosSesion(),\RuntimeException::class);
});
echo "QA_JWT_RESULT passed=$passed failed=$failed\n";
exit($failed===0?0:1);
