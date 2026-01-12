<?php
namespace App\Controllers;

use App\Models\Menu\MenuModel;

class MenuController {
    private $model;

    public function __construct($db) {
        $this->model = new MenuModel($db);
    }

public function getMenu() {
    if (ob_get_length()) ob_clean();

    $roleId = (int)($_GET['role'] ?? 0);
    $instId = (int)($_GET['inst'] ?? 0);

    // Obtenemos solo los números de ID (ej: [1, 2, 5]) desde el modelo
    $activeIds = $this->model->getPermissions($instId, $roleId);

    header('Content-Type: application/json');
    // Enviamos directamente los IDs para que el JS los procese
    echo json_encode(["status" => "success", "data" => $activeIds]);
    exit;
}

    private function assembleMenu($activeIds) {
        // Catálogo maestro con rutas e iconos
        $catalog = [
            1  => ["label" => "Lista usuarios", "icon" => "users", "path" => "/usuarios"],
            2  => ["label" => "Gestionar protocolos", "icon" => "file-text", "path" => "/protocolos"],
            3  => ["label" => "Administrar precios", "icon" => "dollar-sign", "path" => "/precios"],
            4  => ["label" => "Formulario animales", "icon" => "dog", "path" => "/animales"],
            5  => ["label" => "Formulario reactivos", "icon" => "flask", "path" => "/reactivos"],
            6  => ["label" => "Formulario insumos", "icon" => "box", "path" => "/insumos"],
            7  => ["label" => "Reserva salas", "icon" => "calendar", "path" => "/reservas"],
            11 => ["label" => "Alojamientos", "icon" => "home", "path" => "/alojamientos"],
            12 => ["label" => "Estadísticas", "icon" => "bar-chart", "path" => "/stats"],
            13 => ["label" => "Configuración", "icon" => "settings", "path" => "/config"]
        ];

        $menu = [];

        // Procesar items simples
        foreach ($catalog as $id => $item) {
            if (in_array($id, $activeIds)) {
                $menu[] = $item;
            }
        }

        // Caso especial: El contenedor "Cont" (ID 8) y sus hijos (9 y 10)
        if (in_array(8, $activeIds)) {
            $subMenu = [];
            if (in_array(9, $activeIds)) {
                $subMenu[] = ["label" => "Adm capital", "icon" => "credit-card", "path" => "/cont/capital"];
            }
            if (in_array(10, $activeIds)) {
                $subMenu[] = ["label" => "Historial capital", "icon" => "clock", "path" => "/cont/historial"];
            }

            $menu[] = [
                "label" => "Cont",
                "icon" => "archive",
                "path" => "#",
                "children" => $subMenu
            ];
        }

        return $menu;
    }
}