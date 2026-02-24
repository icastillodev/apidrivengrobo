<?php
namespace App\Models\Alojamiento;
use PDO;
use App\Utils\Auditoria;

class TrazabilidadModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getArbolBiologico($idAlojamiento, $idEspecie, $idInstitucion) {
        $stmtCajas = $this->db->prepare("
            SELECT ac.* FROM alojamiento_caja ac
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            WHERE ac.IdAlojamiento = ? AND a.IdInstitucion = ?
        ");
        $stmtCajas->execute([$idAlojamiento, $idInstitucion]);
        $cajas = $stmtCajas->fetchAll(\PDO::FETCH_ASSOC) ?: []; 

        $stmtCat = $this->db->prepare("SELECT * FROM categoriadatosunidadalojamiento WHERE IdEspA = ?");
        $stmtCat->execute([$idEspecie]);
        $categorias = $stmtCat->fetchAll(\PDO::FETCH_ASSOC) ?: []; 

        $stmtTipo = $this->db->prepare("
            SELECT t.NombreTipoAlojamiento, a.CantidadCaja 
            FROM alojamiento a 
            LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento 
            WHERE a.IdAlojamiento = ?
        ");
        $stmtTipo->execute([$idAlojamiento]);
        $infoAloj = $stmtTipo->fetch(\PDO::FETCH_ASSOC);
        
        $tipoAlojamiento = $infoAloj['NombreTipoAlojamiento'] ?? 'Caja';
        $limiteCajas = (int)($infoAloj['CantidadCaja'] ?? 1);

        foreach ($cajas as &$caja) {
            $stmtUnidades = $this->db->prepare("SELECT * FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
            $stmtUnidades->execute([$caja['IdCajaAlojamiento']]);
            $caja['unidades'] = $stmtUnidades->fetchAll(\PDO::FETCH_ASSOC) ?: []; 

            foreach ($caja['unidades'] as &$unidad) {
                $stmtObs = $this->db->prepare("
                    SELECT o.fechaObs, o.id_fila_obs, c.NombreCatAlojUnidad as CategoriaNombre,
                           COALESCE(o.DatoObsVar, o.DatoObsText, CAST(o.DatoObsInt AS CHAR), CAST(o.DatoObsFecha AS CHAR)) as Valor
                    FROM observacion_alojamiento_unidad o
                    INNER JOIN categoriadatosunidadalojamiento c ON o.IdDatosUnidadAloj = c.IdDatosUnidadAloj
                    WHERE o.IdEspecieAlojUnidad = ?
                    ORDER BY o.fechaObs DESC, o.id_fila_obs DESC
                ");
                $stmtObs->execute([$unidad['IdEspecieAlojUnidad']]);
                $obsFlat = $stmtObs->fetchAll(\PDO::FETCH_ASSOC) ?: []; 

                $obsGrouped = [];
                foreach ($obsFlat as $o) {
                    $key = $o['id_fila_obs'] ?: $o['fechaObs'] . '_' . uniqid();
                    if (!isset($obsGrouped[$key])) {
                        $obsGrouped[$key] = ['fechaObs' => $o['fechaObs'], 'valores' => []];
                    }
                    $obsGrouped[$key]['valores'][$o['CategoriaNombre']] = $o['Valor'];
                }
                $unidad['observaciones_pivot'] = array_values($obsGrouped);
            }
        }
        return ['cajas' => $cajas, 'categorias' => $categorias, 'tipoAlojamiento' => $tipoAlojamiento, 'limiteCajas' => $limiteCajas];
    }

    public function crearCajaYUnidades($idAlojamiento, $nombreCaja, $cantidadUnidades, $idInstitucion) {
        $stmtCheck = $this->db->prepare("SELECT IdAlojamiento, fechavisado, historia FROM alojamiento WHERE IdAlojamiento = ? AND IdInstitucion = ?");
        $stmtCheck->execute([$idAlojamiento, $idInstitucion]);
        $aloj = $stmtCheck->fetch(\PDO::FETCH_ASSOC);

        if (!$aloj) throw new \Exception("El alojamiento no existe o no pertenece a su institución.");

        $this->db->beginTransaction();
        try {
            $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM alojamiento_caja WHERE IdAlojamiento = ?");
            $stmtCount->execute([$idAlojamiento]);
            $numeroSiguiente = $stmtCount->fetchColumn() + 1;
            
            $prefijoCaja = "A" . $numeroSiguiente;
            $nombreFinalCaja = $prefijoCaja . " - " . ($nombreCaja ?: "Sin Etiqueta");

            $stmtCaja = $this->db->prepare("INSERT INTO alojamiento_caja (FechaInicio, NombreCaja, IdAlojamiento) VALUES (?, ?, ?)");
            $stmtCaja->execute([$aloj['fechavisado'], $nombreFinalCaja, $idAlojamiento]);
            $idNuevaCaja = $this->db->lastInsertId();

            $stmtMaxAnimal = $this->db->prepare("
                SELECT MAX(eu.IdUnidadAlojamiento) FROM especie_alojamiento_unidad eu
                INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.historia = ?
            ");
            $stmtMaxAnimal->execute([$aloj['historia']]);
            $ultimoIdAnimal = (int)$stmtMaxAnimal->fetchColumn();

            $stmtUnidad = $this->db->prepare("INSERT INTO especie_alojamiento_unidad (IdUnidadAlojamiento, NombreEspecieAloj, IdCajaAlojamiento) VALUES (?, ?, ?)");
            
            for ($i = 1; $i <= $cantidadUnidades; $i++) {
                $ultimoIdAnimal++; 
                $nombreAnimal = "{$prefijoCaja} - S{$ultimoIdAnimal} - Sujeto {$i}"; 
                $stmtUnidad->execute([$ultimoIdAnimal, $nombreAnimal, $idNuevaCaja]);
            }

            Auditoria::log($this->db, 'INSERT', 'alojamiento_caja', "Creó Caja Físca: $nombreFinalCaja");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw new \Exception("Error BD: " . $e->getMessage()); }
    }

    public function renameSujeto($idUnidad, $nuevoNombre) {
        $stmt = $this->db->prepare("UPDATE especie_alojamiento_unidad SET NombreEspecieAloj = ? WHERE IdEspecieAlojUnidad = ?");
        $res = $stmt->execute([$nuevoNombre, $idUnidad]);
        Auditoria::log($this->db, 'UPDATE', 'especie_alojamiento_unidad', "Renombró sujeto ID: $idUnidad");
        return $res;
    }

    public function renameCaja($id, $nombre) {
        $res = $this->db->prepare("UPDATE alojamiento_caja SET NombreCaja = ? WHERE IdCajaAlojamiento = ?")->execute([$nombre, $id]);
        Auditoria::log($this->db, 'UPDATE', 'alojamiento_caja', "Renombró caja ID: $id");
        return $res;
    }

    public function deleteCaja($idCaja) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("DELETE o FROM observacion_alojamiento_unidad o INNER JOIN especie_alojamiento_unidad e ON o.IdEspecieAlojUnidad = e.IdEspecieAlojUnidad WHERE e.IdCajaAlojamiento = ?")->execute([$idCaja]);
            $this->db->prepare("DELETE FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?")->execute([$idCaja]);
            $this->db->prepare("DELETE FROM alojamiento_caja WHERE IdCajaAlojamiento = ?")->execute([$idCaja]);
            
            Auditoria::log($this->db, 'DELETE', 'alojamiento_caja', "Eliminó caja ID: $idCaja");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function deleteSujeto($idUnidad) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("DELETE FROM observacion_alojamiento_unidad WHERE IdEspecieAlojUnidad = ?")->execute([$idUnidad]);
            $this->db->prepare("DELETE FROM especie_alojamiento_unidad WHERE IdEspecieAlojUnidad = ?")->execute([$idUnidad]);
            
            Auditoria::log($this->db, 'DELETE', 'especie_alojamiento_unidad', "Eliminó sujeto ID: $idUnidad");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function insertarObservaciones($idUnidad, $fechaObs, $valores, $idInstitucion) {
        $this->db->beginTransaction();
        try {
            $stmtMax = $this->db->query("SELECT MAX(id_fila_obs) FROM observacion_alojamiento_unidad");
            $newFilaId = (int)$stmtMax->fetchColumn() + 1;

            foreach ($valores as $item) {
                $idCat = $item['IdDatosUnidadAloj'];
                $valorRaw = $item['valor'];

                $stmt = $this->db->prepare("SELECT TipoDeDato FROM categoriadatosunidadalojamiento WHERE IdDatosUnidadAloj = ?");
                $stmt->execute([$idCat]);
                $tipo = $stmt->fetchColumn();

                $columna = 'DatoObsText';
                if ($tipo == 'int') $columna = 'DatoObsInt';
                if ($tipo == 'date') $columna = 'DatoObsFecha';
                if ($tipo == 'var') $columna = 'DatoObsVar';

                $sql = "INSERT INTO observacion_alojamiento_unidad (fechaObs, IdEspecieAlojUnidad, IdDatosUnidadAloj, {$columna}, id_fila_obs) 
                        VALUES (?, ?, ?, ?, ?)";
                $this->db->prepare($sql)->execute([$fechaObs, $idUnidad, $idCat, $valorRaw, $newFilaId]);
            }
            
            Auditoria::log($this->db, 'INSERT', 'observacion_alojamiento_unidad', "Cargó métricas al sujeto ID: $idUnidad");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function addSujeto($idCaja, $idAlojamiento, $nombreSujetoInput) {
        $stmtHist = $this->db->prepare("SELECT historia FROM alojamiento WHERE IdAlojamiento = ?");
        $stmtHist->execute([$idAlojamiento]);
        $historia = $stmtHist->fetchColumn();

        $stmtMaxAnimal = $this->db->prepare("
            SELECT MAX(eu.IdUnidadAlojamiento) FROM especie_alojamiento_unidad eu
            INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.historia = ?
        ");
        $stmtMaxAnimal->execute([$historia]);
        $ultimoIdAnimal = (int)$stmtMaxAnimal->fetchColumn() + 1;

        $stmtCaja = $this->db->prepare("SELECT NombreCaja FROM alojamiento_caja WHERE IdCajaAlojamiento = ?");
        $stmtCaja->execute([$idCaja]);
        $prefijoCaja = explode(' - ', $stmtCaja->fetchColumn())[0] ?? 'A0'; 

        $nombreFinal = "{$prefijoCaja} - S{$ultimoIdAnimal} - {$nombreSujetoInput}";

        $res = $this->db->prepare("INSERT INTO especie_alojamiento_unidad (IdUnidadAlojamiento, NombreEspecieAloj, IdCajaAlojamiento) VALUES (?, ?, ?)")
                        ->execute([$ultimoIdAnimal, $nombreFinal, $idCaja]);
        
        Auditoria::log($this->db, 'INSERT', 'especie_alojamiento_unidad', "Agregó Sujeto $nombreFinal a la caja ID: $idCaja");
        return $res;
    }

    public function getCajasTramoAnterior($idAlojamientoActual) {
        $stmtHist = $this->db->prepare("SELECT historia FROM alojamiento WHERE IdAlojamiento = ?");
        $stmtHist->execute([$idAlojamientoActual]);
        $historia = $stmtHist->fetchColumn();

        $stmtCajasHist = $this->db->prepare("
            SELECT ac.IdCajaAlojamiento, ac.NombreCaja, ac.Detalle 
            FROM alojamiento_caja ac
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            WHERE a.historia = ? AND a.IdAlojamiento < ?
            ORDER BY ac.IdCajaAlojamiento DESC
        ");
        $stmtCajasHist->execute([$historia, $idAlojamientoActual]);
        $allCajas = $stmtCajasHist->fetchAll(\PDO::FETCH_ASSOC);

        $stmtCajasAct = $this->db->prepare("SELECT NombreCaja FROM alojamiento_caja WHERE IdAlojamiento = ?");
        $stmtCajasAct->execute([$idAlojamientoActual]);
        $cajasActuales = $stmtCajasAct->fetchAll(\PDO::FETCH_COLUMN);

        $cajasUnicas = [];
        $nombresVistos = [];

        foreach($allCajas as $caja) {
            if (!in_array($caja['NombreCaja'], $nombresVistos)) {
                $nombresVistos[] = $caja['NombreCaja'];
                $caja['ya_existe'] = in_array($caja['NombreCaja'], $cajasActuales);
                
                $stmtU = $this->db->prepare("SELECT IdEspecieAlojUnidad, IdUnidadAlojamiento, NombreEspecieAloj FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
                $stmtU->execute([$caja['IdCajaAlojamiento']]);
                $unidades = $stmtU->fetchAll(\PDO::FETCH_ASSOC);

                $stmtUAct = $this->db->prepare("
                    SELECT 1 FROM especie_alojamiento_unidad eu 
                    INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                    WHERE ac.IdAlojamiento = ? AND eu.IdUnidadAlojamiento = ?
                ");
                
                foreach($unidades as &$u) {
                    $stmtUAct->execute([$idAlojamientoActual, $u['IdUnidadAlojamiento']]);
                    $u['ya_existe'] = (bool)$stmtUAct->fetchColumn();
                }

                $caja['unidades'] = $unidades;
                $cajasUnicas[] = $caja;
            }
        }
        return $cajasUnicas;
    }

    public function clonarCajasBajoDemanda($idAlojamientoActual, $cajasIds, $unidadesIds) {
        $this->db->beginTransaction();
        try {
            $stmtAloj = $this->db->prepare("SELECT fechavisado FROM alojamiento WHERE IdAlojamiento = ?");
            $stmtAloj->execute([$idAlojamientoActual]);
            $fecha = $stmtAloj->fetchColumn();

            foreach ($cajasIds as $oldIdCaja) {
                $stmtCaja = $this->db->prepare("SELECT * FROM alojamiento_caja WHERE IdCajaAlojamiento = ?");
                $stmtCaja->execute([$oldIdCaja]);
                $oldCaja = $stmtCaja->fetch(\PDO::FETCH_ASSOC);

                if ($oldCaja) {
                    $this->db->prepare("INSERT INTO alojamiento_caja (FechaInicio, Detalle, NombreCaja, IdAlojamiento) VALUES (?, ?, ?, ?)")
                             ->execute([$fecha, $oldCaja['Detalle'], $oldCaja['NombreCaja'], $idAlojamientoActual]);
                    $newIdCaja = $this->db->lastInsertId();

                    $stmtU = $this->db->prepare("SELECT * FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
                    $stmtU->execute([$oldIdCaja]);
                    $unidades = $stmtU->fetchAll(\PDO::FETCH_ASSOC);

                    foreach ($unidades as $u) {
                        if (in_array($u['IdEspecieAlojUnidad'], $unidadesIds)) {
                            $this->db->prepare("INSERT INTO especie_alojamiento_unidad (IdUnidadAlojamiento, NombreEspecieAloj, DetalleEspecieAloj, IdCajaAlojamiento) VALUES (?, ?, ?, ?)")
                                     ->execute([$u['IdUnidadAlojamiento'], $u['NombreEspecieAloj'], $u['DetalleEspecieAloj'], $newIdCaja]);
                        }
                    }
                }
            }
            Auditoria::log($this->db, 'CLONADO', 'alojamiento_caja', "Clonó cajas previas al tramo ID: $idAlojamientoActual");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }
}