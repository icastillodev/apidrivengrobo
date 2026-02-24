<?php
namespace App\Controllers; 

use App\Models\Services\AiService; 
use App\Utils\Auditoria; // <-- Seguridad inyectada

class AiController {
    private $aiService;

    public function __construct($db) {
        $this->aiService = new AiService($db);
    }

    public function processCommand() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        $data = json_decode(file_get_contents("php://input"), true);
        $userPrompt = $data['prompt'] ?? '';

        if (empty($userPrompt)) {
            echo json_encode(['status' => 'error', 'message' => 'El comando está vacío.']);
            exit;
        }

        try {
            // SEGURIDAD: Sacamos la identidad real del token
            $sesion = Auditoria::getDatosSesion();
            $idInst = $sesion['instId'];
            $idUsr  = $sesion['userId'];
            $rol    = $sesion['role'];

            $aiResponse = $this->aiService->analyzeAndExecute(
                $userPrompt, 
                $idInst, 
                $idUsr, 
                $rol
            );

            echo json_encode(['status' => 'success', 'data' => $aiResponse]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Error en GROBO IA: ' . $e->getMessage()]);
        }
        exit;
    }
}