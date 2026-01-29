<?php
namespace App\Controllers;

use App\Models\Admin\InstitucionModel;

class InstitucionController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InstitucionModel($db);
    }

    private function sendJSON($data, $code = 200) {
        if (ob_get_length()) ob_clean(); // Limpia cualquier eco/warning previo
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit; // Corta la ejecución para que nada más ensucie la salida
    }

    public function list() {
        try {
            $data = $this->model->getAllInstitutions();
            $this->sendJSON(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        try {
            if (empty($data['NombreInst'])) throw new \Exception("Nombre obligatorio");
            $id = $this->model->crearInstitucionCompleta($data);
            $this->sendJSON(['status' => 'success', 'data' => ['id' => $id]]);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update() {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['IdInstitucion'] ?? null;
        try {
            if (!$id) throw new \Exception("ID de institución no válido.");
            $this->model->updateInstitucion($id, $data);
            $this->sendJSON(['status' => 'success', 'message' => 'Datos actualizados correctamente']);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}