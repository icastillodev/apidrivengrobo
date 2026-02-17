<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigReservasModel;

class AdminConfigReservasController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigReservasModel($db);
    }

    // --- SALAS ---
    public function getAllSalas() {
        $this->jsonResponse($this->model->getAllSalas($_GET['inst']));
    }

    public function getSalaDetail() {
        $this->jsonResponse($this->model->getSalaDetail($_GET['id']));
    }

    public function saveSala() {
        // Decodificar el JSON de horarios que viene dentro del FormData
        $horarios = json_decode($_POST['horarios'], true);
        $this->model->saveSala($_POST, $horarios);
        $this->jsonResponse(['status' => 'success']);
    }

    public function toggleSala() {
        $input = json_decode(file_get_contents('php://input'), true);
        $this->model->toggleSala($input['id'], $input['status']);
        $this->jsonResponse(['status' => 'success']);
    }

    public function updateGlobalTimeType() {
        $input = json_decode(file_get_contents('php://input'), true);
        $this->model->updateGlobalTimeType($input['instId'], $input['type']);
        $this->jsonResponse(['status' => 'success']);
    }

    // --- INSTRUMENTOS ---
    public function getAllInst() {
        $this->jsonResponse($this->model->getAllInst($_GET['inst']));
    }

    public function saveInst() {
        $this->model->saveInst($_POST);
        $this->jsonResponse(['status' => 'success']);
    }

    public function toggleInst() {
        $input = json_decode(file_get_contents('php://input'), true);
        $this->model->toggleInst($input['id'], $input['status']);
        $this->jsonResponse(['status' => 'success']);
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}