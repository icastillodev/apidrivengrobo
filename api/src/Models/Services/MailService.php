<?php
namespace App\Models\Services; 

require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class MailService {
    private $host = 'smtp.hostinger.com';
    private $user = 'no-reply@groboapp.com';
    private $pass = 'XHMI@3hU';
    private $port = 587;
    private $secure = 'tls'; // tls | ssl | none
    private $fromEmail = 'no-reply@groboapp.com';
    private $fromName = 'GROBO';

    public function __construct() {
        // Permite configurar SMTP por entorno (ideal para localhost/Docker) sin romper producción.
        // Si no hay variables, queda el comportamiento actual.
        $envHost = getenv('MAIL_HOST');
        $envPort = getenv('MAIL_PORT');
        $envUser = getenv('MAIL_USER');
        $envPass = getenv('MAIL_PASS');
        $envSecure = getenv('MAIL_SECURE'); // tls | ssl | none
        $envFrom = getenv('MAIL_FROM');
        $envFromName = getenv('MAIL_FROM_NAME');

        if ($envHost !== false && trim($envHost) !== '') $this->host = trim($envHost);
        if ($envPort !== false && is_numeric($envPort)) $this->port = (int)$envPort;
        if ($envUser !== false) $this->user = (string)$envUser;
        if ($envPass !== false) $this->pass = (string)$envPass;
        if ($envSecure !== false && trim($envSecure) !== '') $this->secure = strtolower(trim($envSecure));
        if ($envFrom !== false && trim($envFrom) !== '') $this->fromEmail = trim($envFrom);
        if ($envFromName !== false && trim($envFromName) !== '') $this->fromName = trim($envFromName);
    }

    /**
     * Base URL del front (para enlaces en correos). Lleva a la institución cuando se pasa $slug.
     */
    private function getBaseUrl($slug = null) {
        $isLocal = (strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false || strpos($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1') !== false);
        $protocol = $isLocal ? ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http') : 'https';
        $host = $_SERVER['HTTP_HOST'] ?? 'app.groboapp.com';
        if ($isLocal) {
            $base = $protocol . '://' . $host . '/URBE-API-DRIVEN/front';
        } else {
            $base = $protocol . '://' . $host;
        }
        if ($slug !== null && $slug !== '') {
            return rtrim($base, '/') . '/' . ltrim($slug, '/');
        }
        return rtrim($base, '/');
    }

    /** URL base del front (público para uso en controladores). */
    public static function getFrontBaseUrl() {
        $isLocal = (strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false || strpos($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1') !== false);
        $protocol = $isLocal ? ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http') : 'https';
        $host = $_SERVER['HTTP_HOST'] ?? 'app.groboapp.com';
        if ($isLocal) {
            return $protocol . '://' . $host . '/URBE-API-DRIVEN/front';
        }
        return $protocol . '://' . $host;
    }

    public function sendRegistrationEmail($to, $nombre, $username, $token, $instName, $slug, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['reg_subject'] . " - " . strtoupper($instName);
        $link = $this->getBaseUrl() . "/paginas/confirmar.html?token=$token&inst=$slug";
        
        $body = $this->getTemplate(
            $t['reg_title'],
            $t['reg_hello'] . " <b>" . htmlspecialchars($nombre) . "</b>,<br><br>
            " . $t['reg_created'] . " <b>" . htmlspecialchars($instName) . "</b>.<br>
            " . $t['reg_user'] . " <b>" . htmlspecialchars($username) . "</b>.<br><br>
            " . $t['reg_confirm_paragraph'],
            $link, $t['reg_btn'], $instName, $lang
        );

        return $this->executeSend($to, $subject, $body);
    }

    public function sendResetPasswordEmail($to, $nombre, $token, $instName, $slug, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['reset_subject'] . " - " . strtoupper($instName);
        $link = $this->getBaseUrl() . "/paginas/resetear.html?token=$token&inst=$slug";
        
        $body = $this->getTemplate(
            $t['reset_title'],
            $t['reset_hello'] . " <b>" . htmlspecialchars($nombre) . "</b>,<br><br>
            " . $t['reset_paragraph'] . " <b>" . htmlspecialchars($instName) . "</b>.<br><br>
            " . $t['reset_paragraph2'],
            $link, $t['reset_btn'], $instName, $lang
        );

        return $this->executeSend($to, $subject, $body);
    }

public function executeSend($to, $subject, $body) {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = $this->host;
            $hasUser = (isset($this->user) && trim((string)$this->user) !== '');
            $hasPass = (isset($this->pass) && trim((string)$this->pass) !== '');
            $mail->SMTPAuth   = ($hasUser && $hasPass);
            if ($mail->SMTPAuth) {
                $mail->Username   = $this->user;
                $mail->Password   = $this->pass;
            }

            if ($this->secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($this->secure === 'none') {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            } else {
                // default tls (STARTTLS)
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            $mail->Port       = $this->port;
            $mail->CharSet    = 'UTF-8';

            // Debug opcional por entorno (solo para diagnosticar en local)
            $debug = getenv('MAIL_DEBUG');
            if ($debug !== false && (string)$debug !== '' && (string)$debug !== '0') {
                $mail->SMTPDebug = 2;
                $mail->Debugoutput = function ($str, $level) {
                    error_log("[MAIL_DEBUG:$level] " . $str);
                };
            }

            $mail->setFrom($this->fromEmail ?: $this->user, $this->fromName ?: 'GROBO');
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;

            return $mail->send();
        } catch (Exception $e) {
            error_log("Error PHPMailer: " . $mail->ErrorInfo);
            return false;
        }
    }

public function getTemplate($title, $message, $link = '', $btnText = '', $instName = '', $lang = 'es') {
        $t = MailLang::get($lang);
        $botonHtml = '';
        if (!empty($link) && !empty($btnText)) {
            $botonHtml = "
                <div style='text-align: center; margin: 32px 0 28px;'>
                    <a href=\"$link\" style='background-color: #1a5d3b; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;'>$btnText</a>
                </div>";
        }

        $geckosUrl = 'https://geckos.uy';
        $footerText = htmlspecialchars($t['footer_developed']);

        return "
        <div style='background-color: #f0f2f5; padding: 40px 20px; font-family: \"Segoe UI\", Arial, sans-serif;'>
            <div style='max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);'>
                <div style='background-color: #1a5d3b; padding: 28px 24px; text-align: center;'>
                    <h1 style='color: #fff; margin: 0; font-size: 24px; font-weight: 600;'>GROBO</h1>
                    <p style='color: #a8e6cf; margin: 8px 0 0; font-size: 12px; letter-spacing: 0.5px;'>" . htmlspecialchars($t['subtitle_bioterios']) . ($instName ? ' · ' . htmlspecialchars($instName) : '') . "</p>
                </div>
                <div style='padding: 36px 32px; color: #333;'>
                    <h2 style='color: #1a1a1a; margin: 0 0 20px; font-size: 18px; font-weight: 600;'>$title</h2>
                    <div style='font-size: 15px; line-height: 1.65;'>$message</div>
                    $botonHtml
                </div>
                <div style='background-color: #f8f9fa; padding: 20px 24px; text-align: center; border-top: 1px solid #eee;'>
                    <p style='margin: 0; font-size: 12px; color: #555;'>
                        <a href=\"$geckosUrl\" style='color: #1a5d3b; text-decoration: none; font-weight: 600;'>$footerText</a>
                    </p>
                </div>
            </div>
        </div>";
    }
/**
 * Envía notificación incluyendo el desglose de insumos
 * @param string|null $slug Slug de la institución para enlace (opcional)
 * @param string $lang Idioma del correo (es, en, pt)
 */
public function sendInsumoNotification($to, $nombre, $idformA, $nota, $estado, $insumosHtml, $instName, $slug = null, $lang = 'es') {
    $t = MailLang::get($lang);
    $subject = $t['insumo_subject'] . " #$idformA - " . strtoupper($instName);
    $base = $this->getBaseUrl();
    $link = $base . "/paginas/investigador/mis-pedidos.html" . ($slug ? "?inst=" . urlencode($slug) : "");

    $mensajeCompleto = "
        " . $t['insumo_hello'] . " <b>" . htmlspecialchars($nombre) . "</b>,<br><br>
        " . $t['insumo_updated'] . " <b>#$idformA</b> " . $t['insumo_has_been'] . " <b>" . htmlspecialchars($estado) . "</b>.<br><br>
        <b>" . $t['insumo_detail'] . "</b><br>
        $insumosHtml<br><br>
        <b>" . $t['insumo_observations'] . "</b><br>
        <i>" . htmlspecialchars($nota) . "</i>
    ";

    $body = $this->getTemplate($t['insumo_title'], $mensajeCompleto, $link, $t['insumo_btn'], $instName, $lang);

    return $this->executeSend($to, $subject, $body);
}


/**
     * Envía confirmación de solicitud de Animales Vivos
     * Recibe un array $data con todos los detalles del formulario
     * @param string $lang Idioma del correo (es, en, pt)
     */
public function sendAnimalOrderConfirmation($to, $nombre, $instName, $data, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['animal_subject'] . " #" . $data['id'] . " - " . strtoupper($instName);

        $detalleHtml = "
            " . $t['animal_hello'] . " <b>" . htmlspecialchars($nombre) . "</b>,<br><br>
            " . $t['animal_received'] . "<br><br>

            <div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;'>
                <div style='border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;'>
                    <h3 style='margin: 0; color: #1a5d3b;'>" . $t['animal_order'] . " #{$data['id']}</h3>
                    <p style='margin: 5px 0 0; color: #555; font-size: 13px;'>" . $t['animal_protocol'] . " <strong>{$data['protocolo']}</strong></p>
                </div>

                <table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 15px;'>
                    <tr><td style='padding: 5px 0; color: #666; width: 40%;'>" . $t['animal_species'] . "</td><td style='padding: 5px 0; font-weight: bold;'>{$data['especie']}</td></tr>
                    <tr><td style='padding: 5px 0; color: #666;'>" . $t['animal_cepa'] . "</td><td style='padding: 5px 0; font-weight: bold;'>{$data['cepa']}</td></tr>
                    <tr><td style='padding: 5px 0; color: #666;'>" . $t['animal_details'] . "</td><td style='padding: 5px 0;'>{$data['detalles']}</td></tr>
                </table>

                <div style='background-color: #fff; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 15px;'>
                    <table style='width: 100%; text-align: center; border-collapse: collapse;'>
                        <tr style='background-color: #f1f1f1; font-size: 11px; color: #666;'>
                            <th style='padding: 8px;'>" . $t['animal_males'] . "</th>
                            <th style='padding: 8px;'>" . $t['animal_females'] . "</th>
                            <th style='padding: 8px;'>" . $t['animal_indist'] . "</th>
                            <th style='padding: 8px; color: #1a5d3b;'>" . $t['animal_total'] . "</th>
                        </tr>
                        <tr style='font-size: 15px;'>
                            <td style='padding: 10px; border-right: 1px solid #eee;'>{$data['machos']}</td>
                            <td style='padding: 10px; border-right: 1px solid #eee;'>{$data['hembras']}</td>
                            <td style='padding: 10px; border-right: 1px solid #eee;'>{$data['indistintos']}</td>
                            <td style='padding: 10px; font-weight: bold; color: #1a5d3b;'>{$data['total']}</td>
                        </tr>
                    </table>
                </div>

                <p style='margin: 5px 0; font-size: 14px;'><strong>" . $t['animal_fecha_retiro'] . "</strong> {$data['fecha_retiro']}</p>
                
                <div style='background-color: #fff3cd; padding: 10px; font-size: 13px; margin-top: 15px; border-left: 3px solid #ffc107;'>
                    <strong>" . $t['animal_aclaraciones'] . "</strong><br>
                    <i style='color: #555;'>" . ($data['aclaracion'] ? htmlspecialchars($data['aclaracion']) : $t['animal_sin_obs']) . "</i>
                </div>
            </div>
        ";

        $body = $this->getTemplate($t['animal_title'], $detalleHtml, "", "", $instName, $lang);

        return $this->executeSend($to, $subject, $body);
    }
    /**
     * Envío de confirmación para Reactivos/Insumos
     * @param string $lang Idioma del correo (es, en, pt)
     */
    public function sendReactivoOrderConfirmation($to, $nombre, $instName, $data, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['reactivo_subject'] . " #" . $data['id'] . " - " . strtoupper($instName);

        $detalleHtml = "
            " . $t['reactivo_hello'] . " <b>" . htmlspecialchars($nombre) . "</b>,<br><br>
            " . $t['reactivo_received'] . "<br><br>

            <div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;'>
                <div style='border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;'>
                    <h3 style='margin: 0; color: #1a5d3b;'>" . $t['animal_order'] . " #{$data['id']}</h3>
                    <p style='margin: 5px 0 0; color: #555; font-size: 13px;'>" . $t['animal_protocol'] . " <strong>{$data['protocolo']}</strong></p>
                </div>

                <table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 15px;'>
                    <tr>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666; width: 40%;'>" . $t['reactivo_insumo'] . "</td>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #1a5d3b;'>{$data['insumo']}</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>" . $t['reactivo_cantidad'] . "</td>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;'>{$data['cantidad']}</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>" . $t['reactivo_fecha_retiro'] . "</td>
                        <td style='padding: 8px; border-bottom: 1px solid #eee;'>{$data['fecha_retiro']}</td>
                    </tr>
                </table>
                
                <div style='background-color: #fff3cd; padding: 10px; font-size: 13px; margin-top: 15px; border-left: 3px solid #ffc107;'>
                    <strong>" . $t['animal_aclaraciones'] . "</strong><br>
                    <i style='color: #555;'>" . ($data['aclaracion'] ? htmlspecialchars($data['aclaracion']) : $t['animal_sin_obs']) . "</i>
                </div>
            </div>
        ";

        $body = $this->getTemplate($t['reactivo_title'], $detalleHtml, "", "", $instName, $lang);

        return $this->executeSend($to, $subject, $body);
    }

/**
     * Envía la confirmación profesional para Pedido de Insumos Experimentales
     * @param string|null $slug Slug de la institución para enlace (opcional)
     * @param string $lang Idioma del correo (es, en, pt)
     */
    public function sendInsumoExpOrder($to, $nombre, $instName, $data, $slug = null, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['insumo_exp_subject'] . " #" . $data['id'] . " - " . strtoupper($instName);
        $fecha = date('d/m/Y H:i');

        $itemsHtml = "";
        foreach ($data['items'] as $item) {
            $itemsHtml .= "
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #eee; color: #333;'>{$item['nombre']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;'>{$item['cantidad']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #777; font-size: 11px;'>{$item['unidad']}</td>
            </tr>";
        }

        $base = $this->getBaseUrl();
        $loginLink = $base . "/paginas/login.html" . ($slug ? "?inst=" . urlencode($slug) : "");

        $deptoName = $data['deptoName'] ?? $t['insumo_exp_sin_depto'];
        $retiro = $data['fecRetiroA'] ?? $t['insumo_exp_a_coordinar'];

        $mensaje = "
            <p style='margin: 0 0 16px;'>" . $t['insumo_exp_hello'] . " <strong>" . htmlspecialchars($nombre) . "</strong>,</p>
            <p style='margin: 0 0 16px;'>" . $t['insumo_exp_registered'] . " <strong>" . htmlspecialchars($deptoName) . "</strong>.</p>

            <div style='background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e9ecef;'>
                <p style='margin: 5px 0; font-size: 13px;'><strong>" . $t['insumo_exp_pedido'] . "</strong> #{$data['id']}</p>
                <p style='margin: 5px 0; font-size: 13px;'><strong>" . $t['insumo_exp_fecha'] . "</strong> {$fecha}</p>
                <p style='margin: 5px 0; font-size: 13px;'><strong>" . $t['insumo_exp_retiro'] . "</strong> " . htmlspecialchars($retiro) . "</p>
                " . (!empty($data['aclaraA']) ? "<p style='margin: 5px 0; font-size: 13px;'><strong>" . $t['insumo_exp_nota'] . "</strong> " . htmlspecialchars($data['aclaraA']) . "</p>" : "") . "
            </div>

            <table style='width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;'>
                <thead>
                    <tr style='background-color: #f0f0f0;'>
                        <th style='padding: 8px; text-align: left; color: #444;'>" . $t['insumo_exp_descripcion'] . "</th>
                        <th style='padding: 8px; text-align: center; color: #444;'>" . $t['insumo_exp_cant'] . "</th>
                        <th style='padding: 8px; text-align: center; color: #444;'>" . $t['insumo_exp_unidad'] . "</th>
                    </tr>
                </thead>
                <tbody>
                    $itemsHtml
                </tbody>
            </table>
        ";

        $body = $this->getTemplate($t['insumo_exp_title'], $mensaje, $loginLink, $t['insumo_exp_btn'], $instName, $lang);

        return $this->executeSend($to, $subject, $body);
    }
/**
         * Envía la resolución (Aprobación/Rechazo) de una solicitud de protocolo
         * @param string|null $slug Slug de la institución para enlace (opcional)
         * @param string $lang Idioma del correo (es, en, pt)
         */
        public function sendProtocolDecision($to, $nombre, $tituloProt, $estado, $mensajeAdmin, $instName, $slug = null, $lang = 'es') {
            $t = MailLang::get($lang);
            $isApproved = ($estado == 1);
            $statusText = $isApproved ? $t['protocol_approved'] : $t['protocol_rejected'];
            $color      = $isApproved ? "#1a5d3b" : "#dc3545";
            $bgBadge    = $isApproved ? "#d4edda" : "#f8d7da";
            $icon       = $isApproved ? "✅" : "⚠️";

            $subject = $t['protocol_subject'] . " $statusText - " . strtoupper($instName);

            $htmlContent = "
                " . $t['protocol_hello'] . " <b>" . htmlspecialchars($nombre) . "</b>,<br><br>
                " . $t['protocol_processed'] . " <b>" . htmlspecialchars($instName) . "</b>:<br>
                
                <div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #eee;'>
                    <h3 style='margin: 0; color: #333; font-size: 16px;'>" . htmlspecialchars($tituloProt) . "</h3>
                </div>

                <div style='background-color: $bgBadge; border-left: 5px solid $color; padding: 15px; margin-bottom: 20px;'>
                    <p style='margin: 0; font-size: 12px; color: #555; text-transform: uppercase; font-weight: bold;'>" . $t['protocol_status'] . "</p>
                    <h2 style='margin: 5px 0 0; color: $color; font-size: 20px;'>$icon $statusText</h2>
                </div>
            ";

            if (!empty($mensajeAdmin)) {
                $htmlContent .= "
                <div style='border: 1px solid #ddd; border-radius: 4px; overflow: hidden;'>
                    <div style='background-color: #eee; padding: 8px 15px; font-weight: bold; font-size: 13px; color: #555;'>
                        " . $t['protocol_comments'] . "
                    </div>
                    <div style='padding: 15px; background-color: #fff; color: #333; font-style: italic;'>
                        " . nl2br(htmlspecialchars($mensajeAdmin)) . "
                    </div>
                </div>";
            } else {
                $htmlContent .= "<p style='color: #777; font-size: 13px;'><i>" . $t['protocol_sin_comentarios'] . "</i></p>";
            }

            $body = $this->getTemplate($t['protocol_title'], $htmlContent, '', '', $instName, $lang);

            return $this->executeSend($to, $subject, $body);
        }

    /**
     * Envía el código de verificación para eliminación total de usuario (Superadmin).
     */
    public function sendDeleteVerificationCode($to, $adminName, $code, $userLogin, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['delete_code_subject'] . ' - GROBO';
        $msg = $t['delete_code_hello'] . ' <b>' . htmlspecialchars($adminName) . '</b>,<br><br>'
            . $t['delete_code_intro'] . ' <b>' . htmlspecialchars($userLogin) . '</b>.<br><br>'
            . '<p style="font-size: 18px; font-weight: bold; letter-spacing: 4px; color: #1a5d3b;">' . htmlspecialchars($code) . '</p>'
            . '<p style="color: #666;">' . $t['delete_code_code'] . '</p>'
            . '<p style="font-size: 12px; color: #999;">' . $t['delete_code_expires'] . '</p>';
        $body = $this->getTemplate($t['delete_code_title'], $msg, '', '', 'GROBO', $lang);
        return $this->executeSend($to, $subject, $body);
    }

    /**
     * Envía el resumen tras eliminación total de usuario (Superadmin).
     */
    public function sendDeleteSummary($to, $adminName, $deletedUserLogin, $code, $detail, $lang = 'es') {
        $t = MailLang::get($lang);
        $subject = $t['delete_summary_subject'] . ' - GROBO';
        $msg = $t['delete_code_hello'] . ' <b>' . htmlspecialchars($adminName) . '</b>,<br><br>'
            . $t['delete_summary_intro'] . '<br><br>'
            . '<strong>' . $t['delete_summary_user'] . '</strong> ' . htmlspecialchars($deletedUserLogin) . '<br>'
            . '<strong>' . $t['delete_summary_code'] . '</strong> ' . htmlspecialchars($code) . '<br><br>'
            . '<strong>' . $t['delete_summary_detail'] . '</strong><br>' . nl2br(htmlspecialchars($detail));
        $body = $this->getTemplate($t['delete_summary_title'], $msg, '', '', 'GROBO', $lang);
        return $this->executeSend($to, $subject, $body);
    }
}