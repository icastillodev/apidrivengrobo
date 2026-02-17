<?php
namespace App\Controllers;

use App\Models\Protocol\ProtocolModel;

class ProtocolController {
    private $db;
    private $model;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new ProtocolModel($db);
    }

    /**
     * Obtiene la lista principal de protocolos para la grilla
     */
    public function getByInstitution() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $instId = $_GET['inst'] ?? null;

        if (!$instId) {
            echo json_encode(['status' => 'error', 'message' => 'ID de institución no proporcionado']);
            exit;
        }

        try {
            $data = $this->model->getByInstitution($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Obtiene datos maestros para llenar los selects del formulario (Usuarios, Deptos, Tipos, Severidad)
     */
    public function getFormData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $instId = $_GET['inst'] ?? null;
        
        try {
            $data = $this->model->getFormData($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Cuenta las solicitudes pendientes (Aprobado = 3) para el badge de notificación
     */
    public function getPendingCount() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? null;
        
        try {
            $count = $this->model->getPendingRequestsCount($instId);
            echo json_encode(['status' => 'success', 'count' => $count]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Obtiene las especies asignadas a un protocolo específico (para edición)
     */
    public function getSpeciesByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $id = $_GET['id'] ?? null;
        
        try {
            $data = $this->model->getProtocolSpecies($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Guarda o Actualiza un protocolo (Transacción completa)
     */
    public function save() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = $_POST;
        $id = $_GET['id'] ?? null; // Si viene ID es Update, sino Insert
        $instId = $_GET['inst'] ?? $data['IdInstitucion'] ?? null;

        try {
            $this->db->beginTransaction();

            // 1. Obtener nombre completo del Responsable (Usuario) para campo histórico
            $stmtUser = $this->db->prepare("SELECT NombreA, ApellidoA FROM personae WHERE IdUsrA = ?");
            $stmtUser->execute([$data['IdUsrA']]);
            $userRow = $stmtUser->fetch(\PDO::FETCH_ASSOC);
            $nombreEncargado = $userRow ? trim($userRow['NombreA'] . ' ' . $userRow['ApellidoA']) : '---';

            // 2. Determinar si es Externo (Otros CEUAS)
            $isExterno = isset($data['protocoloexpe']) ? 1 : 0;
            
            // Si es externo, usamos el texto manual. Si es interno, usamos el ID del select (o string vacío si no eligió)
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
            }

            // 3. Gestionar tabla PROTDEPTOR (Relación Depto Interno)
            // Siempre borramos la relación anterior para evitar duplicados o inconsistencias
            $this->db->prepare("DELETE FROM protdeptor WHERE idprotA = ?")->execute([$currentId]);
            
            // Solo insertamos si es Interno y se seleccionó un ID de departamento válido
            if ($isExterno == 0 && !empty($data['departamento']) && is_numeric($data['departamento'])) {
                $stmtD = $this->db->prepare("INSERT INTO protdeptor (idprotA, iddeptoA) VALUES (?, ?)");
                $stmtD->execute([$currentId, $data['departamento']]);
            }

            // 4. Sincronizar Especies (Tabla protesper)
            $this->db->prepare("DELETE FROM protesper WHERE idprotA = ?")->execute([$currentId]);
            
            if (isset($data['especies']) && is_array($data['especies'])) {
                $stmtE = $this->db->prepare("INSERT INTO protesper (idprotA, idespA) VALUES (?, ?)");
                // Filtramos duplicados en PHP por seguridad, aunque el front lo hace
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

    /**
     * Búsqueda general (Autocomplete o buscador)
     */
    public function searchForAlojamiento() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $term = $_GET['term'] ?? '';
        $instId = $_GET['inst'] ?? 1;

        try {
            $data = $this->model->searchForAlojamiento($term, $instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}