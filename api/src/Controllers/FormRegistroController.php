<?php
namespace App\Controllers; 
use App\Models\FormRegistro\FormRegistroModel;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class FormRegistroController {
    private $model;

    public function __construct($db) {
        $this->model = new FormRegistroModel($db);
    }

    public function listAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            // Seguridad: Solo el rol 1 (Superadmin) debería ver todas las configuraciones
            Auditoria::getDatosSesion(); 
            
            $data = $this->model->getAllConfigs();
            echo json_encode([
                'status' => 'success', 
                'data' => $data ? $data : [] 
            ]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getBySlug($slug) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // El slug es público (para el formulario de registro), no validamos token aquí.
        $config = $this->model->getConfigBySlug($slug);
        if (!$config) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Formulario no encontrado']);
            exit;
        }
        echo json_encode(['status' => 'success', 'data' => $config]);
        exit;
    }

    public function getFullDetail($id) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            Auditoria::getDatosSesion(); // Validación de seguridad
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
            // El submit del formulario onboarding suele ser público, 
            // NO forzamos Auditoria::getDatosSesion() aquí.
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

        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data || !isset($data['slug_url'])) {
            echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
            exit;
        }

        try {
            Auditoria::getDatosSesion(); // Solo admins pueden crear accesos

            $id = $this->model->saveConfig($data);
            echo json_encode([
                'status' => 'success', 
                'message' => 'Link creado con éxito',
                'id' => $id
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
        }
        exit;
    }
}