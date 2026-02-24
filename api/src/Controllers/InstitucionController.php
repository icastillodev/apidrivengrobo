<?php
namespace App\Controllers;

use App\Models\Admin\InstitucionModel;
use App\Utils\Auditoria;

class InstitucionController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InstitucionModel($db);
    }

    private function sendJSON($data, $code = 200) {
        if (ob_get_length()) ob_clean(); 
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit; 
    }

    public function list() {
        try {
            Auditoria::getDatosSesion(); 
            $data = $this->model->getAllInstitutions();
            $this->sendJSON(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            // AHORA DEVOLVERÁ 500 (Error Interno) EN LUGAR DE 401
            $this->sendJSON(['status' => 'error', 'message' => 'Error BD: ' . $e->getMessage()], 500);
        }
    }

    public function getCatalogoModulos() {
        try {
            Auditoria::getDatosSesion(); 
            $data = $this->model->getModulosMaestros();
            $this->sendJSON(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        try {
            Auditoria::getDatosSesion(); // Seguridad SuperAdmin
            if (empty($data['NombreInst'])) throw new \Exception("Nombre obligatorio");
            
            $id = $this->model->crearInstitucionCompleta($data);
            $this->sendJSON(['status' => 'success', 'data' => ['id' => $id]]);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update() {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['IdInstitucion'] ?? null;
        try {
            Auditoria::getDatosSesion(); // Seguridad SuperAdmin
            
            if (!$id) throw new \Exception("ID de institución no válido.");
            $this->model->updateInstitucion($id, $data);
            $this->sendJSON(['status' => 'success', 'message' => 'Datos actualizados correctamente']);
        } catch (\Exception $e) {
            $this->sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getGlobalStats() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // 1. Validamos que el usuario tenga sesión y sea SuperAdmin
            $sesion = \App\Utils\Auditoria::getDatosSesion();
            if ($sesion['role'] != 1) {
                throw new \Exception("Acceso denegado: No tienes privilegios de Master.");
            }

            // 2. Calculamos las estadísticas reales (Asegúrate de que estas tablas se llamen así en tu BD)
            // Si tu tabla de usuarios se llama distinto (ej: tipousuarioe, o usuarios), cámbialo abajo.
            $totSedes = $this->db->query("SELECT COUNT(*) FROM institucion")->fetchColumn();
            $totUsuarios = $this->db->query("SELECT COUNT(*) FROM usuarioe")->fetchColumn();
            $totProtocolos = $this->db->query("SELECT COUNT(*) FROM protocoloexpe")->fetchColumn(); // Revisa el nombre de tu tabla

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'totalSedes' => (int)$totSedes,
                    'totalUsuarios' => (int)$totUsuarios,
                    'totalProtocolos' => (int)$totProtocolos
                ]
            ]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error', 
                'message' => 'Error en BD: ' . $e->getMessage()
            ]);
        }
        exit;
    }
}