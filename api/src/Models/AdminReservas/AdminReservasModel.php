<?php
namespace App\Models\AdminReservas;

use PDO;

class AdminReservasModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    public function getSalas($instId) {
        $stmt = $this->db->prepare("SELECT IdSalaReserva, Nombre, Lugar, tipohorasalas, habilitado, QrToken FROM reserva_sala WHERE IdInstitucion = ? ORDER BY Nombre ASC");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSalaAgenda($instId, $salaId, $from, $to) {
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');

        $salaStmt = $this->db->prepare("SELECT * FROM reserva_sala WHERE IdInstitucion = ? AND IdSalaReserva = ? LIMIT 1");
        $salaStmt->execute([$instId, $salaId]);
        $sala = $salaStmt->fetch(PDO::FETCH_ASSOC);
        if (!$sala) return ['status' => 'error', 'message' => 'Sala inválida'];

        $resStmt = $this->db->prepare("
            SELECT r.idReserva, r.fechaini, r.Horacomienzo, r.Horafin, r.IdUsrTitular, r.IdUsrCreador,
                   COALESCE(r.Aprobada, 1) AS Aprobada,
                   CONCAT(COALESCE(p.ApellidoA,''), ', ', COALESCE(p.NombreA,'')) AS TitularNombre
            FROM reserva r
            LEFT JOIN personae p ON p.IdUsrA = r.IdUsrTitular
            WHERE r.IdInstitucion = ? AND r.IdSalaReserva = ? AND r.fechaini BETWEEN ? AND ?
            ORDER BY r.fechaini ASC, r.Horacomienzo ASC
        ");
        $resStmt->execute([$instId, $salaId, $from, $to]);
        $reservas = $resStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'sala' => $sala,
            'reservas' => $reservas
        ];
    }

