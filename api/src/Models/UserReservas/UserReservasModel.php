<?php
namespace App\Models\UserReservas;

use PDO;

class UserReservasModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getSalas($instId) {
        $stmt = $this->db->prepare("SELECT IdSalaReserva, Nombre, Lugar, tipohorasalas FROM reserva_sala WHERE IdInstitucion = ? AND habilitado = 1 ORDER BY Nombre ASC");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSalaBundle($instId, $salaId, $from, $to) {
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');

        $salaStmt = $this->db->prepare("SELECT * FROM reserva_sala WHERE IdInstitucion = ? AND IdSalaReserva = ? AND habilitado = 1");
        $salaStmt->execute([$instId, $salaId]);
        $sala = $salaStmt->fetch(PDO::FETCH_ASSOC);
        if (!$sala) return ['status' => 'error', 'message' => 'Sala inválida'];

        $horStmt = $this->db->prepare("SELECT IdDiaSala, HoraIni, HoraFin FROM reserva_horariospordiasala WHERE IdSalaReserva = ?");
        $horStmt->execute([$salaId]);
        $horarios = $horStmt->fetchAll(PDO::FETCH_ASSOC);

        // Reservas existentes en el rango (para bloquear slots)
        $resStmt = $this->db->prepare("
            SELECT idReserva, fechaini, Horacomienzo, Horafin
            FROM reserva
            WHERE IdInstitucion = ? AND IdSalaReserva = ? AND fechaini BETWEEN ? AND ?
        ");
        $resStmt->execute([$instId, $salaId, $from, $to]);
        $reservas = $resStmt->fetchAll(PDO::FETCH_ASSOC);

        $slotsByDay = [];
        $availableDays = [];

        $slotMinutes = ($sala['tipohorasalas'] == 2) ? 30 : 60;
        $fromDate = new \DateTime($from);
        $toDate = new \DateTime($to);
        $toDate->setTime(0,0,0);

        for ($d = clone $fromDate; $d <= $toDate; $d->modify('+1 day')) {
            $dateStr = $d->format('Y-m-d');
            $dow = (int)$d->format('N'); // 1..7 (Mon..Sun) = IdDiaSala
            $h = null;
            foreach ($horarios as $row) {
                if ((int)$row['IdDiaSala'] === $dow) { $h = $row; break; }
            }
            if (!$h) continue;

            $daySlots = $this->buildSlotsForDay($dateStr, $h['HoraIni'], $h['HoraFin'], $slotMinutes, $reservas);
            if (count($daySlots) > 0) {
                $slotsByDay[$dateStr] = $daySlots;
                $availableDays[] = $dateStr;
            }
        }

        return [
            'sala' => $sala,
            'availableDays' => $availableDays,
            'slotsByDay' => $slotsByDay
        ];
    }

    public function getInstrumentosDisponiblesSlot($instId, $salaId, $date, $start, $end) {
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

    public function getMisReservas($instId, $userId, $from = null, $to = null) {
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');
        $stmt = $this->db->prepare("
            SELECT r.idReserva, r.fechaini, r.Horacomienzo, r.Horafin, r.IdSalaReserva, rs.Nombre AS SalaNombre, rs.Lugar AS SalaLugar
            FROM reserva r
            JOIN reserva_sala rs ON rs.IdSalaReserva = r.IdSalaReserva
            WHERE r.IdInstitucion = ?
              AND r.IdUsrTitular = ?
              AND r.fechaini BETWEEN ? AND ?
            ORDER BY r.fechaini DESC, r.Horacomienzo DESC
        ");
        $stmt->execute([$instId, $userId, $from, $to]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createReserva($instId, $input) {
        $salaId = (int)($input['IdSalaReserva'] ?? 0);
        $fechaini = $input['fechaini'] ?? null;
        $horaIni = $input['Horacomienzo'] ?? null;
        $horaFin = $input['Horafin'] ?? null;
        $instrumentos = $input['instrumentos'] ?? [];
        $usrCreador = (int)($input['IdUsrCreador'] ?? 0);
        $usrTitular = (int)($input['IdUsrTitular'] ?? 0);
        if (!is_array($instrumentos)) $instrumentos = [];

        if ($salaId <= 0 || !$fechaini || !$horaIni || !$horaFin) {
            return ['status' => 'error', 'message' => 'Datos incompletos'];
        }
        if ($usrCreador <= 0 || $usrTitular <= 0) {
            return ['status' => 'error', 'message' => 'Usuario inválido'];
        }

        // Validar sala
        $salaStmt = $this->db->prepare("SELECT * FROM reserva_sala WHERE IdInstitucion = ? AND IdSalaReserva = ? AND habilitado = 1");
        $salaStmt->execute([$instId, $salaId]);
        $sala = $salaStmt->fetch(PDO::FETCH_ASSOC);
        if (!$sala) return ['status' => 'error', 'message' => 'Sala inválida'];

        // Validar horario operativo del día
        $dow = (int)(new \DateTime($fechaini))->format('N');
        $horStmt = $this->db->prepare("SELECT HoraIni, HoraFin FROM reserva_horariospordiasala WHERE IdSalaReserva = ? AND IdDiaSala = ? LIMIT 1");
        $horStmt->execute([$salaId, $dow]);
        $h = $horStmt->fetch(PDO::FETCH_ASSOC);
        if (!$h) return ['status' => 'error', 'message' => 'La sala no tiene horarios para ese día'];
        if (!($horaIni >= substr($h['HoraIni'], 0, 5) && $horaFin <= substr($h['HoraFin'], 0, 5) && $horaIni < $horaFin)) {
            return ['status' => 'error', 'message' => 'Horario fuera de disponibilidad'];
        }

        // Conflicto de sala
        $confStmt = $this->db->prepare("
            SELECT COUNT(*) AS c
            FROM reserva
            WHERE IdInstitucion = ? AND IdSalaReserva = ? AND fechaini = ?
              AND NOT (Horafin <= ? OR Horacomienzo >= ?)
        ");
        $confStmt->execute([$instId, $salaId, $fechaini, $horaIni, $horaFin]);
        $c = (int)($confStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        if ($c > 0) return ['status' => 'error', 'message' => 'La sala ya está reservada en ese horario'];

        // Validar instrumentos disponibles (usuario hoy manda array de IDs, se interpreta cantidad=1)
        $parsedInst = [];
        foreach ($instrumentos as $v) {
            $id = (int)$v;
            if ($id > 0) $parsedInst[$id] = ($parsedInst[$id] ?? 0) + 1;
        }
        if (count($parsedInst) > 0) {
            $disp = $this->getInstrumentosDisponiblesSlot($instId, $salaId, $fechaini, $horaIni, $horaFin);
            $map = [];
            foreach ($disp as $row) $map[(int)$row['IdReservaInstrumento']] = (int)$row['remaining'];
            foreach ($parsedInst as $idInst => $qty) {
                if (!isset($map[$idInst])) return ['status' => 'error', 'message' => 'Instrumento no permitido para esta sala'];
                if ($map[$idInst] < $qty) return ['status' => 'error', 'message' => 'Instrumento sin disponibilidad en ese horario'];
            }
        }

        $tiempo = $this->diffMinutes($horaIni, $horaFin);
        $aprobada = $this->shouldAutoApprove($instId) ? 1 : 0;

        try {
            $this->db->beginTransaction();
            $insStmt = $this->db->prepare("INSERT INTO reserva (fechaini, fechafin, tiempo, IdSalaReserva, IdInstitucion, IdUsrCreador, IdUsrTitular, Horacomienzo, Horafin, Aprobada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insStmt->execute([$fechaini, null, $tiempo, $salaId, $instId, $usrCreador, $usrTitular, $horaIni, $horaFin, $aprobada]);
            $idReserva = $this->db->lastInsertId();

            if (count($parsedInst) > 0) {
                $relStmt = $this->db->prepare("INSERT INTO reserva_instrumento_sala (IdReservaInstrumento, IdReserva, cantidad) VALUES (?, ?, ?)");
                foreach ($parsedInst as $idInst => $qty) {
                    $relStmt->execute([(int)$idInst, $idReserva, (int)$qty]);
                }
            }

            $this->db->commit();
            return ['status' => 'success', 'data' => ['idReserva' => $idReserva, 'Aprobada' => $aprobada]];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo crear la reserva'];
        }
    }

    private function shouldAutoApprove($instId) {
        // Si la institución requiere aprobación => NO auto aprobar.
        // Si no existe la columna, default = auto aprobar.
        try {
            $stmt = $this->db->prepare("SELECT ReservasRequierenAprobacion FROM institucion WHERE IdInstitucion = ? LIMIT 1");
            $stmt->execute([$instId]);
            $v = (int)($stmt->fetchColumn() ?? 0);
            return $v ? false : true;
        } catch (\Exception $e) {
            return true;
        }
    }

    private function buildSlotsForDay($dateStr, $horaIni, $horaFin, $slotMinutes, $reservas) {
        $ini = substr($horaIni, 0, 5);
        $fin = substr($horaFin, 0, 5);

        $slots = [];
        $t = new \DateTime("$dateStr $ini:00");
        $tEnd = new \DateTime("$dateStr $fin:00");

        while ($t < $tEnd) {
            $s = $t->format('H:i');
            $t2 = (clone $t)->modify("+$slotMinutes minutes");
            if ($t2 > $tEnd) break;
            $e = $t2->format('H:i');

            $conflict = false;
            foreach ($reservas as $r) {
                if ($r['fechaini'] !== $dateStr) continue;
                $rIni = substr($r['Horacomienzo'], 0, 5);
                $rFin = substr($r['Horafin'], 0, 5);
                if (!($rFin <= $s || $rIni >= $e)) { $conflict = true; break; }
            }

            if (!$conflict) $slots[] = ['start' => $s, 'end' => $e];
            $t = $t2;
        }

        return $slots;
    }

    private function diffMinutes($horaIni, $horaFin) {
        $a = new \DateTime("1970-01-01 $horaIni:00");
        $b = new \DateTime("1970-01-01 $horaFin:00");
        return (int)(($b->getTimestamp() - $a->getTimestamp()) / 60);
    }
}

