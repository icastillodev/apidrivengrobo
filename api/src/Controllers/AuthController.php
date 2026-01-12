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
        
        // 2. CAPTURAMOS los datos JSON del cuerpo del POST
        $data = json_decode(file_get_contents("php://input"), true);
        
        // 3. Validamos que existan los datos
        if (!isset($data['user'], $data['pass'], $data['instSlug'])) {
            echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
            exit;
        }
        
        $res = $this->service->authenticate($data['user'], $data['pass'], $data['instSlug']);
        
        echo json_encode($res['status'] 
            ? ['status' => 'success', 'role' => $res['user']['role']] 
            : ['status' => 'error', 'message' => $res['message']]);
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



    // Este método SÍ recibe ($slug) porque viene de la URL: /validate-inst/:slug
    public function validateInstitution($slug) {
        if (ob_get_length()) ob_clean();
        
        // Obtenemos el objeto de la institución completo
        $instData = $this->service->validateSlug($slug);
        
        if ($instData) {
            echo json_encode([
                "status" => "success",
                "message" => "Institución válida",
                "data" => [
                    // Usamos el ID real que viene de tu base de datos
                    "id" => $instData['IdInstitucion'] 
                ]
            ]);
        } else {
            echo json_encode([
                "status" => "error", 
                "message" => "La institución no existe"
            ]);
        }
        exit;
    }
}