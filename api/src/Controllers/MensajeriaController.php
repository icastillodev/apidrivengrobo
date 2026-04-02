<?php
namespace App\Controllers;

use App\Models\Comunicacion\MensajeriaModel;
use App\Models\Services\MailService;
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
            $role = (int)($sesion['role'] ?? 0);

            $local = [];
            $red = [];

            if ($role === 3) {
                // Role 3 solo puede enviar a su institución o a otras de la red (como institución)
                $local[] = [
                    'isInstitution' => true,
                    'IdInstitucion' => $instId,
                    'NombreInstitucion' => $this->model->getNombreInstitucion($instId)
                ];
            } else {
                // Otros roles pueden enviar a personas de su institución
                $local = $this->model->listUsuariosInstitucionParaMensaje($instId, $uid);
            }

            // Las de red siempre son instituciones (no personas)
            $redInsts = $this->model->listInstitucionesRedMismaDependencia($instId);
            foreach ($redInsts as $i) {
                $red[] = [
                    'isInstitution' => true,
                    'IdInstitucion' => $i['IdInstitucion'],
                    'NombreInstitucion' => $i['NombreInst']
                ];
            }

            $this->json(['status' => 'success', 'data' => ['local' => $local, 'red' => $red]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getHilos() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int) $sesion['userId'];
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(50, max(5, (int)($_GET['limit'] ?? 20)));
            $alcance = strtolower(trim((string)($_GET['alcance'] ?? 'personal')));
            $role = (int) ($sesion['role'] ?? 0);
            if ($alcance === 'institucional') {
                $rows = $this->model->getHilosInstitucionales($instId, $uid, $role, $page, $limit);
            } else {
                $rows = $this->model->getHilosPersonal($uid, $page, $limit);
            }
            $this->json(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getUnreadCount() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $inst = $this->model->countUnreadInstitucional($uid, $instId, $role);
            $per = $this->model->countUnreadPersonal($uid);
            $this->json([
                'status' => 'success',
                'data' => [
                    'institucional' => $inst,
                    'personal' => $per,
                    'total' => $inst + $per,
                ],
            ]);
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
            $role = (int) ($sesion['role'] ?? 0);
            $hilo = $this->model->getHiloRow($hiloId, $uid, $instId, $role);
            if (!$hilo) {
                $this->json(['status' => 'error', 'message' => 'Hilo no encontrado.'], 404);
            }
            $mensajes = $this->model->getMensajesHilo($hiloId);
            if (!empty($_GET['markRead']) && $_GET['markRead'] === '1') {
                $this->model->markHiloLeido($hiloId, $uid);
            }
            $puedeResponder = $this->model->puedeResponderEnHilo($hilo, $uid, $role);
            $this->json([
                'status' => 'success',
                'data' => [
                    'hilo' => $hilo,
                    'mensajes' => $mensajes,
                    'puedeResponder' => $puedeResponder,
                ],
            ]);
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
            $role = (int) ($sesion['role'] ?? 0);
            if (!$this->model->getHiloRow($hiloId, $uid, $instId, $role)) {
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

            $role = (int) ($sesion['role'] ?? 0);
            $idHilo = isset($input['IdMensajeHilo']) ? (int)$input['IdMensajeHilo'] : 0;
            if ($idHilo > 0) {
                $cuerpo = (string)($input['Cuerpo'] ?? '');
                $out = $this->model->responder($instId, $idHilo, $uid, $cuerpo, $role);
                $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
                if ($code === 200) {
                    $hRow = $this->model->getHiloRow($idHilo, $uid, $instId, $role);
                    if ($hRow) {
                        $pa = (int) ($hRow['IdUsrParticipanteA'] ?? 0);
                        $pb = (int) ($hRow['IdUsrParticipanteB'] ?? 0);
                        $destMsg = ($pb > 0) ? (($pa === $uid) ? $pb : $pa) : 0;
                        $asuntoHilo = trim((string) ($hRow['Asunto'] ?? ''));
                        $hiloInst = (int) ($hRow['IdInstitucion'] ?? $instId);
                        if ($destMsg > 0 && $asuntoHilo !== '') {
                            $cuerpoT = trim(strip_tags($cuerpo));
                            if ($cuerpoT !== '') {
                                $emailInfo = $this->notificarCorreoPorMensajeInterno(
                                    $hiloInst,
                                    $destMsg,
                                    $uid,
                                    $asuntoHilo,
                                    $cuerpoT
                                );
                                $out['data'] = array_merge($out['data'] ?? [], ['emailNotificacion' => $emailInfo]);
                            }
                        }
                    }
                }
                $this->json($out, $code);
            }

            $esInst = !empty($input['EsInstitucional']) || !empty($input['esInstitucional']);
            if ($esInst) {
                $asunto = (string) ($input['Asunto'] ?? '');
                $cuerpo = (string) ($input['Cuerpo'] ?? '');
                $origenTipo = isset($input['OrigenTipo']) ? trim((string) $input['OrigenTipo']) : null;
                if ($origenTipo === '') {
                    $origenTipo = 'institucional';
                }
                $origenId = isset($input['OrigenId']) ? (int) $input['OrigenId'] : null;
                if ($origenId !== null && $origenId <= 0) {
                    $origenId = null;
                }
                $origenEtiqueta = isset($input['OrigenEtiqueta']) ? trim((string) $input['OrigenEtiqueta']) : null;
                if ($origenEtiqueta === '') {
                    $origenEtiqueta = null;
                }
                $instDestinoId = isset($input['IdInstitucionDestino']) ? (int)$input['IdInstitucionDestino'] : null;

                $out = $this->model->crearHiloInstitucional(
                    $instId,
                    $uid,
                    $asunto,
                    $cuerpo,
                    $origenTipo,
                    $origenId,
                    $origenEtiqueta,
                    $role,
                    $instDestinoId
                );
                $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
                $this->json($out, $code);
            }

            if ($role === 3) {
                $this->json([
                    'status' => 'error',
                    'message' => 'Los investigadores no pueden enviar mensajes directos a personas. Use el buzón a su institución o a otra sede de la red.',
                ], 403);
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

            if ($code === 200) {
                $asuntoT = trim(strip_tags($asunto));
                $cuerpoT = trim(strip_tags($cuerpo));
                if ($asuntoT !== '' && $cuerpoT !== '') {
                    $emailInfo = $this->notificarCorreoPorMensajeInterno(
                        $instId,
                        $dest,
                        $uid,
                        $asuntoT,
                        $cuerpoT
                    );
                    $out['data'] = array_merge($out['data'] ?? [], ['emailNotificacion' => $emailInfo]);
                }
            }

            $this->json($out, $code);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * @return array{ok: bool, codigo: string}
     */
    private function notificarCorreoPorMensajeInterno(
        int $instIdContexto,
        int $destinatarioId,
        int $remitenteId,
        string $asunto,
        string $cuerpo
    ): array {
        $asunto = trim(strip_tags($asunto));
        $cuerpo = trim(strip_tags($cuerpo));
        if ($asunto === '' || $cuerpo === '') {
            return ['ok' => false, 'codigo' => 'datos_vacios'];
        }

        $destInfo = $this->model->getPersonaCorreoParaNotificacion($destinatarioId, $instIdContexto);
        $remInfo = $this->model->getPersonaCorreoParaNotificacion($remitenteId, $instIdContexto);
        if (!$destInfo) {
            return ['ok' => false, 'codigo' => 'sin_email'];
        }
        $emailTo = isset($destInfo['EmailA']) ? trim((string) $destInfo['EmailA']) : '';
        if ($emailTo === '' || !filter_var($emailTo, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'codigo' => 'sin_email'];
        }

        $nombreDest = trim((string) (($destInfo['NombreA'] ?? '') . ' ' . ($destInfo['ApellidoA'] ?? '')));
        $nombreRem = $remInfo
            ? trim((string) (($remInfo['NombreA'] ?? '') . ' ' . ($remInfo['ApellidoA'] ?? '')))
            : '';
        if ($nombreRem === '') {
            $nombreRem = 'ID ' . $remitenteId;
        }

        $lang = strtolower(trim((string) ($destInfo['lang'] ?? 'es')));
        if (!in_array($lang, ['es', 'en', 'pt'], true)) {
            $lang = 'es';
        }

        $instName = $this->model->getNombreInstitucion($instIdContexto);
        $mail = new MailService();
        $ok = $mail->sendInternalMessageNotification(
            $emailTo,
            $nombreDest,
            $asunto,
            $cuerpo,
            $instName,
            $nombreRem,
            $lang
        );

        return ['ok' => $ok, 'codigo' => $ok ? 'ok' : 'smtp_error'];
    }
}
