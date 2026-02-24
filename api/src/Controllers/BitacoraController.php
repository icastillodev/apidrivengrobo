<?php
namespace App\Controllers;

use App\Models\Admin\BitacoraModel;
use App\Utils\Auditoria;

class BitacoraController {
    private $model;

    public function __construct($db) {
        $this->model = new BitacoraModel($db);
    }

    public function listAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            
            // Verificamos que sea SuperAdmin (Rol 1)
            if ((int)$sesion['role'] !== 1) {
                throw new \Exception("Acceso denegado. Privilegios insuficientes.");
            }

            $data = $this->model->getFullLogs();
            echo json_encode(['status' => 'success', 'data' => $data]);

        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}