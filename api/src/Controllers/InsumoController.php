<?php
namespace App\Controllers;

use App\Models\Insumo\InsumoModel;

class InsumoController {
    private $model;

    // REPARACIÓN: Recibimos $db (PDO) y creamos el modelo aquí mismo
    public function __construct($db) { 
        $this->model = new InsumoModel($db); 
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getAllByInstitution($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getDetails() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $idPrecioInsumo = $_GET['id'] ?? 0;
        try {
            $items = $this->model->getInsumosDetails($idPrecioInsumo);
            echo json_encode(['status' => 'success', 'data' => $items]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Endpoint para el catálogo de insumos disponibles (usado en el modal)
    public function getCatalog() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getInsumosCatalog($instId); // Consulta a la tabla 'insumo'
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) { echo json_encode(['status' => 'error']); }
        exit;
    }

    public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = $_POST;
        try {
            $success = $this->model->updateStatus($data);
            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
public function getFormData() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $instId = $_GET['inst'] ?? 0;
    try {
        $deptos = $this->model->getDepartments($instId);
        echo json_encode(['status' => 'success', 'data' => ['deptos' => $deptos]]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
public function updateFull() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');

    $data = $_POST; // Contiene idformA, depto, fechainicioA, fecRetiroA e items[]
    try {
        $success = $this->model->updateFullInsumo($data);
        echo json_encode(['status' => $success ? 'success' : 'error']);
    } catch (\Exception $e) {
        // Si hay error, devolvemos el mensaje para debuguear
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
public function sendNotification() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');

    $data = $_POST;
    try {
        // 1. Buscamos el desglose de insumos en la BD
        $resumenInsumos = $this->model->getInsumosResumenText($data['idformA']);

        // 2. Enviamos el correo pasando el nuevo dato
        $mailService = new \App\Models\Services\MailService();
        $mailSent = $mailService->sendInsumoNotification(
            $data['email'],
            $data['investigador'],
            $data['idformA'],
            $data['mensaje'],
            $data['estado'],
            $resumenInsumos, // <--- Enviamos los productos
            "Institución" 
        );

        if ($mailSent) {
            $this->model->saveNotification($data);
            echo json_encode(['status' => 'success']);
        } else {
            throw new \Exception("Error en el servidor de correo.");
        }
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
}