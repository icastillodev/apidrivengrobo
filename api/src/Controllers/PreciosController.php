<?php
namespace App\Controllers;

use App\Models\Precios\PreciosModel;

class PreciosController {
    private $model;

    public function __construct($db) {
        $this->model = new PreciosModel($db);
    }

    public function getAllData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        
        try {
            $data = [
                'institucion'      => $this->model->getInstData($instId),
                'especies'         => $this->model->getEspecies($instId),
                'subespecies'      => $this->model->getSubespecies($instId),
                'tiposAlojamiento' => $this->model->getTipoAlojamiento($instId), // NUEVO
                'insumos'          => $this->model->getInsumos($instId),
                'insumosExp'       => $this->model->getInsumosExp($instId),
                'servicios'        => $this->model->getServiciosInst($instId)    // NUEVO
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = json_decode(file_get_contents('php://input'), true);

        try {
            $titulo = $input['tituloprecios'] ?? '';
            // Ya no le pasamos $jornada suelta, porque viaja dentro de $input['data'] como tipo "servicio"
            $success = $this->model->updateTariff($input['data'], $titulo, $input['instId']);
            
            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}