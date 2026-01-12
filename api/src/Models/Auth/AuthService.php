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



        public function authenticate($user, $pass, $slug) {
            $instContext = $this->model->getInstitucionBySlug($slug);
            if (!$instContext) return ['status' => false, 'message' => 'Institución inválida'];

            $userData = $this->model->getUserByUsername($user);
            
            // 1. Verificación básica de credenciales
            if (!$userData || !password_verify($pass, $userData['password_secure'])) {
                return ['status' => false, 'message' => 'Credenciales incorrectas'];
            }

            // 2. LÓGICA DE SUPERADMIN (Rol 1): Salto de seguridad
            // Si el usuario tiene rol 1 en la tabla tienetipor, entra directo a cualquier sede
            if ($userData['role'] == 1) {
                return [
                    'status' => true, 
                    'user' => $userData,
                    'isMaster' => true // Marcamos que entró como maestro
                ];
            }

            // 3. Regla normal para usuarios (Rol 2)
            $accesoDirecto = $userData['IdInstitucion'] == $instContext['IdInstitucion'];
            $accesoGrupo = $userData['DependenciaInstitucion'] == $instContext['DependenciaInstitucion'];

            if ($accesoDirecto || $accesoGrupo) {
                return ['status' => true, 'user' => $userData];
            }

            return ['status' => false, 'message' => 'No tienes permiso para esta sede'];
        }

    public function attemptSuperAdminLogin($user, $pass) {
        $userFound = $this->model->getSuperAdminByUsername($user);

        if (!$userFound) {
            return ["status" => false, "message" => "Usuario maestro no encontrado o sin permisos"];
        }

        // Aquí comparamos la contraseña enviada con 'password_secure' (que viene como Password)
        if (password_verify($pass, $userFound['Password'])) {
            return [
                "status" => true,
                "user" => [
                    "Nombre" => $userFound['Nombre'],
                    "role" => 1
                ]
            ];
        }

        return ["status" => false, "message" => "Contraseña maestra incorrecta"];
    }
}