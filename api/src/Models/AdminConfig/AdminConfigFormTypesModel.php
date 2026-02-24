<?php
namespace App\Models\AdminConfig;

use PDO;
use App\Utils\Auditoria;

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
            $res = $this->db->prepare($sql)->execute([$nombre, $categoria, $exento, $descuento, $instId]);
            
            Auditoria::log($this->db, 'INSERT', 'tipoformularios', "Creó Formulario: $nombre ($categoria)");
            return $res;
        } else {
            $sql = "UPDATE tipoformularios SET nombreTipo=?, categoriaformulario=?, exento=?, descuento=? 
                    WHERE IdTipoFormulario=?";
            $res = $this->db->prepare($sql)->execute([$nombre, $categoria, $exento, $descuento, $id]);
            
            Auditoria::log($this->db, 'UPDATE', 'tipoformularios', "Modificó Formulario ID: $id");
            return $res;
        }
    }

    public function delete($id) {
        $check = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE tipoA = ?");
        $check->execute([$id]);
        
        if ($check->fetchColumn() > 0) {
            return 'in_use';
        }

        $stmt = $this->db->prepare("DELETE FROM tipoformularios WHERE IdTipoFormulario = ?");
        $res = $stmt->execute([$id]);
        
        Auditoria::log($this->db, 'DELETE', 'tipoformularios', "Eliminó Formulario ID: $id");
        return $res;
    }
}