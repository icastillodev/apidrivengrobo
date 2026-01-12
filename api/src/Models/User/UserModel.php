<?php
namespace App\Models\User;
use PDO;

class UserModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getUsersByInstitution($instId) {
        // SQL para traer datos de persona y contar protocolos externos
            $sql = "SELECT 
                        u.IdUsrA, 
                        u.UsrA as Usuario, 
                        p.NombreA, 
                        p.ApellidoA, 
                        p.CelularA, 
                        p.EmailA as Correo, 
                        p.LabA as iddeptoA, -- Lo renombramos aquí para el JS
                        (SELECT COUNT(*) 
                        FROM formularioe f 
                        JOIN protformr pf ON f.idformA = pf.idformA
                        JOIN protocoloexpe pe ON pf.idprotA = pe.idprotA
                        WHERE f.IdUsrA = u.IdUsrA) as OtrosCeuaCount
                    FROM usuarioe u
                    JOIN personae p ON u.IdUsrA = p.IdUsrA
                    WHERE u.IdInstitucion = ?
                    ORDER BY p.ApellidoA ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}