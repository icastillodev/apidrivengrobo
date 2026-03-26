<?php
namespace App\Models\Alojamiento;

use PDO;
use App\Utils\Auditoria;

/**
 * Configuración y catálogos de ubicación física para cajas de alojamiento (por institución).
 * Requiere tablas del script: sql/alojamiento_ubicacion_cajas.sql
 */
class AlojamientoUbicacionModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function ensureConfigRow(int $instId): void {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO aloj_config_ubicacion (IdInstitucion, LabelLugarFisico, LabelSalon, LabelRack, LabelLugarRack, LabelComentarioUbicacion)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$instId, 'Lugar físico', 'Salón / sala', 'Rack', 'Posición en rack', 'Comentario de ubicación']);
    }

    public function getConfigLabels(int $instId): array {
        $this->ensureConfigRow($instId);
        $stmt = $this->db->prepare('SELECT * FROM aloj_config_ubicacion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: [];
    }

    public function saveConfigLabels(int $instId, array $data): void {
        $this->ensureConfigRow($instId);
        $sql = 'UPDATE aloj_config_ubicacion SET
            LabelLugarFisico = ?, LabelSalon = ?, LabelRack = ?, LabelLugarRack = ?, LabelComentarioUbicacion = ?
            WHERE IdInstitucion = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['LabelLugarFisico'] ?? 'Lugar físico',
            $data['LabelSalon'] ?? 'Salón / sala',
            $data['LabelRack'] ?? 'Rack',
            $data['LabelLugarRack'] ?? 'Posición en rack',
            $data['LabelComentarioUbicacion'] ?? 'Comentario de ubicación',
            $instId
        ]);
        Auditoria::log($this->db, 'UPDATE', 'aloj_config_ubicacion', "Etiquetas ubicación cajas inst=$instId");
    }

    public function listUbicacionesFisicas(int $instId, bool $soloActivos = false): array {
        $sql = 'SELECT * FROM aloj_ubicacion_fisica WHERE IdInstitucion = ?';
        if ($soloActivos) {
            $sql .= ' AND Activo = 1';
        }
        $sql .= ' ORDER BY Orden ASC, Nombre ASC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listSalones(int $instId, ?int $idUbicacionFisica = null, bool $soloActivos = false): array {
        $sql = 'SELECT * FROM aloj_salon WHERE IdInstitucion = ?';
        $params = [$instId];
        if ($idUbicacionFisica !== null) {
            $sql .= ' AND (IdUbicacionFisica IS NULL OR IdUbicacionFisica = ?)';
            $params[] = $idUbicacionFisica;
        }
        if ($soloActivos) {
            $sql .= ' AND Activo = 1';
        }
        $sql .= ' ORDER BY Orden ASC, Nombre ASC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listRacks(int $instId, ?int $idSalon = null, bool $soloActivos = false): array {
        $sql = 'SELECT * FROM aloj_rack WHERE IdInstitucion = ?';
        $params = [$instId];
        if ($idSalon !== null) {
            $sql .= ' AND (IdSalon IS NULL OR IdSalon = ?)';
            $params[] = $idSalon;
        }
        if ($soloActivos) {
            $sql .= ' AND Activo = 1';
        }
        $sql .= ' ORDER BY Orden ASC, Nombre ASC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listLugaresRackByInstitucion(int $instId, bool $soloActivos = false): array {
        $sql = 'SELECT lr.*, r.IdInstitucion, r.IdSalon, r.Nombre AS NombreRack
                FROM aloj_lugar_rack lr
                INNER JOIN aloj_rack r ON lr.IdRack = r.IdRack
                WHERE r.IdInstitucion = ?';
        if ($soloActivos) {
            $sql .= ' AND lr.Activo = 1 AND r.Activo = 1';
        }
        $sql .= ' ORDER BY r.Orden ASC, lr.Orden ASC, lr.Nombre ASC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function saveUbicacionFisica(int $instId, array $d): int {
        $nombre = trim((string)($d['Nombre'] ?? ''));
        if ($nombre === '') {
            throw new \InvalidArgumentException('Nombre requerido.');
        }
        $orden = (int)($d['Orden'] ?? 0);
        $activo = isset($d['Activo']) ? (int)(bool)$d['Activo'] : 1;

        if (!empty($d['IdUbicacionFisica'])) {
            $this->assertUbicacionFisicaInst((int)$d['IdUbicacionFisica'], $instId);
            $stmt = $this->db->prepare('UPDATE aloj_ubicacion_fisica SET Nombre = ?, Orden = ?, Activo = ? WHERE IdUbicacionFisica = ?');
            $stmt->execute([$nombre, $orden, $activo, (int)$d['IdUbicacionFisica']]);
            Auditoria::log($this->db, 'UPDATE', 'aloj_ubicacion_fisica', 'Id=' . (int)$d['IdUbicacionFisica']);
            return (int)$d['IdUbicacionFisica'];
        }
        $stmt = $this->db->prepare('INSERT INTO aloj_ubicacion_fisica (IdInstitucion, Nombre, Orden, Activo) VALUES (?, ?, ?, ?)');
        $stmt->execute([$instId, $nombre, $orden, $activo]);
        $id = (int)$this->db->lastInsertId();
        Auditoria::log($this->db, 'INSERT', 'aloj_ubicacion_fisica', "Id=$id inst=$instId");
        return $id;
    }

    public function saveSalon(int $instId, array $d): int {
        $nombre = trim((string)($d['Nombre'] ?? ''));
        if ($nombre === '') {
            throw new \InvalidArgumentException('Nombre requerido.');
        }
        $idUf = isset($d['IdUbicacionFisica']) && $d['IdUbicacionFisica'] !== '' ? (int)$d['IdUbicacionFisica'] : null;
        if ($idUf !== null) {
            $this->assertUbicacionFisicaInst($idUf, $instId);
        }
        $orden = (int)($d['Orden'] ?? 0);
        $activo = isset($d['Activo']) ? (int)(bool)$d['Activo'] : 1;

        if (!empty($d['IdSalon'])) {
            $this->assertSalonInst((int)$d['IdSalon'], $instId);
            $stmt = $this->db->prepare('UPDATE aloj_salon SET Nombre = ?, IdUbicacionFisica = ?, Orden = ?, Activo = ? WHERE IdSalon = ?');
            $stmt->execute([$nombre, $idUf, $orden, $activo, (int)$d['IdSalon']]);
            Auditoria::log($this->db, 'UPDATE', 'aloj_salon', 'Id=' . (int)$d['IdSalon']);
            return (int)$d['IdSalon'];
        }
        $stmt = $this->db->prepare('INSERT INTO aloj_salon (IdInstitucion, IdUbicacionFisica, Nombre, Orden, Activo) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$instId, $idUf, $nombre, $orden, $activo]);
        $id = (int)$this->db->lastInsertId();
        Auditoria::log($this->db, 'INSERT', 'aloj_salon', "Id=$id inst=$instId");
        return $id;
    }

    public function saveRack(int $instId, array $d): int {
        $nombre = trim((string)($d['Nombre'] ?? ''));
        if ($nombre === '') {
            throw new \InvalidArgumentException('Nombre requerido.');
        }
        $idSalon = isset($d['IdSalon']) && $d['IdSalon'] !== '' ? (int)$d['IdSalon'] : null;
        if ($idSalon !== null) {
            $this->assertSalonInst($idSalon, $instId);
        }
        $orden = (int)($d['Orden'] ?? 0);
        $activo = isset($d['Activo']) ? (int)(bool)$d['Activo'] : 1;

        if (!empty($d['IdRack'])) {
            $this->assertRackInst((int)$d['IdRack'], $instId);
            $stmt = $this->db->prepare('UPDATE aloj_rack SET Nombre = ?, IdSalon = ?, Orden = ?, Activo = ? WHERE IdRack = ?');
            $stmt->execute([$nombre, $idSalon, $orden, $activo, (int)$d['IdRack']]);
            Auditoria::log($this->db, 'UPDATE', 'aloj_rack', 'Id=' . (int)$d['IdRack']);
            return (int)$d['IdRack'];
        }
        $stmt = $this->db->prepare('INSERT INTO aloj_rack (IdInstitucion, IdSalon, Nombre, Orden, Activo) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$instId, $idSalon, $nombre, $orden, $activo]);
        $id = (int)$this->db->lastInsertId();
        Auditoria::log($this->db, 'INSERT', 'aloj_rack', "Id=$id inst=$instId");
        return $id;
    }

    public function saveLugarRack(int $instId, array $d): int {
        $nombre = trim((string)($d['Nombre'] ?? ''));
        if ($nombre === '') {
            throw new \InvalidArgumentException('Nombre requerido.');
        }
        $idRack = (int)($d['IdRack'] ?? 0);
        if ($idRack <= 0) {
            throw new \InvalidArgumentException('IdRack requerido.');
        }
        $this->assertRackInst($idRack, $instId);
        $orden = (int)($d['Orden'] ?? 0);
        $activo = isset($d['Activo']) ? (int)(bool)$d['Activo'] : 1;

        if (!empty($d['IdLugarRack'])) {
            $this->assertLugarRackInst((int)$d['IdLugarRack'], $instId);
            $stmt = $this->db->prepare('UPDATE aloj_lugar_rack SET Nombre = ?, Orden = ?, Activo = ? WHERE IdLugarRack = ?');
            $stmt->execute([$nombre, $orden, $activo, (int)$d['IdLugarRack']]);
            Auditoria::log($this->db, 'UPDATE', 'aloj_lugar_rack', 'Id=' . (int)$d['IdLugarRack']);
            return (int)$d['IdLugarRack'];
        }
        $stmt = $this->db->prepare('INSERT INTO aloj_lugar_rack (IdRack, Nombre, Orden, Activo) VALUES (?, ?, ?, ?)');
        $stmt->execute([$idRack, $nombre, $orden, $activo]);
        $id = (int)$this->db->lastInsertId();
        Auditoria::log($this->db, 'INSERT', 'aloj_lugar_rack', "Id=$id rack=$idRack");
        return $id;
    }

    public function toggleCatalog(string $tipo, int $id, int $activo, int $instId): void {
        $activo = $activo ? 1 : 0;
        switch ($tipo) {
            case 'uf':
                $this->assertUbicacionFisicaInst($id, $instId);
                $this->db->prepare('UPDATE aloj_ubicacion_fisica SET Activo = ? WHERE IdUbicacionFisica = ?')->execute([$activo, $id]);
                break;
            case 'salon':
                $this->assertSalonInst($id, $instId);
                $this->db->prepare('UPDATE aloj_salon SET Activo = ? WHERE IdSalon = ?')->execute([$activo, $id]);
                break;
            case 'rack':
                $this->assertRackInst($id, $instId);
                $this->db->prepare('UPDATE aloj_rack SET Activo = ? WHERE IdRack = ?')->execute([$activo, $id]);
                break;
            case 'lugar':
                $this->assertLugarRackInst($id, $instId);
                $this->db->prepare('UPDATE aloj_lugar_rack SET Activo = ? WHERE IdLugarRack = ?')->execute([$activo, $id]);
                break;
            default:
                throw new \InvalidArgumentException('tipo inválido');
        }
        Auditoria::log($this->db, 'UPDATE', 'aloj_ubicacion_cat', "toggle tipo=$tipo id=$id activo=$activo");
    }

    private function assertUbicacionFisicaInst(int $id, int $instId): void {
        $stmt = $this->db->prepare('SELECT 1 FROM aloj_ubicacion_fisica WHERE IdUbicacionFisica = ? AND IdInstitucion = ?');
        $stmt->execute([$id, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \RuntimeException('Lugar físico no encontrado o no pertenece a la institución.');
        }
    }

    private function assertSalonInst(int $id, int $instId): void {
        $stmt = $this->db->prepare('SELECT 1 FROM aloj_salon WHERE IdSalon = ? AND IdInstitucion = ?');
        $stmt->execute([$id, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \RuntimeException('Salón no encontrado o no pertenece a la institución.');
        }
    }

    private function assertRackInst(int $id, int $instId): void {
        $stmt = $this->db->prepare('SELECT 1 FROM aloj_rack WHERE IdRack = ? AND IdInstitucion = ?');
        $stmt->execute([$id, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \RuntimeException('Rack no encontrado o no pertenece a la institución.');
        }
    }

    private function assertLugarRackInst(int $id, int $instId): void {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM aloj_lugar_rack lr INNER JOIN aloj_rack r ON lr.IdRack = r.IdRack
             WHERE lr.IdLugarRack = ? AND r.IdInstitucion = ?'
        );
        $stmt->execute([$id, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \RuntimeException('Posición en rack no encontrada o no pertenece a la institución.');
        }
    }

    /**
     * Valida que los FK opcionales existan y pertenezcan a la institución; coherencia jerárquica suave.
     */
    public function assertUbicacionParaCaja(int $instId, ?int $idUf, ?int $idSalon, ?int $idRack, ?int $idLugarRack): void {
        if ($idUf !== null) {
            $this->assertUbicacionFisicaInst($idUf, $instId);
        }
        if ($idSalon !== null) {
            $this->assertSalonInst($idSalon, $instId);
            if ($idUf !== null) {
                $stmt = $this->db->prepare('SELECT IdUbicacionFisica FROM aloj_salon WHERE IdSalon = ?');
                $stmt->execute([$idSalon]);
                $ufSalon = $stmt->fetchColumn();
                if ($ufSalon !== null && (int)$ufSalon !== $idUf) {
                    throw new \RuntimeException('El salón no corresponde al lugar físico indicado.');
                }
            }
        }
        if ($idRack !== null) {
            $this->assertRackInst($idRack, $instId);
            if ($idSalon !== null) {
                $stmt = $this->db->prepare('SELECT IdSalon FROM aloj_rack WHERE IdRack = ?');
                $stmt->execute([$idRack]);
                $salonRack = $stmt->fetchColumn();
                if ($salonRack !== null && (int)$salonRack !== $idSalon) {
                    throw new \RuntimeException('El rack no corresponde al salón indicado.');
                }
            }
        }
        if ($idLugarRack !== null) {
            $this->assertLugarRackInst($idLugarRack, $instId);
            if ($idRack !== null) {
                $stmt = $this->db->prepare('SELECT IdRack FROM aloj_lugar_rack WHERE IdLugarRack = ?');
                $stmt->execute([$idLugarRack]);
                $rackLr = (int)$stmt->fetchColumn();
                if ($rackLr !== $idRack) {
                    throw new \RuntimeException('La posición en rack no corresponde al rack indicado.');
                }
            }
        }
    }

    public function getBundle(int $instId): array {
        return [
            'labels' => $this->getConfigLabels($instId),
            'ubicacionesFisicas' => $this->listUbicacionesFisicas($instId, false),
            'salones' => $this->listSalones($instId, null, false),
            'racks' => $this->listRacks($instId, null, false),
            'lugaresRack' => $this->listLugaresRackByInstitucion($instId, false),
        ];
    }
}
