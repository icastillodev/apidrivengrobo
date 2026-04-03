<?php
namespace App\Controllers;

use App\Models\InsumoFormulario\InsumoFormularioModel;
use App\Models\Services\MailService; 
use App\Utils\Auditoria;
use App\Utils\Traits\ModuloInstitucionGuardTrait;
use PDO;

class InsumoFormularioController {
    use ModuloInstitucionGuardTrait;

    private $model;
    private $db; 

    public function __construct($db) {
        $this->db = $db;
        $this->model = new InsumoFormularioModel($db);
    }

    public function getInitData() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->enforceModuloWithRequestInstOrExit($sesion, 'insumos', $_GET['inst'] ?? null);
            // 🚀 FIX: Usamos la institución que manda el Frontend (la elegida en el selector)
            $targetInst = $_GET['inst'] ?? $sesion['instId'];

            echo json_encode(['status' => 'success', 'data' => $this->model->getInitialData($targetInst)]);
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
            $sesion = Auditoria::getDatosSesion();
            $input['userId'] = $sesion['userId']; // Seguridad
            
            // 🚀 FIX: Si viene instId en el POST lo usamos, sino el de sesión
            $input['instId'] = !empty($input['instId']) ? $input['instId'] : $sesion['instId'];
            $this->enforceModuloInstOrExit($sesion, 'insumos', (int)$input['instId']);
            
            $res = $this->model->saveOrder($input);
            $idForm = is_array($res) ? ($res['id'] ?? null) : $res;
            $finalDepto = is_array($res) ? ($res['idDepto'] ?? ($input['idDepto'] ?? null)) : ($input['idDepto'] ?? null);

            // Preparar y Enviar Correo
            $stmtInfo = $this->db->prepare("
                SELECT p.EmailA, p.NombreA, p.ApellidoA, i.NombreInst, d.NombreDeptoA, COALESCE(NULLIF(TRIM(p.idioma_preferido), ''), 'es') as idioma_preferido
                FROM personae p
                JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                JOIN institucion i ON u.IdInstitucion = i.IdInstitucion
                LEFT JOIN departamentoe d ON d.iddeptoA = ?
                WHERE p.IdUsrA = ? AND i.IdInstitucion = ?
            ");
            $stmtInfo->execute([$finalDepto, $input['userId'], $input['instId']]);
            $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);

            if ($info && !empty($info['EmailA'])) {
                $mail = new MailService();
                $nombreCompleto = strtoupper($info['NombreA'] . ' ' . $info['ApellidoA']);
                
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

                $mailData = [
                    'id' => $idForm,
                    'deptoName' => $info['NombreDeptoA'] ?? 'Sin Departamento',
                    'fecRetiroA' => $input['fecRetiroA'],
                    'aclaraA' => $input['aclaraA'],
                    'items' => $itemsParaCorreo
                ];

                $mail->sendInsumoExpOrder($info['EmailA'], $nombreCompleto, $info['NombreInst'], $mailData, null, $input['lang'] ?? $info['idioma_preferido'] ?? 'es');
            }

            echo json_encode(['status' => 'success', 'id' => $idForm]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}