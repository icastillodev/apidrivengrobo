<?php
namespace App\Models\AdminConfig;

use PDO;
use Exception;

class AdminConfigAlojamientoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // --- READ ---
    public function getTypes($espId) {
        $stmt = $this->db->prepare("SELECT * FROM tipoalojamiento WHERE idespA = ? ORDER BY NombreTipoAlojamiento ASC");
        $stmt->execute([$espId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getCategories($espId) {
        $stmt = $this->db->prepare("SELECT * FROM categoriadatosunidadalojamiento WHERE IdEspA = ? ORDER BY NombreCatAlojUnidad ASC");
        $stmt->execute([$espId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // --- TIPOS ---
    public function saveType($data) {
        if(empty($data['IdTipoAlojamiento'])) {
            $sql = "INSERT INTO tipoalojamiento (NombreTipoAlojamiento, DetalleTipoAlojamiento, idespA, Habilitado) VALUES (?, ?, ?, 1)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreTipoAlojamiento'], $data['DetalleTipoAlojamiento'], $data['idespA']]);
        } else {
            $hab = $data['Habilitado'] ?? 1;
            $sql = "UPDATE tipoalojamiento SET NombreTipoAlojamiento = ?, DetalleTipoAlojamiento = ?, Habilitado = ? WHERE IdTipoAlojamiento = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreTipoAlojamiento'], $data['DetalleTipoAlojamiento'], $hab, $data['IdTipoAlojamiento']]);
        }
    }

    public function toggleType($id, $status) {
        $stmt = $this->db->prepare("UPDATE tipoalojamiento SET Habilitado = ? WHERE IdTipoAlojamiento = ?");
        $stmt->execute([$status, $id]);
    }

    public function deleteType($id) {
        $stmtCheck = $this->db->prepare("SELECT COUNT(*) FROM alojamiento WHERE IdTipoAlojamiento = ?");
        $stmtCheck->execute([$id]);
        if($stmtCheck->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar: Este tipo se usa en alojamientos existentes.");
        }
        $stmt = $this->db->prepare("DELETE FROM tipoalojamiento WHERE IdTipoAlojamiento = ?");
        $stmt->execute([$id]);
    }

    // --- CATEGORIAS ---
    public function saveCategory($data) {
        $dep = !empty($data['dependencia_id']) ? $data['dependencia_id'] : null;

        if(empty($data['IdDatosUnidadAloj'])) {
            // Insertar activo por defecto
            $sql = "INSERT INTO categoriadatosunidadalojamiento (NombreCatAlojUnidad, DetalleCatAloj, IdEspA, TipoDeDato, dependencia_id, Habilitado) VALUES (?, ?, ?, ?, ?, 1)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreCatAlojUnidad'], $data['DetalleCatAloj'], $data['IdEspA'], $data['TipoDeDato'], $dep]);
        } else {
            $hab = $data['Habilitado'] ?? 1;
            $sql = "UPDATE categoriadatosunidadalojamiento SET NombreCatAlojUnidad = ?, DetalleCatAloj = ?, TipoDeDato = ?, dependencia_id = ?, Habilitado = ? WHERE IdDatosUnidadAloj = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$data['NombreCatAlojUnidad'], $data['DetalleCatAloj'], $data['TipoDeDato'], $dep, $hab, $data['IdDatosUnidadAloj']]);
        }
    }

    public function toggleCategory($id, $status) {
        $stmt = $this->db->prepare("UPDATE categoriadatosunidadalojamiento SET Habilitado = ? WHERE IdDatosUnidadAloj = ?");
        $stmt->execute([$status, $id]);
    }

    public function deleteCategory($id) {
        $stmtCheck = $this->db->prepare("SELECT COUNT(*) FROM observacion_alojamiento_unidad WHERE IdDatosUnidadAloj = ?");
        $stmtCheck->execute([$id]);
        if($stmtCheck->fetchColumn() > 0) {
            throw new Exception("No se puede eliminar: Esta variable tiene datos registrados en animales.");
        }
        $stmt = $this->db->prepare("DELETE FROM categoriadatosunidadalojamiento WHERE IdDatosUnidadAloj = ?");
        $stmt->execute([$id]);
    }
}