<?php
namespace App\Models\UserHousing;

use PDO;

class UserHousingModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllHousings($userId, $currentInstId) {
        // 1. Info Institución Actual
        $stmtInst = $this->db->prepare("SELECT NombreInst, InstCorreo, InstContacto FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$currentInstId]);
        $institucion = $stmtInst->fetch(PDO::FETCH_ASSOC);

        // 2. Lista Agrupada (CORREGIDA: Nombre de Especie)
        $sql = "SELECT 
                    a.historia as IdHistoria,
                    MAX(i.NombreInst) as Institucion,
                    COALESCE(MAX(p.nprotA), 'N/A') as Protocolo,
                    
                    -- CORRECCIÓN: Traemos el nombre de la especie, no el ID
                    COALESCE(MAX(e.EspeNombreA), 'Desconocida') as Especie,

                    MIN(a.fechavisado) as FechaInicio,
                    MAX(a.hastafecha) as FechaFin,
                    SUM(a.cuentaapagar) as CostoTotal,
                    
                    CASE 
                        WHEN MIN(a.finalizado) = 0 THEN 'Vigente' 
                        ELSE 'Finalizado' 
                    END as Estado

                FROM alojamiento a
                INNER JOIN institucion i ON a.IdInstitucion = i.IdInstitucion
                LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA
                -- JOIN con Especie
                LEFT JOIN especiee e ON a.TipoAnimal = e.idespA 
                
                WHERE a.IdUsrA = ?
                GROUP BY a.historia
                ORDER BY a.historia DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        
        return [
            'info_inst' => $institucion,
            'list' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    public function getDetail($historiaId) {
        // CORRECCIÓN: Join con especiee para el nombre
        $sql = "SELECT 
                    a.*,
                    i.NombreInst, 
                    i.InstCorreo, 
                    i.InstContacto,
                    COALESCE(p.nprotA, 'N/A') as nprotA,
                    CONCAT(pe.NombreA, ' ', pe.ApellidoA) as Investigador,
                    e.EspeNombreA as EspecieNombre -- Nombre real
                FROM alojamiento a
                JOIN institucion i ON a.IdInstitucion = i.IdInstitucion
                JOIN personae pe ON a.IdUsrA = pe.IdUsrA
                LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA
                LEFT JOIN especiee e ON a.TipoAnimal = e.idespA -- Join Especie
                WHERE a.historia = ?
                ORDER BY a.fechavisado ASC"; 

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$historiaId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) throw new \Exception("Historial no encontrado");

        // Calcular Totales
        $totalCosto = 0;
        $totalDias = 0;
        foreach ($rows as $r) {
            $totalCosto += $r['cuentaapagar'];
            $dias = $r['totaldiasdefinidos'] > 0 ? $r['totaldiasdefinidos'] : 0;
            $totalDias += $dias;
        }

        $first = $rows[0];
        $last = end($rows);

        $header = [
            'IdHistoria' => $historiaId,
            'Investigador' => $first['Investigador'],
            'Protocolo' => $first['nprotA'],
            'Especie' => $first['EspecieNombre'], // Usamos el nombre traído
            'Institucion' => $first['NombreInst'],
            'InstCorreo' => $first['InstCorreo'],
            'InstContacto' => $first['InstContacto'],
            'TotalDias' => $totalDias,
            'TotalCosto' => $totalCosto,
            'Estado' => ($last['finalizado'] == 1) ? 'Finalizado' : 'Vigente'
        ];

        return [
            'header' => $header,
            'rows' => $rows
        ];
    }
}