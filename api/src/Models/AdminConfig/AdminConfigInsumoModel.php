<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigInsumoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($instId) {
        $sql = "SELECT * FROM insumo WHERE IdInstitucion = ? ORDER BY NombreInsumo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function save($data) {
        $id = $data['idInsumo'] ?? '';
        $nombre = $data['NombreInsumo'];
        $cantidad = $data['CantidadInsumo'] ?? 1;
        $tipo = $data['TipoInsumo'] ?? 'Unid.';
        $categoria = $data['CategoriaInsumo'] ?? 'General';
        $existencia = $data['Existencia'] ?? 1;
        $instId = $data['instId'];

        if (empty($id)) {
            // INSERT: Precio=0, Orden=1 por defecto
            $sql = "INSERT INTO insumo (NombreInsumo, CantidadInsumo, TipoInsumo, CategoriaInsumo, IdInstitucion, Existencia, PrecioInsumo, OrdenInsumos) 
                    VALUES (?, ?, ?, ?, ?, ?, 0, 1)";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $cantidad, $tipo, $categoria, $instId, $existencia]);
        } else {
            // UPDATE
            $sql = "UPDATE insumo SET NombreInsumo=?, CantidadInsumo=?, TipoInsumo=?, CategoriaInsumo=?, Existencia=? 
                    WHERE idInsumo=?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $cantidad, $tipo, $categoria, $existencia, $id]);
        }
    }

    public function delete($id) {
        // 1. VERIFICAR USO EN HISTORIAL
        // Ajusta "pedido_insumos" al nombre real de la tabla detalle de tus pedidos de insumos
        // Si no tienes el nombre exacto, el catch del error de FK en la base de datos también serviría, 
        // pero es mejor prevenirlo aquí.
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM insumospedidos WHERE idInsumo = ?"); 
        $stmt->execute([$id]);
        $used = $stmt->fetchColumn() > 0;

        if ($used) {
            // Soft Delete: Desactivar (Existencia = 2)
            $sql = "UPDATE insumo SET Existencia = 2 WHERE idInsumo = ?";
            $this->db->prepare($sql)->execute([$id]);
            return 'deactivated';
        } else {
            // Hard Delete
            $sql = "DELETE FROM insumo WHERE idInsumo = ?";
            $this->db->prepare($sql)->execute([$id]);
            return 'deleted';
        }
    }

    public function toggleStatus($data) {
        $id = $data['idInsumo'];
        $status = $data['status']; // Viene 1 o 2
        $sql = "UPDATE insumo SET Existencia = ? WHERE idInsumo = ?";
        return $this->db->prepare($sql)->execute([$status, $id]);
    }
}