<?php
namespace App\Controllers;

use App\Models\PublicReservas\PublicReservasModel;
use App\Utils\Auditoria;

class PublicReservasController {
    private $model;

    public function __construct($db) {
        $this->model = new PublicReservasModel($db);
    }

    public function getSalaPublicBundle() {
        $token = $_GET['token'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        // Token de sesión es opcional: si existe, marcamos "reservado por vos"
        $userId = null;
        try {
            $sesion = Auditoria::getDatosSesion();
            $userId = (int)($sesion['userId'] ?? 0);
        } catch (\Exception $e) {
            $userId = null;
        }

        $this->jsonResponse($this->model->getSalaPublicBundle($token, $from, $to, $userId));
    }

    public function getInstitucionPublicBundle() {
        $token = $_GET['token'] ?? null;
        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        $userId = null;
        try {
            $sesion = Auditoria::getDatosSesion();
            $userId = (int)($sesion['userId'] ?? 0);
        } catch (\Exception $e) {
            $userId = null;
        }

        $this->jsonResponse($this->model->getInstitucionPublicBundle($token, $from, $to, $userId));
    }

    private function jsonResponse($data) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }
}

