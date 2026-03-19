<?php
namespace App\Controllers;

use App\Models\FormDerivacion\FormDerivacionModel;
use App\Utils\Auditoria;
use App\Utils\VisorHelper;

class FormDerivacionController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new FormDerivacionModel($db);
    }

    public function derive()
    {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $payload = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $payload['usrOrigen'] = $sesion['userId'];
            $payload['instOrigen'] = $this->resolveInstId($sesion, $payload);

            $res = $this->model->derive($payload);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function accept()
    {
        $this->resolve('accept');
    }

    public function returnToOrigin()
    {
        $this->resolve('return');
    }

    public function reject()
    {
        $this->resolve('reject');
    }

    public function cancel()
    {
        $this->resolve('cancel');
    }

    public function history()
    {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $idformA = $_GET['idformA'] ?? 0;
            $instCtx = $this->resolveInstId($sesion, $_GET);
            $data = $this->model->getHistory($idformA, $instCtx);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Throwable $e) {
            // Evita romper UI por controles de visibilidad; historial vacío es aceptable.
            echo json_encode(['status' => 'success', 'data' => [], 'warning' => $e->getMessage()]);
        }
        exit;
    }

    public function pending()
    {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $instCtx = $this->resolveInstId($sesion, $_GET);
            $data = $this->model->getPendingForInstitution($instCtx);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Throwable $e) {
            echo json_encode(['status' => 'success', 'data' => [], 'warning' => $e->getMessage()]);
        }
        exit;
    }

    public function targets()
    {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $instCtx = $this->resolveInstId($sesion, $_GET);
            if ($instCtx <= 0) {
                echo json_encode(['status' => 'success', 'data' => []]);
                exit;
            }
            $data = $this->model->getTargetsForInstitution($instCtx);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Throwable $e) {
            echo json_encode(['status' => 'success', 'data' => [], 'warning' => $e->getMessage()]);
        }
        exit;
    }

    public function getDestinoConfig()
    {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idformA = (int)($_GET['idformA'] ?? 0);
            $categoria = $_GET['categoria'] ?? '';
            $instCtx = $this->resolveInstId($sesion, $_GET);
            if ($idformA <= 0) {
                echo json_encode(['status' => 'success', 'data' => ['completa' => true, 'faltantes' => [], 'enviadoPor' => null]]);
                exit;
            }
            $data = $this->model->checkDestinoConfigCompleta($idformA, $instCtx, $categoria);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Throwable $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function markViewed()
    {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $idformA = (int)($input['idformA'] ?? 0);
            if ($idformA <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'ID de formulario inválido']);
                exit;
            }
            $quienvisto = VisorHelper::getNombreApellidoYId($this->db, $sesion['userId']);
            $this->model->markFormAsViewed($idformA, $quienvisto);
            echo json_encode(['status' => 'success', 'quienvisto' => $quienvisto]);
        } catch (\Throwable $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function resolve($action)
    {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $sesion = Auditoria::getDatosSesion();
            $payload = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $payload['usrAccion'] = $sesion['userId'];
            $payload['instAccion'] = $this->resolveInstId($sesion, $payload);

            if ($action === 'accept') {
                $res = $this->model->accept($payload);
            } elseif ($action === 'return') {
                $res = $this->model->returnToOrigin($payload);
            } elseif ($action === 'reject') {
                $res = $this->model->reject($payload);
            } elseif ($action === 'cancel') {
                $res = $this->model->cancel($payload);
            } else {
                throw new \Exception('Acción inválida');
            }

            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Para tipo 1 (superadmin), permite operar en una institución activa enviada por frontend.
     * Para el resto de roles, siempre usa la institución del token.
     */
    private function resolveInstId(array $sesion, array $source): int
    {
        $instSesion = (int)($sesion['instId'] ?? 0);
        $role = (int)($sesion['role'] ?? 0);
        if ($role === 1) {
            $instReq = (int)($source['inst'] ?? $source['instId'] ?? $source['instOrigen'] ?? $source['instAccion'] ?? 0);
            if ($instReq > 0) {
                return $instReq;
            }
        }
        return $instSesion;
    }
}
