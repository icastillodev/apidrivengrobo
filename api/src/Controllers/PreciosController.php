<?php
namespace App\Controllers;

use App\Models\Precios\PreciosModel;
use App\Utils\Auditoria;
use App\Utils\AlojamientoCobro;
use App\Utils\ModulosInstitucion;

class PreciosController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new PreciosModel($db);
    }

    public function getAllData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            // Respetar la institución objetivo (para red / contexto de formulario)
            $instId = $_GET['inst'] ?? $sesion['instId'];

            $snap = ModulosInstitucion::getSnapshot($this->db, (int) $instId);
            $trazEstado = ModulosInstitucion::estadoParaKey($snap['byKey'], 'trazabilidad_alojamientos');

            $data = [
                'institucion'      => $this->model->getInstData($instId),
                'especies'         => $this->model->getEspecies($instId),
                'subespecies'      => $this->model->getSubespecies($instId),
                'tiposAlojamiento' => $this->model->getTipoAlojamiento($instId),
                'insumos'          => $this->model->getInsumos($instId),
                'insumosExp'       => $this->model->getInsumosExp($instId),
                'servicios'        => $this->model->getServiciosInst($instId),
                'trazabilidad_habilitada' => $trazEstado >= 2,
                'alojamiento_cobro_modo' => AlojamientoCobro::getModoInst($this->db, (int) $instId),
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
            $alojModo = $input['alojamiento_cobro_modo'] ?? null;

            $success = $this->model->updateTariff($input['data'], $titulo, $sesion['instId'], $alojModo);
            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}