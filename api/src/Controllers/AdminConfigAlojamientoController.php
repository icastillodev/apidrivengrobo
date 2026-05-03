<?php
namespace App\Controllers;

use App\Models\AdminConfig\AdminConfigAlojamientoModel;
use App\Utils\Auditoria;
use App\Utils\Traits\ModuloInstitucionGuardTrait;

class AdminConfigAlojamientoController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->model = new AdminConfigAlojamientoModel($db);
    }

    public function getDetails() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // El id de la especie sí viene por GET porque no es riesgo de seguridad (es una lectura pública para el modal)
        $espId = (int)($_GET['esp'] ?? 0);
        if ($espId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Especie']);
            exit;
        }

        $protRaw = $_GET['prot'] ?? null;
        $protId = ($protRaw === null || $protRaw === '') ? null : (int)$protRaw;
        if ($protId !== null && $protId <= 0) {
            $protId = null;
        }

        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $instId = (int)$sesion['instId'];
            $this->model->assertEspecieEnInstitucion($espId, $instId);

            $bundle = $this->model->getCategoriesBundlePorProtocolo($espId, $protId);
            $protocolos = $this->model->listProtocolosPorEspecieInst($instId, $espId);

            $data = [
                'types' => $this->model->getTypes($espId),
                'categories' => $bundle['categories_datos'],
                'categories_datos' => $bundle['categories_datos'],
                'categories_inicio' => $bundle['categories_inicio'],
                'protocolos' => $protocolos,
            ];
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getProtocolosPorEspecie() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        $espId = (int)($_GET['esp'] ?? 0);
        if ($espId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Especie']);
            exit;
        }
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $instId = (int)$sesion['instId'];
            $this->model->assertEspecieEnInstitucion($espId, $instId);
            $rows = $this->model->listProtocolosPorEspecieInst($instId, $espId);
            echo json_encode(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    /**
     * Lista variables de trazabilidad ya definidas para la especie en la institución (sin filtrar por protocolo origen),
     * deduplicadas y excluyendo las que ya existen en el protocolo de destino seleccionado en pantalla.
     */
    public function getPoolCatTraer() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        $espId = (int)($_GET['esp'] ?? 0);
        $alcance = (string)($_GET['alcance'] ?? 'datos');
        $protRaw = $_GET['prot'] ?? null;
        $destProt = ($protRaw === null || $protRaw === '') ? null : (int)$protRaw;
        if ($destProt !== null && $destProt <= 0) {
            $destProt = null;
        }
        if ($espId <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Falta ID Especie']);
            exit;
        }
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $instId = (int)$sesion['instId'];
            $rows = $this->model->listPoolCategoriasParaTraer($instId, $espId, $alcance, $destProt);
            echo json_encode(['status' => 'success', 'data' => $rows]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function cloneCatTraz() {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $instId = (int)$sesion['instId'];
            $destEsp = (int)($input['destIdEspA'] ?? 0);
            $destProtRaw = $input['destIdprotA'] ?? null;
            $destProt = ($destProtRaw === null || $destProtRaw === '') ? null : (int)$destProtRaw;
            if ($destProt !== null && $destProt <= 0) {
                $destProt = null;
            }
            $destAlcance = (string)($input['destAlcance'] ?? 'datos');
            $sourceIds = $input['sourceIds'] ?? [];
            if (!is_array($sourceIds)) {
                $sourceIds = [];
            }
            $res = $this->model->cloneCategoriasTraz($instId, $destEsp, $destProt, $destAlcance, $sourceIds);
            echo json_encode(['status' => 'success', 'data' => $res]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    // --- TYPES ---
    public function saveType() { $this->handleSave('saveType'); }
    public function toggleType() { $this->handleToggle('toggleType'); }
    public function deleteType() { $this->handleDelete('deleteType'); }

    // --- CATEGORIES ---
    public function saveCat() { $this->handleSave('saveCategory'); }
    public function toggleCat() { $this->handleToggle('toggleCategory'); }
    public function deleteCat() { $this->handleDelete('deleteCategory'); }

    // --- HELPERS ---
    private function handleSave($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            // Seguridad: Forzamos que la institución sea la del token real, no la que manda el formulario
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            $_POST['instId'] = $sesion['instId'];
            
            $this->model->$method($_POST);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleToggle($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            if(empty($input['id'])) throw new \Exception("ID faltante");
            
            $this->model->$method($input['id'], $input['status']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    private function handleDelete($method) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloSesionOrExit($sesion, 'alojamientos');
            if(empty($input['id'])) throw new \Exception("ID faltante");
            
            $this->model->$method($input['id']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}