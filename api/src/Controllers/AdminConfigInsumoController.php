<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigInsumoModel;

class AdminConfigInsumoController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigInsumoModel($db);
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
        $this->processRequest('save');
    }

    public function delete() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $res = $this->model->delete($_POST['id']);
            echo json_encode(['status' => 'success', 'mode' => $res]); // 'deleted' o 'deactivated'
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggle() {
        $this->processRequest('toggleStatus');
    }

    private function processRequest($method) {
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
}