<?php
namespace App\Controllers;
use App\Models\Reactivo\ReactivoModel;

class ReactivoController {
    private $model;

    public function __construct($db) {
        $this->model = new ReactivoModel($db);
    }

    public function getAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $instId = $_GET['inst'] ?? 0;
        // Filtro estricto por la categoría solicitada
        $categoria = "Otros reactivos biologicos"; 

        try {
            $data = $this->model->getAllByInstitution($instId, $categoria);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
    // api/src/Controllers/ReactivoController.php

public function getFormData() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $instId = $_GET['inst'] ?? 0;

    try {
        // Obtenemos la lista de insumos experimentales para el select del modal
        $insumos = $this->model->getAvailableInsumos($instId);
        echo json_encode(['status' => 'success', 'data' => ['insumos' => $insumos]]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

public function getLastNotification() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $idformA = $_GET['id'] ?? 0;

    try {
        $notif = $this->model->getLastNotification($idformA);
        echo json_encode(['status' => 'success', 'data' => $notif]);
    } catch (\Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}
// api/src/Controllers/AnimalController.php (o el controlador que maneje /menu/notifications)

public function getPendingCounts() {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json');
    $instId = $_GET['inst'] ?? 0;

    // 1. Conteo de Animales Vivos
    $sqlAni = "SELECT COUNT(f.idformA) as total 
               FROM formularioe f 
               INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
               WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
               AND t.categoriaformulario = 'Animal vivo'";
    $stmtAni = $this->db->prepare($sqlAni);
    $stmtAni->execute([$instId]);
    $countAni = $stmtAni->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

    // 2. Conteo de Reactivos Biológicos
    $sqlRea = "SELECT COUNT(f.idformA) as total 
               FROM formularioe f 
               INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
               WHERE f.IdInstitucion = ? AND f.estado = 'Sin estado' 
               AND t.nombreTipo = 'Otros reactivos biologicos'";
    $stmtRea = $this->db->prepare($sqlRea);
    $stmtRea->execute([$instId]);
    $countRea = $stmtRea->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;

    echo json_encode([
        'status' => 'success',
        'data' => [
            'animales' => (int)$countAni,
            'reactivos' => (int)$countRea
        ]
    ]);
    exit;
}
}