<?php
namespace App\Models\Auth;
use PDO;

class AuthModel {
    private $db;
    
    public function __construct($db) { 
        $this->db = $db; 
    }

    /** Columnas de `institucion` alineadas a `docs/database.sql` (sin `SELECT *`). */
    private function sqlSelectInstitucionAllColumns(): string {
        return 'IdInstitucion, NombreInst, PrecioJornadaTrabajoExp, DependenciaInstitucion, Web, Detalle, InstDir, '
            . 'InstContacto, InstCorreo, NombreCompletoInst, Logo, TipoApp, Moneda, Pais, Localidad, IdOrganismo, '
            . 'otrosceuas, FechaDepuracion, Activo, UltimoPago, TipoFacturacion, FechaContrato, tituloprecios, idioma, '
            . 'MadreGrupo, LogoEnPdf, ReservasRequierenAprobacion, ReservaQrTokenGeneral';
    }

    /** `usuarioe` — `docs/database.sql` + prefijo para login (sin `u.*`). */
    private function sqlSelectUsuarioeAllColumnsPrefixed(string $alias = 'u'): string {
        $cols = 'IdUsrA, UsrA, PassA, password_secure, confirmado, hash_migrated, IdInstitucion, token_confirmacion, two_factor_code, two_factor_expires';
        $parts = array_map('trim', explode(',', $cols));

        return $alias . '.' . implode(', ' . $alias . '.', $parts);
    }

