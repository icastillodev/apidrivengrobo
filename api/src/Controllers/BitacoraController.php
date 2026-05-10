<?php
namespace App\Controllers;

use App\Models\Admin\BitacoraModel;
use App\Utils\Auditoria;

class BitacoraController {
    private $model;

    public function __construct($db) {
        $this->model = new BitacoraModel($db);
    }

    private function requireSuperAdmin(): void {
        $sesion = Auditoria::getDatosSesion();
        if ((int) $sesion['role'] !== 1) {
            throw new \Exception('Acceso denegado. Privilegios insuficientes.');
        }
    }

    /**
     * GET …/list?limit=&offset=&q=&accion=&inst=
     * limit 1–500; limit=0 → hasta 50 000 (exportación).
     */
    public function listAll() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $this->requireSuperAdmin();

            $limitIn = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
            $offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;

            $q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
            if (strlen($q) > 200) {
                $q = substr($q, 0, 200);
            }
            $accion = isset($_GET['accion']) ? trim((string) $_GET['accion']) : 'all';
            $inst = isset($_GET['inst']) ? trim((string) $_GET['inst']) : 'all';

            if ($limitIn === 0) {
                $limit = 50000;
            } else {
                $limit = max(1, min(500, $limitIn));
            }

            $qParam = $q !== '' ? $q : null;
            $accionParam = strcasecmp($accion, 'all') !== 0 ? $accion : null;
            $instParam = strcasecmp($inst, 'all') !== 0 ? $inst : null;

            $total = $this->model->countLogsFiltered($qParam, $accionParam, $instParam);
            $data = $this->model->getLogsPaged($limit, $offset, $qParam, $accionParam, $instParam);

            echo json_encode([
                'status' => 'success',
                'data' => $data,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
            ]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /** Lista de sedes para el desplegable (todas las filas de bitácora, etiquetas únicas). */
    public function institucionesFiltro() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');

        try {
            $this->requireSuperAdmin();
            $data = $this->model->listInstitucionesDistinctForFilter();
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}
