<?php
declare(strict_types=1);

namespace App\Services\UserForms;

use App\Models\UserForms\UserFormsModel;

/**
 * Paginación de filtros personales con semántica idéntica al antiguo
 * formRowSearchText() del navegador, incluidos snapshots y participantes.
 * La fase actual filtra en PHP después de consultar datos visibles en MySQL.
 * Así nunca transfiere el historial completo al cliente, sin introducir
 * búsquedas SQL incompletas que omitirían derivaciones o atributos anidados.
 */
final class UserFormsFilterService
{
    public function __construct(private UserFormsModel $model)
    {
    }

    /** @return array{list:array,total:int,limit:int,offset:int,info_inst:mixed} */
    public function page(int $userId, int $instId, array $filters, int $limit = 12, int $offset = 0): array
    {
        if ($limit < 1 || $limit > 100 || $offset < 0) {
            throw new \InvalidArgumentException('Paginación inválida');
        }
        $filters = self::validateFilters($filters);

        // Búsqueda intencional por identificador exacto: #12345.
        // Es opt-in y jamás amplía el acceso del JWT. El resto del buscador
        // sigue buscando libremente en todos los campos y snapshots.
        if (preg_match('/^#([1-9][0-9]{0,9})$/', trim($filters['search']), $m)) {
            $data = $this->model->getAllForms($userId, $instId, ['ids' => [(int)$m[1]]]);
            $withoutSearch = $filters;
            $withoutSearch['search'] = '';
            $matched = array_values(array_filter($data['list'], static fn($form) =>
                self::matches($form, $withoutSearch)));
            return [
                'info_inst' => $data['info_inst'] ?? null,
                'list' => array_slice($matched, $offset, $limit),
                'total' => count($matched),
                'limit' => $limit,
                'offset' => $offset,
            ];
        }

        // Índice documental OPCIONAL: sólo se consulta cuando está completo,
        // los 39 triggers de invalidación existen y epoch sigue vigente.
        // Un índice inválido jamás transforma una búsqueda real en "sin datos".
        if ($filters['search'] !== '') {
            $indexed = $this->model->getIndexedTextCandidates(
                $userId, $instId, $filters['search']
            );
            if ($indexed !== null) {
                $page = $this->pageFromCandidateIds(
                    $userId, $instId, $filters, $limit, $offset, $indexed['ids']
                );
                if ($this->model->indexedTextStillFresh($indexed['stamp'])) {
                    return $page;
                }
                // Epoch cambió durante el request: volver a contrato seguro.
                $full = $this->model->getAllForms($userId, $instId);
                $matching = array_values(array_filter($full['list'] ?? [],
                    static fn($form) => self::matches($form, $filters)));
                return [
                    'info_inst'=>$full['info_inst'] ?? null,
                    'list'=>array_slice($matching,$offset,$limit),
                    'total'=>count($matching),
                    'limit'=>$limit,
                    'offset'=>$offset,
                ];
            }
        }

        $candidates = $this->model->getFilteredCandidateIds($userId, $instId, $filters);
        if ($candidates === null) {
            if ($filters['search'] === '') {
                // Para filtros masivos, sólo consultar columnas necesarias para
                // el predicado. Ni precios, ni protocolos, ni snapshots, ni
                // N filas completas: hidratar exclusivamente la página visible.
                $light = $this->model->getFilterSummaryRows(
                    $userId, $instId, $filters['inst'] !== 'all'
                );
                $idsOnPage = [];
                $total = 0;
                foreach ($light as $form) {
                    if (!self::matches($form, $filters)) continue;
                    if ($total >= $offset && count($idsOnPage) < $limit) {
                        $idsOnPage[] = (int)$form['idformA'];
                    }
                    $total++;
                }
                $detail = $this->model->getAllForms($userId, $instId, ['ids' => $idsOnPage]);
                return [
                    'info_inst' => $detail['info_inst'] ?? null,
                    'list' => $detail['list'],
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                ];
            }

            // Texto libre arbitrario: snapshots y participantes anidados
            // pueden contener la coincidencia. Sin un índice documental
            // transaccional, NO aplicar una preselección que pierda resultados.
            $full = $this->model->getAllForms($userId, $instId);
            $matching = [];
            foreach ($full['list'] ?? [] as $form) {
                if (self::matches($form, $filters)) {
                    $matching[] = $form;
                }
            }
            return [
                'info_inst' => $full['info_inst'] ?? null,
                'list' => array_slice($matching, $offset, $limit),
                'total' => count($matching),
                'limit' => $limit,
                'offset' => $offset,
            ];
        }

        return $this->pageFromCandidateIds($userId, $instId,
            $filters, $limit, $offset, $candidates);
    }

