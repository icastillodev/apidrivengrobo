<?php
namespace App\Models\AdminReservas;

use PDO;

class AdminReservasSeriesModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    /**
     * Crea una serie y genera ocurrencias en tabla reserva.
     * Input esperado:
     * - IdInstitucion, IdUsrCreador, IdUsrTitular, IdSalaReserva
     * - HoraInicio (HH:MM), HoraFin (HH:MM)
     * - FechaInicio (YYYY-MM-DD), FechaFin (YYYY-MM-DD)
     * - TipoRepeat: 1=semanal, 2=dias_especificos
     * - CadaNSemanas (int >=1)
     * - DiasSemana (array de ints 1..7) si semanal
     * - FechasEspecificas (array de YYYY-MM-DD) si dias_especificos
     * - instrumentos: [{IdReservaInstrumento,cantidad}] (opcional)
     */
    public function createSerie(array $in) {
        $instId = (int)($in['IdInstitucion'] ?? 0);
        $usrCreador = (int)($in['IdUsrCreador'] ?? 0);
        $usrTitular = (int)($in['IdUsrTitular'] ?? 0);
        $salaId = (int)($in['IdSalaReserva'] ?? 0);
        $horaIni = $in['HoraInicio'] ?? null;
        $horaFin = $in['HoraFin'] ?? null;
        $fechaIni = $in['FechaInicio'] ?? null;
        $fechaFin = $in['FechaFin'] ?? null;
        $tipo = (int)($in['TipoRepeat'] ?? 0);
        $cadaNSem = max(1, (int)($in['CadaNSemanas'] ?? 1));
        $diasSemana = $in['DiasSemana'] ?? [];
        $fechasEsp = $in['FechasEspecificas'] ?? [];
        $instrumentos = $in['instrumentos'] ?? [];
        if (!is_array($diasSemana)) $diasSemana = [];
        if (!is_array($fechasEsp)) $fechasEsp = [];
        if (!is_array($instrumentos)) $instrumentos = [];

        if ($instId <= 0 || $usrCreador <= 0 || $usrTitular <= 0 || $salaId <= 0 || !$horaIni || !$horaFin || !$fechaIni || !$fechaFin) {
            return ['status' => 'error', 'message' => 'Datos incompletos'];
        }
        if (!($horaIni < $horaFin)) return ['status' => 'error', 'message' => 'Horario inválido'];

        $dates = $this->computeDates($fechaIni, $fechaFin, $tipo, $cadaNSem, $diasSemana, $fechasEsp);
        if (count($dates) === 0) return ['status' => 'error', 'message' => 'La recurrencia no genera fechas'];

        // Parse instrumentos (mismo formato que admin create)
        $parsedInst = [];
        foreach ($instrumentos as $it) {
            if (is_array($it)) {
                $id = (int)($it['IdReservaInstrumento'] ?? $it['id'] ?? 0);
                $qty = (int)($it['cantidad'] ?? 1);
                if ($id > 0 && $qty > 0) $parsedInst[$id] = ($parsedInst[$id] ?? 0) + $qty;
            } else {
                $id = (int)$it;
                if ($id > 0) $parsedInst[$id] = ($parsedInst[$id] ?? 0) + 1;
            }
        }

        try {
            $this->db->beginTransaction();

            // Guardar serie
            $diasSemanaStr = count($diasSemana) ? implode(',', array_map('intval', $diasSemana)) : null;
            $fechasJson = count($fechasEsp) ? json_encode(array_values($fechasEsp)) : null;

            $stmtSerie = $this->db->prepare("
                INSERT INTO reserva_serie
                (IdInstitucion, IdUsrCreador, IdUsrTitular, IdSalaReserva, HoraInicio, HoraFin, FechaInicio, FechaFin, TipoRepeat, CadaNSemanas, DiasSemana, FechasEspecificas, Activa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmtSerie->execute([$instId, $usrCreador, $usrTitular, $salaId, $horaIni, $horaFin, $fechaIni, $fechaFin, $tipo, $cadaNSem, $diasSemanaStr, $fechasJson]);
            $idSerie = $this->db->lastInsertId();

            // Generar ocurrencias (saltando exclusiones por si ya existen)
            $created = 0;
            $skipped = 0;

            foreach ($dates as $d) {
                if ($this->isExcluded((int)$idSerie, $d, $horaIni, $horaFin)) { $skipped++; continue; }
                $ok = $this->insertReservaIfFree($instId, $usrCreador, $usrTitular, $salaId, $d, $horaIni, $horaFin, $idSerie, $parsedInst);
                if ($ok) $created++; else $skipped++;
            }

            $this->db->commit();
            return ['status' => 'success', 'data' => ['IdReservaSerie' => (int)$idSerie, 'creadas' => $created, 'omitidas' => $skipped]];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo crear la serie'];
        }
    }

    /**
     * Cancela una ocurrencia puntual agregando exclusión de serie
     * Input: { IdReservaSerie, fecha (YYYY-MM-DD), HoraInicio (HH:MM), HoraFin (HH:MM) }
     */
    public function cancelOcurrencia($instId, $userId, array $in) {
        $idSerie = (int)($in['IdReservaSerie'] ?? 0);
        $fecha = $in['fecha'] ?? null;
        $horaIni = $in['HoraInicio'] ?? null;
        $horaFin = $in['HoraFin'] ?? null;
        if ($idSerie <= 0 || !$fecha || !$horaIni || !$horaFin) {
            return ['status' => 'error', 'message' => 'Datos incompletos'];
        }

        // Verificar que la serie pertenece a la institución
        $stmt = $this->db->prepare("SELECT IdReservaSerie FROM reserva_serie WHERE IdReservaSerie = ? AND IdInstitucion = ? AND Activa = 1 LIMIT 1");
        $stmt->execute([$idSerie, $instId]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) return ['status' => 'error', 'message' => 'Serie inválida'];

        try {
            $this->db->beginTransaction();
            $ins = $this->db->prepare("INSERT IGNORE INTO reserva_serie_exclusion (IdReservaSerie, Fecha, HoraInicio, HoraFin, IdUsrAccion) VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$idSerie, $fecha, $horaIni, $horaFin, (int)$userId]);

            // Borrar ocurrencias ya generadas que matcheen (si existen)
            $del = $this->db->prepare("DELETE FROM reserva WHERE IdReservaSerie = ? AND fechaini = ? AND Horacomienzo = ? AND Horafin = ?");
            $del->execute([$idSerie, $fecha, $horaIni, $horaFin]);

            $this->db->commit();
            return ['status' => 'success'];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo cancelar la ocurrencia'];
        }
    }

    private function computeDates($fechaIni, $fechaFin, $tipo, $cadaNSem, array $diasSemana, array $fechasEsp) {
        $out = [];
        $start = new \DateTime($fechaIni);
        $end = new \DateTime($fechaFin);
        $end->setTime(0,0,0);

        if ($tipo === 2) {
            // Días específicos
            foreach ($fechasEsp as $f) {
                if (!is_string($f) || strlen($f) < 10) continue;
                if ($f < $fechaIni || $f > $fechaFin) continue;
                $out[] = $f;
            }
            $out = array_values(array_unique($out));
            sort($out);
            return $out;
        }

        // Semanal (por defecto)
        $dias = array_values(array_unique(array_filter(array_map('intval', $diasSemana), fn($d) => $d >= 1 && $d <= 7)));
        if (!count($dias)) $dias = [(int)$start->format('N')]; // fallback: día de inicio

        // Recorremos por días, pero aplicando cada N semanas por "semana offset"
        $week0 = (int)$start->format('W');
        for ($d = clone $start; $d <= $end; $d->modify('+1 day')) {
            $dow = (int)$d->format('N');
            if (!in_array($dow, $dias)) continue;

            $w = (int)$d->format('W');
            $deltaWeeks = ($w - $week0);
            if ($deltaWeeks < 0) $deltaWeeks = 0; // evita edge de cambio de año (simple)
            if (($deltaWeeks % $cadaNSem) !== 0) continue;

            $out[] = $d->format('Y-m-d');
        }

        $out = array_values(array_unique($out));
        sort($out);
        return $out;
    }

    private function isExcluded($idSerie, $fecha, $horaIni, $horaFin) {
        $stmt = $this->db->prepare("SELECT 1 FROM reserva_serie_exclusion WHERE IdReservaSerie = ? AND Fecha = ? AND HoraInicio = ? AND HoraFin = ? LIMIT 1");
        $stmt->execute([$idSerie, $fecha, $horaIni, $horaFin]);
        return (bool)$stmt->fetchColumn();
    }

    private function insertReservaIfFree($instId, $usrCreador, $usrTitular, $salaId, $fecha, $horaIni, $horaFin, $idSerie, array $parsedInst) {
        // Conflicto de sala
        $confStmt = $this->db->prepare("
            SELECT COUNT(*) AS c
            FROM reserva
            WHERE IdInstitucion = ? AND IdSalaReserva = ? AND fechaini = ?
              AND NOT (Horafin <= ? OR Horacomienzo >= ?)
        ");
        $confStmt->execute([$instId, $salaId, $fecha, $horaIni, $horaFin]);
        $c = (int)($confStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        if ($c > 0) return false;

        // Validar instrumentos (si hay)
        if (count($parsedInst) > 0) {
            $disp = $this->getInstrumentosDisponiblesSlot($instId, $salaId, $fecha, $horaIni, $horaFin);
            $map = [];
            foreach ($disp as $row) $map[(int)$row['IdReservaInstrumento']] = (int)$row['remaining'];
            foreach ($parsedInst as $idInst => $qty) {
                if (!isset($map[$idInst]) || $map[$idInst] < $qty) return false;
            }
        }

        $tiempo = $this->diffMinutes($horaIni, $horaFin);
        $insStmt = $this->db->prepare("INSERT INTO reserva (IdReservaSerie, fechaini, fechafin, tiempo, IdSalaReserva, IdInstitucion, IdUsrCreador, IdUsrTitular, Horacomienzo, Horafin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insStmt->execute([(int)$idSerie, $fecha, null, $tiempo, $salaId, $instId, $usrCreador, $usrTitular, $horaIni, $horaFin]);
        $idReserva = $this->db->lastInsertId();

        if (count($parsedInst) > 0) {
            $relStmt = $this->db->prepare("INSERT INTO reserva_instrumento_sala (IdReservaInstrumento, IdReserva, cantidad) VALUES (?, ?, ?)");
            foreach ($parsedInst as $idInst => $qty) {
                $relStmt->execute([(int)$idInst, $idReserva, (int)$qty]);
            }
        }

        return true;
    }

    private function getInstrumentosDisponiblesSlot($instId, $salaId, $date, $start, $end) {
        $stmt = $this->db->prepare("
            SELECT 
                ri.IdReservaInstrumento,
                ri.NombreInstrumento,
                ri.cantidad,
                (
                    SELECT COALESCE(SUM(ris.cantidad), 0)
                    FROM reserva_instrumento_sala ris
                    JOIN reserva r ON r.idReserva = ris.IdReserva
                    WHERE ris.IdReservaInstrumento = ri.IdReservaInstrumento
                      AND r.IdInstitucion = ?
                      AND r.fechaini = ?
                      AND NOT (r.Horafin <= ? OR r.Horacomienzo >= ?)
                ) AS usados
            FROM reserva_instrumento ri
            WHERE ri.IdInstitucion = ?
              AND ri.habilitado = 1
              AND (
                    NOT EXISTS (
                        SELECT 1 FROM reserva_instrumento_sala_permitida p2
                        WHERE p2.IdReservaInstrumento = ri.IdReservaInstrumento
                    )
                    OR EXISTS (
                        SELECT 1 FROM reserva_instrumento_sala_permitida p
                        WHERE p.IdReservaInstrumento = ri.IdReservaInstrumento
                          AND p.IdSalaReserva = ?
                    )
              )
            ORDER BY ri.NombreInstrumento ASC
        ");
        $stmt->execute([$instId, $date, $start, $end, $instId, $salaId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $cant = (int)($r['cantidad'] ?? 0);
            $usados = (int)($r['usados'] ?? 0);
            $r['remaining'] = max(0, $cant - $usados);
        }
        return $rows;
    }

    private function diffMinutes($horaIni, $horaFin) {
        $a = new \DateTime("1970-01-01 $horaIni:00");
        $b = new \DateTime("1970-01-01 $horaFin:00");
        return (int)(($b->getTimestamp() - $a->getTimestamp()) / 60);
    }
}

