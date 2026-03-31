<?php
namespace App\Controllers;

use App\Models\UserReservas\UserReservasSeriesModel;
use App\Utils\Auditoria;

class UserReservasSeriesController {
    private $model;

    public function __construct($db) {
        $this->model = new UserReservasSeriesModel($db);
    }

    public function createSerie() {
        $sesion = Auditoria::getDatosSesion();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = [];

        $input['IdInstitucion'] = (int)$sesion['instId'];
        $input['IdUsrCreador'] = (int)$sesion['userId'];
        $input['IdUsrTitular'] = (int)$sesion['userId'];

        $out = $this->model->createSerie($input);
        $this->jsonResponse($out);
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}

