<?php
namespace App\Controllers;

use App\Models\Alojamiento\AlojamientoModel;
use App\Utils\Auditoria;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class AlojamientoController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new AlojamientoModel($db);
    }

    public function list() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloWithRequestInstOrExit($sesion, 'alojamientos', $_GET['inst'] ?? null);
            $instParam = $_GET['inst'] ?? null;
            // Normalizar: si el front manda "NaN", "" o no es número válido, usar institución de la sesión
            $targetInst = null;
            if ($instParam !== null && $instParam !== '') {
                $targetInst = filter_var($instParam, FILTER_VALIDATE_INT);
                if ($targetInst === false || $targetInst < 0) {
                    $targetInst = null;
                }
            }
            if ($targetInst === null) {
                $targetInst = isset($sesion['instId']) ? (int) $sesion['instId'] : 0;
            }
            echo json_encode(['status' => 'success', 'data' => $this->model->getAllGrouped($targetInst)]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function history() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $id = $_GET['historia'] ?? 0;
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            echo json_encode(['status' => 'success', 'data' => $this->model->getHistory($id)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function finalizar() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        $historiaId = $data['historia'] ?? null;
        $fechaFin = $data['fechaFin'] ?? date('Y-m-d'); 

        if (!$historiaId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID de historia']);
            return;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $res = $this->model->finalizarHistoria($historiaId, $fechaFin);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    
    public function desfinalizar() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $res = $this->model->desfinalizarHistoria($data['historia']);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateRow() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['IdAlojamiento']) || !isset($data['historia'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            return;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $res = $this->model->updateRow($data); 
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteRow() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['IdAlojamiento']) || !isset($data['historia'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Datos insuficientes']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $res = $this->model->deleteRow($data['IdAlojamiento'], $data['historia']);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

public function save() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        // 1. Detectamos si es una actualización de tramo o un REGISTRO NUEVO
        $isUpdate = isset($data['is_update']) && ($data['is_update'] === true || $data['is_update'] === "true");

        // 2. Si es actualización, SÍ O SÍ necesitamos la historia. Si es nuevo, la dejamos pasar.
        if ($isUpdate && empty($data['historia'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Falta el ID de Historia para actualizar.']);
            return;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $data['IdInstitucion'] = $sesion['instId']; // Inyectamos InstId real
            
            // Mandamos a guardar al modelo (el modelo se encarga de crear la historia nueva si no existe)
            $res = $this->model->saveAlojamiento($data);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500); 
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
public function getTiposPorEspecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $idEsp = $_GET['idEsp'] ?? null;
        
        if (!$idEsp) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Falta el ID de la especie']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $data = $this->model->getTiposAlojamientoHabilitados($idEsp, $sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function updateConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['historia'], $data['idprotA'], $data['IdUsrA'], $data['idespA'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan IDs críticos para la configuración']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $res = $this->model->updateHistoryConfig($data);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updatePrice() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['IdAlojamiento']) || !isset($data['precio'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            exit;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $this->model->updatePrice($data['IdAlojamiento'], $data['precio']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    public function publicHistory() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // Ahora el frontend nos manda el código token, no el ID de historia
        $token = $_GET['token'] ?? ''; 

        try {
            if (empty($token) || strlen($token) !== 6) {
                throw new \Exception("Código de etiqueta inválido o corrupto.");
            }

            // Llamamos a la historia por su token (Sin Auditoria::getDatosSesion)
            $data = $this->model->getHistoryByToken($token);
            
            if (empty($data)) {
                throw new \Exception("Esta ficha no existe o el QR ha sido revocado.");
            }
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

public function generarAlojamientoQR() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $sesion = Auditoria::getDatosSesion(); // 🛡️ Validamos token y extraemos datos
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            
            $idUsuario = $sesion['userId'] ?? $sesion['IdUsrA'] ?? $sesion['id'] ?? 1;
            $instId = $sesion['instId'] ?? 1; // 🚀 Extraemos la institución
            
            // Pasamos los 3 parámetros al modelo
            $codigo = $this->model->generarCodigoQR($data['historia'], $idUsuario, $instId);
            
            echo json_encode(['status' => 'success', 'codigo' => $codigo]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}