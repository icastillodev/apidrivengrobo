<?php
namespace App\Controllers;

use App\Models\Comunicacion\MensajeriaModel;
use App\Utils\Auditoria;

class MensajeriaController {
    private $model;

    public function __construct($db) {
        $this->model = new MensajeriaModel($db);
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

    public function getDestinatarios() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int)$sesion['userId'];
            $local = $this->model->listUsuariosInstitucionParaMensaje($instId, $uid);
            $red = $this->model->listUsuariosRedMismaDependenciaParaMensaje($instId, $uid);
            $this->json(['status' => 'success', 'data' => ['local' => $local, 'red' => $red]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getHilos() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(50, max(5, (int)($_GET['limit'] ?? 20)));
            $rows = $this->model->getHilos((int)$sesion['userId'], $page, $limit);
            $this->json(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getUnreadCount() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $n = $this->model->countUnreadTotal((int)$sesion['userId']);
            $this->json(['status' => 'success', 'data' => ['total' => $n]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getHilo($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $hiloId = (int)$id;
            $uid = (int)$sesion['userId'];
            $hilo = $this->model->getHiloRow($hiloId, $uid);
            if (!$hilo) {
                $this->json(['status' => 'error', 'message' => 'Hilo no encontrado.'], 404);
            }
            $mensajes = $this->model->getMensajesHilo($hiloId);
            if (!empty($_GET['markRead']) && $_GET['markRead'] === '1') {
                $this->model->markHiloLeido($hiloId, $uid);
            }
            $this->json(['status' => 'success', 'data' => ['hilo' => $hilo, 'mensajes' => $mensajes]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function markHiloRead($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $hiloId = (int)$id;
            $uid = (int)$sesion['userId'];
            if (!$this->model->getHiloRow($hiloId, $uid)) {
                $this->json(['status' => 'error', 'message' => 'Hilo no encontrado.'], 404);
            }
            $this->model->markHiloLeido($hiloId, $uid);
            $this->json(['status' => 'success']);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function enviar() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int)$sesion['userId'];
            if (!$this->model->usuarioEnInstitucion($instId, $uid)) {
                $this->json(['status' => 'error', 'message' => 'Usuario no válido.'], 403);
            }
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }

            $idHilo = isset($input['IdMensajeHilo']) ? (int)$input['IdMensajeHilo'] : 0;
            if ($idHilo > 0) {
                $cuerpo = (string)($input['Cuerpo'] ?? '');
                $out = $this->model->responder($instId, $idHilo, $uid, $cuerpo);
                $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
                $this->json($out, $code);
            }

            $dest = (int)($input['IdDestinatario'] ?? 0);
            $asunto = (string)($input['Asunto'] ?? '');
            $cuerpo = (string)($input['Cuerpo'] ?? '');
            $origenTipo = isset($input['OrigenTipo']) ? trim((string)$input['OrigenTipo']) : null;
            if ($origenTipo === '') {
                $origenTipo = null;
            }
            $origenId = isset($input['OrigenId']) ? (int)$input['OrigenId'] : null;
            if ($origenId !== null && $origenId <= 0) {
                $origenId = null;
            }
            $origenEtiqueta = isset($input['OrigenEtiqueta']) ? trim((string)$input['OrigenEtiqueta']) : null;
            if ($origenEtiqueta === '') {
                $origenEtiqueta = null;
            }

            $out = $this->model->crearHiloYMensaje(
                $instId,
                $uid,
                $dest,
                $asunto,
                $cuerpo,
                $origenTipo,
                $origenId,
                $origenEtiqueta
            );
            $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
            $this->json($out, $code);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
