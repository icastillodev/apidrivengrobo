<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigEspeciesModel;

class AdminConfigEspeciesController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigEspeciesModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getTree($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveEspecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->saveEspecie($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteEspecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $res = $this->model->deleteEspecie($_POST['idEsp']);
            echo json_encode(['status' => 'success', 'mode' => $res]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveSubespecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->saveSubespecie($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleSubespecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->toggleSubespecie($_POST['idSub'], $_POST['status']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}