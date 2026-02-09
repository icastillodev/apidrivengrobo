<?php
namespace App\Models\User;

use PDO;

class UserProfileModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getUserData($userId) {
        $sql = "SELECT 
                    u.IdUsrA, 
                    u.UsrA as Usuario, 
                    p.NombreA, 
                    p.ApellidoA, 
                    p.EmailA, 
                    p.CelularA, 
                    p.PaisA,
                    i.NombreInst
                FROM usuarioe u
                JOIN personae p ON u.IdUsrA = p.IdUsrA
                JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                WHERE u.IdUsrA = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function updatePersonalData($data) {
        $sql = "UPDATE personae SET 
                    NombreA = ?, 
                    ApellidoA = ?, 
                    EmailA = ?, 
                    CelularA = ? 
                WHERE IdUsrA = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['nombre'], 
            $data['apellido'], 
            $data['email'], 
            $data['celular'], 
            $data['userId']
        ]);
    }

    public function verifyCurrentPassword($userId, $inputPass) {
        $stmt = $this->db->prepare("SELECT password_secure FROM usuarioe WHERE IdUsrA = ?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();

        if (!$hash) return false;
        return password_verify($inputPass, $hash);
    }

    public function updatePassword($userId, $newHash) {
        $stmt = $this->db->prepare("UPDATE usuarioe SET password_secure = ? WHERE IdUsrA = ?");
        return $stmt->execute([$newHash, $userId]);
    }
}