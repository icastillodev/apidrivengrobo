<?php
namespace App\Models\Reactivo;
use PDO;

class ReactivoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Obtiene los reactivos filtrando por la categoría 'Otros reactivos biologicos'
     * vinculando tipoA de formularioe con IdTipoFormulario
     */
    public function getAllByInstitution($instId, $categoryName) {
        $sql = "SELECT 
                    f.idformA, 
                    f.estado, 
                    f.fechainicioA as Inicio, 
                    f.fecRetiroA as Retiro, 
                    f.aclaracionadm,
                    f.quienvisto,
                    f.aclaraA as Aclaracion,
                    CONCAT(p.NombreA, ' ', p.ApellidoA) as Investigador,
                    p.EmailA as EmailInvestigador,
                    px.nprotA as NProtocolo,
                    ins.NombreInsumo as Reactivo,
                    ins.TipoInsumo as Medida,
                    sex.organo as Cantidad,
                    t.nombreTipo as TipoNombre
                FROM formularioe f
                INNER JOIN personae p ON f.IdUsrA = p.IdUsrA
                INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                LEFT JOIN protformr pf ON f.idformA = pf.idformA
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                LEFT JOIN insumoexperimental ins ON f.reactivo = ins.IdInsumoexp
                LEFT JOIN sexoe sex ON f.idformA = sex.idformA
                WHERE f.IdInstitucion = ? 
                AND t.nombreTipo = ?
                ORDER BY f.idformA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $categoryName]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    // api/src/Models/Reactivo/ReactivoModel.php

/**
 * Trae todos los insumos disponibles de la entidad insumoexperimental
 */
public function getAvailableInsumos($instId) {
    $sql = "SELECT IdInsumoexp, NombreInsumo, TipoInsumo 
            FROM insumoexperimental 
            WHERE IdInstitucion = ? 
            ORDER BY NombreInsumo ASC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Trae la última notificación enviada por correo para este pedido
 */
public function getLastNotification($idformA) {
    $sql = "SELECT NotaNotificacion, fecha 
            FROM notificacione 
            WHERE idformA = ? 
            ORDER BY idnotifica DESC LIMIT 1";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idformA]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}
}