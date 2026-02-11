<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigDeptoModel; // Importante: debe coincidir con el namespace de arriba

class AdminConfigDeptoController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigDeptoModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;

        try {
            $data = $this->model->getAllData($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Handlers para los POST
    public function saveOrg() { $this->processPost('saveOrganismo'); }
    public function deleteOrg() { $this->processDelete('deleteOrganismo', 'idOrg'); }
    public function saveDepto() { $this->processPost('saveDepartamento'); }
    public function deleteDepto() { $this->processDelete('deleteDepartamento', 'idDepto'); }

    private function processPost($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->$method($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function processDelete($method, $key) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->$method($_POST[$key]);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}