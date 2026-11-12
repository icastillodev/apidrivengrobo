<?php
declare(strict_types=1);

namespace App\Models\Billing;

use PDO;
use PDOStatement;

/**
 * Lectura paginada/filtrada de historialpago por institución.
 * Nunca modifica saldos. Filtros preparados sin interpolación de usuario.
 */
final class BillingAuditReader
{
    private PDO $db;
    private ?bool $transfer = null;
    private ?bool $comment = null;

    public function __construct(PDO $db) { $this->db = $db; }

    private function hasColumn(string $column): bool
    {
        try {
            $stmt = $this->db->prepare('SHOW COLUMNS FROM historialpago LIKE ?');
            $stmt->execute([$column]);
            return (bool)$stmt->fetchColumn();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * @return array{0:string,1:array,2:string}
     */
    private function queryParts(int $instId, array $filters): array
    {
        if ($instId <= 0) {
            throw new \InvalidArgumentException('Institución inválida.');
        }
        $this->transfer ??= $this->hasColumn('IdentificadorTransferencia');
        $this->comment ??= $this->hasColumn('Comentario');

        $column = (string)($filters['column'] ?? 'all');
        $validColumns = ['all', 'Investigador', 'Admin', 'Ref', 'Transferencia', 'Comentario'];
        if (!in_array($column, $validColumns, true)) {
            throw new \InvalidArgumentException('Columna de búsqueda inválida.');
        }
        $where = ['h.IdInstitucion = ?'];
        $args = [$instId];
        $idUsr = (int)($filters['user_id'] ?? 0);
        if ($idUsr > 0) {
            $where[] = 'h.IdUsrA = ?';
            $args[] = $idUsr;
        }
        $type = trim((string)($filters['type'] ?? 'all'));
        if ($type !== '' && $type !== 'all') {
            if (strlen($type) > 64 || preg_match('/[^a-zA-Z_0-9]/', $type)) {
                throw new \InvalidArgumentException('Tipo de movimiento inválido.');
            }
            $where[] = 'h.TipoHistorial = ?';
            $args[] = $type;
        }
        $search = trim((string)($filters['search'] ?? ''));
        if ($search !== '') {
            if (strlen($search) > 160) {
                throw new \InvalidArgumentException('Búsqueda demasiado larga.');
            }
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search);
            $q = '%' . $escaped . '%';
            $names = [
                'Investigador' => "CONCAT_WS(' ', u.NombreA, u.ApellidoA)",
                'Admin' => "CONCAT_WS(' ', a.NombreA, a.ApellidoA)",
                'Ref' => 'CAST(h.IdFormA AS CHAR)',
                'Transferencia' => $this->transfer ? 'h.IdentificadorTransferencia' : 'NULL',
                'Comentario' => $this->comment ? 'h.Comentario' : 'NULL',
            ];
            if ($column === 'all') {
                $expressions = [
                    "CONCAT_WS(' ', u.NombreA, u.ApellidoA)",
                    "CONCAT_WS(' ', a.NombreA, a.ApellidoA)",
                    'CAST(h.IdFormA AS CHAR)',
                    'CAST(h.IdHistoPago AS CHAR)',
                    'h.TipoHistorial',
                    $this->transfer ? 'h.IdentificadorTransferencia' : 'NULL',
                    $this->comment ? 'h.Comentario' : 'NULL',
                ];
            } else {
                $expressions = [$names[$column]];
            }
            $comparisons = [];
            foreach ($expressions as $expr) {
                $comparisons[] = "COALESCE($expr, '') LIKE ? ESCAPE '!'";
                $args[] = $q;
            }
            $where[] = '(' . implode(' OR ', $comparisons) . ')';
        }
        $from = ' FROM historialpago h
                  LEFT JOIN personae a ON h.IdUsrAAdmin = a.IdUsrA
                  LEFT JOIN personae u ON h.IdUsrA = u.IdUsrA
                  WHERE ' . implode(' AND ', $where);
        $columns = 'SELECT h.IdHistoPago, h.IdUsrA, h.Monto, h.IdFormA,
                  h.fecha, h.TipoHistorial,
                  ' . ($this->transfer ? 'h.IdentificadorTransferencia' : 'NULL AS IdentificadorTransferencia')
                    . ', ' . ($this->comment ? 'h.Comentario' : 'NULL AS Comentario') . ',
                  CONCAT(a.NombreA, \' \', a.ApellidoA) AS AdminCompleto,
                  CONCAT(u.NombreA, \' \', u.ApellidoA) AS UsrCompleto';
        return [$from, $args, $columns];
    }

    private function statement(string $sql, array $params, ?int $limit=null, ?int $offset=null): PDOStatement
    {
        $stmt = $this->db->prepare($sql);
        $idx = 1;
        foreach ($params as $param) {
            $stmt->bindValue($idx++, $param, is_int($param) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        if ($limit !== null) {
            $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
            $stmt->bindValue($idx++, $offset ?? 0, PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt;
    }

    /**
     * @return array{rows:array,total:int,page:int,per_page:int,pages:int}
     */
    public function page(int $instId, array $filters, int $page=1, int $perPage=15): array
    {
        $perPage = max(1, min(100, $perPage));
        $page = max(1, min(100000, $page));
        [$from,$params,$columns] = $this->queryParts($instId,$filters);
        $total = max(0, (int)$this->statement('SELECT COUNT(*)' . $from,$params)->fetchColumn());
        $pages = max(1, (int)ceil($total/$perPage));
        $page = min($page,$pages);
        $rows = $this->statement(
            $columns.$from.' ORDER BY h.fecha DESC, h.IdHistoPago DESC LIMIT ? OFFSET ?',
            $params,$perPage,($page-1)*$perPage
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return ['rows'=>$rows,'total'=>$total,'page'=>$page,'per_page'=>$perPage,'pages'=>$pages];
    }

    /** Solo para exportación explícita: iterar sin crear una lista de miles de objetos PHP. */
    public function cursor(int $instId, array $filters): PDOStatement
    {
        [$from,$params,$columns] = $this->queryParts($instId,$filters);
        return $this->statement($columns.$from.' ORDER BY h.fecha DESC, h.IdHistoPago DESC',$params);
    }
}
