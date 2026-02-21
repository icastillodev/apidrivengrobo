<?php
// api/index.php
ob_start(); // Iniciamos buffer para atrapar cualquier error de texto
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

require_once 'autoload.php';

// 1. Cargar las variables del archivo .env
// (Asumiendo que el .env está en la raíz de /api)
\App\Utils\EnvLoader::load(__DIR__ . '/.env');

require_once 'config/database.php';

// Intentar conexión (Si esto falla, ob_start atrapará el error)
// En api/index.php
try {
    $db = (new Database())->getConnection();
} catch (Exception $e) {
    // Esto limpia cualquier salida previa y envía el error real de la BD
    ob_clean(); 
    echo json_encode([
        "status" => "error", 
        "message" => "Error de BD: " . $e->getMessage() // <--- Esto es la clave
    ]);
    exit;
}

// El base path debe ser la carpeta de la API
$base = (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false || strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false) 
        ? '/URBE-API-DRIVEN/api' 
        : '/core-backend-gem';

$router = new \App\Utils\Router($base, $db);

require_once 'routes.php';

// Limpiamos cualquier echo o warning accidental antes de la respuesta real
$output = ob_get_clean(); 
$router->run();