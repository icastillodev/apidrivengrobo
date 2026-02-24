<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria;

class AdminConfigProtocoloModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllData($instId) {
        $stmtTypes = $this->db->prepare("SELECT * FROM tipoprotocolo WHERE IdInstitucion = ? ORDER BY NombreTipoprotocolo ASC");
        $stmtTypes->execute([$instId]);
        
        $stmtSev = $this->db->prepare("SELECT * FROM tiposeveridad WHERE IdInstitucion = ? ORDER BY NombreSeveridad ASC");
        $stmtSev->execute([$instId]);

        return [
            'types' => $stmtTypes->fetchAll(PDO::FETCH_ASSOC),
            'severities' => $stmtSev->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    public function saveTipoProtocolo($data) {
        $id = $data['idtipoprotocolo'] ?? '';
        if (empty($id)) {
            $sql = "INSERT INTO tipoprotocolo (NombreTipoprotocolo, IdInstitucion) VALUES (?, ?)";
            $res = $this->db->prepare($sql)->execute([$data['Nombre'], $data['instId']]);
            Auditoria::log($this->db, 'INSERT', 'tipoprotocolo', "Creó tipo protocolo: " . $data['Nombre']);
            return $res;
        } else {
            $sql = "UPDATE tipoprotocolo SET NombreTipoprotocolo = ? WHERE idtipoprotocolo = ?";
            $res = $this->db->prepare($sql)->execute([$data['Nombre'], $id]);
            Auditoria::log($this->db, 'UPDATE', 'tipoprotocolo', "Modificó tipo protocolo ID: $id");
            return $res;
        }
    }

    public function deleteTipoProtocolo($id) {
        $stmt = $this->db->prepare("DELETE FROM tipoprotocolo WHERE idtipoprotocolo = ?");
        $res = $stmt->execute([$id]);
        Auditoria::log($this->db, 'DELETE', 'tipoprotocolo', "Eliminó tipo protocolo ID: $id");
        return $res;
    }

    public function saveSeveridad($data) {
        $id = $data['IdSeveridadTipo'] ?? '';
        if (empty($id)) {
            $sql = "INSERT INTO tiposeveridad (NombreSeveridad, detalle, IdInstitucion) VALUES (?, ?, ?)";
            $res = $this->db->prepare($sql)->execute([$data['Nombre'], $data['Detalle'], $data['instId']]);
            Auditoria::log($this->db, 'INSERT', 'tiposeveridad', "Creó nivel severidad: " . $data['Nombre']);
            return $res;
        } else {
            $sql = "UPDATE tiposeveridad SET NombreSeveridad = ?, detalle = ? WHERE IdSeveridadTipo = ?";
            $res = $this->db->prepare($sql)->execute([$data['Nombre'], $data['Detalle'], $id]);
            Auditoria::log($this->db, 'UPDATE', 'tiposeveridad', "Modificó nivel severidad ID: $id");
            return $res;
        }
    }

    public function deleteSeveridad($id) {
        $stmt = $this->db->prepare("DELETE FROM tiposeveridad WHERE IdSeveridadTipo = ?");
        $res = $stmt->execute([$id]);
        Auditoria::log($this->db, 'DELETE', 'tiposeveridad', "Eliminó severidad ID: $id");
        return $res;
    }
}