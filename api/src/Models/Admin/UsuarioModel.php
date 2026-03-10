<?php
namespace App\Models\Admin;
use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class UsuarioModel {
    private $db;

    public function __construct($db) { $this->db = $db; }

public function getAllGlobal() {
        // Quitamos el filtro "u.IdInstitucion = ?" para que traiga absolutamente a todos
        // (Excepto a otros SuperAdmins -> IdTipousrA != 1)
        // Usamos LEFT JOIN en institucion por si algún usuario quedó "huérfano" de sede.
        $sql = "SELECT u.IdUsrA, u.UsrA, u.IdInstitucion, p.NombreA, p.ApellidoA, p.EmailA, 
                    COALESCE(i.NombreInst, 'Sin Asignar') as NombreInst, 
                    t.IdTipousrA AS IdTipoUsrA,
                    a.ActivoA AS confirmado
                FROM usuarioe u
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                WHERE t.IdTipousrA != 1 
                ORDER BY i.NombreInst ASC, p.ApellidoA ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
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

    /**
     * Vista previa para eliminación total: datos del usuario, conteos y listas detalladas (protocolos, formularios, alojamientos).
     */
    public function getDeletePreview($id, $instId = null) {
        $id = (int) $id;
        $sql = "
            SELECT u.IdUsrA, u.UsrA, u.IdInstitucion,
                   COALESCE(p.NombreA, '') as NombreA, COALESCE(p.ApellidoA, '') as ApellidoA, COALESCE(p.EmailA, '') as EmailA,
                   i.NombreInst
            FROM usuarioe u
            LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
            LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
            WHERE u.IdUsrA = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) return null;
        if ($instId !== null && (int)$user['IdInstitucion'] !== (int)$instId) return null;

        $countProt = $this->db->prepare("SELECT COUNT(*) FROM protocoloexpe WHERE IdUsrA = ?");
        $countProt->execute([$id]);
        $user['protocolos'] = (int) $countProt->fetchColumn();

        $countForms = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE IdUsrA = ?");
        $countForms->execute([$id]);
        $user['formularios'] = (int) $countForms->fetchColumn();

        $countAloj = $this->db->prepare("SELECT COUNT(*) FROM alojamiento WHERE IdUsrA = ?");
        $countAloj->execute([$id]);
        $user['alojamientos'] = (int) $countAloj->fetchColumn();

        $stmtProt = $this->db->prepare("SELECT idprotA, nprotA, tituloA FROM protocoloexpe WHERE IdUsrA = ? ORDER BY idprotA");
        $stmtProt->execute([$id]);
        $user['protocolos_list'] = $stmtProt->fetchAll(PDO::FETCH_ASSOC);

        $stmtForm = $this->db->prepare("
            SELECT f.idformA, f.tipoA, COALESCE(tf.nombreTipo, '') as tipo_nombre, COALESCE(tf.categoriaformulario, '') as categoria,
                   COALESCE(pe.nprotA, '') as nprot
            FROM formularioe f
            LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            LEFT JOIN protformr pf ON f.idformA = pf.idformA
            LEFT JOIN protocoloexpe pe ON pf.idprotA = pe.idprotA
            WHERE f.IdUsrA = ?
            ORDER BY f.idformA
        ");
        $stmtForm->execute([$id]);
        $user['formularios_list'] = $stmtForm->fetchAll(PDO::FETCH_ASSOC);

        $stmtAloj = $this->db->prepare("SELECT IdAlojamiento, historia, idprotA FROM alojamiento WHERE IdUsrA = ? ORDER BY historia, IdAlojamiento LIMIT 500");
        $stmtAloj->execute([$id]);
        $user['alojamientos_list'] = $stmtAloj->fetchAll(PDO::FETCH_ASSOC);

        return $user;
    }

    /** Almacena código de verificación en archivo temporal (expira 10 min). */
    public static function storeVerificationCode($idTarget, $idAdmin, $code) {
        $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR);
        $file = $dir . '/grobo_del_' . (int)$idTarget . '_' . (int)$idAdmin . '.txt';
        $expires = date('Y-m-d H:i:s', time() + 600);
        file_put_contents($file, $code . '|' . $expires);
    }

    /** Valida y consume el código de verificación. */
    public static function validateVerificationCode($idTarget, $idAdmin, $code) {
        $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR);
        $file = $dir . '/grobo_del_' . (int)$idTarget . '_' . (int)$idAdmin . '.txt';
        if (!is_file($file)) return false;
        $content = file_get_contents($file);
        @unlink($file);
        $parts = explode('|', $content, 2);
        if (count($parts) !== 2 || trim($parts[0]) !== trim($code)) return false;
        return strtotime($parts[1]) >= time();
    }

    /**
     * Eliminación en cascada del usuario y todos sus datos (protocolos, formularios, alojamientos).
     * Orden: dependencias de formularios → formularioe → alojamiento por protocolo → protdeptor/protesper/protformr → protocoloexpe → alojamiento por IdUsrA → personae, tienetipor, actividade, usuarioe.
     */
    public function deleteUserFullCascade($id) {
        $id = (int) $id;
        $this->db->beginTransaction();
        try {
            // Formularios: tablas que referencian idformA
            $stmtForms = $this->db->prepare("SELECT idformA FROM formularioe WHERE IdUsrA = ?");
            $stmtForms->execute([$id]);
            $formIds = $stmtForms->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($formIds)) {
                $placeholders = implode(',', array_fill(0, count($formIds), '?'));
                $this->db->prepare("DELETE FROM sexoe WHERE idformA IN ($placeholders)")->execute($formIds);
                $this->db->prepare("DELETE FROM formespe WHERE idformA IN ($placeholders)")->execute($formIds);
                if ($this->tableExists('precioinsumosformulario')) {
                    $stmtPrecio = $this->db->prepare("SELECT idPrecioinsumosformulario FROM precioinsumosformulario WHERE idformA IN ($placeholders)");
                    $stmtPrecio->execute($formIds);
                    $precioIds = $stmtPrecio->fetchAll(PDO::FETCH_COLUMN);
                    if (!empty($precioIds)) {
                        $ph2 = implode(',', array_fill(0, count($precioIds), '?'));
                        $this->db->prepare("DELETE FROM forminsumo WHERE idPrecioinsumosformulario IN ($ph2)")->execute($precioIds);
                    }
                    $this->db->prepare("DELETE FROM precioinsumosformulario WHERE idformA IN ($placeholders)")->execute($formIds);
                }
                $this->db->prepare("DELETE FROM protformr WHERE idformA IN ($placeholders)")->execute($formIds);
            }
            $this->db->prepare("DELETE FROM formularioe WHERE IdUsrA = ?")->execute([$id]);

            // Protocolos del usuario
            $stmtProt = $this->db->prepare("SELECT idprotA FROM protocoloexpe WHERE IdUsrA = ?");
            $stmtProt->execute([$id]);
            $protIds = $stmtProt->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($protIds)) {
                $ph = implode(',', array_fill(0, count($protIds), '?'));
                $this->db->prepare("DELETE FROM alojamiento WHERE idprotA IN ($ph)")->execute($protIds);
                $this->db->prepare("DELETE FROM protdeptor WHERE idprotA IN ($ph)")->execute($protIds);
                $this->db->prepare("DELETE FROM protesper WHERE idprotA IN ($ph)")->execute($protIds);
                $this->db->prepare("DELETE FROM protformr WHERE idprotA IN ($ph)")->execute($protIds);
                if ($this->tableExists('solicitudprotocolo')) {
                    $this->db->prepare("DELETE FROM solicitudprotocolo WHERE idprotA IN ($ph)")->execute($protIds);
                }
            }
            $this->db->prepare("DELETE FROM protocoloexpe WHERE IdUsrA = ?")->execute([$id]);

            // Alojamientos donde el usuario es responsable (IdUsrA)
            $this->db->prepare("DELETE FROM alojamiento WHERE IdUsrA = ?")->execute([$id]);

            // Registro de alojamiento si existe
            if ($this->tableExists('registroalojamiento')) {
                $this->db->prepare("DELETE FROM registroalojamiento WHERE IdUsrA = ?")->execute([$id]);
            }

            // Usuario y tablas relacionadas
            $this->db->prepare("DELETE FROM actividade WHERE IdUsrA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM tienetipor WHERE IdUsrA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM personae WHERE IdUsrA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM usuarioe WHERE IdUsrA = ?")->execute([$id]);

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function tableExists($table) {
        $stmt = $this->db->prepare("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
        $stmt->execute([$table]);
        return $stmt->fetchColumn() == 1;
    }

    /** Devuelve email y nombre de la persona (para envío de correos al admin). */
    public function getPersonaByUserId($idUsrA) {
        $stmt = $this->db->prepare("SELECT EmailA, COALESCE(NombreA, '') as NombreA, COALESCE(ApellidoA, '') as ApellidoA FROM personae WHERE IdUsrA = ?");
        $stmt->execute([(int) $idUsrA]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}