<?php
namespace App\Controllers;

use App\Models\Services\MailService;
use App\Utils\Auditoria;
use PDO;

class SalesContactController
{
    /** @var PDO */
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
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

    /**
     * POST /sales/inquiry — envía un correo a ventas con categoría fija "venta".
     * Body JSON: { "mensaje": "..." }
     */
    public function sendInquiry()
    {
        try {
            $sesion = Auditoria::getDatosSesion();
            $uid = (int) $sesion['userId'];

            $raw = file_get_contents('php://input');
            $input = json_decode($raw, true);
            if (!is_array($input)) {
                $this->json(['status' => 'error', 'message' => 'JSON inválido'], 400);
            }

            $mensaje = isset($input['mensaje']) ? trim(strip_tags((string) $input['mensaje'])) : '';
            if (mb_strlen($mensaje) < 10) {
                $this->json(['status' => 'error', 'message' => 'Escriba un mensaje más detallado (mínimo 10 caracteres).'], 400);
            }
            if (mb_strlen($mensaje) > 8000) {
                $mensaje = mb_substr($mensaje, 0, 8000);
            }

            $stmt = $this->db->prepare(
                'SELECT u.UsrA, p.NombreA, p.ApellidoA, p.EmailA, COALESCE(i.NombreInst, \'\') AS NombreInst
                 FROM usuarioe u
                 INNER JOIN personae p ON u.IdUsrA = p.IdUsrA
                 LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                 WHERE u.IdUsrA = ? LIMIT 1'
            );
            $stmt->execute([$uid]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'Usuario no encontrado'], 404);
            }

            $email = trim((string) ($row['EmailA'] ?? ''));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->json(['status' => 'error', 'message' => 'Actualice su correo en Mi perfil para poder enviar consultas.'], 400);
            }

            $nombre = trim((string) ($row['NombreA'] ?? '') . ' ' . (string) ($row['ApellidoA'] ?? ''));
            if ($nombre === '') {
                $nombre = (string) ($row['UsrA'] ?? 'Usuario');
            }
            $login = (string) ($row['UsrA'] ?? '');
            $inst = (string) ($row['NombreInst'] ?? '');

            $mail = new MailService();
            $ok = $mail->sendSalesInquiryEmail($mensaje, $email, $nombre, $login, $inst, 'venta');
            if (!$ok) {
                $this->json(['status' => 'error', 'message' => 'No se pudo enviar el correo. Intente más tarde.'], 500);
            }

            $dest = $mail->getSalesMailTo();
            $this->json([
                'destinatario' => $dest,
                'correo_usuario' => $email,
            ]);
        } catch (\Throwable $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
