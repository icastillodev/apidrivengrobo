<?php
declare(strict_types=1);

namespace App\Services\UserForms;

use App\Models\UserForms\UserFormsModel;
use App\Models\UserForms\UserFormsSearchIndexStore;
use App\Models\UserForms\UserFormsSearchIndexSchema;
use RuntimeException;

/**
 * Backfill on-demand fuera del flujo web. No retiene locks de tablas origen;
 * el epoch del trigger impide publicar una generación inconsistente.
 */
final class UserFormsSearchIndexBuilder
{
    public function __construct(
        private UserFormsModel $model,
        private UserFormsSearchIndexStore $store
    ) {}

    /** @return array{generation:string,epoch:int,documents:int,old_documents_purged:int,elapsed_ms:float} */
    public function rebuild(): array
    {
        $started = hrtime(true);
        // GET_LOCK por base impide que un cron y una reconstrucción manual
        // generen simultáneamente copias de datos personales.
        $this->store->acquireRebuildLock();
        $generation = null;
        $published = false;
        try {
            $firstEpoch = $this->store->epoch();
            $generation = bin2hex(random_bytes(16));
            $seenIds = [];
            $pending = [];
            foreach ($this->store->owners() as $userId) {
                $offset = 0;
                do {
                    $page = $this->model->getAllForms($userId, 0, [
                        'limit'=>100,'offset'=>$offset,
                    ]);
                    foreach ($page['list'] ?? [] as $form) {
                        $id = (int)($form['idformA'] ?? 0);
                        if ($id < 1) throw new RuntimeException('Formulario canónico inválido');
                        if (isset($seenIds[$id])) continue;
                        $seenIds[$id] = true;
                        $pending[$id] = UserFormsFilterService::searchText($form);
                        if (count($pending) >= 100) {
                            $this->store->writeDocumentsBatch($generation, $pending);
                            $pending = [];
                        }
                    }
                    $offset += 100;
                    $total = (int)($page['total'] ?? 0);
                } while ($offset < $total);
            }
            if ($pending !== []) {
                $this->store->writeDocumentsBatch($generation, $pending);
            }
            // Una escritura concurrente obliga a cancelar la publicación.
            $total = $this->store->publish($generation, $firstEpoch);
            $published = true;
            $oldPurged = $this->store->purgeOldGenerations();
            return [
                'generation'=>$generation, 'epoch'=>$firstEpoch,
                'documents'=>$total,
                'old_documents_purged'=>$oldPurged,
                'elapsed_ms'=>round((hrtime(true)-$started)/1000000, 2),
            ];
        } catch (\Throwable $e) {
            if ($generation !== null && !$published) {
                try {
                    $this->store->discardUnpublishedGeneration($generation);
                } catch (\Throwable $cleanupError) {
                    error_log('GROBO search index cleanup failed: '
                        . get_class($cleanupError));
                }
            }
            throw $e;
        } finally {
            $this->store->releaseRebuildLock();
        }
    }
}
