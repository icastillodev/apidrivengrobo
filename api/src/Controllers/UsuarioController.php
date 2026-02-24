<?php
namespace App\Controllers;

use App\Models\Admin\UsuarioModel;
use App\Utils\Auditoria;

class UsuarioController {
    private $model;

    public function __construct($db) {
        $this->model = new UsuarioModel($db);
    }

    private function jsonOut($data, $code = 200) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        http_response_code($code);
        echo json_encode($data);
        exit;
    }

    public function list() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->jsonOut(['status' => 'success', 'data' => $this->model->getAllGlobal($sesion['instId'])]);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 401);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        try {
            Auditoria::getDatosSesion(); // Valida Token

            if ($this->model->existsUsername($data['UsrA'])) {
                return $this->jsonOut([
                    'status' => 'error', 
                    'message' => 'El nombre de usuario ya fue tomado por otro bioterio.'
                ], 400);
            }

            $id = $this->model->createGlobal($data);
            $this->jsonOut(['status' => 'success', 'id' => $id]);

        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update() {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $_GET['id'] ?? null;
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $this->model->updateGlobal($id, $data);
            $this->jsonOut(['status' => 'success']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function resetPass() {
        $id = $_GET['id'] ?? null;
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $this->model->resetPassword($id);
            $this->jsonOut(['status' => 'success']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function checkUsername() {
        if (ob_get_length()) ob_clean(); 
        header('Content-Type: application/json');

        $username = $_GET['user'] ?? '';
        $excludeId = $_GET['exclude'] ?? null; 

        try {
            // Este método NO tiene Auditoria::getDatosSesion() porque el frontend 
            // lo usa durante el registro PÚBLICO donde el usuario aún no tiene token.
            $isTaken = $this->model->existsUsername($username, $excludeId);
            echo json_encode(['available' => !$isTaken]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit; 
    }
}