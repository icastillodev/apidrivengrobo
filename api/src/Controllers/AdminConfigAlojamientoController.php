<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigAlojamientoModel;
use App\Utils\Auditoria; // <-- IMPORTANTE

class AdminConfigAlojamientoController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigAlojamientoModel($db);
    }

    public function getDetails() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // El id de la especie sí viene por GET porque no es riesgo de seguridad (es una lectura pública para el modal)
        $espId = $_GET['esp'] ?? 0;
        if(!$espId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Especie']);
            exit;
        }

        try {
            // Validamos que el usuario tenga sesión/token
            Auditoria::getDatosSesion();

            $data = [
                'types' => $this->model->getTypes($espId),
                'categories' => $this->model->getCategories($espId)
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- TYPES ---
    public function saveType() { $this->handleSave('saveType'); }
    public function toggleType() { $this->handleToggle('toggleType'); }
    public function deleteType() { $this->handleDelete('deleteType'); }

    // --- CATEGORIES ---
    public function saveCat() { $this->handleSave('saveCategory'); }
    public function toggleCat() { $this->handleToggle('toggleCategory'); }
    public function deleteCat() { $this->handleDelete('deleteCategory'); }

    // --- HELPERS ---
    private function handleSave($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            // Seguridad: Forzamos que la institución sea la del token real, no la que manda el formulario
            $sesion = Auditoria::getDatosSesion();
            $_POST['instId'] = $sesion['instId'];
            
            $this->model->$method($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleToggle($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion(); // Solo validamos que esté logueado
            if(empty($input['id'])) throw new \Exception("ID faltante");
            
            $this->model->$method($input['id'], $input['status']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleDelete($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            Auditoria::getDatosSesion(); // Solo validamos que esté logueado
            if(empty($input['id'])) throw new \Exception("ID faltante");
            
            $this->model->$method($input['id']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}