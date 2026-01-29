<?php
namespace App\Models\Admin;
use PDO;

class UsuarioModel {
    private $db;

    public function __construct($db) { $this->db = $db; }

    public function getAllGlobal() {
        // Agregamos u.UsrA a la consulta
        $sql = "SELECT u.IdUsrA, u.UsrA, u.IdInstitucion, p.NombreA, p.ApellidoA, p.EmailA, 
                    i.NombreInst, 
                    t.IdTipousrA AS IdTipoUsrA,
                    a.ActivoA AS confirmado
                FROM usuarioe u
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                WHERE t.IdTipousrA != 1
                ORDER BY i.NombreInst ASC, p.ApellidoA ASC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateGlobal($id, $data) {
        try {
            $this->db->beginTransaction();
            
            // 1. Actualizamos también el UsrA en la tabla usuarioe
            $sqlU = "UPDATE usuarioe SET UsrA = ?, IdInstitucion = ? WHERE IdUsrA = ?";
            $this->db->prepare($sqlU)->execute([$data['UsrA'], $data['IdInstitucion'], $id]);

            // 2. Datos personales
            $sqlP = "UPDATE personae SET NombreA = ?, ApellidoA = ?, EmailA = ? WHERE IdUsrA = ?";
            $this->db->prepare($sqlP)->execute([$data['NombreA'], $data['ApellidoA'], $data['EmailA'], $id]);

            // 3. Rol
            $this->db->prepare("UPDATE tienetipor SET IdTipousrA = ? WHERE IdUsrA = ?")
                    ->execute([$data['IdTipoUsrA'], $id]);

            $this->db->commit();
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function createGlobal($data) {
        try {
            $this->db->beginTransaction();

            // A. Insertar Credenciales (Tabla usuarioe)
            $passHash = password_hash($data['Clave'], PASSWORD_DEFAULT);
            $sqlU = "INSERT INTO usuarioe (UsrA, password_secure, IdInstitucion, confirmado) VALUES (?, ?, ?, 1)";
            $stmtU = $this->db->prepare($sqlU);
            $stmtU->execute([$data['UsrA'], $passHash, $data['IdInstitucion']]);
            $newId = $this->db->lastInsertId();

            // B. Insertar Datos Personales (Tabla personae)
            $sqlP = "INSERT INTO personae (IdUsrA, NombreA, ApellidoA, EmailA) VALUES (?, ?, ?, ?)";
            $this->db->prepare($sqlP)->execute([$newId, $data['NombreA'], $data['ApellidoA'], $data['EmailA']]);

            // C. Asignar Rol Operativo (Tabla tienetipor)
            $sqlR = "INSERT INTO tienetipor (IdUsrA, IdTipousrA) VALUES (?, ?)";
            $this->db->prepare($sqlR)->execute([$newId, $data['IdTipoUsrA']]);

            // D. Iniciar Registro de Actividad (Tabla actividade) - Marcamos con 1 (ACTIVO)
            $sqlA = "INSERT INTO actividade (IdUsrA, ActivoA) VALUES (?, 1)";
            $this->db->prepare($sqlA)->execute([$newId]);

            $this->db->commit();
            return $newId;

        } catch (\Exception $e) {
            $this->db->rollBack(); // Si algo falla, deshace todo lo anterior
            throw $e;
        }
    }


    public function resetPassword($id) {
        $newPass = password_hash('12345678', PASSWORD_DEFAULT);
        return $this->db->prepare("UPDATE usuarioe SET password_secure = ? WHERE IdUsrA = ?")
                        ->execute([$newPass, $id]);
    }
    /**
 * Consulta la base de datos buscando duplicados de UsrA
 */
public function existsUsername($username, $excludeId = null) {
    // SQL base para buscar en toda la red de bioterios
    $sql = "SELECT COUNT(*) FROM usuarioe WHERE UsrA = ?";
    $params = [$username];

    // Si estamos editando, ignoramos al dueño actual del registro
    if ($excludeId && $excludeId !== "undefined" && $excludeId !== "") {
        $sql .= " AND IdUsrA != ?";
        $params[] = (int)$excludeId;
    }

    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    
    // Retorna true si el conteo es mayor a 0 (ya está en uso)
    return $stmt->fetchColumn() > 0;
}
}