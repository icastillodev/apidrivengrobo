<?php
namespace App\Controllers;

use App\Models\User\UserModel;
use PDO;

class UserController {
    private $model;
    private $db;

    public function __construct($db) {
        // CORRECCIÓN: Guardamos la conexión para que esté disponible en todos los métodos
        $this->db = $db;
        $this->model = new UserModel($db);
    }

    public function index() {
        if (ob_get_length()) ob_clean();

        $instId = $_GET['inst'] ?? null;

        if (!$instId) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'ID de institución no proporcionado']);
            exit;
        }

        $users = $this->model->getUsersByInstitution($instId);

        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'data' => $users
        ]);
        exit;
    }

    /**
     * CORRECCIÓN: Quitamos el parámetro ($id) de la función.
     * El Router lo llama sin argumentos, así que lo tomamos de $_GET.
     */
    public function getProtocols() {
        $id = $_GET['id'] ?? null;
        $instId = $_GET['inst'] ?? null;

        // Consulta específica para traer los protocolos bajo cargo del usuario
        $query = "SELECT idprotA, tituloA, nprotA, FechaFinProtA 
                FROM protocoloexpe 
                WHERE IdUsrA = ? AND IdInstitucion = ? 
                ORDER BY FechaFinProtA DESC";
                
        $stmt = $this->db->prepare($query);
        $stmt->execute([$id, $instId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

    public function getForms() {
        $id = $_GET['id'] ?? null;
        $instId = $_GET['inst'] ?? null;

        // Consulta para los formularios (pedidos) iniciados por el usuario
        $query = "SELECT idformA, fechainicioA, tipoA, estado 
                FROM formularioe 
                WHERE IdUsrA = ? AND IdInstitucion = ? 
                ORDER BY fechainicioA DESC";
                
        $stmt = $this->db->prepare($query);
        $stmt->execute([$id, $instId]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'data' => $data]);
        exit;
    }

        public function update() {
            $id = $_GET['id'] ?? null;
            $data = $_POST;

            // Actualizamos la tabla personae y mapeamos el dato de vuelta a LabA
            $sql = "UPDATE personae SET 
                    ApellidoA = ?, 
                    NombreA = ?, 
                    EmailA = ?, 
                    CelularA = ?, 
                    LabA = ? -- Aquí guardamos el ID del departamento
                    WHERE IdUsrA = ?";
                    
            $stmt = $this->db->prepare($sql);
            $success = $stmt->execute([
                $data['ApellidoA'], 
                $data['NombreA'], 
                $data['EmailA'], 
                $data['CelularA'], 
                $data['iddeptoA'], // Este es el valor del <select name="iddeptoA">
                $id
            ]);

            header('Content-Type: application/json');
            echo json_encode(['status' => $success ? 'success' : 'error']);
            exit;
        }

    // api/src/Controllers/UserController.php

    public function resetPassword() {
        // Obtenemos el ID desde la URL (?id=X) enviado por el frontend
        $id = $_GET['id'] ?? null;

        if (!$id) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'ID de usuario no proporcionado']);
            exit;
        }

        try {
            // Generamos el hash seguro de la clave '12345678'
            $newPasswordHash = password_hash('12345678', PASSWORD_DEFAULT);

            // Preparamos la consulta para la tabla usuarioe y la columna password_secure
            $sql = "UPDATE usuarioe SET password_secure = ? WHERE IdUsrA = ?";
            
            $stmt = $this->db->prepare($sql);
            $success = $stmt->execute([$newPasswordHash, $id]);

            header('Content-Type: application/json');
            echo json_encode([
                'status' => $success ? 'success' : 'error',
                'message' => $success ? 'Contraseña reseteada a 12345678' : 'No se pudo actualizar la contraseña'
            ]);
        } catch (\Exception $e) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}