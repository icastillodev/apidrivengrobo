<?php
namespace App\Controllers;

class NotificationController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getMenuNotifications() {
        // 1. Limpieza absoluta del búfer para evitar el SyntaxError en el Frontend
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $instId = $_GET['inst'] ?? 0;

        try {
            // --- 1. PROTOCOLOS (solicitudprotocolo + protocoloexpe) ---
            $sqlProt = "SELECT COUNT(s.IdSolicitudProtocolo) as total 
                        FROM solicitudprotocolo s
                        INNER JOIN protocoloexpe p ON s.idprotA = p.idprotA
                        WHERE p.IdInstitucion = ? AND s.Aprobado = 3";
            $stmtProt = $this->db->prepare($sqlProt);
            $stmtProt->execute([$instId]);
            $countProt = $stmtProt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            // --- 2. ANIMALES (categoriaformulario = 'Animal vivo') ---
            $sqlAni = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Animal vivo'";
            $stmtAni = $this->db->prepare($sqlAni);
            $stmtAni->execute([$instId]);
            $countAni = $stmtAni->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            // --- 3. REACTIVOS (categoriaformulario = 'Otros reactivos biologicos') ---
            $sqlRea = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Otros reactivos biologicos'";
            $stmtRea = $this->db->prepare($sqlRea);
            $stmtRea->execute([$instId]);
            $countRea = $stmtRea->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            // --- 4. INSUMOS (categoriaformulario = 'Insumos') ---
            $sqlIns = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                       WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
                       AND t.categoriaformulario = 'Insumos'";
            $stmtIns = $this->db->prepare($sqlIns);
            $stmtIns->execute([$instId]);
            $countIns = $stmtIns->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

            // Enviar respuesta limpia
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
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit; // Asegura que no se envíe nada más después del JSON
    }
}