<?php
namespace App\Models\Insumo;

class InsumoModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getAllByInstitution($instId) {
        $sql = "SELECT 
                    f.idformA, f.estado, f.fechainicioA as Inicio, f.fecRetiroA as Retiro,
                    f.aclaracionadm, f.aclaraA as AclaracionUsuario, f.quienvisto, f.depto as idDepto,
                    p.EmailA as EmailInvestigador, p.CelularA as CelularInvestigador,
                    CONCAT(p.NombreA, ' ', p.ApellidoA) as Investigador,
                    d.NombreDeptoA as Departamento,
                    pif.idPrecioinsumosformulario,
                    (SELECT GROUP_CONCAT(CONCAT(i.NombreInsumo, ' <b>(', fi.cantidad, ' ', i.TipoInsumo, ')</b>') SEPARATOR ', ')
                    FROM forminsumo fi
                    INNER JOIN insumo i ON fi.idInsumo = i.idInsumo
                    WHERE fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario) as ResumenInsumos
                FROM formularioe f
                INNER JOIN personae p ON f.IdUsrA = p.IdUsrA
                INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                INNER JOIN departamentoe d ON f.depto = d.iddeptoA 
                LEFT JOIN precioinsumosformulario pif ON f.idformA = pif.idformA
                WHERE f.IdInstitucion = ? AND t.categoriaformulario = 'insumos'
                ORDER BY f.idformA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

        public function getInsumosDetails($idPrecioInsumo) {
            $sql = "SELECT fi.idInsumo, fi.cantidad, i.NombreInsumo, i.TipoInsumo
                    FROM forminsumo fi
                    INNER JOIN insumo i ON fi.idInsumo = i.idInsumo
                    WHERE fi.idPrecioinsumosformulario = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idPrecioInsumo]);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

public function updateStatus($data) {
        $sql = "UPDATE formularioe SET estado = ?, aclaracionadm = ?, quienvisto = ? WHERE idformA = ?";
        $res = $this->db->prepare($sql)->execute([
            $data['estado'], $data['aclaracionadm'], $data['userName'], $data['idformA']
        ]);
        
        \App\Utils\Auditoria::log($this->db, 'UPDATE_STATUS', 'formularioe', "Cambió estado de Pedido de Insumos #{$data['idformA']} a: {$data['estado']}");
        return $res;
    }
        public function getInsumosCatalog($instId) {
            $sql = "SELECT idInsumo, NombreInsumo, TipoInsumo 
                    FROM insumo 
                    WHERE IdInstitucion = ? 
                    ORDER BY NombreInsumo ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId]);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }
        /**
 * Obtiene la lista de departamentos para los selectores del modal
 */
public function getDepartments($instId) {
    $sql = "SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ? ORDER BY NombreDeptoA ASC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId]);
    return $stmt->fetchAll(\PDO::FETCH_ASSOC);
}
public function updateFullInsumo($data) {
        $this->db->beginTransaction(); 
        try {
            $sqlF = "UPDATE formularioe SET depto = ?, fechainicioA = ?, fecRetiroA = ? WHERE idformA = ?";
            $this->db->prepare($sqlF)->execute([
                $data['depto'], $data['fechainicioA'], $data['fecRetiroA'], $data['idformA']
            ]);

            $idPrecio = $data['idPrecioinsumosformulario'];
            $items = $data['items'] ?? [];
            $nuevoTotal = 0;

            $this->db->prepare("DELETE FROM forminsumo WHERE idPrecioinsumosformulario = ?")->execute([$idPrecio]);

            foreach ($items as $item) {
                $stmtP = $this->db->prepare("SELECT PrecioInsumo FROM insumo WHERE idInsumo = ?");
                $stmtP->execute([$item['idInsumo']]);
                $precioCatalogo = $stmtP->fetchColumn() ?: 0;

                $subtotal = $precioCatalogo * $item['cantidad'];
                $nuevoTotal += $subtotal;

                $sqlI = "INSERT INTO forminsumo (idPrecioinsumosformulario, idInsumo, cantidad, PrecioMomentoInsumo) VALUES (?, ?, ?, ?)";
                $this->db->prepare($sqlI)->execute([$idPrecio, $item['idInsumo'], $item['cantidad'], $precioCatalogo]);
            }

            $sqlP = "UPDATE precioinsumosformulario SET preciototal = ? WHERE idPrecioinsumosformulario = ?";
            $this->db->prepare($sqlP)->execute([$nuevoTotal, $idPrecio]);

            \App\Utils\Auditoria::log($this->db, 'UPDATE_FULL', 'formularioe', "Modificación Administrativa de Pedido Insumos #{$data['idformA']}");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack(); 
            throw $e;
        }
    }
/**
 * Guarda la notificación en la entidad correcta
 */
public function saveNotification($data) {
    $sql = "INSERT INTO notificacioncorreo 
            (TipoNotificacion, NotaNotificacion, fecha, ID, IdInstitucion, estado) 
            VALUES (?, ?, NOW(), ?, ?, ?)";
    $stmt = $this->db->prepare($sql);
    return $stmt->execute([
        'insumos',                // TipoNotificacion
        $data['mensaje'],         // NotaNotificacion
        $data['idformA'],         // ID (id del formulario)
        $data['instId'],          // IdInstitucion
        $data['estado']           // estado actual del pedido
    ]);
}
public function getLastNotification($idformA) {
    $sql = "SELECT NotaNotificacion, estado, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') as fecha 
            FROM notificacioncorreo 
            WHERE ID = ? AND TipoNotificacion = 'insumos' 
            ORDER BY IdNotificacionesCorreo DESC LIMIT 1";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idformA]);
    return $stmt->fetch(\PDO::FETCH_ASSOC);
}
/**
 * Obtiene un resumen de texto de los insumos para el cuerpo del correo
 */
public function getInsumosResumenText($idformA) {
    $sql = "SELECT i.NombreInsumo, fi.cantidad, i.TipoInsumo
            FROM forminsumo fi
            INNER JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
            INNER JOIN insumo i ON fi.idInsumo = i.idInsumo
            WHERE pif.idformA = ?";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idformA]);
    $items = $stmt->fetchAll(\PDO::FETCH_ASSOC);

    $resumen = "";
    foreach ($items as $item) {
        $resumen .= "• " . $item['NombreInsumo'] . " (" . $item['cantidad'] . " " . $item['TipoInsumo'] . ")<br>";
    }
    return $resumen ?: "No se registraron productos en este pedido.";
}
}