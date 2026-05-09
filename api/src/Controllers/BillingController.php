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

    /** Formulario exento (tipo de formulario): no entra al total pagado global ni a subtotales cobrables. */
    private function billingFormularioEsExento(array $f): bool {
        $ie = $f['is_exento'] ?? null;
        if ($ie === true || $ie === 1 || $ie === '1') {
            return true;
        }
        return (int)($f['exento'] ?? 0) === 1;
    }

    /** Pedido de insumo exento: mismo criterio que formularios. */
    private function billingInsumoEsExento(array $ins): bool {
        $v = $ins['is_exento'] ?? $ins['exento'] ?? null;
        if ($v === true || $v === 1 || $v === '1') {
            return true;
        }
        return (int)($v ?? 0) === 1;
    }

    /**
     * Lista de insumos en facturación: aplica montos de facturación derivada (si existe) y saldo de billetera del usuario que paga.
     */
    private function enrichInsumosFacturacionDerivadaSaldo(array &$rows, array $mapaSaldos, int $instId): void {
        $this->model->applyFacturacionDerivadaToInsumoRows($rows, $instId);
        foreach ($rows as &$ins) {
            $uid = (int) ($ins['IdUsrA'] ?? 0);
            if (!empty($ins['es_facturacion_derivada']) && !empty($ins['id_usr_cobro_billetera'])) {
                $c = (int) $ins['id_usr_cobro_billetera'];
                if ($c > 0) {
                    $uid = $c;
                }
            }
            $ins['saldoInv'] = (float) ($mapaSaldos[$uid] ?? 0.0);
        }
        unset($ins);
    }

    /** Listados animal/reactivo en facturación por depto/protocolo/investigador: montos según facturacion_formulario_derivado. */
    private function enrichPedidosFacturacionDerivada(array &$forms, int $instId): void {
        $this->model->applyFacturacionDerivadaToPedidoFacturacionRows($forms, $instId);
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
            $this->enrichInsumosFacturacionDerivadaSaldo($insumosGenerales, $mapaSaldos, (int) $instId);

            $deudaInsumos = 0.0;
            $pagadoInsumos = 0.0;
            foreach ($insumosGenerales as $insRow) {
                if ($this->billingInsumoEsExento($insRow)) {
                    continue;
                }
                $deudaInsumos += (float)($insRow['debe'] ?? 0);
                $pagadoInsumos += (float)($insRow['pagado'] ?? 0);
            }

            $protocolosRaw = $this->model->getProtocolosByDepto($deptoId);
            $reporte = [];
            $deudaAnimales = 0; $deudaReactivos = 0; $deudaAlojamiento = 0;
            $totalPagadoGlobal = $pagadoInsumos;

            // Formato viejo: pedidos del departamento sin vincular a ningún protocolo
            $pedidosSinProt = $this->model->getPedidosDeptoSinProtocolo($deptoId, $desde, $hasta);
            $this->enrichPedidosFacturacionDerivada($pedidosSinProt, (int) $instId);
            if (!empty($pedidosSinProt)) {
                $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoF = 0;
                foreach ($pedidosSinProt as $form) {
                    if ($this->billingFormularioEsExento($form)) {
                        continue;
                    }
                    $cat = strtolower($form['categoria'] ?? '');
                    $montoDebe = (float)$form['debe'];
                    if (strpos($cat, 'reactivo') !== false) {
                        $sumDebeRea += $montoDebe;
                    } else {
                        $sumDebeAni += $montoDebe;
                    }
                    $sumPagadoF += (float)$form['pagado'];
                }
                $reporte[] = [
                    'idProt'           => 0,
                    'nprotA'           => 'Departamento (sin protocolo)',
                    'tituloA'          => '',
                    'investigador'     => '—',
                    'idUsr'            => 0,
                    'saldoInv'         => 0,
                    'deudaAnimales'    => $sumDebeAni,
                    'deudaReactivos'   => $sumDebeRea,
                    'deudaAlojamiento' => 0,
                    'formularios'      => $pedidosSinProt,
                    'alojamientos'     => []
                ];
                $deudaAnimales += $sumDebeAni;
                $deudaReactivos += $sumDebeRea;
                $totalPagadoGlobal += $sumPagadoF;
            }

            $rangoFechas = ($desde && $hasta);

            foreach ($protocolosRaw as $p) {
                $idProt = (int) $p['idprotA'];
                if ($rangoFechas) {
                    $hayForms = $this->model->protocolTienePedidosEntregadosEnRango($idProt, $desde, $hasta);
                    $hayAloj = $this->model->protocolTieneAlojamientoVisadoEnRango($idProt, $desde, $hasta);
                    if (!$hayForms && !$hayAloj) {
                        continue;
                    }
                    $formularios = $hayForms ? $this->model->getPedidosProtocolo($idProt, $desde, $hasta) : [];
                    $alojamientos = $hayAloj ? $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta) : [];
                } else {
                    $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
                    $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);
                }
                $this->enrichPedidosFacturacionDerivada($formularios, (int) $instId);

                if (!empty($formularios) || !empty($alojamientos)) {
                    $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoF = 0;

                    foreach ($formularios as $form) {
                        if ($this->billingFormularioEsExento($form)) {
                            continue;
                        }
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

    /**
     * Reporte de facturación agrupado por organización (cada org con sus departamentos y datos de billing).
     */
    public function getOrgReport() {
        if (ob_get_length()) ob_clean();
        $f = json_decode(file_get_contents('php://input'), true) ?? [];
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            $desde  = $f['desde'] ?? null;
            $hasta  = $f['hasta'] ?? null;

            $mapaSaldos = $this->model->getSaldosPorInstitucion($instId);
            $organizacionesRaw = $this->model->getOrganizacionesConDeptos($instId);
            $organizaciones = [];

            foreach ($organizacionesRaw as $org) {
                $totalesOrg = ['globalDeuda' => 0, 'deudaAnimales' => 0, 'deudaReactivos' => 0, 'deudaAlojamiento' => 0, 'deudaInsumos' => 0, 'totalPagado' => 0];
                $departamentos = [];

                foreach ($org['departamentos'] as $d) {
                    $deptoId = $d['iddeptoA'];
                    $insumosGenerales = $this->model->getInsumosGenerales($deptoId, $desde, $hasta);
                    $this->enrichInsumosFacturacionDerivadaSaldo($insumosGenerales, $mapaSaldos, (int) $instId);
                    $deudaInsumos = 0.0;
                    foreach ($insumosGenerales as $insRow) {
                        if ($this->billingInsumoEsExento($insRow)) {
                            continue;
                        }
                        $deudaInsumos += (float) ($insRow['debe'] ?? 0);
                    }
                    $pagadoInsumos = 0.0;
                    foreach ($insumosGenerales as $insRow) {
                        if ($this->billingInsumoEsExento($insRow)) {
                            continue;
                        }
                        $pagadoInsumos += (float) ($insRow['pagado'] ?? 0);
                    }

                    $protocolosRaw = $this->model->getProtocolosByDepto($deptoId);
                    $reporte = [];
                    $deudaAnimales = 0; $deudaReactivos = 0; $deudaAlojamiento = 0; $totalPagadoDepto = $pagadoInsumos;

                    foreach ($protocolosRaw as $p) {
                        $idProt = $p['idprotA'];
                        $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
                        $this->enrichPedidosFacturacionDerivada($formularios, (int) $instId);
                        $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);

                        if (!empty($formularios) || !empty($alojamientos)) {
                            $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoF = 0;
                            foreach ($formularios as $form) {
                                $cat = strtolower($form['categoria'] ?? '');
                                $montoDebe = (float)$form['debe'];
                                if (strpos($cat, 'reactivo') !== false) $sumDebeRea += $montoDebe;
                                else $sumDebeAni += $montoDebe;
                                $sumPagadoF += (float)$form['pagado'];
                            }
                            $sumDebeAlo = array_sum(array_column($alojamientos, 'debe'));
                            $sumPagadoAlo = array_sum(array_column($alojamientos, 'pagado'));
                            $uid = $p['IdUsrA'];
                            $reporte[] = [
                                'idProt' => $idProt, 'nprotA' => $p['nprotA'], 'tituloA' => $p['tituloA'],
                                'investigador' => $p['Investigador'], 'idUsr' => $uid,
                                'saldoInv' => (float)($mapaSaldos[$uid] ?? 0),
                                'deudaAnimales' => $sumDebeAni, 'deudaReactivos' => $sumDebeRea, 'deudaAlojamiento' => $sumDebeAlo,
                                'formularios' => $formularios, 'alojamientos' => $alojamientos
                            ];
                            $deudaAnimales += $sumDebeAni; $deudaReactivos += $sumDebeRea; $deudaAlojamiento += $sumDebeAlo;
                            $totalPagadoDepto += ($sumPagadoF + $sumPagadoAlo);
                        }
                    }

                    $totalesDepto = [
                        'globalDeuda' => ($deudaAnimales + $deudaReactivos + $deudaAlojamiento + $deudaInsumos),
                        'deudaAnimales' => $deudaAnimales, 'deudaReactivos' => $deudaReactivos,
                        'deudaAlojamiento' => $deudaAlojamiento, 'deudaInsumos' => $deudaInsumos,
                        'totalPagado' => $totalPagadoDepto
                    ];
                    $totalesOrg['globalDeuda'] += $totalesDepto['globalDeuda'];
                    $totalesOrg['deudaAnimales'] += $totalesDepto['deudaAnimales'];
                    $totalesOrg['deudaReactivos'] += $totalesDepto['deudaReactivos'];
                    $totalesOrg['deudaAlojamiento'] += $totalesDepto['deudaAlojamiento'];
                    $totalesOrg['deudaInsumos'] += $totalesDepto['deudaInsumos'];
                    $totalesOrg['totalPagado'] += $totalesDepto['totalPagado'];

                    $departamentos[] = [
                        'iddeptoA' => $deptoId,
                        'NombreDeptoA' => $d['NombreDeptoA'],
                        'totales' => $totalesDepto,
                        'insumosGenerales' => $insumosGenerales,
                        'protocolos' => $reporte
                    ];
                }

                $organizaciones[] = [
                    'idOrganismo' => $org['idOrganismo'],
                    'nombre' => $org['nombre'],
                    'totales' => $totalesOrg,
                    'departamentos' => $departamentos
                ];
            }

            $this->sendSuccess(['organizaciones' => $organizaciones]);
        } catch (\Exception $e) { $this->sendError($e->getMessage()); }
    }

    /**
     * Lista instituciones que han enviado formularios derivados (para selector).
     */
    public function getInstitutionsWithDerived() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            $list = $this->model->getInstitutionsForInstitutionBillingReport($instId);
            $this->sendSuccess($list);
        } catch (\Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    public function getInstitutionReport() {
        if (ob_get_length()) ob_clean();
        $f = json_decode(file_get_contents('php://input'), true) ?? [];
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int)$sesion['instId'];
            $desde = $f['desde'] ?? null;
            $hasta = $f['hasta'] ?? null;
            $estadoCobro = $f['estadoCobro'] ?? 'all';
            $idInstitucionSolicitante = $f['idInstitucionSolicitante'] ?? null;
            $origenFacturacion = $f['origenFacturacion'] ?? 'todos';
            $instPage = isset($f['instPage']) ? (int) $f['instPage'] : 0;
            $instPerPage = isset($f['instPerPage']) ? (int) $f['instPerPage'] : 0;
            if ($instPerPage > 0 && $instPage < 1) {
                $instPage = 1;
            }

            $data = $this->model->getInstitutionDerivedReport(
                $instId,
                $desde,
                $hasta,
                $estadoCobro,
                $idInstitucionSolicitante,
                $origenFacturacion,
                $instPerPage > 0 ? $instPage : null,
                $instPerPage > 0 ? $instPerPage : null
            );
            $this->sendSuccess($data);
        } catch (\Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    public function getInvestigadorReport() {
        if (ob_get_length()) ob_clean();
        $input = $this->getRequestData();
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            
            $idUsr  = (int)($input['idUsr']  ?? 0);
            $desde  = $input['desde']  ?? null;
            $hasta  = $input['hasta']  ?? null;

            if (!$idUsr) $this->jsonResponse('error', 'ID de investigador no proporcionado.');

            $role = (int)($sesion['role'] ?? 0);
            $sessionUserId = (int)($sesion['userId'] ?? 0);
            if ($role === 3 && $idUsr !== $sessionUserId) {
                $this->jsonResponse('error', 'No tiene permisos para consultar la facturación de otro usuario.');
            }

            $perfil = $this->model->getBasicUserInfo($idUsr, $instId);
            $protocolosRaw = $this->model->getProtocolosByInvestigador($idUsr, $instId);
            
            $reporteProtocolos = [];
            $deudaAniGlobal = 0; $deudaReaGlobal = 0; $deudaAlojGlobal = 0; $totalPagadoGlobal = 0;
            $deudaInsumosProtAcum = 0;
            $mapaSaldos = $this->model->getSaldosPorInstitucion($instId);

            foreach ($protocolosRaw as $p) {
                $idProt = $p['idprotA'];
                $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
                $this->enrichPedidosFacturacionDerivada($formularios, (int) $instId);
                $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);
                $insumosProt = $this->model->getInsumosByProtocolo($idProt, $desde, $hasta);
                $this->enrichInsumosFacturacionDerivadaSaldo($insumosProt, $mapaSaldos, (int) $instId);

                $sumDebeInsProt = 0.0;
                $sumPagadoInsProt = 0.0;
                foreach ($insumosProt as $insP) {
                    if ($this->billingInsumoEsExento($insP)) {
                        continue;
                    }
                    $sumDebeInsProt += (float)($insP['debe'] ?? 0);
                    $sumPagadoInsProt += (float)($insP['pagado'] ?? 0);
                }

                // Los insumos de pedido (misma consulta que getInsumosByProtocolo) se listan en la tarjeta del protocolo.
                // Excluir por id de formulario — no por texto en categoria (evita falsos positivos si "insumo" aparece en el nombre del tipo).
                $insumoIdsProt = [];
                foreach ($insumosProt as $rowIns) {
                    $ik = (string)($rowIns['id'] ?? $rowIns['idformA'] ?? '');
                    if ($ik !== '') {
                        $insumoIdsProt[$ik] = true;
                    }
                }

                $formulariosFiltrados = [];
                $sumDebeAni = 0; $sumDebeRea = 0; $sumPagadoProt = 0;

                foreach ($formularios as $f) {
                    $fid = (string)($f['id'] ?? '');
                    if ($fid !== '' && isset($insumoIdsProt[$fid])) {
                        continue;
                    }

                    $montoDebe = (float)$f['debe'];
                    $montoPagado = (float)$f['pagado'];
                    $cat = strtolower($f['categoria'] ?? '');

                    if (!$this->billingFormularioEsExento($f)) {
                        if (strpos($cat, 'reactivo') !== false) {
                            $sumDebeRea += $montoDebe;
                        } else {
                            $sumDebeAni += $montoDebe;
                        }
                        $sumPagadoProt += $montoPagado;
                    }
                    $formulariosFiltrados[] = $f;
                }

                // Incluir tarjeta si hay algo facturable del protocolo (incl. solo insumos de pedido, aunque la grilla de animales quede vacía).
                if (!empty($formulariosFiltrados) || !empty($alojamientos) || !empty($insumosProt)) {
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
                        'deudaInsumos'     => $sumDebeInsProt,
                        'formularios'      => $formulariosFiltrados,
                        'alojamientos'     => $alojamientos,
                        'insumos'          => $insumosProt
                    ];

                    $deudaAniGlobal  += $sumDebeAni;
                    $deudaReaGlobal  += $sumDebeRea;
                    $deudaAlojGlobal += $sumDebeAloj;
                    $deudaInsumosProtAcum += $sumDebeInsProt;
                    $totalPagadoGlobal += ($sumPagadoProt + $sumPagadoAloj + $sumPagadoInsProt);
                }
            }

            $insumosGeneralesDirectos = $this->model->getInsumosByUser($idUsr, $instId, $desde, $hasta);
            $this->enrichInsumosFacturacionDerivadaSaldo($insumosGeneralesDirectos, $mapaSaldos, (int) $instId);

            // Solo pedidos de insumo sin vínculo a protocolo (depto 0 / NULL); los de protocolo van en cada tarjeta.
            $insumosGenerales = array_values($insumosGeneralesDirectos);

            $deudaInsDirectos = 0.0;
            $pagadoInsGenerales = 0.0;
            foreach ($insumosGenerales as $ig) {
                if ($this->billingInsumoEsExento($ig)) {
                    continue;
                }
                $deudaInsDirectos += (float)($ig['debe'] ?? 0);
                $pagadoInsGenerales += (float)($ig['pagado'] ?? 0);
            }
            $deudaInsGlobal = $deudaInsDirectos + $deudaInsumosProtAcum;
            $totalPagadoGlobal += $pagadoInsGenerales;

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
        $f = $this->getRequestData() ?: [];
        try {
            $sesion = Auditoria::getDatosSesion(); // Extraemos del Token
            $idUsr = (int) ($f['idUsr'] ?? 0);
            $monto = (float) ($f['monto'] ?? 0);
            if ($idUsr <= 0) {
                $this->sendError('Usuario inválido.');
            }
            if (abs($monto) < 1e-9) {
                $this->sendError('Monto inválido.');
            }
            $transferId = $f['transferId'] ?? null;
            $comment = $f['comment'] ?? null;
            $res = $this->model->updateBalance($idUsr, $sesion['instId'], $monto, $sesion['userId'], $transferId, $comment);
            if ($res) {
                $this->sendSuccess('Saldo actualizado');
            } else {
                $this->sendError('No se pudo actualizar');
            }
        } catch (\Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    /**
     * Compatibilidad: ajuste de saldo vía FormData (POST clásico).
     * Campos: idUsr, monto (positivo suma / negativo resta), opcional comentario|comment, transferId.
     */
    public function ajustarSaldo() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $idUsr = isset($_POST['idUsr']) ? (int) $_POST['idUsr'] : 0;
            $monto = isset($_POST['monto']) ? (float) $_POST['monto'] : 0.0;
            if ($idUsr <= 0) {
                $this->sendError('Usuario inválido.');
            }
            if (abs($monto) < 1e-9) {
                $this->sendError('Monto inválido.');
            }
            $rawComment = $_POST['comentario'] ?? ($_POST['comment'] ?? '');
            $comment = is_string($rawComment) ? trim($rawComment) : '';
            if ($comment === '') {
                $comment = null;
            }
            $rawTid = $_POST['transferId'] ?? '';
            $transferId = is_string($rawTid) ? trim($rawTid) : '';
            if ($transferId === '') {
                $transferId = null;
            }
            $res = $this->model->updateBalance($idUsr, $sesion['instId'], $monto, $sesion['userId'], $transferId, $comment);
            if ($res) {
                $this->sendSuccess(['ok' => true]);
            }
            $this->sendError('No se pudo actualizar el saldo.');
        } catch (\Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    public function processPayment() {
        $f = $this->getRequestData();
        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad Total
            $this->model->processPaymentTransaction($f['idUsr'], $f['monto'], $f['items'], $sesion['instId'], $sesion['userId']);
            $this->sendSuccess("Pago procesado");
        } catch (\Exception $e) { $this->sendError($e->getMessage()); }
    }

    /**
     * Registra pago de formularios derivados (facturación por institución).
     */
    public function processPaymentInstitucion() {
        $f = $this->getRequestData();
        try {
            $sesion = Auditoria::getDatosSesion();
            $items = $f['items'] ?? [];
            if (empty($items)) {
                $this->sendError('No hay ítems seleccionados para pagar.');
                return;
            }
            $this->model->processPaymentInstitucionDerivada($items, $sesion['instId'], $sesion['userId']);
            $this->sendSuccess("Pago registrado correctamente.");
        } catch (\Exception $e) {
            $this->sendError($e->getMessage());
        }
    }

    public function ajustarPagoIndividual() {
        $input = $this->getRequestData(); 
        if (!isset($input['id'], $input['monto'], $input['accion'])) $this->jsonResponse('error', 'Datos incompletos');

        try {
            $sesion = Auditoria::getDatosSesion();
            $res = $this->model->procesarAjustePago($input['id'], $input['monto'], $input['accion'], $sesion['userId'], $sesion['instId']);
            if ($res) $this->jsonResponse('success', 'Transacción procesada');
            else $this->jsonResponse('error', 'Error de BD');
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function ajustarPagoInsumo() {
        $input = $this->getRequestData();
        if (!isset($input['id'], $input['monto'], $input['accion'])) $this->jsonResponse('error', 'Datos incompletos');

        try {
            $sesion = Auditoria::getDatosSesion();
            $res = $this->model->procesarAjustePagoInsumo($input['id'], $input['monto'], $input['accion'], $sesion['userId'], $sesion['instId']);
            if ($res) {
                $this->jsonResponse('success', 'Pago de insumo procesado');
            }
            $this->jsonResponse('error', 'Error en base de datos');
        } catch (\Exception $e) {
            $this->jsonResponse('error', $e->getMessage());
        }
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
            $sesion = Auditoria::getDatosSesion();
            $instId = (int) ($sesion['instId'] ?? 0);
            $info = $this->model->getProtocolHeaderInfo($idProt);
            $formularios = $this->model->getPedidosProtocolo($idProt, $desde, $hasta);
            if ($instId > 0) {
                $this->enrichPedidosFacturacionDerivada($formularios, $instId);
            }
            $alojamientos = $this->model->getAlojamientosProtocolo($idProt, $desde, $hasta);
            $insumos = $this->model->getInsumosByProtocolo($idProt, $desde, $hasta);
            if ($instId > 0) {
                $mapaSaldosProt = $this->model->getSaldosPorInstitucion($instId);
                $this->enrichInsumosFacturacionDerivadaSaldo($insumos, $mapaSaldosProt, $instId);
            }

            $insumoIdsSet = [];
            foreach ($insumos as $rowIns) {
                $ik = (string)($rowIns['id'] ?? $rowIns['idformA'] ?? '');
                if ($ik !== '') {
                    $insumoIdsSet[$ik] = true;
                }
            }

            // Los insumos de pedido van en $insumos; la grilla principal = animales/reactivos (exclusión por id, no por texto).
            $deudaAni = 0; $deudaRea = 0; $pagadoTotal = 0;
            $formulariosFiltrados = [];

            foreach ($formularios as $f) {
                $fid = (string)($f['id'] ?? '');
                if ($fid !== '' && isset($insumoIdsSet[$fid])) {
                    continue;
                }

                $cat = strtolower($f['categoria'] ?? '');

                if (strpos($cat, 'reactivo') !== false) {
                    $deudaRea += (float)$f['debe'];
                } else {
                    $deudaAni += (float)$f['debe'];
                }

                $pagadoTotal += (float)$f['pagado'];
                $formulariosFiltrados[] = $f;
            }
            
            $deudaAloj = array_sum(array_column($alojamientos, 'debe'));
            $pagadoTotal += array_sum(array_column($alojamientos, 'pagado'));

            $deudaInsumos = array_sum(array_column($insumos, 'debe'));
            $pagadoTotal += array_sum(array_column($insumos, 'pagado'));

            $this->jsonResponse('success', [
                'info' => $info,
                'formularios' => $formulariosFiltrados,
                'alojamientos' => $alojamientos,
                'insumos' => $insumos,
                'totales' => [
                    'deudaAnimales'    => $deudaAni,
                    'deudaReactivos'   => $deudaRea,
                    'deudaAlojamiento' => $deudaAloj,
                    'deudaInsumos'     => $deudaInsumos,
                    'deudaTotal'       => ($deudaAni + $deudaRea + $deudaAloj + $deudaInsumos),
                    'totalPagado'      => $pagadoTotal
                ]
            ]);
        } catch (\Exception $e) { $this->jsonResponse('error', $e->getMessage()); }
    }

    public function getAnimalDetail($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAnimalDetailById($id, $sesion['instId']);
            if (!$data) {
                $this->jsonResponse('error', 'El registro ' . $id . ' no existe en el sistema.');
                return;
            }
            $this->jsonResponse('success', $data);
        } catch (\Exception $e) { $this->jsonResponse('error', 'Error interno: ' . $e->getMessage()); }
    }

    public function getReactiveDetail($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getReactiveDetailById($id, $sesion['instId']);
            if (!$data) return $this->jsonResponse('error', 'No se encontró el reactivo solicitado.');
            return $this->jsonResponse('success', $data);
        } catch (\Exception $e) { return $this->jsonResponse('error', 'Error interno: ' . $e->getMessage()); }
    }

    public function getInsumoDetail($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getInsumoDetailById($id, $sesion['instId']);
            if (!$data) return $this->jsonResponse('error', 'No se encontraron datos para el insumo #' . $id);
            return $this->jsonResponse('success', $data);
        } catch (\Exception $e) { return $this->jsonResponse('error', 'Error en el servidor: ' . $e->getMessage()); }
    }

    public function updateInsumoLinePrecio() {
        $input = $this->getRequestData();
        if (!isset($input['idForminsumo'], $input['precio_unitario'])) {
            return $this->jsonResponse('error', 'Datos incompletos (idForminsumo, precio_unitario).');
        }
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->model->updateInsumoLinePrecioMomento(
                (int)$input['idForminsumo'],
                (float)$input['precio_unitario'],
                (int)$sesion['instId'],
                (int)$sesion['userId']
            );
            return $this->jsonResponse('success', ['ok' => true]);
        } catch (\InvalidArgumentException $e) {
            return $this->jsonResponse('error', $e->getMessage());
        } catch (\RuntimeException $e) {
            return $this->jsonResponse('error', $e->getMessage());
        } catch (\Exception $e) {
            return $this->jsonResponse('error', $e->getMessage());
        }
    }

    public function getAlojamientoDetail($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $historia = (int)$id;
            if ($historia <= 0) {
                return $this->jsonResponse('error', 'ID de historia inválido');
            }
            $data = $this->model->getLegacyAlojamientoModalData($historia, (int)$sesion['instId']);
            if ($data === null) {
                return $this->jsonResponse('error', 'No se encontró alojamiento para esa historia en esta institución.');
            }
            return $this->jsonResponse('success', $data);
        } catch (\Exception $e) {
            return $this->jsonResponse('error', $e->getMessage());
        }
    }

    public function updateAlojamiento() {
        $f = $this->getRequestData();
        if (!isset($f['historia'], $f['dias'], $f['total'], $f['pago'])) {
            return $this->jsonResponse('error', 'Datos incompletos (historia, días, total, pago).');
        }
        try {
            $sesion = Auditoria::getDatosSesion();
            $ok = $this->model->updateLegacyAlojamientoModal(
                (int)$f['historia'],
                (int)$sesion['instId'],
                $f['dias'],
                $f['total'],
                $f['pago']
            );
            if (!$ok) {
                return $this->jsonResponse('error', 'No se pudo actualizar el registro.');
            }
            return $this->jsonResponse('success', ['ok' => true]);
        } catch (\Exception $e) {
            return $this->jsonResponse('error', $e->getMessage());
        }
    }

    public function getInvestigatorBalance($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $saldo = $this->model->getSaldoByInvestigador($id, $sesion['instId']);
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

    /**
     * Popup historial de saldo: movimientos de saldo (CARGA_SALDO) vs pagos (liquidaciones/ajustes) separados.
     * GET /billing/saldo-historial?idUsr=..&from=YYYY-MM-DD&to=YYYY-MM-DD&scope=investigador|depto|protocolo&refId=..
     */
    public function getSaldoHistorial() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int) $sesion['instId'];

            $idUsr = isset($_GET['idUsr']) ? (int) $_GET['idUsr'] : 0;
            if ($idUsr <= 0) {
                $this->jsonResponse('error', 'Usuario inválido.');
            }
            $from = !empty($_GET['from']) ? (string) $_GET['from'] : null;
            $to = !empty($_GET['to']) ? (string) $_GET['to'] : null;
            $scope = !empty($_GET['scope']) ? strtolower(trim((string) $_GET['scope'])) : 'investigador';
            $refId = isset($_GET['refId']) && $_GET['refId'] !== '' ? (int) $_GET['refId'] : null;

            if ($scope === 'depto' && ($refId === null || $refId <= 0)) {
                $this->jsonResponse('error', 'Se requiere un departamento válido (refId) para el historial por área.');
            }
            if ($scope === 'protocolo' && ($refId === null || $refId <= 0)) {
                $this->jsonResponse('error', 'Se requiere un protocolo válido (refId) para el historial por protocolo.');
            }

            $split = $this->model->getSaldoHistorialSplit($instId, $idUsr, $from, $to, $scope, $refId);
            $saldo = $this->model->getSaldoByInvestigador($idUsr, $instId);
            $this->jsonResponse('success', [
                'saldo' => $saldo,
                'movimientos_saldo' => $split['movimientos_saldo'] ?? [],
                'pagos' => $split['pagos'] ?? [],
            ]);
        } catch (\Exception $e) {
            $this->jsonResponse('error', $e->getMessage());
        }
    }
}