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

    /** @return array{generation:string,epoch:int,documents:int,elapsed_ms:float} */
    public function rebuild(): array
    {
        $started = hrtime(true);
        // El script de mantenimiento verifica el manifiesto entero.
        $firstEpoch = $this->store->epoch();
        $generation = bin2hex(random_bytes(16));
        $seenIds = [];
        foreach ($this->store->owners() as $userId) {
            $offset = 0;
            do {
                $page = $this->model->getAllForms($userId, 0, [
                    'limit'=>100,'offset'=>$offset,
                ]);
                $list = $page['list'] ?? [];
                foreach ($list as $form) {
                    $id = (int)($form['idformA'] ?? 0);
                    if ($id < 1) throw new RuntimeException('Formulario canónico inválido');
                    if (isset($seenIds[$id])) continue;
                    $seenIds[$id] = true;
                    $this->store->writeDocument($generation, $id,
                        UserFormsFilterService::searchText($form));
                }
                $offset += 100;
                $total = (int)($page['total'] ?? 0);
            } while ($offset < $total);
        }
        // Una escritura concurrente en cualquier tabla fuente obliga a
        // cancelar la publicación y repetir el backfill cuando sea oportuno.
        $total = $this->store->publish($generation, $firstEpoch);
        // Una generación vieja puede contener nombres, contactos y precios
        // ya corregidos. Limpiarla después de activar la nueva, manteniendo
        // la verificación de generación en cada lectura concurrente.
        $oldPurged = $this->store->purgeOldGenerations();
        return [
            'generation'=>$generation, 'epoch'=>$firstEpoch,
            'documents'=>$total,
            'old_documents_purged'=>$oldPurged,
            'elapsed_ms'=>round((hrtime(true)-$started)/1000000, 2),
        ];
    }
}
