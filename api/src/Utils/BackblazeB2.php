<?php
namespace App\Utils;

use Exception;

/**
 * Cliente B2 por perfil: variables `B2_*_{PERFIL}` en mayúsculas, ej. `B2_KEY_ID_PROTOCOLOS`.
 * Perfil por defecto: PROTOCOLOS (adjuntos de protocolos / solicitudes).
 */
class BackblazeB2
{
    private string $profile;

    private string $keyId;
    private string $applicationKey;
    private string $bucketId;
    private string $bucketName;

    /** Auth por instancia (cada perfil puede usar Application Key distinta). */
    private ?string $authToken = null;
    private ?string $apiUrl = null;
    private ?string $downloadUrl = null;

    /**
     * @param string $profile Sufijo de variables en .env: PROTOCOLOS, MENSAJES, NOTICIASPOPUP, POES, etc.
     */
    public function __construct(string $profile = 'PROTOCOLOS')
    {
        $this->profile = strtoupper(preg_replace('/[^A-Za-z0-9_]/', '', $profile)) ?: 'PROTOCOLOS';

        $this->keyId = $this->readEnv('B2_KEY_ID');
        $this->applicationKey = $this->readEnv('B2_APPLICATION_KEY');
        $this->bucketId = $this->readEnv('B2_BUCKET_ID');
        $this->bucketName = $this->readEnv('B2_BUCKET_NAME');

        if ($this->keyId === '' || $this->applicationKey === '' || $this->bucketId === '' || $this->bucketName === '') {
            throw new Exception(
                'Backblaze B2 no está configurado para el perfil "' . $this->profile . '". '
                . 'Definí en .env: B2_KEY_ID_' . $this->profile . ', B2_APPLICATION_KEY_' . $this->profile . ', '
                . 'B2_BUCKET_ID_' . $this->profile . ', B2_BUCKET_NAME_' . $this->profile
                . ($this->profile === 'PROTOCOLOS' ? ' (Migración: también valen B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, B2_BUCKET_NAME sin sufijo).' : '')
            );
        }

        if (!extension_loaded('curl')) {
            throw new Exception('La extensión cURL de PHP es requerida para usar Backblaze B2.');
        }
    }

    /**
     * Lee B2_{$base}_{PROFILE}; para PROTOCOLOS admite fallback a variables sin sufijo (migración).
     */
    private function readEnv(string $base): string
    {
        $key = $base . '_' . $this->profile;
        if (array_key_exists($key, $_ENV) && (string) $_ENV[$key] !== '') {
            return (string) $_ENV[$key];
        }
        $v = getenv($key);
        if ($v !== false && $v !== '') {
            return (string) $v;
        }
        if ($this->profile === 'PROTOCOLOS') {
            if (array_key_exists($base, $_ENV) && (string) $_ENV[$base] !== '') {
                return (string) $_ENV[$base];
            }
            $legacy = getenv($base);
            if ($legacy !== false && $legacy !== '') {
                return (string) $legacy;
            }
        }

        return '';
    }

