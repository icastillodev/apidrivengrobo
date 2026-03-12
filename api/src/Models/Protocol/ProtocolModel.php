<?php
namespace App\Models\Protocol;

use PDO;

class ProtocolModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getByInstitution($instId) {
        $sql = "SELECT DISTINCT
                    pe.*, 
                    pe.idprotA, 
                    pe.nprotA, 
                    pe.tituloA, 
                    pe.CantidadAniA as SaldoAnimales, 
                    pe.encargaprot as RespProt, 
                    pe.FechaFinProtA as Vencimiento,
                    pe.protocoloexpe as IsExterno,
                    pe.departamento as DeptoOriginal,
                    
                    (SELECT COALESCE(SUM(s.totalA), 0)
                     FROM protformr pf
                     JOIN formularioe f ON pf.idformA = f.idformA
                     JOIN sexoe s ON f.idformA = s.idformA
                     WHERE pf.idprotA = pe.idprotA
                       AND f.estado = 'Entregado') as AnimalesUsados,

                    ((SELECT COALESCE(SUM(s.totalA), 0)
                      FROM protformr pf
                      JOIN formularioe f ON pf.idformA = f.idformA
                      JOIN sexoe s ON f.idformA = s.idformA
                      WHERE pf.idprotA = pe.idprotA
                        AND f.estado = 'Entregado') + pe.CantidadAniA) as AnimalesTotales,
                    
                    CONCAT('(', u.UsrA, ') ', p.NombreA, ' ', p.ApellidoA, ' (ID:', p.IdUsrA, ')') as ResponsableFormat,
                    
                    (SELECT CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), ''))
                     FROM protdeptor pd 
                     JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA 
                     LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                     WHERE pd.idprotA = pe.idprotA LIMIT 1) as DeptoFormat,

                    (SELECT CONCAT(d2.NombreDeptoA, IF(o2.NombreOrganismoSimple IS NOT NULL, CONCAT(' (', o2.NombreOrganismoSimple, ')'), ''))
                     FROM departamentoe d2 
                     LEFT JOIN organismoe o2 ON d2.organismopertenece = o2.IdOrganismo
                     WHERE d2.iddeptoA = pe.departamento LIMIT 1) as DeptoProtocoloFormat,

                    tp.NombreTipoprotocolo as TipoNombre, 
                    ts.NombreSeveridad as SeveridadNombre,

                    (
                        SELECT 
                            CASE 
                                WHEN d.externodepto = 2 OR (d.externodepto IS NULL AND o.externoorganismo = 2) THEN 2
                                ELSE 1
                            END
                        FROM protdeptor pd2
                        JOIN departamentoe d ON pd2.iddeptoA = d.iddeptoA
                        LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                        WHERE pd2.idprotA = pe.idprotA
                        LIMIT 1
                    ) AS DeptoExternoFlag,

                    COALESCE(
                        (SELECT GROUP_CONCAT(e.EspeNombreA SEPARATOR ', ') 
                         FROM protesper pre 
                         JOIN especiee e ON pre.idespA = e.idespA 
                         WHERE pre.idprotA = pe.idprotA),
                        pe.especie
                    ) as EspeciesList,

                    i_orig.NombreInst as InstitucionOrigen,

                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM solicitudprotocolo sp2
                            WHERE sp2.idprotA = pe.idprotA
                              AND sp2.TipoPedido = 2
                              AND sp2.Aprobado = 1
                              AND sp2.IdInstitucion = ?
                        ) THEN 'RED'
                        ELSE 'PROPIO'
                    END as TipoAprobacion

                FROM protocoloexpe pe
                LEFT JOIN personae p ON pe.IdUsrA = p.IdUsrA
                LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN tipoprotocolo tp ON pe.tipoprotocolo = tp.idtipoprotocolo
                LEFT JOIN tiposeveridad ts ON pe.severidad = ts.IdSeveridadTipo
                LEFT JOIN protinstr pi ON pe.idprotA = pi.idprotA
                LEFT JOIN institucion i_orig ON pe.IdInstitucion = i_orig.IdInstitucion

                WHERE (
                    -- Propios: manuales o solicitudes locales aprobadas
                    (
                        pe.IdInstitucion = ?
                        AND (
                            NOT EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spLocal
                                WHERE spLocal.idprotA = pe.idprotA
                                  AND spLocal.TipoPedido = 1
                            )
                            OR EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spLocalOk
                                WHERE spLocalOk.idprotA = pe.idprotA
                                  AND spLocalOk.TipoPedido = 1
                                  AND spLocalOk.Aprobado = 1
                            )
                        )
                    )
                    OR
                    -- Red: solo asignados a esta institución y con solicitud de red aprobada
                    (
                        pi.IdInstitucion = ?
                        AND pe.IdInstitucion <> ?
                        AND (
                            -- Manual en red (sin solicitud de red para esta institución)
                            NOT EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spRedOwn
                                WHERE spRedOwn.idprotA = pe.idprotA
                                  AND spRedOwn.TipoPedido = 2
                                  AND spRedOwn.IdInstitucion = ?
                            )
                            OR
                            -- Solicitud de red aprobada para esta institución
                            EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spRedOk
                                WHERE spRedOk.idprotA = pe.idprotA
                                  AND spRedOk.TipoPedido = 2
                                  AND spRedOk.IdInstitucion = ?
                                  AND spRedOk.Aprobado = 1
                            )
                        )
                    )
                )
                ORDER BY pe.idprotA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId, $instId, $instId, $instId, $instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
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

    public function getAttachmentsByProtocol($idprotA, $instId) {
        $sql = "SELECT DISTINCT
                    a.Id_adjuntos_protocolos,
                    a.nombre_original,
                    a.file_key,
                    a.tipoadjunto
                FROM solicitudadjuntosprotocolos a
                JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.idSolicitudProtocolo
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                LEFT JOIN protinstr pi ON p.idprotA = pi.idprotA
                WHERE p.idprotA = ?
                  AND (
                    (p.IdInstitucion = ? AND s.TipoPedido = 1 AND s.Aprobado = 1)
                    OR
                    (pi.IdInstitucion = ? AND p.IdInstitucion <> ? AND s.TipoPedido = 2 AND s.Aprobado = 1 AND s.IdInstitucion = ?)
                  )
                ORDER BY a.tipoadjunto ASC, a.Id_adjuntos_protocolos ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA, $instId, $instId, $instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getProtocolosValidos($instId) {
        // Trae los protocolos de la institución que NO estén rechazados (2) ni pendientes (3) en la tabla solicitud.
        // Si no existen en la tabla solicitud (LEFT JOIN es NULL), significa que fueron manuales y están aprobados.
        $sql = "
            SELECT p.*, 
                   COALESCE(CONCAT(u.NombreA, ' ', u.ApellidoA), p.InvestigadorACargA) as InvestigadorACargA
            FROM protocoloexpe p
            LEFT JOIN personae u ON p.IdUsrA = u.IdUsrA
            LEFT JOIN solicitud s ON p.idprotA = s.idprotA
            WHERE p.IdInstitucion = ? 
            AND (s.id_solicitud IS NULL OR s.estado NOT IN (2, 3))
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}