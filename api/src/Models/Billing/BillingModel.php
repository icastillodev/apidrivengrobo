<?php
namespace App\Models\Billing;

use PDO;

class BillingModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

public function getProtocolosByDepto($deptoId) {
    // Consulta directa a protocolos y usuarios para evitar duplicados
    $sql = "SELECT DISTINCT 
                p.idprotA, 
                p.nprotA, 
                p.tituloA, 
                p.IdUsrA,
                CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador
            FROM protocoloexpe p
            JOIN personae u ON p.IdUsrA = u.IdUsrA
            WHERE p.departamento = ? AND p.idprotA > 0"; 
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$deptoId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
public function getPedidosProtocolo($idProt, $desde = null, $hasta = null) {
    $sql = "SELECT f.idformA as id, 
            CONCAT(u.NombreA, ' ', u.ApellidoA) as solicitante,
            f.fechainicioA as fecha, 
            e.EspeNombreA as nombre_especie,
            se.SubEspeNombreA as nombre_subespecie,
            tf.categoriaformulario as categoria,
            tf.nombreTipo as nombre_tipo,
            tf.exento,
            tf.descuento,
            ie.NombreInsumo,
            ie.CantidadInsumo,
            ie.TipoInsumo,
            s.totalA as cant_animal,
            s.organo as cant_organo,
            pf.precioformulario,            -- Total de la tabla animales
            pf.totalpago as pago_ani,       -- Pagado en tabla animales
            pif.preciototal as total_ins,    -- Total de la tabla insumos
            pif.totalpago as pago_ins,       -- Pagado en tabla insumos
            pf.precioanimalmomento,
            f.estado
            FROM formularioe f
            JOIN protformr pf_link ON f.idformA = pf_link.idformA
            JOIN personae u ON f.IdUsrA = u.IdUsrA
            JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            LEFT JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN precioformulario pf ON f.idformA = pf.idformA
            LEFT JOIN precioinsumosformulario pif ON f.idformA = pif.idformA -- Unimos para traer costos de insumos
            LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
            LEFT JOIN formespe fe ON f.idformA = fe.idformA 
            LEFT JOIN especiee e ON fe.idespA = e.idespA
            LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA
            WHERE pf_link.idprotA = ? AND f.estado = 'Entregado'";
    
    $params = [$idProt];
    if ($desde && $hasta) {
        $sql .= " AND f.fechainicioA BETWEEN ? AND ?";
        array_push($params, $desde, $hasta);
    }

    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['is_exento'] = ((int)$r['exento'] === 1);
        
        // SUMA DE TOTALES: Animales + Insumos
        $totalForm = (float)$r['precioformulario'] + (float)$r['total_ins'];
        
        // SUMA DE PAGOS: Lo que se pagó por animales + lo que se pagó por insumos
        $pagadoTotal = (float)$r['pago_ani'] + (float)$r['pago_ins'];
        
        $pMomento = (float)$r['precioanimalmomento'];
        
        // Cantidad según tipo para la división (para el precio unitario sugerido)
        $esRea = (strpos(strtolower($r['categoria']), 'reactivo') !== false);
        $cantDiv = $esRea ? (float)$r['cant_organo'] : (float)$r['cant_animal'];

        if ($pMomento <= 0 && $cantDiv > 0) {
            $pMomento = $totalForm / $cantDiv;
        }

        $r['total'] = $totalForm; 
        $r['p_unit'] = $pMomento;
        $r['pagado'] = $pagadoTotal; // Ahora sí refleja el pago real de la DB
        
        // Cálculo de deuda: Si es exento es 0, sino es Total - Pagado
        $r['debe'] = $r['is_exento'] ? 0 : max(0, $r['total'] - $r['pagado']);

        // Formateo de concepto para la vista
        $cat = $r['categoria'] ?: "";
        $nom = $r['nombre_tipo'] ?: "";
        $dcto = ($r['descuento'] > 0) ? " <small class='text-success'>(Dcto: {$r['descuento']}%)</small>" : "";

        if ($esRea) {
             $r['cantidad_display'] = "<b>{$r['NombreInsumo']} {$r['CantidadInsumo']} {$r['TipoInsumo']} - {$r['cant_organo']} un</b>";
             $r['detalle_display'] = (strpos(strtolower($cat), 'otros reactivos') !== false) 
                ? "<b>$cat</b> - $nom$dcto" 
                : "<b>Reactivo</b> : <b>{$r['NombreInsumo']}</b>$dcto";
        } else {
             $r['cantidad_display'] = "{$r['cant_animal']} un.";
             $r['detalle_display'] = ($cat === $nom) ? "<b>$cat</b>$dcto" : "<b>$cat</b> - $nom$dcto";
        }
        
        $r['taxonomia'] = ($r['nombre_especie'] ?? '-') . ($r['nombre_subespecie'] ? " : {$r['nombre_subespecie']}" : "");
    }
    return $rows;
}

