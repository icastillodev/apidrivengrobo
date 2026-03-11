<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigEspeciesModel;
use App\Utils\Auditoria; // <-- IMPORTANTE

class AdminConfigEspeciesController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminConfigEspeciesModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getTree($sesion['instId']);
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveEspecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $_POST['instId'] = $sesion['instId'];
            
            $this->model->saveEspecie($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteEspecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion();
            
            $res = $this->model->deleteEspecie($_POST['idEsp']);
            echo json_encode(['status' => 'success', 'mode' => $res]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveSubespecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Aseguramos que existe el token
            
            $this->model->saveSubespecie($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleSubespecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Validamos seguridad

            $this->model->toggleSubespecie($_POST['idSub'], $_POST['status']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteSubespecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idSub = $_POST['idSub'] ?? null;
            if (!$idSub) {
                throw new \Exception("Falta el ID de la subespecie.");
            }
            $this->model->deleteSubespecie($idSub, $sesion['instId']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleEspecie() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Validamos seguridad

            $idEsp   = $_POST['idEsp']   ?? null;
            $status  = $_POST['status']  ?? null;
            if (!$idEsp || !$status) {
                throw new \Exception("Parámetros incompletos para cambiar estado de especie.");
            }

            $this->model->toggleEspecie($idEsp, $status);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getCepas() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idSub = $_GET['idsubespA'] ?? null;
            if (!$idSub) {
                throw new \Exception("Falta idsubespA.");
            }
            $data = $this->model->getCepasBySubespecieAdmin($sesion['instId'], $idSub);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function saveCepa() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idSub = $_POST['idsubespA'] ?? null;
            $nombre = $_POST['CepaNombreA'] ?? null;
            if (!$idSub || !$nombre) {
                throw new \Exception("Parámetros incompletos para guardar cepa.");
            }
            $this->model->saveCepa($sesion['instId'], $idSub, $nombre);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function toggleCepa() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $idCepa = $_POST['idcepaA'] ?? null;
            $status = $_POST['Habilitado'] ?? $_POST['status'] ?? null;
            if (!$idCepa || $status === null) {
                throw new \Exception("Parámetros incompletos para cambiar estado de cepa.");
            }
            $this->model->toggleCepa($sesion['instId'], $idCepa, $status);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}