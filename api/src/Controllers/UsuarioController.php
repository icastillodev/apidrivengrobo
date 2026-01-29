<?php
namespace App\Controllers;

use App\Models\Admin\UsuarioModel;

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
            $this->jsonOut(['status' => 'success', 'data' => $this->model->getAllGlobal()]);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        try {
            // 1. Verificación de seguridad "último minuto"
            if ($this->model->existsUsername($data['UsrA'])) {
                return $this->jsonOut([
                    'status' => 'error', 
                    'message' => 'El nombre de usuario ya fue tomado por otro bioterio.'
                ], 400);
            }

            // 2. Proceder con la creación multitable
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
            $this->model->updateGlobal($id, $data);
            $this->jsonOut(['status' => 'success']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function resetPass() {
        $id = $_GET['id'] ?? null;
        try {
            $this->model->resetPassword($id);
            $this->jsonOut(['status' => 'success']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
    /**
     * Verifica disponibilidad de nombre de usuario en tiempo real
     */
    public function checkUsername() {
        // Limpieza de buffer para asegurar JSON puro
        if (ob_get_length()) ob_clean(); 
        header('Content-Type: application/json');

        $username = $_GET['user'] ?? '';
        $excludeId = $_GET['exclude'] ?? null; // ID para omitir en caso de edición

        try {
            // Le pedimos al modelo que verifique la existencia
            $isTaken = $this->model->existsUsername($username, $excludeId);

            // Devolvemos true si NO existe (está disponible)
            echo json_encode(['available' => !$isTaken]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit; // Cortamos ejecución para evitar basura en el JSON
    }
}