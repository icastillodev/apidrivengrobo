<?php
namespace App\Controllers;

use App\Models\Institution\InstitutionModel;

class InstitutionController {
    private $model;

    public function __construct($db) {
        $this->model = new InstitutionModel($db);
    }

    public function getDepartments() {
        if (ob_get_length()) ob_clean();

        // Obtenemos el ID de la institución desde la URL (?inst=X)
        $instId = $_GET['inst'] ?? null;

        if (!$instId) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'ID de institución no proporcionado']);
            exit;
        }

        $departments = $this->model->getDepartmentsByInstitution($instId);

        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'data' => $departments
        ]);
        exit;
    }
}