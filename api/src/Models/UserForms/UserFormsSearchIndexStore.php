<?php
declare(strict_types=1);

namespace App\Models\UserForms;

use PDO;
use RuntimeException;

/**
 * Persistencia del índice opcional. No ejecuta DDL ni modifica formularios.
 * Los cambios en fuentes disparan grobo_fs_* y elevan epoch.
 */
final class UserFormsSearchIndexStore
{
    public function __construct(private PDO $db) {}

    /**
     * El lock es por conexión y por base. Impide dos backfills simultáneos
     * (incluidos workers externos) sin bloquear lecturas ni escrituras normales.
     */
    private bool $rebuildLockHeld = false;

    public function acquireRebuildLock(): void
    {
        if ($this->rebuildLockHeld) {
            throw new RuntimeException('La conexión ya tiene un backfill en curso');
        }
        $nameExpr = "CONCAT('grobo_fs_', SUBSTRING(SHA2(DATABASE(),256),1,32))";
        $acquired = $this->db->query("SELECT GET_LOCK({$nameExpr}, 0)")->fetchColumn();
        if ((int)$acquired !== 1) {
            throw new RuntimeException('Ya hay una reconstrucción del índice en curso');
        }
        $this->rebuildLockHeld = true;
    }

    public function releaseRebuildLock(): void
    {
        if (!$this->rebuildLockHeld) return;
        $this->rebuildLockHeld = false;
        $nameExpr = "CONCAT('grobo_fs_', SUBSTRING(SHA2(DATABASE(),256),1,32))";
        $this->db->query("SELECT RELEASE_LOCK({$nameExpr})")->fetchColumn();
    }

    /**
     * @param array<int,string> $documents idformA => texto ya normalizado
     * Un statement preparado por hasta 100 fichas reduce round trips.
     */
    public function writeDocumentsBatch(string $generation, array $documents): void
    {
        if (!preg_match('/^[a-f0-9]{32}$/D', $generation)
            || count($documents) > 100) {
            throw new RuntimeException('Generación o lote inválido');
        }
        if ($documents === []) return;
        $values = [];
        $params = [];
        foreach ($documents as $formId => $text) {
            if (!is_int($formId) || $formId < 1 || !is_string($text)) {
                throw new RuntimeException('Documento de índice inválido');
            }
            $values[] = '(?,?,?)';
            array_push($params,$generation,$formId,$text);
        }
        $sql = 'INSERT INTO grobo_form_search_document
                (generation,idformA,text_flat) VALUES '
                . implode(',', $values)
                . ' ON DUPLICATE KEY UPDATE text_flat=VALUES(text_flat)';
        $this->db->prepare($sql)->execute($params);
    }

    /** Elimina sólo la generación fallida y nunca la publicada. */
    public function discardUnpublishedGeneration(string $generation): int
    {
        if (!preg_match('/^[a-f0-9]{32}$/D', $generation)) {
            throw new RuntimeException('Generación inválida');
        }
        $stmt = $this->db->prepare(
            'DELETE FROM grobo_form_search_document
             WHERE generation=?
               AND NOT EXISTS (
                 SELECT 1 FROM grobo_form_search_state
                 WHERE id=1 AND published_generation=?
               )'
        );
        $stmt->execute([$generation,$generation]);
        return $stmt->rowCount();
    }

