<?php
namespace App\Models\FormRegistro;
use PDO;
use App\Utils\Auditoria; 

class FormRegistroModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function saveConfig($data, $adminId) {
        $sql = "INSERT INTO form_registro_config (slug_url, nombre_inst_previa, encargado_nombre) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$data['slug_url'], $data['nombre_inst_previa'], $data['encargado_nombre']]);
        
        $id = $this->db->lastInsertId();
        Auditoria::logManual($this->db, $adminId, 'INSERT', 'form_registro_config', "Creó link de Onboarding: " . $data['slug_url']);
        return $id;
    }

public function getConfigBySlug($slug) {
        $stmt = $this->db->prepare("SELECT * FROM form_registro_config WHERE slug_url = ? AND activo = 1 LIMIT 1");
        $stmt->execute([$slug]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function saveResponses($idConfig, $respuestas) {
        $this->db->beginTransaction();
        try {
            // EAV: Borramos las anteriores y guardamos el estado actual
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
            
            Auditoria::logManual($this->db, 0, 'INSERT', 'form_registro_respuestas', "Respuestas de Onboarding actualizadas para Config ID: $idConfig");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

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
        
        $grouped = [];
        foreach ($results as $row) {
            $grouped[$row['categoria']][] = $row;
        }
        return $grouped;
    }
}