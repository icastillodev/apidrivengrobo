<?php
namespace App\Controllers\Ai;

use App\Utils\AuthTrait;
use App\Utils\ResponseTrait;
use App\Services\GeminiService;
use App\Services\Ai\AiService; // Tu nuevo Service

class AiController {
    use AuthTrait, ResponseTrait;

    private $aiService;

    public function __construct($db) {
        $this->validateSession(); // AuthTrait: nos da $this->idInst, $this->idUsr, $this->rol
        $this->aiService = new AiService($db);
    }

    public function processCommand() {
        // 1. Recibir petición
        $data = json_decode(file_get_contents("php://input"), true);
        $userPrompt = $data['prompt'] ?? '';

        if (empty($userPrompt)) {
            return $this->errorResponse('El comando está vacío.');
        }

        try {
            // 2. Pasar al Service (Lógica de negocio aislada)
            $aiResponse = $this->aiService->analyzeAndExecute(
                $userPrompt, 
                $this->idInst, 
                $this->idUsr, 
                $this->rol
            );

            // 3. Responder al Front usando ResponseTrait
            return $this->successResponse($aiResponse, 'Comando procesado exitosamente.');
        } catch (\Exception $e) {
            return $this->errorResponse('Error en GROBO IA: ' . $e->getMessage());
        }
    }
}