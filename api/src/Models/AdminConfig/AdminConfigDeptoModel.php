<?php
namespace App\Models\AdminConfig; // Coincide con la carpeta en tu imagen

use PDO;

class AdminConfigDeptoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllData($instId) {
        // 1. Obtener Organismos
        $stmtOrg = $this->db->prepare("SELECT * FROM organismoe ORDER BY NombreOrganismoSimple ASC");
        $stmtOrg->execute();
        $orgs = $stmtOrg->fetchAll(PDO::FETCH_ASSOC);

        // 2. Obtener Departamentos de la Institución
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

    // --- MÉTODOS DE GUARDADO Y ELIMINACIÓN ---
    public function saveOrganismo($data) {
        if (empty($data['IdOrganismo'])) {
            $sql = "INSERT INTO organismoe (NombreOrganismoSimple, NombreOrganismoCompleto, ContactoOrgnismo, CorreoOrganismo, DireccionOrganismo, PaisOrganismo) VALUES (?, ?, ?, ?, ?, ?)";
            return $this->db->prepare($sql)->execute([$data['NombreSimple'], $data['NombreCompleto'], $data['Contacto'], $data['Correo'], $data['Direccion'], $data['Pais']]);
        } else {
            $sql = "UPDATE organismoe SET NombreOrganismoSimple=?, NombreOrganismoCompleto=?, ContactoOrgnismo=?, CorreoOrganismo=?, DireccionOrganismo=?, PaisOrganismo=? WHERE IdOrganismo=?";
            return $this->db->prepare($sql)->execute([$data['NombreSimple'], $data['NombreCompleto'], $data['Contacto'], $data['Correo'], $data['Direccion'], $data['Pais'], $data['IdOrganismo']]);
        }
    }

    public function deleteOrganismo($id) {
        $stmt = $this->db->prepare("DELETE FROM organismoe WHERE IdOrganismo = ?");
        return $stmt->execute([$id]);
    }

    public function saveDepartamento($data) {
        if (empty($data['iddeptoA'])) {
            $sql = "INSERT INTO departamentoe (NombreDeptoA, DetalledeptoA, organismopertenece, IdInstitucion) VALUES (?, ?, ?, ?)";
            return $this->db->prepare($sql)->execute([$data['NombreDepto'], $data['Detalle'], $data['idOrg'], $data['instId']]);
        } else {
            $sql = "UPDATE departamentoe SET NombreDeptoA=?, DetalledeptoA=?, organismopertenece=? WHERE iddeptoA=?";
            return $this->db->prepare($sql)->execute([$data['NombreDepto'], $data['Detalle'], $data['idOrg'], $data['iddeptoA']]);
        }
    }

    public function deleteDepartamento($id) {
        $stmt = $this->db->prepare("DELETE FROM departamentoe WHERE iddeptoA = ?");
        return $stmt->execute([$id]);
    }
}