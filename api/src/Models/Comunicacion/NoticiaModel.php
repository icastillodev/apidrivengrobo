<?php
namespace App\Models\Comunicacion;

use App\Utils\ComunicacionArchivoValidacion;
use PDO;

class NoticiaModel {
    private $db;

    /** Variantes permitidas para `CategoriaBadge` (clases Bootstrap 5 `text-bg-*`). */
    private const BADGE_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    private function normalizeCategoria(?string $label): ?string {
        $s = trim(strip_tags((string)$label));
        if ($s === '') {
            return null;
        }
        if (function_exists('mb_substr')) {
            return mb_substr($s, 0, 80, 'UTF-8');
        }
        return substr($s, 0, 80);
    }

    private function normalizeCategoriaBadge(?string $raw): ?string {
        $v = strtolower(trim((string)$raw));
        if ($v === '' || $v === 'none') {
            return null;
        }
        return in_array($v, self::BADGE_VARIANTS, true) ? $v : null;
    }

    /** Si no hay texto de categoría, no se guarda color suelto. */
    private function resolveCategoriaFields(array $payload, ?array $existingRow = null): array {
        $hasKey = array_key_exists('Categoria', $payload);
        $cat = $hasKey
            ? $this->normalizeCategoria($payload['Categoria'] !== null ? (string)$payload['Categoria'] : '')
            : ($existingRow !== null ? $this->normalizeCategoria((string)($existingRow['Categoria'] ?? '')) : null);

        $hasColorKey = array_key_exists('CategoriaBadge', $payload);
        $badgeRaw = '';
        if ($hasColorKey) {
            $badgeRaw = $payload['CategoriaBadge'] !== null ? (string)$payload['CategoriaBadge'] : '';
        } elseif ($existingRow !== null) {
            $badgeRaw = (string)($existingRow['CategoriaBadge'] ?? '');
        }
        $badge = $this->normalizeCategoriaBadge($badgeRaw !== '' ? $badgeRaw : null);

        if ($cat === null) {
            return [null, null];
        }
        if ($badge === null) {
            $badge = 'primary';
        }
        return [$cat, $badge];
    }

    /** Solo noticias ya visibles en portal (publicadas y fecha efectiva <= ahora). */
    private function sqlVisiblePublicas(string $alias = ''): string {
        $p = $alias !== '' ? $alias . '.' : '';
        return "{$p}Publicado = 1 AND ({$p}FechaPublicacion IS NULL OR {$p}FechaPublicacion <= NOW())";
    }

    /**
     * Orden del listado público (whitelist; evita inyección SQL).
     */
    private function sqlOrderPublicList(string $sort, string $alias = ''): string {
        $p = $alias !== '' ? $alias . '.' : '';
        switch (strtolower(trim($sort))) {
            case 'fecha_asc':
                return "ORDER BY {$p}FechaPublicacion ASC, {$p}IdNoticia ASC";
            case 'titulo_asc':
                return "ORDER BY {$p}Titulo ASC, {$p}IdNoticia ASC";
            case 'titulo_desc':
                return "ORDER BY {$p}Titulo DESC, {$p}IdNoticia DESC";
            case 'fecha_desc':
            default:
                return "ORDER BY {$p}FechaPublicacion DESC, {$p}IdNoticia DESC";
        }
    }

    /**
     * Listado local: primero noticias con OrdenFijo 1..6 (hasta dos filas de 3 en el panel), luego el resto.
     * Requiere columna noticia.OrdenFijo (ver docs/migrations).
     */
    private function sqlOrderPublicListLocalWithPin(string $sort): string {
        $pin = '(OrdenFijo IS NULL) ASC, OrdenFijo ASC, ';
        switch (strtolower(trim($sort))) {
            case 'fecha_asc':
                return "ORDER BY {$pin}FechaPublicacion ASC, IdNoticia ASC";
            case 'titulo_asc':
                return "ORDER BY {$pin}Titulo ASC, IdNoticia ASC";
            case 'titulo_desc':
                return "ORDER BY {$pin}Titulo DESC, IdNoticia DESC";
            case 'fecha_desc':
            default:
                return "ORDER BY {$pin}FechaPublicacion DESC, IdNoticia DESC";
        }
    }

