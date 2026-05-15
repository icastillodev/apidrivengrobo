<?php
namespace App\Models\Comunicacion;

use App\Utils\ComunicacionArchivoValidacion;
use PDO;

class InstitucionPortadaPopupModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getByInstitucion(int $instId): ?array {
        $stmt = $this->db->prepare(
            'SELECT IdInstitucion,
                    PortadaTitulo, PortadaCuerpo,
                    PortadaImagenB2Key, PortadaImagenNombre,
                    PortadaUrlAdjunto1, PortadaNombreAdjunto1, PortadaUrlAdjunto2, PortadaNombreAdjunto2,
                    PortadaAdjunto1B2Key, PortadaAdjunto1Nombre, PortadaAdjunto2B2Key, PortadaAdjunto2Nombre,
                    PopupActivo, PopupTitulo, PopupCuerpo,
                    PopupUrlAdjunto1, PopupNombreAdjunto1, PopupUrlAdjunto2, PopupNombreAdjunto2,
                    PopupAdjunto1B2Key, PopupAdjunto1Nombre, PopupAdjunto2B2Key, PopupAdjunto2Nombre,
                    PopupIdNoticia, FechaActualizacion
             FROM institucion_portada_popup WHERE IdInstitucion = ? LIMIT 1'
        );
        $stmt->execute([$instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * @param mixed $raw
     * @return string|null|false null=vacío, false=inválido
     */
    private function normalizeOptionalUrl($raw) {
        if ($raw === null) {
            return null;
        }
        $s = trim((string)$raw);
        if ($s === '') {
            return null;
        }
        if (strlen($s) > 768) {
            return false;
        }
        if (!preg_match('#^https?://#i', $s)) {
            return false;
        }

        return $s;
    }

    private function normalizeNombre(?string $raw): ?string {
        if ($raw === null) {
            return null;
        }
        $s = trim(strip_tags((string)$raw));
        if ($s === '') {
            return null;
        }
        if (function_exists('mb_substr')) {
            return mb_substr($s, 0, 255, 'UTF-8');
        }

        return substr($s, 0, 255);
    }

    /**
     * @return array{ok:bool,data?:array,message?:string}
     */
    public function validateAndNormalize(array $payload, int $instId): array {
        $portadaTitulo = isset($payload['PortadaTitulo']) ? trim(strip_tags((string)$payload['PortadaTitulo'])) : '';
        $portadaTitulo = $portadaTitulo === '' ? null : (function_exists('mb_substr') ? mb_substr($portadaTitulo, 0, 255, 'UTF-8') : substr($portadaTitulo, 0, 255));
        $portadaCuerpo = isset($payload['PortadaCuerpo']) ? trim(strip_tags((string)$payload['PortadaCuerpo'])) : '';
        $portadaCuerpo = $portadaCuerpo === '' ? null : $portadaCuerpo;

        $p1 = $this->normalizeOptionalUrl($payload['PortadaUrlAdjunto1'] ?? null);
        if ($p1 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 1 de portada no es válida (use http/https, máx. 768 caracteres).'];
        }
        $pn1 = $this->normalizeNombre(isset($payload['PortadaNombreAdjunto1']) ? (string)$payload['PortadaNombreAdjunto1'] : null);
        $p2 = $this->normalizeOptionalUrl($payload['PortadaUrlAdjunto2'] ?? null);
        if ($p2 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 2 de portada no es válida.'];
        }
        $pn2 = $this->normalizeNombre(isset($payload['PortadaNombreAdjunto2']) ? (string)$payload['PortadaNombreAdjunto2'] : null);

        $pImgK = isset($payload['PortadaImagenB2Key']) ? trim((string) $payload['PortadaImagenB2Key']) : '';
        $pImgN = $this->normalizeNombre(isset($payload['PortadaImagenNombre']) ? (string) $payload['PortadaImagenNombre'] : null);
        $pImgK = $pImgK === '' ? null : $pImgK;

        $pad1k = isset($payload['PortadaAdjunto1B2Key']) ? trim((string) $payload['PortadaAdjunto1B2Key']) : '';
        $pad1n = $this->normalizeNombre(isset($payload['PortadaAdjunto1Nombre']) ? (string) $payload['PortadaAdjunto1Nombre'] : null);
        $pad2k = isset($payload['PortadaAdjunto2B2Key']) ? trim((string) $payload['PortadaAdjunto2B2Key']) : '';
        $pad2n = $this->normalizeNombre(isset($payload['PortadaAdjunto2Nombre']) ? (string) $payload['PortadaAdjunto2Nombre'] : null);
        $pad1k = $pad1k === '' ? null : $pad1k;
        $pad2k = $pad2k === '' ? null : $pad2k;

        if ($pad1k !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pad1k, 'portada/doc', $instId)) {
                return ['ok' => false, 'message' => 'Adjunto de portada 1: archivo no válido para esta sede.'];
            }
            $p1 = null;
        }
        if ($pad2k !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pad2k, 'portada/doc', $instId)) {
                return ['ok' => false, 'message' => 'Adjunto de portada 2: archivo no válido para esta sede.'];
            }
            $p2 = null;
        }

        if (array_key_exists('PortadaUrlAdjunto1', $payload) && $p1 !== null && !array_key_exists('PortadaAdjunto1B2Key', $payload)) {
            $pad1k = null;
            $pad1n = null;
        }
        if (array_key_exists('PortadaUrlAdjunto2', $payload) && $p2 !== null && !array_key_exists('PortadaAdjunto2B2Key', $payload)) {
            $pad2k = null;
            $pad2n = null;
        }

        if (($p2 !== null || $pn2 !== null || $pad2k !== null || $pad2n !== null) && ($p1 === null && $pad1k === null)) {
            return ['ok' => false, 'message' => 'Si indica un segundo adjunto en portada, el primero debe estar definido (URL o archivo).'];
        }

        if (($pImgK !== null || $pImgN !== null) && ($pImgK === null || $pImgN === null)) {
            return ['ok' => false, 'message' => 'Imagen de portada: indique clave B2 y nombre de archivo.'];
        }
        if ($pImgK !== null && ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pImgK, 'portada/imagen', $instId))) {
            return ['ok' => false, 'message' => 'Imagen de portada: archivo no válido para esta sede.'];
        }

        if (($pad2k !== null || $pad2n !== null) && ($pad1k === null && $pad1n === null && $p1 === null && $pn1 === null)) {
            return ['ok' => false, 'message' => 'Si usa el segundo adjunto documento en portada, el primero debe estar definido.'];
        }

        $popupActivo = !empty($payload['PopupActivo']) ? 1 : 0;
        $popTit = isset($payload['PopupTitulo']) ? trim(strip_tags((string)$payload['PopupTitulo'])) : '';
        $popTit = $popTit === '' ? null : (function_exists('mb_substr') ? mb_substr($popTit, 0, 255, 'UTF-8') : substr($popTit, 0, 255));
        $popCue = isset($payload['PopupCuerpo']) ? trim(strip_tags((string)$payload['PopupCuerpo'])) : '';
        $popCue = $popCue === '' ? null : $popCue;

        $u1 = $this->normalizeOptionalUrl($payload['PopupUrlAdjunto1'] ?? null);
        if ($u1 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 1 del popup no es válida.'];
        }
        $un1 = $this->normalizeNombre(isset($payload['PopupNombreAdjunto1']) ? (string)$payload['PopupNombreAdjunto1'] : null);
        $u2 = $this->normalizeOptionalUrl($payload['PopupUrlAdjunto2'] ?? null);
        if ($u2 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 2 del popup no es válida.'];
        }
        $un2 = $this->normalizeNombre(isset($payload['PopupNombreAdjunto2']) ? (string)$payload['PopupNombreAdjunto2'] : null);

        $pop1k = isset($payload['PopupAdjunto1B2Key']) ? trim((string) $payload['PopupAdjunto1B2Key']) : '';
        $pop2k = isset($payload['PopupAdjunto2B2Key']) ? trim((string) $payload['PopupAdjunto2B2Key']) : '';
        $pop1k = $pop1k === '' ? null : $pop1k;
        $pop2k = $pop2k === '' ? null : $pop2k;
        $pop1n = $this->normalizeNombre(isset($payload['PopupAdjunto1Nombre']) ? (string) $payload['PopupAdjunto1Nombre'] : null);
        $pop2n = $this->normalizeNombre(isset($payload['PopupAdjunto2Nombre']) ? (string) $payload['PopupAdjunto2Nombre'] : null);

        if ($pop1k !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pop1k, 'popup/doc', $instId)) {
                return ['ok' => false, 'message' => 'Adjunto del popup 1: archivo no válido para esta sede.'];
            }
            $u1 = null;
        }
        if ($pop2k !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pop2k, 'popup/doc', $instId)) {
                return ['ok' => false, 'message' => 'Adjunto del popup 2: archivo no válido para esta sede.'];
            }
            $u2 = null;
        }

        if (array_key_exists('PopupUrlAdjunto1', $payload) && $u1 !== null && !array_key_exists('PopupAdjunto1B2Key', $payload)) {
            $pop1k = null;
            $pop1n = null;
        }
        if (array_key_exists('PopupUrlAdjunto2', $payload) && $u2 !== null && !array_key_exists('PopupAdjunto2B2Key', $payload)) {
            $pop2k = null;
            $pop2n = null;
        }

        if (($u2 !== null || $un2 !== null || $pop2k !== null || $pop2n !== null) && ($u1 === null && $pop1k === null)) {
            return ['ok' => false, 'message' => 'Si indica un segundo adjunto en el popup, el primero debe estar definido (URL o archivo).'];
        }

        $idNews = null;
        if (isset($payload['PopupIdNoticia']) && $payload['PopupIdNoticia'] !== '' && $payload['PopupIdNoticia'] !== null) {
            $idNews = (int)$payload['PopupIdNoticia'];
            if ($idNews <= 0) {
                $idNews = null;
            }
        }

        return [
            'ok' => true,
            'data' => [
                'PortadaTitulo' => $portadaTitulo,
                'PortadaCuerpo' => $portadaCuerpo,
                'PortadaImagenB2Key' => $pImgK,
                'PortadaImagenNombre' => $pImgN,
                'PortadaUrlAdjunto1' => $p1,
                'PortadaNombreAdjunto1' => $pn1,
                'PortadaUrlAdjunto2' => $p2,
                'PortadaNombreAdjunto2' => $pn2,
                'PortadaAdjunto1B2Key' => $pad1k,
                'PortadaAdjunto1Nombre' => $pad1n,
                'PortadaAdjunto2B2Key' => $pad2k,
                'PortadaAdjunto2Nombre' => $pad2n,
                'PopupActivo' => $popupActivo,
                'PopupTitulo' => $popTit,
                'PopupCuerpo' => $popCue,
                'PopupUrlAdjunto1' => $u1,
                'PopupNombreAdjunto1' => $un1,
                'PopupUrlAdjunto2' => $u2,
                'PopupNombreAdjunto2' => $un2,
                'PopupAdjunto1B2Key' => $pop1k,
                'PopupAdjunto1Nombre' => $pop1n,
                'PopupAdjunto2B2Key' => $pop2k,
                'PopupAdjunto2Nombre' => $pop2n,
                'PopupIdNoticia' => $idNews,
            ],
        ];
    }

    /**
     * Solo portada del panel (el popup se gestiona en `institucion_dashboard_popup`).
     *
     * @return array{ok:bool,data?:array,message?:string}
     */
    public function validatePortadaPayload(array $payload, int $instId): array {
        $portadaTitulo = isset($payload['PortadaTitulo']) ? trim(strip_tags((string) $payload['PortadaTitulo'])) : '';
        $portadaTitulo = $portadaTitulo === '' ? null : (function_exists('mb_substr') ? mb_substr($portadaTitulo, 0, 255, 'UTF-8') : substr($portadaTitulo, 0, 255));
        $portadaCuerpo = isset($payload['PortadaCuerpo']) ? trim(strip_tags((string) $payload['PortadaCuerpo'])) : '';
        $portadaCuerpo = $portadaCuerpo === '' ? null : $portadaCuerpo;

        $p1 = $this->normalizeOptionalUrl($payload['PortadaUrlAdjunto1'] ?? null);
        if ($p1 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 1 de portada no es válida (use http/https, máx. 768 caracteres).'];
        }
        $pn1 = $this->normalizeNombre(isset($payload['PortadaNombreAdjunto1']) ? (string) $payload['PortadaNombreAdjunto1'] : null);
        $p2 = $this->normalizeOptionalUrl($payload['PortadaUrlAdjunto2'] ?? null);
        if ($p2 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 2 de portada no es válida.'];
        }
        $pn2 = $this->normalizeNombre(isset($payload['PortadaNombreAdjunto2']) ? (string) $payload['PortadaNombreAdjunto2'] : null);

        $pImgK = isset($payload['PortadaImagenB2Key']) ? trim((string) $payload['PortadaImagenB2Key']) : '';
        $pImgN = $this->normalizeNombre(isset($payload['PortadaImagenNombre']) ? (string) $payload['PortadaImagenNombre'] : null);
        $pImgK = $pImgK === '' ? null : $pImgK;

        $pad1k = isset($payload['PortadaAdjunto1B2Key']) ? trim((string) $payload['PortadaAdjunto1B2Key']) : '';
        $pad1n = $this->normalizeNombre(isset($payload['PortadaAdjunto1Nombre']) ? (string) $payload['PortadaAdjunto1Nombre'] : null);
        $pad2k = isset($payload['PortadaAdjunto2B2Key']) ? trim((string) $payload['PortadaAdjunto2B2Key']) : '';
        $pad2n = $this->normalizeNombre(isset($payload['PortadaAdjunto2Nombre']) ? (string) $payload['PortadaAdjunto2Nombre'] : null);
        $pad1k = $pad1k === '' ? null : $pad1k;
        $pad2k = $pad2k === '' ? null : $pad2k;

        if ($pad1k !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pad1k, 'portada/doc', $instId)) {
                return ['ok' => false, 'message' => 'Adjunto de portada 1: archivo no válido para esta sede.'];
            }
            $p1 = null;
        }
        if ($pad2k !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pad2k, 'portada/doc', $instId)) {
                return ['ok' => false, 'message' => 'Adjunto de portada 2: archivo no válido para esta sede.'];
            }
            $p2 = null;
        }

        if (array_key_exists('PortadaUrlAdjunto1', $payload) && $p1 !== null && !array_key_exists('PortadaAdjunto1B2Key', $payload)) {
            $pad1k = null;
            $pad1n = null;
        }
        if (array_key_exists('PortadaUrlAdjunto2', $payload) && $p2 !== null && !array_key_exists('PortadaAdjunto2B2Key', $payload)) {
            $pad2k = null;
            $pad2n = null;
        }

        if (($p2 !== null || $pn2 !== null || $pad2k !== null || $pad2n !== null) && ($p1 === null && $pad1k === null)) {
            return ['ok' => false, 'message' => 'Si indica un segundo adjunto en portada, el primero debe estar definido (URL o archivo).'];
        }

        if (($pImgK !== null || $pImgN !== null) && ($pImgK === null || $pImgN === null)) {
            return ['ok' => false, 'message' => 'Imagen de portada: indique clave B2 y nombre de archivo.'];
        }
        if ($pImgK !== null && ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($pImgK, 'portada/imagen', $instId))) {
            return ['ok' => false, 'message' => 'Imagen de portada: archivo no válido para esta sede.'];
        }

        if (($pad2k !== null || $pad2n !== null) && ($pad1k === null && $pad1n === null && $p1 === null && $pn1 === null)) {
            return ['ok' => false, 'message' => 'Si usa el segundo adjunto documento en portada, el primero debe estar definido.'];
        }

        return [
            'ok' => true,
            'data' => [
                'PortadaTitulo' => $portadaTitulo,
                'PortadaCuerpo' => $portadaCuerpo,
                'PortadaImagenB2Key' => $pImgK,
                'PortadaImagenNombre' => $pImgN,
                'PortadaUrlAdjunto1' => $p1,
                'PortadaNombreAdjunto1' => $pn1,
                'PortadaUrlAdjunto2' => $p2,
                'PortadaNombreAdjunto2' => $pn2,
                'PortadaAdjunto1B2Key' => $pad1k,
                'PortadaAdjunto1Nombre' => $pad1n,
                'PortadaAdjunto2B2Key' => $pad2k,
                'PortadaAdjunto2Nombre' => $pad2n,
            ],
        ];
    }

    /** Persiste solo columnas de portada; no modifica columnas de popup en filas existentes. */
    public function upsertPortadaOnly(int $instId, array $portada): void {
        $sql = 'INSERT INTO institucion_portada_popup (
            IdInstitucion,
            PortadaTitulo, PortadaCuerpo,
            PortadaImagenB2Key, PortadaImagenNombre,
            PortadaUrlAdjunto1, PortadaNombreAdjunto1, PortadaUrlAdjunto2, PortadaNombreAdjunto2,
            PortadaAdjunto1B2Key, PortadaAdjunto1Nombre, PortadaAdjunto2B2Key, PortadaAdjunto2Nombre,
            PopupActivo, PopupTitulo, PopupCuerpo,
            PopupUrlAdjunto1, PopupNombreAdjunto1, PopupUrlAdjunto2, PopupNombreAdjunto2,
            PopupAdjunto1B2Key, PopupAdjunto1Nombre, PopupAdjunto2B2Key, PopupAdjunto2Nombre,
            PopupIdNoticia, FechaActualizacion
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
            NOW()
        ) ON DUPLICATE KEY UPDATE
            PortadaTitulo = VALUES(PortadaTitulo),
            PortadaCuerpo = VALUES(PortadaCuerpo),
            PortadaImagenB2Key = VALUES(PortadaImagenB2Key),
            PortadaImagenNombre = VALUES(PortadaImagenNombre),
            PortadaUrlAdjunto1 = VALUES(PortadaUrlAdjunto1),
            PortadaNombreAdjunto1 = VALUES(PortadaNombreAdjunto1),
            PortadaUrlAdjunto2 = VALUES(PortadaUrlAdjunto2),
            PortadaNombreAdjunto2 = VALUES(PortadaNombreAdjunto2),
            PortadaAdjunto1B2Key = VALUES(PortadaAdjunto1B2Key),
            PortadaAdjunto1Nombre = VALUES(PortadaAdjunto1Nombre),
            PortadaAdjunto2B2Key = VALUES(PortadaAdjunto2B2Key),
            PortadaAdjunto2Nombre = VALUES(PortadaAdjunto2Nombre),
            FechaActualizacion = NOW()';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $instId,
            $portada['PortadaTitulo'],
            $portada['PortadaCuerpo'],
            $portada['PortadaImagenB2Key'] ?? null,
            $portada['PortadaImagenNombre'] ?? null,
            $portada['PortadaUrlAdjunto1'],
            $portada['PortadaNombreAdjunto1'],
            $portada['PortadaUrlAdjunto2'],
            $portada['PortadaNombreAdjunto2'],
            $portada['PortadaAdjunto1B2Key'] ?? null,
            $portada['PortadaAdjunto1Nombre'] ?? null,
            $portada['PortadaAdjunto2B2Key'] ?? null,
            $portada['PortadaAdjunto2Nombre'] ?? null,
        ]);
    }

    public function upsert(int $instId, array $normalized): void {
        $sql = 'INSERT INTO institucion_portada_popup (
            IdInstitucion,
            PortadaTitulo, PortadaCuerpo,
            PortadaImagenB2Key, PortadaImagenNombre,
            PortadaUrlAdjunto1, PortadaNombreAdjunto1, PortadaUrlAdjunto2, PortadaNombreAdjunto2,
            PortadaAdjunto1B2Key, PortadaAdjunto1Nombre, PortadaAdjunto2B2Key, PortadaAdjunto2Nombre,
            PopupActivo, PopupTitulo, PopupCuerpo,
            PopupUrlAdjunto1, PopupNombreAdjunto1, PopupUrlAdjunto2, PopupNombreAdjunto2,
            PopupAdjunto1B2Key, PopupAdjunto1Nombre, PopupAdjunto2B2Key, PopupAdjunto2Nombre,
            PopupIdNoticia, FechaActualizacion
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        ) ON DUPLICATE KEY UPDATE
            PortadaTitulo = VALUES(PortadaTitulo),
            PortadaCuerpo = VALUES(PortadaCuerpo),
            PortadaImagenB2Key = VALUES(PortadaImagenB2Key),
            PortadaImagenNombre = VALUES(PortadaImagenNombre),
            PortadaUrlAdjunto1 = VALUES(PortadaUrlAdjunto1),
            PortadaNombreAdjunto1 = VALUES(PortadaNombreAdjunto1),
            PortadaUrlAdjunto2 = VALUES(PortadaUrlAdjunto2),
            PortadaNombreAdjunto2 = VALUES(PortadaNombreAdjunto2),
            PortadaAdjunto1B2Key = VALUES(PortadaAdjunto1B2Key),
            PortadaAdjunto1Nombre = VALUES(PortadaAdjunto1Nombre),
            PortadaAdjunto2B2Key = VALUES(PortadaAdjunto2B2Key),
            PortadaAdjunto2Nombre = VALUES(PortadaAdjunto2Nombre),
            PopupActivo = VALUES(PopupActivo),
            PopupTitulo = VALUES(PopupTitulo),
            PopupCuerpo = VALUES(PopupCuerpo),
            PopupUrlAdjunto1 = VALUES(PopupUrlAdjunto1),
            PopupNombreAdjunto1 = VALUES(PopupNombreAdjunto1),
            PopupUrlAdjunto2 = VALUES(PopupUrlAdjunto2),
            PopupNombreAdjunto2 = VALUES(PopupNombreAdjunto2),
            PopupAdjunto1B2Key = VALUES(PopupAdjunto1B2Key),
            PopupAdjunto1Nombre = VALUES(PopupAdjunto1Nombre),
            PopupAdjunto2B2Key = VALUES(PopupAdjunto2B2Key),
            PopupAdjunto2Nombre = VALUES(PopupAdjunto2Nombre),
            PopupIdNoticia = VALUES(PopupIdNoticia),
            FechaActualizacion = NOW()';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $instId,
            $normalized['PortadaTitulo'],
            $normalized['PortadaCuerpo'],
            $normalized['PortadaImagenB2Key'] ?? null,
            $normalized['PortadaImagenNombre'] ?? null,
            $normalized['PortadaUrlAdjunto1'],
            $normalized['PortadaNombreAdjunto1'],
            $normalized['PortadaUrlAdjunto2'],
            $normalized['PortadaNombreAdjunto2'],
            $normalized['PortadaAdjunto1B2Key'] ?? null,
            $normalized['PortadaAdjunto1Nombre'] ?? null,
            $normalized['PortadaAdjunto2B2Key'] ?? null,
            $normalized['PortadaAdjunto2Nombre'] ?? null,
            $normalized['PopupActivo'],
            $normalized['PopupTitulo'],
            $normalized['PopupCuerpo'],
            $normalized['PopupUrlAdjunto1'],
            $normalized['PopupNombreAdjunto1'],
            $normalized['PopupUrlAdjunto2'],
            $normalized['PopupNombreAdjunto2'],
            $normalized['PopupAdjunto1B2Key'] ?? null,
            $normalized['PopupAdjunto1Nombre'] ?? null,
            $normalized['PopupAdjunto2B2Key'] ?? null,
            $normalized['PopupAdjunto2Nombre'] ?? null,
            $normalized['PopupIdNoticia'],
        ]);
    }
}
