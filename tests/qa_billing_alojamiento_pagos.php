<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\Billing\BillingModel;
use App\Services\Billing\AlojamientoPaymentService;

// Verificación local de montos y persistencia con datos ficticios, sin servidor ni credenciales.
$db = new class('sqlite::memory:') extends PDO {
    public function prepare(string $query, array $options = []): PDOStatement|false {
        if ($query === "SHOW COLUMNS FROM dinero LIKE 'SaldoDinero'") {
            return parent::prepare("SELECT 'int(11)' AS Type", $options);
        }
        return parent::prepare(preg_replace('/ FOR UPDATE$/', '', $query), $options);
    }
};
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->sqliteCreateFunction('NOW', static fn () => '2026-11-26 10:00:00');
$db->sqliteCreateFunction('CONCAT', static fn (...$args) => implode('', $args));
$db->exec("
    CREATE TABLE protocoloexpe (idprotA INTEGER PRIMARY KEY, nprotA TEXT, IdUsrA INTEGER, IdInstitucion INTEGER);
    CREATE TABLE alojamiento (IdAlojamiento INTEGER PRIMARY KEY, IdTipoAlojamiento INTEGER, fechavisado TEXT,
        hastafecha TEXT, finalizado INTEGER, CantidadCaja INTEGER, PrecioCajaMomento INTEGER, cuentaapagar INTEGER,
        totalpago DECIMAL(10,2), totaldiasdefinidos INTEGER, IdUsrA INTEGER, idprotA INTEGER, historia INTEGER, IdInstitucion INTEGER);
    CREATE TABLE dinero (IdUsrA INTEGER, IdInstitucion INTEGER, SaldoDinero INTEGER, UNIQUE (IdUsrA, IdInstitucion));
    CREATE TABLE personae (IdUsrA INTEGER PRIMARY KEY, NombreA TEXT, ApellidoA TEXT);
    CREATE TABLE tipoalojamiento (IdTipoAlojamiento INTEGER PRIMARY KEY, NombreTipoAlojamiento TEXT);
    CREATE TABLE historialpago (IdHistoPago INTEGER PRIMARY KEY, IdUsrAAdmin INTEGER, Monto TEXT, IdUsrA INTEGER,
        IdFormA INTEGER, fecha TEXT, TipoHistorial TEXT, IdInstitucion INTEGER);
    CREATE TABLE bitacora (id_usuario INTEGER, accion TEXT, tabla_afectada TEXT, detalle TEXT, fecha_hora TEXT);
    CREATE TABLE protformr (idformA INTEGER, idprotA INTEGER);
    CREATE TABLE modulosactivosinst (IdInstitucion INTEGER, IdModulosApp INTEGER, Habilitado INTEGER);
    CREATE TABLE modulosapp (IdModulosApp INTEGER PRIMARY KEY, NombreModulo TEXT);
    INSERT INTO protocoloexpe VALUES (90, 'P90', 11, 21), (91, 'P91', 12, 21);
    INSERT INTO alojamiento VALUES
        (1, 1, '2026-11-01', '2026-11-02', 1, 1, 39, 70, 0, 1, 33, 90, 300, 20),
        (2, 1, '2026-11-02', '2026-11-03', 1, 1, 39, 30, 0, 1, 33, 90, 300, 20),
        (3, 1, '2026-11-02', '2026-11-03', 1, 1, 39, 90, 5, 1, 34, 91, 300, 21);
    INSERT INTO dinero VALUES (11, 20, 80), (11, 21, 777), (33, 20, 280);
    INSERT INTO protformr VALUES (300, 91);
");

$model = new BillingModel($db);
$service = new AlojamientoPaymentService($db, $model);
$mover = static fn ($monto, $accion = 'PAGAR') => $service->ajustar(['id' => 300, 'monto' => $monto, 'accion' => $accion], 20, 8);
$debe = static fn () => $service->getDetalle(300, 20)['debe'];
$assert = static function (bool $ok, string $msg): void { if (!$ok) throw new RuntimeException($msg); };
$rechazado = static function (callable $fn, string $mensaje) use ($assert): void {
    try {
        $fn();
    } catch (Exception $e) {
        $assert(str_contains($e->getMessage(), $mensaje), $e->getMessage());
        return;
    }
    throw new RuntimeException("Movimiento inválido aceptado: $mensaje");
};

$assert($debe() === 100.0, 'El total guardado debe prevalecer.');
$assert($mover(30)['debe'] === 70.0 && $debe() === 70.0, 'El primer abono debe descontar una sola vez.');
$rechazado(fn () => $mover(71), 'saldo pendiente');
$rechazado(fn () => $mover(60), 'Saldo insuficiente');
$rechazado(fn () => $mover(1.5), 'decimales');
$rechazado(fn () => $service->ajustar(['id' => 300, 'monto' => 1, 'accion' => 'PAGAR'], 55, 8), 'en esta institución');
$assert($mover(50)['pagado'] === 80.0, 'El acumulado conserva el abono anterior.');
$assert($mover(10, 'QUITAR')['debe'] === 30.0, 'La devolución reabre solo la parte revertida.');
$db->exec('UPDATE dinero SET SaldoDinero = 30 WHERE IdUsrA = 11 AND IdInstitucion = 20');
$assert($mover(30)['debe'] === 0.0 && $debe() === 0.0, 'El último abono liquida la historia.');
$assert($model->getSaldoByInvestigador(11, 20) === 0.0, 'La billetera del titular debe quedar debitada.');
$assert($model->getSaldoByInvestigador(11, 21) === 777.0 && $model->getSaldoByInvestigador(33, 20) === 280.0,
    'No se cobra a otra sede ni al responsable de la estadía.');
$assert($service->getDetalle(300, 21)['totalpago'] === 5.0, 'No se modifica otra sede con el mismo número de historia.');
$pagos = $model->getSaldoHistorialSplit(20, 11, null, null, 'protocolo', 90)['pagos'];
$assert(count($pagos) === 4 && count(array_unique(array_column($pagos, 'IdHistoPago'))) === 4,
    'El historial debe mostrar un movimiento por ajuste aunque haya varios tramos.');
$assert($model->getSaldoHistorialSplit(20, 11, null, null, 'protocolo', 91)['pagos'] === [],
    'Una historia no puede confundirse con un formulario del mismo número.');
echo "OK: abonos de alojamiento, devolución, topes e historial\n";
