<?php
namespace App\Controllers;

use App\Models\Precios\PreciosModel;

class PreciosController {
    private $model;

    // El Router pasa automáticamente el objeto PDO aquí
    public function __construct($db) {
        $this->model = new PreciosModel($db);
    }

    public function getAllData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        
        try {
            $data = [
                'institucion' => $this->model->getInstData($instId),
                'especies'    => $this->model->getEspecies($instId),
                // CORRECCIÓN: Se agrega el argumento $instId
                'subespecies' => $this->model->getSubespecies($instId), 
                'insumos'     => $this->model->getInsumos($instId),
                'insumosExp'  => $this->model->getInsumosExp($instId)
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

// En PreciosController.php -> updateAll()
public function updateAll() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);

    try {
        // Capturar tituloprecios
        $titulo = $input['tituloprecios'] ?? '';
        
        // Pasar el titulo al modelo
        $success = $this->model->updateTariff($input['data'], $input['jornada'], $titulo, $input['instId']);
        
        echo json_encode(['status' => $success ? 'success' : 'error']);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
}