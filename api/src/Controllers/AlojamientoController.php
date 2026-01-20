<?php
namespace App\Controllers;
use App\Models\Alojamiento\AlojamientoModel;

class AlojamientoController {
    private $model;

    public function __construct($db) {
        $this->model = new AlojamientoModel($db);
    }

    public function list() {
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        echo json_encode(['status' => 'success', 'data' => $this->model->getAllGrouped($instId)]);
        exit;
    }

    public function history() {
        header('Content-Type: application/json');
        $id = $_GET['historia'] ?? 0;
        echo json_encode(['status' => 'success', 'data' => $this->model->getHistory($id)]);
        exit;
    }

    public function finalizar() {
        header('Content-Type: application/json');
        // Capturamos el JSON del cuerpo de la petición
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        $historiaId = $data['historia'] ?? null;
        $fechaFin = $data['fechaFin'] ?? date('Y-m-d'); // Si no viene, usa hoy

        if (!$historiaId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID de historia']);
            return;
        }

        try {
            $res = $this->model->finalizarHistoria($historiaId, $fechaFin);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    
    // Ruta para desfinalizar
    public function desfinalizar() {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        $res = $this->model->desfinalizarHistoria($data['historia']);
        echo json_encode(['status' => 'success', 'data' => $res]);
        exit;
    }
public function updateRow() {
    header('Content-Type: application/json');
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!isset($data['IdAlojamiento']) || !isset($data['historia'])) {
        echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
        return;
    }

    try {
        // CORRECCIÓN: Usamos el modelo, NO $this->db directamente
        $res = $this->model->updateRow($data); 
        echo json_encode(['status' => 'success', 'data' => $res]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
public function deleteRow() {
    header('Content-Type: application/json');
    $data = json_decode(file_get_contents('php://input'), true);

    // Verificamos que los datos existan para evitar el error 500
    if (!isset($data['IdAlojamiento']) || !isset($data['historia'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Datos insuficientes']);
        exit;
    }

    try {
        $res = $this->model->deleteRow($data['IdAlojamiento'], $data['historia']);
        echo json_encode(['status' => 'success', 'data' => $res]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
public function save() {
    header('Content-Type: application/json');
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // Verificación de seguridad de datos mínimos
    if (!isset($data['IdInstitucion']) || !isset($data['historia'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Falta Institución o Historia']);
        return;
    }

    try {
        $res = $this->model->saveAlojamiento($data);
        echo json_encode(['status' => 'success', 'data' => $res]);
    } catch (\Exception $e) {
        http_response_code(500); // Esto es lo que está fallando
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
    }
    // api/src/Controllers/AlojamientoController.php

    /**
     * Procesa la reconfiguración global de una historia.
     */
// api/src/Controllers/AlojamientoController.php

public function updateConfig() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');

    $data = json_decode(file_get_contents('php://input'), true);

    // Verificación de que todos los IDs necesarios estén presentes
    if (!isset($data['historia'], $data['idprotA'], $data['IdUsrA'], $data['idespA'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Faltan IDs críticos para la configuración']);
        exit;
    }

    try {
        $res = $this->model->updateHistoryConfig($data);
        echo json_encode(['status' => 'success']);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
}