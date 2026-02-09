<?php
namespace App\Controllers;

use App\Models\User\UserProfileModel;
use PDO;

class UserProfileController {
    private $model;

    public function __construct($db) {
        $this->model = new UserProfileModel($db);
    }

    public function getProfile() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $userId = $_GET['user'] ?? 0;

        try {
            $data = $this->model->getUserData($userId);
            if (!$data) throw new \Exception("Usuario no encontrado");
            
            // No enviamos la contraseña real, obviamente
            unset($data['password_secure']);
            unset($data['PassA']);
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateProfile() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = $_POST;
        
        try {
            $this->model->updatePersonalData($data);
            echo json_encode(['status' => 'success', 'message' => 'Datos actualizados correctamente']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function changePassword() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['userId'];
        $currentPass = $input['currentPass'];
        $newPass = $input['newPass'];

        try {
            // 1. Verificar contraseña actual
            if (!$this->model->verifyCurrentPassword($userId, $currentPass)) {
                echo json_encode(['status' => 'error', 'message' => 'La contraseña actual es incorrecta']);
                exit;
            }

            // 2. Actualizar a nueva contraseña
            $newHash = password_hash($newPass, PASSWORD_BCRYPT);
            $this->model->updatePassword($userId, $newHash);

            echo json_encode(['status' => 'success', 'message' => 'Contraseña modificada con éxito']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}