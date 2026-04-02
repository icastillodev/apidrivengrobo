<?php
namespace App\Models\PublicReservas;

use PDO;

class PublicReservasModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getSalaPublicBundle($token, $from, $to, $userId = null) {
        if (!$token) return ['status' => 'error', 'message' => 'Token inválido'];
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');

        $salaStmt = $this->db->prepare("SELECT IdSalaReserva, IdInstitucion, Nombre, Lugar, tipohorasalas, QrToken FROM reserva_sala WHERE QrToken = ? AND habilitado = 1 LIMIT 1");
        $salaStmt->execute([$token]);
        $sala = $salaStmt->fetch(PDO::FETCH_ASSOC);
        if (!$sala) return ['status' => 'error', 'message' => 'Sala no encontrada'];

        return $this->buildBundleDataForSala($sala, $from, $to, $userId);
    }

    /**
     * Vista pública: todas las salas habilitadas de la institución (token en institucion.ReservaQrTokenGeneral).
     */
    public function getInstitucionPublicBundle($token, $from, $to, $userId = null) {
        if (!$token) return ['status' => 'error', 'message' => 'Token inválido'];
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');

        try {
            $instStmt = $this->db->prepare("SELECT IdInstitucion, NombreInst FROM institucion WHERE ReservaQrTokenGeneral = ? LIMIT 1");
            $instStmt->execute([$token]);
            $inst = $instStmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Configuración de QR no disponible.'];
        }
        if (!$inst) return ['status' => 'error', 'message' => 'Institución no encontrada'];

        $salasStmt = $this->db->prepare("
            SELECT IdSalaReserva, IdInstitucion, Nombre, Lugar, tipohorasalas, QrToken
            FROM reserva_sala
            WHERE IdInstitucion = ? AND habilitado = 1
            ORDER BY Nombre ASC
        ");
        $salasStmt->execute([(int)$inst['IdInstitucion']]);
        $salas = $salasStmt->fetchAll(PDO::FETCH_ASSOC);

        $outSalas = [];
        foreach ($salas as $sala) {
            $outSalas[] = $this->buildBundleDataForSala($sala, $from, $to, $userId);
        }

        return [
            'mode' => 'general',
            'institucion' => $inst,
            'salas' => $outSalas
        ];
    }

    private function buildBundleDataForSala(array $sala, $from, $to, $userId) {
        $horStmt = $this->db->prepare("SELECT IdDiaSala, HoraIni, HoraFin FROM reserva_horariospordiasala WHERE IdSalaReserva = ?");
        $horStmt->execute([$sala['IdSalaReserva']]);
        $horarios = $horStmt->fetchAll(PDO::FETCH_ASSOC);

        $resStmt = $this->db->prepare("
            SELECT idReserva, fechaini, Horacomienzo, Horafin, IdUsrTitular
            FROM reserva
            WHERE IdInstitucion = ? AND IdSalaReserva = ? AND fechaini BETWEEN ? AND ?
        ");
        $resStmt->execute([$sala['IdInstitucion'], $sala['IdSalaReserva'], $from, $to]);
        $reservas = $resStmt->fetchAll(PDO::FETCH_ASSOC);

        $slotMinutes = ((int)$sala['tipohorasalas'] === 2) ? 30 : 60;

        $slotsByDay = [];
        $availableDays = [];
        $busyByDay = [];

        $fromDate = new \DateTime($from);
        $toDate = new \DateTime($to);
        $toDate->setTime(0,0,0);

        for ($d = clone $fromDate; $d <= $toDate; $d->modify('+1 day')) {
            $dateStr = $d->format('Y-m-d');
            $dow = (int)$d->format('N');

            $h = null;
            foreach ($horarios as $row) {
                if ((int)$row['IdDiaSala'] === $dow) { $h = $row; break; }
            }
            if (!$h) continue;

            $daySlots = $this->buildFreeSlotsForDay($dateStr, $h['HoraIni'], $h['HoraFin'], $slotMinutes, $reservas);
            if (count($daySlots) > 0) {
                $slotsByDay[$dateStr] = $daySlots;
                $availableDays[] = $dateStr;
            }

            $busyByDay[$dateStr] = $this->buildBusyBlocksForDay($dateStr, $reservas, $userId);
        }

        return [
            'sala' => $sala,
            'availableDays' => $availableDays,
            'slotsByDay' => $slotsByDay,
            'busyByDay' => $busyByDay
        ];
    }

    private function buildFreeSlotsForDay($dateStr, $horaIni, $horaFin, $slotMinutes, $reservas) {
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

    private function buildBusyBlocksForDay($dateStr, $reservas, $userId) {
        $out = [];
        foreach ($reservas as $r) {
            if ($r['fechaini'] !== $dateStr) continue;
            $out[] = [
                'start' => substr($r['Horacomienzo'], 0, 5),
                'end' => substr($r['Horafin'], 0, 5),
                'status' => 'RESERVADO',
                'mine' => ($userId !== null && (int)$userId > 0 && (int)$r['IdUsrTitular'] === (int)$userId)
            ];
        }
        return $out;
    }

    private function diffMinutes($horaIni, $horaFin) {
        $a = new \DateTime("1970-01-01 $horaIni:00");
        $b = new \DateTime("1970-01-01 $horaFin:00");
        return (int)(($b->getTimestamp() - $a->getTimestamp()) / 60);
    }
}

