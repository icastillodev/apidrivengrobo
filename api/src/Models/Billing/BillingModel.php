<?php
namespace App\Models\Billing;

use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class BillingModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // ... [TODO EL BLOQUE DE GETTERS SE MANTIENE EXACTAMENTE IGUAL HASTA "updateBalance"] ...
public function getProtocolosByDepto($deptoId) {
        $sql = "SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA, p.IdUsrA,
                       CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador
                FROM protocoloexpe p JOIN personae u ON p.IdUsrA = u.IdUsrA
                WHERE p.departamento = ? AND p.idprotA > 0"; 
        $stmt = $this->db->prepare($sql); $stmt->execute([$deptoId]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
public function getPedidosProtocolo($idProt, $desde = null, $hasta = null) {
        $sql = "SELECT f.idformA as id, CONCAT(u.NombreA, ' ', u.ApellidoA) as solicitante,
                f.fechainicioA as fecha, f.fecRetiroA, e.EspeNombreA as nombre_especie,
                se.SubEspeNombreA as nombre_subespecie, tf.categoriaformulario as categoria,
                tf.nombreTipo as nombre_tipo, tf.exento, tf.descuento, ie.NombreInsumo,
                ie.CantidadInsumo, ie.TipoInsumo, s.totalA as cant_animal, s.organo as cant_organo,
                pf.precioformulario, pf.totalpago as pago_ani, pif.preciototal as total_ins, pif.totalpago as pago_ins, pf.precioanimalmomento, f.estado
                FROM formularioe f
                JOIN protformr pf_link ON f.idformA = pf_link.idformA
                JOIN personae u ON f.IdUsrA = u.IdUsrA JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN precioformulario pf ON f.idformA = pf.idformA
                LEFT JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                LEFT JOIN formespe fe ON f.idformA = fe.idformA LEFT JOIN especiee e ON fe.idespA = e.idespA
                LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA
                WHERE pf_link.idprotA = ? AND f.estado = 'Entregado'";
        
        $params = [$idProt];
        if ($desde && $hasta) { $sql .= " AND f.fechainicioA BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['is_exento'] = ((int)$r['exento'] === 1);
            $totalForm = (float)$r['precioformulario'] + (float)$r['total_ins'];
            $pagadoTotal = (float)$r['pago_ani'] + (float)$r['pago_ins'];
            $pMomento = (float)$r['precioanimalmomento'];
            $esRea = (strpos(strtolower($r['categoria']), 'reactivo') !== false);
            $cantDiv = $esRea ? (float)$r['cant_organo'] : (float)$r['cant_animal'];

            if ($pMomento <= 0 && $cantDiv > 0) $pMomento = $totalForm / $cantDiv;

            $r['total'] = $totalForm; $r['p_unit'] = $pMomento; $r['pagado'] = $pagadoTotal;
            $r['debe'] = $r['is_exento'] ? 0 : max(0, $r['total'] - $r['pagado']);

            $cat = $r['categoria'] ?: ""; $nom = $r['nombre_tipo'] ?: "";
            $dcto = ($r['descuento'] > 0) ? " <small class='text-success'>(Dcto: {$r['descuento']}%)</small>" : "";

            if ($esRea) {
                 $r['cantidad_display'] = "<b>{$r['NombreInsumo']} {$r['CantidadInsumo']} {$r['TipoInsumo']} - {$r['cant_organo']} un</b>";
                 $r['detalle_display'] = (strpos(strtolower($cat), 'otros reactivos') !== false) 
                    ? "<b>$cat</b> - $nom$dcto" : "<b>Reactivo</b> : <b>{$r['NombreInsumo']}</b>$dcto";
            } else {
                 $r['cantidad_display'] = "{$r['cant_animal']} un.";
                 $r['detalle_display'] = ($cat === $nom) ? "<b>$cat</b>$dcto" : "<b>$cat</b> - $nom$dcto";
            }
            $r['taxonomia'] = ($r['nombre_especie'] ?? '-') . ($r['nombre_subespecie'] ? " : {$r['nombre_subespecie']}" : "");
        }
        return $rows;
    }

// 1. ALOJAMIENTOS: Ajustado el alias y preparado para el nombre de la estructura
    public function getAlojamientosProtocolo($idProt, $desde = null, $hasta = null) {
        $sql = "SELECT MAX(a.IdAlojamiento) as last_id, a.historia, MAX(e.EspeNombreA) as especie, 
                MAX(COALESCE(ta.NombreTipoAlojamiento, 'Estructura')) as caja, 
                MAX(a.PrecioCajaMomento) as p_caja,
                MAX(a.CantidadCaja) as cant_caja,
                MIN(a.fechavisado) as fecha_inicio, MAX(IFNULL(a.hastafecha, CURDATE())) as fecha_fin,
                SUM(DATEDIFF(IFNULL(a.hastafecha, CURDATE()), a.fechavisado)) as dias, 
                SUM(a.cuentaapagar) as total_guardado,
                SUM(a.totalpago) as pagado, MAX(p.IdUsrA) as IdUsrA,
                MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as TitularProtocolo
                FROM alojamiento a 
                LEFT JOIN especiee e ON a.TipoAnimal = e.idespA
                LEFT JOIN tipoalojamiento ta ON a.IdTipoAlojamiento = ta.IdTipoAlojamiento
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA 
                LEFT JOIN personae u ON p.IdUsrA = u.IdUsrA
                WHERE a.idprotA = ? AND a.historia IS NOT NULL";
        
        $params = [$idProt];
        if ($desde && $hasta) { $sql .= " AND a.fechavisado BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $sql .= " GROUP BY a.historia";
        
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $dias = (int)$r['dias'];
            $precio = (float)$r['p_caja'];
            $cant = (int)$r['cant_caja'];
            $totalCalc = $dias * $precio * $cant;
            
            $r['total'] = (float)$r['total_guardado'] > 0 ? (float)$r['total_guardado'] : $totalCalc;
            $r['pagado'] = (float)$r['pagado'];
            $r['debe'] = max(0, $r['total'] - $r['pagado']);
            $r['periodo'] = date("d/m", strtotime($r['fecha_inicio'])) . " - " . date("d/m", strtotime($r['fecha_fin']));
        }
        return $rows;
    }

// 2. INSUMOS POR DEPARTAMENTO: Matemática detallada en el texto
    public function getInsumosGenerales($deptoId, $desde, $hasta) {
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante,
                MAX(d.SaldoDinero) as saldoInv, 
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado 
                FROM formularioe f JOIN personae u ON f.IdUsrA = u.IdUsrA
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario
                JOIN insumo i ON fi.IdInsumo = i.idInsumo 
                WHERE f.depto = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ? GROUP BY f.idformA";
        
        $stmt = $this->db->prepare($sql); $stmt->execute([$deptoId, $desde, $hasta]); $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['total_item'] = (float)$r['total_item']; $r['pagado'] = (float)$r['pagado']; 
            $r['debe'] = max(0, $r['total_item'] - $r['pagado']);
        }
        return $rows;
    }

    // ========================================================
    // LOGICA TRANSACCIONAL: ACTUALIZACIÓN DE SALDOS Y PAGOS
    // ========================================================

public function updateBalance($idUsr, $inst, $monto, $adminId) {
        $check = $this->db->prepare("SELECT IdDinero FROM dinero WHERE IdUsrA = ? AND IdInstitucion = ?");
        $check->execute([$idUsr, $inst]);
        $exists = $check->fetch();

        if ($exists) {
            $sql = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
            $res = $this->db->prepare($sql)->execute([$monto, $idUsr, $inst]);
        } else {
            $sql = "INSERT INTO dinero (IdUsrA, IdInstitucion, SaldoDinero) VALUES (?, ?, ?)";
            $res = $this->db->prepare($sql)->execute([$idUsr, $inst, $monto]);
        }

        Auditoria::log($this->db, 'FINANCIERO', 'dinero', "Ajuste de Saldo: $$monto al usuario ID: $idUsr");
        
        // CORREGIDO: IdFormA en lugar de IdFromA
        $this->db->prepare("INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion) 
                            VALUES (?, ?, ?, 0, CURDATE(), 'CARGA_SALDO', ?)")
                 ->execute([$adminId, $monto, $idUsr, $inst]);

        return $res;
    }
public function processPaymentTransaction($idUsr, $monto, $items, $inst, $adminId) {
        try {
            $this->db->beginTransaction();
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
            $this->db->prepare($sqlSaldo)->execute([$monto, $idUsr, $inst]);

            foreach ($items as $item) {
                $id = $item['id'];
                $monto_item = (float)$item['monto_pago'];

                if ($item['tipo'] === 'INSUMO_GRAL' || $item['tipo'] === 'FORM') {
                    $this->db->prepare("UPDATE precioinsumosformulario SET totalpago = totalpago + ? WHERE idformA = ?")->execute([$monto_item, $id]);
                    if ($item['tipo'] === 'FORM') {
                        $this->db->prepare("UPDATE precioformulario SET totalpago = totalpago + ? WHERE idformA = ?")->execute([$monto_item, $id]);
                    }
                    
                    // CORREGIDO: IdFormA en lugar de IdFromA
                    $this->db->prepare("INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion) 
                                        VALUES (?, ?, ?, ?, CURDATE(), 'LIQUIDACION', ?)")
                             ->execute([$adminId, $monto_item, $idUsr, $id, $inst]);

                } else if ($item['tipo'] === 'ALOJ') {
                    $this->db->prepare("UPDATE alojamiento SET totalpago = totalpago + ? WHERE historia = ?")->execute([$monto_item, $id]);
                    
                    // CORREGIDO: IdFormA en lugar de IdFromA
                    $this->db->prepare("INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion) 
                                        VALUES (?, ?, ?, ?, CURDATE(), 'LIQUIDACION_ALOJ', ?)")
                             ->execute([$adminId, $monto_item, $idUsr, $id, $inst]);
                }
            }

            Auditoria::log($this->db, 'PAGO_MASIVO', 'dinero', "Liquidación de $$monto por Usuario ID: $idUsr");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }
public function procesarAjustePago($id, $monto, $accion, $adminId) {
        try {
            $this->db->beginTransaction();
            $sql = "SELECT f.IdUsrA, f.IdInstitucion FROM formularioe f WHERE f.idformA = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $data = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($accion === 'PAGAR') {
                $sqlPago = "UPDATE precioformulario SET totalpago = totalpago + ? WHERE idformA = ?";
                $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
                $tipoHist = "PAGO_INDIVIDUAL";
            } else {
                $sqlPago = "UPDATE precioformulario SET totalpago = totalpago - ? WHERE idformA = ?";
                $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
                $tipoHist = "DEVOLUCION";
            }

            $this->db->prepare($sqlPago)->execute([$monto, $id]);
            $this->db->prepare($sqlSaldo)->execute([$monto, $data['IdUsrA'], $data['IdInstitucion']]);

            Auditoria::log($this->db, $tipoHist, 'precioformulario', "Ajuste $accion de $$monto en Formulario #$id");
            
            // CORREGIDO: IdFormA (antes decía IdFromA)
            $this->db->prepare("INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion) 
                                VALUES (?, ?, ?, ?, CURDATE(), ?, ?)")
                     ->execute([$adminId, $monto, $data['IdUsrA'], $id, $tipoHist, $data['IdInstitucion']]);

            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); return false; }
    }


public function procesarAjustePagoAloj($historiaId, $monto, $accion, $adminId) {
        try {
            $this->db->beginTransaction();
            
            // CORRECCIÓN CRÍTICA: Traemos el IdTitular del protocolo, no el IdUsrA del alojamiento (que es el técnico)
            $sqlInfo = "SELECT a.IdInstitucion, p.IdUsrA as IdTitular 
                        FROM alojamiento a 
                        INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA 
                        WHERE a.historia = ? LIMIT 1";
            $stmtInfo = $this->db->prepare($sqlInfo); $stmtInfo->execute([$historiaId]);
            $data = $stmtInfo->fetch(\PDO::FETCH_ASSOC);

            if (!$data) throw new \Exception("Historia no encontrada");
            
            $idPagador = $data['IdTitular'];

            if ($accion === 'PAGAR') {
                $sqlAloj = "UPDATE alojamiento SET totalpago = totalpago + ? WHERE historia = ?";
                $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
                $tipoHist = "PAGO_ALOJ";
            } else {
                $sqlAloj = "UPDATE alojamiento SET totalpago = totalpago - ? WHERE historia = ?";
                $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
                $tipoHist = "DEVOLUCION_ALOJ";
            }

            $this->db->prepare($sqlAloj)->execute([$monto, $historiaId]);
            $this->db->prepare($sqlSaldo)->execute([$monto, $idPagador, $data['IdInstitucion']]);

            Auditoria::log($this->db, $tipoHist, 'alojamiento', "Ajuste $accion de $$monto en Historia #$historiaId");

            $this->db->prepare("INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion) 
                                VALUES (?, ?, ?, ?, CURDATE(), ?, ?)")
                     ->execute([$adminId, $monto, $idPagador, $historiaId, $tipoHist, $data['IdInstitucion']]);

            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); return false; }
    }

    // ... [TODO EL RESTO DEL BLOQUE DE GETTERS SIGUE IGUAL] ...
    public function getSaldosPorInstitucion($instId) {
        $sql = "SELECT IdUsrA, SaldoDinero FROM dinero WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }
    public function getAnimalDetailById($id) {
        $sql = "SELECT f.idformA, p.idprotA as id_protocolo, p.IdUsrA as id_usr_protocolo, f.tipoA as id_tipo_form, tf.nombreTipo as nombre_tipo, CONCAT(p.nprotA, ' - ', p.tituloA) as protocolo_info, CONCAT(e.EspeNombreA, ' : ', COALESCE(se.SubEspeNombreA, 'N/A')) as taxonomia, f.edadA as edad, f.pesoa as peso, tf.exento as is_exento, COALESCE(s.machoA, 0) as machos, COALESCE(s.hembraA, 0) as hembras, COALESCE(s.indistintoA, 0) as indistintos, COALESCE(s.totalA, 0) as cantidad, f.fechainicioA as fecha_inicio, f.fecRetiroA as fecha_fin, f.aclaraA as aclaracion_usuario, COALESCE(f.aclaracionadm, 'No hay aclaraciones del administrador.') as nota_admin, COALESCE(pf.precioanimalmomento, 0) as precio_unitario, COALESCE(pf.precioformulario, 0) as total_calculado, COALESCE(pf.totalpago, 0) as totalpago, COALESCE(tf.descuento, 0) as descuento, COALESCE(d.SaldoDinero, 0) as saldoInv, CONCAT(u_tit.ApellidoA, ', ', u_tit.NombreA) as titular_nombre, CONCAT(u_sol.ApellidoA, ', ', u_sol.NombreA) as solicitante FROM formularioe f INNER JOIN personae u_sol ON f.IdUsrA = u_sol.IdUsrA LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario LEFT JOIN protformr rf ON f.idformA = rf.idformA LEFT JOIN protocoloexpe p ON rf.idprotA = p.idprotA LEFT JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA LEFT JOIN precioformulario pf ON f.idformA = pf.idformA LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN formespe fe ON f.idformA = fe.idformA LEFT JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA LEFT JOIN dinero d ON p.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion WHERE f.idformA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    public function getReactiveDetailById($id) {
        $sql = "SELECT f.idformA, p.idprotA as id_protocolo, p.IdUsrA as id_usr_protocolo, f.tipoA as id_tipo_form, tf.nombreTipo as nombre_tipo, CONCAT(p.nprotA, ' - ', p.tituloA) as protocolo_info, ie.NombreInsumo as nombre_reactivo, ie.CantidadInsumo as presentacion_reactivo, ie.TipoInsumo as unidad_medida, COALESCE(s.organo, 0) as cantidad_organos, COALESCE(s.totalA, 0) as cantidad_animales_vinculados, f.fechainicioA as fecha_inicio, f.fecRetiroA as fecha_fin, COALESCE(f.aclaracionadm, 'No hay aclaraciones del administrador.') as nota_admin, COALESCE(pif.precioformulario, 0) as total_calculado, COALESCE(pif.totalpago, 0) as totalpago, COALESCE(tf.descuento, 0) as descuento, tf.exento as is_exento, COALESCE(d.SaldoDinero, 0) as saldoInv, CONCAT(u_tit.ApellidoA, ', ', u_tit.NombreA) as titular_nombre, CONCAT(u_sol.ApellidoA, ', ', u_sol.NombreA) as solicitante FROM formularioe f INNER JOIN personae u_sol ON f.IdUsrA = u_sol.IdUsrA LEFT JOIN protformr rf ON f.idformA = rf.idformA LEFT JOIN protocoloexpe p ON rf.idprotA = p.idprotA INNER JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN precioformulario pif ON f.idformA = pif.idformA LEFT JOIN dinero d ON u_tit.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion WHERE f.idformA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
// 4. DETALLE DE INSUMO (MODAL): Matemática detallada en el texto
    public function getInsumoDetailById($id) {
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante, MAX(d.SaldoDinero) as saldoInv, 
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo, 
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado 
                FROM formularioe f 
                JOIN personae u ON f.IdUsrA = u.IdUsrA 
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion 
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario 
                JOIN insumo i ON fi.IdInsumo = i.idInsumo 
                WHERE f.idformA = ? GROUP BY f.idformA";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $r = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($r) { 
            $r['total_item'] = (float)$r['total_item']; $r['pagado'] = (float)$r['pagado']; 
            $r['debe'] = max(0, $r['total_item'] - $r['pagado']); 
        }
        return $r;
    }
    public function getBasicUserInfo($idUsr, $idInst) {
        $sql = "SELECT p.IdUsrA, CONCAT(p.ApellidoA, ', ', p.NombreA) as NombreCompleto, COALESCE(d.SaldoDinero, 0) as SaldoDinero FROM personae p LEFT JOIN dinero d ON p.IdUsrA = d.IdUsrA AND d.IdInstitucion = ? WHERE p.IdUsrA = ? LIMIT 1";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idInst, $idUsr]); return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    public function getProtocolosByInvestigador($idUsr, $idInst) {
        $sql = "SELECT idprotA, nprotA, tituloA, CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador FROM protocoloexpe p JOIN personae u ON p.IdUsrA = u.IdUsrA WHERE p.IdUsrA = ? AND p.IdInstitucion = ?";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idUsr, $idInst]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
// 3. INSUMOS POR INVESTIGADOR: Matemática detallada en el texto
    public function getInsumosByUser($idUsr, $idInst, $desde = null, $hasta = null) {
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante, MAX(d.SaldoDinero) as saldoInv, 
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo, 
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado, MAX(tf.exento) as is_exento 
                FROM formularioe f 
                JOIN personae u ON f.IdUsrA = u.IdUsrA 
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion 
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario 
                JOIN insumo i ON fi.IdInsumo = i.idInsumo 
                JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario 
                WHERE f.IdUsrA = ? AND f.IdInstitucion = ? AND f.estado = 'Entregado' AND (f.depto = 0 OR f.depto IS NULL)";
        $params = [$idUsr, $idInst];
        if ($desde && $hasta) { $sql .= " AND f.fechainicioA BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $sql .= " GROUP BY f.idformA";
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { 
            $r['total_item'] = (float)$r['total_item']; $r['pagado'] = (float)$r['pagado']; 
            $r['debe'] = ($r['is_exento'] == 1) ? 0 : max(0, $r['total_item'] - $r['pagado']); 
        }
        return $rows;
    }
    public function getActiveInvestigators($idInst) {
        $sql = "SELECT DISTINCT u.IdUsrA, u.ApellidoA, u.NombreA FROM personae u WHERE u.IdUsrA IN ( SELECT p.IdUsrA FROM protocoloexpe p JOIN protformr pf ON p.idprotA = pf.idprotA JOIN formularioe f ON pf.idformA = f.idformA WHERE f.estado = 'Entregado' AND p.IdInstitucion = ? UNION SELECT p.IdUsrA FROM protocoloexpe p JOIN alojamiento a ON p.idprotA = a.idprotA WHERE p.IdInstitucion = ? UNION SELECT f.IdUsrA FROM formularioe f WHERE f.estado = 'Entregado' AND f.IdInstitucion = ? AND f.tipoA IN (SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario LIKE '%insumo%') ) ORDER BY u.ApellidoA ASC";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idInst, $idInst, $idInst]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    public function getActiveProtocols($idInst) {
        $sql = "SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA, CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador FROM protocoloexpe p INNER JOIN personae u ON p.IdUsrA = u.IdUsrA INNER JOIN protformr pf ON p.idprotA = pf.idprotA INNER JOIN formularioe f ON pf.idformA = f.idformA WHERE p.IdInstitucion = ? AND f.estado = 'Entregado' ORDER BY p.nprotA DESC";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idInst]); return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    public function getProtocolHeaderInfo($idProt) {
        $sql = "SELECT p.idprotA, p.nprotA, p.tituloA, p.IdUsrA, CONCAT(u.ApellidoA, ', ', u.NombreA) as Responsable, d.NombreDeptoA as Departamento, COALESCE(din.SaldoDinero, 0) as SaldoPI FROM protocoloexpe p JOIN personae u ON p.IdUsrA = u.IdUsrA JOIN departamentoe d ON p.departamento = d.iddeptoA LEFT JOIN dinero din ON u.IdUsrA = din.IdUsrA AND p.IdInstitucion = din.IdInstitucion WHERE p.idprotA = ? LIMIT 1";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idProt]); return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    public function getSaldoByInvestigador($idUsuario) {
        $sql = "SELECT COALESCE(SaldoDinero, 0) as saldo FROM dinero WHERE IdUsrA = ? LIMIT 1";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idUsuario]); $res = $stmt->fetch(PDO::FETCH_ASSOC);
        return $res ? (float)$res['saldo'] : 0.0;
    }
    public function getFinancialAudit($instId) {
        $sql = "SELECT h.IdHistoPago, h.Monto, h.IdFormA, h.fecha, h.TipoHistorial,
                       CONCAT(a.NombreA, ' ', a.ApellidoA) as AdminCompleto,
                       CONCAT(u.NombreA, ' ', u.ApellidoA) as UsrCompleto
                FROM historialpago h
                LEFT JOIN personae a ON h.IdUsrAAdmin = a.IdUsrA
                LEFT JOIN personae u ON h.IdUsrA = u.IdUsrA
                WHERE h.IdInstitucion = ?
                ORDER BY h.fecha DESC, h.IdHistoPago DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}