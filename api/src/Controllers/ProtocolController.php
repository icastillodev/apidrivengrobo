<?php
namespace App\Controllers;

use App\Models\Protocol\ProtocolModel;
use App\Utils\Auditoria; // <-- Seguridad

class ProtocolController {
    private $db;
    private $model;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new ProtocolModel($db);
    }

    public function getByInstitution() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion(); // Extrae instId seguro
            $data = $this->model->getByInstitution($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getFormData($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getPendingCount() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $count = $this->model->getPendingRequestsCount($sesion['instId']);
            echo json_encode(['status' => 'success', 'count' => $count]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getSpeciesByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            Auditoria::getDatosSesion();
            $data = $this->model->getProtocolSpecies($_GET['id'] ?? null);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function save() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = $_POST;
        $id = $_GET['id'] ?? null; 

        try {
            $sesion = Auditoria::getDatosSesion(); // Seguridad
            $instId = $sesion['instId'];
            
            $this->db->beginTransaction();

            $stmtUser = $this->db->prepare("SELECT NombreA, ApellidoA FROM personae WHERE IdUsrA = ?");
            $stmtUser->execute([$data['IdUsrA']]);
            $userRow = $stmtUser->fetch(\PDO::FETCH_ASSOC);
            $nombreEncargado = $userRow ? trim($userRow['NombreA'] . ' ' . $userRow['ApellidoA']) : '---';

            $isExterno = isset($data['protocoloexpe']) ? 1 : 0;
            $deptoValue = ($isExterno == 1) ? ($data['departamento_manual'] ?? '') : ($data['departamento'] ?? '');

            if ($id) {
                // UPDATE
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
                Auditoria::logManual($this->db, $sesion['userId'], 'UPDATE', 'protocoloexpe', "Modificó protocolo ID: $currentId");
            } else {
                // INSERT
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
                Auditoria::logManual($this->db, $sesion['userId'], 'INSERT', 'protocoloexpe', "Creó protocolo: " . $data['nprotA']);
            }

            $this->db->prepare("DELETE FROM protdeptor WHERE idprotA = ?")->execute([$currentId]);
            
            if ($isExterno == 0 && !empty($data['departamento']) && is_numeric($data['departamento'])) {
                $stmtD = $this->db->prepare("INSERT INTO protdeptor (idprotA, iddeptoA) VALUES (?, ?)");
                $stmtD->execute([$currentId, $data['departamento']]);
            }

            $this->db->prepare("DELETE FROM protesper WHERE idprotA = ?")->execute([$currentId]);
            
            if (isset($data['especies']) && is_array($data['especies'])) {
                $stmtE = $this->db->prepare("INSERT INTO protesper (idprotA, idespA) VALUES (?, ?)");
                $uniqueSpecies = array_unique($data['especies']);
                foreach ($uniqueSpecies as $espId) {
                    if (!empty($espId)) {
                        $stmtE->execute([$currentId, $espId]);
                    }
                }
            }

            $this->db->commit();
            echo json_encode(['status' => 'success', 'message' => 'Protocolo guardado con éxito']);

        } catch (\Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error BD: ' . $e->getMessage()]);
        }
        exit;
    }

    public function searchForAlojamiento() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $term = $_GET['term'] ?? '';
            
            $data = $this->model->searchForAlojamiento($term, $sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function list() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getByInstitution($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'DB_QUERY_FAILURE: ' . $e->getMessage()]);
        }
        exit;
    }
}