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
            SELECT DISTINCT
                p.idprotA,
                p.nprotA,
                p.tituloA,
                p.IdInstitucion as OwnerInstId,
                CASE
                    WHEN p.IdInstitucion = ? THEN 1
                    WHEN pr.IdProtocoloExpRed IS NULL THEN 0
                    WHEN pr.IdUsrA IS NULL OR pr.iddeptoA IS NULL OR pr.idtipoprotocolo IS NULL OR pr.IdSeveridadTipo IS NULL THEN 0
                    WHEN (SELECT COUNT(*) FROM protocoloexpered_especies prs WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed) <= 0 THEN 0
                    ELSE 1
                END as RedConfigCompleta,
                COALESCE(CONCAT(per.ApellidoA, ', ', per.NombreA), CONCAT('ID:', COALESCE(pr.IdUsrA, p.IdUsrA))) as Responsable,
                COALESCE(d.NombreDeptoA, 'Sin departamento') as DeptoNombre,
                COALESCE(pr.iddeptoA, pd.iddeptoA, p.departamento) as IdDepto
            FROM protocoloexpe p
            LEFT JOIN protinstr pi ON pi.idprotA = p.idprotA
            LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
            LEFT JOIN personae per ON per.IdUsrA = COALESCE(pr.IdUsrA, p.IdUsrA)
            LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON d.iddeptoA = COALESCE(pr.iddeptoA, pd.iddeptoA, p.departamento)
            WHERE p.FechaFinProtA >= CURDATE()
              AND (
                (
                    p.IdInstitucion = ?
                    AND (
                        NOT EXISTS (
                            SELECT 1 FROM solicitudprotocolo s0
                            WHERE s0.idprotA = p.idprotA AND s0.TipoPedido = 1
                        )
                        OR EXISTS (
                            SELECT 1 FROM solicitudprotocolo s1
                            WHERE s1.idprotA = p.idprotA AND s1.TipoPedido = 1 AND s1.Aprobado = 1
                        )
                    )
                )
                OR
                (
                    pi.IdInstitucion = ?
                    AND p.IdInstitucion <> ?
                    AND EXISTS (
                        SELECT 1 FROM solicitudprotocolo sr
                        WHERE sr.idprotA = p.idprotA
                          AND sr.TipoPedido = 2
                          AND sr.IdInstitucion = ?
                          AND sr.Aprobado = 1
                    )
                )
              )
            ORDER BY p.nprotA DESC
        ");
        $stmtProt->execute([$instId, $instId, $instId, $instId, $instId, $instId]);

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
                $stmtDepto = $this->db->prepare("SELECT COALESCE(pr.iddeptoA, pd.iddeptoA, p.departamento) as iddeptoA
                                                 FROM protocoloexpe p
                                                 LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
                                                 LEFT JOIN protdeptor pd ON pd.idprotA = p.idprotA
                                                 WHERE p.idprotA = ?
                                                 LIMIT 1");
                $stmtDepto->execute([$data['instId'], $data['idProt']]);
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