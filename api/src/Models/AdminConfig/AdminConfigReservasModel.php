<?php
namespace App\Models\AdminConfig;

use App\Models\Reservas\ReservaTableColumns;
use PDO;
use App\Utils\Auditoria;

class AdminConfigReservasModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    /** Filtro por IdInstitucion obligatorio para toda escritura de configuración. */
    private function assertSalaOwned(int $idSala, int $instId): void {
        if ($idSala <= 0 || $instId <= 0) {
            throw new \InvalidArgumentException('Sala o institución inválida.');
        }
        $stmt = $this->db->prepare(
            'SELECT IdSalaReserva FROM reserva_sala
             WHERE IdSalaReserva = ? AND IdInstitucion = ? LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([$idSala, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \DomainException('Sala no encontrada en la institución actual.');
        }
    }

    private function assertInstrumentoOwned(int $id, int $instId): void {
        if ($id <= 0 || $instId <= 0) {
            throw new \InvalidArgumentException('Instrumento o institución inválidos.');
        }
        $stmt = $this->db->prepare(
            'SELECT IdReservaInstrumento FROM reserva_instrumento
             WHERE IdReservaInstrumento = ? AND IdInstitucion = ? LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([$id, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \DomainException('Instrumento no encontrado en la institución actual.');
        }
    }

    public function getAllSalas($instId) {
        $cols = ReservaTableColumns::reservaSala();
        $stmt = $this->db->prepare("SELECT {$cols} FROM reserva_sala WHERE IdInstitucion = ? ORDER BY Nombre ASC");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSalaDetail($id, int $instId) {
        $colsSala = ReservaTableColumns::reservaSala();
        $sala = $this->db->prepare("SELECT {$colsSala} FROM reserva_sala WHERE IdSalaReserva = ? AND IdInstitucion = ?");
        $sala->execute([$id, $instId]);
        $salaData = $sala->fetch(PDO::FETCH_ASSOC);
        if (!$salaData) {
            throw new \DomainException('Sala no encontrada en la institución actual.');
        }

        $colsHor = ReservaTableColumns::reservaHorariosPorDiaSala();
        $horarios = $this->db->prepare("SELECT {$colsHor} FROM reserva_horariospordiasala WHERE IdSalaReserva = ?");
        $horarios->execute([$id]);
        
        return ['sala' => $salaData, 'horarios' => $horarios->fetchAll(PDO::FETCH_ASSOC)];
    }

    public function saveSala($data, $horarios) {
        $instId = (int)($data['IdInstitucion'] ?? 0);
        if ($instId <= 0) throw new \InvalidArgumentException('Institución inválida.');
        try {
            $this->db->beginTransaction();

            if(empty($data['IdSalaReserva'])) {
                $sql = "INSERT INTO reserva_sala (Nombre, Lugar, tipohorasalas, IdInstitucion, habilitado) VALUES (?, ?, ?, ?, 1)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$data['Nombre'], $data['Lugar'], $data['tipohorasalas'], $data['IdInstitucion']]);
                $idSala = $this->db->lastInsertId();
                Auditoria::log($this->db, 'INSERT', 'reserva_sala', "Creó Sala: " . $data['Nombre']);
            } else {
                $idSala = (int)$data['IdSalaReserva'];
                $this->assertSalaOwned($idSala, $instId);
                $hab = $data['habilitado'] ?? 1;
                $sql = "UPDATE reserva_sala SET Nombre=?, Lugar=?, tipohorasalas=?, habilitado=? WHERE IdSalaReserva=? AND IdInstitucion=?";
                $this->db->prepare($sql)->execute([$data['Nombre'], $data['Lugar'], $data['tipohorasalas'], $hab, $idSala, $instId]);
                Auditoria::log($this->db, 'UPDATE', 'reserva_sala', "Modificó Sala ID: $idSala");
            }

            $this->db->prepare("DELETE FROM reserva_horariospordiasala WHERE IdSalaReserva = ?")->execute([$idSala]);

            if(!empty($horarios)) {
                $sqlH = "INSERT INTO reserva_horariospordiasala (IdDiaSala, IdSalaReserva, HoraIni, HoraFin) VALUES (?, ?, ?, ?)";
                $stmtH = $this->db->prepare($sqlH);
                foreach($horarios as $h) {
                    $stmtH->execute([$h['day'], $idSala, $h['ini'], $h['fin']]);
                }
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function toggleSala($id, $status, int $instId) {
        $id = (int)$id;
        $this->assertSalaOwned($id, $instId);
        $this->db->prepare("UPDATE reserva_sala SET habilitado = ? WHERE IdSalaReserva = ? AND IdInstitucion = ?")->execute([$status, $id, $instId]);
        Auditoria::log($this->db, 'UPDATE', 'reserva_sala', "Cambió estado a $status de Sala ID: $id");
    }

    public function updateGlobalTimeType($instId, $type) {
        $this->db->prepare("UPDATE reserva_sala SET tipohorasalas = ? WHERE IdInstitucion = ?")->execute([$type, $instId]);
        Auditoria::log($this->db, 'UPDATE', 'reserva_sala', "Cambió el tipo de hora global de salas (Tipo: $type)");
    }

    public function getAllInst($instId) {
        $cols = ReservaTableColumns::reservaInstrumento();
        $stmt = $this->db->prepare("SELECT {$cols} FROM reserva_instrumento WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getInstSalasPermitidas($idReservaInstrumento, int $instId) {
        $stmt = $this->db->prepare(
            "SELECT permitida.IdSalaReserva FROM reserva_instrumento_sala_permitida permitida
             JOIN reserva_instrumento instr ON instr.IdReservaInstrumento = permitida.IdReservaInstrumento
             JOIN reserva_sala sala ON sala.IdSalaReserva = permitida.IdSalaReserva
             WHERE permitida.IdReservaInstrumento = ? AND instr.IdInstitucion = ? AND sala.IdInstitucion = ?"
        );
        $stmt->execute([$idReservaInstrumento, $instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function saveInst($data, $salasPermitidas = []) {
        $instId = (int)($data['IdInstitucion'] ?? 0);
        if ($instId <= 0) throw new \InvalidArgumentException('Institución inválida.');
        try {
            $this->db->beginTransaction();

            if(empty($data['IdReservaInstrumento'])) {
            $sql = "INSERT INTO reserva_instrumento (NombreInstrumento, cantidad, detalleInstrumento, IdInstitucion, habilitado) VALUES (?, ?, ?, ?, 1)";
            $this->db->prepare($sql)->execute([$data['NombreInstrumento'], $data['cantidad'], $data['detalleInstrumento'], $data['IdInstitucion']]);
            $idInstrumento = $this->db->lastInsertId();
            Auditoria::log($this->db, 'INSERT', 'reserva_instrumento', "Agregó instrumento: " . $data['NombreInstrumento']);
            } else {
            $this->assertInstrumentoOwned((int)$data['IdReservaInstrumento'], $instId);
            $hab = $data['habilitado'] ?? 1;
            $sql = "UPDATE reserva_instrumento SET NombreInstrumento=?, cantidad=?, detalleInstrumento=?, habilitado=? WHERE IdReservaInstrumento=? AND IdInstitucion=?";
            $this->db->prepare($sql)->execute([$data['NombreInstrumento'], $data['cantidad'], $data['detalleInstrumento'], $hab, $data['IdReservaInstrumento'], $instId]);
            Auditoria::log($this->db, 'UPDATE', 'reserva_instrumento', "Modificó instrumento ID: " . $data['IdReservaInstrumento']);
                $idInstrumento = $data['IdReservaInstrumento'];
            }

            // Salas permitidas: si el array viene vacío => disponibilidad global => borramos cualquier restricción
            $this->db->prepare("DELETE FROM reserva_instrumento_sala_permitida WHERE IdReservaInstrumento = ?")->execute([$idInstrumento]);

            if (!empty($salasPermitidas)) {
                $sqlPerm = "INSERT INTO reserva_instrumento_sala_permitida (IdReservaInstrumento, IdSalaReserva) VALUES (?, ?)";
                $stmtPerm = $this->db->prepare($sqlPerm);
                foreach ($salasPermitidas as $idSala) {
                    $idSalaInt = (int)$idSala;
                    if ($idSalaInt > 0) {
                        $this->assertSalaOwned($idSalaInt, $instId);
                        $stmtPerm->execute([(int)$idInstrumento, $idSalaInt]);
                    }
                }
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function toggleInst($id, $status, int $instId) {
        $id = (int)$id;
        $this->assertInstrumentoOwned($id, $instId);
        $this->db->prepare("UPDATE reserva_instrumento SET habilitado = ? WHERE IdReservaInstrumento = ? AND IdInstitucion = ?")->execute([$status, $id, $instId]);
        Auditoria::log($this->db, 'UPDATE', 'reserva_instrumento', "Cambió estado a $status de Instrumento ID: $id");
    }

    public function generarQrSala($instId, $idSala) {
        $idSala = (int)$idSala;
        if ($idSala <= 0) return ['status' => 'error', 'message' => 'Sala inválida'];

        $stmt = $this->db->prepare("SELECT IdSalaReserva, QrToken FROM reserva_sala WHERE IdInstitucion = ? AND IdSalaReserva = ? LIMIT 1");
        $stmt->execute([$instId, $idSala]);
        $sala = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$sala) return ['status' => 'error', 'message' => 'Sala no encontrada'];

        $token = $sala['QrToken'];
        if (!$token) {
            $token = $this->randomToken(10);
            $this->db->prepare("UPDATE reserva_sala SET QrToken = ? WHERE IdSalaReserva = ?")->execute([$token, $idSala]);
            Auditoria::log($this->db, 'UPDATE', 'reserva_sala', "Generó QR token para Sala ID: $idSala");
        }

        return ['status' => 'success', 'codigo' => $token];
    }

    /**
     * Token único por institución para la vista QR de todas las salas (puerta / cartel general).
     */
    public function generarQrInstitucion(int $instId) {
        if ($instId <= 0) {
            return ['status' => 'error', 'message' => 'Institución inválida'];
        }
        try {
            $stmt = $this->db->prepare("SELECT IdInstitucion, ReservaQrTokenGeneral FROM institucion WHERE IdInstitucion = ? LIMIT 1");
            $stmt->execute([$instId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Ejecute la migración ReservaQrTokenGeneral en institucion.'];
        }
        if (!$row) {
            return ['status' => 'error', 'message' => 'Institución no encontrada'];
        }

        $token = $row['ReservaQrTokenGeneral'];
        if (!$token) {
            $token = $this->randomToken(12);
            $this->db->prepare("UPDATE institucion SET ReservaQrTokenGeneral = ? WHERE IdInstitucion = ?")->execute([$token, $instId]);
            Auditoria::log($this->db, 'UPDATE', 'institucion', "Generó QR token general reservas IdInstitucion: $instId");
        }

        return ['status' => 'success', 'codigo' => $token];
    }

    public function getModoAprobacion($instId) {
        // Si la columna no existe aún, devolvemos default 0
        try {
            $stmt = $this->db->prepare("SELECT ReservasRequierenAprobacion FROM institucion WHERE IdInstitucion = ? LIMIT 1");
            $stmt->execute([$instId]);
            $v = $stmt->fetchColumn();
            return ['status' => 'success', 'data' => ['requiereAprobacion' => (int)($v ?? 0)]];
        } catch (\Exception $e) {
            return ['status' => 'success', 'data' => ['requiereAprobacion' => 0]];
        }
    }

    public function setModoAprobacion($instId, $input) {
        $requiere = (int)($input['requiereAprobacion'] ?? 0) ? 1 : 0;
        try {
            $stmt = $this->db->prepare("UPDATE institucion SET ReservasRequierenAprobacion = ? WHERE IdInstitucion = ?");
            $stmt->execute([$requiere, $instId]);
            Auditoria::log($this->db, 'UPDATE', 'institucion', "ReservasRequierenAprobacion=$requiere (IdInstitucion=$instId)");
            return ['status' => 'success'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'No se pudo guardar la configuración'];
        }
    }

    private function randomToken($len = 10) {
        $alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
        $out = '';
        for ($i = 0; $i < $len; $i++) $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        return $out;
    }
}