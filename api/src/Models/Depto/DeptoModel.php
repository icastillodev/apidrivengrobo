<?php
namespace App\Models\Depto;

use PDO;

class DeptoModel {
    
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllByInstitution($instId) {
        $sql = "SELECT iddeptoA, NombreDeptoA 
                FROM departamentoe 
                WHERE IdInstitucion = ? 
                ORDER BY NombreDeptoA ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}