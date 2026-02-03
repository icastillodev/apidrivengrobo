<?php
namespace App\Controllers;

use App\Models\Animal\AnimalModel;

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
        // Recibir datos del frontend
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Obtener detalles del pedido desde el Modelo
        $info = $this->model->saveNotificationAndGetMailDetails($data);
        
        if (!$info) {
            echo json_encode(['status' => 'error', 'message' => 'No se encontraron datos del pedido']);
            return;
        }

        // Usar la plantilla profesional de GROBO
        $template = "
        <div style='font-family: Arial; max-width: 600px; border: 1px solid #eee; border-radius: 10px; overflow: hidden;'>
            <div style='background: #1a5d3b; color: white; padding: 20px; text-align: center;'>
                <h1 style='margin: 0;'>GROBO - {$info['institucion']}</h1>
            </div>
            <div style='padding: 20px;'>
                <h3>Actualización de Pedido #{$data['idformA']}</h3>
                <p>Estimado/a <b>{$info['investigador']}</b>:</p>
                <p>Se ha registrado una nueva actividad en su solicitud de <b>Animal Vivo</b>:</p>
                <div style='background: #f4f4f4; padding: 15px; border-left: 5px solid #1a5d3b; margin: 15px 0;'>
                    <b>Estado:</b> {$info['estado']}<br>
                    <b>Observación Admin:</b> {$data['nota']}
                </div>
                <p style='font-size: 12px; color: #666;'>
                    <b>Detalles:</b> Protocolo {$info['nprotA']} | {$info['especie']} ({$info['total']} animales)
                </p>
            </div>
            <div style='background: #f1f1f1; padding: 10px; text-align: center; font-size: 11px; color: #999;'>
                Este es un correo automático generado por el sistema GROBO.
            </div>
        </div>";

        $mail = new \App\Services\MailService();
        
        // Enviar al Investigador
        $envioInv = $mail->send($info['email_inv'], "Actualización Pedido #{$data['idformA']} - GROBO", $template);
        
        // Enviar Copia al Admin logueado
        $envioAdm = $mail->send($info['email_admin'], "[COPIA ADMIN] Pedido #{$data['idformA']}", $template);

        if ($envioInv && $envioAdm) {
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Error al procesar el envío de correos']);
        }
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