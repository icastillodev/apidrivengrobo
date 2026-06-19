<?php
namespace App\Controllers;

use App\Models\Auth\AuthModel;
use App\Models\Auth\AuthService;
use App\Utils\Auditoria; // Importamos nuestro guardián
use App\Utils\ModulosInstitucion;

class AuthController {
    private $service;
    private $db;
    private $model;

    public function __construct($db) { 
        $this->db = $db; // Guardamos la BD para la bitácora
        $this->model = new AuthModel($db);
        $this->service = new AuthService($this->model); 
    }

    /**
     * Función para obtener la IP Real (Atraviesa Cloudflare y Proxies)
     */
    private function getUserIP() {
        if (isset($_SERVER["HTTP_CF_CONNECTING_IP"])) {
            return $_SERVER["HTTP_CF_CONNECTING_IP"];
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Generador seguro de JSON Web Tokens (JWT)
     */
    private function generateJWT($userId, $role, $instId) {
        $payload = [
            'userId' => $userId,
            'role'   => $role,
            'instId' => $instId,
            'exp'    => time() + (86400 * 7) // Expira en 7 días
        ];
        
        $secretKey = $_ENV['JWT_SECRET'] ?? 'TuClaveSuperSecretaGROBO2026';
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $b64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $b64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
        $signature = hash_hmac('sha256', $b64Header . "." . $b64Payload, $secretKey, true);
        $b64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $b64Header . "." . $b64Payload . "." . $b64Signature;
    }

    /**
     * Proceso principal de Login (Aplica tanto a Sede como a Superadmin)
     */
    public function login() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // 1. OBTENER LA IP Y REVISAR EL ESCUDO
        $ip = $this->getUserIP();
        
        if ($this->model->isIpBlocked($ip)) {
            http_response_code(429); // Código 429: Demasiadas Peticiones
            echo json_encode([
                'status' => 'error', 
                'message' => 'Demasiados intentos fallidos. Por seguridad, tu acceso ha sido bloqueado por 5 minutos.'
            ]);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['user'], $data['pass'], $data['instSlug'])) {
            echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
            exit;
        }
        // Misma normalización que AuthModel::normalizeForLogin (espacios/NBSP/colapso).
        $data['user'] = is_string($data['user'])
            ? AuthModel::normalizeForLogin($data['user'])
            : $data['user'];

        // Determinar qué tipo de validación hacer según el Slug
        if ($data['instSlug'] === 'master' || $data['instSlug'] === 'superadmin') {
            $res = $this->service->attemptSuperAdminLogin($data['user'], $data['pass']);
        } else {
            $clientInstId = isset($data['instId']) ? (int) $data['instId'] : 0;
            $res = $this->service->authenticate($data['user'], $data['pass'], $data['instSlug'], $clientInstId > 0 ? $clientInstId : null);
        }

        // 2. SI FALLA EL LOGIN, CASTIGAMOS A LA IP
        if (!$res['status']) {
            $this->model->recordFailedLogin($ip); // Sumamos 1 intento fallido
            $out = ['status' => 'error', 'message' => $res['message']];
            if (!empty($res['code'])) {
                $out['code'] = $res['code'];
            }
            echo json_encode($out);
            exit;
        }

        // 3. SI EL LOGIN ES EXITOSO (O VA A 2FA), PERDONAMOS A LA IP
        $this->model->resetLoginAttempts($ip);

        // Si el usuario requiere autenticación de 2 factores
        if ($res['status'] === '2fa_required') {
            echo json_encode([
                'status' => '2fa_required',
                'userId' => $res['userId'],
                'message' => 'Código de seguridad enviado al correo'
            ]);
            exit;
        }

        $user = $res['user'];
        
        // ¡CREAMOS EL TOKEN SEGURO!
        $tokenReal = $this->generateJWT($user['IdUsrA'], $user['role'], $user['IdInstitucion']);

        // GUARDAMOS AUDITORÍA DEL LOGIN
        Auditoria::logManual($this->db, $user['IdUsrA'], 'LOGIN', 'usuarioe', 'Inicio de sesión exitoso en sede: ' . $data['instSlug']);

        $snap = $this->snapshotModulosConInvLegacy(
            (int) $user['IdInstitucion'],
            (int) $user['role'],
            (int) $user['IdUsrA']
        );

        echo json_encode([
            'status'   => 'success',
            'token'    => $tokenReal,
            'userId'   => $user['IdUsrA'],
            'userName' => $user['UsrA'],
            'userFull' => $user['Nombre'] ?? $user['UsrA'],
            'userApe'  => $user['ApellidoA'] ?? $user['UsrA'],
            'role'     => $user['role'],
            'instId'   => $user['IdInstitucion'],
            'modulos'  => $snap,
        ]);
        exit;
    }

    /**
     * Verificación del Segundo Factor de Autenticación (2FA)
     */
    public function verify2FA() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['userId'], $data['code'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            exit;
        }

        $user = $this->service->verify2FACode($data['userId'], $data['code']);

