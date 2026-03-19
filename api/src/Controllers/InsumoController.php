<?php
namespace App\Controllers;

use App\Models\Insumo\InsumoModel;
use App\Utils\Auditoria;
use App\Utils\VisorHelper;

class InsumoController {
    private $model;
    private $db;

    public function __construct($db) { 
        $this->db = $db;
        $this->model = new InsumoModel($db); 
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getAllByInstitution($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
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
            Auditoria::getDatosSesion();
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