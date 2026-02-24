<?php
namespace App\Controllers;

use App\Models\Services\MailService;
use App\Models\User\UserModel;
use App\Utils\Auditoria;
use PDO;

class UserController {
    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new UserModel($db);
    }

    public function index() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $users = $this->model->getUsersByInstitution($sesion['instId']);
            echo json_encode(['status' => 'success', 'data' => $users]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocols() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;
            
            $query = "SELECT idprotA, tituloA, nprotA, FechaFinProtA 
                      FROM protocoloexpe 
                      WHERE IdUsrA = ? AND IdInstitucion = ? 
                      ORDER BY FechaFinProtA DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id, $sesion['instId']]);
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getForms() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;

            $query = "SELECT idformA, fechainicioA, tipoA, estado 
                      FROM formularioe 
                      WHERE IdUsrA = ? AND IdInstitucion = ? 
                      ORDER BY fechainicioA DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id, $sesion['instId']]);
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function update() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion(); // Valida que el admin esté logueado
            $id = $_GET['id'] ?? null;
            $data = $_POST;

            $sql = "UPDATE personae SET 
                    ApellidoA = ?, NombreA = ?, EmailA = ?, CelularA = ?, LabA = ? 
                    WHERE IdUsrA = ?";
                        
            $stmt = $this->db->prepare($sql);
            $success = $stmt->execute([
                $data['ApellidoA'], $data['NombreA'], $data['EmailA'], 
                $data['CelularA'], $data['iddeptoA'], $id
            ]);

            Auditoria::logManual($this->db, $sesion['userId'], 'UPDATE', 'personae', "Actualizó perfil de usuario ID: $id");

            echo json_encode(['status' => $success ? 'success' : 'error']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function resetPassword() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;
            
            if (!$id) throw new \Exception('ID de usuario no proporcionado');

            $newPasswordHash = password_hash('12345678', PASSWORD_DEFAULT);
            $sql = "UPDATE usuarioe SET password_secure = ? WHERE IdUsrA = ?";
            $stmt = $this->db->prepare($sql);
            $success = $stmt->execute([$newPasswordHash, $id]);

            Auditoria::logManual($this->db, $sesion['userId'], 'UPDATE_PASS', 'usuarioe', "Reseteó forzosamente la clave del usuario ID: $id");

            echo json_encode([
                'status' => $success ? 'success' : 'error',
                'message' => $success ? 'Contraseña reseteada a 12345678' : 'No se pudo actualizar'
            ]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // =========================================================
    // RUTAS PÚBLICAS (No se pide Token JWT)
    // =========================================================
    
    public function register() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        $slug = $_GET['inst'] ?? 'sede-general';

        if (!$data) {
            echo json_encode(['status' => 'error', 'message' => 'Datos de registro vacíos']);
            exit;
        }

        $res = $this->model->registerUser($data);

        if ($res['status']) {
            // Log manual público
            Auditoria::logManual($this->db, 0, 'INSERT', 'usuarioe', "Nuevo Registro Público: {$data['usuario']}");

            $mailService = new MailService();
            $instInfo = $this->model->getInstitutionName($data['IdInstitucion']);
            $rawName = $instInfo['NombreInst'] ?? $slug;
            $instNameReal = strtoupper(str_replace(['APP ', 'App ', 'app '], '', $rawName));

            $mailSent = $mailService->sendRegistrationEmail(
                $data['EmailA'], $data['NombreA'], $data['usuario'], 
                $res['token'], $instNameReal, $slug
            );

            echo json_encode([
                'status' => 'success',
                'message' => 'Usuario registrado exitosamente',
                'mail' => $mailSent ? 'enviado' : 'error_envio'
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => $res['message']]);
        }
        exit;
    }

    public function confirmAccount() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['token'])) {
            echo json_encode(['status' => 'error', 'message' => 'Token no proporcionado']);
            exit;
        }

        $res = $this->model->activateUserByToken($data['token']);
        Auditoria::logManual($this->db, 0, 'ACTIVATE', 'usuarioe', "Activación de cuenta por correo");
        
        echo json_encode($res);
        exit;
    }

    public function checkUsername() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $user = $_GET['user'] ?? '';
        echo json_encode(['available' => !$this->model->existsUsername($user)]);
        exit;
    }

    public function forgotPassword() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        
        $user = $this->model->getUserForRecovery($data['email'], $data['user'], $data['IdInstitucion']);

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $this->model->saveResetToken($user['IdUsrA'], $token);
            $instInfo = $this->model->getInstitutionName($data['IdInstitucion']);
            $instName = strtoupper(str_replace('APP ', '', $instInfo['NombreInst']));

            $mailSent = (new MailService())->sendResetPasswordEmail($data['email'], $user['NombreA'], $token, $instName, $data['slug']);
            Auditoria::logManual($this->db, $user['IdUsrA'], 'RECOVERY_REQ', 'usuarioe', "Solicitó recuperación de contraseña");
            echo json_encode(['status' => 'success', 'mail' => $mailSent]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Los datos no coinciden.']);
        }
        exit;
    }

    public function updatePasswordRecovery() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['password']) || !isset($data['token'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos']);
            exit;
        }

        $newHash = password_hash($data['password'], PASSWORD_BCRYPT);
        $res = $this->model->resetPasswordWithToken($data['token'], $newHash);
        
        Auditoria::logManual($this->db, 0, 'PASSWORD_RESET', 'usuarioe', "Reestableció contraseña vía Token.");
        echo json_encode($res);
        exit;
    }

    public function maintenance() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $purgedCount = $this->model->runMaintenance($sesion['instId']);

            echo json_encode([
                'status' => 'success',
                'executed' => ($purgedCount > 0),
                'purged' => $purgedCount
            ]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function listInvestigators() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $billingModel = new \App\Models\Billing\BillingModel($this->db);
            $data = $billingModel->getActiveInvestigators($sesion['instId']); 
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}