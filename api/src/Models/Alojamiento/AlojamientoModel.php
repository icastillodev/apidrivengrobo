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
        $sql = "SELECT a.*, p.nprotA, p.tituloA, e.EspeNombreA, e.idespA,
                       CONCAT(pers.NombreA, ' ', pers.ApellidoA) as Investigador
                FROM alojamiento a
                INNER JOIN (
                    SELECT historia, MAX(IdAlojamiento) as max_id 
                    FROM alojamiento 
                    GROUP BY historia
                ) last_a ON a.IdAlojamiento = last_a.max_id
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                INNER JOIN especiee e ON p.especie = e.idespA
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
        $sql = "SELECT a.*, p.nprotA, e.EspeNombreA, 
                       CONCAT(pers.NombreA, ' ', pers.ApellidoA) as Investigador 
                FROM alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                INNER JOIN especiee e ON p.especie = e.idespA
                LEFT JOIN personae pers ON a.IdUsrA = pers.IdUsrA
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
            $this->closePreviousRecord($data['historia'], $data['fechavisado']);
        }

        $sql = "INSERT INTO alojamiento (
            fechavisado, totalcajachica, totalcajagrande, preciocajachica, preciocajagrande,
            IdUsrA, observaciones, TipoAnimal, idprotA, historia, IdInstitucion, 
            finalizado, coloniapropia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['fechavisado'], 
            (int)($data['totalcajachica'] ?? 0), 
            (int)($data['totalcajagrande'] ?? 0), 
            (int)($data['preciocajachica'] ?? 0), 
            (int)($data['preciocajagrande'] ?? 0), 
            (int)$data['IdUsrA'],
            $data['observaciones'] ?? '', 
            1, // TipoAnimal: Forzamos un entero 1 (NOT NULL en tu DB)
            (int)$data['idprotA'], 
            (int)$data['historia'], 
            (int)$data['IdInstitucion'],
            (int)($data['coloniapropia'] ?? 0)
        ]);

        $idNew = $this->db->lastInsertId();
        
        // Auditoría obligatoria
        $this->db->prepare("INSERT INTO registroalojamiento (IdUsrA, IdAlojamiento, TipoRegistro, FechaRegistro) VALUES (?, ?, 'ACTUALIZACION_SISTEMA', NOW())")
                 ->execute([(int)$data['IdUsrA'], $idNew]);

        $this->db->commit();
        return $idNew; // Retornamos el ID para confirmar éxito real
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
                $sql = "UPDATE alojamiento SET 
                        fechavisado = ?, 
                        totalcajachica = ?, 
                        totalcajagrande = ?, 
                        observaciones = ? 
                        WHERE IdAlojamiento = ?";
                
                $this->db->prepare($sql)->execute([
                    $data['fechavisado'],
                    $data['totalcajachica'],
                    $data['totalcajagrande'],
                    $data['observaciones'],
                    $data['IdAlojamiento']
                ]);

                $this->recalculateHistory($data['historia']);

                $this->db->commit();
                return true;
            } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
        }

        /**
         * MOTOR DE RECALCULADO: Ajusta hastafecha, días y totales de toda la historia
         */
        public function recalculateHistory($historiaId) {
            $sql = "SELECT * FROM alojamiento WHERE historia = ? ORDER BY fechavisado ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$historiaId]);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $totalRows = count($rows);
            foreach ($rows as $i => $row) {
                $next = $rows[$i + 1] ?? null;
                
                // Lógica de fechas:
                // Si hay un tramo siguiente, este termina cuando empieza el otro.
                // Si es el último: si está finalizado usa su hastafecha, sino usa NULL (continuidad).
                $hasta = null;
                if ($next) {
                    $hasta = $next['fechavisado'];
                } else {
                    $hasta = ($row['finalizado'] == 1) ? $row['hastafecha'] : null;
                }

                // Cálculo de días (Si no hay hasta, calculamos hasta HOY para el registro dinámico)
                $fechaFinCalculo = $hasta ?: date('Y-m-d');
                $diff = strtotime($fechaFinCalculo) - strtotime($row['fechavisado']);
                $dias = max(0, floor($diff / 86400));

                // Cálculo de precio
                $total = ($row['totalcajachica'] * $row['preciocajachica'] + 
                        $row['totalcajagrande'] * $row['preciocajagrande']) * $dias;

                // Actualizamos la fila con los nuevos cálculos de auditoría
                $updateSql = "UPDATE alojamiento SET 
                            hastafecha = ?, 
                            totaldiasdefinidos = ?, 
                            totalpago = ? 
                            WHERE IdAlojamiento = ?";
                $this->db->prepare($updateSql)->execute([$hasta, $dias, $total, $row['IdAlojamiento']]);
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

    // ***************************************************
    // ACTUALIZACIÓN GLOBAL DE HISTORIA
    // ***************************************************
    // Modifica el protocolo, investigador o especie para TODOS los tramos de una historia.
    public function updateHistoryConfig($data) {
        $sql = "UPDATE alojamiento SET 
                idprotA = ?, 
                IdUsrA = ? 
                WHERE historia = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['idprotA'], 
            $data['IdUsrA'], 
            $data['historia']
        ]);
    }
}