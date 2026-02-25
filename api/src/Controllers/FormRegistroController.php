<?php
namespace App\Controllers; 

use App\Models\FormRegistro\FormRegistroModel;
use App\Models\Services\MailService; // <-- Importamos tu MailService
use App\Utils\Auditoria; 

class FormRegistroController {
    private $model;
    private $mailService; // <-- Preparamos la variable para el mail

    public function __construct($db) {
        $this->model = new FormRegistroModel($db);
        $this->mailService = new MailService(); // <-- Inicializamos el servicio
    }

    public function listAll() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Solo admins ven la lista
            $data = $this->model->getAllConfigs();
            echo json_encode(['status' => 'success', 'data' => $data ?: [] ]);
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getFullDetail($id) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            Auditoria::getDatosSesion(); // Solo admins leen el JSON resultante
            $data = $this->model->getFullResponsesGrouped($id);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function getBySlug($slug) {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $data = $this->model->getConfigBySlug($slug);
            
            if (!$data) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'El enlace ha expirado o no es válido.']);
                exit;
            }

            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function submit() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // 0. VALIDACIÓN CRÍTICA: ¿Está el formulario activo?
            $config = $this->model->getConfigById($data['id_form']);
            if (!$config || (int)$config['activo'] === 0) {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Este enlace de registro ha sido desactivado por el administrador.']);
                exit;
            }

            // 1. Guardamos las respuestas en la base de datos (EAV)
            $this->model->saveResponses($data['id_form'], $data['respuestas']);
            
            // 2. Si la acción es confirmar (enviar al admin), enviamos el correo
            if (isset($data['action']) && $data['action'] === 'confirm') {
                
                // Traemos los datos básicos del form (Nombre de la inst y encargado) para el correo
                $config = $this->model->getConfigById($data['id_form']);
                
                // Extraemos algunos datos clave de las respuestas para armar el correo
                $instNombreSede = "Sede Nueva";
                $instContacto = "Sin especificar";
                
                foreach ($data['respuestas'] as $res) {
                    if ($res['campo'] === 'inst_nombre_sede') $instNombreSede = $res['valor'];
                    if ($res['campo'] === 'inst_contacto') $instContacto = $res['valor'];
                }

                // ==============================================
                // CONFIGURA AQUÍ EL CORREO DEL ADMINISTRADOR
                // ==============================================
                $adminEmail = "nuevainstitucion@groboapp.com"; // <-- CAMBIA ESTO por el tuyo
                $subject = "NUEVA ALTA: " . strtoupper($instNombreSede);
                
                $htmlBody = "
                    Hola Administrador,<br><br>
                    El cliente <b>{$config['encargado_nombre']}</b> ha finalizado el formulario de alta institucional para:<br>
                    <h3 style='color: #1a5d3b;'>$instNombreSede</h3>
                    <p><b>Contacto de la sede:</b> $instContacto</p><br>
                    Por favor, ingresa al panel de SuperAdmin de GROBO para revisar la ficha completa, crear la institución y asignar sus módulos.
                ";

                // Usamos la plantilla profesional de GROBO
                $body = $this->mailService->getTemplate("Formulario Finalizado", $htmlBody, "https://app.groboapp.com/superadmin/institucionformulario.html", "VER FORMULARIOS");
                
                $this->mailService->executeSend($adminEmail, $subject, $body);
            }

            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function createConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion(); 
            $id = $this->model->saveConfig($data, $sesion['userId']);
            echo json_encode(['status' => 'success', 'message' => 'Link creado con éxito', 'id' => $id]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Error de BD: ' . $e->getMessage()]);
        }
        exit;
    }
    // --- NUEVOS ENDPOINTS DE GESTIÓN ---

    public function toggleStatus() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion(); // Solo admins
            $this->model->toggleStatus($data['id_form_config'], $data['status'], $sesion['userId']);
            echo json_encode(['status' => 'success', 'message' => 'Estado actualizado correctamente.']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    public function deleteConfig() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents('php://input'), true);

        try {
            $sesion = Auditoria::getDatosSesion(); // Solo admins
            $this->model->deleteConfig($data['id_form_config'], $sesion['userId']);
            echo json_encode(['status' => 'success', 'message' => 'Registro eliminado correctamente.']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}