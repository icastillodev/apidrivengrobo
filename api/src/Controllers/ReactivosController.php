<?php
namespace App\Controllers;
use App\Models\Reactivos\ReactivosModel;
use App\Models\Services\MailService; // Importamos el servicio de mail

class ReactivosController {
    private $model;

    public function __construct($db) {
        $this->model = new ReactivosModel($db);
    }

    public function getInitData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        $userId = $_GET['user'] ?? 0;
        try {
            echo json_encode(['status' => 'success', 'data' => $this->model->getInitialData($instId, $userId)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolInfo() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $id = $_GET['id'] ?? 0;
        try {
            echo json_encode(['status' => 'success', 'data' => $this->model->getProtocolDetails($id)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createOrder() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            // 1. Guardar Pedido (El modelo hace la magia de reactivo/organo)
            $res = $this->model->saveOrder($data);
            $idForm = $res['id'];
            $insumoName = $res['insumoName'];

            // 2. ENVIAR CORREO
            // Recuperamos datos de usuario e institución (Reutilizamos helper o consulta directa)
            // Para simplificar, asumimos que el modelo puede darnos esto o hacemos una query rapida.
            // Lo ideal es tener un helper. Vamos a hacer una consulta rápida aquí via modelo si hace falta,
            // pero mejor agregamos un helper "getUserInfo" al modelo de Reactivos igual que en Animales.
            
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
    // Agregar este método en la clase ReactivosController
    public function getPDFData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            $data = $this->model->getDataForTarifario($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}