<?php
// ***************************************************
// CONTROLADOR: FormRegistroController
// ***************************************************
namespace App\Controllers; // Asegúrate de que el namespace sea idéntico
use App\Models\FormRegistro\FormRegistroModel;

class FormRegistroController {
    private $model;

    public function __construct($db) {
        $this->model = new FormRegistroModel($db);
    }

    // ESTE ES EL MÉTODO QUE TE FALTABA PARA LA GRILLA DEL SUPERADMIN
    // ***************************************************
    public function listAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $data = $this->model->getAllConfigs();
            echo json_encode([
                'status' => 'success', 
                'data' => $data ? $data : [] 
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getBySlug($slug) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $config = $this->model->getConfigBySlug($slug);
        if (!$config) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Formulario no encontrado']);
            exit;
        }
        echo json_encode(['status' => 'success', 'data' => $config]);
        exit;
    }

    // Nuevo método necesario para el visor de detalles del Superadmin
    public function getFullDetail($id) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
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
            $this->model->saveResponses($data['id_form'], $data['respuestas']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    // api/src/Controllers/FormRegistroController.php

public function createConfig() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');

    // IMPORTANTE: Leer el cuerpo de la petición JSON
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    // Validación mínima
    if (!$data || !isset($data['slug_url'])) {
        echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
        exit;
    }

    try {
        $id = $this->model->saveConfig($data);
        echo json_encode([
            'status' => 'success', 
            'message' => 'Link creado con éxito',
            'id' => $id
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        // Esto te dirá si el error es por un SLUG duplicado en la BD
        echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
    }
    exit;
}
}