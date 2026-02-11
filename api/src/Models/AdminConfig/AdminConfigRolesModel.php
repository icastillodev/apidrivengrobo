<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigRolesModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

public function getInitialData($instId) {
    // Agregamos u.UsrA a la selección
    $sqlUsers = "SELECT 
                    p.IdUsrA, p.NombreA, p.ApellidoA, u.UsrA,
                    tr.IdTipousrA as CurrentRoleId
                FROM personae p
                INNER JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                INNER JOIN tienetipor tr ON p.IdUsrA = tr.IdUsrA
                WHERE u.IdInstitucion = ?
                ORDER BY p.ApellidoA ASC";
                
    $stmtUsers = $this->db->prepare($sqlUsers);
    $stmtUsers->execute([$instId]);
    $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

    $sqlMenus = "SELECT * FROM menudistr WHERE IdInstitucion = ? AND IdTipoUsrA IN (4, 5, 7)";
    $stmtMenus = $this->db->prepare($sqlMenus);
    $stmtMenus->execute([$instId]);
    $menus = $stmtMenus->fetchAll(PDO::FETCH_ASSOC);

    return [
        'users' => $users ?: [], 
        'menuConfig' => $menus ?: []
    ];
}
    public function updateUserRole($data) {
        $sql = "UPDATE tienetipor SET IdTipousrA = ? WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$data['newRoleId'], $data['userId']]);
    }

    public function toggleMenu($data) {
        $instId = $data['instId'];
        $roleId = $data['roleId'];
        $menuId = $data['menuId']; // Integer (1, 2, 3...)
        $newStatus = $data['status']; // 1 o 2

        // Verificar si existe el registro
        $check = $this->db->prepare("SELECT IdMenu FROM menudistr WHERE IdInstitucion = ? AND IdTipoUsrA = ? AND NombreMenu = ?");
        $check->execute([$instId, $roleId, $menuId]);
        $exists = $check->fetchColumn();

        if ($exists) {
            $sql = "UPDATE menudistr SET Activo = ? WHERE IdMenu = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$newStatus, $exists]);
        } else {
            $sql = "INSERT INTO menudistr (IdInstitucion, IdTipoUsrA, NombreMenu, Activo) VALUES (?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$instId, $roleId, $menuId, $newStatus]);
        }
    }
}