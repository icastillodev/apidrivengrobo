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
        $full = $this->model->getAllForms($userId, $instId);
        $matching = [];
        foreach ($full['list'] ?? [] as $form) {
            if (self::matches($form, $filters)) {
                $matching[] = $form;
            }
        }
        $total = count($matching);
        return [
            'info_inst' => $full['info_inst'] ?? null,
            'list' => array_slice($matching, $offset, $limit),
            'total' => $total,
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
