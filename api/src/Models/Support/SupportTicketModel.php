<?php
namespace App\Models\Support;

use PDO;

class SupportTicketModel
{
    private $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getUserEmailAndName(int $userId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT p.EmailA, p.NombreA, p.ApellidoA, u.UsrA,
                    COALESCE(NULLIF(TRIM(p.idioma_preferido), \'\'), \'es\') AS lang
             FROM usuarioe u
             LEFT JOIN personae p ON p.IdUsrA = u.IdUsrA
             WHERE u.IdUsrA = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function getNombreInstitucion(?int $instId): string
    {
        if ($instId === null || $instId <= 0) {
            return '';
        }
        $stmt = $this->db->prepare('SELECT NombreInst FROM institucion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $v = $stmt->fetchColumn();

        return $v ? (string) $v : '';
    }

    public function createTicket(int $userId, ?int $instId, string $asunto, string $cuerpo): int
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO support_ticket (IdUsrA, IdInstitucion, asunto, estado)
                 VALUES (?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId,
                $instId !== null && $instId > 0 ? $instId : null,
                $asunto,
                'espera_soporte',
            ]);
            $id = (int) $this->db->lastInsertId();

            $m = $this->db->prepare(
                'INSERT INTO support_ticket_mensaje (IdSupportTicket, es_soporte, IdUsrA, cuerpo)
                 VALUES (?, 0, ?, ?)'
            );
            $m->execute([$id, $userId, $cuerpo]);

            $this->db->commit();

            return $id;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function assertCanAccessTicket(int $ticketId, int $userId, int $role): array
    {
        $stmt = $this->db->prepare('SELECT * FROM support_ticket WHERE IdSupportTicket = ? LIMIT 1');
        $stmt->execute([$ticketId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \RuntimeException('Ticket no encontrado.');
        }
        if ($role !== 1 && (int) $row['IdUsrA'] !== $userId) {
            throw new \RuntimeException('No autorizado a ver este ticket.');
        }

        return $row;
    }

    /**
     * @return array{items: array<int, array<string,mixed>>, total: int}
     */
    public function listTickets(int $userId, int $role, int $page, int $limit): array
    {
        $page = max(1, $page);
        $limit = min(50, max(5, $limit));
        $off = ($page - 1) * $limit;

        if ($role === 1) {
            $sqlCount = 'SELECT COUNT(*) FROM support_ticket';
            $total = (int) $this->db->query($sqlCount)->fetchColumn();

            $sql = "SELECT t.*,
                    p.NombreA, p.ApellidoA, u.UsrA,
                    i.NombreInst
                FROM support_ticket t
                INNER JOIN usuarioe u ON u.IdUsrA = t.IdUsrA
                LEFT JOIN personae p ON p.IdUsrA = t.IdUsrA
                LEFT JOIN institucion i ON i.IdInstitucion = t.IdInstitucion
                ORDER BY t.FechaActualizacion DESC
                LIMIT {$limit} OFFSET {$off}";
            $items = $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $c = $this->db->prepare('SELECT COUNT(*) FROM support_ticket WHERE IdUsrA = ?');
            $c->execute([$userId]);
            $total = (int) $c->fetchColumn();

            $stmt = $this->db->prepare(
                "SELECT t.*,
                    p.NombreA, p.ApellidoA, u.UsrA,
                    i.NombreInst
                FROM support_ticket t
                INNER JOIN usuarioe u ON u.IdUsrA = t.IdUsrA
                LEFT JOIN personae p ON p.IdUsrA = t.IdUsrA
                LEFT JOIN institucion i ON i.IdInstitucion = t.IdInstitucion
                WHERE t.IdUsrA = ?
                ORDER BY t.FechaActualizacion DESC
                LIMIT {$limit} OFFSET {$off}"
            );
            $stmt->execute([$userId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return ['items' => $items ?: [], 'total' => $total];
    }

    /**
     * @return array{ticket: array<string,mixed>, mensajes: array<int, array<string,mixed>>}
     */
    public function getTicketWithMessages(int $ticketId, int $userId, int $role): array
    {
        $ticket = $this->assertCanAccessTicket($ticketId, $userId, $role);

        $stmt = $this->db->prepare(
            'SELECT m.*, u.UsrA, p.NombreA, p.ApellidoA
             FROM support_ticket_mensaje m
             INNER JOIN usuarioe u ON u.IdUsrA = m.IdUsrA
             LEFT JOIN personae p ON p.IdUsrA = m.IdUsrA
             WHERE m.IdSupportTicket = ?
             ORDER BY m.FechaCreacion ASC, m.IdMensaje ASC'
        );
        $stmt->execute([$ticketId]);
        $mensajes = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $stmtU = $this->db->prepare(
            'SELECT u.UsrA, p.NombreA, p.ApellidoA
             FROM usuarioe u
             LEFT JOIN personae p ON p.IdUsrA = u.IdUsrA
             WHERE u.IdUsrA = ? LIMIT 1'
        );
        $stmtU->execute([(int) $ticket['IdUsrA']]);
        $rowU = $stmtU->fetch(PDO::FETCH_ASSOC);
        if ($rowU) {
            $ticket['UsrA'] = $rowU['UsrA'];
            $ticket['NombreA'] = $rowU['NombreA'];
            $ticket['ApellidoA'] = $rowU['ApellidoA'];
        }
        $iid = isset($ticket['IdInstitucion']) && $ticket['IdInstitucion'] !== null && (int) $ticket['IdInstitucion'] > 0
            ? (int) $ticket['IdInstitucion']
            : null;
        $ticket['NombreInst'] = $this->getNombreInstitucion($iid);

        return ['ticket' => $ticket, 'mensajes' => $mensajes];
    }

    public function addReply(int $ticketId, int $authorId, bool $esSoporte, string $cuerpo, string $nuevoEstado): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO support_ticket_mensaje (IdSupportTicket, es_soporte, IdUsrA, cuerpo)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$ticketId, $esSoporte ? 1 : 0, $authorId, $cuerpo]);

        $u = $this->db->prepare('UPDATE support_ticket SET estado = ? WHERE IdSupportTicket = ?');
        $u->execute([$nuevoEstado, $ticketId]);
    }

    public function cerrarTicket(int $ticketId): void
    {
        $stmt = $this->db->prepare("UPDATE support_ticket SET estado = 'cerrado' WHERE IdSupportTicket = ?");
        $stmt->execute([$ticketId]);
    }
}