    /** Todas las columnas de `noticia` (sin wildcard) para detalle admin/público. */
    private function sqlSelectNoticiaAllColumns(?string $alias = null): string {
        $p = $alias !== null && $alias !== '' ? $alias . '.' : '';
        $base = "{$p}IdNoticia, {$p}IdInstitucion, {$p}Alcance, {$p}DependenciaRed, {$p}Titulo, {$p}Categoria, {$p}CategoriaBadge, "
            . "{$p}Cuerpo, {$p}Publicado, {$p}CompartirEnRed, {$p}FechaPublicacion, {$p}IdUsrAutor, {$p}FechaCreacion, "
            . "{$p}FechaActualizacion, {$p}OrdenFijo";
        $extra = [];
        if ($this->hasColumnNoticia('ImagenPortadaB2Key')) {
            $extra[] = "{$p}ImagenPortadaB2Key";
            $extra[] = "{$p}ImagenPortadaNombre";
        }
        if ($this->hasColumnNoticia('AdjuntoDoc1B2Key')) {
            $extra[] = "{$p}AdjuntoDoc1B2Key";
            $extra[] = "{$p}AdjuntoDoc1Nombre";
            $extra[] = "{$p}AdjuntoDoc2B2Key";
            $extra[] = "{$p}AdjuntoDoc2Nombre";
        }
        if ($extra !== []) {
            return $base . ', ' . implode(', ', $extra);
        }

        return $base;
    }

