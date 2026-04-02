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
            
            Auditoria::log($this->db, 'INSERT', 'especiee', "Agreg? especie: " . $data['EspeNombreA']);
            return $res;
        } else {
            $sql = "UPDATE especiee SET EspeNombreA = ? WHERE idespA = ?";
            $res = $this->db->prepare($sql)->execute([$data['EspeNombreA'], $data['idespA']]);
            
            Auditoria::log($this->db, 'UPDATE', 'especiee', "Modific? especie ID: " . $data['idespA']);
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
            
            Auditoria::log($this->db, 'INSERT', 'subespecie', "Agreg? subespecie: " . $data['SubEspeNombreA']);
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
            
            Auditoria::log($this->db, 'UPDATE', 'subespecie', "Modific? subespecie ID: " . $data['idsubespA']);
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
            
            Auditoria::log($this->db, 'SOFT_DELETE', 'especiee', "Desactiv? especie ID: $id por tener historial");
            return "deactivated";
        } else {
            $this->db->prepare("DELETE FROM subespecie WHERE idespA = ?")->execute([$id]);
            $this->db->prepare("DELETE FROM especiee WHERE idespA = ?")->execute([$id]);
            
            Auditoria::log($this->db, 'DELETE', 'especiee', "Eliminaci?n f?sica de especie ID: $id");
            return "deleted";
        }
    }

    public function toggleSubespecie($id, $status) {
        $sql = "UPDATE subespecie SET Existe = ? WHERE idsubespA = ?";
        $res = $this->db->prepare($sql)->execute([$status, $id]);
        
        Auditoria::log($this->db, 'UPDATE', 'subespecie', "Cambi? visibilidad (Existe=$status) de la subespecie ID: $id");
        return $res;
    }

    /**
     * Elimina una subespecie por ID si no tiene formularios asociados.
     * Verifica que la subespecie pertenezca a una especie de la instituci?n del usuario.
     */
    public function deleteSubespecie($idSub, $instId) {
        $stmt = $this->db->prepare("
            SELECT s.idsubespA FROM subespecie s
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE s.idsubespA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idSub, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("Subespecie no encontrada o no pertenece a esta instituci?n.");
        }

        $stmtUse = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE idsubespA = ?");
        $stmtUse->execute([$idSub]);
        $inUse = (int) $stmtUse->fetchColumn() > 0;

        if ($inUse) {
            throw new \Exception("No se puede eliminar: la subespecie est? en uso en formularios. Puede desactivarla desde el estado.");
        }

        $this->db->prepare("DELETE FROM subespecie WHERE idsubespA = ?")->execute([$idSub]);
        Auditoria::log($this->db, 'DELETE', 'subespecie', "Elimin? subespecie ID: $idSub");
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
            "Cambi? visibilidad (Habilitado=$status) de la especie ID: $id"
        );

        return $res;
    }

    public function getCepasBySubespecieAdmin($instId, $idSubespA) {
        // Nota: Aunque el par?metro viene con idsubespA (categor?a),
        // la tabla cepa ahora est? subordinada a especiee (idespA).
        // Mapeamos subespecie -> especie y devolvemos todas las cepas de esa especie.
        $sql = "
            SELECT 
                c.idcepaA,
                c.idespA,
                c.CepaNombreA,
                c.Habilitado
            FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
            INNER JOIN subespecie s ON s.idespA = e.idespA
            WHERE s.idsubespA = ?
              AND e.IdInstitucion = ?
            ORDER BY c.CepaNombreA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idSubespA, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Cepas por especie (idespA) para la UI de configuraci?n. */
    public function getCepasByEspecieAdmin($instId, $idespA) {
        $sql = "
            SELECT 
                c.idcepaA,
                c.idespA,
                c.CepaNombreA,
                c.Habilitado
            FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
            WHERE c.idespA = ?
              AND e.IdInstitucion = ?
            ORDER BY c.CepaNombreA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idespA, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Subespecies de una especie para la institución (p. ej. ficha de sujeto en alojamiento). */
    public function listSubespeciesByEspecieInst(int $instId, int $idespA): array {
        $stmt = $this->db->prepare("
            SELECT s.idsubespA, s.SubEspeNombreA, s.Existe
            FROM subespecie s
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE s.idespA = ? AND e.IdInstitucion = ?
            ORDER BY s.SubEspeNombreA ASC
        ");
        $stmt->execute([$idespA, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** Guarda cepa asociada a especie (idespA). Valida que la especie sea de la instituci?n. */
    public function saveCepaByEspecie($instId, $idespA, $nombre) {
        $nombre = trim((string)$nombre);
        if ($nombre === '') {
            throw new \Exception("Nombre de cepa inv?lido.");
        }
        $idespA = (int)$idespA;
        $stmt = $this->db->prepare("SELECT idespA FROM especiee WHERE idespA = ? AND IdInstitucion = ?");
        $stmt->execute([$idespA, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("La especie no pertenece a esta instituci?n.");
        }
        $sql = "INSERT INTO cepa (idespA, CepaNombreA, Habilitado) VALUES (?, ?, 1)";
        $res = $this->db->prepare($sql)->execute([$idespA, $nombre]);
        Auditoria::log($this->db, 'INSERT', 'cepa', "Agreg? cepa: $nombre (idespA=$idespA)");
        return $res;
    }

    /** Legado: guarda cepa a partir de idsubespA (resuelve idespA internamente). */
    public function saveCepa($instId, $idSubespA, $nombre) {
        $nombre = trim((string)$nombre);
        if ($nombre === '') {
            throw new \Exception("Nombre de cepa inv?lido.");
        }
        $stmt = $this->db->prepare("
            SELECT s.idsubespA, s.idespA
            FROM subespecie s
            INNER JOIN especiee e ON s.idespA = e.idespA
            WHERE s.idsubespA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idSubespA, $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \Exception("La categor?a no pertenece a esta instituci?n.");
        }
        $idespA = (int)$row['idespA'];
        return $this->saveCepaByEspecie($instId, $idespA, $nombre);
    }

    public function toggleCepa($instId, $idCepa, $status) {
        $status = (int)$status;
        if (!in_array($status, [0, 1, 2], true)) {
            // Aceptamos 0/1 (y 2 si quisieran un estado legacy)
            $status = $status ? 1 : 0;
        }

        // Validar pertenencia a la instituci?n via JOIN (cepa -> especiee)
        $stmt = $this->db->prepare("
            SELECT c.idcepaA
            FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
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

    /** Actualiza el nombre de una cepa. Valida instituci?n. */
    public function updateCepa($instId, $idcepaA, $nombre) {
        $nombre = trim((string)$nombre);
        if ($nombre === '') {
            throw new \Exception("Nombre de cepa inv?lido.");
        }
        $stmt = $this->db->prepare("
            SELECT c.idcepaA FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
            WHERE c.idcepaA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idcepaA, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("Cepa no encontrada o no pertenece a esta instituci?n.");
        }
        $sql = "UPDATE cepa SET CepaNombreA = ? WHERE idcepaA = ?";
        $res = $this->db->prepare($sql)->execute([$nombre, $idcepaA]);
        Auditoria::log($this->db, 'UPDATE', 'cepa', "Modific? nombre cepa ID: $idcepaA");
        return $res;
    }

    /** Elimina cepa solo si no est? asignada en ning?n formulario. */
    public function deleteCepa($instId, $idcepaA) {
        $stmt = $this->db->prepare("
            SELECT c.idcepaA FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
            WHERE c.idcepaA = ? AND e.IdInstitucion = ?
        ");
        $stmt->execute([$idcepaA, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            throw new \Exception("Cepa no encontrada o no pertenece a esta instituci?n.");
        }
        $stmtUse = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE idcepaA = ?");
        $stmtUse->execute([$idcepaA]);
        if ((int)$stmtUse->fetchColumn() > 0) {
            throw new \Exception("No se puede eliminar: hay formularios que ya tienen esta cepa asignada.");
        }
        $this->db->prepare("DELETE FROM cepa WHERE idcepaA = ?")->execute([$idcepaA]);
        Auditoria::log($this->db, 'DELETE', 'cepa', "Elimin? cepa ID: $idcepaA");
        return true;
    }
}