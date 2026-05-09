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

    private function adjuntosFromRow(array $row, string $prefixUrl, string $prefixNombre): array {
        $out = [];
        $u1 = $row[$prefixUrl . '1'] ?? null;
        if ($u1 !== null && $u1 !== '') {
            $n1 = $row[$prefixNombre . '1'] ?? null;
            $out[] = [
                'url' => (string)$u1,
                'nombre' => ($n1 !== null && $n1 !== '') ? (string)$n1 : (string)$u1,
            ];
        }
        $u2 = $row[$prefixUrl . '2'] ?? null;
        if ($u2 !== null && $u2 !== '') {
            $n2 = $row[$prefixNombre . '2'] ?? null;
            $out[] = [
                'url' => (string)$u2,
                'nombre' => ($n2 !== null && $n2 !== '') ? (string)$n2 : (string)$u2,
            ];
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

        return [
            'PortadaTitulo' => $row['PortadaTitulo'] ?? null,
            'PortadaCuerpo' => $row['PortadaCuerpo'] ?? null,
            'portada_adjuntos' => $this->adjuntosFromRow($row, 'PortadaUrlAdjunto', 'PortadaNombreAdjunto'),
            'PopupActivo' => (int)($row['PopupActivo'] ?? 0),
            'PopupTitulo' => $row['PopupTitulo'] ?? null,
            'PopupCuerpo' => $row['PopupCuerpo'] ?? null,
            'popup_adjuntos' => $this->adjuntosFromRow($row, 'PopupUrlAdjunto', 'PopupNombreAdjunto'),
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
