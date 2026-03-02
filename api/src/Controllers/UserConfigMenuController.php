<?php
namespace App\Controllers;

use App\Models\UserConfig\UserConfigModel;
use App\Utils\Auditoria;

class UserConfigMenuController {
    private $model;

    public function __construct($db) {
        $this->model = new UserConfigModel($db);
    }

    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getConfig($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data ?: []]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

public function updateConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Verificamos si realmente llegó algo
            if (empty($data)) {
                throw new \Exception("El JSON llegó vacío al servidor.");
            }

            // Guardamos y capturamos cuántas filas se modificaron
            $filasAfectadas = $this->model->updateConfig($sesion['userId'], $data);
            
            echo json_encode([
                'status' => 'success', 
                'message' => 'Ejecutado sin errores fatales.',
                'debug' => [
                    'IdUsrA_Buscado' => $sesion['userId'],
                    'Datos_Recibidos' => $data,
                    'Filas_Modificadas' => $filasAfectadas
                ]
            ]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}