<?php
namespace App\Utils;

use PDO;

/** Modo de cobro de alojamiento (BD-01 / M5). */
class AlojamientoCobro {
    public const MODO_SUJETO = 'SUJETO';
    public const MODO_CONTENIDO = 'CONTENIDO';

    /** @var array<string, bool> */
    private static $colCache = [];

    public static function hasColumn(PDO $db, string $table, string $column): bool {
        $key = $table . '.' . $column;
        if (array_key_exists($key, self::$colCache)) {
            return self::$colCache[$key];
        }
        try {
            $stmt = $db->prepare('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '` LIKE ?');
            $stmt->execute([$column]);
            self::$colCache[$key] = (bool) $stmt->fetchColumn();
        } catch (\Throwable $e) {
            self::$colCache[$key] = false;
        }
        return self::$colCache[$key];
    }

    public static function normalizeModo(?string $raw): string {
        $u = strtoupper(trim((string) $raw));
        return $u === self::MODO_SUJETO ? self::MODO_SUJETO : self::MODO_CONTENIDO;
    }

    /** Trazabilidad en alojamientos: modulosactivosinst.Habilitado = 1, IdModulosApp = 6. */
    public static function instTrazabilidadHabilitada(PDO $db, int $instId): bool {
        return ModulosInstitucion::instModuloIdHabilitado(
            $db,
            $instId,
            ModulosInstitucion::ID_MODULO_TRAZABILIDAD_ALOJAMIENTOS
        ) || ModulosInstitucion::instModuloHabilitado($db, $instId, 'trazabilidad_alojamientos');
    }

    public static function getModoInst(PDO $db, int $instId): string {
        if ($instId <= 0 || !self::hasColumn($db, 'institucion', 'AlojamientoCobroModo')) {
            return self::MODO_CONTENIDO;
        }
        $stmt = $db->prepare('SELECT AlojamientoCobroModo FROM institucion WHERE IdInstitucion = ? LIMIT 1');
        $stmt->execute([$instId]);
        $raw = $stmt->fetchColumn();
        return self::normalizeModo($raw !== false ? (string) $raw : null);
    }

    /** Modo de cobro del tipo de alojamiento (fallback: institución → CONTENIDO). */
    public static function getModoTipo(PDO $db, int $idTipoAlojamiento, int $instId = 0): string {
        if ($idTipoAlojamiento > 0
            && self::hasColumn($db, 'tipoalojamiento', 'AlojamientoCobroModo')) {
            $stmt = $db->prepare(
                'SELECT AlojamientoCobroModo FROM tipoalojamiento WHERE IdTipoAlojamiento = ? LIMIT 1'
            );
            $stmt->execute([$idTipoAlojamiento]);
            $raw = $stmt->fetchColumn();
            if ($raw !== false) {
                return self::normalizeModo((string) $raw);
            }
        }
        if ($instId > 0) {
            return self::getModoInst($db, $instId);
        }
        return self::MODO_CONTENIDO;
    }

    /** ¿Cobro por sujeto en un tramo? (según tipo de alojamiento del tramo). */
    public static function cobroPorSujetoTramo(PDO $db, int $instId, array $row): bool {
        if (!self::instTrazabilidadHabilitada($db, $instId)) {
            return false;
        }
        $idTipo = (int) ($row['IdTipoAlojamiento'] ?? 0);
        return self::getModoTipo($db, $idTipo, $instId) === self::MODO_SUJETO;
    }

    /** @deprecated Preferir cobroPorSujetoTramo / getModoTipo por tipo. */
    public static function cobroPorSujeto(PDO $db, int $instId): bool {
        return self::instTrazabilidadHabilitada($db, $instId)
            && self::getModoInst($db, $instId) === self::MODO_SUJETO;
    }

    public static function countSujetosTramo(PDO $db, int $idAlojamiento): int {
        if ($idAlojamiento <= 0) {
            return 0;
        }
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM especie_alojamiento_unidad eu
             INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
             WHERE ac.IdAlojamiento = ?'
        );
        $stmt->execute([$idAlojamiento]);
        return max(0, (int) $stmt->fetchColumn());
    }

    /** Precio unitario del tramo (único tarifario; el modo solo cambia la cantidad multiplicadora). */
    public static function precioUnitarioTramo(array $row): float {
        return (float) ($row['PrecioCajaMomento'] ?? 0);
    }

    /** @deprecated Alias de precioUnitarioTramo — conservado por llamadas legacy. */
    public static function precioSujetoTramo(PDO $db, array $row): float {
        return self::precioUnitarioTramo($row);
    }

    /** Cantidad multiplicadora según modo del tipo (cajas vs sujetos trazados). */
    public static function cantidadCobroTramo(PDO $db, int $instId, array $row): int {
        if (self::cobroPorSujetoTramo($db, $instId, $row)) {
            return self::countSujetosTramo($db, (int) ($row['IdAlojamiento'] ?? 0));
        }
        return max(0, (int) ($row['CantidadCaja'] ?? 0));
    }

    public static function precioDesdeTipo(PDO $db, int $idTipoAlojamiento): float {
        if ($idTipoAlojamiento <= 0) {
            return 0.0;
        }
        $stmt = $db->prepare('SELECT PrecioXunidad FROM tipoalojamiento WHERE IdTipoAlojamiento = ? LIMIT 1');
        $stmt->execute([$idTipoAlojamiento]);
        $raw = $stmt->fetchColumn();
        return $raw !== false ? (float) $raw : 0.0;
    }

    /** @deprecated Alias de precioDesdeTipo. */
    public static function precioSujetoDesdeTipo(PDO $db, int $idTipoAlojamiento): float {
        return self::precioDesdeTipo($db, $idTipoAlojamiento);
    }
}
