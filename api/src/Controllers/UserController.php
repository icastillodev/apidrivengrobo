<?php
namespace App\Controllers;

use App\Models\Admin\UsuarioModel;
use App\Models\Services\MailService;
use App\Models\User\UserModel;
use App\Models\UserForms\UserFormsModel;
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

            $query = "SELECT 
                        f.idformA,
                        f.fechainicioA,
                        f.tipoA,
                        f.estado,
                        pf.idprotA,
                        tf.nombreTipo as TipoTramiteNombre,
                        tf.categoriaformulario as CategoriaFormulario
                      FROM formularioe f
                      LEFT JOIN protformr pf ON f.idformA = pf.idformA
                      LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                      WHERE f.IdUsrA = ? AND f.IdInstitucion = ? 
                      ORDER BY fechainicioA DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id, $sesion['instId']]);
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getAlojamientos() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;

            $query = "SELECT
                        a.historia,
                        a.IdAlojamiento,
                        a.fechavisado,
                        a.hastafecha,
                        a.totaldiasdefinidos,
                        a.idprotA,
                        p.nprotA,
                        p.tituloA,
                        e.EspeNombreA as Especie
                      FROM alojamiento a
                      LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA
                      LEFT JOIN especiee e ON a.TipoAnimal = e.idespA
                      WHERE a.IdUsrA = ? AND a.IdInstitucion = ?
                      ORDER BY a.fechavisado DESC, a.historia DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$id, $sesion['instId']]);
            echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Para admin: protocolos usados en formularios del usuario (animales utilizados).
     */
    public function getProtocolsUsedInFormsForUser() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;
            if (!$id) {
                echo json_encode(['status' => 'error', 'message' => 'ID de usuario requerido']);
                exit;
            }
            $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ?");
            $stmt->execute([$id, $sesion['instId']]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']);
                exit;
            }
            $model = new UserFormsModel($this->db);
            $list = $model->getProtocolsUsedInForms($id);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Para admin: insumos pedidos por el usuario.
     */
    public function getInsumosPedidosForUser() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;
            if (!$id) {
                echo json_encode(['status' => 'error', 'message' => 'ID de usuario requerido']);
                exit;
            }
            $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ?");
            $stmt->execute([$id, $sesion['instId']]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']);
                exit;
            }
            $model = new UserFormsModel($this->db);
            $list = $model->getInsumosPedidosByUser($id);
            echo json_encode(['status' => 'success', 'data' => $list]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Para admin: insumos experimentales (reactivos) pedidos por el usuario.
     */
    public function getInsumosExperimentalesPedidosForUser() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = $_GET['id'] ?? null;
            if (!$id) {
                echo json_encode(['status' => 'error', 'message' => 'ID de usuario requerido']);
                exit;
            }
            $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ?");
            $stmt->execute([$id, $sesion['instId']]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado']);
                exit;
            }
            $model = new UserFormsModel($this->db);
            $list = $model->getInsumosExperimentalesPedidosByUser($id);
            echo json_encode(['status' => 'success', 'data' => $list]);
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

    public function delete() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $input = json_decode(file_get_contents('php://input'), true);
            $id = (int)($input['id'] ?? 0);
            $password = trim($input['password'] ?? '');

            if ($id <= 0) {
                throw new \Exception('ID de usuario inválido');
            }
            if ($id === (int)$sesion['userId']) {
                throw new \Exception('No puedes eliminar tu propio usuario.');
            }
            if ($password === '') {
                throw new \Exception('Debes ingresar tu contraseña para confirmar la eliminación.');
            }

            // Verificar contraseña del administrador que ejecuta la acción
            $stmtPass = $this->db->prepare("SELECT password_secure FROM usuarioe WHERE IdUsrA = ?");
            $stmtPass->execute([$sesion['userId']]);
            $row = $stmtPass->fetch(PDO::FETCH_ASSOC);
            if (!$row || !password_verify($password, $row['password_secure'])) {
                throw new \Exception('Contraseña incorrecta. No se eliminó el usuario.');
            }

            // Solo dentro de la misma institución
            $stmtUsr = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ?");
            $stmtUsr->execute([$id, $sesion['instId']]);
            if (!$stmtUsr->fetch(PDO::FETCH_ASSOC)) {
                throw new \Exception('Usuario no encontrado en esta institución.');
            }

            // Solo se pueden eliminar investigadores (IdTipousrA = 3)
            $stmtTipo = $this->db->prepare("SELECT IdTipousrA FROM tienetipor WHERE IdUsrA = ? LIMIT 1");
            $stmtTipo->execute([$id]);
            $tipoRow = $stmtTipo->fetch(PDO::FETCH_ASSOC);
            $idTipo = $tipoRow ? (int)$tipoRow['IdTipousrA'] : 0;
            if ($idTipo !== 3) {
                throw new \Exception('Solo se pueden eliminar usuarios con rol de investigador.');
            }

            // Dependencias: no eliminar si tiene formularios, protocolos o alojamientos
            $countFormsStmt = $this->db->prepare("SELECT COUNT(*) FROM formularioe WHERE IdUsrA = ? AND IdInstitucion = ?");
            $countFormsStmt->execute([$id, $sesion['instId']]);
            $forms = (int)$countFormsStmt->fetchColumn();

            $countProtStmt = $this->db->prepare("SELECT COUNT(*) FROM protocoloexpe WHERE IdUsrA = ? AND IdInstitucion = ?");
            $countProtStmt->execute([$id, $sesion['instId']]);
            $protocols = (int)$countProtStmt->fetchColumn();

            $countAlojStmt = $this->db->prepare("SELECT COUNT(*) FROM alojamiento WHERE IdUsrA = ? AND IdInstitucion = ?");
            $countAlojStmt->execute([$id, $sesion['instId']]);
            $alojamientos = (int)$countAlojStmt->fetchColumn();

            if ($forms > 0 || $protocols > 0 || $alojamientos > 0) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'No se puede eliminar: el usuario tiene registros asociados.',
                    'details' => [
                        'formularios' => $forms,
                        'protocolos' => $protocols,
                        'alojamientos' => $alojamientos
                    ]
                ]);
                exit;
            }

            // Datos del usuario eliminado para la bitácora (antes de borrarlo)
            $stmtInfo = $this->db->prepare("
                SELECT u.UsrA, COALESCE(p.NombreA, '') as NombreA, COALESCE(p.ApellidoA, '') as ApellidoA 
                FROM usuarioe u 
                LEFT JOIN personae p ON p.IdUsrA = u.IdUsrA 
                WHERE u.IdUsrA = ?
            ");
            $stmtInfo->execute([$id]);
            $infoEliminado = $stmtInfo->fetch(PDO::FETCH_ASSOC);
            $loginEliminado = $infoEliminado['UsrA'] ?? 'N/A';
            $nombreEliminado = trim(($infoEliminado['NombreA'] ?? '') . ' ' . ($infoEliminado['ApellidoA'] ?? '')) ?: 'Sin nombre';

            // Registrar en bitácora ANTES de eliminar (trazabilidad con contraseña confirmada)
            Auditoria::logManual(
                $this->db,
                $sesion['userId'],
                'DELETE_USER',
                'usuarioe',
                "Eliminó usuario ID: $id | login: $loginEliminado | $nombreEliminado | confirmado con contraseña de admin."
            );

            // Eliminación real en base de datos (actividade y usuarioe)
            $this->db->prepare("DELETE FROM actividade WHERE IdUsrA = ?")->execute([$id]);
            $stmtDel = $this->db->prepare("DELETE FROM usuarioe WHERE IdUsrA = ?");
            $stmtDel->execute([$id]);

            echo json_encode(['status' => 'success', 'message' => 'Usuario eliminado correctamente de la base de datos.']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Vista previa para eliminación total (Admin, misma institución): listado detallado de lo que se borrará + envío de código por email.
     */
    public function getDeletePreview() {
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'ID inválido.']);
                exit;
            }
            if ($id === (int)$sesion['userId']) {
                echo json_encode(['status' => 'error', 'message' => 'No puedes eliminar tu propio usuario.']);
                exit;
            }
            $usuarioModel = new UsuarioModel($this->db);
            $preview = $usuarioModel->getDeletePreview($id, $sesion['instId']);
            if (!$preview) {
                echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado en esta institución.']);
                exit;
            }
            $code = (string) random_int(100000, 999999);
            UsuarioModel::storeVerificationCode($id, $sesion['userId'], $code);
            $mail = new MailService();
            $admin = $usuarioModel->getPersonaByUserId($sesion['userId']);
            $adminEmail = $admin['EmailA'] ?? null;
            $adminName = trim(($admin['NombreA'] ?? '') . ' ' . ($admin['ApellidoA'] ?? ''));
            if (!$adminName) $adminName = 'Administrador';
            $lang = $sesion['idioma'] ?? 'es';
            if ($adminEmail) {
                $mail->sendDeleteVerificationCode($adminEmail, $adminName, $code, $preview['UsrA'], $lang);
            }
            $nombreCompleto = trim($preview['NombreA'] . ' ' . $preview['ApellidoA']) ?: $preview['UsrA'];
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'usuario' => $preview['UsrA'],
                    'nombre' => $nombreCompleto,
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
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Eliminación total de usuario (Admin, misma institución): contraseña + código, borrado en cascada, email de resumen.
     */
    public function deleteFull() {
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $input = json_decode(file_get_contents('php://input'), true);
            $id = (int)($input['id'] ?? 0);
            $password = trim($input['password'] ?? '');
            $code = trim($input['code'] ?? '');
            if ($id <= 0 || $password === '' || $code === '') {
                echo json_encode(['status' => 'error', 'message' => 'Faltan id, contraseña o código.']);
                exit;
            }
            if ($id === (int)$sesion['userId']) {
                echo json_encode(['status' => 'error', 'message' => 'No puedes eliminar tu propio usuario.']);
                exit;
            }
            $stmtPass = $this->db->prepare("SELECT password_secure FROM usuarioe WHERE IdUsrA = ?");
            $stmtPass->execute([$sesion['userId']]);
            $row = $stmtPass->fetch(PDO::FETCH_ASSOC);
            if (!$row || !password_verify($password, $row['password_secure'])) {
                echo json_encode(['status' => 'error', 'message' => 'Contraseña incorrecta.']);
                exit;
            }
            if (!UsuarioModel::validateVerificationCode($id, $sesion['userId'], $code)) {
                echo json_encode(['status' => 'error', 'message' => 'Código inválido o expirado.']);
                exit;
            }
            $usuarioModel = new UsuarioModel($this->db);
            $preview = $usuarioModel->getDeletePreview($id, $sesion['instId']);
            if (!$preview) {
                echo json_encode(['status' => 'error', 'message' => 'Usuario no encontrado en esta institución.']);
                exit;
            }
            $detail = sprintf(
                "Usuario: %s | Institución: %s | Protocolos: %d | Formularios: %d | Alojamientos: %d",
                $preview['UsrA'],
                $preview['NombreInst'] ?? '—',
                $preview['protocolos'],
                $preview['formularios'],
                $preview['alojamientos']
            );
            $usuarioModel->deleteUserFullCascade($id);
            Auditoria::logManual(
                $this->db,
                $sesion['userId'],
                'DELETE_USER_FULL',
                'usuarioe',
                "Eliminación total usuario ID: $id | " . $detail
            );
            $mail = new MailService();
            $admin = $usuarioModel->getPersonaByUserId($sesion['userId']);
            $adminEmail = $admin['EmailA'] ?? null;
            $adminName = trim(($admin['NombreA'] ?? '') . ' ' . ($admin['ApellidoA'] ?? ''));
            if (!$adminName) $adminName = 'Administrador';
            $lang = $sesion['idioma'] ?? 'es';
            if ($adminEmail) {
                $mail->sendDeleteSummary($adminEmail, $adminName, $preview['UsrA'], $code, $detail, $lang);
            }
            echo json_encode(['status' => 'success', 'message' => 'Usuario y datos asociados eliminados correctamente.']);
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
        $data['usuario'] = isset($data['usuario']) && is_string($data['usuario']) ? strtolower(trim($data['usuario'])) : ($data['usuario'] ?? '');

        $res = $this->model->registerUser($data);

        if ($res['status']) {
            // Log manual público
            Auditoria::logManual($this->db, 0, 'INSERT', 'usuarioe', "Nuevo Registro Público: " . strtolower(trim($data['usuario'] ?? '')));

            $mailService = new MailService();
            $instInfo = $this->model->getInstitutionName($data['IdInstitucion']);
            $rawName = $instInfo['NombreInst'] ?? $slug;
            $instNameReal = strtoupper(str_replace(['APP ', 'App ', 'app '], '', $rawName));

            $mailSent = $mailService->sendRegistrationEmail(
                $data['EmailA'], $data['NombreA'], $data['usuario'], 
                $res['token'], $instNameReal, $slug,
                $data['lang'] ?? $_GET['lang'] ?? 'es'
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
        $user = isset($_GET['user']) && is_string($_GET['user']) ? strtolower(trim($_GET['user'])) : '';
        echo json_encode(['available' => !$this->model->existsUsername($user)]);
        exit;
    }

    public function forgotPassword() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['user']) && is_string($data['user'])) {
            $data['user'] = strtolower(trim($data['user']));
        }
        $user = $this->model->getUserForRecovery($data['email'], $data['user'], $data['IdInstitucion']);

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $this->model->saveResetToken($user['IdUsrA'], $token);
            $instInfo = $this->model->getInstitutionName($data['IdInstitucion']);
            $instName = strtoupper(str_replace('APP ', '', $instInfo['NombreInst']));

            $mailSent = (new MailService())->sendResetPasswordEmail($data['email'], $user['NombreA'], $token, $instName, $data['slug'], $data['lang'] ?? 'es');
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