    public function getInstitucionBySlug($slug) {
        $slug = is_string($slug) ? strtolower(trim(rawurldecode($slug), " \t\n\r\0\x0B/")) : '';
        if ($slug === '') {
            return false;
        }
        $cols = $this->sqlSelectInstitucionAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM institucion WHERE LOWER(NombreInst) = LOWER(?) LIMIT 1");
        $stmt->execute([$slug]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Resolución inequívoca por PK (la que devuelve validate-inst en data.id).
     */
    public function getInstitucionById(int $id): ?array {
        if ($id <= 0) {
            return null;
        }
        $cols = $this->sqlSelectInstitucionAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM institucion WHERE IdInstitucion = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Misma lógica que el login en PHP: NBSP→espacio, trim, colapsar \s+, minúsculas.
     * Público para reutilizar en AuthController.
     */
    public static function normalizeForLogin(string $username): string {
        $t = trim(str_replace("\xc2\xa0", ' ', $username));
        if ($t === '') {
            return '';
        }
        $collapsed = preg_replace('/\s+/u', ' ', $t);

        return function_exists('mb_strtolower')
            ? mb_strtolower($collapsed, 'UTF-8')
            : strtolower($collapsed);
    }

    /**
     * Solo para login: minúsculas y quitar todo espacio en blanco (equivale a normalizeForLogin + sin espacios).
     * Así "Diana Matich", "Diana  Matich" o "DianaMatich" en usuarioe coinciden con lo que escribe la persona.
     */
    public static function compactForLoginMatch(string $username): string {
        $norm = self::normalizeForLogin($username);
        if ($norm === '') {
            return '';
        }
        return str_replace(' ', '', $norm);
    }

    /**
     * Expresión SQL paralela a compactForLoginMatch: LOWER(TRIM(UsrA)), quita NBSP/tab/saltos y luego todos los espacios.
     */
    private function sqlLoginUsrCompactExpr(string $alias = 'u'): string {
        $x = "TRIM({$alias}.UsrA)";
        $x = "LOWER($x)";
        $x = "REPLACE(REPLACE(REPLACE(REPLACE($x, UNHEX('C2A0'), ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')";

        return "REPLACE($x, ' ', '')";
    }

    /**
     * Login en contexto de sede: fila de usuarioe con ese UsrA normalizado en ESTA IdInstitucion
     * (el mismo texto de login puede repetirse en otras sedes: cada una tiene su hash de contraseña).
     * Luego superadmin (rol 1) entrando desde la sede.
     *
     * @return array|false
     */
    public function getUserByUsernameForInstitutionLogin(string $username, int $institucionId) {
        if ($institucionId <= 0) {
            return false;
        }
        $compact = self::compactForLoginMatch($username);
        if ($compact === '') {
            return false;
        }

        $userExpr = $this->sqlLoginUsrCompactExpr('u');
        $uCols = $this->sqlSelectUsuarioeAllColumnsPrefixed('u');
        $select = "SELECT {$uCols}, i.DependenciaInstitucion, t.IdTipousrA as role, p.EmailA, p.NombreA, p.ApellidoA
                FROM usuarioe u
                LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA";

        $sql = "$select WHERE $userExpr = ? AND u.IdInstitucion = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$compact, $institucionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }

        $uCols = $this->sqlSelectUsuarioeAllColumnsPrefixed('u');
        $sql = "SELECT {$uCols}, i.DependenciaInstitucion, t.IdTipousrA as role, p.EmailA, p.NombreA, p.ApellidoA
                FROM usuarioe u
                LEFT JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                INNER JOIN tienetipor t ON u.IdUsrA = t.IdUsrA AND t.IdTipousrA = 1
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                WHERE $userExpr = ?
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$compact]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: false;
    }

public function getSuperAdminByUsername($username) {
    $compact = self::compactForLoginMatch((string) $username);
    if ($compact === '') {
        return false;
    }
    $userExpr = $this->sqlLoginUsrCompactExpr('u');
    $sql = "SELECT u.IdUsrA, u.UsrA, u.password_secure, t.IdTipousrA as role,
                   COALESCE(p.EmailA, 'admin@admin.com') as EmailA,
                   COALESCE(p.NombreA, 'Super') as NombreA,
                   COALESCE(p.ApellidoA, 'Admin') as ApellidoA
            FROM usuarioe u
            JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
            LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
            WHERE $userExpr = ? AND t.IdTipousrA = 1
            LIMIT 1";

    $stmt = $this->db->prepare($sql);
    $stmt->execute([$compact]);
    return $stmt->fetch(\PDO::FETCH_ASSOC);
}

    public function updateActivityMetadata($userId) {
        $sql = "UPDATE actividade SET UltentradaA = NOW(), ActivoA = 1 WHERE IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId]);
    }

    // --- NUEVAS FUNCIONES 2FA ---

    public function save2FACode($userId, $code) {
        // Expira en 10 minutos
        $sql = "UPDATE usuarioe SET two_factor_code = ?, two_factor_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE IdUsrA = ?";
        return $this->db->prepare($sql)->execute([$code, $userId]);
    }

public function verifyAndGetUser2FA($userId, $code) {
        // AGREGAMOS p.ApellidoA AQUÍ
        $sql = "SELECT u.IdUsrA, u.IdInstitucion, u.UsrA, t.IdTipousrA as role, p.NombreA, p.ApellidoA 
                FROM usuarioe u
                JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                WHERE u.IdUsrA = ? 
                AND u.two_factor_code = ? 
                AND u.two_factor_expires > NOW()";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $code]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function clear2FACode($userId) {
        $sql = "UPDATE usuarioe SET two_factor_code = NULL, two_factor_expires = NULL WHERE IdUsrA = ?";
        return $this->db->prepare($sql)->execute([$userId]);
    }

    // --- MANTENIMIENTO ---
    public function runMaintenance($instId) {
        $stmt = $this->db->prepare("SELECT FechaDepuracion FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $lastPurge = $stmt->fetchColumn();

        $now = new \DateTime();
        if ($lastPurge) {
            $lastDate = new \DateTime($lastPurge);
            if ($lastDate->diff($now)->m < 1 && $lastDate->diff($now)->y == 0) {
                return false; 
            }
        }

        $sql = "DELETE u FROM usuarioe u
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA
                LEFT JOIN actividade a ON u.IdUsrA = a.IdUsrA
                LEFT JOIN tienetipor t ON u.IdUsrA = t.IdUsrA
                WHERE u.IdInstitucion = ? 
                AND (t.IdTipousrA = 2 OR t.IdTipousrA IS NULL)
                AND (
                    (p.IdUsrA IS NULL OR a.IdUsrA IS NULL OR t.IdUsrA IS NULL)
                    OR 
                    (
                        a.UltentradaA < DATE_SUB(NOW(), INTERVAL 3 MONTH)
                        AND NOT EXISTS (SELECT 1 FROM protocoloexpe WHERE IdUsrA = u.IdUsrA)
                        AND NOT EXISTS (SELECT 1 FROM formularioe WHERE IdUsrA = u.IdUsrA)
                    )
                )";
        
        $this->db->prepare($sql)->execute([$instId]);
        $this->db->prepare("UPDATE institucion SET FechaDepuracion = NOW() WHERE IdInstitucion = ?")->execute([$instId]);
        return true;
    }
    // =========================================================
    // SEGURIDAD: CONTROL DE INTENTOS (RATE LIMITING)
    // =========================================================

    public function isIpBlocked($ip) {
        $stmt = $this->db->prepare("SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = ?");
        $stmt->execute([$ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $lastAttempt = strtotime($row['last_attempt']);
            $timePassed = time() - $lastAttempt;
            
            // Si tiene 5 o más intentos y pasaron menos de 5 minutos (300 segundos)
            if ($row['attempts'] >= 5 && $timePassed < 300) {
                return true; // 🚨 BLOQUEADO
            }
            
            // Si ya pasaron los 5 minutos, le perdonamos la vida y reiniciamos
            if ($row['attempts'] >= 5 && $timePassed >= 300) {
                $this->resetLoginAttempts($ip);
                return false;
            }
        }
        return false;
    }

    public function recordFailedLogin($ip) {
        // Inserta la IP con 1 intento. Si ya existe, le suma 1 y actualiza la hora.
        $sql = "INSERT INTO login_attempts (ip_address, attempts, last_attempt) 
                VALUES (?, 1, NOW()) 
                ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt = NOW()";
        $this->db->prepare($sql)->execute([$ip]);
    }

    public function resetLoginAttempts($ip) {
        // Borramos el historial criminal de la IP cuando se loguea con éxito
        $this->db->prepare("DELETE FROM login_attempts WHERE ip_address = ?")->execute([$ip]);
    }

// =========================================================
    // 🚀 ESCUDO DE SEGURIDAD (CONTRASEÑA Y CORREO)
    // =========================================================
    public function getSecurityStatus($userId) {
        $sql = "SELECT u.password_secure, p.EmailA 
                FROM usuarioe u 
                LEFT JOIN personae p ON u.IdUsrA = p.IdUsrA 
                WHERE u.IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function updateSecurity($userId, $data) {
        $this->db->beginTransaction();
        try {
            // Si el frontend manda una contraseña nueva, la hasheamos y guardamos
            if (!empty($data['pass'])) {
                $hash = password_hash($data['pass'], PASSWORD_BCRYPT);
                $this->db->prepare("UPDATE usuarioe SET password_secure = ? WHERE IdUsrA = ?")->execute([$hash, $userId]);
            }
            // Si el frontend manda un email nuevo, lo guardamos
            if (!empty($data['email'])) {
                $this->db->prepare("UPDATE personae SET EmailA = ? WHERE IdUsrA = ?")->execute([$data['email'], $userId]);
            }
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}