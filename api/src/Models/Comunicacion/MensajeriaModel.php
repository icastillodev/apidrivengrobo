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

    public function destinatarioPermitidoParaMensaje(int $instRemitente, int $destinatarioId): bool {
        return $this->usuarioEnInstitucion($instRemitente, $destinatarioId)
            || $this->usuarioEnRedMismaDependencia($instRemitente, $destinatarioId);
    }

    /**
     * Participantes ordenados (min, max) para consistencia.
     */
    private function normalizeParticipantes(int $a, int $b): array {
        return $a < $b ? [$a, $b] : [$b, $a];
    }

    public function getHilos(int $userId, int $page, int $limit): array {
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
            WHERE (h.IdUsrParticipanteA = :uid3 OR h.IdUsrParticipanteB = :uid4)
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

    public function countUnreadTotal(int $userId): int {
        $sql = "
            SELECT COUNT(*) FROM mensaje m
            INNER JOIN mensaje_hilo h ON h.IdMensajeHilo = m.IdMensajeHilo
            WHERE (h.IdUsrParticipanteA = :uid OR h.IdUsrParticipanteB = :uid2)
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

    public function getHiloRow(int $hiloId, int $userId): ?array {
        $stmt = $this->db->prepare("
            SELECT * FROM mensaje_hilo
            WHERE IdMensajeHilo = ?
              AND (IdUsrParticipanteA = ? OR IdUsrParticipanteB = ?)
            LIMIT 1
        ");
        $stmt->execute([$hiloId, $userId, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
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
            SELECT u.IdUsrA, u.UsrA AS Usuario, p.NombreA, p.ApellidoA
            FROM usuarioe u
            JOIN personae p ON u.IdUsrA = p.IdUsrA
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
        if (!$this->destinatarioPermitidoParaMensaje($instId, $destinatarioId)) {
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
        $h = $this->getHiloRow($hiloId, $remitenteId);
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
}
