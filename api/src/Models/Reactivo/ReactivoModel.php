<?php
namespace App\Models\Reactivo;
use PDO;
use App\Utils\Auditoria; 

class ReactivoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

// ============================================================
    // LÓGICA DE ADMINISTRADOR (BANDEJA DE ENTRADA)
    // ============================================================
    public function getAllByInstitution($instId, $categoryName) {
        $sql = "SELECT 
                    f.idformA, 
                    f.IdUsrA as IdInvestigador,
                    pf.idprotA, 
                    f.estado, 
                    f.fechainicioA as Inicio, 
                    f.fecRetiroA as Retiro, 
                    f.aclaracionadm as Aclaracion, 
                    CONCAT(p.NombreA, ' ', p.ApellidoA) as Investigador,
                    p.EmailA as EmailInvestigador, 
                    p.CelularA as CelularInvestigador,
                    px.nprotA as NProtocolo, 
                    px.tituloA as TituloProtocolo,  /* 🚀 FIX: Para mostrar el título completo */
                    px.protocoloexpe as EsOtrosCeuas,
                    COALESCE(d.NombreDeptoA, 'Sin departamento') as Departamento,
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
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
                LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA
                LEFT JOIN insumoexperimental ins ON f.reactivo = ins.IdInsumoexp
                LEFT JOIN sexoe sex ON f.idformA = sex.idformA
                WHERE f.IdInstitucion = ? 
                AND t.categoriaformulario = ?
                ORDER BY f.idformA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $categoryName]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
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
        $sql = "SELECT p.idprotA, p.nprotA, p.tituloA 
                FROM protocoloexpe p
                LEFT JOIN solicitudprotocolo s ON p.idprotA = s.idprotA
                WHERE p.IdInstitucion = ? 
                AND (s.Aprobado = 1 OR s.idprotA IS NULL)
                ORDER BY p.nprotA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
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
            $this->db->prepare("UPDATE formularioe SET reactivo = ?, fechainicioA = ?, fecRetiroA = ? WHERE idformA = ?")
                    ->execute([$idInsumoReactivo, $data['fechainicioA'], $data['fecRetiroA'], $id]);
            
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

        $stmtProt = $this->db->prepare("SELECT p.idprotA, p.nprotA, p.tituloA, p.IdUsrA as IdInvestigador, CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable FROM protocoloexpe p INNER JOIN personae per ON p.IdUsrA = per.IdUsrA WHERE p.IdInstitucion = ? AND p.FechaFinProtA >= CURDATE() ORDER BY p.nprotA DESC");
        $stmtProt->execute([$instId]);

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

    public function getProtocolDetails($protId) {
        $stmt = $this->db->prepare("SELECT p.idprotA, p.tituloA, p.nprotA, p.FechaFinProtA, CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable, COALESCE(d.NombreDeptoA, 'Sin departamento') as Depto FROM protocoloexpe p INNER JOIN personae per ON p.IdUsrA = per.IdUsrA LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA WHERE p.idprotA = ?");
        $stmt->execute([$protId]);
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
                $stmtDepto = $this->db->prepare("SELECT iddeptoA FROM protdeptor WHERE idprotA = ? LIMIT 1");
                $stmtDepto->execute([$data['idprotA']]);
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
        $stmt = $this->db->prepare("SELECT p.EmailA, p.NombreA, i.NombreInst FROM personae p JOIN institucion i ON i.IdInstitucion = ? WHERE p.IdUsrA = ?");
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