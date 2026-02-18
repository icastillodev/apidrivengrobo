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

public function executeSend($to, $subject, $body) {
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

public function getTemplate($title, $message, $link = '', $btnText = '') {
        // Lógica del botón: Si hay link, creamos el HTML del botón. Si no, queda vacío.
        $botonHtml = '';
        if (!empty($link) && !empty($btnText)) {
            $botonHtml = "
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='$link' style='background-color: #f59e0b; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-transform: uppercase; font-size: 12px;'>$btnText</a>
                </div>";
        }

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
                    
                    $botonHtml  </div>
                <div style='background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;'>
                    <p style='margin: 0; font-size: 11px; color: #000; font-weight: bold;'>Desarrollado por NETWISE</p>
                </div>
            </div>
        </div>";
    }
/**
 * Envía notificación incluyendo el desglose de insumos
 */
public function sendInsumoNotification($to, $nombre, $idformA, $nota, $estado, $insumosHtml, $instName) {
    $subject = "Actualización Pedido de Insumos #$idformA - " . strtoupper($instName);
    $link = "http://localhost/URBE-API-DRIVEN/front/paginas/investigador/mis-pedidos.html";
    
    // Construimos un mensaje más completo
    $mensajeCompleto = "
        Hola <b>$nombre</b>,<br><br>
        Tu pedido de insumos <b>#$idformA</b> ha sido actualizado a estado: <b>$estado</b>.<br><br>
        <b>Detalle de productos solicitados:</b><br>
        $insumosHtml<br><br>
        <b>Observaciones del Administrador:</b><br>
        <i>$nota</i>
    ";

    $body = $this->getTemplate("Actualización de Pedido", $mensajeCompleto, $link, "VER MI PEDIDO");

    return $this->executeSend($to, $subject, $body);
}


/**
     * Envía confirmación de solicitud de Animales Vivos
     * Recibe un array $data con todos los detalles del formulario
     */
public function sendAnimalOrderConfirmation($to, $nombre, $instName, $data) {
        $subject = "Solicitud Animales #" . $data['id'] . " - " . strtoupper($instName);
        
        // YA NO DEFINIMOS LA VARIABLE $link

        $detalleHtml = "
            Hola <b>$nombre</b>,<br><br>
            Hemos recibido correctamente tu solicitud de animales vivos. Aquí tienes el resumen:<br><br>

            <div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;'>
                <div style='border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;'>
                    <h3 style='margin: 0; color: #1a5d3b;'>Pedido #{$data['id']}</h3>
                    <p style='margin: 5px 0 0; color: #555; font-size: 13px;'>Protocolo: <strong>{$data['protocolo']}</strong></p>
                </div>

                <table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 15px;'>
                    <tr><td style='padding: 5px 0; color: #666; width: 40%;'>Especie:</td><td style='padding: 5px 0; font-weight: bold;'>{$data['especie']}</td></tr>
                    <tr><td style='padding: 5px 0; color: #666;'>Cepa/Sub:</td><td style='padding: 5px 0; font-weight: bold;'>{$data['cepa']}</td></tr>
                    <tr><td style='padding: 5px 0; color: #666;'>Detalles:</td><td style='padding: 5px 0;'>{$data['detalles']}</td></tr>
                </table>

                <div style='background-color: #fff; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 15px;'>
                    <table style='width: 100%; text-align: center; border-collapse: collapse;'>
                        <tr style='background-color: #f1f1f1; font-size: 11px; color: #666;'>
                            <th style='padding: 8px;'>MACHOS</th>
                            <th style='padding: 8px;'>HEMBRAS</th>
                            <th style='padding: 8px;'>INDIST.</th>
                            <th style='padding: 8px; color: #1a5d3b;'>TOTAL</th>
                        </tr>
                        <tr style='font-size: 15px;'>
                            <td style='padding: 10px; border-right: 1px solid #eee;'>{$data['machos']}</td>
                            <td style='padding: 10px; border-right: 1px solid #eee;'>{$data['hembras']}</td>
                            <td style='padding: 10px; border-right: 1px solid #eee;'>{$data['indistintos']}</td>
                            <td style='padding: 10px; font-weight: bold; color: #1a5d3b;'>{$data['total']}</td>
                        </tr>
                    </table>
                </div>

                <p style='margin: 5px 0; font-size: 14px;'><strong>Fecha Retiro:</strong> {$data['fecha_retiro']}</p>
                
                <div style='background-color: #fff3cd; padding: 10px; font-size: 13px; margin-top: 15px; border-left: 3px solid #ffc107;'>
                    <strong>Aclaraciones:</strong><br>
                    <i style='color: #555;'>" . ($data['aclaracion'] ?: 'Sin observaciones.') . "</i>
                </div>
            </div>
        ";

        // PASAMOS COMILLAS VACÍAS "" EN LUGAR DE LINK Y TEXTO DE BOTÓN
        $body = $this->getTemplate("Confirmación de Solicitud", $detalleHtml, "", "");

        return $this->executeSend($to, $subject, $body);
    }
    /**
     * Envío de confirmación para Reactivos/Insumos
     */
    public function sendReactivoOrderConfirmation($to, $nombre, $instName, $data) {
        $subject = "Solicitud de reactivos #" . $data['id'] . " - " . strtoupper($instName);

        $detalleHtml = "
            Hola <b>$nombre</b>,<br><br>
            Hemos recibido correctamente tu solicitud de reactivos/insumos.<br><br>

            <div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;'>
                <div style='border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;'>
                    <h3 style='margin: 0; color: #1a5d3b;'>Pedido #{$data['id']}</h3>
                    <p style='margin: 5px 0 0; color: #555; font-size: 13px;'>Protocolo: <strong>{$data['protocolo']}</strong></p>
                </div>

                <table style='width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 15px;'>
                    <tr>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666; width: 40%;'>Insumo:</td>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #1a5d3b;'>{$data['insumo']}</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>Cantidad:</td>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;'>{$data['cantidad']}</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px; border-bottom: 1px solid #eee; color: #666;'>Fecha Retiro:</td>
                        <td style='padding: 8px; border-bottom: 1px solid #eee;'>{$data['fecha_retiro']}</td>
                    </tr>
                </table>
                
                <div style='background-color: #fff3cd; padding: 10px; font-size: 13px; margin-top: 15px; border-left: 3px solid #ffc107;'>
                    <strong>Aclaraciones:</strong><br>
                    <i style='color: #555;'>" . ($data['aclaracion'] ?: 'Sin observaciones.') . "</i>
                </div>
            </div>
        ";

        // Sin botón de acción
        $body = $this->getTemplate("Confirmación de Solicitud", $detalleHtml, "", "");

        return $this->executeSend($to, $subject, $body);
    }

/**
     * Envía la confirmación profesional para Pedido de Insumos Experimentales
     */
    public function sendInsumoExpOrder($to, $nombre, $instName, $data) {
        $subject = "Solicitud Insumos #" . $data['id'] . " - " . strtoupper($instName);
        $fecha = date('d/m/Y H:i');

        // Construir tabla de ítems con diseño limpio
        $itemsHtml = "";
        foreach ($data['items'] as $item) {
            $itemsHtml .= "
            <tr>
                <td style='padding: 8px; border-bottom: 1px solid #eee; color: #333;'>{$item['nombre']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;'>{$item['cantidad']}</td>
                <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: #777; font-size: 11px;'>{$item['unidad']}</td>
            </tr>";
        }

        // Diseño estilo GROBO (Verde Institucional)
        $body = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;'>
            <div style='background-color: #1a5d3b; padding: 20px; text-align: center;'>
                <h2 style='color: #ffffff; margin: 0; font-size: 20px;'>SOLICITUD DE INSUMOS</h2>
                <p style='color: #a8e6cf; margin: 5px 0 0 0; font-size: 12px;'>GROBO - " . strtoupper($instName) . "</p>
            </div>

            <div style='padding: 20px; background-color: #ffffff;'>
                <p style='color: #555; font-size: 14px;'>Hola <strong>$nombre</strong>,</p>
                <p style='color: #555; font-size: 14px;'>Se ha registrado tu solicitud para el departamento <strong>{$data['deptoName']}</strong>.</p>

                <div style='background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;'>
                    <p style='margin: 5px 0; font-size: 13px;'><strong>🆔 N° Pedido:</strong> #{$data['id']}</p>
                    <p style='margin: 5px 0; font-size: 13px;'><strong>📅 Fecha:</strong> {$fecha}</p>
                    <p style='margin: 5px 0; font-size: 13px;'><strong>📅 Retiro Estimado:</strong> " . ($data['fecRetiroA'] ?? 'A coordinar') . "</p>
                    " . ($data['aclaraA'] ? "<p style='margin: 5px 0; font-size: 13px; color: #d9534f;'><strong>📝 Nota:</strong> {$data['aclaraA']}</p>" : "") . "
                </div>

                <table style='width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;'>
                    <thead>
                        <tr style='background-color: #f0f0f0;'>
                            <th style='padding: 8px; text-align: left; color: #444;'>Descripción</th>
                            <th style='padding: 8px; text-align: center; color: #444;'>Cant.</th>
                            <th style='padding: 8px; text-align: center; color: #444;'>Unidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        $itemsHtml
                    </tbody>
                </table>
                
                <div style='margin-top: 30px; text-align: center;'>
                    <a href='http://localhost/URBE-API-DRIVEN/front/paginas/login.html' style='background-color: #1a5d3b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 12px;'>IR AL SISTEMA</a>
                </div>
            </div>

            <div style='background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e0e0e0;'>
                Este es un correo automático generado por el sistema GROBO.
            </div>
        </div>";

        return $this->executeSend($to, $subject, $body);
    }
        /**
         * Envía la resolución (Aprobación/Rechazo) de una solicitud de protocolo
         */
        public function sendProtocolDecision($to, $nombre, $tituloProt, $estado, $mensajeAdmin, $instName) {
            // Configuración visual según estado (1 = Aprobado, 2 = Rechazado/Observado)
            $isApproved = ($estado == 1);
            $statusText = $isApproved ? "APROBADO" : "RECHAZADO / OBSERVADO";
            $color      = $isApproved ? "#1a5d3b" : "#dc3545"; // Verde Institucional vs Rojo
            $bgBadge    = $isApproved ? "#d4edda" : "#f8d7da";
            $icon       = $isApproved ? "✅" : "⚠️";

            $subject = "Resolución de Protocolo: $statusText - " . strtoupper($instName);
            
            // Link directo a la lista de protocolos del usuario
            $link = "http://localhost/URBE-API-DRIVEN/front/paginas/usuario/mis_protocolos.html";

            $htmlContent = "
                Hola <b>$nombre</b>,<br><br>
                El Comité/Administración de <b>$instName</b> ha procesado tu solicitud para el protocolo:<br>
                
                <div style='background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #eee;'>
                    <h3 style='margin: 0; color: #333; font-size: 16px;'>$tituloProt</h3>
                </div>

                <div style='background-color: $bgBadge; border-left: 5px solid $color; padding: 15px; margin-bottom: 20px;'>
                    <p style='margin: 0; font-size: 12px; color: #555; text-transform: uppercase; font-weight: bold;'>Estado de la Solicitud</p>
                    <h2 style='margin: 5px 0 0; color: $color; font-size: 20px;'>$icon $statusText</h2>
                </div>
            ";

            // Si hay mensaje del admin, lo mostramos en un bloque destacado
            if (!empty($mensajeAdmin)) {
                $htmlContent .= "
                <div style='border: 1px solid #ddd; border-radius: 4px; overflow: hidden;'>
                    <div style='background-color: #eee; padding: 8px 15px; font-weight: bold; font-size: 13px; color: #555;'>
                        Comentarios / Motivo:
                    </div>
                    <div style='padding: 15px; background-color: #fff; color: #333; font-style: italic;'>
                        " . nl2br($mensajeAdmin) . "
                    </div>
                </div>";
            } else {
                $htmlContent .= "<p style='color: #777; font-size: 13px;'><i>Sin comentarios adicionales.</i></p>";
            }

            $body = $this->getTemplate("Resolución de Solicitud", $htmlContent, $link, "VER MIS PROTOCOLOS");

            return $this->executeSend($to, $subject, $body);
        }
}