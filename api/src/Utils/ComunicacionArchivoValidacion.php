<?php
namespace App\Utils;

/**
 * Validación de tipo/tamaño para adjuntos de comunicación (B2).
 * Combina extensión declarada, MIME detectado y firma mágica (no fiarse solo del nombre).
 */
class ComunicacionArchivoValidacion
{
    private const MAX_MENSAJE = 51200;
    private const MAX_NOTICIA_DOC = 1048576;
    private const MAX_NOTICIA_IMAGEN = 1048576;
    private const MAX_POE = 52428800;

    /** @return array{ext:string, mime:string, nombreSeguro:string} */
    public static function validarMensajeAdjunto(string $tmpPath, string $originalName): array
    {
        return self::validarArchivo(
            $tmpPath,
            $originalName,
            self::MAX_MENSAJE,
            ['jpg', 'jpeg', 'pdf'],
            ['image/jpeg', 'application/pdf'],
            'mensaje'
        );
    }

    /** @return array{ext:string, mime:string, nombreSeguro:string} */
    public static function validarNoticiaImagenPortada(string $tmpPath, string $originalName): array
    {
        return self::validarArchivo(
            $tmpPath,
            $originalName,
            self::MAX_NOTICIA_IMAGEN,
            ['jpg', 'jpeg'],
            ['image/jpeg'],
            'imagen_noticia'
        );
    }

    /** @return array{ext:string, mime:string, nombreSeguro:string} */
    public static function validarNoticiaDocumento(string $tmpPath, string $originalName): array
    {
        return self::validarArchivo(
            $tmpPath,
            $originalName,
            self::MAX_NOTICIA_DOC,
            ['pdf', 'xlsx', 'xls', 'docx', 'doc'],
            [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/CDFV2-corrupt',
                'application/x-ole-storage',
            ],
            'doc_noticia'
        );
    }

    /** Portada/popup: misma regla que documentos de noticia (1 MB). */
    public static function validarPortadaPopupDocumento(string $tmpPath, string $originalName): array
    {
        return self::validarNoticiaDocumento($tmpPath, $originalName);
    }

    public static function validarPortadaPopupImagen(string $tmpPath, string $originalName): array
    {
        return self::validarNoticiaImagenPortada($tmpPath, $originalName);
    }

    /** @return array{ext:string, mime:string, nombreSeguro:string} */
    public static function validarPoeInstructivo(string $tmpPath, string $originalName): array
    {
        return self::validarArchivo(
            $tmpPath,
            $originalName,
            self::MAX_POE,
            ['pdf', 'xlsx', 'xls', 'docx', 'doc'],
            [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/CDFV2-corrupt',
                'application/x-ole-storage',
            ],
            'poe'
        );
    }

    /**
     * @param list<string> $extPermitidas
     * @param list<string> $mimePermitidos subset (se amplía con variantes zip/office)
     *
     * @return array{ext:string, mime:string, nombreSeguro:string}
     */
    private static function validarArchivo(
        string $tmpPath,
        string $originalName,
        int $maxBytes,
        array $extPermitidas,
        array $mimePermitidos,
        string $contexto
    ): array {
        if ($tmpPath === '' || !is_readable($tmpPath)) {
            throw new \InvalidArgumentException('Archivo temporal no legible.');
        }
        $size = filesize($tmpPath);
        if ($size === false || $size <= 0) {
            throw new \InvalidArgumentException('Archivo vacío o no válido.');
        }
        if ($size > $maxBytes) {
            throw new \InvalidArgumentException(self::msgTamano($maxBytes, $contexto));
        }

        $base = basename((string) $originalName);
        $dot = strrpos($base, '.');
        $extDeclarada = $dot !== false ? strtolower(substr($base, $dot + 1)) : '';
        if ($extDeclarada === '' || !in_array($extDeclarada, $extPermitidas, true)) {
            throw new \InvalidArgumentException('Tipo de archivo no permitido (extensión).');
        }

        $mime = self::mimeDetectado($tmpPath);
        $mimeNorm = self::normalizarMime($mime, $extDeclarada);

        if (!self::mimeCompatibleContexto($mimeNorm, $extDeclarada, $contexto)) {
            throw new \InvalidArgumentException('El contenido del archivo no coincide con la extensión indicada.');
        }

        if (!self::firmaMagicaOk($tmpPath, $extDeclarada)) {
            throw new \InvalidArgumentException('El archivo no coincide con el formato declarado.');
        }

        $nombreSeguro = self::sanitizeNombreArchivo($base, $extDeclarada);

        return ['ext' => $extDeclarada, 'mime' => self::mimeParaRespuesta($extDeclarada, $mimeNorm), 'nombreSeguro' => $nombreSeguro];
    }

    private static function msgTamano(int $maxBytes, string $contexto): string
    {
        if ($contexto === 'mensaje') {
            return 'El adjunto no puede superar 50 KB.';
        }
        if ($contexto === 'imagen_noticia' || $contexto === 'doc_noticia') {
            return 'El archivo no puede superar 1 MB.';
        }
        if ($contexto === 'poe') {
            return 'El archivo no puede superar 50 MB.';
        }

        return 'El archivo supera el tamaño máximo permitido.';
    }

