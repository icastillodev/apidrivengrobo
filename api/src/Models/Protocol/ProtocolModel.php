<?php
namespace App\Models\Protocol;

use PDO;

class ProtocolModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getByInstitution($instId) {
        $sql = "SELECT 
                    pe.*, 
                    pe.idprotA, pe.nprotA, pe.tituloA, pe.CantidadAniA as AniAprob, 
                    pe.encargaprot as RespProt, 
                    pe.FechaFinProtA as Vencimiento,
                    pe.protocoloexpe as IsExterno,
                    pe.departamento as DeptoOriginal,
                    
                    CONCAT('(', u.UsrA, ') ', p.NombreA, ' ', p.ApellidoA, ' (ID:', p.IdUsrA, ')') as ResponsableFormat,
                    
                    (SELECT CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), ''))
                     FROM protdeptor pd 
                     JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA 
                     LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                     WHERE pd.idprotA = pe.idprotA LIMIT 1) as DeptoFormat,

                    tp.NombreTipoprotocolo as TipoNombre, 
                    ts.NombreSeveridad as SeveridadNombre,

                    COALESCE(
                        (SELECT GROUP_CONCAT(e.EspeNombreA SEPARATOR ', ') 
                         FROM protesper pre 
                         JOIN especiee e ON pre.idespA = e.idespA 
                         WHERE pre.idprotA = pe.idprotA),
                        pe.especie
                    ) as EspeciesList,

                    i_orig.NombreInst as InstitucionOrigen,

                    -- TipoAprobacion: Determina si es PROPIO o RED
                    CASE 
                        WHEN sp.TipoPedido = 2 AND sp.Aprobado = 1 THEN 'RED'
                        ELSE 'PROPIO'
                    END as TipoAprobacion

                FROM protocoloexpe pe
                LEFT JOIN personae p ON pe.IdUsrA = p.IdUsrA
                LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN tipoprotocolo tp ON pe.tipoprotocolo = tp.idtipoprotocolo
                LEFT JOIN tiposeveridad ts ON pe.severidad = ts.IdSeveridadTipo
                
                LEFT JOIN solicitudprotocolo sp ON pe.idprotA = sp.idprotA
                LEFT JOIN protinstr pi ON pe.idprotA = pi.idprotA
                LEFT JOIN institucion i_orig ON pi.IdInstitucion = i_orig.IdInstitucion AND i_orig.IdInstitucion != ?

                WHERE pe.IdInstitucion = ? 
                  AND (pe.variasInst IS NULL OR pe.variasInst != 2)
                ORDER BY pe.idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFormData($instId) {
        // Usuarios
        $sqlUsers = "SELECT p.IdUsrA, p.ApellidoA, p.NombreA, u.UsrA
                     FROM personae p
                     JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                     WHERE u.IdInstitucion = ? 
                       AND TRIM(p.NombreA) != '' 
                     ORDER BY p.ApellidoA ASC";
        $stmtUser = $this->db->prepare($sqlUsers);
        $stmtUser->execute([$instId]);
        $users = $stmtUser->fetchAll(PDO::FETCH_ASSOC);

        // Deptos
        $sqlDeptos = "SELECT d.iddeptoA, d.NombreDeptoA, o.NombreOrganismoSimple as OrgName
                      FROM departamentoe d
                      LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                      WHERE d.IdInstitucion = ?
                      ORDER BY d.NombreDeptoA ASC";
        $stmtDepto = $this->db->prepare($sqlDeptos);
        $stmtDepto->execute([$instId]);
        $depts = $stmtDepto->fetchAll(PDO::FETCH_ASSOC);

        $stmtEsp = $this->db->prepare("SELECT idespA, EspeNombreA FROM especiee WHERE IdInstitucion = ?");
        $stmtEsp->execute([$instId]);
        $species = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);

        $stmtSev = $this->db->query("SELECT IdSeveridadTipo, NombreSeveridad FROM tiposeveridad");
        $severities = $stmtSev->fetchAll(PDO::FETCH_ASSOC);

        $stmtTipos = $this->db->prepare("SELECT idtipoprotocolo, NombreTipoprotocolo FROM tipoprotocolo WHERE IdInstitucion = ?");
        $stmtTipos->execute([$instId]);
        $types = $stmtTipos->fetchAll(PDO::FETCH_ASSOC);

        $stmtInst = $this->db->prepare("SELECT otrosceuas, NombreCompletoInst, DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$instId]);
        $instConfig = $stmtInst->fetch(PDO::FETCH_ASSOC);

        return [
            'users' => $users,
            'species' => $species,
            'severities' => $severities,
            'types' => $types,
            'depts' => $depts,
            'otrosceuas_enabled' => ($instConfig && $instConfig['otrosceuas'] != 2),
            'NombreCompletoInst' => $instConfig['NombreCompletoInst'] ?? 'Institución',
            'has_network' => !empty($instConfig['DependenciaInstitucion'])
        ];
    }

    public function getPendingRequestsCount($instId) {
        $sql = "SELECT COUNT(*) as count FROM solicitudprotocolo s JOIN protocoloexpe p ON s.idprotA = p.idprotA WHERE p.IdInstitucion = ? AND s.Aprobado = 3";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchColumn();
    }

    public function getProtocolSpecies($idprotA) {
        $sql = "SELECT e.idespA, e.EspeNombreA FROM protesper pe INNER JOIN especiee e ON pe.idespA = e.idespA WHERE pe.idprotA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}