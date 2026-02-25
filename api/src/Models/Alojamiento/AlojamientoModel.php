<?php
namespace App\Models\Alojamiento;
use PDO;
use App\Utils\Auditoria;

class AlojamientoModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    public function getAllGrouped($instId) {
        $sql = "SELECT a.*, p.nprotA, p.tituloA, e.EspeNombreA, e.idespA,
                       t.NombreTipoAlojamiento,
                       COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), 'Sin Asignar') as Investigador
                FROM alojamiento a
                INNER JOIN (
                    SELECT historia, MAX(IdAlojamiento) as max_id 
                    FROM alojamiento 
                    GROUP BY historia
                ) last_a ON a.IdAlojamiento = last_a.max_id
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                INNER JOIN especiee e ON a.TipoAnimal = e.idespA
                LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento
                LEFT JOIN personae pers ON a.IdUsrA = pers.IdUsrA
                WHERE a.IdInstitucion = ?
                ORDER BY a.historia DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

public function getHistory($historiaId) {
        $sql = "SELECT a.*, p.nprotA, p.tituloA, p.IdUsrA as IdTitularProtocolo, 
                       e.EspeNombreA, t.NombreTipoAlojamiento,
                       COALESCE(CONCAT(u_resp.NombreA, ' ', u_resp.ApellidoA), CONCAT(u_tit.NombreA, ' ', u_tit.ApellidoA), 'Sin Investigador') as Investigador,
                       COALESCE(u_resp.EmailA, u_tit.EmailA, 'No registrado') as EmailInvestigador,
                       COALESCE(u_resp.CelularA, u_tit.CelularA, 'No registrado') as CelularInvestigador
                FROM alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                INNER JOIN especiee e ON a.TipoAnimal = e.idespA 
                LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento
                LEFT JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA 
                LEFT JOIN personae u_resp ON a.IdUsrA = u_resp.IdUsrA 
                WHERE a.historia = ?
                ORDER BY a.fechavisado ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$historiaId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
public function getTiposAlojamientoHabilitados($idEsp, $instId) {
        // Trae los tipos de alojamiento de una especie que estén habilitados
        $sql = "SELECT t.IdTipoAlojamiento, t.NombreTipoAlojamiento, t.PrecioXunidad
                FROM tipoalojamiento t
                INNER JOIN especiee e ON t.idespA = e.idespA
                WHERE t.idespA = ? AND t.Habilitado = 1 AND e.IdInstitucion = ?";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idEsp, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
public function saveAlojamiento($data) {
        $this->db->beginTransaction();
        try {
            $isUpdate = isset($data['is_update']) && ($data['is_update'] === true || $data['is_update'] === "true");
            
            // Evitamos el warning verificando si la key existe
            $historia = !empty($data['historia']) ? (int)$data['historia'] : null;

            // MÁGIA: Si es un registro nuevo, calculamos la nueva Historia (incremental)
            if (!$isUpdate || !$historia) {
                $stmtMax = $this->db->query("SELECT MAX(historia) FROM alojamiento");
                // Si la tabla está vacía, devuelve 0 y le suma 1 (inicia en 1)
                $historia = (int)$stmtMax->fetchColumn() + 1;
            } else {
                // Si es un nuevo tramo (Actualización), cerramos el periodo anterior
                $this->closePreviousRecord($historia, $data['fechavisado']);
            }

            $idTipoAlojamiento = (!empty($data['IdTipoAlojamiento']) && $data['IdTipoAlojamiento'] > 0) ? (int)$data['IdTipoAlojamiento'] : 1;

            $stmtPrecio = $this->db->prepare("SELECT PrecioXunidad FROM tipoalojamiento WHERE IdTipoAlojamiento = ?");
            $stmtPrecio->execute([$idTipoAlojamiento]);
            $precioMomento = $stmtPrecio->fetchColumn() ?: 0;

            $sql = "INSERT INTO alojamiento (
                fechavisado, IdUsrA, observaciones, TipoAnimal, idprotA, historia, IdInstitucion,
                IdTipoAlojamiento, CantidadCaja, PrecioCajaMomento, finalizado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $data['fechavisado'], 
                (int)$data['IdUsrA'], 
                $data['observaciones'] ?? '', 
                (int)$data['TipoAnimal'], 
                (int)$data['idprotA'], 
                $historia, // ¡CORREGIDO AQUÍ! (Antes decía $data['historia'] y explotaba)
                (int)$data['IdInstitucion'], 
                $idTipoAlojamiento, 
                (int)$data['CantidadCaja'], 
                (float)$precioMomento
            ]);
            $idNewTramo = $this->db->lastInsertId();

            // Clonar cajas si es actualización de tramo (TramosUI)
            if ($isUpdate && isset($data['continuidad']) && !empty($data['continuidad']['cajas'])) {
                $cajasViejasIds = $data['continuidad']['cajas']; 
                $unidadesViejasIds = $data['continuidad']['unidades'] ?? []; 

                foreach ($cajasViejasIds as $oldIdCaja) {
                    $stmtGetCaja = $this->db->prepare("SELECT * FROM alojamiento_caja WHERE IdCajaAlojamiento = ?");
                    $stmtGetCaja->execute([$oldIdCaja]);
                    $oldCaja = $stmtGetCaja->fetch(\PDO::FETCH_ASSOC);

                    if ($oldCaja) {
                        $stmtInsertCaja = $this->db->prepare("INSERT INTO alojamiento_caja (FechaInicio, Detalle, NombreCaja, IdAlojamiento) VALUES (?, ?, ?, ?)");
                        $stmtInsertCaja->execute([$data['fechavisado'], $oldCaja['Detalle'], $oldCaja['NombreCaja'], $idNewTramo]);
                        $newIdCaja = $this->db->lastInsertId();

                        $stmtGetUnits = $this->db->prepare("SELECT * FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
                        $stmtGetUnits->execute([$oldIdCaja]);
                        $unidadesCaja = $stmtGetUnits->fetchAll(\PDO::FETCH_ASSOC);

                        foreach ($unidadesCaja as $oldUnit) {
                            if (in_array($oldUnit['IdEspecieAlojUnidad'], $unidadesViejasIds)) {
                                $stmtInsertUnit = $this->db->prepare("INSERT INTO especie_alojamiento_unidad (IdUnidadAlojamiento, NombreEspecieAloj, DetalleEspecieAloj, IdCajaAlojamiento) VALUES (?, ?, ?, ?)");
                                $stmtInsertUnit->execute([$oldUnit['IdUnidadAlojamiento'], $oldUnit['NombreEspecieAloj'], $oldUnit['DetalleEspecieAloj'], $newIdCaja]);
                            }
                        }
                    }
                }
            }

            // Etiquetamos en bitácora si fue Nuevo Alojamiento o Tramo
            $tipoReg = $isUpdate ? 'ACTUALIZACION_TRAMO' : 'NUEVO_ALOJAMIENTO';
            $this->db->prepare("INSERT INTO registroalojamiento (IdUsrA, IdAlojamiento, TipoRegistro, FechaRegistro) VALUES (?, ?, ?, NOW())")->execute([(int)$data['IdUsrA'], $idNewTramo, $tipoReg]);
            
            // ¡CORREGIDO AQUÍ TAMBIÉN! (Auditoría limpia y segura)
            Auditoria::log($this->db, $isUpdate ? 'UPDATE' : 'INSERT', 'alojamiento', "Historia: $historia (Aloj. ID: $idNewTramo)");
            $this->db->commit();
            return $idNewTramo;
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw new \Exception("Error SQL en Model: " . $e->getMessage());
        }
    }

    private function closePreviousRecord($historia, $newDate) {
        $sql = "SELECT * FROM alojamiento WHERE historia = ? ORDER BY IdAlojamiento DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$historia]);
        $prev = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($prev) {
            $diff = strtotime($newDate) - strtotime($prev['fechavisado']);
            $diasDefinidos = max(0, floor($diff / 86400));
            
            $esChica = (float)$prev['totalcajachica'] > 0;
            $precio = $esChica ? (float)$prev['preciocajachica'] : (float)$prev['preciocajagrande'];
            $cantidad = $esChica ? (int)$prev['totalcajachica'] : (int)$prev['totalcajagrande'];
            $totalPago = $diasDefinidos * $precio * $cantidad;

            $update = "UPDATE alojamiento SET hastafecha = ?, totaldiasdefinidos = ?, totalpago = ? WHERE IdAlojamiento = ?";
            $this->db->prepare($update)->execute([$newDate, $diasDefinidos, $totalPago, $prev['IdAlojamiento']]);
        }
    }

    public function deleteRow($idAlojamiento, $historiaId) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("DELETE FROM alojamiento WHERE IdAlojamiento = ?")->execute([$idAlojamiento]);
            $this->recalculateHistory($historiaId);
            
            Auditoria::log($this->db, 'DELETE', 'alojamiento', "Eliminó tramo ID: $idAlojamiento (Historia: $historiaId)");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function updateRow($data) {
        $this->db->beginTransaction();
        try {
            $sql = "UPDATE alojamiento SET fechavisado = ?, CantidadCaja = ?, observaciones = ? WHERE IdAlojamiento = ?";
            $this->db->prepare($sql)->execute([$data['fechavisado'], (int)$data['CantidadCaja'], $data['observaciones'], (int)$data['IdAlojamiento']]);
            
            $this->recalculateHistory($data['historia']);
            Auditoria::log($this->db, 'UPDATE', 'alojamiento', "Editó tramo ID: " . $data['IdAlojamiento']);
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function recalculateHistory($historiaId) {
        $sql = "SELECT * FROM alojamiento WHERE historia = ? ORDER BY fechavisado ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$historiaId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($rows as $i => $row) {
            $next = $rows[$i + 1] ?? null;
            $hasta = $next ? $next['fechavisado'] : (($row['finalizado'] == 1) ? $row['hastafecha'] : null);
            
            $fechaFinCalculo = $hasta ?: date('Y-m-d');
            $diff = strtotime($fechaFinCalculo) - strtotime($row['fechavisado']);
            $dias = max(0, floor($diff / 86400));
            
            $precio = (float)$row['PrecioCajaMomento'];
            $cajas = (int)$row['CantidadCaja'];
            $totalPago = $dias * $cajas * $precio;

            $updateSql = "UPDATE alojamiento SET hastafecha = ?, totaldiasdefinidos = ?, totalpago = ? WHERE IdAlojamiento = ?";
            $this->db->prepare($updateSql)->execute([$hasta, $dias, $totalPago, $row['IdAlojamiento']]);
        }
    }

    public function finalizarHistoria($historiaId, $fechaCierre) {
        $this->db->beginTransaction();
        try {
            $hoy = date('Y-m-d');
            $stmtMin = $this->db->prepare("SELECT MIN(fechavisado) as inicio FROM alojamiento WHERE historia = ?");
            $stmtMin->execute([$historiaId]);
            $inicio = $stmtMin->fetchColumn();

            if ($fechaCierre > $hoy || $fechaCierre < $inicio) {
                throw new \Exception("La fecha de cierre está fuera del rango permitido.");
            }

            $sql = "UPDATE alojamiento SET finalizado = 1, hastafecha = ? WHERE historia = ? ORDER BY IdAlojamiento DESC LIMIT 1";
            $this->db->prepare($sql)->execute([$fechaCierre, $historiaId]);
            $this->recalculateHistory($historiaId);
            
            Auditoria::log($this->db, 'UPDATE', 'alojamiento', "Finalizó Historia ID: $historiaId ($fechaCierre)");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function desfinalizarHistoria($historiaId) {
        $this->db->beginTransaction();
        try {
            $sql = "UPDATE alojamiento SET finalizado = 0, hastafecha = NULL, totaldiasdefinidos = 0, totalpago = 0 
                    WHERE IdAlojamiento = (SELECT id FROM (SELECT MAX(IdAlojamiento) as id FROM alojamiento WHERE historia = ?) as t)";
            $this->db->prepare($sql)->execute([$historiaId]);
            $this->db->prepare("UPDATE alojamiento SET finalizado = 0 WHERE historia = ?")->execute([$historiaId]);
            
            Auditoria::log($this->db, 'UPDATE', 'alojamiento', "Desfinalizó Historia ID: $historiaId");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

public function updateHistoryConfig($data) {
        $this->db->beginTransaction();
        try {
            $historia = $data['historia'];
            $idTipoAlojamiento = $data['IdTipoAlojamiento'];

            // 1. Buscamos el nuevo precio asociado al nuevo tipo de caja
            $stmtPrecio = $this->db->prepare("SELECT PrecioXunidad FROM tipoalojamiento WHERE IdTipoAlojamiento = ?");
            $stmtPrecio->execute([$idTipoAlojamiento]);
            $nuevoPrecio = $stmtPrecio->fetchColumn() ?: 0;

            // 2. Actualizamos TODA la historia con el nuevo esquema
            $sql = "UPDATE alojamiento SET 
                        idprotA = :idprotA, 
                        IdUsrA = :idUsrA,
                        TipoAnimal = :idEsp, 
                        IdTipoAlojamiento = :idTipo, 
                        PrecioCajaMomento = :precio
                    WHERE historia = :historia";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':idprotA' => $data['idprotA'], 
                ':idUsrA'  => $data['IdUsrA'],
                ':idEsp'   => $data['idespA'], 
                ':idTipo'  => $idTipoAlojamiento, 
                ':precio'  => $nuevoPrecio, 
                ':historia'=> $historia
            ]);

            // 3. Recalculamos toda la parte contable para aplicar el nuevo precio a cada tramo
            $this->recalculateHistory($historia);
            
            Auditoria::log($this->db, 'UPDATE', 'alojamiento', "Reconfiguró variables base de Historia ID: $historia");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { 
            $this->db->rollBack(); 
            throw $e; 
        }
    }

    public function updatePrice($idAlojamiento, $nuevoPrecio) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE alojamiento SET PrecioCajaMomento = ? WHERE IdAlojamiento = ?")->execute([$nuevoPrecio, $idAlojamiento]);
            
            $stmt = $this->db->prepare("SELECT historia FROM alojamiento WHERE IdAlojamiento = ?");
            $stmt->execute([$idAlojamiento]);
            $historia = $stmt->fetchColumn();

            $this->recalculateHistory($historia);
            Auditoria::log($this->db, 'UPDATE', 'alojamiento', "Ajustó precio a $nuevoPrecio en tramo ID: $idAlojamiento");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }
}