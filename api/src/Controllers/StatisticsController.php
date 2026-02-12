<?php
namespace App\Controllers;

// IMPORTANTE: Aquí debe coincidir con el namespace del modelo arriba
use App\Models\Estadisticas\StatisticsModel; 

class StatisticsController {
    private $model;

    public function __construct($db) {
        $this->model = new StatisticsModel($db);
    }

    public function getStats() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        $from   = (!empty($_GET['from'])) ? $_GET['from'] : date('Y-m-01');
        $to     = (!empty($_GET['to']))   ? $_GET['to']   : date('Y-m-d');

        try {
            $data = $this->model->getGeneralStats($instId, $from, $to);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}