public function getAlojamientosProtocolo($idProt, $desde = null, $hasta = null) {
    $sql = "SELECT 
                MAX(a.IdAlojamiento) as last_id,
                a.historia,
                MAX(e.EspeNombreA) as especie, 
                MAX(IF(a.totalcajachica > 0, 'Chica', 'Grande')) as caja,
                MAX(IF(a.totalcajachica > 0, e.PalojamientoChica, e.PalojamientoGrande)) as p_caja,
                MIN(a.fechavisado) as fecha_inicio,
                MAX(IFNULL(a.hastafecha, CURDATE())) as fecha_fin,
                SUM(DATEDIFF(IFNULL(a.hastafecha, CURDATE()), a.fechavisado)) as dias,
                SUM(a.cuentaapagar) as total,
                SUM(a.totalpago) as pagado,
                MAX(p.IdUsrA) as IdUsrA -- Usamos el nombre exacto de la base de datos
            FROM alojamiento a
            LEFT JOIN especiee e ON a.TipoAnimal = e.idespA
            INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
            WHERE a.idprotA = ? AND a.historia != ''";
    
    $params = [$idProt];
    if ($desde && $hasta) {
        $sql .= " AND a.fechavisado BETWEEN ? AND ?";
        array_push($params, $desde, $hasta);
    }
    
    $sql .= " GROUP BY a.historia";
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['debe'] = (float)$r['total'] - (float)$r['pagado'];
        $r['periodo'] = date("d/m", strtotime($r['fecha_inicio'])) . " - " . date("d/m", strtotime($r['fecha_fin']));
    }
    
    return $rows;
}
public function getInsumosGenerales($deptoId, $desde, $hasta) {
    $sql = "SELECT 
                f.idformA as id,
                f.IdUsrA, 
                MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante,
                MAX(d.SaldoDinero) as saldoInv, 
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ' (', fi.cantidad, ' ', i.TipoInsumo, ')') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item,
                MAX(pif.totalpago) as pagado -- 1. Agregamos la columna totalpago de la tabla pif
            FROM formularioe f
            JOIN personae u ON f.IdUsrA = u.IdUsrA
            LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion
            JOIN precioinsumosformulario pif ON f.idformA = pif.idformA
            JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario
            JOIN insumo i ON fi.IdInsumo = i.idInsumo
            WHERE f.depto = ? 
            AND f.estado = 'Entregado'
            AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY f.idformA";
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$deptoId, $desde, $hasta]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        // 2. Convertimos a float y usamos el valor real que viene de la base de datos
        $r['total_item'] = (float)$r['total_item'];
        $r['pagado'] = (float)$r['pagado']; 
        
        // 3. Calculamos la deuda real restando el total menos lo que ya se pagó
        $r['debe'] = $r['total_item'] - $r['pagado'];
    }
    return $rows;
}

