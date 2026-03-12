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
            
            $idSolicitud = $this->model->createInternal($_POST, $sesion['userId'], $_FILES ?? null);
            echo json_encode(['status' => 'success', 'idSolicitudProtocolo' => $idSolicitud]);
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

    public function getMyAttachments() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $solId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getUserAttachmentsBySolicitud($solId, $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getMyAttachmentsByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $idprot = isset($_GET['idprot']) ? (int)$_GET['idprot'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getUserAttachmentsByProtocol($idprot, $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function downloadMyAttachment() {
        if (ob_get_length()) ob_clean();

        $attId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $att = $this->model->getUserAttachmentById($attId, $sesion['userId']);
            if (!$att) {
                http_response_code(404);
                echo 'Adjunto no encontrado o no autorizado.';
                exit;
            }

            $b2 = new \App\Utils\BackblazeB2();
            $b2->streamDownload($att['file_key'], $att['nombre_original']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo 'Error al descargar el archivo: ' . $e->getMessage();
            exit;
        }
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