<?php
namespace App\Models\User;

use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class UserProfileModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function institucionHasColumn(string $column): bool {
        static $cache = [];
        if (array_key_exists($column, $cache)) {
            return $cache[$column];
        }
        try {
            $stmt = $this->db->prepare('SHOW COLUMNS FROM institucion LIKE ?');
            $stmt->execute([$column]);
            $cache[$column] = (bool) $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $cache[$column] = false;
        }
        return $cache[$column];
    }

    public function getUserData($userId) {
        $preciosCol = $this->institucionHasColumn('UsuariosVenPreciosFacturacion')
            ? 'COALESCE(i.UsuariosVenPreciosFacturacion, 0) AS UsuariosVenPreciosFacturacion'
            : '0 AS UsuariosVenPreciosFacturacion';
        $sql = "SELECT 
                    u.IdUsrA, 
                    u.UsrA as Usuario, 
                    p.NombreA, 
                    p.ApellidoA, 
                    p.EmailA, 
                    p.CelularA, 
                    p.PaisA,
                    i.NombreInst,
                    {$preciosCol}
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