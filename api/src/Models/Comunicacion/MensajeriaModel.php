<?php
namespace App\Models\Comunicacion;

use PDO;

class MensajeriaModel {
    private $db;

    /** Comunicado de administración: visible para toda la sede; solo personal (no rol 3) responde. */
    public const ORIGEN_INST_COMUNICADO = 'institucional_comunicado';

    /** Consulta de un usuario a la institución: ven el autor y el personal; responden ambos. */
    public const ORIGEN_INST_CONSULTA = 'consulta_institucion';

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * Roles que pueden crear comunicados y responder en hilos institucionales de gestión.
     * Alineado con menú 204 (excluye investigador típico rol 3).
     */
    public function esRolStaffInstitucional(int $role): bool {
        return in_array($role, [1, 2, 4, 5, 6], true);
    }

    private function origenTipoInstitucionalNormalizado(array $row): string {
        return strtolower(trim((string) ($row['OrigenTipo'] ?? '')));
    }

    /**
     * Hilos institucionales que el usuario puede abrir (lista / detalle).
     */
    public function puedeVerHiloInstitucional(array $row, int $userId, int $role): bool {
        if (!$this->hiloEsInstitucional($row)) {
            return true;
        }
        $t = $this->origenTipoInstitucionalNormalizado($row);
        if ($t === self::ORIGEN_INST_CONSULTA) {
            if ($this->esRolStaffInstitucional($role)) {
                return true;
            }
            $a = (int) ($row['IdUsrParticipanteA'] ?? 0);
            $bRaw = $row['IdUsrParticipanteB'] ?? null;
            $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : 0;
            if ($userId === $a) {
                return true;
            }

            return $b > 0 && $userId === $b;
        }

        return true;
    }

    /**
     * Quién puede enviar una nueva respuesta en un hilo institucional.
     */
    public function puedeResponderHiloInstitucional(array $row, int $userId, int $role): bool {
        if (!$this->hiloEsInstitucional($row)) {
            return true;
        }
        $t = $this->origenTipoInstitucionalNormalizado($row);
        if ($t === self::ORIGEN_INST_CONSULTA) {
            if ($this->esRolStaffInstitucional($role)) {
                return true;
            }
            $a = (int) ($row['IdUsrParticipanteA'] ?? 0);
            $bRaw = $row['IdUsrParticipanteB'] ?? null;
            $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : 0;
            if ($userId === $a) {
                return true;
            }

            return $b > 0 && $userId === $b;
        }
        if ($t === self::ORIGEN_INST_COMUNICADO) {
            return $this->esRolStaffInstitucional($role);
        }
        // Legacy u otros (p. ej. "institucional"): solo personal autorizado o el autor del hilo (p. ej. consulta).
        return $this->esRolStaffInstitucional($role)
            || (int) ($row['IdUsrParticipanteA'] ?? 0) === $userId;
    }

    /**
     * Si el usuario puede escribir una respuesta en este hilo (personal o institucional).
     */
    public function puedeResponderEnHilo(array $hilo, int $userId, int $role): bool {
        if ($this->hiloEsInstitucional($hilo)) {
            return $this->puedeResponderHiloInstitucional($hilo, $userId, $role);
        }
        // Investigador: no responde en hilos 1:1 (mensajes a personas); sí en institucional arriba.
        return (int) $role !== 3;
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
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->enrichListaInterlocutor($rows, $userId);
    }

