<?php
namespace App\Utils;

use PDO;

/**
 * Tope de SMTP/Resend: por destinatario, por IP y global.
 * Si existe `mail_rate_event` usa BD; si no, archivo con flock (hasta aplicar la migración).
 */
class MailRateLimiter
{
    /** @var PDO|null|false false = aún no intentado */
    private static $db = false;

    /** @var bool|null */
    private static $tableOk = null;

    public static function clientIp(): string
    {
        // No confiar en cabeceras CF-Connecting-IP / X-Forwarded-For directamente:
        // un cliente puede falsificarlas y evadir los límites de correo.
        // Si hay proxy, configurar real_ip en Nginx con sus CIDR confiables;
        // PHP recibirá entonces la IP validada en REMOTE_ADDR.
        $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }

    public static function envInt(string $key, int $default): int
    {
        $v = getenv($key);
        if ($v === false || $v === '' || !is_numeric($v)) {
            return $default;
        }

        return max(0, (int) $v);
    }

    /**
     * ¿Se puede disparar un SMTP ahora?
     */
    public static function allowSend(string $origen, ?string $toEmail = null, ?string $ip = null): bool
    {
        $ip = $ip !== null && $ip !== '' ? $ip : self::clientIp();
        $to = $toEmail !== null ? strtolower(trim($toEmail)) : '';

        $limits = [
            ['bucket' => 'g', 'window' => 60, 'max' => self::envInt('MAIL_RATE_GLOBAL_PER_MIN', 40)],
            ['bucket' => 'gh', 'window' => 3600, 'max' => self::envInt('MAIL_RATE_GLOBAL_PER_HOUR', 180)],
            ['bucket' => 'ip:' . hash('sha256', $ip), 'window' => 600, 'max' => self::envInt('MAIL_RATE_IP_PER_10MIN', 10)],
            ['bucket' => 'iph:' . hash('sha256', $ip), 'window' => 3600, 'max' => self::envInt('MAIL_RATE_IP_PER_HOUR', 40)],
        ];
        if ($to !== '') {
            $h = hash('sha256', $to);
            $limits[] = ['bucket' => 'to:' . $h, 'window' => 600, 'max' => self::envInt('MAIL_RATE_TO_PER_10MIN', 3)];
            $limits[] = ['bucket' => 'toh:' . $h, 'window' => 3600, 'max' => self::envInt('MAIL_RATE_TO_PER_HOUR', 8)];
        }

        return self::consume($limits, $origen);
    }

    /**
     * Tope de un endpoint público (recuperar clave, registro) antes de tocar SMTP.
     */
    public static function allowEndpoint(string $endpoint, int $maxPer10Min, int $maxPerHour): bool
    {
        $h = hash('sha256', self::clientIp());
        $ep = preg_replace('/[^a-z0-9_\-]/i', '', $endpoint) ?: 'ep';
        $limits = [
            ['bucket' => 'ep:' . $ep . ':' . $h, 'window' => 600, 'max' => $maxPer10Min],
            ['bucket' => 'eph:' . $ep . ':' . $h, 'window' => 3600, 'max' => $maxPerHour],
        ];

        return self::consume($limits, $ep);
    }

    /**
     * @param array<int, array{bucket:string,window:int,max:int}> $limits
     */
    private static function consume(array $limits, string $origen): bool
    {
        $db = self::dbIfReady();
        foreach ($limits as $lim) {
            if ((int) $lim['max'] <= 0) {
                continue;
            }
            $n = $db
                ? self::countDb($db, $lim['bucket'], (int) $lim['window'])
                : self::countFile($lim['bucket'], (int) $lim['window']);
            if ($n >= (int) $lim['max']) {
                error_log('MailRateLimiter: bloqueado origen=' . $origen . ' bucket=' . $lim['bucket'] . ' n=' . $n);
                return false;
            }
        }
        if ($db) {
            self::insertDb($db, $limits, $origen);
            self::maybePurgeDb($db);
        } else {
            self::insertFile($limits);
        }

        return true;
    }

