<?php
namespace App\Controllers;

use App\Models\UserHousing\UserHousingModel;
use App\Utils\Auditoria;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class UserHousingController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new UserHousingModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            // Seguridad
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrInvestigatorLegacyOrExit($sesion, 'alojamientos');
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
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrInvestigatorLegacyOrExit($sesion, 'alojamientos');

            $data = $this->model->getDetail($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}