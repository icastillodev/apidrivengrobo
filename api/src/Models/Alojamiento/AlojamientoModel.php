<?php
namespace App\Models\Alojamiento;

class AlojamientoModel {
    private $db;

    public function __construct($db) { 
        $this->db = $db; 
    }

    /**
     * Obtiene la última actualización de cada alojamiento activo o finalizado.
     * Vincula con 'personae' para obtener el nombre del Investigador.
     */
public function getAllGrouped($instId) {
        // Hacemos JOIN con tipoalojamiento y extraemos el nombre correcto del investigador
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
                INNER JOIN especiee e ON p.especie = e.idespA
                LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento
                LEFT JOIN personae pers ON a.IdUsrA = pers.IdUsrA
                WHERE a.IdInstitucion = ?
                ORDER BY a.historia DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene todos los tramos de una historia.
     * Incluye datos de Protocolo, Especie e Investigador para el resumen frontal.
     */
public function getHistory($historiaId) {
        // Hacemos JOIN con tipoalojamiento y unimos u_resp y u_tit para el Investigador
        $sql = "SELECT a.*, 
                       p.nprotA, 
                       p.tituloA,
                       p.IdUsrA as IdTitularProtocolo, 
                       e.EspeNombreA, 
                       t.NombreTipoAlojamiento,
                       COALESCE(CONCAT(u_resp.NombreA, ' ', u_resp.ApellidoA), CONCAT(u_tit.NombreA, ' ', u_tit.ApellidoA), 'Sin Investigador') as Investigador
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
// api/src/Models/Alojamiento/AlojamientoModel.php

public function saveAlojamiento($data) {
        $this->db->beginTransaction();

        try {
            $isUpdate = isset($data['is_update']) && ($data['is_update'] === true || $data['is_update'] === "true");

            if ($isUpdate) {
                // Cerramos facturación del tramo anterior
                $this->closePreviousRecord($data['historia'], $data['fechavisado']);
            }

            // Aplicamos default 1 si viene 0 o null en TipoAlojamiento (Tu requerimiento)
            $idTipoAlojamiento = (!empty($data['IdTipoAlojamiento']) && $data['IdTipoAlojamiento'] > 0) ? (int)$data['IdTipoAlojamiento'] : 1;

            // Extraemos precios actuales del catálogo para congelar el Snapshot económico
            $stmtPrecio = $this->db->prepare("SELECT PrecioXunidad FROM tipoalojamiento WHERE IdTipoAlojamiento = ?");
            $stmtPrecio->execute([$idTipoAlojamiento]);
            $precioMomento = $stmtPrecio->fetchColumn() ?: 0;

            // INSERTAR EL NUEVO TRAMO ADMINISTRATIVO
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
                (int)$data['historia'],
                (int)$data['IdInstitucion'],
                $idTipoAlojamiento,
                (int)$data['CantidadCaja'],
                (float)$precioMomento
            ]);

            $idNewTramo = $this->db->lastInsertId();

            // -------------------------------------------------------------------------
            // MOTOR DE CONTINUIDAD FÍSICA (CLONACIÓN DE CAJAS Y ANIMALES)
            // -------------------------------------------------------------------------
            if ($isUpdate && isset($data['continuidad']) && !empty($data['continuidad']['cajas'])) {
                $cajasViejasIds = $data['continuidad']['cajas']; // Array de IDs de cajas del tramo viejo
                $unidadesViejasIds = $data['continuidad']['unidades'] ?? []; // Array de animales marcados

                foreach ($cajasViejasIds as $oldIdCaja) {
                    // 1. Obtener la data de la caja vieja
                    $stmtGetCaja = $this->db->prepare("SELECT * FROM alojamiento_caja WHERE IdCajaAlojamiento = ?");
                    $stmtGetCaja->execute([$oldIdCaja]);
                    $oldCaja = $stmtGetCaja->fetch(\PDO::FETCH_ASSOC);

                    if ($oldCaja) {
                        // 2. Clonarla asignándola al NUEVO tramo
                        $stmtInsertCaja = $this->db->prepare("INSERT INTO alojamiento_caja (FechaInicio, Detalle, NombreCaja, IdAlojamiento) VALUES (?, ?, ?, ?)");
                        $stmtInsertCaja->execute([
                            $data['fechavisado'], // Se usa la fecha del nuevo tramo
                            $oldCaja['Detalle'],
                            $oldCaja['NombreCaja'],
                            $idNewTramo // ¡Clave! Vinculada al nuevo registro
                        ]);
                        $newIdCaja = $this->db->lastInsertId();

                // 3. Clonar los animales (Unidades) que estaban en esta caja Y fueron seleccionados
                        $stmtGetUnits = $this->db->prepare("SELECT * FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
                        $stmtGetUnits->execute([$oldIdCaja]);
                        $unidadesCaja = $stmtGetUnits->fetchAll(\PDO::FETCH_ASSOC);

                        foreach ($unidadesCaja as $oldUnit) {
                            if (in_array($oldUnit['IdEspecieAlojUnidad'], $unidadesViejasIds)) {
                                // AÑADIMOS IdUnidadAlojamiento PARA QUE HEREDE EL NÚMERO BIOLÓGICO
                                $stmtInsertUnit = $this->db->prepare("
                                    INSERT INTO especie_alojamiento_unidad 
                                    (IdUnidadAlojamiento, NombreEspecieAloj, DetalleEspecieAloj, IdCajaAlojamiento) 
                                    VALUES (?, ?, ?, ?)
                                ");
                                $stmtInsertUnit->execute([
                                    $oldUnit['IdUnidadAlojamiento'], // <- El ID local se mantiene inmutable
                                    $oldUnit['NombreEspecieAloj'],
                                    $oldUnit['DetalleEspecieAloj'],
                                    $newIdCaja // Se mete en la nueva caja clonada
                                ]);
                            }
                        }
                    }
                }
            }

            // Auditoría
            $this->db->prepare("INSERT INTO registroalojamiento (IdUsrA, IdAlojamiento, TipoRegistro, FechaRegistro) VALUES (?, ?, 'ACTUALIZACION_TRAMO', NOW())")
                     ->execute([(int)$data['IdUsrA'], $idNewTramo]);

            $this->db->commit();
            return $idNewTramo;
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw new \Exception("Error SQL en Model: " . $e->getMessage());
        }
    }

            /**
             * Cierra el tramo anterior y define sus días finales para facturación
             */
            private function closePreviousRecord($historia, $newDate) {
                $sql = "SELECT * FROM alojamiento WHERE historia = ? ORDER BY IdAlojamiento DESC LIMIT 1";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$historia]);
                $prev = $stmt->fetch(\PDO::FETCH_ASSOC);

                if ($prev) {
                    // Cálculo de días enteros definidos
                    $diff = strtotime($newDate) - strtotime($prev['fechavisado']);
                    $diasDefinidos = max(0, floor($diff / 86400));
                    
                    // Determinamos precio según el tipo de caja guardado en ese tramo
                    $esChica = (float)$prev['totalcajachica'] > 0;
                    $precio = $esChica ? (float)$prev['preciocajachica'] : (float)$prev['preciocajagrande'];
                    $cantidad = $esChica ? (int)$prev['totalcajachica'] : (int)$prev['totalcajagrande'];
                    
                    $totalPago = $diasDefinidos * $precio * $cantidad;

                    // Guardamos totaldiasdefinidos y totalpago para que la fila quede "cerrada"
                    $update = "UPDATE alojamiento SET 
                            hastafecha = ?, 
                            totaldiasdefinidos = ?, 
                            totalpago = ? 
                            WHERE IdAlojamiento = ?";
                    $this->db->prepare($update)->execute([$newDate, $diasDefinidos, $totalPago, $prev['IdAlojamiento']]);
                }
            }
        /**
         * Elimina cualquier fila y dispara el recalculado automático
         */
        public function deleteRow($idAlojamiento, $historiaId) {
            $this->db->beginTransaction();
            try {
                // 1. Borrar el tramo específico
                $stmt = $this->db->prepare("DELETE FROM alojamiento WHERE IdAlojamiento = ?");
                $stmt->execute([$idAlojamiento]);

                // 2. Si no quedan filas, podrías manejarlo, pero asumimos que siempre queda una.
                $this->recalculateHistory($historiaId);

                $this->db->commit();
                return true;
            } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
        }

