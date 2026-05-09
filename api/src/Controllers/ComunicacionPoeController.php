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

    /** @return list<array{url:string,nombre:string}> */
    private function adjuntosFromRow(array $row): array {
        $out = [];
        $u1 = $row['UrlAdjunto1'] ?? null;
        if ($u1 !== null && $u1 !== '') {
            $n1 = $row['NombreAdjunto1'] ?? null;
            $out[] = [
                'url' => (string)$u1,
                'nombre' => ($n1 !== null && $n1 !== '') ? (string)$n1 : (string)$u1,
            ];
        }
        $u2 = $row['UrlAdjunto2'] ?? null;
        if ($u2 !== null && $u2 !== '') {
            $n2 = $row['NombreAdjunto2'] ?? null;
            $out[] = [
                'url' => (string)$u2,
                'nombre' => ($n2 !== null && $n2 !== '') ? (string)$n2 : (string)$u2,
            ];
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
