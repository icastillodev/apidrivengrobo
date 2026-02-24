<?php
namespace App\Controllers;

use App\Models\Menu\MenuModel;
use App\Utils\Auditoria;

class MenuController {
    private $model;

    public function __construct($db) {
        $this->model = new MenuModel($db);
    }

    public function getMenu() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $roleId = $sesion['role'];
            $instId = $sesion['instId'];

            $activeIds = $this->model->getPermissions($instId, $roleId);
            $filteredIds = $this->assembleMenu($activeIds, $roleId);

            echo json_encode(["status" => "success", "data" => $filteredIds]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        exit;
    }

    private function assembleMenu($activeIds, $roleId) {
        $ids = $activeIds; 

        if (!in_array($roleId, [1, 2])) {
            $ids = array_filter($ids, function($id) { return $id != 9; });
        }

        if (!in_array(201, $ids)) $ids[] = 201; 
        if (!in_array(204, $ids)) $ids[] = 204; 

        return array_values(array_unique($ids));
    }
}