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

        // 4. Protocolos vigentes (para flujo nuevo por protocolo)
        $stmtProt = $this->db->prepare("
            SELECT 
                p.idprotA,
                p.nprotA,
                p.tituloA,
                CONCAT(per.ApellidoA, ', ', per.NombreA) as Responsable,
                COALESCE(d.NombreDeptoA, 'Sin departamento') as DeptoNombre,
                pd.iddeptoA as IdDepto
            FROM protocoloexpe p
            INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
            LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA
            WHERE p.IdInstitucion = ? AND p.FechaFinProtA >= CURDATE()
            ORDER BY p.nprotA DESC
        ");
        $stmtProt->execute([$instId]);

        // 5. Tipo de Formulario (Busca el ID correspondiente a la categoría 'Insumos')
        $stmtType = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario = 'Insumos' AND IdInstitucion = ? LIMIT 1");
        $stmtType->execute([$instId]);

        return [
            'institucion' => $institucion,
            'departamentos' => $stmtDepto->fetchAll(PDO::FETCH_ASSOC),
            'insumos' => $stmtIns->fetchAll(PDO::FETCH_ASSOC),
            'protocolos' => $stmtProt->fetchAll(PDO::FETCH_ASSOC),
            'id_tipo_default' => $stmtType->fetchColumn()
        ];
    }

    /**
     * Guarda el pedido completo en una transacción
     */
    public function saveOrder($data) {
        $this->db->beginTransaction();
        try {
            // Determinar departamento final: si viene protocolo, lo usamos como fuente
            $finalDepto = 0;
            if (!empty($data['idProt'])) {
                $stmtDepto = $this->db->prepare("SELECT iddeptoA FROM protdeptor WHERE idprotA = ? LIMIT 1");
                $stmtDepto->execute([$data['idProt']]);
                $finalDepto = $stmtDepto->fetchColumn() ?: 0;
            } elseif (!empty($data['idDepto'])) {
                $finalDepto = $data['idDepto'];
            }

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
                $finalDepto     
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

            // Vincular formulario con protocolo (formato nuevo)
            if (!empty($data['idProt'])) {
                $this->db->prepare("INSERT INTO protformr (idformA, idprotA) VALUES (?, ?)")->execute([$idForm, $data['idProt']]);
            }

            \App\Utils\Auditoria::log($this->db, 'INSERT', 'formularioe', "Nuevo Pedido de Insumos Generales #$idForm");
            
            $this->db->commit();
            return [
                'id' => $idForm,
                'idDepto' => $finalDepto
            ]; 
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e; 
        }
    }
}