    /**
     * Hilos del buzón institucional: comunicados a la sede; consultas institucionales solo si participa
     * (no todo el historial de consultas de terceros). Además incluye hilos personales propios (1:1)
     * de la misma sede para contestar desde un solo lugar, sin mezclar conversaciones ajenas.
     */
    public function getHilosInstitucionales(int $instId, int $userId, int $role, int $page, int $limit): array {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional')) {
            return [];
        }
        // Misma regla que envío: staff de sede puede operar sin fila usuarioe en esa institución (legacy/tokens).
        if (!$this->esRolStaffInstitucional($role) && !$this->usuarioEnInstitucion($instId, $userId)) {
            return [];
        }
        $offset = max(0, ($page - 1) * $limit);
        $ct = self::ORIGEN_INST_CONSULTA;
        $sel = "
            h.*,
            (SELECT m.Cuerpo FROM mensaje m
             WHERE m.IdMensajeHilo = h.IdMensajeHilo
             ORDER BY m.FechaEnvio DESC LIMIT 1) AS UltimoCuerpoPreview,
            (SELECT COUNT(*) FROM mensaje m
             WHERE m.IdMensajeHilo = h.IdMensajeHilo
               AND m.IdUsrRemitente <> :uid1
               AND NOT EXISTS (
                 SELECT 1 FROM mensaje_leido ml
                 WHERE ml.IdMensaje = m.IdMensaje AND ml.IdUsrLector = :uid2
               )) AS NoLeidos,
            COALESCE(h.FechaUltimoMensaje, h.FechaCreacion) AS _sort_ts
        ";
        // Buzón sede actual: comunicados + consultas locales si participa + consultas de otra sede de la red dirigidas a ESTA sede (OrigenId).
        $whereInst = "
            h.EsInstitucional = 1 AND (
              (
                h.IdInstitucion = :iid AND (
                  LOWER(TRIM(COALESCE(h.OrigenTipo, ''))) <> '{$ct}'
                  OR h.IdUsrParticipanteA = :uid3
                  OR (h.IdUsrParticipanteB IS NOT NULL AND h.IdUsrParticipanteB = :uid4)
                )
              )
              OR (
                LOWER(TRIM(COALESCE(h.OrigenTipo, ''))) = '{$ct}'
                AND h.OrigenId = :iid
                AND h.IdInstitucion <> :iid
                AND EXISTS (
                  SELECT 1 FROM institucion mi
                  INNER JOIN institucion hi ON hi.IdInstitucion = h.IdInstitucion
                  WHERE mi.IdInstitucion = :iid
                    AND mi.DependenciaInstitucion IS NOT NULL AND TRIM(mi.DependenciaInstitucion) <> ''
                    AND hi.DependenciaInstitucion IS NOT NULL AND TRIM(hi.DependenciaInstitucion) <> ''
                    AND hi.DependenciaInstitucion = mi.DependenciaInstitucion
                )
              )
            )
        ";
        // En vista institucional, también incluimos los hilos personales propios del usuario (para contestar desde un solo lugar).
        $wherePer = "h.IdInstitucion = :iid2 AND COALESCE(h.EsInstitucional, 0) = 0
            AND (h.IdUsrParticipanteA = :uid5 OR h.IdUsrParticipanteB = :uid6)";
        $sql = "
            SELECT * FROM (
                SELECT {$sel} FROM mensaje_hilo h WHERE {$whereInst}
                UNION ALL
                SELECT {$sel} FROM mensaje_hilo h WHERE {$wherePer}
            ) u
            ORDER BY u._sort_ts DESC, u.IdMensajeHilo DESC
            LIMIT {$limit} OFFSET {$offset}
        ";
        $stmt = $this->db->prepare($sql);
        $params = [
            ':uid1' => $userId,
            ':uid2' => $userId,
            ':uid3' => $userId,
            ':uid4' => $userId,
            ':iid' => $instId,
            ':iid2' => $instId,
            ':uid5' => $userId,
            ':uid6' => $userId,
        ];
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            unset($r['_sort_ts']);
        }
        unset($r);

        return $this->enrichListaInterlocutor($rows, $userId);
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

    public function countUnreadInstitucional(int $userId, int $instId, int $role): int {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional')) {
            return 0;
        }
        if (!$this->esRolStaffInstitucional($role) && !$this->usuarioEnInstitucion($instId, $userId)) {
            return 0;
        }
        $ct = self::ORIGEN_INST_CONSULTA;
        $sql = "
            SELECT COUNT(*) FROM mensaje m
            INNER JOIN mensaje_hilo h ON h.IdMensajeHilo = m.IdMensajeHilo
            WHERE h.IdInstitucion = :iid
              AND m.IdUsrRemitente <> :uid
              AND NOT EXISTS (
                SELECT 1 FROM mensaje_leido ml
                WHERE ml.IdMensaje = m.IdMensaje AND ml.IdUsrLector = :uid2
              )
              AND (
                (
                  h.EsInstitucional = 1
                  AND (
                    (
                      h.IdInstitucion = :iid AND (
                        LOWER(TRIM(COALESCE(h.OrigenTipo, ''))) <> '{$ct}'
                        OR h.IdUsrParticipanteA = :uid3
                        OR (h.IdUsrParticipanteB IS NOT NULL AND h.IdUsrParticipanteB = :uid4)
                      )
                    )
                    OR (
                      LOWER(TRIM(COALESCE(h.OrigenTipo, ''))) = '{$ct}'
                      AND h.OrigenId = :iid
                      AND h.IdInstitucion <> :iid
                      AND EXISTS (
                        SELECT 1 FROM institucion mi
                        INNER JOIN institucion hi ON hi.IdInstitucion = h.IdInstitucion
                        WHERE mi.IdInstitucion = :iid
                          AND mi.DependenciaInstitucion IS NOT NULL AND TRIM(mi.DependenciaInstitucion) <> ''
                          AND hi.DependenciaInstitucion IS NOT NULL AND TRIM(hi.DependenciaInstitucion) <> ''
                          AND hi.DependenciaInstitucion = mi.DependenciaInstitucion
                      )
                    )
                  )
                )
                OR (
                  COALESCE(h.EsInstitucional, 0) = 0
                  AND (h.IdUsrParticipanteA = :uid5 OR h.IdUsrParticipanteB = :uid6)
                )
              )
        ";
        $stmt = $this->db->prepare($sql);
        $params = [
            ':iid' => $instId,
            ':uid' => $userId,
            ':uid2' => $userId,
            ':uid3' => $userId,
            ':uid4' => $userId,
            ':uid5' => $userId,
            ':uid6' => $userId,
        ];
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Acceso a un hilo: personal (A/B) o institucional (según tipo: comunicado sede / consulta privada a staff).
     */
    public function getHiloAccesible(int $hiloId, int $userId, int $instId, int $role = 0): ?array {
        $stmt = $this->db->prepare('SELECT * FROM mensaje_hilo WHERE IdMensajeHilo = ? LIMIT 1');
        $stmt->execute([$hiloId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        if ($this->hiloEsInstitucional($row)) {
            $hInst = (int) ($row['IdInstitucion'] ?? 0);
            $a = (int) ($row['IdUsrParticipanteA'] ?? 0);
            $bRaw = $row['IdUsrParticipanteB'] ?? null;
            $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : 0;
            $origenTipo = $this->origenTipoInstitucionalNormalizado($row);
            $origenIdRaw = $row['OrigenId'] ?? null;
            $origenId = ($origenIdRaw !== null && $origenIdRaw !== '') ? (int) $origenIdRaw : 0;
            // Consulta creada en sede A con destino sede B (red): el personal de B debe ver/responder con sesión en B.
            $esConsultaRedDestino = ($origenTipo === self::ORIGEN_INST_CONSULTA
                && $origenId > 0
                && $origenId === $instId
                && $hInst > 0
                && $hInst !== $instId
                && $this->institucionEnMismaRed($instId, $hInst));
            if (!$esConsultaRedDestino && $hInst !== $instId) {
                return null;
            }
            if (!$this->esRolStaffInstitucional($role) && !$this->usuarioEnInstitucion($instId, $userId)) {
                return null;
            }

            return $this->puedeVerHiloInstitucional($row, $userId, $role) ? $row : null;
        }
        $a = (int) ($row['IdUsrParticipanteA'] ?? 0);
        $bRaw = $row['IdUsrParticipanteB'] ?? null;
        $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : null;
        if ($b !== null) {
            return ($userId === $a || $userId === $b) ? $row : null;
        }

        return $userId === $a ? $row : null;
    }

    /**
     * Resumen de usuario para UI (nombre/apellido/usuario/id/institución, email y teléfonos desde personae).
     * Prioriza fila usuarioe de la institución de contexto si existe.
     *
     * @return array<string,mixed>|null
     */
    public function getUsuarioResumen(int $idUsrA, int $instIdContexto): ?array {
        if ($idUsrA <= 0) return null;
        // personae obligatorio; usuarioe opcional (staff puede ver interlocutor aunque no tenga sede en usuarioe).
        $stmt = $this->db->prepare("
            SELECT p.IdUsrA,
                   COALESCE(NULLIF(TRIM(u.UsrA), ''), '') AS Usuario,
                   COALESCE(p.NombreA,'') AS NombreA,
                   COALESCE(p.ApellidoA,'') AS ApellidoA,
                   COALESCE(NULLIF(TRIM(p.EmailA), ''), '') AS EmailA,
                   COALESCE(NULLIF(TRIM(p.TelefonoA), ''), '') AS TelefonoA,
                   COALESCE(NULLIF(TRIM(p.CelularA), ''), '') AS CelularA,
                   COALESCE(u.IdInstitucion, 0) AS IdInstitucion
            FROM personae p
            LEFT JOIN usuarioe u ON u.IdUsrA = p.IdUsrA
            WHERE p.IdUsrA = ?
            ORDER BY CASE WHEN u.IdInstitucion = ? THEN 0 ELSE 1 END, u.IdInstitucion ASC
            LIMIT 1
        ");
        $stmt->execute([$idUsrA, $instIdContexto]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        return [
            'IdUsrA' => (int) ($row['IdUsrA'] ?? 0),
            'Usuario' => (string) ($row['Usuario'] ?? ''),
            'NombreA' => (string) ($row['NombreA'] ?? ''),
            'ApellidoA' => (string) ($row['ApellidoA'] ?? ''),
            'EmailA' => trim((string) ($row['EmailA'] ?? '')),
            'TelefonoA' => trim((string) ($row['TelefonoA'] ?? '')),
            'CelularA' => trim((string) ($row['CelularA'] ?? '')),
            'IdInstitucion' => (int) ($row['IdInstitucion'] ?? 0),
        ];
    }

    /**
     * Resumen del interlocutor del hilo (el otro participante o autor del primer mensaje).
     *
     * @param array<string,mixed> $hiloRow
     *
     * @return array<string,mixed>|null
     */
    public function getResumenInterlocutorHilo(array $hiloRow, int $viewerUserId, int $instId): ?array {
        $uidOther = $this->resolveListaInterlocutorUserId($hiloRow, $viewerUserId);
        if ($uidOther <= 0) {
            $uidOther = $this->getPrimerRemitenteMensajeHilo((int) ($hiloRow['IdMensajeHilo'] ?? 0));
        }

        return $uidOther > 0 ? $this->getUsuarioResumen($uidOther, $instId) : null;
    }

    /**
     * Vista previa para eliminación total de un hilo: valida acceso y devuelve datos mínimos.
     *
     * @return array<string,mixed>|null
     */
    public function getDeletePreviewHilo(int $hiloId, int $userId, int $instId, int $role): ?array {
        $h = $this->getHiloRow($hiloId, $userId, $instId, $role);
        if (!$h) return null;
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM mensaje WHERE IdMensajeHilo = ?");
        $stmt->execute([$hiloId]);
        $cant = (int) $stmt->fetchColumn();
        return [
            'IdMensajeHilo' => (int) ($h['IdMensajeHilo'] ?? $hiloId),
            'IdInstitucion' => (int) ($h['IdInstitucion'] ?? 0),
            'EsInstitucional' => (int) ($h['EsInstitucional'] ?? 0),
            'OrigenTipo' => (string) ($h['OrigenTipo'] ?? ''),
            'Asunto' => (string) ($h['Asunto'] ?? ''),
            'FechaCreacion' => (string) ($h['FechaCreacion'] ?? ''),
            'FechaUltimoMensaje' => (string) ($h['FechaUltimoMensaje'] ?? ''),
            'IdUsrParticipanteA' => (int) ($h['IdUsrParticipanteA'] ?? 0),
            'IdUsrParticipanteB' => ($h['IdUsrParticipanteB'] ?? null),
            'mensajes' => $cant,
        ];
    }

    /**
     * Eliminación total de un hilo + mensajes + marcas de leído.
     */
    public function deleteHiloCascade(int $hiloId): void {
        $hiloId = (int) $hiloId;
        if ($hiloId <= 0) return;
        $this->db->beginTransaction();
        try {
            // Borrar leídos primero (FK por IdMensaje)
            if ($this->hasColumn('mensaje_leido', 'IdMensaje')) {
                $this->db->prepare("
                    DELETE ml FROM mensaje_leido ml
                    INNER JOIN mensaje m ON m.IdMensaje = ml.IdMensaje
                    WHERE m.IdMensajeHilo = ?
                ")->execute([$hiloId]);
            }
            $this->db->prepare("DELETE FROM mensaje WHERE IdMensajeHilo = ?")->execute([$hiloId]);
            $this->db->prepare("DELETE FROM mensaje_hilo WHERE IdMensajeHilo = ?")->execute([$hiloId]);
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getHiloRow(int $hiloId, int $userId, int $instId = 0, int $role = 0): ?array {
        if ($instId <= 0) {
            $stmt = $this->db->prepare('
                SELECT * FROM mensaje_hilo
                WHERE IdMensajeHilo = ? AND (IdUsrParticipanteA = ? OR IdUsrParticipanteB = ?)
                LIMIT 1
            ');
            $stmt->execute([$hiloId, $userId, $userId]);

            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        return $this->getHiloAccesible($hiloId, $userId, $instId, $role);
    }

    private function hiloEsInstitucional(array $row): bool {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional')) {
            return false;
        }

        return (int) ($row['EsInstitucional'] ?? 0) === 1;
    }

    public function getMensajesHilo(int $hiloId): array {
        $stmt = $this->db->prepare("
            SELECT
                m.*,
                COALESCE(p.NombreA, '') AS RemitenteNombre,
                COALESCE(p.ApellidoA, '') AS RemitenteApellido,
                COALESCE(u.UsrA, '') AS RemitenteUsuario
            FROM mensaje m
            LEFT JOIN personae p ON p.IdUsrA = m.IdUsrRemitente
            LEFT JOIN usuarioe u ON u.IdUsrA = m.IdUsrRemitente
            WHERE m.IdMensajeHilo = ?
            ORDER BY m.FechaEnvio ASC, m.IdMensaje ASC
        ");
        $stmt->execute([$hiloId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Para correos de respuesta: el mensaje publicado justo antes del último (el último es el recién insertado).
     *
     * @return array{cuerpo: string, autor: string}|null
     */
    public function getPenultimoMensajeEnHilo(int $hiloId): ?array {
        if ($hiloId <= 0) {
            return null;
        }
        $stmt = $this->db->prepare('
            SELECT m.Cuerpo, m.IdUsrRemitente,
                   TRIM(CONCAT(COALESCE(p.NombreA, \'\'), \' \', COALESCE(p.ApellidoA, \'\'))) AS RemitenteNombreCompleto
            FROM mensaje m
            LEFT JOIN personae p ON p.IdUsrA = m.IdUsrRemitente
            WHERE m.IdMensajeHilo = ?
            ORDER BY m.IdMensaje DESC
            LIMIT 1 OFFSET 1
        ');
        $stmt->execute([$hiloId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $cuerpo = trim(strip_tags((string) ($row['Cuerpo'] ?? '')));
        if ($cuerpo === '') {
            return null;
        }
        $autor = trim((string) ($row['RemitenteNombreCompleto'] ?? ''));
        if ($autor === '') {
            $autor = 'ID ' . (int) ($row['IdUsrRemitente'] ?? 0);
        }

        return ['cuerpo' => $cuerpo, 'autor' => $autor];
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
     * Listado para UI: formularios o alojamientos vinculados a un usuario (titular / responsable / titular protocolo).
     *
     * @return list<array{id:int, etiqueta:string, sub?:string}>
     */
    public function listAnexosContextoParaUsuario(
        int $instId,
        int $sobreUsuarioId,
        string $tipo,
        string $q,
        int $limit = 40
    ): array {
        $sobreUsuarioId = (int) $sobreUsuarioId;
        if ($instId <= 0 || $sobreUsuarioId <= 0) {
            return [];
        }
        $tipo = strtolower(trim($tipo));
        $q = trim($q);
        $limit = max(5, min(60, (int) $limit));
        $like = '%' . preg_replace('/[%_]/', '', $q) . '%';

        if ($tipo === 'formulario') {
            $hasEw = $this->hasColumn('formularioe', 'EstadoWorkflow');
            $ewSel = $hasEw ? 'f.EstadoWorkflow AS EstadoWorkflow' : 'NULL AS EstadoWorkflow';
            $sql = "
                SELECT f.idformA AS id,
                       f.tipoA AS tipoA,
                       f.estado AS estado,
                       {$ewSel},
                       f.fechainicioA AS fechainicioA,
                       f.fecRetiroA AS fecRetiroA
                FROM formularioe f
                WHERE f.IdInstitucion = ? AND f.IdUsrA = ?
            ";
            $params = [$instId, $sobreUsuarioId];
            if ($q !== '') {
                $sql .= ' AND (
                    CAST(f.idformA AS CHAR) LIKE ?
                    OR LOWER(COALESCE(f.tipoA, \'\')) LIKE LOWER(?)
                    OR LOWER(COALESCE(f.estado, \'\')) LIKE LOWER(?)';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
                if ($hasEw) {
                    $sql .= '
                    OR LOWER(COALESCE(f.EstadoWorkflow, \'\')) LIKE LOWER(?)';
                    $params[] = $like;
                }
                $sql .= '
                )';
            }
            $sql .= ' ORDER BY f.idformA DESC LIMIT ' . (int) $limit;
            $st = $this->db->prepare($sql);
            $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

            return array_map(static function (array $r): array {
                $id = (int) ($r['id'] ?? 0);
                $tipoA = trim((string) ($r['tipoA'] ?? ''));
                $est = trim((string) ($r['estado'] ?? ''));
                $ew = trim((string) ($r['EstadoWorkflow'] ?? ''));
                $fi = trim((string) ($r['fechainicioA'] ?? ''));
                $ff = trim((string) ($r['fecRetiroA'] ?? ''));
                $et = '#' . $id . ($tipoA !== '' ? ' · ' . $tipoA : '') . ($est !== '' ? ' · ' . $est : '');
                $sub = trim($fi . ($ff !== '' ? ' → ' . $ff : '') . ($ew !== '' ? ' · ' . $ew : ''));

                return ['id' => $id, 'etiqueta' => $et, 'sub' => $sub];
            }, $rows);
        }

        if ($tipo === 'alojamiento') {
            $sql = '
                SELECT DISTINCT a.historia AS id,
                       a.IdAlojamiento AS IdAlojamiento,
                       a.IdUsrA AS IdResponsable,
                       a.idprotA AS idprotA,
                       p.nprotA AS nprotA,
                       p.tituloA AS tituloProt,
                       p.IdUsrA AS IdTitularProt
                FROM alojamiento a
                LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA AND p.IdInstitucion = a.IdInstitucion
                WHERE a.IdInstitucion = ?
                  AND (a.IdUsrA = ? OR p.IdUsrA = ?)
            ';
            $params = [$instId, $sobreUsuarioId, $sobreUsuarioId];
            if ($q !== '') {
                $sql .= ' AND (
                    CAST(a.historia AS CHAR) LIKE ?
                    OR CAST(a.idprotA AS CHAR) LIKE ?
                    OR LOWER(COALESCE(p.nprotA, \'\')) LIKE LOWER(?)
                    OR LOWER(COALESCE(p.tituloA, \'\')) LIKE LOWER(?)
                )';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
            }
            $sql .= ' ORDER BY a.historia DESC LIMIT ' . (int) $limit;
            $st = $this->db->prepare($sql);
            $st->execute($params);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

            return array_map(static function (array $r): array {
                $hist = (int) ($r['id'] ?? 0);
                $nprot = trim((string) ($r['nprotA'] ?? ''));
                $tp = trim((string) ($r['tituloProt'] ?? ''));
                $idp = (int) ($r['idprotA'] ?? 0);
                $et = 'Hist. ' . $hist . ($nprot !== '' ? ' · ' . $nprot : ($idp > 0 ? ' · Prot. ' . $idp : ''));
                $sub = $tp !== '' ? mb_substr($tp, 0, 120) : '';

                return ['id' => $hist, 'etiqueta' => $et, 'sub' => $sub];
            }, $rows);
        }

        return [];
    }

    /**
     * Contexto opcional en un mensaje de respuesta: solo hilos personales; registro debe vincular a algún participante.
     *
     * @param array<string,mixed> $h
     */
    public function anexoOpcionalValidoParaHiloPersonal(array $h, int $instId, ?string $origenTipo, ?int $origenId, ?string $origenEtiqueta): bool {
        if ($this->hiloEsInstitucional($h)) {
            return ($origenTipo === null || trim((string) $origenTipo) === '')
                && ($origenId === null || (int) $origenId <= 0);
        }
        if ($origenTipo === null || trim((string) $origenTipo) === '' || $origenId === null || (int) $origenId <= 0) {
            return true;
        }
        $tipo = strtolower(trim((string) $origenTipo));
        if (!in_array($tipo, ['formulario', 'alojamiento'], true)) {
            return false;
        }
        $pa = (int) ($h['IdUsrParticipanteA'] ?? 0);
        $rawB = $h['IdUsrParticipanteB'] ?? null;
        $pb = ($rawB !== null && $rawB !== '') ? (int) $rawB : 0;
        $parts = array_values(array_unique(array_filter([$pa, $pb], static fn ($x) => $x > 0)));

        if ($tipo === 'formulario') {
            $tit = $this->getTitularFormularioInstitucion((int) $origenId, $instId);
            if ($tit === null) {
                return false;
            }

            return in_array((int) $tit, $parts, true);
        }

        $st = $this->db->prepare(
            'SELECT a.IdUsrA AS resp, p.IdUsrA AS titp
             FROM alojamiento a
             LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA AND p.IdInstitucion = a.IdInstitucion
             WHERE a.IdInstitucion = ? AND a.historia = ?
             LIMIT 1'
        );
        $st->execute([$instId, (int) $origenId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return false;
        }
        $resp = (int) ($row['resp'] ?? 0);
        $titp = (int) ($row['titp'] ?? 0);
        foreach ([$resp, $titp] as $u) {
            if ($u > 0 && in_array($u, $parts, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Usuarios de la misma institución (excl. uno), para selector de mensajes.
     */
    public function listUsuariosInstitucionParaMensaje(int $instId, int $excludeUserId): array {
        $stmt = $this->db->prepare("
            SELECT DISTINCT u.IdUsrA, u.UsrA AS Usuario, p.NombreA, p.ApellidoA, p.EmailA,
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
     * Investigadores (rol 3) de la institución, para destino en consultas institucionales.
     */
    public function listInvestigadoresInstitucionParaMensaje(int $instId, int $excludeUserId): array {
        $stmt = $this->db->prepare("
            SELECT DISTINCT u.IdUsrA, u.UsrA AS Usuario, p.NombreA, p.ApellidoA, p.EmailA,
                   u.IdInstitucion, i.NombreInst AS NombreInstitucion
            FROM usuarioe u
            JOIN personae p ON u.IdUsrA = p.IdUsrA
            JOIN institucion i ON i.IdInstitucion = u.IdInstitucion
            INNER JOIN tienetipor t ON t.IdUsrA = u.IdUsrA AND t.IdTipousrA = 3
            WHERE u.IdInstitucion = ? AND u.IdUsrA <> ?
            ORDER BY p.ApellidoA ASC, p.NombreA ASC
        ");
        $stmt->execute([$instId, $excludeUserId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @param int[] $tipos IdTipousrA (p. ej. staff 1,2,4,5,6 o investigador 3)
     * @return int[]
     */
    public function listIdsUsuariosConTiposInstitucion(int $instId, array $tipos): array {
        $tipos = array_values(array_filter(array_map('intval', $tipos), static fn ($v) => $v > 0));
        if ($tipos === [] || $instId <= 0) {
            return [];
        }
        $ph = implode(',', array_fill(0, count($tipos), '?'));
        $sql = "
            SELECT DISTINCT u.IdUsrA
            FROM usuarioe u
            INNER JOIN tienetipor t ON t.IdUsrA = u.IdUsrA AND t.IdTipousrA IN ($ph)
            WHERE u.IdInstitucion = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_merge($tipos, [$instId]));
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['IdUsrA'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }

        return $out;
    }

    public function usuarioEsInvestigadorEnInstitucion(int $instId, int $userId): bool {
        if ($instId <= 0 || $userId <= 0) {
            return false;
        }
        $stmt = $this->db->prepare('
            SELECT 1 FROM usuarioe u
            INNER JOIN tienetipor t ON t.IdUsrA = u.IdUsrA AND t.IdTipousrA = 3
            WHERE u.IdInstitucion = ? AND u.IdUsrA = ?
            LIMIT 1
        ');
        $stmt->execute([$instId, $userId]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Titular del formulario en una sede (validación de destinatario en popups).
     */
    public function getTitularFormularioInstitucion(int $formId, int $instId): ?int {
        if ($formId <= 0 || $instId <= 0) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT IdUsrA FROM formularioe WHERE idformA = ? AND IdInstitucion = ? LIMIT 1');
        $stmt->execute([$formId, $instId]);
        $v = $stmt->fetchColumn();
        if ($v === false) {
            return null;
        }
        $n = (int) $v;

        return $n > 0 ? $n : null;
    }

    public function listInstitucionesRedMismaDependencia(int $instId): array {
        $stmt = $this->db->prepare("
            SELECT i.IdInstitucion, i.NombreInst
            FROM institucion i
            INNER JOIN institucion mi ON mi.IdInstitucion = ?
            WHERE i.IdInstitucion <> ?
              AND mi.DependenciaInstitucion IS NOT NULL AND mi.DependenciaInstitucion <> ''
              AND i.DependenciaInstitucion = mi.DependenciaInstitucion
            ORDER BY i.NombreInst ASC
        ");
        $stmt->execute([$instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Otra sede pertenece a la misma dependencia (red) que la sede de referencia.
     */
    public function institucionEnMismaRed(int $instReferencia, int $instOtra): bool {
        if ($instOtra <= 0 || $instReferencia === $instOtra) {
            return $instReferencia === $instOtra && $instOtra > 0;
        }
        foreach ($this->listInstitucionesRedMismaDependencia($instReferencia) as $row) {
            if ((int) ($row['IdInstitucion'] ?? 0) === $instOtra) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sede cuyo personal (roles staff) debe recibir avisos por correo en una consulta institucional «abierta»
     * (sin IdUsrParticipanteB). Si la consulta es entre sedes de la red, los avisos van a la sede destinataria (OrigenId).
     */
    public function idInstitucionNotificacionConsultaAbierta(array $h): int {
        $hInst = (int) ($h['IdInstitucion'] ?? 0);
        $t = $this->origenTipoInstitucionalNormalizado($h);
        $bRaw = $h['IdUsrParticipanteB'] ?? null;
        $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : 0;
        if ($t !== self::ORIGEN_INST_CONSULTA || $b > 0) {
            return $hInst;
        }
        $oid = isset($h['OrigenId']) ? (int) $h['OrigenId'] : 0;
        if ($oid > 0 && $oid !== $hInst && $this->institucionEnMismaRed($hInst, $oid)) {
            return $oid;
        }

        return $hInst;
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
        $otNorm = strtolower(trim((string) $origenTipo));
        if (in_array($otNorm, ['formulario', 'notificacion'], true) && $origenId !== null && $origenId > 0) {
            $titular = $this->getTitularFormularioInstitucion($origenId, $instId);
            if ($titular === null) {
                return ['status' => 'error', 'message' => 'Formulario no encontrado en esta institución.'];
            }
            if ($titular !== $destinatarioId) {
                return ['status' => 'error', 'message' => 'El destinatario no coincide con el titular del formulario enlazado.'];
            }
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

    public function responder(
        int $instId,
        int $hiloId,
        int $remitenteId,
        string $cuerpo,
        int $role = 0,
        ?string $origenTipoMsg = null,
        ?int $origenIdMsg = null,
        ?string $origenEtiquetaMsg = null
    ): array {
        $h = $this->getHiloAccesible($hiloId, $remitenteId, $instId, $role);
        if (!$h) {
            return ['status' => 'error', 'message' => 'Hilo no encontrado.'];
        }
        if (!$this->hiloEsInstitucional($h) && (int) $role === 3) {
            return ['status' => 'error', 'message' => 'Los investigadores no responden en mensajes personales; use el buzón institucional.'];
        }
        if ($this->hiloEsInstitucional($h) && !$this->puedeResponderHiloInstitucional($h, $remitenteId, $role)) {
            return ['status' => 'error', 'message' => 'No tiene permiso para responder en este hilo.'];
        }
        $cuerpo = trim(strip_tags($cuerpo));
        if ($cuerpo === '') {
            return ['status' => 'error', 'message' => 'El mensaje no puede estar vacío.'];
        }

        $ot = $origenTipoMsg !== null ? strtolower(trim($origenTipoMsg)) : '';
        $oid = $origenIdMsg !== null ? (int) $origenIdMsg : 0;
        $oe = $origenEtiquetaMsg !== null ? trim(strip_tags((string) $origenEtiquetaMsg)) : '';
        if ($oe === '') {
            $oe = null;
        }
        if ($ot === '' || $oid <= 0) {
            $ot = null;
            $oid = null;
            $oe = null;
        } elseif ($this->hiloEsInstitucional($h)) {
            return ['status' => 'error', 'message' => 'No se puede anexar contexto en mensajes institucionales.'];
        } elseif (!$this->anexoOpcionalValidoParaHiloPersonal($h, $instId, $ot, $oid, $oe)) {
            return ['status' => 'error', 'message' => 'El contexto anexado no corresponde a los participantes del hilo.'];
        }

        $instMensaje = (int) ($h['IdInstitucion'] ?? 0);
        if ($instMensaje <= 0) {
            $instMensaje = $instId;
        }

        $colsMsg = ['IdMensajeHilo', 'IdInstitucion', 'IdUsrRemitente', 'Cuerpo', 'FechaEnvio'];
        $vals = [$hiloId, $instMensaje, $remitenteId, $cuerpo];
        $ph = ['?', '?', '?', '?', 'NOW()'];
        if ($ot !== null && $oid !== null && $oid > 0
            && $this->hasColumn('mensaje', 'OrigenTipo')
            && $this->hasColumn('mensaje', 'OrigenId')) {
            $colsMsg[] = 'OrigenTipo';
            $colsMsg[] = 'OrigenId';
            $ph[] = '?';
            $ph[] = '?';
            $vals[] = $ot;
            $vals[] = $oid;
            if ($this->hasColumn('mensaje', 'OrigenEtiqueta')) {
                $colsMsg[] = 'OrigenEtiqueta';
                $ph[] = '?';
                $vals[] = $oe;
            }
        }

        $stmt = $this->db->prepare('
            INSERT INTO mensaje (' . implode(', ', $colsMsg) . ')
            VALUES (' . implode(', ', $ph) . ')
        ');
        $stmt->execute($vals);

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

    /**
     * Slug de URL de la sede (misma columna que usa validate-inst / login).
     */
    public function getInstitucionSlug(int $instId): ?string {
        if ($instId <= 0) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT LOWER(TRIM(NombreInst)) AS s FROM institucion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $v = $stmt->fetchColumn();

        return $v ? (string) $v : null;
    }

    public function getNombreInstitucion(int $instId): string {
        $stmt = $this->db->prepare('SELECT NombreInst FROM institucion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $v = $stmt->fetchColumn();
        return $v !== false ? trim((string) $v) : '';
    }

    /**
     * Resuelve el tipo de hilo institucional nuevo y comprueba permisos de creación.
     *
     * @return array{status:string, tipo?:string, message?:string}
     */
    private function resolverTipoCreacionInstitucional(?string $origenTipo, int $role): array {
        $t = strtolower(trim((string) $origenTipo));
        if ($t === self::ORIGEN_INST_CONSULTA) {
            return ['status' => 'ok', 'tipo' => self::ORIGEN_INST_CONSULTA];
        }
        if ($t === self::ORIGEN_INST_COMUNICADO) {
            if (!$this->esRolStaffInstitucional($role)) {
                return ['status' => 'error', 'message' => 'Solo el personal autorizado puede publicar un comunicado institucional.'];
            }

            return ['status' => 'ok', 'tipo' => self::ORIGEN_INST_COMUNICADO];
        }
        // Legacy "institucional" o vacío: staff → comunicado; investigador → consulta a la institución
        if ($t === 'institucional' || $t === '') {
            if ($this->esRolStaffInstitucional($role)) {
                return ['status' => 'ok', 'tipo' => self::ORIGEN_INST_COMUNICADO];
            }

            return ['status' => 'ok', 'tipo' => self::ORIGEN_INST_CONSULTA];
        }

        if (!$this->esRolStaffInstitucional($role)) {
            return ['status' => 'error', 'message' => 'Tipo de mensaje institucional no permitido para su rol.'];
        }

        return ['status' => 'ok', 'tipo' => self::ORIGEN_INST_COMUNICADO];
    }

    /**
     * Nuevo hilo institucional: comunicado de gestión (toda la sede) o consulta a la institución (autor + staff).
     */
    public function crearHiloInstitucional(
        int $instId,
        int $remitenteId,
        string $asunto,
        string $cuerpo,
        ?string $origenTipo,
        ?int $origenId,
        ?string $origenEtiqueta,
        int $role = 0,
        ?int $instDestinoId = null,
        ?int $idInvestigadorDestino = null
    ): array {
        if (!$this->hasColumn('mensaje_hilo', 'EsInstitucional')) {
            return ['status' => 'error', 'message' => 'El buzón institucional no está disponible. Ejecute la migración de base de datos.'];
        }
        // Staff institucional puede operar en contexto de sede aunque no exista fila usuarioe exacta (casos legacy / tokens).
        // Investigador requiere pertenencia estricta.
        if (!$this->esRolStaffInstitucional($role) && !$this->usuarioEnInstitucion($instId, $remitenteId)) {
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

        $resTipo = $this->resolverTipoCreacionInstitucional($origenTipo, $role);
        if (($resTipo['status'] ?? '') !== 'ok') {
            return ['status' => 'error', 'message' => $resTipo['message'] ?? 'No se pudo crear el mensaje.'];
        }
        $tipoGuardar = (string) $resTipo['tipo'];
        $destInst = ($instDestinoId !== null && (int)$instDestinoId > 0) ? (int)$instDestinoId : null;
        if ($destInst !== null && $destInst !== $instId && !$this->institucionEnMismaRed($instId, $destInst)) {
            return ['status' => 'error', 'message' => 'Institución destino no válida para su red.'];
        }
        // Regla: el hilo institucional siempre queda en la sede remitente (instId).
        // Si hay institución destino (red), se guarda como referencia (OrigenId/Etiqueta) sin cambiar la propiedad del hilo.
        if ($destInst !== null) {
            if ($origenId === null || (int)$origenId <= 0) {
                $origenId = $destInst;
            }
            if ($origenEtiqueta === null || trim((string)$origenEtiqueta) === '') {
                $origenEtiqueta = $this->getNombreInstitucion($destInst);
            }
        }

        $idInvDest = $idInvestigadorDestino !== null && $idInvestigadorDestino > 0 ? (int) $idInvestigadorDestino : 0;
        $partA = $remitenteId;
        $partB = null;
        if ($idInvDest > 0) {
            // Hilo dirigido a una persona: siempre debe ser una consulta (respondible), nunca un comunicado de solo lectura.
            $tipoGuardar = self::ORIGEN_INST_CONSULTA;
            if ($tipoGuardar !== self::ORIGEN_INST_CONSULTA) {
                return ['status' => 'error', 'message' => 'Solo las consultas pueden dirigirse a un investigador concreto.'];
            }
            if (!$this->esRolStaffInstitucional($role)) {
                return ['status' => 'error', 'message' => 'No tiene permiso para dirigir la consulta a un investigador.'];
            }
            $instValidarInv = $destInst !== null ? $destInst : $instId;
            // En mensajería institucional, el destino puede ser cualquier usuario de la sede (no solo investigador).
            if (!$this->usuarioEnInstitucion($instValidarInv, $idInvDest)) {
                return ['status' => 'error', 'message' => 'Destinatario inválido para esa sede.'];
            }
            if ($idInvDest === $remitenteId) {
                return ['status' => 'error', 'message' => 'El destinatario no puede ser usted mismo.'];
            }
            [$partA, $partB] = $this->normalizeParticipantes($remitenteId, $idInvDest);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO mensaje_hilo
                (IdInstitucion, Asunto, IdUsrParticipanteA, IdUsrParticipanteB, FechaCreacion, FechaUltimoMensaje,
                 OrigenTipo, OrigenId, OrigenEtiqueta, EsInstitucional)
                VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, 1)
            ");
            $stmt->execute([
                $instId,
                $asunto,
                $partA,
                $partB,
                $tipoGuardar,
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

    /**
     * Fila cruda del hilo (sin comprobar permisos). Para distinguir 404 vs «existe pero no es suyo».
     */
    public function fetchHiloRawById(int $hiloId): ?array {
        if ($hiloId <= 0) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT * FROM mensaje_hilo WHERE IdMensajeHilo = ? LIMIT 1');
        $stmt->execute([$hiloId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
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

    /**
     * Id del autor del primer mensaje del hilo (fallback cuando no hay segundo participante).
     */
    private function getPrimerRemitenteMensajeHilo(int $hiloId): int {
        if ($hiloId <= 0) {
            return 0;
        }
        $stmt = $this->db->prepare(
            'SELECT IdUsrRemitente FROM mensaje WHERE IdMensajeHilo = ? ORDER BY FechaEnvio ASC, IdMensaje ASC LIMIT 1'
        );
        $stmt->execute([$hiloId]);
        $v = $stmt->fetchColumn();

        return $v !== false ? (int) $v : 0;
    }

    /**
     * El «otro» participante 1:1; 0 si el visitante es único referido y B es null.
     *
     * @param array<string,mixed> $row
     */
    private function resolveListaInterlocutorUserId(array $row, int $viewerUserId): int {
        $idA = (int) ($row['IdUsrParticipanteA'] ?? 0);
        $rawB = $row['IdUsrParticipanteB'] ?? null;
        $idB = ($rawB !== null && $rawB !== '') ? (int) $rawB : 0;
        if ($idA === $viewerUserId) {
            return $idB > 0 ? $idB : 0;
        }

        return $idA > 0 ? $idA : 0;
    }

    /**
     * Datos de persona para fila de lista (izquierda) sin abrir el hilo.
     *
     * @param list<array<string,mixed>> $rows
     *
     * @return list<array<string,mixed>>
     */
    private function enrichListaInterlocutor(array $rows, int $viewerUserId): array {
        foreach ($rows as &$r) {
            $instCtx = (int) ($r['IdInstitucion'] ?? 0);
            $uid = $this->resolveListaInterlocutorUserId($r, $viewerUserId);
            if ($uid <= 0) {
                $uid = $this->getPrimerRemitenteMensajeHilo((int) ($r['IdMensajeHilo'] ?? 0));
            }
            $sum = ($uid > 0) ? $this->getUsuarioResumen($uid, $instCtx) : null;
            $r['ListaInterId'] = $sum ? (int) ($sum['IdUsrA'] ?? $uid) : ($uid > 0 ? $uid : 0);
            $r['ListaInterNombre'] = $sum ? trim((string) ($sum['NombreA'] ?? '')) : '';
            $r['ListaInterApellido'] = $sum ? trim((string) ($sum['ApellidoA'] ?? '')) : '';
            $r['ListaInterUsuario'] = $sum ? trim((string) ($sum['Usuario'] ?? '')) : '';
        }
        unset($r);

        return $rows;
    }
}
