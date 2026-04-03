<?php
namespace App\Controllers;

use App\Models\Services\MailService;
use App\Models\Support\SupportTicketModel;
use App\Utils\Auditoria;

class SupportTicketController
{
    /** @var SupportTicketModel */
    private $model;

    public function __construct($db)
    {
        $this->model = new SupportTicketModel($db);
    }

    private function json($data, $code = 200)
    {
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

    private function readJson(): array
    {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);

        return is_array($input) ? $input : [];
    }

    private function normalizeCuerpo(string $s): string
    {
        $s = trim(strip_tags($s));
        if (mb_strlen($s) > 8000) {
            $s = mb_substr($s, 0, 8000);
        }

        return $s;
    }

    private function puedeResponderTurno(string $estado, int $role, array $ticket, int $userId): bool
    {
        if ($estado === 'cerrado') {
            return false;
        }
        if ($role === 1) {
            return $estado === 'espera_soporte';
        }

        return (int) $ticket['IdUsrA'] === $userId && $estado === 'espera_usuario';
    }

    private function puedeCerrar(string $estado, int $role, array $ticket, int $userId): bool
    {
        if ($estado === 'cerrado') {
            return false;
        }
        if ($role === 1) {
            return true;
        }

        return (int) $ticket['IdUsrA'] === $userId;
    }

