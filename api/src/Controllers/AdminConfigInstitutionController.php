<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigInstitutionModel;
use App\Utils\Auditoria;

class AdminConfigInstitutionController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigInstitutionModel($db);
    }

    public function get() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getInstitution($sesion['instId']);
            $data['servicios'] = $this->model->getServices($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function update() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $_POST;
            $data['instId'] = $sesion['instId']; // Sobrescribe inyección
            $files = $_FILES; 
            
            $this->model->updateInstitution($data, $files);
            echo json_encode(['status' => 'success', 'message' => 'Actualizado']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function add_service() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $input['instId'] = $sesion['instId'];
            
            if(empty($input['nombre'])) throw new \Exception("Datos incompletos");
            $this->model->addService($input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function delete_service() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            Auditoria::getDatosSesion();
            if(empty($input['id'])) throw new \Exception("ID faltante");
            
            $this->model->deleteService($input['id']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggle_service() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            Auditoria::getDatosSesion();
            if(empty($input['id'])) throw new \Exception("ID faltante");
            
            $this->model->toggleService($input['id']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}