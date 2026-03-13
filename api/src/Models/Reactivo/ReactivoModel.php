<?php
namespace App\Models\Reactivo;
use PDO;
use App\Utils\Auditoria; 
use App\Models\FormDerivacion\FormDerivacionModel;

class ReactivoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

// ============================================================
    // LÓGICA DE ADMINISTRADOR (BANDEJA DE ENTRADA)
    // ============================================================
    public function getAllByInstitution($instId, $categoryName) {
        $hasWorkflowCols = $this->hasColumn('formularioe', 'EstadoWorkflow')
            && $this->hasColumn('formularioe', 'DerivadoActivo')
            && $this->hasColumn('formularioe', 'IdInstitucionOrigen');
        $hasOwnerTable = $this->hasTable('formulario_owner_actual');

        $workflowSelect = $hasWorkflowCols
            ? "f.EstadoWorkflow, f.DerivadoActivo, f.IdInstitucionOrigen,"
            : "NULL as EstadoWorkflow, 0 as DerivadoActivo, NULL as IdInstitucionOrigen,";
        $originNameSelect = $hasWorkflowCols
            ? "io.NombreInst as InstitucionOrigenNombre,"
            : "NULL as InstitucionOrigenNombre,";
        $ownerSelect = $hasOwnerTable
            ? "foa.IdFormularioDerivacionActiva,"
            : "NULL as IdFormularioDerivacionActiva,";
        $ownerJoin = $hasOwnerTable
            ? "LEFT JOIN formulario_owner_actual foa ON foa.idformA = f.idformA"
            : "";
        $originJoin = $hasWorkflowCols
            ? "LEFT JOIN institucion io ON io.IdInstitucion = f.IdInstitucionOrigen"
            : "";

        $whereInst = "f.IdInstitucion = ?";
        $params = [(int)$instId];
        if ($hasOwnerTable) {
            $whereInst = "(COALESCE(foa.IdInstitucionActual, f.IdInstitucion) = ?)";
            $params = [(int)$instId];
            if ($hasWorkflowCols) {
                $whereInst .= " OR (f.IdInstitucionOrigen = ?)";
                $params[] = (int)$instId;
            }
            $whereInst = "(" . $whereInst . ")";
        } elseif ($hasWorkflowCols) {
            $whereInst = "(f.IdInstitucion = ? OR f.IdInstitucionOrigen = ?)";
            $params = [(int)$instId, (int)$instId];
        }

        $sql = "SELECT 
                    f.idformA, 
                    f.IdUsrA as IdInvestigador,
                    pf.idprotA, 
                    f.estado, 
                    {$workflowSelect}
                    {$originNameSelect}
                    {$ownerSelect}
                    f.fechainicioA as Inicio, 
                    f.fecRetiroA as Retiro, 
                    f.aclaracionadm as Aclaracion, 
                    CONCAT(p.NombreA, ' ', p.ApellidoA) as Investigador,
                    p.EmailA as EmailInvestigador, 
                    p.CelularA as CelularInvestigador,
                    px.nprotA as NProtocolo, 
                    px.tituloA as TituloProtocolo,  /* 🚀 FIX: Para mostrar el título completo */
                    px.protocoloexpe as EsOtrosCeuas,
                    (CASE WHEN d.externodepto = 2 OR (d.externodepto IS NULL AND o.externoorganismo = 2) THEN 2 ELSE 1 END) as DeptoExternoFlag,
                    COALESCE(d.NombreDeptoA, 'Sin departamento') as Departamento,
                    COALESCE(f.depto, pd.iddeptoA) as idDepto,
                    COALESCE(o.NombreOrganismoSimple, '') as Organizacion,
                    t.nombreTipo as TipoNombre,
                    t.color as colorTipo,
                    ins.NombreInsumo as Reactivo, 
                    ins.TipoInsumo as Medida,       /* 🚀 FIX: ml, gr, un... */
                    ins.CantidadInsumo as Presentacion, /* 🚀 FIX: 50, 100, 200... */
                    sex.organo as CantidadReactivo, 
                    sex.totalA as AnimalesUsados,
                    f.quienvisto as QuienVio,       /* 🚀 FIX: El nombre del admin */
                    f.reactivo as idinsumoA         /* 🚀 FIX: El ID real para seleccionar en el modal */
                FROM formularioe f
                INNER JOIN personae p ON f.IdUsrA = p.IdUsrA
                INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                LEFT JOIN protformr pf ON f.idformA = pf.idformA
                {$ownerJoin}
                {$originJoin}
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
                LEFT JOIN departamentoe d ON COALESCE(f.depto, pd.iddeptoA) = d.iddeptoA
                LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                LEFT JOIN insumoexperimental ins ON f.reactivo = ins.IdInsumoexp
                LEFT JOIN sexoe sex ON f.idformA = sex.idformA
                WHERE {$whereInst} 
                AND t.categoriaformulario = ?
                ORDER BY f.idformA DESC";

        $params[] = $categoryName;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    private function hasTable(string $tableName): bool {
        try {
            $stmt = $this->db->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$tableName]);
            return (bool)$stmt->fetch(\PDO::FETCH_NUM);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function hasColumn(string $tableName, string $columnName): bool {
        try {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM `{$tableName}` LIKE ?");
            $stmt->execute([$columnName]);
            return (bool)$stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return false;
        }
    }
    public function getAvailableInsumos($instId) {
        $sql = "SELECT IdInsumoexp as idInsumo, NombreInsumo, TipoInsumo, CantidadInsumo, PrecioInsumo 
                FROM insumoexperimental 
                WHERE IdInstitucion = ? AND habilitado = 1
                ORDER BY NombreInsumo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAvailableProtocols($instId) {
        $sql = "SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA
                FROM protocoloexpe p
                LEFT JOIN protinstr pi ON pi.idprotA = p.idprotA
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
                ORDER BY p.nprotA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId, $instId, $instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getLastNotification($idformA) {
        $sql = "SELECT fecha, NotaNotificacion, estado 
                FROM notificacioncorreo 
                WHERE ID = ? 
                ORDER BY IdNotificacionesCorreo DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function updateQuickStatus($id, $nuevoEstado, $aclaracion, $user) {
        $instId = func_num_args() >= 5 ? (int)func_get_arg(4) : 0;
        if ($instId > 0) {
            FormDerivacionModel::assertInstitutionCanMutate($this->db, (int)$id, $instId);
        }
        $stmt = $this->db->prepare("SELECT f.estado, s.totalA, pf.idprotA FROM formularioe f LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN protformr pf ON f.idformA = pf.idformA WHERE f.idformA = ?");
        $stmt->execute([$id]);
        $current = $stmt->fetch(\PDO::FETCH_ASSOC);

        $oldStatus = strtolower(trim($current['estado'] ?? ''));
        $targetStatus = strtolower(trim($nuevoEstado));
        $cantidad = (int)($current['totalA'] ?? 0);
        $idProt = $current['idprotA'];

        $this->db->beginTransaction();
        try {
            if ($targetStatus === 'suspendido' && $oldStatus !== 'suspendido' && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")->execute([$cantidad, $idProt]);
            } elseif ($oldStatus === 'suspendido' && $targetStatus !== 'suspendido' && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$cantidad, $idProt]);
            }
            $this->db->prepare("UPDATE formularioe SET estado = ?, aclaracionadm = ?, quienvisto = ? WHERE idformA = ?")->execute([$nuevoEstado, $aclaracion, $user, $id]);
            Auditoria::log($this->db, 'UPDATE', 'formularioe', "Cambió estado a $nuevoEstado en Reactivo #$id");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

/**
     * Actualización Completa con Lógica de Stock, Recálculo y Escudo Anti-Errores
     */
    public function updateFull($data) {
        $id = $data['idformA'] ?? null;
        if (!$id) throw new \Exception("ID de formulario no especificado.");
        if (!empty($data['instId'])) {
            FormDerivacionModel::assertInstitutionCanMutate($this->db, (int)$id, (int)$data['instId']);
        }

        $newTotal = (int)($data['totalA'] ?? 0); // Animales descontados
        $newProt = $data['idprotA'] ?? null;
        
        // 🚀 FIX ESCUDO: Buscamos el ID del reactivo en las keys que suele mandar JS
        $idInsumoReactivo = $data['reactivo'] ?? $data['idinsumoA'] ?? $data['IdInsumoexp'] ?? null; 
        
        if (empty($idInsumoReactivo)) {
            // Si llega vacío, frenamos todo para no guardar basura
            throw new \Exception("El ID del reactivo llegó vacío. Datos recibidos: " . json_encode($data));
        }

        $nuevaCantidadReactivo = (float)($data['organo'] ?? 0); 

        $stmtOld = $this->db->prepare("
            SELECT 
                (SELECT totalA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldTotal,
                (SELECT idprotA FROM protformr WHERE idformA = f.idformA LIMIT 1) as oldProt
            FROM formularioe f WHERE f.idformA = ?");
        $stmtOld->execute([$id]);
        $old = $stmtOld->fetch(\PDO::FETCH_ASSOC);
        
        $oldTotal = (int)($old['oldTotal'] ?? 0);
        $oldProt = $old['oldProt'];

        $this->db->beginTransaction();
        try {
            $this->db->prepare("UPDATE formularioe SET reactivo = ?, fechainicioA = ?, fecRetiroA = ?, depto = ? WHERE idformA = ?")
                    ->execute([$idInsumoReactivo, $data['fechainicioA'], $data['fecRetiroA'], !empty($data['depto']) ? $data['depto'] : null, $id]);
            
            $this->db->prepare("UPDATE sexoe SET organo = ?, totalA = ? WHERE idformA = ?")
                    ->execute([$nuevaCantidadReactivo, $newTotal, $id]);

            // RECALCULAR FACTURACIÓN
            $stmtPrecio = $this->db->prepare("SELECT PrecioInsumo FROM insumoexperimental WHERE IdInsumoexp = ?");
            $stmtPrecio->execute([$idInsumoReactivo]);
            $nuevoPrecioUnitario = (float)$stmtPrecio->fetchColumn();

            $nuevoCostoTotal = $nuevoPrecioUnitario * $nuevaCantidadReactivo;
            $sqlPrecio = "UPDATE precioformulario SET precioanimalmomento = ?, precioformulario = ? WHERE idformA = ?";
            $this->db->prepare($sqlPrecio)->execute([$nuevoPrecioUnitario, $nuevoCostoTotal, $id]);

            $this->db->prepare("UPDATE protformr SET idprotA = ? WHERE idformA = ?")
                    ->execute([$newProt, $id]);

            // Devolución y resta de cupos de animales al protocolo
            if ($oldProt == $newProt) {
                $diff = $newTotal - $oldTotal;
                if ($diff != 0 && $newProt) {
                    $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                            ->execute([$diff, $newProt]);
                }
            } else {
                if ($oldProt) {
                    $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")
                            ->execute([$oldTotal, $oldProt]);
                }
                if ($newProt) {
                    $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                            ->execute([$newTotal, $newProt]);
                }
            }

            Auditoria::log($this->db, 'UPDATE_FULL', 'formularioe', "Modificación Admin en Pedido Reactivo #$id");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function getUsageData($idformA) {
        $stmt = $this->db->prepare("SELECT organo, totalA FROM sexoe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idformA]);
        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['organo' => 0, 'totalA' => 0];
    }

    public function saveNotificationAndGetMailDetails($data) {
        $id = $data['idformA'];
        $nota = $data['nota'];
        $instId = $data['instId'];
        $adminId = $data['adminId'];

        $stmtData = $this->db->prepare("SELECT f.estado, pe.EmailA, pe.NombreA, inst.NombreInst FROM formularioe f INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA INNER JOIN institucion inst ON f.IdInstitucion = inst.IdInstitucion WHERE f.idformA = ?");
        $stmtData->execute([$id]);
        $current = $stmtData->fetch(\PDO::FETCH_ASSOC);
        $estadoActual = $current['estado'] ?? 'Sin estado';

        $this->db->prepare("INSERT INTO notificacioncorreo (TipoNotificacion, NotaNotificacion, fecha, ID, IdInstitucion, estado) VALUES (?, ?, NOW(), ?, ?, ?)")->execute(['Reactivo', $nota, $id, $instId, $estadoActual]);

        $sqlDetails = "SELECT pe.EmailA as email_inv, pe.NombreA as investigador, adm.EmailA as email_admin, f.estado, px.nprotA, ins.NombreInsumo as reactivo, ins.TipoInsumo as medida, sx.organo as cantidad, sx.totalA as animales, inst.NombreInst as institucion
            FROM formularioe f
            INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA
            INNER JOIN personae adm ON adm.IdUsrA = ?
            INNER JOIN protformr pf ON f.idformA = pf.idformA
            INNER JOIN protocoloexpe px ON pf.idprotA = px.idprotA
            INNER JOIN insumoexperimental ins ON f.reactivo = ins.IdInsumoexp
            INNER JOIN sexoe sx ON f.idformA = sx.idformA
            INNER JOIN institucion inst ON f.IdInstitucion = inst.IdInstitucion
            WHERE f.idformA = ?";
        $stmtDetails = $this->db->prepare($sqlDetails);
        $stmtDetails->execute([$adminId, $id]);
        return $stmtDetails->fetch(\PDO::FETCH_ASSOC);
    }

    // ============================================================
    // LÓGICA DE INVESTIGADOR (FORMULARIO)
    // ============================================================
    public function getInitialData($instId, $userId) {
        $stmtConfig = $this->db->prepare("SELECT otrosceuas, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtConfig->execute([$instId]);
        $config = $stmtConfig->fetch(PDO::FETCH_ASSOC);

        $stmtUser = $this->db->prepare("SELECT EmailA FROM personae WHERE IdUsrA = ?");
        $stmtUser->execute([$userId]);
        $userEmail = $stmtUser->fetchColumn();

        $stmtProt = $this->db->prepare("SELECT DISTINCT
                                            p.idprotA, p.nprotA, p.tituloA,
                                            p.IdInstitucion as OwnerInstId,
                                            CASE
                                                WHEN p.IdInstitucion = ? THEN 1
                                                WHEN pr.IdProtocoloExpRed IS NULL THEN 0
                                                WHEN pr.IdUsrA IS NULL OR pr.iddeptoA IS NULL OR pr.idtipoprotocolo IS NULL OR pr.IdSeveridadTipo IS NULL THEN 0
                                                WHEN (SELECT COUNT(*) FROM protocoloexpered_especies prs WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed) <= 0 THEN 0
                                                ELSE 1
                                            END as RedConfigCompleta,
                                            COALESCE(pr.IdUsrA, p.IdUsrA) as IdInvestigador,
                                            COALESCE(CONCAT(per.NombreA, ' ', per.ApellidoA), CONCAT('ID:', COALESCE(pr.IdUsrA, p.IdUsrA))) as Responsable
                                        FROM protocoloexpe p
                                        LEFT JOIN protinstr pi ON pi.idprotA = p.idprotA
                                        LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
                                        LEFT JOIN personae per ON per.IdUsrA = COALESCE(pr.IdUsrA, p.IdUsrA)
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
                                        ORDER BY p.nprotA DESC");
        $stmtProt->execute([$instId, $instId, $instId, $instId, $instId, $instId]);

        $stmtIns = $this->db->prepare("SELECT IdInsumoexp, NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumoexperimental WHERE IdInstitucion = ? AND habilitado = 1 ORDER BY NombreInsumo ASC");
        $stmtIns->execute([$instId]);

        $stmtType = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario = 'Otros reactivos biologicos' AND IdInstitucion = ? LIMIT 1");
        $stmtType->execute([$instId]);
        $idTipo = $stmtType->fetchColumn();

        return [
            'config' => $config,
            'user_email' => $userEmail,
            'protocols' => $stmtProt->fetchAll(PDO::FETCH_ASSOC),
            'insumos' => $stmtIns->fetchAll(PDO::FETCH_ASSOC),
            'id_tipo_default' => $idTipo
        ];
    }

    public function getProtocolDetails($protId, $instId = null) {
        $instId = (int)$instId;
        $stmt = $this->db->prepare("SELECT
                                        p.idprotA, p.tituloA, p.nprotA, p.FechaFinProtA,
                                        p.IdInstitucion as OwnerInstId,
                                        CASE
                                            WHEN p.IdInstitucion = ? THEN 1
                                            WHEN pr.IdProtocoloExpRed IS NULL THEN 0
                                            WHEN pr.IdUsrA IS NULL OR pr.iddeptoA IS NULL OR pr.idtipoprotocolo IS NULL OR pr.IdSeveridadTipo IS NULL THEN 0
                                            WHEN (SELECT COUNT(*) FROM protocoloexpered_especies prs WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed) <= 0 THEN 0
                                            ELSE 1
                                        END as RedConfigCompleta,
                                        COALESCE(CONCAT(per.NombreA, ' ', per.ApellidoA), CONCAT('ID:', COALESCE(pr.IdUsrA, p.IdUsrA))) as Responsable,
                                        COALESCE(d.NombreDeptoA, 'Sin departamento') as Depto
                                    FROM protocoloexpe p
                                    LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
                                    LEFT JOIN personae per ON per.IdUsrA = COALESCE(pr.IdUsrA, p.IdUsrA)
                                    LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
                                    LEFT JOIN departamentoe d ON d.iddeptoA = COALESCE(pr.iddeptoA, pd.iddeptoA, p.departamento)
                                    WHERE p.idprotA = ?");
        $stmt->execute([$instId, $instId, $protId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function saveOrder($data) {
        $this->db->beginTransaction();
        try {
            // 1. Traemos SOLO el Nombre y el Precio (Sin controlar stock)
            $stmtStock = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo FROM insumoexperimental WHERE IdInsumoexp = ?");
            $stmtStock->execute([$data['idInsumoExp']]);
            $insumo = $stmtStock->fetch(\PDO::FETCH_ASSOC);

            if (!$insumo) {
                throw new \Exception("El reactivo o insumo seleccionado no existe.");
            }

            $finalDepto = 0;
            if (!empty($data['idprotA'])) {
                $stmtDepto = $this->db->prepare("SELECT COALESCE(pr.iddeptoA, pd.iddeptoA, p.departamento) as iddeptoA
                                                 FROM protocoloexpe p
                                                 LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
                                                 LEFT JOIN protdeptor pd ON pd.idprotA = p.idprotA
                                                 WHERE p.idprotA = ?
                                                 LIMIT 1");
                $stmtDepto->execute([$data['instId'], $data['idprotA']]);
                $finalDepto = $stmtDepto->fetchColumn() ?: 0;
            }

            // 2. Insertamos el Formulario
            $sqlForm = "INSERT INTO formularioe (tipoA, reactivo, fechainicioA, fecRetiroA, aclaraA, IdUsrA, IdInstitucion, estado, visto, depto, raza, pesoA, edadA) VALUES (?, ?, NOW(), ?, ?, ?, ?, 'Sin estado', 0, ?, ?, ?, ?)";
            $this->db->prepare($sqlForm)->execute([$data['idTipoFormulario'], $data['idInsumoExp'], $data['fecha_retiro'], $data['aclaracion'], $data['userId'], $data['instId'], $finalDepto, $data['raza'], $data['peso'], $data['edad']]);
            $idForm = $this->db->lastInsertId();

            // 3. Insertamos Cantidades (organo = cantidad de reactivo)
            $sqlSex = "INSERT INTO sexoe (idformA, organo, machoA, hembraA, indistintoA, totalA) VALUES (?, ?, ?, ?, ?, ?)";
            $this->db->prepare($sqlSex)->execute([$idForm, $data['cantidad'], $data['macho'], $data['hembra'], $data['indistinto'], $data['totalAnimales']]);

            // 🚀 4. CONGELAMOS EL PRECIO Y GUARDAMOS fechaIniForm
            $precioMomento = (float)($insumo['PrecioInsumo'] ?? 0);
            $cantidadPedida = (float)$data['cantidad'];
            $costoTotal = $precioMomento * $cantidadPedida;

            $sqlPrecio = "INSERT INTO precioformulario (idformA, precioanimalmomento, precioformulario, totalpago, fechaIniForm) VALUES (?, ?, ?, 0, CURDATE())";
            $this->db->prepare($sqlPrecio)->execute([$idForm, $precioMomento, $costoTotal]);

            // 5. Resto de la lógica (Protocolos, Auditoría)
            if (empty($data['is_external']) || $data['is_external'] == 0) {
                $this->db->prepare("INSERT INTO protformr (idformA, idprotA) VALUES (?, ?)")->execute([$idForm, $data['idprotA']]);
                if ($data['totalAnimales'] > 0) {
                    $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$data['totalAnimales'], $data['idprotA']]);
                }
            }

            // Ya no restamos stock de insumoexperimental.

            Auditoria::log($this->db, 'INSERT', 'formularioe', "Solicitó Reactivo Biológico #$idForm (" . $insumo['NombreInsumo'] . ")");
            
            $this->db->commit();
            return ['id' => $idForm, 'insumoName' => $insumo['NombreInsumo']];
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function getUserAndInstInfo($userId, $instId) {
        $stmt = $this->db->prepare("SELECT p.EmailA, p.NombreA, i.NombreInst, COALESCE(NULLIF(TRIM(p.idioma_preferido), ''), 'es') as idioma_preferido FROM personae p JOIN institucion i ON i.IdInstitucion = ? WHERE p.IdUsrA = ?");
        $stmt->execute([$instId, $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getDataForTarifario($instId) {
        $stmtInst = $this->db->prepare("SELECT NombreInst, PrecioJornadaTrabajoExp, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$instId]);
        $institucion = $stmtInst->fetch(PDO::FETCH_ASSOC);

        $stmtEsp = $this->db->prepare("SELECT idespA, EspeNombreA, Panimal, PalojamientoChica, PalojamientoGrande FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA");
        $stmtEsp->execute([$instId]);

        $stmtSub = $this->db->prepare("SELECT idsubespA, idespA, SubEspeNombreA, Psubanimal, Existe FROM subespecie WHERE Existe != 2");
        $stmtSub->execute();

        $stmtInsExp = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumoexperimental WHERE IdInstitucion = ? AND habilitado = 1");
        $stmtInsExp->execute([$instId]);
        
        $stmtIns = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumo WHERE IdInstitucion = ? AND Existencia = 1");
        $stmtIns->execute([$instId]);

        return [
            'institucion' => $institucion,
            'especies' => $stmtEsp->fetchAll(PDO::FETCH_ASSOC),
            'subespecies' => $stmtSub->fetchAll(PDO::FETCH_ASSOC),
            'insumosExp' => $stmtInsExp->fetchAll(PDO::FETCH_ASSOC),
            'insumos' => $stmtIns->fetchAll(PDO::FETCH_ASSOC)
        ];
    }
}