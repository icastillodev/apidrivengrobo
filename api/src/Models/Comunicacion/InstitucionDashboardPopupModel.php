<?php
namespace App\Models\Comunicacion;

use App\Utils\ComunicacionArchivoValidacion;
use PDO;

/**
 * Popups del dashboard (modal): varias filas por institución; solo una con PopupActivo=1.
 */
class InstitucionDashboardPopupModel {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function listSummaryByInstitution(int $instId): array {
        $stmt = $this->db->prepare(
            'SELECT IdDashboardPopup, IdInstitucion, NombreInterno, PopupActivo, PopupTitulo, FechaCreacion, FechaActualizacion
             FROM institucion_dashboard_popup
             WHERE IdInstitucion = ?
             ORDER BY PopupActivo DESC, FechaActualizacion DESC, IdDashboardPopup DESC'
        );
        $stmt->execute([$instId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getById(int $instId, int $id): ?array {
        $stmt = $this->db->prepare(
            'SELECT * FROM institucion_dashboard_popup WHERE IdDashboardPopup = ? AND IdInstitucion = ? LIMIT 1'
        );
        $stmt->execute([$id, $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** Fila activa para mostrar en el panel (GET público). */
    public function getActiveForInstitution(int $instId): ?array {
        $stmt = $this->db->prepare(
            'SELECT * FROM institucion_dashboard_popup
             WHERE IdInstitucion = ? AND PopupActivo = 1
             ORDER BY IdDashboardPopup DESC
             LIMIT 1'
        );
        $stmt->execute([$instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function delete(int $instId, int $id): bool {
        $stmt = $this->db->prepare(
            'DELETE FROM institucion_dashboard_popup WHERE IdDashboardPopup = ? AND IdInstitucion = ?'
        );
        $stmt->execute([$id, $instId]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Deja solo esta fila como PopupActivo=1 en la institución.
     */
    public function ensureOnlyActive(int $instId, int $id): void {
        $this->db->beginTransaction();
        try {
            $z = $this->db->prepare(
                'UPDATE institucion_dashboard_popup SET PopupActivo = 0 WHERE IdInstitucion = ?'
            );
            $z->execute([$instId]);
            $u = $this->db->prepare(
                'UPDATE institucion_dashboard_popup SET PopupActivo = 1 WHERE IdDashboardPopup = ? AND IdInstitucion = ?'
            );
            $u->execute([$id, $instId]);
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function deactivate(int $instId, int $id): void {
        $stmt = $this->db->prepare(
            'UPDATE institucion_dashboard_popup SET PopupActivo = 0 WHERE IdDashboardPopup = ? AND IdInstitucion = ?'
        );
        $stmt->execute([$id, $instId]);
    }

    public function insert(int $instId, array $normalized): int {
        $sql = 'INSERT INTO institucion_dashboard_popup (
            IdInstitucion, NombreInterno, PopupActivo,
            PopupTitulo, PopupCuerpo,
            PopupPortadaImagenB2Key, PopupPortadaImagenNombre,
            PopupUrlAdjunto1, PopupNombreAdjunto1, PopupUrlAdjunto2, PopupNombreAdjunto2,
            PopupAdjunto1B2Key, PopupAdjunto1Nombre, PopupAdjunto2B2Key, PopupAdjunto2Nombre,
            PopupIdNoticia, FechaCreacion, FechaActualizacion
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $instId,
            $normalized['NombreInterno'],
            $normalized['PopupActivo'],
            $normalized['PopupTitulo'],
            $normalized['PopupCuerpo'],
            $normalized['PopupPortadaImagenB2Key'],
            $normalized['PopupPortadaImagenNombre'],
            $normalized['PopupUrlAdjunto1'],
            $normalized['PopupNombreAdjunto1'],
            $normalized['PopupUrlAdjunto2'],
            $normalized['PopupNombreAdjunto2'],
            $normalized['PopupAdjunto1B2Key'],
            $normalized['PopupAdjunto1Nombre'],
            $normalized['PopupAdjunto2B2Key'],
            $normalized['PopupAdjunto2Nombre'],
            $normalized['PopupIdNoticia'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $instId, int $id, array $normalized): void {
        $stmt = $this->db->prepare(
            'UPDATE institucion_dashboard_popup SET
                NombreInterno = ?, PopupActivo = ?,
                PopupTitulo = ?, PopupCuerpo = ?,
                PopupPortadaImagenB2Key = ?, PopupPortadaImagenNombre = ?,
                PopupUrlAdjunto1 = ?, PopupNombreAdjunto1 = ?, PopupUrlAdjunto2 = ?, PopupNombreAdjunto2 = ?,
                PopupAdjunto1B2Key = ?, PopupAdjunto1Nombre = ?, PopupAdjunto2B2Key = ?, PopupAdjunto2Nombre = ?,
                PopupIdNoticia = ?, FechaActualizacion = NOW()
             WHERE IdDashboardPopup = ? AND IdInstitucion = ?'
        );
        $stmt->execute([
            $normalized['NombreInterno'],
            $normalized['PopupActivo'],
            $normalized['PopupTitulo'],
            $normalized['PopupCuerpo'],
            $normalized['PopupPortadaImagenB2Key'],
            $normalized['PopupPortadaImagenNombre'],
            $normalized['PopupUrlAdjunto1'],
            $normalized['PopupNombreAdjunto1'],
            $normalized['PopupUrlAdjunto2'],
            $normalized['PopupNombreAdjunto2'],
            $normalized['PopupAdjunto1B2Key'],
            $normalized['PopupAdjunto1Nombre'],
            $normalized['PopupAdjunto2B2Key'],
            $normalized['PopupAdjunto2Nombre'],
            $normalized['PopupIdNoticia'],
            $id,
            $instId,
        ]);
    }

    private function normalizeOptionalUrl($raw) {
        if ($raw === null) {
            return null;
        }
        $s = trim((string) $raw);
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
        $s = trim(strip_tags((string) $raw));
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
    public function validatePayload(array $payload, int $instId, ?array $existingRow): array {
        $nom = isset($payload['NombreInterno']) ? trim(strip_tags((string) $payload['NombreInterno'])) : '';
        $nom = $nom === '' ? null : (function_exists('mb_substr') ? mb_substr($nom, 0, 255, 'UTF-8') : substr($nom, 0, 255));

        $popupActivo = !empty($payload['PopupActivo']) ? 1 : 0;
        $popTit = isset($payload['PopupTitulo']) ? trim(strip_tags((string) $payload['PopupTitulo'])) : '';
        $popTit = $popTit === '' ? null : (function_exists('mb_substr') ? mb_substr($popTit, 0, 255, 'UTF-8') : substr($popTit, 0, 255));
        $popCue = isset($payload['PopupCuerpo']) ? trim(strip_tags((string) $payload['PopupCuerpo'])) : '';
        $popCue = $popCue === '' ? null : $popCue;

        $imgK = isset($payload['PopupPortadaImagenB2Key']) ? trim((string) $payload['PopupPortadaImagenB2Key']) : '';
        $imgK = $imgK === '' ? null : $imgK;
        $imgN = $this->normalizeNombre(isset($payload['PopupPortadaImagenNombre']) ? (string) $payload['PopupPortadaImagenNombre'] : null);
        if ($imgK !== null) {
            if ($instId <= 0 || !ComunicacionArchivoValidacion::clavePerteneceInstitucion($imgK, 'popup/imagen', $instId)) {
                return ['ok' => false, 'message' => 'Imagen del popup: archivo no válido para esta sede.'];
            }
        } else {
            $imgN = null;
        }

        $u1 = $this->normalizeOptionalUrl($payload['PopupUrlAdjunto1'] ?? null);
        if ($u1 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 1 del popup no es válida.'];
        }
        $un1 = $this->normalizeNombre(isset($payload['PopupNombreAdjunto1']) ? (string) $payload['PopupNombreAdjunto1'] : null);
        $u2 = $this->normalizeOptionalUrl($payload['PopupUrlAdjunto2'] ?? null);
        if ($u2 === false) {
            return ['ok' => false, 'message' => 'La URL del adjunto 2 del popup no es válida.'];
        }
        $un2 = $this->normalizeNombre(isset($payload['PopupNombreAdjunto2']) ? (string) $payload['PopupNombreAdjunto2'] : null);

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
            $idNews = (int) $payload['PopupIdNoticia'];
            if ($idNews <= 0) {
                $idNews = null;
            }
        }

        return [
            'ok' => true,
            'data' => [
                'NombreInterno' => $nom,
                'PopupActivo' => $popupActivo,
                'PopupTitulo' => $popTit,
                'PopupCuerpo' => $popCue,
                'PopupPortadaImagenB2Key' => $imgK,
                'PopupPortadaImagenNombre' => $imgN,
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
}
