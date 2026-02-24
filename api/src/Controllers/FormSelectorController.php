<?php
namespace App\Controllers;

use App\Models\FormSelector\FormSelectorModel;
use App\Utils\Auditoria;

class FormSelectorController {
    private $model;

    public function __construct($db) {
        $this->model = new FormSelectorModel($db);
    }

    public function getSelectorData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            // Seguridad: Inyección desde el Token
            $sesion = Auditoria::getDatosSesion();
            $instIdSeguro = $sesion['instId'];

            $sedes = $this->model->getInstitutionalNetwork($instIdSeguro);

            $depName = '';
            if (count($sedes) > 0) {
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
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}