<?php
namespace App\Controllers;

use App\Models\Comunicacion\InstitucionPoeModel;
use App\Utils\Auditoria;

class ComunicacionPoeController {
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

    /** @return list<array{url:string,nombre:string,origen?:string}> */
    private function adjuntosFromRow(array $row): array {
        $out = [];
        $base = ComunicacionB2Controller::absoluteApiPrefix();
        $id = (int)($row['IdPoe'] ?? 0);

        for ($i = 1; $i <= 2; $i++) {
            $bk = $row['Adjunto' . $i . 'B2Key'] ?? null;
            if ($bk !== null && $bk !== '') {
                $n = $row['NombreAdjunto' . $i] ?? null;
                $out[] = [
                    'url' => $base . '/comunicacion/poe/' . $id . '/adjunto/' . $i,
                    'nombre' => ($n !== null && $n !== '') ? (string) $n : 'adjunto',
                    'origen' => 'b2',
                ];
                continue;
            }
            $u = $row['UrlAdjunto' . $i] ?? null;
            if ($u !== null && $u !== '') {
                $n = $row['NombreAdjunto' . $i] ?? null;
                $out[] = [
                    'url' => (string) $u,
                    'nombre' => ($n !== null && $n !== '') ? (string) $n : (string) $u,
                    'origen' => 'url',
                ];
            }
        }

        return $out;
    }

    /** @param array<string,mixed> $row */
    private function mapPublicDetail(array $row): array {
        return [
            'IdPoe' => (int)$row['IdPoe'],
            'Titulo' => (string)($row['Titulo'] ?? ''),
            'Resena' => $row['Resena'] ?? null,
            'Cuerpo' => $row['Cuerpo'] ?? null,
            'adjuntos' => $this->adjuntosFromRow($row),
            'Orden' => (int)($row['Orden'] ?? 0),
            'FechaActualizacion' => $row['FechaActualizacion'] ?? null,
            'FechaCreacion' => $row['FechaCreacion'] ?? null,
        ];
    }

    public function listItems() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $model = new InstitucionPoeModel($this->db);
            $rows = $model->listPublicActive($instId);
            $mapped = [];
            foreach ($rows as $r) {
                $mapped[] = [
                    'IdPoe' => (int)$r['IdPoe'],
                    'Titulo' => (string)($r['Titulo'] ?? ''),
                    'Resena' => $r['Resena'] ?? null,
                    'Orden' => (int)($r['Orden'] ?? 0),
                    'FechaActualizacion' => $r['FechaActualizacion'] ?? null,
                ];
            }
            $this->json(['status' => 'success', 'data' => ['rows' => $mapped]]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function getOne($id) {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $model = new InstitucionPoeModel($this->db);
            $row = $model->getPublicById($instId, (int)$id);
            if (!$row) {
                $this->json(['status' => 'error', 'message' => 'Documento no encontrado.'], 404);
            }
            $this->json(['status' => 'success', 'data' => $this->mapPublicDetail($row)]);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }
}
