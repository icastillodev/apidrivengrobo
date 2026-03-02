<?php
namespace App\Controllers;

use App\Models\UserConfig\UserConfigModel;
use App\Utils\Auditoria;

class UserConfigController {
    private $model;

    public function __construct($db) {
        $this->model = new UserConfigModel($db);
    }

    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            // Traemos las configuraciones del usuario
            $data = $this->model->getConfig($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            
            // Leemos el payload JSON que viene desde la API.js
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                throw new \Exception("No se recibieron datos válidos.");
            }

            // Ejecutamos la actualización
            $this->model->updateConfig($sesion['userId'], $data);
            
            echo json_encode(['status' => 'success', 'message' => 'Preferencias actualizadas']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}