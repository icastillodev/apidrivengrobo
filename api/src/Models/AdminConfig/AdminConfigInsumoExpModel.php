<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigInsumoExpModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($instId) {
        // Traemos datos del insumo + nombre de la especie (si tiene)
        $sql = "SELECT 
                    i.*, 
                    e.EspeNombreA as NombreEspecie
                FROM insumoexperimental i
                LEFT JOIN especiee e ON i.IdespA = e.idespA
                WHERE i.IdInstitucion = ? 
                ORDER BY i.NombreInsumo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSpecies($instId) {
        // Solo para llenar el select del modal
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
        
        // Si viene vacío o 0, guardamos NULL o 0 (según tu estructura, usaremos 0 para 'sin especie')
        $idEspecie = !empty($data['IdespA']) ? $data['IdespA'] : 0; 
        
        $habilitado = $data['habilitado'] ?? 1;
        $instId = $data['instId'];

        if (empty($id)) {
            // INSERT (Precio en 0 por defecto)
            $sql = "INSERT INTO insumoexperimental (NombreInsumo, CantidadInsumo, TipoInsumo, IdespA, IdInstitucion, habilitado, PrecioInsumo) 
                    VALUES (?, ?, ?, ?, ?, ?, 0)";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $cantidad, $tipo, $idEspecie, $instId, $habilitado]);
        } else {
            // UPDATE
            $sql = "UPDATE insumoexperimental SET NombreInsumo=?, CantidadInsumo=?, TipoInsumo=?, IdespA=?, habilitado=? 
                    WHERE IdInsumoexp=?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $cantidad, $tipo, $idEspecie, $habilitado, $id]);
        }
    }

    public function delete($id) {
        // Validar uso en historial (Asumiendo tabla 'formularioe' o similar donde se use)
        // Ajusta la tabla si es otra, por ejemplo 'insumos_exp_pedidos'
        // Por seguridad, usaremos una lógica genérica soft-delete si falla FK
        
        try {
            $sql = "DELETE FROM insumoexperimental WHERE IdInsumoexp = ?";
            $this->db->prepare($sql)->execute([$id]);
            return 'deleted';
        } catch (\Exception $e) {
            // Si falla por FK, desactivamos (Soft Delete)
            $sql = "UPDATE insumoexperimental SET habilitado = 2 WHERE IdInsumoexp = ?";
            $this->db->prepare($sql)->execute([$id]);
            return 'deactivated';
        }
    }

    public function toggleStatus($data) {
        $id = $data['id'];
        $status = $data['status']; // 1 o 2
        $sql = "UPDATE insumoexperimental SET habilitado = ? WHERE IdInsumoexp = ?";
        return $this->db->prepare($sql)->execute([$status, $id]);
    }
}