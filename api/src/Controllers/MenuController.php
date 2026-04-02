<?php
namespace App\Controllers;

use App\Models\Comunicacion\NoticiaModel;
use App\Models\Menu\MenuModel;
use App\Utils\Auditoria;

class MenuController {
    private $model;
    private $noticiaModel;

    public function __construct($db) {
        $this->model = new MenuModel($db);
        $this->noticiaModel = new NoticiaModel($db);
    }

    public function getMenu() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        try {
            $sesion = Auditoria::getDatosSesion();
            $roleId = $sesion['role'];
            $instId = $sesion['instId'];

            $activeIds = $this->model->getPermissions($instId, $roleId);
            $filteredIds = $this->assembleMenu($activeIds, $roleId, (int) $instId);

            echo json_encode(["status" => "success", "data" => $filteredIds]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        exit;
    }

    private function assembleMenu($activeIds, $roleId, int $instId) {
        $ids = $activeIds;

        if (!in_array($roleId, [1, 2])) {
            $ids = array_filter($ids, function ($id) {
                return $id != 9;
            });
        }

        if (!in_array(201, $ids)) {
            $ids[] = 201;
        }

        $r = (int) $roleId;

        // Superadmin (1), admin sede (2), subadmin (4): comunicación completa siempre (no depende de menudistr).
        if (in_array($r, [1, 2, 4], true)) {
            foreach ([204, 205, 206] as $mid) {
                if (!in_array($mid, $ids)) {
                    $ids[] = $mid;
                }
            }
            return array_values(array_unique($ids));
        }

        // Resto de roles: 204 y 206 por defecto ON si no hay fila en menudistr; desactivables con Activo = 2.
        // Investigador (3): misma regla (mensajería institucional + portal de noticias).
        foreach ([204, 206] as $mid) {
            if (in_array($mid, $ids)) {
                continue;
            }
            $activo = $this->model->getMenudistrActivo($instId, $r, $mid);
            if ($activo === null || $activo === 1) {
                $ids[] = $mid;
            }
        }

        // 205: alineado con AdminNoticiaController; respetar menudistr.Activo = 2 como cierre explícito.
        if ($instId > 0 && !in_array(205, $ids)) {
            $activo205 = $this->model->getMenudistrActivo($instId, $r, 205);
            if ($activo205 !== 2) {
                $mostrar205 = ($r === 2);
                if (!$mostrar205 && $r >= 3 && $r <= 6) {
                    $mostrar205 = $this->noticiaModel->puedePublicarNoticias($instId, $r);
                }
                if ($mostrar205) {
                    $ids[] = 205;
                }
            }
        }

        return array_values(array_unique($ids));
    }
}