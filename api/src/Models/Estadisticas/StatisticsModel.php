<?php
namespace App\Models\Estadisticas;

class StatisticsModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getGeneralStats($instId, $from, $to) {
        $res = [];

        // 1. GLOBALES
        // Protocolos: Aprobados + Fecha Fin no vencida (>= HOY)
        $sqlG = "SELECT 
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe f JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.fechainicioA BETWEEN ? AND ?) as total_insumos,
            
            (SELECT COUNT(*) FROM protocoloexpe pe 
             WHERE pe.IdInstitucion = ? 
             AND pe.FechaFinProtA >= CURDATE() 
             AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))
            ) as total_protocolos,

            (SELECT COUNT(*) FROM alojamiento a WHERE a.IdInstitucion = ? AND a.finalizado = 0) as total_alojamientos";
        
        $stmtG = $this->db->prepare($sqlG);
        $stmtG->execute([$instId, $from, $to, $instId, $from, $to, $instId, $from, $to, $instId, $instId]);
        $res['globales'] = $stmtG->fetch(\PDO::FETCH_ASSOC);

        // 2. POR DEPARTAMENTO
        $sqlD = "SELECT 
            d.iddeptoA, d.NombreDeptoA as departamento,
            (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx JOIN sexoe sx ON fx.idformA = sx.idformA JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe fx JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe fx JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_insumos,
            
            /* Protocolos Aprobados VIGENTES del Depto */
            (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA 
             WHERE pd.iddeptoA = d.iddeptoA 
             AND pe.IdInstitucion = ? 
             AND pe.FechaFinProtA >= CURDATE()
             AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))
            ) as protocolos_aprobados

        FROM departamentoe d WHERE d.IdInstitucion = ?";
        
        $stmtD = $this->db->prepare($sqlD);
        $stmtD->execute([$instId, $from, $to, $instId, $from, $to, $instId, $from, $to, $instId, $instId]);
        $res['por_departamento'] = $stmtD->fetchAll(\PDO::FETCH_ASSOC);

        // 3. RANKING ESPECIES (Sin cambios)
        $sqlE = "SELECT 
                    CONCAT(e.EspeNombreA, ' (', IFNULL(sb.SubEspeNombreA, 'Gral'), ')') as etiqueta_especie, 
                    SUM(s.totalA) as cantidad 
                FROM formularioe f 
                JOIN sexoe s ON f.idformA = s.idformA
                JOIN formespe fe ON f.idformA = fe.idformA
                JOIN especiee e ON fe.idespA = e.idespA
                LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA
                WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                GROUP BY e.EspeNombreA, sb.SubEspeNombreA 
                ORDER BY cantidad DESC"; // QUITAMOS EL LIMIT
        $stmtE = $this->db->prepare($sqlE);
        $stmtE->execute([$instId, $from, $to]);
        $res['ranking_especies'] = $stmtE->fetchAll(\PDO::FETCH_ASSOC);

        // 4. ALOJAMIENTOS ACTIVOS (Sin cambios)
        $sqlA = "SELECT d.NombreDeptoA as departamento, COUNT(a.IdAlojamiento) as cantidad FROM departamentoe d LEFT JOIN protdeptor pd ON d.iddeptoA = pd.iddeptoA LEFT JOIN alojamiento a ON pd.idprotA = a.idprotA AND a.finalizado = 0 AND a.IdInstitucion = ? WHERE d.IdInstitucion = ? GROUP BY d.NombreDeptoA";
        $stmtA = $this->db->prepare($sqlA);
        $stmtA->execute([$instId, $instId]);
        $res['alojamientos_activos'] = $stmtA->fetchAll(\PDO::FETCH_ASSOC);

        // 5. DETALLE ESPECIES (Sin cambios)
        $sqlDetalle = "SELECT d.NombreDeptoA as departamento, e.EspeNombreA as especie, sb.SubEspeNombreA as subespecie, SUM(s.totalA) as cantidad_animales FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA JOIN formespe fe ON f.idformA = fe.idformA JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA JOIN protformr pfr ON f.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ? GROUP BY d.NombreDeptoA, e.EspeNombreA, sb.SubEspeNombreA ORDER BY d.NombreDeptoA, cantidad_animales DESC";
        $stmtDet = $this->db->prepare($sqlDetalle);
        $stmtDet->execute([$instId, $from, $to]);
        $res['detalle_especies'] = $stmtDet->fetchAll(\PDO::FETCH_ASSOC);

        // 6. DETALLE PROTOCOLOS (Agregamos Fecha Fin para verla en el front)
        $sqlProtUso = "SELECT DISTINCT
                        d.NombreDeptoA as departamento,
                        pe.nprotA,
                        pe.tituloA,
                        pe.FechaFinProtA
                       FROM formularioe f
                       JOIN protformr pfr ON f.idformA = pfr.idformA
                       JOIN protocoloexpe pe ON pfr.idprotA = pe.idprotA
                       JOIN protdeptor pdr ON pe.idprotA = pdr.idprotA
                       JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA
                       WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                       ORDER BY d.NombreDeptoA, pe.nprotA";
        $stmtP = $this->db->prepare($sqlProtUso);
        $stmtP->execute([$instId, $from, $to]);
        $res['detalle_protocolos'] = $stmtP->fetchAll(\PDO::FETCH_ASSOC);

        return $res;
    }
}