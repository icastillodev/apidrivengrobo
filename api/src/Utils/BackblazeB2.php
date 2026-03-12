<?php
namespace App\Utils;

use Exception;

class BackblazeB2
{
    private string $keyId;
    private string $applicationKey;
    private string $bucketId;
    private string $bucketName;

    private static ?string $authToken = null;
    private static ?string $apiUrl = null;
    private static ?string $downloadUrl = null;

    public function __construct()
    {
        $this->keyId          = getenv('B2_KEY_ID') ?: '';
        $this->applicationKey = getenv('B2_APPLICATION_KEY') ?: '';
        $this->bucketId       = getenv('B2_BUCKET_ID') ?: '';
        $this->bucketName     = getenv('B2_BUCKET_NAME') ?: '';

        if ($this->keyId === '' || $this->applicationKey === '' || $this->bucketId === '' || $this->bucketName === '') {
            throw new Exception('Backblaze B2 no está configurado correctamente en el .env (faltan B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID o B2_BUCKET_NAME).');
        }

        if (!extension_loaded('curl')) {
            throw new Exception('La extensión cURL de PHP es requerida para usar Backblaze B2.');
        }
    }

    private function authorize(): void
    {
        if (self::$authToken && self::$apiUrl && self::$downloadUrl) {
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

        self::$authToken   = $data['authorizationToken'] ?? null;
        self::$apiUrl      = $data['apiUrl'] ?? null;
        self::$downloadUrl = $data['downloadUrl'] ?? null;

        if (!self::$authToken || !self::$apiUrl || !self::$downloadUrl) {
            throw new Exception('Backblaze B2 devolvió datos incompletos al autorizar la cuenta.');
        }
    }

    private function getUploadUrl(): array
    {
        $this->authorize();

        $url     = self::$apiUrl . '/b2api/v2/b2_get_upload_url';
        $payload = json_encode(['bucketId' => $this->bucketId]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . self::$authToken,
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
     * Envía el archivo al navegador leyendo desde B2 (bucket privado).
     */
    public function streamDownload(string $fileKey, string $downloadName): void
    {
        $this->authorize();

        $url = rtrim(self::$downloadUrl, '/') . '/file/' . rawurlencode($this->bucketName) . '/' . str_replace('%2F', '/', rawurlencode($fileKey));

        if (ob_get_length()) {
            ob_clean();
        }

        $safe = $this->sanitizeFileName($downloadName);
        if (!preg_match('/\.pdf$/i', $safe)) {
            $safe .= '.pdf';
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $safe . '"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . self::$authToken,
            ],
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => true,
        ]);

        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) {
            echo $data;
            return strlen($data);
        });

        curl_exec($ch);
        curl_close($ch);
        exit;
    }

    /**
     * Borra un archivo por su key/path (file_key guardado en BD).
     * Si no existe en B2, no lanza error.
     */
    public function deleteFileByKey(string $fileKey): void
    {
        $this->authorize();

        $lookupUrl = self::$apiUrl . '/b2api/v2/b2_list_file_names';
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
                'Authorization: ' . self::$authToken,
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

        $deleteUrl = self::$apiUrl . '/b2api/v2/b2_delete_file_version';
        $deletePayload = json_encode([
            'fileName' => $fileName,
            'fileId'   => $fileId,
        ]);

        $ch = curl_init($deleteUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: ' . self::$authToken,
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

