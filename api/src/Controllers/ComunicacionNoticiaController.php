<?php
namespace App\Controllers;

use App\Models\Comunicacion\NoticiaModel;
use App\Utils\Auditoria;

class ComunicacionNoticiaController {
    private $model;

    public function __construct($db) {
        $this->model = new NoticiaModel($db);
    }

    private function json($data, $code = 200) {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        if ($code !== 200) {
            http_response_code($code);
        }
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }

    private function requireInst(array $sesion): int {
        $instId = (int)($sesion['instId'] ?? 0);
        if ($instId <= 0) {
            throw new \Exception('Se requiere una institución válida.');
        }
        return $instId;
    }

    /**
     * GET ?alcance=local|red&page=1&pageSize=10&sort=fecha_desc|fecha_asc|titulo_asc|titulo_desc&search=text
     */
    public function getList() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $alcance = (string)($_GET['alcance'] ?? 'local');
            $page = max(1, (int)($_GET['page'] ?? 1));
            $pageSize = min(50, max(1, (int)($_GET['pageSize'] ?? 10)));
            $fullCuerpoLocal = isset($_GET['fullCuerpo']) && (string)$_GET['fullCuerpo'] === '1';
            $sort = strtolower(trim((string)($_GET['sort'] ?? 'fecha_desc')));
            $search = trim((string)($_GET['search'] ?? ''));
            $allowedSort = ['fecha_desc', 'fecha_asc', 'titulo_asc', 'titulo_desc'];
            if (!in_array($sort, $allowedSort, true)) {
                $sort = 'fecha_desc';
            }
            $out = $this->model->listPublic($instId, $alcance, $page, $pageSize, $fullCuerpoLocal, $sort, $search);
            $this->json([
                'status' => 'success',
                'data' => [
                    'rows' => $out['rows'],
                    'total' => $out['total'],
                    'page' => $page,
                    'pageSize' => $pageSize,
                ],
            ]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getOne($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $row = $this->model->getPublicById($instId, (int)$id);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'Noticia no encontrada.'], 404);
            }
            $this->json(['status' => 'success', 'data' => $row]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
