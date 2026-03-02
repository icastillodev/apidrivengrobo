<?php
namespace App\Models\UserConfig;

use PDO;

class UserConfigModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getConfig($userId) {
        $sql = "SELECT tema_preferido, idioma_preferido, letra_preferida, menu_preferido, gecko_ok 
                FROM personae WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

public function updateConfig($userId, $data) {
        $fields = [];
        $values = [];

        if (isset($data['theme'])) { $fields[] = "tema_preferido = ?"; $values[] = $data['theme']; }
        if (isset($data['lang'])) { $fields[] = "idioma_preferido = ?"; $values[] = $data['lang']; }
        if (isset($data['fontSize'])) { $fields[] = "letra_preferida = ?"; $values[] = $data['fontSize']; }
        if (isset($data['menu'])) { $fields[] = "menu_preferido = ?"; $values[] = $data['menu']; }
        if (isset($data['gecko_ok'])) { $fields[] = "gecko_ok = ?"; $values[] = (int)$data['gecko_ok']; }

        if (empty($fields)) return 0; // No había nada que actualizar

        $values[] = $userId; // El ID para el WHERE

        $sql = "UPDATE personae SET " . implode(', ', $fields) . " WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        
        $stmt->execute($values);
        
        // Magia: Nos devuelve cuántas filas alteró realmente
        return $stmt->rowCount(); 
    }
}