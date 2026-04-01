<?php
namespace App\Models\Menu;

class MenuModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

public function getPermissions($instId, $roleId) {
    // Traemos el IdMenu que es donde pusiste el número
    $sql = "SELECT NombreMenu FROM menudistr 
            WHERE IdInstitucion = ? AND IdTipoUsrA = ? AND Activo = 1";
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([(int)$instId, (int)$roleId]);
    
    // Esto devuelve un array simple de números: [11, 12, 13...]
    return $stmt->fetchAll(\PDO::FETCH_COLUMN);
}

    /**
     * @return int|null null si no hay fila; 1 o 2 según menudistr.Activo
     */
    public function getMenudistrActivo(int $instId, int $roleId, int $menuId): ?int {
        $stmt = $this->db->prepare(
            'SELECT Activo FROM menudistr WHERE IdInstitucion = ? AND IdTipoUsrA = ? AND NombreMenu = ? LIMIT 1'
        );
        $stmt->execute([(int)$instId, (int)$roleId, (int)$menuId]);
        $v = $stmt->fetchColumn();
        if ($v === false || $v === null) {
            return null;
        }
        return (int)$v;
    }
}