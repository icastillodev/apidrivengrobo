<?php
namespace App\Models\Comunicacion;

use PDO;

class MensajeriaModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function usuarioEnInstitucion(int $instId, int $userId): bool {
        $stmt = $this->db->prepare('SELECT 1 FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ? LIMIT 1');
        $stmt->execute([$userId, $instId]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Usuario en otra sede de la misma dependencia (red) que la institución del remitente.
     */
    public function usuarioEnRedMismaDependencia(int $instRemitente, int $userIdDest): bool {
        $stmt = $this->db->prepare('
            SELECT 1 FROM usuarioe u
            INNER JOIN institucion i ON i.IdInstitucion = u.IdInstitucion
            INNER JOIN institucion mi ON mi.IdInstitucion = ?
            WHERE u.IdUsrA = ?
              AND u.IdInstitucion <> ?
              AND mi.DependenciaInstitucion IS NOT NULL AND mi.DependenciaInstitucion <> \'\'
              AND i.DependenciaInstitucion = mi.DependenciaInstitucion
            LIMIT 1
        ');
        $stmt->execute([$instRemitente, $userIdDest, $instRemitente]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Responsable (IdUsrA) de un tramo de alojamiento en la institución del remitente.
     * Cubre casos en que no figura en usuarioe de esa sede pero sí en alojamiento.
     */
    private function usuarioEsResponsableAlojamientoHistoria(int $instId, int $userId, int $historia): bool {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM alojamiento WHERE IdInstitucion = ? AND historia = ? AND IdUsrA = ? LIMIT 1'
        );
        $stmt->execute([$instId, $historia, $userId]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Titular del protocolo vinculado a algún tramo de la historia (misma institución).
     * Permite escribir al titular aunque el tramo use otro IdUsrA o el responsable no esté en usuarioe local.
     */
    private function usuarioEsTitularProtocoloHistoriaAlojamiento(int $instId, int $userId, int $historia): bool {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM alojamiento a
             INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
             WHERE a.IdInstitucion = ? AND a.historia = ? AND p.IdUsrA = ?
             LIMIT 1'
        );
        $stmt->execute([$instId, $historia, $userId]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * @param string|null $origenTipo p. ej. alojamiento
     * @param int|null $origenId    p. ej. id historia cuando origen es alojamiento
     */
    public function destinatarioPermitidoParaMensaje(
        int $instRemitente,
        int $destinatarioId,
        ?string $origenTipo = null,
        ?int $origenId = null
    ): bool {
        if ($destinatarioId <= 0) {
            return false;
        }
        if ($this->usuarioEnInstitucion($instRemitente, $destinatarioId)
            || $this->usuarioEnRedMismaDependencia($instRemitente, $destinatarioId)) {
            return true;
        }
        $tipo = $origenTipo !== null ? strtolower(trim($origenTipo)) : '';
        if ($tipo === 'alojamiento' && $origenId !== null && $origenId > 0) {
            return $this->usuarioEsResponsableAlojamientoHistoria($instRemitente, $destinatarioId, $origenId)
                || $this->usuarioEsTitularProtocoloHistoriaAlojamiento($instRemitente, $destinatarioId, $origenId);
        }
        return false;
    }

    /**
     * Participantes ordenados (min, max) para consistencia.
     */
    private function normalizeParticipantes(int $a, int $b): array {
        return $a < $b ? [$a, $b] : [$b, $a];
    }

    /**
     * Hilos 1:1 (mensajes entre usuarios), excluye buzón institucional.
     */
    public function getHilosPersonal(int $userId, int $page, int $limit): array {
        $offset = max(0, ($page - 1) * $limit);
        $filtroInst = $this->hasColumn('mensaje_hilo', 'EsInstitucional')
            ? ' AND COALESCE(h.EsInstitucional, 0) = 0'
            : '';
        $sql = "
            SELECT h.*,
              (SELECT m.Cuerpo FROM mensaje m
               WHERE m.IdMensajeHilo = h.IdMensajeHilo
               ORDER BY m.FechaEnvio DESC LIMIT 1) AS UltimoCuerpoPreview,
              (SELECT COUNT(*) FROM mensaje m
               WHERE m.IdMensajeHilo = h.IdMensajeHilo
                 AND m.IdUsrRemitente <> :uid1
                 AND NOT EXISTS (
                   SELECT 1 FROM mensaje_leido ml
                   WHERE ml.IdMensaje = m.IdMensaje AND ml.IdUsrLector = :uid2
                 )) AS NoLeidos
            FROM mensaje_hilo h
            WHERE (h.IdUsrParticipanteA = :uid3 OR h.IdUsrParticipanteB = :uid4)
            {$filtroInst}
            ORDER BY COALESCE(h.FechaUltimoMensaje, h.FechaCreacion) DESC, h.IdMensajeHilo DESC
            LIMIT {$limit} OFFSET {$offset}
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uid1' => $userId,
            ':uid2' => $userId,
            ':uid3' => $userId,
            ':uid4' => $userId,
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Hilos del buzón institucional de la sede (todos los usuarios de la institución ven y responden).
     */
    public function getHilosInstitucionales(int $instId, int $userId, int $page, int $limit): array {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional') || !$this->usuarioEnInstitucion($instId, $userId)) {
            return [];
        }
        $offset = max(0, ($page - 1) * $limit);
        $sql = "
            SELECT h.*,
              (SELECT m.Cuerpo FROM mensaje m
               WHERE m.IdMensajeHilo = h.IdMensajeHilo
               ORDER BY m.FechaEnvio DESC LIMIT 1) AS UltimoCuerpoPreview,
              (SELECT COUNT(*) FROM mensaje m
               WHERE m.IdMensajeHilo = h.IdMensajeHilo
                 AND m.IdUsrRemitente <> :uid1
                 AND NOT EXISTS (
                   SELECT 1 FROM mensaje_leido ml
                   WHERE ml.IdMensaje = m.IdMensaje AND ml.IdUsrLector = :uid2
                 )) AS NoLeidos
            FROM mensaje_hilo h
            WHERE h.IdInstitucion = :iid AND h.EsInstitucional = 1
            ORDER BY COALESCE(h.FechaUltimoMensaje, h.FechaCreacion) DESC, h.IdMensajeHilo DESC
            LIMIT {$limit} OFFSET {$offset}
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uid1' => $userId,
            ':uid2' => $userId,
            ':iid' => $instId,
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** @deprecated usar getHilosPersonal */
    public function getHilos(int $userId, int $page, int $limit): array {
        return $this->getHilosPersonal($userId, $page, $limit);
    }

    public function countUnreadPersonal(int $userId): int {
        $filtroInst = $this->hasColumn('mensaje_hilo', 'EsInstitucional')
            ? ' AND COALESCE(h.EsInstitucional, 0) = 0'
            : '';
        $sql = "
            SELECT COUNT(*) FROM mensaje m
            INNER JOIN mensaje_hilo h ON h.IdMensajeHilo = m.IdMensajeHilo
            WHERE (h.IdUsrParticipanteA = :uid OR h.IdUsrParticipanteB = :uid2)
            {$filtroInst}
              AND m.IdUsrRemitente <> :uid3
              AND NOT EXISTS (
                SELECT 1 FROM mensaje_leido ml
                WHERE ml.IdMensaje = m.IdMensaje AND ml.IdUsrLector = :uid4
              )
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uid' => $userId,
            ':uid2' => $userId,
            ':uid3' => $userId,
            ':uid4' => $userId,
        ]);
        return (int) $stmt->fetchColumn();
    }

    public function countUnreadInstitucional(int $userId, int $instId): int {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional') || !$this->usuarioEnInstitucion($instId, $userId)) {
            return 0;
        }
        $sql = "
            SELECT COUNT(*) FROM mensaje m
            INNER JOIN mensaje_hilo h ON h.IdMensajeHilo = m.IdMensajeHilo
            WHERE h.IdInstitucion = :iid AND h.EsInstitucional = 1
              AND m.IdUsrRemitente <> :uid
              AND NOT EXISTS (
                SELECT 1 FROM mensaje_leido ml
                WHERE ml.IdMensaje = m.IdMensaje AND ml.IdUsrLector = :uid2
              )
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':iid' => $instId, ':uid' => $userId, ':uid2' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Acceso a un hilo: personal (A/B) o institucional (cualquier usuario de la sede).
     */
    public function getHiloAccesible(int $hiloId, int $userId, int $instId): ?array {
        $stmt = $this->db->prepare('
            SELECT * FROM mensaje_hilo
            WHERE IdMensajeHilo = ? AND IdInstitucion = ?
            LIMIT 1
        ');
        $stmt->execute([$hiloId, $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        if ($this->hiloEsInstitucional($row)) {
            return $this->usuarioEnInstitucion($instId, $userId) ? $row : null;
        }
        $a = (int) ($row['IdUsrParticipanteA'] ?? 0);
        $bRaw = $row['IdUsrParticipanteB'] ?? null;
        $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : null;
        if ($b !== null) {
            return ($userId === $a || $userId === $b) ? $row : null;
        }

        return $userId === $a ? $row : null;
    }

    public function getHiloRow(int $hiloId, int $userId, int $instId = 0): ?array {
        if ($instId <= 0) {
            $stmt = $this->db->prepare('
                SELECT * FROM mensaje_hilo
                WHERE IdMensajeHilo = ? AND (IdUsrParticipanteA = ? OR IdUsrParticipanteB = ?)
                LIMIT 1
            ');
            $stmt->execute([$hiloId, $userId, $userId]);

            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        return $this->getHiloAccesible($hiloId, $userId, $instId);
    }

    private function hiloEsInstitucional(array $row): bool {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional')) {
            return false;
        }

        return (int) ($row['EsInstitucional'] ?? 0) === 1;
    }

    public function getMensajesHilo(int $hiloId): array {
        $stmt = $this->db->prepare("
            SELECT m.* FROM mensaje m
            WHERE m.IdMensajeHilo = ?
            ORDER BY m.FechaEnvio ASC, m.IdMensaje ASC
        ");
        $stmt->execute([$hiloId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function markHiloLeido(int $hiloId, int $userId): void {
        $mensajes = $this->getMensajesHilo($hiloId);
        $ins = $this->db->prepare('
            INSERT IGNORE INTO mensaje_leido (IdMensaje, IdUsrLector, LeidoEn)
            VALUES (?, ?, NOW())
        ');
        foreach ($mensajes as $m) {
            $mid = (int)($m['IdMensaje'] ?? 0);
            $rem = (int)($m['IdUsrRemitente'] ?? 0);
            if ($mid && $rem !== $userId) {
                $ins->execute([$mid, $userId]);
            }
        }
    }

    /**
     * Usuarios de la misma institución (excl. uno), para selector de mensajes.
     */
    public function listUsuariosInstitucionParaMensaje(int $instId, int $excludeUserId): array {
        $stmt = $this->db->prepare("
            SELECT u.IdUsrA, u.UsrA AS Usuario, p.NombreA, p.ApellidoA,
                   u.IdInstitucion, i.NombreInst AS NombreInstitucion
            FROM usuarioe u
            JOIN personae p ON u.IdUsrA = p.IdUsrA
            JOIN institucion i ON i.IdInstitucion = u.IdInstitucion
            WHERE u.IdInstitucion = ? AND u.IdUsrA <> ?
            ORDER BY p.ApellidoA ASC, p.NombreA ASC
        ");
        $stmt->execute([$instId, $excludeUserId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Usuarios de otras sedes con la misma dependencia (red).
     */
    public function listUsuariosRedMismaDependenciaParaMensaje(int $instId, int $excludeUserId): array {
        $stmt = $this->db->prepare("
            SELECT u.IdUsrA, u.UsrA AS Usuario, p.NombreA, p.ApellidoA,
                   u.IdInstitucion, i.NombreInst AS NombreInstitucion
            FROM usuarioe u
            JOIN personae p ON u.IdUsrA = p.IdUsrA
            JOIN institucion i ON i.IdInstitucion = u.IdInstitucion
            INNER JOIN institucion mi ON mi.IdInstitucion = ?
            WHERE u.IdUsrA <> ?
              AND u.IdInstitucion <> ?
              AND mi.DependenciaInstitucion IS NOT NULL AND mi.DependenciaInstitucion <> ''
              AND i.DependenciaInstitucion = mi.DependenciaInstitucion
            ORDER BY i.NombreInst ASC, p.ApellidoA ASC, p.NombreA ASC
        ");
        $stmt->execute([$instId, $excludeUserId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Nuevo hilo + primer mensaje.
     */
    public function crearHiloYMensaje(
        int $instId,
        int $remitenteId,
        int $destinatarioId,
        string $asunto,
        string $cuerpo,
        ?string $origenTipo,
        ?int $origenId,
        ?string $origenEtiqueta
    ): array {
        if ($remitenteId === $destinatarioId) {
            return ['status' => 'error', 'message' => 'El destinatario no puede ser el mismo usuario.'];
        }
        if (!$this->destinatarioPermitidoParaMensaje($instId, $destinatarioId, $origenTipo, $origenId)) {
            return ['status' => 'error', 'message' => 'Destinatario inválido para esta institución o red.'];
        }
        $asunto = trim(strip_tags($asunto));
        $cuerpo = trim(strip_tags($cuerpo));
        if ($asunto === '' || $cuerpo === '') {
            return ['status' => 'error', 'message' => 'Asunto y mensaje son obligatorios.'];
        }
        if (mb_strlen($asunto) > 255) {
            return ['status' => 'error', 'message' => 'El asunto es demasiado largo.'];
        }

        [$pa, $pb] = $this->normalizeParticipantes($remitenteId, $destinatarioId);

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO mensaje_hilo
                (IdInstitucion, Asunto, IdUsrParticipanteA, IdUsrParticipanteB, FechaCreacion, FechaUltimoMensaje,
                 OrigenTipo, OrigenId, OrigenEtiqueta)
                VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)
            ");
            $stmt->execute([
                $instId,
                $asunto,
                $pa,
                $pb,
                $origenTipo,
                $origenId,
                $origenEtiqueta,
            ]);
            $hiloId = (int)$this->db->lastInsertId();

            $stmtM = $this->db->prepare("
                INSERT INTO mensaje (IdMensajeHilo, IdInstitucion, IdUsrRemitente, Cuerpo, FechaEnvio)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmtM->execute([$hiloId, $instId, $remitenteId, $cuerpo]);

            $this->db->commit();
            return ['status' => 'success', 'data' => ['IdMensajeHilo' => $hiloId]];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo crear el mensaje.'];
        }
    }

    public function responder(int $instId, int $hiloId, int $remitenteId, string $cuerpo): array {
        $h = $this->getHiloAccesible($hiloId, $remitenteId, $instId);
        if (!$h) {
            return ['status' => 'error', 'message' => 'Hilo no encontrado.'];
        }
        $cuerpo = trim(strip_tags($cuerpo));
        if ($cuerpo === '') {
            return ['status' => 'error', 'message' => 'El mensaje no puede estar vacío.'];
        }

        $stmt = $this->db->prepare("
            INSERT INTO mensaje (IdMensajeHilo, IdInstitucion, IdUsrRemitente, Cuerpo, FechaEnvio)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$hiloId, $instId, $remitenteId, $cuerpo]);

        $this->db->prepare("
            UPDATE mensaje_hilo SET FechaUltimoMensaje = NOW() WHERE IdMensajeHilo = ?
        ")->execute([$hiloId]);

        return ['status' => 'success', 'data' => ['IdMensajeHilo' => $hiloId]];
    }

    /**
     * Email e idioma preferido (prioriza fila usuarioe de la institución actual).
     *
     * @return array{EmailA: ?string, NombreA: ?string, ApellidoA: ?string, lang: string}|null
     */
    public function getPersonaCorreoParaNotificacion(int $idUsrA, int $instId): ?array {
        $stmt = $this->db->prepare("
            SELECT p.EmailA, p.NombreA, p.ApellidoA,
              COALESCE(
                NULLIF(TRIM((SELECT idioma_preferido FROM usuarioe WHERE IdUsrA = p.IdUsrA AND IdInstitucion = ? LIMIT 1)), ''),
                NULLIF(TRIM((SELECT idioma_preferido FROM usuarioe WHERE IdUsrA = p.IdUsrA LIMIT 1)), ''),
                'es'
              ) AS lang
            FROM personae p
            WHERE p.IdUsrA = ?
            LIMIT 1
        ");
        $stmt->execute([$instId, $idUsrA]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function getNombreInstitucion(int $instId): string {
        $stmt = $this->db->prepare('SELECT NombreInst FROM institucion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $v = $stmt->fetchColumn();
        return $v !== false ? trim((string) $v) : '';
    }

    /**
     * Nuevo hilo del buzón institucional (sin destinatario único; responde cualquier usuario de la sede).
     */
    public function crearHiloInstitucional(
        int $instId,
        int $remitenteId,
        string $asunto,
        string $cuerpo,
        ?string $origenTipo,
        ?int $origenId,
        ?string $origenEtiqueta
    ): array {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional')) {
            return ['status' => 'error', 'message' => 'El buzón institucional no está disponible. Ejecute la migración de base de datos.'];
        }
        if (!$this->usuarioEnInstitucion($instId, $remitenteId)) {
            return ['status' => 'error', 'message' => 'Usuario no válido para esta institución.'];
        }
        $asunto = trim(strip_tags($asunto));
        $cuerpo = trim(strip_tags($cuerpo));
        if ($asunto === '' || $cuerpo === '') {
            return ['status' => 'error', 'message' => 'Asunto y mensaje son obligatorios.'];
        }
        if (mb_strlen($asunto) > 255) {
            return ['status' => 'error', 'message' => 'El asunto es demasiado largo.'];
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO mensaje_hilo
                (IdInstitucion, Asunto, IdUsrParticipanteA, IdUsrParticipanteB, FechaCreacion, FechaUltimoMensaje,
                 OrigenTipo, OrigenId, OrigenEtiqueta, EsInstitucional)
                VALUES (?, ?, ?, NULL, NOW(), NOW(), ?, ?, ?, 1)
            ");
            $stmt->execute([
                $instId,
                $asunto,
                $remitenteId,
                $origenTipo,
                $origenId,
                $origenEtiqueta,
            ]);
            $hiloId = (int) $this->db->lastInsertId();

            $stmtM = $this->db->prepare("
                INSERT INTO mensaje (IdMensajeHilo, IdInstitucion, IdUsrRemitente, Cuerpo, FechaEnvio)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmtM->execute([$hiloId, $instId, $remitenteId, $cuerpo]);

            $this->db->commit();

            return ['status' => 'success', 'data' => ['IdMensajeHilo' => $hiloId]];
        } catch (\Exception $e) {
            $this->db->rollBack();

            return ['status' => 'error', 'message' => 'No se pudo crear el mensaje.'];
        }
    }

    private function hasColumn(string $tableName, string $columnName): bool {
        try {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM `{$tableName}` LIKE ?");
            $stmt->execute([$columnName]);

            return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return false;
        }
    }
}
