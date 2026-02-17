<?php
namespace App\Controllers;

use App\Models\Auth\AuthModel;
use App\Models\Auth\AuthService;

class AuthController {
    private $service;

    public function __construct($db) { 
        $model = new AuthModel($db);
        $this->service = new AuthService($model); 
    }

    /**
     * LOGIN UNIFICADO (Sedes y SuperAdmin)
     * Soporta 2FA para roles 1 y 2.
     */
    public function login() {
        if (ob_get_length()) ob_clean();
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['user'], $data['pass'], $data['instSlug'])) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
            exit;
        }

        // --- 1. LOGIN SUPERADMIN (Panel Maestro) ---
        if ($data['instSlug'] === 'master' || $data['instSlug'] === 'superadmin') {
            $res = $this->service->attemptSuperAdminLogin($data['user'], $data['pass']);
        } 
        // --- 2. LOGIN NORMAL (Por Sede) ---
        else {
            $res = $this->service->authenticate($data['user'], $data['pass'], $data['instSlug']);
        }
        
        header('Content-Type: application/json');

        // A. ERROR
        if (!$res['status']) {
            echo json_encode(['status' => 'error', 'message' => $res['message']]);
            exit;
        }

        // B. REQUIERE 2FA (Roles 1 y 2)
        if ($res['status'] === '2fa_required') {
            echo json_encode([
                'status' => '2fa_required',
                'userId' => $res['userId'],
                'message' => 'Código de seguridad enviado al correo'
            ]);
            exit;
        }

        // C. ÉXITO DIRECTO (Roles 3+)
        $user = $res['user'];
        echo json_encode([
            'status'   => 'success',
            'token'    => bin2hex(random_bytes(16)),
            'userId'   => $user['IdUsrA'],
            'userName' => $user['UsrA'],
            'userFull' => $user['Nombre'] ?? $user['UsrA'],
            'userApe' => $user['ApellidoA'] ?? $user['UsrA'],
            'role'     => $user['role'],
            'instId'   => $user['IdInstitucion']
        ]);
        exit;
    }

    /**
     * VERIFICACIÓN DE CÓDIGO 2FA
     * Nuevo Endpoint
     */
    public function verify2FA() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['userId'], $data['code'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            exit;
        }

        // Validamos el código
        $user = $this->service->verify2FACode($data['userId'], $data['code']);

        if ($user) {
            // Si hay un contexto de institución forzado (ej: SuperAdmin entrando a una sede)
            $finalInstId = $user['IdInstitucion'];
            if (isset($data['instId']) && $data['instId'] != 'null' && $user['role'] == 1) {
                $finalInstId = $data['instId'];
            }

            echo json_encode([
                'status'   => 'success',
                'token'    => bin2hex(random_bytes(16)),
                'userId'   => $user['IdUsrA'],
                'userName' => $user['UsrA'], // Asegurado en el Service
                'userFull' => $user['NombreA'] ?? $user['UsrA'],
                'userApe' => $user['ApellidoA'] ?? $user['UsrA'],
                'role'     => $user['role'],
                'instId'   => $finalInstId
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Código inválido o expirado']);
        }
        exit;
    }

    public function loginSuperAdmin() {
        $this->login();
    }

    public function validateInstitution($slug) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

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