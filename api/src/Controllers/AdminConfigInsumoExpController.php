<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigInsumoExpModel;

class AdminConfigInsumoExpController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigInsumoExpModel($db);
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

    public function getSpeciesList() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getSpecies($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function save() { $this->processRequest('save'); }
    public function toggle() { $this->processRequest('toggleStatus'); }

    public function delete() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $res = $this->model->delete($_POST['id']);
            echo json_encode(['status' => 'success', 'mode' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
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