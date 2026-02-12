<?php
namespace App\Models\Auth;

// Asegúrate de importar el MailService
use App\Models\Services\MailService;

class AuthService {
    private $model;

    public function __construct($model) { 
        $this->model = $model; 
    }

    public function validateSlug($slug) {
        return $this->model->getInstitucionBySlug($slug);
    }

public function authenticate($user, $pass, $slug) {
        // 1. Validar contexto de la sede
        $instContext = $this->model->getInstitucionBySlug($slug);
        if (!$instContext) return ['status' => false, 'message' => 'Institución no válida'];

        $userData = $this->model->getUserByUsername($user);
        
        // 2. Verificación de credenciales
        if (!$userData || !password_verify($pass, $userData['password_secure'])) {
            return ['status' => false, 'message' => 'Credenciales incorrectas'];
        }

        // 3. REGLA MAESTRA: Superadmin (Rol 1)
        // Entra a cualquier sede.
        if ((int)$userData['role'] === 1) {
            $this->model->updateActivityMetadata($userData['IdUsrA']);
            $userData['IdInstitucion'] = $instContext['IdInstitucion']; 
            return $this->handle2FALogic($userData, $instContext['NombreInst']); // Rol 1 SIEMPRE pide 2FA aquí
        }

        // 4. REGLA INSTITUCIONAL ESTRICTA:
        // Aseguramos comparar ENTEROS para evitar error por tipo de dato ("1" vs 1)
        $userInstId = (int)$userData['IdInstitucion'];
        $contextInstId = (int)$instContext['IdInstitucion'];

        if ($userInstId !== $contextInstId) {
            // DEBUG (Opcional: Si sigue fallando, descomenta para ver qué llega)
            // return ['status' => false, 'message' => "Mismatch: User($userInstId) vs Context($contextInstId)"];
            
            return [
                'status' => false, 
                'message' => 'Acceso denegado: Tu cuenta no pertenece a ' . $instContext['NombreInst']
            ];
        }

        // 5. LOGICA 2FA PARA ADMINS DE SEDE (Rol 2)
        if ((int)$userData['role'] === 2) {
            return $this->handle2FALogic($userData, $instContext['NombreInst']);
        }

        // 6. Éxito Directo (Rol 3, 4, etc)
        $this->model->updateActivityMetadata($userData['IdUsrA']);
        return ['status' => true, 'user' => $userData];
    }

public function attemptSuperAdminLogin($user, $pass) {
    $userData = $this->model->getSuperAdminByUsername($user);

    if (!$userData) {
        return ["status" => false, "message" => "Usuario maestro no encontrado (Revise rol=1)"];
    }

    if (password_verify($pass, $userData['password_secure'])) {
        // LOGIN OK -> VAMOS AL 2FA
        return $this->handle2FALogic($userData, "PANEL MAESTRO");
    }

    // Si llega aquí, el hash no coincide
    return ["status" => false, "message" => "Contraseña incorrecta (Verifique hash)"];
}

    /**
     * VERIFICACIÓN FINAL DEL CÓDIGO
     */
    public function verify2FACode($userId, $code) {
        $user = $this->model->verifyAndGetUser2FA($userId, $code);
        if ($user) {
            // Limpiamos el código y actualizamos actividad
            $this->model->clear2FACode($userId);
            $this->model->updateActivityMetadata($userId);
            return $user;
        }
        return false;
    }

    // --- HELPER PRIVADO: Manejo de 2FA ---
    private function handle2FALogic($user, $instName) {
        // Generar Código Numérico
        $code = rand(100000, 999999);
        
        // Guardar en BD
        $this->model->save2FACode($user['IdUsrA'], $code);

        // Enviar Correo
        $mail = new MailService();
        $body = "
            <div style='background:#f4f4f4; padding:20px; text-align:center; font-family:sans-serif;'>
                <div style='background:white; max-width:400px; margin:0 auto; padding:30px; border-radius:10px; border-top:5px solid #d97706;'>
                    <h2 style='color:#333; margin-top:0;'>CÓDIGO DE SEGURIDAD</h2>
                    <p>Hola <b>{$user['NombreA']}</b>,</p>
                    <p>Se ha solicitado un acceso para <b>{$instName}</b>.</p>
                    <div style='font-size:32px; letter-spacing:5px; font-weight:bold; color:#d97706; margin:20px 0; background:#fffbeb; padding:10px;'>$code</div>
                    <p style='color:#999; font-size:12px;'>Este código expira en 10 minutos.</p>
                </div>
            </div>
        ";
        
        // Si no tiene mail, esto fallará silenciosamente o podrías manejar el error
        // Asumimos que los admin tienen mail válido.
        $mail->executeSend($user['EmailA'], "Código de Acceso GROBO", $body);

        // Retornamos estado especial
        return [
            'status' => '2fa_required',
            'userId' => $user['IdUsrA']
        ];
    }
}