<?php
namespace App\Controllers;

use App\Models\Animal\AnimalModel;
use App\Models\Services\MailService;

class AnimalController {
    private $model;

    public function __construct($db) {
        $this->model = new AnimalModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        $instId = $_GET['inst'] ?? null;

        if (!$instId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Institución']);
            exit;
        }

        $data = $this->model->getByInstitution($instId);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }
    public function getLastNotification() {
    $id = $_GET['id'] ?? null;
    $data = $this->model->getLastNotification($id);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'success', 'data' => $data]);
    exit;
    }

    public function updateStatus() {
        $data = $_POST;
        // Capturamos el nombre de quien cambia el estado desde el localStorage enviado
        $data['quienvisto'] = $data['userName'] ?? 'Admin'; 

        try {
            $this->model->updateStatus($data);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getPendingCounts() {
        $instId = $_GET['inst'] ?? null;
        $count = $this->model->getPendingCount($instId); // Llamada al modelo
        
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => ['animales' => $count]]);
        exit;
    }
    public function saveNotification() {
    $data = $_POST;
    $res = $this->model->saveNotification($data);
    echo json_encode(['status' => 'success']);
    exit;
    }
    public function getFormData() {
    $instId = $_GET['inst'] ?? null;
    $data = $this->model->getFormData($instId);
    echo json_encode(['status' => 'success', 'data' => $data]);
    exit;
    }

    public function getSexData() {
        $id = $_GET['id'] ?? null;
        $data = $this->model->getSexData($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }
    
    public function updateFull() {
        $data = $_POST; // Captura todos los campos del FormData
        try {
            $this->model->updateFull($data);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function getSpeciesByProtocol() {
    // Capturamos el id de la URL (?id=1346)
    $protId = $_GET['id'] ?? null;
    
    if (!$protId) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Falta el ID del protocolo']);
        exit;
    }

    try {
        $data = $this->model->getSpeciesByProtocol($protId);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
    } catch (\Exception $e) {
        header('HTTP/1.1 500 Internal Server Error');
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
            // Aseguramos que el array que va al modelo tenga 'idformA'
            $data['idformA'] = $idformA;
            
            // Llamamos al modelo actualizado
            $info = $this->model->saveNotificationAndGetMailDetails($data);
            
            if (!$info) {
                echo json_encode(['status' => 'error', 'message' => 'No se encontró el pedido #' . $idformA]);
                exit;
            }

            $mailService = new MailService();
            $instName = strtoupper($info['institucion'] ?? 'URBE');
            $subject = "Solicitud Animales #{$idformA} - " . strtoupper($info['estado']) . " ({$instName})";
            
            // Construimos el bloque HTML interno (Igual que en Reactivos pero con datos de animales)
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

            // Envolvemos en el template oficial de GROBO
            // El link lleva al login para que revisen el detalle
            $linkSistema = "http://localhost/URBE-API-DRIVEN/front/paginas/login.html"; // Ajusta esto a tu dominio real en producción
            $body = $mailService->getTemplate("Actualización de Pedido", $message, $linkSistema, "VER EN SISTEMA");
            
            // Envío al Investigador
            $success = $mailService->executeSend($info['email_inv'], $subject, $body);

            // Opcional: Enviar copia al admin si tiene correo configurado
            if (!empty($info['email_admin'])) {
                $mailService->executeSend($info['email_admin'], "[COPIA] $subject", $body);
            }

            echo json_encode(['status' => $success ? 'success' : 'error']);

        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
        }
        exit;
    }


    /* INVESTIGADOR */ 
    public function searchProtocols() {
            if (ob_get_length()) ob_clean();
            header('Content-Type: application/json');
            
            $instId = $_GET['inst'] ?? 0;
            $userId = $_GET['user'] ?? 0;

            try {
                // Obtenemos protocolos activos y la config de la institución (Otros CEUAS y PDF)
                $data = $this->model->getActiveProtocolsForUser($instId, $userId);
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
            $instId = $_GET['inst'] ?? 0;

            try {
                if ($isOtrosCeuas == 1) {
                    // Si es Otros CEUAS, traemos TODAS las especies de la institución
                    $data = $this->model->getAllSpeciesForInst($instId);
                } else {
                    // Si es protocolo normal, traemos sus especies aprobadas y cupos
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
            // 1. Guardar el Pedido (Como ya lo tenías)
            $idForm = $this->model->saveOrder($data);
            
            // 2. PREPARAR DATOS PARA EL EMAIL
            // Necesitamos los nombres de texto, no los IDs. 
            // Podemos hacer pequeñas consultas rápidas o modificar el saveOrder para que devuelva info.
            // Opción Rápida: Consultar lo necesario para el mail.
            
            // Obtener datos usuario e institución
            $userInfo = $this->getUserAndInstInfo($data['userId'], $data['instId']);
            
            // Obtener nombres de especie/subespecie
            $names = $this->model->getNamesForMail($data['idsubespA'], $data['idprotA']);

            // Armar el array de datos para el MailService
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

            // 3. ENVIAR CORREO
            $mailService = new \App\Models\Services\MailService();
            $mailService->sendAnimalOrderConfirmation(
                $userInfo['EmailA'],     // Para
                $userInfo['NombreA'],    // Nombre Usuario
                $userInfo['NombreInst'], // Institución
                $mailData                // Array de datos
            );
            
            echo json_encode(['status' => 'success', 'id' => $idForm]);

        } catch (\Exception $e) {
            // Si falla el mail, NO fallamos el pedido, solo logueamos
            // Si falla el saveOrder, sí va al catch normal.
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- Helpers privados para el Controller ---

    private function getUserAndInstInfo($userId, $instId) {
        // Asumiendo que tienes acceso a $this->db o $this->model->db
        // Si no, agrégalo en el modelo y llámalo desde ahí.
        // Aquí uso una lógica genérica:
        return $this->model->getUserAndInstInfo($userId, $instId);
    }

        // Obtiene TODOS los datos necesarios para armar el PDF en el cliente
    public function getPDFData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getDataForTarifario($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

}