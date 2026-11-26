<?php
namespace App\Services\Billing;

use App\Models\Billing\BillingModel;
use App\Utils\AlojamientoCobro;
use App\Utils\Auditoria;
use InvalidArgumentException;
use PDO;
use RuntimeException;
use Throwable;

final class AlojamientoPaymentService {
    public function __construct(private PDO $db, private BillingModel $model) {}

    public function getDetalle(int $historia, int $instId): array {
        if ($historia <= 0 || $instId <= 0) {
            throw new InvalidArgumentException('Historia o institución no válida.');
        }
        $rows = $this->model->getAlojamientoPaymentRows($historia, $instId);
        if ($rows === []) {
            throw new RuntimeException('No se encontró alojamiento para esa historia en esta institución.');
        }
        $first = $rows[0];
        $idUsr = $this->titular($rows);
        $resumen = AlojamientoCobro::resumenFacturable($this->db, $instId, $rows, date('Y-m-d'), true);
        $trazabilidad = AlojamientoCobro::instTrazabilidadHabilitada($this->db, $instId);

        return [
            'totaldiasdefinidos' => (int) array_sum(array_column($rows, 'totaldiasdefinidos')),
            'cuentaapagar' => $resumen['cuentaapagar'],
            'totalpago' => $resumen['pagado'],
            'total' => $resumen['total'],
            'debe' => $resumen['debe'],
            'dias' => $resumen['dias'],
            'tramos' => $resumen['tramos'],
            'saldo' => $idUsr > 0 ? $this->model->getSaldoByInvestigador($idUsr, $instId) : 0.0,
            'decimales' => $this->model->getSaldoPrecision(),
            'id_pagador' => $idUsr,
            'estadia' => $this->model->getAlojamientoBillingInfo((int) $first['IdAlojamiento'], $instId),
            'trazabilidad_habilitada' => $trazabilidad,
            'alojamiento_cobro_modo' => $trazabilidad
                ? AlojamientoCobro::getModoTipo($this->db, (int) $first['IdTipoAlojamiento'], $instId)
                : null,
        ];
    }

    public function ajustar(array $input, int $instId, int $adminId): array {
        $historia = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $accion = $input['accion'] ?? null;
        $raw = $input['monto'] ?? null;
        if (!$historia || $instId <= 0 || $adminId <= 0 || !in_array($accion, ['PAGAR', 'QUITAR'], true)) {
            throw new InvalidArgumentException('Datos de pago de alojamiento inválidos.');
        }
        if (!is_numeric($raw) || !is_finite((float) $raw) || (float) $raw <= 0) {
            throw new InvalidArgumentException('Monto inválido.');
        }
        $monto = (float) $raw;
        if ($monto !== round($monto, $this->model->getSaldoPrecision())) {
            throw new InvalidArgumentException('La billetera no admite esa cantidad de decimales.');
        }
        $idUsr = $this->titular($this->model->getAlojamientoPaymentRows($historia, $instId));
        if ($idUsr <= 0) {
            throw new RuntimeException('No se encontró un titular de protocolo para este alojamiento en esta institución.');
        }

        $this->db->beginTransaction();
        try {
            // Mismo orden que Pagar selección: billetera primero, luego los tramos.
            $saldos = $this->model->lockWalletBalances($idUsr, $instId);
            if (count($saldos) > 1) {
                throw new RuntimeException('No se pudo identificar una única billetera para el titular.');
            }
            $rows = $this->model->getAlojamientoPaymentRows($historia, $instId, true);
            if ($this->titular($rows) !== $idUsr) {
                throw new RuntimeException('Cambió el titular del alojamiento. Volvé a abrir el detalle.');
            }
            $resumen = AlojamientoCobro::resumenFacturable($this->db, $instId, $rows, date('Y-m-d'));
            $pagado = $resumen['pagado'];
            if ($accion === 'PAGAR') {
                if ($monto > $resumen['debe']) {
                    throw new RuntimeException('El monto supera el saldo pendiente del alojamiento.');
                }
                if ($saldos === [] || (float) $saldos[0] < $monto) {
                    throw new RuntimeException('Saldo insuficiente en la billetera del titular.');
                }
                $delta = -$monto;
                $tipo = 'PAGO_ALOJ';
            } else {
                if ($monto > $pagado) {
                    throw new RuntimeException('No se puede devolver más de lo pagado en este alojamiento.');
                }
                $delta = $monto;
                $tipo = 'DEVOLUCION_ALOJ';
            }

            if ($saldos === []) {
                $this->model->createWalletForAlojamiento($idUsr, $instId, $delta);
            } elseif ($this->model->moveWalletForAlojamiento($idUsr, $instId, $delta) !== 1) {
                throw new RuntimeException('No se pudo actualizar la billetera del titular.');
            }

            $nuevoPagado = round($pagado - $delta, 2);
            $this->model->updateAlojamientoPagado($historia, $instId, $nuevoPagado);
            $this->model->insertAlojamientoPaymentHistory($adminId, $monto, $idUsr, $historia, $instId, $tipo);
            Auditoria::logManual($this->db, $adminId, $tipo, 'alojamiento', "Historia #$historia, movimiento $monto, pagado $nuevoPagado");
            $this->db->commit();
            return [
                'pagado' => $nuevoPagado,
                'debe' => max(0.0, round($resumen['total'] - $nuevoPagado, 2)),
            ];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function titular(array $rows): int {
        $idUsr = (int) ($rows[0]['IdTitular'] ?? 0);
        foreach ($rows as $row) {
            if ((int) $row['IdTitular'] !== $idUsr) {
                throw new RuntimeException('La historia tiene más de un titular de pago.');
            }
        }
        return $idUsr;
    }
}
