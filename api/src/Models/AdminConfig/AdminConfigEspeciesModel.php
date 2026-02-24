<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria; // <-- IMPORTANTE

class AdminConfigEspeciesModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getTree($instId) {
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
            $sql = "INSERT INTO especiee (EspeNombreA, IdInstitucion, Panimal, PalojamientoChica, PalojamientoGrande, Habilitado) 
                    VALUES (?, ?, 0, 0, 0, 1)";
            $res = $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['instId']]);
            
            Auditoria::log($this->db, 'INSERT', 'especiee', "Agregó especie: " . $data['EspeNombreA']);
            return $res;
        } else {
            $sql = "UPDATE especiee SET EspeNombreA = ? WHERE idespA = ?";
            $res = $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['idespA']]);
            
            Auditoria::log($this->db, 'UPDATE', 'especiee', "Modificó especie ID: " . $data['idespA']);
            return $res;
        }
    }

    public function saveSubespecie($data) {
        $tipo = $data['SubEspTipo'] ?? 'Unid.';
        $cant = $data['SubEspCantidad'] ?? 1;
        $existe = $data['Existe'] ?? 1; 

        if (empty($data['idsubespA'])) {
            $sql = "INSERT INTO subespecie (idespA, SubEspeNombreA, SubEspTipo, SubEspCantidad, Existe, Psubanimal, PsubalojamientoChica, PsubalojamientoGrande) 
                    VALUES (?, ?, ?, ?, 1, 0, 0, 0)";
            $res = $this->db->prepare($sql)->execute([
                $data['idespA'], 
                $data['SubEspeNombreA'],
                $tipo,
                $cant
            ]);
            
            Auditoria::log($this->db, 'INSERT', 'subespecie', "Agregó subespecie: " . $data['SubEspeNombreA']);
            return $res;
        } else {
            $sql = "UPDATE subespecie SET SubEspeNombreA = ?, SubEspTipo = ?, SubEspCantidad = ?, Existe = ? WHERE idsubespA = ?";
            $res = $this->db->prepare($sql)->execute([
                $data['SubEspeNombreA'],
                $tipo,
                $cant,
                $existe,
                $data['idsubespA']
            ]);
            
            Auditoria::log($this->db, 'UPDATE', 'subespecie', "Modificó subespecie ID: " . $data['idsubespA']);
            return $res;
        }
    }

    public function deleteEspecie($id) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE idsubespA IN (SELECT idsubespA FROM subespecie WHERE idespA = ?)");
        $stmt->execute([$id]);
        $hasHistory = $stmt->fetchColumn() > 0;

        if ($hasHistory) {
            $this->db->prepare("UPDATE especiee SET Habilitado = 2 WHERE idespA = ?")->execute([$id]);
            $this->db->prepare("UPDATE subespecie SET Existe = 2 WHERE idespA = ?")->execute([$id]);
            
            Auditoria::log($this->db, 'SOFT_DELETE', 'especiee', "Desactivó especie ID: $id por tener historial");
            return "deactivated";
        } else {
            $this->db->prepare("DELETE FROM subespecie WHERE idespA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM especiee WHERE idespA = ?")->execute([$id]);
            
            Auditoria::log($this->db, 'DELETE', 'especiee', "Eliminación física de especie ID: $id");
            return "deleted";
        }
    }

    public function toggleSubespecie($id, $status) {
        $sql = "UPDATE subespecie SET Existe = ? WHERE idsubespA = ?";
        $res = $this->db->prepare($sql)->execute([$status, $id]);
        
        Auditoria::log($this->db, 'UPDATE', 'subespecie', "Cambió visibilidad (Existe=$status) de la subespecie ID: $id");
        return $res;
    }
}