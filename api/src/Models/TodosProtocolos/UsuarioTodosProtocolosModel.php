<?php
namespace App\Models\TodosProtocolos;

use PDO;
use Exception;
use App\Utils\BackblazeB2;
use App\Utils\Auditoria;

class UsuarioTodosProtocolosModel {
    private $db;

    public function __construct($db) { $this->db = $db; }

    // --- CONFIGURACIÓN ---
    public function getConfig($instId) {
        $stmtI = $this->db->prepare("SELECT DependenciaInstitucion, NombreCompletoInst FROM institucion WHERE IdInstitucion = ?");
        $stmtI->execute([$instId]);
        $instData = $stmtI->fetch(PDO::FETCH_ASSOC);
        $dep = $instData['DependenciaInstitucion'] ?? null;

        $depts = $this->db->prepare("SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ? ORDER BY NombreDeptoA"); 
        $depts->execute([$instId]);
        
        $types = $this->db->prepare("SELECT idtipoprotocolo, NombreTipoprotocolo FROM tipoprotocolo WHERE IdInstitucion = ? ORDER BY NombreTipoprotocolo");
        $types->execute([$instId]);

        $sev = $this->db->prepare("SELECT IdSeveridadTipo, NombreSeveridad FROM tiposeveridad WHERE IdInstitucion = ?"); 
        $sev->execute([$instId]);
        
        $esp = $this->db->prepare("SELECT idespA, EspeNombreA FROM especiee WHERE IdInstitucion = ?"); 
        $esp->execute([$instId]);

        $netInsts = [];
        if(!empty($dep)) {
            $stmtN = $this->db->prepare("SELECT IdInstitucion, NombreInst FROM institucion WHERE DependenciaInstitucion = ? AND IdInstitucion != ? AND Activo = 1");
            $stmtN->execute([$dep, $instId]);
            $netInsts = $stmtN->fetchAll(PDO::FETCH_ASSOC);
        }

        return [
            'depts' => $depts->fetchAll(PDO::FETCH_ASSOC),
            'types' => $types->fetchAll(PDO::FETCH_ASSOC),
            'severities' => $sev->fetchAll(PDO::FETCH_ASSOC),
            'species' => $esp->fetchAll(PDO::FETCH_ASSOC),
            'has_network' => (!empty($dep) && count($netInsts) > 0),
            'network_institutions' => $netInsts,
            'NombreCompletoInst' => $instData['NombreCompletoInst']
        ];
    }

