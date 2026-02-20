<?php
namespace App\Controllers;

use App\Models\Alojamiento\TrazabilidadModel;

class TrazabilidadController {
    
    private $model;

    public function __construct($db) {
        $this->model = new TrazabilidadModel($db);
    }

    // GET: Carga el acordeón
    public function getArbol() {
        header('Content-Type: application/json');
        
        $idAlojamiento = $_GET['idAlojamiento'] ?? null;
        $idEspecie = $_GET['idEspecie'] ?? null;
        // Capturamos la institución directo del GET (como haces en alojamientos)
        $idInstitucion = $_GET['instId'] ?? null; 

        if (!$idAlojamiento || !$idEspecie) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan parámetros críticos']);
            exit;
        }

        try {
            $data = $this->model->getArbolBiologico($idAlojamiento, $idEspecie, $idInstitucion);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // POST: Guarda la métrica del animal
    public function saveObservation() {
        header('Content-Type: application/json');
        
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (empty($data['IdEspecieAlojUnidad']) || empty($data['valores'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos de la observación']);
            exit;
        }

        try {
            // Pasamos el IdInstitucion que vendrá en el JSON
            $idInstitucion = $data['IdInstitucion'] ?? 1; 
            
            $this->model->insertarObservaciones($data['IdEspecieAlojUnidad'], $data['fechaObs'], $data['valores'], $idInstitucion);
            
            echo json_encode(['status' => 'success', 'message' => 'Observaciones registradas']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error al guardar: ' . $e->getMessage()]);
        }
        exit;
    }
    // POST /api/trazabilidad/add-caja
public function addCaja() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Blindaje: Si instId no viene, forzamos el 1 o lo sacamos de la sesión si usas JWT en backend
        $instId = isset($data['instId']) ? $data['instId'] : 1; 

        try {
            $this->model->crearCajaYUnidades(
                $data['idAlojamiento'], 
                $data['nombreCaja'], 
                $data['cantidadUnidades'], 
                $instId
            );
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }


    public function renameSubject() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $this->model->renameSujeto($data['idUnidad'], $data['nombre']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function renameBox() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $this->model->renameCaja($data['idCaja'], $data['nombre']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function deleteBox() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $this->model->deleteCaja($data['idCaja']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function deleteSubject() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $this->model->deleteSujeto($data['idUnidad']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }
    public function addSubject() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $this->model->addSujeto($data['idCaja'], $data['idAlojamiento'], $data['nombreSujeto']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function getPastBoxes() {
        header('Content-Type: application/json');
        try {
            $data = $this->model->getCajasTramoAnterior($_GET['idAlojamiento']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function clonePastBoxes() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $this->model->clonarCajasBajoDemanda($data['idAlojamientoActual'], $data['cajas'], $data['unidades']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }
}