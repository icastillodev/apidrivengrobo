<?php
namespace App\Controllers;

use App\Models\Comunicacion\NoticiaModel;
use App\Models\Menu\MenuModel;
use App\Utils\Auditoria;
use App\Utils\ModulosInstitucion;

class MenuController {
    private $db;
    private $model;
    private $noticiaModel;

    public function __construct($db) {
        $this->db = $db;
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
            $filteredIds = $this->assembleMenu(
                $activeIds,
                $roleId,
                (int) $instId,
                (int) ($sesion['userId'] ?? 0)
            );

            echo json_encode(["status" => "success", "data" => $filteredIds]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        exit;
    }

    private function assembleMenu($activeIds, $roleId, int $instId, int $userId = 0) {
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

        // Superadmin (1), admin sede (2), subadmin (4): 204 y 205 siempre en sede; 206 solo por menudistr (o forzado sin sede).
        if (in_array($r, [1, 2, 4], true)) {
            foreach ([204, 205] as $mid) {
                if (!in_array($mid, $ids)) {
                    $ids[] = $mid;
                }
            }
            // Sin IdInstitución (p. ej. superadmin): portal disponible; con sede, 206 solo si Activo=1 en menudistr (ya en $ids).
            if ($instId <= 0 && !in_array(206, $ids)) {
                $ids[] = 206;
            }
        } else {
            // 204 (mensajería institucional): por defecto ON si no hay fila; Activo = 2 desactiva.
            if (!in_array(204, $ids)) {
                $activo204 = $this->model->getMenudistrActivo($instId, $r, 204);
                if ($activo204 === null || $activo204 === 1) {
                    $ids[] = 204;
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
        }

        $ids = array_values(array_unique($ids));
        $snap = ModulosInstitucion::getSnapshot($this->db, $instId);

        $uid = $userId > 0 ? $userId : null;

        return ModulosInstitucion::filterMenuIds($ids, $snap['byKey'], $r, $instId, $this->db, $uid);
    }
}