<?php
declare(strict_types=1);

namespace App\Models\UserForms;

use PDO;
use RuntimeException;

/**
 * Migración explícita, NO llamada por request ni autoload.
 * Instala dos tablas auxiliares y triggers de invalidación.
 * El estado publicado queda NULL hasta un backfill verificado.
 */
final class UserFormsSearchIndexSchema
{
    private const SOURCES = [
        'formularioe' => 'fo',
        'formulario_derivacion' => 'fd',
        'formulario_owner_actual' => 'oa',
        'formulario_datos_originales' => 'do',
        'tipoformularios' => 'tf',
        'precioformulario' => 'pf',
        'precioinsumosformulario' => 'pi',
        'protformr' => 'pr',
        'protocoloexpe' => 'px',
        'protdeptor' => 'pd',
        'departamentoe' => 'dp',
        'organismoe' => 'or',
        'institucion' => 'in',
    ];

    public const INVALIDATION_SHARDS = 64;

    // Claves de reparto del contador, restringidas al esquema verificado.
    // Si cambia la identidad de una fila, igualmente cambia la suma global.
    private const SOURCE_KEYS = [
        'formularioe'=>'idformA',
        'formulario_derivacion'=>'IdFormularioDerivacion',
        'formulario_owner_actual'=>'idformA',
        'formulario_datos_originales'=>'IdFormularioDerivacion',
        'tipoformularios'=>'IdTipoFormulario',
        'precioformulario'=>'idformA',
        'precioinsumosformulario'=>'idformA',
        'protformr'=>'idformA',
        'protocoloexpe'=>'idprotA',
        'protdeptor'=>'idprotA',
        'departamentoe'=>'iddeptoA',
        'organismoe'=>'IdOrganismo',
        'institucion'=>'IdInstitucion',
    ];

    /** @return array<string,array{table:string,event:string}> */
    public static function triggerManifest(): array
    {
        $out = [];
        foreach (self::SOURCES as $table => $code) {
            foreach (['INSERT'=>'ai', 'UPDATE'=>'au', 'DELETE'=>'ad'] as $event => $suffix) {
                $out['grobo_fs_' . $code . '_' . $suffix] = ['table'=>$table,'event'=>$event];
            }
        }
        return $out;
    }

    /** Protege frente a una instalación a medias o triggers ajenos modificados. */
    public static function triggersReady(PDO $db): bool
    {
        $stmt = $db->prepare("SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, EVENT_MANIPULATION,
                                     ACTION_STATEMENT
                              FROM information_schema.TRIGGERS
                              WHERE TRIGGER_SCHEMA = DATABASE()
                                AND TRIGGER_NAME LIKE 'grobo_fs_%'");
        $stmt->execute();
        $seen = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $seen[(string)$row['TRIGGER_NAME']] = $row;
        }
        $expected = self::triggerManifest();
        if (count($seen) !== count($expected)) return false;
        foreach ($expected as $name=>$rule) {
            $found = $seen[$name] ?? null;
            if (!$found || $found['EVENT_OBJECT_TABLE'] !== $rule['table']
                || $found['EVENT_MANIPULATION'] !== $rule['event']
                || !str_contains(strtolower((string)$found['ACTION_STATEMENT']), 'grobo_form_search_invalidation')
                || !str_contains(strtolower((string)$found['ACTION_STATEMENT']), 'crc32')) {
                return false;
            }
            // Borrado físico de una ficha: purgar todas sus copias indexadas
            // en la misma transacción, incluida cualquier generación antigua.
            if ($name === 'grobo_fs_fo_ad'
                && !str_contains(strtolower((string)$found['ACTION_STATEMENT']),
                    'grobo_form_search_document')) {
                return false;
            }
        }
        try {
            $shards=$db->query(
                'SELECT COUNT(*) AS n, MIN(shard) AS lo, MAX(shard) AS hi
                 FROM grobo_form_search_invalidation'
            )->fetch(PDO::FETCH_ASSOC);
            return (int)($shards['n'] ?? 0) === self::INVALIDATION_SHARDS
                && (int)($shards['lo'] ?? -1) === 0
                && (int)($shards['hi'] ?? -1) === self::INVALIDATION_SHARDS-1;
        } catch (\PDOException $e) {
            return false;
        }
    }