    /** @param array<int,int> $candidates */
    private function pageFromCandidateIds(int $userId, int $instId,
        array $filters, int $limit, int $offset, array $candidates): array
    {
        // Bounded: <=500 IDs, batches <=100; el WHERE se vuelve a exigir en
        // cada consulta para no dejar que un índice cambie autorización.
        $visible = [];
        $count = 0;
        $info = null;
        $chunks = array_chunk($candidates, 100);
        if ($chunks === []) $chunks = [[]];
        foreach ($chunks as $chunk) {
            $batch = $this->model->getAllForms($userId, $instId, ['ids' => $chunk]);
            $info = $info ?? ($batch['info_inst'] ?? null);
            foreach ($batch['list'] ?? [] as $form) {
                if (!self::matches($form, $filters)) continue;
                if ($count >= $offset && count($visible) < $limit) {
                    $visible[] = $form;
                }
                $count++;
            }
        }
        return [
            'info_inst' => $info,
            'list' => $visible,
            'total' => $count,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }

    /** @return array{search:string,status:string,inst:string,derivation:string,origin:string} */
    public static function validateFilters(array $source): array
    {
        $defaults = [
            'search' => '', 'status' => 'all', 'inst' => 'all',
            'derivation' => 'all', 'origin' => 'all',
        ];
        $result = [];
        foreach ($defaults as $key => $default) {
            $value = $source[$key] ?? $default;
            if (!is_string($value) || mb_strlen($value, 'UTF-8') > 160
                || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) {
                throw new \InvalidArgumentException('Filtro inválido');
            }
            $result[$key] = $value;
        }
        if (!in_array($result['derivation'], ['all','derived','local'], true)) {
            throw new \InvalidArgumentException('Filtro de derivación inválido');
        }
        return $result;
    }

    public static function matches(array $form, array $filters): bool
    {
        $term = self::lower($filters['search'] ?? '');
        if ($term !== '' && !str_contains(self::searchText($form), $term)) {
            return false;
        }

        $status = $filters['status'] ?? 'all';
        if ($status !== 'all') {
            $values = [$form['estado'] ?? null, $form['estado_origen'] ?? null,
                $form['estado_destino'] ?? null];
            // El filtro "Sin estado" sólo corresponde a formularios sin ningún
            // estado definido, no a formularios sin un estado extra de derivación.
            if ($status === 'Sin estado') {
                foreach ($values as $value) {
                    if ($value !== null && trim((string)$value) !== '') return false;
                }
            } else {
                $hasMatch = false;
                foreach ($values as $value) {
                    if ($value !== null && trim((string)$value) === $status) {
                        $hasMatch = true;
                        break;
                    }
                }
                if (!$hasMatch) return false;
            }
        }

        $institution = $filters['inst'] ?? 'all';
        if ($institution !== 'all') {
            $participants = $form['institucionesParticipantes'] ?? null;
            $names = is_array($participants) && count($participants) > 0
                ? array_map(static fn($p) => $p['NombreInst'] ?? null, $participants)
                : array_values(array_filter([$form['NombreInstitucion'] ?? null]));
            if (!in_array($institution, $names, true)) {
                return false;
            }
        }

        $derived = (float)($form['DerivadoActivo'] ?? 0) === 1.0;
        $derivation = $filters['derivation'] ?? 'all';
        if (($derivation === 'derived' && !$derived)
            || ($derivation === 'local' && $derived)) {
            return false;
        }

        $origin = $filters['origin'] ?? 'all';
        if ($origin !== 'all' && ($form['NombreInstitucionOrigen'] ?? '') !== $origin) {
            return false;
        }
        return true;
    }

    public static function searchText(array $form): string
    {
        $parts = [];
        self::flatten($form, $parts);
        return self::lower(implode(' ', $parts));
    }

    private static function flatten($value, array &$parts): void
    {
        if ($value === null || $value === '') {
            return;
        }
        if (is_array($value)) {
            foreach ($value as $nested) {
                self::flatten($nested, $parts);
            }
            return;
        }
        if (is_bool($value)) {
            $parts[] = $value ? 'true' : 'false';
        } elseif (is_scalar($value)) {
            $parts[] = (string)$value;
        }
    }

    private static function normalStatus($value): string
    {
        return $value === null || trim((string)$value) === ''
            ? 'Sin estado' : trim((string)$value);
    }

    private static function lower(string $value): string
    {
        return mb_strtolower($value, 'UTF-8');
    }
}
