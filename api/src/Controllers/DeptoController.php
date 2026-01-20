<?php
namespace App\Controllers;

use App\Models\Depto\DeptoModel;

class DeptoController {
    
    private $model;

    public function __construct($db) {
        // Instanciamos el modelo pasando la conexión
        $this->model = new DeptoModel($db);
    }

    public function list() {
        $instId = $_GET['inst'] ?? 1;
        $data = $this->model->getAllByInstitution($instId);
        
        // Respuesta JSON directa sin depender de una clase base
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'data' => $data
        ]);
        exit;
    }
}