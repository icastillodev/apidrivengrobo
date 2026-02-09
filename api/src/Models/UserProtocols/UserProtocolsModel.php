<?php
namespace App\Models\UserProtocols;

use PDO;

class UserProtocolsModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllProtocols($userId, $currentInstId) {
        // 1. Info Institución Actual (Para el botón de crear)
        $stmtInst = $this->db->prepare("SELECT NombreInst, InstCorreo FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$currentInstId]);
        $infoInst = $stmtInst->fetch(PDO::FETCH_ASSOC);

        // 2. Consulta Global de Protocolos
        // Usamos GROUP_CONCAT para listar las especies en una sola celda
        $sql = "SELECT 
                    p.idprotA, 
                    p.nprotA, 
                    p.tituloA, 
                    p.InvestigadorACargA as Responsable,
                    p.CantidadAniA as CantidadAprobada,
                    p.FechaIniProtA as Inicio,
                    p.FechaFinProtA as Vencimiento,
                    
                    -- Institución y Depto
                    i.NombreInst as Institucion,
                    COALESCE(d.NombreDeptoA, '---') as Departamento,
                    
                    -- Tipificaciones
                    tp.NombreTipoprotocolo as Tipo,
                    ts.NombreSeveridad as Severidad,
                    
                    -- Estado (Lógica: Si no hay solicitud o es 1 => Aprobado)
                    COALESCE(s.Aprobado, 1) as EstadoCodigo,
                    CASE 
                        WHEN s.Aprobado = 1 OR s.Aprobado IS NULL THEN 'Aprobado'
                        WHEN s.Aprobado = 2 THEN 'Rechazado'
                        WHEN s.Aprobado = 4 THEN 'Modificar'
                        ELSE 'En Revisión'
                    END as EstadoTexto,

                    -- Especies Concatenadas
                    (
                        SELECT GROUP_CONCAT(DISTINCT e.EspeNombreA SEPARATOR ', ')
                        FROM protesper pe
                        JOIN especiee e ON pe.idespA = e.idespA
                        WHERE pe.idprotA = p.idprotA
                    ) as Especies

                FROM protocoloexpe p
                INNER JOIN institucion i ON p.IdInstitucion = i.IdInstitucion
                LEFT JOIN departamentoe d ON p.departamento = d.iddeptoA
                LEFT JOIN tipoprotocolo tp ON p.tipoprotocolo = tp.idtipoprotocolo
                LEFT JOIN tiposeveridad ts ON p.severidad = ts.IdSeveridadTipo
                LEFT JOIN solicitudprotocolo s ON p.idprotA = s.idprotA
                
                WHERE p.IdUsrA = ?
                ORDER BY p.idprotA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        
        return [
            'current_inst' => $infoInst,
            'list' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    public function getDetail($id) {
        // Reutilizamos lógica similar pero para un solo ID y con todos los campos
        $sql = "SELECT p.*, 
                       i.NombreInst, i.InstCorreo, i.InstContacto,
                       d.NombreDeptoA, 
                       tp.NombreTipoprotocolo, 
                       ts.NombreSeveridad,
                       COALESCE(s.Aprobado, 1) as EstadoCodigo,
                       (SELECT GROUP_CONCAT(e.EspeNombreA SEPARATOR ', ') FROM protesper pe JOIN especiee e ON pe.idespA = e.idespA WHERE pe.idprotA = p.idprotA) as EspeciesLista
                FROM protocoloexpe p
                JOIN institucion i ON p.IdInstitucion = i.IdInstitucion
                LEFT JOIN departamentoe d ON p.departamento = d.iddeptoA
                LEFT JOIN tipoprotocolo tp ON p.tipoprotocolo = tp.idtipoprotocolo
                LEFT JOIN tiposeveridad ts ON p.severidad = ts.IdSeveridadTipo
                LEFT JOIN solicitudprotocolo s ON p.idprotA = s.idprotA
                WHERE p.idprotA = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}