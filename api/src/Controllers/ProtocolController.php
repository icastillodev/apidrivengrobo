<?php
namespace App\Controllers;

use App\Models\Protocol\ProtocolModel;

class ProtocolController {
    private $db;
    private $model;

    public function __construct($db) {
        $this->db = $db; // Guardamos la conexión
        $this->model = new ProtocolModel($db);
    }

    public function getByInstitution() {
        if (ob_get_length()) ob_clean();

        $instId = $_GET['inst'] ?? null;

        if (!$instId) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'ID de institución no proporcionado']);
            exit;
        }

        // Llamamos al método del modelo
        $data = $this->model->getByInstitution($instId);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();

        $instId = $_GET['inst'] ?? null;

        if (!$instId) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'ID de institución faltante']);
            exit;
        }

        // Usamos el modelo para obtener los datos
        $data = $this->model->getFormData($instId);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

    public function save() {
    if (ob_get_length()) ob_clean();
    $data = $_POST;
    $id = $_GET['id'] ?? null;
    $instId = $_GET['inst'] ?? $data['IdInstitucion'] ?? null;

    try {
        $this->db->beginTransaction();

        // 1. Obtener nombre del Responsable Protocolo (Usuario) desde personae
        $stmtUser = $this->db->prepare("SELECT NombreA, ApellidoA FROM personae WHERE IdUsrA = ?");
        $stmtUser->execute([$data['IdUsrA']]);
        $userRow = $stmtUser->fetch(\PDO::FETCH_ASSOC);
        $nombreEncargado = $userRow ? trim($userRow['NombreA'] . ' ' . $userRow['ApellidoA']) : '---';

        $isExterno = isset($data['protocoloexpe']) ? 1 : 0;
        // Depto manual si es externo, sino guardamos el ID para protdeptor
        $deptoValue = ($isExterno == 1) ? ($data['departamento_manual'] ?? '') : ($data['departamento'] ?? '');

        if ($id) {
            // MODO UPDATE
            $sql = "UPDATE protocoloexpe SET 
                        tituloA = ?, nprotA = ?, InvestigadorACargA = ?, encargaprot = ?, 
                        CantidadAniA = ?, FechaIniProtA = ?, FechaFinProtA = ?, 
                        departamento = ?, tipoprotocolo = ?, severidad = ?, 
                        IdUsrA = ?, protocoloexpe = ?
                    WHERE idprotA = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $data['tituloA'], $data['nprotA'], $data['InvestigadorACargA'], $nombreEncargado,
                $data['CantidadAniA'], $data['FechaIniProtA'], $data['FechaFinProtA'], 
                $deptoValue, $data['tipoprotocolo'], $data['severidad'], 
                $data['IdUsrA'], $isExterno, $id
            ]);
            $currentId = $id;
        } else {
            // MODO INSERT
            $sql = "INSERT INTO protocoloexpe (
                        tituloA, nprotA, InvestigadorACargA, encargaprot, 
                        CantidadAniA, FechaIniProtA, FechaFinProtA, departamento, 
                        tipoprotocolo, severidad, IdUsrA, IdInstitucion, protocoloexpe
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $data['tituloA'], $data['nprotA'], $data['InvestigadorACargA'], $nombreEncargado,
                $data['CantidadAniA'], $data['FechaIniProtA'], $data['FechaFinProtA'], $deptoValue,
                $data['tipoprotocolo'], $data['severidad'], $data['IdUsrA'], $instId, $isExterno
            ]);
            $currentId = $this->db->lastInsertId();
        }

        // 2. Gestionar tabla PROTDEPTOR (Solo si es interno)
        $this->db->prepare("DELETE FROM protdeptor WHERE idprotA = ?")->execute([$currentId]);
        if ($isExterno == 0 && !empty($data['departamento'])) {
            $stmtD = $this->db->prepare("INSERT INTO protdeptor (idprotA, iddeptoA) VALUES (?, ?)");
            $stmtD->execute([$currentId, $data['departamento']]);
        }

        // 3. Sincronizar Especies (protesper)
        $this->db->prepare("DELETE FROM protesper WHERE idprotA = ?")->execute([$currentId]);
        if (isset($data['especies']) && is_array($data['especies'])) {
            $stmtE = $this->db->prepare("INSERT INTO protesper (idprotA, idespA) VALUES (?, ?)");
            foreach ($data['especies'] as $espId) {
                if (!empty($espId)) $stmtE->execute([$currentId, $espId]);
            }
        }

        $this->db->commit();
        echo json_encode(['status' => 'success', 'message' => 'Protocolo guardado con éxito']);
    } catch (\Exception $e) {
        if ($this->db->inTransaction()) $this->db->rollBack();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
    }
    
    public function getSpeciesByProtocol() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'ID no proporcionado']);
            exit;
        }
        $data = $this->model->getProtocolSpecies($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }


}