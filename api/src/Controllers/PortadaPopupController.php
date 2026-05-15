<?php
namespace App\Controllers;

use App\Models\Comunicacion\InstitucionDashboardPopupModel;
use App\Models\Comunicacion\InstitucionPortadaPopupModel;
use App\Models\Comunicacion\NoticiaModel;
use App\Utils\Auditoria;

class PortadaPopupController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function json($data, $code = 200) {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        if ($code !== 200) {
            http_response_code($code);
        }
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }

    private function requireInst(array $sesion): int {
        $instId = (int)($sesion['instId'] ?? 0);
        if ($instId <= 0) {
            throw new \Exception('Se requiere una institución válida.');
        }

        return $instId;
    }

    private function apiDownloadBase(): string {
        return ComunicacionB2Controller::absoluteApiPrefix();
    }

    /**
     * Combina adjuntos por URL (legacy) y archivos en B2 (NOTICIASPOPUP).
     *
     * @param 'Portada'|'Popup' $bloque
     */
    private function adjuntosDocumentosMerge(array $row, string $bloque): array {
        $out = [];
        $prefixUrl = $bloque === 'Portada' ? 'PortadaUrlAdjunto' : 'PopupUrlAdjunto';
        $prefixNombre = $bloque === 'Portada' ? 'PortadaNombreAdjunto' : 'PopupNombreAdjunto';

        for ($i = 1; $i <= 2; $i++) {
            $bk = $bloque === 'Portada'
                ? ($row['PortadaAdjunto' . $i . 'B2Key'] ?? null)
                : ($row['PopupAdjunto' . $i . 'B2Key'] ?? null);
            $bn = $bloque === 'Portada'
                ? ($row['PortadaAdjunto' . $i . 'Nombre'] ?? null)
                : ($row['PopupAdjunto' . $i . 'Nombre'] ?? null);
            if ($bk !== null && $bk !== '') {
                $tipo = ($bloque === 'Portada' ? 'portada_doc' : 'popup_doc') . $i;
                $out[] = [
                    'url' => $this->apiDownloadBase() . '/comunicacion/portada-popup/archivo/' . $tipo,
                    'nombre' => ($bn !== null && $bn !== '') ? (string) $bn : 'adjunto',
                    'origen' => 'b2',
                ];
                continue;
            }
            $u = $row[$prefixUrl . $i] ?? null;
            if ($u !== null && $u !== '') {
                $n = $row[$prefixNombre . $i] ?? null;
                $out[] = [
                    'url' => (string) $u,
                    'nombre' => ($n !== null && $n !== '') ? (string) $n : (string) $u,
                    'origen' => 'url',
                ];
            }
        }

        return $out;
    }

    /**
     * Respuesta para dashboard: portada, popup (sin datos sensibles) y noticia vinculada si sigue publicada.
     */
    private function mergeFechaActualizacion(?array $ippRow, ?array $popupRow): ?string {
        $a = $ippRow['FechaActualizacion'] ?? null;
        $b = $popupRow['FechaActualizacion'] ?? null;
        if (!$a) {
            return $b ? (string) $b : null;
        }
        if (!$b) {
            return (string) $a;
        }
        $ta = strtotime((string) $a);
        $tb = strtotime((string) $b);

        return ($tb !== false && $ta !== false && $tb >= $ta) ? (string) $b : (string) $a;
    }

    /**
     * @param ?array $ippRow institucion_portada_popup
     * @param ?array $popupRow institucion_dashboard_popup activo (o null)
     */
    private function buildPublicDto(?array $ippRow, ?array $popupRow, int $instId): array {
        if (!$ippRow) {
            $ippRow = [];
        }

        $nm = new NoticiaModel($this->db);
        $popupNoticia = null;
        $nid = isset($popupRow['PopupIdNoticia']) ? (int) $popupRow['PopupIdNoticia'] : 0;
        if ($nid > 0) {
            $nr = $nm->getPublicById($instId, $nid);
            if ($nr) {
                $popupNoticia = [
                    'IdNoticia' => (int) $nr['IdNoticia'],
                    'Titulo' => (string) ($nr['Titulo'] ?? ''),
                ];
            }
        }

        $imgUrl = null;
        if (!empty($ippRow['PortadaImagenB2Key'])) {
            $imgUrl = $this->apiDownloadBase() . '/comunicacion/portada-popup/archivo/portada_imagen';
        }

        $popActivo = $popupRow ? (int) ($popupRow['PopupActivo'] ?? 0) : 0;

        $popupImgUrl = null;
        if ($popupRow && !empty($popupRow['PopupPortadaImagenB2Key'])) {
            $popupImgUrl = $this->apiDownloadBase() . '/comunicacion/portada-popup/archivo/popup_imagen';
        }

        return [
            'PortadaTitulo' => $ippRow['PortadaTitulo'] ?? null,
            'PortadaCuerpo' => $ippRow['PortadaCuerpo'] ?? null,
            'PortadaImagenUrl' => $imgUrl,
            'portada_adjuntos' => $this->adjuntosDocumentosMerge($ippRow, 'Portada'),
            'PopupActivo' => $popActivo,
            'PopupTitulo' => $popupRow['PopupTitulo'] ?? null,
            'PopupCuerpo' => $popupRow['PopupCuerpo'] ?? null,
            'PopupImagenUrl' => $popupImgUrl,
            'popup_adjuntos' => $popupRow ? $this->adjuntosDocumentosMerge($popupRow, 'Popup') : [],
            'PopupNoticia' => $popupNoticia,
            'FechaActualizacion' => $this->mergeFechaActualizacion(
                $ippRow ?: null,
                $popupRow ?: null
            ),
        ];
    }

    public function getConfig() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $model = new InstitucionPortadaPopupModel($this->db);
            $ipp = $model->getByInstitucion($instId);
            $dpm = new InstitucionDashboardPopupModel($this->db);
            $pop = $dpm->getActiveForInstitution($instId);
            $this->json(['status' => 'success', 'data' => $this->buildPublicDto($ipp, $pop, $instId)]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