    private function authorize(): void
    {
        if ($this->authToken && $this->apiUrl && $this->downloadUrl) {
            return;
        }

        $ch = curl_init('https://api.backblazeb2.com/b2api/v2/b2_authorize_account');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Basic ' . base64_encode($this->keyId . ':' . $this->applicationKey),
            ],
        ]);

        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new Exception('Error de conexión con Backblaze B2 (authorize): ' . $err);
        }
        curl_close($ch);

        $data = json_decode($res, true);
        if ($code !== 200 || !is_array($data)) {
            throw new Exception('Respuesta inválida de Backblaze B2 (authorize): ' . $res);
        }

        $this->authToken   = $data['authorizationToken'] ?? null;
        $this->apiUrl      = $data['apiUrl'] ?? null;
        $this->downloadUrl = $data['downloadUrl'] ?? null;

        if (!$this->authToken || !$this->apiUrl || !$this->downloadUrl) {
            throw new Exception('Backblaze B2 devolvió datos incompletos al autorizar la cuenta.');
        }
    }

    private function getUploadUrl(): array
    {
        $this->authorize();

        $url     = $this->apiUrl . '/b2api/v2/b2_get_upload_url';
        $payload = json_encode(['bucketId' => $this->bucketId]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . $this->authToken,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS     => $payload,
        ]);

        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new Exception('Error de conexión con Backblaze B2 (get_upload_url): ' . $err);
        }
        curl_close($ch);

        $data = json_decode($res, true);
        if ($code !== 200 || !is_array($data) || empty($data['uploadUrl']) || empty($data['authorizationToken'])) {
            throw new Exception('Respuesta inválida de Backblaze B2 (get_upload_url): ' . $res);
        }

        return [
            'uploadUrl'   => $data['uploadUrl'],
            'uploadToken' => $data['authorizationToken'],
        ];
    }

    /**
     * Sube un archivo desde un path local al bucket configurado.
     */
    public function uploadFile(string $localPath, string $fileKey, string $contentType = 'application/octet-stream'): void
    {
        if (!is_readable($localPath)) {
            throw new Exception('No se puede leer el archivo temporal para subir a B2.');
        }

        $info = $this->getUploadUrl();

        $fileContents = file_get_contents($localPath);
        if ($fileContents === false) {
            throw new Exception('No se pudo leer el contenido del archivo para subir a B2.');
        }

        $sha1 = sha1($fileContents);

        $fileNameHeader = str_replace('%2F', '/', rawurlencode($fileKey));

        $ch = curl_init($info['uploadUrl']);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . $info['uploadToken'],
                'X-Bz-File-Name: ' . $fileNameHeader,
                'Content-Type: ' . $contentType,
                'X-Bz-Content-Sha1: ' . $sha1,
            ],
            CURLOPT_POSTFIELDS     => $fileContents,
        ]);

        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new Exception('Error de conexión con Backblaze B2 (upload_file): ' . $err);
        }
        curl_close($ch);

        $data = json_decode($res, true);
        if ($code !== 200 || !is_array($data) || !empty($data['code'])) {
            throw new Exception('Error al subir archivo a Backblaze B2: ' . $res);
        }
    }

    /**
     * Adjuntos manuales de protocolos (histórico): fuerza PDF en cabeceras.
     */
    public function streamDownload(string $fileKey, string $downloadName): void
    {
        $this->streamDownloadAttachment($fileKey, $downloadName, 'application/pdf', false);
    }

    /**
     * Descarga genérica (imagen, Office, PDF) desde B2.
     *
     * @param bool $inline Si true, Content-Disposition inline (p. ej. imágenes en portada).
     */
    public function streamDownloadAttachment(
        string $fileKey,
        string $downloadName,
        string $mime = 'application/octet-stream',
        bool $inline = false
    ): void {
        $this->authorize();

        $url = rtrim($this->downloadUrl, '/') . '/file/' . rawurlencode($this->bucketName) . '/' . str_replace('%2F', '/', rawurlencode($fileKey));

        if (ob_get_length()) {
            ob_clean();
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $this->authToken,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_TIMEOUT        => 120,
        ]);

        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        if ($body === false || $cerr !== '') {
            throw new Exception('Error de conexión con Backblaze B2 (download): ' . ($cerr !== '' ? $cerr : 'curl_exec falló'));
        }
        if ($code !== 200) {
            $snippet = is_string($body) ? substr($body, 0, 400) : '';
            $hint = '';
            if ($code === 404 && $snippet !== ''
                && (stripos($snippet, 'not_found') !== false || stripos($snippet, 'does not exist') !== false)) {
                $hint = ' Compruebe en .env B2_BUCKET_NAME_' . $this->profile
                    . ' (nombre exacto del bucket en Backblaze; debe corresponder al mismo bucket que B2_BUCKET_ID_'
                    . $this->profile . ' y a la Application Key usada).';
            }

            throw new Exception('Backblaze B2 download HTTP ' . $code . ($snippet !== '' ? ': ' . $snippet : '') . $hint);
        }
        if ($body === '' || $body === null) {
            throw new Exception('Backblaze B2 devolvió un archivo vacío.');
        }

        if (function_exists('header_remove')) {
            header_remove('Content-Type');
        }

        $safe = $this->sanitizeFileName($downloadName);
        $disp = $inline ? 'inline' : 'attachment';

        header('Content-Description: File Transfer');
        header('Content-Type: ' . $mime);
        header('Content-Disposition: ' . $disp . '; filename="' . $safe . '"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Content-Length: ' . (string) strlen($body));

        echo $body;
        exit;
    }

    /**
     * Borra un archivo por su key/path (file_key guardado en BD).
     * Si no existe en B2, no lanza error.
     */
    public function deleteFileByKey(string $fileKey): void
    {
        $this->authorize();

        $lookupUrl = $this->apiUrl . '/b2api/v2/b2_list_file_names';
        $lookupPayload = json_encode([
            'bucketId'      => $this->bucketId,
            'prefix'        => $fileKey,
            'maxFileCount'  => 1,
        ]);

        $ch = curl_init($lookupUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . $this->authToken,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS     => $lookupPayload,
        ]);

        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new Exception('Error de conexión con Backblaze B2 (list_file_names): ' . $err);
        }
        curl_close($ch);

        $data = json_decode($res, true);
        if ($code !== 200 || !is_array($data)) {
            throw new Exception('Respuesta inválida de Backblaze B2 (list_file_names): ' . $res);
        }

        $files = $data['files'] ?? [];
        if (empty($files) || !is_array($files)) {
            return;
        }

        $target = null;
        foreach ($files as $f) {
            if (($f['fileName'] ?? '') === $fileKey) {
                $target = $f;
                break;
            }
        }
        if ($target === null) {
            return;
        }

        $fileName = $target['fileName'] ?? '';
        $fileId   = $target['fileId'] ?? '';
        if ($fileName === '' || $fileId === '') {
            return;
        }

        $deleteUrl = $this->apiUrl . '/b2api/v2/b2_delete_file_version';
        $deletePayload = json_encode([
            'fileName' => $fileName,
            'fileId'   => $fileId,
        ]);

        $ch = curl_init($deleteUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . $this->authToken,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS     => $deletePayload,
        ]);

        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new Exception('Error de conexión con Backblaze B2 (delete_file_version): ' . $err);
        }
        curl_close($ch);

        $data = json_decode($res, true);
        if ($code !== 200) {
            $apiCode = is_array($data) ? ($data['code'] ?? '') : '';
            if ($apiCode === 'file_not_present' || $apiCode === 'no_such_file') {
                return;
            }
            throw new Exception('Error al borrar archivo en Backblaze B2: ' . $res);
        }
    }

    private function sanitizeFileName(string $name): string
    {
        $name = preg_replace('/[^\w\.\-]+/u', '_', $name);
        return $name ?: 'file';
    }
}