        /**
         * Actualiza datos de una fila y recalcula la cronología
         */
public function updateRow($data) {
        $this->db->beginTransaction();
        try {
            // Actualizamos usando la nueva arquitectura: CantidadCaja
            $sql = "UPDATE alojamiento SET 
                    fechavisado = ?, 
                    CantidadCaja = ?, 
                    observaciones = ? 
                  WHERE IdAlojamiento = ?";
            
            $this->db->prepare($sql)->execute([
                $data['fechavisado'],
                (int)$data['CantidadCaja'],
                $data['observaciones'],
                (int)$data['IdAlojamiento']
            ]);

            // Forzamos la re-evaluación contable de toda la estadía
            $this->recalculateHistory($data['historia']);

            $this->db->commit();
            return true;
        } catch (\Exception $e) { 
            $this->db->rollBack(); 
            throw $e; 
        }
    }

/**
     * MOTOR DE RECÁLCULO FINANCIERO:
     * Ordena cronológicamente la historia. Si la fila 2 cambia su fecha de inicio, 
     * automáticamente acorta o alarga el 'hastafecha' de la fila 1.
     * Luego multiplica (Días * CantidadCaja * PrecioCajaMomento) para cada fila.
     */
    public function recalculateHistory($historiaId) {
        // Obtenemos todos los tramos ordenados por fecha
        $sql = "SELECT * FROM alojamiento WHERE historia = ? ORDER BY fechavisado ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$historiaId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($rows as $i => $row) {
            $next = $rows[$i + 1] ?? null;
            
            $hasta = null;
            if ($next) {
                // Si hay un tramo siguiente, este termina EXACTAMENTE el día que el otro empieza
                $hasta = $next['fechavisado'];
            } else {
                // Si es el último, revisamos si la historia fue finalizada
                $hasta = ($row['finalizado'] == 1) ? $row['hastafecha'] : null;
            }

            // Calculamos días (Si no está cerrado, calcula hasta el día de HOY en vivo)
            $fechaFinCalculo = $hasta ?: date('Y-m-d');
            $diff = strtotime($fechaFinCalculo) - strtotime($row['fechavisado']);
            $dias = max(0, floor($diff / 86400));

            // MULTIPLICACIÓN MATEMÁTICA CON LAS NUEVAS VARIABLES
            $precio = (float)$row['PrecioCajaMomento'];
            $cajas = (int)$row['CantidadCaja'];
            
            $totalPago = $dias * $cajas * $precio;

            // Actualizamos la fila en la BD con los números congelados
            $updateSql = "UPDATE alojamiento SET 
                            hastafecha = ?, 
                            totaldiasdefinidos = ?, 
                            totalpago = ? 
                          WHERE IdAlojamiento = ?";
                          
            $this->db->prepare($updateSql)->execute([
                $hasta, 
                $dias, 
                $totalPago, 
                $row['IdAlojamiento']
            ]);
        }
    }

        public function finalizarHistoria($historiaId, $fechaCierre) {
            $this->db->beginTransaction();
            try {
                $hoy = date('Y-m-d');
                
                // Obtenemos la fecha de inicio de la historia para validar
                $stmtMin = $this->db->prepare("SELECT MIN(fechavisado) as inicio FROM alojamiento WHERE historia = ?");
                $stmtMin->execute([$historiaId]);
                $inicio = $stmtMin->fetchColumn();

                // VALIDACIÓN DE SEGURIDAD
                if ($fechaCierre > $hoy || $fechaCierre < $inicio) {
                    throw new \Exception("La fecha de cierre está fuera del rango permitido.");
                }

                $sql = "UPDATE alojamiento SET finalizado = 1, hastafecha = ? WHERE historia = ? ORDER BY IdAlojamiento DESC LIMIT 1";
                $this->db->prepare($sql)->execute([$fechaCierre, $historiaId]);
                
                $this->recalculateHistory($historiaId);
                $this->db->commit();
                return true;
            } catch (\Exception $e) { 
                $this->db->rollBack(); 
                throw $e; 
            }
        }
            /**
     * Desfinaliza la historia para permitir nuevas ediciones.
     */
    public function desfinalizarHistoria($historiaId) {
        $this->db->beginTransaction();
        try {
            // Reabre el último registro
            $sql = "UPDATE alojamiento SET finalizado = 0, hastafecha = NULL, totaldiasdefinidos = 0, totalpago = 0 
                    WHERE IdAlojamiento = (SELECT id FROM (SELECT MAX(IdAlojamiento) as id FROM alojamiento WHERE historia = ?) as t)";
            $this->db->prepare($sql)->execute([$historiaId]);
            
            // Sincroniza el estado en toda la historia
            $this->db->prepare("UPDATE alojamiento SET finalizado = 0 WHERE historia = ?")->execute([$historiaId]);
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

// api/src/Models/Alojamiento/AlojamientoModel.php

// api/src/Models/Alojamiento/AlojamientoModel.php

public function updateHistoryConfig($data) {
    $this->db->beginTransaction();
    try {
        $historia = $data['historia'];
        $nuevoTipo = $data['tipoCaja']; // 'chica' o 'grande'

        // Lógica de migración de cantidades entre columnas de caja
        if ($nuevoTipo === 'chica') {
            $sqlMigracion = "totalcajachica = (totalcajachica + totalcajagrande), totalcajagrande = 0";
        } else {
            $sqlMigracion = "totalcajagrande = (totalcajachica + totalcajagrande), totalcajachica = 0";
        }

        // UPDATE GLOBAL: Protocolo, Investigador, Especie y Precios
        $sql = "UPDATE alojamiento SET 
                    idprotA = :idprotA, 
                    IdUsrA = :idUsrA,
                    TipoAnimal = :idEsp, 
                    preciocajachica = :pChica,
                    preciocajagrande = :pGrande,
                    $sqlMigracion
                WHERE historia = :historia";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':idprotA'   => $data['idprotA'], 
            ':idUsrA'    => $data['IdUsrA'], 
            ':idEsp'     => $data['idespA'], // Actualizamos la especie globalmente
            ':pChica'    => $data['precioChica'], 
            ':pGrande'   => $data['precioGrande'],
            ':historia'  => $historia
        ]);

        // Sincronizamos los totales de dinero de cada tramo con los nuevos precios
        $this->recalculateHistory($historia);

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
            // Actualizamos el precio congelado de ESE tramo específico
            $this->db->prepare("UPDATE alojamiento SET PrecioCajaMomento = ? WHERE IdAlojamiento = ?")
                     ->execute([$nuevoPrecio, $idAlojamiento]);
            
            // Sacamos el ID de la Historia para recalcular toda la contabilidad
            $stmt = $this->db->prepare("SELECT historia FROM alojamiento WHERE IdAlojamiento = ?");
            $stmt->execute([$idAlojamiento]);
            $historia = $stmt->fetchColumn();

            $this->recalculateHistory($historia);

            $this->db->commit();
            return true;
        } catch (\Exception $e) { 
            $this->db->rollBack(); 
            throw $e; 
        }
    }
}