public function updateBalance($idUsr, $inst, $monto) {
    // 1. Verificamos si ya existe el registro
    $check = $this->db->prepare("SELECT IdDinero FROM dinero WHERE IdUsrA = ? AND IdInstitucion = ?");
    $check->execute([$idUsr, $inst]);
    $exists = $check->fetch();

    if ($exists) {
        // 2. Si existe, sumamos (el monto puede ser negativo si es una resta)
        $sql = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$monto, $idUsr, $inst]);
    } else {
        // 3. Si no existe, lo creamos de cero
        $sql = "INSERT INTO dinero (IdUsrA, IdInstitucion, SaldoDinero) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$idUsr, $inst, $monto]);
    }
}

/**
 * Procesa la transacción de pago impactando saldo y deudas de forma atómica.
 */
public function processPaymentTransaction($idUsr, $monto, $items, $inst) {
    try {
        // Iniciamos la transacción para que si algo falla, no se descuente el dinero
        $this->db->beginTransaction();

        // 1. Descontar el monto del saldo del investigador
        $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        $stmtSaldo = $this->db->prepare($sqlSaldo);
        $stmtSaldo->execute([$monto, $idUsr, $inst]);

        // 2. Recorrer y liquidar cada ítem seleccionado
        foreach ($items as $item) {
            $id = $item['id'];

            // Caso: Insumos (Generales o de Protocolo)
            if ($item['tipo'] === 'INSUMO_GRAL' || $item['tipo'] === 'FORM') {
                
                // Actualizamos la deuda de insumos igualando totalpago a preciototal
                $sqlIns = "UPDATE precioinsumosformulario 
                           SET totalpago = totalpago + (preciototal - totalpago) 
                           WHERE idformA = ?";
                $this->db->prepare($sqlIns)->execute([$id]);

                // Si es un Formulario de Protocolo (FORM), también liquidamos el precio del animal
                if ($item['tipo'] === 'FORM') {
                    $sqlAni = "UPDATE precioformulario 
                               SET totalpago = totalpago + (precioformulario - totalpago) 
                               WHERE idformA = ?";
                    $this->db->prepare($sqlAni)->execute([$id]);
                }

            } 
            // Caso: Alojamiento
            else if ($item['tipo'] === 'ALOJ') {
                $sqlAloj = "UPDATE alojamiento 
                            SET totalpago = totalpago + (cuentaapagar - totalpago) 
                            WHERE historia = ?";
                $this->db->prepare($sqlAloj)->execute([$id]);
            }
        }

        // Si todo salió bien, confirmamos los cambios
        $this->db->commit();
        return true;

    } catch (\Exception $e) {
        // Si hay CUALQUIER error (SQL, conexión, etc.), deshacemos todo
        $this->db->rollBack();
        error_log("Error en Pago: " . $e->getMessage());
        throw $e;
    }
}
/**
 * Obtiene un mapa de saldos de todos los usuarios para una institución específica
 */
public function getSaldosPorInstitucion($instId) {
    $sql = "SELECT IdUsrA, SaldoDinero FROM dinero WHERE IdInstitucion = ?";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId]);
    
    // Retornamos un array asociativo donde la llave es el IdUsrA
    return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
}

/**
 * Obtiene el detalle técnico y financiero real del pedido de ANIMALES.
 * Corregido para que el saldo y el titular correspondan al dueño del protocolo.
 */
