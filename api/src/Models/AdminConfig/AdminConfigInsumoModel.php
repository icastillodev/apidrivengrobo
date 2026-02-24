<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria;

class AdminConfigInsumoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($instId) {
        $sql = "SELECT i.*, t.nombreTipo as NombreCategoria 
                FROM insumo i 
                LEFT JOIN tipoformularios t ON i.CategoriaInsumo = t.IdTipoFormulario
                WHERE i.IdInstitucion = ? 
                ORDER BY i.NombreInsumo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

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
        $categoria = !empty($data['CategoriaInsumo']) ? $data['CategoriaInsumo'] : 0;
        $existencia = $data['Existencia'] ?? 1;
        $instId = $data['instId'];

        if (empty($id)) {
            $sql = "INSERT INTO insumo (NombreInsumo, CantidadInsumo, TipoInsumo, CategoriaInsumo, IdInstitucion, Existencia, PrecioInsumo, OrdenInsumos) 
                    VALUES (?, ?, ?, ?, ?, ?, 0, 1)";
            $res = $this->db->prepare($sql)->execute([$nombre, $cantidad, $tipo, $categoria, $instId, $existencia]);
            Auditoria::log($this->db, 'INSERT', 'insumo', "Agregó insumo común: $nombre");
            return $res;
        } else {
            $sql = "UPDATE insumo SET NombreInsumo=?, CantidadInsumo=?, TipoInsumo=?, CategoriaInsumo=?, Existencia=? 
                    WHERE idInsumo=?";
            $res = $this->db->prepare($sql)->execute([$nombre, $cantidad, $tipo, $categoria, $existencia, $id]);
            Auditoria::log($this->db, 'UPDATE', 'insumo', "Modificó insumo común ID: $id");
            return $res;
        }
    }

    public function delete($id) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM forminsumo WHERE IdInsumo = ?"); 
        $stmt->execute([$id]);
        $used = $stmt->fetchColumn() > 0;

        if ($used) {
            $sql = "UPDATE insumo SET Existencia = 2 WHERE idInsumo = ?";
            $this->db->prepare($sql)->execute([$id]);
            Auditoria::log($this->db, 'SOFT_DELETE', 'insumo', "Desactivó Insumo Común ID: $id (En Uso)");
            return 'deactivated';
        } else {
            $sql = "DELETE FROM insumo WHERE idInsumo = ?";
            $this->db->prepare($sql)->execute([$id]);
            Auditoria::log($this->db, 'DELETE', 'insumo', "Eliminó Insumo Común ID: $id");
            return 'deleted';
        }
    }

    public function toggleStatus($data) {
        $id = $data['idInsumo'];
        $status = $data['status'];
        $sql = "UPDATE insumo SET Existencia = ? WHERE idInsumo = ?";
        $res = $this->db->prepare($sql)->execute([$status, $id]);
        Auditoria::log($this->db, 'UPDATE', 'insumo', "Cambió stock (estado=$status) del insumo ID: $id");
        return $res;
    }
}