<?php
namespace App\Models\AdminConfig;
use PDO;

class AdminConfigReservasModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

    // --- SALAS ---
    public function getAllSalas($instId) {
        $stmt = $this->db->prepare("SELECT * FROM reserva_sala WHERE IdInstitucion = ? ORDER BY Nombre ASC");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSalaDetail($id) {
        $sala = $this->db->prepare("SELECT * FROM reserva_sala WHERE IdSalaReserva = ?")->execute([$id]);
        $sala = $this->db->prepare("SELECT * FROM reserva_sala WHERE IdSalaReserva = ?");
        $sala->execute([$id]);
        $salaData = $sala->fetch(PDO::FETCH_ASSOC);

        $horarios = $this->db->prepare("SELECT * FROM reserva_horariospordiasala WHERE IdSalaReserva = ?");
        $horarios->execute([$id]);
        
        return ['sala' => $salaData, 'horarios' => $horarios->fetchAll(PDO::FETCH_ASSOC)];
    }

    public function saveSala($data, $horarios) {
        try {
            $this->db->beginTransaction();

            // 1. Guardar/Actualizar Sala
            if(empty($data['IdSalaReserva'])) {
                $sql = "INSERT INTO reserva_sala (Nombre, Lugar, tipohorasalas, IdInstitucion, habilitado) VALUES (?, ?, ?, ?, 1)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$data['Nombre'], $data['Lugar'], $data['tipohorasalas'], $data['IdInstitucion']]);
                $idSala = $this->db->lastInsertId();
            } else {
                $idSala = $data['IdSalaReserva'];
                $hab = $data['habilitado'] ?? 1;
                $sql = "UPDATE reserva_sala SET Nombre=?, Lugar=?, tipohorasalas=?, habilitado=? WHERE IdSalaReserva=?";
                $this->db->prepare($sql)->execute([$data['Nombre'], $data['Lugar'], $data['tipohorasalas'], $hab, $idSala]);
            }

            // 2. Actualizar Horarios (Estrategia: Borrar todos y re-insertar los activos)
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

    public function toggleSala($id, $status) {
        $this->db->prepare("UPDATE reserva_sala SET habilitado = ? WHERE IdSalaReserva = ?")->execute([$status, $id]);
    }

    public function updateGlobalTimeType($instId, $type) {
        $this->db->prepare("UPDATE reserva_sala SET tipohorasalas = ? WHERE IdInstitucion = ?")->execute([$type, $instId]);
    }

    // --- INSTRUMENTOS ---
    public function getAllInst($instId) {
        $stmt = $this->db->prepare("SELECT * FROM reserva_instrumento WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function saveInst($data) {
        if(empty($data['IdReservaInstrumento'])) {
            $sql = "INSERT INTO reserva_instrumento (NombreInstrumento, cantidad, detalleInstrumento, IdInstitucion, habilitado) VALUES (?, ?, ?, ?, 1)";
            $this->db->prepare($sql)->execute([$data['NombreInstrumento'], $data['cantidad'], $data['detalleInstrumento'], $data['IdInstitucion']]);
        } else {
            $hab = $data['habilitado'] ?? 1;
            $sql = "UPDATE reserva_instrumento SET NombreInstrumento=?, cantidad=?, detalleInstrumento=?, habilitado=? WHERE IdReservaInstrumento=?";
            $this->db->prepare($sql)->execute([$data['NombreInstrumento'], $data['cantidad'], $data['detalleInstrumento'], $hab, $data['IdReservaInstrumento']]);
        }
    }

    public function toggleInst($id, $status) {
        $this->db->prepare("UPDATE reserva_instrumento SET habilitado = ? WHERE IdReservaInstrumento = ?")->execute([$status, $id]);
    }
}