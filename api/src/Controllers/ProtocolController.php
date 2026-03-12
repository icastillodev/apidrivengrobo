<?php
namespace App\Controllers;

use App\Models\Protocol\ProtocolModel;
use App\Utils\Auditoria; // <-- Seguridad
use App\Models\Services\MailService;

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
            // ✅ Respetar la institución que manda el Front (como en animales/reactivos)
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $data = $this->model->getByInstitution($targetInst);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $data = $this->model->getFormData($targetInst);
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
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $count = $this->model->getPendingRequestsCount($targetInst);
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
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getProtocolSpecies($_GET['id'] ?? null, (int)$sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getAttachmentsByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $idprotA = isset($_GET['idprot']) ? (int)$_GET['idprot'] : 0;
            if ($idprotA <= 0) {
                throw new \Exception('ID de protocolo inválido');
            }

            $data = $this->model->getAttachmentsByProtocol($idprotA, $sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function downloadManualAttachment() {
        if (ob_get_length()) ob_clean();

        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo 'ID inválido';
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $att = $this->model->getManualAttachmentById($id, (int)$sesion['instId']);
            if (!$att) {
                http_response_code(404);
                echo 'Adjunto manual no encontrado';
                exit;
            }

            $b2 = new \App\Utils\BackblazeB2();
            $b2->streamDownload($att['file_key'], $att['nombre_original']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo 'Error al descargar el archivo: ' . $e->getMessage();
            exit;
        }
    }

    public function deleteManualAttachment() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $input = json_decode(file_get_contents('php://input'), true) ?: [];
            $id = isset($input['id']) ? (int)$input['id'] : 0;
            if ($id <= 0) {
                throw new \Exception('ID de adjunto inválido.');
            }

            $this->model->deleteManualAttachment($id, (int)$sesion['instId']);
            Auditoria::logManual($this->db, (int)$sesion['userId'], 'DELETE', 'protocoloexpeadjuntos', "Borró adjunto manual ID: {$id}");
            echo json_encode(['status' => 'success', 'message' => 'Adjunto eliminado correctamente.']);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getNetworkStatusByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $idprotA = isset($_GET['idprot']) ? (int)$_GET['idprot'] : 0;
            if ($idprotA <= 0) {
                throw new \Exception('ID de protocolo inválido');
            }

            $data = $this->model->getNetworkStatusByProtocol($idprotA, (int)$sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
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
            $targetId = $id ? (int)$id : 0;

            if ($targetId > 0) {
                $stmtOwner = $this->db->prepare("SELECT IdInstitucion FROM protocoloexpe WHERE idprotA = ? LIMIT 1");
                $stmtOwner->execute([$targetId]);
                $ownerInstId = (int)$stmtOwner->fetchColumn();
                if ($ownerInstId <= 0) {
                    throw new \Exception("Protocolo no encontrado.");
                }

                // Si es protocolo de otra institución (red), se guarda configuración local en protocoloexpered.
                if ($ownerInstId !== (int)$instId) {
                    $this->db->beginTransaction();
                    $this->model->saveRedInstitutionConfig($targetId, (int)$instId, $data);
                    $this->db->commit();
                    echo json_encode(['status' => 'success', 'message' => 'Configuración local de red guardada con éxito']);
                    exit;
                }
            }

            $this->db->beginTransaction();

            $stmtUser = $this->db->prepare("SELECT NombreA, ApellidoA FROM personae WHERE IdUsrA = ?");
            $stmtUser->execute([$data['IdUsrA']]);
            $userRow = $stmtUser->fetch(\PDO::FETCH_ASSOC);
            $nombreEncargado = $userRow ? trim($userRow['NombreA'] . ' ' . $userRow['ApellidoA']) : '---';

            $isExterno = isset($data['protocoloexpe']) ? 1 : 0;
            $deptoValue = ($isExterno == 1) ? ($data['departamento_manual'] ?? '') : ($data['departamento'] ?? '');

            // Normalización y validación de fechas según esquema (DATE NULL) y reglas de negocio
            $rawIni = isset($data['FechaIniProtA']) ? trim($data['FechaIniProtA']) : '';
            $rawFin = isset($data['FechaFinProtA']) ? trim($data['FechaFinProtA']) : '';

            $fechaIni = $rawIni === '' ? null : $rawIni;
            $fechaFin = $rawFin === '' ? null : $rawFin;

            // Validar formato Y-m-d si vienen valores
            foreach (['inicio' => $fechaIni, 'vencimiento' => $fechaFin] as $label => $val) {
                if ($val !== null) {
                    $dt = \DateTime::createFromFormat('Y-m-d', $val);
                    if (!$dt || $dt->format('Y-m-d') !== $val) {
                        throw new \Exception("La fecha de {$label} del protocolo no es válida.");
                    }
                }
            }

            // Regla de negocio: si ambas fechas existen, Fin >= Ini
            if ($fechaIni !== null && $fechaFin !== null && $fechaFin < $fechaIni) {
                throw new \Exception("La fecha de vencimiento del protocolo no puede ser anterior a la fecha de inicio.");
            }

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
                    $data['CantidadAniA'], $fechaIni, $fechaFin, 
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
                    $data['CantidadAniA'], $fechaIni, $fechaFin, $deptoValue,
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

            // Adjuntos manuales (solo protocolos manuales sin solicitud local).
            if (!empty($_FILES)) {
                $this->model->saveManualAttachments((int)$currentId, (int)$instId, $_FILES);
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

    public function deleteManual() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $input = json_decode(file_get_contents('php://input'), true) ?: [];

            $idprotA = isset($input['idprot']) ? (int)$input['idprot'] : 0;
            $password = (string)($input['password'] ?? '');
            if ($idprotA <= 0) {
                throw new \Exception('ID de protocolo inválido.');
            }

            $result = $this->model->deleteManualProtocol($idprotA, (int)$sesion['instId'], (int)$sesion['userId'], $password, (int)$sesion['role']);
            Auditoria::logManual($this->db, (int)$sesion['userId'], 'DELETE', 'protocoloexpe', "Borró protocolo manual ID: {$idprotA}");

            echo json_encode(['status' => 'success', 'message' => 'Protocolo borrado correctamente.', 'data' => $result]);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function rejectApprovedRequest() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            if (!in_array((int)$sesion['role'], [1, 2, 4], true)) {
                throw new \Exception('No tienes permisos para rechazar solicitudes.');
            }

            $input = json_decode(file_get_contents('php://input'), true) ?: [];
            $idprotA = isset($input['idprot']) ? (int)$input['idprot'] : 0;
            $motivo = trim((string)($input['motivo'] ?? ''));
            if ($idprotA <= 0) {
                throw new \Exception('ID de protocolo inválido.');
            }
            if ($motivo === '') {
                throw new \Exception('Debes escribir el motivo del rechazo.');
            }

            $info = $this->model->rejectApprovedSolicitudProtocol($idprotA, (int)$sesion['instId'], $motivo);
            Auditoria::logManual($this->db, (int)$sesion['userId'], 'UPDATE_SOLICITUD', 'solicitudprotocolo', "Rechazó solicitud aprobada de protocolo ID: {$idprotA}");

            if (!empty($info['Email'])) {
                $mailer = new MailService();
                $mailer->sendProtocolDecision(
                    $info['Email'],
                    $info['NombreUser'] ?: 'Usuario',
                    $info['tituloA'] ?: ('Protocolo #' . $idprotA),
                    2,
                    $motivo,
                    $info['InstName'] ?: 'Institución',
                    null,
                    $info['lang'] ?? 'es'
                );
            }

            echo json_encode(['status' => 'success', 'message' => 'Solicitud rechazada y notificada al usuario.']);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}