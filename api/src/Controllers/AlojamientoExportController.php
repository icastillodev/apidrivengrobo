<?php
namespace App\Controllers;

use App\Models\Alojamiento\AlojamientoExportModel;
use App\Utils\Auditoria;
use App\Utils\ModulosInstitucion;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class AlojamientoExportController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new AlojamientoExportModel($db);
    }

    public function export() {
        if (ob_get_length()) ob_clean();
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $instIdSeguro = $sesion['instId'];

            $historiaId = $_GET['historia'] ?? 'GLOBAL';
            $formato = $_GET['formato'] ?? 'pdf';
            $incluirAloj = $_GET['alojamientos'] ?? 'true';
            $incluirTraz = $_GET['trazabilidad'] ?? 'true';

            if (strtolower((string) $incluirTraz) === 'true') {
                $this->enforceModuloSesionOrExit($sesion, 'trazabilidad_alojamientos');
            }

            $data = $this->model->getExportData($instIdSeguro, $historiaId, $incluirAloj, $incluirTraz);

            if ($formato === 'excel') {
                $this->generateCSV($data, $historiaId);
            } else {
                $this->generatePDFView($data, $historiaId);
            }
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /** Exportación pública por token (sin sesión): para "Sacar historia PDF" desde la vista QR */
    public function publicExport() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $token = $_GET['token'] ?? '';
        if (empty($token) || strlen($token) !== 6) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Token inválido']);
            exit;
        }

        try {
            $info = $this->model->getHistoriaAndInstByToken($token);
            if (!$info) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Enlace revocado o no encontrado']);
                exit;
            }
            $instId = (int) $info['instId'];
            $snap = ModulosInstitucion::getSnapshot($this->db, $instId);
            if (ModulosInstitucion::estadoParaKey($snap['byKey'], 'alojamientos') <= 1) {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Exportación no disponible para esta institución.']);
                exit;
            }
            $data = $this->model->getExportData(
                $info['instId'],
                (string)$info['historia'],
                'true',
                'true'
            );
            echo json_encode(['status' => 'success', 'data' => $data, 'historia' => (int)$info['historia']]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function generateCSV($data, $historiaId) {
        $filename = "Reporte_Alojamientos_" . $historiaId . "_" . date('Ymd') . ".csv";
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=' . $filename);
        $output = fopen('php://output', 'w');
        fputs($output, $bom = (chr(0xEF) . chr(0xBB) . chr(0xBF)));

        if (isset($data['alojamientos'])) {
            fputcsv($output, ['--- REGISTROS DE ALOJAMIENTO ---']);
            fputcsv($output, ['Historia', 'Protocolo', 'Investigador', 'Especie', 'Tipo Caja', 'Fecha Inicio', 'Fecha Fin', 'Cant. Cajas', 'Precio Unit.', 'Costo Total', 'Estado']);
            foreach ($data['alojamientos'] as $row) {
                $estado = ($row['finalizado'] == 1) ? 'FINALIZADO' : 'VIGENTE';
                fputcsv($output, [
                    $row['historia'], $row['nprotA'], $row['Investigador'], $row['EspeNombreA'], 
                    $row['NombreTipoAlojamiento'], $row['fechavisado'], $row['hastafecha'] ?: '---', 
                    $row['CantidadCaja'], "$" . number_format($row['PrecioCajaMomento'], 2), 
                    "$" . number_format($row['totalpago'], 2), $estado
                ]);
            }
            fputcsv($output, []);
        }

        if (isset($data['trazabilidad'])) {
            fputcsv($output, ['--- TRAZABILIDAD CLÍNICA ---']);
            fputcsv($output, ['Historia', 'Caja', 'Ubicacion Caja', 'Sujeto', 'Fecha', 'Variable', 'Valor Registrado']);
            foreach ($data['trazabilidad'] as $row) {
                $ubic = $row['UbicacionCaja'] ?? $row['ubicacioncaja'] ?? '';
                fputcsv($output, [
                    $row['historia'], $row['NombreCaja'], $ubic,
                    $row['Sujeto'],
                    $row['fechaObs'], $row['Metrica'], $row['Valor']
                ]);
            }
        }
        fclose($output);
        exit;
    }

    private function generatePDFView($data, $historiaId) {
        // Implementación PDF
    }
}