<?php
namespace App\Models\UserReservas;

use PDO;

class UserReservasSeriesModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    /**
     * Serie para usuario (máximo 1 mes).
     * Además, por requisito: una serie creada por usuario queda PENDIENTE (Aprobada=0).
     *
     * Input:
     * - IdInstitucion, IdUsrCreador, IdUsrTitular, IdSalaReserva
     * - HoraInicio (HH:MM), HoraFin (HH:MM)
     * - FechaInicio (YYYY-MM-DD), FechaFin (YYYY-MM-DD) [<= FechaInicio + 1 mes]
     * - TipoRepeat: 1=semanal, 2=dias_especificos
     * - CadaNSemanas (>=1)
     * - DiasSemana (array 1..7) si semanal
     * - FechasEspecificas (array YYYY-MM-DD) si dias_especificos
     * - instrumentos: array de IDs (cantidad=1) o [{IdReservaInstrumento,cantidad}]
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
        $tipo = (int)($in['TipoRepeat'] ?? 1);
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

        // Límite 1 mes (inclusive). Permitimos hasta +1 month desde FechaInicio.
        try {
            $dIni = new \DateTime($fechaIni);
            $maxFin = (clone $dIni)->modify('+1 month');
            $dFin = new \DateTime($fechaFin);
            $maxFin->setTime(0,0,0);
            $dFin->setTime(0,0,0);
            if ($dFin > $maxFin) {
                return ['status' => 'error', 'message' => 'La serie no puede superar 1 mes'];
            }
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Fechas inválidas'];
        }

        $dates = $this->computeDates($fechaIni, $fechaFin, $tipo, $cadaNSem, $diasSemana, $fechasEsp);
        if (count($dates) === 0) return ['status' => 'error', 'message' => 'La recurrencia no genera fechas'];

        // Parse instrumentos: soporta IDs o arrays con cantidad
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

        // Guardamos también la serie para trazabilidad (igual tabla que admin)
        try {
            $this->db->beginTransaction();

            $diasSemanaStr = count($diasSemana) ? implode(',', array_map('intval', $diasSemana)) : null;
            $fechasJson = count($fechasEsp) ? json_encode(array_values($fechasEsp)) : null;

            $stmtSerie = $this->db->prepare("
                INSERT INTO reserva_serie
                (IdInstitucion, IdUsrCreador, IdUsrTitular, IdSalaReserva, HoraInicio, HoraFin, FechaInicio, FechaFin, TipoRepeat, CadaNSemanas, DiasSemana, FechasEspecificas, Activa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmtSerie->execute([$instId, $usrCreador, $usrTitular, $salaId, $horaIni, $horaFin, $fechaIni, $fechaFin, $tipo, $cadaNSem, $diasSemanaStr, $fechasJson]);
            $idSerie = $this->db->lastInsertId();

            $created = 0;
            $skipped = 0;
            foreach ($dates as $d) {
                $ok = $this->insertReservaIfFreePending($instId, $usrCreador, $usrTitular, $salaId, $d, $horaIni, $horaFin, $idSerie, $parsedInst);
                if ($ok) $created++; else $skipped++;
            }

            $this->db->commit();
            return ['status' => 'success', 'data' => ['IdReservaSerie' => (int)$idSerie, 'creadas' => $created, 'omitidas' => $skipped, 'Aprobada' => 0]];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo crear la serie'];
        }
    }

    private function computeDates($fechaIni, $fechaFin, $tipo, $cadaNSem, array $diasSemana, array $fechasEsp) {
        $out = [];
        $start = new \DateTime($fechaIni);
        $end = new \DateTime($fechaFin);
        $end->setTime(0,0,0);

        if ((int)$tipo === 2) {
            foreach ($fechasEsp as $f) {
                if (!is_string($f) || strlen($f) < 10) continue;
                if ($f < $fechaIni || $f > $fechaFin) continue;
                $out[] = $f;
            }
            $out = array_values(array_unique($out));
            sort($out);
            return $out;
        }

        $dias = array_values(array_unique(array_filter(array_map('intval', $diasSemana), fn($d) => $d >= 1 && $d <= 7)));
        if (!count($dias)) $dias = [(int)$start->format('N')];

        $week0 = (int)$start->format('W');
        for ($d = clone $start; $d <= $end; $d->modify('+1 day')) {
            $dow = (int)$d->format('N');
            if (!in_array($dow, $dias, true)) continue;
            $w = (int)$d->format('W');
            $deltaWeeks = ($w - $week0);
            if ($deltaWeeks < 0) $deltaWeeks = 0;
            if (($deltaWeeks % max(1, (int)$cadaNSem)) !== 0) continue;
            $out[] = $d->format('Y-m-d');
        }

        $out = array_values(array_unique($out));
        sort($out);
        return $out;
    }

    private function insertReservaIfFreePending($instId, $usrCreador, $usrTitular, $salaId, $fecha, $horaIni, $horaFin, $idSerie, array $parsedInst) {
        // Conflicto de sala (aunque esté pendiente, bloquea igual)
        $confStmt = $this->db->prepare("
            SELECT COUNT(*) AS c
            FROM reserva
            WHERE IdInstitucion = ? AND IdSalaReserva = ? AND fechaini = ?
              AND NOT (Horafin <= ? OR Horacomienzo >= ?)
        ");
        $confStmt->execute([$instId, $salaId, $fecha, $horaIni, $horaFin]);
        $c = (int)($confStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        if ($c > 0) return false;

        // Validar instrumentos disponibles (stock)
        if (count($parsedInst) > 0) {
            $disp = $this->getInstrumentosDisponiblesSlot($instId, $salaId, $fecha, $horaIni, $horaFin);
            $map = [];
            foreach ($disp as $row) $map[(int)$row['IdReservaInstrumento']] = (int)$row['remaining'];
            foreach ($parsedInst as $idInst => $qty) {
                if (!isset($map[$idInst]) || $map[$idInst] < $qty) return false;
            }
        }

        $tiempo = $this->diffMinutes($horaIni, $horaFin);
        $insStmt = $this->db->prepare("
            INSERT INTO reserva (IdReservaSerie, fechaini, fechafin, tiempo, IdSalaReserva, IdInstitucion, IdUsrCreador, IdUsrTitular, Horacomienzo, Horafin, Aprobada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
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

