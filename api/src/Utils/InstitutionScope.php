<?php
declare(strict_types=1);
namespace App\Utils;

/**
 * Resuelve el ámbito institucional de una ruta API sin confiar en ?inst=.
 * Rol 1 (superadmin) puede seleccionar una institución explícitamente.
 * Otros roles solo acceden a la institución contenida en el JWT firmado.
 */
final class InstitutionScope
{
    public static function resolve(array $session, $requested = null): int
    {
        $sessionInst = filter_var($session['instId'] ?? null, FILTER_VALIDATE_INT);
        $sessionInst = ($sessionInst !== false && (int)$sessionInst > 0) ? (int)$sessionInst : 0;
        $role = (int)($session['role'] ?? 0);

        $hasRequested = $requested !== null && trim((string)$requested) !== '';
        if (!$hasRequested) {
            if ($sessionInst <= 0) {
                throw new \InvalidArgumentException('Debe seleccionar una institución válida.');
            }
            return $sessionInst;
        }

        $target = filter_var($requested, FILTER_VALIDATE_INT);
        if ($target === false || (int)$target <= 0) {
            throw new \InvalidArgumentException('Institución solicitada inválida.');
        }
        $target = (int)$target;
        if ($role !== 1 && $target !== $sessionInst) {
            throw new \DomainException('No tiene permiso para consultar otra institución.');
        }
        return $target;
    }
}
