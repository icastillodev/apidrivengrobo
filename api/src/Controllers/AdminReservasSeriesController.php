<?php
namespace App\Controllers;

use App\Models\AdminReservas\AdminReservasSeriesModel;
use App\Utils\Auditoria;

class AdminReservasSeriesController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminReservasSeriesModel($db);
    }

    public function createSerie() {
        $sesion = Auditoria::getDatosSesion();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $input['IdInstitucion'] = $sesion['instId'];
        $input['IdUsrCreador'] = $sesion['userId'];
        $out = $this->model->createSerie($input);
        $this->jsonResponse($out);
    }

    public function cancelOcurrencia() {
        $sesion = Auditoria::getDatosSesion();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];
        $out = $this->model->cancelOcurrencia($sesion['instId'], $sesion['userId'], $input);
        $this->jsonResponse($out);
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}

