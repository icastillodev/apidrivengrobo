<?php
namespace App\Controllers;

use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class ControllerusuarioTodosProtocolos {
    private $model;

    public function __construct($db) {
        $this->model = new UsuarioTodosProtocolosModel($db);
    }

    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getConfig($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getAllLists() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            // Ignoramos el UID de la URL y usamos el seguro del JWT
            $instId = $sesion['instId'];
            $userId = $sesion['userId'];

            $my = $this->model->getMyProtocols($instId, $userId);
            $local = $this->model->getLocalProtocols($instId);
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

    public function createInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $_POST['IdInstitucion'] = $sesion['instId']; // Inyectamos Inst Real
            
            $this->model->createInternal($_POST, $sesion['userId']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $this->model->updateInternal($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) { 
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); 
        }
        exit;
    }

    public function getSpeciesDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getProtocolSpecies($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getNetworkTargets() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getNetworkTargets($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createNetworkRequest() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            Auditoria::getDatosSesion();
            $this->model->createNetworkRequest($input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}