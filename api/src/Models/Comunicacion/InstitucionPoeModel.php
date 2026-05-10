<?php
namespace App\Models\Comunicacion;

use App\Utils\ComunicacionArchivoValidacion;
use PDO;

class InstitucionPoeModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * @return mixed string|null|false — false si URL inválida
     */
    private function normalizeOptionalUrl($raw) {
        if ($raw === null) {
            return null;
        }
        $s = trim((string)$raw);
        if ($s === '') {
            return null;
        }
        if (strlen($s) > 768) {
            return false;
        }
        if (!preg_match('#^https?://#i', $s)) {
            return false;
        }

        return $s;
    }

    private function normalizeNombre(?string $raw): ?string {
        if ($raw === null) {
            return null;
        }
        $s = trim(strip_tags((string)$raw));
        if ($s === '') {
            return null;
        }
        if (function_exists('mb_substr')) {
            return mb_substr($s, 0, 255, 'UTF-8');
        }

        return substr($s, 0, 255);
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed>|null $existingRow
     * @return array{ok:bool,data?:array,message?:string}
     */
    public function validatePayload(array $payload, bool $isCreate, int $instId, ?array $existingRow = null): array {
        $titulo = isset($payload['Titulo']) ? trim(strip_tags((string)$payload['Titulo'])) : '';
        if ($isCreate && $titulo === '') {
            return ['ok' => false, 'message' => 'El título es obligatorio.'];
        }
        if (!$isCreate && array_key_exists('Titulo', $payload)) {
            if ($titulo === '') {
                return ['ok' => false, 'message' => 'El título no puede quedar vacío.'];
            }
        }
        if ($titulo !== '') {
            $titulo = function_exists('mb_substr') ? mb_substr($titulo, 0, 255, 'UTF-8') : substr($titulo, 0, 255);
        }

        $resena = isset($payload['Resena']) ? trim(strip_tags((string)$payload['Resena'])) : '';
        $resena = $resena === '' ? null : $resena;
        if ($resena !== null && function_exists('mb_substr')) {
            $resena = mb_substr($resena, 0, 4000, 'UTF-8');
        }

        $cuerpo = isset($payload['Cuerpo']) ? trim(strip_tags((string)$payload['Cuerpo'])) : '';
        $cuerpo = $cuerpo === '' ? null : $cuerpo;

        if (array_key_exists('Adjunto1B2Key', $payload)) {
            $t = trim((string) $payload['Adjunto1B2Key']);
            $b1 = $t === '' ? null : $t;
        } elseif (!$isCreate && $existingRow !== null) {
            $t = isset($existingRow['Adjunto1B2Key']) ? trim((string) $existingRow['Adjunto1B2Key']) : '';
            $b1 = $t === '' ? null : $t;
        } else {
            $b1 = null;
        }

        if (array_key_exists('Adjunto2B2Key', $payload)) {
            $t = trim((string) $payload['Adjunto2B2Key']);
            $b2 = $t === '' ? null : $t;
        } elseif (!$isCreate && $existingRow !== null) {
            $t = isset($existingRow['Adjunto2B2Key']) ? trim((string) $existingRow['Adjunto2B2Key']) : '';
            $b2 = $t === '' ? null : $t;
        } else {
            $b2 = null;
        }

        $u1 = $this->normalizeOptionalUrl($payload['UrlAdjunto1'] ?? null);
        if ($u1 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 1 no es válida (use http/https, máx. 768 caracteres).'];
        }
        $n1 = $this->normalizeNombre(isset($payload['NombreAdjunto1']) ? (string)$payload['NombreAdjunto1'] : null);
        $u2 = $this->normalizeOptionalUrl($payload['UrlAdjunto2'] ?? null);
        if ($u2 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 2 no es válida.'];
        }
        $n2 = $this->normalizeNombre(isset($payload['NombreAdjunto2']) ? (string)$payload['NombreAdjunto2'] : null);

        if ($b1 !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($b1, 'poe/doc', $instId)) {
                return ['ok' => false, 'message' => 'Archivo instructivo 1: clave B2 no válida para esta sede.'];
            }
            $u1 = null;
        }
        if ($b2 !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($b2, 'poe/doc', $instId)) {
                return ['ok' => false, 'message' => 'Archivo instructivo 2: clave B2 no válida para esta sede.'];
            }
            $u2 = null;
        }

        if (array_key_exists('UrlAdjunto1', $payload) && $u1 !== null && !array_key_exists('Adjunto1B2Key', $payload)) {
            $b1 = null;
        }
        if (array_key_exists('UrlAdjunto2', $payload) && $u2 !== null && !array_key_exists('Adjunto2B2Key', $payload)) {
            $b2 = null;
        }

        if (($u2 !== null || $b2 !== null || $n2 !== null) && ($u1 === null && $b1 === null)) {
            return ['ok' => false, 'message' => 'Si indica un segundo adjunto, el primero debe estar definido (URL o archivo subido).'];
        }

        $orden = isset($payload['Orden']) ? (int)$payload['Orden'] : 0;
        $activo = !empty($payload['Activo']) ? 1 : 0;

        $data = [
            'Titulo' => $titulo === '' ? null : $titulo,
            'Resena' => $resena,
            'Cuerpo' => $cuerpo,
            'UrlAdjunto1' => $u1,
            'NombreAdjunto1' => $n1,
            'UrlAdjunto2' => $u2,
            'NombreAdjunto2' => $n2,
            'Adjunto1B2Key' => $b1,
            'Adjunto2B2Key' => $b2,
            'Orden' => $orden,
            'Activo' => $activo,
        ];

        return ['ok' => true, 'data' => $data];
    }

    /** Todas las columnas de `institucion_poe` (sin wildcard). */
    private function sqlSelectInstitucionPoeAllColumns(?string $alias = null): string {
        $p = $alias !== null && $alias !== '' ? $alias . '.' : '';
        return "{$p}IdPoe, {$p}IdInstitucion, {$p}Titulo, {$p}Resena, {$p}Cuerpo, "
            . "{$p}Adjunto1B2Key, {$p}Adjunto2B2Key, "
            . "{$p}UrlAdjunto1, {$p}NombreAdjunto1, {$p}UrlAdjunto2, {$p}NombreAdjunto2, "
            . "{$p}Orden, {$p}Activo, {$p}FechaCreacion, {$p}FechaActualizacion";
    }

    /** @return list<array<string,mixed>> */
    public function listPublicActive(int $instId): array {
        $sql = 'SELECT IdPoe, Titulo, Resena, Orden, FechaActualizacion
                FROM institucion_poe
                WHERE IdInstitucion = ? AND Activo = 1
                ORDER BY Orden ASC, IdPoe DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @return array<string,mixed>|null */
    public function getPublicById(int $instId, int $id): ?array {
        $cols = $this->sqlSelectInstitucionPoeAllColumns();
        $stmt = $this->db->prepare(
            "SELECT {$cols} FROM institucion_poe WHERE IdInstitucion = ? AND IdPoe = ? AND Activo = 1 LIMIT 1"
        );
        $stmt->execute([$instId, $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function countAdmin(int $instId): int {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM institucion_poe WHERE IdInstitucion = ?');
        $stmt->execute([$instId]);

        return (int)$stmt->fetchColumn();
    }

    /**
     * @return array{rows:list<array<string,mixed>>,total:int}
     */
    public function listAdmin(int $instId, int $page, int $pageSize): array {
        $total = $this->countAdmin($instId);
        $off = max(0, ($page - 1) * $pageSize);
        $sql = 'SELECT IdPoe, Titulo, Resena, Orden, Activo, FechaCreacion, FechaActualizacion,
                       Adjunto1B2Key, Adjunto2B2Key,
                       UrlAdjunto1, NombreAdjunto1, UrlAdjunto2, NombreAdjunto2
                FROM institucion_poe
                WHERE IdInstitucion = ?
                ORDER BY Orden ASC, IdPoe DESC
                LIMIT ' . (int)$pageSize . ' OFFSET ' . (int)$off;
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return ['rows' => $rows, 'total' => $total];
    }

    /** @return array<string,mixed>|null */
    public function getByIdAdmin(int $instId, int $id): ?array {
        $cols = $this->sqlSelectInstitucionPoeAllColumns();
        $stmt = $this->db->prepare(
            "SELECT {$cols} FROM institucion_poe WHERE IdInstitucion = ? AND IdPoe = ? LIMIT 1"
        );
        $stmt->execute([$instId, $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** @param array<string,mixed> $data normalized */
    public function insert(int $instId, array $data): int {
        $sql = 'INSERT INTO institucion_poe (
            IdInstitucion, Titulo, Resena, Cuerpo,
            Adjunto1B2Key, Adjunto2B2Key,
            UrlAdjunto1, NombreAdjunto1, UrlAdjunto2, NombreAdjunto2,
            Orden, Activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $instId,
            $data['Titulo'],
            $data['Resena'],
            $data['Cuerpo'],
            $data['Adjunto1B2Key'] ?? null,
            $data['Adjunto2B2Key'] ?? null,
            $data['UrlAdjunto1'],
            $data['NombreAdjunto1'],
            $data['UrlAdjunto2'],
            $data['NombreAdjunto2'],
            $data['Orden'],
            $data['Activo'],
        ]);

        return (int)$this->db->lastInsertId();
    }

    /** @param array<string,mixed> $data normalized */
    public function update(int $instId, int $id, array $data): bool {
        $sql = 'UPDATE institucion_poe SET
            Titulo = ?, Resena = ?, Cuerpo = ?,
            Adjunto1B2Key = ?, Adjunto2B2Key = ?,
            UrlAdjunto1 = ?, NombreAdjunto1 = ?, UrlAdjunto2 = ?, NombreAdjunto2 = ?,
            Orden = ?, Activo = ?
            WHERE IdInstitucion = ? AND IdPoe = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['Titulo'],
            $data['Resena'],
            $data['Cuerpo'],
            $data['Adjunto1B2Key'] ?? null,
            $data['Adjunto2B2Key'] ?? null,
            $data['UrlAdjunto1'],
            $data['NombreAdjunto1'],
            $data['UrlAdjunto2'],
            $data['NombreAdjunto2'],
            $data['Orden'],
            $data['Activo'],
            $instId,
            $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function deleteHard(int $instId, int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM institucion_poe WHERE IdInstitucion = ? AND IdPoe = ?');
        $stmt->execute([$instId, $id]);

        return $stmt->rowCount() > 0;
    }
}
