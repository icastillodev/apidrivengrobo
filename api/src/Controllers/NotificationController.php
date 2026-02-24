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

            $sqlProt = "SELECT COUNT(s.IdSolicitudProtocolo) as total 
                        FROM solicitudprotocolo s
                        INNER JOIN protocoloexpe p ON s.idprotA = p.idprotA
                        WHERE p.IdInstitucion = ? AND s.Aprobado = 3";
            $stmtProt = $this->db->prepare($sqlProt);
            $stmtProt->execute([$instId]);
            $countProt = $stmtProt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            $sqlAni = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Animal vivo'";
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