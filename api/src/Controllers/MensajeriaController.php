<?php
namespace App\Controllers;

use App\Models\Comunicacion\MensajeriaModel;
use App\Models\Admin\UsuarioModel;
use App\Models\Services\MailService;
use App\Utils\Auditoria;

class MensajeriaController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
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

    public function getAnexosContexto() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $sobre = (int) ($_GET['usuarioId'] ?? $_GET['usuario'] ?? 0);
            $tipo = strtolower(trim((string) ($_GET['tipo'] ?? '')));
            $q = trim((string) ($_GET['q'] ?? ''));
            if ($sobre <= 0 || !in_array($tipo, ['formulario', 'alojamiento'], true)) {
                $this->json(['status' => 'error', 'message' => 'Parámetros inválidos.'], 400);
            }
            if (!$this->model->usuarioEnInstitucion($instId, $sobre)) {
                $this->json(['status' => 'error', 'message' => 'Usuario no encontrado en la sede.'], 404);
            }
            // Staff: cualquier usuario de la sede. Resto: solo propio listado; investigadores (3) pueden enlazar contexto del destinatario en la misma sede.
            if (!$this->model->esRolStaffInstitucional($role) && $sobre !== $uid && (int) $role !== 3) {
                $this->json(['status' => 'error', 'message' => 'No tiene permiso para consultar ese contexto.'], 403);
            }
            $items = $this->model->listAnexosContextoParaUsuario($instId, $sobre, $tipo, $q);
            $this->json(['status' => 'success', 'data' => ['items' => $items]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getDestinatarios() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int)$sesion['userId'];
            $role = (int)($sesion['role'] ?? 0);
            $soloRed = isset($_GET['solo_red']) && (string)$_GET['solo_red'] === '1';

            $local = [];
            $red = [];

            if ($role === 3 || $soloRed) {
                // Investigador o «Mis mensajes» en modo red: solo institución local + sedes de la red (como institución)
                $local[] = [
                    'isInstitution' => true,
                    'IdInstitucion' => $instId,
                    'NombreInstitucion' => $this->model->getNombreInstitucion($instId)
                ];
            } else {
                // Otros roles: toda la sede (incl. varios perfiles) + investigadores por si el listado base no los incluye.
                $local = $this->model->listUsuariosInstitucionParaMensaje($instId, $uid);
                if ($this->model->esRolStaffInstitucional($role)) {
                    $inv = $this->model->listInvestigadoresInstitucionParaMensaje($instId, $uid);
                    $seen = [];
                    foreach ($local as $row) {
                        $seen[(int) ($row['IdUsrA'] ?? 0)] = true;
                    }
                    foreach ($inv as $row) {
                        $id = (int) ($row['IdUsrA'] ?? 0);
                        if ($id > 0 && empty($seen[$id])) {
                            $local[] = $row;
                            $seen[$id] = true;
                        }
                    }
                }
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

            $investigadores = [];
            if ($this->model->esRolStaffInstitucional($role)) {
                $investigadores = $this->model->listInvestigadoresInstitucionParaMensaje($instId, $uid);
            }

            $this->json(['status' => 'success', 'data' => ['local' => $local, 'red' => $red, 'investigadores' => $investigadores]]);
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

    public function buscarMensajes() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $q = trim((string) ($_GET['q'] ?? ''));
            $alcance = strtolower(trim((string) ($_GET['alcance'] ?? 'personal')));
            if (mb_strlen($q) < 2) {
                $this->json(['status' => 'success', 'data' => []]);
            }
            $items = $this->model->buscarMensajesEnHilos($instId, $uid, $role, $q, $alcance, 25);
            $this->json(['status' => 'success', 'data' => $items]);
        } catch (\Exception $e) {
            error_log('MensajeriaController::buscarMensajes ' . $e->getMessage());
            $this->json(['status' => 'error', 'message' => 'No se pudo completar la búsqueda.'], 400);
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
                $raw = $this->model->fetchHiloRawById($hiloId);
                if (!$raw) {
                    $this->json([
                        'status' => 'error',
                        'code' => 'hilo_no_encontrado',
                        'message' => 'Hilo no encontrado.',
                    ], 404);
                }

                $this->json([
                    'status' => 'error',
                    'code' => 'hilo_sin_acceso',
                    'message' => 'No tiene acceso a este hilo. Si el enlace es de otro usuario, cierre sesión e inicie con la cuenta correcta.',
                ], 403);
            }
            // Datos de participantes para título/meta en UI.
            $hilo['ParticipanteA'] = $this->model->getUsuarioResumen((int)($hilo['IdUsrParticipanteA'] ?? 0), $instId);
            $pbRaw = $hilo['IdUsrParticipanteB'] ?? null;
            $pb = ($pbRaw !== null && $pbRaw !== '') ? (int)$pbRaw : 0;
            $hilo['ParticipanteB'] = $pb > 0 ? $this->model->getUsuarioResumen($pb, $instId) : null;
            $hilo['InterlocutorDetalle'] = $this->model->getResumenInterlocutorHilo((array) $hilo, $uid, $instId);

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

    /**
     * Vista previa + envío de código por email para eliminación total de un hilo.
     * Requiere rol staff institucional (no investigador).
     */
    public function getDeletePreviewHilo($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int)$sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            if (!$this->model->esRolStaffInstitucional($role)) {
                $this->json(['status' => 'error', 'message' => 'No tiene permiso.'], 403);
            }
            $hiloId = (int)$id;
            if ($hiloId <= 0) {
                $this->json(['status' => 'error', 'message' => 'ID inválido.'], 400);
            }
            $preview = $this->model->getDeletePreviewHilo($hiloId, $uid, $instId, $role);
            if (!$preview) {
                $this->json(['status' => 'error', 'message' => 'Hilo no encontrado.'], 404);
            }

            $code = (string) random_int(100000, 999999);
            UsuarioModel::storeVerificationCode($hiloId, $uid, $code);

            $adminInfo = $this->model->getPersonaCorreoParaNotificacion($uid, $instId);
            $adminEmail = $adminInfo['EmailA'] ?? null;
            $adminName = trim((string)(($adminInfo['NombreA'] ?? '') . ' ' . ($adminInfo['ApellidoA'] ?? '')));
            if ($adminName === '') $adminName = 'Administrador';
            $lang = $sesion['idioma'] ?? 'es';

            $mail = new MailService();
            $sent = false;
            if ($adminEmail) {
                $sent = (bool) $mail->sendThreadDeleteVerificationCode(
                    (string)$adminEmail,
                    $adminName,
                    $code,
                    $hiloId,
                    (string)($preview['Asunto'] ?? ''),
                    (string)($this->model->getNombreInstitucion((int)($preview['IdInstitucion'] ?? $instId))),
                    $lang
                );
            }

            $this->json([
                'status' => 'success',
                'data' => array_merge($preview, ['code_sent' => $sent]),
            ]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Eliminación total de hilo (mensajes + leído), con contraseña del admin + código por email.
     */
    public function deleteHiloFull($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int)$sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            if (!$this->model->esRolStaffInstitucional($role)) {
                $this->json(['status' => 'error', 'message' => 'No tiene permiso.'], 403);
            }
            $hiloId = (int)$id;
            $input = json_decode(file_get_contents('php://input'), true);
            $password = trim((string)($input['password'] ?? ''));
            $code = trim((string)($input['code'] ?? ''));
            if ($hiloId <= 0 || $password === '' || $code === '') {
                $this->json(['status' => 'error', 'message' => 'Faltan contraseña o código.'], 400);
            }

            $st = $this->db->prepare("SELECT password_secure FROM usuarioe WHERE IdUsrA = ? LIMIT 1");
            $st->execute([$uid]);
            $row = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$row || !password_verify($password, (string)$row['password_secure'])) {
                $this->json(['status' => 'error', 'message' => 'Contraseña incorrecta.'], 400);
            }
            if (!UsuarioModel::validateVerificationCode($hiloId, $uid, $code)) {
                $this->json(['status' => 'error', 'message' => 'Código inválido o expirado.'], 400);
            }

            $preview = $this->model->getDeletePreviewHilo($hiloId, $uid, $instId, $role);
            if (!$preview) {
                $this->json(['status' => 'error', 'message' => 'Hilo no encontrado.'], 404);
            }

            $this->model->deleteHiloCascade($hiloId);
            Auditoria::logManual($this->db, $uid, 'DELETE_THREAD_FULL', 'mensaje_hilo', "Eliminación total hilo #{$hiloId} | Asunto: " . ($preview['Asunto'] ?? ''));

            $adminInfo = $this->model->getPersonaCorreoParaNotificacion($uid, $instId);
            $adminEmail = $adminInfo['EmailA'] ?? null;
            $adminName = trim((string)(($adminInfo['NombreA'] ?? '') . ' ' . ($adminInfo['ApellidoA'] ?? '')));
            if ($adminName === '') $adminName = 'Administrador';
            $lang = $sesion['idioma'] ?? 'es';
            if ($adminEmail) {
                $mail = new MailService();
                $mail->sendThreadDeleteSummary(
                    (string)$adminEmail,
                    $adminName,
                    $code,
                    $hiloId,
                    (string)($preview['Asunto'] ?? ''),
                    (string)($this->model->getNombreInstitucion((int)($preview['IdInstitucion'] ?? $instId))),
                    $lang
                );
            }

            $this->json(['status' => 'success', 'message' => 'Hilo eliminado.']);
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
            $role = (int) ($sesion['role'] ?? 0);
            // Staff institucional puede operar en el contexto de sede aunque no exista fila usuarioe exacta (casos legacy / tokens).
            // Investigadores sí requieren pertenencia estricta a la institución.
            if (!$this->model->esRolStaffInstitucional($role) && !$this->model->usuarioEnInstitucion($instId, $uid)) {
                $this->json(['status' => 'error', 'message' => 'Usuario no válido.'], 403);
            }
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = [];
            }

            $adjKIn = isset($input['AdjuntoB2Key']) ? trim((string) $input['AdjuntoB2Key']) : '';
            $adjNIn = isset($input['AdjuntoNombreOriginal']) ? trim((string) $input['AdjuntoNombreOriginal']) : '';
            $adjuntoB2Key = $adjKIn !== '' ? $adjKIn : null;
            $adjuntoNombre = $adjNIn !== '' ? $adjNIn : null;

            $idHilo = isset($input['IdMensajeHilo']) ? (int)$input['IdMensajeHilo'] : 0;
            if ($idHilo > 0) {
                $cuerpo = (string)($input['Cuerpo'] ?? '');
                $otMsg = isset($input['OrigenTipo']) ? trim((string) $input['OrigenTipo']) : '';
                $oiMsg = isset($input['OrigenId']) ? (int) $input['OrigenId'] : 0;
                $oeMsg = isset($input['OrigenEtiqueta']) ? trim((string) $input['OrigenEtiqueta']) : '';
                if ($otMsg === '' || $oiMsg <= 0) {
                    $otMsg = null;
                    $oiMsg = null;
                    $oeMsg = '';
                }
                $out = $this->model->responder(
                    $instId,
                    $idHilo,
                    $uid,
                    $cuerpo,
                    $role,
                    $otMsg,
                    $oiMsg > 0 ? $oiMsg : null,
                    $oeMsg !== '' ? $oeMsg : null,
                    $adjuntoB2Key,
                    $adjuntoNombre
                );
                $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
                if ($code === 200) {
                    $hRow = $this->model->getHiloRow($idHilo, $uid, $instId, $role);
                    if ($hRow) {
                        $asuntoHilo = trim((string) ($hRow['Asunto'] ?? ''));
                        $hiloInst = (int) ($hRow['IdInstitucion'] ?? $instId);
                        $cuerpoT = trim(strip_tags($cuerpo));
                        $ctxAnterior = $this->model->getPenultimoMensajeEnHilo($idHilo);
                        if ($asuntoHilo !== '' && $cuerpoT !== '') {
                            $esInstH = (int) ($hRow['EsInstitucional'] ?? 0) === 1;
                            if ($esInstH) {
                                $idsMail = $this->idsDestinatariosEmailRespuestaInstitucional($hRow, $uid);
                                $emailInfo = $this->notificarCorreoVariosUsuarios($hiloInst, $idsMail, $uid, $asuntoHilo, $cuerpoT, $idHilo, true, $ctxAnterior);
                                $out['data'] = array_merge($out['data'] ?? [], ['emailNotificacion' => $emailInfo]);
                            } else {
                                $pa = (int) ($hRow['IdUsrParticipanteA'] ?? 0);
                                $pbRaw = $hRow['IdUsrParticipanteB'] ?? null;
                                $pb = ($pbRaw !== null && $pbRaw !== '') ? (int) $pbRaw : 0;
                                $destMsg = ($pb > 0) ? (($pa === $uid) ? $pb : $pa) : 0;
                                if ($destMsg > 0) {
                                    $emailInfo = $this->notificarCorreoPorMensajeInterno(
                                        $hiloInst,
                                        $destMsg,
                                        $uid,
                                        $asuntoHilo,
                                        $cuerpoT,
                                        $idHilo,
                                        false,
                                        $ctxAnterior
                                    );
                                    $out['data'] = array_merge($out['data'] ?? [], ['emailNotificacion' => $emailInfo]);
                                }
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
                $idInvDest = isset($input['IdInvestigadorDestino']) ? (int) $input['IdInvestigadorDestino'] : 0;

                $out = $this->model->crearHiloInstitucional(
                    $instId,
                    $uid,
                    $asunto,
                    $cuerpo,
                    $origenTipo,
                    $origenId,
                    $origenEtiqueta,
                    $role,
                    $instDestinoId > 0 ? $instDestinoId : null,
                    $idInvDest > 0 ? $idInvDest : null,
                    $adjuntoB2Key,
                    $adjuntoNombre
                );
                $code = ($out['status'] ?? '') === 'success' ? 200 : 400;
                if ($code === 200) {
                    $hid = (int) ($out['data']['IdMensajeHilo'] ?? 0);
                    if ($hid > 0) {
                        $hRow = $this->model->getHiloRow($hid, $uid, $instId, $role);
                        if ($hRow) {
                            $asuntoT = trim(strip_tags($asunto));
                            $cuerpoT = trim(strip_tags($cuerpo));
                            if ($asuntoT !== '' && $cuerpoT !== '') {
                                $idsMail = $this->idsDestinatariosEmailNuevoHiloInstitucional($hRow, $uid);
                                $emailInfo = $this->notificarCorreoVariosUsuarios(
                                    (int) ($hRow['IdInstitucion'] ?? $instId),
                                    $idsMail,
                                    $uid,
                                    $asuntoT,
                                    $cuerpoT,
                                    $hid,
                                    true
                                );
                                $out['data'] = array_merge($out['data'] ?? [], ['emailNotificacion' => $emailInfo]);
                            }
                        }
                    }
                }
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
                $origenEtiqueta,
                $adjuntoB2Key,
                $adjuntoNombre
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
                        $cuerpoT,
                        (int) ($out['data']['IdMensajeHilo'] ?? 0) ?: null,
                        false
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
        string $cuerpo,
        ?int $hiloId = null,
        bool $esInstitucional = false,
        ?array $mensajeAnterior = null
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
        $instSlug = $this->model->getInstitucionSlug($instIdContexto);
        $mail = new MailService();
        $ok = $mail->sendInternalMessageNotification(
            $emailTo,
            $nombreDest,
            $asunto,
            $cuerpo,
            $instName,
            $nombreRem,
            $lang,
            $instSlug,
            $hiloId,
            $esInstitucional,
            $mensajeAnterior
        );

        return ['ok' => $ok, 'codigo' => $ok ? 'ok' : 'smtp_error'];
    }

    /**
     * @param int[] $destinatarioIds
     * @return array{ok: bool, codigo: string, enviados?: int}
     */
    private function notificarCorreoVariosUsuarios(
        int $instIdContexto,
        array $destinatarioIds,
        int $remitenteId,
        string $asunto,
        string $cuerpo,
        ?int $hiloId = null,
        bool $esInstitucional = false,
        ?array $mensajeAnterior = null
    ): array {
        $destinatarioIds = array_values(array_unique(array_filter(array_map('intval', $destinatarioIds), static fn ($v) => $v > 0)));
        if ($destinatarioIds === []) {
            return ['ok' => true, 'codigo' => 'sin_destinos', 'enviados' => 0];
        }
        $okAll = true;
        $sinEmail = false;
        $n = 0;
        foreach ($destinatarioIds as $did) {
            if ($did === $remitenteId) {
                continue;
            }
            $one = $this->notificarCorreoPorMensajeInterno($instIdContexto, $did, $remitenteId, $asunto, $cuerpo, $hiloId, $esInstitucional, $mensajeAnterior);
            if (($one['codigo'] ?? '') === 'sin_email') {
                $sinEmail = true;
            }
            if (!($one['ok'] ?? false)) {
                $okAll = false;
            } else {
                $n++;
            }
        }
        $codigo = $okAll ? 'ok' : ($sinEmail ? 'sin_email' : 'smtp_error');

        return ['ok' => $okAll, 'codigo' => $codigo, 'enviados' => $n];
    }

    /**
     * @return int[]
     */
    private function idsDestinatariosEmailNuevoHiloInstitucional(array $h, int $remitenteId): array {
        $inst = (int) ($h['IdInstitucion'] ?? 0);
        $instStaff = $this->model->idInstitucionNotificacionConsultaAbierta($h);
        $t = strtolower(trim((string) ($h['OrigenTipo'] ?? '')));
        $a = (int) ($h['IdUsrParticipanteA'] ?? 0);
        $bRaw = $h['IdUsrParticipanteB'] ?? null;
        $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : 0;

        if ($t === 'institucional_comunicado') {
            $ids = $this->model->listIdsUsuariosConTiposInstitucion($inst, [3]);

            return array_values(array_filter($ids, static fn ($id) => $id !== $remitenteId));
        }

        if ($t === 'consulta_institucion' || $t === 'institucional') {
            if ($b > 0) {
                $out = [];
                if ($a > 0 && $a !== $remitenteId) {
                    $out[] = $a;
                }
                if ($b > 0 && $b !== $remitenteId) {
                    $out[] = $b;
                }

                return array_values(array_unique($out));
            }
            if ($this->model->usuarioEsInvestigadorEnInstitucion($inst, $remitenteId)) {
                $ids = $this->model->listIdsUsuariosConTiposInstitucion($instStaff, [1, 2, 4, 5, 6]);

                return array_values(array_filter($ids, static fn ($id) => $id !== $remitenteId));
            }
            // Consulta abierta por personal (sin investigador concreto): avisar al resto del personal de la sede del hilo
            $ids = $this->model->listIdsUsuariosConTiposInstitucion($instStaff, [1, 2, 4, 5, 6]);

            return array_values(array_filter($ids, static fn ($id) => $id !== $remitenteId));
        }

        return [];
    }

    /**
     * @return int[]
     */
    private function idsDestinatariosEmailRespuestaInstitucional(array $h, int $remitenteId): array {
        $inst = (int) ($h['IdInstitucion'] ?? 0);
        $instStaff = $this->model->idInstitucionNotificacionConsultaAbierta($h);
        $t = strtolower(trim((string) ($h['OrigenTipo'] ?? '')));
        $a = (int) ($h['IdUsrParticipanteA'] ?? 0);
        $bRaw = $h['IdUsrParticipanteB'] ?? null;
        $b = ($bRaw !== null && $bRaw !== '') ? (int) $bRaw : 0;

        if ($t === 'institucional_comunicado') {
            $ids = $this->model->listIdsUsuariosConTiposInstitucion($inst, [3]);

            return array_values(array_filter($ids, static fn ($id) => $id !== $remitenteId));
        }

        if ($t === 'consulta_institucion' || $t === 'institucional') {
            if ($b > 0) {
                if ($remitenteId === $a) {
                    return ($b > 0 && $b !== $remitenteId) ? [$b] : [];
                }
                if ($remitenteId === $b) {
                    return ($a > 0 && $a !== $remitenteId) ? [$a] : [];
                }

                return [];
            }
            if ($remitenteId === $a) {
                $ids = $this->model->listIdsUsuariosConTiposInstitucion($instStaff, [1, 2, 4, 5, 6]);

                return array_values(array_filter($ids, static fn ($id) => $id !== $remitenteId));
            }

            if ($a > 0 && $a !== $remitenteId) {
                return [$a];
            }

            return [];
        }

        return [];
    }
}
