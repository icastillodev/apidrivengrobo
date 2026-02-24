<?php
namespace App\Utils;

use PDO;
use Exception;

class Auditoria {
    
    /**
     * Extrae y verifica matemáticamente que el Token no haya sido alterado por un hacker.
     */
    public static function getDatosSesion() {
        $headers = apache_request_headers();
        $token = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($token)) {
            throw new Exception("Acceso denegado: No se proporcionó credencial de seguridad.");
        }
        
        $token = str_replace('Bearer ', '', $token);
        $parts = explode('.', $token);
        
        if (count($parts) === 3) {
            $secretKey = $_ENV['JWT_SECRET'] ?? 'TuClaveSuperSecretaGROBO2026';
            
            // 1. Verificamos que la firma no haya sido falsificada
            $signature = hash_hmac('sha256', $parts[0] . "." . $parts[1], $secretKey, true);
            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
            
            if (!hash_equals($base64UrlSignature, $parts[2])) {
                throw new Exception("Token adulterado o inválido.");
            }

            $payload = json_decode(base64_decode($parts[1]), true);
            
            // 2. Verificamos expiración
            if (isset($payload['exp']) && time() > $payload['exp']) {
                throw new Exception("El token ha expirado. Inicie sesión nuevamente.");
            }

            return [
                'userId' => $payload['userId'], 
                'instId' => $payload['instId'],
                'role'   => $payload['role']
            ];
        }
        
        throw new Exception("Formato de token incorrecto.");
    }

    /**
     * Guarda en la Bitácora el movimiento leyendo el token automáticamente
     */
    public static function log($db, $accion, $tabla, $detalle) {
        try {
            $sesion = self::getDatosSesion();
            self::logManual($db, $sesion['userId'], $accion, $tabla, $detalle);
        } catch (Exception $e) {
            error_log("Error en Bitácora (Sesión): " . $e->getMessage());
        }
    }

    /**
     * Guarda en la Bitácora de forma manual (Ideal para el Login donde aún no hay token en el header)
     */
    public static function logManual($db, $userId, $accion, $tabla, $detalle) {
        try {
            $stmt = $db->prepare("INSERT INTO bitacora (id_usuario, accion, tabla_afectada, detalle, fecha_hora) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$userId, $accion, $tabla, $detalle]);
        } catch (Exception $e) {
            error_log("Error en Bitácora (Manual): " . $e->getMessage());
        }
    }
}