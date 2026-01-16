<?php
namespace App\Models\Precios;

class PreciosModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getInstData($instId) {
        $sql = "SELECT PrecioJornadaTrabajoExp FROM institucion WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['PrecioJornadaTrabajoExp' => 0];
    }

    public function getEspecies($instId) {
        $sql = "SELECT idespA, EspeNombreA, Panimal, PalojamientoChica, PalojamientoGrande 
                FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getSubespecies($instId) {
        // Obtenemos subespecies vinculadas a la institución
        $sql = "SELECT s.idsubespA, s.idespA, s.SubEspeNombreA, 
                       s.Psubanimal, s.PsubalojamientoChica, s.PsubalojamientoGrande, s.Existe 
                FROM subespecie s
                WHERE s.idespA IN (SELECT idespA FROM especiee WHERE IdInstitucion = ?)
                ORDER BY s.SubEspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getInsumos($instId) {
        $sql = "SELECT idInsumo, NombreInsumo, PrecioInsumo, TipoInsumo, CantidadInsumo 
                FROM insumo WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getInsumosExp($instId) {
        // Corregido: seleccionamos CantidadInsumo y TipoInsumo
        $sql = "SELECT IdInsumoexp, NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo 
                FROM insumoexperimental WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function updateTariff($items, $jornada, $instId) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE institucion SET PrecioJornadaTrabajoExp = ? WHERE IdInstitucion = ?")
                     ->execute([$jornada, $instId]);

            foreach ($items as $item) {
                switch ($item['type']) {
                    case 'especie':
                        $sql = "UPDATE especiee SET Panimal = ?, PalojamientoChica = ?, PalojamientoGrande = ? WHERE idespA = ?";
                        $this->db->prepare($sql)->execute([$item['pan'], $item['pch'], $item['pgr'], $item['id']]);
                        break;
                    case 'subespecie':
                        $sql = "UPDATE subespecie SET Psubanimal = ?, PsubalojamientoChica = ?, PsubalojamientoGrande = ? WHERE idsubespA = ?";
                        $this->db->prepare($sql)->execute([$item['pan'], $item['pch'], $item['pgr'], $item['id']]);
                        break;
                    case 'insumo':
                        $sql = "UPDATE insumo SET PrecioInsumo = ? WHERE idInsumo = ?";
                        $this->db->prepare($sql)->execute([$item['precio'], $item['id']]);
                        break;
                    case 'insumo-exp':
                        $sql = "UPDATE insumoexperimental SET PrecioInsumo = ? WHERE IdInsumoexp = ?";
                        $this->db->prepare($sql)->execute([$item['precio'], $item['id']]);
                        break;
                }
            }
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}