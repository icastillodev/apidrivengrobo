<?php
namespace App\Controllers;

use App\Models\Comunicacion\InstitucionDashboardPopupModel;
use App\Models\Comunicacion\NoticiaModel;
use App\Utils\Auditoria;

class AdminDashboardPopupController {
    private $db;
    private InstitucionDashboardPopupModel $model;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InstitucionDashboardPopupModel($db);
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
        $instId = (int) ($sesion['instId'] ?? 0);
        if ($instId <= 0) {
            throw new \Exception('Se requiere una institución válida.');
        }

        return $instId;
    }

    private function assertPuedePublicar(array $sesion, int $instId): void {
        $role = (int) ($sesion['role'] ?? 0);
        if ($role === 3) {
            throw new \Exception('No tiene permiso para gestionar popups.');
        }
        if (in_array($role, [1, 2, 4], true)) {
            return;
        }
        $nm = new NoticiaModel($this->db);
        if ($nm->puedePublicarNoticias($instId, $role)) {
            return;
        }
        throw new \Exception('No tiene permiso para gestionar popups.');
    }

    private function assertNoticiaVinculo(int $instId, ?int $idNews): void {
        if ($idNews === null || $idNews <= 0) {
            return;
        }
        $nm = new NoticiaModel($this->db);
        $check = $nm->getPublicById($instId, $idNews);
        if (!$check) {
            throw new \Exception('La noticia vinculada no existe o no está visible para su institución.');
        }
    }

    public function listItems() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $rows = $this->model->listSummaryByInstitution($instId);
            $this->json(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function getOne() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $id = (int) ($_GET['id'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'Id requerido.'], 400);
            }
            $row = $this->model->getById($instId, $id);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'Popup no encontrado.'], 404);
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
            $validated = $this->model->validatePayload($input, $instId, null);
            if (!$validated['ok']) {
                $this->json(['status' => 'error', 'message' => $validated['message']], 400);
            }
            $d = $validated['data'];
            $this->assertNoticiaVinculo($instId, $d['PopupIdNoticia'] !== null ? (int) $d['PopupIdNoticia'] : null);

            $wantActive = $d['PopupActivo'] === 1;
            $d['PopupActivo'] = 0;
            $newId = $this->model->insert($instId, $d);
            if ($wantActive) {
                $this->model->ensureOnlyActive($instId, $newId);
            }
            Auditoria::log($this->db, 'INSERT', 'institucion_dashboard_popup', 'IdDashboardPopup=' . $newId);
            $this->json(['status' => 'success', 'data' => ['IdDashboardPopup' => $newId]]);
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
            $id = (int) ($input['IdDashboardPopup'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'IdDashboardPopup requerido.'], 400);
            }
            $existing = $this->model->getById($instId, $id);
            if (!$existing) {
                $this->json(['status' => 'error', 'message' => 'Popup no encontrado.'], 404);
            }
            $validated = $this->model->validatePayload($input, $instId, $existing);
            if (!$validated['ok']) {
                $this->json(['status' => 'error', 'message' => $validated['message']], 400);
            }
            $d = $validated['data'];
            $this->assertNoticiaVinculo($instId, $d['PopupIdNoticia'] !== null ? (int) $d['PopupIdNoticia'] : null);

            $active = $d['PopupActivo'] === 1;
            $this->model->update($instId, $id, $d);
            if ($active) {
                $this->model->ensureOnlyActive($instId, $id);
            }
            Auditoria::log($this->db, 'UPDATE', 'institucion_dashboard_popup', 'IdDashboardPopup=' . $id);
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
            $id = (int) ($input['IdDashboardPopup'] ?? 0);
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'IdDashboardPopup requerido.'], 400);
            }
            if (!$this->model->delete($instId, $id)) {
                $this->json(['status' => 'error', 'message' => 'Popup no encontrado.'], 404);
            }
            Auditoria::log($this->db, 'DELETE', 'institucion_dashboard_popup', 'IdDashboardPopup=' . $id);
            $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    /** Body: { IdDashboardPopup, Activo: 0|1 } — solo un popup activo por institución. */
    public function setActivo() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $id = (int) ($input['IdDashboardPopup'] ?? 0);
            $activo = !empty($input['Activo']) ? 1 : 0;
            if ($id <= 0) {
                $this->json(['status' => 'error', 'message' => 'IdDashboardPopup requerido.'], 400);
            }
            $row = $this->model->getById($instId, $id);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'Popup no encontrado.'], 404);
            }
            if ($activo === 1) {
                $this->model->ensureOnlyActive($instId, $id);
            } else {
                $this->model->deactivate($instId, $id);
            }
            Auditoria::log($this->db, 'UPDATE', 'institucion_dashboard_popup', 'setActivo IdDashboardPopup=' . $id . ' Activo=' . $activo);
            $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }
}
