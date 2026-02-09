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
            // A. Insertar en formularioe
            // CORRECCIÓN: Se agregaron fecRetiroA, aclaraA e IdInstitucion
            $sqlForm = "INSERT INTO formularioe (
                            tipoA, 
                            fechainicioA, 
                            fecRetiroA, 
                            aclaraA, 
                            IdUsrA, 
                            IdInstitucion, 
                            depto, 
                            estado, 
                            visto
                        ) VALUES (?, NOW(), ?, ?, ?, ?, ?, 'Sin estado', 0)";
            
            $stmtForm = $this->db->prepare($sqlForm);
            
            // Mapeo de datos: Asegurarse que el Controller envíe estas llaves
            $stmtForm->execute([
                $data['idTipoFormulario'],
                $data['fecRetiroA'], // Fecha de retiro (string 'YYYY-MM-DD')
                $data['aclaraA'],    // Aclaración del usuario
                $data['userId'],
                $data['instId'],     // ID de la Institución
                $data['idDepto']     // ID del Departamento seleccionado
            ]);
            
            $idForm = $this->db->lastInsertId();

            // B. Insertar en precioinsumosformulario (Cabecera contable)
            // Se inicializa en 0. El cálculo final se suele hacer al aprobar o entregar.
            $this->db->prepare("INSERT INTO precioinsumosformulario (idformA, totalpago) VALUES (?, 0)")->execute([$idForm]);
            $idPrecioForm = $this->db->lastInsertId();

            // C. Insertar ítems en forminsumo
            $sqlItem = "INSERT INTO forminsumo (idPrecioinsumosformulario, IdInsumo, cantidad, PrecioMomentoInsumo) VALUES (?, ?, ?, ?)";
            $stmtItem = $this->db->prepare($sqlItem);

            foreach ($data['items'] as $item) {
                // 1. Buscamos el precio ACTUAL del insumo para congelarlo en el historial (snapshot)
                $stmtPrice = $this->db->prepare("SELECT PrecioInsumo FROM insumo WHERE idInsumo = ?");
                $stmtPrice->execute([$item['idInsumo']]);
                $precioActual = $stmtPrice->fetchColumn() ?: 0;

                // 2. Insertamos la línea del pedido
                $stmtItem->execute([
                    $idPrecioForm, 
                    $item['idInsumo'], 
                    $item['cantidad'], 
                    $precioActual
                ]);
            }

            $this->db->commit();
            return $idForm; // Retornamos el ID para confirmación o emails

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e; // Re-lanzamos la excepción para que el Controller la maneje
        }
    }
}