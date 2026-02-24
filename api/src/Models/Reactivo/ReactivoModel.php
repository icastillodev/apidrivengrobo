<?php
namespace App\Models\Reactivo;
use PDO;

class ReactivoModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Obtiene los reactivos filtrando por la categoría 'Otros reactivos biologicos'
     * vinculando tipoA de formularioe con IdTipoFormulario
     */
    public function getAllByInstitution($instId, $categoryName) {
        $sql = "SELECT 
                    f.idformA, 
                    pf.idprotA,
                    f.estado, 
                    f.fechainicioA as Inicio, 
                    f.fecRetiroA as Retiro, 
                    f.aclaracionadm as Aclaracion,
                    CONCAT(p.NombreA, ' ', p.ApellidoA) as Investigador,
                    p.EmailA as EmailInvestigador,      -- Agregado para el modal
                    p.CelularA as CelularInvestigador,  -- Agregado para el modal
                    px.nprotA as NProtocolo,
                    px.protocoloexpe as EsOtrosCeuas,
                    COALESCE(d.NombreDeptoA, 'Sin departamento') as Departamento, -- En lugar de Especie
                    ins.NombreInsumo as Reactivo,
                    ins.TipoInsumo as Medida,         
                    sex.organo as CantidadReactivo,   
                    sex.totalA as AnimalesUsados      
                FROM formularioe f
                INNER JOIN personae p ON f.IdUsrA = p.IdUsrA
                INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                LEFT JOIN protformr pf ON f.idformA = pf.idformA
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                -- Joins para obtener el Departamento del Protocolo
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
    // api/src/Models/Reactivo/ReactivoModel.php

/**
 * Trae todos los insumos disponibles de la entidad insumoexperimental
 */
public function getAvailableInsumos($instId) {
    $sql = "SELECT IdInsumoexp, NombreInsumo, TipoInsumo 
            FROM insumoexperimental 
            WHERE IdInstitucion = ? AND habilitado = 1
            ORDER BY NombreInsumo ASC";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId]);
    return $stmt->fetchAll(\PDO::FETCH_ASSOC);
}
/**
 * Recupera la última notificación leyendo el estado directamente de notificacioncorreo
 */
public function getLastNotification($idformA) {
    // Ya no necesitamos el JOIN con formularioe para el estado
    $sql = "SELECT fecha, NotaNotificacion, estado 
            FROM notificacioncorreo 
            WHERE ID = ? 
            ORDER BY IdNotificacionesCorreo DESC LIMIT 1";
            
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idformA]);
    return $stmt->fetch(\PDO::FETCH_ASSOC);
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
        /**
         * Actualización de Estado con Lógica de Suspensión
         */
public function updateQuickStatus($id, $nuevoEstado, $aclaracion, $user) {
        $stmt = $this->db->prepare("
            SELECT f.estado, s.totalA, pf.idprotA 
            FROM formularioe f 
            LEFT JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN protformr pf ON f.idformA = pf.idformA
            WHERE f.idformA = ?");
        $stmt->execute([$id]);
        $current = $stmt->fetch(\PDO::FETCH_ASSOC);

        $oldStatus = strtolower(trim($current['estado'] ?? ''));
        $targetStatus = strtolower(trim($nuevoEstado));
        $cantidad = (int)($current['totalA'] ?? 0);
        $idProt = $current['idprotA'];

        $this->db->beginTransaction();
        try {
            if ($targetStatus === 'suspendido' && $oldStatus !== 'suspendido' && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")
                        ->execute([$cantidad, $idProt]);
            } 
            elseif ($oldStatus === 'suspendido' && $targetStatus !== 'suspendido' && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                        ->execute([$cantidad, $idProt]);
            }

            $sql = "UPDATE formularioe SET estado = ?, aclaracionadm = ?, quienvisto = ? WHERE idformA = ?";
            $this->db->prepare($sql)->execute([$nuevoEstado, $aclaracion, $user, $id]);

            \App\Utils\Auditoria::log($this->db, 'UPDATE', 'formularioe', "Cambió estado a $nuevoEstado en Reactivo #$id");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }
                /**
         * Actualización Completa con Lógica de Stock de Animales
         */
public function updateFull($data) {
        $id = $data['idformA'];
        $newTotal = (int)($data['totalA'] ?? 0);
        $newProt = $data['idprotA'];

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
                    ->execute([$data['idinsumoA'], $data['fechainicioA'], $data['fecRetiroA'], $id]);
            
            $this->db->prepare("UPDATE sexoe SET organo = ?, totalA = ? WHERE idformA = ?")
                    ->execute([$data['organo'], $newTotal, $id]);

            $this->db->prepare("UPDATE protformr SET idprotA = ? WHERE idformA = ?")
                    ->execute([$newProt, $id]);

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

            \App\Utils\Auditoria::log($this->db, 'UPDATE_FULL', 'formularioe', "Modificación Admin en Pedido Reactivo #$id");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }
        public function getSexData($id) {
        // Añadimos 'organo' a la consulta para traer la cantidad solicitada
        $stmt = $this->db->prepare("SELECT machoA, hembraA, indistintoA, totalA, organo FROM sexoe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    public function getUsageData($idformA) {
    $sql = "SELECT organo, totalA FROM sexoe WHERE idformA = ? LIMIT 1";
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$idformA]);
    return $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['organo' => 0, 'totalA' => 0];
    }


/**
 * Guarda la notificación incluyendo el ESTADO y recupera detalles para el mail.
 */
public function saveNotificationAndGetMailDetails($data) {
    $id = $data['idformA'];
    $nota = $data['nota'];
    $instId = $data['instId'];
    $adminId = $data['adminId'];

    // 1. Primero obtenemos el estado actual y datos del investigador para el mail
    $sqlData = "SELECT f.estado, pe.EmailA, pe.NombreA, inst.NombreInst 
                FROM formularioe f 
                INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA
                INNER JOIN institucion inst ON f.IdInstitucion = inst.IdInstitucion
                WHERE f.idformA = ?";
    $stmtData = $this->db->prepare($sqlData);
    $stmtData->execute([$id]);
    $current = $stmtData->fetch(\PDO::FETCH_ASSOC);

    $estadoActual = $current['estado'] ?? 'Sin estado';

    // 2. Registro histórico con el nuevo atributo "estado"
    $sqlInsert = "INSERT INTO notificacioncorreo (TipoNotificacion, NotaNotificacion, fecha, ID, IdInstitucion, estado) 
                  VALUES (?, ?, NOW(), ?, ?, ?)";
    $stmt = $this->db->prepare($sqlInsert);
    $stmt->execute(['Reactivo', $nota, $id, $instId, $estadoActual]);

    // 3. Devolvemos los detalles completos para el Controller (PHPMailer)
    // Agregamos los JOINS necesarios para los detalles técnicos
    $sqlDetails = "SELECT 
                pe.EmailA as email_inv,
                pe.NombreA as investigador,
                adm.EmailA as email_admin,
                f.estado,
                px.nprotA,
                ins.NombreInsumo as reactivo,
                ins.TipoInsumo as medida,
                sx.organo as cantidad,
                sx.totalA as animales,
                inst.NombreInst as institucion
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



}