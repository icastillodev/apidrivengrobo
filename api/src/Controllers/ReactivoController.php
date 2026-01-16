<?php
namespace App\Controllers;
use App\Models\Reactivo\ReactivoModel;

class ReactivoController {
    private $model;

    public function __construct($db) {
        $this->model = new ReactivoModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        // Filtro estricto por la categoría solicitada
        $categoria = "Otros reactivos biologicos"; 

        try {
            $data = $this->model->getAllByInstitution($instId, $categoria);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    // api/src/Controllers/ReactivoController.php

public function getFormData() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $instId = $_GET['inst'] ?? 0;

    try {
        $data = [
            'insumos' => $this->model->getAvailableInsumos($instId),
            'protocols' => $this->model->getAvailableProtocols($instId)
        ];
        echo json_encode(['status' => 'success', 'data' => $data]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
/**
 * Nuevo endpoint para obtener solo la última notificación
 */
public function getLastNotification() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $id = $_GET['id'] ?? 0;
    
    try {
        $data = $this->model->getLastNotification($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
// api/src/Controllers/AnimalController.php (o el controlador que maneje /menu/notifications)

public function getPendingCounts() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $instId = $_GET['inst'] ?? 0;

    // 1. Conteo de Animales Vivos
    $sqlAni = "SELECT COUNT(f.idformA) as total 
               FROM formularioe f 
               INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
               WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
               AND t.categoriaformulario = 'Animal vivo'";
    $stmtAni = $this->db->prepare($sqlAni);
    $stmtAni->execute([$instId]);
    $countAni = $stmtAni->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

    // 2. Conteo de Reactivos Biológicos
    $sqlRea = "SELECT COUNT(f.idformA) as total 
               FROM formularioe f 
               INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
               WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
               AND t.nombreTipo = 'Otros reactivos biologicos'";
    $stmtRea = $this->db->prepare($sqlRea);
    $stmtRea->execute([$instId]);
    $countRea = $stmtRea->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

    echo json_encode([
        'status' => 'success',
        'data' => [
            'animales' => (int)$countAni,
            'reactivos' => (int)$countRea
        ]
    ]);
    exit;
    }
public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = $_POST;
        $data['quienvisto'] = $data['userName'] ?? 'Admin'; 

        try {
            $this->model->updateQuickStatus($data['idformA'], $data['estado'], $data['aclaracionadm'], $data['quienvisto']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function updateFull() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $this->model->updateFull($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function getUsageData() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $id = $_GET['id'] ?? 0;

    try {
        $data = $this->model->getUsageData($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
public function sendNotification() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');

    $data = json_decode(file_get_contents('php://input'), true);
    
    // Buscamos el ID en cualquier llave posible para evitar el error 'Información insuficiente'
    $idformA = $data['idformA'] ?? $data['id'] ?? null;
    $nota = $data['nota'] ?? null;

    if (!$idformA || $nota === null) {
        echo json_encode(['status' => 'error', 'message' => 'Información insuficiente: ID no reconocido']);
        exit;
    }

    try {
        // Aseguramos que el array que va al modelo tenga 'idformA'
        $data['idformA'] = $idformA;
        $info = $this->model->saveNotificationAndGetMailDetails($data);
        
        if (!$info) {
            echo json_encode(['status' => 'error', 'message' => 'No se encontró el pedido #' . $idformA]);
            exit;
        }

        $mailService = new \App\Models\Services\MailService();
        $instName = strtoupper($info['institucion'] ?? 'URBE');
        $subject = "Solicitud #{$idformA} - " . strtoupper($info['estado']) . " ({$instName})";
        
        $message = "
            Hola <b>{$info['investigador']}</b>,<br><br>
            Tu solicitud de <b>Reactivo Biológico</b> ha sido actualizada.<br><br>
            <div style='background: #f8f9fa; padding: 20px; border-top: 4px solid #1a5d3b; border-radius: 4px; margin: 15px 0;'>
                <p style='margin: 0 0 10px 0; font-size: 16px;'><b>ID FORMULARIO:</b> <span style='color: #1a5d3b;'>#{$idformA}</span></p>
                <p style='margin: 0 0 10px 0; font-size: 16px;'><b>ESTADO ACTUAL:</b> {$info['estado']}</p>
                <hr style='border: 0; border-top: 1px solid #ddd; margin: 15px 0;'>
                <p style='margin: 0;'><b>Comentario:</b><br><i>{$nota}</i></p>
            </div>
            <p style='font-size: 12px; color: #666;'>Protocolo: {$info['nprotA']} | Reactivo: {$info['reactivo']}</p>
        ";

        $body = $mailService->getTemplate("Actualización de Pedido", $message, "http://localhost/URBE-API-DRIVEN/front/paginas/login.html", "VER SOLICITUD");
        $success = $mailService->executeSend($info['email_inv'], $subject, $body);

        echo json_encode(['status' => $success ? 'success' : 'error']);

    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}
}