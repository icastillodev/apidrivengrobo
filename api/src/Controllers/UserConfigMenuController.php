<?php
namespace App\Controllers;

use App\Utils\Auditoria;

class UserConfigMenuController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idUsrA = $sesion['userId'];

            $stmt = $this->db->prepare("SELECT tema_preferido, idioma_preferido, letra_preferida, menu_preferido, gecko_ok FROM personae WHERE IdUsrA = ?");
            $stmt->execute([$idUsrA]);
            $config = $stmt->fetch(\PDO::FETCH_ASSOC);

            // Si es la primera vez y config es null, devolvemos un array vacío para no romper nada
            echo json_encode(['status' => 'success', 'data' => $config ?: []]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error al leer config: ' . $e->getMessage()]);
        }
        exit;
    }

    public function updateConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idUsrA = $sesion['userId'];

            // 1. Intentamos leer de $_POST (FormData)
            $data = $_POST;

            // 2. Si $_POST está vacío, intentamos leer como JSON crudo (por si acaso)
            if (empty($data)) {
                $raw = file_get_contents('php://input');
                if (!empty($raw)) {
                    $data = json_decode($raw, true);
                }
            }

            // Extraemos los valores (con null como fallback)
            $tema = $data['theme'] ?? null;
            $idioma = $data['lang'] ?? null;
            $letra = $data['fontSize'] ?? null;
            $menu = $data['menu'] ?? null;
            $gecko = $data['gecko_ok'] ?? null;

            $fields = [];
            $params = [];

            // Armado dinámico del UPDATE para no pisar valores vacíos
            if ($tema !== null) { $fields[] = "tema_preferido = ?"; $params[] = (string)$tema; }
            if ($idioma !== null) { $fields[] = "idioma_preferido = ?"; $params[] = (string)$idioma; }
            if ($letra !== null) { $fields[] = "letra_preferida = ?"; $params[] = (string)$letra; }
            if ($menu !== null) { $fields[] = "menu_preferido = ?"; $params[] = (string)$menu; }
            if ($gecko !== null) { $fields[] = "gecko_ok = ?"; $params[] = (string)$gecko; }

            // Si hay algo que actualizar, ejecutamos la consulta
            if (count($fields) > 0) {
                $sql = "UPDATE personae SET " . implode(", ", $fields) . " WHERE IdUsrA = ?";
                $params[] = $idUsrA;
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
            }

            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error al guardar config: ' . $e->getMessage()]);
        }
        exit;
    }
}