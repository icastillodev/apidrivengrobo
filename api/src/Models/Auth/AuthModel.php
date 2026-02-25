<?php
namespace App\Models\Auth;
use PDO;

class AuthModel {
    private $db;
    
    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getInstitucionBySlug($slug) {
        $stmt = $this->db->prepare("SELECT * FROM institucion WHERE LOWER(NombreInst) = LOWER(?) LIMIT 1");
        $stmt->execute([$slug]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

public function getUserByUsername($username) {
        // --- CORRECCIÓN CRÍTICA ---
        // Cambiamos JOIN por LEFT JOIN en 'institucion'.
        // Esto permite que el Superadmin (IdInstitucion=0) sea encontrado 
        // aunque el ID 0 no exista en la tabla de instituciones.
        
        $sql = "SELECT u.*, i.DependenciaInstitucion, t.IdTipousrA as role, p.EmailA, p.NombreA, p.ApellidoA
                FROM usuarioe u 
                LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion 
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                WHERE u.UsrA = ?";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

public function getSuperAdminByUsername($username) {
    // CORRECCIÓN: Quitamos validaciones extrañas, solo usuario y rol 1
    // Asegúrate que en la tabla 'tienetipor' tu usuario tenga IdTipousrA = 1
    $sql = "SELECT u.IdUsrA, u.UsrA, u.password_secure, t.IdTipousrA as role, 
                   COALESCE(p.EmailA, 'admin@admin.com') as EmailA, -- Fallback si no tiene mail
                   COALESCE(p.NombreA, 'Super') as NombreA, 
                   COALESCE(p.ApellidoA, 'Admin') as ApellidoA
            FROM usuarioe u 
            JOIN tienetipor t ON u.IdUsrA = t.IdUsrA 
            LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
            WHERE u.UsrA = ? AND t.IdTipousrA = 1 
            LIMIT 1";

    $stmt = $this->db->prepare($sql);
    $stmt->execute([$username]);
    return $stmt->fetch(\PDO::FETCH_ASSOC);
}

    public function updateActivityMetadata($userId) {
        $sql = "UPDATE actividade SET UltentradaA = NOW(), ActivoA = 1 WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }

    // --- NUEVAS FUNCIONES 2FA ---

    public function save2FACode($userId, $code) {
        // Expira en 10 minutos
        $sql = "UPDATE usuarioe SET two_factor_code = ?, two_factor_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE IdUsrA = ?";
        return $this->db->prepare($sql)->execute([$code, $userId]);
    }

public function verifyAndGetUser2FA($userId, $code) {
        // AGREGAMOS p.ApellidoA AQUÍ
        $sql = "SELECT u.IdUsrA, u.IdInstitucion, u.UsrA, t.IdTipousrA as role, p.NombreA, p.ApellidoA 
                FROM usuarioe u
                JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                WHERE u.IdUsrA = ? 
                AND u.two_factor_code = ? 
                AND u.two_factor_expires > NOW()";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $code]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function clear2FACode($userId) {
        $sql = "UPDATE usuarioe SET two_factor_code = NULL, two_factor_expires = NULL WHERE IdUsrA = ?";
        return $this->db->prepare($sql)->execute([$userId]);
    }

    // --- MANTENIMIENTO ---
    public function runMaintenance($instId) {
        $stmt = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $lastPurge = $stmt->fetchColumn();

        $now = new \DateTime();
        if ($lastPurge) {
            $lastDate = new \DateTime($lastPurge);
            if ($lastDate->diff($now)->m < 1 && $lastDate->diff($now)->y == 0) {
                return false; 
            }
        }

        $sql = "DELETE u FROM usuarioe u
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                WHERE u.IdInstitucion = ? 
                AND (t.IdTipousrA = 2 OR t.IdTipousrA IS NULL)
                AND (
                    (p.IdUsrA IS NULL OR a.IdUsrA IS NULL OR t.IdUsrA IS NULL)
                    OR 
                    (
                        a.UltentradaA < DATE_SUB(NOW(), INTERVAL 3 MONTH)
                        AND NOT EXISTS (SELECT 1 FROM protocoloexpe WHERE IdUsrA = u.IdUsrA)
                        AND NOT EXISTS (SELECT 1 FROM formularioe WHERE IdUsrA = u.IdUsrA)
                    )
                )";
        
        $this->db->prepare($sql)->execute([$instId]);
        $this->db->prepare("UPDATE institucion SET FechaDepuracion = NOW() WHERE IdInstitucion = ?")->execute([$instId]);
        return true;
    }
    // =========================================================
    // SEGURIDAD: CONTROL DE INTENTOS (RATE LIMITING)
    // =========================================================

    public function isIpBlocked($ip) {
        $stmt = $this->db->prepare("SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = ?");
        $stmt->execute([$ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $lastAttempt = strtotime($row['last_attempt']);
            $timePassed = time() - $lastAttempt;
            
            // Si tiene 5 o más intentos y pasaron menos de 5 minutos (300 segundos)
            if ($row['attempts'] >= 5 && $timePassed < 300) {
                return true; // 🚨 BLOQUEADO
            }
            
            // Si ya pasaron los 5 minutos, le perdonamos la vida y reiniciamos
            if ($row['attempts'] >= 5 && $timePassed >= 300) {
                $this->resetLoginAttempts($ip);
                return false;
            }
        }
        return false;
    }

    public function recordFailedLogin($ip) {
        // Inserta la IP con 1 intento. Si ya existe, le suma 1 y actualiza la hora.
        $sql = "INSERT INTO login_attempts (ip_address, attempts, last_attempt) 
                VALUES (?, 1, NOW()) 
                ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = NOW()";
        $this->db->prepare($sql)->execute([$ip]);
    }

    public function resetLoginAttempts($ip) {
        // Borramos el historial criminal de la IP cuando se loguea con éxito
        $this->db->prepare("DELETE FROM login_attempts WHERE ip_address = ?")->execute([$ip]);
    }
}