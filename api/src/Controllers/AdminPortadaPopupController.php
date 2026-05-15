<?php
namespace App\Controllers;

use App\Models\Comunicacion\InstitucionPortadaPopupModel;
use App\Utils\Auditoria;

class AdminPortadaPopupController {
    private $db;
    private $model;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InstitucionPortadaPopupModel($db);
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
            throw new \Exception('No tiene permiso para gestionar la portada.');
        }
        if (in_array($role, [1, 2, 4], true)) {
            return;
        }
        $nm = new NoticiaModel($this->db);
        if ($nm->puedePublicarNoticias($instId, $role)) {
            return;
        }
        throw new \Exception('No tiene permiso para gestionar la portada.');
    }

    public function getConfig() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $row = $this->model->getByInstitucion($instId);
            $empty = [
                'PortadaTitulo' => null,
                'PortadaCuerpo' => null,
                'PortadaUrlAdjunto1' => null,
                'PortadaNombreAdjunto1' => null,
                'PortadaUrlAdjunto2' => null,
                'PortadaNombreAdjunto2' => null,
                'PortadaImagenB2Key' => null,
                'PortadaImagenNombre' => null,
                'PortadaAdjunto1B2Key' => null,
                'PortadaAdjunto1Nombre' => null,
                'PortadaAdjunto2B2Key' => null,
                'PortadaAdjunto2Nombre' => null,
                'FechaActualizacion' => null,
            ];
            if (!$row) {
                $this->json(['status' => 'success', 'data' => $empty]);
            }
            foreach ($empty as $k => $_) {
                if (array_key_exists($k, $row)) {
                    $empty[$k] = $row[$k];
                }
            }
            $this->json(['status' => 'success', 'data' => $empty]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }

    public function save() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $this->assertPuedePublicar($sesion, $instId);
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }
            $validated = $this->model->validatePortadaPayload($input, $instId);
            if (!$validated['ok']) {
                $this->json(['status' => 'error', 'message' => $validated['message']], 400);
            }
            $d = $validated['data'];
            $this->model->upsertPortadaOnly($instId, $d);
            Auditoria::log($this->db, 'UPDATE', 'institucion_portada_popup', 'portada-only IdInstitucion=' . $instId);
            $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        }
    }
}