public function getAnimalDetailById($id) {
    $sql = "SELECT 
                f.idformA, 
                p.idprotA as id_protocolo,
                p.IdUsrA as id_usr_protocolo, -- ID del que paga (PI)
                f.tipoA as id_tipo_form,
                tf.nombreTipo as nombre_tipo,
                CONCAT(p.nprotA, ' - ', p.tituloA) as protocolo_info,
                CONCAT(e.EspeNombreA, ' : ', COALESCE(se.SubEspeNombreA, 'N/A')) as taxonomia,
                f.edadA as edad,
                f.pesoa as peso,
                tf.exento as is_exento,
                COALESCE(s.machoA, 0) as machos,
                COALESCE(s.hembraA, 0) as hembras,
                COALESCE(s.indistintoA, 0) as indistintos,
                COALESCE(s.totalA, 0) as cantidad,
                f.fechainicioA as fecha_inicio,
                f.fecRetiroA as fecha_fin,
                f.aclaraA as aclaracion_usuario,
                COALESCE(f.aclaracionadm, 'No hay aclaraciones del administrador.') as nota_admin,
                COALESCE(pf.precioanimalmomento, 0) as precio_unitario, 
                COALESCE(pf.precioformulario, 0) as total_calculado,
                COALESCE(pf.totalpago, 0) as totalpago,
                COALESCE(tf.descuento, 0) as descuento,
                -- SALDO: Vinculado al dueño del protocolo (p.IdUsrA)
                COALESCE(d.SaldoDinero, 0) as saldoInv,
                -- IDENTIDADES SEPARADAS
                CONCAT(u_tit.ApellidoA, ', ', u_tit.NombreA) as titular_nombre, -- El que paga
                CONCAT(u_sol.ApellidoA, ', ', u_sol.NombreA) as solicitante     -- El que pidió
            FROM formularioe f
            INNER JOIN personae u_sol ON f.IdUsrA = u_sol.IdUsrA -- Solicitante
            LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            LEFT JOIN protformr rf ON f.idformA = rf.idformA 
            LEFT JOIN protocoloexpe p ON rf.idprotA = p.idprotA
            LEFT JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA -- Titular del protocolo
            LEFT JOIN precioformulario pf ON f.idformA = pf.idformA
            LEFT JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN formespe fe ON f.idformA = fe.idformA 
            LEFT JOIN especiee e ON fe.idespA = e.idespA
            LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA
            -- VÍNCULO DE DINERO: Ahora con p.IdUsrA (Titular)
            LEFT JOIN dinero d ON p.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion
            WHERE f.idformA = ?;";
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$id]);
    return $stmt->fetch(\PDO::FETCH_ASSOC);
}
/**
 * Actualización completa de un registro de animal
 */
public function updateAnimalFull($id, $cant, $precio, $pago) {
    try {
        $this->db->beginTransaction();

        // 1. Actualizamos precios y pagos
        $sql1 = "UPDATE precioformulario 
                 SET precioanimalmomento = ?, 
                     precioformulario = (? * ?), 
                     totalpago = ? 
                 WHERE idformA = ?";
        $this->db->prepare($sql1)->execute([$precio, $precio, $cant, $pago, $id]);

        // 2. Actualizamos la cantidad física en la tabla de sexos
        $sql2 = "UPDATE sexoe SET totalA = ? WHERE idformA = ?";
        $this->db->prepare($sql2)->execute([$cant, $id]);

        $this->db->commit();
        return true;
    } catch (\Exception $e) {
        $this->db->rollBack();
        return false;
    }
}
public function procesarAjustePago($id, $monto, $accion) {
    try {
        $this->db->beginTransaction();

        // 1. Obtener datos actuales del formulario e investigador
        $sql = "SELECT f.IdUsrA, f.IdInstitucion, pf.totalpago 
                FROM formularioe f 
                JOIN precioformulario pf ON f.idformA = pf.idformA 
                WHERE f.idformA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $data = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($accion === 'PAGAR') {
            // Restar saldo al investigador y sumar al pago
            $sqlPago = "UPDATE precioformulario SET totalpago = totalpago + ? WHERE idformA = ?";
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        } else {
            // Restar al pago y devolver al saldo
            $sqlPago = "UPDATE precioformulario SET totalpago = totalpago - ? WHERE idformA = ?";
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        }

        $this->db->prepare($sqlPago)->execute([$monto, $id]);
        $this->db->prepare($sqlSaldo)->execute([$monto, $data['IdUsrA'], $data['IdInstitucion']]);

        $this->db->commit();
        return true;
    } catch (\Exception $e) {
        $this->db->rollBack();
        return false;
    }
}
/**
 * Consulta el saldo en la base de datos de forma segura
 * Ubicación: App\Models\Billing\BillingModel.php
 */
