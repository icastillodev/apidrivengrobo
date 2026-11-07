<?php
namespace App\Controllers;

use App\Models\TodosProtocolos\UsuarioTodosProtocolosModel;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class ControllerusuarioTodosProtocolos {
    private $model;

    public function __construct($db) {
        $this->model = new UsuarioTodosProtocolosModel($db);
    }

    public function getConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $homeInst = (int)($sesion['instId'] ?? 0);
            $requested = $_GET['inst'] ?? null;
            $targetInst = ($requested === null || $requested === '')
                ? $homeInst : filter_var($requested, FILTER_VALIDATE_INT);
            if ($targetInst === false || (int)$targetInst <= 0) {
                throw new \InvalidArgumentException('Debe seleccionar una institución válida.');
            }
            $targetInst = (int)$targetInst;
            if ($targetInst !== $homeInst && (int)($sesion['role'] ?? 0) !== 1) {
                // Solo instituciones relacionadas y activas para la red.
                $allowed = $this->model->getNetworkTargets($homeInst);
                $valid = false;
                foreach ($allowed as $candidate) {
                    if ((int)($candidate['IdInstitucion'] ?? 0) === $targetInst) {
                        $valid = true;
                        break;
                    }
                }
                if (!$valid) {
                    throw new \DomainException('Institución no disponible en la red.');
                }
            }
            $data = $this->model->getConfig($targetInst);
            $data['has_approved_vigent'] = $this->model->userHasApprovedVigentProtocol((int)($sesion['userId'] ?? 0));
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        }
        exit;
    }

    public function getAllLists() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            // Ignoramos el UID de la URL y usamos el seguro del JWT
            $instId = $sesion['instId'];
            $userId = $sesion['userId'];

            $my = $this->model->getMyProtocols($instId, $userId);
            $local = $this->model->getLocalProtocols($instId);
            $network = $this->model->getNetworkProtocols($instId);
            
            echo json_encode([
                'status' => 'success', 
                'data' => [
                    'my' => $my, 
                    'local' => $local, 
                    'network' => $network
                ]
            ]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $_POST['IdInstitucion'] = $sesion['instId']; // Inyectamos Inst Real
            
            $idSolicitud = $this->model->createInternal($_POST, $sesion['userId'], $_FILES ?? null);
            echo json_encode(['status' => 'success', 'idSolicitudProtocolo' => $idSolicitud]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateInternal() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->model->updateInternal(
                $_POST,
                (int) $sesion['userId'],
                (int) $sesion['instId'],
                $_FILES ?? null
            );
            echo json_encode(['status' => 'success']);
        } catch (\App\Utils\AuthenticationException $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        } catch (\DomainException $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        } catch (\InvalidArgumentException $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        } catch (\Exception $e) {
            error_log('Update protocol rejected: ' . get_class($e));
            http_response_code(400);
            echo json_encode(['status' => 'error',
                'message' => 'No se pudo actualizar el protocolo. Verifique los datos.']);
        }
        exit;
    }

    public function getSpeciesDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getProtocolSpecies(
                $id,
                (int)$sesion['userId'],
                (int)$sesion['instId']
            );
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        }
        exit;
    }

    public function getMyAttachments() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $solId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getUserAttachmentsBySolicitud($solId, $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getMyAttachmentsByProtocol() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $idprot = isset($_GET['idprot']) ? (int)$_GET['idprot'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getUserAttachmentsByProtocol($idprot, $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function downloadMyAttachment() {
        if (ob_get_length()) ob_clean();

        $attId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $att = $this->model->getUserAttachmentById($attId, $sesion['userId']);
            if (!$att) {
                http_response_code(404);
                echo 'Adjunto no encontrado o no autorizado.';
                exit;
            }

            $b2 = new \App\Utils\BackblazeB2('PROTOCOLOS');
            $b2->streamDownload($att['file_key'], $att['nombre_original']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo 'Error al descargar el archivo: ' . $e->getMessage();
            exit;
        }
    }

    public function getNetworkTargets() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getNetworkTargets($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createNetworkRequest() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            Auditoria::getDatosSesion();
            $this->model->createNetworkRequest($input);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getNetworkStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $idprot = isset($_GET['idprot']) ? (int)$_GET['idprot'] : 0;

        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getNetworkStatusByProtocol($idprot, $sesion['instId'], $sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}