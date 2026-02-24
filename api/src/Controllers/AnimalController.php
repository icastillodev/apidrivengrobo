<?php
namespace App\Controllers;

use App\Models\Animal\AnimalModel;
use App\Models\Services\MailService;
use App\Utils\Auditoria;

class AnimalController {
    private $model;

    public function __construct($db) {
        $this->model = new AnimalModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad Total
            $data = $this->model->getByInstitution($sesion['instId']);
            
            header('Content-Type: application/json');
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getLastNotification() {
        if (ob_get_length()) ob_clean();
        Auditoria::getDatosSesion(); // Valida Token
        $id = $_GET['id'] ?? null;
        $data = $this->model->getLastNotification($id);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

    public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = $_POST;
        
        try {
            // El usuario que modifica viene de la sesión, no del POST inyectable
            $sesion = Auditoria::getDatosSesion();
            $data['quienvisto'] = "Admin (ID: " . $sesion['userId'] . ")"; 

            $this->model->updateStatus($data);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getPendingCounts() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion();
            $count = $this->model->getPendingCount($sesion['instId']);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'success', 'data' => ['animales' => $count]]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error']);
        }
        exit;
    }

    public function saveNotification() {
        if (ob_get_length()) ob_clean();
        Auditoria::getDatosSesion();
        $this->model->saveNotification($_POST);
        echo json_encode(['status' => 'success']);
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getFormData($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error']);
        }
        exit;
    }

    public function getSexData() {
        if (ob_get_length()) ob_clean();
        Auditoria::getDatosSesion();
        $id = $_GET['id'] ?? null;
        $data = $this->model->getSexData($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
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

    public function getSpeciesByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        Auditoria::getDatosSesion();
        $protId = $_GET['id'] ?? null;
        if (!$protId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta el ID']);
            exit;
        }
        try {
            $data = $this->model->getSpeciesByProtocol($protId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
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
            $data['adminId'] = $sesion['userId']; // Validado
            $data['idformA'] = $idformA;
            
            $info = $this->model->saveNotificationAndGetMailDetails($data);
            
            if (!$info) {
                echo json_encode(['status' => 'error', 'message' => 'No se encontró el pedido']);
                exit;
            }

            $mailService = new MailService();
            $instName = strtoupper($info['institucion'] ?? 'URBE');
            $subject = "Solicitud Animales #{$idformA} - " . strtoupper($info['estado']) . " ({$instName})";
            
            $message = "
                Hola <b>{$info['investigador']}</b>,<br><br>
                Tu solicitud de <b>Animales Vivos</b> ha sido actualizada.<br><br>
                <div style='background: #f8f9fa; padding: 20px; border-top: 4px solid #1a5d3b; border-radius: 4px; margin: 15px 0;'>
                    <p style='margin: 0 0 10px 0; font-size: 16px;'><b>ID PEDIDO:</b> <span style='color: #1a5d3b;'>#{$idformA}</span></p>
                    <p style='margin: 0 0 10px 0; font-size: 16px;'><b>ESTADO ACTUAL:</b> {$info['estado']}</p>
                    <hr style='border: 0; border-top: 1px solid #ddd; margin: 15px 0;'>
                    <p style='margin: 0;'><b>Comentario Administrativo:</b><br><i>{$nota}</i></p>
                </div>
                <p style='font-size: 12px; color: #666;'>
                    <b>Protocolo:</b> " . ($info['nprotA'] ?? 'Sin protocolo') . " <br>
                    <b>Especie:</b> {$info['especie_completa']} <br>
                    <b>Cantidad Total:</b> {$info['total_animales']} animales
                </p>
            ";

            // Envolvemos en el template oficial
            $linkSistema = "http://app.groboapp.com/"; // URL genérica
            $body = $mailService->getTemplate("Actualización de Pedido", $message, $linkSistema, "VER EN SISTEMA");
            
            $success = $mailService->executeSend($info['email_inv'], $subject, $body);

            if (!empty($info['email_admin'])) {
                $mailService->executeSend($info['email_admin'], "[COPIA] $subject", $body);
            }

            echo json_encode(['status' => $success ? 'success' : 'error']);

        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
        }
        exit;
    }

    // --- MÉTODOS DE INVESTIGADOR ---
    public function searchProtocols() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getActiveProtocolsForUser($sesion['instId'], $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolDetails() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $protId = $_GET['id'] ?? null;
        $isOtrosCeuas = $_GET['otros_ceuas'] ?? 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            if ($isOtrosCeuas == 1) {
                $data = $this->model->getAllSpeciesForInst($sesion['instId']);
            } else {
                $data = $this->model->getDetailsAndSpecies($protId);
            }
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
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
            $data['instId'] = $sesion['instId']; // Inyectamos 
            $data['userId'] = $sesion['userId'];

            $idForm = $this->model->saveOrder($data);
            
            // Mail
            $userInfo = $this->model->getUserAndInstInfo($data['userId'], $data['instId']);
            $names = $this->model->getNamesForMail($data['idsubespA'], $data['idprotA']);

            $mailData = [
                'id' => $idForm,
                'protocolo' => $names['nprot'] . ' - ' . $names['titulo'],
                'especie' => $names['especie'],
                'cepa' => $names['subespecie'],
                'detalles' => "Raza: {$data['raza']}, Peso: {$data['peso']}, Edad: {$data['edad']}",
                'machos' => $data['macho'],
                'hembras' => $data['hembra'],
                'indistintos' => $data['indistinto'],
                'total' => $data['total'],
                'fecha_retiro' => $data['fecha_retiro'],
                'aclaracion' => $data['aclaracion']
            ];

            $mailService = new \App\Models\Services\MailService();
            $mailService->sendAnimalOrderConfirmation($userInfo['EmailA'], $userInfo['NombreA'], $userInfo['NombreInst'], $mailData);
            
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
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}