<?php
namespace App\Models\Comunicacion;

use PDO;

class NoticiaModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /** Solo noticias ya visibles en portal (publicadas y fecha efectiva <= ahora). */
    private function sqlVisiblePublicas(string $alias = ''): string {
        $p = $alias !== '' ? $alias . '.' : '';
        return "{$p}Publicado = 1 AND ({$p}FechaPublicacion IS NULL OR {$p}FechaPublicacion <= NOW())";
    }

    /**
     * Fecha/hora de publicación al guardar: borrador => null; publicar => payload, existente o ahora.
     * @param string|null $fromPayload Valor enviado por el cliente (ISO o vacío).
     */
    private function resolveFechaPublicacion(?string $fromPayload, bool $publicado, ?string $existing): ?string {
        if (!$publicado) {
            return null;
        }
        $raw = $fromPayload !== null ? trim((string)$fromPayload) : '';
        if ($raw !== '') {
            $ts = strtotime($raw);
            if ($ts !== false) {
                return date('Y-m-d H:i:s', $ts);
            }
        }
        if ($existing !== null && $existing !== '') {
            return $existing;
        }
        return date('Y-m-d H:i:s');
    }

    public function getDependenciaRed(int $instId): ?string {
        $stmt = $this->db->prepare('SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $v = $stmt->fetchColumn();
        if ($v === false || $v === null || $v === '') {
            return null;
        }
        return (string)$v;
    }

    public function puedePublicarNoticias(int $instId, int $idTipousrA): bool {
        $stmt = $this->db->prepare('
            SELECT Activo FROM noticia_rol_publicar
            WHERE IdInstitucion = ? AND IdTipousrA = ? LIMIT 1
        ');
        $stmt->execute([$instId, $idTipousrA]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return false;
        }
        return (int)($row['Activo'] ?? 0) === 1;
    }

    /**
     * Listado público paginado (solo publicadas).
     * @param bool $fullCuerpoLocal Si true y alcance=local, devuelve el cuerpo completo en Cuerpo (p. ej. dashboard).
     */
    public function listPublic(int $instId, string $alcance, int $page, int $pageSize, bool $fullCuerpoLocal = false): array {
        $alcance = strtolower($alcance) === 'red' ? 'red' : 'local';
        $offset = max(0, ($page - 1) * $pageSize);

        if ($alcance === 'local') {
            $cuerpoSel = $fullCuerpoLocal
                ? 'Cuerpo AS Cuerpo'
                : 'LEFT(Cuerpo, 400) AS CuerpoResumen';
            $sql = "
                SELECT IdNoticia, IdInstitucion, Alcance, Titulo, {$cuerpoSel},
                       FechaPublicacion, FechaCreacion
                FROM noticia
                WHERE IdInstitucion = ? AND Alcance = 'local' AND " . $this->sqlVisiblePublicas() . "
                ORDER BY FechaPublicacion DESC, IdNoticia DESC
                LIMIT " . (int)$pageSize . " OFFSET " . (int)$offset;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId]);
        } else {
            // "Red" = noticias locales publicadas por otras instituciones con la misma dependencia (misma red).
            $dep = $this->getDependenciaRed($instId);
            if ($dep === null || $dep === '') {
                return ['rows' => [], 'total' => 0];
            }
            $sql = "
                SELECT n.IdNoticia, n.IdInstitucion, n.Alcance, n.Titulo, LEFT(n.Cuerpo, 400) AS CuerpoResumen,
                       n.FechaPublicacion, n.FechaCreacion, n.DependenciaRed
                FROM noticia n
                INNER JOIN institucion i ON i.IdInstitucion = n.IdInstitucion
                WHERE n.Alcance = 'local' AND " . $this->sqlVisiblePublicas('n') . "
                  AND COALESCE(n.CompartirEnRed, 1) = 1
                  AND n.IdInstitucion <> ?
                  AND i.DependenciaInstitucion = ?
                ORDER BY n.FechaPublicacion DESC, n.IdNoticia DESC
                LIMIT " . (int)$pageSize . " OFFSET " . (int)$offset;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $dep]);
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = $alcance === 'local'
            ? 'SELECT COUNT(*) FROM noticia WHERE IdInstitucion = ? AND Alcance = \'local\' AND ' . $this->sqlVisiblePublicas()
            : 'SELECT COUNT(*) FROM noticia n INNER JOIN institucion i ON i.IdInstitucion = n.IdInstitucion
                WHERE n.Alcance = \'local\' AND ' . $this->sqlVisiblePublicas('n') . '
                  AND COALESCE(n.CompartirEnRed, 1) = 1 AND n.IdInstitucion <> ? AND i.DependenciaInstitucion = ?';
        $cstmt = $this->db->prepare($countSql);
        if ($alcance === 'local') {
            $cstmt->execute([$instId]);
        } else {
            $dep = $this->getDependenciaRed($instId);
            if ($dep === null || $dep === '') {
                return ['rows' => [], 'total' => 0];
            }
            $cstmt->execute([$instId, $dep]);
        }
        $total = (int)$cstmt->fetchColumn();

        return ['rows' => $rows, 'total' => $total];
    }

    public function getPublicById(int $instId, int $idNoticia): ?array {
        $stmt = $this->db->prepare("
            SELECT n.*, i.NombreInst AS NombreInstitucion
            FROM noticia n
            INNER JOIN institucion i ON i.IdInstitucion = n.IdInstitucion
            WHERE n.IdNoticia = ? AND n.Publicado = 1
            LIMIT 1
        ");
        $stmt->execute([$idNoticia]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $fp = $row['FechaPublicacion'] ?? null;
        if ($fp !== null && $fp !== '' && strtotime((string)$fp) > time()) {
            return null;
        }

        $alcance = strtolower((string)($row['Alcance'] ?? ''));
        if ($alcance === 'local') {
            if ((int)$row['IdInstitucion'] === $instId) {
                return $row;
            }
            $myDep = $this->getDependenciaRed($instId);
            $theirDep = $this->getDependenciaRed((int)$row['IdInstitucion']);
            if ($myDep !== null && $myDep !== '' && $myDep === $theirDep) {
                if ((int)($row['CompartirEnRed'] ?? 1) !== 1) {
                    return null;
                }
                return $row;
            }
            return null;
        }
        if ($alcance === 'red') {
            $dep = $this->getDependenciaRed($instId);
            if ($dep === null || (string)($row['DependenciaRed'] ?? '') !== $dep) {
                return null;
            }
            return $row;
        }
        return null;
    }

    public function listAdmin(int $instId, int $page, int $pageSize): array {
        $offset = max(0, ($page - 1) * $pageSize);
        $sql = "
            SELECT IdNoticia, IdInstitucion, Alcance, Titulo, LEFT(Cuerpo, 200) AS CuerpoPreview,
                   Publicado, CompartirEnRed, FechaPublicacion, FechaCreacion, FechaActualizacion, IdUsrAutor, DependenciaRed
            FROM noticia
            WHERE IdInstitucion = ?
            ORDER BY FechaCreacion DESC, IdNoticia DESC
            LIMIT " . (int)$pageSize . " OFFSET " . (int)$offset;
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cstmt = $this->db->prepare('SELECT COUNT(*) FROM noticia WHERE IdInstitucion = ?');
        $cstmt->execute([$instId]);
        $total = (int)$cstmt->fetchColumn();

        return ['rows' => $rows, 'total' => $total];
    }

    public function getByIdAdmin(int $instId, int $idNoticia): ?array {
        $stmt = $this->db->prepare('SELECT * FROM noticia WHERE IdNoticia = ? AND IdInstitucion = ? LIMIT 1');
        $stmt->execute([$idNoticia, $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(int $instId, int $idAutor, array $payload): array {
        $titulo = trim(strip_tags((string)($payload['Titulo'] ?? '')));
        $cuerpo = trim(strip_tags((string)($payload['Cuerpo'] ?? '')));
        $alcance = 'local';
        $publicado = !empty($payload['Publicado']) ? 1 : 0;
        $compartirEnRed = array_key_exists('CompartirEnRed', $payload)
            ? (!empty($payload['CompartirEnRed']) ? 1 : 0)
            : 1;
        $fpIn = array_key_exists('FechaPublicacion', $payload) ? (string)$payload['FechaPublicacion'] : '';
        $fechaPub = $this->resolveFechaPublicacion($fpIn !== '' ? $fpIn : null, $publicado === 1, null);

        if ($titulo === '' || $cuerpo === '') {
            return ['status' => 'error', 'message' => 'Título y cuerpo son obligatorios.'];
        }

        $stmt = $this->db->prepare("
            INSERT INTO noticia
            (IdInstitucion, Alcance, DependenciaRed, Titulo, Cuerpo, Publicado, CompartirEnRed, FechaPublicacion, IdUsrAutor, FechaCreacion)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $instId,
            $alcance,
            $titulo,
            $cuerpo,
            $publicado,
            $compartirEnRed,
            $fechaPub,
            $idAutor,
        ]);
        return ['status' => 'success', 'data' => ['IdNoticia' => (int)$this->db->lastInsertId()]];
    }

    public function update(int $instId, int $idNoticia, array $payload): array {
        $row = $this->getByIdAdmin($instId, $idNoticia);
        if (!$row) {
            return ['status' => 'error', 'message' => 'Noticia no encontrada.'];
        }
        $titulo = isset($payload['Titulo']) ? trim(strip_tags((string)$payload['Titulo'])) : (string)$row['Titulo'];
        $cuerpo = isset($payload['Cuerpo']) ? trim(strip_tags((string)$payload['Cuerpo'])) : (string)$row['Cuerpo'];
        // Modelo actual: siempre local; visibilidad en otras sedes = CompartirEnRed.
        $alcance = 'local';
        $depRed = null;
        $publicado = array_key_exists('Publicado', $payload)
            ? (!empty($payload['Publicado']) ? 1 : 0)
            : (int)$row['Publicado'];
        $compartirEnRed = array_key_exists('CompartirEnRed', $payload)
            ? (!empty($payload['CompartirEnRed']) ? 1 : 0)
            : (int)($row['CompartirEnRed'] ?? 1);

        $fpPayload = null;
        if (array_key_exists('FechaPublicacion', $payload)) {
            $fpPayload = trim((string)$payload['FechaPublicacion']);
            if ($fpPayload === '') {
                $fpPayload = null;
            }
        }
        $fechaPub = $this->resolveFechaPublicacion(
            $fpPayload,
            $publicado === 1,
            $row['FechaPublicacion'] !== null && $row['FechaPublicacion'] !== ''
                ? (string)$row['FechaPublicacion']
                : null
        );

        if ($titulo === '' || $cuerpo === '') {
            return ['status' => 'error', 'message' => 'Título y cuerpo son obligatorios.'];
        }

        $stmt = $this->db->prepare("
            UPDATE noticia SET
            Alcance = ?, DependenciaRed = ?, Titulo = ?, Cuerpo = ?, Publicado = ?, CompartirEnRed = ?, FechaPublicacion = ?
            WHERE IdNoticia = ? AND IdInstitucion = ?
        ");
        $stmt->execute([
            $alcance,
            $depRed,
            $titulo,
            $cuerpo,
            $publicado,
            $compartirEnRed,
            $fechaPub,
            $idNoticia,
            $instId,
        ]);
        return ['status' => 'success'];
    }

    public function delete(int $instId, int $idNoticia): array {
        $stmt = $this->db->prepare('DELETE FROM noticia WHERE IdNoticia = ? AND IdInstitucion = ?');
        $stmt->execute([$idNoticia, $instId]);
        if ($stmt->rowCount() < 1) {
            return ['status' => 'error', 'message' => 'Noticia no encontrada.'];
        }
        return ['status' => 'success'];
    }

    public function getRolesPublicar(int $instId): array {
        $stmt = $this->db->prepare("
            SELECT t.IdTipousrA, t.NombreCompleto, COALESCE(n.Activo, 0) AS Activo
            FROM tipousuarioe t
            LEFT JOIN noticia_rol_publicar n ON n.IdTipousrA = t.IdTipousrA AND n.IdInstitucion = ?
            ORDER BY t.IdTipousrA ASC
        ");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function setRolPublicar(int $instId, int $idTipousrA, int $activo): array {
        $stmt = $this->db->prepare("
            INSERT INTO noticia_rol_publicar (IdInstitucion, IdTipousrA, Activo)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE Activo = VALUES(Activo)
        ");
        $stmt->execute([$instId, $idTipousrA, $activo ? 1 : 0]);
        return ['status' => 'success'];
    }

    /**
     * Noticias publicadas con FechaPublicacion estrictamente posterior a $desde (local + red visible para la institución).
     */
    public function countPublicadasDesde(int $instId, string $desde): int {
        $total = 0;
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM noticia
            WHERE IdInstitucion = ? AND Alcance = 'local' AND " . $this->sqlVisiblePublicas() . "
              AND FechaPublicacion IS NOT NULL AND FechaPublicacion > ?
        ");
        $stmt->execute([$instId, $desde]);
        $total += (int)$stmt->fetchColumn();

        $dep = $this->getDependenciaRed($instId);
        if ($dep !== null && $dep !== '') {
            $stmt2 = $this->db->prepare("
                SELECT COUNT(*) FROM noticia n
                INNER JOIN institucion i ON i.IdInstitucion = n.IdInstitucion
                WHERE n.Alcance = 'local' AND " . $this->sqlVisiblePublicas('n') . "
                  AND COALESCE(n.CompartirEnRed, 1) = 1
                  AND n.IdInstitucion <> ?
                  AND i.DependenciaInstitucion = ?
                  AND n.FechaPublicacion IS NOT NULL AND n.FechaPublicacion > ?
            ");
            $stmt2->execute([$instId, $dep, $desde]);
            $total += (int)$stmt2->fetchColumn();
        }
        return $total;
    }

    public function countBorradores(int $instId): int {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM noticia WHERE IdInstitucion = ? AND Publicado = 0');
        $stmt->execute([$instId]);
        return (int)$stmt->fetchColumn();
    }
}
