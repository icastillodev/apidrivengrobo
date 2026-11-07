<?php
declare(strict_types=1);
namespace App\Utils;

/**
 * Centraliza la clave de firma JWT. Nunca utilizar una clave conocida o de respaldo.
 * Antes de publicar este cambio, verificar la variable JWT_SECRET en producción.
 */
final class JwtSigningKey
{
    private const LEGACY_FALLBACK = 'TuClaveSuperSecretaGROBO2026';

    public static function get(): string
    {
        $candidates = [
            $_ENV['JWT_SECRET'] ?? null,
            $_SERVER['JWT_SECRET'] ?? null,
            getenv('JWT_SECRET'),
        ];
        foreach ($candidates as $candidate) {
            if (!is_string($candidate)) {
                continue;
            }
            $candidate = trim($candidate);
            if ($candidate === '') {
                continue;
            }
            if (hash_equals(self::LEGACY_FALLBACK, $candidate)) {
                throw new \RuntimeException('JWT signing key not configured securely.');
            }
            if (strlen($candidate) < 32) {
                throw new \RuntimeException('JWT signing key too short.');
            }
            return $candidate;
        }
        throw new \RuntimeException('JWT signing key missing.');
    }
}
