<?php
namespace App\Controllers;

class UserConfigController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function updatePreferences() {
        header('Content-Type: application/json');
        $userId = $_POST['userId'] ?? null;
        
        // Captura de todos los parámetros posibles
        $theme    = $_POST['theme'] ?? null;
        $lang     = $_POST['lang'] ?? null;
        $menu     = $_POST['menu'] ?? null;
        $fontSize = $_POST['fontSize'] ?? null;

        if (!$userId) { 
            echo json_encode(['status' => 'error', 'message' => 'Sin ID de usuario']); 
            exit; 
        }

        try {
            $sql = "UPDATE personae SET ";
            $params = [];
            
            if ($theme)    { $sql .= "tema_preferido = ?, ";    $params[] = $theme; }
            if ($lang)     { $sql .= "idioma_preferido = ?, ";  $params[] = $lang; }
            if ($menu)     { $sql .= "menu_preferido = ?, ";    $params[] = $menu; }
            if ($fontSize) { $sql .= "letra_preferida = ?, ";   $params[] = $fontSize; }

            // Si no hay datos, salimos
            if (empty($params)) {
                echo json_encode(['status' => 'success', 'message' => 'Nada que cambiar']);
                exit;
            }

            $sql = rtrim($sql, ", ");
            $sql .= " WHERE IdUsrA = ?";
            $params[] = $userId;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}