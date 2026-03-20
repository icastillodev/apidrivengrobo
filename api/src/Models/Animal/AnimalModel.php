<?php
namespace App\Models\Animal;

use PDO;
use App\Utils\Auditoria;
use App\Models\FormDerivacion\FormDerivacionModel;

class AnimalModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

// api/src/Models/Animal/AnimalModel.php

    public function getByInstitution($instId) {
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
            ? "foa.IdFormularioDerivacionActiva, COALESCE(foa.IdInstitucionActual, f.IdInstitucion) as IdInstitucionActual, ia.NombreInst as InstitucionActualNombre,"
            : "NULL as IdFormularioDerivacionActiva, f.IdInstitucion as IdInstitucionActual, NULL as InstitucionActualNombre,";
        $ownerJoin = $hasOwnerTable
            ? "LEFT JOIN formulario_owner_actual foa ON foa.idformA = f.idformA"
            : "";
        $currentInstJoin = $hasOwnerTable
            ? "LEFT JOIN institucion ia ON ia.IdInstitucion = COALESCE(foa.IdInstitucionActual, f.IdInstitucion)"
            : "";
        $originJoin = $hasWorkflowCols
            ? "LEFT JOIN institucion io ON io.IdInstitucion = f.IdInstitucionOrigen"
            : "";
        $hasDerivEstadoCols = $this->hasTable('formulario_derivacion') && $this->hasColumn('formulario_derivacion', 'estado_origen');
        $derivEstadoSelect = $hasDerivEstadoCols
            ? ", (SELECT fd2.estado_origen FROM formulario_derivacion fd2 WHERE fd2.idformA = f.idformA ORDER BY fd2.IdFormularioDerivacion DESC LIMIT 1) as estado_origen,
               (SELECT fd2.estado_destino FROM formulario_derivacion fd2 WHERE fd2.idformA = f.idformA ORDER BY fd2.IdFormularioDerivacion DESC LIMIT 1) as estado_destino"
            : "";
        $hasRedCfgCols = $this->hasTable('formulario_derivacion')
            && $this->hasColumn('formulario_derivacion', 'tipoA_destino')
            && $this->hasColumn('formulario_derivacion', 'depto_destino')
            && $this->hasColumn('formulario_derivacion', 'idsubespA_destino')
            && $this->hasColumn('formulario_derivacion', 'idcepaA_destino');
        $redCfgJoin = $hasRedCfgCols
            ? "LEFT JOIN formulario_derivacion fdcfg ON fdcfg.idformA = f.idformA AND fdcfg.Activo = 1 AND fdcfg.IdInstitucionDestino = ?"
            : "";
        $tipoExpr = $hasRedCfgCols ? "COALESCE(fdcfg.tipoA_destino, f.tipoA)" : "f.tipoA";
        $deptoExpr = $hasRedCfgCols ? "COALESCE(fdcfg.depto_destino, f.depto)" : "f.depto";
        $subespExpr = $hasRedCfgCols ? "COALESCE(fdcfg.idsubespA_destino, f.idsubespA)" : "f.idsubespA";
        $cepaExpr = $hasRedCfgCols ? "COALESCE(fdcfg.idcepaA_destino, f.idcepaA)" : "f.idcepaA";

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
        // Garantizar que formularios derivados al destino SIEMPRE aparezcan (aunque falle otro JOIN)
        $derivDestinoClause = '';
        $derivDestinoAndClause = '';
        $derivOrigenClause = '';
        $derivOrigenAndClause = '';
        if ($this->hasTable('formulario_derivacion')) {
            $derivDestinoClause = " OR EXISTS (SELECT 1 FROM formulario_derivacion fd WHERE fd.idformA = f.idformA AND fd.Activo = 1 AND fd.IdInstitucionDestino = ?)";
            $params[] = (int)$instId;
            $derivDestinoAndClause = " OR (tf.IdTipoFormulario IS NULL AND EXISTS (SELECT 1 FROM formulario_derivacion fd2 WHERE fd2.idformA = f.idformA AND fd2.Activo = 1 AND fd2.IdInstitucionDestino = ?))";
            $params[] = (int)$instId;

            $hasIdformAOrigen = $this->hasColumn('formulario_derivacion', 'idformAOrigen');
            $fdFormMatch = $hasIdformAOrigen
                ? "(fd.idformA = f.idformA OR fd.idformAOrigen = f.idformA)"
                : "fd.idformA = f.idformA";
            $fd2FormMatch = $hasIdformAOrigen
                ? "(fd2.idformA = f.idformA OR fd2.idformAOrigen = f.idformA)"
                : "fd2.idformA = f.idformA";

            // También garantizamos que el origen vea los derivados (según formulario_derivacion),
            // incluso si el owner actual se movió al destino.
            $derivOrigenClause = " OR EXISTS (SELECT 1 FROM formulario_derivacion fd WHERE {$fdFormMatch} AND fd.Activo = 1 AND fd.IdInstitucionOrigen = ?)";
            $params[] = (int)$instId;
            $derivOrigenAndClause = " OR (tf.IdTipoFormulario IS NULL AND EXISTS (SELECT 1 FROM formulario_derivacion fd2 WHERE {$fd2FormMatch} AND fd2.Activo = 1 AND fd2.IdInstitucionOrigen = ?))";
            $params[] = (int)$instId;
        }
        $whereInst = "(" . $whereInst . $derivDestinoClause . $derivOrigenClause . ")";
        // Ya NO excluimos filas "copia" del modelo antiguo (idformA nuevo ≠ idformAOrigen): deben verse
        // en origen con aviso en UI para re-derivar con el flujo actual (misma idformA).
        $legacyCopyExclusion = '';

        $legacyDerivSelect = '';
        if ($this->hasTable('formulario_derivacion') && $this->hasColumn('formulario_derivacion', 'idformAOrigen')) {
            $legacyDerivSelect = ",
                    CASE WHEN EXISTS (
                        SELECT 1 FROM formulario_derivacion fdleg
                        WHERE fdleg.idformA = f.idformA
                          AND fdleg.idformAOrigen IS NOT NULL
                          AND fdleg.idformAOrigen <> fdleg.idformA
                    ) THEN 1 ELSE 0 END AS EsDerivacionCopiaLegacy,
                    (SELECT fdleg.idformAOrigen FROM formulario_derivacion fdleg
                     WHERE fdleg.idformA = f.idformA
                       AND fdleg.idformAOrigen IS NOT NULL
                       AND fdleg.idformAOrigen <> fdleg.idformA
                     ORDER BY fdleg.IdFormularioDerivacion DESC LIMIT 1) AS IdformALegacyOrigen,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM formulario_derivacion fdleg2
                        WHERE fdleg2.idformAOrigen = f.idformA
                          AND fdleg2.idformA IS NOT NULL
                          AND fdleg2.idformAOrigen IS NOT NULL
                          AND fdleg2.idformA <> fdleg2.idformAOrigen
                          AND fdleg2.Activo = 1
                    ) THEN 1 ELSE 0 END AS TieneCopiaLegacyActiva,
                    (SELECT fdleg3.idformA FROM formulario_derivacion fdleg3
                     WHERE fdleg3.idformAOrigen = f.idformA
                       AND fdleg3.idformA <> fdleg3.idformAOrigen
                       AND fdleg3.Activo = 1
                     ORDER BY fdleg3.IdFormularioDerivacion DESC LIMIT 1) AS IdformALegacyCopiaActiva";
        }

        $sql = "SELECT 
                    f.idformA, f.fechainicioA as Inicio, f.fecRetiroA as Retiro, 
                    f.aclaraA as Aclaracion, f.estado, f.quienvisto as QuienVio, 
                    f.edadA as Edad, f.pesoA as Peso, f.aclaracionadm as AclaracionAdm,
                    f.raza,
                    {$workflowSelect}
                    {$originNameSelect}
                    {$ownerSelect}
                    f.IdUsrA as IdInvestigador, {$subespExpr} as idsubespA,
                    {$cepaExpr} as idcepaA,
                    CONCAT(pe.ApellidoA, ' ', pe.NombreA) as Investigador,
                    pe.EmailA as EmailInvestigador, pe.CelularA as CelularInvestigador,
                    COALESCE(tf.nombreTipo, '—') as TipoNombre,
                    {$tipoExpr} as tipoAId,
                    COALESCE(tf.color, '') as colorTipo,
                    px.nprotA as NProtocolo, px.tituloA as TituloProtocolo, px.idprotA,
                    px.protocoloexpe as IsExterno, 
                    COALESCE(d.NombreDeptoA, 'Sin departamento') as DeptoProtocolo,
                    COALESCE({$deptoExpr}, pd.iddeptoA) as idDepto,
                    COALESCE(o.NombreOrganismoSimple, '') as Organizacion,
                    COALESCE(CONCAT(e.EspeNombreA, ' - ', se.SubEspeNombreA), '—') as CatEspecie,
                    COALESCE(e.EspeNombreA, '') as EspeNombreA,
                    COALESCE(se.SubEspeNombreA, '') as SubEspeNombreA,
                    COALESCE(c.CepaNombreA, '') as CepaNombre,
                    COALESCE(s.machoA, 0) as machoA, COALESCE(s.hembraA, 0) as hembraA, 
                    COALESCE(s.indistintoA, 0) as indistintoA, COALESCE(s.totalA, 0) as CantAnimal,
                    se.Psubanimal as PrecioUnit,
                    (
                        SELECT 
                            CASE 
                                WHEN d2.externodepto = 2 OR (d2.externodepto IS NULL AND o2.externoorganismo = 2) THEN 2
                                ELSE 1
                            END
                        FROM protformr pf2
                        JOIN protocoloexpe px2 ON pf2.idprotA = px2.idprotA
                        LEFT JOIN protdeptor pd2 ON px2.idprotA = pd2.idprotA
                        LEFT JOIN departamentoe d2 ON COALESCE(f.depto, pd2.iddeptoA) = d2.iddeptoA
                        LEFT JOIN organismoe o2 ON d2.organismopertenece = o2.IdOrganismo
                        WHERE pf2.idformA = f.idformA
                        LIMIT 1
                    ) as DeptoExternoFlag
                    {$legacyDerivSelect}
                    {$derivEstadoSelect}
                FROM formularioe f
                {$redCfgJoin}
                LEFT JOIN tipoformularios tf ON {$tipoExpr} = tf.IdTipoFormulario
                INNER JOIN personae pe ON f.IdUsrA = pe.IdUsrA
                LEFT JOIN subespecie se ON {$subespExpr} = se.idsubespA 
                LEFT JOIN especiee e ON se.idespA = e.idespA
                LEFT JOIN cepa c ON {$cepaExpr} = c.idcepaA
                {$ownerJoin}
                {$currentInstJoin}
                {$originJoin}
                LEFT JOIN protformr pf ON f.idformA = pf.idformA
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
                LEFT JOIN departamentoe d ON COALESCE({$deptoExpr}, pd.iddeptoA) = d.iddeptoA
                LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                LEFT JOIN sexoe s ON f.idformA = s.idformA
                WHERE {$whereInst} 
                  {$legacyCopyExclusion}
                  AND (tf.categoriaformulario IN ('Animal', 'Animal vivo') {$derivDestinoAndClause} {$derivOrigenAndClause})
                ORDER BY f.idformA DESC";
        
        $stmt = $this->db->prepare($sql);
        $execParams = $hasRedCfgCols ? array_merge([(int)$instId], $params) : $params;
        $stmt->execute($execParams);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Modelo sin copia: origen y destino ven el mismo formularioe.
        // Para que en la institución ORIGEN se vean columnas con el "formulario original",
        // sobreescribimos campos que pueden cambiar (tipo/especie/depto/organismo/cepa)
        // usando el snapshot preservado en `formulario_datos_originales`.
        if ($this->hasTable('formulario_datos_originales') && !empty($rows)) {
            $instIdInt = (int)$instId;
            $originDerivedIds = [];
            foreach ($rows as $r) {
                $isDerived = (int)($r['DerivadoActivo'] ?? 0) === 1;
                $idInstOrigen = (int)($r['IdInstitucionOrigen'] ?? 0);
                if ($isDerived && $idInstOrigen === $instIdInt) {
                    $originDerivedIds[] = (int)($r['idformA'] ?? 0);
                }
            }
            $originDerivedIds = array_values(array_unique(array_filter($originDerivedIds)));
            if (!empty($originDerivedIds)) {
                $placeholders = implode(',', array_fill(0, count($originDerivedIds), '?'));
                // En modelo sin copia, los snapshots guardan idformA = idformA del formulario original.
                $sqlSnap = "SELECT idformA, datos_json
                             FROM formulario_datos_originales
                             WHERE idformA IN ($placeholders)
                             ORDER BY IdFormularioDerivacion DESC";
                $stmtSnap = $this->db->prepare($sqlSnap);
                $stmtSnap->execute($originDerivedIds);
                $snapById = [];
                while ($sr = $stmtSnap->fetch(PDO::FETCH_ASSOC)) {
                    $sid = (int)($sr['idformA'] ?? 0);
                    if ($sid <= 0 || isset($snapById[$sid])) continue;
                    $snapById[$sid] = $sr['datos_json'] ?? null;
                }

                foreach ($rows as &$row) {
                    $rid = (int)($row['idformA'] ?? 0);
                    if ($rid <= 0 || empty($snapById[$rid])) continue;
                    $decoded = json_decode((string)$snapById[$rid], true);
                    if (!is_array($decoded)) continue;

                    $header = $decoded['header'] ?? [];
                    $details = $decoded['details'] ?? [];

                    if (!empty($decoded['nombreTipo'])) {
                        $row['TipoNombre'] = (string)$decoded['nombreTipo'];
                    }
                    if (!empty($header['idTipoFormulario'])) {
                        $row['tipoAId'] = (int)$header['idTipoFormulario'];
                    }
                    if (isset($header['idDepto']) && $header['idDepto'] !== '') {
                        $row['idDepto'] = (int)$header['idDepto'];
                    }
                    if (isset($header['idsubespA']) && $header['idsubespA'] !== '') {
                        $row['idsubespA'] = (int)$header['idsubespA'];
                    }
                    if (isset($header['idcepaA']) && $header['idcepaA'] !== '') {
                        $row['idcepaA'] = (int)$header['idcepaA'];
                    }
                    if (!empty($header['fechainicioA'])) $row['Inicio'] = $header['fechainicioA'];
                    if (!empty($header['fecRetiroA'])) $row['Retiro'] = $header['fecRetiroA'];

                    if (!empty($header['nprotA'])) $row['NProtocolo'] = $header['nprotA'];
                    if (!empty($header['TituloProtocolo'])) $row['TituloProtocolo'] = $header['TituloProtocolo'];

                    if (!empty($header['NombreDeptoA'])) $row['DeptoProtocolo'] = $header['NombreDeptoA'];
                    if (!empty($header['NombreOrganismoSimple'])) $row['Organizacion'] = $header['NombreOrganismoSimple'];

                    if (is_array($details) && !empty($details)) {
                        $espe = (string)($details['EspeNombreA'] ?? '');
                        $subespe = (string)($details['SubEspeNombreA'] ?? '');
                        $cepa = (string)($details['CepaNombreA'] ?? '');

                        if ($espe !== '') $row['EspeNombreA'] = $espe;
                        if ($subespe !== '') $row['SubEspeNombreA'] = $subespe;

                        if ($espe !== '' && $subespe !== '') $row['CatEspecie'] = $espe . ' - ' . $subespe;
                        if ($cepa !== '') $row['CepaNombre'] = $cepa;
                    }
                }
            }
        }

        return $rows;
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

    private function isDestinationWithActiveDerivation(int $idformA, int $instId): bool {
        if ($idformA <= 0 || $instId <= 0 || !$this->hasTable('formulario_derivacion')) {
            return false;
        }
        $sql = "SELECT 1
                FROM formulario_derivacion
                WHERE idformA = ?
                  AND Activo = 1
                  AND IdInstitucionDestino = ?
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA, $instId]);
        return (bool)$stmt->fetchColumn();
    }

    public function getCepasBySubespecie($instId, $idSubespA) {
        // IMPORTANTE:
        // La tabla cepa ahora es subordinada a especiee (idespA), no a subespecie.
        // A partir de la subespecie (idsubespA) resolvemos su especie y traemos
        // todas las cepas habilitadas de ESA especie.
        $sql = "
            SELECT 
                c.idcepaA, 
                c.CepaNombreA
            FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
            INNER JOIN subespecie s ON s.idespA = e.idespA
            WHERE c.Habilitado = 1
              AND s.idsubespA = ?
              AND e.IdInstitucion = ?
            ORDER BY c.CepaNombreA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idSubespA, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Cepas habilitadas por especie (idespA) para formularios. */
    public function getCepasByEspecie($instId, $idespA) {
        $sql = "
            SELECT 
                c.idcepaA, 
                c.CepaNombreA
            FROM cepa c
            INNER JOIN especiee e ON c.idespA = e.idespA
            WHERE c.Habilitado = 1
              AND c.idespA = ?
              AND e.IdInstitucion = ?
            ORDER BY c.CepaNombreA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idespA, $instId]);
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
        $instId = (int)($data['instId'] ?? 0);
        if ($instId > 0) {
            FormDerivacionModel::assertInstitutionCanMutate($this->db, (int)$id, $instId);
        }

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

        $formDerivModel = new FormDerivacionModel($this->db);
        $deriv = $instId > 0 ? $formDerivModel->getDerivationByFormAndInst($id, $instId) : null;
        $isDerived = $deriv !== null;

        if ($isDerived && !empty($deriv['is_destination'])) {
            $cfg = $formDerivModel->checkDestinoConfigCompleta($id, $instId, 'Animal');
            if (!$cfg['completa']) {
                throw new \Exception('Actualizar formulario para la aplicación: faltan ' . implode(', ', $cfg['faltantes']) . '. Complete los datos antes de cambiar el estado.');
            }
        }

        $this->db->beginTransaction();
        try {
            $isNewSuspended = (strtolower(trim($nuevoEstado)) === 'suspendido');
            $isOldSuspended = (strtolower(trim($oldStatus)) === 'suspendido');

            // Protocol: animals deducted ONCE at creation. Suspendido only: add back when suspending, subtract when un-suspending.
            // When both origin and destination mark Entregado, each just updates estado; no double deduction.
            if ($isNewSuspended && !$isOldSuspended && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA + ? WHERE idprotA = ?")->execute([$cantidad, $idProt]);
            } elseif (!$isNewSuspended && $isOldSuspended && $idProt) {
                $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")->execute([$cantidad, $idProt]);
            }

            $sql = "UPDATE formularioe SET estado = ?, aclaracionadm = ?, quienvisto = ? WHERE idformA = ?";
            $this->db->prepare($sql)->execute([$nuevoEstado, $aclaracion, $quien, $id]);

            // For derived forms: update estado_origen or estado_destino in formulario_derivacion
            if ($isDerived && $this->hasTable('formulario_derivacion') && $this->hasColumn('formulario_derivacion', 'estado_origen')) {
                $idDeriv = (int)($deriv['IdFormularioDerivacion'] ?? 0);
                if ($idDeriv > 0) {
                    if (!empty($deriv['is_origin'])) {
                        $this->db->prepare("UPDATE formulario_derivacion SET estado_origen = ? WHERE IdFormularioDerivacion = ?")->execute([$nuevoEstado, $idDeriv]);
                    }
                    if (!empty($deriv['is_destination'])) {
                        $this->db->prepare("UPDATE formulario_derivacion SET estado_destino = ? WHERE IdFormularioDerivacion = ?")->execute([$nuevoEstado, $idDeriv]);
                    }
                }
            }

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
                  AND tf.categoriaformulario IN ('Animal', 'Animal vivo')
                  AND (f.estado IS NULL OR f.estado = '' OR LOWER(f.estado) = 'sin estado')";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;
    }

    // api/src/Models/Animal/AnimalModel.php

    public function getFormData($instId) {
        $stmtTypes = $this->db->prepare("SELECT IdTipoFormulario, nombreTipo, exento, descuento, color FROM tipoformularios WHERE IdInstitucion = ? AND categoriaformulario IN ('Animal', 'Animal vivo')");
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
     * Actualiza formularioe, sexoe, protformr, ajusta el stock y RECALCULA EL PRECIO.
     */
    public function updateFull($data) {
        $id = $data['idformA'] ?? null;
        if (!$id) return false;
        if (!empty($data['instId'])) {
            FormDerivacionModel::assertInstitutionCanMutate($this->db, (int)$id, (int)$data['instId']);
        }

        $newTotal = (int)($data['totalA'] ?? 0);
        $newProt = $data['idprotA'] ?? null;
        $instIdRequest = (int)($data['instId'] ?? 0);
        $idSubesp = $data['idsubespA'] ?? null;
        $idCepa = $data['idcepaA'] ?? null;
        if ($idCepa === '' || $idCepa === '0' || $idCepa === 0) $idCepa = null;

        $stmtOld = $this->db->prepare("SELECT
                                            f.fechainicioA as oldInicio,
                                            f.fecRetiroA as oldRetiro,
                                            (SELECT machoA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldMacho,
                                            (SELECT hembraA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldHembra,
                                            (SELECT indistintoA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldIndistinto,
                                            (SELECT totalA FROM sexoe WHERE idformA = f.idformA LIMIT 1) as oldTotal,
                                            (SELECT idprotA FROM protformr WHERE idformA = f.idformA LIMIT 1) as oldProt
                                       FROM formularioe f
                                       WHERE f.idformA = ?");
        $stmtOld->execute([$id]);
        $old = $stmtOld->fetch(\PDO::FETCH_ASSOC);
        
        $oldTotal = (int)($old['oldTotal'] ?? 0);
        $oldProt = $old['oldProt'];
        $esDerivadoEnDestino = $instIdRequest > 0 && $this->isDestinationWithActiveDerivation((int)$id, $instIdRequest);

        // Formulario derivado (en destino): el protocolo queda fijo y no se puede cambiar.
        if ($esDerivadoEnDestino) {
            $oldProtNorm = ($oldProt === null || $oldProt === '') ? null : (int)$oldProt;
            $newProtNorm = ($newProt === null || $newProt === '' || (string)$newProt === '0') ? null : (int)$newProt;
            if ($newProtNorm !== $oldProtNorm) {
                throw new \Exception("En un formulario derivado no se puede cambiar el protocolo.");
            }
            $newProt = $oldProtNorm;
            $data['fechainicioA'] = $old['oldInicio'] ?? ($data['fechainicioA'] ?? null);
            $data['fecRetiroA'] = $old['oldRetiro'] ?? ($data['fecRetiroA'] ?? null);
            $data['machoA'] = (int)($old['oldMacho'] ?? 0);
            $data['hembraA'] = (int)($old['oldHembra'] ?? 0);
            $data['indistintoA'] = (int)($old['oldIndistinto'] ?? 0);
            $newTotal = (int)($old['oldTotal'] ?? $newTotal);
        }

        $this->db->beginTransaction();
        try {
            // En RED (institución destino), la configuración local se guarda en formulario_derivacion
            // para no modificar datos base del formulario original.
            if ($esDerivadoEnDestino
                && $this->hasTable('formulario_derivacion')
                && $this->hasColumn('formulario_derivacion', 'tipoA_destino')
                && $this->hasColumn('formulario_derivacion', 'depto_destino')
                && $this->hasColumn('formulario_derivacion', 'idsubespA_destino')
                && $this->hasColumn('formulario_derivacion', 'idcepaA_destino')) {

                $stmtDeriv = $this->db->prepare("SELECT IdFormularioDerivacion
                                                 FROM formulario_derivacion
                                                 WHERE idformA = ? AND Activo = 1 AND IdInstitucionDestino = ?
                                                 LIMIT 1");
                $stmtDeriv->execute([$id, $instIdRequest]);
                $idDeriv = (int)($stmtDeriv->fetchColumn() ?: 0);
                if ($idDeriv <= 0) {
                    throw new \Exception("No se encontró derivación activa para guardar configuración de red.");
                }

                // Conserva valores ya configurados en RED si este POST los trae vacíos.
                $stmtCfg = $this->db->prepare("SELECT tipoA_destino, depto_destino, idsubespA_destino, idcepaA_destino
                                               FROM formulario_derivacion
                                               WHERE IdFormularioDerivacion = ?
                                               LIMIT 1");
                $stmtCfg->execute([$idDeriv]);
                $cfgActual = $stmtCfg->fetch(\PDO::FETCH_ASSOC) ?: [];

                $tipoDestino = !empty($data['tipoA']) ? (int)$data['tipoA'] : (int)($cfgActual['tipoA_destino'] ?? 0);
                $subespDestino = !empty($idSubesp) ? (int)$idSubesp : (int)($cfgActual['idsubespA_destino'] ?? 0);
                $cepaDestino = !empty($idCepa) ? (int)$idCepa : (int)($cfgActual['idcepaA_destino'] ?? 0);
                $deptoDestino = !empty($data['depto']) ? (int)$data['depto'] : (!empty($cfgActual['depto_destino']) ? (int)$cfgActual['depto_destino'] : null);

                if ($subespDestino <= 0) {
                    throw new \Exception("Debe seleccionar Especie y Categoría para el formulario derivado.");
                }
                if ($tipoDestino <= 0) {
                    throw new \Exception("Debe seleccionar un tipo de formulario válido.");
                }

                // Tipo local válido en la institución destino
                $stmtTipo = $this->db->prepare("SELECT 1 FROM tipoformularios WHERE IdTipoFormulario = ? AND IdInstitucion = ? LIMIT 1");
                $stmtTipo->execute([$tipoDestino, $instIdRequest]);
                if (!$stmtTipo->fetchColumn()) {
                    throw new \Exception("El tipo de formulario seleccionado no pertenece a la institución destino.");
                }

                // Depto local válido en destino (si fue seleccionado)
                if ($deptoDestino !== null) {
                    $stmtDepto = $this->db->prepare("SELECT 1 FROM departamentoe WHERE iddeptoA = ? AND IdInstitucion = ? LIMIT 1");
                    $stmtDepto->execute([$deptoDestino, $instIdRequest]);
                    if (!$stmtDepto->fetchColumn()) {
                        throw new \Exception("El departamento seleccionado no pertenece a la institución destino.");
                    }
                }

                // Validación de cepa para la subespecie local
                $stmtCount = $this->db->prepare("
                    SELECT COUNT(*)
                    FROM cepa c
                    INNER JOIN especiee e ON c.idespA = e.idespA
                    INNER JOIN subespecie s ON s.idespA = e.idespA
                    WHERE s.idsubespA = ?
                      AND c.Habilitado = 1
                      AND e.IdInstitucion = ?
                ");
                $stmtCount->execute([$subespDestino, $instIdRequest]);
                $hasEnabledCepas = ((int)$stmtCount->fetchColumn()) > 0;
                if ($hasEnabledCepas && $cepaDestino <= 0) {
                    throw new \Exception("Debe seleccionar una cepa.");
                }
                if ($cepaDestino > 0) {
                    $stmtCepa = $this->db->prepare("
                        SELECT c.idcepaA
                        FROM cepa c
                        INNER JOIN especiee e ON c.idespA = e.idespA
                        INNER JOIN subespecie s ON s.idespA = e.idespA
                        WHERE c.idcepaA = ?
                          AND s.idsubespA = ?
                          AND c.Habilitado = 1
                          AND e.IdInstitucion = ?
                        LIMIT 1
                    ");
                    $stmtCepa->execute([$cepaDestino, $subespDestino, $instIdRequest]);
                    if (!$stmtCepa->fetchColumn()) {
                        throw new \Exception("La cepa seleccionada no es válida.");
                    }
                }

                $this->db->prepare("UPDATE formulario_derivacion
                                    SET tipoA_destino = ?, depto_destino = ?, idsubespA_destino = ?, idcepaA_destino = ?,
                                        FechaConfigDestino = NOW(),
                                        IdUsrConfigDestino = ?
                                    WHERE IdFormularioDerivacion = ?")
                    ->execute([
                        $tipoDestino,
                        $deptoDestino,
                        $subespDestino,
                        $cepaDestino > 0 ? $cepaDestino : null,
                        !empty($data['userId']) ? (int)$data['userId'] : null,
                        $idDeriv
                    ]);

                // Recalcular facturación derivada (proveedor→cliente) sin tocar precioformulario original.
                $stmtPrecio = $this->db->prepare("SELECT Psubanimal FROM subespecie WHERE idsubespA = ?");
                $stmtPrecio->execute([$subespDestino]);
                $nuevoPrecioUnitario = (float)$stmtPrecio->fetchColumn();
                $nuevoCostoTotal = $nuevoPrecioUnitario * $newTotal;
                if ($this->hasTable('facturacion_formulario_derivado')) {
                    $this->db->prepare("UPDATE facturacion_formulario_derivado
                                        SET monto_total = ?
                                        WHERE IdFormularioDerivacion = ? AND IdInstitucionCobradora = ?")
                        ->execute([$nuevoCostoTotal, $idDeriv, $instIdRequest]);
                }

                Auditoria::log($this->db, 'UPDATE_FULL', 'formulario_derivacion', "Configuración RED de Animales #$id actualizada");
                $this->db->commit();
                return true;
            }

            // Formulario derivado en destino: especie/categoría son obligatorios
            if ($esDerivadoEnDestino && (empty($idSubesp) || $idSubesp === '0')) {
                throw new \Exception("Debe seleccionar Especie y Categoría para el formulario derivado.");
            }

            // Validación cepa: si existen cepas habilitadas para la categoría, debe seleccionar una
            // (nota: instId no viene en este POST, lo deducimos por el formulario y la institución de la categoría)
            $stmtInst = $this->db->prepare("
                SELECT e.IdInstitucion
                FROM subespecie s
                INNER JOIN especiee e ON s.idespA = e.idespA
                WHERE s.idsubespA = ?
            ");
            $stmtInst->execute([$idSubesp]);
            $instId = $stmtInst->fetchColumn();

            if ($instId) {
                $stmtCount = $this->db->prepare("
                    SELECT COUNT(*) 
                    FROM cepa c
                    INNER JOIN especiee e ON c.idespA = e.idespA
                    INNER JOIN subespecie s ON s.idespA = e.idespA
                    WHERE s.idsubespA = ? 
                      AND c.Habilitado = 1 
                      AND e.IdInstitucion = ?
                ");
                $stmtCount->execute([$idSubesp, $instId]);
                $hasEnabledCepas = ((int)$stmtCount->fetchColumn()) > 0;

                if ($hasEnabledCepas && empty($idCepa)) {
                    throw new \Exception("Debe seleccionar una cepa.");
                }

                if (!empty($idCepa)) {
                    // Validamos que la cepa pertenezca a la ESPECIE de esta subespecie
                    $stmtCepa = $this->db->prepare("
                        SELECT c.idcepaA
                        FROM cepa c
                        INNER JOIN especiee e ON c.idespA = e.idespA
                        INNER JOIN subespecie s ON s.idespA = e.idespA
                        WHERE c.idcepaA = ? 
                          AND s.idsubespA = ? 
                          AND c.Habilitado = 1 
                          AND e.IdInstitucion = ?
                    ");
                    $stmtCepa->execute([$idCepa, $idSubesp, $instId]);
                    if (!$stmtCepa->fetchColumn()) {
                        throw new \Exception("La cepa seleccionada no es válida.");
                    }
                }
            }

            $sqlForm = "UPDATE formularioe SET tipoA = ?, idsubespA = ?, idcepaA = ?, raza = ?, edadA = ?, pesoA = ?, fechainicioA = ?, fecRetiroA = ?, depto = ? WHERE idformA = ?";
            $this->db->prepare($sqlForm)->execute([
                $data['tipoA'] ?? null, 
                $idSubesp, 
                $idCepa,
                $data['razaA'] ?? '', 
                $data['edadA'] ?? '', 
                $data['pesoA'] ?? '', 
                $data['fechainicioA'] ?? null, 
                $data['fecRetiroA'] ?? null, 
                !empty($data['depto']) ? $data['depto'] : null, 
                $id
            ]);
            
            $sqlSexo = "UPDATE sexoe SET machoA = ?, hembraA = ?, indistintoA = ?, totalA = ? WHERE idformA = ?";
            $this->db->prepare($sqlSexo)->execute([$data['machoA'] ?? 0, $data['hembraA'] ?? 0, $data['indistintoA'] ?? 0, $newTotal, $id]);

            // 🚀 RECALCULAR FACTURACIÓN
            $stmtPrecio = $this->db->prepare("SELECT Psubanimal FROM subespecie WHERE idsubespA = ?");
            $stmtPrecio->execute([$idSubesp]);
            $nuevoPrecioUnitario = (float)$stmtPrecio->fetchColumn();
            $nuevoCostoTotal = $nuevoPrecioUnitario * $newTotal;

            if ($esDerivadoEnDestino) {
                // Formulario derivado en destino: NO sobrescribir precioformulario (es el original del cliente).
                // Crear/actualizar solo facturacion_formulario_derivado = factura proveedor→cliente.
                $stmtDeriv = $this->db->prepare("SELECT IdFormularioDerivacion FROM formulario_derivacion WHERE idformA = ? AND Activo = 1 AND IdInstitucionDestino = ? LIMIT 1");
                $stmtDeriv->execute([$id, $instIdRequest]);
                $idDeriv = $stmtDeriv->fetchColumn();
                if ($idDeriv && $this->hasTable('facturacion_formulario_derivado')) {
                    $this->db->prepare("UPDATE facturacion_formulario_derivado SET monto_total = ? WHERE IdFormularioDerivacion = ? AND IdInstitucionCobradora = ?")
                        ->execute([$nuevoCostoTotal, $idDeriv, $instIdRequest]);
                }
            } else {
                // Formulario normal: actualizar precioformulario
                $this->db->prepare("UPDATE precioformulario SET precioanimalmomento = ?, precioformulario = ? WHERE idformA = ?")
                    ->execute([$nuevoPrecioUnitario, $nuevoCostoTotal, $id]);
            }

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
                    se.idespA,
                    se.SubEspeNombreA, 
                    e.EspeNombreA, 
                    se.Psubanimal, 
                    se.Existe as existe
                FROM protesper pe
                INNER JOIN subespecie se ON pe.idespA = se.idespA
                INNER JOIN especiee e ON se.idespA = e.idespA
                WHERE pe.idprotA = ? AND se.Existe != 2";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$protId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getAllSpeciesFlatForInstitution($instId) {
        $sql = "SELECT
                    se.idsubespA,
                    se.idespA,
                    se.SubEspeNombreA,
                    e.EspeNombreA,
                    se.Psubanimal,
                    se.Existe as existe
                FROM subespecie se
                INNER JOIN especiee e ON se.idespA = e.idespA
                WHERE e.IdInstitucion = ?
                  AND se.Existe != 2
                ORDER BY e.EspeNombreA ASC, se.SubEspeNombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$instId]);
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
        $sql = "SELECT DISTINCT
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
                  AND p.CantidadAniA > 0
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
        $stmt->execute([$instId, $instId, $instId, $instId, $instId, $instId]);
        
        // C. Email Usuario
        $stmtUser = $this->db->prepare("SELECT EmailA FROM personae WHERE IdUsrA = ?");
        $stmtUser->execute([$userId]);
        $userEmail = $stmtUser->fetchColumn();

        // D. TIPOS DE FORMULARIO (NUEVO)
        // Filtramos por Categoria = 'Animal' e Institución
        $stmtTypes = $this->db->prepare("
            SELECT IdTipoFormulario, nombreTipo 
            FROM tipoformularios 
            WHERE categoriaformulario = 'Animal' 
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
public function getDetailsAndSpecies($protId, $instId = null) {
        $instId = (int)$instId;
        // A. Info General (Igual que antes)
        $stmtInfo = $this->db->prepare("
            SELECT 
                p.idprotA, p.tituloA, p.nprotA, p.CantidadAniA as saldo, p.FechaFinProtA,
                p.IdInstitucion as OwnerInstId,
                CASE
                    WHEN p.IdInstitucion = ? THEN 1
                    WHEN pr.IdProtocoloExpRed IS NULL THEN 0
                    WHEN pr.IdUsrA IS NULL OR pr.iddeptoA IS NULL OR pr.idtipoprotocolo IS NULL OR pr.IdSeveridadTipo IS NULL THEN 0
                    WHEN (SELECT COUNT(*) FROM protocoloexpered_especies prs WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed) <= 0 THEN 0
                    ELSE 1
                END as RedConfigCompleta,
                COALESCE(CONCAT(per.NombreA, ' ', per.ApellidoA), CONCAT('ID:', COALESCE(pr.IdUsrA, p.IdUsrA))) as Responsable,
                COALESCE(d.NombreDeptoA, 'Sin departamento') as Depto,
                (SELECT COALESCE(SUM(s.totalA), 0) FROM protformr pf JOIN sexoe s ON pf.idformA = s.idformA WHERE pf.idprotA = p.idprotA) as usados
            FROM protocoloexpe p
            LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
            LEFT JOIN personae per ON per.IdUsrA = COALESCE(pr.IdUsrA, p.IdUsrA)
            LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON d.iddeptoA = COALESCE(pr.iddeptoA, pd.iddeptoA, p.departamento)
            WHERE p.idprotA = ?
        ");
        $stmtInfo->execute([$instId, $instId, $protId]);
        $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);

        // B. Especies y Subespecies (primero configuración local de red; si no hay, origen)
        $rows = [];
        $isRedContext = !empty($info) && (int)($info['OwnerInstId'] ?? 0) !== $instId;
        if ($instId > 0 && $isRedContext) {
            $sqlEspRed = "SELECT 
                            e.idespA,
                            e.EspeNombreA,
                            s.idsubespA,
                            s.SubEspeNombreA
                          FROM protocoloexpered pr
                          JOIN protocoloexpered_especies pre ON pre.IdProtocoloExpRed = pr.IdProtocoloExpRed
                          JOIN especiee e ON pre.idespA = e.idespA
                          JOIN subespecie s ON e.idespA = s.idespA
                          WHERE pr.idprotA = ?
                            AND pr.IdInstitucion = ?
                            AND s.Existe != 2
                          ORDER BY e.EspeNombreA ASC, s.SubEspeNombreA ASC";
            $stmtEspRed = $this->db->prepare($sqlEspRed);
            $stmtEspRed->execute([$protId, $instId]);
            $rows = $stmtEspRed->fetchAll(PDO::FETCH_ASSOC);
        }

        if (empty($rows) && !$isRedContext) {
            $sqlEsp = "SELECT 
                        e.idespA, 
                        e.EspeNombreA,
                        s.idsubespA, 
                        s.SubEspeNombreA
                       FROM protesper pe
                       INNER JOIN especiee e ON pe.idespA = e.idespA
                       INNER JOIN subespecie s ON e.idespA = s.idespA
                       WHERE pe.idprotA = ? 
                       AND s.Existe != 2
                       ORDER BY e.EspeNombreA ASC, s.SubEspeNombreA ASC";
            $stmtEsp = $this->db->prepare($sqlEsp);
            $stmtEsp->execute([$protId]);
            $rows = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);
        }

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

public function saveOrder($data) {
        $this->db->beginTransaction();
        try {
            $stmtCheck = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE IdTipoFormulario = ? AND categoriaformulario = 'Animal' AND IdInstitucion = ?");
            $stmtCheck->execute([$data['idTipoFormulario'], $data['instId']]);
            
            if (!$stmtCheck->fetchColumn()) throw new \Exception("Error: El tipo de formulario seleccionado no es válido.");

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
            if ($finalDepto == 0) {
                $stmtUserLab = $this->db->prepare("SELECT LabA FROM personae WHERE IdUsrA = ?");
                $stmtUserLab->execute([$data['userId']]);
                $lab = $stmtUserLab->fetchColumn();
                if (is_numeric($lab)) $finalDepto = $lab;
            }

            $idCepa = $data['idcepaA'] ?? null;
            if ($idCepa === '' || $idCepa === 0 || $idCepa === '0') $idCepa = null;

            // REGLA CEPAS POR ESPECIE:
            //  - Si la especie (de esta subespecie) tiene cepas habilitadas → idcepaA obligatorio
            //  - Si la especie tiene cepas pero TODAS deshabilitadas → no se puede hacer el formulario
            //  - Si la especie no tiene cepas → se permite seguir solo con subespecie
            $stmtInst = $this->db->prepare("
                SELECT e.IdInstitucion
                FROM subespecie s
                INNER JOIN especiee e ON s.idespA = e.idespA
                WHERE s.idsubespA = ?
            ");
            $stmtInst->execute([$data['idsubespA']]);
            $instId = $stmtInst->fetchColumn();

            if ($instId) {
                // Contamos todas las cepas de la especie y las habilitadas
                $stmtAll = $this->db->prepare("
                    SELECT 
                        COUNT(*)                                  AS total_cepas,
                        SUM(CASE WHEN c.Habilitado = 1 THEN 1 ELSE 0 END) AS cepas_hab
                    FROM cepa c
                    INNER JOIN especiee e ON c.idespA = e.idespA
                    INNER JOIN subespecie s ON s.idespA = e.idespA
                    WHERE s.idsubespA = ? AND e.IdInstitucion = ?
                ");
                $stmtAll->execute([$data['idsubespA'], $instId]);
                $row = $stmtAll->fetch(\PDO::FETCH_ASSOC) ?: ['total_cepas' => 0, 'cepas_hab' => 0];
                $totalCepas = (int)$row['total_cepas'];
                $cepasHab   = (int)$row['cepas_hab'];

                if ($totalCepas > 0 && $cepasHab === 0) {
                    throw new \Exception("No hay cepas habilitadas para esta especie. No se pueden hacer pedidos.");
                }

                if ($cepasHab > 0 && empty($idCepa)) {
                    throw new \Exception("Debe seleccionar una cepa para esta especie.");
                }

                // Si mandan una cepa, validamos que pertenezca a la especie de la subespecie e institución
                if (!empty($idCepa)) {
                    $stmtCepa = $this->db->prepare("
                        SELECT c.idcepaA
                        FROM cepa c
                        INNER JOIN especiee e ON c.idespA = e.idespA
                        INNER JOIN subespecie s ON s.idespA = e.idespA
                        WHERE c.idcepaA = ? 
                          AND s.idsubespA = ? 
                          AND c.Habilitado = 1 
                          AND e.IdInstitucion = ?
                    ");
                    $stmtCepa->execute([$idCepa, $data['idsubespA'], $data['instId']]);
                    if (!$stmtCepa->fetchColumn()) {
                        throw new \Exception("Error: La cepa seleccionada no es válida.");
                    }
                }
            }

            $sqlForm = "INSERT INTO formularioe (tipoA, idsubespA, idcepaA, edadA, pesoA, fechainicioA, fecRetiroA, aclaraA, IdUsrA, IdInstitucion, estado, raza, visto, depto) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'Sin estado', ?, 0, ?)";
            $this->db->prepare($sqlForm)->execute([
                $data['idTipoFormulario'],
                $data['idsubespA'],
                $idCepa,
                $data['edad'],
                $data['peso'],
                $data['fecha_retiro'],
                $data['aclaracion'],
                $data['userId'],
                $data['instId'],
                $data['raza'],
                $finalDepto
            ]);
            $idForm = $this->db->lastInsertId();

            $this->db->prepare("INSERT INTO sexoe (idformA, machoA, hembraA, indistintoA, totalA) VALUES (?, ?, ?, ?, ?)")->execute([$idForm, $data['macho'], $data['hembra'], $data['indistinto'], $data['total']]);

            // 🚀 NUEVO: CONGELAMOS EL PRECIO Y AGREGAMOS fechaIniForm
            $stmtPrecio = $this->db->prepare("SELECT Psubanimal FROM subespecie WHERE idsubespA = ?");
            $stmtPrecio->execute([$data['idsubespA']]);
            $precioMomento = (float)$stmtPrecio->fetchColumn();
            
            $totalAnimales = (int)$data['total'];
            $costoTotal = $precioMomento * $totalAnimales;

            $sqlPrecio = "INSERT INTO precioformulario (idformA, precioanimalmomento, precioformulario, totalpago, fechaIniForm) VALUES (?, ?, ?, 0, CURDATE())";
            $this->db->prepare($sqlPrecio)->execute([$idForm, $precioMomento, $costoTotal]);

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
$sql = "SELECT p.EmailA, p.NombreA, i.NombreInst, COALESCE(NULLIF(TRIM(p.idioma_preferido), ''), 'es') as idioma_preferido
                FROM personae p
                JOIN institucion i ON i.IdInstitucion = ?
                WHERE p.IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $userId]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    // Recupera nombres de Especie, Subespecie y Protocolo
    public function getNamesForMail($idSub, $idProt, $idCepa = null) {
        // 1. Especie y Categoría
        $sqlEsp = "SELECT e.EspeNombreA, s.SubEspeNombreA 
                   FROM subespecie s 
                   JOIN especiee e ON s.idespA = e.idespA 
                   WHERE s.idsubespA = ?";
        $stmt = $this->db->prepare($sqlEsp);
        $stmt->execute([$idSub]);
        $esp = $stmt->fetch(\PDO::FETCH_ASSOC);

        // 1.1 Cepa (si aplica)
        $cepaNombre = 'N/A';
        if (!empty($idCepa)) {
            $stmtC = $this->db->prepare("SELECT CepaNombreA FROM cepa WHERE idcepaA = ? LIMIT 1");
            $stmtC->execute([$idCepa]);
            $cepaNombre = $stmtC->fetchColumn() ?: 'N/A';
        }

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
            'categoria' => $esp['SubEspeNombreA'] ?? 'N/A',
            'cepa' => $cepaNombre,
            'nprot' => $nprot,
            'titulo' => $titulo
        ];
    }
}