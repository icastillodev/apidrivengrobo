<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigRolesModel;
use App\Utils\Auditoria;

class AdminConfigRolesController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigRolesModel($db);
    }

    public function init() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getInitialData($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateUserRole() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $this->model->updateUserRole($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleMenuAccess() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $_POST['instId'] = $sesion['instId']; // Inyecta ID de seguridad
            
            $this->model->toggleMenu($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}