    /** @return list<int> */
    public function owners(): array
    {
        $stmt = $this->db->query("SELECT DISTINCT IdUsrA FROM formularioe ORDER BY IdUsrA");
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function epoch(): int
    {
        $value = $this->db->query('SELECT epoch FROM grobo_form_search_state WHERE id=1')->fetchColumn();
        if ($value === false) throw new RuntimeException('Índice de búsqueda no instalado');
        return (int)$value;
    }

    public function writeDocument(string $generation, int $idformA, string $text): void
    {
        if (!preg_match('/^[a-f0-9]{32}$/D', $generation) || $idformA < 1) {
            throw new RuntimeException('Generación o formulario inválido');
        }
        $sql = "INSERT INTO grobo_form_search_document
                (generation,idformA,text_flat) VALUES (?,?,?)
                ON DUPLICATE KEY UPDATE text_flat=VALUES(text_flat)";
        $this->db->prepare($sql)->execute([$generation,$idformA,$text]);
    }

    /**
     * Activación atómica. Bloquea sólo la fila de versión al publicar;
     * ninguna búsqueda utiliza una generación a medio construir.
     */
    public function publish(string $generation, int $startingEpoch): int
    {
        $this->db->beginTransaction();
        try {
            $locked = $this->db->query("SELECT epoch FROM grobo_form_search_state WHERE id=1 FOR UPDATE")->fetchColumn();
            if ($locked === false || (int)$locked !== $startingEpoch) {
                throw new RuntimeException('Fuentes cambiaron durante la indexación; no publicar');
            }
            $countStmt = $this->db->prepare(
                "SELECT COUNT(*) FROM grobo_form_search_document WHERE generation=?"
            );
            $countStmt->execute([$generation]);
            $actual = (int)$countStmt->fetchColumn();

            // La lista canónica equivale a la selección de getAllForms
            // para propietarios, con todas las instituciones existentes.
            $sqlBase = "FROM formularioe f
                        INNER JOIN institucion i ON i.IdInstitucion=f.IdInstitucion
                        WHERE NOT EXISTS(
                            SELECT 1 FROM formulario_derivacion fd
                            WHERE fd.idformA=f.idformA
                              AND fd.idformAOrigen IS NOT NULL
                              AND fd.idformAOrigen<>fd.idformA
                        )";
            $expected = (int)$this->db->query("SELECT COUNT(*) {$sqlBase}")->fetchColumn();
            if ($actual !== $expected) {
                throw new RuntimeException("Indexación incompleta: {$actual} de {$expected} fichas");
            }

            $missing = $this->db->prepare(
                "SELECT COUNT(*) {$sqlBase}
                 AND NOT EXISTS(
                     SELECT 1 FROM grobo_form_search_document d
                     WHERE d.generation=? AND d.idformA=f.idformA
                 )"
            );
            $missing->execute([$generation]);
            if ((int)$missing->fetchColumn() !== 0) {
                throw new RuntimeException('Índice incompleto: falta una ficha canónica');
            }
            $up = $this->db->prepare(
                "UPDATE grobo_form_search_state
                 SET published_epoch=?, published_generation=?, published_count=?, published_at=NOW()
                 WHERE id=1"
            );
            $up->execute([$startingEpoch,$generation,$expected]);
            $this->db->commit();
            return $expected;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * @return ?array{epoch:int,generation:string}
     * Sólo una generación completa, protegida por los 39 triggers, es válida.
     */
    public function readable(): ?array
    {
        $row = $this->db->query("SELECT epoch, published_epoch, published_generation
                                 FROM grobo_form_search_state WHERE id=1")->fetch(PDO::FETCH_ASSOC);
        if (!$row || !$row['published_generation']
            || $row['published_epoch'] === null
            || (int)$row['epoch'] !== (int)$row['published_epoch']) {
            return null;
        }
        if (!UserFormsSearchIndexSchema::triggersReady($this->db)) return null;
        return ['epoch'=>(int)$row['epoch'],'generation'=>(string)$row['published_generation']];
    }

    public function stillReadable(array $snapshot): bool
    {
        $row = $this->db->query("SELECT epoch,published_epoch,published_generation
                                 FROM grobo_form_search_state WHERE id=1")->fetch(PDO::FETCH_ASSOC);
        return $row && (int)$row['epoch'] === $snapshot['epoch']
            && (int)$row['published_epoch'] === $snapshot['epoch']
            && $row['published_generation'] === $snapshot['generation'];
    }

    /**
     * Limpia generaciones anteriores en transacciones pequeñas, sin un DELETE
     * enorme que monopolice la tabla durante mantenimientos largos.
     * La reconstrucción invoca esto bajo GET_LOCK; el modo CLI purge debe
     * usar el mismo lock para no borrar una generación en preparación.
     */
    public function purgeOldGenerations(): int
    {
        $active = $this->db->query(
            'SELECT published_generation FROM grobo_form_search_state WHERE id=1'
        )->fetchColumn();
        if (!$active) return 0;

        $total = 0;
        $stmt = $this->db->prepare(
            'DELETE FROM grobo_form_search_document
             WHERE generation<>? LIMIT 500'
        );
        do {
            $stmt->execute([$active]);
            $changed = $stmt->rowCount();
            $total += $changed;
        } while ($changed === 500);
        return $total;
    }
}
