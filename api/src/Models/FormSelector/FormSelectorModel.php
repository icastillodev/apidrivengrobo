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

        // Hemos aplanado el CASE WHEN para que MySQL no se confunda
        $sql = "SELECT 
                    i.IdInstitucion,
                    i.NombreInst,
                    i.NombreCompletoInst,
                    i.DependenciaInstitucion,
                    COALESCE(MAX(
                        CASE 
                            WHEN app.NombreModulo LIKE '%Animales%' AND ma.Habilitado = 1 AND ma.ActivoInvestigador = 1 THEN 2 
                            WHEN app.NombreModulo LIKE '%Animales%' AND ma.Habilitado = 1 THEN 1 
                            ELSE 0 
                        END
                    ), 0) as flag_animales,
                    
                    COALESCE(MAX(
                        CASE 
                            WHEN app.NombreModulo LIKE '%Reactivos%' AND ma.Habilitado = 1 AND ma.ActivoInvestigador = 1 THEN 2 
                            WHEN app.NombreModulo LIKE '%Reactivos%' AND ma.Habilitado = 1 THEN 1 
                            ELSE 0 
                        END
                    ), 0) as flag_reactivos,
                    
                    COALESCE(MAX(
                        CASE 
                            WHEN app.NombreModulo LIKE '%Insumos%' AND ma.Habilitado = 1 AND ma.ActivoInvestigador = 1 THEN 2 
                            WHEN app.NombreModulo LIKE '%Insumos%' AND ma.Habilitado = 1 THEN 1 
                            ELSE 0 
                        END
                    ), 0) as flag_insumos,
                    
                    COALESCE(MAX(
                        CASE 
                            WHEN app.NombreModulo LIKE '%Alojamiento%' AND ma.Habilitado = 1 AND ma.ActivoInvestigador = 1 THEN 2 
                            WHEN app.NombreModulo LIKE '%Alojamiento%' AND ma.Habilitado = 1 THEN 1 
                            ELSE 0 
                        END
                    ), 0) as flag_alojamiento,
                    
                    COALESCE(MAX(
                        CASE 
                            WHEN app.NombreModulo LIKE '%Reservas%' AND ma.Habilitado = 1 AND ma.ActivoInvestigador = 1 THEN 2 
                            WHEN app.NombreModulo LIKE '%Reservas%' AND ma.Habilitado = 1 THEN 1 
                            ELSE 0 
                        END
                    ), 0) as flag_reservas
                    
                FROM institucion i
                LEFT JOIN modulosactivosinst ma ON i.IdInstitucion = ma.IdInstitucion
                LEFT JOIN modulosapp app ON ma.IdModulosApp = app.IdModulosApp
                WHERE i.Activo = 1 ";

        $params = [];

        if (!empty($dependencia)) {
            $sql .= "AND i.DependenciaInstitucion = ? ";
            $params[] = $dependencia;
        } else {
            $sql .= "AND i.IdInstitucion = ? ";
            $params[] = $currentInstId;
        }

        $sql .= "GROUP BY i.IdInstitucion, i.NombreInst, i.NombreCompletoInst, i.DependenciaInstitucion ";
        $sql .= "ORDER BY CASE WHEN i.IdInstitucion = ? THEN 0 ELSE 1 END ASC, i.NombreCompletoInst ASC";
        
        $params[] = $currentInstId;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC); 
    }
}