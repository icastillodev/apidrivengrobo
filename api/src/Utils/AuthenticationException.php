<?php
declare(strict_types=1);
namespace App\Utils;

/** Error de autenticación: no debe exponerse como HTTP 500 o stack trace. */
final class AuthenticationException extends \RuntimeException {}
