<?php
namespace App\Models\Admin;
use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class UsuarioModel {
    private $db;

    public function __construct($db) { $this->db = $db; }

    public function getAllGlobal($instId) {
        $sql = "SELECT u.IdUsrA, u.UsrA, u.IdInstitucion, p.NombreA, p.ApellidoA, p.EmailA, 
                    i.NombreInst, 
                    t.IdTipousrA AS IdTipoUsrA,
                    a.ActivoA AS confirmado
                FROM usuarioe u
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                WHERE t.IdTipousrA != 1 AND u.IdInstitucion = ?
                ORDER BY i.NombreInst ASC, p.ApellidoA ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateGlobal($id, $data) {
        try {
            $this->db->beginTransaction();
            
            $sqlU = "UPDATE usuarioe SET UsrA = ?, IdInstitucion = ? WHERE IdUsrA = ?";
            $this->db->prepare($sqlU)->execute([$data['UsrA'], $data['IdInstitucion'], $id]);

            $sqlP = "UPDATE personae SET NombreA = ?, ApellidoA = ?, EmailA = ? WHERE IdUsrA = ?";
            $this->db->prepare($sqlP)->execute([$data['NombreA'], $data['ApellidoA'], $data['EmailA'], $id]);

            $this->db->prepare("UPDATE tienetipor SET IdTipousrA = ? WHERE IdUsrA = ?")
                    ->execute([$data['IdTipoUsrA'], $id]);

            Auditoria::log($this->db, 'UPDATE', 'usuarioe', "Actualizó Perfil Administrativo del Usuario ID: $id");

            $this->db->commit();
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function createGlobal($data) {
        try {
            $this->db->beginTransaction();

            $passHash = password_hash($data['Clave'], PASSWORD_DEFAULT);
            $sqlU = "INSERT INTO usuarioe (UsrA, password_secure, IdInstitucion, confirmado) VALUES (?, ?, ?, 1)";
            $stmtU = $this->db->prepare($sqlU);
            $stmtU->execute([$data['UsrA'], $passHash, $data['IdInstitucion']]);
            $newId = $this->db->lastInsertId();

            $sqlP = "INSERT INTO personae (IdUsrA, NombreA, ApellidoA, EmailA) VALUES (?, ?, ?, ?)";
            $this->db->prepare($sqlP)->execute([$newId, $data['NombreA'], $data['ApellidoA'], $data['EmailA']]);

            $sqlR = "INSERT INTO tienetipor (IdUsrA, IdTipousrA) VALUES (?, ?)";
            $this->db->prepare($sqlR)->execute([$newId, $data['IdTipoUsrA']]);

            $sqlA = "INSERT INTO actividade (IdUsrA, ActivoA) VALUES (?, 1)";
            $this->db->prepare($sqlA)->execute([$newId]);

            Auditoria::log($this->db, 'INSERT', 'usuarioe', "Creó cuenta manual para Usuario: " . $data['UsrA']);

            $this->db->commit();
            return $newId;

        } catch (\Exception $e) {
            $this->db->rollBack(); 
            throw $e;
        }
    }

    public function resetPassword($id) {
        $newPass = password_hash('12345678', PASSWORD_DEFAULT);
        $res = $this->db->prepare("UPDATE usuarioe SET password_secure = ? WHERE IdUsrA = ?")
                        ->execute([$newPass, $id]);
        
        Auditoria::log($this->db, 'UPDATE_PASS', 'usuarioe', "Forzó reseteo de contraseña (12345678) a Usuario ID: $id");
        return $res;
    }

    public function existsUsername($username, $excludeId = null) {
        $sql = "SELECT COUNT(*) FROM usuarioe WHERE UsrA = ?";
        $params = [$username];

        if ($excludeId && $excludeId !== "undefined" && $excludeId !== "") {
            $sql .= " AND IdUsrA != ?";
            $params[] = (int)$excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn() > 0;
    }
}