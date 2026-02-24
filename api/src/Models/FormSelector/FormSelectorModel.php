<?php
namespace App\Models\FormSelector;
use PDO;

class FormSelectorModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getInstitutionalNetwork($currentInstId) {
        $stmtDep = $this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $stmtDep->execute([$currentInstId]);
        $dependencia = $stmtDep->fetchColumn();

        $sql = "SELECT 
                    i.IdInstitucion,
                    i.NombreInst,
                    i.NombreCompletoInst,
                    i.DependenciaInstitucion,
                    COALESCE(s.Animales, 0) as flag_animales,
                    COALESCE(s.Reactivos, 0) as flag_reactivos,
                    COALESCE(s.Insumos, 0) as flag_insumos,
                    COALESCE(s.Alojamiento, 0) as flag_alojamiento,
                    COALESCE(s.Reservas, 0) as flag_reservas
                FROM institucion i
                LEFT JOIN institucionservicios s ON i.IdInstitucion = s.IdInstitucion
                WHERE i.Activo = 1 ";

        $params = [];

        if (!empty($dependencia)) {
            $sql .= "AND i.DependenciaInstitucion = ? ";
            $params[] = $dependencia;
        } else {
            $sql .= "AND i.IdInstitucion = ? ";
            $params[] = $currentInstId;
        }

        $sql .= "ORDER BY 
                    CASE WHEN i.IdInstitucion = ? THEN 0 ELSE 1 END ASC, 
                    i.NombreCompletoInst ASC";
        
        $params[] = $currentInstId;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}