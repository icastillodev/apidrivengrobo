<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigReservasModel;
use App\Utils\Auditoria;

class AdminConfigReservasController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigReservasModel($db);
    }

    public function getAllSalas() {
        $sesion = Auditoria::getDatosSesion();
        $this->jsonResponse($this->model->getAllSalas($sesion['instId']));
    }

    public function getSalaDetail() {
        Auditoria::getDatosSesion(); // Valida Token
        $this->jsonResponse($this->model->getSalaDetail($_GET['id']));
    }

    public function saveSala() {
        $sesion = Auditoria::getDatosSesion();
        $_POST['IdInstitucion'] = $sesion['instId']; // Inyectamos InstId Real
        
        $horarios = json_decode($_POST['horarios'], true);
        $this->model->saveSala($_POST, $horarios);
        $this->jsonResponse(['status' => 'success']);
    }

    public function toggleSala() {
        Auditoria::getDatosSesion();
        $input = json_decode(file_get_contents('php://input'), true);
        $this->model->toggleSala($input['id'], $input['status']);
        $this->jsonResponse(['status' => 'success']);
    }

    public function updateGlobalTimeType() {
        $sesion = Auditoria::getDatosSesion();
        $input = json_decode(file_get_contents('php://input'), true);
        
        $this->model->updateGlobalTimeType($sesion['instId'], $input['type']);
        $this->jsonResponse(['status' => 'success']);
    }

    public function getAllInst() {
        $sesion = Auditoria::getDatosSesion();
        $this->jsonResponse($this->model->getAllInst($sesion['instId']));
    }

    public function getInstSalasPermitidas() {
        Auditoria::getDatosSesion(); // Valida Token
        $id = $_GET['id'] ?? null;
        $this->jsonResponse($this->model->getInstSalasPermitidas($id));
    }

    public function saveInst() {
        $sesion = Auditoria::getDatosSesion();
        $_POST['IdInstitucion'] = $sesion['instId'];
        
        $salasPermitidas = [];
        if (isset($_POST['salasPermitidas'])) {
            $decoded = json_decode($_POST['salasPermitidas'], true);
            if (is_array($decoded)) $salasPermitidas = $decoded;
        }

        $this->model->saveInst($_POST, $salasPermitidas);
        $this->jsonResponse(['status' => 'success']);
    }

    public function toggleInst() {
        Auditoria::getDatosSesion();
        $input = json_decode(file_get_contents('php://input'), true);
        $this->model->toggleInst($input['id'], $input['status']);
        $this->jsonResponse(['status' => 'success']);
    }

    public function generarQrSala() {
        $sesion = Auditoria::getDatosSesion();
        // Solo admins/roles altos
        $role = (int)($sesion['role'] ?? 0);
        if (!in_array($role, [1, 2, 4, 5, 6], true)) {
            $this->jsonResponse(['status' => 'error', 'message' => 'No autorizado']);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $idSala = $input['IdSalaReserva'] ?? null;
        $out = $this->model->generarQrSala($sesion['instId'], $idSala);
        $this->jsonResponse($out);
    }

    public function generarQrInstitucion() {
        $sesion = Auditoria::getDatosSesion();
        $role = (int)($sesion['role'] ?? 0);
        if (!in_array($role, [1, 2, 4, 5, 6], true)) {
            $this->jsonResponse(['status' => 'error', 'message' => 'No autorizado']);
        }
        $out = $this->model->generarQrInstitucion((int)$sesion['instId']);
        $this->jsonResponse($out);
    }

    public function getModoAprobacion() {
        $sesion = Auditoria::getDatosSesion();
        $out = $this->model->getModoAprobacion($sesion['instId']);
        $this->jsonResponse($out);
    }

    public function setModoAprobacion() {
        $sesion = Auditoria::getDatosSesion();
        $role = (int)($sesion['role'] ?? 0);
        if (!in_array($role, [1, 2], true)) {
            $this->jsonResponse(['status' => 'error', 'message' => 'No autorizado']);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $out = $this->model->setModoAprobacion($sesion['instId'], $input);
        $this->jsonResponse($out);
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}