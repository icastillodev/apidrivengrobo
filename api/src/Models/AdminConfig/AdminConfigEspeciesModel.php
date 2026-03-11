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

    /**
     * Elimina una subespecie por ID si no tiene formularios asociados.
     * Verifica que la subespecie pertenezca a una especie de la institución del usuario.
     */
    public function deleteSubespecie($idSub, $instId) {
        $stmt = $this->db->prepare("
            SELECT s.idsubespA FROM subespecie s
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE s.idsubespA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idSub, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("Subespecie no encontrada o no pertenece a esta institución.");
        }

        $stmtUse = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE idsubespA = ?");
        $stmtUse->execute([$idSub]);
        $inUse = (int) $stmtUse->fetchColumn() > 0;

        if ($inUse) {
            throw new \Exception("No se puede eliminar: la subespecie está en uso en formularios. Puede desactivarla desde el estado.");
        }

        $this->db->prepare("DELETE FROM subespecie WHERE idsubespA = ?")->execute([$idSub]);
        Auditoria::log($this->db, 'DELETE', 'subespecie', "Eliminó subespecie ID: $idSub");
        return true;
    }

    public function toggleEspecie($id, $status) {
        // Habilitado: 1 = ACTIVO, 2 = INACTIVO (se mantiene el criterio usado en deleteEspecie)
        $sql = "UPDATE especiee SET Habilitado = ? WHERE idespA = ?";
        $res = $this->db->prepare($sql)->execute([$status, $id]);

        Auditoria::log(
            $this->db,
            'UPDATE',
            'especiee',
            "Cambió visibilidad (Habilitado=$status) de la especie ID: $id"
        );

        return $res;
    }

    public function getCepasBySubespecieAdmin($instId, $idSubespA) {
        $sql = "
            SELECT c.idcepaA, c.idsubespA, c.CepaNombreA, c.Habilitado
            FROM cepa c
            INNER JOIN subespecie s ON c.idsubespA = s.idsubespA
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE c.idsubespA = ?
              AND e.IdInstitucion = ?
            ORDER BY c.CepaNombreA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idSubespA, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function saveCepa($instId, $idSubespA, $nombre) {
        $nombre = trim((string)$nombre);
        if ($nombre === '') {
            throw new \Exception("Nombre de cepa inv?lido.");
        }

        // Validar que la subespecie pertenezca a la instituci?n
        $stmt = $this->db->prepare("
            SELECT s.idsubespA
            FROM subespecie s
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE s.idsubespA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idSubespA, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("La categor?a no pertenece a esta instituci?n.");
        }

        $sql = "INSERT INTO cepa (idsubespA, CepaNombreA, Habilitado) VALUES (?, ?, 1)";
        $res = $this->db->prepare($sql)->execute([$idSubespA, $nombre]);
        Auditoria::log($this->db, 'INSERT', 'cepa', "Agreg? cepa: $nombre (idsubespA=$idSubespA)");
        return $res;
    }

    public function toggleCepa($instId, $idCepa, $status) {
        $status = (int)$status;
        if (!in_array($status, [0, 1, 2], true)) {
            // Aceptamos 0/1 (y 2 si quisieran un estado legacy)
            $status = $status ? 1 : 0;
        }

        // Validar pertenencia a la instituci?n via JOIN
        $stmt = $this->db->prepare("
            SELECT c.idcepaA
            FROM cepa c
            INNER JOIN subespecie s ON c.idsubespA = s.idsubespA
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE c.idcepaA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idCepa, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("Cepa no encontrada o no pertenece a esta instituci?n.");
        }

        $sql = "UPDATE cepa SET Habilitado = ? WHERE idcepaA = ?";
        $res = $this->db->prepare($sql)->execute([$status, $idCepa]);
        Auditoria::log($this->db, 'UPDATE', 'cepa', "Cambi? Habilitado=$status de cepa ID: $idCepa");
        return $res;
    }
}