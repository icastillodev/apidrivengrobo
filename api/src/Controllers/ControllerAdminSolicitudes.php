<?php
namespace App\Controllers;

// CORRECCIÓN AQUÍ: Apuntar a la subcarpeta 'adminsolicitudes'
use App\Models\adminsolicitudes\AdminSolicitudesModel;

class ControllerAdminSolicitudes {
    private $model;

    public function __construct($db) {
        $this->model = new AdminSolicitudesModel($db);
    }

    public function getList() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        
        try {
            $data = $this->model->getPendingRequests($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function process() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = $_POST;
        
        if (empty($input['idSolicitud']) || empty($input['decision'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos obligatorios']);
            exit;
        }

        try {
            $this->model->processRequest($input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}