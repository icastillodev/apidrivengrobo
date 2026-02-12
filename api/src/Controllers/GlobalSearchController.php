<?php
namespace App\Controllers;

use App\Models\Search\GlobalSearchModel;

class GlobalSearchController {
    private $db;
    private $searchModel;

    public function __construct($db) {
        $this->db = $db;
        $this->searchModel = new GlobalSearchModel($db);
    }

    public function search() {
        // Limpiar buffer para evitar que salga HTML de error antes del JSON
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // 1. Recoger parámetros
            $query  = isset($_GET['q']) ? trim($_GET['q']) : '';
            $scope  = isset($_GET['scope']) ? trim($_GET['scope']) : 'global'; // <--- NUEVO
            $instId = $_GET['inst'] ?? 0;
            $role   = isset($_GET['role']) ? intval($_GET['role']) : 0;
            $userId = isset($_GET['uid']) ? intval($_GET['uid']) : 0;

            // Validación mínima
            if (strlen($query) < 1) { // Permitimos 1 caracter si es número (ej: "5")
                echo json_encode(['status' => 'success', 'data' => []]);
                exit;
            }

            // Término para SQL
            $term = "%$query%";
            $results = [];

            // 2. Ejecutar búsqueda según rol y pasar el SCOPE
            if (in_array($role, [1, 2, 4, 5, 6])) {
                // Admin
                $results = $this->searchModel->searchForAdmin($instId, $term, $scope);
            } else {
                // Usuario Normal
                $results = $this->searchModel->searchForUser($instId, $userId, $term, $scope);
            }

            echo json_encode(['status' => 'success', 'data' => $results]);

        } catch (\Exception $e) {
            // Capturar error fatal y devolverlo como JSON
            http_response_code(500);
            echo json_encode([
                'status' => 'error', 
                'message' => 'Error SQL o Lógico: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        exit;
    }
}