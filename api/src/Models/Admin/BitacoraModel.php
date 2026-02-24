<?php
namespace App\Models\Admin;
use PDO;

class BitacoraModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getFullLogs() {
        // Hacemos JOIN con personae y usuarioe para traer el nombre real del que hizo la acción
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
                    END as UsuarioName
                FROM bitacora b
                LEFT JOIN usuarioe u ON b.id_usuario = u.IdUsrA
                LEFT JOIN personae p ON b.id_usuario = p.IdUsrA
                ORDER BY b.id_bitacora DESC";
        
        // Limitamos a los últimos 5000 registros para no sobrecargar la memoria del navegador.
        // Si necesitas más, se puede implementar paginación en SQL.
        $stmt = $this->db->query($sql . " LIMIT 5000"); 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}