<?php
namespace App\Controllers;

use App\Models\Depto\DeptoModel;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class DeptoController {
    
    private $model;

    public function __construct($db) {
        $this->model = new DeptoModel($db);
    }

    public function list() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // Obtenemos el instId seguro desde el JWT
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAllByInstitution($sesion['instId']);
            
            echo json_encode([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}