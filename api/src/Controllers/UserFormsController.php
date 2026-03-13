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

    public function getFormDetail($id = null) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        if (empty($id)) {
            $uriParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/'));
            $id = end($uriParts);
            if (strpos((string)$id, '?') !== false) $id = strstr((string)$id, '?', true);
        }
        
        if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'ID inválido']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $detail = $this->model->getDetail((int)$id, $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $detail]);
        } catch (\Exception $e) {
            $msg = $e->getMessage();
            if ($msg === 'Formulario no encontrado' || strpos($msg, 'no encontrado') !== false) {
                http_response_code(404);
            } elseif (strpos($msg, 'token') !== false || strpos($msg, 'credencial') !== false || strpos($msg, 'expirado') !== false) {
                http_response_code(401);
            } else {
                http_response_code(500);
                error_log("UserFormsController getFormDetail error: " . $e->getMessage() . " | " . $e->getTraceAsString());
            }
            echo json_encode(['status' => 'error', 'message' => $msg]);
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