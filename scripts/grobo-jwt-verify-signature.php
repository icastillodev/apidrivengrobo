<?php
/**
 * Solo verifica localmente firma y lectura de un JWT ficticio.
 * No accede a cuentas, no envía requests, no imprime tokens ni secretos.
 */
declare(strict_types=1);
$api='/var/www/html/core-backend-gem';
try {
    require_once $api.'/autoload.php';
    \App\Utils\EnvLoader::load($api.'/.env');
    $secret=\App\Utils\JwtSigningKey::get();
    $enc=static fn(array $a)=>rtrim(strtr(base64_encode(json_encode($a,JSON_THROW_ON_ERROR)),'+/','-_'),'=');
    $h=$enc(['alg'=>'HS256','typ'=>'JWT']);
    $p=$enc(['userId'=>0,'instId'=>0,'role'=>0,'exp'=>time()+90]);
    $s=rtrim(strtr(base64_encode(hash_hmac('sha256',$h.'.'.$p,$secret,true)),'+/','-_'),'=');
    $_SERVER['HTTP_AUTHORIZATION']='Bearer '.$h.'.'.$p.'.'.$s;
    $read=\App\Utils\Auditoria::getDatosSesion();
    if((int)$read['userId']!==0||(int)$read['instId']!==0||(int)$read['role']!==0){
        throw new \RuntimeException('Token claim mismatch.');
    }
    echo "GROBO_JWT_SIGN_VERIFY_OK\n";
}catch(\Throwable $e){
    error_log('GROBO JWT signature test failed: '.get_class($e));
    echo "GROBO_JWT_SIGN_VERIFY_FAILED\n";
    exit(2);
}
