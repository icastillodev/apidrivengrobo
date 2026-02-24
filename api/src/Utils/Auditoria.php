<?php
namespace App\Utils;

use PDO;
use Exception;

class Auditoria {
    
    /**
     * Extrae y verifica matemáticamente que el Token no haya sido alterado por un hacker.
     */
    public static function getDatosSesion() {
        $token = '';

        // 1. INTENTO 1: Buscar en los headers estándar de Apache
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (isset($headers['Authorization'])) {
                $token = $headers['Authorization'];
            } elseif (isset($headers['authorization'])) {
                $token = $headers['authorization'];
            }
        }

        // 2. INTENTO 2: Buscar en las variables genéricas de servidor (Nginx)
        if (empty($token) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $token = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (empty($token) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $token = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        
        if (empty($token)) {
            // DEBUG: Descomentar esto si quieres ver qué headers están llegando
            // error_log("Headers recibidos: " . print_r($_SERVER, true));
            throw new Exception("Acceso denegado: No se proporcionó credencial de seguridad en los headers.");
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

            // 3. Devolvemos la sesión (El SuperAdmin pasará con instId = 0)
            return [
                'userId' => $payload['userId'], 
                'instId' => $payload['instId'] ?? 0,
                'role'   => $payload['role'] ?? $payload['userLevel'] ?? 0
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
            // Si es superadmin (role 1), la auditoría se guarda igual con su userId
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