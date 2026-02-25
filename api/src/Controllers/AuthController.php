<?php
namespace App\Controllers;

use App\Models\Auth\AuthModel;
use App\Models\Auth\AuthService;
use App\Utils\Auditoria; // Importamos nuestro guardián

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

        // Determinar qué tipo de validación hacer según el Slug
        if ($data['instSlug'] === 'master' || $data['instSlug'] === 'superadmin') {
            $res = $this->service->attemptSuperAdminLogin($data['user'], $data['pass']);
        } else {
            $res = $this->service->authenticate($data['user'], $data['pass'], $data['instSlug']);
        }

        // 2. SI FALLA EL LOGIN, CASTIGAMOS A LA IP
        if (!$res['status']) {
            $this->model->recordFailedLogin($ip); // Sumamos 1 intento fallido
            echo json_encode(['status' => 'error', 'message' => $res['message']]);
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

        echo json_encode([
            'status'   => 'success',
            'token'    => $tokenReal,
            'userId'   => $user['IdUsrA'],
            'userName' => $user['UsrA'],
            'userFull' => $user['Nombre'] ?? $user['UsrA'],
            'userApe'  => $user['ApellidoA'] ?? $user['UsrA'],
            'role'     => $user['role'],
            'instId'   => $user['IdInstitucion']
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
            $finalInstId = $user['IdInstitucion'];
            if (isset($data['instId']) && $data['instId'] != 'null' && $user['role'] == 1) {
                $finalInstId = $data['instId'];
            }

            // ¡CREAMOS EL TOKEN SEGURO DESPUÉS DEL 2FA!
            $tokenReal = $this->generateJWT($user['IdUsrA'], $user['role'], $finalInstId);

            // GUARDAMOS AUDITORÍA
            Auditoria::logManual($this->db, $user['IdUsrA'], 'LOGIN_2FA', 'usuarioe', 'Inicio de sesión con 2FA exitoso');

            echo json_encode([
                'status'   => 'success',
                'token'    => $tokenReal,
                'userId'   => $user['IdUsrA'],
                'userName' => $user['UsrA'], 
                'userFull' => $user['NombreA'] ?? $user['UsrA'],
                'userApe'  => $user['ApellidoA'] ?? $user['UsrA'],
                'role'     => $user['role'],
                'instId'   => $finalInstId
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Código inválido o expirado']);
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
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        // Los slugs reservados para administración maestra devuelven mock data
        if ($slug === 'superadmin' || $slug === 'admingrobogecko') {
            echo json_encode(["status" => "success", "data" => ["id" => 0, "nombre" => "MAESTRO"]]);
            exit;
        }

        $instData = $this->service->validateSlug($slug);
        
        if ($instData) {
            echo json_encode([
                "status" => "success",
                "data" => [
                    "id" => $instData['IdInstitucion'],
                    "nombre" => $instData['NombreInst'],
                    "nombre_completo" => $instData['NombreCompletoInst'],
                    "dependencia" => $instData['DependenciaInstitucion'],
                    "web" => $instData['Web'],
                    "Logo" => $instData['Logo']
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Institución no válida"]);
        }
        exit;
    }
}