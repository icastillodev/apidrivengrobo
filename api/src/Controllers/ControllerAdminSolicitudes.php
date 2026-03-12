<?php
namespace App\Controllers;

use App\Models\adminsolicitudes\AdminSolicitudesModel;
use App\Utils\Auditoria; // <-- Seguridad Inyectada
use App\Utils\BackblazeB2;

class ControllerAdminSolicitudes {
    private $model;

    public function __construct($db) {
        $this->model = new AdminSolicitudesModel($db);
    }

    public function getList() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // Seguridad: ID Institución desde el Token
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getPendingRequests($sesion['instId']);
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function process() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = $_POST;
        
        if (empty($input['idSolicitud']) || empty($input['decision'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos obligatorios']);
            exit;
        }

        try {
            Auditoria::getDatosSesion(); // Valida Token antes de procesar
            $this->model->processRequest($input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getAttachments() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'ID inválido']);
            exit;
        }

        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getAttachmentsBySolicitud($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function downloadAttachment() {
        if (ob_get_length()) ob_clean();

        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo 'ID inválido';
            exit;
        }

        try {
            Auditoria::getDatosSesion();
            $att = $this->model->getAttachmentById($id);
            if (!$att) {
                http_response_code(404);
                echo 'Adjunto no encontrado';
                exit;
            }

            $b2 = new BackblazeB2();
            $b2->streamDownload($att['file_key'], $att['nombre_original']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo 'Error al descargar el archivo: ' . $e->getMessage();
            exit;
        }
    }
}