<?php
namespace App\Controllers;

use App\Models\FormDerivacion\FormDerivacionModel;
use App\Utils\Auditoria;
use PDO;
use Exception;

class AdminFormularioController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    /** Roles 1 (maestro), 2 (Superadmin sede) y 4 (Admin sede). */
    private function assertMayDeleteForms(array $sesion): void
    {
        $r = (int)($sesion['role'] ?? 0);
        if (!in_array($r, [1, 2, 4], true)) {
            throw new Exception('Sin permiso para eliminar formularios.');
        }
    }

    private function getCategoriaFromDb(int $idformA): string
    {
        $stmt = $this->db->prepare(
            "SELECT (
                SELECT tf.categoriaformulario FROM tipoformularios tf
                WHERE tf.IdTipoFormulario = f.tipoA
                  AND tf.IdInstitucion = COALESCE(NULLIF(f.IdInstitucionOrigen, 0), f.IdInstitucion)
                LIMIT 1
            ) AS categoriaformulario
            FROM formularioe f
            WHERE f.idformA = ?
            LIMIT 1"
        );
        $stmt->execute([$idformA]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('Formulario no encontrado.');
        }
        return strtolower(trim((string)($row['categoriaformulario'] ?? '')));
    }

    /** animal | insumo | reactivo */
    private function bucketFromDbCategoria(string $c): ?string
    {
        if ($c === '') {
            return null;
        }
        if (in_array($c, ['animal', 'animal vivo'], true)) {
            return 'animal';
        }
        if ($c === 'insumos' || str_contains($c, 'insumo')) {
            return 'insumo';
        }
        if (in_array($c, ['otros reactivos biologicos', 'otros reactivos biológicos'], true)) {
            return 'reactivo';
        }
        if (str_starts_with($c, 'otros reactivos bio')) {
            return 'reactivo';
        }
        return null;
    }

    public function delete()
    {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json');
        try {
            $sesion = Auditoria::getDatosSesion();
            $this->assertMayDeleteForms($sesion);

            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $idformA = (int)($input['idformA'] ?? 0);
            $password = trim((string)($input['password'] ?? ''));
            $categoriaReq = strtolower(trim((string)($input['categoria'] ?? '')));

            if ($idformA <= 0) {
                throw new Exception('ID de formulario inválido.');
            }
            if (!in_array($categoriaReq, ['animal', 'reactivo', 'insumo'], true)) {
                throw new Exception('Categoría de formulario no válida.');
            }
            if ($password === '') {
                throw new Exception('Debes ingresar tu contraseña para confirmar la eliminación.');
            }

            $stmtPass = $this->db->prepare('SELECT password_secure FROM usuarioe WHERE IdUsrA = ?');
            $stmtPass->execute([(int)$sesion['userId']]);
            $rowPass = $stmtPass->fetch(PDO::FETCH_ASSOC);
            if (!$rowPass || !password_verify($password, $rowPass['password_secure'])) {
                throw new Exception('Contraseña incorrecta. No se eliminó el formulario.');
            }

            FormDerivacionModel::assertSessionInstMayDeleteForm($this->db, $idformA, (int)$sesion['instId']);

            $catDb = $this->getCategoriaFromDb($idformA);
            $bucket = $this->bucketFromDbCategoria($catDb);
            if ($bucket === null) {
                throw new Exception('Este tipo de formulario no puede eliminarse desde administración.');
            }
            if ($bucket !== $categoriaReq) {
                throw new Exception('El formulario no corresponde a esta categoría.');
            }

            $this->db->beginTransaction();
            try {
                $derivModel = new FormDerivacionModel($this->db);
                $derivModel->deleteFormularioCompletely($idformA);
                $this->db->commit();
            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }

            Auditoria::logManual(
                $this->db,
                (int)$sesion['userId'],
                'DELETE_FORM_ADMIN',
                'formularioe',
                "Eliminó formulario #{$idformA} ({$categoriaReq}) con confirmación de contraseña"
            );

            echo json_encode([
                'status' => 'success',
                'message' => 'Formulario eliminado correctamente.',
            ]);
        } catch (Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}
