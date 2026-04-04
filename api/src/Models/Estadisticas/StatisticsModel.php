<?php
namespace App\Models\Estadisticas;

class StatisticsModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getGeneralStats($instId, $from, $to) {
        $res = [];

        // 1. GLOBALES
        // Protocolos: Aprobados + Fecha Fin no vencida (>= HOY)
        $sqlG = "SELECT 
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe f JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.fechainicioA BETWEEN ? AND ?) as total_insumos,
            
            (SELECT COUNT(*) FROM protocoloexpe pe 
             WHERE pe.IdInstitucion = ? 
             AND pe.FechaFinProtA >= CURDATE() 
             AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))
            ) as total_protocolos,

            (SELECT COUNT(*) FROM alojamiento a WHERE a.IdInstitucion = ? AND a.finalizado = 0) as total_alojamientos";
        
        $stmtG = $this->db->prepare($sqlG);
        $stmtG->execute([$instId, $from, $to, $instId, $from, $to, $instId, $from, $to, $instId, $instId]);
        $res['globales'] = $stmtG->fetch(\PDO::FETCH_ASSOC);

        // 2. POR DEPARTAMENTO
        $sqlD = "SELECT 
            d.iddeptoA, d.NombreDeptoA as departamento,
            (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx JOIN sexoe sx ON fx.idformA = sx.idformA JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe fx JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe fx JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_insumos,
            
            /* Protocolos Aprobados VIGENTES del Depto */
            (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA 
             WHERE pd.iddeptoA = d.iddeptoA 
             AND pe.IdInstitucion = ? 
             AND pe.FechaFinProtA >= CURDATE()
             AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))
            ) as protocolos_aprobados

        FROM departamentoe d WHERE d.IdInstitucion = ?";
        
        $stmtD = $this->db->prepare($sqlD);
        $stmtD->execute([$instId, $from, $to, $instId, $from, $to, $instId, $from, $to, $instId, $instId]);
        $res['por_departamento'] = $stmtD->fetchAll(\PDO::FETCH_ASSOC);

        // 2b. POR ORGANIZACIÓN (agrupando por organismo; departamentos sin org = "(Sin organización)")
        $res['por_organizacion'] = $this->getPorOrganizacion($instId, $from, $to);

        // 3. RANKING ESPECIES (Sin cambios)
        $sqlE = "SELECT 
                    CONCAT(e.EspeNombreA, ' (', IFNULL(sb.SubEspeNombreA, 'Gral'), ')') as etiqueta_especie, 
                    SUM(s.totalA) as cantidad 
                FROM formularioe f 
                JOIN sexoe s ON f.idformA = s.idformA
                JOIN formespe fe ON f.idformA = fe.idformA
                JOIN especiee e ON fe.idespA = e.idespA
                LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA
                WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                GROUP BY e.EspeNombreA, sb.SubEspeNombreA 
                ORDER BY cantidad DESC"; // QUITAMOS EL LIMIT
        $stmtE = $this->db->prepare($sqlE);
        $stmtE->execute([$instId, $from, $to]);
        $res['ranking_especies'] = $stmtE->fetchAll(\PDO::FETCH_ASSOC);

        // 4. ALOJAMIENTOS ACTIVOS (Sin cambios)
        $sqlA = "SELECT d.NombreDeptoA as departamento, COUNT(a.IdAlojamiento) as cantidad FROM departamentoe d LEFT JOIN protdeptor pd ON d.iddeptoA = pd.iddeptoA LEFT JOIN alojamiento a ON pd.idprotA = a.idprotA AND a.finalizado = 0 AND a.IdInstitucion = ? WHERE d.IdInstitucion = ? GROUP BY d.NombreDeptoA";
        $stmtA = $this->db->prepare($sqlA);
        $stmtA->execute([$instId, $instId]);
        $res['alojamientos_activos'] = $stmtA->fetchAll(\PDO::FETCH_ASSOC);

        // 5. DETALLE ESPECIES (Sin cambios)
        $sqlDetalle = "SELECT d.NombreDeptoA as departamento, e.EspeNombreA as especie, sb.SubEspeNombreA as subespecie, SUM(s.totalA) as cantidad_animales FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA JOIN formespe fe ON f.idformA = fe.idformA JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA JOIN protformr pfr ON f.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ? GROUP BY d.NombreDeptoA, e.EspeNombreA, sb.SubEspeNombreA ORDER BY d.NombreDeptoA, cantidad_animales DESC";
        $stmtDet = $this->db->prepare($sqlDetalle);
        $stmtDet->execute([$instId, $from, $to]);
        $res['detalle_especies'] = $stmtDet->fetchAll(\PDO::FETCH_ASSOC);

        // 6. DETALLE PROTOCOLOS (Agregamos Fecha Fin para verla en el front)
        $sqlProtUso = "SELECT DISTINCT
                        d.NombreDeptoA as departamento,
                        pe.nprotA,
                        pe.tituloA,
                        pe.FechaFinProtA
                       FROM formularioe f
                       JOIN protformr pfr ON f.idformA = pfr.idformA
                       JOIN protocoloexpe pe ON pfr.idprotA = pe.idprotA
                       JOIN protdeptor pdr ON pe.idprotA = pdr.idprotA
                       JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA
                       WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                       ORDER BY d.NombreDeptoA, pe.nprotA";
        $stmtP = $this->db->prepare($sqlProtUso);
        $stmtP->execute([$instId, $from, $to]);
        $res['detalle_protocolos'] = $stmtP->fetchAll(\PDO::FETCH_ASSOC);

        // 7. ESTADÍSTICAS AMPLIADAS ALOJAMIENTO / TRAZABILIDAD
        $res['alojamiento_trazabilidad'] = $this->getAlojamientoTrazabilidadStats($instId);

        return $res;
    }

    /**
     * Estadísticas agrupadas por organización (organismoe). Incluye fila "(Sin organización)" para deptos sin organismo.
     */
    public function getPorOrganizacion($instId, $from, $to) {
        $out = [];
        // Organizaciones con sus deptos
        $stmtO = $this->db->prepare("SELECT IdOrganismo, NombreOrganismoSimple FROM organismoe WHERE IdInstitucion = ? ORDER BY NombreOrganismoSimple ASC");
        $stmtO->execute([$instId]);
        $orgs = $stmtO->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($orgs as $o) {
            $row = $this->aggregateByDeptoList($instId, $from, $to, 'd2.organismopertenece = ' . (int)$o['IdOrganismo']);
            $row['organizacion'] = $o['NombreOrganismoSimple'] ?: '';
            $out[] = $row;
        }
        // Deptos sin organización
        $rowNull = $this->aggregateByDeptoList($instId, $from, $to, 'd2.organismopertenece IS NULL');
        $rowNull['organizacion'] = '(Sin organización)';
        $out[] = $rowNull;
        return $out;
    }

    /**
     * Agrega métricas para departamentos que cumplen la condición WHERE (ej. organismopertenece = X o IS NULL).
     */
    private function aggregateByDeptoList($instId, $from, $to, $deptoWhere) {
        $sql = "SELECT
            (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx JOIN sexoe sx ON fx.idformA = sx.idformA JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA JOIN departamentoe d2 ON pdr.iddeptoA = d2.iddeptoA AND d2.IdInstitucion = ? WHERE $deptoWhere AND fx.estado = 'Entregado' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe fx JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA JOIN departamentoe d2 ON pdr.iddeptoA = d2.iddeptoA AND d2.IdInstitucion = ? WHERE $deptoWhere AND fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe fx JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA JOIN departamentoe d2 ON pdr.iddeptoA = d2.iddeptoA AND d2.IdInstitucion = ? WHERE $deptoWhere AND fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_insumos,
            (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA JOIN departamentoe d2 ON pd.iddeptoA = d2.iddeptoA AND d2.IdInstitucion = ? WHERE $deptoWhere AND pe.IdInstitucion = ? AND pe.FechaFinProtA >= CURDATE() AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))) as protocolos_aprobados";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $instId, $from, $to, $instId, $instId, $from, $to, $instId, $instId, $from, $to, $instId, $instId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        $row['total_alojamientos'] = 0; // opcional: alojamientos por org se puede añadir después
        return $row;
    }

    /**
     * Devuelve madre_grupo y red de la institución para mostrar/ocultar bloque "Estadísticas de la red".
     */
    public function getInstitutionFlags($instId) {
        $stmt = $this->db->prepare("SELECT COALESCE(madre_grupo, 0) as madre_grupo, TRIM(COALESCE(red, '')) as red, NombreInst FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return ['madre_grupo' => 0, 'red' => '', 'NombreInst' => '', 'instituciones_en_red' => 0];
        }
        $row['madre_grupo'] = (int) $row['madre_grupo'];
        $ids = $this->getInstitutionIdsInNetwork($instId);
        $row['instituciones_en_red'] = count($ids);
        return $row;
    }

    /**
     * Ids de instituciones que pertenecen a la misma red (mismo valor 'red' no vacío). Incluye la propia institución.
     */
    public function getInstitutionIdsInNetwork($instId) {
        $stmt = $this->db->prepare("SELECT red FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        $red = $row && !empty(trim($row['red'] ?? '')) ? trim($row['red']) : null;
        if ($red === null) {
            return [$instId];
        }
        $stmt2 = $this->db->prepare("SELECT IdInstitucion FROM institucion WHERE TRIM(COALESCE(red, '')) = ?");
        $stmt2->execute([$red]);
        $ids = $stmt2->fetchAll(\PDO::FETCH_COLUMN);
        return $ids ?: [$instId];
    }

    /**
     * Misma estructura que getGeneralStats pero agregando todas las instituciones de la red.
     */
    public function getGeneralStatsRed($instId, $from, $to) {
        $ids = $this->getInstitutionIdsInNetwork($instId);
        $ids = array_map('intval', $ids);
        if (count($ids) <= 1) {
            return $this->getGeneralStats($instId, $from, $to);
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        // 1. GLOBALES: sumar sobre todas las inst
        $res = [];
        $sqlG = "SELECT 
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA WHERE f.IdInstitucion IN ($placeholders) AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE f.IdInstitucion IN ($placeholders) AND f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe f JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario WHERE f.IdInstitucion IN ($placeholders) AND f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.fechainicioA BETWEEN ? AND ?) as total_insumos,
            (SELECT COUNT(*) FROM protocoloexpe pe WHERE pe.IdInstitucion IN ($placeholders) AND pe.FechaFinProtA >= CURDATE() AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))) as total_protocolos,
            (SELECT COUNT(*) FROM alojamiento a WHERE a.IdInstitucion IN ($placeholders) AND a.finalizado = 0) as total_alojamientos";
        $paramsG = array_merge($ids, $ids, [$from, $to], $ids, [$from, $to], $ids, [$from, $to], $ids, $ids);
        $stmtG = $this->db->prepare($sqlG);
        $stmtG->execute($paramsG);
        $res['globales'] = $stmtG->fetch(\PDO::FETCH_ASSOC);

        // 2. POR DEPARTAMENTO: una fila por (institución, departamento), con nombre de institución
        $res['por_departamento'] = [];
        foreach ($ids as $id) {
            $sqlD = "SELECT d.NombreDeptoA as departamento,
                (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx JOIN sexoe sx ON fx.idformA = sx.idformA JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_animales,
                (SELECT COUNT(*) FROM formularioe fx JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_reactivos,
                (SELECT COUNT(*) FROM formularioe fx JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario JOIN protformr pfr ON fx.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pdr.iddeptoA = d.iddeptoA AND fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND fx.IdInstitucion = ? AND fx.fechainicioA BETWEEN ? AND ?) as total_insumos,
                (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA WHERE pd.iddeptoA = d.iddeptoA AND pe.IdInstitucion = ? AND pe.FechaFinProtA >= CURDATE() AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))) as protocolos_aprobados
                FROM departamentoe d WHERE d.IdInstitucion = ?";
            $stmtD = $this->db->prepare($sqlD);
            $stmtD->execute([$id, $from, $to, $id, $from, $to, $id, $from, $to, $id, $id]);
            $rows = $stmtD->fetchAll(\PDO::FETCH_ASSOC);
            $instName = $this->getInstitutionName($id);
            foreach ($rows as $r) {
                $r['institucion'] = $instName;
                $r['departamento'] = $instName . ' – ' . $r['departamento'];
                $res['por_departamento'][] = $r;
            }
        }

        // 2b. POR ORGANIZACIÓN (una fila por inst + org)
        $res['por_organizacion'] = [];
        foreach ($ids as $id) {
            $orgRows = $this->getPorOrganizacion($id, $from, $to);
            $instName = $this->getInstitutionName($id);
            foreach ($orgRows as $r) {
                $r['institucion'] = $instName;
                $r['organizacion'] = $instName . ' – ' . ($r['organizacion'] ?? '');
                $res['por_organizacion'][] = $r;
            }
        }

        // 3. RANKING ESPECIES (agregado red)
        $sqlE = "SELECT CONCAT(e.EspeNombreA, ' (', IFNULL(sb.SubEspeNombreA, 'Gral'), ')') as etiqueta_especie, SUM(s.totalA) as cantidad
                FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA JOIN formespe fe ON f.idformA = fe.idformA JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA
                WHERE f.IdInstitucion IN ($placeholders) AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                GROUP BY e.EspeNombreA, sb.SubEspeNombreA ORDER BY cantidad DESC";
        $stmtE = $this->db->prepare($sqlE);
        $stmtE->execute(array_merge($ids, [$from, $to]));
        $res['ranking_especies'] = $stmtE->fetchAll(\PDO::FETCH_ASSOC);

        // 4. ALOJAMIENTOS ACTIVOS por inst (agregado)
        $res['alojamientos_activos'] = [];
        foreach ($ids as $id) {
            $stmtA = $this->db->prepare("SELECT d.NombreDeptoA as departamento, COUNT(a.IdAlojamiento) as cantidad FROM departamentoe d LEFT JOIN protdeptor pd ON d.iddeptoA = pd.iddeptoA LEFT JOIN alojamiento a ON pd.idprotA = a.idprotA AND a.finalizado = 0 AND a.IdInstitucion = ? WHERE d.IdInstitucion = ? GROUP BY d.NombreDeptoA");
            $stmtA->execute([$id, $id]);
            $instName = $this->getInstitutionName($id);
            foreach ($stmtA->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $r['departamento'] = $instName . ' – ' . $r['departamento'];
                $res['alojamientos_activos'][] = $r;
            }
        }

        // 5. DETALLE ESPECIES (agregado red; departamento incluye sede para no colisionar nombres)
        $sqlDetalle = "SELECT CONCAT(inst.NombreInst, ' – ', d.NombreDeptoA) as departamento, e.EspeNombreA as especie, sb.SubEspeNombreA as subespecie, SUM(s.totalA) as cantidad_animales
            FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA JOIN formespe fe ON f.idformA = fe.idformA JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA JOIN protformr pfr ON f.idformA = pfr.idformA JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA JOIN institucion inst ON inst.IdInstitucion = f.IdInstitucion
            WHERE f.IdInstitucion IN ($placeholders) AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY inst.NombreInst, d.NombreDeptoA, e.EspeNombreA, sb.SubEspeNombreA ORDER BY inst.NombreInst, d.NombreDeptoA, cantidad_animales DESC";
        $stmtDet = $this->db->prepare($sqlDetalle);
        $stmtDet->execute(array_merge($ids, [$from, $to]));
        $res['detalle_especies'] = $stmtDet->fetchAll(\PDO::FETCH_ASSOC);

        // 6. DETALLE PROTOCOLOS (misma clave de departamento que por_departamento / detalle especies)
        $sqlProtUso = "SELECT DISTINCT CONCAT(inst.NombreInst, ' – ', d.NombreDeptoA) as departamento, pe.nprotA, pe.tituloA, pe.FechaFinProtA
            FROM formularioe f JOIN protformr pfr ON f.idformA = pfr.idformA JOIN protocoloexpe pe ON pfr.idprotA = pe.idprotA JOIN protdeptor pdr ON pe.idprotA = pdr.idprotA JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA JOIN institucion inst ON inst.IdInstitucion = pe.IdInstitucion
            WHERE f.IdInstitucion IN ($placeholders) AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ? ORDER BY inst.NombreInst, d.NombreDeptoA, pe.nprotA";
        $stmtP = $this->db->prepare($sqlProtUso);
        $stmtP->execute(array_merge($ids, [$from, $to]));
        $res['detalle_protocolos'] = $stmtP->fetchAll(\PDO::FETCH_ASSOC);

        // 7. ALOJAMIENTO TRAZABILIDAD (agregado)
        $res['alojamiento_trazabilidad'] = $this->getAlojamientoTrazabilidadStatsRed($ids);

        return $res;
    }

    private function getInstitutionName($instId) {
        $stmt = $this->db->prepare("SELECT NombreInst FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $r = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $r ? $r['NombreInst'] : (string) $instId;
    }

    private function getAlojamientoTrazabilidadStatsRed(array $instIds) {
        $placeholders = implode(',', array_fill(0, count($instIds), '?'));
        $total_historias = 0;
        $total_cajas = 0;
        $total_observaciones = 0;
        $alojamientos_activos = 0;
        $por_especie = [];
        foreach ($instIds as $id) {
            $st = $this->getAlojamientoTrazabilidadStats($id);
            $total_historias += $st['total_historias'];
            $total_cajas += $st['total_cajas'];
            $total_observaciones += $st['total_observaciones_trazabilidad'];
            $alojamientos_activos += $st['alojamientos_activos'];
            foreach ($st['por_especie'] as $e) {
                $key = $e['especie'];
                if (!isset($por_especie[$key])) {
                    $por_especie[$key] = ['especie' => $e['especie'], 'historias' => 0, 'tramos' => 0];
                }
                $por_especie[$key]['historias'] += (int) $e['historias'];
                $por_especie[$key]['tramos'] += (int) $e['tramos'];
            }
        }
        return [
            'total_historias' => $total_historias,
            'total_cajas' => $total_cajas,
            'total_observaciones_trazabilidad' => $total_observaciones,
            'alojamientos_activos' => $alojamientos_activos,
            'por_especie' => array_values($por_especie),
        ];
    }

    /**
     * Estadísticas ampliadas: historias, cajas físicas, observaciones de trazabilidad, por especie.
     */
    public function getAlojamientoTrazabilidadStats($instId) {
        $instId = (int) $instId;

        $stmtH = $this->db->prepare("SELECT COUNT(DISTINCT a.historia) FROM alojamiento a WHERE a.IdInstitucion = ? AND a.historia IS NOT NULL");
        $stmtH->execute([$instId]);
        $total_historias = (int) $stmtH->fetchColumn();

        $stmtC = $this->db->prepare("SELECT COUNT(*) FROM alojamiento_caja ac INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.IdInstitucion = ?");
        $stmtC->execute([$instId]);
        $total_cajas = (int) $stmtC->fetchColumn();

        $stmtO = $this->db->prepare("SELECT COUNT(*) FROM observacion_alojamiento_unidad o INNER JOIN especie_alojamiento_unidad eu ON o.IdEspecieAlojUnidad = eu.IdEspecieAlojUnidad INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.IdInstitucion = ?");
        $stmtO->execute([$instId]);
        $total_observaciones = (int) $stmtO->fetchColumn();

        $stmtA = $this->db->prepare("SELECT COUNT(*) FROM alojamiento a WHERE a.IdInstitucion = ? AND a.finalizado = 0");
        $stmtA->execute([$instId]);
        $alojamientos_activos = (int) $stmtA->fetchColumn();

        $stmtE = $this->db->prepare("SELECT e.EspeNombreA as especie, COUNT(DISTINCT a.historia) as historias, COUNT(a.IdAlojamiento) as tramos FROM alojamiento a INNER JOIN especiee e ON a.TipoAnimal = e.idespA WHERE a.IdInstitucion = ? GROUP BY e.EspeNombreA ORDER BY historias DESC");
        $stmtE->execute([$instId]);
        $por_especie = $stmtE->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'total_historias' => $total_historias,
            'total_cajas' => $total_cajas,
            'total_observaciones_trazabilidad' => $total_observaciones,
            'alojamientos_activos' => $alojamientos_activos,
            'por_especie' => $por_especie,
        ];
    }
}
