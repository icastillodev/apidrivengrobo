<?php
namespace App\Controllers;

use App\Models\Reactivo\ReactivoModel; // <-- Sin 's'
use App\Models\Services\MailService; 
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class ReactivoController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new ReactivoModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $categoria = "Otros reactivos biologicos"; 

            $data = $this->model->getAllByInstitution($sesion['instId'], $categoria);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = [
                'insumos' => $this->model->getAvailableInsumos($sesion['instId']),
                'protocols' => $this->model->getAvailableProtocols($sesion['instId'])
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getLastNotification() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $id = $_GET['id'] ?? 0;
        
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $data = $this->model->getLastNotification($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Funciones prestadas de AnimalController que estaban en tu archivo
    public function getPendingCounts() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];

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
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = $_POST;
        try {
            $sesion = Auditoria::getDatosSesion();
            $data['quienvisto'] = "Admin (ID: " . $sesion['userId'] . ")"; 

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
            Auditoria::getDatosSesion();
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
            Auditoria::getDatosSesion();
            $data = $this->model->getUsageData($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function sendNotification() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = json_decode(file_get_contents('php://input'), true);
        
        $idformA = $data['idformA'] ?? $data['id'] ?? null;
        $nota = $data['nota'] ?? null;

        if (!$idformA || $nota === null) {
            echo json_encode(['status' => 'error', 'message' => 'Información insuficiente: ID no reconocido']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $data['idformA'] = $idformA;
            $data['adminId'] = $sesion['userId']; // Seguridad
            
            $info = $this->model->saveNotificationAndGetMailDetails($data);
            
            if (!$info) {
                echo json_encode(['status' => 'error', 'message' => 'No se encontró el pedido #' . $idformA]);
                exit;
            }

            $mailService = new MailService();
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

            // Se asume URL dinámica frontal en producción.
            $body = $mailService->getTemplate("Actualización de Pedido", $message, "http://app.groboapp.com/", "VER SOLICITUD");
            $success = $mailService->executeSend($info['email_inv'], $subject, $body);

            echo json_encode(['status' => $success ? 'success' : 'error']);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
        }
        exit;
    }

    public function getInitData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            echo json_encode(['status' => 'success', 'data' => $this->model->getInitialData($sesion['instId'], $sesion['userId'])]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolInfo() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $id = $_GET['id'] ?? 0;
        try {
            Auditoria::getDatosSesion();
            echo json_encode(['status' => 'success', 'data' => $this->model->getProtocolDetails($id)]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createOrder() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion();
            $data['userId'] = $sesion['userId']; // Seguridad
            $data['instId'] = $sesion['instId'];

            $res = $this->model->saveOrder($data);
            $idForm = $res['id'];
            $insumoName = $res['insumoName'];
            
            $userInfo = $this->model->getUserAndInstInfo($data['userId'], $data['instId']);
            $protInfo = $this->model->getProtocolDetails($data['idprotA']);

            $mailData = [
                'id' => $idForm,
                'protocolo' => ($protInfo['nprotA'] ?? 'S/D') . ' - ' . ($protInfo['tituloA'] ?? ''),
                'insumo' => $insumoName,
                'cantidad' => $data['cantidad'],
                'fecha_retiro' => $data['fecha_retiro'],
                'aclaracion' => $data['aclaracion']
            ];

            $mailService = new MailService();
            $mailService->sendReactivoOrderConfirmation(
                $userInfo['EmailA'],
                $userInfo['NombreA'],
                $userInfo['NombreInst'],
                $mailData
            );

            echo json_encode(['status' => 'success', 'id' => $idForm]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getPDFData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getDataForTarifario($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}