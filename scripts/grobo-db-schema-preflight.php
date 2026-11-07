<?php
/**
 * Solo lectura. Valida conectividad y columnas del esquema de produccion.
 * No muestra claves, personas, saldos ni filas de usuario.
 */
declare(strict_types=1);
$api = '/var/www/html/core-backend-gem';
try {
    require_once $api . '/autoload.php';
    \App\Utils\EnvLoader::load($api . '/.env');
    require_once $api . '/config/database.php';
    $db = (new \Database())->getConnection();
    $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
    $required = [
        'protocoloexpe' => ['idprotA','IdUsrA','IdInstitucion'],
        'protesper' => ['idprotA','idespA'],
        'protinstr' => ['idprotA','IdInstitucion'],
        'solicitudprotocolo' => ['idprotA','TipoPedido','Aprobado','IdInstitucion'],
        'reserva_sala' => ['IdSalaReserva','IdInstitucion','habilitado'],
        'reserva_instrumento' => ['IdReservaInstrumento','IdInstitucion','habilitado'],
        'reserva_instrumento_sala_permitida' => ['IdReservaInstrumento','IdSalaReserva'],
        'reserva_horariospordiasala' => ['IdSalaReserva'],
        'protocoloexpered' => ['IdProtocoloExpRed','idprotA','IdInstitucion'],
    ];
    $stmt = $db->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    $notFound = [];
    foreach ($required as $table => $fields) {
        $stmt->execute([$table]);
        $actual = array_map('strtolower', $stmt->fetchAll(\PDO::FETCH_COLUMN));
        foreach ($fields as $name) {
            if (!in_array(strtolower($name), $actual, true)) {
                $notFound[] = $table.'.'.$name;
            }
        }
    }
    if ($notFound) {
        echo 'GROBO_SCHEMA_MISSING '.implode(',', $notFound)."\n";
        exit(2);
    }
    $pdoCheck = (int)$db->query('SELECT 1')->fetchColumn();
    if ($pdoCheck !== 1) {
        echo "GROBO_DATABASE_CONNECTION_INVALID\n";
        exit(2);
    }
    echo 'GROBO_DB_READONLY_SCHEMA_OK tables='.count($required)."\n";
} catch (\Throwable $e) {
    error_log('GROBO database preflight failed: '.get_class($e));
    echo "GROBO_DB_SCHEMA_PRECHECK_FAILED\n";
    exit(2);
}
