<?php
namespace App\Controllers;

use App\Models\UserForms\UserFormsModel;
use App\Utils\Auditoria;

class UserFormsController {
    private $model;

    public function __construct($db) {
        $this->model = new UserFormsModel($db);
    }

    public function getMyForms() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // Seguridad: IDs reales del Token
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAllForms($sesion['userId'], $sesion['instId']);
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFormDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $uriParts = explode('/', $_SERVER['REQUEST_URI']);
        $id = end($uriParts); 
        
        if (!is_numeric($id)) {
            echo json_encode(['status' => 'error', 'message' => 'ID inválido']);
            exit;
        }

        try {
            // Seguridad Base
            Auditoria::getDatosSesion();
            
            $detail = $this->model->getDetail($id);
            echo json_encode(['status' => 'success', 'data' => $detail]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolsUsedInForms() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getProtocolsUsedInForms($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getInsumosPedidos() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getInsumosPedidosByUser($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getInsumosExperimentalesPedidos() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getInsumosExperimentalesPedidosByUser($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}