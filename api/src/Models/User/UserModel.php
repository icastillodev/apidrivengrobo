<?php
namespace App\Models\User;

use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class UserModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getUsersByInstitution($instId) {
        $sql = "SELECT 
                    u.IdUsrA, 
                    u.UsrA as Usuario, 
                    p.NombreA, 
                    p.ApellidoA, 
                    p.CelularA, 
                    p.EmailA as Correo, 
                    p.LabA as iddeptoA,
                    (SELECT COUNT(*) 
                    FROM formularioe f 
                    JOIN protformr pf ON f.idformA = pf.idformA
                    JOIN protocoloexpe pe ON pf.idprotA = pe.idprotA
                    WHERE f.IdUsrA = u.IdUsrA) as OtrosCeuaCount
                FROM usuarioe u
                JOIN personae p ON u.IdUsrA = p.IdUsrA
                WHERE u.IdInstitucion = ?
                ORDER BY p.ApellidoA ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function registerUser($data) {
        try {
            $this->db->beginTransaction();

            $token = bin2hex(random_bytes(32)); 
            $passHash = password_hash($data['contrasena'], PASSWORD_BCRYPT);

            $sqlUser = "INSERT INTO usuarioe (UsrA, password_secure, IdInstitucion, token_confirmacion, confirmado) 
                        VALUES (?, ?, ?, ?, 0)";
            $stmtUser = $this->db->prepare($sqlUser);
            $stmtUser->execute([
                $data['usuario'], 
                $passHash, 
                $data['IdInstitucion'], 
                $token
            ]);
            $userId = $this->db->lastInsertId();

            $sqlPers = "INSERT INTO personae (NombreA, ApellidoA, EmailA, PaisA, CelularA, IdUsrA) 
                        VALUES (?, ?, ?, ?, ?, ?)";
            $stmtPers = $this->db->prepare($sqlPers);
            $stmtPers->execute([
                $data['NombreA'], 
                $data['ApellidoA'], 
                $data['EmailA'], 
                $data['PaisA'], 
                $data['CelularA'] ?? '', 
                $userId
            ]);

            $sqlRole = "INSERT INTO tienetipor (IdUsrA, IdTipousrA) VALUES (?, ?)";
            $this->db->prepare($sqlRole)->execute([$userId, 3]);

            $sqlAct = "INSERT INTO actividade (IdUsrA, ActivoA) VALUES (?, 1)";
            $this->db->prepare($sqlAct)->execute([$userId]);

            // Auditoría Manual (No hay token porque es un registro público)
            Auditoria::logManual($this->db, $userId, 'INSERT', 'usuarioe', "Registro público completado (Pendiente activación)");

            $this->db->commit();
            return ['status' => true, 'token' => $token];

        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => false, 'message' => "Error en Registro: " . $e->getMessage()];
        }
    }

    public function activateUserByToken($token) {
        try {
            $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE token_confirmacion = ? LIMIT 1");
            $stmt->execute([$token]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return ['status' => 'error', 'message' => 'El token no es válido o ya fue utilizado.'];
            }

            $sql = "UPDATE usuarioe SET confirmado = 1, token_confirmacion = NULL WHERE IdUsrA = ?";
            $this->db->prepare($sql)->execute([$user['IdUsrA']]);

            Auditoria::logManual($this->db, $user['IdUsrA'], 'UPDATE', 'usuarioe', "Cuenta activada vía email");

            return ['status' => 'success', 'message' => 'Cuenta activada correctamente.'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function existsUsername($user) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM usuarioe WHERE UsrA = ?");
        $stmt->execute([$user]);
        return $stmt->fetchColumn() > 0;
    }

    public function getInstitutionName($id) {
        $stmt = $this->db->prepare("SELECT NombreInst FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getUserByEmailAndInst($email, $instId) {
        $sql = "SELECT p.IdUsrA, p.NombreA FROM personae p 
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA 
                WHERE p.EmailA = ? AND u.IdInstitucion = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $instId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function saveResetToken($userId, $token) {
        $sql = "UPDATE usuarioe SET token_confirmacion = ? WHERE IdUsrA = ?";
        $res = $this->db->prepare($sql)->execute([$token, $userId]);
        
        Auditoria::logManual($this->db, $userId, 'UPDATE', 'usuarioe', "Generó token de recuperación de clave");
        return $res;
    }

    public function resetPasswordWithToken($token, $newHash) {
        $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE token_confirmacion = ? LIMIT 1");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) return ['status' => 'error', 'message' => 'Token inválido'];

        $sql = "UPDATE usuarioe SET password_secure = ?, token_confirmacion = NULL WHERE IdUsrA = ?";
        $this->db->prepare($sql)->execute([$newHash, $user['IdUsrA']]);
        
        Auditoria::logManual($this->db, $user['IdUsrA'], 'UPDATE', 'usuarioe', "Restableció contraseña vía correo");
        return ['status' => 'success'];
    }

    public function getUserForRecovery($email, $username, $instId) {
        $sql = "SELECT p.IdUsrA, p.NombreA FROM personae p 
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA 
                WHERE p.EmailA = ? AND u.UsrA = ? AND u.IdInstitucion = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $username, $instId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function runMaintenance($instId) {
        try {
            $stmtDate = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
            $stmtDate->execute([$instId]);
            $lastPurge = $stmtDate->fetchColumn();

            if ($lastPurge) {
                $lastDate = new \DateTime($lastPurge);
                $now = new \DateTime();
                $interval = $lastDate->diff($now);
                
                if ($interval->m < 1 && $interval->y == 0) {
                    return 0; 
                }
            }

            $sqlDelete = "DELETE u FROM usuarioe u
                    INNER JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                    LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                    LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                    WHERE u.IdInstitucion = ? 
                    AND t.IdTipousrA = 3 
                    AND (
                        (p.IdUsrA IS NULL OR a.IdUsrA IS NULL)
                        OR 
                        (
                            a.UltentradaA < DATE_SUB(NOW(), INTERVAL 3 MONTH)
                            AND NOT EXISTS (SELECT 1 FROM protocoloexpe WHERE IdUsrA = u.IdUsrA)
                            AND NOT EXISTS (SELECT 1 FROM formularioe WHERE IdUsrA = u.IdUsrA)
                        )
                    )";

            $stmtDelete = $this->db->prepare($sqlDelete);
            $stmtDelete->execute([$instId]);
            $deletedCount = $stmtDelete->rowCount();

            $sqlUpdateDate = "UPDATE institucion SET FechaDepuracion = NOW() WHERE IdInstitucion = ?";
            $this->db->prepare($sqlUpdateDate)->execute([$instId]);

            Auditoria::logManual($this->db, 0, 'DELETE', 'usuarioe', "Depuración mensual de institución $instId eliminó $deletedCount usuarios inactivos");
            return $deletedCount;

        } catch (\Exception $e) {
            error_log("Error en runMaintenance: " . $e->getMessage());
            return -1; 
        }
    }   

    public function checkNeedsPurge($instId) {
        $stmt = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $lastPurge = $stmt->fetchColumn();

        if (!$lastPurge) return true;

        $lastDate = new \DateTime($lastPurge);
        $now = new \DateTime();
        $interval = $lastDate->diff($now);

        return ($interval->m >= 1 || $interval->y >= 1);
    }
}