    // --- QUERY BASE ---
    private function getCommonFields() {
        return "p.idprotA, p.nprotA, p.tituloA, p.InvestigadorACargA, p.FechaIniProtA as FechaInicio, p.FechaFinProtA as Vencimiento, 
                p.variasInst, p.protocoloexpe as IsExterno, p.CantidadAniA, p.IdUsrA, p.departamento as IdDepto,
                t.NombreTipoprotocolo as TipoNombre,
                COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), u.UsrA, CONCAT('ID: ', p.IdUsrA)) as ResponsableName,
                i_orig.NombreCompletoInst as Origen, i_orig.NombreInst as InstitucionOrigen,
                
                (SELECT COALESCE(SUM(s.totalA), 0)
                 FROM protformr pf
                 JOIN formularioe f ON pf.idformA = f.idformA
                 JOIN sexoe s ON f.idformA = s.idformA
                 WHERE pf.idprotA = p.idprotA
                   AND f.estado = 'Entregado') as AnimalesUsados,
                
                (SELECT CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), '')) FROM protdeptor pd JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo WHERE pd.idprotA = p.idprotA LIMIT 1) as DeptoFormat";
    }

    // 1. MIS PROTOCOLOS (muestra todos los protocolos del usuario, sin filtrar por estado)
    public function getMyProtocols($instId, $userId) {
        $fields = $this->getCommonFields();
        $sql = "SELECT $fields, 
                       -- MANUALES: Si no hay solicitud, es Aprobado (1)
                       CASE 
                           WHEN sp.idSolicitudProtocolo IS NULL THEN 1 
                           ELSE sp.Aprobado 
                       END as Aprobado,
                       
                       sp.DetalleAdm,
                       sp.idSolicitudProtocolo as IdSolicitudProtocoloLocal,
                       sr.Aprobado as AprobadoRed,
                       
                       CASE 
                           WHEN p.variasInst = 2 OR (SELECT COUNT(*) FROM protinstr pi WHERE pi.idprotA = p.idprotA) > 0 THEN 'RED' 
                           ELSE 'PROPIA' 
                       END as OrigenCalculado

                FROM protocoloexpe p
                LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                
                -- JOIN Solicitud Local
                LEFT JOIN solicitudprotocolo sp ON p.idprotA = sp.idprotA AND sp.TipoPedido = 1
                -- JOIN Solicitud Red
                LEFT JOIN solicitudprotocolo sr ON p.idprotA = sr.idprotA AND sr.TipoPedido = 2
                
                WHERE p.IdUsrA = ?
                ORDER BY p.idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        // Solo pasamos userId, ya no instId
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 2. INSTITUCIÓN ACTUAL
    public function getLocalProtocols($instId) {
        $fields = $this->getCommonFields();
        
        // A) PROPIOS
        $sqlA = "SELECT $fields, 'PROPIA' as OrigenCalculado
                 FROM protocoloexpe p
                 LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                 LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                 LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                 LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                 LEFT JOIN solicitudprotocolo sp ON p.idprotA = sp.idprotA AND sp.TipoPedido = 1
                 WHERE p.IdInstitucion = ? 
                 AND (sp.idSolicitudProtocolo IS NULL OR sp.Aprobado = 1)";

        // B) RED
        $sqlB = "SELECT $fields, 'RED' as OrigenCalculado
                 FROM protinstr pi
                 JOIN protocoloexpe p ON pi.idprotA = p.idprotA
                 LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                 LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                 LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                 LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                 WHERE pi.IdInstitucion = ? 
                 AND EXISTS (SELECT 1 FROM solicitudprotocolo s WHERE s.idprotA = p.idprotA AND s.TipoPedido = 2 AND s.Aprobado = 1)";

        $sql = "($sqlA) UNION ($sqlB) ORDER BY idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 3. RED GLOBAL
    public function getNetworkProtocols($instId) {
        $d = $this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $d->execute([$instId]); $dep = $d->fetchColumn();
        if (!$dep) return [];

        $fields = $this->getCommonFields();
        $sql = "SELECT $fields, 'RED' as OrigenCalculado
                FROM protocoloexpe p
                JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                LEFT JOIN solicitudprotocolo sp_orig ON p.idprotA = sp_orig.idprotA AND sp_orig.TipoPedido = 1
                WHERE i_orig.DependenciaInstitucion = ? AND p.IdInstitucion != ? 
                AND (sp_orig.Aprobado = 1 OR sp_orig.idSolicitudProtocolo IS NULL)
                ORDER BY p.idprotA DESC";
        $stmt = $this->db->prepare($sql); $stmt->execute([$dep, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ESCRITURA
    public function getProtocolSpecies($id){$s=$this->db->prepare("SELECT e.idespA, e.EspeNombreA FROM protesper pe JOIN especiee e ON pe.idespA=e.idespA WHERE pe.idprotA=?");$s->execute([$id]);return $s->fetchAll(PDO::FETCH_ASSOC);}
    
    private function normalizeProtocolDates(array $d): array {
        $rawIni = isset($d['FechaIniProtA']) ? trim($d['FechaIniProtA']) : '';
        $rawFin = isset($d['FechaFinProtA']) ? trim($d['FechaFinProtA']) : '';

        $ini = $rawIni === '' ? null : $rawIni;
        $fin = $rawFin === '' ? null : $rawFin;

        foreach (['inicio' => $ini, 'vencimiento' => $fin] as $label => $val) {
            if ($val !== null) {
                $dt = \DateTime::createFromFormat('Y-m-d', $val);
                if (!$dt || $dt->format('Y-m-d') !== $val) {
                    throw new Exception("La fecha de {$label} del protocolo no es válida.");
                }
            }
        }

        if ($ini !== null && $fin !== null && $fin < $ini) {
            throw new Exception("La fecha de vencimiento del protocolo no puede ser anterior a la fecha de inicio.");
        }

        return [$ini, $fin];
    }

    public function createInternal($d, $u, $files = null) {
        $this->db->beginTransaction();
        try {
            [$ini, $fin] = $this->normalizeProtocolDates($d);
            $s=$this->db->prepare("INSERT INTO protocoloexpe (tituloA,nprotA,InvestigadorACargA,departamento,tipoprotocolo,CantidadAniA,severidad,FechaIniProtA,FechaFinProtA,IdInstitucion,IdUsrA,variasInst,protocoloexpe) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0)");
            $s->execute([$d['tituloA'],$d['nprotA'],$d['InvestigadorACargA'],$d['departamento'],$d['tipoprotocolo'],$d['CantidadAniA'],$d['severidad'],$ini,$fin,$d['IdInstitucion'],$u]);
            $p=$this->db->lastInsertId();
            
            if(isset($d['especies'])&&is_array($d['especies'])){
                $e=$this->db->prepare("INSERT INTO protesper (idprotA,idespA) VALUES (?,?)");
                foreach($d['especies'] as $esp) if($esp) $e->execute([$p,$esp]);
            }
            
            $stmtSol = $this->db->prepare("INSERT INTO solicitudprotocolo (idprotA,Aprobado,TipoPedido) VALUES (?,3,1)");
            $stmtSol->execute([$p]);
            $idSolicitud = (int)$this->db->lastInsertId();

            if ($files && is_array($files)) {
                $b2 = new BackblazeB2();
                $stmtAdj = $this->db->prepare("INSERT INTO solicitudadjuntosprotocolos (nombre_original,file_key,IdSolicitudProtocolo,tipoadjunto) VALUES (?,?,?,?)");

                for ($i = 1; $i <= 3; $i++) {
                    $field = 'adjunto' . $i;
                    if (!isset($files[$field])) continue;
                    $f = $files[$field];
                    if (!is_array($f) || !isset($f['error']) || $f['error'] !== UPLOAD_ERR_OK) continue;
                    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) continue;

                    $original = $f['name'] ?? ('archivo_' . $i);
                    $mime     = !empty($f['type']) ? $f['type'] : 'application/octet-stream';
                    $size     = isset($f['size']) ? (int)$f['size'] : 0;
                    $ext      = strtolower(pathinfo($original, PATHINFO_EXTENSION));

                    if ($ext !== 'pdf') {
                        throw new Exception('Solo se aceptan archivos PDF como adjuntos de protocolo.');
                    }
                    if ($size <= 0 || $size > (2 * 1024 * 1024)) {
                        throw new Exception('Cada archivo adjunto debe pesar como máximo 2 MB.');
                    }
                    $safeName = preg_replace('/[^\w\.\-]+/u', '_', $original);
                    if ($safeName === '' || $safeName === null) {
                        $safeName = 'adjunto_' . $i;
                    }

                    $fileKey = 'solicitudes_protocolo/' . $idSolicitud . '/' . $i . '_' . $safeName;

                    $b2->uploadFile($f['tmp_name'], $fileKey, $mime);

                    $stmtAdj->execute([
                        $original,
                        $fileKey,
                        $idSolicitud,
                        $i
                    ]);
                }
            }
            
            Auditoria::log($this->db, 'INSERT', 'protocoloexpe', "Usuario solicitó nuevo protocolo: " . $d['nprotA']);
            $this->db->commit();
            return $idSolicitud;
        } catch(Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }   
    
    public function updateInternal($d) {
        $this->db->beginTransaction();
        try {
            $id=$d['idprotA'];
            [$ini, $fin] = $this->normalizeProtocolDates($d);
            $this->db->prepare("UPDATE protocoloexpe SET tituloA=?,nprotA=?,InvestigadorACargA=?,departamento=?,tipoprotocolo=?,CantidadAniA=?,severidad=?,FechaIniProtA=?,FechaFinProtA=? WHERE idprotA=?")->execute([$d['tituloA'],$d['nprotA'],$d['InvestigadorACargA'],$d['departamento'],$d['tipoprotocolo'],$d['CantidadAniA'],$d['severidad'],$ini,$fin,$id]);
            $this->db->prepare("DELETE FROM protesper WHERE idprotA=?")->execute([$id]);
            
            if(isset($d['especies'])&&is_array($d['especies'])){
                $e=$this->db->prepare("INSERT INTO protesper (idprotA,idespA) VALUES (?,?)");
                foreach($d['especies'] as $esp) if($esp) $e->execute([$id,$esp]);
            }
            $this->db->prepare("UPDATE solicitudprotocolo SET Aprobado=3,DetalleAdm=NULL WHERE idprotA=? AND TipoPedido=1")->execute([$id]);
            
            Auditoria::log($this->db, 'UPDATE', 'protocoloexpe', "Usuario corrigió el protocolo ID: $id y se envió a revisión.");
            $this->db->commit();
        } catch(Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    } 
    
    public function getNetworkTargets($instId){$s=$this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion=?");$s->execute([$instId]);$r=$s->fetchColumn();if(!$r)return[];$s=$this->db->prepare("SELECT IdInstitucion,NombreInst FROM institucion WHERE DependenciaInstitucion=? AND IdInstitucion!=? AND Activo=1 ORDER BY NombreInst ASC");$s->execute([$r,$instId]);return $s->fetchAll(PDO::FETCH_ASSOC);}
     public function createNetworkRequest($d) {
        $this->db->beginTransaction();
        try {
            $p=$d['idprotA'];
            $this->db->prepare("UPDATE protocoloexpe SET variasInst=2 WHERE idprotA=?")->execute([$p]);
            
            if(!empty($d['targets'])&&is_array($d['targets'])){
                $r=$this->db->prepare("INSERT INTO protinstr (idprotA,IdInstitucion) VALUES (?,?)");
                foreach($d['targets'] as $t) {
                    $c=$this->db->prepare("SELECT COUNT(*) FROM protinstr WHERE idprotA=? AND IdInstitucion=?");
                    $c->execute([$p,$t]);
                    if($c->fetchColumn()==0) $r->execute([$p,$t]);
                }
            }
            $this->db->prepare("INSERT INTO solicitudprotocolo (idprotA,Aprobado,TipoPedido) VALUES (?,3,2)")->execute([$p]);
            
            Auditoria::log($this->db, 'NETWORK_REQ', 'protinstr', "Se solicitó compartir a la Red el protocolo ID: $p");
            $this->db->commit();
        } catch(Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getUserAttachmentsBySolicitud($solId, $userId) {
        $sql = "SELECT a.Id_adjuntos_protocolos, a.nombre_original, a.file_key, a.tipoadjunto
                FROM solicitudadjuntosprotocolos a
                JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.IdSolicitudProtocolo
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                WHERE s.IdSolicitudProtocolo = ? AND p.IdUsrA = ?
                ORDER BY a.tipoadjunto ASC, a.Id_adjuntos_protocolos ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$solId, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUserAttachmentsByProtocol($idprotA, $userId) {
        $sql = "SELECT a.Id_adjuntos_protocolos, a.nombre_original, a.file_key, a.tipoadjunto
                FROM solicitudadjuntosprotocolos a
                JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.IdSolicitudProtocolo
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                WHERE p.idprotA = ?
                  AND p.IdUsrA = ?
                  AND s.TipoPedido = 1
                ORDER BY s.IdSolicitudProtocolo DESC, a.tipoadjunto ASC, a.Id_adjuntos_protocolos ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUserAttachmentById($attId, $userId) {
        $sql = "SELECT a.Id_adjuntos_protocolos, a.nombre_original, a.file_key, a.tipoadjunto
                FROM solicitudadjuntosprotocolos a
                JOIN solicitudprotocolo s ON a.IdSolicitudProtocolo = s.IdSolicitudProtocolo
                JOIN protocoloexpe p ON s.idprotA = p.idprotA
                WHERE a.Id_adjuntos_protocolos = ? AND p.IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$attId, $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}