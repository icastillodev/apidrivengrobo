<?php
namespace App\Models\User;

use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

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
        $res = $stmt->execute([
            $data['nombre'], 
            $data['apellido'], 
            $data['email'], 
            $data['celular'], 
            $data['userId']
        ]);
        
        Auditoria::log($this->db, 'UPDATE', 'personae', "Actualizó datos personales propios (Desde panel de Perfil).");
        return $res;
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
        $res = $stmt->execute([$newHash, $userId]);
        
        Auditoria::log($this->db, 'UPDATE_PASS', 'usuarioe', "Actualizó su propia contraseña");
        return $res;
    }
}