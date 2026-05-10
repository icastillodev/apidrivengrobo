<?php
namespace App\Models\Admin;
use PDO;

class BitacoraModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    /** @deprecated Preferir getLogsPaged; conserva tope 5000 por compatibilidad. */
    public function getFullLogs() {
        return $this->getLogsPaged(5000, 0, null, null, null);
    }

    private function institucionExprSql(): string {
        return "CASE 
                    WHEN u.IdInstitucion = 0 OR u.IdInstitucion IS NULL THEN 'SISTEMA GLOBAL'
                    ELSE COALESCE(i.NombreInst, 'Sede Desconocida')
                END";
    }

    private function usuarioNameExprSql(): string {
        return "CASE 
                    WHEN b.id_usuario = 0 THEN 'Sistema / Usuario Externo'
                    ELSE COALESCE(CONCAT(p.NombreA, ' ', p.ApellidoA, ' (', u.UsrA, ')'), 'Desconocido') 
                END";
    }

    private function baseFromSql(): string {
        return "FROM bitacora b
                LEFT JOIN usuarioe u ON b.id_usuario = u.IdUsrA
                LEFT JOIN personae p ON b.id_usuario = p.IdUsrA
                LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion";
    }

    /**
     * @return array{0: string, 1: array<int, mixed>}
     */
    private function buildFilters(?string $q, ?string $accion, ?string $inst): array {
        $parts = [];
        $params = [];

        if ($accion !== null && $accion !== '' && strcasecmp($accion, 'all') !== 0) {
            $parts[] = 'b.accion LIKE ?';
            $params[] = '%' . $accion . '%';
        }

        if ($inst !== null && $inst !== '' && strcasecmp($inst, 'all') !== 0) {
            $parts[] = '(' . $this->institucionExprSql() . ') = ?';
            $params[] = $inst;
        }

        if ($q !== null && trim($q) !== '') {
            $needle = strtolower(trim($q));
            $qq = '%' . addcslashes($needle, '%_\\') . '%';
            $parts[] = '(LOWER(COALESCE(b.detalle,\'\')) LIKE ?
                OR LOWER(COALESCE(b.tabla_afectada,\'\')) LIKE ?
                OR LOWER(COALESCE(b.accion,\'\')) LIKE ?
                OR LOWER(COALESCE(u.UsrA,\'\')) LIKE ?
                OR LOWER(CONCAT(COALESCE(p.NombreA,\'\'), \' \', COALESCE(p.ApellidoA,\'\'))) LIKE ?
                OR CAST(b.id_bitacora AS CHAR) LIKE ?
                OR LOWER(DATE_FORMAT(b.fecha_hora, \'%d/%m/%Y %H:%i:%s\')) LIKE ?)';
            for ($i = 0; $i < 7; $i++) {
                $params[] = $qq;
            }
        }

        $where = $parts === [] ? '' : (' WHERE ' . implode(' AND ', $parts));

        return [$where, $params];
    }

    public function countLogsFiltered(?string $q, ?string $accion, ?string $inst): int {
        [$where, $params] = $this->buildFilters($q, $accion, $inst);
        $sql = 'SELECT COUNT(*) AS c ' . $this->baseFromSql() . $where;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    public function getLogsPaged(int $limit, int $offset, ?string $q, ?string $accion, ?string $inst): array {
        [$where, $params] = $this->buildFilters($q, $accion, $inst);
        $limit = max(0, $limit);
        $offset = max(0, $offset);

        $instEx = $this->institucionExprSql();
        $usrEx = $this->usuarioNameExprSql();

        $sql = "SELECT 
                    b.id_bitacora,
                    b.id_usuario,
                    b.accion,
                    b.tabla_afectada,
                    b.detalle,
                    DATE_FORMAT(b.fecha_hora, '%d/%m/%Y %H:%i:%s') as fecha_hora,
                    {$usrEx} as UsuarioName,
                    {$instEx} as Institucion
                " . $this->baseFromSql() . $where . "
                ORDER BY b.id_bitacora DESC
                LIMIT {$limit} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Etiquetas de sede presentes en bitácora (mismo criterio que columna Institucion del listado). */
    public function listInstitucionesDistinctForFilter(): array {
        $instEx = $this->institucionExprSql();
        $sql = "SELECT DISTINCT {$instEx} AS Institucion
                " . $this->baseFromSql() . "
                ORDER BY Institucion ASC";
        $stmt = $this->db->query($sql);
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
        $out = [];
        foreach ($rows as $label) {
            if ($label !== null && $label !== '') {
                $out[] = (string) $label;
            }
        }

        return $out;
    }
}
