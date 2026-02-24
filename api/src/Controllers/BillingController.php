<?php
namespace App\Controllers;

use App\Models\Billing\BillingModel;
use App\Utils\Auditoria;

class BillingController {
    
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new BillingModel($db);
    }

    public function getDeptoReport() {
        if (ob_get_length()) ob_clean();
        $f = json_decode(file_get_contents('php://input'), true);
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            
            $deptoId = $f['depto'] ?? 0;
            $desde   = $f['desde'] ?? null;
            $hasta   = $f['hasta'] ?? null;

            $mapaSaldos = $this->model->getSaldosPorInstitucion($instId);
            $insumosGenerales = $this->model->getInsumosGenerales($deptoId, $desde, $hasta);
            
            foreach ($insumosGenerales as &$ins) {
                $uid = $ins['IdUsrA'];
                $ins['saldoInv'] = (float)($mapaSaldos[$uid] ?? 0);
            }
            
            $deudaInsumos = array_sum(array_column($insumosGenerales, 'debe'));
            $pagadoInsumos = array_sum(array_column($insumosGenerales, 'pagado'));

            $protocolosRaw = $this->model->getProtocolosByDepto($deptoId);
            $reporte = [];
            $deudaAnimales = 0; $deudaReactivos = 0; $deudaAlojamiento = 0;
            $totalPagadoGlobal = $pagadoInsumos;

            foreach ($protocolosRaw as $p) {
                $idProt = $p['idprotA'];
                $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
                $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);

                if (!empty($formularios) || !empty($alojamientos)) {
                    $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoF = 0;

                    foreach ($formularios as $form) {
                        $cat = strtolower($form['categoria'] ?? '');
                        $montoDebe = (float)$form['debe'];
                        
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
                        'saldoInv'         => (float)($mapaSaldos[$uid] ?? 0), 
                        'deudaAnimales'    => $sumDebeAni,
                        'deudaReactivos'   => $sumDebeRea,
                        'deudaAlojamiento' => $sumDebeAlo,
                        'formularios'      => $formularios,
                        'alojamientos'     => $alojamientos
                    ];

                    $deudaAnimales += $sumDebeAni;
                    $deudaReactivos += $sumDebeRea;
                    $deudaAlojamiento += $sumDebeAlo;
                    $totalPagadoGlobal += ($sumPagadoF + $sumPagadoAlo);
                }
            }

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
        } catch (\Exception $e) { $this->sendError($e->getMessage()); }
    }

    public function getInvestigadorReport() {
        if (ob_get_length()) ob_clean();
        $input = $this->getRequestData();
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            
            $idUsr  = $input['idUsr']  ?? 0;
            $desde  = $input['desde']  ?? null;
            $hasta  = $input['hasta']  ?? null;

            if (!$idUsr) $this->jsonResponse('error', 'ID de investigador no proporcionado.');

            $perfil = $this->model->getBasicUserInfo($idUsr, $instId);
            $protocolosRaw = $this->model->getProtocolosByInvestigador($idUsr, $instId);
            
            $reporteProtocolos = [];
            $deudaAniGlobal = 0; $deudaReaGlobal = 0; $deudaAlojGlobal = 0; $totalPagadoGlobal = 0;

            foreach ($protocolosRaw as $p) {
                $idProt = $p['idprotA'];
                $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
                $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);

                if (!empty($formularios) || !empty($alojamientos)) {
                    $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoProt = 0;

                    foreach ($formularios as $f) {
                        $montoDebe = (float)$f['debe'];
                        $montoPagado = (float)$f['pagado'];
                        $cat = strtolower($f['categoria'] ?? '');

                        if (strpos($cat, 'reactivo') !== false) {
                            $sumDebeRea += $montoDebe;
                        } else {
                            $sumDebeAni += $montoDebe;
                        }
                        $sumPagadoProt += $montoPagado;
                    }

                    $sumDebeAloj = array_sum(array_column($alojamientos, 'debe'));
                    $sumPagadoAloj = array_sum(array_column($alojamientos, 'pagado'));

                    $reporteProtocolos[] = [
                        'idProt'           => $idProt,
                        'nprotA'           => $p['nprotA'],
                        'tituloA'          => $p['tituloA'],
                        'investigador'     => $p['Investigador'],
                        'idUsr'            => $idUsr,
                        'saldoInv'         => $perfil['SaldoDinero'], 
                        'deudaAnimales'    => $sumDebeAni,
                        'deudaReactivos'   => $sumDebeRea,
                        'deudaAlojamiento' => $sumDebeAloj,
                        'formularios'      => $formularios,
                        'alojamientos'     => $alojamientos
                    ];

                    $deudaAniGlobal  += $sumDebeAni;
                    $deudaReaGlobal  += $sumDebeRea;
                    $deudaAlojGlobal += $sumDebeAloj;
                    $totalPagadoGlobal += ($sumPagadoProt + $sumPagadoAloj);
                }
            }

            $insumosGenerales = $this->model->getInsumosByUser($idUsr, $instId, $desde, $hasta);
            $deudaInsGlobal = array_sum(array_column($insumosGenerales, 'debe'));
            $totalPagadoGlobal += array_sum(array_column($insumosGenerales, 'pagado'));

            $this->jsonResponse('success', [
                'perfil' => $perfil,
                'totales' => [
                    'globalDeuda'      => ($deudaAniGlobal + $deudaReaGlobal + $deudaAlojGlobal + $deudaInsGlobal),
                    'deudaAnimales'    => $deudaAniGlobal,
                    'deudaReactivos'   => $deudaReaGlobal,
                    'deudaAlojamiento' => $deudaAlojGlobal,
                    'deudaInsumos'     => $deudaInsGlobal,
                    'totalPagado'      => $totalPagadoGlobal
                ],
                'insumosGenerales' => $insumosGenerales,
                'protocolos'       => $reporteProtocolos
            ]);
        } catch (\Exception $e) { $this->jsonResponse('error', 'Error al procesar reporte: ' . $e->getMessage()); }
    }

    public function updateBalance() {
        $f = $this->getRequestData();
        try {
            $sesion = Auditoria::getDatosSesion(); // Extraemos del Token
            $res = $this->model->updateBalance($f['idUsr'], $sesion['instId'], $f['monto'], $sesion['userId']);
            if($res) $this->sendSuccess("Saldo actualizado");
            else $this->sendError("No se pudo actualizar");
        } catch (\Exception $e) { $this->sendError($e->getMessage()); }
    }

    public function processPayment() {
        $f = $this->getRequestData();
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad Total
            $this->model->processPaymentTransaction($f['idUsr'], $f['monto'], $f['items'], $sesion['instId'], $sesion['userId']);
            $this->sendSuccess("Pago procesado");
        } catch (\Exception $e) { $this->sendError($e->getMessage()); }
    }

    public function ajustarPagoIndividual() {
        $input = $this->getRequestData(); 
        if (!isset($input['id'], $input['monto'], $input['accion'])) $this->jsonResponse('error', 'Datos incompletos');

        try {
            $sesion = Auditoria::getDatosSesion();
            $res = $this->model->procesarAjustePago($input['id'], $input['monto'], $input['accion'], $sesion['userId']);
            if ($res) $this->jsonResponse('success', 'Transacción procesada');
            else $this->jsonResponse('error', 'Error de BD');
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function ajustarPagoInsumo() {
        $input = $this->getRequestData();
        if (!isset($input['id'], $input['monto'], $input['accion'])) $this->jsonResponse('error', 'Datos incompletos');

        try {
            $sesion = Auditoria::getDatosSesion();
            $res = $this->model->procesarAjustePagoInsumo($input['id'], $input['monto'], $input['accion'], $sesion['userId']);
            if ($res) $this->jsonResponse('success', 'Pago de insumo procesado');
            else $this->jsonResponse('error', 'Error en base de datos');
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function ajustarPagoAloj() {
        $input = $this->getRequestData();
        if (!isset($input['id'], $input['monto'], $input['accion'])) $this->jsonResponse('error', 'Datos insuficientes');

        try {
            $sesion = Auditoria::getDatosSesion();
            $res = $this->model->procesarAjustePagoAloj($input['id'], $input['monto'], $input['accion'], $sesion['userId']);
            if ($res) $this->jsonResponse('success', 'Transacción de alojamiento completada');
            else $this->jsonResponse('error', 'No se pudo procesar');
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function listActiveProtocols() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getActiveProtocols($sesion['instId']);
            $this->jsonResponse('success', $data);
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function getProtocolReport() {
        $input = $this->getRequestData();
        $idProt = $input['idProt'] ?? 0;
        $desde  = $input['desde']  ?? null;
        $hasta  = $input['hasta']  ?? null;

        if (!$idProt) $this->jsonResponse('error', 'ID de protocolo no proporcionado.');

        try {
            Auditoria::getDatosSesion(); // Seguridad lectura
            $info = $this->model->getProtocolHeaderInfo($idProt);
            $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
            $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);

            $deudaAni = 0; $deudaRea = 0; $pagadoTotal = 0;

            foreach ($formularios as $f) {
                if (strpos(strtolower($f['categoria']), 'reactivo') !== false) $deudaRea += (float)$f['debe'];
                else $deudaAni += (float)$f['debe'];
                $pagadoTotal += (float)$f['pagado'];
            }
            
            $deudaAloj = array_sum(array_column($alojamientos, 'debe'));
            $pagadoTotal += array_sum(array_column($alojamientos, 'pagado'));

            $this->jsonResponse('success', [
                'info' => $info,
                'formularios' => $formularios,
                'alojamientos' => $alojamientos,
                'totales' => [
                    'deudaAnimales'    => $deudaAni,
                    'deudaReactivos'   => $deudaRea,
                    'deudaAlojamiento' => $deudaAloj,
                    'deudaTotal'       => ($deudaAni + $deudaRea + $deudaAloj),
                    'totalPagado'      => $pagadoTotal
                ]
            ]);
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function getAnimalDetail($id) {
        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getAnimalDetailById($id);
            if (!$data) {
                $this->jsonResponse('error', 'El registro ' . $id . ' no existe en el sistema.');
                return;
            }
            $this->jsonResponse('success', $data);
        } catch (\Exception $e) { $this->jsonResponse('error', 'Error interno: ' . $e->getMessage()); }
    }

    public function getReactiveDetail($id) {
        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getReactiveDetailById($id);
            if (!$data) return $this->jsonResponse('error', 'No se encontró el reactivo solicitado.');
            return $this->jsonResponse('success', $data);
        } catch (\Exception $e) { return $this->jsonResponse('error', 'Error interno: ' . $e->getMessage()); }
    }

    public function getInsumoDetail($id) {
        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getInsumoDetailById($id);
            if (!$data) return $this->jsonResponse('error', 'No se encontraron datos para el insumo #' . $id);
            return $this->jsonResponse('success', $data);
        } catch (\Exception $e) { return $this->jsonResponse('error', 'Error en el servidor: ' . $e->getMessage()); }
    }

    public function getInvestigatorBalance($id) {
        try {
            Auditoria::getDatosSesion();
            $saldo = $this->model->getSaldoByInvestigador($id);
            return $this->jsonResponse('success', ['SaldoDinero' => $saldo]);
        } catch (\Exception $e) { return $this->jsonResponse('error', 'Error al obtener saldo: ' . $e->getMessage()); }
    }

    private function sendSuccess($data) { header('Content-Type: application/json'); echo json_encode(['status' => 'success', 'data' => $data]); exit; }
    private function sendError($message) { header('Content-Type: application/json'); echo json_encode(['status' => 'error', 'message' => $message]); exit; }
    private function jsonResponse($status, $data = null) { header('Content-Type: application/json'); echo json_encode(['status' => $status, 'data' => ($status === 'success') ? $data : null, 'message' => ($status === 'error') ? $data : '']); exit; }
    private function getRequestData() { return json_decode(file_get_contents('php://input'), true); }
    public function getAuditHistory() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad: Solo el admin de esta inst ve esto
            $data = $this->model->getFinancialAudit($sesion['instId']);
            $this->jsonResponse('success', $data);
        } catch (\Exception $e) {
            $this->jsonResponse('error', $e->getMessage());
        }
    }
}