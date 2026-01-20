<?php
namespace App\Controllers;

use App\Models\Billing\BillingModel;

class BillingController {
    
    private $model;

    public function __construct($db) {
        $this->model = new BillingModel($db);
    }

    /**
     * Procesa el reporte de facturación por departamento
     * Incluye Protocolos e Insumos Generales (fuera de protocolo)
     */
public function getDeptoReport() {
    $f = json_decode(file_get_contents('php://input'), true);
    $deptoId = $f['depto'] ?? 0;
    $desde   = $f['desde'] ?? null;
    $hasta   = $f['hasta'] ?? null;

    // 1. Insumos
    $insumosGenerales = $this->model->getInsumosGenerales($deptoId, $desde, $hasta);
    $deudaInsumos = array_sum(array_column($insumosGenerales, 'debe'));
    $pagadoInsumos = array_sum(array_column($insumosGenerales, 'pagado'));

    // 2. Protocolos
    $protocolosRaw = $this->model->getProtocolosByDepto($deptoId);
    $reporte = [];
    
    $deudaAnimales = 0;
    $deudaReactivos = 0;
    $deudaAlojamiento = 0;
    $totalPagadoGlobal = $pagadoInsumos;

    foreach ($protocolosRaw as $p) {
        $formularios = $this->model->getPedidosProtocolo($p['idprotA'], $desde, $hasta);
        $alojamientos = $this->model->getAlojamientosProtocolo($p['idprotA'], $desde, $hasta);

        if (!empty($formularios) || !empty($alojamientos)) {
            $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoF = 0;

            foreach ($formularios as $form) {
                $cat = strtolower($form['categoria'] ?? '');
                if (strpos($cat, 'reactivo') !== false) {
                    $sumDebeRea += (float)$form['debe'];
                } else {
                    $sumDebeAni += (float)$form['debe'];
                }
                $sumPagadoF += (float)$form['pagado'];
            }

            $sumDebeAlo = array_sum(array_column($alojamientos, 'debe'));
            $sumPagadoAlo = array_sum(array_column($alojamientos, 'pagado'));

            $reporte[] = [
                'idProt' => $p['idprotA'],
                'nprotA' => $p['nprotA'],
                'tituloA' => $p['tituloA'],
                'investigador' => $p['Investigador'],
                'idUsr' => $p['IdUsrA'], // Usamos la llave exacta del modelo
                'saldoInv' => $p['SaldoDinero'] ?? 0,
                'deudaAnimales' => $sumDebeAni,
                'deudaReactivos' => $sumDebeRea,
                'deudaAlojamiento' => $sumDebeAlo,
                'formularios' => $formularios,
                'alojamientos' => $alojamientos
            ];

            $deudaAnimales += $sumDebeAni;
            $deudaReactivos += $sumDebeRea;
            $deudaAlojamiento += $sumDebeAlo;
            $totalPagadoGlobal += ($sumPagadoF + $sumPagadoAlo);
        }
    }

    $this->sendSuccess([
        'totales' => [
            'globalDeuda' => ($deudaAnimales + $deudaReactivos + $deudaAlojamiento + $deudaInsumos),
            'deudaAnimales' => $deudaAnimales,
            'deudaReactivos' => $deudaReactivos,
            'deudaAlojamiento' => $deudaAlojamiento,
            'deudaInsumos' => $deudaInsumos,
            'totalPagado' => $totalPagadoGlobal
        ],
        'insumosGenerales' => $insumosGenerales,
        'protocolos' => $reporte
    ]);
}
    private function sendSuccess($data) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

    private function sendError($message) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => $message]);
        exit;
    }

        /**
 * Procesa la liquidación de ítems descontando del saldo
 */
public function updateBalance() {
    $f = json_decode(file_get_contents('php://input'), true);
    
    // Llamamos al modelo en lugar de usar $this->db directamente
    $res = $this->model->updateBalance($f['idUsr'], $f['instId'], $f['monto']);

    if($res) {
        $this->sendSuccess("Saldo actualizado correctamente");
    } else {
        $this->sendError("No se pudo actualizar el saldo");
    }
}

public function processPayment() {
    $f = json_decode(file_get_contents('php://input'), true);
    
    try {
        $res = $this->model->processPaymentTransaction(
            $f['idUsr'], 
            $f['monto'], 
            $f['items'], 
            $f['instId']
        );
        $this->sendSuccess("Pago procesado");
    } catch (\Exception $e) {
        $this->sendError($e->getMessage());
    }
}
}
