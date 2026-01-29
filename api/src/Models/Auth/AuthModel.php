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

    // App/Models/Auth/AuthModel.php

    public function getUserByUsername($username) {
        // Si tienes una tabla de personas vinculada, haz el JOIN aquí
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
    // IMPORTANTE: Agregamos u.IdUsrA a la consulta
    $sql = "SELECT u.IdUsrA, u.UsrA as Nombre, u.password_secure as Password 
            FROM usuarioe u 
            JOIN tienetipor t ON u.IdUsrA = t.IdUsrA 
            WHERE u.UsrA = ? AND t.IdTipousrA = 1 
            LIMIT 1";
            
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$username]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}


public function updateActivityMetadata($userId) {
    // Actualizamos la fecha y aseguramos que esté en 1 (Activo)
    $sql = "UPDATE actividade SET UltentradaA = NOW(), ActivoA = 1 WHERE IdUsrA = ?";
    $stmt = $this->db->prepare($sql);
    return $stmt->execute([$userId]);
    }
public function runMaintenance($instId) {
    // 1. Verificar si pasó un mes
    $stmt = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
    $stmt->execute([$instId]);
    $lastPurge = $stmt->fetchColumn();

    $now = new \DateTime();
    if ($lastPurge) {
        $lastDate = new \DateTime($lastPurge);
        if ($lastDate->diff($now)->m < 1 && $lastDate->diff($now)->y == 0) {
            return false; // No ha pasado un mes
        }
    }

    // 2. Ejecutar limpieza profunda
    $sql = "DELETE u FROM usuarioe u
            LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
            LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
            LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
            WHERE u.IdInstitucion = ? 
            AND (t.IdTipousrA = 2 OR t.IdTipousrA IS NULL) -- Solo tipo Investigador
            AND (
                -- CASO A: Mal creados (faltan tablas críticas)
                (p.IdUsrA IS NULL OR a.IdUsrA IS NULL OR t.IdUsrA IS NULL)
                OR 
                -- CASO B: Inactivos 3 meses y sin ningún dato anexado
                (
                    a.UltentradaA < DATE_SUB(NOW(), INTERVAL 3 MONTH)
                    AND NOT EXISTS (SELECT 1 FROM protocoloexpe WHERE IdUsrA = u.IdUsrA)
                    AND NOT EXISTS (SELECT 1 FROM formularioe WHERE IdUsrA = u.IdUsrA)
                )
            )";
    
    $this->db->prepare($sql)->execute([$instId]);

    // 3. Actualizar fecha de depuración
    $this->db->prepare("UPDATE institucion SET FechaDepuracion = NOW() WHERE IdInstitucion = ?")
             ->execute([$instId]);

    return true;
}

} 