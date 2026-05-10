<?php
namespace App\Models\Estadisticas;

class StatisticsModel {
    private $db;

    /** @var bool|null */
    private $formularioDerivacionTableExists = null;

    /** @var array<string, bool> */
    private $columnExistsCache = [];

    /** @var \PDOStatement|null Reutiliza prepare para `aggregateByDeptoList` con deptos sin organismo (SQL idéntico entre sedes). */
    private $stmtAggregateByDeptoSinOrganismo = null;

    /** @var string|null Cadena SQL asociada a {@see $stmtAggregateByDeptoSinOrganismo}. */
    private $stmtAggregateByDeptoSinOrganismoSql = null;

    public function __construct($db) {
        $this->db = $db;
    }

    private function hasColumn(string $table, string $column): bool {
        $k = $table . '.' . $column;
        if (array_key_exists($k, $this->columnExistsCache)) {
            return $this->columnExistsCache[$k];
        }
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
            $this->columnExistsCache[$k] = false;

            return false;
        }
        try {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
            $stmt->execute([$column]);
            $this->columnExistsCache[$k] = (bool) $stmt->fetchColumn();
        } catch (\Throwable $e) {
            $this->columnExistsCache[$k] = false;
        }
        return $this->columnExistsCache[$k];
    }

    /** Columnas `institucion` — `docs/database.sql` (alineado con `AuthModel`). */
    private function sqlSelectInstitucionAllColumns(): string {
        return 'IdInstitucion, NombreInst, PrecioJornadaTrabajoExp, DependenciaInstitucion, Web, Detalle, InstDir, '
            . 'InstContacto, InstCorreo, NombreCompletoInst, Logo, TipoApp, Moneda, Pais, Localidad, IdOrganismo, '
            . 'otrosceuas, FechaDepuracion, Activo, UltimoPago, TipoFacturacion, FechaContrato, tituloprecios, idioma, '
            . 'MadreGrupo, LogoEnPdf, ReservasRequierenAprobacion, ReservaQrTokenGeneral';
    }

    private function hasDerivacionDeptoDestino(): bool {
        return $this->hasFormularioDerivacionTable()
            && $this->hasColumn('formulario_derivacion', 'depto_destino');
    }

    /**
     * Formulario asignado al departamento vía protocolo O vía depto_destino en derivación activa (sin duplicar si ya matchea protocolo).
     */
    private function sqlFormularioAsignadoADepto(string $fx, string $deptoField): string {
        $prot = "EXISTS (SELECT 1 FROM protformr pfr INNER JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pfr.idformA = {$fx}.idformA AND pdr.iddeptoA = {$deptoField})";
        if (!$this->hasDerivacionDeptoDestino()) {
            return $prot;
        }
        $deriv = "EXISTS (SELECT 1 FROM formulario_derivacion fdd_x
            WHERE fdd_x.idformA = {$fx}.idformA AND fdd_x.Activo = 1 AND fdd_x.IdInstitucionDestino = ?
              AND fdd_x.depto_destino = {$deptoField}
              AND NOT EXISTS (
                  SELECT 1 FROM protformr pfr_n INNER JOIN protdeptor pdr_n ON pfr_n.idprotA = pdr_n.idprotA
                  WHERE pfr_n.idformA = {$fx}.idformA AND pdr_n.iddeptoA = {$deptoField}
              ))";
        return '(' . $prot . ' OR ' . $deriv . ')';
    }

    /**
     * Igual que sqlFormularioAsignadoADepto pero destino de derivación en conjunto de instituciones (red).
     * @param int[] $ids
     */
    private function sqlFormularioAsignadoADeptoRed(string $fx, string $deptoField, array $ids): string {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        $prot = "EXISTS (SELECT 1 FROM protformr pfr INNER JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA WHERE pfr.idformA = {$fx}.idformA AND pdr.iddeptoA = {$deptoField})";
        if (!$this->hasDerivacionDeptoDestino() || $ids === []) {
            return $prot;
        }
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $deriv = "EXISTS (SELECT 1 FROM formulario_derivacion fdd_x
            WHERE fdd_x.idformA = {$fx}.idformA AND fdd_x.Activo = 1 AND fdd_x.IdInstitucionDestino IN ($ph)
              AND fdd_x.depto_destino = {$deptoField}
              AND NOT EXISTS (
                  SELECT 1 FROM protformr pfr_n INNER JOIN protdeptor pdr_n ON pfr_n.idprotA = pdr_n.idprotA
                  WHERE pfr_n.idformA = {$fx}.idformA AND pdr_n.iddeptoA = {$deptoField}
              ))";
        return '(' . $prot . ' OR ' . $deriv . ')';
    }

    /** @param int[] $ids */
    private function paramsFormularioAsignadoADeptoRed(array $ids): array {
        return $this->hasDerivacionDeptoDestino() ? array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0)) : [];
    }

    /** Etiqueta de departamento en estadísticas: si es de otra sede o está marcado externo, añade (NombreInst). */
    private function sqlDeptoEtiquetaConInstitucion(string $deptoAlias, string $ctxInstExpr): string {
        $hasExt = $this->hasColumn('departamentoe', 'externodepto');
        $extCond = $hasExt ? "IFNULL({$deptoAlias}.externodepto, 0) = 2" : '0';
        return "CONCAT(TRIM({$deptoAlias}.NombreDeptoA), IF(({$deptoAlias}.IdInstitucion IS NOT NULL AND {$deptoAlias}.IdInstitucion <> ({$ctxInstExpr})) OR {$extCond}, CONCAT(' (', TRIM(COALESCE(ins_stat.NombreInst, '')), ')'), ''))";
    }

    private function hasFormularioDerivacionTable(): bool {
        if ($this->formularioDerivacionTableExists !== null) {
            return $this->formularioDerivacionTableExists;
        }
        try {
            $stmt = $this->db->prepare('SHOW TABLES LIKE ?');
            $stmt->execute(['formulario_derivacion']);
            $this->formularioDerivacionTableExists = (bool) $stmt->fetchColumn();
        } catch (\Throwable $e) {
            $this->formularioDerivacionTableExists = false;
        }
        return $this->formularioDerivacionTableExists;
    }

    /**
     * Formularios entregados que deben contarse en una institución: sede propietaria (IdInstitucion),
     * destino de derivación activa, o institución de origen de derivación activa (misma idformA tras aceptar en destino).
     */
    private function sqlFormularioEnInstitucion(string $alias): string {
        if (!$this->hasFormularioDerivacionTable()) {
            return "{$alias}.IdInstitucion = ?";
        }
        return "(({$alias}.IdInstitucion = ?) OR EXISTS (SELECT 1 FROM formulario_derivacion fdi_stats WHERE fdi_stats.idformA = {$alias}.idformA AND fdi_stats.Activo = 1 AND fdi_stats.IdInstitucionDestino = ?) OR EXISTS (SELECT 1 FROM formulario_derivacion fdi_stats_o WHERE fdi_stats_o.idformA = {$alias}.idformA AND fdi_stats_o.Activo = 1 AND fdi_stats_o.IdInstitucionOrigen = ?))";
    }

    /**
     * @param int[] $ids
     */
    private function sqlFormularioEnInstitucionesRed(string $alias, array $ids): string {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        $ph = implode(',', array_fill(0, count($ids), '?'));
        if ($ids === []) {
            return "{$alias}.IdInstitucion = ?";
        }
        if (!$this->hasFormularioDerivacionTable()) {
            return "{$alias}.IdInstitucion IN ($ph)";
        }
        return "(({$alias}.IdInstitucion IN ($ph)) OR EXISTS (SELECT 1 FROM formulario_derivacion fdi_rd WHERE fdi_rd.idformA = {$alias}.idformA AND fdi_rd.Activo = 1 AND fdi_rd.IdInstitucionDestino IN ($ph)) OR EXISTS (SELECT 1 FROM formulario_derivacion fdi_rd_o WHERE fdi_rd_o.idformA = {$alias}.idformA AND fdi_rd_o.Activo = 1 AND fdi_rd_o.IdInstitucionOrigen IN ($ph)))";
    }

    /** @return int[] */
    private function paramsInstitucionFormulario(int $instId): array {
        return $this->hasFormularioDerivacionTable() ? [(int) $instId, (int) $instId, (int) $instId] : [(int) $instId];
    }

    /** Parámetros para $wfRed: tres bloques IN (?) alineados con sqlFormularioEnInstitucionesRed. @param int[] $ids */
    private function paramsIdsFormularioInstitucionesRed(array $ids): array {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        if ($ids === []) {
            return [];
        }
        if (!$this->hasFormularioDerivacionTable()) {
            return $ids;
        }
        return array_merge($ids, $ids, $ids);
    }

    public function getGeneralStats($instId, $from, $to) {
        $res = [];

        $wf = $this->sqlFormularioEnInstitucion('f');
        $wfx = $this->sqlFormularioEnInstitucion('fx');
        $pInstF = $this->paramsInstitucionFormulario((int) $instId);

        // 1. GLOBALES
        // Protocolos: Aprobados + Fecha Fin no vencida (>= HOY)
        $sqlG = "SELECT 
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA WHERE $wf AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE $wf AND f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe f JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario WHERE $wf AND f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.fechainicioA BETWEEN ? AND ?) as total_insumos,
            
            (SELECT COUNT(*) FROM protocoloexpe pe 
             WHERE pe.IdInstitucion = ? 
             AND pe.FechaFinProtA >= CURDATE() 
             AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))
            ) as total_protocolos,

            (SELECT COUNT(DISTINCT a.historia) FROM alojamiento a WHERE a.IdInstitucion = ? AND a.finalizado = 0 AND a.historia IS NOT NULL) as total_alojamientos";
        
        $stmtG = $this->db->prepare($sqlG);
        $paramsG = array_merge(
            $pInstF, [$from, $to],
            $pInstF, [$from, $to],
            $pInstF, [$from, $to],
            [$instId],
            [$instId]
        );
        $stmtG->execute($paramsG);
        $res['globales'] = $stmtG->fetch(\PDO::FETCH_ASSOC);

        // 2. POR DEPARTAMENTO (incluye formularios derivados al depto vía depto_destino; depto externo con (institución))
        $formDeptFxD = $this->sqlFormularioAsignadoADepto('fx', 'd.iddeptoA');
        $deptoEtq = $this->sqlDeptoEtiquetaConInstitucion('d', '?');
        $xdDept = $this->hasDerivacionDeptoDestino() ? [(int) $instId] : [];
        $sqlD = "SELECT 
            d.iddeptoA, {$deptoEtq} AS departamento,
            (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx INNER JOIN sexoe sx ON fx.idformA = sx.idformA WHERE fx.estado = 'Entregado' AND $wfx AND fx.fechainicioA BETWEEN ? AND ? AND {$formDeptFxD}) as total_animales,
            (SELECT COUNT(*) FROM formularioe fx WHERE fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND $wfx AND fx.fechainicioA BETWEEN ? AND ? AND {$formDeptFxD}) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe fx INNER JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario WHERE fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND $wfx AND fx.fechainicioA BETWEEN ? AND ? AND {$formDeptFxD}) as total_insumos,
            
            /* Protocolos Aprobados VIGENTES del Depto */
            (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA 
             WHERE pd.iddeptoA = d.iddeptoA 
             AND pe.IdInstitucion = ? 
             AND pe.FechaFinProtA >= CURDATE()
             AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))
            ) as protocolos_aprobados

        FROM departamentoe d
        LEFT JOIN institucion ins_stat ON ins_stat.IdInstitucion = d.IdInstitucion
        WHERE d.IdInstitucion = ?";
        
        $stmtD = $this->db->prepare($sqlD);
        $paramsD = array_merge(
            [(int) $instId],
            array_merge($pInstF, [$from, $to], $xdDept),
            array_merge($pInstF, [$from, $to], $xdDept),
            array_merge($pInstF, [$from, $to], $xdDept),
            [$instId],
            [$instId]
        );
        $stmtD->execute($paramsD);
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
                WHERE $wf AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                GROUP BY e.EspeNombreA, sb.SubEspeNombreA 
                ORDER BY cantidad DESC"; // QUITAMOS EL LIMIT
        $stmtE = $this->db->prepare($sqlE);
        $stmtE->execute(array_merge($pInstF, [$from, $to]));
        $res['ranking_especies'] = $stmtE->fetchAll(\PDO::FETCH_ASSOC);

        // 4. ALOJAMIENTOS ACTIVOS por depto: historias distintas (no tramos) con al menos un tramo vigente, protocolo asociado al depto vía protdeptor
        $sqlA = "SELECT d.NombreDeptoA as departamento,
                        COUNT(DISTINCT CASE WHEN a.historia IS NOT NULL THEN a.historia END) as cantidad
                 FROM departamentoe d
                 LEFT JOIN protdeptor pd ON d.iddeptoA = pd.iddeptoA
                 LEFT JOIN alojamiento a ON pd.idprotA = a.idprotA AND a.finalizado = 0 AND a.IdInstitucion = ?
                 WHERE d.IdInstitucion = ?
                 GROUP BY d.iddeptoA, d.NombreDeptoA";
        $stmtA = $this->db->prepare($sqlA);
        $stmtA->execute([$instId, $instId]);
        $res['alojamientos_activos'] = $stmtA->fetchAll(\PDO::FETCH_ASSOC);

        // 5. DETALLE ESPECIES (asignación por protocolo o por derivación a depto_destino)
        $formDeptFD = $this->sqlFormularioAsignadoADepto('f', 'd.iddeptoA');
        $deptoEtqDet = $this->sqlDeptoEtiquetaConInstitucion('d', '?');
        $xdDet = $this->hasDerivacionDeptoDestino() ? [(int) $instId] : [];
        $sqlDetalle = "SELECT {$deptoEtqDet} AS departamento, e.EspeNombreA AS especie, sb.SubEspeNombreA AS subespecie, SUM(s.totalA) AS cantidad_animales
            FROM departamentoe d
            LEFT JOIN institucion ins_stat ON ins_stat.IdInstitucion = d.IdInstitucion
            INNER JOIN formularioe f ON f.estado = 'Entregado' AND $wf AND f.fechainicioA BETWEEN ? AND ?
            INNER JOIN sexoe s ON f.idformA = s.idformA
            INNER JOIN formespe fe ON f.idformA = fe.idformA
            INNER JOIN especiee e ON fe.idespA = e.idespA
            LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA
            WHERE d.IdInstitucion = ? AND {$formDeptFD}
            GROUP BY d.iddeptoA, e.EspeNombreA, sb.SubEspeNombreA
            ORDER BY d.iddeptoA, cantidad_animales DESC";
        $stmtDet = $this->db->prepare($sqlDetalle);
        $stmtDet->execute(array_merge([(int) $instId], $pInstF, [$from, $to], [(int) $instId], $xdDet));
        $res['detalle_especies'] = $stmtDet->fetchAll(\PDO::FETCH_ASSOC);

        // 6. DETALLE PROTOCOLOS (Agregamos Fecha Fin para verla en el front)
        $deptoProtEtq = $this->sqlDeptoEtiquetaConInstitucion('d', 'pe.IdInstitucion');
        $sqlProtUso = "SELECT DISTINCT
                        {$deptoProtEtq} AS departamento,
                        pe.nprotA,
                        pe.tituloA,
                        pe.FechaFinProtA
                       FROM formularioe f
                       JOIN protformr pfr ON f.idformA = pfr.idformA
                       JOIN protocoloexpe pe ON pfr.idprotA = pe.idprotA
                       JOIN protdeptor pdr ON pe.idprotA = pdr.idprotA
                       JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA
                       LEFT JOIN institucion ins_stat ON ins_stat.IdInstitucion = d.IdInstitucion
                       WHERE $wf AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                       ORDER BY departamento, pe.nprotA";
        $stmtP = $this->db->prepare($sqlProtUso);
        $stmtP->execute(array_merge($pInstF, [$from, $to]));
        $res['detalle_protocolos'] = $stmtP->fetchAll(\PDO::FETCH_ASSOC);

        // 7. ESTADÍSTICAS AMPLIADAS ALOJAMIENTO / TRAZABILIDAD
        $res['alojamiento_trazabilidad'] = $this->getAlojamientoTrazabilidadStats($instId);

        // 8. CATEGORÍAS DE FORMULARIOS (listar todas + top en el front)
        $res['categorias_formularios'] = $this->getCategoriasFormularios((int)$instId, (string)$from, (string)$to);

        // 9. CEPAS (ranking + detalle por departamento)
        $res['ranking_cepas'] = $this->getRankingCepas((int)$instId, (string)$from, (string)$to);
        $res['detalle_cepas'] = $this->getDetalleCepas((int)$instId, (string)$from, (string)$to);

        $res['derivacion_pedidos'] = $this->getDerivacionVsPropios((int) $instId, (string) $from, (string) $to);

        return $res;
    }

    /**
     * Pedidos entregados propios de la sede vs recibidos por derivación activa, desglosados por institución de origen.
     *
     * @return array{activo: bool, propios?: array<string, float|int>, recibidos_por_origen?: array<int, array<string, mixed>>}
     */
    private function getDerivacionVsPropios(int $instId, string $from, string $to): array {
        if (!$this->hasFormularioDerivacionTable()) {
            return ['activo' => false];
        }
        $i = (int) $instId;
        if ($i <= 0) {
            return ['activo' => false];
        }
        $notRecibidoComoDestino = 'NOT EXISTS (SELECT 1 FROM formulario_derivacion fd_nr WHERE fd_nr.idformA = f.idformA AND fd_nr.Activo = 1 AND fd_nr.IdInstitucionDestino = f.IdInstitucion)';
        $sqlP = "SELECT
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f INNER JOIN sexoe s ON f.idformA = s.idformA
                WHERE f.estado = 'Entregado' AND f.IdInstitucion = ? AND f.fechainicioA BETWEEN ? AND ? AND {$notRecibidoComoDestino}) AS total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.IdInstitucion = ? AND f.fechainicioA BETWEEN ? AND ? AND {$notRecibidoComoDestino}) AS total_reactivos,
            (SELECT COUNT(*) FROM formularioe f INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                WHERE f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.IdInstitucion = ? AND f.fechainicioA BETWEEN ? AND ? AND {$notRecibidoComoDestino}) AS total_insumos";
        $stmtP = $this->db->prepare($sqlP);
        $stmtP->execute([$i, $from, $to, $i, $from, $to, $i, $from, $to]);
        $propios = $stmtP->fetch(\PDO::FETCH_ASSOC) ?: [];
        $propiosOut = [
            'total_animales' => (float) ($propios['total_animales'] ?? 0),
            'total_reactivos' => (int) ($propios['total_reactivos'] ?? 0),
            'total_insumos' => (int) ($propios['total_insumos'] ?? 0),
        ];

        $sqlR = "SELECT fd.IdInstitucionOrigen AS id_institucion_origen,
                TRIM(COALESCE(io.NombreInst, '')) AS institucion_origen,
                IFNULL(SUM(se.totalA), 0) AS total_animales,
                SUM(CASE WHEN f.reactivo IS NOT NULL THEN 1 ELSE 0 END) AS total_reactivos,
                SUM(CASE WHEN tf.categoriaformulario = 'Insumos' THEN 1 ELSE 0 END) AS total_insumos
            FROM formulario_derivacion fd
            LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen
            INNER JOIN formularioe f ON f.idformA = fd.idformA
            LEFT JOIN sexoe se ON f.idformA = se.idformA
            LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            WHERE fd.Activo = 1 AND fd.IdInstitucionDestino = ?
              AND f.estado = 'Entregado'
              AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY fd.IdInstitucionOrigen, io.NombreInst
            ORDER BY institucion_origen ASC";
        $stmtR = $this->db->prepare($sqlR);
        $stmtR->execute([$i, $from, $to]);
        $rows = $stmtR->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $recibidos = [];
        foreach ($rows as $row) {
            $recibidos[] = [
                'id_institucion_origen' => (int) ($row['id_institucion_origen'] ?? 0),
                'institucion_origen' => (string) ($row['institucion_origen'] ?? ''),
                'total_animales' => (float) ($row['total_animales'] ?? 0),
                'total_reactivos' => (int) ($row['total_reactivos'] ?? 0),
                'total_insumos' => (int) ($row['total_insumos'] ?? 0),
            ];
        }

        return [
            'activo' => true,
            'propios' => $propiosOut,
            'recibidos_por_origen' => $recibidos,
        ];
    }

    /**
     * Igual que {@see getDerivacionVsPropios} pero para todas las sedes de la red (destinos en red).
     *
     * @param int[] $ids
     * @return array{activo: bool, propios?: array<string, float|int>, recibidos_por_origen?: array<int, array<string, mixed>>}
     */
    private function getDerivacionVsPropiosRed(array $ids, string $from, string $to): array {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        if (!$this->hasFormularioDerivacionTable() || $ids === []) {
            return ['activo' => false];
        }
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $notRecibidoComoDestino = 'NOT EXISTS (SELECT 1 FROM formulario_derivacion fd_nr WHERE fd_nr.idformA = f.idformA AND fd_nr.Activo = 1 AND fd_nr.IdInstitucionDestino = f.IdInstitucion)';
        $sqlP = "SELECT
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f INNER JOIN sexoe s ON f.idformA = s.idformA
                WHERE f.estado = 'Entregado' AND f.IdInstitucion IN ($ph) AND f.fechainicioA BETWEEN ? AND ? AND {$notRecibidoComoDestino}) AS total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.IdInstitucion IN ($ph) AND f.fechainicioA BETWEEN ? AND ? AND {$notRecibidoComoDestino}) AS total_reactivos,
            (SELECT COUNT(*) FROM formularioe f INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario
                WHERE f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.IdInstitucion IN ($ph) AND f.fechainicioA BETWEEN ? AND ? AND {$notRecibidoComoDestino}) AS total_insumos";
        $stmtP = $this->db->prepare($sqlP);
        $stmtP->execute(array_merge($ids, [$from, $to], $ids, [$from, $to], $ids, [$from, $to]));
        $propios = $stmtP->fetch(\PDO::FETCH_ASSOC) ?: [];
        $propiosOut = [
            'total_animales' => (float) ($propios['total_animales'] ?? 0),
            'total_reactivos' => (int) ($propios['total_reactivos'] ?? 0),
            'total_insumos' => (int) ($propios['total_insumos'] ?? 0),
        ];

        $sqlR = "SELECT fd.IdInstitucionOrigen AS id_institucion_origen,
                TRIM(COALESCE(io.NombreInst, '')) AS institucion_origen,
                IFNULL(SUM(se.totalA), 0) AS total_animales,
                SUM(CASE WHEN f.reactivo IS NOT NULL THEN 1 ELSE 0 END) AS total_reactivos,
                SUM(CASE WHEN tf.categoriaformulario = 'Insumos' THEN 1 ELSE 0 END) AS total_insumos
            FROM formulario_derivacion fd
            LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen
            INNER JOIN formularioe f ON f.idformA = fd.idformA
            LEFT JOIN sexoe se ON f.idformA = se.idformA
            LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            WHERE fd.Activo = 1 AND fd.IdInstitucionDestino IN ($ph)
              AND f.estado = 'Entregado'
              AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY fd.IdInstitucionOrigen, io.NombreInst
            ORDER BY institucion_origen ASC";
        $stmtR = $this->db->prepare($sqlR);
        $stmtR->execute(array_merge($ids, [$from, $to]));
        $rows = $stmtR->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $recibidos = [];
        foreach ($rows as $row) {
            $recibidos[] = [
                'id_institucion_origen' => (int) ($row['id_institucion_origen'] ?? 0),
                'institucion_origen' => (string) ($row['institucion_origen'] ?? ''),
                'total_animales' => (float) ($row['total_animales'] ?? 0),
                'total_reactivos' => (int) ($row['total_reactivos'] ?? 0),
                'total_insumos' => (int) ($row['total_insumos'] ?? 0),
            ];
        }

        return [
            'activo' => true,
            'propios' => $propiosOut,
            'recibidos_por_origen' => $recibidos,
        ];
    }

    /**
     * Organismos por institución en una consulta (evita N+1 en estadísticas de red).
     *
     * @param int[] $ids
     * @return array<int, array<int, array<string, mixed>>>
     */
    private function fetchOrganismosPorInstitucionesBatch(array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0)));
        if ($ids === []) {
            return [];
        }
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT IdInstitucion, IdOrganismo, NombreOrganismoSimple FROM organismoe WHERE IdInstitucion IN ($ph) ORDER BY IdInstitucion ASC, NombreOrganismoSimple ASC"
        );
        $stmt->execute($ids);
        $by = [];
        foreach ($ids as $i) {
            $by[$i] = [];
        }
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
            $by[(int) $r['IdInstitucion']][] = [
                'IdOrganismo' => $r['IdOrganismo'],
                'NombreOrganismoSimple' => $r['NombreOrganismoSimple'],
            ];
        }

        return $by;
    }

    /**
     * Estadísticas agrupadas por organización (organismoe). Incluye fila "(Sin organización)" para deptos sin organismo.
     *
     * @param array<int, array<string, mixed>>|null $orgsPrecargadas Filas como `organismoe` (IdOrganismo, NombreOrganismoSimple); si no es null, no se consulta la BD.
     */
    public function getPorOrganizacion($instId, $from, $to, ?array $orgsPrecargadas = null) {
        $out = [];
        // Organizaciones con sus deptos
        if ($orgsPrecargadas === null) {
            $stmtO = $this->db->prepare('SELECT IdOrganismo, NombreOrganismoSimple FROM organismoe WHERE IdInstitucion = ? ORDER BY NombreOrganismoSimple ASC');
            $stmtO->execute([$instId]);
            $orgs = $stmtO->fetchAll(\PDO::FETCH_ASSOC);
        } else {
            $orgs = $orgsPrecargadas;
        }
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
        $wfx = $this->sqlFormularioEnInstitucion('fx');
        $pFx = $this->paramsInstitucionFormulario((int) $instId);
        $fdBase = "EXISTS (SELECT 1 FROM protformr pfr INNER JOIN protdeptor pdr ON pfr.idprotA = pdr.idprotA INNER JOIN departamentoe d2 ON pdr.iddeptoA = d2.iddeptoA AND d2.IdInstitucion = ? WHERE pfr.idformA = fx.idformA AND $deptoWhere)";
        if ($this->hasDerivacionDeptoDestino()) {
            $fdBase .= " OR EXISTS (SELECT 1 FROM formulario_derivacion fdd_og INNER JOIN departamentoe d2 ON d2.iddeptoA = fdd_og.depto_destino AND d2.IdInstitucion = ? WHERE fdd_og.idformA = fx.idformA AND fdd_og.Activo = 1 AND fdd_og.IdInstitucionDestino = ? AND $deptoWhere AND NOT EXISTS (SELECT 1 FROM protformr pfr_z INNER JOIN protdeptor pdr_z ON pfr_z.idprotA = pdr_z.idprotA WHERE pfr_z.idformA = fx.idformA AND pdr_z.iddeptoA = d2.iddeptoA))";
        }
        $fdForm = '(' . $fdBase . ')';
        $sql = "SELECT
            (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx INNER JOIN sexoe sx ON fx.idformA = sx.idformA WHERE fx.estado = 'Entregado' AND $wfx AND fx.fechainicioA BETWEEN ? AND ? AND $fdForm) as total_animales,
            (SELECT COUNT(*) FROM formularioe fx WHERE fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND $wfx AND fx.fechainicioA BETWEEN ? AND ? AND $fdForm) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe fx INNER JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario WHERE fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND $wfx AND fx.fechainicioA BETWEEN ? AND ? AND $fdForm) as total_insumos,
            (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA JOIN departamentoe d2 ON pd.iddeptoA = d2.iddeptoA AND d2.IdInstitucion = ? WHERE $deptoWhere AND pe.IdInstitucion = ? AND pe.FechaFinProtA >= CURDATE() AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))) as protocolos_aprobados";
        $sinOrganismo = ($deptoWhere === 'd2.organismopertenece IS NULL');
        if ($sinOrganismo && $this->stmtAggregateByDeptoSinOrganismo !== null && $this->stmtAggregateByDeptoSinOrganismoSql === $sql) {
            $stmt = $this->stmtAggregateByDeptoSinOrganismo;
        } else {
            $stmt = $this->db->prepare($sql);
            if ($sinOrganismo) {
                $this->stmtAggregateByDeptoSinOrganismo = $stmt;
                $this->stmtAggregateByDeptoSinOrganismoSql = $sql;
            }
        }
        $i = (int) $instId;
        if ($this->hasDerivacionDeptoDestino()) {
            $blk = array_merge([$i, $i, $i], $pFx, [$from, $to]);
        } else {
            $blk = array_merge([$i], $pFx, [$from, $to]);
        }
        $stmt->execute(array_merge($blk, $blk, $blk, [$i, $i]));
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            $row = ['total_animales' => 0, 'total_reactivos' => 0, 'total_insumos' => 0, 'protocolos_aprobados' => 0];
        }
        $row['total_alojamientos'] = 0;
        return $row;
    }

    /**
     * Conteo de formularios entregados por categoría (`tipoformularios.categoriaformulario`) en el rango.
     * @return array<int, array{categoria: string, cantidad: int}>
     */
    private function getCategoriasFormularios(int $instId, string $from, string $to): array {
        if ($instId <= 0) return [];
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(NULLIF(TRIM(tf.categoriaformulario), ''), 'Sin categoría') AS categoria,
                COUNT(*) AS cantidad
            FROM formularioe f
            INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            WHERE " . $this->sqlFormularioEnInstitucion('f') . "
              AND f.estado = 'Entregado'
              AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY categoria
            ORDER BY cantidad DESC, categoria ASC
        ");
        $stmt->execute(array_merge($this->paramsInstitucionFormulario((int) $instId), [$from, $to]));
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function ($r) {
            return [
                'categoria' => (string)($r['categoria'] ?? ''),
                'cantidad' => (int)($r['cantidad'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * Ranking de cepas (suma de animales: sexoe.totalA) en formularios entregados en el rango.
     * @return array<int, array{cepa: string, cantidad_animales: int}>
     */
    private function getRankingCepas(int $instId, string $from, string $to): array {
        if ($instId <= 0) return [];
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa') AS cepa,
                IFNULL(SUM(s.totalA), 0) AS cantidad_animales
            FROM formularioe f
            INNER JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN cepa c ON f.idcepaA = c.idcepaA
            WHERE " . $this->sqlFormularioEnInstitucion('f') . "
              AND f.estado = 'Entregado'
              AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY cepa
            ORDER BY cantidad_animales DESC, cepa ASC
        ");
        $stmt->execute(array_merge($this->paramsInstitucionFormulario((int) $instId), [$from, $to]));
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function ($r) {
            return [
                'cepa' => (string)($r['cepa'] ?? ''),
                'cantidad_animales' => (int)($r['cantidad_animales'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * Detalle de cepas por departamento (suma de animales: sexoe.totalA) en el rango.
     * @return array<int, array{departamento: string, cepa: string, cantidad_animales: int}>
     */
    private function getDetalleCepas(int $instId, string $from, string $to): array {
        if ($instId <= 0) return [];
        $wf = $this->sqlFormularioEnInstitucion('f');
        $pInst = $this->paramsInstitucionFormulario((int) $instId);
        $deptoEtq = $this->sqlDeptoEtiquetaConInstitucion('d', '?');
        $formDept = $this->sqlFormularioAsignadoADepto('f', 'd.iddeptoA');
        $xd = $this->hasDerivacionDeptoDestino() ? [(int) $instId] : [];
        $stmt = $this->db->prepare("
            SELECT
                {$deptoEtq} AS departamento,
                COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa') AS cepa,
                IFNULL(SUM(s.totalA), 0) AS cantidad_animales
            FROM departamentoe d
            LEFT JOIN institucion ins_stat ON ins_stat.IdInstitucion = d.IdInstitucion
            INNER JOIN formularioe f ON f.estado = 'Entregado' AND {$wf} AND f.fechainicioA BETWEEN ? AND ?
            INNER JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN cepa c ON f.idcepaA = c.idcepaA
            WHERE d.IdInstitucion = ? AND {$formDept}
            GROUP BY d.iddeptoA, COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa')
            ORDER BY d.iddeptoA ASC, cantidad_animales DESC, cepa ASC
        ");
        $stmt->execute(array_merge([(int) $instId], $pInst, [$from, $to], [(int) $instId], $xd));
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function ($r) {
            return [
                'departamento' => (string)($r['departamento'] ?? ''),
                'cepa' => (string)($r['cepa'] ?? ''),
                'cantidad_animales' => (int)($r['cantidad_animales'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * @param int[] $ids
     * @return array<int, array{categoria: string, cantidad: int}>
     */
    private function getCategoriasFormulariosRed(array $ids, string $from, string $to): array {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        if ($ids === []) return [];
        $wf = $this->sqlFormularioEnInstitucionesRed('f', $ids);
        $dbl = $this->paramsIdsFormularioInstitucionesRed($ids);
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(NULLIF(TRIM(tf.categoriaformulario), ''), 'Sin categoría') AS categoria,
                COUNT(*) AS cantidad
            FROM formularioe f
            INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
            WHERE $wf
              AND f.estado = 'Entregado'
              AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY categoria
            ORDER BY cantidad DESC, categoria ASC
        ");
        $stmt->execute(array_merge($dbl, [$from, $to]));
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function ($r) {
            return [
                'categoria' => (string)($r['categoria'] ?? ''),
                'cantidad' => (int)($r['cantidad'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * @param int[] $ids
     * @return array<int, array{cepa: string, cantidad_animales: int}>
     */
    private function getRankingCepasRed(array $ids, string $from, string $to): array {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        if ($ids === []) return [];
        $wf = $this->sqlFormularioEnInstitucionesRed('f', $ids);
        $dbl = $this->paramsIdsFormularioInstitucionesRed($ids);
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa') AS cepa,
                IFNULL(SUM(s.totalA), 0) AS cantidad_animales
            FROM formularioe f
            INNER JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN cepa c ON f.idcepaA = c.idcepaA
            WHERE $wf
              AND f.estado = 'Entregado'
              AND f.fechainicioA BETWEEN ? AND ?
            GROUP BY cepa
            ORDER BY cantidad_animales DESC, cepa ASC
        ");
        $stmt->execute(array_merge($dbl, [$from, $to]));
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function ($r) {
            return [
                'cepa' => (string)($r['cepa'] ?? ''),
                'cantidad_animales' => (int)($r['cantidad_animales'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * @param int[] $ids
     * @return array<int, array{departamento: string, cepa: string, cantidad_animales: int}>
     */
    private function getDetalleCepasRed(array $ids, string $from, string $to): array {
        $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
        if ($ids === []) return [];
        $wf = $this->sqlFormularioEnInstitucionesRed('f', $ids);
        $dbl = $this->paramsIdsFormularioInstitucionesRed($ids);
        $placeholdersD = implode(',', array_fill(0, count($ids), '?'));
        $formDeptRed = $this->sqlFormularioAsignadoADeptoRed('f', 'd.iddeptoA', $ids);
        $xdFormRed = $this->paramsFormularioAsignadoADeptoRed($ids);
        $extClauseRed = $this->hasColumn('departamentoe', 'externodepto') ? 'IFNULL(d.externodepto, 0) = 2' : '0';
        $deptoPartRed = "CASE WHEN (d.IdInstitucion IS NOT NULL AND d.IdInstitucion <> f.IdInstitucion) OR {$extClauseRed} THEN CONCAT(TRIM(d.NombreDeptoA), ' (', TRIM(COALESCE(insD.NombreInst, '')), ')') ELSE TRIM(d.NombreDeptoA) END";
        $stmt = $this->db->prepare("
            SELECT
                CONCAT(inst.NombreInst, ' --> ', {$deptoPartRed}) AS departamento,
                COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa') AS cepa,
                IFNULL(SUM(s.totalA), 0) AS cantidad_animales
            FROM departamentoe d
            LEFT JOIN institucion insD ON insD.IdInstitucion = d.IdInstitucion
            INNER JOIN formularioe f ON f.estado = 'Entregado' AND $wf AND f.fechainicioA BETWEEN ? AND ?
            INNER JOIN institucion inst ON inst.IdInstitucion = f.IdInstitucion
            INNER JOIN sexoe s ON f.idformA = s.idformA
            LEFT JOIN cepa c ON f.idcepaA = c.idcepaA
            WHERE d.IdInstitucion IN ($placeholdersD)
              AND {$formDeptRed}
            GROUP BY inst.NombreInst, d.iddeptoA, COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa')
            ORDER BY inst.NombreInst ASC, d.iddeptoA ASC, cantidad_animales DESC, COALESCE(NULLIF(TRIM(c.CepaNombreA), ''), 'Sin cepa') ASC
        ");
        $stmt->execute(array_merge($dbl, [$from, $to], $ids, $xdFormRed));
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return array_map(static function ($r) {
            return [
                'departamento' => (string)($r['departamento'] ?? ''),
                'cepa' => (string)($r['cepa'] ?? ''),
                'cantidad_animales' => (int)($r['cantidad_animales'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * Valor de columna madre del grupo leyendo la fila con claves en cualquier casing (PDO/MariaDB).
     */
    private function pickMadreGrupoFromInstitucionRow(array $row): int {
        foreach ($row as $k => $v) {
            if (!\is_string($k)) {
                continue;
            }
            if (preg_match('/^madre(_?grupo)?$/i', $k)) {
                return (int) $v;
            }
        }

        return 0;
    }

    private function pickStringFromRowCi(array $row, string $name): string {
        foreach ($row as $k => $v) {
            if (\is_string($k) && strcasecmp($k, $name) === 0) {
                return trim((string) $v);
            }
        }

        return '';
    }

    /**
     * Devuelve flags para estadísticas de red/grupo: madre_grupo y red/dependencia_grupo siempre en camel/snake esperado por el front.
     */
    public function getInstitutionFlags($instId) {
        $cols = $this->sqlSelectInstitucionAllColumns();
        $stmt = $this->db->prepare("SELECT {$cols} FROM institucion WHERE IdInstitucion = ? LIMIT 1");
        $stmt->execute([(int) $instId]);
        $full = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$full) {
            return [
                'madre_grupo' => 0,
                'red' => '',
                'dependencia_grupo' => '',
                'NombreInst' => '',
                'instituciones_en_red' => 0,
            ];
        }
        $mg = $this->pickMadreGrupoFromInstitucionRow($full);
        $dep = $this->pickStringFromRowCi($full, 'DependenciaInstitucion');
        $nombre = $this->pickStringFromRowCi($full, 'NombreInst');
        $ids = $this->getInstitutionIdsInNetwork($instId);

        return [
            'madre_grupo' => $mg,
            'red' => $dep,
            'dependencia_grupo' => $dep,
            'NombreInst' => $nombre,
            'instituciones_en_red' => \count($ids),
        ];
    }

    /**
     * Ids de instituciones del mismo grupo: mismo valor en DependenciaInstitucion (texto no vacío).
     * Si existe columna legacy `red` y está rellena, se usa primero para no romper instalaciones antiguas.
     * Incluye la propia institución.
     */
    public function getInstitutionIdsInNetwork($instId) {
        $hasRedCol = $this->hasColumn('institucion', 'red');
        $select = $hasRedCol
            ? 'SELECT TRIM(COALESCE(red, \'\')) AS red, TRIM(COALESCE(DependenciaInstitucion, \'\')) AS dep FROM institucion WHERE IdInstitucion = ?'
            : 'SELECT TRIM(COALESCE(DependenciaInstitucion, \'\')) AS dep FROM institucion WHERE IdInstitucion = ?';
        $stmt = $this->db->prepare($select);
        $stmt->execute([$instId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return [$instId];
        }
        if ($hasRedCol) {
            $red = $this->pickStringFromRowCi($row, 'red');
            if ($red !== '') {
                $stmt2 = $this->db->prepare('SELECT IdInstitucion FROM institucion WHERE TRIM(COALESCE(red, \'\')) = ?');
                $stmt2->execute([$red]);
                $ids = $stmt2->fetchAll(\PDO::FETCH_COLUMN);

                return $ids ?: [$instId];
            }
        }
        $dep = $this->pickStringFromRowCi($row, 'dep');
        if ($dep !== '') {
            $stmt3 = $this->db->prepare("
                SELECT i.IdInstitucion FROM institucion i
                INNER JOIN institucion mi ON mi.IdInstitucion = ?
                WHERE mi.DependenciaInstitucion IS NOT NULL AND TRIM(mi.DependenciaInstitucion) <> ''
                  AND i.DependenciaInstitucion IS NOT NULL AND TRIM(i.DependenciaInstitucion) <> ''
                  AND TRIM(i.DependenciaInstitucion) = TRIM(mi.DependenciaInstitucion)
            ");
            $stmt3->execute([$instId]);
            $idsDep = $stmt3->fetchAll(\PDO::FETCH_COLUMN);

            return $idsDep ?: [$instId];
        }

        return [$instId];
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
        $wfRed = $this->sqlFormularioEnInstitucionesRed('f', $ids);
        // 1. GLOBALES: sumar sobre todas las inst
        $res = [];
        $sqlG = "SELECT 
            (SELECT IFNULL(SUM(s.totalA), 0) FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA WHERE $wfRed AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?) as total_animales,
            (SELECT COUNT(*) FROM formularioe f WHERE $wfRed AND f.estado = 'Entregado' AND f.reactivo IS NOT NULL AND f.fechainicioA BETWEEN ? AND ?) as total_reactivos,
            (SELECT COUNT(*) FROM formularioe f JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario WHERE $wfRed AND f.estado = 'Entregado' AND t.categoriaformulario = 'Insumos' AND f.fechainicioA BETWEEN ? AND ?) as total_insumos,
            (SELECT COUNT(*) FROM protocoloexpe pe WHERE pe.IdInstitucion IN ($placeholders) AND pe.FechaFinProtA >= CURDATE() AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))) as total_protocolos,
            (SELECT COUNT(DISTINCT a.historia) FROM alojamiento a WHERE a.IdInstitucion IN ($placeholders) AND a.finalizado = 0 AND a.historia IS NOT NULL) as total_alojamientos";
        $dblIds = $this->paramsIdsFormularioInstitucionesRed($ids);
        $paramsG = array_merge(
            $dblIds, [$from, $to],
            $dblIds, [$from, $to],
            $dblIds, [$from, $to],
            $ids,
            $ids
        );
        $stmtG = $this->db->prepare($sqlG);
        $stmtG->execute($paramsG);
        $res['globales'] = $stmtG->fetch(\PDO::FETCH_ASSOC);

        $institutionNames = $this->getInstitutionNamesBatch($ids);

        // 2. POR DEPARTAMENTO: una fila por (institución, departamento), con nombre de institución
        $res['por_departamento'] = [];
        $wfxRedLoop = $this->sqlFormularioEnInstitucion('fx');
        $formDeptLoop = $this->sqlFormularioAsignadoADepto('fx', 'd.iddeptoA');
        $deptoEtqLoop = $this->sqlDeptoEtiquetaConInstitucion('d', '?');
        $hasDerivDept = $this->hasDerivacionDeptoDestino();
        $sqlD = "SELECT {$deptoEtqLoop} AS departamento,
                (SELECT IFNULL(SUM(sx.totalA), 0) FROM formularioe fx INNER JOIN sexoe sx ON fx.idformA = sx.idformA WHERE fx.estado = 'Entregado' AND $wfxRedLoop AND fx.fechainicioA BETWEEN ? AND ? AND {$formDeptLoop}) as total_animales,
                (SELECT COUNT(*) FROM formularioe fx WHERE fx.estado = 'Entregado' AND fx.reactivo IS NOT NULL AND $wfxRedLoop AND fx.fechainicioA BETWEEN ? AND ? AND {$formDeptLoop}) as total_reactivos,
                (SELECT COUNT(*) FROM formularioe fx INNER JOIN tipoformularios tx ON fx.tipoA = tx.IdTipoFormulario WHERE fx.estado = 'Entregado' AND tx.categoriaformulario = 'Insumos' AND $wfxRedLoop AND fx.fechainicioA BETWEEN ? AND ? AND {$formDeptLoop}) as total_insumos,
                (SELECT COUNT(DISTINCT pd.idprotA) FROM protdeptor pd JOIN protocoloexpe pe ON pd.idprotA = pe.idprotA WHERE pd.iddeptoA = d.iddeptoA AND pe.IdInstitucion = ? AND pe.FechaFinProtA >= CURDATE() AND (NOT EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA) OR EXISTS (SELECT 1 FROM solicitudprotocolo sp WHERE sp.idprotA = pe.idprotA AND sp.Aprobado = 1))) as protocolos_aprobados
                FROM departamentoe d
                LEFT JOIN institucion ins_stat ON ins_stat.IdInstitucion = d.IdInstitucion
                WHERE d.IdInstitucion = ?";
        $stmtD = $this->db->prepare($sqlD);
        foreach ($ids as $id) {
            $pfxLoop = $this->paramsInstitucionFormulario((int) $id);
            $xdLoop = $hasDerivDept ? [(int) $id] : [];
            $stmtD->execute(array_merge(
                [(int) $id],
                array_merge($pfxLoop, [$from, $to], $xdLoop),
                array_merge($pfxLoop, [$from, $to], $xdLoop),
                array_merge($pfxLoop, [$from, $to], $xdLoop),
                [$id],
                [$id]
            ));
            $rows = $stmtD->fetchAll(\PDO::FETCH_ASSOC);
            $instName = $institutionNames[(int) $id] ?? (string) $id;
            foreach ($rows as $r) {
                $r['institucion'] = $instName;
                $r['departamento'] = $instName . ' --> ' . $r['departamento'];
                $res['por_departamento'][] = $r;
            }
        }

        // 2b. POR ORGANIZACIÓN (una fila por inst + org)
        $res['por_organizacion'] = [];
        $orgsPorInstRed = $this->fetchOrganismosPorInstitucionesBatch($ids);
        foreach ($ids as $id) {
            $orgRows = $this->getPorOrganizacion($id, $from, $to, $orgsPorInstRed[(int) $id] ?? []);
            $instName = $institutionNames[(int) $id] ?? (string) $id;
            foreach ($orgRows as $r) {
                $r['institucion'] = $instName;
                $r['organizacion'] = $instName . ' --> ' . ($r['organizacion'] ?? '');
                $res['por_organizacion'][] = $r;
            }
        }

        // 3. RANKING ESPECIES (agregado red)
        $sqlE = "SELECT CONCAT(e.EspeNombreA, ' (', IFNULL(sb.SubEspeNombreA, 'Gral'), ')') as etiqueta_especie, SUM(s.totalA) as cantidad
                FROM formularioe f JOIN sexoe s ON f.idformA = s.idformA JOIN formespe fe ON f.idformA = fe.idformA JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA
                WHERE $wfRed AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?
                GROUP BY e.EspeNombreA, sb.SubEspeNombreA ORDER BY cantidad DESC";
        $stmtE = $this->db->prepare($sqlE);
        $stmtE->execute(array_merge($dblIds, [$from, $to]));
        $res['ranking_especies'] = $stmtE->fetchAll(\PDO::FETCH_ASSOC);

        // 4. ALOJAMIENTOS ACTIVOS por inst (agregado) — una consulta para toda la red
        $res['alojamientos_activos'] = [];
        if ($ids !== []) {
            $phA = implode(',', array_fill(0, count($ids), '?'));
            $sqlA = "SELECT d.IdInstitucion,
                        d.NombreDeptoA as departamento,
                        COUNT(DISTINCT CASE WHEN a.historia IS NOT NULL THEN a.historia END) as cantidad
                 FROM departamentoe d
                 LEFT JOIN protdeptor pd ON d.iddeptoA = pd.iddeptoA
                 LEFT JOIN alojamiento a ON pd.idprotA = a.idprotA AND a.finalizado = 0 AND a.IdInstitucion = d.IdInstitucion
                 WHERE d.IdInstitucion IN ($phA)
                 GROUP BY d.IdInstitucion, d.iddeptoA, d.NombreDeptoA";
            $stmtA = $this->db->prepare($sqlA);
            $stmtA->execute($ids);
            $rowsByInst = [];
            foreach ($stmtA->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $arow) {
                $iid = (int) $arow['IdInstitucion'];
                unset($arow['IdInstitucion']);
                $rowsByInst[$iid][] = $arow;
            }
            foreach ($ids as $id) {
                $instName = $institutionNames[(int) $id] ?? (string) $id;
                foreach ($rowsByInst[(int) $id] ?? [] as $r) {
                    $r['departamento'] = $instName . ' --> ' . $r['departamento'];
                    $res['alojamientos_activos'][] = $r;
                }
            }
        }

        // 5. DETALLE ESPECIES (red: deptos de la red + derivación a depto_destino; depto externo con (institución))
        $placeholdersD = implode(',', array_fill(0, count($ids), '?'));
        $formDeptRed = $this->sqlFormularioAsignadoADeptoRed('f', 'd.iddeptoA', $ids);
        $xdFormRed = $this->paramsFormularioAsignadoADeptoRed($ids);
        $extClauseRed = $this->hasColumn('departamentoe', 'externodepto') ? 'IFNULL(d.externodepto, 0) = 2' : '0';
        $deptoPartRed = "CASE WHEN (d.IdInstitucion IS NOT NULL AND d.IdInstitucion <> f.IdInstitucion) OR {$extClauseRed} THEN CONCAT(TRIM(d.NombreDeptoA), ' (', TRIM(COALESCE(insD.NombreInst, '')), ')') ELSE TRIM(d.NombreDeptoA) END";
        $sqlDetalle = "SELECT CONCAT(inst.NombreInst, ' --> ', {$deptoPartRed}) AS departamento, e.EspeNombreA AS especie, sb.SubEspeNombreA AS subespecie, SUM(s.totalA) AS cantidad_animales
            FROM departamentoe d
            LEFT JOIN institucion insD ON insD.IdInstitucion = d.IdInstitucion
            INNER JOIN formularioe f ON f.estado = 'Entregado' AND $wfRed AND f.fechainicioA BETWEEN ? AND ?
            INNER JOIN institucion inst ON inst.IdInstitucion = f.IdInstitucion
            INNER JOIN sexoe s ON f.idformA = s.idformA
            INNER JOIN formespe fe ON f.idformA = fe.idformA
            INNER JOIN especiee e ON fe.idespA = e.idespA
            LEFT JOIN subespecie sb ON f.idsubespA = sb.idsubespA
            WHERE d.IdInstitucion IN ($placeholdersD)
              AND {$formDeptRed}
            GROUP BY inst.NombreInst, d.iddeptoA, e.EspeNombreA, sb.SubEspeNombreA
            ORDER BY inst.NombreInst, d.iddeptoA, cantidad_animales DESC";
        $stmtDet = $this->db->prepare($sqlDetalle);
        $stmtDet->execute(array_merge($dblIds, [$from, $to], $ids, $xdFormRed));
        $res['detalle_especies'] = $stmtDet->fetchAll(\PDO::FETCH_ASSOC);

        // 6. DETALLE PROTOCOLOS (depto de otra sede / externo: nombre (institución))
        $deptoProtPartRed = "CASE WHEN (d.IdInstitucion IS NOT NULL AND d.IdInstitucion <> pe.IdInstitucion) OR {$extClauseRed} THEN CONCAT(TRIM(d.NombreDeptoA), ' (', TRIM(COALESCE(insD.NombreInst, '')), ')') ELSE TRIM(d.NombreDeptoA) END";
        $sqlProtUso = "SELECT DISTINCT CONCAT(inst.NombreInst, ' --> ', {$deptoProtPartRed}) AS departamento, pe.nprotA, pe.tituloA, pe.FechaFinProtA
            FROM formularioe f JOIN protformr pfr ON f.idformA = pfr.idformA JOIN protocoloexpe pe ON pfr.idprotA = pe.idprotA JOIN protdeptor pdr ON pe.idprotA = pdr.idprotA JOIN departamentoe d ON pdr.iddeptoA = d.iddeptoA LEFT JOIN institucion insD ON insD.IdInstitucion = d.IdInstitucion JOIN institucion inst ON inst.IdInstitucion = pe.IdInstitucion
            WHERE $wfRed AND f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ? ORDER BY inst.NombreInst, departamento, pe.nprotA";
        $stmtP = $this->db->prepare($sqlProtUso);
        $stmtP->execute(array_merge($dblIds, [$from, $to]));
        $res['detalle_protocolos'] = $stmtP->fetchAll(\PDO::FETCH_ASSOC);

        // 7. ALOJAMIENTO TRAZABILIDAD (agregado)
        $res['alojamiento_trazabilidad'] = $this->getAlojamientoTrazabilidadStatsRed($ids);

        // 8. CATEGORÍAS DE FORMULARIOS (red)
        $res['categorias_formularios'] = $this->getCategoriasFormulariosRed($ids, (string)$from, (string)$to);

        // 9. CEPAS (red)
        $res['ranking_cepas'] = $this->getRankingCepasRed($ids, (string)$from, (string)$to);
        $res['detalle_cepas'] = $this->getDetalleCepasRed($ids, (string)$from, (string)$to);

        $res['derivacion_pedidos'] = $this->getDerivacionVsPropiosRed($ids, (string) $from, (string) $to);

        return $res;
    }

    private function getInstitutionName($instId) {
        $stmt = $this->db->prepare("SELECT NombreInst FROM institucion WHERE IdInstitucion = ?");
        $stmt->execute([$instId]);
        $r = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $r ? $r['NombreInst'] : (string) $instId;
    }

    /**
     * Nombres de institución en una sola consulta (evita N+1 en estadísticas de red).
     * @param int[] $ids
     * @return array<int, string>
     */
    private function getInstitutionNamesBatch(array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0)));
        if ($ids === []) {
            return [];
        }
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare("SELECT IdInstitucion, NombreInst FROM institucion WHERE IdInstitucion IN ($ph)");
        $stmt->execute($ids);
        $out = [];
        while ($r = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $out[(int) $r['IdInstitucion']] = (string) ($r['NombreInst'] ?? '');
        }

        return $out;
    }

    /**
     * Misma semántica que N llamadas a getAlojamientoTrazabilidadStats, con menos round-trips a la BD.
     * @param int[] $instIds
     */
    private function getAlojamientoTrazabilidadStatsRed(array $instIds): array {
        $instIds = array_values(array_filter(array_map('intval', $instIds), static fn ($v) => $v > 0));
        if ($instIds === []) {
            return [
                'total_historias' => 0,
                'total_cajas' => 0,
                'total_observaciones_trazabilidad' => 0,
                'alojamientos_activos' => 0,
                'por_especie' => [],
            ];
        }
        $ph = implode(',', array_fill(0, count($instIds), '?'));

        $stmtH = $this->db->prepare(
            "SELECT IFNULL(SUM(hc.cnt), 0) FROM (
                SELECT COUNT(DISTINCT a.historia) AS cnt FROM alojamiento a
                WHERE a.IdInstitucion IN ($ph) AND a.historia IS NOT NULL GROUP BY a.IdInstitucion
            ) hc"
        );
        $stmtH->execute($instIds);
        $total_historias = (int) $stmtH->fetchColumn();

        $stmtC = $this->db->prepare(
            "SELECT COUNT(*) FROM alojamiento_caja ac INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.IdInstitucion IN ($ph)"
        );
        $stmtC->execute($instIds);
        $total_cajas = (int) $stmtC->fetchColumn();

        $stmtO = $this->db->prepare(
            "SELECT COUNT(*) FROM observacion_alojamiento_unidad o
             INNER JOIN especie_alojamiento_unidad eu ON o.IdEspecieAlojUnidad = eu.IdEspecieAlojUnidad
             INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
             INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
             WHERE a.IdInstitucion IN ($ph)"
        );
        $stmtO->execute($instIds);
        $total_observaciones = (int) $stmtO->fetchColumn();

        $stmtA = $this->db->prepare(
            "SELECT COUNT(*) FROM alojamiento a WHERE a.IdInstitucion IN ($ph) AND a.finalizado = 0"
        );
        $stmtA->execute($instIds);
        $alojamientos_activos = (int) $stmtA->fetchColumn();

        $stmtE = $this->db->prepare(
            "SELECT e.EspeNombreA AS especie,
                    IFNULL(SUM(x.historias), 0) AS historias,
                    IFNULL(SUM(x.tramos), 0) AS tramos
             FROM (
                 SELECT a.IdInstitucion, a.TipoAnimal,
                        COUNT(DISTINCT a.historia) AS historias,
                        COUNT(a.IdAlojamiento) AS tramos
                 FROM alojamiento a
                 WHERE a.IdInstitucion IN ($ph)
                 GROUP BY a.IdInstitucion, a.TipoAnimal
             ) x
             INNER JOIN especiee e ON x.TipoAnimal = e.idespA
             GROUP BY e.EspeNombreA
             ORDER BY historias DESC"
        );
        $stmtE->execute($instIds);
        $por_especie = $stmtE->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        return [
            'total_historias' => $total_historias,
            'total_cajas' => $total_cajas,
            'total_observaciones_trazabilidad' => $total_observaciones,
            'alojamientos_activos' => $alojamientos_activos,
            'por_especie' => $por_especie,
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
