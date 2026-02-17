<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigInsumoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($instId) {
        // Hacemos un LEFT JOIN para traer el nombre del Tipo de Formulario en lugar del ID numérico
        // Si CategoriaInsumo es 0 o null, mostrará NULL en NombreCategoria
        $sql = "SELECT i.*, t.nombreTipo as NombreCategoria 
                FROM insumo i 
                LEFT JOIN tipoformularios t ON i.CategoriaInsumo = t.IdTipoFormulario
                WHERE i.IdInstitucion = ? 
                ORDER BY i.NombreInsumo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // NUEVO MÉTODO: Obtener los tipos de formulario 'Insumos' para el select
    public function getInsumoTypes($instId) {
        $sql = "SELECT IdTipoFormulario, nombreTipo 
                FROM tipoformularios 
                WHERE IdInstitucion = ? AND categoriaformulario = 'Insumos' 
                ORDER BY nombreTipo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function save($data) {
        $id = $data['idInsumo'] ?? '';
        $nombre = $data['NombreInsumo'];
        $cantidad = $data['CantidadInsumo'] ?? 1;
        $tipo = $data['TipoInsumo'] ?? 'Unid.';
        
        // Aquí guardamos el ID del tipo de formulario (INT)
        // Si viene vacío o 0, guardamos NULL o 0 según tu estructura. Asumiremos 0 para "General".
        $categoria = !empty($data['CategoriaInsumo']) ? $data['CategoriaInsumo'] : 0;
        
        $existencia = $data['Existencia'] ?? 1;
        $instId = $data['instId'];

        if (empty($id)) {
            $sql = "INSERT INTO insumo (NombreInsumo, CantidadInsumo, TipoInsumo, CategoriaInsumo, IdInstitucion, Existencia, PrecioInsumo, OrdenInsumos) 
                    VALUES (?, ?, ?, ?, ?, ?, 0, 1)";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $cantidad, $tipo, $categoria, $instId, $existencia]);
        } else {
            $sql = "UPDATE insumo SET NombreInsumo=?, CantidadInsumo=?, TipoInsumo=?, CategoriaInsumo=?, Existencia=? 
                    WHERE idInsumo=?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $cantidad, $tipo, $categoria, $existencia, $id]);
        }
    }

    public function delete($id) {
        // Verificar uso en historial (insumospedidos)
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM insumospedidos WHERE idInsumo = ?"); 
        $stmt->execute([$id]);
        $used = $stmt->fetchColumn() > 0;

        if ($used) {
            $sql = "UPDATE insumo SET Existencia = 2 WHERE idInsumo = ?";
            $this->db->prepare($sql)->execute([$id]);
            return 'deactivated';
        } else {
            $sql = "DELETE FROM insumo WHERE idInsumo = ?";
            $this->db->prepare($sql)->execute([$id]);
            return 'deleted';
        }
    }

    public function toggleStatus($data) {
        $id = $data['idInsumo'];
        $status = $data['status'];
        $sql = "UPDATE insumo SET Existencia = ? WHERE idInsumo = ?";
        return $this->db->prepare($sql)->execute([$status, $id]);
    }
}