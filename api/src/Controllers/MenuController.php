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
        header('Content-Type: application/json');

        $roleId = (int)($_GET['role'] ?? 0);
        $instId = (int)($_GET['inst'] ?? 0);

        // 1. Obtenemos los IDs crudos desde la tabla menudistr
        $activeIds = $this->model->getPermissions($instId, $roleId);

        // 2. Procesamos y filtramos según tus reglas de negocio
        $filteredIds = $this->assembleMenu($activeIds, $roleId);

        echo json_encode(["status" => "success", "data" => $filteredIds]);
        exit;
    }

    /*
      Filtra los IDs de menú y aplica restricciones de seguridad por rol
    
    private function assembleMenu($activeIds, $roleId) {
        $ids = $activeIds;


        // REGLA DE VISIBILIDAD: IDs obligatorios para Admins (1 y 2)
        // Ahora incluimos los módulos operativos (11, 12, 13, 14) para que el Admin haga lo que hacen los usuarios
        if (in_array($roleId, [1, 2])) {
            $forced = [1, 2, 3, 4, 5, 8, 10, 202, 9]; 
            foreach ($forced as $f) {
                if (!in_array($f, $ids)) $ids[] = $f;
            }
        }

        // MENÚS GLOBALES: Estos siempre se inyectan para todos
        if (!in_array(201, $ids)) $ids[] = 201; // Perfil
        if (!in_array(204, $ids)) $ids[] = 204; // Ayuda (Capacitación, Tickets, etc.)

        // Limpieza de duplicados y reindexación para JSON
        return array_values(array_unique($ids));
    }
         */
    private function assembleMenu($activeIds, $roleId) {
    $ids = $activeIds; // Aquí ya vienen el 11, 12, 13, 14, etc.

    // REGLA: Si NO es Admin (1 o 2), sacamos el 9 por las dudas
    if (!in_array($roleId, [1, 2])) {
        $ids = array_filter($ids, function($id) { return $id != 9; });
    }

    // Inyectamos los globales que NO están en tu SQL pero son fijos
    if (!in_array(201, $ids)) $ids[] = 201; 
    if (!in_array(204, $ids)) $ids[] = 204; 

    return array_values(array_unique($ids));
}
}