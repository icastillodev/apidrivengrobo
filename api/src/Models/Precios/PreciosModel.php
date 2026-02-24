<?php
namespace App\Models\Precios;

class PreciosModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getInstData($instId) {
        $sql = "SELECT tituloprecios FROM institucion WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['tituloprecios' => ''];
    }

    public function getEspecies($instId) {
        $sql = "SELECT idespA, EspeNombreA, Panimal 
                FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getSubespecies($instId) {
        $sql = "SELECT s.idsubespA, s.idespA, s.SubEspeNombreA, s.Psubanimal, s.Existe 
                FROM subespecie s
                WHERE s.idespA IN (SELECT idespA FROM especiee WHERE IdInstitucion = ?)
                ORDER BY s.SubEspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getTipoAlojamiento($instId) {
        $sql = "SELECT t.IdTipoAlojamiento, t.NombreTipoAlojamiento, t.DetalleTipoAlojamiento, t.idespA, t.PrecioXunidad
                FROM tipoalojamiento t
                INNER JOIN especiee e ON t.idespA = e.idespA
                WHERE e.IdInstitucion = ? AND t.Habilitado = 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getServiciosInst($instId) {
        $sql = "SELECT IdServicioInst, NombreServicioInst, MedidaServicioInst, CantidadPorMedidaInst, Precio 
                FROM serviciosinst 
                WHERE IdInstitucion = ? AND Habilitado = 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // --- MÉTODOS DE INSUMOS RECUPERADOS ---
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
    // ----------------------------------------

public function updateTariff($items, $tituloprecios, $instId) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE institucion SET tituloprecios = ? WHERE IdInstitucion = ?")
                     ->execute([$tituloprecios, $instId]);

            foreach ($items as $item) {
                $precio = isset($item['precio']) ? (float)$item['precio'] : 0;
                $id = $item['id'] ?? null;

                if (!$id) continue;

                switch ($item['type']) {
                    case 'especie':
                        $this->db->prepare("UPDATE especiee SET Panimal = ? WHERE idespA = ?")->execute([$precio, $id]);
                        break;
                    case 'subespecie':
                        $this->db->prepare("UPDATE subespecie SET Psubanimal = ? WHERE idsubespA = ?")->execute([$precio, $id]);
                        break;
                    case 'alojamiento': 
                        $this->db->prepare("UPDATE tipoalojamiento SET PrecioXunidad = ? WHERE IdTipoAlojamiento = ?")->execute([$precio, $id]);
                        break;
                    case 'servicio': 
                        $this->db->prepare("UPDATE serviciosinst SET Precio = ? WHERE IdServicioInst = ?")->execute([$precio, $id]);
                        break;
                    case 'insumo':
                        $this->db->prepare("UPDATE insumo SET PrecioInsumo = ? WHERE idInsumo = ?")->execute([$precio, $id]);
                        break;
                    case 'insumo-exp':
                        $this->db->prepare("UPDATE insumoexperimental SET PrecioInsumo = ? WHERE IdInsumoexp = ?")->execute([$precio, $id]);
                        break;
                }
            }
            
            \App\Utils\Auditoria::log($this->db, 'UPDATE', 'precios_multiples', "Modificó el Tarifario Financiero ($tituloprecios)");
            
            $this->db->commit();
            return true;

        } catch (\Exception $e) {
            $this->db->rollBack();
            throw new \Exception("Error en BD actualizando tarifas: " . $e->getMessage());
        }
    }
}