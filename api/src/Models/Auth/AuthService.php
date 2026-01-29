<?php
namespace App\Models\Auth;

class AuthService {
    private $model;

    public function __construct($model) { 
        $this->model = $model; 
    }

    // ESTA ES LA FUNCIÓN QUE TE FALTA
        public function validateSlug($slug) {
            // En lugar de retornar true/false, retornamos el array que viene del modelo
            $inst = $this->model->getInstitucionBySlug($slug);
            return $inst; // Retornará el array asociativo si existe, o false si no.
        }



// api/src/Models/Auth/AuthService.php

// api/src/Models/Auth/AuthService.php

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
    // Entra a cualquier sede y el sistema lo mimetiza con el IdInstitucion local.
    if ((int)$userData['role'] === 1) {
        $this->model->updateActivityMetadata($userData['IdUsrA']);
        $userData['IdInstitucion'] = $instContext['IdInstitucion']; 
        return ['status' => true, 'user' => $userData];
    }

    // 4. REGLA INSTITUCIONAL ESTRICTA:
    // El usuario DEBE pertenecer físicamente a la institución por la que intenta entrar.
    if ($userData['IdInstitucion'] != $instContext['IdInstitucion']) {
        return [
            'status' => false, 
            'message' => 'Acceso denegado: Tu cuenta no pertenece a ' . $instContext['NombreInst']
        ];
    }

    // 5. Éxito para usuario local
    $this->model->updateActivityMetadata($userData['IdUsrA']);
    return ['status' => true, 'user' => $userData];
}


public function attemptSuperAdminLogin($user, $pass) {
    $userFound = $this->model->getSuperAdminByUsername($user);

    if (!$userFound) {
        return ["status" => false, "message" => "Usuario maestro no encontrado"];
    }

    // Verificamos el password
    if (password_verify($pass, $userFound['Password'])) {
        return [
            "status" => true,
            "user" => [
                "IdUsrA" => $userFound['IdUsrA'], // Ahora sí existe
                "UsrA"   => $userFound['Nombre'],
                "role"   => 1,
                "instId" => 0
            ]
        ];
    }

    return ["status" => false, "message" => "Contraseña incorrecta"];
}
}