    /** Columnas imprescindibles, compartidas por preflight e instalación. */
    public static function requiredColumns(): array
    {
        return [
            'formularioe' => ['idformA','IdUsrA','IdInstitucion','tipoA','estado'],
            'formulario_derivacion' => [
                'IdFormularioDerivacion','idformA','idformAOrigen',
                'IdUsrDestinoResponsable','IdInstitucionDestino','Activo',
            ],
            'formulario_datos_originales' => ['idformA','IdFormularioDerivacion','datos_json'],
            'institucion' => ['IdInstitucion','NombreInst'],
            'tipoformularios' => ['IdTipoFormulario','IdInstitucion','nombreTipo','categoriaformulario'],
            'precioformulario' => ['idformA','precioformulario','totalpago'],
            'precioinsumosformulario' => ['idformA','preciototal','totalpago'],
            'protocoloexpe' => ['idprotA','nprotA'],
            'protformr' => ['idformA','idprotA'],
            'protdeptor' => ['idprotA','iddeptoA'],
            'departamentoe' => ['iddeptoA','NombreDeptoA'],
            'organismoe' => ['IdOrganismo','NombreOrganismoSimple'],
            'formulario_owner_actual' => ['idformA','IdInstitucionActual'],
        ];
    }

    /**
     * Inspección de estructura exclusivamente SELECT/metadata, antes de DDL.
     * No inspecciona filas de usuarios ni altera permisos o esquema.
     */
    public static function preflight(PDO $db): array
    {
        $database = (string)$db->query('SELECT DATABASE()')->fetchColumn();
        if ($database === '') throw new RuntimeException('Seleccione una base de datos explícita');

        $knownTables = array_fill_keys($db->query(
            "SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()"
        )->fetchAll(PDO::FETCH_COLUMN), true);
        $knownColumns = [];
        $stmt = $db->query("SELECT TABLE_NAME,COLUMN_NAME
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()");
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
            $knownColumns[$col['TABLE_NAME']][$col['COLUMN_NAME']] = true;
        }

        $missingTables = [];
        $missingColumns = [];
        foreach (self::requiredColumns() as $table=>$columns) {
            if (!isset($knownTables[$table])) {
                $missingTables[] = $table;
                continue;
            }
            foreach ($columns as $column) {
                if (!isset($knownColumns[$table][$column])) {
                    $missingColumns[] = $table . '.' . $column;
                }
            }
        }

        $expectedTriggers = self::triggerManifest();
        $foundTriggers = [];
        $trig = $db->query("SELECT TRIGGER_NAME,EVENT_OBJECT_TABLE,
                                   EVENT_MANIPULATION,ACTION_STATEMENT
                            FROM information_schema.TRIGGERS
                            WHERE TRIGGER_SCHEMA=DATABASE()");
        foreach ($trig->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $foundTriggers[$row['TRIGGER_NAME']] = $row;
        }
        $present = 0;
        $conflicts = [];
        foreach ($expectedTriggers as $name=>$rule) {
            if (!isset($foundTriggers[$name])) continue;
            $present++;
            $row = $foundTriggers[$name];
            if ($row['EVENT_OBJECT_TABLE'] !== $rule['table']
                || $row['EVENT_MANIPULATION'] !== $rule['event']
                || !str_contains(strtolower((string)$row['ACTION_STATEMENT']),
                    'grobo_form_search_invalidation')
                || !str_contains(strtolower((string)$row['ACTION_STATEMENT']), 'crc32')
                || ($name === 'grobo_fs_fo_ad'
                    && !str_contains(strtolower((string)$row['ACTION_STATEMENT']),
                        'grobo_form_search_document'))) {
                $conflicts[] = $name;
            }
        }
        $shardCount = isset($knownTables['grobo_form_search_invalidation'])
            ? (int)$db->query(
                'SELECT COUNT(*) FROM grobo_form_search_invalidation'
            )->fetchColumn()
            : 0;
        return [
            'schema_compatible' => $missingTables === [] && $missingColumns === [],
            'missing_tables' => $missingTables,
            'missing_columns' => $missingColumns,
            'expected_triggers' => count($expectedTriggers),
            'triggers_present' => $present,
            'trigger_conflicts' => $conflicts,
            'index_state_table_exists' => isset($knownTables['grobo_form_search_state']),
            'index_document_table_exists' => isset($knownTables['grobo_form_search_document']),
            'invalidation_shard_table_exists' =>
                isset($knownTables['grobo_form_search_invalidation']),
            'invalidation_shards_present' => $shardCount,
            'invalidation_shards_expected' => self::INVALIDATION_SHARDS,
            'note' => 'Read-only schema check, does not establish privileges or installation safety.',
        ];
    }

    /**
     * Sólo invocable por script de mantenimiento aprobado con DSN definido.
     * Si faltan tablas origen, aborta: no crear un índice incompleto.
     */
    public static function install(PDO $db): void
    {
        if ($db->query('SELECT DATABASE()')->fetchColumn() === false) {
            throw new RuntimeException('Seleccione una base de datos explícita');
        }
        $look = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES
                              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
        foreach (array_keys(self::SOURCES) as $table) {
            $look->execute([$table]);
            if ((int)$look->fetchColumn() !== 1) {
                throw new RuntimeException('No existe la tabla origen requerida: ' . $table);
            }
        }

        // Evitar activar un esquema que no soporta las reglas canónicas de
        // visibilidad, copias y precio. La base desplegada debe pasar primero
        // la compatibilidad de columnas en forma explícita.
        $columns = self::requiredColumns();
        $colStmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS
                                 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?
                                   AND COLUMN_NAME=?");
        foreach ($columns as $table=>$names) {
            foreach ($names as $column) {
                $colStmt->execute([$table,$column]);
                if ((int)$colStmt->fetchColumn() !== 1) {
                    throw new RuntimeException('Índice incompatible con la columna '
                        . $table . '.' . $column);
                }
            }
        }

        $db->exec("CREATE TABLE IF NOT EXISTS grobo_form_search_state (
                id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                epoch BIGINT UNSIGNED NOT NULL DEFAULT 0,
                published_epoch BIGINT UNSIGNED NULL,
                published_generation CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
                published_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
                published_at DATETIME NULL
            ) ENGINE=InnoDB");
        $db->exec("INSERT IGNORE INTO grobo_form_search_state
                   (id, epoch, published_epoch, published_generation, published_count)
                   VALUES (1,0,NULL,NULL,0)");
        $db->exec("CREATE TABLE IF NOT EXISTS grobo_form_search_document (
                generation CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
                idformA INT NOT NULL,
                text_flat LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                PRIMARY KEY (generation,idformA),
                KEY idx_gfsi_form (idformA)
            ) ENGINE=InnoDB");
        $db->exec("CREATE TABLE IF NOT EXISTS grobo_form_search_invalidation (
                shard TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                epoch BIGINT UNSIGNED NOT NULL DEFAULT 0
            ) ENGINE=InnoDB");
        // Un contador perdido pudo haber omitido escrituras. Nunca permitir
        // que una reparación resucite una generación anterior con epoch igual.
        $existingShards=(int)$db->query(
            'SELECT COUNT(*) FROM grobo_form_search_invalidation'
        )->fetchColumn();
        if ($existingShards!==self::INVALIDATION_SHARDS) {
            $db->exec("UPDATE grobo_form_search_state
                       SET published_epoch=NULL,published_generation=NULL,
                           published_count=0,published_at=NULL WHERE id=1");
        }
        $values=[];
        for($shard=0; $shard<self::INVALIDATION_SHARDS; $shard++) {
            $values[]="({$shard},0)";
        }
        $db->exec("INSERT IGNORE INTO grobo_form_search_invalidation
                   (shard,epoch) VALUES ".implode(',', $values));

        $check = $db->prepare("SELECT TRIGGER_NAME, ACTION_STATEMENT
                               FROM information_schema.TRIGGERS
                               WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?");
        foreach (self::triggerManifest() as $name=>$rule) {
            $check->execute([$name]);
            $exists = $check->fetch(PDO::FETCH_ASSOC);
            if ($exists) {
                $statement = strtolower((string)$exists['ACTION_STATEMENT']);
                if (!str_contains($statement, 'grobo_form_search_invalidation')
                    || !str_contains($statement, 'crc32')
                    || ($name === 'grobo_fs_fo_ad'
                        && !str_contains($statement, 'grobo_form_search_document'))) {
                    throw new RuntimeException('Trigger preexistente no coincide: ' . $name);
                }
                continue;
            }
            $key=self::SOURCE_KEYS[$rule['table']];
            $entity=$rule['event']==='DELETE' ? 'OLD' : 'NEW';
            $count=self::INVALIDATION_SHARDS;
            $bucket="MOD(CRC32(CONCAT('{$rule['table']}:',
                     COALESCE(CAST({$entity}.{$key} AS CHAR),''))),{$count})";
            $invalidate="UPDATE grobo_form_search_invalidation
                         SET epoch=epoch+1 WHERE shard={$bucket}";
            if ($name === 'grobo_fs_fo_ad') {
                $sql = "CREATE TRIGGER {$name} AFTER DELETE ON formularioe
                        FOR EACH ROW BEGIN
                            {$invalidate};
                            DELETE FROM grobo_form_search_document WHERE idformA=OLD.idformA;
                        END";
            } else {
                $sql = "CREATE TRIGGER {$name} AFTER {$rule['event']}
                        ON {$rule['table']} FOR EACH ROW {$invalidate}";
            }
            $db->exec($sql);
        }
        if (!self::triggersReady($db)) {
            throw new RuntimeException('El índice no está protegido por todos sus triggers');
        }
    }
}
