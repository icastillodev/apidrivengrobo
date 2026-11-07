<?php
declare(strict_types=1);
namespace App\Utils;

final class ApiExceptionHandler
{
    /** @return array{http:int,status:string,message:string} */
    public static function format(\Throwable $error): array
    {
        if ($error instanceof AuthenticationException) {
            return ['http' => 401, 'status' => 'error', 'message' => 'Token inválido o expirado. Inicie sesión nuevamente.'];
        }
        if ($error instanceof \DomainException) {
            return ['http' => 403, 'status' => 'error', 'message' => 'No tiene permisos para realizar esta operación.'];
        }
        if ($error instanceof \InvalidArgumentException) {
            return ['http' => 400, 'status' => 'error', 'message' => 'Solicitud inválida. Verifique los datos.'];
        }
        return ['http' => 500, 'status' => 'error', 'message' => 'Error interno del servidor.'];
    }

    public static function respond(\Throwable $error): void
    {
        if (ob_get_level() > 0) {
            ob_clean();
        }
        $data = self::format($error);
        if (!headers_sent()) {
            http_response_code($data['http']);
            header('Content-Type: application/json; charset=UTF-8');
        }
        echo json_encode(['status' => $data['status'], 'message' => $data['message']],
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
}
