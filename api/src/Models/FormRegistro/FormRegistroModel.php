<?php
// ***************************************************
// MODELO: FormRegistroModel
// ***************************************************
namespace App\Models\FormRegistro;
use PDO;

class FormRegistroModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Crea el acceso para la institución (Desde Superadmin)
    public function saveConfig($data) {
        $sql = "INSERT INTO form_registro_config (slug_url, nombre_inst_previa, encargado_nombre) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$data['slug_url'], $data['nombre_inst_previa'], $data['encargado_nombre']]);
        return $this->db->lastInsertId();
    }

    // Busca la configuración por el SLUG de la URL
    public function getConfigBySlug($slug) {
        $stmt = $this->db->prepare("SELECT * FROM form_registro_config WHERE slug_url = ? AND activo = 1 LIMIT 1");
        $stmt->execute([$slug]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Guarda masivamente las respuestas del formulario
    public function saveResponses($idConfig, $respuestas) {
        $this->db->beginTransaction();
        try {
            // Limpiamos respuestas previas si existen (para permitir guardado parcial)
            $this->db->prepare("DELETE FROM form_registro_respuestas WHERE id_form_config = ?")->execute([$idConfig]);

            $sql = "INSERT INTO form_registro_respuestas (id_form_config, categoria, campo, valor, valor_extra, dependencia_id) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);

            foreach ($respuestas as $res) {
                $stmt->execute([
                    $idConfig,
                    $res['categoria'],
                    $res['campo'],
                    $res['valor'],
                    $res['valor_extra'] ?? null,
                    $res['dependencia_id'] ?? null
                ]);
            }
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
// ***************************************************
// MODELO: Extensiones para Superadmin
// ***************************************************

public function getAllConfigs() {
    $sql = "SELECT c.*, 
            (SELECT COUNT(*) FROM form_registro_respuestas WHERE id_form_config = c.id_form_config) as campos_completados
            FROM form_registro_config c 
            ORDER BY c.creado_el DESC";
    return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
}

public function getFullResponsesGrouped($idConfig) {
    $sql = "SELECT categoria, campo, valor, valor_extra 
            FROM form_registro_respuestas 
            WHERE id_form_config = ? 
            ORDER BY categoria, id_respuesta ASC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idConfig]);
    
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Agrupamos por categoría para el visor del front
    $grouped = [];
    foreach ($results as $row) {
        $grouped[$row['categoria']][] = $row;
    }
    return $grouped;
}
// En FormRegistroController.php
public function listAll() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');

    try {
        $data = $this->model->getAllConfigs();
        // IMPORTANTE: Siempre devolver status y data
        echo json_encode([
            'status' => 'success', 
            'data' => $data ? $data : [] // Si no hay datos, devolver array vacío en lugar de null
        ]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
}