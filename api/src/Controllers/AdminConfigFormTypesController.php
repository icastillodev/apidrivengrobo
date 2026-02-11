<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigFormTypesModel;

class AdminConfigFormTypesController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigFormTypesModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getAll($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function save() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->save($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function delete() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $result = $this->model->delete($_POST['id']);
            
            if ($result === 'in_use') {
                // Caso especial: Está en uso
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'No se puede eliminar: Existen pedidos históricos asociados a este tipo.'
                ]);
            } elseif ($result) {
                // Éxito
                echo json_encode(['status' => 'success']);
            } else {
                // Fallo de base de datos genérico
                echo json_encode(['status' => 'error', 'message' => 'No se pudo eliminar el registro.']);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}