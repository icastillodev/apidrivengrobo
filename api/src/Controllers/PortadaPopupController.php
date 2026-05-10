<?php
namespace App\Controllers;

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
    private function buildPublicDto(?array $row, int $instId): array {
        if (!$row) {
            return [
                'PortadaTitulo' => null,
                'PortadaCuerpo' => null,
                'PortadaImagenUrl' => null,
                'portada_adjuntos' => [],
                'PopupActivo' => 0,
                'PopupTitulo' => null,
                'PopupCuerpo' => null,
                'popup_adjuntos' => [],
                'PopupNoticia' => null,
                'FechaActualizacion' => null,
            ];
        }

        $nm = new NoticiaModel($this->db);
        $popupNoticia = null;
        $nid = isset($row['PopupIdNoticia']) ? (int)$row['PopupIdNoticia'] : 0;
        if ($nid > 0) {
            $nr = $nm->getPublicById($instId, $nid);
            if ($nr) {
                $popupNoticia = [
                    'IdNoticia' => (int)$nr['IdNoticia'],
                    'Titulo' => (string)($nr['Titulo'] ?? ''),
                ];
            }
        }

        $imgUrl = null;
        if (!empty($row['PortadaImagenB2Key'])) {
            $imgUrl = $this->apiDownloadBase() . '/comunicacion/portada-popup/archivo/portada_imagen';
        }

        return [
            'PortadaTitulo' => $row['PortadaTitulo'] ?? null,
            'PortadaCuerpo' => $row['PortadaCuerpo'] ?? null,
            'PortadaImagenUrl' => $imgUrl,
            'portada_adjuntos' => $this->adjuntosDocumentosMerge($row, 'Portada'),
            'PopupActivo' => (int)($row['PopupActivo'] ?? 0),
            'PopupTitulo' => $row['PopupTitulo'] ?? null,
            'PopupCuerpo' => $row['PopupCuerpo'] ?? null,
            'popup_adjuntos' => $this->adjuntosDocumentosMerge($row, 'Popup'),
            'PopupNoticia' => $popupNoticia,
            'FechaActualizacion' => $row['FechaActualizacion'] ?? null,
        ];
    }

    public function getConfig() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $model = new InstitucionPortadaPopupModel($this->db);
            $row = $model->getByInstitucion($instId);
            $this->json(['status' => 'success', 'data' => $this->buildPublicDto($row, $instId)]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
