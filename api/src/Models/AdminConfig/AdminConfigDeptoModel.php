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
        // 1. FIX: Ahora filtramos los Organismos estrictamente por IdInstitucion
        $stmtOrg = $this->db->prepare("SELECT * FROM organismoe WHERE IdInstitucion = ? ORDER BY NombreOrganismoSimple ASC");
        $stmtOrg->execute([$instId]);
        $orgs = $stmtOrg->fetchAll(PDO::FETCH_ASSOC);

        // 2. Departamentos (Ya estaba filtrado, pero es bueno revisar el JOIN)
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
        // 1 = interno (default), 2 = externo
        $externoOrganismo = 1;
        if (isset($data['externoorganismo']) && (int)$data['externoorganismo'] === 2) {
            $externoOrganismo = 2;
        }

        if (empty($data['IdOrganismo'])) {
            $sql = "INSERT INTO organismoe (
                        NombreOrganismoSimple, NombreOrganismoCompleto, ContactoOrgnismo, 
                        CorreoOrganismo, DireccionOrganismo, PaisOrganismo,
                        IdInstitucion, externoorganismo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $res = $this->db->prepare($sql)->execute([
                $data['NombreSimple'],
                $data['NombreCompleto'],
                $data['Contacto'],
                $data['Correo'],
                $data['Direccion'],
                $data['Pais'],
                $data['instId'],
                $externoOrganismo
            ]);
            
            Auditoria::log($this->db, 'INSERT', 'organismoe', "Creó organismo: " . $data['NombreSimple']);
            return $res;
        } else {
            $sql = "UPDATE organismoe SET 
                        NombreOrganismoSimple=?,
                        NombreOrganismoCompleto=?,
                        ContactoOrgnismo=?,
                        CorreoOrganismo=?,
                        DireccionOrganismo=?,
                        PaisOrganismo=?,
                        externoorganismo=?
                    WHERE IdOrganismo=?";
            $res = $this->db->prepare($sql)->execute([
                $data['NombreSimple'],
                $data['NombreCompleto'],
                $data['Contacto'],
                $data['Correo'],
                $data['Direccion'],
                $data['Pais'],
                $externoOrganismo,
                $data['IdOrganismo']
            ]);
            
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
        // Validación final en el Model
        $idOrg = (isset($data['idOrg']) && trim($data['idOrg']) !== '') ? $data['idOrg'] : null;

        // Determinar flag externo del departamento:
        // 1 = interno (default), 2 = externo
        $externoDepto = 1;
        if (isset($data['externodepto'])) {
            $externoDepto = ((int)$data['externodepto'] === 2) ? 2 : 1;
        } elseif ($idOrg) {
            // Si no viene explícito pero hay organismo, tomar por defecto el flag del organismo
            $stmt = $this->db->prepare("SELECT externoorganismo FROM organismoe WHERE IdOrganismo = ?");
            $stmt->execute([$idOrg]);
            $flagOrg = $stmt->fetchColumn();
            if ((int)$flagOrg === 2) {
                $externoDepto = 2;
            }
        }

        if (empty($data['iddeptoA'])) {
            $sql = "INSERT INTO departamentoe (
                        NombreDeptoA, DetalledeptoA, organismopertenece, IdInstitucion, externodepto
                    ) VALUES (?, ?, ?, ?, ?)";
            
            $res = $this->db->prepare($sql)->execute([
                $data['NombreDepto'], 
                $data['Detalle'], 
                $idOrg, 
                $data['instId'],
                $externoDepto
            ]);
            
            Auditoria::log($this->db, 'INSERT', 'departamentoe', "Creó departamento: " . $data['NombreDepto']);
            return $res;
        } else {
            $sql = "UPDATE departamentoe SET 
                        NombreDeptoA=?,
                        DetalledeptoA=?,
                        organismopertenece=?,
                        externodepto=?
                    WHERE iddeptoA=?";
            
            $res = $this->db->prepare($sql)->execute([
                $data['NombreDepto'], 
                $data['Detalle'], 
                $idOrg, 
                $externoDepto,
                $data['iddeptoA']
            ]);
            
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