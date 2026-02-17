<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigAlojamientoModel;

class AdminConfigAlojamientoController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigAlojamientoModel($db);
    }

    public function getDetails() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $espId = $_GET['esp'] ?? 0;
        if(!$espId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Especie']);
            exit;
        }

        try {
            $data = [
                'types' => $this->model->getTypes($espId),
                'categories' => $this->model->getCategories($espId)
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- TYPES ---
    public function saveType() { $this->handleSave('saveType'); }
    public function toggleType() { $this->handleToggle('toggleType'); }
    public function deleteType() { $this->handleDelete('deleteType'); }

    // --- CATEGORIES ---
    public function saveCat() { $this->handleSave('saveCategory'); }
    public function toggleCat() { $this->handleToggle('toggleCategory'); }
    public function deleteCat() { $this->handleDelete('deleteCategory'); }

    // --- HELPERS ---
    private function handleSave($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->$method($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleToggle($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            if(empty($input['id'])) throw new \Exception("ID faltante");
            $this->model->$method($input['id'], $input['status']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleDelete($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            if(empty($input['id'])) throw new \Exception("ID faltante");
            $this->model->$method($input['id']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            // No enviamos 500 para permitir que el JS muestre la alerta 'warning' personalizada
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}