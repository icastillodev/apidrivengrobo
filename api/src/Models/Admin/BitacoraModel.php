<?php
namespace App\Models\Admin;
use PDO;

class BitacoraModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getFullLogs() {
        // Hacemos JOIN con personae, usuarioe e institucion para traer la trazabilidad completa
        $sql = "SELECT 
                    b.id_bitacora,
                    b.id_usuario,
                    b.accion,
                    b.tabla_afectada,
                    b.detalle,
                    DATE_FORMAT(b.fecha_hora, '%d/%m/%Y %H:%i:%s') as fecha_hora,
                    CASE 
                        WHEN b.id_usuario = 0 THEN 'Sistema / Usuario Externo'
                        ELSE COALESCE(CONCAT(p.NombreA, ' ', p.ApellidoA, ' (', u.UsrA, ')'), 'Desconocido') 
                    END as UsuarioName,
                    CASE 
                        WHEN u.IdInstitucion = 0 OR u.IdInstitucion IS NULL THEN 'SISTEMA GLOBAL'
                        ELSE COALESCE(i.NombreInst, 'Sede Desconocida')
                    END as Institucion
                FROM bitacora b
                LEFT JOIN usuarioe u ON b.id_usuario = u.IdUsrA
                LEFT JOIN personae p ON b.id_usuario = p.IdUsrA
                LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                ORDER BY b.id_bitacora DESC
                LIMIT 5000";
        
        $stmt = $this->db->query($sql); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}