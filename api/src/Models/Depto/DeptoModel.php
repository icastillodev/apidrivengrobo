<?php
namespace App\Models\Depto;

use PDO;

class DeptoModel {
    
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllByInstitution($instId) {
        $sql = "SELECT d.iddeptoA, d.NombreDeptoA, o.NombreOrganismoSimple 
                FROM departamentoe d 
                LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo 
                WHERE d.IdInstitucion = ? 
                ORDER BY d.NombreDeptoA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}