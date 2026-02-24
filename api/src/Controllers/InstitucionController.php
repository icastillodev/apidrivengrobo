<?php
namespace App\Controllers;

use App\Models\Admin\InstitucionModel;
use App\Utils\Auditoria;

class InstitucionController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InstitucionModel($db);
    }

    private function sendJSON($data, $code = 200) {
        if (ob_get_length()) ob_clean(); 
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit; 
    }

    public function list() {
        try {
            Auditoria::getDatosSesion(); // Solo logueados
            $data = $this->model->getAllInstitutions();
            $this->sendJSON(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 401);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        try {
            Auditoria::getDatosSesion(); // Seguridad SuperAdmin
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
            Auditoria::getDatosSesion(); // Seguridad SuperAdmin
            
            if (!$id) throw new \Exception("ID de institución no válido.");
            $this->model->updateInstitucion($id, $data);
            $this->sendJSON(['status' => 'success', 'message' => 'Datos actualizados correctamente']);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}