<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/api/src/Models/UserForms/UserFormsModel.php';

use App\Models\UserForms\UserFormsModel;

final class MyFormsFixtureDb {
    /** @var list<array{sql:string,params:array}> */
    public array $queries = [];
    public function prepare(string $sql): MyFormsFixtureStmt {
        return new MyFormsFixtureStmt($this, $sql);
    }
}

final class MyFormsFixtureStmt {
    private array $params = [];
    private int $cursor = 0;
    public function __construct(private MyFormsFixtureDb $db, private string $sql) {}
    public function execute(array $params = []): bool {
        $this->params = $params;
        $this->db->queries[] = ['sql' => $this->sql, 'params' => $params];
        return true;
    }
    public function fetch(int $mode = PDO::FETCH_ASSOC): array|false {
        if (str_contains($this->sql, 'SHOW TABLES')) {
            return $this->params[0] === 'formulario_derivacion' ? ['formulario_derivacion'] : false;
        }
        if (str_contains($this->sql, 'SHOW COLUMNS')) {
            $cols = ['EstadoWorkflow', 'DerivadoActivo', 'IdInstitucionOrigen', 'idformAOrigen'];
            return in_array($this->params[0], $cols, true) ? ['Field' => $this->params[0]] : false;
        }
        if (str_contains($this->sql, 'SELECT NombreInst, InstCorreo, InstContacto FROM institucion')) {
            return ['NombreInst' => 'URBE', 'InstCorreo' => '', 'InstContacto' => ''];
        }
        if (str_contains($this->sql, 'SELECT idformA, IdInstitucion FROM formularioe WHERE')) {
            return [['idformA' => 301, 'IdInstitucion' => 12], ['idformA' => 300, 'IdInstitucion' => 12]][$this->cursor++] ?? false;
        }
        if (str_contains($this->sql, 'SELECT IdInstitucion, NombreInst, InstCorreo, InstContacto FROM institucion')) {
            return $this->cursor++ === 0
                ? ['IdInstitucion' => 12, 'NombreInst' => 'URBE', 'InstCorreo' => '', 'InstContacto' => '']
                : false;
        }
        return false;
    }
    public function fetchColumn(int $column = 0): int|false {
        return str_contains($this->sql, 'COUNT(*)') ? 3 : false;
    }
    public function fetchAll(int $mode = PDO::FETCH_ASSOC): array {
        if (str_contains($this->sql, 'SELECT f.idformA FROM formularioe f')) return [301, 300];
        if (str_contains($this->sql, 'SELECT DISTINCT i.NombreInst')) return ['CUPAE', 'URBE'];
        if (str_contains($this->sql, 'SELECT DISTINCT io.NombreInst')) return ['URBE'];
        if (str_contains($this->sql, 'SELECT IdFormularioDerivacion, idformA')) return [];
        if (!str_contains($this->sql, 'INNER JOIN institucion i ON f.IdInstitucion')) return [];

        $a = [
            'idformA' => 301, 'Inicio' => '2026-11-11', 'Retiro' => '',
            'estado' => 'Proceso', 'DerivadoActivo' => 0, 'IdInstitucionOrigen' => null,
            'monto_total_facturado' => 80, 'monto_pagado' => 30, 'exento_form' => 0,
        ];
        $b = [
            'idformA' => 300, 'Inicio' => '2026-11-10', 'Retiro' => '',
            'estado' => 'Entregado', 'DerivadoActivo' => 0, 'IdInstitucionOrigen' => null,
            'monto_total_facturado' => 20, 'monto_pagado' => 20, 'exento_form' => 1,
        ];
        return [$a, $a, $b]; // simulación de filas duplicadas por JOIN de departamentos.
    }
}

function expect(bool $good, string $message): void {
    if (!$good) throw new RuntimeException($message);
}

$db = new MyFormsFixtureDb();
$model = new UserFormsModel($db);
$paged = $model->getAllForms(99, 12, ['limit' => 2, 'offset' => 0]);
expect($paged['total'] === 3 && $paged['limit'] === 2, 'Total/page-size incorrect');
expect(count($paged['list']) === 2, 'JOIN duplicate was not removed');
expect(array_column($paged['list'], 'idformA') === [301, 300], 'Wrong canonical IDs');
expect((float)$paged['list'][0]['falta_pagar'] === 50.0, 'Payment calculation changed');
expect((float)$paged['list'][1]['falta_pagar'] === 0.0, 'Exemption changed');

$ids = array_values(array_filter($db->queries, fn($q) => str_contains($q['sql'], 'SELECT f.idformA FROM formularioe f')));
expect(count($ids) === 1, 'Expected one bounded canonical-ID query');
expect(str_contains($ids[0]['sql'], 'LIMIT 2 OFFSET 0'), 'Missing stable limit/offset');
expect($ids[0]['params'] === [99, 99, 12], 'Tenant restriction not from session');

$select = array_values(array_filter($db->queries, fn($q) => str_contains($q['sql'], 'INNER JOIN institucion i ON f.IdInstitucion')));
expect(count($select) === 1, 'Expected detail query limited to page IDs');
expect(str_contains($select[0]['sql'], 'f.idformA IN (?,?)'), 'Detail query unbounded');
expect($select[0]['params'] === [99, 99, 12, 301, 300], 'Wrong detail parameters');

$meta = $model->getMyFormsFilterMeta(99, 12);
expect($meta['instituciones'] === ['CUPAE', 'URBE'], 'Institution filter metadata changed');
expect($meta['origenes'] === ['URBE'], 'Origin metadata changed');
$metaQueries = array_values(array_filter($db->queries, fn($q) => str_contains($q['sql'], 'SELECT DISTINCT')));
expect(count($metaQueries) === 2, 'Expected two bounded metadata queries');
foreach ($metaQueries as $q) {
    expect($q['params'] === [99, 99, 12], 'Metadata tenant isolation lost');
}
echo "GROBO_MYFORMS_PAGINATION_QA_OK cases=8\n";