    private function hasColumnNoticia(string $column): bool {
        try {
            $stmt = $this->db->prepare('SHOW COLUMNS FROM `noticia` LIKE ?');
            $stmt->execute([$column]);

            return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * @return array{ok:bool, message?:string, adjuntos?:array<string,mixed>}
     */
    private function normalizarAdjuntosNoticiaPayload(int $instId, array $payload, ?array $existingRow): array {
        if (!$this->hasColumnNoticia('ImagenPortadaB2Key')) {
            return ['ok' => true, 'adjuntos' => []];
        }

        $t = static function ($v): ?string {
            if ($v === null) {
                return null;
            }
            $s = trim((string) $v);

            return $s === '' ? null : $s;
        };

        if (array_key_exists('ImagenPortadaB2Key', $payload) || array_key_exists('ImagenPortadaNombre', $payload)) {
            $imgKey = array_key_exists('ImagenPortadaB2Key', $payload) ? $t($payload['ImagenPortadaB2Key']) : null;
            $imgNom = array_key_exists('ImagenPortadaNombre', $payload)
                ? trim(strip_tags((string) ($payload['ImagenPortadaNombre'] ?? ''))) : null;
            $imgNom = $imgNom === '' ? null : $imgNom;
        } elseif ($existingRow !== null) {
            $imgKey = isset($existingRow['ImagenPortadaB2Key']) ? $t($existingRow['ImagenPortadaB2Key']) : null;
            $imgNom = isset($existingRow['ImagenPortadaNombre']) ? trim((string) $existingRow['ImagenPortadaNombre']) : null;
            $imgNom = $imgNom === '' ? null : $imgNom;
        } else {
            $imgKey = null;
            $imgNom = null;
        }

        $readDoc = static function (array $p, ?array $ex, string $kKey, string $kNom) use ($t) {
            if (array_key_exists($kKey, $p) || array_key_exists($kNom, $p)) {
                return [$t($p[$kKey] ?? null), isset($p[$kNom]) ? trim(strip_tags((string) $p[$kNom])) : null];
            }
            if ($ex !== null) {
                $nk = isset($ex[$kKey]) ? $t($ex[$kKey]) : null;
                $nn = isset($ex[$kNom]) ? trim((string) $ex[$kNom]) : null;
                $nn = $nn === '' ? null : $nn;

                return [$nk, $nn];
            }

            return [null, null];
        };

        [$d1k, $d1n] = $readDoc($payload, $existingRow, 'AdjuntoDoc1B2Key', 'AdjuntoDoc1Nombre');
        [$d2k, $d2n] = $readDoc($payload, $existingRow, 'AdjuntoDoc2B2Key', 'AdjuntoDoc2Nombre');
        $d1n = $d1n === '' ? null : $d1n;
        $d2n = $d2n === '' ? null : $d2n;

        if ($imgKey !== null || $imgNom !== null) {
            if ($imgKey === null || $imgNom === null) {
                return ['ok' => false, 'message' => 'Imagen de portada: indique clave B2 y nombre.'];
            }
            if (!ComunicacionArchivoValidacion::clavePerteneceInstitucion($imgKey, 'noticias/imagen', $instId)) {
                return ['ok' => false, 'message' => 'Imagen de portada: clave B2 no válida para esta sede.'];
            }
        }

        if (($d2k !== null || $d2n !== null) && ($d1k === null || $d1n === null)) {
            return ['ok' => false, 'message' => 'Si adjunta un segundo documento, el primero es obligatorio.'];
        }

        foreach ([[ $d1k, $d1n ], [ $d2k, $d2n ]] as $pair) {
            [$kk, $nn] = $pair;
            if (($kk === null && $nn === null) || ($kk !== null && $nn !== null)) {
                continue;
            }

            return ['ok' => false, 'message' => 'Adjuntos de noticia: cada archivo requiere clave B2 y nombre.'];
        }

        foreach ([['k' => $d1k, 'n' => $d1n], ['k' => $d2k, 'n' => $d2n]] as $slot) {
            if ($slot['k'] !== null && !ComunicacionArchivoValidacion::clavePerteneceInstitucion((string) $slot['k'], 'noticias/doc', $instId)) {
                return ['ok' => false, 'message' => 'Documento adjunto: clave B2 no válida para esta sede.'];
            }
        }

        return [
            'ok' => true,
            'adjuntos' => [
                'ImagenPortadaB2Key' => $imgKey,
                'ImagenPortadaNombre' => $imgNom,
                'AdjuntoDoc1B2Key' => $d1k,
                'AdjuntoDoc1Nombre' => $d1n,
                'AdjuntoDoc2B2Key' => $d2k,
                'AdjuntoDoc2Nombre' => $d2n,
            ],
        ];
    }

    /** @param array<string,mixed> $adj */
    private function persistAdjuntosNoticia(int $instId, int $idNoticia, array $adj): void {
        if (!$this->hasColumnNoticia('ImagenPortadaB2Key') || $adj === []) {
            return;
        }
        $stmt = $this->db->prepare(
            'UPDATE noticia SET ImagenPortadaB2Key = ?, ImagenPortadaNombre = ?, AdjuntoDoc1B2Key = ?, AdjuntoDoc1Nombre = ?, AdjuntoDoc2B2Key = ?, AdjuntoDoc2Nombre = ? WHERE IdNoticia = ? AND IdInstitucion = ?'
        );
        $stmt->execute([
            $adj['ImagenPortadaB2Key'] ?? null,
            $adj['ImagenPortadaNombre'] ?? null,
            $adj['AdjuntoDoc1B2Key'] ?? null,
            $adj['AdjuntoDoc1Nombre'] ?? null,
            $adj['AdjuntoDoc2B2Key'] ?? null,
            $adj['AdjuntoDoc2Nombre'] ?? null,
            $idNoticia,
            $instId,
        ]);
    }

    /**
     * Resuelve OrdenFijo al guardar: borrador => siempre NULL; publicado => payload o valor previo.
     * @return array{ok:true, orden:?int}|array{ok:false, message:string}
     */
    private function resolveOrdenFijoForSave(array $payload, ?array $existingRow, int $publicado): array {
        if ($publicado !== 1) {
            return ['ok' => true, 'orden' => null];
        }
        if (array_key_exists('OrdenFijo', $payload)) {
            $raw = $payload['OrdenFijo'];
            if ($raw === null || $raw === '') {
                return ['ok' => true, 'orden' => null];
            }
            if (is_string($raw) && trim($raw) === '') {
                return ['ok' => true, 'orden' => null];
            }
            $v = (int)$raw;
            if ($v < 1 || $v > 6) {
                return ['ok' => false, 'message' => 'La posición fija debe ser entre 1 y 6 (o ninguna).'];
            }
            return ['ok' => true, 'orden' => $v];
        }
        if ($existingRow === null) {
            return ['ok' => true, 'orden' => null];
        }
        $ex = $existingRow['OrdenFijo'] ?? null;
        if ($ex === null || $ex === '') {
            return ['ok' => true, 'orden' => null];
        }
        $v = (int)$ex;
        if ($v < 1 || $v > 6) {
            return ['ok' => true, 'orden' => null];
        }
        return ['ok' => true, 'orden' => $v];
    }

    /** Libera el cupo (1..6) para otra noticia de la misma institución. */
    private function clearOrdenFijoSlot(int $instId, int $slot, int $excludeIdNoticia): void {
        $stmt = $this->db->prepare(
            'UPDATE noticia SET OrdenFijo = NULL WHERE IdInstitucion = ? AND OrdenFijo = ? AND IdNoticia <> ?'
        );
        $stmt->execute([$instId, $slot, $excludeIdNoticia]);
    }

    /**
     * Fecha/hora de publicación al guardar: borrador => null; publicar => payload, existente o ahora.
     * Si el payload trae fecha, esa es la que debe guardarse, no sobreescribir con 'now()'.
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
        if ((int)$idTipousrA === 3) {
            return false;
        }
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
     * @param string $sort fecha_desc|fecha_asc|titulo_asc|titulo_desc
     */
    public function listPublic(int $instId, string $alcance, int $page, int $pageSize, bool $fullCuerpoLocal = false, string $sort = 'fecha_desc', string $search = ''): array {
        $alcance = strtolower($alcance) === 'red' ? 'red' : 'local';
        $offset = max(0, ($page - 1) * $pageSize);
        $orderLocal = $this->sqlOrderPublicListLocalWithPin($sort);
        $orderRed = $this->sqlOrderPublicList($sort, 'n');

        $searchFilterLocal = "";
        $searchFilterRed = "";
        $paramsLocal = [$instId];
        $paramsRed = [$instId];

        if ($search !== '') {
            $like = '%' . $search . '%';
            $searchFilterLocal = " AND (Titulo LIKE ? OR Cuerpo LIKE ? OR FechaPublicacion LIKE ?)";
            $paramsLocal[] = $like;
            $paramsLocal[] = $like;
            $paramsLocal[] = $like;

            $searchFilterRed = " AND (n.Titulo LIKE ? OR n.Cuerpo LIKE ? OR n.FechaPublicacion LIKE ? OR i.NombreInst LIKE ?)";
            $paramsRed[] = $like;
            $paramsRed[] = $like;
            $paramsRed[] = $like;
            $paramsRed[] = $like;
        }

        if ($alcance === 'local') {
            $cuerpoSel = $fullCuerpoLocal
                ? 'Cuerpo AS Cuerpo'
                : 'LEFT(Cuerpo, 400) AS CuerpoResumen';
            $b2ListExtra = '';
            if ($this->hasColumnNoticia('ImagenPortadaB2Key')) {
                $b2ListExtra .= ', ImagenPortadaB2Key';
            }
            if ($this->hasColumnNoticia('AdjuntoDoc1B2Key')) {
                $b2ListExtra .= ', AdjuntoDoc1B2Key, AdjuntoDoc1Nombre, AdjuntoDoc2B2Key, AdjuntoDoc2Nombre';
            }
            $sql = "
                SELECT IdNoticia, IdInstitucion, Alcance, Titulo, Categoria, CategoriaBadge, {$cuerpoSel},
                       FechaPublicacion, FechaCreacion, OrdenFijo{$b2ListExtra}
                FROM noticia
                WHERE IdInstitucion = ? AND Alcance = 'local' AND " . $this->sqlVisiblePublicas() . "
                {$searchFilterLocal}
                {$orderLocal}
                LIMIT " . (int)$pageSize . " OFFSET " . (int)$offset;
            $stmt = $this->db->prepare($sql);
            $stmt->execute($paramsLocal);
        } else {
            // "Red" = noticias locales publicadas por otras instituciones con la misma dependencia (misma red).
            $dep = $this->getDependenciaRed($instId);
            if ($dep === null || $dep === '') {
                return ['rows' => [], 'total' => 0];
            }
            $paramsRed[] = $dep;

            $b2ListExtraRed = '';
            if ($this->hasColumnNoticia('ImagenPortadaB2Key')) {
                $b2ListExtraRed .= ', n.ImagenPortadaB2Key';
            }
            if ($this->hasColumnNoticia('AdjuntoDoc1B2Key')) {
                $b2ListExtraRed .= ', n.AdjuntoDoc1B2Key, n.AdjuntoDoc1Nombre, n.AdjuntoDoc2B2Key, n.AdjuntoDoc2Nombre';
            }
            $sql = "
                SELECT n.IdNoticia, n.IdInstitucion, n.Alcance, n.Titulo, n.Categoria, n.CategoriaBadge,
                       LEFT(n.Cuerpo, 400) AS CuerpoResumen,
                       n.FechaPublicacion, n.FechaCreacion, n.DependenciaRed,
                       i.NombreInst AS NombreInstitucion{$b2ListExtraRed}
                FROM noticia n
                INNER JOIN institucion i ON i.IdInstitucion = n.IdInstitucion
                WHERE n.Alcance = 'local' AND " . $this->sqlVisiblePublicas('n') . "
                  AND COALESCE(n.CompartirEnRed, 1) = 1
                  AND n.IdInstitucion <> ?
                  AND i.DependenciaInstitucion = ?
                {$searchFilterRed}
                {$orderRed}
                LIMIT " . (int)$pageSize . " OFFSET " . (int)$offset;
            $stmt = $this->db->prepare($sql);
            $stmt->execute($paramsRed);
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = $alcance === 'local'
            ? 'SELECT COUNT(*) FROM noticia WHERE IdInstitucion = ? AND Alcance = \'local\' AND ' . $this->sqlVisiblePublicas() . $searchFilterLocal
            : 'SELECT COUNT(*) FROM noticia n INNER JOIN institucion i ON i.IdInstitucion = n.IdInstitucion
                WHERE n.Alcance = \'local\' AND ' . $this->sqlVisiblePublicas('n') . '
                  AND COALESCE(n.CompartirEnRed, 1) = 1 AND n.IdInstitucion <> ? AND i.DependenciaInstitucion = ?' . $searchFilterRed;
        
        $cstmt = $this->db->prepare($countSql);
        if ($alcance === 'local') {
            $cstmt->execute($paramsLocal);
        } else {
            $dep = $this->getDependenciaRed($instId);
            if ($dep === null || $dep === '') {
                return ['rows' => [], 'total' => 0];
            }
            $cstmt->execute($paramsRed);
        }
        $total = (int)$cstmt->fetchColumn();

        return ['rows' => $rows, 'total' => $total];
    }

    public function getPublicById(int $instId, int $idNoticia): ?array {
        $cols = $this->sqlSelectNoticiaAllColumns('n');
        $stmt = $this->db->prepare("
            SELECT {$cols}, i.NombreInst AS NombreInstitucion
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
        $b2Portada = $this->hasColumnNoticia('ImagenPortadaB2Key') ? ', ImagenPortadaB2Key' : '';
        $sql = "
            SELECT IdNoticia, IdInstitucion, Alcance, Titulo, Categoria, CategoriaBadge,
                   LEFT(Cuerpo, 200) AS CuerpoPreview,
                   Publicado, CompartirEnRed, FechaPublicacion, FechaCreacion, FechaActualizacion, IdUsrAutor, DependenciaRed,
                   OrdenFijo{$b2Portada}
            FROM noticia
            WHERE IdInstitucion = ?
            ORDER BY (OrdenFijo IS NULL) ASC, OrdenFijo ASC, FechaCreacion DESC, IdNoticia DESC
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
        $cols = $this->sqlSelectNoticiaAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM noticia WHERE IdNoticia = ? AND IdInstitucion = ? LIMIT 1");
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

        [$categoria, $categoriaBadge] = $this->resolveCategoriaFields($payload, null);

        $ordenResolved = $this->resolveOrdenFijoForSave($payload, null, $publicado);
        if (!$ordenResolved['ok']) {
            return ['status' => 'error', 'message' => $ordenResolved['message']];
        }
        $ordenFijo = $ordenResolved['orden'];

        $adjResCreate = $this->normalizarAdjuntosNoticiaPayload($instId, $payload, null);
        if (!$adjResCreate['ok']) {
            return ['status' => 'error', 'message' => $adjResCreate['message'] ?? 'Adjuntos inválidos.'];
        }

        $stmt = $this->db->prepare("
            INSERT INTO noticia
            (IdInstitucion, Alcance, DependenciaRed, Titulo, Categoria, CategoriaBadge, Cuerpo, Publicado, CompartirEnRed, FechaPublicacion, IdUsrAutor, FechaCreacion, OrdenFijo)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)
        ");
        $stmt->execute([
            $instId,
            $alcance,
            $titulo,
            $categoria,
            $categoriaBadge,
            $cuerpo,
            $publicado,
            $compartirEnRed,
            $fechaPub,
            $idAutor,
        ]);
        $newId = (int)$this->db->lastInsertId();

        $this->persistAdjuntosNoticia($instId, $newId, $adjResCreate['adjuntos'] ?? []);

        if ($ordenFijo !== null) {
            $this->db->beginTransaction();
            try {
                $this->clearOrdenFijoSlot($instId, $ordenFijo, $newId);
                $u = $this->db->prepare(
                    'UPDATE noticia SET OrdenFijo = ? WHERE IdNoticia = ? AND IdInstitucion = ?'
                );
                $u->execute([$ordenFijo, $newId, $instId]);
                $this->db->commit();
            } catch (\Throwable $e) {
                $this->db->rollBack();
                throw $e;
            }
        }

        return ['status' => 'success', 'data' => ['IdNoticia' => $newId]];
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

        [$categoria, $categoriaBadge] = $this->resolveCategoriaFields($payload, $row);

        $ordenResolved = $this->resolveOrdenFijoForSave($payload, $row, $publicado);
        if (!$ordenResolved['ok']) {
            return ['status' => 'error', 'message' => $ordenResolved['message']];
        }
        $ordenFijo = $ordenResolved['orden'];

        $adjResUpd = $this->normalizarAdjuntosNoticiaPayload($instId, $payload, $row);
        if (!$adjResUpd['ok']) {
            return ['status' => 'error', 'message' => $adjResUpd['message'] ?? 'Adjuntos inválidos.'];
        }

        $this->db->beginTransaction();
        try {
            if ($ordenFijo !== null) {
                $this->clearOrdenFijoSlot($instId, $ordenFijo, $idNoticia);
            }
            $stmt = $this->db->prepare("
                UPDATE noticia SET
                Alcance = ?, DependenciaRed = ?, Titulo = ?, Categoria = ?, CategoriaBadge = ?, Cuerpo = ?,
                Publicado = ?, CompartirEnRed = ?, FechaPublicacion = ?, OrdenFijo = ?
                WHERE IdNoticia = ? AND IdInstitucion = ?
            ");
            $stmt->execute([
                $alcance,
                $depRed,
                $titulo,
                $categoria,
                $categoriaBadge,
                $cuerpo,
                $publicado,
                $compartirEnRed,
                $fechaPub,
                $ordenFijo,
                $idNoticia,
                $instId,
            ]);
            $this->persistAdjuntosNoticia($instId, $idNoticia, $adjResUpd['adjuntos'] ?? []);
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
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
            WHERE t.IdTipousrA NOT IN (1, 3)
            ORDER BY t.IdTipousrA ASC
        ");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function setRolPublicar(int $instId, int $idTipousrA, int $activo): array {
        if (in_array((int)$idTipousrA, [1, 3], true)) {
            return ['status' => 'error', 'message' => 'Este perfil no se configura aquí.'];
        }
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
