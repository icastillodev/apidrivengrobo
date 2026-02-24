<?php
namespace App\Controllers;

use App\Models\Alojamiento\AlojamientoModel;
use App\Utils\Auditoria;

class AlojamientoController {
    private $model;

    public function __construct($db) {
        $this->model = new AlojamientoModel($db);
    }

    public function list() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad
            echo json_encode(['status' => 'success', 'data' => $this->model->getAllGrouped($sesion['instId'])]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function history() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $id = $_GET['historia'] ?? 0;
        try {
            Auditoria::getDatosSesion();
            echo json_encode(['status' => 'success', 'data' => $this->model->getHistory($id)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function finalizar() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        $historiaId = $data['historia'] ?? null;
        $fechaFin = $data['fechaFin'] ?? date('Y-m-d'); 

        if (!$historiaId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID de historia']);
            return;
        }

        try {
            Auditoria::getDatosSesion();
            $res = $this->model->finalizarHistoria($historiaId, $fechaFin);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    
    public function desfinalizar() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $res = $this->model->desfinalizarHistoria($data['historia']);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateRow() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['IdAlojamiento']) || !isset($data['historia'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            return;
        }

        try {
            Auditoria::getDatosSesion();
            $res = $this->model->updateRow($data); 
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteRow() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['IdAlojamiento']) || !isset($data['historia'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Datos insuficientes']);
            exit;
        }

        try {
            Auditoria::getDatosSesion();
            $res = $this->model->deleteRow($data['IdAlojamiento'], $data['historia']);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function save() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['historia'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Falta Historia']);
            return;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $data['IdInstitucion'] = $sesion['instId']; // Inyectamos InstId real
            
            $res = $this->model->saveAlojamiento($data);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['historia'], $data['idprotA'], $data['IdUsrA'], $data['idespA'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan IDs críticos para la configuración']);
            exit;
        }

        try {
            Auditoria::getDatosSesion();
            $res = $this->model->updateHistoryConfig($data);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updatePrice() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['IdAlojamiento']) || !isset($data['precio'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            exit;
        }

        try {
            Auditoria::getDatosSesion();
            $this->model->updatePrice($data['IdAlojamiento'], $data['precio']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}