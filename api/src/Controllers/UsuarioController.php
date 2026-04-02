<?php
namespace App\Controllers;

use App\Models\Admin\UsuarioModel;
use App\Models\Services\MailService;
use App\Models\User\UserModel;
use App\Utils\Auditoria;

class UsuarioController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new UsuarioModel($db);
    }

    private function jsonOut($data, $code = 200) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        http_response_code($code);
        echo json_encode($data);
        exit;
    }

public function list() {
        try {
            $sesion = Auditoria::getDatosSesion();
            
            // Seguridad Extra: Solo el SuperAdmin puede ver toda la red
            if ((int)$sesion['role'] !== 1) {
                throw new \Exception("Acceso denegado. Privilegios insuficientes.");
            }

            // Llamamos a la función global sin filtros de sede
            $this->jsonOut(['status' => 'success', 'data' => $this->model->getAllGlobal()]);
            
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 401);
        }
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        try {
            Auditoria::getDatosSesion(); // Valida Token

            $instId = (int) ($data['IdInstitucion'] ?? 0);
            $userNorm = strtolower(trim(preg_replace('/\s+/', '', (string) ($data['UsrA'] ?? ''))));
            $userRules = new UserModel($this->db);
            if (!$userRules->isValidUsernameFormat($userNorm)) {
                return $this->jsonOut([
                    'status' => 'error',
                    'message' => 'username_invalid',
                ], 400);
            }
            if ($instId <= 0) {
                return $this->jsonOut([
                    'status' => 'error',
                    'message' => 'Institución inválida.',
                ], 400);
            }
            if ($this->model->existsUsernameInInstitution($userNorm, $instId)) {
                return $this->jsonOut([
                    'status' => 'error', 
                    'message' => 'username_duplicate_institution',
                ], 400);
            }
            $data['UsrA'] = $userNorm;

            $id = $this->model->createGlobal($data);
            $this->jsonOut(['status' => 'success', 'id' => $id]);

        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update() {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $_GET['id'] ?? null;
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $userNorm = strtolower(trim(preg_replace('/\s+/', '', (string) ($data['UsrA'] ?? ''))));
            $instId = (int) ($data['IdInstitucion'] ?? 0);
            $userRules = new UserModel($this->db);
            if (!$userRules->isValidUsernameFormat($userNorm)) {
                return $this->jsonOut(['status' => 'error', 'message' => 'username_invalid'], 400);
            }
            if ($instId <= 0) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Institución inválida.'], 400);
            }
            if ($this->model->existsUsernameInInstitution($userNorm, $instId, $id)) {
                return $this->jsonOut(['status' => 'error', 'message' => 'username_duplicate_institution'], 400);
            }
            $data['UsrA'] = $userNorm;
            $this->model->updateGlobal($id, $data);
            $this->jsonOut(['status' => 'success']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function resetPass() {
        $id = $_GET['id'] ?? null;
        try {
            Auditoria::getDatosSesion(); // Valida Token
            $this->model->resetPassword($id);
            $this->jsonOut(['status' => 'success']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function checkUsername() {
        if (ob_get_length()) ob_clean(); 
        header('Content-Type: application/json');

        $username = strtolower(trim(preg_replace('/\s+/', '', (string) ($_GET['user'] ?? ''))));
        $excludeId = $_GET['exclude'] ?? null;
        $instId = isset($_GET['instId']) ? (int) $_GET['instId'] : 0;

        try {
            if ($instId <= 0) {
                echo json_encode(['available' => false, 'message' => 'institution_required']);
                exit;
            }
            $userRules = new UserModel($this->db);
            if ($username !== '' && !$userRules->isValidUsernameFormat($username)) {
                echo json_encode(['available' => false, 'message' => 'username_invalid']);
                exit;
            }
            $isTaken = $username !== '' && $this->model->existsUsernameInInstitution($username, $instId, $excludeId);
            echo json_encode(['available' => !$isTaken]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit; 
    }

    /**
     * Vista previa para eliminación total: devuelve qué se borrará y envía por email el código de verificación.
     */
    public function getDeletePreview() {
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            if ((int)$sesion['role'] !== 1) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Acceso denegado.'], 403);
            }
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                return $this->jsonOut(['status' => 'error', 'message' => 'ID inválido.'], 400);
            }
            if ($id === (int)$sesion['userId']) {
                return $this->jsonOut(['status' => 'error', 'message' => 'No puedes eliminar tu propio usuario.'], 400);
            }
            $preview = $this->model->getDeletePreview($id);
            if (!$preview) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Usuario no encontrado.'], 404);
            }
            $code = (string) random_int(100000, 999999);
            UsuarioModel::storeVerificationCode($id, $sesion['userId'], $code);
            $mail = new MailService();
            $admin = $this->model->getPersonaByUserId($sesion['userId']);
            $adminEmail = $admin['EmailA'] ?? null;
            $adminName = trim(($admin['NombreA'] ?? '') . ' ' . ($admin['ApellidoA'] ?? ''));
            if (!$adminName) $adminName = 'Superadmin';
            $lang = $sesion['idioma'] ?? 'es';
            if ($adminEmail) {
                $mail->sendDeleteVerificationCode($adminEmail, $adminName, $code, $preview['UsrA'], $lang);
            }
            $this->jsonOut([
                'status' => 'success',
                'data' => [
                    'usuario' => $preview['UsrA'],
                    'nombre' => trim($preview['NombreA'] . ' ' . $preview['ApellidoA']) ?: $preview['UsrA'],
                    'institucion' => $preview['NombreInst'] ?? '—',
                    'protocolos' => (int) $preview['protocolos'],
                    'formularios' => (int) $preview['formularios'],
                    'alojamientos' => (int) $preview['alojamientos'],
                    'protocolos_list' => $preview['protocolos_list'] ?? [],
                    'formularios_list' => $preview['formularios_list'] ?? [],
                    'alojamientos_list' => $preview['alojamientos_list'] ?? [],
                    'code_sent' => !empty($adminEmail),
                ],
            ]);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Eliminación total de usuario: valida contraseña + código y ejecuta borrado en cascada; envía email de resumen.
     */
    public function deleteFull() {
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            if ((int)$sesion['role'] !== 1) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Acceso denegado.'], 403);
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $id = (int)($input['id'] ?? 0);
            $password = trim($input['password'] ?? '');
            $code = trim($input['code'] ?? '');
            if ($id <= 0 || $password === '' || $code === '') {
                return $this->jsonOut(['status' => 'error', 'message' => 'Faltan id, contraseña o código.'], 400);
            }
            if ($id === (int)$sesion['userId']) {
                return $this->jsonOut(['status' => 'error', 'message' => 'No puedes eliminar tu propio usuario.'], 400);
            }
            $stmtPass = $this->db->prepare("SELECT password_secure FROM usuarioe WHERE IdUsrA = ?");
            $stmtPass->execute([$sesion['userId']]);
            $row = $stmtPass->fetch(\PDO::FETCH_ASSOC);
            if (!$row || !password_verify($password, $row['password_secure'])) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Contraseña incorrecta.'], 400);
            }
            if (!UsuarioModel::validateVerificationCode($id, $sesion['userId'], $code)) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Código inválido o expirado.'], 400);
            }
            $preview = $this->model->getDeletePreview($id);
            if (!$preview) {
                return $this->jsonOut(['status' => 'error', 'message' => 'Usuario no encontrado.'], 404);
            }
            $detail = sprintf(
                "Usuario: %s | Institución: %s | Protocolos: %d | Formularios: %d | Alojamientos: %d",
                $preview['UsrA'],
                $preview['NombreInst'] ?? '—',
                $preview['protocolos'],
                $preview['formularios'],
                $preview['alojamientos']
            );
            $this->model->deleteUserFullCascade($id);
            Auditoria::logManual(
                $this->db,
                $sesion['userId'],
                'DELETE_USER_FULL',
                'usuarioe',
                "Eliminación total usuario ID: $id | " . $detail
            );
            $mail = new MailService();
            $admin = $this->model->getPersonaByUserId($sesion['userId']);
            $adminEmail = $admin['EmailA'] ?? null;
            $adminName = trim(($admin['NombreA'] ?? '') . ' ' . ($admin['ApellidoA'] ?? ''));
            if (!$adminName) $adminName = 'Superadmin';
            $lang = $sesion['idioma'] ?? 'es';
            if ($adminEmail) {
                $mail->sendDeleteSummary($adminEmail, $adminName, $preview['UsrA'], $code, $detail, $lang);
            }
            $this->jsonOut(['status' => 'success', 'message' => 'Usuario y datos asociados eliminados correctamente.']);
        } catch (\Exception $e) {
            $this->jsonOut(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}