        if ($user) {
            $finalInstId = (int) $user['IdInstitucion'];
            if ((int) $user['role'] === 1 && array_key_exists('instId', $data) && $data['instId'] !== 'null') {
                $clientInstId = (int) $data['instId'];
                if ($clientInstId > 0) {
                    $finalInstId = $clientInstId;
                } elseif ($clientInstId === 0) {
                    $finalInstId = 0;
                }
            }

            // ¡CREAMOS EL TOKEN SEGURO DESPUÉS DEL 2FA!
            $tokenReal = $this->generateJWT($user['IdUsrA'], $user['role'], $finalInstId);

            // GUARDAMOS AUDITORÍA
            Auditoria::logManual($this->db, $user['IdUsrA'], 'LOGIN_2FA', 'usuarioe', 'Inicio de sesión con 2FA exitoso');

            $snap = $this->snapshotModulosConInvLegacy(
                (int) $finalInstId,
                (int) $user['role'],
                (int) $user['IdUsrA']
            );

            echo json_encode([
                'status'   => 'success',
                'token'    => $tokenReal,
                'userId'   => $user['IdUsrA'],
                'userName' => $user['UsrA'], 
                'userFull' => $user['NombreA'] ?? $user['UsrA'],
                'userApe'  => $user['ApellidoA'] ?? $user['UsrA'],
                'role'     => $user['role'],
                'instId'   => $finalInstId,
                'modulos'  => $snap,
            ]);
        } else {
            $reason = $this->service->classify2FAFailure((int) $data['userId'], (string) $data['code']);
            $codeKey = $reason === 'expired' ? '2fa_expired' : '2fa_invalid';
            echo json_encode([
                'status'  => 'error',
                'code'    => $codeKey,
                'message' => $codeKey,
            ]);
        }
        exit;
    }

    /**
     * Puente para login SuperAdmin
     */
    public function loginSuperAdmin() {
        $this->login();
    }

    /**
     * Validación inicial del slug de la sede al cargar la página index.html
     */
    public function validateInstitution($slug) {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        $slugNorm = '';
        try {
            $slugNorm = is_string($slug) ? strtolower(trim(rawurldecode($slug), " \t\n\r\0\x0B/")) : '';

            if ($slugNorm === 'superadmin' || $slugNorm === 'admingrobogecko') {
                echo json_encode(
                    ["status" => "success", "data" => ["id" => 0, "nombre" => "MAESTRO"]],
                    JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
                );
                exit;
            }

            $instData = $this->service->validateSlug($slugNorm);

            if ($instData) {
                $payload = [
                    'status' => 'success',
                    'data' => [
                        'id' => (int) ($instData['IdInstitucion'] ?? 0),
                        'nombre' => (string) ($instData['NombreInst'] ?? ''),
                        'nombre_completo' => (string) ($instData['NombreCompletoInst'] ?? ''),
                        'dependencia' => (string) ($instData['DependenciaInstitucion'] ?? ''),
                        'web' => (string) ($instData['Web'] ?? ''),
                        'Logo' => $instData['Logo'] ?? null,
                        'LogoEnPdf' => isset($instData['LogoEnPdf']) ? (int) $instData['LogoEnPdf'] : 0,
                        'UsuariosVenPreciosFacturacion' => isset($instData['UsuariosVenPreciosFacturacion']) ? (int) $instData['UsuariosVenPreciosFacturacion'] : 0,
                    ],
                ];
                echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
            } else {
                http_response_code(404);
                echo json_encode(
                    ['status' => 'error', 'message' => 'Institución no válida'],
                    JSON_UNESCAPED_UNICODE
                );
            }
        } catch (\Throwable $e) {
            error_log('validateInstitution [' . $slugNorm . ']: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(
                ['status' => 'error', 'message' => 'Error al validar la sede'],
                JSON_UNESCAPED_UNICODE
            );
        }
        exit;
    }
// =========================================================
    // 🚀 ENDPOINTS DEL ESCUDO DE SEGURIDAD
    // =========================================================

    public function securityCheck() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion(); // Valida que esté logueado
            $data = $this->model->getSecurityStatus($sesion['userId']);
            
            // 🚀 FIX CRIPTOGRÁFICO: Comparamos dinámicamente usando password_verify
            // Esto asegura que detecte "12345678" sin importar qué "salt" aleatorio tenga el hash
            $needsPass = false;
            if (!empty($data['password_secure'])) {
                $needsPass = password_verify('12345678', $data['password_secure']);
            } else {
                // Si por alguna razón el campo está totalmente vacío, también requiere cambio
                $needsPass = true;
            }
            
            // Verificamos si no tiene email o si el email es inválido (no tiene @)
            $correoReal = trim($data['EmailA'] ?? '');
            $needsEmail = empty($correoReal) || strpos($correoReal, '@') === false;

            echo json_encode([
                'status' => 'success', 
                'needsPass' => $needsPass, 
                'needsEmail' => $needsEmail
            ]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Módulos contratados para la institución de la sesión (JWT).
     */
    public function sessionModulos() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $snap = $this->snapshotModulosConInvLegacy(
                (int) $sesion['instId'],
                (int) $sesion['role'],
                (int) ($sesion['userId'] ?? 0)
            );
            echo json_encode(['status' => 'success', 'data' => $snap]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Snapshot de módulos + flags de datos legacy del investigador (menú / UI solo lectura).
     *
     * @return array{byKey: array<string,int>, list: array<int, array<string,mixed>>, invHasData?: array<string,bool>}
     */
    private function snapshotModulosConInvLegacy(int $instId, int $roleId, int $userId): array
    {
        $snap = ModulosInstitucion::getSnapshot($this->db, $instId);
        if ($userId > 0 && ModulosInstitucion::esRolInvestigadorVisibilidadModulos($roleId)) {
            $snap['invHasData'] = ModulosInstitucion::getInvestigatorLegacyDataFlags($this->db, $userId, $instId);
        }

        return $snap;
    }

    public function updateSecurity() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = json_decode(file_get_contents('php://input'), true);
            
            $this->model->updateSecurity($sesion['userId'], $data);
            
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error de base de datos']);
        }
        exit;
    }
}