<?php
namespace App\Models\AdminConfig;

use PDO;
use Exception;
use App\Models\Alojamiento\TrazabilidadModel;
use App\Utils\Auditoria; // <-- IMPORTANTE

class AdminConfigAlojamientoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /** Columnas `tipoalojamiento` — `docs/database.sql`. */
    private function sqlSelectTipoalojamientoAllColumns(): string {
        return 'IdTipoAlojamiento, NombreTipoAlojamiento, DetalleTipoAlojamiento, idespA, PrecioXunidad, Habilitado';
    }

    /** Columnas `categoriadatosunidadalojamiento` — `docs/database.sql` (mismo contrato que `TrazabilidadModel`). */
    private function sqlSelectCategoriaDatosUnidadAlojamientoColumns(string $alias = 'c'): string {
        $p = $alias . '.';

        return $p . 'IdDatosUnidadAloj, ' . $p . 'NombreCatAlojUnidad, ' . $p . 'DetalleCatAloj, ' . $p . 'IdEspA, '
            . $p . 'idprotA, ' . $p . 'alcance_traz, ' . $p . 'TipoDeDato, ' . $p . 'dependencia_id, ' . $p . 'Habilitado';
    }

    public function getTypes($espId) {
        $cols = $this->sqlSelectTipoalojamientoAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM tipoalojamiento WHERE idespA = ? ORDER BY NombreTipoAlojamiento ASC");
        $stmt->execute([$espId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function assertEspecieEnInstitucion(int $espId, int $instId): void {
        $stmt = $this->db->prepare('SELECT 1 FROM especiee WHERE idespA = ? AND IdInstitucion = ? LIMIT 1');
        $stmt->execute([$espId, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new Exception('Especie no encontrada en su institución.');
        }
    }

    public function listProtocolosPorEspecieInst(int $instId, int $espId): array {
        $stmt = $this->db->prepare(
            'SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA
             FROM protocoloexpe p
             INNER JOIN protesper pe ON pe.idprotA = p.idprotA AND pe.idespA = ?
             WHERE p.IdInstitucion = ?
             ORDER BY p.nprotA ASC'
        );
        $stmt->execute([$espId, $instId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array{categories_datos: array, categories_inicio: array}
     */
    public function getCategoriesBundlePorProtocolo(int $espId, ?int $protId): array {
        $tm = new TrazabilidadModel($this->db);

        return [
            'categories_datos' => $tm->listCategoriasTrazPorContexto($espId, $protId, TrazabilidadModel::TRAZ_ALCANCE_DATOS),
            'categories_inicio' => $tm->listCategoriasTrazPorContexto($espId, $protId, TrazabilidadModel::TRAZ_ALCANCE_INICIO),
        ];
    }

    private function normCatKey(string $nombre, string $tipo): string {
        $n = function_exists('mb_strtolower') ? mb_strtolower(trim($nombre), 'UTF-8') : strtolower(trim($nombre));
        $t = strtolower(trim($tipo));

        return $n . '|' . $t;
    }

    /**
     * Si ya existe una categoría equivalente en el contexto destino (misma especie, alcance y reglas de protocolo).
     */
    private function findExistingCategoriaDup(int $espId, ?int $protId, string $alcance, string $nombre, string $tipo): ?int {
        $tm = new TrazabilidadModel($this->db);
        $want = $this->normCatKey($nombre, $tipo);
        foreach ($tm->listCategoriasTrazPorContexto($espId, $protId, $alcance) as $row) {
            if ($this->normCatKey((string)($row['NombreCatAlojUnidad'] ?? ''), (string)($row['TipoDeDato'] ?? '')) === $want) {
                return (int)$row['IdDatosUnidadAloj'];
            }
        }

        return null;
    }

    /**
     * Variables de trazabilidad ya definidas para la especie en la institución (cualquier protocolo),
     * deduplicadas por nombre+tipo y excluyendo las que ya existen en el contexto destino (especie + protocolo traz. + alcance).
     *
     * @return list<array<string,mixed>>
     */
    public function listPoolCategoriasParaTraer(int $instId, int $espId, string $alcance, ?int $destProtId): array {
        $alc = $alcance === TrazabilidadModel::TRAZ_ALCANCE_INICIO ? TrazabilidadModel::TRAZ_ALCANCE_INICIO : TrazabilidadModel::TRAZ_ALCANCE_DATOS;
        $this->assertEspecieEnInstitucion($espId, $instId);
        if ($destProtId !== null && $destProtId > 0) {
            $st = $this->db->prepare(
                'SELECT 1 FROM protocoloexpe p
                 INNER JOIN protesper pe ON pe.idprotA = p.idprotA AND pe.idespA = ?
                 WHERE p.idprotA = ? AND p.IdInstitucion = ? LIMIT 1'
            );
            $st->execute([$espId, $destProtId, $instId]);
            if (!$st->fetchColumn()) {
                throw new Exception('El protocolo no pertenece a su institución o no incluye esta especie.');
            }
        }

        $stmt = $this->db->prepare(
            'SELECT c.IdDatosUnidadAloj, c.NombreCatAlojUnidad, c.TipoDeDato, c.DetalleCatAloj, c.idprotA
             FROM categoriadatosunidadalojamiento c
             INNER JOIN especiee e ON e.idespA = c.IdEspA
             WHERE e.IdInstitucion = ? AND c.IdEspA = ? AND c.alcance_traz = ? AND c.Habilitado != 2
             ORDER BY c.NombreCatAlojUnidad ASC, c.IdDatosUnidadAloj ASC'
        );
        $stmt->execute([$instId, $espId, $alc]);
        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $seenPool = [];
        $deduped = [];
        foreach ($raw as $row) {
            $nk = $this->normCatKey((string)($row['NombreCatAlojUnidad'] ?? ''), (string)($row['TipoDeDato'] ?? ''));
            if (isset($seenPool[$nk])) {
                continue;
            }
            $seenPool[$nk] = true;
            $deduped[] = $row;
        }

        $out = [];
        foreach ($deduped as $row) {
            if ($this->findExistingCategoriaDup($espId, $destProtId, $alc, (string)$row['NombreCatAlojUnidad'], (string)$row['TipoDeDato'])) {
                continue;
            }
            $out[] = $row;
        }

        return $out;
    }

    /**
     * Copia definiciones de categorías (misma estructura de tipos y dependencias internas al conjunto seleccionado).
     *
     * @param list<int> $sourceIds
     * @return array{nuevos: int, omitidos: int}
     */
    public function cloneCategoriasTraz(int $instId, int $destEspId, ?int $destProtId, string $destAlcance, array $sourceIds): array {
        $destAlcance = $destAlcance === TrazabilidadModel::TRAZ_ALCANCE_INICIO ? TrazabilidadModel::TRAZ_ALCANCE_INICIO : TrazabilidadModel::TRAZ_ALCANCE_DATOS;
        $this->assertEspecieEnInstitucion($destEspId, $instId);
        if ($destProtId !== null && $destProtId > 0) {
            $st = $this->db->prepare(
                'SELECT 1 FROM protocoloexpe p
                 INNER JOIN protesper pe ON pe.idprotA = p.idprotA AND pe.idespA = ?
                 WHERE p.idprotA = ? AND p.IdInstitucion = ? LIMIT 1'
            );
            $st->execute([$destEspId, $destProtId, $instId]);
            if (!$st->fetchColumn()) {
                throw new Exception('El protocolo no pertenece a su institución o no incluye esta especie.');
            }
        }

        $ids = array_values(array_unique(array_map('intval', $sourceIds)));
        $ids = array_values(array_filter($ids, static fn ($x) => $x > 0));
        if (!$ids) {
            throw new Exception('No se indicaron variables de origen.');
        }
        $in = implode(',', array_fill(0, count($ids), '?'));
        $params = array_merge($ids, [$instId]);
        $catCols = $this->sqlSelectCategoriaDatosUnidadAlojamientoColumns('c');
        $sql = "SELECT {$catCols} FROM categoriadatosunidadalojamiento c
                INNER JOIN especiee e ON e.idespA = c.IdEspA
                WHERE c.IdDatosUnidadAloj IN ($in) AND e.IdInstitucion = ?
                ORDER BY c.IdDatosUnidadAloj ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if (!$rows) {
            throw new Exception('No se encontraron variables de origen válidas.');
        }

        $idMap = [];
        $nuevos = 0;
        $omitidos = 0;
        $insertedIds = [];
        $localNormToNewId = [];

        $this->db->beginTransaction();
        try {
            $ins = $this->db->prepare(
                'INSERT INTO categoriadatosunidadalojamiento
                (NombreCatAlojUnidad, DetalleCatAloj, IdEspA, idprotA, alcance_traz, TipoDeDato, dependencia_id, Habilitado)
                VALUES (?, ?, ?, ?, ?, ?, NULL, 1)'
            );
            foreach ($rows as $r) {
                $oldId = (int)$r['IdDatosUnidadAloj'];
                $nk = $this->normCatKey((string)$r['NombreCatAlojUnidad'], (string)$r['TipoDeDato']);
                $exist = $this->findExistingCategoriaDup(
                    $destEspId,
                    $destProtId,
                    $destAlcance,
                    (string)$r['NombreCatAlojUnidad'],
                    (string)$r['TipoDeDato']
                );
                if ($exist) {
                    $idMap[$oldId] = $exist;
                    ++$omitidos;
                    continue;
                }
                if (isset($localNormToNewId[$nk])) {
                    $idMap[$oldId] = $localNormToNewId[$nk];
                    ++$omitidos;
                    continue;
                }
                $ins->execute([
                    $r['NombreCatAlojUnidad'],
                    $r['DetalleCatAloj'] ?? null,
                    $destEspId,
                    $destProtId,
                    $destAlcance,
                    $r['TipoDeDato'],
                ]);
                $newId = (int)$this->db->lastInsertId();
                $idMap[$oldId] = $newId;
                $localNormToNewId[$nk] = $newId;
                $insertedIds[$newId] = true;
                ++$nuevos;
            }
            $upd = $this->db->prepare('UPDATE categoriadatosunidadalojamiento SET dependencia_id = ? WHERE IdDatosUnidadAloj = ?');
            foreach ($rows as $r) {
                $oldId = (int)$r['IdDatosUnidadAloj'];
                $newId = $idMap[$oldId] ?? null;
                if (!$newId || empty($insertedIds[$newId])) {
                    continue;
                }
                $depOld = isset($r['dependencia_id']) && $r['dependencia_id'] !== null && $r['dependencia_id'] !== ''
                    ? (int)$r['dependencia_id'] : null;
                if ($depOld && isset($idMap[$depOld], $idMap[$oldId])) {
                    $upd->execute([$idMap[$depOld], $idMap[$oldId]]);
                }
            }
            $this->db->commit();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        return ['nuevos' => $nuevos, 'omitidos' => $omitidos];
    }

    public function saveType($data) {
        if(empty($data['IdTipoAlojamiento'])) {
            $sql = "INSERT INTO tipoalojamiento (NombreTipoAlojamiento, DetalleTipoAlojamiento, idespA, Habilitado) VALUES (?, ?, ?, 1)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreTipoAlojamiento'], $data['DetalleTipoAlojamiento'], $data['idespA']]);
            
            Auditoria::log($this->db, 'INSERT', 'tipoalojamiento', "Creó tipo de alojamiento: " . $data['NombreTipoAlojamiento']);
        } else {
            $hab = $data['Habilitado'] ?? 1;
            $sql = "UPDATE tipoalojamiento SET NombreTipoAlojamiento = ?, DetalleTipoAlojamiento = ?, Habilitado = ? WHERE IdTipoAlojamiento = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreTipoAlojamiento'], $data['DetalleTipoAlojamiento'], $hab, $data['IdTipoAlojamiento']]);
            
            Auditoria::log($this->db, 'UPDATE', 'tipoalojamiento', "Modificó tipo de alojamiento ID: " . $data['IdTipoAlojamiento']);
        }
    }

    public function toggleType($id, $status) {
        $stmt = $this->db->prepare("UPDATE tipoalojamiento SET Habilitado = ? WHERE IdTipoAlojamiento = ?");
        $stmt->execute([$status, $id]);
        
        Auditoria::log($this->db, 'UPDATE', 'tipoalojamiento', "Cambió estado a $status del tipo alojamiento ID: $id");
    }

    public function deleteType($id) {
        $stmtCheck = $this->db->prepare("SELECT COUNT(*) FROM alojamiento WHERE IdTipoAlojamiento = ?");
        $stmtCheck->execute([$id]);
        if($stmtCheck->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar: Este tipo se usa en alojamientos existentes.");
        }
        $stmt = $this->db->prepare("DELETE FROM tipoalojamiento WHERE IdTipoAlojamiento = ?");
        $stmt->execute([$id]);
        
        Auditoria::log($this->db, 'DELETE', 'tipoalojamiento', "Eliminó tipo de alojamiento ID: $id");
    }

    public function saveCategory($data) {
        $dep = !empty($data['dependencia_id']) ? $data['dependencia_id'] : null;

        $idProt = null;
        if (array_key_exists('idprotA', $data)) {
            $rawProt = $data['idprotA'];
            $idProt = ($rawProt === null || $rawProt === '' || $rawProt === false) ? null : (int)$rawProt;
        }
        $alcance = ($data['alcance_traz'] ?? 'datos') === TrazabilidadModel::TRAZ_ALCANCE_INICIO
            ? TrazabilidadModel::TRAZ_ALCANCE_INICIO : TrazabilidadModel::TRAZ_ALCANCE_DATOS;

        if (empty($data['IdDatosUnidadAloj'])) {
            $sql = 'INSERT INTO categoriadatosunidadalojamiento (NombreCatAlojUnidad, DetalleCatAloj, IdEspA, idprotA, alcance_traz, TipoDeDato, dependencia_id, Habilitado) VALUES (?, ?, ?, ?, ?, ?, ?, 1)';
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreCatAlojUnidad'], $data['DetalleCatAloj'], $data['IdEspA'], $idProt, $alcance, $data['TipoDeDato'], $dep]);

            Auditoria::log($this->db, 'INSERT', 'categoriadatosunidadalojamiento', "Creó categoría clínica: " . $data['NombreCatAlojUnidad']);
        } else {
            $hab = $data['Habilitado'] ?? 1;
            if (array_key_exists('idprotA', $data)) {
                $sql = 'UPDATE categoriadatosunidadalojamiento SET NombreCatAlojUnidad = ?, DetalleCatAloj = ?, idprotA = ?, alcance_traz = ?, TipoDeDato = ?, dependencia_id = ?, Habilitado = ? WHERE IdDatosUnidadAloj = ?';
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$data['NombreCatAlojUnidad'], $data['DetalleCatAloj'], $idProt, $alcance, $data['TipoDeDato'], $dep, $hab, $data['IdDatosUnidadAloj']]);
            } else {
                $sql = 'UPDATE categoriadatosunidadalojamiento SET NombreCatAlojUnidad = ?, DetalleCatAloj = ?, alcance_traz = ?, TipoDeDato = ?, dependencia_id = ?, Habilitado = ? WHERE IdDatosUnidadAloj = ?';
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$data['NombreCatAlojUnidad'], $data['DetalleCatAloj'], $alcance, $data['TipoDeDato'], $dep, $hab, $data['IdDatosUnidadAloj']]);
            }

            Auditoria::log($this->db, 'UPDATE', 'categoriadatosunidadalojamiento', "Modificó categoría clínica ID: " . $data['IdDatosUnidadAloj']);
        }
    }

    public function toggleCategory($id, $status) {
        $stmt = $this->db->prepare("UPDATE categoriadatosunidadalojamiento SET Habilitado = ? WHERE IdDatosUnidadAloj = ?");
        $stmt->execute([$status, $id]);
        
        Auditoria::log($this->db, 'UPDATE', 'categoriadatosunidadalojamiento', "Cambió estado a $status de la categoría ID: $id");
    }

    public function deleteCategory($id) {
        $stmtCheck = $this->db->prepare("SELECT COUNT(*) FROM observacion_alojamiento_unidad WHERE IdDatosUnidadAloj = ?");
        $stmtCheck->execute([$id]);
        if($stmtCheck->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar: Esta variable tiene datos registrados en animales.");
        }
        $stmt = $this->db->prepare("DELETE FROM categoriadatosunidadalojamiento WHERE IdDatosUnidadAloj = ?");
        $stmt->execute([$id]);
        
        Auditoria::log($this->db, 'DELETE', 'categoriadatosunidadalojamiento', "Eliminó categoría clínica ID: $id");
    }
}