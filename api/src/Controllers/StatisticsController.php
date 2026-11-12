<?php
namespace App\Controllers;

use App\Models\Estadisticas\StatisticsModel; 
use App\Utils\Auditoria;

class StatisticsController {
    /** Máximo de días entre desde/hasta para evitar consultas masivas y timeouts (proxy/Cloudflare). */
    private const STATS_MAX_RANGE_DAYS = 400;

    private $model;

    /** Estadísticas institucionales: nunca basta con ocultar el botón en el frontend. */
    private function resolveStatsInstitution(array $session): int {
        $role = (int)($session['role'] ?? 0);
        if (!in_array($role, [1, 2, 4, 5, 6], true)) {
            throw new \DomainException('No tiene permisos para consultar estadísticas institucionales.');
        }
        $instId = (int)($session['instId'] ?? 0);
        if ($role === 1) {
            // Solo el superadmin puede elegir una institución, que debe ser explícita.
            $target = filter_var($_GET['inst'] ?? $instId, FILTER_VALIDATE_INT);
            if ($target === false || (int)$target <= 0) {
                throw new \InvalidArgumentException('Seleccione una institución válida.');
            }
            return (int)$target;
        }
        if ($instId <= 0) {
            throw new \InvalidArgumentException('Seleccione una institución válida.');
        }
        // El parámetro del navegador NO cambia el ámbito del resto de los roles.
        return $instId;
    }

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
        header('Cache-Control: private, no-store, max-age=0');
        
        try {
            $prep = $this->prepareStatsDatesFromQuery();
            if (!$prep['ok']) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => $prep['message']]);

                exit;
            }
            $this->extendStatsRuntime();

            $sesion = Auditoria::getDatosSesion();
            $instId = $this->resolveStatsInstitution($sesion);
            $from = $prep['from'];
            $to = $prep['to'];

            $started = microtime(true);
            $data = $this->model->getGeneralStats($instId, $from, $to);
            header('Server-Timing: stats-db;dur=' . round((microtime(true) - $started) * 1000, 1));
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        }
        exit;
    }

    /**
     * Devuelve MadreGrupo (como madre_grupo en JSON) y DependenciaInstitucion (como red) para estadísticas de grupo.
     */
    public function getInstitutionFlags() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        header('Cache-Control: private, no-store, max-age=0');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->resolveStatsInstitution($sesion);
            $data = $this->model->getInstitutionFlags($instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        }
        exit;
    }

    /**
     * Estadísticas agregadas del grupo (misma DependenciaInstitucion o columna red legacy).
     */
    public function getStatsRed() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        header('Cache-Control: private, no-store, max-age=0');
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->resolveStatsInstitution($sesion);
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
            $started = microtime(true);
            $data = $this->model->getGeneralStatsRed($instId, $from, $to);
            header('Server-Timing: stats-db;dur=' . round((microtime(true) - $started) * 1000, 1));
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \App\Utils\ApiExceptionHandler::respond($e);
        }
        exit;
    }
}