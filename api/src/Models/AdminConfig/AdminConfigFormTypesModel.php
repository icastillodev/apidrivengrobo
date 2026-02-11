<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigFormTypesModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll($instId) {
        $sql = "SELECT * FROM tipoformularios WHERE IdInstitucion = ? ORDER BY categoriaformulario ASC, nombreTipo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function save($data) {
        $id = $data['IdTipoFormulario'] ?? '';
        
        $nombre = $data['nombreTipo'];
        $categoria = $data['categoriaformulario'];
        $descuento = $data['descuento'] ?? 0;
        $exento = isset($data['exento']) ? 1 : 0; 
        $instId = $data['instId'];

        if (empty($id)) {
            $sql = "INSERT INTO tipoformularios (nombreTipo, categoriaformulario, exento, descuento, IdInstitucion) 
                    VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $categoria, $exento, $descuento, $instId]);
        } else {
            $sql = "UPDATE tipoformularios SET nombreTipo=?, categoriaformulario=?, exento=?, descuento=? 
                    WHERE IdTipoFormulario=?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$nombre, $categoria, $exento, $descuento, $id]);
        }
    }

    public function delete($id) {
        // 1. VALIDACIÓN DE INTEGRIDAD
        // Verificamos si existe al menos un formulario usando este tipo (tipoA)
        $check = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE tipoA = ?");
        $check->execute([$id]);
        
        if ($check->fetchColumn() > 0) {
            // Retornamos 'in_use' para que el controlador sepa qué pasó
            return 'in_use';
        }

        // 2. Si no está en uso, procedemos a borrar
        $stmt = $this->db->prepare("DELETE FROM tipoformularios WHERE IdTipoFormulario = ?");
        return $stmt->execute([$id]);
    }
}