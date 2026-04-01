<?php
namespace App\Controllers;

use App\Models\Comunicacion\NoticiaModel;
use App\Utils\Auditoria;

class AdminNoticiaController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
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
     * Quién puede editar la tabla noticia_rol_publicar (qué tipos de usuario publican).
     * Alineado con MenuController::assembleMenu: superadmin (1), admin sede (2), subadmin (4).
     */
    private function assertAdminSede(array $sesion): void {
        $r = (int)($sesion['role'] ?? 0);
        if (!in_array($r, [1, 2, 4], true)) {
            throw new \Exception('Solo administración autorizada puede gestionar permisos de noticias.');
        }
    }

    /**
     * Quién puede listar/crear/editar noticias de la institución.
     * Misma regla que el ítem de menú 205: roles 1, 2, 4 siempre; resto según noticia_rol_publicar (IdTipousrA).
     */
    private function assertPuedePublicar(array $sesion, int $instId): void {
        $role = (int)($sesion['role'] ?? 0);
        if (in_array($role, [1, 2, 4], true)) {
            return;
        }
        if ($this->model->puedePublicarNoticias($instId, $role)) {
            return;
        }
        throw new \Exception('No tiene permiso para gestionar noticias.');
    }

    public function list() {
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
                $this->json(['status' => 'error', 'message' => 'Id requerido.'], 400);
            }
            $row = $this->model->getByIdAdmin($instId, $id);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'Noticia no encontrada.'], 404);
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
            $out = $this->model->create($instId, (int)$sesion['userId'], $input);
            if (($out['status'] ?? '') === 'success') {
                Auditoria::log($this->db, 'INSERT', 'noticia', 'AdminNoticiaController::create IdNoticia=' . ($out['data']['IdNoticia'] ?? ''));
            }
            $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
            $this->json($out, $code);
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
            $id = (int)($input['IdNoticia'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'IdNoticia requerido.'], 400);
            }
            $out = $this->model->update($instId, $id, $input);
            if (($out['status'] ?? '') === 'success') {
                Auditoria::log($this->db, 'UPDATE', 'noticia', 'IdNoticia=' . $id);
            }
            $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
            $this->json($out, $code);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function delete() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $id = (int)($input['IdNoticia'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'IdNoticia requerido.'], 400);
            }
            $out = $this->model->delete($instId, $id);
            if (($out['status'] ?? '') === 'success') {
                Auditoria::log($this->db, 'DELETE', 'noticia', 'IdNoticia=' . $id);
            }
            $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
            $this->json($out, $code);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function getRolesPublicar() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertAdminSede($sesion);
            $rows = $this->model->getRolesPublicar($instId);
            $this->json(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function setRolesPublicar() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertAdminSede($sesion);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $idTipo = (int)($input['IdTipousrA'] ?? 0);
            $activo = !empty($input['Activo']) ? 1 : 0;
            if ($idTipo <= 0) {
                $this->json(['status' => 'error', 'message' => 'IdTipousrA requerido.'], 400);
            }
            $out = $this->model->setRolPublicar($instId, $idTipo, $activo);
            Auditoria::log($this->db, 'UPDATE', 'noticia_rol_publicar', "IdInstitucion={$instId} IdTipousrA={$idTipo} Activo={$activo}");
            $this->json($out);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }
}