    private static function mimeDetectado(string $path): string
    {
        if (function_exists('mime_content_type')) {
            $m = @mime_content_type($path);
            if (is_string($m) && $m !== '') {
                return strtolower(trim(explode(';', $m)[0]));
            }
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $m = $finfo->file($path);

        return is_string($m) ? strtolower(trim($m)) : 'application/octet-stream';
    }

    private static function normalizarMime(string $mime, string $ext): string
    {
        if ($mime === 'application/octet-stream' || $mime === 'binary/octet-stream') {
            return self::mimePorExtensionFallback($ext);
        }
        if (in_array($ext, ['docx', 'xlsx'], true) && ($mime === 'application/zip' || $mime === 'application/x-zip-compressed')) {
            return self::mimePorExtensionFallback($ext);
        }

        return $mime;
    }

    private static function mimePorExtensionFallback(string $ext): string
    {
        switch ($ext) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'pdf':
                return 'application/pdf';
            case 'xlsx':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'xls':
                return 'application/vnd.ms-excel';
            case 'docx':
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'doc':
                return 'application/msword';
            default:
                return 'application/octet-stream';
        }
    }

    private static function mimeCompatibleContexto(string $mimeNorm, string $ext, string $contexto): bool
    {
        if ($contexto === 'mensaje') {
            if ($ext === 'jpg' || $ext === 'jpeg') {
                return $mimeNorm === 'image/jpeg';
            }
            if ($ext === 'pdf') {
                return $mimeNorm === 'application/pdf';
            }

            return false;
        }
        if ($contexto === 'imagen_noticia') {
            return ($ext === 'jpg' || $ext === 'jpeg') && $mimeNorm === 'image/jpeg';
        }
        if ($contexto === 'doc_noticia' || $contexto === 'poe') {
            return self::mimeEsDocumentoOffice($mimeNorm, $ext);
        }

        return false;
    }

    private static function mimeEsDocumentoOffice(string $mimeNorm, string $ext): bool
    {
        if ($ext === 'pdf') {
            return $mimeNorm === 'application/pdf';
        }
        if ($ext === 'xlsx') {
            return in_array($mimeNorm, [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/zip',
                'application/x-zip-compressed',
            ], true);
        }
        if ($ext === 'docx') {
            return in_array($mimeNorm, [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/zip',
                'application/x-zip-compressed',
            ], true);
        }
        if ($ext === 'xls') {
            return in_array($mimeNorm, [
                'application/vnd.ms-excel',
                'application/excel',
                'application/x-excel',
                'application/CDFV2-corrupt',
                'application/x-ole-storage',
            ], true);
        }
        if ($ext === 'doc') {
            return in_array($mimeNorm, [
                'application/msword',
                'application/CDFV2-corrupt',
                'application/x-ole-storage',
            ], true);
        }

        return false;
    }

    private static function mimeParaRespuesta(string $ext, string $mimeNorm): string
    {
        $m = self::mimePorExtensionFallback($ext);
        if ($m !== 'application/octet-stream') {
            return $m;
        }

        return $mimeNorm;
    }

    private static function firmaMagicaOk(string $path, string $ext): bool
    {
        $h = fopen($path, 'rb');
        if ($h === false) {
            return false;
        }
        $head = fread($h, 8);
        fclose($h);
        if ($head === false || $head === '') {
            return false;
        }

        if ($ext === 'jpg' || $ext === 'jpeg') {
            return strlen($head) >= 3 && $head[0] === "\xFF" && $head[1] === "\xD8" && $head[2] === "\xFF";
        }
        if ($ext === 'pdf') {
            return strncmp($head, '%PDF', 4) === 0;
        }
        if ($ext === 'xlsx' || $ext === 'docx') {
            if (strlen($head) < 4 || substr($head, 0, 2) !== 'PK') {
                return false;
            }
            if (class_exists(\ZipArchive::class)) {
                $z = new \ZipArchive();
                if ($z->open($path) === true) {
                    $ok = $z->locateName('[Content_Types].xml') !== false;
                    $z->close();

                    return $ok;
                }
            }

            return true;
        }
        if ($ext === 'xls' || $ext === 'doc') {
            // OLE2 / CFB
            return strlen($head) >= 8 && substr($head, 0, 8) === "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1";
        }

        return false;
    }

    public static function sanitizeNombreArchivo(string $base, string $extForzado): string
    {
        $base = basename(str_replace(["\0"], '', $base));
        $sinExt = preg_replace('/\.[^.\/\\\\]+$/', '', $base);
        $sinExt = $sinExt !== null ? $sinExt : $base;
        $clean = preg_replace('/[^\p{L}\p{N}\s._\-]/u', '_', $sinExt);
        $clean = trim((string) $clean, " ._");
        if ($clean === '') {
            $clean = 'adjunto';
        }
        if (function_exists('mb_substr')) {
            $clean = mb_substr($clean, 0, 120, 'UTF-8');
        } else {
            $clean = substr($clean, 0, 120);
        }

        return $clean . '.' . strtolower($extForzado);
    }

    public static function construirClaveObjeto(string $carpetaPerfil, int $instId, string $nombreSeguro): string
    {
        $nombreSeguro = str_replace(["\0", '\\'], '', $nombreSeguro);
        $uniq = bin2hex(random_bytes(8));

        return $carpetaPerfil . '/' . $instId . '/' . $uniq . '_' . $nombreSeguro;
    }

    /**
     * Comprueba que una clave subida pertenezca a la institución (prefijo .../instId/...).
     */
    public static function clavePerteneceInstitucion(string $key, string $carpetaEsperada, int $instId): bool
    {
        $key = trim($key);
        if ($key === '' || strpos($key, '..') !== false) {
            return false;
        }
        $pref = $carpetaEsperada . '/' . $instId . '/';

        return strncmp($key, $pref, strlen($pref)) === 0;
    }
}
