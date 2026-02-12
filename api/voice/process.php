<?php
// GECKO VOICE PROCESSOR - PRODUCTION READY (NGINX VERSION)
// Autor: Tojito (Gecko Devs)

// 1. HEADERS & CORS
header("Access-Control-Allow-Origin: *"); 
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

// 2. RECIBIR DATOS
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$command = $input['command'] ?? '';
$lang = $input['lang'] ?? 'es';

if (empty($command)) {
    echo json_encode(['status' => 'error', 'message' => 'Comando vacío']);
    exit;
}

// 3. CONFIGURACIÓN DEL VPS (Entrando por Nginx Puerto 80)
$vps_ip = '104.251.216.78'; 
$model_name = 'gecko-brain';

// URL LIMPIA (Sin puertos raros, usa HTTP estándar)
$apiUrl = "http://$vps_ip/api/generate";

// 4. PREPARAR PAYLOAD
// Prompt de sistema estricto para forzar JSON
$systemPrompt = "Eres el cerebro de una App SaaS. Tu ÚNICA salida debe ser un JSON válido minificado. No saludes, no expliques. Si no es una acción clara, devuelve un JSON de error.";

$payload = [
    "model" => $model_name,
    "prompt" => "User Command: '$command'. Language: '$lang'. RESPONSE ONLY JSON OBJECT.",
    "system" => $systemPrompt,
    "stream" => false,
    "options" => [
        "temperature" => 0.1, // Precisión máxima
        "num_ctx" => 4096     // Contexto suficiente
    ]
];

// 5. INICIAR CURL (Una sola vez)
$ch = curl_init($apiUrl);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
// Timeout generoso (60s) por si es la primera carga ("Cold Start")
curl_setopt($ch, CURLOPT_TIMEOUT, 60); 
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

// Ejecutar
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// 6. MANEJO DE ERRORES DE CONEXIÓN
if ($httpCode !== 200 || !$response) {
    error_log("GeckoVoice Error: VPS ($vps_ip) no responde. Code: $httpCode. Error: $curlError");
    echo json_encode([
        'status' => 'error', 
        'message' => 'Error de conexión con IA (Posible timeout o firewall).',
        'debug' => "Code: $httpCode | Curl: $curlError"
    ]);
    exit;
}

// 7. PROCESAMIENTO INTELIGENTE (MEJORADO)
$ollamaData = json_decode($response, true);
$aiText = $ollamaData['response'] ?? '';

// Regex para extraer SOLO el JSON
preg_match('/\{.*\}/s', $aiText, $matches);

if (!empty($matches[0])) {
    $cleanJsonString = $matches[0];
    $aiJson = json_decode($cleanJsonString, true);

    if (json_last_error() === JSON_ERROR_NONE) {
        // CASO 1: La IA entendió y manda una acción
        if (isset($aiJson['action'])) {
            echo json_encode([
                'status' => 'success',
                'action' => $aiJson
            ]);
        } 
        // CASO 2: La IA respondió pero no entendió la orden (JSON válido con error)
        elseif (isset($aiJson['error'])) {
            echo json_encode([
                'status' => 'warning', // Usamos warning para diferenciar
                'message' => 'La IA no entendió la orden: ' . $aiJson['error']
            ]);
        }
        // CASO 3: JSON válido pero sin claves conocidas
        else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Respuesta de IA incompleta.',
                'raw_response' => $aiJson
            ]);
        }
    } else {
        // JSON Inválido
        echo json_encode([
            'status' => 'error',
            'message' => 'La IA respondió texto sucio.',
            'raw_response' => $aiText
        ]);
    }
} else {
    // No hubo JSON
    echo json_encode([
        'status' => 'info',
        'message' => strip_tags($aiText)
    ]);
}
?>