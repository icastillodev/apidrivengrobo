<?php
namespace App\Models\Comunicacion;

use PDO;

class InstitucionPortadaPopupModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getByInstitucion(int $instId): ?array {
        $stmt = $this->db->prepare('SELECT * FROM institucion_portada_popup WHERE IdInstitucion = ? LIMIT 1');
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
    public function validateAndNormalize(array $payload): array {
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
        if ($p2 !== null && $p1 === null) {
            return ['ok' => false, 'message' => 'Si indica un segundo adjunto en portada, el primero debe tener URL.'];
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
        if ($u2 !== null && $u1 === null) {
            return ['ok' => false, 'message' => 'Si indica un segundo adjunto en el popup, el primero debe tener URL.'];
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
                'PortadaUrlAdjunto1' => $p1,
                'PortadaNombreAdjunto1' => $pn1,
                'PortadaUrlAdjunto2' => $p2,
                'PortadaNombreAdjunto2' => $pn2,
                'PopupActivo' => $popupActivo,
                'PopupTitulo' => $popTit,
                'PopupCuerpo' => $popCue,
                'PopupUrlAdjunto1' => $u1,
                'PopupNombreAdjunto1' => $un1,
                'PopupUrlAdjunto2' => $u2,
                'PopupNombreAdjunto2' => $un2,
                'PopupIdNoticia' => $idNews,
            ],
        ];
    }

    public function upsert(int $instId, array $normalized): void {
        $sql = 'INSERT INTO institucion_portada_popup (
            IdInstitucion,
            PortadaTitulo, PortadaCuerpo,
            PortadaUrlAdjunto1, PortadaNombreAdjunto1, PortadaUrlAdjunto2, PortadaNombreAdjunto2,
            PopupActivo, PopupTitulo, PopupCuerpo,
            PopupUrlAdjunto1, PopupNombreAdjunto1, PopupUrlAdjunto2, PopupNombreAdjunto2,
            PopupIdNoticia, FechaActualizacion
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        ) ON DUPLICATE KEY UPDATE
            PortadaTitulo = VALUES(PortadaTitulo),
            PortadaCuerpo = VALUES(PortadaCuerpo),
            PortadaUrlAdjunto1 = VALUES(PortadaUrlAdjunto1),
            PortadaNombreAdjunto1 = VALUES(PortadaNombreAdjunto1),
            PortadaUrlAdjunto2 = VALUES(PortadaUrlAdjunto2),
            PortadaNombreAdjunto2 = VALUES(PortadaNombreAdjunto2),
            PopupActivo = VALUES(PopupActivo),
            PopupTitulo = VALUES(PopupTitulo),
            PopupCuerpo = VALUES(PopupCuerpo),
            PopupUrlAdjunto1 = VALUES(PopupUrlAdjunto1),
            PopupNombreAdjunto1 = VALUES(PopupNombreAdjunto1),
            PopupUrlAdjunto2 = VALUES(PopupUrlAdjunto2),
            PopupNombreAdjunto2 = VALUES(PopupNombreAdjunto2),
            PopupIdNoticia = VALUES(PopupIdNoticia),
            FechaActualizacion = NOW()';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $instId,
            $normalized['PortadaTitulo'],
            $normalized['PortadaCuerpo'],
            $normalized['PortadaUrlAdjunto1'],
            $normalized['PortadaNombreAdjunto1'],
            $normalized['PortadaUrlAdjunto2'],
            $normalized['PortadaNombreAdjunto2'],
            $normalized['PopupActivo'],
            $normalized['PopupTitulo'],
            $normalized['PopupCuerpo'],
            $normalized['PopupUrlAdjunto1'],
            $normalized['PopupNombreAdjunto1'],
            $normalized['PopupUrlAdjunto2'],
            $normalized['PopupNombreAdjunto2'],
            $normalized['PopupIdNoticia'],
        ]);
    }
}
