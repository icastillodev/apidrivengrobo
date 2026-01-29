<?php
namespace App\Controllers;

use App\Models\FormSelector\FormSelectorModel;

class FormSelectorController {
    private $model;

    public function __construct($db) {
        $this->model = new FormSelectorModel($db);
    }

    public function getSelectorData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // Solo necesitamos saber en qué institución está logueado actualmente
        $instId = $_GET['inst'] ?? 0;

        if (!$instId) {
            echo json_encode(['status' => 'error', 'message' => 'Falta contexto institucional']);
            exit;
        }

        try {
            // Buscamos toda la red basada en la dependencia
            $sedes = $this->model->getInstitutionalNetwork($instId);

            $depName = '';
            if (count($sedes) > 0) {
                // Tomamos el nombre de la dependencia de la primera coincidencia
                $depName = $sedes[0]['DependenciaInstitucion'];
            }

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'dependency_name' => $depName,
                    'is_multi_sede' => (count($sedes) > 1),
                    'sedes' => $sedes
                ]
            ]);

        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}