public function getSaldoByInvestigador($idUsuario) {
    $sql = "SELECT COALESCE(SaldoDinero, 0) as saldo 
            FROM dinero 
            WHERE IdUsrA = ? 
            LIMIT 1";
            
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idUsuario]);
    $res = $stmt->fetch(PDO::FETCH_ASSOC);

    return $res ? (float)$res['saldo'] : 0.0;
}
/**
 * Lógica transaccional para alojamiento
 * Ubicación: App\Models\Billing\BillingModel.php
 */
public function procesarAjustePagoAloj($historiaId, $monto, $accion) {
    try {
        $this->db->beginTransaction();

        // 1. Obtenemos al Investigador y la Institución vinculados a esa historia
        $sqlInfo = "SELECT IdUsrA, IdInstitucion FROM alojamiento WHERE historia = ? LIMIT 1";
        $stmtInfo = $this->db->prepare($sqlInfo);
        $stmtInfo->execute([$historiaId]);
        $data = $stmtInfo->fetch(\PDO::FETCH_ASSOC);

        if (!$data) throw new \Exception("Historia no encontrada");

        if ($accion === 'PAGAR') {
            // Sumamos al pago de la estadía y restamos del saldo del investigador
            $sqlAloj = "UPDATE alojamiento SET totalpago = totalpago + ? WHERE historia = ?";
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        } else {
            // Restamos del pago (devolución) y reintegramos al saldo del investigador
            $sqlAloj = "UPDATE alojamiento SET totalpago = totalpago - ? WHERE historia = ?";
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        }

        // Ejecutamos ambas operaciones
        $this->db->prepare($sqlAloj)->execute([$monto, $historiaId]);
        $this->db->prepare($sqlSaldo)->execute([$monto, $data['IdUsrA'], $data['IdInstitucion']]);

        $this->db->commit();
        return true;
    } catch (\Exception $e) {
        $this->db->rollBack();
        error_log("Error Aloj: " . $e->getMessage());
        return false;
    }
}
/**
 * Obtiene el detalle técnico y financiero de un reactivo biológico.
 * Basado en la estructura de animales, adaptado para insumoexperimental y órganos.
 */
public function getReactiveDetailById($id) {
    $sql = "SELECT 
                f.idformA, 
                p.idprotA as id_protocolo,
                p.IdUsrA as id_usr_protocolo, -- ID del Titular (Dueño del dinero)
                f.tipoA as id_tipo_form,
                tf.nombreTipo as nombre_tipo,
                CONCAT(p.nprotA, ' - ', p.tituloA) as protocolo_info,
                -- Datos del Reactivo (Insumo Experimental)
                ie.NombreInsumo as nombre_reactivo,
                ie.CantidadInsumo as presentacion_reactivo,
                ie.TipoInsumo as unidad_medida,
                -- Cantidad solicitada (desde la columna organo como indicaste)
                COALESCE(s.organo, 0) as cantidad_organos,
                COALESCE(s.totalA, 0) as cantidad_animales_vinculados,
                f.fechainicioA as fecha_inicio,
                f.fecRetiroA as fecha_fin,
                COALESCE(f.aclaracionadm, 'No hay aclaraciones del administrador.') as nota_admin,
                -- Datos Financieros (Desde la tabla de precios de insumos)
                COALESCE(pif.precioformulario, 0) as total_calculado,
                COALESCE(pif.totalpago, 0) as totalpago,
                COALESCE(tf.descuento, 0) as descuento,
                tf.exento as is_exento,
                -- Datos de Saldo y Usuarios
                COALESCE(d.SaldoDinero, 0) as saldoInv,
                CONCAT(u_tit.ApellidoA, ', ', u_tit.NombreA) as titular_nombre,
                CONCAT(u_sol.ApellidoA, ', ', u_sol.NombreA) as solicitante
            FROM formularioe f
            INNER JOIN personae u_sol ON f.IdUsrA = u_sol.IdUsrA -- El que solicita
            LEFT JOIN protformr rf ON f.idformA = rf.idformA 
            LEFT JOIN protocoloexpe p ON rf.idprotA = p.idprotA
            INNER JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA -- El dueño del protocolo
            LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp -- Relación con el reactivo
            LEFT JOIN sexoe s ON f.idformA = s.idformA -- De aquí sacamos 'organo'
            LEFT JOIN precioformulario pif ON f.idformA = pif.idformA -- Costos de reactivos
            LEFT JOIN dinero d ON u_tit.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion -- Saldo del Titular
            WHERE f.idformA = ?;";

    $stmt = $this->db->prepare($sql);
    $stmt->execute([$id]);
    return $stmt->fetch(\PDO::FETCH_ASSOC);
}

