<?php
declare(strict_types=1);

namespace App\Utils;

use PDO;

/**
 * Metadatos de listados de alojamiento sin consultas por fila.
 *
 * Los datos siguen aislados por el IdInstitucion previamente autorizado.
 * Se conserva el mismo fallback de AlojamientoCobro::getModoTipo().
 * No calcula precios, no escribe datos.
 */
final class AlojamientoListMetadata
{
    private const BATCH_SIZE = 250;

    /**
     * @return array{counts: array<int,int>, modos: array<int,string>}
     */
    public static function load(PDO $db, array $rows, int $instId): array
    {
        $alojIds = [];
        $tipoIds = [];
        foreach ($rows as $row) {
            $idAloj = (int)($row['IdAlojamiento'] ?? 0);
            $idTipo = (int)($row['IdTipoAlojamiento'] ?? 0);
            if ($idAloj > 0) $alojIds[$idAloj] = $idAloj;
            if ($idTipo > 0) $tipoIds[$idTipo] = $idTipo;
        }
        $counts = [];
        foreach (array_chunk(array_values($alojIds), self::BATCH_SIZE) as $batch) {
            $p = implode(',', array_fill(0, count($batch), '?'));
            $stmt = $db->prepare(
                "SELECT ac.IdAlojamiento AS id, COUNT(*) AS cantidad
                 FROM alojamiento_caja ac
                 INNER JOIN especie_alojamiento_unidad eu
                    ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                 WHERE ac.IdAlojamiento IN ($p)
                 GROUP BY ac.IdAlojamiento"
            );
            $stmt->execute($batch);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $record) {
                $counts[(int)$record['id']] = max(0, (int)$record['cantidad']);
            }
        }

        $modos = [];
        $tipoHasModo = AlojamientoCobro::hasColumn($db, 'tipoalojamiento', 'AlojamientoCobroModo');
        if ($tipoHasModo) {
            foreach (array_chunk(array_values($tipoIds), self::BATCH_SIZE) as $batch) {
                $p = implode(',', array_fill(0, count($batch), '?'));
                $stmt = $db->prepare(
                    "SELECT IdTipoAlojamiento, AlojamientoCobroModo
                     FROM tipoalojamiento WHERE IdTipoAlojamiento IN ($p)"
                );
                $stmt->execute($batch);
                foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $record) {
                    $modos[(int)$record['IdTipoAlojamiento']] =
                        AlojamientoCobro::normalizeModo($record['AlojamientoCobroModo'] !== null
                            ? (string)$record['AlojamientoCobroModo'] : null);
                }
            }
        }
        // Si el tipo no existe (o no tiene columna de modo), usar el mismo
        // fallback institucional que el código anterior.
        $missingTipos = array_diff_key($tipoIds, $modos);
        if ($missingTipos) {
            $fallback = $instId > 0
                ? AlojamientoCobro::getModoInst($db, $instId)
                : AlojamientoCobro::MODO_CONTENIDO;
            foreach ($missingTipos as $idTipo) {
                $modos[(int)$idTipo] = $fallback;
            }
        }
        $modos[0] = $instId > 0
            ? ($fallback ?? AlojamientoCobro::getModoInst($db, $instId))
            : AlojamientoCobro::MODO_CONTENIDO;
        return ['counts' => $counts, 'modos' => $modos];
    }
}
