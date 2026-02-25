<?php
namespace App\Controllers; 
use App\Models\FormRegistro\FormRegistroModel;
use App\Utils\Auditoria; 

class FormRegistroController {
    private $model;

    public function __construct($db) {
        $this->model = new FormRegistroModel($db);
    }

    public function listAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Solo admins ven la lista
            $data = $this->model->getAllConfigs();
            echo json_encode(['status' => 'success', 'data' => $data ?: [] ]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFullDetail($id) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Solo admins leen el JSON resultante
            $data = $this->model->getFullResponsesGrouped($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function submit() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // MÉTODO PÚBLICO: El cliente llena esto desde su link sin tener login.
            $this->model->saveResponses($data['id_form'], $data['respuestas']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion(); 
            $id = $this->model->saveConfig($data, $sesion['userId']);
            echo json_encode(['status' => 'success', 'message' => 'Link creado con éxito', 'id' => $id]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
        }
        exit;
    }
    // AGREGAR ESTO AL CONTROLADOR:
    public function getBySlug($slug) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            // Buscamos en el modelo
            $data = $this->model->getConfigBySlug($slug);
            
            if (!$data) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'El enlace ha expirado o no es válido.']);
                exit;
            }

            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}