<?php
namespace App\Models\adminsolicitudes;

use PDO;
use Exception;
use App\Models\Services\MailService; 
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class AdminSolicitudesModel {
    private $db;
    private $mailer;

    public function __construct($db) {
        $this->db = $db;
        $this->mailer = new MailService();
    }

    public function getPendingRequests($instId) {
        $fields = "s.idSolicitudProtocolo, s.TipoPedido, 
                   p.idprotA, p.nprotA, p.tituloA, p.InvestigadorACargA, 
                   p.FechaIniProtA, p.FechaFinProtA, p.CantidadAniA,
                   t.NombreTipoprotocolo as TipoNombre,
                   CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), '')) as DeptoFormat,
                   (SELECT GROUP_CONCAT(e.EspeNombreA SEPARATOR ', ') 
                    FROM protesper pe 
                    JOIN especiee e ON pe.idespA = e.idespA 
                    WHERE pe.idprotA = p.idprotA) as Especies,
                   i_orig.NombreInst as Origen,
                   COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), u.UsrA) as Solicitante,
                   pers.EmailA as Email";

        $sqlInternal = "SELECT $fields, 'INTERNA' as TipoEtiqueta
                        FROM solicitudprotocolo s
                        JOIN protocoloexpe p ON s.idprotA = p.idprotA
                        LEFT JOIN departamentoe d ON p.departamento = d.iddeptoA
                        LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                        LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                        LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                        LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                        LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                        WHERE p.IdInstitucion = ? 
                        AND s.TipoPedido = 1 
                        AND s.Aprobado = 3"; 

        $sqlNetwork = "SELECT $fields, 'RED' as TipoEtiqueta
                       FROM solicitudprotocolo s
                       JOIN protocoloexpe p ON s.idprotA = p.idprotA
                       LEFT JOIN departamentoe d ON p.departamento = d.iddeptoA
                       LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                       LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                       JOIN protinstr pi ON p.idprotA = pi.idprotA
                       LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                       LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                       LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                       WHERE pi.IdInstitucion = ? 
                       AND s.TipoPedido = 2 
                       AND s.Aprobado = 3";

        $sql = "($sqlInternal) UNION ($sqlNetwork) ORDER BY idSolicitudProtocolo ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function processRequest($data) {
        $this->db->beginTransaction();
        try {
            $sql = "UPDATE solicitudprotocolo 
                    SET Aprobado = ?, DetalleAdm = ?, FechaAprobado = NOW()
                    WHERE idSolicitudProtocolo = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $data['decision'], 
                $data['mensaje'], 
                $data['idSolicitud']
            ]);

            // Auditoría
            $estadoTxt = ($data['decision'] == 1) ? 'APROBADA' : 'RECHAZADA/OBSERVADA';
            Auditoria::log($this->db, 'UPDATE_SOLICITUD', 'solicitudprotocolo', "Decisión: $estadoTxt sobre Solicitud ID: " . $data['idSolicitud']);

            $info = $this->getRequestInfo($data['idSolicitud']);
            $instName = $this->getInstNameById($data['idSolicitud']);

            $this->mailer->sendProtocolDecision(
                $info['Email'], 
                $info['NombreUser'], 
                $info['tituloA'], 
                $data['decision'], 
                $data['mensaje'], 
                $instName
            );

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function getRequestInfo($solId) {
        $sql = "SELECT p.tituloA, pers.EmailA as Email, 
                COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), u.UsrA) as NombreUser
                FROM solicitudprotocolo s
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN personae pers ON u.IdUsrA = pers.IdUsrA
                WHERE s.idSolicitudProtocolo = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$solId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getInstNameById($solId) {
        $sql = "SELECT i.NombreInst 
                FROM solicitudprotocolo s 
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                JOIN institucion i ON p.IdInstitucion = i.IdInstitucion 
                WHERE s.idSolicitudProtocolo = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$solId]);
        return $stmt->fetchColumn() ?: 'Institución';
    }
}