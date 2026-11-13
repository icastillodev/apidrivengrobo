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
                || !str_contains(strtolower((string)$found['ACTION_STATEMENT']), 'grobo_form_search_state')) {
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
        return true;
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
        $columns = [
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

        $check = $db->prepare("SELECT TRIGGER_NAME, ACTION_STATEMENT
                               FROM information_schema.TRIGGERS
                               WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?");
        foreach (self::triggerManifest() as $name=>$rule) {
            $check->execute([$name]);
            $exists = $check->fetch(PDO::FETCH_ASSOC);
            if ($exists) {
                $statement = strtolower((string)$exists['ACTION_STATEMENT']);
                if (!str_contains($statement, 'grobo_form_search_state')
                    || ($name === 'grobo_fs_fo_ad'
                        && !str_contains($statement, 'grobo_form_search_document'))) {
                    throw new RuntimeException('Trigger preexistente no coincide: ' . $name);
                }
                continue;
            }
            if ($name === 'grobo_fs_fo_ad') {
                $sql = "CREATE TRIGGER {$name} AFTER DELETE ON formularioe
                        FOR EACH ROW BEGIN
                            UPDATE grobo_form_search_state SET epoch=epoch+1 WHERE id=1;
                            DELETE FROM grobo_form_search_document WHERE idformA=OLD.idformA;
                        END";
            } else {
                $sql = "CREATE TRIGGER {$name} AFTER {$rule['event']}
                        ON {$rule['table']} FOR EACH ROW
                        UPDATE grobo_form_search_state SET epoch=epoch+1 WHERE id=1";
            }
            $db->exec($sql);
        }
        if (!self::triggersReady($db)) {
            throw new RuntimeException('El índice no está protegido por todos sus triggers');
        }
    }
}
