<?php
namespace App\Controllers;

use App\Models\AdminReservas\AdminReservasModel;
use App\Utils\Auditoria;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class AdminReservasController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new AdminReservasModel($db);
    }

    public function getSalas() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $this->jsonResponse($this->model->getSalas($sesion['instId']));
    }

    public function getSalaAgenda() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $salaId = $_GET['IdSalaReserva'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $this->jsonResponse($this->model->getSalaAgenda($sesion['instId'], $salaId, $from, $to));
    }

    public function getAgenda() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $this->jsonResponse($this->model->getAgenda($sesion['instId'], $from, $to));
    }

    public function createReserva() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $input['IdUsrCreador'] = $sesion['userId'];
        $out = $this->model->createReserva($sesion['instId'], $input);
        $this->jsonResponse($out);
    }

    public function updateReserva() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $input['IdUsrCreador'] = $sesion['userId'];
        $out = $this->model->updateReserva($sesion['instId'], $input);
        $this->jsonResponse($out);
    }

    public function deleteReserva() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $out = $this->model->deleteReserva($sesion['instId'], $input);
        $this->jsonResponse($out);
    }

    public function getPendingCount() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $this->jsonResponse($this->model->getPendingCount($sesion['instId']));
    }

    public function getPendingList() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $salaId = $_GET['IdSalaReserva'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $this->jsonResponse($this->model->getPendingList($sesion['instId'], $salaId, $from, $to));
    }

    public function approveReserva() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $out = $this->model->approveReserva($sesion['instId'], $sesion['userId'], $input);
        $this->jsonResponse($out);
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}

