<?php
namespace App\Controllers;

use App\Models\Precios\PreciosModel;
use App\Utils\Auditoria;

class PreciosController {
    private $model;

    public function __construct($db) {
        $this->model = new PreciosModel($db);
    }

    public function getAllData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];

            $data = [
                'institucion'      => $this->model->getInstData($instId),
                'especies'         => $this->model->getEspecies($instId),
                'subespecies'      => $this->model->getSubespecies($instId),
                'tiposAlojamiento' => $this->model->getTipoAlojamiento($instId), 
                'insumos'          => $this->model->getInsumos($instId),
                'insumosExp'       => $this->model->getInsumosExp($instId),
                'servicios'        => $this->model->getServiciosInst($instId)   
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function updateAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion();
            $titulo = $input['tituloprecios'] ?? '';
            
            // Inyectamos el InstID seguro
            $success = $this->model->updateTariff($input['data'], $titulo, $sesion['instId']);
            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}