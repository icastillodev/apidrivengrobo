<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigProtocoloModel;
use App\Utils\Auditoria;

class AdminConfigProtocoloController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigProtocoloModel($db);
    }

    public function init() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAllData($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveType() { $this->handleSave('saveTipoProtocolo'); }
    public function deleteType() { $this->handleDelete('deleteTipoProtocolo', 'idTipo'); }
    public function saveSeverity() { $this->handleSave('saveSeveridad'); }
    public function deleteSeverity() { $this->handleDelete('deleteSeveridad', 'idSev'); }

    private function handleSave($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $_POST['instId'] = $sesion['instId']; 
            
            $this->model->$method($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleDelete($method, $key) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion();
            
            $this->model->$method($_POST[$key]);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}