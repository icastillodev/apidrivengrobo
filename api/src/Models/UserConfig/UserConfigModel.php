<?php
namespace App\Models\UserConfig;

use PDO;

class UserConfigModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getConfig($userId) {
        $sql = "SELECT tema_preferido, idioma_preferido, letra_preferida, menu_preferido, gecko_ok,
                       setup_wizard_done, cap_auto_tour_off, cap_help_fab_hidden,
                       noticias_vista_hasta, cap_tours_state_json
                FROM personae WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

public function updateConfig($userId, $data) {
        $fields = [];
        $values = [];

        if (isset($data['theme'])) { $fields[] = "tema_preferido = ?"; $values[] = $data['theme']; }
        if (isset($data['lang'])) { $fields[] = "idioma_preferido = ?"; $values[] = $data['lang']; }
        if (isset($data['fontSize'])) { $fields[] = "letra_preferida = ?"; $values[] = $data['fontSize']; }
        if (isset($data['menu'])) { $fields[] = "menu_preferido = ?"; $values[] = $data['menu']; }
        if (isset($data['gecko_ok'])) { $fields[] = "gecko_ok = ?"; $values[] = (int)$data['gecko_ok']; }
        if (array_key_exists('setupWizardDone', $data)) {
            $fields[] = "setup_wizard_done = ?";
            $v = $data['setupWizardDone'];
            $values[] = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        }
        if (array_key_exists('capAutoTourOff', $data)) {
            $fields[] = "cap_auto_tour_off = ?";
            $v = $data['capAutoTourOff'];
            $values[] = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        }
        if (array_key_exists('capHelpFabHidden', $data)) {
            $fields[] = "cap_help_fab_hidden = ?";
            $v = $data['capHelpFabHidden'];
            $values[] = ($v === true || $v === 1 || $v === '1') ? 1 : 0;
        }
        // Solo avanza el cursor; vacío u omitido no borra la columna (evita pisar BD en snapshot parcial).
        if (array_key_exists('noticiasVistaHasta', $data)) {
            $raw = trim((string)$data['noticiasVistaHasta']);
            if ($raw !== '') {
                $ts = strtotime($raw);
                if ($ts !== false) {
                    $fields[] = "noticias_vista_hasta = ?";
                    $values[] = date('Y-m-d H:i:s', $ts);
                }
            }
        }
        if (array_key_exists('capToursStateJson', $data)) {
            $j = $data['capToursStateJson'];
            $enc = is_string($j) ? $j : json_encode($j, JSON_UNESCAPED_UNICODE);
            if (strlen($enc) > 65535) {
                $enc = '{}';
            }
            $fields[] = "cap_tours_state_json = ?";
            $values[] = $enc;
        }

        if (empty($fields)) return 0; // No había nada que actualizar

        $values[] = $userId; // El ID para el WHERE

        $sql = "UPDATE personae SET " . implode(', ', $fields) . " WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        
        $stmt->execute($values);
        
        // Magia: Nos devuelve cuántas filas alteró realmente
        return $stmt->rowCount(); 
    }
}