<?php
namespace App\Controllers;

use App\Models\InsumoFormulario\InsumoFormularioModel;
use App\Models\Services\MailService; 
use PDO;

class InsumoFormularioController {
    private $model;
    private $db; 

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InsumoFormularioModel($db);
    }

    public function getInitData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        $instId = $_GET['inst'] ?? 0;
        try {
            echo json_encode(['status' => 'success', 'data' => $this->model->getInitialData($instId)]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

public function createOrder() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || empty($input['items'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos o ítems en el pedido']);
            exit;
        }
        
        try {
            // 1. Guardar Pedido en BD
            $idForm = $this->model->saveOrder($input);

            // 2. Obtener datos del Investigador y la Institución
            $stmtInfo = $this->db->prepare("
                SELECT p.EmailA, p.NombreA, p.ApellidoA, i.NombreInst, d.NombreDeptoA
                FROM personae p
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                LEFT JOIN departamentoe d ON d.iddeptoA = ?
                WHERE p.IdUsrA = ? AND i.IdInstitucion = ?
            ");
            $stmtInfo->execute([$input['idDepto'], $input['userId'], $input['instId']]);
            $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);

            // 3. Preparar datos y enviar correo usando MailService
            if ($info && !empty($info['EmailA'])) {
                $mail = new MailService();
                $nombreCompleto = strtoupper($info['NombreA'] . ' ' . $info['ApellidoA']);
                
                // Enriquecer items con nombres para el correo
                $itemsParaCorreo = [];
                foreach ($input['items'] as $item) {
                    $stmtIns = $this->db->prepare("SELECT NombreInsumo, TipoInsumo FROM insumo WHERE idInsumo = ?");
                    $stmtIns->execute([$item['idInsumo']]);
                    $insData = $stmtIns->fetch(PDO::FETCH_ASSOC);

                    $itemsParaCorreo[] = [
                        'id' => $item['idInsumo'],
                        'cantidad' => $item['cantidad'],
                        'nombre' => $insData ? $insData['NombreInsumo'] : 'Ítem #'.$item['idInsumo'],
                        'unidad' => $insData ? $insData['TipoInsumo'] : ''
                    ];
                }

                // Armar paquete de datos para el Servicio
                $mailData = [
                    'id' => $idForm,
                    'deptoName' => $info['NombreDeptoA'] ?? 'Sin Departamento',
                    'fecRetiroA' => $input['fecRetiroA'],
                    'aclaraA' => $input['aclaraA'],
                    'items' => $itemsParaCorreo
                ];

                // Llamada limpia al servicio
                $mail->sendInsumoExpOrder($info['EmailA'], $nombreCompleto, $info['NombreInst'], $mailData);
            }

            echo json_encode(['status' => 'success', 'id' => $idForm]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}