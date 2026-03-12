<?php
namespace App\Controllers;

use App\Models\Reactivo\ReactivoModel;
use App\Models\Services\MailService; 
use App\Utils\Auditoria;
use App\Utils\VisorHelper;

class ReactivoController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new ReactivoModel($db);
    }

    // ============================================================
    // FUNCIONES DE ADMINISTRADOR (BANDEJA DE ENTRADA)
    // ============================================================
    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAllByInstitution($sesion['instId'], "Otros reactivos biologicos");
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
            Auditoria::getDatosSesion();
            echo json_encode(['status' => 'success', 'data' => $this->model->getLastNotification($id)]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $estado = $data['estado'] ?? 'Sin estado';
            
            // Visor = quien cambia el estado. Siempre nombre + apellido + ID desde BD.
            if (strtolower(trim($estado)) === 'sin estado') {
                $quienvisto = "Falta revisar";
            } else {
                $quienvisto = VisorHelper::getNombreApellidoYId($this->db, $sesion['userId']);
            }

            $this->model->updateQuickStatus($data['idformA'], $estado, $data['aclaracionadm'] ?? '', $quienvisto);
            
            echo json_encode(['status' => 'success', 'quienvisto' => $quienvisto]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function updateFull() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // 🚀 FIX: Leemos el JSON correctamente. Si usábamos $_POST quedaba vacío.
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        
        try {
            Auditoria::getDatosSesion();
            $this->model->updateFull($data);
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
            echo json_encode(['status' => 'success', 'data' => $this->model->getUsageData($id)]);
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
            echo json_encode(['status' => 'error', 'message' => 'Información insuficiente']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $data['idformA'] = $idformA;
            $data['adminId'] = $sesion['userId'];
            
            $info = $this->model->saveNotificationAndGetMailDetails($data);
            if (!$info) throw new \Exception('No se encontró el pedido #' . $idformA);

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

            $body = $mailService->getTemplate("Actualización de Pedido", $message, "http://app.groboapp.com/", "VER SOLICITUD");
            $success = $mailService->executeSend($info['email_inv'], $subject, $body);

            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }


    // ============================================================
    // FUNCIONES DE INVESTIGADOR (FORMULARIO DE PEDIDO)
    // ============================================================
    
    public function getInitData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            // 🚀 FIX DE LA RED: Leemos el ID que manda el Frontend
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            
            echo json_encode(['status' => 'success', 'data' => $this->model->getInitialData($targetInst, $sesion['userId'])]);
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
            $sesion = Auditoria::getDatosSesion();
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            echo json_encode(['status' => 'success', 'data' => $this->model->getProtocolDetails($id, $targetInst)]);
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
            $data['userId'] = $sesion['userId'];

            // 🚀 FIX DE LA RED: Usamos la institución enviada en el POST
            $data['instId'] = !empty($data['instId']) ? $data['instId'] : $sesion['instId'];

            $res = $this->model->saveOrder($data);
            $idForm = $res['id'];
            
            $userInfo = $this->model->getUserAndInstInfo($data['userId'], $data['instId']);
            $protInfo = $this->model->getProtocolDetails($data['idprotA'], $data['instId']);

            $mailData = [
                'id' => $idForm,
                'protocolo' => ($protInfo['nprotA'] ?? 'S/D') . ' - ' . ($protInfo['tituloA'] ?? ''),
                'insumo' => $res['insumoName'],
                'cantidad' => $data['cantidad'],
                'fecha_retiro' => $data['fecha_retiro'],
                'aclaracion' => $data['aclaracion']
            ];

            $mailService = new MailService();
            $mailService->sendReactivoOrderConfirmation($userInfo['EmailA'], $userInfo['NombreA'], $userInfo['NombreInst'], $mailData, $data['lang'] ?? $userInfo['idioma_preferido'] ?? 'es');

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
            // 🚀 FIX DE LA RED: PDF de la institución correcta
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            
            $data = $this->model->getDataForTarifario($targetInst);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}