/**
 * Detalle de Insumos usando la consulta optimizada.
 */
public function getInsumoDetailById($id) {
    $sql = "SELECT 
                f.idformA as id,
                f.IdUsrA, 
                MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante,
                MAX(d.SaldoDinero) as saldoInv, 
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ' (', fi.cantidad, ' ', i.TipoInsumo, ')') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item,
                MAX(pif.totalpago) as pagado
            FROM formularioe f
            JOIN personae u ON f.IdUsrA = u.IdUsrA
            LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion
            JOIN precioinsumosformulario pif ON f.idformA = pif.idformA
            JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario
            JOIN insumo i ON fi.IdInsumo = i.idInsumo
            WHERE f.idformA = ?
            GROUP BY f.idformA";
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$id]);
    $r = $stmt->fetch(\PDO::FETCH_ASSOC);

    if ($r) {
        $r['total_item'] = (float)$r['total_item'];
        $r['pagado'] = (float)$r['pagado']; 
        $r['debe'] = $r['total_item'] - $r['pagado'];
    }
    return $r;
}
/**
 * Procesa el pago de Insumos/Reactivos usando la ruta directa de usuario
 * Ubicación: App\Models\Billing\BillingModel.php
 */
public function procesarAjustePagoInsumo($id, $monto, $accion) {
    try {
        $this->db->beginTransaction();

        // 1. Buscamos los datos usando TU consulta (directo al usuario del formulario)
        // Usamos f.IdInstitucion del formulario para que sea dinámico
        $sqlInfo = "SELECT 
                        f.IdUsrA, 
                        f.IdInstitucion,
                        pif.totalpago
                    FROM formularioe f
                    LEFT JOIN precioinsumosformulario pif ON f.idformA = pif.idformA
                    WHERE f.idformA = ? LIMIT 1";
        
        $stmtInfo = $this->db->prepare($sqlInfo);
        $stmtInfo->execute([$id]);
        $data = $stmtInfo->fetch(\PDO::FETCH_ASSOC);

        if (!$data) {
            throw new \Exception("No se encontró el formulario #$id");
        }

        $idPagador = $data['IdUsrA'];
        $inst = $data['IdInstitucion']; // Tomamos la institución real del registro

        // 2. Ejecutamos los Updates
        if ($accion === 'PAGAR') {
            $sqlForm = "UPDATE precioinsumosformulario SET totalpago = totalpago + ? WHERE idformA = ?";
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        } else {
            $sqlForm = "UPDATE precioinsumosformulario SET totalpago = totalpago - ? WHERE idformA = ?";
            $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        }

        $this->db->prepare($sqlForm)->execute([$monto, $id]);
        $this->db->prepare($sqlSaldo)->execute([$monto, $idPagador, $inst]);

        $this->db->commit();
        return true;

    } catch (\Exception $e) {
        if ($this->db->inTransaction()) $this->db->rollBack();
        error_log("Error SQL Insumos: " . $e->getMessage());
        return false;
    }
}
}