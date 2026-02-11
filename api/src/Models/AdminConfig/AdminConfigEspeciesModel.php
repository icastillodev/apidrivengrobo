<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigEspeciesModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getTree($instId) {
        // Traemos especies
        $stmt = $this->db->prepare("SELECT * FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA ASC");
        $stmt->execute([$instId]);
        $especies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Por cada especie, traemos sus subespecies
        foreach ($especies as &$esp) {
            $stmtSub = $this->db->prepare("SELECT * FROM subespecie WHERE idespA = ? ORDER BY SubEspeNombreA ASC");
            $stmtSub->execute([$esp['idespA']]);
            $esp['subespecies'] = $stmtSub->fetchAll(PDO::FETCH_ASSOC);
        }
        return $especies;
    }

    public function saveEspecie($data) {
        if (empty($data['idespA'])) {
            $sql = "INSERT INTO especiee (EspeNombreA, IdInstitucion, Panimal, PalojamientoChica, PalojamientoGrande) VALUES (?, ?, 0, 0, 0)";
            return $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['instId']]);
        } else {
            $sql = "UPDATE especiee SET EspeNombreA = ? WHERE idespA = ?";
            return $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['idespA']]);
        }
    }

    public function deleteEspecie($id) {
        // 1. Verificar si hay formularios usándola
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE idsubespA IN (SELECT idsubespA FROM subespecie WHERE idespA = ?)");
        $stmt->execute([$id]);
        $hasHistory = $stmt->fetchColumn() > 0;

        if ($hasHistory) {
            // No se puede eliminar: Desactivar todo
            $this->db->prepare("UPDATE especiee SET Panimal=0, PalojamientoChica=0, PalojamientoGrande=0 WHERE idespA=?")->execute([$id]);
            $this->db->prepare("UPDATE subespecie SET Existe=2, Psubanimal=0 WHERE idespA=?")->execute([$id]);
            return "deactivated";
        } else {
            // Se puede eliminar físicamente
            $this->db->prepare("DELETE FROM subespecie WHERE idespA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM especiee WHERE idespA = ?")->execute([$id]);
            return "deleted";
        }
    }

    public function saveSubespecie($data) {
        if (empty($data['idsubespA'])) {
            $sql = "INSERT INTO subespecie (idespA, SubEspeNombreA, Existe, Psubanimal, PsubalojamientoChica, PsubalojamientoGrande) VALUES (?, ?, 1, 0, 0, 0)";
            return $this->db->prepare($sql)->execute([$data['idespA'], $data['SubEspeNombreA']]);
        } else {
            $sql = "UPDATE subespecie SET SubEspeNombreA = ? WHERE idsubespA = ?";
            return $this->db->prepare($sql)->execute([$data['SubEspeNombreA'], $data['idsubespA']]);
        }
    }

    public function toggleSubespecie($id, $status) {
        $sql = "UPDATE subespecie SET Existe = ? WHERE idsubespA = ?";
        return $this->db->prepare($sql)->execute([$status, $id]);
    }
}