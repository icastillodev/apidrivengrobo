<?php
namespace App\Controllers;

use App\Models\Estadisticas\StatisticsModel; 
use App\Utils\Auditoria;

class StatisticsController {
    private $model;

    public function __construct($db) {
        $this->model = new StatisticsModel($db);
    }

    public function getStats() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            
            $from   = (!empty($_GET['from'])) ? $_GET['from'] : date('Y-m-01');
            $to     = (!empty($_GET['to']))   ? $_GET['to']   : date('Y-m-d');

            $data = $this->model->getGeneralStats($instId, $from, $to);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Devuelve madre_grupo y red de la institución actual (para mostrar bloque "Estadísticas de la red").
     */
    public function getInstitutionFlags() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            $data = $this->model->getInstitutionFlags($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Estadísticas agregadas de todas las instituciones de la red (mismo valor "red").
     */
    public function getStatsRed() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            $from = (!empty($_GET['from'])) ? $_GET['from'] : date('Y-m-01');
            $to = (!empty($_GET['to'])) ? $_GET['to'] : date('Y-m-d');
            $data = $this->model->getGeneralStatsRed($instId, $from, $to);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}