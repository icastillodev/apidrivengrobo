<?php
namespace App\Controllers;

use App\Models\Insumo\InsumoModel;
use App\Utils\Auditoria;
use App\Utils\VisorHelper;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class InsumoController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) { 
        $this->db = $db;
        $this->model = new InsumoModel($db); 
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloWithRequestInstOrExit($sesion, 'insumos', $_GET['inst'] ?? null);
            $targetInst = $_GET['inst'] ?? $sesion['instId'];

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 0;
            $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;

            $filters = [
                'q' => isset($_GET['q']) ? trim((string)$_GET['q']) : '',
                'status' => isset($_GET['status']) ? trim((string)$_GET['status']) : 'all',
                'deriv' => isset($_GET['deriv']) ? trim((string)$_GET['deriv']) : 'all',
                'retiro' => isset($_GET['retiro']) ? trim((string)$_GET['retiro']) : '',
                'origin' => isset($_GET['origin']) ? trim((string)$_GET['origin']) : '',
                'idformA' => isset($_GET['idformA']) ? (int)$_GET['idformA'] : 0,
                'filter_col' => isset($_GET['filter_col']) ? trim((string)$_GET['filter_col']) : 'all',
                'sort_key' => isset($_GET['sort_key']) ? trim((string)$_GET['sort_key']) : 'idformA',
                'sort_dir' => isset($_GET['sort_dir']) ? trim((string)$_GET['sort_dir']) : 'DESC',
            ];

            $opts = ['filters' => $filters];
            if ($limit > 0) {
                $opts['limit'] = min(10000, max(1, $limit));
                $opts['offset'] = $offset;
            }

            $result = $this->model->getAllByInstitution($targetInst, $opts);

            header('Content-Type: application/json');
            if (\is_array($result) && isset($result['rows'], $result['total'])) {
                echo json_encode(['status' => 'success', 'data' => $result['rows'], 'total' => $result['total']]);
            } else {
                echo json_encode(['status' => 'success', 'data' => $result]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /** Opciones de filtro (p. ej. nombres de institución de origen) sin cargar todo el listado. */
    public function getFiltrosMeta() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloWithRequestInstOrExit($sesion, 'insumos', $_GET['inst'] ?? null);
            $targetInst = $_GET['inst'] ?? $sesion['instId'];
            $origenes = $this->model->getOrigenLabelsForInsumoForms($targetInst);
            echo json_encode(['status' => 'success', 'data' => ['origenes' => $origenes]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getDetails() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'insumos');
            $items = $this->model->getInsumosDetails($_GET['id'] ?? 0);
            echo json_encode(['status' => 'success', 'data' => $items]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getCatalog() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'insumos');
            $data = $this->model->getInsumosCatalog($sesion['instId']); 
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) { echo json_encode(['status' => 'error']); }
        exit;
    }

    public function updateStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'insumos');
            $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $estado = $data['estado'] ?? 'Sin estado';
            $data['instId'] = $sesion['instId'];

            // Visor = quien cambia el estado. Siempre nombre + apellido + ID desde BD.
            if (strtolower(trim($estado)) === 'sin estado') {
                $data['userName'] = "Falta revisar";
            } else {
                $data['userName'] = VisorHelper::getNombreApellidoYId($this->db, $sesion['userId']);
            }

            $success = $this->model->updateStatus($data);
            echo json_encode([
                'status' => $success ? 'success' : 'error',
                'quienvisto' => $data['userName'] ?? ''
            ]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFormData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'insumos');
            $deptos = $this->model->getDepartments($sesion['instId']);
            $types = $this->model->getAvailableTypes($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => ['deptos' => $deptos, 'types' => $types]]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateFull() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'insumos');
            $_POST['instId'] = $sesion['instId'];
            $_POST['userId'] = (int)($sesion['userId'] ?? 0);
            $success = $this->model->updateFullInsumo($_POST);
            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function sendNotification() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'insumos');
            $data = $_POST;
            $data['instId'] = $sesion['instId']; 
            
            $resumenInsumos = $this->model->getInsumosResumenText($data['idformA']);
            $mailService = new \App\Models\Services\MailService();
            $recipientLang = $this->model->getIdiomaByEmail($data['email']) ?? $data['lang'] ?? 'es';
            $mailSent = $mailService->sendInsumoNotification(
                $data['email'], $data['investigador'], $data['idformA'], 
                $data['mensaje'], $data['estado'], $resumenInsumos, "Institución",
                $data['slug'] ?? null,
                $recipientLang
            );

            if ($mailSent) {
                $this->model->saveNotification($data);
                echo json_encode(['status' => 'success']);
            } else {
                throw new \Exception("Error en el servidor de correo.");
            }
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}