<?php
namespace App\Models\Billing;

use PDO;

class BillingModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

public function getProtocolosByDepto($deptoId) {
    $instId = $_SESSION['IdInstitucion'] ?? 1; // Ajusta según tu sesión

    $sql = "SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA, 
            CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador,
            u.IdUsrA,
            IFNULL(d.SaldoDinero, 0) as saldoInv -- Traemos el saldo real de la tabla dinero
            FROM protocoloexpe p
            JOIN personae u ON p.IdUsrA = u.IdUsrA
            LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND d.IdInstitucion = ? 
            WHERE p.departamento = ? AND p.idprotA > 0"; 
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId, $deptoId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obtiene Pedidos con cálculo de Precio Momento automático
 */
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
            pf.precioformulario,      -- PRECIO TOTAL
            pf.precioanimalmomento,    -- PRECIO UNITARIO (MOMENTO)
            f.estado
            FROM formularioe f
            JOIN protformr pf_link ON f.idformA = pf_link.idformA
            JOIN personae u ON f.IdUsrA = u.IdUsrA
            JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            LEFT JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN precioformulario pf ON f.idformA = pf.idformA
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
        $totalForm = (float)$r['precioformulario'];
        $pMomento = (float)$r['precioanimalmomento'];
        
        // Cantidad según tipo para la división
        $esRea = (strpos(strtolower($r['categoria']), 'reactivo') !== false);
        $cantDiv = $esRea ? (float)$r['cant_organo'] : (float)$r['cant_animal'];

        // Si no tiene precio momento, se calcula pero NO se guarda en DB
        if ($pMomento <= 0 && $cantDiv > 0) {
            $pMomento = $totalForm / $cantDiv;
        }

        $r['total'] = $totalForm; 
        $r['p_unit'] = $pMomento;
        $r['pagado'] = 0; // Ajustar si existe tabla de recibos
        $r['debe'] = $r['is_exento'] ? 0 : ($r['total'] - $r['pagado']);

        // Formateo de concepto para evitar undefined
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
                f.IdUsrA, -- ID fundamental para el Dashboard
                MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante,
                MAX(d.SaldoDinero) as saldoInv, -- Traemos el saldo actual desde la tabla dinero
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ' (', fi.cantidad, ' ', i.TipoInsumo, ')') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item 
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
        $r['pagado'] = 0; 
        $r['debe'] = (float)$r['total_item'] - $r['pagado'];
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
 * Ejecuta la transacción de pago (Todo o nada)
 */
public function processPaymentTransaction($idUsr, $monto, $items, $inst) {
    try {
        $this->db->beginTransaction();

        // 1. Descontar del saldo
        $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
        $this->db->prepare($sqlSaldo)->execute([$monto, $idUsr, $inst]);

        // 2. Marcar ítems como pagados
        foreach ($items as $item) {
            if ($item['tipo'] === 'FORM') {
                $sql = "UPDATE precioinsumosformulario SET totalpago = totalpago + (preciototal - totalpago) WHERE idformA = ?";
            } else {
                $sql = "UPDATE alojamiento SET totalpago = totalpago + (cuentaapagar - totalpago) WHERE historia = ?";
            }
            $this->db->prepare($sql)->execute([$item['id']]);
        }

        $this->db->commit();
        return true;
    } catch (\Exception $e) {
        $this->db->rollBack();
        throw $e;
    }
}
}