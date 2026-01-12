<?php
namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class MailService {
    public function send($to, $subject, $body) {
        $mail = new PHPMailer(true);

        try {
            // Configuración del Servidor SMTP
            $mail->isSMTP();
            $mail->Host       = 'tu-servidor-smtp.com'; // Ejemplo: smtp.gmail.com
            $mail->SMTPAuth   = true;
            $mail->Username   = 'tu-correo@grobo.com';
            $mail->Password   = 'tu-password-de-aplicacion';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; 
            $mail->Port       = 587;

            // Remitente y Destinatario
            $mail->setFrom('tu-correo@grobo.com', 'GROBO - Gestión de Bioterio');
            $mail->addAddress($to);

            // Contenido
            $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
            $mail->Subject = $subject;
            $mail->Body    = $body;

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log("Error de PHPMailer: {$mail->ErrorInfo}");
            return false;
        }
    }
}