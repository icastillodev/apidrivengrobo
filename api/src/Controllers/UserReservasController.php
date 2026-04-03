<?php
namespace App\Controllers;

use App\Models\UserReservas\UserReservasModel;
use App\Utils\Auditoria;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class UserReservasController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new UserReservasModel($db);
    }

    public function getSalas() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $this->jsonResponse($this->model->getSalas($sesion['instId']));
    }

    public function getSalaBundle() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $salaId = $_GET['IdSalaReserva'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        $this->jsonResponse($this->model->getSalaBundle($sesion['instId'], $salaId, $from, $to));
    }

    public function getInstrumentosDisponiblesSlot() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $salaId = $_GET['IdSalaReserva'] ?? null;
        $date = $_GET['date'] ?? null;
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;

        $this->jsonResponse($this->model->getInstrumentosDisponiblesSlot($sesion['instId'], $salaId, $date, $start, $end));
    }

    public function getMisReservas() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrInvestigatorLegacyOrExit($sesion, 'reservas');
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;
        $this->jsonResponse($this->model->getMisReservas($sesion['instId'], $sesion['userId'], $from, $to));
    }

    public function createReserva() {
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'reservas');
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];

        // Usuario: siempre reserva "a su nombre"
        $input['IdUsrCreador'] = $sesion['userId'];
        $input['IdUsrTitular'] = $sesion['userId'];

        $out = $this->model->createReserva($sesion['instId'], $input);
        $this->jsonResponse($out);
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}

