<?php
namespace App\Services;

use Exception;

class GeminiService {
    private $apiKey;
    private $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    public function __construct() {
        // OJO: En producción, esto debería venir de un archivo .env o de tu config/database.php
        // Por ahora pon tu clave aquí directamente para probar.
        $this->apiKey = 'AIzaSyAeCFgSx6NGOu9wFtRHE6eo6D069rK5oeg'; 
    }

    /******************************************************************
     * ENVÍA EL CONTEXTO Y EL COMANDO DE VOZ/TEXTO A LA IA
     ******************************************************************/
    public function askGemini($systemInstruction, $userPrompt) {
        $url = $this->apiUrl . "?key=" . $this->apiKey;

        // Estructura estricta que exige la API de Gemini
        $payload = [
            "system_instruction" => [
                "parts" => [
                    ["text" => $systemInstruction] // Aquí le damos el rol y las reglas
                ]
            ],
            "contents" => [
                [
                    "role" => "user",
                    "parts" => [
                        ["text" => $userPrompt] // Aquí va lo que dijo o escribió el usuario
                    ]
                ]
            ],
            "generationConfig" => [
                "temperature" => 0.1, // Temperatura súper baja para que no "invente" cosas (alucinaciones)
                "responseMimeType" => "application/json" // Obligamos a la IA a devolver un JSON parseable
            ]
        ];

        // Configuración del cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        
        // En producción en VPSDime esto debe ser 'true'. En localhost a veces falla el SSL, ponlo en 'false' si tira error.
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); 

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            error_log("CURL Error Gemini: " . $err);
            throw new Exception("Error de conexión con el motor de IA.");
        }

        $result = json_decode($response, true);

        // Manejo de errores de la API de Google (ej. cuota excedida o key inválida)
        if (isset($result['error'])) {
            error_log("API Error Gemini: " . $result['error']['message']);
            throw new Exception("Error interno del asistente virtual.");
        }

        // Extraer la respuesta de la IA
        // Dentro de askGemini() en GeminiService.php
        if (isset($result['candidates'][0]['content']['parts'][0]['text'])) {
            $iaResponse = $result['candidates'][0]['content']['parts'][0]['text'];
            
            // 🚀 PARCHE CRÍTICO: Limpiar el markdown oculto que manda Gemini
            $iaResponse = str_replace(['```json', '```'], '', $iaResponse);
            $iaResponse = trim($iaResponse);
            
            // Verificamos que realmente sea un JSON válido
            $jsonCheck = json_decode($iaResponse, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $jsonCheck;
            } else {
                error_log("Error JSON Gemini: " . $iaResponse);
                throw new Exception("La IA no devolvió un formato JSON válido.");
            }
        }

        throw new Exception("Respuesta en blanco por parte de la IA.");
    }
}