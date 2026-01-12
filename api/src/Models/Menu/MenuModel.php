<?php
namespace App\Models\Menu;

class MenuModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getPermissions($instId, $roleId) {
        // Cambiamos NombreMenu por IdMenu para que coincida con el catálogo del controlador
        $sql = "SELECT IdMenu FROM menudistr 
                WHERE IdInstitucion = ? AND IdTipoUsrA = ? AND Activo = 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $roleId]);
        
        // Retorna [1, 2, 4, 8...]
        return $stmt->fetchAll(\PDO::FETCH_COLUMN);
    }
}