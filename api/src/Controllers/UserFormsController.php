<?php
namespace App\Controllers;

use App\Models\UserForms\UserFormsModel;
use PDO;

class UserFormsController {
    private $model;

    public function __construct($db) {
        $this->model = new UserFormsModel($db);
    }

    public function getMyForms() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $userId = $_GET['user'] ?? 0;
        $instId = $_GET['inst'] ?? 0;

        try {
            // Obtener lista general y datos de contacto de la institución
            $data = $this->model->getAllForms($userId, $instId);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFormDetail() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        // El Router pasa el ID como parámetro en la URL, pero aquí lo capturamos del path o query según tu Router
        // Asumiendo que tu Router pasa parámetros al método o los tomamos de $_GET si no
        // En tu estructura de Router, el parámetro :id llega como argumento.
        // Pero para simplificar en este estándar, usaremos $_GET['id'] si el router no lo inyecta directo, 
        // o asumiremos que el Router.php maneja call_user_func_array.
        
        // HACK: Como tu Router pasa params al método, func_get_args() lo capturaría,
        // pero usaremos $_GET['id'] para asegurar compatibilidad si cambias el router.
        // Asegúrate de que tu JS llame a /user/form-detail/123 o /user/form-detail?id=123
        // Basado en tu Router.php: extrae el ID de la URL.
        
        $uriParts = explode('/', $_SERVER['REQUEST_URI']);
        $id = end($uriParts); // Captura el ID del final de la URL
        
        if (!is_numeric($id)) {
            echo json_encode(['status' => 'error', 'message' => 'ID inválido']);
            exit;
        }

        try {
            $detail = $this->model->getDetail($id);
            echo json_encode(['status' => 'success', 'data' => $detail]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}