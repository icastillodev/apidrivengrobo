<?php
namespace App\Controllers;

use App\Models\Alojamiento\TrazabilidadModel;
use App\Utils\Auditoria;

class TrazabilidadController {
    
    private $model;

    public function __construct($db) {
        $this->model = new TrazabilidadModel($db);
    }

    public function getArbol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $idAlojamiento = $_GET['idAlojamiento'] ?? null;
        $idEspecie = $_GET['idEspecie'] ?? null;

        if (!$idAlojamiento || !$idEspecie) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan parámetros']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad
            $data = $this->model->getArbolBiologico($idAlojamiento, $idEspecie, $sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveObservation() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['IdEspecieAlojUnidad']) || empty($data['valores'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos de la observación']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->model->insertarObservaciones($data['IdEspecieAlojUnidad'], $data['fechaObs'], $data['valores'], $sesion['instId']);
            echo json_encode(['status' => 'success', 'message' => 'Observaciones registradas']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function addCaja() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->model->crearCajaYUnidades($data['idAlojamiento'], $data['nombreCaja'], $data['cantidadUnidades'], $sesion['instId']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function renameSubject() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $this->model->renameSujeto($data['idUnidad'], $data['nombre']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function renameBox() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $this->model->renameCaja($data['idCaja'], $data['nombre']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function deleteBox() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $this->model->deleteCaja($data['idCaja']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function deleteSubject() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $this->model->deleteSujeto($data['idUnidad']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function addSubject() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $this->model->addSujeto($data['idCaja'], $data['idAlojamiento'], $data['nombreSujeto']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function getPastBoxes() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getCajasTramoAnterior($_GET['idAlojamiento']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function clonePastBoxes() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion();
            $this->model->clonarCajasBajoDemanda($data['idAlojamientoActual'], $data['cajas'], $data['unidades']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }
}