    public function listTickets()
    {
        try {
            $sesion = Auditoria::getDatosSesion();
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = min(50, max(5, (int) ($_GET['limit'] ?? 20)));

            $out = $this->model->listTickets($uid, $role, $page, $limit);
            foreach ($out['items'] as &$row) {
                $row['puedeResponder'] = $this->puedeResponderTurno((string) $row['estado'], $role, $row, $uid);
                $row['puedeCerrar'] = $this->puedeCerrar((string) $row['estado'], $role, $row, $uid);
            }
            unset($row);
            $this->json($out);
        } catch (\Throwable $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getTicket($id)
    {
        try {
            $sesion = Auditoria::getDatosSesion();
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $ticketId = (int) $id;
            $bundle = $this->model->getTicketWithMessages($ticketId, $uid, $role);
            $ticket = $bundle['ticket'];
            $estado = (string) $ticket['estado'];
            $bundle['puedeResponder'] = $this->puedeResponderTurno($estado, $role, $ticket, $uid);
            $bundle['puedeCerrar'] = $this->puedeCerrar($estado, $role, $ticket, $uid);
            $this->json($bundle);
        } catch (\RuntimeException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        } catch (\Throwable $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function createTicket()
    {
        try {
            $sesion = Auditoria::getDatosSesion();
            $uid = (int) $sesion['userId'];
            $instId = isset($sesion['instId']) ? (int) $sesion['instId'] : 0;
            $input = $this->readJson();
            $asunto = trim(strip_tags((string) ($input['asunto'] ?? '')));
            $mensaje = $this->normalizeCuerpo((string) ($input['mensaje'] ?? ''));
            if ($asunto === '' || mb_strlen($asunto) > 255) {
                $this->json(['status' => 'error', 'message' => 'Asunto inválido.'], 400);
            }
            if ($mensaje === '') {
                $this->json(['status' => 'error', 'message' => 'El mensaje no puede estar vacío.'], 400);
            }

            $id = $this->model->createTicket($uid, $instId > 0 ? $instId : null, $asunto, $mensaje);

            $mail = new MailService();
            $info = $this->model->getUserEmailAndName($uid);
            $nombre = $info ? trim(($info['NombreA'] ?? '') . ' ' . ($info['ApellidoA'] ?? '')) : '';
            if ($nombre === '') {
                $nombre = 'Usuario';
            }
            $login = $info['UsrA'] ?? ('#' . $uid);
            $instName = $this->model->getNombreInstitucion($instId > 0 ? $instId : null);
            $mail->sendSupportNotifyGecko($id, $asunto, $mensaje, $nombre, (string) $login, $instName, true);

            $this->json(['IdSupportTicket' => $id]);
        } catch (\Throwable $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function replyTicket($id)
    {
        try {
            $sesion = Auditoria::getDatosSesion();
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $ticketId = (int) $id;
            $ticket = $this->model->assertCanAccessTicket($ticketId, $uid, $role);
            $estado = (string) $ticket['estado'];
            if ($estado === 'cerrado') {
                $this->json(['status' => 'error', 'message' => 'El ticket está cerrado.'], 403);
            }
            $input = $this->readJson();
            $mensaje = $this->normalizeCuerpo((string) ($input['mensaje'] ?? ''));
            if ($mensaje === '') {
                $this->json(['status' => 'error', 'message' => 'El mensaje no puede estar vacío.'], 400);
            }

            $esSoporte = ($role === 1);
            if ($esSoporte) {
                if ($estado !== 'espera_soporte') {
                    $this->json(['status' => 'error', 'message' => 'No es su turno para responder (espere el mensaje del usuario).'], 403);
                }
            } elseif ((int) $ticket['IdUsrA'] !== $uid || $estado !== 'espera_usuario') {
                $this->json(['status' => 'error', 'message' => 'No es su turno para responder (espere la respuesta de soporte).'], 403);
            }

            $nuevoEstado = $esSoporte ? 'espera_usuario' : 'espera_soporte';
            $this->model->addReply($ticketId, $uid, $esSoporte, $mensaje, $nuevoEstado);

            $mail = new MailService();
            if ($esSoporte) {
                $ownerId = (int) $ticket['IdUsrA'];
                $owner = $this->model->getUserEmailAndName($ownerId);
                $asunto = (string) $ticket['asunto'];
                $tid = isset($ticket['IdInstitucion']) && $ticket['IdInstitucion'] !== null && (int) $ticket['IdInstitucion'] > 0
                    ? (int) $ticket['IdInstitucion']
                    : null;
                $instName = $this->model->getNombreInstitucion($tid);
                if ($owner) {
                    $email = trim((string) ($owner['EmailA'] ?? ''));
                    $nombre = trim(($owner['NombreA'] ?? '') . ' ' . ($owner['ApellidoA'] ?? ''));
                    if ($nombre === '') {
                        $nombre = 'Usuario';
                    }
                    $lang = strtolower(trim((string) ($owner['lang'] ?? 'es')));
                    if (!in_array($lang, ['es', 'en', 'pt'], true)) {
                        $lang = 'es';
                    }
                    $mail->sendSupportReplyToUser($email, $nombre, $ticketId, $asunto, $mensaje, $instName, $lang);
                }
            } else {
                $info = $this->model->getUserEmailAndName($uid);
                $nombre = $info ? trim(($info['NombreA'] ?? '') . ' ' . ($info['ApellidoA'] ?? '')) : '';
                if ($nombre === '') {
                    $nombre = 'Usuario';
                }
                $login = $info['UsrA'] ?? ('#' . $uid);
                $instIdSes = isset($sesion['instId']) ? (int) $sesion['instId'] : 0;
                $instName = $this->model->getNombreInstitucion($instIdSes > 0 ? $instIdSes : null);
                $asunto = (string) $ticket['asunto'];
                $mail->sendSupportNotifyGecko($ticketId, $asunto, $mensaje, $nombre, (string) $login, $instName, false);
            }

            $this->json(['ok' => true]);
        } catch (\RuntimeException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        } catch (\Throwable $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function cerrarTicket($id)
    {
        try {
            $sesion = Auditoria::getDatosSesion();
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);
            $ticketId = (int) $id;
            $ticket = $this->model->assertCanAccessTicket($ticketId, $uid, $role);
            if ((string) $ticket['estado'] === 'cerrado') {
                $this->json(['status' => 'error', 'message' => 'El ticket ya está cerrado.'], 400);
            }
            if ($role !== 1 && (int) $ticket['IdUsrA'] !== $uid) {
                $this->json(['status' => 'error', 'message' => 'No autorizado.'], 403);
            }
            $this->model->cerrarTicket($ticketId);
            $this->json(['ok' => true]);
        } catch (\RuntimeException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 403);
        } catch (\Throwable $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
