<?php
namespace App\Models\Institution;

use PDO;

class InstitutionModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getDepartmentsByInstitution($instId) {
        // Traemos los departamentos filtrados por la institución actual
        $query = "SELECT iddeptoA, NombreDeptoA, DetalledeptoA 
                  FROM departamentoe 
                  WHERE IdInstitucion = ? 
                  ORDER BY NombreDeptoA ASC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}