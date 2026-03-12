<?php
namespace App\Controllers;

use App\Utils\Auditoria;

class NotificationController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getMenuNotifications() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];

            $sqlProt = "SELECT COUNT(DISTINCT s.IdSolicitudProtocolo) as total
                        FROM solicitudprotocolo s
                        INNER JOIN protocoloexpe p ON s.idprotA = p.idprotA
                        LEFT JOIN protinstr pi ON p.idprotA = pi.idprotA
                        WHERE s.Aprobado = 3
                          AND (
                            (s.TipoPedido = 1 AND p.IdInstitucion = ?)
                            OR
                            (s.TipoPedido = 2 AND (
                                s.IdInstitucion = ?
                                OR (s.IdInstitucion IS NULL AND pi.IdInstitucion = ?)
                            ))
                          )";
            $stmtProt = $this->db->prepare($sqlProt);
            $stmtProt->execute([$instId, $instId, $instId]);
            $countProtSolicitudes = (int)($stmtProt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);

            $sqlProtRedIncomplete = "SELECT COUNT(DISTINCT p.idprotA) as total
                                     FROM protocoloexpe p
                                     JOIN protinstr pi ON pi.idprotA = p.idprotA
                                     LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
                                     WHERE pi.IdInstitucion = ?
                                       AND p.IdInstitucion <> ?
                                       AND (
                                            NOT EXISTS (
                                                SELECT 1 FROM solicitudprotocolo sRedAny
                                                WHERE sRedAny.idprotA = p.idprotA
                                                  AND sRedAny.TipoPedido = 2
                                            )
                                            OR EXISTS (
                                                SELECT 1 FROM solicitudprotocolo sRedOk
                                                WHERE sRedOk.idprotA = p.idprotA
                                                  AND sRedOk.TipoPedido = 2
                                                  AND sRedOk.IdInstitucion = ?
                                                  AND sRedOk.Aprobado = 1
                                            )
                                       )
                                       AND (
                                            pr.IdProtocoloExpRed IS NULL
                                            OR pr.IdUsrA IS NULL
                                            OR pr.iddeptoA IS NULL
                                            OR pr.idtipoprotocolo IS NULL
                                            OR pr.IdSeveridadTipo IS NULL
                                            OR (
                                                SELECT COUNT(*)
                                                FROM protocoloexpered_especies prs
                                                WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed
                                            ) <= 0
                                       )";
            $stmtProtRedIncomplete = $this->db->prepare($sqlProtRedIncomplete);
            $stmtProtRedIncomplete->execute([$instId, $instId, $instId, $instId]);
            $countProtRedIncomplete = (int)($stmtProtRedIncomplete->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
            $countProt = $countProtSolicitudes + $countProtRedIncomplete;

            $sqlAni = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Animal'";
            $stmtAni = $this->db->prepare($sqlAni);
            $stmtAni->execute([$instId]);
            $countAni = $stmtAni->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            $sqlRea = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Otros reactivos biologicos'";
            $stmtRea = $this->db->prepare($sqlRea);
            $stmtRea->execute([$instId]);
            $countRea = $stmtRea->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            $sqlIns = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Insumos'";
            $stmtIns = $this->db->prepare($sqlIns);
            $stmtIns->execute([$instId]);
            $countIns = $stmtIns->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'protocolos' => (int)$countProt,
                    'protocolos_solicitudes' => (int)$countProtSolicitudes,
                    'protocolos_red_incompletos' => (int)$countProtRedIncomplete,
                    'animales'   => (int)$countAni,
                    'reactivos'  => (int)$countRea,
                    'insumos'    => (int)$countIns
                ]
            ]);

        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}