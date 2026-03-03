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
            // 1. Validamos la sesión
            $sesion = Auditoria::getDatosSesion();
            $rol = (int)$sesion['role'];
            $instIdToken = $sesion['instId'];

            // 2. Leemos la sede solicitada por el Frontend (GET)
            $instIdRequest = isset($_GET['inst']) ? (int)$_GET['inst'] : 0;

            // 3. SEGURIDAD: Determinamos qué sede buscar
            // Si es SuperAdmin (Rol 1), puede ver la que pida. Si no, forzamos la de su Token.
            $instIdFinal = ($rol === 1 && $instIdRequest > 0) ? $instIdRequest : $instIdToken;

            if (empty($instIdFinal) || $instIdFinal === 0) {
                throw new \Exception("No hay una institución válida para mostrar los formularios.");
            }

            // 4. Buscamos la red institucional
            $sedes = $this->model->getInstitutionalNetwork($instIdFinal);

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
            http_response_code(400); // 400 Bad Request (No 401 para que no desloguee)
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}