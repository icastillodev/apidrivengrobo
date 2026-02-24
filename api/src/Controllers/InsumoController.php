<?php
namespace App\Controllers;

use App\Models\Insumo\InsumoModel;
use App\Utils\Auditoria;

class InsumoController {
    private $model;

    public function __construct($db) { 
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
            http_response_code(401);
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
            $data = $_POST;
            $data['userName'] = "Admin (ID: " . $sesion['userId'] . ")"; // Sobrescribe por seguridad

            $success = $this->model->updateStatus($data);
            echo json_encode(['status' => $success ? 'success' : 'error']);
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
            echo json_encode(['status' => 'success', 'data' => ['deptos' => $deptos]]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateFull() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion();
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
            $mailSent = $mailService->sendInsumoNotification(
                $data['email'], $data['investigador'], $data['idformA'], 
                $data['mensaje'], $data['estado'], $resumenInsumos, "Institución" 
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