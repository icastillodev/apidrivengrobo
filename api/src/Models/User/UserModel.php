<?php
namespace App\Models\User;

use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class UserModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getUsersByInstitution($instId) {
        $sql = "SELECT 
                    u.IdUsrA, 
                    u.UsrA as Usuario, 
                    p.NombreA, 
                    p.ApellidoA, 
                    p.CelularA, 
                    p.EmailA as Correo, 
                    p.LabA as iddeptoA,
                    (SELECT COUNT(*) 
                    FROM formularioe f 
                    JOIN protformr pf ON f.idformA = pf.idformA
                    JOIN protocoloexpe pe ON pf.idprotA = pe.idprotA
                    WHERE f.IdUsrA = u.IdUsrA) as OtrosCeuaCount
                    ,
                    (SELECT COUNT(*) FROM protocoloexpe WHERE IdUsrA = u.IdUsrA AND IdInstitucion = u.IdInstitucion) as ProtocolCount
                    ,
                    COALESCE(a.ActivoA, 1) as ActivoA,
                    t.IdTipousrA,
                    (SELECT fecha_hora FROM bitacora b WHERE b.id_usuario = u.IdUsrA AND b.tabla_afectada = 'usuarioe' AND b.accion = 'INSERT' ORDER BY b.id_bitacora ASC LIMIT 1) as FechaCreacion
                FROM usuarioe u
                JOIN personae p ON u.IdUsrA = p.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                WHERE u.IdInstitucion = ?
                ORDER BY p.ApellidoA ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Listado paginado por institución (admin / usuarios). Respeta IdInstitucion.
     * @param array{limit?:int,offset?:int,q?:string,filter_col?:string,sort_key?:string,sort_dir?:string} $opts
     * @return array{rows: array<int, array<string,mixed>>, total: int}
     */
    public function getUsersByInstitutionPaged(int $instId, array $opts): array {
        $limit = isset($opts['limit']) ? (int) $opts['limit'] : 0;
        if ($limit < 0) {
            $limit = 0;
        }
        if ($limit > 10000) {
            $limit = 10000;
        }
        $offset = isset($opts['offset']) ? max(0, (int) $opts['offset']) : 0;
        $q = isset($opts['q']) ? trim((string) $opts['q']) : '';
        $filterCol = isset($opts['filter_col']) ? trim((string) $opts['filter_col']) : 'all';
        $sortKey = isset($opts['sort_key']) ? trim((string) $opts['sort_key']) : 'IdUsrA';
        $sortDir = strtoupper((string) ($opts['sort_dir'] ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';

        $deptoSortExpr = 'COALESCE(NULLIF(TRIM(d.NombreDeptoA), \'\'), NULLIF(TRIM(p.LabA), \'\'), \'\')';

        $allowedSort = [
            'IdUsrA' => 'u.IdUsrA',
            'Usuario' => 'u.UsrA',
            'ApellidoA' => 'p.ApellidoA',
            'NombreA' => 'p.NombreA',
            'CelularA' => 'p.CelularA',
            'Correo' => 'p.EmailA',
            'Laboratorio' => $deptoSortExpr,
        ];
        $orderExpr = $allowedSort[$sortKey] ?? 'u.IdUsrA';

        $paramsCount = [$instId];
        $paramsData = [$instId];
        $searchSql = '1=1';
        if ($q !== '') {
            $pat = '%' . $q . '%';
            switch ($filterCol) {
                case 'IdUsrA':
                    $searchSql = 'CAST(u.IdUsrA AS CHAR) LIKE ?';
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    break;
                case 'Usuario':
                    $searchSql = 'LOWER(u.UsrA) LIKE LOWER(?)';
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    break;
                case 'ApellidoA':
                    $searchSql = 'LOWER(p.ApellidoA) LIKE LOWER(?)';
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    break;
                case 'NombreA':
                    $searchSql = 'LOWER(p.NombreA) LIKE LOWER(?)';
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    break;
                case 'CelularA':
                    $searchSql = 'LOWER(COALESCE(p.CelularA, \'\')) LIKE LOWER(?)';
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    break;
                case 'Correo':
                    $searchSql = 'LOWER(COALESCE(p.EmailA, \'\')) LIKE LOWER(?)';
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    break;
                case 'Laboratorio':
                    $searchSql = '(LOWER(COALESCE(d.NombreDeptoA, \'\')) LIKE LOWER(?) OR LOWER(COALESCE(TRIM(p.LabA), \'\')) LIKE LOWER(?))';
                    $paramsCount[] = $pat;
                    $paramsCount[] = $pat;
                    $paramsData[] = $pat;
                    $paramsData[] = $pat;
                    break;
                default:
                    $searchSql = '(LOWER(u.UsrA) LIKE LOWER(?) OR LOWER(p.ApellidoA) LIKE LOWER(?) OR LOWER(p.NombreA) LIKE LOWER(?)'
                        . ' OR LOWER(COALESCE(p.EmailA, \'\')) LIKE LOWER(?) OR LOWER(COALESCE(p.CelularA, \'\')) LIKE LOWER(?)'
                        . ' OR CAST(u.IdUsrA AS CHAR) LIKE ? OR LOWER(COALESCE(d.NombreDeptoA, \'\')) LIKE LOWER(?)'
                        . ' OR LOWER(COALESCE(TRIM(p.LabA), \'\')) LIKE LOWER(?))';
                    for ($i = 0; $i < 8; $i++) {
                        $paramsCount[] = $pat;
                        $paramsData[] = $pat;
                    }
                    break;
            }
        }

        $fromSql = "FROM usuarioe u
                JOIN personae p ON u.IdUsrA = p.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN departamentoe d ON d.IdInstitucion = u.IdInstitucion
                    AND d.iddeptoA = CAST(NULLIF(NULLIF(TRIM(p.LabA), ''), 'null') AS UNSIGNED)
                WHERE u.IdInstitucion = ? AND ($searchSql)";

        $sqlCount = "SELECT COUNT(DISTINCT u.IdUsrA) AS c $fromSql";
        $stCount = $this->db->prepare($sqlCount);
        $stCount->execute($paramsCount);
        $total = (int) ($stCount->fetchColumn() ?: 0);

        // Listado: sin subconsultas correlacionadas por fila (coste O(n)); fechas y conteos completos en GET /users/one.
        $selectSql = "SELECT 
                    u.IdUsrA,
                    u.UsrA as Usuario,
                    p.NombreA,
                    p.ApellidoA,
                    p.CelularA,
                    p.EmailA as Correo,
                    p.LabA as iddeptoA,
                    COALESCE(NULLIF(TRIM(d.NombreDeptoA), ''), NULLIF(TRIM(p.LabA), ''), '') AS Laboratorio,
                    0 AS OtrosCeuaCount,
                    0 AS ProtocolCount,
                    COALESCE(a.ActivoA, 1) as ActivoA,
                    t.IdTipousrA,
                    NULL AS FechaCreacion
                $fromSql
                ORDER BY $orderExpr $sortDir, u.IdUsrA DESC";
        
        if ((int)$limit > 0) {
            $selectSql .= " LIMIT " . (int) $limit . " OFFSET " . (int) $offset;
        }

        $stData = $this->db->prepare($selectSql);
        $stData->execute($paramsData);
        $rows = $stData->fetchAll(PDO::FETCH_ASSOC);

        return ['rows' => $rows, 'total' => $total];
    }

    /**
     * Una fila de usuario para la institución (modal / URL ?id= sin tener la lista completa en memoria).
     */
    public function getUserSummaryForInstitution(int $instId, int $userId): ?array {
        if ($instId <= 0 || $userId <= 0) {
            return null;
        }
        $fromSql = "FROM usuarioe u
                JOIN personae p ON u.IdUsrA = p.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN departamentoe d ON d.IdInstitucion = u.IdInstitucion
                    AND d.iddeptoA = CAST(NULLIF(NULLIF(TRIM(p.LabA), ''), 'null') AS UNSIGNED)
                WHERE u.IdInstitucion = ? AND u.IdUsrA = ?";
        $sql = "SELECT 
                    u.IdUsrA,
                    u.UsrA as Usuario,
                    p.NombreA,
                    p.ApellidoA,
                    p.CelularA,
                    p.EmailA as Correo,
                    p.LabA as iddeptoA,
                    COALESCE(NULLIF(TRIM(d.NombreDeptoA), ''), NULLIF(TRIM(p.LabA), ''), '') AS Laboratorio,
                    (SELECT COUNT(*)
                    FROM formularioe f
                    JOIN protformr pf ON f.idformA = pf.idformA
                    JOIN protocoloexpe pe ON pf.idprotA = pe.idprotA
                    WHERE f.IdUsrA = u.IdUsrA) as OtrosCeuaCount,
                    (SELECT COUNT(*) FROM protocoloexpe WHERE IdUsrA = u.IdUsrA AND IdInstitucion = u.IdInstitucion) as ProtocolCount,
                    COALESCE(a.ActivoA, 1) as ActivoA,
                    t.IdTipousrA,
                    (SELECT fecha_hora FROM bitacora b WHERE b.id_usuario = u.IdUsrA AND b.tabla_afectada = 'usuarioe' AND b.accion = 'INSERT' ORDER BY b.id_bitacora ASC LIMIT 1) as FechaCreacion
                $fromSql
                LIMIT 1";
        $st = $this->db->prepare($sql);
        $st->execute([$instId, $userId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Usuario de login: minúsculas, sin espacios, [a-z0-9] inicial y luego [a-z0-9_-], 3–64 caracteres.
     */
    public function isValidUsernameFormat(string $user): bool {
        $user = strtolower(trim($user));
        if ($user === '' || strlen($user) < 3 || strlen($user) > 64) {
            return false;
        }
        if (preg_match('/\s/', $user)) {
            return false;
        }

        return (bool) preg_match('/^[a-z0-9][a-z0-9_-]*$/', $user);
    }

    /**
     * Mismo nombre de usuario no puede repetirse en la misma institución (sí en otra).
     */
    public function existsUsernameInInstitution(string $user, int $instId): bool {
        if ($instId <= 0) {
            return false;
        }
        $user = is_string($user) ? strtolower(trim($user)) : '';
        if ($user === '') {
            return false;
        }
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM usuarioe WHERE LOWER(TRIM(UsrA)) = ? AND IdInstitucion = ?');
        $stmt->execute([$user, $instId]);

        return (int) $stmt->fetchColumn() > 0;
    }

    public function registerUser($data) {
        try {
            $this->db->beginTransaction();

            $instId = (int) ($data['IdInstitucion'] ?? 0);
            $email = isset($data['EmailA']) && is_string($data['EmailA']) ? strtolower(trim($data['EmailA'])) : '';
            if ($email !== '' && $this->existsEmailInInstitution($email, $instId)) {
                $this->db->rollBack();
                return ['status' => false, 'message' => 'email_duplicate_institution'];
            }

            $usuario = is_string($data['usuario'] ?? '') ? trim($data['usuario']) : '';
            if ($usuario !== '' && preg_match('/\s/u', $usuario)) {
                $this->db->rollBack();
                return ['status' => false, 'message' => 'usuario_sin_espacios'];
            }
            $usuario = strtolower($usuario);
            if (!$this->isValidUsernameFormat($usuario)) {
                $this->db->rollBack();
                return ['status' => false, 'message' => 'username_invalid'];
            }
            if ($this->existsUsernameInInstitution($usuario, $instId)) {
                $this->db->rollBack();
                return ['status' => false, 'message' => 'username_duplicate_institution'];
            }

            $token = bin2hex(random_bytes(32));
            $passHash = password_hash($data['contrasena'], PASSWORD_BCRYPT);

            $sqlUser = "INSERT INTO usuarioe (UsrA, password_secure, IdInstitucion, token_confirmacion, confirmado)
                        VALUES (?, ?, ?, ?, 0)";
            $stmtUser = $this->db->prepare($sqlUser);
            $stmtUser->execute([
                $usuario, 
                $passHash, 
                $data['IdInstitucion'], 
                $token
            ]);
            $userId = $this->db->lastInsertId();

            $sqlPers = "INSERT INTO personae (NombreA, ApellidoA, EmailA, PaisA, CelularA, IdUsrA) 
                        VALUES (?, ?, ?, ?, ?, ?)";
            $stmtPers = $this->db->prepare($sqlPers);
            $stmtPers->execute([
                $data['NombreA'], 
                $data['ApellidoA'], 
                $email, 
                $data['PaisA'], 
                $data['CelularA'] ?? '', 
                $userId
            ]);

            $sqlRole = "INSERT INTO tienetipor (IdUsrA, IdTipousrA) VALUES (?, ?)";
            $this->db->prepare($sqlRole)->execute([$userId, 3]);

            $sqlAct = "INSERT INTO actividade (IdUsrA, ActivoA) VALUES (?, 1)";
            $this->db->prepare($sqlAct)->execute([$userId]);

            // Auditoría Manual (No hay token porque es un registro público)
            Auditoria::logManual($this->db, $userId, 'INSERT', 'usuarioe', "Registro público completado (Pendiente activación)");

            $this->db->commit();
            return ['status' => true, 'token' => $token];

        } catch (\Exception $e) {
            $this->db->rollBack();
            return ['status' => false, 'message' => "Error en Registro: " . $e->getMessage()];
        }
    }

    public function activateUserByToken($token) {
        try {
            $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE token_confirmacion = ? LIMIT 1");
            $stmt->execute([$token]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return ['status' => 'error', 'message' => 'El token no es válido o ya fue utilizado.'];
            }

            $sql = "UPDATE usuarioe SET confirmado = 1, token_confirmacion = NULL WHERE IdUsrA = ?";
            $this->db->prepare($sql)->execute([$user['IdUsrA']]);

            Auditoria::logManual($this->db, $user['IdUsrA'], 'UPDATE', 'usuarioe', "Cuenta activada vía email");

            return ['status' => 'success', 'message' => 'Cuenta activada correctamente.'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Comprueba si el correo ya está registrado en la misma institución.
     * El mismo correo puede existir en distintas instituciones (comparación sin distinguir mayúsculas).
     */
    public function existsEmailInInstitution($email, $instId) {
        if (!is_string($email) || trim($email) === '' || (int) $instId <= 0) {
            return false;
        }
        $emailNorm = strtolower(trim($email));
        $sql = 'SELECT 1 FROM personae p 
                INNER JOIN usuarioe u ON p.IdUsrA = u.IdUsrA 
                WHERE LOWER(TRIM(p.EmailA)) = ? AND u.IdInstitucion = ? LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$emailNorm, $instId]);

        return $stmt->fetchColumn() > 0;
    }

    public function getInstitutionName($id) {
        $stmt = $this->db->prepare("SELECT NombreInst FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getUserByEmailAndInst($email, $instId) {
        $sql = "SELECT p.IdUsrA, p.NombreA FROM personae p 
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA 
                WHERE p.EmailA = ? AND u.IdInstitucion = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $instId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function saveResetToken($userId, $token) {
        $sql = "UPDATE usuarioe SET token_confirmacion = ? WHERE IdUsrA = ?";
        $res = $this->db->prepare($sql)->execute([$token, $userId]);
        
        Auditoria::logManual($this->db, $userId, 'UPDATE', 'usuarioe', "Generó token de recuperación de clave");
        return $res;
    }

    public function resetPasswordWithToken($token, $newHash) {
        $stmt = $this->db->prepare("SELECT IdUsrA FROM usuarioe WHERE token_confirmacion = ? LIMIT 1");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) return ['status' => 'error', 'message' => 'Token inválido'];

        $sql = "UPDATE usuarioe SET password_secure = ?, token_confirmacion = NULL WHERE IdUsrA = ?";
        $this->db->prepare($sql)->execute([$newHash, $user['IdUsrA']]);
        
        Auditoria::logManual($this->db, $user['IdUsrA'], 'UPDATE', 'usuarioe', "Restableció contraseña vía correo");
        return ['status' => 'success'];
    }

    public function getUserForRecovery($email, $username, $instId) {
        $username = is_string($username) ? strtolower(trim($username)) : $username;
        $emailNorm = is_string($email) ? strtolower(trim($email)) : $email;
        $sql = "SELECT p.IdUsrA, p.NombreA FROM personae p 
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA 
                WHERE LOWER(TRIM(p.EmailA)) = ? AND LOWER(TRIM(u.UsrA)) = ? AND u.IdInstitucion = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$emailNorm, $username, $instId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Logins (UsrA) registrados con el correo en la institución (puede haber más de uno en datos legados).
     *
     * @return array<int, array{IdUsrA: int, UsrA: string, NombreA: string}>
     */
    public function getLoginsByEmailAndInst(string $email, int $instId): array {
        $emailNorm = strtolower(trim($email));
        if ($emailNorm === '' || $instId <= 0) {
            return [];
        }
        $sql = "SELECT p.IdUsrA, u.UsrA, p.NombreA FROM personae p
                INNER JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                WHERE LOWER(TRIM(p.EmailA)) = ? AND u.IdInstitucion = ?
                ORDER BY u.UsrA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$emailNorm, $instId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $rows ?: [];
    }

    public function runMaintenance($instId) {
        try {
            $stmtDate = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
            $stmtDate->execute([$instId]);
            $lastPurge = $stmtDate->fetchColumn();

            if ($lastPurge) {
                $lastDate = new \DateTime($lastPurge);
                $now = new \DateTime();
                $interval = $lastDate->diff($now);
                
                if ($interval->m < 1 && $interval->y == 0) {
                    return 0; 
                }
            }

            $sqlDelete = "DELETE u FROM usuarioe u
                    INNER JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                    LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                    LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                    WHERE u.IdInstitucion = ? 
                    AND t.IdTipousrA = 3 
                    AND (
                        (p.IdUsrA IS NULL OR a.IdUsrA IS NULL)
                        OR 
                        (
                            a.UltentradaA < DATE_SUB(NOW(), INTERVAL 3 MONTH)
                            AND NOT EXISTS (SELECT 1 FROM protocoloexpe WHERE IdUsrA = u.IdUsrA)
                            AND NOT EXISTS (SELECT 1 FROM formularioe WHERE IdUsrA = u.IdUsrA)
                        )
                    )";

            $stmtDelete = $this->db->prepare($sqlDelete);
            $stmtDelete->execute([$instId]);
            $deletedCount = $stmtDelete->rowCount();

            $sqlUpdateDate = "UPDATE institucion SET FechaDepuracion = NOW() WHERE IdInstitucion = ?";
            $this->db->prepare($sqlUpdateDate)->execute([$instId]);

            Auditoria::logManual($this->db, 0, 'DELETE', 'usuarioe', "Depuración mensual de institución $instId eliminó $deletedCount usuarios inactivos");
            return $deletedCount;

        } catch (\Exception $e) {
            error_log("Error en runMaintenance: " . $e->getMessage());
            return -1; 
        }
    }   

    public function checkNeedsPurge($instId) {
        $stmt = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $lastPurge = $stmt->fetchColumn();

        if (!$lastPurge) return true;

        $lastDate = new \DateTime($lastPurge);
        $now = new \DateTime();
        $interval = $lastDate->diff($now);

        return ($interval->m >= 1 || $interval->y >= 1);
    }
}