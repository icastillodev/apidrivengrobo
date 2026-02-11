<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigProtocoloModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllData($instId) {
        // Tipos
        $stmtTypes = $this->db->prepare("SELECT * FROM tipoprotocolo WHERE IdInstitucion = ? ORDER BY NombreTipoprotocolo ASC");
        $stmtTypes->execute([$instId]);
        
        // Severidades
        $stmtSev = $this->db->prepare("SELECT * FROM tiposeveridad WHERE IdInstitucion = ? ORDER BY NombreSeveridad ASC");
        $stmtSev->execute([$instId]);

        return [
            'types' => $stmtTypes->fetchAll(PDO::FETCH_ASSOC),
            'severities' => $stmtSev->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /* --- TIPO PROTOCOLO --- */
    public function saveTipoProtocolo($data) {
        $id = $data['idtipoprotocolo'] ?? '';
        if (empty($id)) {
            $sql = "INSERT INTO tipoprotocolo (NombreTipoprotocolo, IdInstitucion) VALUES (?, ?)";
            return $this->db->prepare($sql)->execute([$data['Nombre'], $data['instId']]);
        } else {
            $sql = "UPDATE tipoprotocolo SET NombreTipoprotocolo = ? WHERE idtipoprotocolo = ?";
            return $this->db->prepare($sql)->execute([$data['Nombre'], $id]);
        }
    }

    public function deleteTipoProtocolo($id) {
        $stmt = $this->db->prepare("DELETE FROM tipoprotocolo WHERE idtipoprotocolo = ?");
        return $stmt->execute([$id]);
    }

    /* --- SEVERIDAD --- */
    public function saveSeveridad($data) {
        $id = $data['IdSeveridadTipo'] ?? '';
        if (empty($id)) {
            $sql = "INSERT INTO tiposeveridad (NombreSeveridad, detalle, IdInstitucion) VALUES (?, ?, ?)";
            return $this->db->prepare($sql)->execute([$data['Nombre'], $data['Detalle'], $data['instId']]);
        } else {
            $sql = "UPDATE tiposeveridad SET NombreSeveridad = ?, detalle = ? WHERE IdSeveridadTipo = ?";
            return $this->db->prepare($sql)->execute([$data['Nombre'], $data['Detalle'], $id]);
        }
    }

    public function deleteSeveridad($id) {
        $stmt = $this->db->prepare("DELETE FROM tiposeveridad WHERE IdSeveridadTipo = ?");
        return $stmt->execute([$id]);
    }
}