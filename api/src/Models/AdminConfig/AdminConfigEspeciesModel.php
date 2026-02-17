<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigEspeciesModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getTree($instId) {
        // Traemos todas (habilitadas o deshabilitadas, pero no eliminadas físicamente si hubieran)
        // Habilitado != 2 significa activo, pero aquí queremos listar todo para admin
        $stmt = $this->db->prepare("SELECT * FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA ASC");
        $stmt->execute([$instId]);
        $especies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($especies as &$esp) {
            $stmtSub = $this->db->prepare("SELECT * FROM subespecie WHERE idespA = ? ORDER BY SubEspeNombreA ASC");
            $stmtSub->execute([$esp['idespA']]);
            $esp['subespecies'] = $stmtSub->fetchAll(PDO::FETCH_ASSOC);
        }
        return $especies;
    }

    public function saveEspecie($data) {
        if (empty($data['idespA'])) {
            // INSERT: Fijamos Habilitado = 1 (Activo)
            $sql = "INSERT INTO especiee (EspeNombreA, IdInstitucion, Panimal, PalojamientoChica, PalojamientoGrande, Habilitado) 
                    VALUES (?, ?, 0, 0, 0, 1)";
            return $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['instId']]);
        } else {
            // UPDATE: Solo nombre
            $sql = "UPDATE especiee SET EspeNombreA = ? WHERE idespA = ?";
            return $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['idespA']]);
        }
    }

    public function saveSubespecie($data) {
        // Aseguramos valores por defecto
        $tipo = $data['SubEspTipo'] ?? 'Unid.';
        $cant = $data['SubEspCantidad'] ?? 1;
        // Si viene el select 'Existe', lo usamos, sino defecto 1 (Activo)
        $existe = $data['Existe'] ?? 1; 

        if (empty($data['idsubespA'])) {
            // INSERT: Agregamos Tipo, Cantidad y Existe
            $sql = "INSERT INTO subespecie (idespA, SubEspeNombreA, SubEspTipo, SubEspCantidad, Existe, Psubanimal, PsubalojamientoChica, PsubalojamientoGrande) 
                    VALUES (?, ?, ?, ?, 1, 0, 0, 0)";
            return $this->db->prepare($sql)->execute([
                $data['idespA'], 
                $data['SubEspeNombreA'],
                $tipo,
                $cant
            ]);
        } else {
            // UPDATE: Actualizamos todo
            $sql = "UPDATE subespecie SET SubEspeNombreA = ?, SubEspTipo = ?, SubEspCantidad = ?, Existe = ? WHERE idsubespA = ?";
            return $this->db->prepare($sql)->execute([
                $data['SubEspeNombreA'],
                $tipo,
                $cant,
                $existe,
                $data['idsubespA']
            ]);
        }
    }

    public function deleteEspecie($id) {
        // Verificar historial en formularios
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE idsubespA IN (SELECT idsubespA FROM subespecie WHERE idespA = ?)");
        $stmt->execute([$id]);
        $hasHistory = $stmt->fetchColumn() > 0;

        if ($hasHistory) {
            // SOFT DELETE: Habilitado = 2 (Inactivo)
            $this->db->prepare("UPDATE especiee SET Habilitado = 2 WHERE idespA = ?")->execute([$id]);
            // También desactivamos subespecies (Existe = 2)
            $this->db->prepare("UPDATE subespecie SET Existe = 2 WHERE idespA = ?")->execute([$id]);
            return "deactivated";
        } else {
            // HARD DELETE: Borrado físico
            $this->db->prepare("DELETE FROM subespecie WHERE idespA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM especiee WHERE idespA = ?")->execute([$id]);
            return "deleted";
        }
    }

    public function toggleSubespecie($id, $status) {
        $sql = "UPDATE subespecie SET Existe = ? WHERE idsubespA = ?";
        return $this->db->prepare($sql)->execute([$status, $id]);
    }
}