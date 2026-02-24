<?php
namespace App\Controllers;

use App\Models\User\UserProfileModel;
use App\Utils\Auditoria;

class UserProfileController {
    private $model;

    public function __construct($db) {
        $this->model = new UserProfileModel($db);
    }

    public function getProfile() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            // Extrae el usuario de forma segura
            $sesion = Auditoria::getDatosSesion();
            
            $data = $this->model->getUserData($sesion['userId']);
            if (!$data) throw new \Exception("Usuario no encontrado");
            
            unset($data['password_secure']);
            unset($data['PassA']);
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateProfile() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = $_POST;
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data['userId'] = $sesion['userId']; // Fuerza a que solo pueda editarse a sí mismo
            
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

        try {
            // El ID sale del JWT para que no puedan cambiarle la contraseña a otro
            $sesion = Auditoria::getDatosSesion();
            $userId = $sesion['userId'];
            
            $currentPass = $input['currentPass'];
            $newPass = $input['newPass'];

            if (!$this->model->verifyCurrentPassword($userId, $currentPass)) {
                echo json_encode(['status' => 'error', 'message' => 'La contraseña actual es incorrecta']);
                exit;
            }

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