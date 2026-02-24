<?php
namespace App\Controllers;

use App\Models\Reactivos\ReactivosModel;
use App\Models\Services\MailService; 
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class ReactivosController {
    private $model;

    public function __construct($db) {
        $this->model = new ReactivosModel($db);
    }

    public function getInitData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // Seguridad: ID Institución y User desde el Token
            $sesion = Auditoria::getDatosSesion();
            echo json_encode(['status' => 'success', 'data' => $this->model->getInitialData($sesion['instId'], $sesion['userId'])]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolInfo() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            Auditoria::getDatosSesion(); // Solo validamos que esté logueado
            $id = $_GET['id'] ?? 0;
            echo json_encode(['status' => 'success', 'data' => $this->model->getProtocolDetails($id)]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createOrder() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            // Inyectamos el ID de la sesión al array que va al modelo
            $sesion = Auditoria::getDatosSesion();
            $data['userId'] = $sesion['userId'];
            $data['instId'] = $sesion['instId'];

            // 1. Guardar Pedido 
            $res = $this->model->saveOrder($data);
            $idForm = $res['id'];
            $insumoName = $res['insumoName'];

            // 2. ENVIAR CORREO
            $userInfo = $this->model->getUserAndInstInfo($data['userId'], $data['instId']);
            $protInfo = $this->model->getProtocolDetails($data['idprotA']);

            $mailData = [
                'id' => $idForm,
                'protocolo' => ($protInfo['nprotA'] ?? 'S/D') . ' - ' . ($protInfo['tituloA'] ?? ''),
                'insumo' => $insumoName,
                'cantidad' => $data['cantidad'],
                'fecha_retiro' => $data['fecha_retiro'],
                'aclaracion' => $data['aclaracion']
            ];

            $mailService = new MailService();
            $mailService->sendReactivoOrderConfirmation(
                $userInfo['EmailA'],
                $userInfo['NombreA'],
                $userInfo['NombreInst'],
                $mailData
            );

            echo json_encode(['status' => 'success', 'id' => $idForm]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getPDFData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $data = $this->model->getDataForTarifario($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}