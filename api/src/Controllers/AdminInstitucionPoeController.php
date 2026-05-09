<?php
namespace App\Controllers;

use App\Models\Comunicacion\InstitucionPoeModel;
use App\Models\Comunicacion\NoticiaModel;
use App\Utils\Auditoria;

class AdminInstitucionPoeController {
    private $db;
    private $model;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InstitucionPoeModel($db);
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

    private function assertPuedePublicar(array $sesion, int $instId): void {
        $role = (int)($sesion['role'] ?? 0);
        if ($role === 3) {
            throw new \Exception('No tiene permiso para gestionar POE.');
        }
        if (in_array($role, [1, 2, 4], true)) {
            return;
        }
        $nm = new NoticiaModel($this->db);
        if ($nm->puedePublicarNoticias($instId, $role)) {
            return;
        }
        throw new \Exception('No tiene permiso para gestionar POE.');
    }

    public function listItems() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $page = max(1, (int)($_GET['page'] ?? 1));
            $pageSize = min(50, max(5, (int)($_GET['pageSize'] ?? 20)));
            $out = $this->model->listAdmin($instId, $page, $pageSize);
            $this->json([
                'status' => 'success',
                'data' => $out['rows'],
                'total' => $out['total'],
                'page' => $page,
                'pageSize' => $pageSize,
            ]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function getOne() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'ID inválido.'], 400);
            }
            $row = $this->model->getByIdAdmin($instId, $id);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'No encontrado.'], 404);
            }
            $this->json(['status' => 'success', 'data' => $row]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function create() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $validated = $this->model->validatePayload($input, true);
            if (!$validated['ok']) {
                $this->json(['status' => 'error', 'message' => $validated['message']], 400);
            }
            $newId = $this->model->insert($instId, $validated['data']);
            Auditoria::log($this->db, 'INSERT', 'institucion_poe', 'IdPoe=' . $newId);
            $this->json(['status' => 'success', 'data' => ['IdPoe' => $newId]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function update() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $id = (int)($input['IdPoe'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'ID inválido.'], 400);
            }
            $existing = $this->model->getByIdAdmin($instId, $id);
            if (!$existing) {
                $this->json(['status' => 'error', 'message' => 'No encontrado.'], 404);
            }
            $validated = $this->model->validatePayload($input, false);
            if (!$validated['ok']) {
                $this->json(['status' => 'error', 'message' => $validated['message']], 400);
            }
            $merged = $validated['data'];
            if ($merged['Titulo'] === null) {
                $merged['Titulo'] = $existing['Titulo'];
            }
            $this->model->update($instId, $id, $merged);
            Auditoria::log($this->db, 'UPDATE', 'institucion_poe', 'IdPoe=' . $id);
            $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function deleteItem() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $id = (int)($input['IdPoe'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'ID inválido.'], 400);
            }
            $ok = $this->model->deleteHard($instId, $id);
            if (!$ok) {
                $this->json(['status' => 'error', 'message' => 'No encontrado.'], 404);
            }
            Auditoria::log($this->db, 'DELETE', 'institucion_poe', 'IdPoe=' . $id);
            $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }
}
