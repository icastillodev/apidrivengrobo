<?php
namespace App\Controllers;

use App\Models\UserHousing\UserHousingModel;
use App\Utils\Auditoria;

class UserHousingController {
    private $model;

    public function __construct($db) {
        $this->model = new UserHousingModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            // Seguridad
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAllHousings($sesion['userId'], $sesion['instId']);
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $uriParts = explode('/', $_SERVER['REQUEST_URI']);
        $id = end($uriParts); 

        try {
            // Validamos que exista un token válido
            Auditoria::getDatosSesion();
            
            $data = $this->model->getDetail($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}