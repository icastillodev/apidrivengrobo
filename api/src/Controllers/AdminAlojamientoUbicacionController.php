<?php
namespace App\Controllers;

use App\Models\Alojamiento\AlojamientoUbicacionModel;
use App\Utils\Auditoria;

class AdminAlojamientoUbicacionController {
    private $model;

    public function __construct($db) {
        $this->model = new AlojamientoUbicacionModel($db);
    }

    public function getBundle() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            $data = $this->model->getBundle($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveLabels() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $this->model->saveConfigLabels($instId, $input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveCatalog() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $tipo = $input['tipo'] ?? '';
            $id = null;
            switch ($tipo) {
                case 'uf':
                    $id = $this->model->saveUbicacionFisica($instId, $input);
                    break;
                case 'salon':
                    $id = $this->model->saveSalon($instId, $input);
                    break;
                case 'rack':
                    $id = $this->model->saveRack($instId, $input);
                    break;
                case 'lugar':
                    $id = $this->model->saveLugarRack($instId, $input);
                    break;
                default:
                    throw new \InvalidArgumentException('Parámetro tipo requerido (uf|salon|rack|lugar).');
            }
            echo json_encode(['status' => 'success', 'id' => $id]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleCatalog() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $tipo = $input['tipo'] ?? '';
            $id = (int)($input['id'] ?? 0);
            $activo = (int)($input['activo'] ?? 0);
            if ($id <= 0) {
                throw new \InvalidArgumentException('ID faltante.');
            }
            $this->model->toggleCatalog($tipo, $id, $activo, $instId);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}
