<?php
namespace App\Controllers;

use App\Models\UserHousing\UserHousingModel;
use PDO;

class UserHousingController {
    private $model;

    public function __construct($db) {
        $this->model = new UserHousingModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $userId = $_GET['user'] ?? 0;
        $instId = $_GET['inst'] ?? 0;

        try {
            $data = $this->model->getAllHousings($userId, $instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $uriParts = explode('/', $_SERVER['REQUEST_URI']);
        $id = end($uriParts); // ID Historia

        try {
            $data = $this->model->getDetail($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}