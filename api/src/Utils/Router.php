<?php
namespace App\Utils;

class Router {
    private $routes = [];
    private $basePath;
    private $db;

    public function __construct($basePath, $db) {
        $this->basePath = $basePath;
        $this->db = $db;
    }

    public function get($path, $handler) { $this->addRoute('GET', $path, $handler); }
    public function post($path, $handler) { $this->addRoute('POST', $path, $handler); }
    public function put($path, $handler) { $this->addRoute('PUT', $path, $handler); }
    public function delete($path, $handler) { $this->addRoute('DELETE', $path, $handler); }

    private function addRoute($method, $path, $handler) {
        $pattern = preg_replace('/:[a-zA-Z0-9]+/', '([a-zA-Z0-9-]+)', $path);
        $this->routes[] = [
            'method' => $method,
            'pattern' => "#^" . $this->basePath . $pattern . "$#",
            'handler' => $handler
        ];
    }

    public function run() {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $method = $_SERVER['REQUEST_METHOD'];

        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['pattern'], $uri, $matches)) {
                array_shift($matches); // Eliminar el match completo
                return $this->resolve($route['handler'], $matches);
            }
        }

        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Ruta no encontrada"]);
    }

    private function resolve($handler, $params) {
        list($controllerName, $method) = explode('@', $handler);
        $controllerClass = "App\\Controllers\\" . $controllerName;

        if (class_exists($controllerClass)) {
            // CUALQUIER controlador se instancia igual, pasándole la DB
            $controller = new $controllerClass($this->db);

            if (method_exists($controller, $method)) {
                // Ejecuta el método pasándole los parámetros de la URL (como el :slug)
                return call_user_func_array([$controller, $method], $params);
            }
        }

        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error interno: Controlador o método no válido"]);
    }
}