<?php
namespace App\Models\TodosProtocolos;

use PDO;
use Exception;

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
        return "p.idprotA, p.nprotA, p.tituloA, p.InvestigadorACargA, p.FechaFinProtA as Vencimiento, 
                p.variasInst, p.protocoloexpe as IsExterno, p.CantidadAniA, p.IdUsrA,
                t.NombreTipoprotocolo as TipoNombre,
                COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), u.UsrA, CONCAT('ID: ', p.IdUsrA)) as ResponsableName,
                i_orig.NombreCompletoInst as Origen, i_orig.NombreInst as InstitucionOrigen,
                
                -- ANIMALES (0 hasta confirmar columna)
                0 as AnimalesUsados, 
                
                (SELECT CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), '')) FROM protdeptor pd JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo WHERE pd.idprotA = p.idprotA LIMIT 1) as DeptoFormat";
    }

    // 1. MIS PROTOCOLOS (CORREGIDO: Muestra todo lo del usuario)
    public function getMyProtocols($instId, $userId) {
        $fields = $this->getCommonFields();
        $sql = "SELECT $fields, 
                       -- MANUALES: Si no hay solicitud, es Aprobado (1)
                       CASE 
                           WHEN sp.idSolicitudProtocolo IS NULL THEN 1 
                           ELSE sp.Aprobado 
                       END as Aprobado,
                       
                       sp.DetalleAdm,
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
                
                -- CORRECCIÓN: FILTRAR SOLO POR USUARIO (Quitar filtro de institución)
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
    public function createInternal($d,$u){$this->db->beginTransaction();try{$s=$this->db->prepare("INSERT INTO protocoloexpe (tituloA,nprotA,InvestigadorACargA,departamento,tipoprotocolo,CantidadAniA,severidad,FechaIniProtA,FechaFinProtA,IdInstitucion,IdUsrA,variasInst,protocoloexpe) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0)");$s->execute([$d['tituloA'],$d['nprotA'],$d['InvestigadorACargA'],$d['departamento'],$d['tipoprotocolo'],$d['CantidadAniA'],$d['severidad'],$d['FechaIniProtA'],$d['FechaFinProtA'],$d['IdInstitucion'],$u]);$p=$this->db->lastInsertId();if(isset($d['especies'])&&is_array($d['especies'])){$e=$this->db->prepare("INSERT INTO protesper (idprotA,idespA) VALUES (?,?)");foreach($d['especies'] as $esp)if($esp)$e->execute([$p,$esp]);}$this->db->prepare("INSERT INTO solicitudprotocolo (idprotA,Aprobado,TipoPedido) VALUES (?,3,1)")->execute([$p]);$this->db->commit();}catch(Exception $e){$this->db->rollBack();throw $e;}}
    public function updateInternal($d){$this->db->beginTransaction();try{$id=$d['idprotA'];$this->db->prepare("UPDATE protocoloexpe SET tituloA=?,nprotA=?,InvestigadorACargA=?,departamento=?,tipoprotocolo=?,CantidadAniA=?,severidad=?,FechaIniProtA=?,FechaFinProtA=? WHERE idprotA=?")->execute([$d['tituloA'],$d['nprotA'],$d['InvestigadorACargA'],$d['departamento'],$d['tipoprotocolo'],$d['CantidadAniA'],$d['severidad'],$d['FechaIniProtA'],$d['FechaFinProtA'],$id]);$this->db->prepare("DELETE FROM protesper WHERE idprotA=?")->execute([$id]);if(isset($d['especies'])&&is_array($d['especies'])){$e=$this->db->prepare("INSERT INTO protesper (idprotA,idespA) VALUES (?,?)");foreach($d['especies'] as $esp)if($esp)$e->execute([$id,$esp]);}$this->db->prepare("UPDATE solicitudprotocolo SET Aprobado=3,DetalleAdm=NULL WHERE idprotA=? AND TipoPedido=1")->execute([$id]);$this->db->commit();}catch(Exception $e){$this->db->rollBack();throw $e;}}
    public function getNetworkTargets($instId){$s=$this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion=?");$s->execute([$instId]);$r=$s->fetchColumn();if(!$r)return[];$s=$this->db->prepare("SELECT IdInstitucion,NombreInst FROM institucion WHERE DependenciaInstitucion=? AND IdInstitucion!=? AND Activo=1 ORDER BY NombreInst ASC");$s->execute([$r,$instId]);return $s->fetchAll(PDO::FETCH_ASSOC);}
    public function createNetworkRequest($d){$this->db->beginTransaction();try{$p=$d['idprotA'];$this->db->prepare("UPDATE protocoloexpe SET variasInst=2 WHERE idprotA=?")->execute([$p]);if(!empty($d['targets'])&&is_array($d['targets'])){$r=$this->db->prepare("INSERT INTO protinstr (idprotA,IdInstitucion) VALUES (?,?)");foreach($d['targets'] as $t){$c=$this->db->prepare("SELECT COUNT(*) FROM protinstr WHERE idprotA=? AND IdInstitucion=?");$c->execute([$p,$t]);if($c->fetchColumn()==0)$r->execute([$p,$t]);}}$this->db->prepare("INSERT INTO solicitudprotocolo (idprotA,Aprobado,TipoPedido) VALUES (?,3,2)")->execute([$p]);$this->db->commit();}catch(Exception $e){$this->db->rollBack();throw $e;}}
}