    private static function dbIfReady(): ?PDO
    {
        if (self::$tableOk === false) {
            return null;
        }
        if (self::$db instanceof PDO && self::$tableOk === true) {
            return self::$db;
        }
        try {
            if (!class_exists('Database', false)) {
                $path = dirname(__DIR__, 2) . '/config/database.php';
                if (is_file($path)) {
                    require_once $path;
                }
            }
            if (!class_exists('Database')) {
                self::$tableOk = false;
                return null;
            }
            $pdo = (new \Database())->getConnection();
            $pdo->query('SELECT 1 FROM mail_rate_event LIMIT 1');
            self::$db = $pdo;
            self::$tableOk = true;

            return $pdo;
        } catch (\Throwable $e) {
            self::$db = null;
            self::$tableOk = false;

            return null;
        }
    }

    private static function countDb(PDO $db, string $bucket, int $windowSec): int
    {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM mail_rate_event WHERE bucket = ? AND fecha_hora >= DATE_SUB(NOW(), INTERVAL ? SECOND)'
        );
        $stmt->execute([$bucket, $windowSec]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<int, array{bucket:string,window:int,max:int}> $limits
     */
    private static function insertDb(PDO $db, array $limits, string $origen): void
    {
        $stmt = $db->prepare(
            'INSERT INTO mail_rate_event (bucket, origen, fecha_hora) VALUES (?, ?, NOW())'
        );
        $seen = [];
        foreach ($limits as $lim) {
            $b = (string) $lim['bucket'];
            if ($b === '' || isset($seen[$b])) {
                continue;
            }
            $seen[$b] = true;
            $stmt->execute([$b, substr($origen, 0, 40)]);
        }
    }

    private static function maybePurgeDb(PDO $db): void
    {
        if (random_int(1, 40) !== 1) {
            return;
        }
        try {
            $db->exec('DELETE FROM mail_rate_event WHERE fecha_hora < DATE_SUB(NOW(), INTERVAL 2 DAY)');
        } catch (\Throwable $e) {
            // no tumbar el envío
        }
    }

    private static function filePath(): string
    {
        return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'grobo_mail_rate.json';
    }

    private static function countFile(string $bucket, int $windowSec): int
    {
        $data = self::readFile();
        $now = time();
        $cut = $now - $windowSec;
        $arr = $data[$bucket] ?? [];
        $n = 0;
        foreach ($arr as $ts) {
            if ((int) $ts >= $cut) {
                $n++;
            }
        }

        return $n;
    }

    /**
     * @param array<int, array{bucket:string,window:int,max:int}> $limits
     */
    private static function insertFile(array $limits): void
    {
        $path = self::filePath();
        $fh = fopen($path, 'c+');
        if ($fh === false) {
            return;
        }
        try {
            if (!flock($fh, LOCK_EX)) {
                return;
            }
            $raw = stream_get_contents($fh);
            $data = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
            if (!is_array($data)) {
                $data = [];
            }
            $now = time();
            $cut = $now - 7200;
            foreach ($limits as $lim) {
                $b = (string) $lim['bucket'];
                if ($b === '') {
                    continue;
                }
                $arr = isset($data[$b]) && is_array($data[$b]) ? $data[$b] : [];
                $arr = array_values(array_filter($arr, static fn ($ts) => (int) $ts >= $cut));
                $arr[] = $now;
                $data[$b] = $arr;
            }
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data));
            fflush($fh);
            flock($fh, LOCK_UN);
        } finally {
            fclose($fh);
        }
    }

    private static function readFile(): array
    {
        $path = self::filePath();
        if (!is_file($path)) {
            return [];
        }
        $raw = @file_get_contents($path);
        $data = is_string($raw) ? json_decode($raw, true) : [];

        return is_array($data) ? $data : [];
    }
}
