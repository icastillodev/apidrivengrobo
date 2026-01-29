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
     * Gecko Devs 2026 - Maneja el bypass de institución mediante 'instSlug' => 'master'
     */
    public function login() {
        if (ob_get_length()) ob_clean();
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['user'], $data['pass'], $data['instSlug'])) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
            exit;
        }

        // --- 1. CASO ESPECIAL: LOGIN SUPERADMIN (MAESTRO) ---
        if ($data['instSlug'] === 'master') {
            $res = $this->service->attemptSuperAdminLogin($data['user'], $data['pass']);
            
            header('Content-Type: application/json');
            if ($res['status']) {
                $user = $res['user'];
                echo json_encode([
                    'status'   => 'success',
                    'token'    => bin2hex(random_bytes(16)), 
                    'userId'   => $user['IdUsrA'] ?? 999, // ID del SuperAdmin
                    'userName' => $user['UsrA'] ?? $user['Nombre'], 
                    'userFull' => $user['Nombre'] ?? $user['UsrA'],
                    'role'     => 1, // Forzamos Rol 1 (SuperAdmin)
                    'instId'   => 0  // Institución 0 (Global)
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => $res['message']]);
            }
            exit;
        }

        // --- 2. LOGIN NORMAL (POR SEDE) ---
        $res = $this->service->authenticate($data['user'], $data['pass'], $data['instSlug']);
        
        header('Content-Type: application/json');
        if ($res['status']) {
            $user = $res['user'];
            echo json_encode([
                'status'   => 'success',
                'token'    => bin2hex(random_bytes(16)),
                'userId'   => $user['IdUsrA'],
                'userName' => $user['UsrA'],
                'userFull' => $user['Nombre'] ?? $user['UsrA'],
                'role'     => $user['role'],
                'instId'   => $user['IdInstitucion']
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => $res['message']]);
        }
        exit;
    }

    /**
     * Mantenemos este método por compatibilidad si tienes rutas directas,
     * pero ahora el login() principal puede manejar ambos.
     */
    public function loginSuperAdmin() {
        // Redirigimos internamente al login normal con el flag master
        $this->login();
    }

    /**
     * VALIDA SI LA INSTITUCIÓN EXISTE PARA CARGAR EL LOGIN PERSONALIZADO
     */
    public function validateInstitution($slug) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        // El SuperAdmin es una ruta virtual, no se valida contra DB aquí
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
                    "web" => $instData['Web']
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Institución no válida"]);
        }
        exit;
    }
}