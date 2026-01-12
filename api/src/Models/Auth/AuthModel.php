<?php
namespace App\Models\Auth;
use PDO;

class AuthModel {
    private $db;
    
    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getInstitucionBySlug($slug) {
        // Buscamos ignorando mayúsculas/minúsculas
        $stmt = $this->db->prepare("SELECT * FROM institucion WHERE LOWER(NombreInst) = LOWER(?) LIMIT 1");
        $stmt->execute([$slug]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getUserByUsername($username) {
        $sql = "SELECT u.*, i.DependenciaInstitucion, t.IdTipousrA as role 
                FROM usuarioe u 
                JOIN institucion i ON u.IdInstitucion = i.IdInstitucion 
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                WHERE u.UsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }


    public function getSuperAdminByUsername($username) {
        // Unimos usuarioe con tienetipor para verificar el rol 3
        $sql = "SELECT u.UsrA as Nombre, u.password_secure as Password 
                FROM usuarioe u 
                JOIN tienetipor t ON u.IdUsrA = t.IdUsrA 
                WHERE u.UsrA = ? AND t.IdTipousrA = 1 
                LIMIT 1";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
} 