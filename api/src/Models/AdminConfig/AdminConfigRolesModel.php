<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria;

class AdminConfigRolesModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getInitialData($instId) {
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
        $res = $stmt->execute([$data['newRoleId'], $data['userId']]);
        
        Auditoria::log($this->db, 'UPDATE_ROLE', 'tienetipor', "Cambió rol del Usuario ID: " . $data['userId'] . " al Rol: " . $data['newRoleId']);
        return $res;
    }

    public function toggleMenu($data) {
        $instId = $data['instId'];
        $roleId = $data['roleId'];
        $menuId = $data['menuId']; 
        $newStatus = $data['status']; 

        $check = $this->db->prepare("SELECT IdMenu FROM menudistr WHERE IdInstitucion = ? AND IdTipoUsrA = ? AND NombreMenu = ?");
        $check->execute([$instId, $roleId, $menuId]);
        $exists = $check->fetchColumn();

        if ($exists) {
            $sql = "UPDATE menudistr SET Activo = ? WHERE IdMenu = ?";
            $stmt = $this->db->prepare($sql);
            $res = $stmt->execute([$newStatus, $exists]);
            Auditoria::log($this->db, 'UPDATE_MENU', 'menudistr', "Modificó acceso al menú ID: $menuId para el Rol: $roleId (Status: $newStatus)");
            return $res;
        } else {
            $sql = "INSERT INTO menudistr (IdInstitucion, IdTipoUsrA, NombreMenu, Activo) VALUES (?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $res = $stmt->execute([$instId, $roleId, $menuId, $newStatus]);
            Auditoria::log($this->db, 'INSERT_MENU', 'menudistr', "Habilitó menú ID: $menuId para el Rol: $roleId");
            return $res;
        }
    }
}