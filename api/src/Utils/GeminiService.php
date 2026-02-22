<?php
namespace App\Utils;

use Exception;

class GeminiService {
    private $apiKey;
    // Usamos el modelo ultra-estable y económico
    // Usamos el modelo exacto que te dio Google AI Studio
    private $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

        public function __construct() {
        // 1. Tomamos la llave que TU index.php y EnvLoader ya cargaron en memoria
        $key = $_ENV['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY');

        if (empty($key)) {
            throw new Exception("Falta la configuración de la API Key (GEMINI_API_KEY) en el archivo .env");
        }

        // 2. Limpiamos las comillas por si en el .env pusiste GEMINI_API_KEY="AIza..."
        $this->apiKey = trim($key, " \t\n\r\0\x0B\"'"); 
    }

    public function askGemini($systemInstruction, $userPrompt) {
        $url = $this->apiUrl . "?key=" . $this->apiKey;

        $payload = [
            "system_instruction" => [
                "parts" => [["text" => $systemInstruction]]
            ],
            "contents" => [
                [
                    "role" => "user",
                    "parts" => [["text" => $userPrompt]]
                ]
            ],
            "generationConfig" => [
                "temperature" => 0.1, 
                "maxOutputTokens" => 800, // Le damos más espacio para que termine de escribir el JSON
                "responseMimeType" => "application/json" // Esto fuerza el formato
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        
        // Detección automática de SSL (Local vs Prod)
        $isLocalhost = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !$isLocalhost); 

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) throw new Exception("Error de conexión: " . $err);

        $result = json_decode($response, true);

        if (isset($result['error'])) {
            throw new Exception("Gemini dice: " . $result['error']['message']);
        }

    if (isset($result['candidates'][0]['content']['parts'][0]['text'])) {
            $iaResponse = $result['candidates'][0]['content']['parts'][0]['text'];
            
            // 1. Limpieza extrema: Aislamos estrictamente lo que esté entre { y }
            $inicio = strpos($iaResponse, '{');
            $fin = strrpos($iaResponse, '}');
            
            if ($inicio !== false && $fin !== false) {
                $iaResponse = substr($iaResponse, $inicio, $fin - $inicio + 1);
            }
            
            // 2. Intentamos decodificar
            $jsonCheck = json_decode($iaResponse, true);
            
            if (json_last_error() === JSON_ERROR_NONE) {
                return $jsonCheck; // ¡Éxito!
            } else {
                // 3. SI FALLA, QUE NOS MUESTRE EL TEXTO EXACTO QUE MANDÓ LA IA
                throw new Exception("Error de formato JSON. La IA respondió textualmente esto: " . $iaResponse);
            }
        }

        throw new Exception("Respuesta en blanco por parte de la IA.");
    }
}