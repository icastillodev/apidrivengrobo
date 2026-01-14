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

    // 1. QUITAMOS el ($data) de aquí
    public function login() {
        if (ob_get_length()) ob_clean();
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['user'], $data['pass'], $data['instSlug'])) {
            echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
            exit;
        }
        
        $res = $this->service->authenticate($data['user'], $data['pass'], $data['instSlug']);
        
        if ($res['status']) {
            // EXTRAEMOS LOS DATOS DEL USUARIO
            $user = $res['user'];
            
            echo json_encode([
                'status' => 'success',
                'token'  => bin2hex(random_bytes(16)), // Generamos un token temporal
                'userId' => $user['IdUsrA'],           // ESTO ARREGLA EL ID: 0
                'userName' => $user['UsrA'],           // Nombre de usuario (login)
                'userFull' => $user['Nombre'] ?? $user['UsrA'], // Nombre real (si existe en tu DB)
                'role'   => $user['role'],
                'instId' => $user['IdInstitucion']
            ]);
        } else {
            echo json_encode([
                'status' => 'error', 
                'message' => $res['message']
            ]);
        }
        exit;
    }


    public function loginSuperAdmin() {
        if (ob_get_length()) ob_clean();

        $data = json_decode(file_get_contents('php://input'), true);
        $user = $data['user'] ?? '';
        $pass = $data['pass'] ?? '';

        $res = $this->service->attemptSuperAdminLogin($user, $pass);

        header('Content-Type: application/json');
        echo json_encode($res['status'] 
            ? [
                'status' => 'success', 
                'userName' => $res['user']['Nombre'], 
                'role' => 1 // <--- Cambiado a 1
            ] 
            : [
                'status' => 'error', 
                'message' => $res['message']
            ]
        );
        exit;
    }



    // api/src/Controllers/AuthController.php

    public function validateInstitution($slug) {
        if (ob_get_length()) ob_clean();
        $instData = $this->service->validateSlug($slug);
        
        if ($instData) {
            header('Content-Type: application/json');
            echo json_encode([
                "status" => "success",
                "data" => [
                    "id" => $instData['IdInstitucion'],
                    "nombre" => $instData['NombreInst'],
                    "nombre_completo" => $instData['NombreCompletoInst'], // Nuevo campo
                    "dependencia" => $instData['DependenciaInstitucion'], // Nuevo campo
                    "web" => $instData['Web']
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Institución no válida"]);
        }
        exit;
    }
}