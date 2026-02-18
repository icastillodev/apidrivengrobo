<?php
namespace App\Controllers;

use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;

class ControllerusuarioTodosProtocolos {
    private $model;

    public function __construct($db) {
        $this->model = new UsuarioTodosProtocolosModel($db);
    }

    // --- CONFIGURACIÓN INICIAL (Selects, Info Institución) ---
    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = isset($_GET['inst']) ? (int)$_GET['inst'] : 0;
        
        try {
            $data = $this->model->getConfig($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- LISTAR PROTOCOLOS (Mis, Local, Red) ---
    public function getAllLists() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = isset($_GET['inst']) ? (int)$_GET['inst'] : 0;
        $userId = $_GET['uid'] ?? null; 

        if (!$userId) {
            echo json_encode(['status' => 'error', 'message' => 'Usuario no identificado (Falta UID)']);
            exit;
        }

        try {
            // 1. Mis Protocolos (Todos los del usuario)
            $my = $this->model->getMyProtocols($instId, $userId);
            
            // 2. Institución Actual (Manuales + Aprobados + Red Aprobada)
            $local = $this->model->getLocalProtocols($instId);
            
            // 3. Red Global (Solo aprobados de otras instituciones)
            $network = $this->model->getNetworkProtocols($instId);
            
            echo json_encode([
                'status' => 'success', 
                'data' => [
                    'my' => $my, 
                    'local' => $local, 
                    'network' => $network
                ]
            ]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- CREAR PROTOCOLO (Interno o Externo) ---
    public function createInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $currentUserId = $_POST['currentUserId'] ?? null;

        if (!$currentUserId) {
            echo json_encode(['status' => 'error', 'message' => 'Error de sesión: Usuario no identificado']);
            exit;
        }
        
        try {
            $this->model->createInternal($_POST, $currentUserId);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- ACTUALIZAR PROTOCOLO ---
    public function updateInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $this->model->updateInternal($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { 
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); 
        }
        exit;
    }

    // --- DETALLE DE ESPECIES ---
    public function getSpeciesDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        try {
            $data = $this->model->getProtocolSpecies($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- OBJETIVOS DE RED (Instituciones para compartir) ---
    public function getNetworkTargets() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = isset($_GET['inst']) ? (int)$_GET['inst'] : 0;
        
        try {
            $data = $this->model->getNetworkTargets($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- CREAR SOLICITUD DE RED ---
    public function createNetworkRequest() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            $this->model->createNetworkRequest($input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}