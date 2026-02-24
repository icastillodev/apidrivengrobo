<?php
namespace App\Controllers;

use App\Utils\Auditoria;

class UserConfigController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function updatePreferences() {
        header('Content-Type: application/json');
        
        try {
            // Seguridad: El usuario solo puede actualizar sus PROPIAS preferencias
            $sesion = Auditoria::getDatosSesion();
            $userId = $sesion['userId']; 

            $theme    = $_POST['theme'] ?? null;
            $lang     = $_POST['lang'] ?? null;
            $menu     = $_POST['menu'] ?? null;
            $fontSize = $_POST['fontSize'] ?? null;

            $sql = "UPDATE personae SET ";
            $params = [];
            
            if ($theme)    { $sql .= "tema_preferido = ?, ";    $params[] = $theme; }
            if ($lang)     { $sql .= "idioma_preferido = ?, ";  $params[] = $lang; }
            if ($menu)     { $sql .= "menu_preferido = ?, ";    $params[] = $menu; }
            if ($fontSize) { $sql .= "letra_preferida = ?, ";   $params[] = $fontSize; }

            if (empty($params)) {
                echo json_encode(['status' => 'success', 'message' => 'Nada que cambiar']);
                exit;
            }

            $sql = rtrim($sql, ", ");
            $sql .= " WHERE IdUsrA = ?";
            $params[] = $userId;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            Auditoria::logManual($this->db, $userId, 'UPDATE', 'personae', 'Actualizó sus preferencias visuales de UI.');

            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}