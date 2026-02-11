<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigInstitutionModel;

class AdminConfigInstitutionController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigInstitutionModel($db);
    }

    public function get() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;

        if (!$instId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Institución']);
            exit;
        }

        try {
            $data = $this->model->getInstitution($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function update() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // Recibimos JSON o FormData. Asumiremos FormData por consistencia con tus otros módulos.
        $data = $_POST;
        
        try {
            $this->model->updateInstitution($data);
            echo json_encode(['status' => 'success', 'message' => 'Configuración actualizada']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}