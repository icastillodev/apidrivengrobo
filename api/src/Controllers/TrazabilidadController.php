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

    /**
     * Ficha unificada de un sujeto (animal) con historial de tramos y registros clínicos (PDF / modal).
     */
    public function getFichaAnimal() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        $idEu = (int)($_GET['idEspecieAlojUnidad'] ?? 0);
        $idCaja = (int)($_GET['idCajaAlojamiento'] ?? 0);
        $idAloj = (int)($_GET['idAlojamiento'] ?? 0);
        $n = ($idEu > 0 ? 1 : 0) + ($idCaja > 0 ? 1 : 0) + ($idAloj > 0 ? 1 : 0);
        if ($n !== 1) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Indique exactamente uno: idEspecieAlojUnidad, idCajaAlojamiento o idAlojamiento.']);
            exit;
        }
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            if ($idEu > 0) {
                $data = $this->model->getFichaAnimalCompleta($idEu, $instId);
                $err = 'Sujeto no encontrado o sin permiso.';
            } elseif ($idCaja > 0) {
                $data = $this->model->getFichaCajaAgrupada($idCaja, $instId);
                $err = 'Caja no encontrada o sin permiso.';
            } else {
                $data = $this->model->getFichaAlojamientoAgrupada($idAloj, $instId);
                $err = 'Alojamiento no encontrado o sin permiso.';
            }
            if ($data === null) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => $err]);
                exit;
            }
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
            $ubic = (isset($data['ubicacion']) && is_array($data['ubicacion'])) ? $data['ubicacion'] : null;
            $this->model->crearCajaYUnidades(
                $data['idAlojamiento'],
                $data['nombreCaja'] ?? '',
                (int)($data['cantidadUnidades'] ?? 1),
                $sesion['instId'],
                $ubic
            );
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

    /** Peso, nacimiento, sexo, cepa y categoría/raza por tramo (IdEspecieAlojUnidad). */
    public function updateSubjectFichaBio() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = (int)($data['IdEspecieAlojUnidad'] ?? 0);
            if ($id <= 0) {
                throw new \InvalidArgumentException('Falta IdEspecieAlojUnidad.');
            }
            unset($data['IdEspecieAlojUnidad']);
            $this->model->updateSujetoFichaBio($id, (int)$sesion['instId'], $data);
            echo json_encode(['status' => 'success']);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        } catch (\Exception $e) {
            http_response_code(500);
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

    public function updateCajaUbicacion() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        try {
            $sesion = Auditoria::getDatosSesion();
            if (empty($data['idCaja'])) {
                throw new \InvalidArgumentException('Falta idCaja.');
            }
            $this->model->updateCajaUbicacion((int)$data['idCaja'], (int)$sesion['instId'], $data['ubicacion'] ?? []);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
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