    public function getAgenda($instId, $from, $to) {
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');

        $resStmt = $this->db->prepare("
            SELECT r.idReserva, r.fechaini, r.Horacomienzo, r.Horafin, r.IdUsrTitular, r.IdUsrCreador,
                   r.IdSalaReserva,
                   COALESCE(r.Aprobada, 1) AS Aprobada,
                   rs.Nombre AS SalaNombre, rs.Lugar AS SalaLugar,
                   CONCAT(COALESCE(p.ApellidoA,''), ', ', COALESCE(p.NombreA,'')) AS TitularNombre
            FROM reserva r
            JOIN reserva_sala rs ON rs.IdSalaReserva = r.IdSalaReserva
            LEFT JOIN personae p ON p.IdUsrA = r.IdUsrTitular
            WHERE r.IdInstitucion = ?
              AND r.fechaini BETWEEN ? AND ?
            ORDER BY r.fechaini ASC, r.Horacomienzo ASC
        ");
        $resStmt->execute([$instId, $from, $to]);
        return $resStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createReserva($instId, $input) {
        $salaId = (int)($input['IdSalaReserva'] ?? 0);
        $fechaini = $input['fechaini'] ?? null;
        $horaIni = $input['Horacomienzo'] ?? null;
        $horaFin = $input['Horafin'] ?? null;
        $usrCreador = (int)($input['IdUsrCreador'] ?? 0);
        $usrTitular = (int)($input['IdUsrTitular'] ?? 0);
        $instrumentos = $input['instrumentos'] ?? [];
        if (!is_array($instrumentos)) $instrumentos = [];

        if ($salaId <= 0 || !$fechaini || !$horaIni || !$horaFin || $usrCreador <= 0 || $usrTitular <= 0) {
            return ['status' => 'error', 'message' => 'Datos incompletos'];
        }

        // Validar que el titular pertenezca a la institución
        $uStmt = $this->db->prepare("SELECT 1 FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ? LIMIT 1");
        $uStmt->execute([$usrTitular, $instId]);
        if (!$uStmt->fetchColumn()) return ['status' => 'error', 'message' => 'Titular inválido para esta institución'];

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

        // Parse instrumentos (admin manda [{IdReservaInstrumento,cantidad}] o {id,cantidad})
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

        try {
            $this->db->beginTransaction();
            $insStmt = $this->db->prepare("INSERT INTO reserva (fechaini, fechafin, tiempo, IdSalaReserva, IdInstitucion, IdUsrCreador, IdUsrTitular, Horacomienzo, Horafin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insStmt->execute([$fechaini, null, $tiempo, $salaId, $instId, $usrCreador, $usrTitular, $horaIni, $horaFin]);
            $idReserva = $this->db->lastInsertId();

            if (count($parsedInst) > 0) {
                $relStmt = $this->db->prepare("INSERT INTO reserva_instrumento_sala (IdReservaInstrumento, IdReserva, cantidad) VALUES (?, ?, ?)");
                foreach ($parsedInst as $idInst => $qty) {
                    $relStmt->execute([(int)$idInst, $idReserva, (int)$qty]);
                }
            }

            $this->db->commit();
            return ['status' => 'success', 'data' => ['idReserva' => $idReserva]];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo crear la reserva'];
        }
    }

    public function updateReserva($instId, $input) {
        $idReserva = (int)($input['idReserva'] ?? 0);
        if ($idReserva <= 0) return ['status' => 'error', 'message' => 'ID inválido'];

        // Traer reserva actual (para validar y para recalcular conflictos sin contarse a sí misma)
        $cur = $this->db->prepare("SELECT * FROM reserva WHERE idReserva = ? AND IdInstitucion = ? LIMIT 1");
        $cur->execute([$idReserva, $instId]);
        $current = $cur->fetch(PDO::FETCH_ASSOC);
        if (!$current) return ['status' => 'error', 'message' => 'Reserva no encontrada'];

        $salaId = (int)($input['IdSalaReserva'] ?? $current['IdSalaReserva']);
        $fechaini = $input['fechaini'] ?? $current['fechaini'];
        $horaIni = $input['Horacomienzo'] ?? substr((string)$current['Horacomienzo'], 0, 5);
        $horaFin = $input['Horafin'] ?? substr((string)$current['Horafin'], 0, 5);
        $usrTitular = (int)($input['IdUsrTitular'] ?? $current['IdUsrTitular']);
        $usrCreador = (int)($input['IdUsrCreador'] ?? $current['IdUsrCreador']);
        $instrumentos = $input['instrumentos'] ?? [];
        if (!is_array($instrumentos)) $instrumentos = [];

        if ($salaId <= 0 || !$fechaini || !$horaIni || !$horaFin || !($horaIni < $horaFin) || $usrTitular <= 0 || $usrCreador <= 0) {
            return ['status' => 'error', 'message' => 'Datos incompletos'];
        }

        // Validar que el titular pertenezca a la institución
        $uStmt = $this->db->prepare("SELECT 1 FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ? LIMIT 1");
        $uStmt->execute([$usrTitular, $instId]);
        if (!$uStmt->fetchColumn()) return ['status' => 'error', 'message' => 'Titular inválido para esta institución'];

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
        if (!($horaIni >= substr($h['HoraIni'], 0, 5) && $horaFin <= substr($h['HoraFin'], 0, 5))) {
            return ['status' => 'error', 'message' => 'Horario fuera de disponibilidad'];
        }

        // Conflicto de sala (excluyendo esta reserva)
        $confStmt = $this->db->prepare("
            SELECT COUNT(*) AS c
            FROM reserva
            WHERE IdInstitucion = ? AND IdSalaReserva = ? AND fechaini = ?
              AND idReserva <> ?
              AND NOT (Horafin <= ? OR Horacomienzo >= ?)
        ");
        $confStmt->execute([$instId, $salaId, $fechaini, $idReserva, $horaIni, $horaFin]);
        $c = (int)($confStmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);
        if ($c > 0) return ['status' => 'error', 'message' => 'La sala ya está reservada en ese horario'];

        // Parse instrumentos (admin manda [{IdReservaInstrumento,cantidad}] o {id,cantidad})
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

        // Validar instrumentos disponibles (calculando used sin esta reserva)
        if (count($parsedInst) > 0) {
            $disp = $this->getInstrumentosDisponiblesSlotExcludingReserva($instId, $salaId, $fechaini, $horaIni, $horaFin, $idReserva);
            $map = [];
            foreach ($disp as $row) $map[(int)$row['IdReservaInstrumento']] = (int)$row['remaining'];
            foreach ($parsedInst as $idInst => $qty) {
                if (!isset($map[$idInst])) return ['status' => 'error', 'message' => 'Instrumento no permitido para esta sala'];
                if ($map[$idInst] < $qty) return ['status' => 'error', 'message' => 'Instrumento sin disponibilidad en ese horario'];
            }
        }

        $tiempo = $this->diffMinutes($horaIni, $horaFin);

        try {
            $this->db->beginTransaction();
            $upd = $this->db->prepare("UPDATE reserva SET fechaini=?, tiempo=?, IdSalaReserva=?, IdUsrTitular=?, Horacomienzo=?, Horafin=? WHERE idReserva=? AND IdInstitucion=?");
            $upd->execute([$fechaini, $tiempo, $salaId, $usrTitular, $horaIni, $horaFin, $idReserva, $instId]);

            // Reemplazar instrumentos
            $this->db->prepare("DELETE FROM reserva_instrumento_sala WHERE IdReserva = ?")->execute([$idReserva]);
            if (count($parsedInst) > 0) {
                $relStmt = $this->db->prepare("INSERT INTO reserva_instrumento_sala (IdReservaInstrumento, IdReserva, cantidad) VALUES (?, ?, ?)");
                foreach ($parsedInst as $idInst => $qty) {
                    $relStmt->execute([(int)$idInst, $idReserva, (int)$qty]);
                }
            }

            $this->db->commit();
            return ['status' => 'success'];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo actualizar la reserva'];
        }
    }

    public function deleteReserva($instId, $input) {
        $idReserva = (int)($input['idReserva'] ?? 0);
        if ($idReserva <= 0) return ['status' => 'error', 'message' => 'ID inválido'];

        try {
            $this->db->beginTransaction();
            $this->db->prepare("DELETE FROM reserva_instrumento_sala WHERE IdReserva = ?")->execute([$idReserva]);
            $del = $this->db->prepare("DELETE FROM reserva WHERE idReserva = ? AND IdInstitucion = ?");
            $del->execute([$idReserva, $instId]);
            $this->db->commit();
            return ['status' => 'success'];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => 'error', 'message' => 'No se pudo eliminar la reserva'];
        }
    }

    public function getPendingCount($instId) {
        // Requiere columna Aprobada (0/1). Si no existe, devolvemos 0 sin romper.
        try {
            $stmt = $this->db->prepare("SELECT COUNT(*) AS c FROM reserva WHERE IdInstitucion = ? AND Aprobada = 0");
            $stmt->execute([$instId]);
            return ['count' => (int)($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0)];
        } catch (\Exception $e) {
            return ['count' => 0];
        }
    }

    public function getPendingList($instId, $salaId = null, $from = null, $to = null) {
        $from = $from ?: date('Y-m-01');
        $to = $to ?: date('Y-m-t');
        $salaId = $salaId ? (int)$salaId : 0;

        try {
            $sql = "
                SELECT r.idReserva, r.fechaini, r.Horacomienzo, r.Horafin, r.IdUsrTitular, r.IdUsrCreador,
                       r.IdSalaReserva, rs.Nombre AS SalaNombre, rs.Lugar AS SalaLugar,
                       COALESCE(r.Aprobada, 1) AS Aprobada,
                       CONCAT(COALESCE(p.ApellidoA,''), ', ', COALESCE(p.NombreA,'')) AS TitularNombre
                FROM reserva r
                JOIN reserva_sala rs ON rs.IdSalaReserva = r.IdSalaReserva
                LEFT JOIN personae p ON p.IdUsrA = r.IdUsrTitular
                WHERE r.IdInstitucion = ?
                  AND COALESCE(r.Aprobada, 1) = 0
                  AND r.fechaini BETWEEN ? AND ?
            ";
            $params = [$instId, $from, $to];
            if ($salaId > 0) {
                $sql .= " AND r.IdSalaReserva = ? ";
                $params[] = $salaId;
            }
            $sql .= " ORDER BY r.fechaini ASC, r.Horacomienzo ASC ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return [];
        }
    }

    public function approveReserva($instId, $userId, $input) {
        $idReserva = (int)($input['idReserva'] ?? 0);
        if ($idReserva <= 0) return ['status' => 'error', 'message' => 'ID inválido'];
        try {
            $stmt = $this->db->prepare("UPDATE reserva SET Aprobada = 1, IdUsrAprobador = ?, FechaAprobada = NOW() WHERE idReserva = ? AND IdInstitucion = ?");
            $stmt->execute([(int)$userId, $idReserva, $instId]);
            return ['status' => 'success'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'No se pudo aprobar'];
        }
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

    private function getInstrumentosDisponiblesSlotExcludingReserva($instId, $salaId, $date, $start, $end, $excludeReservaId) {
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
                      AND r.idReserva <> ?
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
        $stmt->execute([$instId, (int)$excludeReservaId, $date, $start, $end, $instId, $salaId]);
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

