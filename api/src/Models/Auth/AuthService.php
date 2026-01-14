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
        // 1. Validar que la institución del link existe
        $instContext = $this->model->getInstitucionBySlug($slug);
        if (!$instContext) {
            return ['status' => false, 'message' => 'Institución inválida'];
        }

        // 2. Buscar al usuario por su login
        $userData = $this->model->getUserByUsername($user);
        
        // 3. Verificación de credenciales (Usuario existe y contraseña coincide)
        if (!$userData || !password_verify($pass, $userData['password_secure'])) {
            return ['status' => false, 'message' => 'Credenciales incorrectas'];
        }

        // 4. LÓGICA DE SUPERADMIN (Rol 1): Acceso Total
        // Si es un SuperAdmin de Netwise, entra a cualquier sede sin restricciones.
        if ($userData['role'] == 1) {
            // REGISTRO DE ACTIVIDAD: Actualizamos logs antes de entrar
            $this->model->updateActivityMetadata($userData['IdUsrA']);
            
            return [
                'status' => true, 
                'user' => $userData,
                'isMaster' => true 
            ];
        }

        // 5. REGLAS PARA INVESTIGADORES (Rol 2)
        // Acceso directo: Pertenece a la sede donde se está logueando.
        $accesoDirecto = $userData['IdInstitucion'] == $instContext['IdInstitucion'];
        
        // Acceso por grupo: Pertenece a la misma dependencia (ej: todas las sedes de la CNEA).
        $accesoGrupo = $userData['DependenciaInstitucion'] == $instContext['DependenciaInstitucion'];

        if ($accesoDirecto || $accesoGrupo) {
            // REGISTRO DE ACTIVIDAD: Actualizamos UltentradaA y ActivoA = 1
            $this->model->updateActivityMetadata($userData['IdUsrA']);
            
            return ['status' => true, 'user' => $userData];
        }

        // Si llegó aquí, el usuario existe pero no tiene permiso para esta sede
        return ['status' => false, 'message' => 'No tienes permiso para acceder a esta institución'];
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