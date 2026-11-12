<?php
namespace App\Controllers;

use App\Models\UserForms\UserFormsModel;
use App\Utils\Auditoria;

class UserFormsController {
    private $model;

    public function __construct($db) {
        $this->model = new UserFormsModel($db);
    }

    public function getMyForms() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: private, no-store, max-age=0');

        try {
            // Seguridad: IDs exclusivos del JWT; jamás aceptar el user/inst del navegador.
            $sesion = Auditoria::getDatosSesion();
            $userId = (int)$sesion['userId'];
            $instId = (int)($sesion['instId'] ?? 0);
            $started = microtime(true);
            if (($_GET['meta'] ?? '') === '1') {
                $data = $this->model->getMyFormsFilterMeta($userId, $instId);
            } elseif (($_GET['paged'] ?? '') === '1') {
                foreach (['limit', 'offset'] as $key) {
                    if (isset($_GET[$key]) && (!is_scalar($_GET[$key])
                        || !preg_match('/^\d{1,9}$/', (string)$_GET[$key]))) {
                        throw new \InvalidArgumentException('Paginación inválida');
                    }
                }
                $limit = min(100, max(1, (int)($_GET['limit'] ?? 12)));
                $offset = max(0, (int)($_GET['offset'] ?? 0));
                $data = $this->model->getAllForms($userId, $instId, [
                    'limit' => $limit, 'offset' => $offset,
                ]);
            } else {
                // Contrato legacy: integraciones antiguas siguen recibiendo el historial completo.
                $data = $this->model->getAllForms($userId, $instId);
            }
            header('Server-Timing: user-forms-db;dur=' . round((microtime(true) - $started) * 1000, 1));
            echo json_encode(['status' => 'success', 'data' => $data],
                JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } catch (\Throwable $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        }
        exit;
    }

    public function getFormDetail($id = null) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        if (empty($id)) {
            $uriParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/'));
            $id = end($uriParts);
            if (strpos((string)$id, '?') !== false) $id = strstr((string)$id, '?', true);
        }
        
        if (!is_numeric($id)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'ID inválido']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $detail = $this->model->getDetail((int)$id, $sesion['userId'], (int)($sesion['instId'] ?? 0));
            echo json_encode(['status' => 'success', 'data' => $detail]);
        } catch (\Exception $e) {
            $msg = $e->getMessage();
            if ($msg === 'Formulario no encontrado' || strpos($msg, 'no encontrado') !== false) {
                http_response_code(404);
            } elseif (strpos($msg, 'token') !== false || strpos($msg, 'credencial') !== false || strpos($msg, 'expirado') !== false) {
                http_response_code(401);
            } else {
                http_response_code(500);
                error_log("UserFormsController getFormDetail error: " . $e->getMessage() . " | " . $e->getTraceAsString());
            }
            echo json_encode(['status' => 'error', 'message' => $msg]);
        }
        exit;
    }

    public function getMyPaymentsHistory() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getMyPaymentsHistory((int)$sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolsUsedInForms() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getProtocolsUsedInForms($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getInsumosPedidos() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getInsumosPedidosByUser($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getInsumosExperimentalesPedidos() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $list = $this->model->getInsumosExperimentalesPedidosByUser($sesion['userId']);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}