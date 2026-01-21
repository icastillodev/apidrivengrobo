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
/**
 * Procesa el reporte de facturación por departamento.
 * Centraliza el cálculo de deudas y la inyección de saldos reales por Institución.
 */
public function getDeptoReport() {
    $f = json_decode(file_get_contents('php://input'), true);
    
    $deptoId = $f['depto'] ?? 0;
    $desde   = $f['desde'] ?? null;
    $hasta   = $f['hasta'] ?? null;
    $instId  = $_SESSION['IdInstitucion'] ?? 1; // Ajustar según cómo manejes la sesión

    // 1. Obtener el Mapa de Saldos Reales (IdUsrA => SaldoDinero)
    // Esta función debe existir en tu BillingModel
    $mapaSaldos = $this->model->getSaldosPorInstitucion($instId);

    // 2. Obtener Insumos Generales (Fuera de protocolo)
    $insumosGenerales = $this->model->getInsumosGenerales($deptoId, $desde, $hasta);
    
    // Inyectamos el saldo real en los insumos generales
    foreach ($insumosGenerales as &$ins) {
        $uid = $ins['IdUsrA'];
        $ins['saldoInv'] = (float)($mapaSaldos[$uid] ?? 0);
    }
    
    $deudaInsumos = array_sum(array_column($insumosGenerales, 'debe'));
    $pagadoInsumos = array_sum(array_column($insumosGenerales, 'pagado'));

    // 3. Obtener Protocolos base del departamento
    $protocolosRaw = $this->model->getProtocolosByDepto($deptoId);
    $reporte = [];
    
    $deudaAnimales = 0;
    $deudaReactivos = 0;
    $deudaAlojamiento = 0;
    $totalPagadoGlobal = $pagadoInsumos;

    // 4. Procesar cada protocolo para obtener sus formularios y alojamientos
    foreach ($protocolosRaw as $p) {
        $idProt = $p['idprotA'];
        $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
        $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);

        // Solo incluimos en el reporte si tiene movimientos en el periodo
        if (!empty($formularios) || !empty($alojamientos)) {
            $sumDebeAni = 0; 
            $sumDebeRea = 0; 
            $sumPagadoF = 0;

            foreach ($formularios as $form) {
                $cat = strtolower($form['categoria'] ?? '');
                $montoDebe = (float)$form['debe'];
                
                // Clasificación para el Dashboard
                if (strpos($cat, 'reactivo') !== false) {
                    $sumDebeRea += $montoDebe;
                } else {
                    $sumDebeAni += $montoDebe;
                }
                $sumPagadoF += (float)$form['pagado'];
            }

            $sumDebeAlo = array_sum(array_column($alojamientos, 'debe'));
            $sumPagadoAlo = array_sum(array_column($alojamientos, 'pagado'));

            $uid = $p['IdUsrA'];

            $reporte[] = [
                'idProt'           => $idProt,
                'nprotA'           => $p['nprotA'],
                'tituloA'          => $p['tituloA'],
                'investigador'     => $p['Investigador'],
                'idUsr'            => $uid,
                'saldoInv'         => (float)($mapaSaldos[$uid] ?? 0), // Inyección de saldo real
                'deudaAnimales'    => $sumDebeAni,
                'deudaReactivos'   => $sumDebeRea,
                'deudaAlojamiento' => $sumDebeAlo,
                'formularios'      => $formularios,
                'alojamientos'     => $alojamientos
            ];

            // Acumuladores para los totales del Dashboard
            $deudaAnimales += $sumDebeAni;
            $deudaReactivos += $sumDebeRea;
            $deudaAlojamiento += $sumDebeAlo;
            $totalPagadoGlobal += ($sumPagadoF + $sumPagadoAlo);
        }
    }

    // 5. Respuesta final con toda la estructura para el Dashboard y Tablas
    $this->sendSuccess([
        'totales' => [
            'globalDeuda'      => ($deudaAnimales + $deudaReactivos + $deudaAlojamiento + $deudaInsumos),
            'deudaAnimales'    => $deudaAnimales,
            'deudaReactivos'   => $deudaReactivos,
            'deudaAlojamiento' => $deudaAlojamiento,
            'deudaInsumos'     => $deudaInsumos,
            'totalPagado'      => $totalPagadoGlobal
        ],
        'insumosGenerales' => $insumosGenerales,
        'protocolos'       => $reporte
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
// En BillingController.php
public function getAnimalDetail($id) {
    try {
        $data = $this->model->getAnimalDetailById($id);
        
        // Si data es false, enviamos un objeto vacío con ceros en lugar de un error crítico
        if (!$data) {
            $this->jsonResponse('error', 'El registro ' . $id . ' no existe en el sistema.');
            return;
        }

        $this->jsonResponse('success', $data);
    } catch (\Exception $e) {
        $this->jsonResponse('error', 'Error interno: ' . $e->getMessage());
    }
}

    /**
     * Helper para responder en formato JSON (Lo que causaba el error)
     */
    private function jsonResponse($status, $data = null) {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => $status,
            'data' => ($status === 'success') ? $data : null,
            'message' => ($status === 'error') ? $data : ''
        ]);
        exit;
    }

    /**
     * Helper para obtener datos del POST (JSON)
     */
    private function getRequestData() {
        return json_decode(file_get_contents('php://input'), true);
    }
    public function ajustarPagoIndividual() {
    $input = $this->getRequestData(); // Obtiene id, monto, accion
    
    if (!isset($input['id'], $input['monto'], $input['accion'])) {
        $this->jsonResponse('error', 'Datos incompletos');
    }

    $res = $this->model->procesarAjustePago(
        $input['id'], 
        $input['monto'], 
        $input['accion']
    );

    if ($res) {
        $this->jsonResponse('success', 'Transacción procesada correctamente');
    } else {
        $this->jsonResponse('error', 'Error al procesar el ajuste en la base de datos');
    }
}
}
