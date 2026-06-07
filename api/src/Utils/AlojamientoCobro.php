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

    public static function instTrazabilidadHabilitada(PDO $db, int $instId): bool {
        if ($instId <= 0) {
            return false;
        }
        $snap = ModulosInstitucion::getSnapshot($db, $instId);
        $estado = ModulosInstitucion::estadoParaKey($snap['byKey'], 'trazabilidad_alojamientos');
        return $estado >= 2;
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

    /** ¿Aplicar cobro por sujeto en facturación? */
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

    public static function precioSujetoTramo(PDO $db, array $row): float {
        if (!empty($row['PrecioSujetoMomento']) && (float) $row['PrecioSujetoMomento'] > 0) {
            return (float) $row['PrecioSujetoMomento'];
        }
        if (self::hasColumn($db, 'tipoalojamiento', 'PrecioXSujeto')
            && !empty($row['PrecioXSujeto']) && (float) $row['PrecioXSujeto'] > 0) {
            return (float) $row['PrecioXSujeto'];
        }
        return (float) ($row['PrecioCajaMomento'] ?? 0);
    }

    public static function precioSujetoDesdeTipo(PDO $db, int $idTipoAlojamiento): float {
        if ($idTipoAlojamiento <= 0) {
            return 0.0;
        }
        $cols = 'PrecioXunidad';
        if (self::hasColumn($db, 'tipoalojamiento', 'PrecioXSujeto')) {
            $cols .= ', PrecioXSujeto';
        }
        $stmt = $db->prepare("SELECT {$cols} FROM tipoalojamiento WHERE IdTipoAlojamiento = ? LIMIT 1");
        $stmt->execute([$idTipoAlojamiento]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return 0.0;
        }
        if (isset($row['PrecioXSujeto']) && $row['PrecioXSujeto'] !== null && (float) $row['PrecioXSujeto'] > 0) {
            return (float) $row['PrecioXSujeto'];
        }
        return (float) ($row['PrecioXunidad'] ?? 0);
    }
}
