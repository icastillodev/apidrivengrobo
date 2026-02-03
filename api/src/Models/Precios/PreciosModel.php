<?php
namespace App\Models\Precios;

class PreciosModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getInstData($instId) {
        // AGREGADO: tituloprecios
        $sql = "SELECT PrecioJornadaTrabajoExp, tituloprecios FROM institucion WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['PrecioJornadaTrabajoExp' => 0, 'tituloprecios' => ''];
    }

    public function getEspecies($instId) {
        $sql = "SELECT idespA, EspeNombreA, Panimal, PalojamientoChica, PalojamientoGrande 
                FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getSubespecies($instId) {
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
        $sql = "SELECT IdInsumoexp, NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo 
                FROM insumoexperimental WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // AGREGADO: $tituloprecios en los parámetros
        public function updateTariff($items, $jornada, $tituloprecios, $instId) {
            $this->db->beginTransaction();
            try {
                // 1. Actualizar Datos Institucionales
                $this->db->prepare("UPDATE institucion SET PrecioJornadaTrabajoExp = ?, tituloprecios = ? WHERE IdInstitucion = ?")
                        ->execute([$jornada, $tituloprecios, $instId]);

                // 2. Procesar Items
                foreach ($items as $index => $item) {
                    
                    // SANEAMIENTO: Convertimos a float, si viene vacío queda en 0.
                    $precio     = isset($item['precio']) ? (float)$item['precio'] : 0;
                    $pan        = isset($item['pan'])    ? (float)$item['pan']    : 0;
                    $pch        = isset($item['pch'])    ? (float)$item['pch']    : 0;
                    $pgr        = isset($item['pgr'])    ? (float)$item['pgr']    : 0;
                    $id         = $item['id'] ?? null;

                    if (!$id) continue; // Si no hay ID, saltamos para no romper

                    switch ($item['type']) {
                        case 'especie':
                            // SQL para Especie
                            $sql = "UPDATE especiee SET Panimal = ?, PalojamientoChica = ?, PalojamientoGrande = ? WHERE idespA = ?";
                            $this->db->prepare($sql)->execute([$pan, $pch, $pgr, $id]);
                            break;
                            
                        case 'subespecie':
                            // SQL para Subespecie
                            $sql = "UPDATE subespecie SET Psubanimal = ?, PsubalojamientoChica = ?, PsubalojamientoGrande = ? WHERE idsubespA = ?";
                            $this->db->prepare($sql)->execute([$pan, $pch, $pgr, $id]);
                            break;
                            
                        case 'insumo':
                            // SQL para Insumo Común
                            $sql = "UPDATE insumo SET PrecioInsumo = ? WHERE idInsumo = ?";
                            $this->db->prepare($sql)->execute([$precio, $id]);
                            break;
                            
                        case 'insumo-exp':
                            // SQL para Insumo Experimental
                            $sql = "UPDATE insumoexperimental SET PrecioInsumo = ? WHERE IdInsumoexp = ?";
                            $this->db->prepare($sql)->execute([$precio, $id]);
                            break;
                    }
                }
                
                $this->db->commit();
                return true;

            } catch (\Exception $e) {
                $this->db->rollBack();
                // Esto agregará al log de error qué item falló exactamente
                throw new \Exception("Error en BD: " . $e->getMessage());
            }
        }
}