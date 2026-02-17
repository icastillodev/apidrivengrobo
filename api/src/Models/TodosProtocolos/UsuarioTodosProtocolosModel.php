<?php
namespace App\Models\TodosProtocolos;

use PDO;
use Exception;

class UsuarioTodosProtocolosModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // --- CONFIGURACIÓN Y SELECTORES ---
    public function getConfig($instId) {
        // 1. Departamentos
        $depts = $this->db->prepare("SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ? ORDER BY NombreDeptoA"); 
        $depts->execute([$instId]);
        
        // 2. Tipos
        $types = $this->db->prepare("SELECT idtipoprotocolo, NombreTipoprotocolo FROM tipoprotocolo WHERE IdInstitucion = ?"); 
        $types->execute([$instId]);

        // 3. Severidades (Filtrado por institución)
        $sev = $this->db->prepare("SELECT IdSeveridadTipo, NombreSeveridad FROM tiposeveridad WHERE IdInstitucion = ?");
        $sev->execute([$instId]);
        
        // 4. Especies
        $esp = $this->db->prepare("SELECT idespA, EspeNombreA FROM especiee WHERE IdInstitucion = ?"); 
        $esp->execute([$instId]);

        // 5. Info Institución y Red
        $stmtI = $this->db->prepare("SELECT DependenciaInstitucion, NombreCompletoInst, NombreInst FROM institucion WHERE IdInstitucion = ?");
        $stmtI->execute([$instId]);
        $instData = $stmtI->fetch(PDO::FETCH_ASSOC);
        
        $dep = $instData['DependenciaInstitucion'];
        $netInsts = [];
        
        // Si hay dependencia, buscar hermanas
        if($dep) {
            $stmtN = $this->db->prepare("SELECT NombreInst, IdInstitucion FROM institucion WHERE DependenciaInstitucion = ? AND IdInstitucion != ? AND Activo = 1");
            $stmtN->execute([$dep, $instId]);
            $netInsts = $stmtN->fetchAll(PDO::FETCH_ASSOC);
        }

        return [
            'depts' => $depts->fetchAll(PDO::FETCH_ASSOC),
            'types' => $types->fetchAll(PDO::FETCH_ASSOC),
            'severities' => $sev->fetchAll(PDO::FETCH_ASSOC),
            'species' => $esp->fetchAll(PDO::FETCH_ASSOC),
            'has_network' => !empty($dep),
            'network_institutions' => $netInsts,
            'NombreCompletoInst' => $instData['NombreCompletoInst'] ?? 'Institución Actual'
        ];
    }

    // --- CAMPOS COMUNES ---
    // (Incluye 0 as AnimalesUsados para evitar errores si no hay tabla de pedidos aún)
    private function getCommonFields() {
        return "p.idprotA, p.nprotA, p.tituloA, p.InvestigadorACargA, p.FechaFinProtA as Vencimiento, 
                p.variasInst, p.protocoloexpe as IsExterno, p.CantidadAniA,
                t.NombreTipoprotocolo as TipoNombre,
                CONCAT(pers.NombreA, ' ', pers.ApellidoA) as ResponsableName,
                i_orig.NombreCompletoInst as Origen,
                
                0 as AnimalesUsados, 

                (SELECT CONCAT(d.NombreDeptoA, IF(o.NombreOrganismoSimple IS NOT NULL, CONCAT(' - [', o.NombreOrganismoSimple, ']'), ''))
                 FROM protdeptor pd 
                 JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA 
                 LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                 WHERE pd.idprotA = p.idprotA LIMIT 1) as DeptoFormat";
    }

    /**
     * 1. MIS PROTOCOLOS (Filtrado por Usuario)
     */
    public function getMyProtocols($instId, $userId) {
        $fields = $this->getCommonFields();
        $sql = "SELECT $fields, 
                       sp.Aprobado, 
                       sp.DetalleAdm,
                       -- Cálculo Origen: Si tiene flag 2 o está en protinstr => RED
                       CASE 
                            WHEN p.variasInst = 2 OR (SELECT COUNT(*) FROM protinstr pi WHERE pi.idprotA = p.idprotA) > 0 THEN 'RED'
                            ELSE 'PROPIA'
                       END as OrigenCalculado

                FROM protocoloexpe p
                LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                -- Solicitud propia (Tipo 1) para ver estado
                LEFT JOIN solicitudprotocolo sp ON p.idprotA = sp.idprotA AND sp.TipoPedido = 1
                
                WHERE p.IdInstitucion = ? AND p.IdUsrA = ? 
                ORDER BY p.idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * 2. INSTITUCIÓN ACTUAL (Todos los vigentes en esta sede)
     */
    public function getLocalProtocols($instId) {
        $fields = $this->getCommonFields();
        
        // A) PROPIOS
        // Lógica: Creados en esta institución (p.IdInstitucion = ?)
        // Y (No tienen solicitud O Tienen solicitud Tipo 1 Aprobada)
        $sqlA = "SELECT $fields, 'PROPIA' as OrigenCalculado
                 FROM protocoloexpe p
                 LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                 LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                 LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                 LEFT JOIN solicitudprotocolo sp ON p.idprotA = sp.idprotA AND sp.TipoPedido = 1
                 WHERE p.IdInstitucion = ? 
                   AND (sp.idSolicitudProtocolo IS NULL OR sp.Aprobado = 1)";

        // B) RED (Externos aprobados aquí)
        // Lógica: Están en protinstr (vinculados a esta inst)
        // Y tienen Solicitud Tipo 2 Aprobada
        $sqlB = "SELECT $fields, 'RED' as OrigenCalculado
                 FROM protinstr pi
                 JOIN protocoloexpe p ON pi.idprotA = p.idprotA
                 JOIN solicitudprotocolo sp ON p.idprotA = sp.idprotA
                 LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                 LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                 LEFT JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                 WHERE pi.IdInstitucion = ? 
                   AND sp.TipoPedido = 2 
                   AND sp.Aprobado = 1";

        $sql = "($sqlA) UNION ($sqlB) ORDER BY idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * 3. RED (Visor Global)
     */
    public function getNetworkProtocols($instId) {
        $stmtD = $this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $stmtD->execute([$instId]);
        $dep = $stmtD->fetchColumn();

        if (!$dep) return [];

        $fields = $this->getCommonFields();
        // Todos los de la misma dependencia que NO son míos
        $sql = "SELECT $fields, 'RED' as OrigenCalculado
                FROM protocoloexpe p
                JOIN institucion i_orig ON p.IdInstitucion = i_orig.IdInstitucion
                LEFT JOIN tipoprotocolo t ON p.tipoprotocolo = t.idtipoprotocolo
                LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
                
                WHERE i_orig.DependenciaInstitucion = ? 
                  AND p.IdInstitucion != ? 
                ORDER BY p.idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$dep, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // --- MÉTODOS AUXILIARES ---

    public function getProtocolSpecies($id) {
        $sql = "SELECT e.idespA, e.EspeNombreA FROM protesper pe 
                JOIN especiee e ON pe.idespA = e.idespA 
                WHERE pe.idprotA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getNetworkTargets($instId) {
        $stmt = $this->db->prepare("SELECT DependenciaInstitucion FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $red = $stmt->fetchColumn();
        if (!$red) return [];
        $sql = "SELECT IdInstitucion, NombreInst FROM institucion WHERE DependenciaInstitucion = ? AND IdInstitucion != ? AND Activo = 1 ORDER BY NombreInst ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$red, $instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // --- ESCRITURA ---

    public function createInternal($data, $userId) {
        $this->db->beginTransaction();
        try {
            // Insert Protocolo
            $sql = "INSERT INTO protocoloexpe (tituloA, nprotA, InvestigadorACargA, departamento, tipoprotocolo, CantidadAniA, severidad, FechaIniProtA, FechaFinProtA, IdInstitucion, IdUsrA, variasInst, protocoloexpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $data['tituloA'], $data['nprotA'], $data['InvestigadorACargA'], 
                $data['departamento'], $data['tipoprotocolo'], $data['CantidadAniA'], 
                $data['severidad'], $data['FechaIniProtA'], $data['FechaFinProtA'], 
                $data['IdInstitucion'], $userId
            ]);
            $protId = $this->db->lastInsertId();

            // Especies
            if (isset($data['especies']) && is_array($data['especies'])) {
                $stmtE = $this->db->prepare("INSERT INTO protesper (idprotA, idespA) VALUES (?, ?)");
                foreach ($data['especies'] as $espId) if ($espId) $stmtE->execute([$protId, $espId]);
            }
            
            // Crear Solicitud (Tipo 1)
            $this->db->prepare("INSERT INTO solicitudprotocolo (idprotA, Aprobado, TipoPedido) VALUES (?, 3, 1)")->execute([$protId]);
            
            $this->db->commit();
        } catch (Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function updateInternal($data) {
        $this->db->beginTransaction();
        try {
            $id = $data['idprotA'];
            // Update Protocolo
            $sql = "UPDATE protocoloexpe SET tituloA=?, nprotA=?, InvestigadorACargA=?, departamento=?, tipoprotocolo=?, CantidadAniA=?, severidad=?, FechaIniProtA=?, FechaFinProtA=? WHERE idprotA=?";
            $this->db->prepare($sql)->execute([
                $data['tituloA'], $data['nprotA'], $data['InvestigadorACargA'], 
                $data['departamento'], $data['tipoprotocolo'], $data['CantidadAniA'], 
                $data['severidad'], $data['FechaIniProtA'], $data['FechaFinProtA'], $id
            ]);

            // Update Especies
            $this->db->prepare("DELETE FROM protesper WHERE idprotA=?")->execute([$id]);
            if (isset($data['especies']) && is_array($data['especies'])) {
                $stmtE = $this->db->prepare("INSERT INTO protesper (idprotA, idespA) VALUES (?, ?)");
                foreach ($data['especies'] as $espId) if ($espId) $stmtE->execute([$id, $espId]);
            }
            
            // Reenviar Solicitud (Estado 3)
            $this->db->prepare("UPDATE solicitudprotocolo SET Aprobado = 3, DetalleAdm = NULL WHERE idprotA = ? AND TipoPedido = 1")->execute([$id]);
            
            $this->db->commit();
        } catch (Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function createNetworkRequest($data) {
        $this->db->beginTransaction();
        try {
            $protId = $data['idprotA'];
            // Marcar en trámite red
            $this->db->prepare("UPDATE protocoloexpe SET variasInst = 2 WHERE idprotA = ?")->execute([$protId]);
            
            // Crear enlaces protinstr
            $stmtRel = $this->db->prepare("INSERT INTO protinstr (idprotA, IdInstitucion) VALUES (?, ?)");
            foreach ($data['targets'] as $targetInstId) {
                $check = $this->db->prepare("SELECT COUNT(*) FROM protinstr WHERE idprotA=? AND IdInstitucion=?"); 
                $check->execute([$protId, $targetInstId]);
                if($check->fetchColumn() == 0) $stmtRel->execute([$protId, $targetInstId]);
            }
            
            // Crear Solicitud Tipo 2
            $this->db->prepare("INSERT INTO solicitudprotocolo (idprotA, Aprobado, TipoPedido) VALUES (?, 3, 2)")->execute([$protId]);
            
            $this->db->commit();
        } catch (Exception $e) { $this->db->rollBack(); throw $e; }
    }
}