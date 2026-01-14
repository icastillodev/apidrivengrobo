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

    public function sendRegistrationEmail($to, $nombre, $username, $token, $instName, $slug) {
        $subject = "Confirma tu cuenta - " . strtoupper($instName);
        $link = "http://localhost/URBE-API-DRIVEN/front/paginas/confirmar.html?token=$token&inst=$slug";
        
        $body = $this->getTemplate("¡Bienvenido a GROBO!", "
            Hola <b>$nombre</b>,<br><br>
            Se ha creado una cuenta para ti en la institución <b>$instName</b>.<br>
            Has sido registrado como usuario: <b>$username</b>.<br><br>
            Es necesario que confirmes tu correo electrónico para activar tu acceso.
        ", $link, "CONFIRMAR USUARIO");

        return $this->executeSend($to, $subject, $body);
    }

    public function sendResetPasswordEmail($to, $nombre, $token, $instName, $slug) {
        $subject = "Recuperar Contraseña - " . strtoupper($instName);
        $link = "http://localhost/URBE-API-DRIVEN/front/paginas/resetear.html?token=$token&inst=$slug";
        
        $body = $this->getTemplate("Restablecer Contraseña", "
            Hola <b>$nombre</b>,<br><br>
            Has solicitado restablecer tu clave para la institución <b>$instName</b>.<br>
            Haz clic en el botón inferior para definir una nueva contraseña.
        ", $link, "CAMBIAR CONTRASEÑA");

        return $this->executeSend($to, $subject, $body);
    }

    private function executeSend($to, $subject, $body) {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = $this->host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->user;
            $mail->Password   = $this->pass;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $this->port;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom($this->user, 'GROBO');
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

    private function getTemplate($title, $message, $link, $btnText) {
        return "
        <div style='background-color: #f4f4f4; padding: 40px; font-family: sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;'>
                <div style='background-color: #000; padding: 25px; text-align: center;'>
                    <h1 style='color: #fff; margin: 0; font-size: 22px;'>GROBO</h1>
                    <p style='color: #f59e0b; margin: 5px 0 0; font-size: 11px; text-transform: uppercase; font-weight: bold;'>Desarrollado para Bioterios</p>
                </div>
                <div style='padding: 40px; color: #333;'>
                    <h2 style='color: #111; margin-top: 0;'>$title</h2>
                    <p style='font-size: 14px; line-height: 1.6;'>$message</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='$link' style='background-color: #f59e0b; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-transform: uppercase; font-size: 12px;'>$btnText</a>
                    </div>
                </div>
                <div style='background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;'>
                    <p style='margin: 0; font-size: 11px; color: #000; font-weight: bold;'>Desarrollado por NETWISE</p>
                </div>
            </div>
        </div>";
    }
}