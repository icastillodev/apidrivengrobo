<?php
namespace App\Models\Protocol;

use PDO;
use Exception;
use App\Utils\BackblazeB2;

class ProtocolModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function hasLocalSolicitudByProtocol($idprotA): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM solicitudprotocolo WHERE idprotA = ? AND TipoPedido = 1");
        $stmt->execute([(int)$idprotA]);
        return ((int)$stmt->fetchColumn()) > 0;
    }

    private function isManualProtocolFromInstitution($idprotA, $instId): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM protocoloexpe WHERE idprotA = ? AND IdInstitucion = ?");
        $stmt->execute([(int)$idprotA, (int)$instId]);
        if (((int)$stmt->fetchColumn()) <= 0) return false;
        return !$this->hasLocalSolicitudByProtocol($idprotA);
    }

    public function getByInstitution($instId) {
        $sql = "SELECT DISTINCT
                    pe.*, 
                    pe.idprotA, 
                    pe.nprotA, 
                    pe.tituloA, 
                    pe.CantidadAniA as SaldoAnimales, 
                    pe.encargaprot as RespProt, 
                    pe.FechaFinProtA as Vencimiento,
                    pe.protocoloexpe as IsExterno,
                    pe.departamento as DeptoOriginal,
                    COALESCE(pr.IdUsrA, pe.IdUsrA) as IdUsrEditable,
                    COALESCE(pr.iddeptoA, pe.departamento) as DeptoEditable,
                    COALESCE(pr.idtipoprotocolo, pe.tipoprotocolo) as TipoEditable,
                    COALESCE(pr.IdSeveridadTipo, pe.severidad) as SeveridadEditable,
                    
                    (SELECT COALESCE(SUM(s.totalA), 0)
                     FROM protformr pf
                     JOIN formularioe f ON pf.idformA = f.idformA
                     JOIN sexoe s ON f.idformA = s.idformA
                     WHERE pf.idprotA = pe.idprotA
                       AND f.estado = 'Entregado') as AnimalesUsados,

                    ((SELECT COALESCE(SUM(s.totalA), 0)
                      FROM protformr pf
                      JOIN formularioe f ON pf.idformA = f.idformA
                      JOIN sexoe s ON f.idformA = s.idformA
                      WHERE pf.idprotA = pe.idprotA
                        AND f.estado = 'Entregado') + pe.CantidadAniA) as AnimalesTotales,
                    
                    CONCAT('(', COALESCE(u.UsrA, ''), ') ', COALESCE(p.NombreA, ''), ' ', COALESCE(p.ApellidoA, ''), ' (ID:', COALESCE(pr.IdUsrA, pe.IdUsrA), ')') as ResponsableFormat,
                    CONCAT('(', COALESCE(u_src.UsrA, ''), ') ', COALESCE(p_src.NombreA, ''), ' ', COALESCE(p_src.ApellidoA, ''), ' (ID:', pe.IdUsrA, ')') as ResponsableOrigenFormat,
                    
                    (SELECT CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), ''))
                     FROM departamentoe d
                     LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                     WHERE d.iddeptoA = COALESCE(
                        pr.iddeptoA,
                        (SELECT pd.iddeptoA FROM protdeptor pd WHERE pd.idprotA = pe.idprotA LIMIT 1),
                        pe.departamento
                     )
                     LIMIT 1) as DeptoFormat,

                    (SELECT CONCAT(d0.NombreDeptoA, IF(o0.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o0.NombreOrganismoSimple, ']'), ''))
                     FROM departamentoe d0
                     LEFT JOIN organismoe o0 ON d0.organismopertenece = o0.IdOrganismo
                     WHERE d0.iddeptoA = COALESCE(
                        (SELECT pd0.iddeptoA FROM protdeptor pd0 WHERE pd0.idprotA = pe.idprotA LIMIT 1),
                        pe.departamento
                     )
                     LIMIT 1) as DeptoOrigenFormat,

                    (SELECT CONCAT(d2.NombreDeptoA, IF(o2.NombreOrganismoSimple IS NOT NULL, CONCAT(' (', o2.NombreOrganismoSimple, ')'), ''))
                     FROM departamentoe d2 
                     LEFT JOIN organismoe o2 ON d2.organismopertenece = o2.IdOrganismo
                     WHERE d2.iddeptoA = pe.departamento LIMIT 1) as DeptoProtocoloFormat,

                    COALESCE(tp_red.NombreTipoprotocolo, tp.NombreTipoprotocolo) as TipoNombre, 
                    COALESCE(ts_red.NombreSeveridad, ts.NombreSeveridad) as SeveridadNombre,
                    tp.NombreTipoprotocolo as TipoNombreOrigen,
                    ts.NombreSeveridad as SeveridadNombreOrigen,

                    (
                        SELECT 
                            CASE 
                                WHEN d.externodepto = 2 OR (d.externodepto IS NULL AND o.externoorganismo = 2) THEN 2
                                ELSE 1
                            END
                        FROM protdeptor pd2
                        JOIN departamentoe d ON pd2.iddeptoA = d.iddeptoA
                        LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                        WHERE pd2.idprotA = pe.idprotA
                        LIMIT 1
                    ) AS DeptoExternoFlag,

                    COALESCE(
                        (SELECT GROUP_CONCAT(eRed.EspeNombreA SEPARATOR ', ')
                         FROM protocoloexpered_especies preRed
                         JOIN especiee eRed ON preRed.idespA = eRed.idespA
                         WHERE preRed.IdProtocoloExpRed = pr.IdProtocoloExpRed),
                        (SELECT GROUP_CONCAT(e.EspeNombreA SEPARATOR ', ') 
                         FROM protesper pre 
                         JOIN especiee e ON pre.idespA = e.idespA 
                         WHERE pre.idprotA = pe.idprotA),
                        pe.especie
                    ) as EspeciesList,
                    COALESCE(
                        (SELECT GROUP_CONCAT(eo.EspeNombreA SEPARATOR ', ') 
                         FROM protesper preo
                         JOIN especiee eo ON preo.idespA = eo.idespA
                         WHERE preo.idprotA = pe.idprotA),
                        pe.especie
                    ) as EspeciesOrigenList,

                    i_orig.NombreInst as InstitucionOrigen,

                    (SELECT COUNT(DISTINCT srCount.IdInstitucion)
                     FROM solicitudprotocolo srCount
                     WHERE srCount.idprotA = pe.idprotA
                       AND srCount.TipoPedido = 2
                       AND srCount.Aprobado = 1
                       AND srCount.IdInstitucion IS NOT NULL) as RedAprobadaCount,

                    (SELECT GROUP_CONCAT(DISTINCT iRed.NombreInst ORDER BY iRed.NombreInst SEPARATOR ' | ')
                     FROM solicitudprotocolo srNames
                     JOIN institucion iRed ON iRed.IdInstitucion = srNames.IdInstitucion
                     WHERE srNames.idprotA = pe.idprotA
                       AND srNames.TipoPedido = 2
                       AND srNames.Aprobado = 1
                       AND srNames.IdInstitucion IS NOT NULL) as RedAprobadaInstituciones,

                    CASE
                        WHEN pe.IdInstitucion = ? THEN NULL
                        WHEN pr.IdProtocoloExpRed IS NULL THEN 0
                        WHEN pr.IdUsrA IS NULL OR pr.iddeptoA IS NULL OR pr.idtipoprotocolo IS NULL OR pr.IdSeveridadTipo IS NULL THEN 0
                        WHEN (SELECT COUNT(*) FROM protocoloexpered_especies prs WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed) <= 0 THEN 0
                        ELSE 1
                    END as RedConfigCompleta,

                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM solicitudprotocolo sp2
                            WHERE sp2.idprotA = pe.idprotA
                              AND sp2.TipoPedido = 2
                              AND sp2.Aprobado = 1
                              AND sp2.IdInstitucion = ?
                        ) THEN 'RED'
                        ELSE 'PROPIO'
                    END as TipoAprobacion,

                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM solicitudprotocolo sp3
                            WHERE sp3.idprotA = pe.idprotA
                              AND sp3.TipoPedido = 1
                        ) THEN 1
                        ELSE 0
                    END as TieneSolicitudLocal,

                    (SELECT s4.idSolicitudProtocolo
                     FROM solicitudprotocolo s4
                     WHERE s4.idprotA = pe.idprotA
                       AND s4.TipoPedido = 1
                       AND s4.Aprobado = 1
                     ORDER BY s4.idSolicitudProtocolo DESC
                     LIMIT 1) as IdSolicitudLocalAprobada

                FROM protocoloexpe pe
                LEFT JOIN personae p_src ON pe.IdUsrA = p_src.IdUsrA
                LEFT JOIN usuarioe u_src ON p_src.IdUsrA = u_src.IdUsrA
                LEFT JOIN protocoloexpered pr ON pr.idprotA = pe.idprotA AND pr.IdInstitucion = ?
                LEFT JOIN personae p ON p.IdUsrA = COALESCE(pr.IdUsrA, pe.IdUsrA)
                LEFT JOIN usuarioe u ON u.IdUsrA = COALESCE(pr.IdUsrA, pe.IdUsrA)
                LEFT JOIN tipoprotocolo tp ON pe.tipoprotocolo = tp.idtipoprotocolo
                LEFT JOIN tipoprotocolo tp_red ON pr.idtipoprotocolo = tp_red.idtipoprotocolo
                LEFT JOIN tiposeveridad ts ON pe.severidad = ts.IdSeveridadTipo
                LEFT JOIN tiposeveridad ts_red ON pr.IdSeveridadTipo = ts_red.IdSeveridadTipo
                LEFT JOIN protinstr pi ON pe.idprotA = pi.idprotA
                LEFT JOIN institucion i_orig ON pe.IdInstitucion = i_orig.IdInstitucion

                WHERE (
                    -- Propios: manuales o solicitudes locales aprobadas
                    (
                        pe.IdInstitucion = ?
                        AND (
                            NOT EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spLocal
                                WHERE spLocal.idprotA = pe.idprotA
                                  AND spLocal.TipoPedido = 1
                            )
                            OR EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spLocalOk
                                WHERE spLocalOk.idprotA = pe.idprotA
                                  AND spLocalOk.TipoPedido = 1
                                  AND spLocalOk.Aprobado = 1
                            )
                        )
                    )
                    OR
                    -- Red: solo asignados a esta institución y con solicitud de red aprobada
                    (
                        pi.IdInstitucion = ?
                        AND pe.IdInstitucion <> ?
                        AND (
                            -- Manual en red (sin solicitudes de red registradas)
                            NOT EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spRedOwn
                                WHERE spRedOwn.idprotA = pe.idprotA
                                  AND spRedOwn.TipoPedido = 2
                            )
                            OR
                            -- Solicitud de red aprobada para esta institución
                            EXISTS (
                                SELECT 1
                                FROM solicitudprotocolo spRedOk
                                WHERE spRedOk.idprotA = pe.idprotA
                                  AND spRedOk.TipoPedido = 2
                                  AND spRedOk.IdInstitucion = ?
                                  AND spRedOk.Aprobado = 1
                            )
                        )
                    )
                )
                ORDER BY pe.idprotA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId, $instId, $instId, $instId, $instId, $instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getFormData($instId) {
        // Usuarios
        $sqlUsers = "SELECT u.IdUsrA,
                            COALESCE(p.ApellidoA, '') as ApellidoA,
                            COALESCE(p.NombreA, '') as NombreA,
                            u.UsrA
                     FROM usuarioe u
                     LEFT JOIN personae p ON p.IdUsrA = u.IdUsrA
                     WHERE u.IdInstitucion = ?
                     ORDER BY p.ApellidoA ASC, p.NombreA ASC, u.UsrA ASC";
        $stmtUser = $this->db->prepare($sqlUsers);
        $stmtUser->execute([$instId]);
        $users = $stmtUser->fetchAll(PDO::FETCH_ASSOC);

        // Deptos
        $sqlDeptos = "SELECT d.iddeptoA, d.NombreDeptoA, o.NombreOrganismoSimple as OrgName
                      FROM departamentoe d
                      LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                      WHERE d.IdInstitucion = ?
                      ORDER BY d.NombreDeptoA ASC";
        $stmtDepto = $this->db->prepare($sqlDeptos);
        $stmtDepto->execute([$instId]);
        $depts = $stmtDepto->fetchAll(PDO::FETCH_ASSOC);

        $stmtEsp = $this->db->prepare("SELECT idespA, EspeNombreA FROM especiee WHERE IdInstitucion = ?");
        $stmtEsp->execute([$instId]);
        $species = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);

        $stmtSev = $this->db->query("SELECT IdSeveridadTipo, NombreSeveridad FROM tiposeveridad");
        $severities = $stmtSev->fetchAll(PDO::FETCH_ASSOC);

        $stmtTipos = $this->db->prepare("SELECT idtipoprotocolo, NombreTipoprotocolo FROM tipoprotocolo WHERE IdInstitucion = ?");
        $stmtTipos->execute([$instId]);
        $types = $stmtTipos->fetchAll(PDO::FETCH_ASSOC);

        $stmtInst = $this->db->prepare("SELECT otrosceuas, NombreCompletoInst, DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$instId]);
        $instConfig = $stmtInst->fetch(PDO::FETCH_ASSOC);

        return [
            'users' => $users,
            'species' => $species,
            'severities' => $severities,
            'types' => $types,
            'depts' => $depts,
            'otrosceuas_enabled' => ($instConfig && $instConfig['otrosceuas'] != 2),
            'NombreCompletoInst' => $instConfig['NombreCompletoInst'] ?? 'Institución',
            'has_network' => !empty($instConfig['DependenciaInstitucion'])
        ];
    }

    public function getPendingRequestsCount($instId) {
        $sql = "SELECT COUNT(DISTINCT s.idSolicitudProtocolo) as count
                FROM solicitudprotocolo s
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                LEFT JOIN protinstr pi ON p.idprotA = pi.idprotA
                WHERE s.Aprobado = 3
                  AND (
                    (s.TipoPedido = 1 AND p.IdInstitucion = ?)
                    OR
                    (s.TipoPedido = 2 AND (
                        s.IdInstitucion = ?
                        OR (s.IdInstitucion IS NULL AND pi.IdInstitucion = ?)
                    ))
                  )";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId, $instId]);
        return $stmt->fetchColumn();
    }

    public function getProtocolSpecies($idprotA, $instId = null) {
        $idprotA = (int)$idprotA;
        $instId = (int)$instId;

        if ($idprotA <= 0) return [];

        if ($instId > 0) {
            $stmtOwner = $this->db->prepare("SELECT IdInstitucion FROM protocoloexpe WHERE idprotA = ? LIMIT 1");
            $stmtOwner->execute([$idprotA]);
            $ownerInst = (int)$stmtOwner->fetchColumn();

            if ($ownerInst > 0 && $ownerInst !== $instId) {
                $sqlRed = "SELECT e.idespA, e.EspeNombreA
                           FROM protocoloexpered pr
                           JOIN protocoloexpered_especies pre ON pre.IdProtocoloExpRed = pr.IdProtocoloExpRed
                           JOIN especiee e ON pre.idespA = e.idespA
                           WHERE pr.idprotA = ? AND pr.IdInstitucion = ?
                           ORDER BY e.EspeNombreA ASC";
                $stmtRed = $this->db->prepare($sqlRed);
                $stmtRed->execute([$idprotA, $instId]);
                return $stmtRed->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        $sql = "SELECT e.idespA, e.EspeNombreA
                FROM protesper pe
                INNER JOIN especiee e ON pe.idespA = e.idespA
                WHERE pe.idprotA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function ensureRedConfigForInstitution($idprotA, $instId) {
        $idprotA = (int)$idprotA;
        $instId = (int)$instId;
        if ($idprotA <= 0 || $instId <= 0) return;

        $stmtChk = $this->db->prepare("SELECT IdProtocoloExpRed
                                       FROM protocoloexpered
                                       WHERE idprotA = ? AND IdInstitucion = ?
                                       LIMIT 1");
        $stmtChk->execute([$idprotA, $instId]);
        $exists = (int)$stmtChk->fetchColumn();
        if ($exists > 0) return;

        $stmtSrc = $this->db->prepare("SELECT IdUsrA FROM protocoloexpe WHERE idprotA = ? LIMIT 1");
        $stmtSrc->execute([$idprotA]);
        $idUsrA = $stmtSrc->fetchColumn();
        $idUsrA = ($idUsrA !== false && $idUsrA !== null) ? (int)$idUsrA : null;

        $stmtIns = $this->db->prepare("INSERT INTO protocoloexpered
                                       (idprotA, IdInstitucion, IdUsrA, iddeptoA, idtipoprotocolo, IdSeveridadTipo, FechaCreado, FechaActualizado)
                                       VALUES (?, ?, ?, NULL, NULL, NULL, NOW(), NOW())");
        $stmtIns->execute([$idprotA, $instId, $idUsrA]);
    }

    public function saveRedInstitutionConfig($idprotA, $instId, array $data) {
        $idprotA = (int)$idprotA;
        $instId = (int)$instId;
        if ($idprotA <= 0 || $instId <= 0) {
            throw new Exception('Parámetros inválidos.');
        }

        $stmtAccess = $this->db->prepare("SELECT p.idprotA
                                          FROM protocoloexpe p
                                          LEFT JOIN protinstr pi ON pi.idprotA = p.idprotA
                                          WHERE p.idprotA = ?
                                            AND p.IdInstitucion <> ?
                                            AND pi.IdInstitucion = ?
                                          LIMIT 1");
        $stmtAccess->execute([$idprotA, $instId, $instId]);
        if (!$stmtAccess->fetchColumn()) {
            throw new Exception('No autorizado para editar la configuración de red de este protocolo.');
        }

        $this->ensureRedConfigForInstitution($idprotA, $instId);

        $stmtGet = $this->db->prepare("SELECT IdProtocoloExpRed
                                       FROM protocoloexpered
                                       WHERE idprotA = ? AND IdInstitucion = ?
                                       LIMIT 1");
        $stmtGet->execute([$idprotA, $instId]);
        $idProtRed = (int)$stmtGet->fetchColumn();
        if ($idProtRed <= 0) {
            throw new Exception('No se pudo crear la configuración local de red.');
        }

        $idUsrA = isset($data['IdUsrA']) && $data['IdUsrA'] !== '' ? (int)$data['IdUsrA'] : null;
        $iddeptoA = isset($data['departamento']) && $data['departamento'] !== '' ? (int)$data['departamento'] : null;
        $idtipo = isset($data['tipoprotocolo']) && $data['tipoprotocolo'] !== '' ? (int)$data['tipoprotocolo'] : null;
        $idsev = isset($data['severidad']) && $data['severidad'] !== '' ? (int)$data['severidad'] : null;

        $stmtUpd = $this->db->prepare("UPDATE protocoloexpered
                                       SET IdUsrA = ?, iddeptoA = ?, idtipoprotocolo = ?, IdSeveridadTipo = ?, FechaActualizado = NOW()
                                       WHERE IdProtocoloExpRed = ?");
        $stmtUpd->execute([$idUsrA, $iddeptoA, $idtipo, $idsev, $idProtRed]);

        $this->db->prepare("DELETE FROM protocoloexpered_especies WHERE IdProtocoloExpRed = ?")->execute([$idProtRed]);

        if (isset($data['especies']) && is_array($data['especies'])) {
            $unique = [];
            foreach ($data['especies'] as $esp) {
                $eid = (int)$esp;
                if ($eid > 0) $unique[$eid] = true;
            }
            if (!empty($unique)) {
                $insEsp = $this->db->prepare("INSERT INTO protocoloexpered_especies (IdProtocoloExpRed, idespA) VALUES (?, ?)");
                foreach (array_keys($unique) as $eid) {
                    $insEsp->execute([$idProtRed, $eid]);
                }
            }
        }
    }

    public function getAttachmentsByProtocol($idprotA, $instId) {
        if ($this->isManualProtocolFromInstitution($idprotA, $instId)) {
            $sqlManual = "SELECT
                            a.IdProtocoloAdjunto as IdManualAdjuntoProtocolo,
                            a.nombre_original,
                            a.file_key,
                            a.tipoadjunto,
                            'manual' as source
                          FROM protocoloexpeadjuntos a
                          WHERE a.idprotA = ?
                          ORDER BY a.tipoadjunto ASC, a.IdProtocoloAdjunto ASC";
            $stmtManual = $this->db->prepare($sqlManual);
            $stmtManual->execute([(int)$idprotA]);
            return $stmtManual->fetchAll(PDO::FETCH_ASSOC);
        }

        $sql = "SELECT DISTINCT
                    a.Id_adjuntos_protocolos,
                    a.nombre_original,
                    a.file_key,
                    a.tipoadjunto,
                    'solicitud' as source
                FROM solicitudadjuntosprotocolos a
                JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.idSolicitudProtocolo
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                LEFT JOIN protinstr pi ON p.idprotA = pi.idprotA
                WHERE p.idprotA = ?
                  AND s.idSolicitudProtocolo = (
                    SELECT MAX(s2.idSolicitudProtocolo)
                    FROM solicitudprotocolo s2
                    WHERE s2.idprotA = p.idprotA
                      AND s2.TipoPedido = s.TipoPedido
                  )
                  AND (
                    (p.IdInstitucion = ? AND s.TipoPedido = 1 AND s.Aprobado = 1)
                    OR
                    (pi.IdInstitucion = ? AND p.IdInstitucion <> ? AND s.TipoPedido = 2 AND s.Aprobado = 1 AND s.IdInstitucion = ?)
                  )
                ORDER BY a.tipoadjunto ASC, a.Id_adjuntos_protocolos ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA, $instId, $instId, $instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getManualAttachmentById($attId, $instId) {
        $sql = "SELECT a.IdProtocoloAdjunto, a.idprotA, a.nombre_original, a.file_key
                FROM protocoloexpeadjuntos a
                JOIN protocoloexpe p ON p.idprotA = a.idprotA
                WHERE a.IdProtocoloAdjunto = ?
                  AND p.IdInstitucion = ?
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$attId, (int)$instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        if ($this->hasLocalSolicitudByProtocol((int)$row['idprotA'])) return null;
        return $row;
    }

    public function deleteManualAttachment($attId, $instId) {
        $att = $this->getManualAttachmentById((int)$attId, (int)$instId);
        if (!$att) {
            throw new Exception('Adjunto manual no encontrado.');
        }

        $fileKey = trim((string)($att['file_key'] ?? ''));
        if ($fileKey !== '') {
            $b2 = new BackblazeB2();
            $b2->deleteFileByKey($fileKey);
        }

        $stmt = $this->db->prepare("DELETE FROM protocoloexpeadjuntos WHERE IdProtocoloAdjunto = ?");
        $stmt->execute([(int)$attId]);
        return true;
    }

    public function saveManualAttachments($idprotA, $instId, array $files): void {
        $idprotA = (int)$idprotA;
        $instId = (int)$instId;
        if ($idprotA <= 0 || $instId <= 0) return;

        $allowedSlots = ['adjunto1' => 1, 'adjunto2' => 2, 'adjunto3' => 3];
        $hasIncoming = false;
        foreach (array_keys($allowedSlots) as $slot) {
            if (isset($files[$slot]) && (int)($files[$slot]['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                $hasIncoming = true;
                break;
            }
        }
        if (!$hasIncoming) return;

        if (!$this->isManualProtocolFromInstitution($idprotA, $instId)) {
            throw new Exception('Los adjuntos solo se permiten en protocolos manuales sin solicitud.');
        }

        $b2 = new BackblazeB2();
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if (!$finfo) {
            throw new Exception('No se pudo validar tipo de archivo.');
        }

        try {
            foreach ($allowedSlots as $slotName => $tipoAdjunto) {
                if (!isset($files[$slotName])) continue;
                $file = $files[$slotName];
                $err = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
                if ($err === UPLOAD_ERR_NO_FILE) continue;
                if ($err !== UPLOAD_ERR_OK) {
                    throw new Exception('Error al subir archivo en ' . $slotName . '.');
                }

                $tmp = (string)($file['tmp_name'] ?? '');
                $origName = trim((string)($file['name'] ?? 'archivo.pdf'));
                $size = (int)($file['size'] ?? 0);
                if ($size <= 0 || $size > (2 * 1024 * 1024)) {
                    throw new Exception('Cada adjunto debe ser PDF y no superar 2MB.');
                }

                $mime = (string)finfo_file($finfo, $tmp);
                $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
                if ($mime !== 'application/pdf' || $ext !== 'pdf') {
                    throw new Exception('Solo se permiten archivos PDF en adjuntos de protocolo.');
                }

                $safeBase = preg_replace('/[^\w\.\-]+/u', '_', $origName);
                if (!preg_match('/\.pdf$/i', $safeBase)) $safeBase .= '.pdf';
                if ($safeBase === '' || $safeBase === '.pdf') $safeBase = 'adjunto.pdf';

                $fileKey = 'protocolos/manuales/' . $instId . '/prot_' . $idprotA . '/tipo_' . $tipoAdjunto . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.pdf';

                $stmtPrev = $this->db->prepare("SELECT IdProtocoloAdjunto, file_key FROM protocoloexpeadjuntos WHERE idprotA = ? AND tipoadjunto = ? LIMIT 1");
                $stmtPrev->execute([$idprotA, $tipoAdjunto]);
                $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);
                $prevKey = trim((string)($prev['file_key'] ?? ''));

                $b2->uploadFile($tmp, $fileKey, 'application/pdf');

                if ($prev && !empty($prev['IdProtocoloAdjunto'])) {
                    $stmtUpd = $this->db->prepare("UPDATE protocoloexpeadjuntos
                                                   SET nombre_original = ?, file_key = ?, mime_type = 'application/pdf', size_bytes = ?, FechaActualizado = NOW()
                                                   WHERE IdProtocoloAdjunto = ?");
                    $stmtUpd->execute([$safeBase, $fileKey, $size, (int)$prev['IdProtocoloAdjunto']]);
                } else {
                    $stmtIns = $this->db->prepare("INSERT INTO protocoloexpeadjuntos
                                                   (idprotA, tipoadjunto, nombre_original, file_key, mime_type, size_bytes, FechaCreado, FechaActualizado)
                                                   VALUES (?, ?, ?, ?, 'application/pdf', ?, NOW(), NOW())");
                    $stmtIns->execute([$idprotA, $tipoAdjunto, $safeBase, $fileKey, $size]);
                }

                if ($prevKey !== '' && $prevKey !== $fileKey) {
                    $b2->deleteFileByKey($prevKey);
                }
            }
        } finally {
            finfo_close($finfo);
        }
    }

    public function getNetworkStatusByProtocol($idprotA, $instId) {
        $idprotA = (int)$idprotA;
        $instId = (int)$instId;
        if ($idprotA <= 0 || $instId <= 0) {
            throw new Exception('Parámetros inválidos.');
        }

        $stmtProt = $this->db->prepare("SELECT p.idprotA, p.IdInstitucion
                                        FROM protocoloexpe p
                                        LEFT JOIN protinstr pi ON pi.idprotA = p.idprotA
                                        WHERE p.idprotA = ?
                                          AND (p.IdInstitucion = ? OR pi.IdInstitucion = ?)
                                        LIMIT 1");
        $stmtProt->execute([$idprotA, $instId, $instId]);
        $prot = $stmtProt->fetch(PDO::FETCH_ASSOC);
        if (!$prot) {
            throw new Exception('No autorizado para ver estado de red de este protocolo.');
        }

        $ownerInstId = (int)$prot['IdInstitucion'];

        $stmtDep = $this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ? LIMIT 1");
        $stmtDep->execute([$instId]);
        $dep = $stmtDep->fetchColumn();
        if (!$dep) return [];

        $stmtInst = $this->db->prepare("SELECT IdInstitucion, NombreInst
                                        FROM institucion
                                        WHERE DependenciaInstitucion = ?
                                          AND Activo = 1
                                        ORDER BY CASE WHEN IdInstitucion = ? THEN 0 ELSE 1 END, NombreInst ASC");
        $stmtInst->execute([$dep, $instId]);
        $instituciones = $stmtInst->fetchAll(PDO::FETCH_ASSOC);

        $stmtLocal = $this->db->prepare("SELECT Aprobado
                                         FROM solicitudprotocolo
                                         WHERE idprotA = ? AND TipoPedido = 1
                                         ORDER BY IdSolicitudProtocolo DESC
                                         LIMIT 1");
        $stmtLocal->execute([$idprotA]);
        $localStatus = $stmtLocal->fetchColumn();
        $localStatus = ($localStatus === false || $localStatus === null) ? 1 : (int)$localStatus;

        $stmtReq = $this->db->prepare("SELECT IdInstitucion, Aprobado, IdSolicitudProtocolo
                                       FROM solicitudprotocolo
                                       WHERE idprotA = ? AND TipoPedido = 2 AND IdInstitucion IS NOT NULL
                                       ORDER BY IdSolicitudProtocolo DESC");
        $stmtReq->execute([$idprotA]);
        $reqRows = $stmtReq->fetchAll(PDO::FETCH_ASSOC);
        $mapByInst = [];
        foreach ($reqRows as $row) {
            $iid = (int)$row['IdInstitucion'];
            if ($iid <= 0 || isset($mapByInst[$iid])) continue;
            $mapByInst[$iid] = (int)$row['Aprobado'];
        }

        $stmtGlobal = $this->db->prepare("SELECT Aprobado
                                          FROM solicitudprotocolo
                                          WHERE idprotA = ? AND TipoPedido = 2 AND (IdInstitucion IS NULL OR IdInstitucion = 0)
                                          ORDER BY IdSolicitudProtocolo DESC
                                          LIMIT 1");
        $stmtGlobal->execute([$idprotA]);
        $globalStatus = $stmtGlobal->fetchColumn();
        $globalStatus = ($globalStatus === false || $globalStatus === null) ? null : (int)$globalStatus;

        $stmtTargets = $this->db->prepare("SELECT IdInstitucion FROM protinstr WHERE idprotA = ?");
        $stmtTargets->execute([$idprotA]);
        $targets = array_map('intval', $stmtTargets->fetchAll(PDO::FETCH_COLUMN));
        $targetMap = array_fill_keys($targets, true);

        $result = [];
        foreach ($instituciones as $inst) {
            $iid = (int)$inst['IdInstitucion'];
            $isOwner = ($iid === $ownerInstId);
            $status = 0;

            if ($isOwner) {
                $status = $localStatus;
            } elseif (isset($mapByInst[$iid])) {
                $status = (int)$mapByInst[$iid];
            } elseif (isset($targetMap[$iid]) && $globalStatus !== null) {
                $status = (int)$globalStatus;
            } else {
                $status = 0;
            }

            $result[] = [
                'IdInstitucion' => $iid,
                'NombreInst' => $inst['NombreInst'],
                'esPropietaria' => $isOwner ? 1 : 0,
                'estado' => $status
            ];
        }

        return $result;
    }

    public function getProtocolosValidos($instId) {
        // Trae los protocolos de la institución que NO estén rechazados (2) ni pendientes (3) en la tabla solicitud.
        // Si no existen en la tabla solicitud (LEFT JOIN es NULL), significa que fueron manuales y están aprobados.
        $sql = "
            SELECT p.*, 
                   COALESCE(CONCAT(u.NombreA, ' ', u.ApellidoA), p.InvestigadorACargA) as InvestigadorACargA
            FROM protocoloexpe p
            LEFT JOIN personae u ON p.IdUsrA = u.IdUsrA
            LEFT JOIN solicitud s ON p.idprotA = s.idprotA
            WHERE p.IdInstitucion = ? 
            AND (s.id_solicitud IS NULL OR s.estado NOT IN (2, 3))
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function deleteManualProtocol($idprotA, $instId, $userId, $plainPassword, $role) {
        $role = (int)$role;
        if (!in_array($role, [1, 2, 4], true)) {
            throw new Exception('No tienes permisos para borrar protocolos.');
        }
        if (trim((string)$plainPassword) === '') {
            throw new Exception('Debes ingresar tu contraseña para confirmar el borrado.');
        }

        $stmtOwn = $this->db->prepare("SELECT idprotA, tituloA FROM protocoloexpe WHERE idprotA = ? AND IdInstitucion = ?");
        $stmtOwn->execute([$idprotA, $instId]);
        $prot = $stmtOwn->fetch(PDO::FETCH_ASSOC);
        if (!$prot) {
            throw new Exception('El protocolo no pertenece a esta institución o no existe.');
        }

        $stmtReq = $this->db->prepare("SELECT COUNT(*) FROM solicitudprotocolo WHERE idprotA = ? AND TipoPedido = 1");
        $stmtReq->execute([$idprotA]);
        $hasLocalRequest = ((int)$stmtReq->fetchColumn()) > 0;
        if ($hasLocalRequest) {
            throw new Exception('Este protocolo proviene de una solicitud. Debes usar la opción de rechazo de solicitud.');
        }

        $stmtPwd = $this->db->prepare("SELECT password_secure FROM usuarioe WHERE IdUsrA = ? LIMIT 1");
        $stmtPwd->execute([$userId]);
        $hash = (string)$stmtPwd->fetchColumn();
        if ($hash === '' || !password_verify($plainPassword, $hash)) {
            throw new Exception('La contraseña ingresada no es válida.');
        }

        $stmtForms = $this->db->prepare("SELECT COUNT(*) FROM protformr WHERE idprotA = ?");
        $stmtForms->execute([$idprotA]);
        $formsCount = (int)$stmtForms->fetchColumn();
        if ($formsCount > 0) {
            throw new Exception("No se puede borrar: este protocolo tiene {$formsCount} formulario(s) asociado(s).");
        }

        $this->db->beginTransaction();
        try {
            // Si hubiese solicitudes con adjuntos colgantes para este protocolo, se limpian de B2.
            $stmtFiles = $this->db->prepare("SELECT a.file_key
                                             FROM solicitudadjuntosprotocolos a
                                             JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.idSolicitudProtocolo
                                             WHERE s.idprotA = ?");
            $stmtFiles->execute([$idprotA]);
            $fileRows = $stmtFiles->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($fileRows)) {
                $b2 = new BackblazeB2();
                foreach ($fileRows as $row) {
                    $key = trim((string)($row['file_key'] ?? ''));
                    if ($key !== '') {
                        $b2->deleteFileByKey($key);
                    }
                }
            }

            // Limpiar adjuntos manuales del protocolo (B2 + BD).
            $stmtManualFiles = $this->db->prepare("SELECT file_key FROM protocoloexpeadjuntos WHERE idprotA = ?");
            $stmtManualFiles->execute([$idprotA]);
            $manualRows = $stmtManualFiles->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($manualRows)) {
                $b2 = isset($b2) ? $b2 : new BackblazeB2();
                foreach ($manualRows as $row) {
                    $key = trim((string)($row['file_key'] ?? ''));
                    if ($key !== '') {
                        $b2->deleteFileByKey($key);
                    }
                }
                $this->db->prepare("DELETE FROM protocoloexpeadjuntos WHERE idprotA = ?")->execute([$idprotA]);
            }

            $stmtSolIds = $this->db->prepare("SELECT idSolicitudProtocolo FROM solicitudprotocolo WHERE idprotA = ?");
            $stmtSolIds->execute([$idprotA]);
            $solIds = array_map('intval', array_column($stmtSolIds->fetchAll(PDO::FETCH_ASSOC), 'idSolicitudProtocolo'));
            if (!empty($solIds)) {
                $ph = implode(',', array_fill(0, count($solIds), '?'));
                $stmtDelAdj = $this->db->prepare("DELETE FROM solicitudadjuntosprotocolos WHERE IdSolicitudProtocolo IN ($ph)");
                $stmtDelAdj->execute($solIds);
            }

            $this->db->prepare("DELETE FROM solicitudprotocolo WHERE idprotA = ?")->execute([$idprotA]);
            $this->db->prepare("DELETE FROM protinstr WHERE idprotA = ?")->execute([$idprotA]);
            $this->db->prepare("DELETE FROM protesper WHERE idprotA = ?")->execute([$idprotA]);
            $this->db->prepare("DELETE FROM protdeptor WHERE idprotA = ?")->execute([$idprotA]);
            $this->db->prepare("DELETE FROM protocoloexpe WHERE idprotA = ? AND IdInstitucion = ?")->execute([$idprotA, $instId]);

            $this->db->commit();
            return ['deleted' => true, 'titulo' => $prot['tituloA'] ?? ('ID ' . $idprotA)];
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function rejectApprovedSolicitudProtocol($idprotA, $instId, $reason) {
        $reason = trim((string)$reason);
        if ($reason === '') {
            throw new Exception('Debes escribir el motivo del rechazo.');
        }

        $sql = "SELECT s.idSolicitudProtocolo, s.idprotA, p.tituloA, i.NombreInst as InstName,
                       pers.EmailA as Email,
                       COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), u.UsrA) as NombreUser,
                       COALESCE(NULLIF(TRIM(pers.idioma_preferido), ''), 'es') as lang
                FROM solicitudprotocolo s
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                LEFT JOIN institucion i ON p.IdInstitucion = i.IdInstitucion
                LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                WHERE s.idprotA = ?
                  AND p.IdInstitucion = ?
                  AND s.TipoPedido = 1
                  AND s.Aprobado = 1
                ORDER BY s.idSolicitudProtocolo DESC
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA, $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('No existe una solicitud aprobada para rechazar en este protocolo.');
        }

        // Al rechazar: mantener solicitud/protocolo, pero limpiar adjuntos (B2 + BD).
        $stmtAtt = $this->db->prepare("SELECT Id_adjuntos_protocolos, file_key
                                       FROM solicitudadjuntosprotocolos
                                       WHERE IdSolicitudProtocolo = ?");
        $stmtAtt->execute([(int)$row['idSolicitudProtocolo']]);
        $attachments = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($attachments)) {
            $b2 = new BackblazeB2();
            foreach ($attachments as $att) {
                $key = trim((string)($att['file_key'] ?? ''));
                if ($key !== '') {
                    $b2->deleteFileByKey($key);
                }
            }
            $this->db->prepare("DELETE FROM solicitudadjuntosprotocolos WHERE IdSolicitudProtocolo = ?")
                ->execute([(int)$row['idSolicitudProtocolo']]);
        }

        $stmtUpd = $this->db->prepare("UPDATE solicitudprotocolo
                                       SET Aprobado = 2, DetalleAdm = ?, FechaAprobado = NOW()
                                       WHERE idSolicitudProtocolo = ?");
        $stmtUpd->execute([$reason, $row['idSolicitudProtocolo']]);

        return [
            'idSolicitud' => (int)$row['idSolicitudProtocolo'],
            'Email'       => $row['Email'] ?? '',
            'NombreUser'  => $row['NombreUser'] ?? '',
            'tituloA'     => $row['tituloA'] ?? '',
            'InstName'    => $row['InstName'] ?? 'Institución',
            'lang'        => $row['lang'] ?? 'es'
        ];
    }
}