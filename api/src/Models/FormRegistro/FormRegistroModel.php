<?php
namespace App\Models\FormRegistro;
use PDO;
use App\Utils\Auditoria;
use App\Utils\ModulosInstitucion; 

class FormRegistroModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function saveConfig($data, $adminId) {
        $planJson = $this->buildPlanModulosJson($data['modulos'] ?? null);

        $sql = "INSERT INTO form_registro_config (slug_url, nombre_inst_previa, encargado_nombre, plan_modulos) VALUES (?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['slug_url'],
            $data['nombre_inst_previa'],
            $data['encargado_nombre'],
            $planJson,
        ]);

        $id = $this->db->lastInsertId();
        Auditoria::logManual($this->db, $adminId, 'INSERT', 'form_registro_config', "Creó link de Onboarding: " . $data['slug_url']);
        return $id;
    }

    /**
     * @param mixed $modulos Lista [{ IdModulosApp, estado_logico }] como en alta de institución
     */
    private function buildPlanModulosJson($modulos): ?string
    {
        if (!is_array($modulos) || $modulos === []) {
            return null;
        }
        $ids = [];
        foreach ($modulos as $m) {
            $id = (int) ($m['IdModulosApp'] ?? 0);
            if ($id > 0) {
                $ids[$id] = true;
            }
        }
        $idList = array_keys($ids);
        if ($idList === []) {
            return null;
        }
        $placeholders = implode(',', array_fill(0, count($idList), '?'));
        $stmt = $this->db->prepare("SELECT IdModulosApp, NombreModulo FROM modulosapp WHERE IdModulosApp IN ({$placeholders})");
        $stmt->execute($idList);
        /** @var array<int, string> */
        $nombreById = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $nombreById[(int) ($row['IdModulosApp'] ?? 0)] = (string) ($row['NombreModulo'] ?? '');
        }

        $plan = [];
        foreach ($modulos as $m) {
            $id = (int) ($m['IdModulosApp'] ?? 0);
            $est = (int) ($m['estado_logico'] ?? 1);
            if ($id <= 0 || !isset($nombreById[$id]) || $nombreById[$id] === '') {
                continue;
            }
            $k = ModulosInstitucion::nombreModuloToKey($nombreById[$id]);
            if ($k !== null && $k !== '') {
                $plan[$k] = $est;
            }
        }

        return $plan === [] ? null : json_encode($plan, JSON_UNESCAPED_UNICODE);
    }

    /** Columnas en docs/database.sql + migración plan_modulos */
    private function sqlSelectFormRegistroConfigAllColumns(): string
    {
        return 'id_form_config, slug_url, nombre_inst_previa, encargado_nombre, activo, creado_el, plan_modulos';
    }

    private function sqlSelectFormRegistroConfigColumnsCPrefixed(): string
    {
        return 'c.id_form_config, c.slug_url, c.nombre_inst_previa, c.encargado_nombre, c.activo, c.creado_el, c.plan_modulos';
    }

    private function sqlSelectFormRegistroRespuestasAllColumns(): string
    {
        return 'id_respuesta, id_form_config, categoria, campo, valor, valor_extra, dependencia_id';
    }

    public function getConfigById($id) {
        $cols = $this->sqlSelectFormRegistroConfigAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM form_registro_config WHERE id_form_config = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getConfigBySlug($slug) {
        $cols = $this->sqlSelectFormRegistroConfigAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM form_registro_config WHERE slug_url = ? AND activo = 1 LIMIT 1");
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
        $cCols = $this->sqlSelectFormRegistroConfigColumnsCPrefixed();
        $sql = "SELECT {$cCols},
                COALESCE(rc.cnt, 0) AS campos_completados
                FROM form_registro_config c
                LEFT JOIN (
                    SELECT id_form_config, COUNT(*) AS cnt
                    FROM form_registro_respuestas
                    GROUP BY id_form_config
                ) rc ON rc.id_form_config = c.id_form_config
                ORDER BY c.creado_el DESC";

        return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFullResponsesGrouped($idConfig) {
        $cols = $this->sqlSelectFormRegistroRespuestasAllColumns();
        $sql = "SELECT {$cols} FROM form_registro_respuestas
                WHERE id_form_config = ?";
                
        $stmt = $this->db->prepare($sql);
        
        // Nos aseguramos de forzar el tipo de dato a ENTERO para que MySQL no lo malinterprete
        $stmt->bindValue(1, $idConfig, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $grouped = [];
        if ($results) {
            foreach ($results as $row) {
                // Agrupamos dinámicamente asegurando que la categoría exista
                $cat = $row['categoria'] ?? 'sin_categoria';
                $grouped[$cat][] = $row;
            }
        }
        
        return $grouped;
    }
    // --- NUEVAS FUNCIONES DE GESTIÓN ---

    public function toggleStatus($idConfig, $status, $adminId) {
        $sql = "UPDATE form_registro_config SET activo = ? WHERE id_form_config = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$status, $idConfig]);
        
        $estadoTexto = $status == 1 ? "Habilitado" : "Deshabilitado";
        Auditoria::logManual($this->db, $adminId, 'UPDATE', 'form_registro_config', "Link de Onboarding ID: $idConfig cambiado a: $estadoTexto");
        return true;
    }

    public function deleteConfig($idConfig, $adminId) {
        // Como tienes llaves foráneas en respuestas (EAV), borramos primero las respuestas
        $this->db->prepare("DELETE FROM form_registro_respuestas WHERE id_form_config = ?")->execute([$idConfig]);
        
        // Luego borramos la configuración base
        $sql = "DELETE FROM form_registro_config WHERE id_form_config = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idConfig]);

        Auditoria::logManual($this->db, $adminId, 'DELETE', 'form_registro_config', "Link de Onboarding ID: $idConfig eliminado permanentemente.");
        return true;
    }
}