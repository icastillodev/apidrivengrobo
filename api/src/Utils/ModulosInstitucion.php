<?php
namespace App\Utils;

use PDO;

/**
 * Módulos contratables por institución (modulosapp + modulosactivosinst).
 * estado_logico: 1 = apagado, 2 = solo admin (roles 1,2,4), 3 = admin + investigadores.
 */
class ModulosInstitucion
{
    /** Claves semánticas alineadas con `NombreModulo` en `modulosapp`. */
    public const SEMANTIC_KEYS = [
        'animales',
        'reactivos',
        'insumos',
        'reservas',
        'alojamientos',
        'trazabilidad_alojamientos',
    ];

    public const MENU_ID_TO_MODULE = [
        3 => 'animales',
        4 => 'reactivos',
        5 => 'insumos',
        6 => 'reservas',
        7 => 'alojamientos',
        10 => '_forms_any',
        11 => '_forms_any',
        12 => 'alojamientos',
        14 => 'reservas',
    ];

    public static function nombreModuloToKey(?string $nombre): ?string
    {
        $n = mb_strtolower(trim((string) $nombre), 'UTF-8');
        if ($n === '') {
            return null;
        }
        if (strpos($n, 'trazabilidad') !== false) {
            return 'trazabilidad_alojamientos';
        }
        if (strpos($n, 'reserva') !== false) {
            return 'reservas';
        }
        if (strpos($n, 'insumo') !== false) {
            return 'insumos';
        }
        if (strpos($n, 'reactivo') !== false || strpos($n, 'reagent') !== false) {
            return 'reactivos';
        }
        if (strpos($n, 'animal') !== false) {
            return 'animales';
        }
        if (strpos($n, 'alojamiento') !== false) {
            return 'alojamientos';
        }
        return null;
    }

    public static function rowToEstadoLogico($habilitado, $activoInv): int
    {
        if ($habilitado === null || (int) $habilitado === 2) {
            return 1;
        }
        $h = (int) $habilitado;
        $a = (int) $activoInv;
        if ($h === 1 && $a === 2) {
            return 2;
        }
        if ($h === 1 && $a === 1) {
            return 3;
        }
        return 1;
    }

