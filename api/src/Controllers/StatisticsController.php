<?php
namespace App\Controllers;

use App\Models\Estadisticas\StatisticsModel; 
use App\Utils\Auditoria;

class StatisticsController {
    /** Máximo de días entre desde/hasta para evitar consultas masivas y timeouts (proxy/Cloudflare). */
    private const STATS_MAX_RANGE_DAYS = 400;

    private $model;

    public function __construct($db) {
        $this->model = new StatisticsModel($db);
    }

    /**
     * Normaliza y valida el rango de fechas de estadísticas (GET from/to).
     * @return array{ok:bool,from?:string,to?:string,message?:string}
     */
    private function prepareStatsDatesFromQuery(): array {
        $from = isset($_GET['from']) ? trim((string) $_GET['from']) : '';
        $to = isset($_GET['to']) ? trim((string) $_GET['to']) : '';
        if ($from === '') {
            $from = date('Y-m-01');
        }
        if ($to === '') {
            $to = date('Y-m-d');
        }
        $df = \DateTimeImmutable::createFromFormat('Y-m-d', $from);
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $to);
        if (!$df || !$dt || $df->format('Y-m-d') !== $from || $dt->format('Y-m-d') !== $to) {
            return ['ok' => false, 'message' => 'Formato de fecha inválido (use AAAA-MM-DD).'];
        }
        if ($df > $dt) {
            $tmp = $df;
            $df = $dt;
            $dt = $tmp;
            $from = $df->format('Y-m-d');
            $to = $dt->format('Y-m-d');
        }
        $days = (int) $df->diff($dt)->format('%a');
        if ($days > self::STATS_MAX_RANGE_DAYS) {
            return [
                'ok' => false,
                'message' => 'El periodo supera ' . self::STATS_MAX_RANGE_DAYS
                    . ' días. Acorte el rango para evitar timeouts al generar estadísticas.',
            ];
        }

        return ['ok' => true, 'from' => $from, 'to' => $to];
    }

    private function extendStatsRuntime(): void {
        if (function_exists('ini_set')) {
            @ini_set('max_execution_time', '180');
        }
        if (function_exists('set_time_limit')) {
            @set_time_limit(180);
        }
    }

    public function getStats() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $prep = $this->prepareStatsDatesFromQuery();
            if (!$prep['ok']) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => $prep['message']]);

                exit;
            }
            $this->extendStatsRuntime();

            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            $from = $prep['from'];
            $to = $prep['to'];

            $data = $this->model->getGeneralStats($instId, $from, $to);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Devuelve MadreGrupo (como madre_grupo en JSON) y DependenciaInstitucion (como red) para estadísticas de grupo.
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
     * Estadísticas agregadas del grupo (misma DependenciaInstitucion o columna red legacy).
     */
    public function getStatsRed() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $sesion['instId'];
            $flags = $this->model->getInstitutionFlags($instId);
            if ((int)($flags['madre_grupo'] ?? 0) !== 1) {
                http_response_code(403);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Solo la sede configurada como madre del grupo (MadreGrupo = 1) puede consultar estadísticas agregadas del grupo.',
                ]);
                exit;
            }
            $prep = $this->prepareStatsDatesFromQuery();
            if (!$prep['ok']) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => $prep['message']]);
                exit;
            }
            $this->extendStatsRuntime();
            $from = $prep['from'];
            $to = $prep['to'];
            $data = $this->model->getGeneralStatsRed($instId, $from, $to);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}