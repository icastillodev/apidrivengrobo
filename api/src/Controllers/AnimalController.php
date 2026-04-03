<?php
namespace App\Controllers;

use App\Models\Animal\AnimalModel;
use App\Models\Services\MailService;
use App\Utils\Auditoria;
use App\Utils\VisorHelper;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class AnimalController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new AnimalModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad Total
            $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
            // ✅ Respetar la institución que manda el Front (como en protocolos)
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $data = $this->model->getByInstitution($targetInst);
            
            header('Content-Type: application/json');
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getLastNotification() {
        if (ob_get_length()) ob_clean();
        $sesion = Auditoria::getDatosSesion(); // Valida Token
        $this->enforceModuloSesionOrExit($sesion, 'animales');
        $id = $_GET['id'] ?? null;
        $data = $this->model->getLastNotification($id);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

    public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'animales');
            $estado = $data['estado'] ?? 'Sin estado';
            $data['instId'] = $sesion['instId'];

            // Visor = quien cambia el estado. Siempre nombre + apellido + ID desde BD.
            if (strtolower(trim($estado)) === 'sin estado') {
                $quienvisto = "Falta revisar";
            } else {
                $quienvisto = VisorHelper::getNombreApellidoYId($this->db, $sesion['userId']);
            }

            $data['quienvisto'] = $quienvisto; 

            $this->model->updateStatus($data);
            echo json_encode(['status' => 'success', 'quienvisto' => $quienvisto]);
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
            $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $count = $this->model->getPendingCount($targetInst);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'success', 'data' => ['animales' => $count]]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error']);
        }
        exit;
    }

    public function saveNotification() {
        if (ob_get_length()) ob_clean();
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'animales');
        $this->model->saveNotification($_POST);
        echo json_encode(['status' => 'success']);
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'animales');
            $data = $this->model->getFormData($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error']);
        }
        exit;
    }

    public function getSexData() {
        if (ob_get_length()) ob_clean();
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloSesionOrExit($sesion, 'animales');
        $id = $_GET['id'] ?? null;
        $data = $this->model->getSexData($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }
    
    public function updateFull() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instFromUrl = isset($_GET['inst']) ? (int)$_GET['inst'] : 0;
            $_POST['instId'] = ($instFromUrl > 0) ? $instFromUrl : (int)($sesion['instId'] ?? 0);
            $this->enforceModuloInstOrExit($sesion, 'animales', (int)$_POST['instId']);
            $_POST['userId'] = (int)($sesion['userId'] ?? 0);
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
        $sesion = Auditoria::getDatosSesion();
        $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
        $protId = $_GET['id'] ?? null;
        $allLocal = (int)($_GET['all'] ?? 0) === 1;
        $targetInst = (int)($_GET['inst'] ?? $sesion['instId']);

        if ($allLocal && $targetInst > 0) {
            try {
                $data = $this->model->getAllSpeciesFlatForInstitution($targetInst);
                echo json_encode(['status' => 'success', 'data' => $data]);
            } catch (\Exception $e) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
            exit;
        }

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
            $this->enforceModuloSesionOrExit($sesion, 'animales');
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
            $linkSistema = "https://app.groboapp.com/"; // URL genérica
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
            $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
            // 🚀 FIX: Respetar la institución que pide el Frontend
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            
            $data = $this->model->getActiveProtocolsForUser($targetInst, $sesion['userId']);
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
            $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
            // 🚀 FIX: Respetar la institución que pide el Frontend
            $targetInst = $_GET['inst'] ?? $sesion['instId'];

            if ($isOtrosCeuas == 1) {
                $data = $this->model->getAllSpeciesForInst($targetInst);
            } else {
                $data = $this->model->getDetailsAndSpecies($protId, $targetInst);
            }
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getCepasBySubespecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $idespA = $_GET['idespA'] ?? null;
            $idSub = $_GET['idsubespA'] ?? $_GET['idSub'] ?? null;

            if ($idespA !== null && $idespA !== '') {
                $data = $this->model->getCepasByEspecie($targetInst, $idespA);
            } elseif ($idSub) {
                $data = $this->model->getCepasBySubespecie($targetInst, $idSub);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Falta idespA o idsubespA']);
                exit;
            }

            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
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
            // 🚀 FIX: Si el frontend manda un instId en el POST, lo usamos. Si no, usamos el Token.
            $data['instId'] = !empty($data['instId']) ? $data['instId'] : $sesion['instId'];
            $this->enforceModuloInstOrExit($sesion, 'animales', (int)$data['instId']);
            $data['userId'] = $sesion['userId'];

            $idForm = $this->model->saveOrder($data);
            
            // Mail
            $userInfo = $this->model->getUserAndInstInfo($data['userId'], $data['instId']);
            $names = $this->model->getNamesForMail($data['idsubespA'], $data['idprotA'], $data['idcepaA'] ?? null);

            $mailData = [
                'id' => $idForm,
                'protocolo' => $names['nprot'] . ' - ' . $names['titulo'],
                'especie' => $names['especie'],
                'cepa' => $names['cepa'],
                'detalles' => "Raza: {$data['raza']}, Peso: {$data['peso']}, Edad: {$data['edad']}",
                'machos' => $data['macho'],
                'hembras' => $data['hembra'],
                'indistintos' => $data['indistinto'],
                'total' => $data['total'],
                'fecha_retiro' => $data['fecha_retiro'],
                'aclaracion' => $data['aclaracion']
            ];

            $mailService = new \App\Models\Services\MailService();
            $mailService->sendAnimalOrderConfirmation($userInfo['EmailA'], $userInfo['NombreA'], $userInfo['NombreInst'], $mailData, $data['lang'] ?? $userInfo['idioma_preferido'] ?? 'es');
            
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
            $this->enforceModuloWithRequestInstOrExit($sesion, 'animales', $_GET['inst'] ?? null);
            // 🚀 FIX: Respetar la institución que pide el Frontend
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            
            $data = $this->model->getDataForTarifario($targetInst);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}