    /**
     * @return array{byKey: array<string,int>, list: array<int, array<string,mixed>>}
     */
    public static function getSnapshot(PDO $db, int $instId): array
    {
        if ($instId <= 0) {
            return ['byKey' => [], 'list' => []];
        }

        $sql = 'SELECT app.IdModulosApp, app.NombreModulo, ma.Habilitado, ma.ActivoInvestigador
                FROM modulosapp app
                LEFT JOIN modulosactivosinst ma ON ma.IdModulosApp = app.IdModulosApp AND ma.IdInstitucion = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute([$instId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $byKey = [];
        $list = [];

        foreach ($rows as $row) {
            $key = self::nombreModuloToKey($row['NombreModulo'] ?? '');
            $estado = self::rowToEstadoLogico($row['Habilitado'] ?? null, $row['ActivoInvestigador'] ?? null);
            $list[] = [
                'IdModulosApp' => (int) $row['IdModulosApp'],
                'NombreModulo' => $row['NombreModulo'],
                'key' => $key,
                'estado_logico' => $estado,
            ];
            if ($key !== null) {
                if (!isset($byKey[$key]) || $estado > $byKey[$key]) {
                    $byKey[$key] = $estado;
                }
            }
            // Un mismo registro en modulosapp puede titularse "trazabilidad en alojamientos…":
            // nombreModuloToKey lo clasifica solo como trazabilidad_alojamientos y entonces
            // byKey['alojamientos'] quedaba vacío (≈ apagado) aunque el módulo base esté habilitado.
            if ($key === 'trazabilidad_alojamientos') {
                $nm = mb_strtolower((string) ($row['NombreModulo'] ?? ''), 'UTF-8');
                if (strpos($nm, 'alojamiento') !== false) {
                    if (!isset($byKey['alojamientos']) || $estado > $byKey['alojamientos']) {
                        $byKey['alojamientos'] = $estado;
                    }
                }
            }
        }

        return ['byKey' => $byKey, 'list' => $list];
    }

    public static function estadoParaKey(array $byKey, string $key): int
    {
        return isset($byKey[$key]) ? (int) $byKey[$key] : 1;
    }

    public static function rolEsAdminSede(int $roleId): bool
    {
        return in_array($roleId, [1, 2, 4], true);
    }

    /**
     * ¿El rol puede usar el módulo según estado_logico?
     */
    public static function rolPuedeModulo(int $estadoLogico, int $roleId): bool
    {
        if ($estadoLogico <= 1) {
            return false;
        }
        if ($estadoLogico >= 3) {
            return true;
        }
        return self::rolEsAdminSede($roleId);
    }

    public static function anyFormularioActivo(array $byKey, int $roleId): bool
    {
        foreach (['animales', 'reactivos', 'insumos'] as $k) {
            if (self::rolPuedeModulo(self::estadoParaKey($byKey, $k), $roleId)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Roles que no son admin de sede: ven menú según módulo; si hay datos propios legacy, siguen viendo ese acceso.
     */
    public static function esRolInvestigadorVisibilidadModulos(int $roleId): bool
    {
        if ($roleId <= 0 || $roleId === 1) {
            return false;
        }

        return !self::rolEsAdminSede($roleId);
    }

    /**
     * @return array<string,bool>
     */
    public static function getInvestigatorLegacyDataFlags(PDO $db, int $userId, int $instId): array
    {
        $out = array_fill_keys(self::SEMANTIC_KEYS, false);
        if ($userId <= 0 || $instId <= 0) {
            return $out;
        }

        $sql = 'SELECT
            EXISTS (
                SELECT 1 FROM formularioe f
                INNER JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA AND tf.IdInstitucion = f.IdInstitucion
                WHERE f.IdUsrA = ? AND f.IdInstitucion = ?
                  AND LOWER(TRIM(tf.categoriaformulario)) IN (\'animal\', \'animal vivo\')
            ) AS animales,
            EXISTS (
                SELECT 1 FROM formularioe f
                INNER JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA AND tf.IdInstitucion = f.IdInstitucion
                WHERE f.IdUsrA = ? AND f.IdInstitucion = ?
                  AND (
                    LOWER(TRIM(tf.categoriaformulario)) IN (\'otros reactivos biologicos\', \'otros reactivos biológicos\')
                    OR LOWER(TRIM(tf.categoriaformulario)) LIKE \'otros reactivos bio%\'
                  )
            ) AS reactivos,
            EXISTS (
                SELECT 1 FROM formularioe f
                INNER JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA AND tf.IdInstitucion = f.IdInstitucion
                WHERE f.IdUsrA = ? AND f.IdInstitucion = ?
                  AND LOWER(TRIM(tf.categoriaformulario)) IN (\'insumos\', \'insumo\')
            ) AS insumos,
            EXISTS (
                SELECT 1 FROM reserva r
                WHERE r.IdInstitucion = ? AND r.IdUsrTitular = ?
            ) AS reservas,
            EXISTS (
                SELECT 1 FROM alojamiento a
                WHERE a.IdInstitucion = ? AND a.IdUsrA = ?
            ) AS alojamientos,
            EXISTS (
                SELECT 1 FROM alojamiento a
                INNER JOIN alojamiento_caja ac ON ac.IdAlojamiento = a.IdAlojamiento
                WHERE a.IdInstitucion = ? AND a.IdUsrA = ?
            ) AS trazabilidad_alojamientos';

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $userId, $instId,
                $userId, $instId,
                $userId, $instId,
                $instId, $userId,
                $instId, $userId,
                $instId, $userId,
            ]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            return $out;
        }

        foreach (self::SEMANTIC_KEYS as $k) {
            $out[$k] = isset($row[$k]) && (int) $row[$k] === 1;
        }

        return $out;
    }

    public static function investigatorHasLegacyDataForModule(PDO $db, int $userId, int $instId, string $key): bool
    {
        if (!in_array($key, self::SEMANTIC_KEYS, true)) {
            return false;
        }
        $flags = self::getInvestigatorLegacyDataFlags($db, $userId, $instId);

        return !empty($flags[$key]);
    }

    /**
     * @param array<string,bool>|null $invHasData solo para investigadores (no admin sede)
     */
    public static function investigadorVeModuloEnMenu(array $byKey, int $roleId, string $moduleKey, ?array $invHasData): bool
    {
        if (self::rolPuedeModulo(self::estadoParaKey($byKey, $moduleKey), $roleId)) {
            return true;
        }
        if ($invHasData === null || !self::esRolInvestigadorVisibilidadModulos($roleId)) {
            return false;
        }

        return !empty($invHasData[$moduleKey]);
    }

    /**
     * @param array<string,bool>|null $invHasData
     */
    public static function anyFormularioActivoOlegacyInv(array $byKey, int $roleId, ?array $invHasData): bool
    {
        if (self::anyFormularioActivo($byKey, $roleId)) {
            return true;
        }
        if ($invHasData === null || !self::esRolInvestigadorVisibilidadModulos($roleId)) {
            return false;
        }
        foreach (['animales', 'reactivos', 'insumos'] as $k) {
            if (!empty($invHasData[$k])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param int[] $ids
     * @return int[]
     */
    public static function filterMenuIds(array $ids, array $byKey, int $roleId, int $instId, ?PDO $db = null, ?int $userId = null): array
    {
        if ($instId <= 0 || in_array($roleId, [1, 2, 4], true)) {
            return $ids;
        }

        $invHasData = null;
        if ($db !== null && $userId !== null && $userId > 0 && self::esRolInvestigadorVisibilidadModulos($roleId)) {
            $invHasData = self::getInvestigatorLegacyDataFlags($db, $userId, $instId);
        }

        $out = [];
        foreach ($ids as $id) {
            $mid = (int) $id;
            if (!isset(self::MENU_ID_TO_MODULE[$mid])) {
                $out[] = $mid;
                continue;
            }
            $mk = self::MENU_ID_TO_MODULE[$mid];
            if ($mk === '_forms_any') {
                if (self::anyFormularioActivoOlegacyInv($byKey, $roleId, $invHasData)) {
                    $out[] = $mid;
                }
                continue;
            }
            if (self::investigadorVeModuloEnMenu($byKey, $roleId, $mk, $invHasData)) {
                $out[] = $mid;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * Control de acceso a un módulo contratado (superadmin rol 1 sin límite).
     *
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public static function assertModuloContratado(PDO $db, int $instId, int $roleId, string $key, ?string $msg = null): void
    {
        if ($roleId === 1) {
            return;
        }
        if (!in_array($key, self::SEMANTIC_KEYS, true)) {
            throw new \InvalidArgumentException('Clave de módulo inválida: ' . $key);
        }
        if ($instId <= 0) {
            throw new \RuntimeException('Institución no válida para el módulo solicitado.');
        }
        $snap = self::getSnapshot($db, $instId);
        $est = self::estadoParaKey($snap['byKey'], $key);
        if (!self::rolPuedeModulo($est, $roleId)) {
            throw new \RuntimeException($msg ?? 'Este módulo no está habilitado para esta institución o su rol.');
        }
    }

    public static function assertModuloSesion(PDO $db, array $sesion, string $key, ?string $msg = null): void
    {
        self::assertModuloContratado(
            $db,
            (int)($sesion['instId'] ?? 0),
            (int)($sesion['role'] ?? 0),
            $key,
            $msg
        );
    }

    /**
     * Para ?inst=: solo superadmin (rol 1) puede consultar otra sede; el resto usa siempre la institución del JWT.
     */
    public static function instEffectiveFromRequest(array $sesion, $getInstParam): int
    {
        $r = (int)($sesion['role'] ?? 0);
        if ($r === 1) {
            if ($getInstParam !== null && $getInstParam !== '') {
                $v = filter_var($getInstParam, FILTER_VALIDATE_INT);
                if ($v !== false && (int) $v > 0) {
                    return (int) $v;
                }
            }

            return (int)($sesion['instId'] ?? 0);
        }

        return (int)($sesion['instId'] ?? 0);
    }

    public static function assertTrazabilidadAlojamientos(PDO $db, int $instId, int $roleId): void
    {
        self::assertModuloContratado(
            $db,
            $instId,
            $roleId,
            'trazabilidad_alojamientos',
            'Módulo de trazabilidad de alojamientos no habilitado para esta institución o su rol.'
        );
    }

    /**
     * Lectura de árbol / fichas: investigador con cajas propias aunque el módulo esté apagado.
     *
     * @throws \RuntimeException
     */
    public static function assertTrazabilidadLecturaOlegacy(PDO $db, array $sesion): void
    {
        $role = (int) ($sesion['role'] ?? 0);
        $instId = (int) ($sesion['instId'] ?? 0);
        $userId = (int) ($sesion['userId'] ?? 0);
        try {
            self::assertModuloContratado(
                $db,
                $instId,
                $role,
                'trazabilidad_alojamientos',
                'Módulo de trazabilidad de alojamientos no habilitado para esta institución o su rol.'
            );
        } catch (\RuntimeException $e) {
            if (!self::esRolInvestigadorVisibilidadModulos($role)
                || !self::investigatorHasLegacyDataForModule($db, $userId, $instId, 'trazabilidad_alojamientos')) {
                throw $e;
            }
        }
    }

    /**
     * Validar asignación de ítem de menú a rol 5/6 según módulos.
     *
     * @throws \Exception
     */
    public static function assertMenuIdPermitidoParaInstitucion(PDO $db, int $instId, int $menuId, int $newStatus): void
    {
        if ($newStatus != 1 || $instId <= 0) {
            return;
        }
        $snap = self::getSnapshot($db, $instId);
        $byKey = $snap['byKey'];

        if (!isset(self::MENU_ID_TO_MODULE[$menuId])) {
            return;
        }
        $mk = self::MENU_ID_TO_MODULE[$menuId];
        if ($mk === '_forms_any') {
            if (!self::anyFormularioActivo($byKey, 3)) {
                throw new \Exception('No hay formularios de pedido activos para investigadores en esta institución.');
            }
            return;
        }
        if (!self::rolPuedeModulo(self::estadoParaKey($byKey, $mk), 3)) {
            throw new \Exception('Este ítem de menú corresponde a un módulo no contratado o no disponible para investigadores.');
        }
    }
}
