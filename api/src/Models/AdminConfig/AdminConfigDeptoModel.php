<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria; // <-- IMPORTANTE

class AdminConfigDeptoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllData($instId) {
        $stmtOrg = $this->db->prepare("SELECT * FROM organismoe ORDER BY NombreOrganismoSimple ASC");
        $stmtOrg->execute();
        $orgs = $stmtOrg->fetchAll(PDO::FETCH_ASSOC);

        $sqlDepto = "SELECT 
                        d.*, 
                        o.NombreOrganismoSimple as NombreOrg
                     FROM departamentoe d
                     LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                     WHERE d.IdInstitucion = ?
                     ORDER BY d.NombreDeptoA ASC";
        
        $stmtDepto = $this->db->prepare($sqlDepto);
        $stmtDepto->execute([$instId]);
        $deptos = $stmtDepto->fetchAll(PDO::FETCH_ASSOC);

        return [
            'orgs' => $orgs ? $orgs : [],
            'deptos' => $deptos ? $deptos : []
        ];
    }

    public function saveOrganismo($data) {
        if (empty($data['IdOrganismo'])) {
            $sql = "INSERT INTO organismoe (NombreOrganismoSimple, NombreOrganismoCompleto, ContactoOrgnismo, CorreoOrganismo, DireccionOrganismo, PaisOrganismo) VALUES (?, ?, ?, ?, ?, ?)";
            $res = $this->db->prepare($sql)->execute([$data['NombreSimple'], $data['NombreCompleto'], $data['Contacto'], $data['Correo'], $data['Direccion'], $data['Pais']]);
            
            Auditoria::log($this->db, 'INSERT', 'organismoe', "Creó organismo: " . $data['NombreSimple']);
            return $res;
        } else {
            $sql = "UPDATE organismoe SET NombreOrganismoSimple=?, NombreOrganismoCompleto=?, ContactoOrgnismo=?, CorreoOrganismo=?, DireccionOrganismo=?, PaisOrganismo=? WHERE IdOrganismo=?";
            $res = $this->db->prepare($sql)->execute([$data['NombreSimple'], $data['NombreCompleto'], $data['Contacto'], $data['Correo'], $data['Direccion'], $data['Pais'], $data['IdOrganismo']]);
            
            Auditoria::log($this->db, 'UPDATE', 'organismoe', "Modificó organismo ID: " . $data['IdOrganismo']);
            return $res;
        }
    }

    public function deleteOrganismo($id) {
        $stmt = $this->db->prepare("DELETE FROM organismoe WHERE IdOrganismo = ?");
        $res = $stmt->execute([$id]);
        
        Auditoria::log($this->db, 'DELETE', 'organismoe', "Eliminó organismo ID: $id");
        return $res;
    }

    public function saveDepartamento($data) {
        if (empty($data['iddeptoA'])) {
            $sql = "INSERT INTO departamentoe (NombreDeptoA, DetalledeptoA, organismopertenece, IdInstitucion) VALUES (?, ?, ?, ?)";
            $res = $this->db->prepare($sql)->execute([$data['NombreDepto'], $data['Detalle'], $data['idOrg'], $data['instId']]);
            
            Auditoria::log($this->db, 'INSERT', 'departamentoe', "Creó departamento: " . $data['NombreDepto']);
            return $res;
        } else {
            $sql = "UPDATE departamentoe SET NombreDeptoA=?, DetalledeptoA=?, organismopertenece=? WHERE iddeptoA=?";
            $res = $this->db->prepare($sql)->execute([$data['NombreDepto'], $data['Detalle'], $data['idOrg'], $data['iddeptoA']]);
            
            Auditoria::log($this->db, 'UPDATE', 'departamentoe', "Modificó departamento ID: " . $data['iddeptoA']);
            return $res;
        }
    }

    public function deleteDepartamento($id) {
        $stmt = $this->db->prepare("DELETE FROM departamentoe WHERE iddeptoA = ?");
        $res = $stmt->execute([$id]);
        
        Auditoria::log($this->db, 'DELETE', 'departamentoe', "Eliminó departamento ID: $id");
        return $res;
    }
}