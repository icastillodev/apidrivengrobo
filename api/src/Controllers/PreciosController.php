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
            $instId = $this->resolvePreciosInstId($sesion, $_GET['inst'] ?? null);
            $instData = $this->model->getInstData($instId);
            $instCobro = $instId;
            if (!empty($instData['IdInstitucion'])) {
                $instCobro = (int) $instData['IdInstitucion'];
            }
            if ($instCobro <= 0 && !empty($sesion['instId'])) {
                $instCobro = (int) $sesion['instId'];
            }

            $data = [
                'institucion'      => $instData,
                'especies'         => $this->model->getEspecies($instId),
                'subespecies'      => $this->model->getSubespecies($instId),
                'tiposAlojamiento' => $this->model->getTipoAlojamiento($instId),
                'insumos'          => $this->model->getInsumos($instId),
                'insumosExp'       => $this->model->getInsumosExp($instId),
                'servicios'        => $this->model->getServiciosInst($instId),
                'trazabilidad_habilitada' => AlojamientoCobro::instTrazabilidadHabilitada($this->db, $instCobro),
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            error_log('PreciosController::getAllData: ' . $e->getMessage());
            $msg = $e->getMessage();
            $isAuth = stripos($msg, 'token') !== false
                || stripos($msg, 'credencial') !== false
                || stripos($msg, 'acceso denegado') !== false
                || stripos($msg, 'sesión') !== false
                || stripos($msg, 'sesion') !== false;
            http_response_code($isAuth ? 401 : 500);
            echo json_encode([
                'status' => 'error',
                'message' => $isAuth ? $msg : 'Error al cargar el tarifario',
            ]);
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

            $instId = (int) ($sesion['instId'] ?? 0);
            if ($instId <= 0 && (int) ($sesion['role'] ?? 0) === 1) {
                $override = (int) ($input['inst'] ?? $input['instId'] ?? 0);
                if ($override > 0) {
                    $instId = $override;
                }
            }

            $success = $this->model->updateTariff($input['data'], $titulo, $instId, $alojModo);
            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /** Solo modo de cobro alojamiento (tarifario / pantalla alojamientos). */
    public function updateCobroModo() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = (int) ($sesion['instId'] ?? 0);
            if ($instId <= 0 && (int) ($sesion['role'] ?? 0) === 1) {
                $override = (int) ($input['instId'] ?? $input['inst'] ?? 0);
                if ($override > 0) {
                    $instId = $override;
                }
            }
            if ($instId <= 0) {
                throw new \RuntimeException('Institución no válida');
            }
            $modo = (string) ($input['alojamiento_cobro_modo'] ?? '');
            if (!$this->model->setAlojamientoCobroModo($instId, $modo)) {
                throw new \RuntimeException('No se pudo guardar el modo de cobro');
            }
            echo json_encode([
                'status' => 'success',
                'alojamiento_cobro_modo' => AlojamientoCobro::getModoInst($this->db, $instId),
            ]);
        } catch (\Exception $e) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'No se pudo guardar el modo de cobro']);
        }
        exit;
    }

    /** @param array<string,mixed> $sesion */
    private function resolvePreciosInstId(array $sesion, $instParam): int {
        $instId = 0;
        if ($instParam !== null && $instParam !== '') {
            $parsed = filter_var($instParam, FILTER_VALIDATE_INT);
            if ($parsed !== false && $parsed > 0) {
                $instId = (int) $parsed;
            }
        }
        if ($instId <= 0) {
            $instId = (int) ($sesion['instId'] ?? 0);
        }
        if ($instId <= 0 && in_array((int) ($sesion['role'] ?? 0), [1, 2], true)) {
            $hdr = $_SERVER['HTTP_X_INST_ID'] ?? $_SERVER['HTTP_X_TARGET_INST'] ?? null;
            if ($hdr !== null && $hdr !== '') {
                $parsed = filter_var($hdr, FILTER_VALIDATE_INT);
                if ($parsed !== false && $parsed > 0) {
                    $instId = (int) $parsed;
                }
            }
        }
        return $instId;
    }
}