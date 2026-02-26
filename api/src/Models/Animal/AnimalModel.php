<?php
namespace App\Models\Animal;

use PDO;
use App\Utils\Auditoria;

class AnimalModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

// api/src/Models/Animal/AnimalModel.php

public function getByInstitution($instId) {
    $sql = "SELECT 
                f.idformA, f.fechainicioA as Inicio, f.fecRetiroA as Retiro, 
                f.aclaraA as Aclaracion, f.estado, f.quienvisto as QuienVio, 
                f.edadA as Edad, f.pesoA as Peso, f.aclaracionadm as AclaracionAdm,
                f.IdUsrA as IdInvestigador, f.idsubespA,
                CONCAT(pe.ApellidoA, ' ', pe.NombreA) as Investigador,
                pe.EmailA as EmailInvestigador, pe.CelularA as CelularInvestigador,
                tf.nombreTipo as TipoNombre,
                px.nprotA as NProtocolo, px.idprotA,
                -- Atributo protocoloexpe = 1 identifica Otros CEUAs
                px.protocoloexpe as IsExterno, 
                COALESCE(d.NombreDeptoA, 'Sin departamento') as DeptoProtocolo,
                CONCAT(e.EspeNombreA, ' - ', se.SubEspeNombreA) as CatEspecie, 
                COALESCE(s.machoA, 0) as machoA, COALESCE(s.hembraA, 0) as hembraA, 
                COALESCE(s.indistintoA, 0) as indistintoA, COALESCE(s.totalA, 0) as CantAnimal,
                se.Psubanimal as PrecioUnit 
            FROM formularioe f
            INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA
            LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA 
            LEFT JOIN especiee e ON se.idespA = e.idespA
            LEFT JOIN protformr pf ON f.idformA = pf.idformA
            LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
            LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA
            LEFT JOIN sexoe s ON f.idformA = s.idformA
            WHERE f.IdInstitucion = ? 
              AND tf.categoriaformulario = 'Animal vivo'
            ORDER BY f.idformA DESC";
    
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
    // api/src/Models/Animal/AnimalModel.php

    // Obtener la última notificación del registro
    public function getLastNotification($id) {
        $sql = "SELECT fecha, NotaNotificacion 
                FROM notificacioncorreo 
                WHERE ID = ? AND TipoNotificacion = 'Formulario Animales' 
                ORDER BY IdNotificacionesCorreo DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

public function updateStatus($data) {
        $id = $data['idformA'] ?? null;
        if (!$id) return false;

        $nuevoEstado = $data['estado'] ?? 'Sin estado';
        $aclaracion = $data['aclaracionadm'] ?? ''; 
        $quien = $data['quienvisto'] ?? 'Admin';

        $stmtOld = $this->db->prepare("SELECT estado, (SELECT totalA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as cant, (SELECT idprotA FROM protformr WHERE idformA = f.idformA LIMIT 1) as idprot FROM formularioe f WHERE f.idformA = ?");
        $stmtOld->execute([$id]);
        $oldRow = $stmtOld->fetch(\PDO::FETCH_ASSOC);

        if (!$oldRow) return false;

        $oldStatus = $oldRow['estado'] ?? 'Sin estado';
        $cantidad = (int)($oldRow['cant'] ?? 0);
        $idProt = $oldRow['idprot'];

        $this->db->beginTransaction();
        try {
            $isNewSuspended = (strtolower(trim($nuevoEstado)) === 'suspendido');
            $isOldSuspended = (strtolower(trim($oldStatus)) === 'suspendido');

            if ($isNewSuspended && !$isOldSuspended && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")->execute([$cantidad, $idProt]);
            } elseif (!$isNewSuspended && $isOldSuspended && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$cantidad, $idProt]);
            }

            $sql = "UPDATE formularioe SET estado = ?, aclaracionadm = ?, quienvisto = ? WHERE idformA = ?";
            $this->db->prepare($sql)->execute([$nuevoEstado, $aclaracion, $quien, $id]);

            Auditoria::log($this->db, 'UPDATE', 'formularioe', "Cambió estado de Pedido de Animales #$id a: $nuevoEstado");
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function saveNotification($data) {
        $sql = "INSERT INTO notificacioncorreo (TipoNotificacion, NotaNotificacion, fecha, ID, IdInstitucion) 
                VALUES ('Formulario Animales', ?, CURRENT_TIMESTAMP, ?, ?)";
        $stmt = $this->db->prepare($sql);
        // Nota, ID del formulario, ID de institución
        return $stmt->execute([$data['nota'], $data['idformA'], $data['instId']]);
    }

    public function getPendingCount($instId) {
    $sql = "SELECT COUNT(*) as total 
            FROM formularioe f
            INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            WHERE f.IdInstitucion = ? 
            AND tf.categoriaformulario = 'Animal vivo'
            AND (f.estado IS NULL OR f.estado = '' OR LOWER(f.estado) = 'sin estado')";
            
    $stmt = $this->db->prepare($sql);
    $stmt->execute([$instId]);
    return $stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;
    }

    // api/src/Models/Animal/AnimalModel.php

    public function getFormData($instId) {
        $stmtTypes = $this->db->prepare("SELECT IdTipoFormulario, nombreTipo, exento, descuento FROM tipoformularios WHERE IdInstitucion = ? AND categoriaformulario = 'Animal vivo'");
        $stmtTypes->execute([$instId]);
        
        $stmtProt = $this->db->prepare("SELECT idprotA, nprotA, tituloA, protocoloexpe as IsExterno FROM protocoloexpe WHERE IdInstitucion = ?");
        $stmtProt->execute([$instId]);

        return [
            'types' => $stmtTypes->fetchAll(\PDO::FETCH_ASSOC),
            'protocols' => $stmtProt->fetchAll(\PDO::FETCH_ASSOC)
        ];
    }

    public function getSexData($id) {
        // Obtenemos machos, hembras, indistintos y total de la tabla sexoe
        $stmt = $this->db->prepare("SELECT machoA, hembraA, indistintoA, totalA FROM sexoe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    // api/src/Models/Animal/AnimalModel.php

/**
 * Guarda la modificación completa de un formulario de animales.
 * Actualiza formularioe, sexoe, protformr y ajusta el stock en protocoloexpe.
 */
public function updateFull($data) {
        $id = $data['idformA'] ?? null;
        if (!$id) return false;

        $newTotal = (int)($data['totalA'] ?? 0);
        $newProt = $data['idprotA'] ?? null;
        $idSubesp = $data['idsubespA'] ?? null;

        $stmtOld = $this->db->prepare("SELECT (SELECT totalA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldTotal, (SELECT idprotA FROM protformr WHERE idformA = f.idformA LIMIT 1) as oldProt FROM formularioe f WHERE f.idformA = ?");
        $stmtOld->execute([$id]);
        $old = $stmtOld->fetch(\PDO::FETCH_ASSOC);
        
        $oldTotal = (int)($old['oldTotal'] ?? 0);
        $oldProt = $old['oldProt'];

        $this->db->beginTransaction();
        try {
            $sqlForm = "UPDATE formularioe SET tipoA = ?, idsubespA = ?, edadA = ?, pesoA = ?, fechainicioA = ?, fecRetiroA = ? WHERE idformA = ?";
            $this->db->prepare($sqlForm)->execute([$data['tipoA'] ?? null, $idSubesp, $data['edadA'] ?? '', $data['pesoA'] ?? '', $data['fechainicioA'] ?? null, $data['fecRetiroA'] ?? null, $id]);

            $sqlSexo = "UPDATE sexoe SET machoA = ?, hembraA = ?, indistintoA = ?, totalA = ? WHERE idformA = ?";
            $this->db->prepare($sqlSexo)->execute([$data['machoA'] ?? 0, $data['hembraA'] ?? 0, $data['indistintoA'] ?? 0, $newTotal, $id]);

            $this->db->prepare("UPDATE protformr SET idprotA = ? WHERE idformA = ?")->execute([$newProt, $id]);

            if ($oldProt == $newProt) {
                $diff = $newTotal - $oldTotal;
                if ($diff != 0 && $newProt) {
                    $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$diff, $newProt]);
                }
            } else {
                if ($oldProt) $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")->execute([$oldTotal, $oldProt]);
                if ($newProt) $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$newTotal, $newProt]);
            }

            Auditoria::log($this->db, 'UPDATE_FULL', 'formularioe', "Modificación Administrativa de Pedido de Animales #$id");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    /**
     * Obtiene las especies y subespecies aprobadas para un protocolo
     */
    public function getSpeciesByProtocol($protId) {
        $sql = "SELECT 
                    se.idsubespA, 
                    se.SubEspeNombreA, 
                    e.EspeNombreA, 
                    se.Psubanimal, 
                    se.existe
                FROM protesper pe
                INNER JOIN subespecie se ON pe.idespA = se.idespA
                INNER JOIN especiee e ON se.idespA = e.idespA
                WHERE pe.idprotA = ? AND se.existe != 2";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$protId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

/**
     * Guarda la notificación y prepara el objeto de datos para el email.
     * ADAPTADO PARA ANIMALES (Especies/Subespecies)
     */
    public function saveNotificationAndGetMailDetails($data) {
        $id = $data['idformA'];
        $nota = $data['nota'];
        $instId = $data['instId'];
        $adminId = $data['adminId'];

        // 1. Registro histórico en la tabla de notificaciones
        // Usamos 'Formulario Animales' como TipoNotificacion
        $stmt = $this->db->prepare("INSERT INTO notificacioncorreo (TipoNotificacion, NotaNotificacion, fecha, ID, IdInstitucion, estado) 
                                    VALUES ('Formulario Animales', ?, NOW(), ?, ?, ?)");
        
        // Primero obtenemos el estado actual para guardarlo en el historial
        $stmtState = $this->db->prepare("SELECT estado FROM formularioe WHERE idformA = ?");
        $stmtState->execute([$id]);
        $currentState = $stmtState->fetchColumn() ?: 'Sin estado';

        $stmt->execute([$nota, $id, $instId, $currentState]);

        // 2. Consulta de datos para el cuerpo del correo
        // Joins adaptados para ANIMALES (subespecie, especiee, sexoe)
        $sql = "SELECT 
                    pe.EmailA as email_inv,
                    pe.NombreA as investigador,
                    adm.EmailA as email_admin,
                    f.estado,
                    px.nprotA,
                    -- Concatenamos Especie y Cepa
                    CONCAT(e.EspeNombreA, ' - ', se.SubEspeNombreA) as especie_completa,
                    sx.totalA as total_animales,
                    i.NombreInst as institucion
                FROM formularioe f
                INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA
                LEFT JOIN personae adm ON adm.IdUsrA = ?
                LEFT JOIN protformr pf ON f.idformA = pf.idformA
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                -- Relación de Especies
                LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA
                LEFT JOIN especiee e ON se.idespA = e.idespA
                -- Relación de Cantidades
                LEFT JOIN sexoe sx ON f.idformA = sx.idformA
                INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                WHERE f.idformA = ?";
                
        $stmtData = $this->db->prepare($sql);
        $stmtData->execute([$adminId, $id]);
        return $stmtData->fetch(PDO::FETCH_ASSOC);
    }


    /* INVESTIGADOR */

    // ************************************************************************
    // 1. BÚSQUEDA Y CONFIGURACIÓN INICIAL
    // ************************************************************************
    
// --- CAMBIO 1: Traer Tipos de Formulario ---
    public function getActiveProtocolsForUser($instId, $userId) {
        // A. Configuración
        $stmtConfig = $this->db->prepare("SELECT otrosceuas, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtConfig->execute([$instId]);
        $config = $stmtConfig->fetch(\PDO::FETCH_ASSOC);

        // B. Protocolos
        $sql = "SELECT 
                    p.idprotA, p.nprotA, p.tituloA, 
                    CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable
                FROM protocoloexpe p
                INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
                WHERE p.IdInstitucion = ? 
                AND p.FechaFinProtA >= CURDATE() 
                AND p.CantidadAniA > 0 
                ORDER BY p.nprotA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        
        // C. Email Usuario
        $stmtUser = $this->db->prepare("SELECT EmailA FROM personae WHERE IdUsrA = ?");
        $stmtUser->execute([$userId]);
        $userEmail = $stmtUser->fetchColumn();

        // D. TIPOS DE FORMULARIO (NUEVO)
        // Filtramos por Categoria = 'Animal vivo' e Institución
        $stmtTypes = $this->db->prepare("
            SELECT IdTipoFormulario, nombreTipo 
            FROM tipoformularios 
            WHERE categoriaformulario = 'Animal vivo' 
            AND IdInstitucion = ?
            ORDER BY nombreTipo ASC
        ");
        $stmtTypes->execute([$instId]);
        $formTypes = $stmtTypes->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'config' => $config,
            'protocols' => $stmt->fetchAll(\PDO::FETCH_ASSOC),
            'user_email' => $userEmail,
            'form_types' => $formTypes // <--- Enviamos la lista al JS
        ];
    }

    // ************************************************************************
    // 2. DETALLE Y ÁRBOL DE ESPECIES (CASCADA)
    // ************************************************************************

    /**
     * Obtiene info detallada de un protocolo y sus especies permitidas.
     */
public function getDetailsAndSpecies($protId) {
        // A. Info General (Igual que antes)
        $stmtInfo = $this->db->prepare("
            SELECT 
                p.idprotA, p.tituloA, p.nprotA, p.CantidadAniA as saldo, p.FechaFinProtA,
                CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable,
                COALESCE(d.NombreDeptoA, 'Sin departamento') as Depto,
                (SELECT COALESCE(SUM(s.totalA), 0) FROM protformr pf JOIN sexoe s ON pf.idformA = s.idformA WHERE pf.idprotA = p.idprotA) as usados
            FROM protocoloexpe p
            INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
            LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA
            WHERE p.idprotA = ?
        ");
        $stmtInfo->execute([$protId]);
        $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);

        // B. Especies y Subespecies (CORREGIDO)
        // Solo trae lo que está en 'protesper' Y tiene subespecies activas (Existe != 2)
        $sqlEsp = "SELECT 
                    e.idespA, 
                    e.EspeNombreA,
                    s.idsubespA, 
                    s.SubEspeNombreA
                   FROM protesper pe
                   INNER JOIN especiee e ON pe.idespA = e.idespA
                   INNER JOIN subespecie s ON e.idespA = s.idespA
                   WHERE pe.idprotA = ? 
                   AND s.Existe != 2  -- Regla de Oro: Solo activas
                   ORDER BY e.EspeNombreA ASC, s.SubEspeNombreA ASC";
        
        $stmtEsp = $this->db->prepare($sqlEsp);
        $stmtEsp->execute([$protId]);
        $rows = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);

        return ['info' => $info, 'species' => $this->buildSpeciesTree($rows)];
    }

    // HELPER: Agrupa las filas planas en un árbol JSON
    private function buildSpeciesTree($rows) {
        $tree = [];
        foreach ($rows as $r) {
            $idEsp = $r['idespA'];
            
            // Si es la primera vez que vemos esta especie, la creamos
            if (!isset($tree[$idEsp])) {
                $tree[$idEsp] = [
                    'id' => $idEsp,
                    'name' => $r['EspeNombreA'],
                    'subs' => []
                ];
            }

            // Agregamos la subespecie a su lista
            $tree[$idEsp]['subs'][] = [
                'id' => $r['idsubespA'],
                'name' => $r['SubEspeNombreA']
            ];
        }
        // Reindexamos para que JS reciba un array limpio: [ {especie...}, {especie...} ]
        return array_values($tree);
    }
    /**
     * Para modo "Otros CEUAS": Trae TODAS las especies de la institución.
     */
    public function getAllSpeciesForInst($instId) {
        $sql = "SELECT 
                    e.idespA, e.EspeNombreA,
                    s.idsubespA, s.SubEspeNombreA
                FROM especiee e
                INNER JOIN subespecie s ON e.idespA = s.idespA
                WHERE e.IdInstitucion = ? AND s.Existe = 1
                ORDER BY e.EspeNombreA, s.SubEspeNombreA";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Devolvemos solo el árbol, sin info de protocolo
        return $this->buildSpeciesTree($rows);
    }

    // ************************************************************************
    // 3. LÓGICA DE GUARDADO TRANSACCIONAL
    // ************************************************************************

// --- CAMBIO 2: Guardar el ID numérico del Depto ---
public function saveOrder($data) {
        $this->db->beginTransaction();
        try {
            $stmtCheck = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE IdTipoFormulario = ? AND categoriaformulario = 'Animal vivo' AND IdInstitucion = ?");
            $stmtCheck->execute([$data['idTipoFormulario'], $data['instId']]);
            
            if (!$stmtCheck->fetchColumn()) throw new \Exception("Error: El tipo de formulario seleccionado no es válido.");

            $finalDepto = 0;
            if (!empty($data['idprotA'])) {
                $stmtDepto = $this->db->prepare("SELECT iddeptoA FROM protdeptor WHERE idprotA = ? LIMIT 1");
                $stmtDepto->execute([$data['idprotA']]);
                $finalDepto = $stmtDepto->fetchColumn() ?: 0;
            }
            if ($finalDepto == 0) {
                $stmtUserLab = $this->db->prepare("SELECT LabA FROM personae WHERE IdUsrA = ?");
                $stmtUserLab->execute([$data['userId']]);
                $lab = $stmtUserLab->fetchColumn();
                if (is_numeric($lab)) $finalDepto = $lab;
            }

            $sqlForm = "INSERT INTO formularioe (tipoA, idsubespA, edadA, pesoA, fechainicioA, fecRetiroA, aclaraA, IdUsrA, IdInstitucion, estado, raza, visto, depto) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'Sin estado', ?, 0, ?)";
            $this->db->prepare($sqlForm)->execute([$data['idTipoFormulario'], $data['idsubespA'], $data['edad'], $data['peso'], $data['fecha_retiro'], $data['aclaracion'], $data['userId'], $data['instId'], $data['raza'], $finalDepto]);
            $idForm = $this->db->lastInsertId();

            $this->db->prepare("INSERT INTO sexoe (idformA, machoA, hembraA, indistintoA, totalA) VALUES (?, ?, ?, ?, ?)")->execute([$idForm, $data['macho'], $data['hembra'], $data['indistinto'], $data['total']]);

            $isExternal = isset($data['is_external']) && $data['is_external'] == 1;
            if (!$isExternal && !empty($data['idprotA'])) {
                $this->db->prepare("INSERT INTO protformr (idformA, idprotA) VALUES (?, ?)")->execute([$idForm, $data['idprotA']]);
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$data['total'], $data['idprotA']]);
            }

            Auditoria::log($this->db, 'INSERT', 'formularioe', "Nuevo Pedido de Animales #$idForm creado por usuario {$data['userId']}");
            $this->db->commit();
            return $idForm;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }
    // ************************************************************************
    // 4. HELPER PRIVADO
    // ************************************************************************



    public function getDataForTarifario($instId) {
            // 1. Datos Institución
            $stmtInst = $this->db->prepare("SELECT NombreInst, PrecioJornadaTrabajoExp, tituloprecios FROM institucion WHERE IdInstitucion = ?");
            $stmtInst->execute([$instId]);
            $institucion = $stmtInst->fetch(\PDO::FETCH_ASSOC);

            // 2. Especies (Padres)
            $stmtEsp = $this->db->prepare("SELECT idespA, EspeNombreA, Panimal, PalojamientoChica, PalojamientoGrande FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA");
            $stmtEsp->execute([$instId]);
            $especies = $stmtEsp->fetchAll(\PDO::FETCH_ASSOC);

            // 3. Subespecies (Hijos)
            $stmtSub = $this->db->prepare("SELECT idsubespA, idespA, SubEspeNombreA, Psubanimal, Existe FROM subespecie WHERE Existe != 2");
            $stmtSub->execute(); // Traemos todas y filtramos en JS o filtramos por JOIN si prefieres optimizar
            $subespecies = $stmtSub->fetchAll(\PDO::FETCH_ASSOC);

            // 4. Insumos Experimentales
            $stmtInsExp = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumoexperimental WHERE IdInstitucion = ? AND habilitado = 1");
            $stmtInsExp->execute([$instId]);
            
            // 5. Insumos Comunes
            $stmtIns = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumo WHERE IdInstitucion = ? AND Existencia = 1");
            $stmtIns->execute([$instId]);

            return [
                'institucion' => $institucion,
                'especies' => $especies,
                'subespecies' => $subespecies,
                'insumosExp' => $stmtInsExp->fetchAll(\PDO::FETCH_ASSOC),
                'insumos' => $stmtIns->fetchAll(\PDO::FETCH_ASSOC)
            ];
        }

// Recupera email, nombre y nombre de institución
    public function getUserAndInstInfo($userId, $instId) {
        $sql = "SELECT p.EmailA, p.NombreA, i.NombreInst 
                FROM personae p 
                JOIN institucion i ON i.IdInstitucion = ?
                WHERE p.IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $userId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    // Recupera nombres de Especie, Subespecie y Protocolo
    public function getNamesForMail($idSub, $idProt) {
        // 1. Especie y Sub
        $sqlEsp = "SELECT e.EspeNombreA, s.SubEspeNombreA 
                   FROM subespecie s 
                   JOIN especiee e ON s.idespA = e.idespA 
                   WHERE s.idsubespA = ?";
        $stmt = $this->db->prepare($sqlEsp);
        $stmt->execute([$idSub]);
        $esp = $stmt->fetch(\PDO::FETCH_ASSOC);

        // 2. Protocolo (Si existe)
        $nprot = "Sin Protocolo";
        $titulo = "Externo / Otros CEUAS";
        
        if (!empty($idProt)) {
            $stmtP = $this->db->prepare("SELECT nprotA, tituloA FROM protocoloexpe WHERE idprotA = ?");
            $stmtP->execute([$idProt]);
            $prot = $stmtP->fetch(\PDO::FETCH_ASSOC);
            if ($prot) {
                $nprot = $prot['nprotA'];
                $titulo = $prot['tituloA'];
            }
        }

        return [
            'especie' => $esp['EspeNombreA'] ?? 'N/A',
            'subespecie' => $esp['SubEspeNombreA'] ?? 'N/A',
            'nprot' => $nprot,
            'titulo' => $titulo
        ];
    }
}