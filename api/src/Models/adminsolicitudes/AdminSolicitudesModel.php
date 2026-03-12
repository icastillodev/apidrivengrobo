<?php
namespace App\Models\adminsolicitudes;

use PDO;
use Exception;
use App\Models\Services\MailService; 
use App\Models\Protocol\ProtocolModel;
use App\Utils\Auditoria; // <-- Seguridad Inyectada
use App\Utils\BackblazeB2;

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
                       WHERE s.TipoPedido = 2 
                       AND s.Aprobado = 3
                       AND (
                            s.IdInstitucion = ?
                            OR (s.IdInstitucion IS NULL AND pi.IdInstitucion = ?)
                       )";

        $sql = "($sqlInternal) UNION ($sqlNetwork) ORDER BY idSolicitudProtocolo ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function processRequest($data) {
        $this->db->beginTransaction();
        try {
            $decision = (int)$data['decision'];
            $solId = (int)$data['idSolicitud'];
            $mensaje = $data['mensaje'] ?? '';

            $meta = $this->getRequestMeta($solId);
            if (!$meta) {
                throw new Exception('Solicitud no encontrada.');
            }
            $info = $this->getRequestInfo($solId);
            $instName = $this->getInstNameById($solId);

            if ($decision === 1) {
                $sql = "UPDATE solicitudprotocolo 
                        SET Aprobado = ?, DetalleAdm = ?, FechaAprobado = NOW()
                        WHERE idSolicitudProtocolo = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$decision, $mensaje, $solId]);

                // Al aprobar solicitud de red, crear/asegurar configuración local paralela para esa institución.
                if ((int)$meta['TipoPedido'] === 2 && !empty($meta['IdInstitucion'])) {
                    $protocolModel = new ProtocolModel($this->db);
                    $protocolModel->ensureRedConfigForInstitution((int)$meta['idprotA'], (int)$meta['IdInstitucion']);
                }

                Auditoria::log($this->db, 'UPDATE_SOLICITUD', 'solicitudprotocolo', "Decisión: APROBADA sobre Solicitud ID: " . $solId);
            } else {
                // Rechazo/observación: mantener solicitud/protocolo para que el usuario pueda corregir y reenviar.
                // Solo se limpian adjuntos (B2 + BD) y se marca la solicitud como rechazada.
                $attachments = $this->getAttachmentsBySolicitud($solId);
                if (!empty($attachments)) {
                    $b2 = new BackblazeB2();
                    foreach ($attachments as $att) {
                        $fileKey = trim((string)($att['file_key'] ?? ''));
                        if ($fileKey !== '') {
                            $b2->deleteFileByKey($fileKey);
                        }
                    }
                }

                $this->db->prepare("DELETE FROM solicitudadjuntosprotocolos WHERE IdSolicitudProtocolo = ?")->execute([$solId]);
                $sql = "UPDATE solicitudprotocolo 
                        SET Aprobado = 2, DetalleAdm = ?, FechaAprobado = NOW()
                        WHERE idSolicitudProtocolo = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$mensaje, $solId]);

                Auditoria::log($this->db, 'UPDATE_SOLICITUD', 'solicitudprotocolo', "Decisión: RECHAZADA sobre Solicitud ID: " . $solId);
            }

            $this->mailer->sendProtocolDecision(
                $info['Email'], 
                $info['NombreUser'], 
                $info['tituloA'], 
                $decision, 
                $mensaje, 
                $instName,
                null,
                $info['lang'] ?? 'es'
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
                COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), u.UsrA) as NombreUser,
                COALESCE(NULLIF(TRIM(pers.idioma_preferido), ''), 'es') as lang
                FROM solicitudprotocolo s
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN personae pers ON u.IdUsrA = pers.IdUsrA
                WHERE s.idSolicitudProtocolo = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$solId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getRequestMeta($solId) {
        $sql = "SELECT idSolicitudProtocolo, idprotA, TipoPedido, IdInstitucion
                FROM solicitudprotocolo
                WHERE idSolicitudProtocolo = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$solId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
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

    public function getAttachmentsBySolicitud($solId) {
        $sql = "SELECT Id_adjuntos_protocolos, nombre_original, file_key, tipoadjunto
                FROM solicitudadjuntosprotocolos
                WHERE IdSolicitudProtocolo = ?
                ORDER BY tipoadjunto ASC, Id_adjuntos_protocolos ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$solId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($rows)) return $rows;

        // En solicitudes de red, los adjuntos viven en la solicitud local del protocolo.
        $metaStmt = $this->db->prepare("SELECT idprotA, TipoPedido FROM solicitudprotocolo WHERE idSolicitudProtocolo = ? LIMIT 1");
        $metaStmt->execute([$solId]);
        $meta = $metaStmt->fetch(PDO::FETCH_ASSOC);
        if (!$meta || (int)$meta['TipoPedido'] !== 2) return [];

        $sqlFallback = "SELECT a.Id_adjuntos_protocolos, a.nombre_original, a.file_key, a.tipoadjunto
                        FROM solicitudadjuntosprotocolos a
                        JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.idSolicitudProtocolo
                        WHERE s.idprotA = ?
                          AND s.TipoPedido = 1
                          AND s.idSolicitudProtocolo = (
                              SELECT MAX(s2.idSolicitudProtocolo)
                              FROM solicitudprotocolo s2
                              WHERE s2.idprotA = s.idprotA
                                AND s2.TipoPedido = 1
                          )
                        ORDER BY a.tipoadjunto ASC, a.Id_adjuntos_protocolos ASC";
        $stmtFb = $this->db->prepare($sqlFallback);
        $stmtFb->execute([(int)$meta['idprotA']]);
        return $stmtFb->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAttachmentById($id) {
        $sql = "SELECT Id_adjuntos_protocolos, nombre_original, file_key, tipoadjunto
                FROM solicitudadjuntosprotocolos
                WHERE Id_adjuntos_protocolos = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}