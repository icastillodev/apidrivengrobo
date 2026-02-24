<?php
namespace App\Models\InsumoFormulario;

use PDO;
use Exception;

class InsumoFormularioModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Carga los datos iniciales para el formulario (Selectores y configuración)
     */
    public function getInitialData($instId) {
        // 1. Datos Institución (Correo, Título de Precios, etc.)
        $stmtInst = $this->db->prepare("SELECT NombreInst, InstCorreo, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$instId]);
        $institucion = $stmtInst->fetch(PDO::FETCH_ASSOC);

        // 2. Departamentos (Ordenados alfabéticamente)
        $stmtDepto = $this->db->prepare("SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ? ORDER BY NombreDeptoA ASC");
        $stmtDepto->execute([$instId]);

        // 3. Insumos disponibles (Solo los activos: Existencia != 2)
        $stmtIns = $this->db->prepare("SELECT idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo, PrecioInsumo FROM insumo WHERE IdInstitucion = ? AND Existencia != 2 ORDER BY NombreInsumo ASC");
        $stmtIns->execute([$instId]);

        // 4. Tipo de Formulario (Busca el ID correspondiente a la categoría 'Insumos')
        $stmtType = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario = 'Insumos' AND IdInstitucion = ? LIMIT 1");
        $stmtType->execute([$instId]);

        return [
            'institucion' => $institucion,
            'departamentos' => $stmtDepto->fetchAll(PDO::FETCH_ASSOC),
            'insumos' => $stmtIns->fetchAll(PDO::FETCH_ASSOC),
            'id_tipo_default' => $stmtType->fetchColumn()
        ];
    }

    /**
     * Guarda el pedido completo en una transacción
     */
public function saveOrder($data) {
        $this->db->beginTransaction();
        try {
            $sqlForm = "INSERT INTO formularioe (
                            tipoA, fechainicioA, fecRetiroA, aclaraA, IdUsrA, 
                            IdInstitucion, depto, estado, visto
                        ) VALUES (?, NOW(), ?, ?, ?, ?, ?, 'Sin estado', 0)";
            
            $stmtForm = $this->db->prepare($sqlForm);
            $stmtForm->execute([
                $data['idTipoFormulario'],
                $data['fecRetiroA'], 
                $data['aclaraA'],    
                $data['userId'],
                $data['instId'],     
                $data['idDepto']     
            ]);
            $idForm = $this->db->lastInsertId();

            $this->db->prepare("INSERT INTO precioinsumosformulario (idformA, totalpago) VALUES (?, 0)")->execute([$idForm]);
            $idPrecioForm = $this->db->lastInsertId();

            $sqlItem = "INSERT INTO forminsumo (idPrecioinsumosformulario, IdInsumo, cantidad, PrecioMomentoInsumo) VALUES (?, ?, ?, ?)";
            $stmtItem = $this->db->prepare($sqlItem);

            foreach ($data['items'] as $item) {
                $stmtPrice = $this->db->prepare("SELECT PrecioInsumo FROM insumo WHERE idInsumo = ?");
                $stmtPrice->execute([$item['idInsumo']]);
                $precioActual = $stmtPrice->fetchColumn() ?: 0;

                $stmtItem->execute([$idPrecioForm, $item['idInsumo'], $item['cantidad'], $precioActual]);
            }

            \App\Utils\Auditoria::log($this->db, 'INSERT', 'formularioe', "Nuevo Pedido de Insumos Generales #$idForm");
            
            $this->db->commit();
            return $idForm; 
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e; 
        }
    }
}