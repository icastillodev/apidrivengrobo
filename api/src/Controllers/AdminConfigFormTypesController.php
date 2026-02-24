<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigFormTypesModel;
use App\Utils\Auditoria;

class AdminConfigFormTypesController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigFormTypesModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad: Extrae InstId del Token
            $data = $this->model->getAll($sesion['instId']);
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
            $sesion = Auditoria::getDatosSesion();
            $_POST['instId'] = $sesion['instId']; // Sobrescribe inyección
            
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
            Auditoria::getDatosSesion(); // Valida Token
            
            $result = $this->model->delete($_POST['id']);
            
            if ($result === 'in_use') {
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'No se puede eliminar: Existen pedidos históricos asociados a este tipo.'
                ]);
            } elseif ($result) {
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'No se pudo eliminar el registro.']);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}