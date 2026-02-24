<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria;

class AdminConfigInsumoExpModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($instId) {
        $sql = "SELECT i.*, e.EspeNombreA as NombreEspecie
                FROM insumoexperimental i
                LEFT JOIN especiee e ON i.IdespA = e.idespA
                WHERE i.IdInstitucion = ? 
                ORDER BY i.NombreInsumo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSpecies($instId) {
        $sql = "SELECT idespA, EspeNombreA FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function save($data) {
        $id = $data['IdInsumoexp'] ?? '';
        $nombre = $data['NombreInsumo'];
        $cantidad = $data['CantidadInsumo'] ?? 1;
        $tipo = $data['TipoInsumo'] ?? 'Unid.';
        $idEspecie = !empty($data['IdespA']) ? $data['IdespA'] : 0; 
        $habilitado = $data['habilitado'] ?? 1;
        $instId = $data['instId'];

        if (empty($id)) {
            $sql = "INSERT INTO insumoexperimental (NombreInsumo, CantidadInsumo, TipoInsumo, IdespA, IdInstitucion, habilitado, PrecioInsumo) 
                    VALUES (?, ?, ?, ?, ?, ?, 0)";
            $res = $this->db->prepare($sql)->execute([$nombre, $cantidad, $tipo, $idEspecie, $instId, $habilitado]);
            Auditoria::log($this->db, 'INSERT', 'insumoexperimental', "Creó reactivo/insumo exp: $nombre");
            return $res;
        } else {
            $sql = "UPDATE insumoexperimental SET NombreInsumo=?, CantidadInsumo=?, TipoInsumo=?, IdespA=?, habilitado=? 
                    WHERE IdInsumoexp=?";
            $res = $this->db->prepare($sql)->execute([$nombre, $cantidad, $tipo, $idEspecie, $habilitado, $id]);
            Auditoria::log($this->db, 'UPDATE', 'insumoexperimental', "Modificó reactivo ID: $id");
            return $res;
        }
    }

    public function delete($id) {
        try {
            $sql = "DELETE FROM insumoexperimental WHERE IdInsumoexp = ?";
            $this->db->prepare($sql)->execute([$id]);
            Auditoria::log($this->db, 'DELETE', 'insumoexperimental', "Eliminó reactivo ID: $id");
            return 'deleted';
        } catch (\Exception $e) {
            $sql = "UPDATE insumoexperimental SET habilitado = 2 WHERE IdInsumoexp = ?";
            $this->db->prepare($sql)->execute([$id]);
            Auditoria::log($this->db, 'SOFT_DELETE', 'insumoexperimental', "Desactivó reactivo ID: $id (En uso)");
            return 'deactivated';
        }
    }

    public function toggleStatus($data) {
        $id = $data['id'];
        $status = $data['status']; 
        $sql = "UPDATE insumoexperimental SET habilitado = ? WHERE IdInsumoexp = ?";
        $res = $this->db->prepare($sql)->execute([$status, $id]);
        Auditoria::log($this->db, 'UPDATE', 'insumoexperimental', "Cambió estado a $status del reactivo ID: $id");
        return $res;
    }
}