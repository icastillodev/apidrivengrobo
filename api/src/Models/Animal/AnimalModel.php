<?php
namespace App\Models\Animal;

use PDO;

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
        // 0. Validación y saneamiento de entradas para evitar Warnings
        $id = $data['idformA'] ?? null;
        if (!$id) return false;

        $nuevoEstado = $data['estado'] ?? 'Sin estado';
        $aclaracion = $data['aclaracionadm'] ?? ''; // Soluciona el error: Undefined array key "aclaracionadm"
        $quien = $data['quienvisto'] ?? 'Admin';

        // 1. Obtener estado anterior, cantidad y protocolo en una sola consulta
        $stmtOld = $this->db->prepare("
            SELECT estado, 
                (SELECT totalA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as cant, 
                (SELECT idprotA FROM protformr WHERE idformA = f.idformA LIMIT 1) as idprot 
            FROM formularioe f 
            WHERE f.idformA = ?
        ");
        $stmtOld->execute([$id]);
        $oldRow = $stmtOld->fetch(\PDO::FETCH_ASSOC);

        if (!$oldRow) return false;

        $oldStatus = $oldRow['estado'] ?? 'Sin estado';
        $cantidad = (int)($oldRow['cant'] ?? 0);
        $idProt = $oldRow['idprot'];

        $this->db->beginTransaction();
        try {
            // 2. Lógica de Stock: Comparamos normalizando a minúsculas
            $isNewSuspended = (strtolower(trim($nuevoEstado)) === 'suspendido');
            $isOldSuspended = (strtolower(trim($oldStatus)) === 'suspendido');

            // Caso A: El pedido se suspende (Devolvemos animales al protocolo)
            if ($isNewSuspended && !$isOldSuspended && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")
                        ->execute([$cantidad, $idProt]);
            } 
            // Caso B: El pedido sale de suspensión (Restamos animales del protocolo nuevamente)
            elseif (!$isNewSuspended && $isOldSuspended && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                        ->execute([$cantidad, $idProt]);
            }

            // 3. Actualizar el registro del formulario
            $sql = "UPDATE formularioe SET estado = ?, aclaracionadm = ?, quienvisto = ? WHERE idformA = ?";
            $this->db->prepare($sql)->execute([
                $nuevoEstado, // Se guarda con el formato original (Ej: "Listo para entrega")
                $aclaracion, 
                $quien, 
                $id
            ]);

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
    // 0. Protección contra llaves faltantes (Evita el Warning que rompe el JSON)
    $id = $data['idformA'] ?? null;
    if (!$id) return false;

    $newTotal = (int)($data['totalA'] ?? 0);
    $newProt = $data['idprotA'] ?? null;
    $idSubesp = $data['idsubespA'] ?? null;

    // 1. Obtener datos actuales antes de actualizar (para saber cuánto devolver al protocolo)
    $stmtOld = $this->db->prepare("
        SELECT 
            (SELECT totalA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldTotal,
            (SELECT idprotA FROM protformr WHERE idformA = f.idformA LIMIT 1) as oldProt
        FROM formularioe f 
        WHERE f.idformA = ?");
    $stmtOld->execute([$id]);
    $old = $stmtOld->fetch(\PDO::FETCH_ASSOC);
    
    $oldTotal = (int)($old['oldTotal'] ?? 0);
    $oldProt = $old['oldProt'];

    $this->db->beginTransaction();
    try {
        // 2. Actualizar Formulario Principal (Uso de ?? para evitar errores de red o campos vacíos)
        $sqlForm = "UPDATE formularioe SET 
                        tipoA = ?, idsubespA = ?, edadA = ?, 
                        pesoA = ?, fechainicioA = ?, fecRetiroA = ? 
                    WHERE idformA = ?";
        $this->db->prepare($sqlForm)->execute([
            $data['tipoA'] ?? null, 
            $idSubesp, 
            $data['edadA'] ?? '', 
            $data['pesoA'] ?? '', 
            $data['fechainicioA'] ?? null, 
            $data['fecRetiroA'] ?? null, 
            $id
        ]);

        // 3. Actualizar Cantidades por Sexo
        $sqlSexo = "UPDATE sexoe SET 
                        machoA = ?, hembraA = ?, indistintoA = ?, totalA = ? 
                    WHERE idformA = ?";
        $this->db->prepare($sqlSexo)->execute([
            $data['machoA'] ?? 0, 
            $data['hembraA'] ?? 0, 
            $data['indistintoA'] ?? 0, 
            $newTotal, 
            $id
        ]);

        // 4. Actualizar Relación de Protocolo
        $this->db->prepare("UPDATE protformr SET idprotA = ? WHERE idformA = ?")
                 ->execute([$newProt, $id]);

        // 5. SINCRONIZACIÓN DE STOCK: Comparamos lo viejo con lo nuevo
        if ($oldProt == $newProt) {
            // Mismo protocolo: ajustamos solo la diferencia
            $diff = $newTotal - $oldTotal;
            if ($diff != 0 && $newProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                         ->execute([$diff, $newProt]);
            }
        } else {
            // El protocolo cambió: devolvemos al anterior y restamos del nuevo
            if ($oldProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")
                         ->execute([$oldTotal, $oldProt]);
            }
            if ($newProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                         ->execute([$newTotal, $newProt]);
            }
        }

        $this->db->commit();
        return true;
    } catch (\Exception $e) {
        $this->db->rollBack();
        throw $e;
    }
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
     */
    public function saveNotificationAndGetMailDetails($data) {
        $id = $data['idformA'];
        $nota = $data['nota'];
        $adminId = $data['adminId'];

        // 1. Registro histórico en la tabla de notificaciones
        $stmt = $this->db->prepare("INSERT INTO notificacione (idformA, NotaNotificacion, fecha, IdInstitucion) VALUES (?, ?, NOW(), ?)");
        $stmt->execute([$id, $nota, $data['instId']]);

        // 2. Consulta de datos para el cuerpo del correo
        $sql = "SELECT 
                    pe.EmailA as email_inv,
                    pe.NombreA as investigador,
                    adm.EmailA as email_admin,
                    adm.NombreA as admin_nombre,
                    f.estado,
                    px.nprotA,
                    px.tituloA as protocolo_titulo,
                    se.SubEspeNombreA as especie,
                    sx.totalA as total,
                    i.NombreInst as institucion
                FROM formularioe f
                INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA
                INNER JOIN personae adm ON adm.IdUsrA = ?
                INNER JOIN protformr pf ON f.idformA = pf.idformA
                INNER JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                INNER JOIN subespecie se ON f.idsubespA = se.idsubespA
                INNER JOIN sexoe sx ON f.idformA = sx.idformA
                INNER JOIN institucione i ON f.IdInstitucion = i.IdInstitucion
                WHERE f.idformA = ?";
                
        $stmtData = $this->db->prepare($sql);
        $stmtData->execute([$adminId, $id]);
        return $stmtData->fetch(\PDO::FETCH_ASSOC);
    }


    /* INVESTIGADOR */

    // ************************************************************************
    // 1. BÚSQUEDA Y CONFIGURACIÓN INICIAL
    // ************************************************************************
    
    /**
     * Obtiene la configuración de la institución (PDF precios, flag Otros CEUAS)
     * y la lista de protocolos VIGENTES y con SALDO POSITIVO.
     */
    public function getActiveProtocolsForUser($instId, $userId) {
        // A. Configuración Institucional (Link PDF y Permiso Otros CEUAS)
        $stmtConfig = $this->db->prepare("SELECT otrosceuas, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtConfig->execute([$instId]);
        $config = $stmtConfig->fetch(PDO::FETCH_ASSOC);

        // B. Protocolos Activos
        // Reglas: Misma Institución + Fecha Fin >= Hoy + Cantidad Animales > 0
        $sql = "SELECT 
                    p.idprotA, 
                    p.nprotA, 
                    p.tituloA, 
                    CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable
                FROM protocoloexpe p
                INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
                WHERE p.IdInstitucion = ? 
                AND p.FechaFinProtA >= CURDATE() 
                AND p.CantidadAniA > 0 
                ORDER BY p.nprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        
        return [
            'config' => $config,
            'protocols' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    // ************************************************************************
    // 2. DETALLE Y ÁRBOL DE ESPECIES (CASCADA)
    // ************************************************************************

    /**
     * Obtiene info detallada de un protocolo y sus especies permitidas.
     */
    public function getDetailsAndSpecies($protId) {
        // A. Info General (Saldo, Depto, Responsable)
        $stmtInfo = $this->db->prepare("
            SELECT 
                p.idprotA, p.tituloA, p.nprotA, p.CantidadAniA as saldo,
                CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable,
                COALESCE(d.NombreDeptoA, 'Sin departamento') as Depto
            FROM protocoloexpe p
            INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
            LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA
            WHERE p.idprotA = ?
        ");
        $stmtInfo->execute([$protId]);
        $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);

        // B. Especies Aprobadas (Solo las vinculadas al protocolo)
        $sqlEsp = "SELECT 
                    e.idespA, e.EspeNombreA,
                    s.idsubespA, s.SubEspeNombreA
                   FROM protesper pe
                   INNER JOIN especiee e ON pe.idespA = e.idespA
                   INNER JOIN subespecie s ON e.idespA = s.idespA
                   WHERE pe.idprotA = ? AND s.Existe = 1
                   ORDER BY e.EspeNombreA, s.SubEspeNombreA";
        
        $stmtEsp = $this->db->prepare($sqlEsp);
        $stmtEsp->execute([$protId]);
        $rows = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);

        return ['info' => $info, 'species' => $this->buildSpeciesTree($rows)];
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

    public function saveOrder($data) {
        $this->db->beginTransaction();
        
        try {
            // A. Obtener el ID del Tipo de Formulario para 'Animal vivo'
            // Esto asegura integridad referencial con la tabla tipoformularios
            $stmtType = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE nombreTipo = 'Animal vivo' AND IdInstitucion = ? LIMIT 1");
            $stmtType->execute([$data['instId']]);
            $tipoId = $stmtType->fetchColumn();

            if (!$tipoId) throw new Exception("Error de configuración: No existe el tipo 'Animal vivo' en esta institución.");

            // B. Insertar en FORMULARIOE (Cabecera)
            $sqlForm = "INSERT INTO formularioe (
                tipoA, idsubespA, edadA, pesoA, fechainicioA, fecRetiroA, 
                aclaraA, IdUsrA, IdInstitucion, estado, raza
            ) VALUES (
                ?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'Sin estado', ?
            )";
            
            $stmt = $this->db->prepare($sqlForm);
            $stmt->execute([
                $tipoId,
                $data['idsubespA'],
                $data['edad'],
                $data['peso'],
                $data['fecha_retiro'], // YYYY-MM-DD
                $data['aclaracion'],
                $data['userId'],
                $data['instId'],
                $data['raza']
            ]);
            
            $idForm = $this->db->lastInsertId();

            // C. Insertar en SEXOE (Detalle de Cantidades 1:1)
            $sqlSex = "INSERT INTO sexoe (idformA, machoA, hembraA, indistintoA, totalA) VALUES (?, ?, ?, ?, ?)";
            $this->db->prepare($sqlSex)->execute([
                $idForm,
                $data['macho'], 
                $data['hembra'], 
                $data['indistinto'], 
                $data['total']
            ]);

            // D. Lógica de Vinculación y Stock
            $isExternal = isset($data['is_external']) && $data['is_external'] == 1;

            if (!$isExternal && !empty($data['idprotA'])) {
                // CASO 1: Protocolo Local -> Vinculamos y Descontamos
                
                // 1. Crear relación en protformr
                $this->db->prepare("INSERT INTO protformr (idformA, idprotA) VALUES (?, ?)")
                         ->execute([$idForm, $data['idprotA']]);

                // 2. Descontar saldo del protocolo
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                         ->execute([$data['total'], $data['idprotA']]);
            
            } else {
                // CASO 2: Otros CEUAS (Externo)
                // Aquí podrías guardar un flag en formularioe si tuvieras un campo 'es_externo'
                // O insertar en protformr con un protocolo dummy si el sistema lo requiere.
                // Por ahora, según tu lógica, simplemente NO descontamos stock.
                
                // Opcional: Si en el futuro agregas un campo 'es_otros_ceuas' a formularioe, 
                // harías el UPDATE aquí.
            }

            $this->db->commit();
            return $idForm;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ************************************************************************
    // 4. HELPER PRIVADO
    // ************************************************************************

    /**
     * Convierte un array plano SQL en un árbol jerárquico para el Select JS
     */
    private function buildSpeciesTree($rows) {
        $tree = [];
        foreach ($rows as $r) {
            $idEsp = $r['idespA'];
            
            if (!isset($tree[$idEsp])) {
                $tree[$idEsp] = [
                    'name' => $r['EspeNombreA'],
                    'subs' => []
                ];
            }

            // Agregamos la subespecie al array 'subs'
            $tree[$idEsp]['subs'][] = [
                'id' => $r['idsubespA'],
                'name' => $r['SubEspeNombreA']
            ];
        }
        // Retornamos 'array_values' para que sea un Array JSON [ {}, {} ] y no un Objeto { "15": {}, "20": {} }
        return array_values($tree);
    }





}