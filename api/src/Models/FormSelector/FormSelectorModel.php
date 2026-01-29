<?php
namespace App\Models\FormSelector;
use PDO;

class FormSelectorModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getInstitutionalNetwork($currentInstId) {
        // 1. Obtener Dependencia
        $stmtDep = $this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $stmtDep->execute([$currentInstId]);
        $dependencia = $stmtDep->fetchColumn();

        // 2. Construcción de la Query Dinámica
        $sql = "SELECT 
                    i.IdInstitucion,
                    i.NombreInst,
                    i.NombreCompletoInst,
                    i.DependenciaInstitucion,
                    -- Banderas de Servicios (Tabla Corregida: institucionservicios)
                    COALESCE(s.Animales, 0) as flag_animales,
                    COALESCE(s.Reactivos, 0) as flag_reactivos,
                    COALESCE(s.Insumos, 0) as flag_insumos,
                    COALESCE(s.Alojamiento, 0) as flag_alojamiento,
                    COALESCE(s.Reservas, 0) as flag_reservas

                FROM institucion i
                -- AQUÍ ESTABA EL ERROR: Nombre corregido
                LEFT JOIN institucionservicios s ON i.IdInstitucion = s.IdInstitucion
                WHERE i.Activo = 1 ";

        $params = [];

        // LÓGICA DE GRUPO:
        if (!empty($dependencia)) {
            $sql .= "AND i.DependenciaInstitucion = ? ";
            $params[] = $dependencia;
        } else {
            $sql .= "AND i.IdInstitucion = ? ";
            $params[] = $currentInstId;
        }

        // ORDENAMIENTO: Tu sede primero
        $sql .= "ORDER BY 
                    CASE WHEN i.IdInstitucion = ? THEN 0 ELSE 1 END ASC, 
                    i.NombreCompletoInst ASC";
        
        $params[] = $currentInstId;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}