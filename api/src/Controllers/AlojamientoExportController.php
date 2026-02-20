<?php
namespace App\Controllers;

use App\Models\Alojamiento\AlojamientoExportModel;

class AlojamientoExportController {
    private $model;

    public function __construct($db) {
        $this->model = new AlojamientoExportModel($db);
    }

    public function export() {
        // Recoger parámetros del GET
        $instId = $_GET['instId'] ?? 1;
        $historiaId = $_GET['historia'] ?? 'GLOBAL';
        $formato = $_GET['formato'] ?? 'pdf';
        $incluirAloj = $_GET['alojamientos'] ?? 'true';
        $incluirTraz = $_GET['trazabilidad'] ?? 'true';

        $data = $this->model->getExportData($instId, $historiaId, $incluirAloj, $incluirTraz);

        if ($formato === 'excel') {
            $this->generateCSV($data, $historiaId);
        } else {
            $this->generatePDFView($data, $historiaId);
        }
    }

    private function generateCSV($data, $historiaId) {
        $filename = "Reporte_Alojamientos_" . $historiaId . "_" . date('Ymd') . ".csv";
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=' . $filename);
        
        // Abrir la salida de PHP
        $output = fopen('php://output', 'w');
        // Soporte para caracteres especiales en Excel (BOM)
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
            fputcsv($output, []); // Fila en blanco
        }

        if (isset($data['trazabilidad'])) {
            fputcsv($output, ['--- TRAZABILIDAD CLÍNICA ---']);
            fputcsv($output, ['Historia', 'Caja', 'Sujeto', 'Fecha', 'Variable', 'Valor Registrado']);
            
            foreach ($data['trazabilidad'] as $row) {
                fputcsv($output, [
                    $row['historia'], $row['NombreCaja'], $row['Sujeto'], 
                    $row['fechaObs'], $row['Metrica'], $row['Valor']
                ]);
            }
        }

        fclose($output);
        exit;
    }

    private function generatePDFView($data, $historiaId) {
        // Vista HTML pura que se auto-imprime. 
        // No requiere dependencias y se ve perfecto al guardar como PDF en cualquier navegador.
    }
        ?>
