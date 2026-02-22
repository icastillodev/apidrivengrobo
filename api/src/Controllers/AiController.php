<?php
namespace App\Controllers; // <-- Coincide con la carpeta Controllers

use App\Models\Services\AiService; // Importamos desde Models/Services

class AiController {
    private $aiService;

    public function __construct($db) {
        $this->aiService = new AiService($db);
    }

    public function processCommand() {
        // Limpiamos el buffer para evitar que HTML basura rompa el JSON
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        // 1. Recibir petición
        $data = json_decode(file_get_contents("php://input"), true);
        
        $userPrompt = $data['prompt'] ?? '';
        $idInst = $data['inst'] ?? 1;
        $idUsr = $data['uid'] ?? 0;
        $rol = $data['role'] ?? 3;

        if (empty($userPrompt)) {
            echo json_encode(['status' => 'error', 'message' => 'El comando está vacío.']);
            exit;
        }

        try {
            // 2. Pasar al Service (Lógica de negocio aislada)
            $aiResponse = $this->aiService->analyzeAndExecute(
                $userPrompt, 
                $idInst, 
                $idUsr, 
                $rol
            );

            // 3. Responder al Front
            echo json_encode(['status' => 'success', 'data' => $aiResponse]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error en GROBO IA: ' . $e->getMessage()]);
        }
        exit;
    }
}