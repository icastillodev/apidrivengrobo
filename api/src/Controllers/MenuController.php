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

        // Superadmin (1), admin sede (2), subadmin (4): 204/205/207/209 siempre; 206 y 208 solo sin sede (con sede vienen de menudistr en $ids).
        if (in_array($r, [1, 2, 4], true)) {
            foreach ([204, 205, 207, 209] as $mid) {
                if (!in_array($mid, $ids)) {
                    $ids[] = $mid;
                }
            }
            if ($instId <= 0) {
                foreach ([206, 208] as $mid) {
                    if (!in_array($mid, $ids)) {
                        $ids[] = $mid;
                    }
                }
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

            // 206 (portal de noticias en panel): visible para investigadores/asistente/lab; por defecto ON si no hay fila; Activo = 2 desactiva.
            if (!in_array(206, $ids)) {
                $activo206 = $this->model->getMenudistrActivo($instId, $r, 206);
                if ($activo206 === null || $activo206 === 1) {
                    if ($r >= 3 && $r <= 6) {
                        $ids[] = 206;
                    }
                }
            }

            // 209 (admin POE): misma regla que 205 (publicar noticias / POE).
            if ($instId > 0 && !in_array(209, $ids)) {
                $activo209 = $this->model->getMenudistrActivo($instId, $r, 209);
                if ($activo209 !== 2) {
                    $mostrar209 = ($r === 2);
                    if (!$mostrar209 && $r >= 3 && $r <= 6) {
                        $mostrar209 = $this->noticiaModel->puedePublicarNoticias($instId, $r);
                    }
                    if ($mostrar209) {
                        $ids[] = 209;
                    }
                }
            }

            // 208 (portal POE en panel): misma lógica que 206.
            if (!in_array(208, $ids)) {
                $activo208 = $this->model->getMenudistrActivo($instId, $r, 208);
                if ($activo208 === null || $activo208 === 1) {
                    if ($r >= 3 && $r <= 6) {
                        $ids[] = 208;
                    }
                }
            }
        }

        $ids = array_values(array_unique($ids));
        if (in_array(205, $ids, true) && !in_array(207, $ids, true)) {
            $ids[] = 207;
        }
        $ids = array_values(array_unique($ids));
        $snap = ModulosInstitucion::getSnapshot($this->db, $instId);

        $uid = $userId > 0 ? $userId : null;

        return ModulosInstitucion::filterMenuIds($ids, $snap['byKey'], $r, $instId, $this->db, $uid);
    }
}