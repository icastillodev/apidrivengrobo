<?php
namespace App\Controllers;

use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;

class ControllerusuarioTodosProtocolos {
    private $model;

    public function __construct($db) {
        $this->model = new UsuarioTodosProtocolosModel($db);
    }

    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getConfig($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function getAllLists() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        // OBTENER ID DEL USUARIO DESDE EL REQUEST (FRONTEND DEBE ENVIARLO)
        $userId = $_GET['uid'] ?? null; 

        if (!$userId) {
            echo json_encode(['status' => 'error', 'message' => 'Usuario no identificado']);
            exit;
        }

        try {
            $my = $this->model->getMyProtocols($instId, $userId);
            $local = $this->model->getLocalProtocols($instId);
            $network = $this->model->getNetworkProtocols($instId);
            
            echo json_encode([
                'status' => 'success', 
                'data' => ['my' => $my, 'local' => $local, 'network' => $network]
            ]);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

    public function createInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // OBTENER ID DEL POST (FRONTEND DEBE ENVIARLO)
        $currentUserId = $_POST['currentUserId'] ?? null;

        if (!$currentUserId) {
            echo json_encode(['status' => 'error', 'message' => 'Error de sesión: Usuario no identificado']);
            exit;
        }
        
        try {
            $this->model->createInternal($_POST, $currentUserId);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
        exit;
    }

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

    // ... (Resto de métodos getSpeciesDetail, getNetworkTargets, createNetworkRequest IGUALES) ...
    public function getSpeciesDetail() { if (ob_get_length()) ob_clean(); header('Content-Type: application/json'); $id = $_GET['id'] ?? 0; try { $data = $this->model->getProtocolSpecies($id); echo json_encode(['status' => 'success', 'data' => $data]); } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); } exit; }
    public function getNetworkTargets() { if (ob_get_length()) ob_clean(); header('Content-Type: application/json'); $instId = $_GET['inst'] ?? 0; try { $data = $this->model->getNetworkTargets($instId); echo json_encode(['status' => 'success', 'data' => $data]); } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); } exit; }
    public function createNetworkRequest() { if (ob_get_length()) ob_clean(); header('Content-Type: application/json'); $input = json_decode(file_get_contents('php://input'), true); try { $this->model->createNetworkRequest($input); echo json_encode(['status' => 'success']); } catch (\Exception $e) { echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); } exit; }
}