<?php
namespace App\Controllers;

use App\Models\Search\GlobalSearchModel;
use App\Utils\Auditoria;

class GlobalSearchController {
    private $db;
    private $searchModel;

    public function __construct($db) {
        $this->db = $db;
        $this->searchModel = new GlobalSearchModel($db);
    }

    public function search() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion(); // Extracción Segura
            
            $query  = isset($_GET['q']) ? trim($_GET['q']) : '';
            $scope  = isset($_GET['scope']) ? trim($_GET['scope']) : 'global';

            if (strlen($query) < 1) { 
                echo json_encode(['status' => 'success', 'data' => []]);
                exit;
            }

            $term = "%$query%";
            $results = [];

            // Evaluamos permisos usando el JWT, no el $_GET
            if (in_array((int)$sesion['role'], [1, 2, 4, 5, 6])) {
                $results = $this->searchModel->searchForAdmin($sesion['instId'], $term, $scope);
            } else {
                $results = $this->searchModel->searchForUser($sesion['instId'], $sesion['userId'], $term, $scope);
            }

            echo json_encode(['status' => 'success', 'data' => $results]);

        } catch (\Exception $e) {
            http_response_code(401); // Mandamos 401 si falla el token
            echo json_encode([
                'status' => 'error', 
                'message' => 'Error de Acceso o SQL: ' . $e->getMessage()
            ]);
        }
        exit;
    }
}