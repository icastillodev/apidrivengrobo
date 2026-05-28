<?php
namespace App\Models\Billing;

use PDO;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class BillingModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function hasColumn(string $table, string $column): bool {
        try {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
            $stmt->execute([$column]);
            return (bool) $stmt->fetchColumn();
        } catch (\Exception $e) {
            return false;
        }
    }

    /** Columna de cirugía/procedimiento en `protocoloexpe` si existe (`con_cirugia` / `cirugia`). */
    private function protocoloCirugiaColumnName(): ?string {
        static $memo = null;
        static $done = false;
        if ($done) {
            return $memo;
        }
        $done = true;
        try {
            $stmt = $this->db->query('SHOW COLUMNS FROM protocoloexpe');
            while ($r = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $f = $r['Field'] ?? '';
                if ($f !== '' && preg_match('/^(con_?cirugia|cirugia)$/i', $f)) {
                    $memo = $f;
                    return $memo;
                }
            }
        } catch (\Throwable $e) {
            $memo = null;
        }
        return $memo;
    }

    /**
     * Metadatos de derivación activa por id de formulario (quién derivó + institución origen), sin filtrar por IdInstitucion del pedido.
     */
    private function billingSqlDerivacionCamposSelect(string $formIdExpr = 'f.idformA'): string {
        if (!$this->tableExists('formulario_derivacion')) {
            return 'NULL AS derivado_por_id, NULL AS derivado_por_nombre, NULL AS derivado_desde_institucion';
        }
        $e = $formIdExpr;
        return "(SELECT fd.IdUsrOrigen FROM formulario_derivacion fd WHERE fd.idformA = {$e} AND fd.Activo = 1 ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1) AS derivado_por_id,
                (SELECT TRIM(CONCAT(COALESCE(po.NombreA,''), ' ', COALESCE(po.ApellidoA,''))) FROM formulario_derivacion fd INNER JOIN personae po ON po.IdUsrA = fd.IdUsrOrigen WHERE fd.idformA = {$e} AND fd.Activo = 1 ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1) AS derivado_por_nombre,
                (SELECT COALESCE(io.NombreInst,'') FROM formulario_derivacion fd LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen WHERE fd.idformA = {$e} AND fd.Activo = 1 ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1) AS derivado_desde_institucion";
    }

    /** Variante con agregados para consultas con GROUP BY f.idformA. */
    private function billingSqlDerivacionCamposSelectGrouped(string $formIdExpr = 'f.idformA'): string {
        if (!$this->tableExists('formulario_derivacion')) {
            return 'NULL AS derivado_por_id, NULL AS derivado_por_nombre, NULL AS derivado_desde_institucion';
        }
        $e = $formIdExpr;
        return "MAX((SELECT fd.IdUsrOrigen FROM formulario_derivacion fd WHERE fd.idformA = {$e} AND fd.Activo = 1 ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1)) AS derivado_por_id,
                MAX((SELECT TRIM(CONCAT(COALESCE(po.NombreA,''), ' ', COALESCE(po.ApellidoA,''))) FROM formulario_derivacion fd INNER JOIN personae po ON po.IdUsrA = fd.IdUsrOrigen WHERE fd.idformA = {$e} AND fd.Activo = 1 ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1)) AS derivado_por_nombre,
                MAX((SELECT COALESCE(io.NombreInst,'') FROM formulario_derivacion fd LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen WHERE fd.idformA = {$e} AND fd.Activo = 1 ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1)) AS derivado_desde_institucion";
    }

    private function hasDerivacionDeptoDestino(): bool {
        return $this->tableExists('formulario_derivacion')
            && $this->hasColumn('formulario_derivacion', 'depto_destino');
    }

    /** @return array{0: string, 1: array<int, mixed>} */
    private function billingSqlAndFormularioEnDepto(int $deptoId, int $instCobradora, string $formAlias = 'f'): array {
        $deptoId = (int) $deptoId;
        $instCobradora = (int) $instCobradora;
        if ($deptoId <= 0) {
            return ['', []];
        }
        $fx = $formAlias;
        $prot = "EXISTS (
            SELECT 1 FROM protformr pfr
            INNER JOIN protocoloexpe px ON px.idprotA = pfr.idprotA
            WHERE pfr.idformA = {$fx}.idformA AND px.departamento = ?
              AND NOT EXISTS (
                  SELECT 1 FROM formulario_derivacion fdd_o
                  WHERE fdd_o.idformA = {$fx}.idformA AND fdd_o.Activo = 1
                    AND fdd_o.IdInstitucionDestino = ?
                    AND fdd_o.depto_destino IS NOT NULL AND fdd_o.depto_destino > 0
              )
        )";
        $params = [$deptoId, $instCobradora > 0 ? $instCobradora : 0];
        $parts = [$prot];
        if ($this->hasDerivacionDeptoDestino() && $instCobradora > 0) {
            $parts[] = "EXISTS (
                SELECT 1 FROM formulario_derivacion fdd
                WHERE fdd.idformA = {$fx}.idformA AND fdd.Activo = 1
                  AND fdd.IdInstitucionDestino = ? AND fdd.depto_destino = ?
            )";
            array_push($params, $instCobradora, $deptoId);
        }
        $parts[] = "(NOT EXISTS (SELECT 1 FROM protformr pfr0 WHERE pfr0.idformA = {$fx}.idformA) AND {$fx}.depto = ?)";
        $params[] = $deptoId;
        return [' AND (' . implode(' OR ', $parts) . ')', $params];
    }

    /** @return array{0: string, 1: array<int, mixed>} */
    private function billingSqlAndFormularioSinProtocoloEnDepto(int $deptoId, int $instCobradora): array {
        $deptoId = (int) $deptoId;
        $instCobradora = (int) $instCobradora;
        if ($deptoId <= 0) {
            return ['', []];
        }
        if ($this->hasDerivacionDeptoDestino() && $instCobradora > 0) {
            return [
                " AND (f.depto = ? OR EXISTS (
                    SELECT 1 FROM formulario_derivacion fdd
                    WHERE fdd.idformA = f.idformA AND fdd.Activo = 1
                      AND fdd.IdInstitucionDestino = ? AND fdd.depto_destino = ?
                ))",
                [$deptoId, $instCobradora, $deptoId],
            ];
        }
        return [' AND f.depto = ?', [$deptoId]];
    }

    public function getProtocolosByDepto($deptoId, $instId = null) {
        $deptoId = (int) $deptoId;
        $instId = (int) ($instId ?? 0);
        $sql = "SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA, p.IdUsrA,
                       CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador,
                       0 as es_protocolo_derivado,
                       NULL as derivacion_inst_origen
                FROM protocoloexpe p
                JOIN personae u ON p.IdUsrA = u.IdUsrA
                WHERE p.departamento = ? AND p.idprotA > 0";
        $params = [$deptoId];
        if ($instId > 0) {
            $sql .= ' AND p.IdInstitucion = ?';
            $params[] = $instId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $byId = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $id = (int) ($row['idprotA'] ?? 0);
            if ($id > 0) {
                $byId[$id] = $row;
            }
        }
        if ($instId > 0 && $this->hasDerivacionDeptoDestino()) {
            $sqlDeriv = "SELECT DISTINCT p.idprotA, p.nprotA, p.tituloA, p.IdUsrA,
                                CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador,
                                1 as es_protocolo_derivado,
                                COALESCE(io.NombreInst, '') as derivacion_inst_origen
                         FROM formulario_derivacion fd
                         INNER JOIN formularioe f ON f.idformA = fd.idformA
                         INNER JOIN protformr pf ON pf.idformA = f.idformA
                         INNER JOIN protocoloexpe p ON p.idprotA = pf.idprotA
                         JOIN personae u ON p.IdUsrA = u.IdUsrA
                         LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen
                         WHERE fd.Activo = 1
                           AND fd.IdInstitucionDestino = ?
                           AND fd.depto_destino = ?
                           AND f.estado = 'Entregado'
                           AND p.idprotA > 0";
            $stmtDeriv = $this->db->prepare($sqlDeriv);
            $stmtDeriv->execute([$instId, $deptoId]);
            foreach ($stmtDeriv->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $id = (int) ($row['idprotA'] ?? 0);
                if ($id > 0 && !isset($byId[$id])) {
                    $byId[$id] = $row;
                }
            }
        }
        return array_values($byId);
    }

    /**
     * Pedidos (formularios) del departamento que NO están vinculados a ningún protocolo (formato viejo).
     */
    public function getPedidosDeptoSinProtocolo($deptoId, $desde = null, $hasta = null, $instCobradora = null) {
        $dDeriv = $this->billingSqlDerivacionCamposSelect('f.idformA');
        [$deptSql, $deptParams] = $this->billingSqlAndFormularioSinProtocoloEnDepto((int) $deptoId, (int) ($instCobradora ?? 0));
        $sql = "SELECT f.idformA as id, CONCAT(u.NombreA, ' ', u.ApellidoA) as solicitante,
                f.fechainicioA as fecha, f.fecRetiroA, e.EspeNombreA as nombre_especie,
                se.SubEspeNombreA as nombre_subespecie, tf.categoriaformulario as categoria,
                tf.nombreTipo as nombre_tipo, tf.exento, tf.descuento, ie.NombreInsumo,
                ie.CantidadInsumo, ie.TipoInsumo, s.totalA as cant_animal, s.organo as cant_organo,
                pf.precioformulario, pf.totalpago as pago_ani, pif.preciototal as total_ins, pif.totalpago as pago_ins, pf.precioanimalmomento, f.estado,
                {$dDeriv}
                FROM formularioe f
                LEFT JOIN protformr pf_link ON f.idformA = pf_link.idformA
                JOIN personae u ON f.IdUsrA = u.IdUsrA JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN precioformulario pf ON f.idformA = pf.idformA
                LEFT JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                LEFT JOIN formespe fe ON f.idformA = fe.idformA LEFT JOIN especiee e ON fe.idespA = e.idespA
                LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA
                WHERE f.estado = 'Entregado' AND pf_link.idformA IS NULL{$deptSql}";
        
        $params = $deptParams;
        if ($desde && $hasta) { $sql .= " AND f.fechainicioA BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['is_exento'] = ((int)$r['exento'] === 1);
            $totalForm = (float)$r['precioformulario'] + (float)$r['total_ins'];
            $pagadoTotal = (float)$r['pago_ani'] + (float)$r['pago_ins'];
            $pMomento = (float)$r['precioanimalmomento'];
            $esRea = (strpos(strtolower($r['categoria']), 'reactivo') !== false);
            $cantDiv = $esRea ? (float)$r['cant_organo'] : (float)$r['cant_animal'];

            if ($pMomento <= 0 && $cantDiv > 0) $pMomento = $totalForm / $cantDiv;

            $r['total'] = $totalForm; $r['p_unit'] = $pMomento; $r['pagado'] = $pagadoTotal;
            $r['debe'] = $r['is_exento'] ? 0 : max(0, $r['total'] - $r['pagado']);

            $cat = $r['categoria'] ?: ""; $nom = $r['nombre_tipo'] ?: "";
            $dcto = ($r['descuento'] > 0) ? " <small class='text-success'>(Dcto: {$r['descuento']}%)</small>" : "";

            if ($esRea) {
                 $r['cantidad_display'] = "<b>{$r['NombreInsumo']} {$r['CantidadInsumo']} {$r['TipoInsumo']} - {$r['cant_organo']} un</b>";
                 $r['detalle_display'] = (strpos(strtolower($cat), 'otros reactivos') !== false) 
                    ? "<b>$cat</b> - $nom$dcto" : "<b>Reactivo</b> : <b>{$r['NombreInsumo']}</b>$dcto";
            } else {
                 $r['cantidad_display'] = "{$r['cant_animal']} un.";
                 $r['detalle_display'] = ($cat === $nom) ? "<b>$cat</b>$dcto" : "<b>$cat</b> - $nom$dcto";
            }
            $r['taxonomia'] = ($r['nombre_especie'] ?? '-') . ($r['nombre_subespecie'] ? " : {$r['nombre_subespecie']}" : "");
            // Formato viejo (solo depto, sin protformr): no es liquidación por red / «formulario derivado» en contabilidad.
            $r['es_pedido_depto_sin_protocolo'] = 1;
            $r['derivado_por_id'] = null;
            $r['derivado_por_nombre'] = null;
            $r['derivado_desde_institucion'] = null;
        }
        return $rows;
    }

    public function getPedidosProtocolo($idProt, $desde = null, $hasta = null, $deptoId = null, $instCobradora = null) {
        $dDeriv = $this->billingSqlDerivacionCamposSelect('f.idformA');
        $sql = "SELECT f.idformA as id, CONCAT(u.NombreA, ' ', u.ApellidoA) as solicitante,
                f.fechainicioA as fecha, f.fecRetiroA, e.EspeNombreA as nombre_especie,
                se.SubEspeNombreA as nombre_subespecie, tf.categoriaformulario as categoria,
                tf.nombreTipo as nombre_tipo, tf.exento, tf.descuento, ie.NombreInsumo,
                ie.CantidadInsumo, ie.TipoInsumo, s.totalA as cant_animal, s.organo as cant_organo,
                pf.precioformulario, pf.totalpago as pago_ani, pif.preciototal as total_ins, pif.totalpago as pago_ins, pf.precioanimalmomento, f.estado,
                {$dDeriv}
                FROM formularioe f
                JOIN protformr pf_link ON f.idformA = pf_link.idformA
                JOIN personae u ON f.IdUsrA = u.IdUsrA JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN precioformulario pf ON f.idformA = pf.idformA
                LEFT JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                LEFT JOIN formespe fe ON f.idformA = fe.idformA LEFT JOIN especiee e ON fe.idespA = e.idespA
                LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA
                WHERE pf_link.idprotA = ? AND f.estado = 'Entregado'";
        
        $params = [$idProt];
        if ($deptoId !== null && (int) $deptoId > 0) {
            [$deptSql, $deptParams] = $this->billingSqlAndFormularioEnDepto((int) $deptoId, (int) ($instCobradora ?? 0));
            $sql .= $deptSql;
            array_push($params, ...$deptParams);
        }
        if ($desde && $hasta) { $sql .= " AND f.fechainicioA BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['is_exento'] = ((int)$r['exento'] === 1);
            $totalForm = (float)$r['precioformulario'] + (float)$r['total_ins'];
            $pagadoTotal = (float)$r['pago_ani'] + (float)$r['pago_ins'];
            $pMomento = (float)$r['precioanimalmomento'];
            $esRea = (strpos(strtolower($r['categoria']), 'reactivo') !== false);
            $cantDiv = $esRea ? (float)$r['cant_organo'] : (float)$r['cant_animal'];

            if ($pMomento <= 0 && $cantDiv > 0) $pMomento = $totalForm / $cantDiv;

            $r['total'] = $totalForm; $r['p_unit'] = $pMomento; $r['pagado'] = $pagadoTotal;
            $r['debe'] = $r['is_exento'] ? 0 : max(0, $r['total'] - $r['pagado']);

            $cat = $r['categoria'] ?: ""; $nom = $r['nombre_tipo'] ?: "";
            $dcto = ($r['descuento'] > 0) ? " <small class='text-success'>(Dcto: {$r['descuento']}%)</small>" : "";

            if ($esRea) {
                 $r['cantidad_display'] = "<b>{$r['NombreInsumo']} {$r['CantidadInsumo']} {$r['TipoInsumo']} - {$r['cant_organo']} un</b>";
                 $r['detalle_display'] = (strpos(strtolower($cat), 'otros reactivos') !== false) 
                    ? "<b>$cat</b> - $nom$dcto" : "<b>Reactivo</b> : <b>{$r['NombreInsumo']}</b>$dcto";
            } else {
                 $r['cantidad_display'] = "{$r['cant_animal']} un.";
                 $r['detalle_display'] = ($cat === $nom) ? "<b>$cat</b>$dcto" : "<b>$cat</b> - $nom$dcto";
            }
            $r['taxonomia'] = ($r['nombre_especie'] ?? '-') . ($r['nombre_subespecie'] ? " : {$r['nombre_subespecie']}" : "");
        }
        return $rows;
    }

    /**
     * Indica si el protocolo tiene al menos un formulario Entregado vinculado (protformr) en el rango de fechas.
     * Evita llamadas pesadas a getPedidosProtocolo cuando no hay filas.
     */
    public function protocolTienePedidosEntregadosEnRango(int $idProt, string $desde, string $hasta, $deptoId = null, $instCobradora = null): bool {
        $sql = "SELECT 1 FROM formularioe f
                INNER JOIN protformr pf_link ON f.idformA = pf_link.idformA
                WHERE pf_link.idprotA = ? AND f.estado = 'Entregado'
                  AND f.fechainicioA BETWEEN ? AND ?";
        $params = [$idProt, $desde, $hasta];
        if ($deptoId !== null && (int) $deptoId > 0) {
            [$deptSql, $deptParams] = $this->billingSqlAndFormularioEnDepto((int) $deptoId, (int) ($instCobradora ?? 0));
            $sql .= $deptSql;
            array_push($params, ...$deptParams);
        }
        $sql .= ' LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Indica si hay filas de alojamiento con historia y fechavisado en rango (mismo filtro base que getAlojamientosProtocolo).
     */
    public function protocolTieneAlojamientoVisadoEnRango(int $idProt, string $desde, string $hasta): bool {
        $sql = "SELECT 1 FROM alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                WHERE a.idprotA = ? AND a.historia IS NOT NULL
                  AND a.fechavisado BETWEEN ? AND ?
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idProt, $desde, $hasta]);
        return (bool) $stmt->fetchColumn();
    }

// 1. ALOJAMIENTOS: periodos facturables (excluye tramos en stand by: CantidadCaja = 0)
    public function getAlojamientosProtocolo($idProt, $desde = null, $hasta = null) {
        $sql = "SELECT a.IdAlojamiento, a.historia, a.fechavisado, a.hastafecha, a.finalizado,
                a.CantidadCaja, a.PrecioCajaMomento, a.cuentaapagar, a.totalpago,
                e.EspeNombreA as especie,
                COALESCE(ta.NombreTipoAlojamiento, 'Estructura') as caja
                FROM alojamiento a
                LEFT JOIN especiee e ON a.TipoAnimal = e.idespA
                LEFT JOIN tipoalojamiento ta ON a.IdTipoAlojamiento = ta.IdTipoAlojamiento
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                WHERE a.idprotA = ? AND a.historia IS NOT NULL";

        $params = [$idProt];
        if ($desde && $hasta) {
            $sql .= " AND a.fechavisado BETWEEN ? AND ?";
            array_push($params, $desde, $hasta);
        }
        $sql .= " ORDER BY a.historia ASC, a.fechavisado ASC, a.IdAlojamiento ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $all = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $byHist = [];
        foreach ($all as $row) {
            $h = (int) ($row['historia'] ?? 0);
            if ($h <= 0) {
                continue;
            }
            if (!isset($byHist[$h])) {
                $byHist[$h] = [];
            }
            $byHist[$h][] = $row;
        }

        $hoy = date('Y-m-d');
        $stmtT = $this->db->prepare("SELECT p.IdUsrA, CONCAT(u.ApellidoA, ', ', u.NombreA) as TitularProtocolo
                FROM protocoloexpe p LEFT JOIN personae u ON p.IdUsrA = u.IdUsrA
                WHERE p.idprotA = ? LIMIT 1");
        $stmtT->execute([(int) $idProt]);
        $trProt = $stmtT->fetch(\PDO::FETCH_ASSOC) ?: [];
        $idUsrTit = isset($trProt['IdUsrA']) ? (int) $trProt['IdUsrA'] : null;
        $titularProt = (string) ($trProt['TitularProtocolo'] ?? '');

        $stmtDeptProt = $this->db->prepare(
            'SELECT TRIM(COALESCE(dep.NombreDeptoA, \'\')) FROM protocoloexpe p
             LEFT JOIN departamentoe dep ON p.departamento = dep.iddeptoA
             WHERE p.idprotA = ? LIMIT 1'
        );
        $stmtDeptProt->execute([(int) $idProt]);
        $nombreDepartamentoProt = (string) ($stmtDeptProt->fetchColumn() ?: '');

        $out = [];
        foreach ($byHist as $historia => $rows) {
            $lastId = 0;
            $sumCuenta = 0.0;
            $sumPagado = 0.0;
            $sumCalc = 0.0;
            $especie = '';
            $caja = '';

            $payRanges = [];
            $n = count($rows);
            for ($i = 0; $i < $n; $i++) {
                $r = $rows[$i];
                $lastId = max($lastId, (int) ($r['IdAlojamiento'] ?? 0));
                $sumCuenta += (float) ($r['cuentaapagar'] ?? 0);
                $sumPagado = max($sumPagado, (float) ($r['totalpago'] ?? 0));

                if (!empty($r['especie'])) {
                    $especie = (string) $r['especie'];
                }
                if (!empty($r['caja'])) {
                    $caja = (string) $r['caja'];
                }

                $qty = (int) ($r['CantidadCaja'] ?? 0);
                $precio = (float) ($r['PrecioCajaMomento'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }

                $next = $rows[$i + 1] ?? null;
                if ($next !== null) {
                    $end = (string) ($next['fechavisado'] ?? '');
                } elseif ((int) ($r['finalizado'] ?? 0) === 1 && !empty($r['hastafecha'])) {
                    $end = (string) $r['hastafecha'];
                } else {
                    $end = $hoy;
                }
                $start = (string) ($r['fechavisado'] ?? '');
                if ($start === '' || $end === '') {
                    continue;
                }
                $tsS = strtotime($start);
                $tsE = strtotime($end);
                if ($tsS === false || $tsE === false) {
                    continue;
                }
                $dias = max(0, (int) floor(($tsE - $tsS) / 86400));
                $sumCalc += $dias * $precio * $qty;
                $payRanges[] = [
                    'desde' => $start,
                    'hasta' => $end,
                    'dias' => $dias,
                ];
            }

            $totalGuardado = $sumCuenta;
            $total = $totalGuardado > 0 ? $totalGuardado : $sumCalc;
            $pagado = $sumPagado;
            $debe = max(0, $total - $pagado);

            $diasPay = 0;
            foreach ($payRanges as $pr) {
                $diasPay += (int) ($pr['dias'] ?? 0);
            }

            $parts = [];
            foreach ($payRanges as $pr) {
                $d0 = date('d/m/Y', strtotime($pr['desde']));
                $d1 = date('d/m/Y', strtotime($pr['hasta']));
                $parts[] = $d0 . ' – ' . $d1;
            }
            $periodoTxt = $parts !== [] ? implode('; ', $parts) : '-';

            $fechaInicioRes = $payRanges !== [] ? (string) $payRanges[0]['desde'] : null;
            $fechaFinRes = $payRanges !== [] ? (string) $payRanges[count($payRanges) - 1]['hasta'] : null;

            $out[] = [
                'last_id' => $lastId,
                'historia' => $historia,
                'especie' => $especie !== '' ? $especie : '-',
                'caja' => $caja !== '' ? $caja : 'Estructura',
                'total' => $total,
                'pagado' => $pagado,
                'debe' => $debe,
                'dias' => $diasPay,
                'fecha_inicio' => $fechaInicioRes,
                'fecha_fin' => $fechaFinRes,
                'periodo' => $periodoTxt,
                'periodos_facturables' => $payRanges,
                'IdUsrA' => $idUsrTit,
                'TitularProtocolo' => $titularProt,
                'nombre_departamento' => $nombreDepartamentoProt,
            ];
        }

        return $out;
    }

// 2. INSUMOS POR DEPARTAMENTO: Matemática detallada en el texto
    public function getInsumosGenerales($deptoId, $desde, $hasta, $instCobradora = null) {
        $gDeriv = $this->billingSqlDerivacionCamposSelectGrouped('f.idformA');
        [$deptSql, $deptParams] = $this->billingSqlAndFormularioSinProtocoloEnDepto((int) $deptoId, (int) ($instCobradora ?? 0));
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante,
                {$gDeriv},
                MAX(d.SaldoDinero) as saldoInv,
                MAX(tf.categoriaformulario) AS categoria,
                MAX(f.fechainicioA) AS fecha,
                MAX(f.fecRetiroA) AS fecRetiroA,
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado, MAX(tf.exento) as exento
                FROM formularioe f JOIN personae u ON f.IdUsrA = u.IdUsrA
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion
                JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario
                JOIN insumo i ON fi.IdInsumo = i.idInsumo 
                WHERE f.estado = 'Entregado' AND f.fechainicioA BETWEEN ? AND ?{$deptSql} GROUP BY f.idformA";
        
        $params = array_merge([$desde, $hasta], $deptParams);
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['total_item'] = round((float) $r['total_item'], 2);
            $r['pagado'] = round((float) $r['pagado'], 2);
            $r['is_exento'] = ((int)($r['exento'] ?? 0) === 1);
            $r['debe'] = $r['is_exento'] ? 0.0 : max(0.0, round($r['total_item'] - $r['pagado'], 2));
        }
        return $rows;
    }

    /**
     * Insumos (pedidos de tipo insumo) vinculados al protocolo vía protformr.
     * Misma estructura que getInsumosGenerales para mostrar en facturación por protocolo.
     */
    public function getInsumosByProtocolo($idProt, $desde = null, $hasta = null) {
        $gDeriv = $this->billingSqlDerivacionCamposSelectGrouped('f.idformA');
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante,
                {$gDeriv},
                MAX(tf.categoriaformulario) AS categoria,
                MAX(f.fechainicioA) AS fecha,
                MAX(f.fecRetiroA) AS fecRetiroA,
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado, MAX(tf.exento) as exento
                FROM formularioe f
                JOIN protformr pf ON f.idformA = pf.idformA AND pf.idprotA = ?
                JOIN personae u ON f.IdUsrA = u.IdUsrA
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario
                JOIN insumo i ON fi.IdInsumo = i.idInsumo
                JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                WHERE f.estado = 'Entregado'
                  AND LOWER(COALESCE(tf.categoriaformulario, '')) LIKE '%insumo%'";
        $params = [$idProt];
        if ($desde && $hasta) { $sql .= " AND f.fechainicioA BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $sql .= " GROUP BY f.idformA";
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['total_item'] = round((float) $r['total_item'], 2);
            $r['pagado'] = round((float) $r['pagado'], 2);
            $r['is_exento'] = ((int)($r['exento'] ?? 0) === 1);
            $r['debe'] = $r['is_exento'] ? 0.0 : max(0.0, round($r['total_item'] - $r['pagado'], 2));
        }
        return $rows;
    }

    // ========================================================
    // LOGICA TRANSACCIONAL: ACTUALIZACIÓN DE SALDOS Y PAGOS
    // ========================================================

public function updateBalance($idUsr, $inst, $monto, $adminId, ?string $transferId = null, ?string $comment = null) {
        $check = $this->db->prepare("SELECT IdDinero FROM dinero WHERE IdUsrA = ? AND IdInstitucion = ?");
        $check->execute([$idUsr, $inst]);
        $exists = $check->fetch();

        if ($exists) {
            $sql = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
            $res = $this->db->prepare($sql)->execute([$monto, $idUsr, $inst]);
        } else {
            $sql = "INSERT INTO dinero (IdUsrA, IdInstitucion, SaldoDinero) VALUES (?, ?, ?)";
            $res = $this->db->prepare($sql)->execute([$idUsr, $inst, $monto]);
        }

        Auditoria::log($this->db, 'FINANCIERO', 'dinero', "Ajuste de Saldo: $$monto al usuario ID: $idUsr");
        
        $transferId = $transferId !== null ? trim($transferId) : null;
        $comment = $comment !== null ? trim($comment) : null;
        if ($transferId === '') $transferId = null;
        if ($comment === '') $comment = null;

        $hasTransfer = $this->hasColumn('historialpago', 'IdentificadorTransferencia');
        $hasComment = $this->hasColumn('historialpago', 'Comentario');
        $cols = "IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion";
        $vals = "?, ?, ?, 0, NOW(), 'CARGA_SALDO', ?";
        $params = [$adminId, $monto, $idUsr, $inst];
        if ($hasTransfer) {
            $cols .= ", IdentificadorTransferencia";
            $vals .= ", ?";
            $params[] = $transferId;
        }
        if ($hasComment) {
            $cols .= ", Comentario";
            $vals .= ", ?";
            $params[] = $comment;
        }
        $this->db->prepare("INSERT INTO historialpago ($cols) VALUES ($vals)")->execute($params);

        return $res;
    }

    /**
     * Inserta historialpago con NOW() y metadatos opcionales (columnas si existen).
     */
    private function insertHistorialPagoStandard(
        int $adminId,
        float $monto,
        int $idUsr,
        int $idFormA,
        int $inst,
        string $tipoHistorial,
        ?string $transferId = null,
        ?string $comment = null
    ): void {
        $transferId = $transferId !== null ? trim($transferId) : null;
        $comment = $comment !== null ? trim($comment) : null;
        if ($transferId === '') {
            $transferId = null;
        }
        if ($comment === '') {
            $comment = null;
        }
        $hasTransfer = $this->hasColumn('historialpago', 'IdentificadorTransferencia');
        $hasComment = $this->hasColumn('historialpago', 'Comentario');
        $cols = 'IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion';
        $vals = '?, ?, ?, ?, NOW(), ?, ?';
        $params = [$adminId, $monto, $idUsr, $idFormA, $tipoHistorial, $inst];
        if ($hasTransfer) {
            $cols .= ', IdentificadorTransferencia';
            $vals .= ', ?';
            $params[] = $transferId;
        }
        if ($hasComment) {
            $cols .= ', Comentario';
            $vals .= ', ?';
            $params[] = $comment;
        }
        $this->db->prepare("INSERT INTO historialpago ($cols) VALUES ($vals)")->execute($params);
    }

    /**
     * Historial para popup: movimientos de saldo (CARGA_SALDO) y pagos (otros tipos) separados.
     * scope: investigador | depto | protocolo
     */
    public function getSaldoHistorialSplit(int $instId, int $idUsr, ?string $from, ?string $to, string $scope = 'investigador', ?int $refId = null): array {
        $instId = (int) $instId;
        $idUsr = (int) $idUsr;
        $scope = strtolower(trim($scope));
        if (!in_array($scope, ['investigador', 'depto', 'protocolo'], true)) {
            $scope = 'investigador';
        }
        $refId = $refId !== null ? (int) $refId : null;

        $hasTransfer = $this->hasColumn('historialpago', 'IdentificadorTransferencia');
        $hasComment = $this->hasColumn('historialpago', 'Comentario');
        $selExtra = '';
        if ($hasTransfer) $selExtra .= ", h.IdentificadorTransferencia";
        else $selExtra .= ", NULL as IdentificadorTransferencia";
        if ($hasComment) $selExtra .= ", h.Comentario";
        else $selExtra .= ", NULL as Comentario";

        if ($from !== null && $from !== '') {
            $from = trim((string) $from);
            if ($from === '') {
                $from = null;
            }
        }
        if ($to !== null && $to !== '') {
            $to = trim((string) $to);
            if ($to === '') {
                $to = null;
            }
        }

        $dateWhere = '';
        $dateParams = [];
        if ($from !== null && $to !== null) {
            $dateWhere = ' AND h.fecha BETWEEN ? AND ? ';
            $dateParams = [$from, $to];
        } elseif ($from !== null) {
            $dateWhere = ' AND h.fecha >= ? ';
            $dateParams = [$from];
        } elseif ($to !== null) {
            $dateWhere = ' AND h.fecha <= ? ';
            $dateParams = [$to];
        }

        $paramsBase = array_merge([$instId, $idUsr], $dateParams);

        // Movimientos de saldo: solo CARGA_SALDO (suma/resta según signo de Monto)
        $sqlSaldo = "SELECT h.IdHistoPago, h.fecha, h.Monto, h.TipoHistorial,
                            CONCAT(a.NombreA, ' ', a.ApellidoA) as AdminCompleto
                            {$selExtra}
                     FROM historialpago h
                     LEFT JOIN personae a ON h.IdUsrAAdmin = a.IdUsrA
                     WHERE h.IdInstitucion = ? AND h.IdUsrA = ? AND h.TipoHistorial = 'CARGA_SALDO'
                     {$dateWhere}
                     ORDER BY h.fecha DESC, h.IdHistoPago DESC";
        $stmtS = $this->db->prepare($sqlSaldo);
        $stmtS->execute($paramsBase);
        $movSaldo = $stmtS->fetchAll(PDO::FETCH_ASSOC) ?: [];

        // Pagos: todo lo que NO sea CARGA_SALDO, filtrable por depto/protocolo
        $join = '';
        $whereExtra = '';
        $paramsPagos = array_merge([$instId, $idUsr], $dateParams);

        if ($scope === 'protocolo' && $refId && $refId > 0) {
            // h.IdFormA puede ser idformA (formularios/insumos) o historia (alojamientos)
            $join = "
                LEFT JOIN protformr pfr ON pfr.idformA = h.IdFormA AND pfr.idprotA = ?
                LEFT JOIN alojamiento alo ON alo.historia = h.IdFormA AND alo.idprotA = ? AND alo.IdInstitucion = h.IdInstitucion
            ";
            $whereExtra = " AND (pfr.idprotA IS NOT NULL OR alo.idprotA IS NOT NULL) ";
            $paramsPagos[] = $refId;
            $paramsPagos[] = $refId;
        } elseif ($scope === 'depto' && $refId && $refId > 0) {
            // Filtrar por id depto en formularioe.depto y por protdeptor (protocolo ↔ departamento).
            // protocoloexpe.departamento es texto legado; no debe compararse con iddeptoA numérico.
            // idformA es PK global en formularioe: no acoplar por IdInstitucion (derivados / cobro en otra sede).
            $join = '
                LEFT JOIN formularioe f ON f.idformA = h.IdFormA
            ';
            $whereExtra = " AND (
                (f.depto IS NOT NULL AND f.depto = ?)
                OR EXISTS (
                    SELECT 1 FROM protformr pfx
                    INNER JOIN protdeptor pdx ON pdx.idprotA = pfx.idprotA AND pdx.iddeptoA = ?
                    WHERE pfx.idformA = h.IdFormA
                )
                OR EXISTS (
                    SELECT 1 FROM alojamiento ax
                    INNER JOIN protdeptor pdx ON pdx.idprotA = ax.idprotA AND pdx.iddeptoA = ?
                    WHERE ax.historia = h.IdFormA AND ax.IdInstitucion = h.IdInstitucion
                )
            ) ";
            $paramsPagos[] = $refId;
            $paramsPagos[] = $refId;
            $paramsPagos[] = $refId;
        }

        $sqlPagos = "SELECT h.IdHistoPago, h.fecha, h.Monto, h.IdFormA, h.TipoHistorial,
                            CONCAT(a.NombreA, ' ', a.ApellidoA) as AdminCompleto
                            {$selExtra}
                     FROM historialpago h
                     LEFT JOIN personae a ON h.IdUsrAAdmin = a.IdUsrA
                     {$join}
                     WHERE h.IdInstitucion = ? AND h.IdUsrA = ? AND h.TipoHistorial <> 'CARGA_SALDO'
                     {$dateWhere}
                     {$whereExtra}
                     ORDER BY h.fecha DESC, h.IdHistoPago DESC";
        $stmtP = $this->db->prepare($sqlPagos);
        $stmtP->execute($paramsPagos);
        $pagos = $stmtP->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'movimientos_saldo' => $movSaldo,
            'pagos' => $pagos,
        ];
    }

    public function processPaymentTransaction($idUsr, $monto, $items, $inst, $adminId, ?string $transferId = null, ?string $comment = null) {
        $idUsr = (int) $idUsr;
        $inst = (int) $inst;
        $adminId = (int) $adminId;
        $monto = round((float) $monto, 2);
        if ($idUsr <= 0 || $inst <= 0 || $monto <= 0) {
            throw new \InvalidArgumentException('Datos de pago inválidos.');
        }
        if (!is_array($items) || count($items) === 0) {
            throw new \InvalidArgumentException('No hay ítems en el pago.');
        }
        $sumItems = 0.0;
        foreach ($items as $item) {
            $sumItems += round((float) ($item['monto_pago'] ?? 0), 2);
        }
        $sumItems = round($sumItems, 2);
        if (abs($sumItems - $monto) > 0.02) {
            throw new \RuntimeException('El total enviado no coincide con la suma de los ítems.');
        }
        try {
            $this->db->beginTransaction();

            $stmtLock = $this->db->prepare(
                'SELECT SaldoDinero FROM dinero WHERE IdUsrA = ? AND IdInstitucion = ? FOR UPDATE'
            );
            $stmtLock->execute([$idUsr, $inst]);
            $rowD = $stmtLock->fetch(PDO::FETCH_ASSOC);
            if (!$rowD) {
                throw new \RuntimeException(
                    'No hay billetera de saldo para este investigador en esta institución. Registre saldo antes de liquidar.'
                );
            }
            $saldoAct = round((float) ($rowD['SaldoDinero'] ?? 0), 2);
            if ($saldoAct + 1e-6 < $monto) {
                throw new \RuntimeException(
                    'Saldo insuficiente. Disponible: $' . number_format($saldoAct, 2, ',', '.')
                    . ' — requerido: $' . number_format($monto, 2, ',', '.') . '.'
                );
            }
            $stmtUp = $this->db->prepare(
                'UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ? AND SaldoDinero >= ?'
            );
            $stmtUp->execute([$monto, $idUsr, $inst, $monto]);
            if ($stmtUp->rowCount() !== 1) {
                throw new \RuntimeException('No se pudo debitar el saldo (concurrencia o saldo insuficiente).');
            }

            foreach ($items as $item) {
                $id = $item['id'];
                $monto_item = (float)$item['monto_pago'];

                if ($item['tipo'] === 'INSUMO_GRAL' || $item['tipo'] === 'FORM') {
                    $this->db->prepare("UPDATE precioinsumosformulario SET totalpago = totalpago + ? WHERE idformA = ?")->execute([$monto_item, $id]);
                    if ($item['tipo'] === 'FORM') {
                        $this->db->prepare("UPDATE precioformulario SET totalpago = totalpago + ? WHERE idformA = ?")->execute([$monto_item, $id]);
                    }

                    $this->insertHistorialPagoStandard(
                        $adminId,
                        $monto_item,
                        $idUsr,
                        (int) $id,
                        $inst,
                        'LIQUIDACION',
                        $transferId,
                        $comment
                    );

                } else if ($item['tipo'] === 'ALOJ') {
                    $this->db->prepare("UPDATE alojamiento SET totalpago = totalpago + ? WHERE historia = ?")->execute([$monto_item, $id]);

                    $this->insertHistorialPagoStandard(
                        $adminId,
                        $monto_item,
                        $idUsr,
                        (int) $id,
                        $inst,
                        'LIQUIDACION_ALOJ',
                        $transferId,
                        $comment
                    );
                }
            }

            Auditoria::log($this->db, 'PAGO_MASIVO', 'dinero', "Liquidación de $$monto por Usuario ID: $idUsr");
            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * JOINs SQL para enlazar pedido/e origen → protocolo y titular (cobro = titular protocolo, no sustitutos del derivado).
     */
    private function sqlFactDerivadaTitularCobroPieces(): array {
        $hasO = $this->hasColumn('formulario_derivacion', 'idformAOrigen');
        $originFormExpr = $hasO ? 'COALESCE(NULLIF(fd.idformAOrigen, 0), ffd.idformA)' : 'ffd.idformA';
        $idTitExpr = 'COALESCE(NULLIF(pe_o.IdUsrA, 0), NULLIF(fo.IdUsrA, 0), NULLIF(ffd.IdUsrSolicitante, 0))';
        $joins = '
            LEFT JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion
            LEFT JOIN formularioe fo ON fo.idformA = ' . $originFormExpr . '
            LEFT JOIN protformr pf_o ON pf_o.idformA = fo.idformA
            LEFT JOIN protocoloexpe pe_o ON pe_o.idprotA = pf_o.idprotA
            LEFT JOIN personae pt_c ON pt_c.IdUsrA = ' . $idTitExpr . '
        ';
        $selectTitular = '
            ' . $idTitExpr . ' AS IdUsrTitularCobro,
            TRIM(CONCAT(COALESCE(pt_c.ApellidoA, \'\'), \', \', COALESCE(pt_c.NombreA, \'\'))) AS nombreTitularProtocoloParaCobro
        ';
        return ['joins' => trim($joins), 'selectTitular' => trim(preg_replace('/\s+/', ' ', $selectTitular)), 'originFormExpr' => $originFormExpr];
    }

    /**
     * Facturación derivada (red): fila activa para el formulario visto desde la institución cobradora.
     */
    private function findFacturacionDerivadaForForm(int $idformA, int $instCobradora): ?array {
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            return null;
        }
        $p = $this->sqlFactDerivadaTitularCobroPieces();
        $sql = 'SELECT ffd.IdFacturacionFormularioDerivado, ffd.idformA, ffd.monto_total, ffd.monto_pagado, ffd.estado_cobro,
                       ffd.IdUsrSolicitante, ffd.IdInstitucionCobradora,
                       ' . $p['selectTitular'] . '
                FROM facturacion_formulario_derivado ffd
                ' . $p['joins'] . '
                WHERE ffd.idformA = ? AND ffd.IdInstitucionCobradora = ?
                ORDER BY ffd.IdFacturacionFormularioDerivado DESC
                LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA, $instCobradora]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);

        return $r ?: null;
    }

    private function idUsuarioCobroFromFactDerivadaRow(array $ffd): int {
        $t = isset($ffd['IdUsrTitularCobro']) ? (int)$ffd['IdUsrTitularCobro'] : 0;
        if ($t > 0) {
            return $t;
        }
        return (int)($ffd['IdUsrSolicitante'] ?? 0);
    }

    /**
     * Modal animal/reactivo: total, pagado y saldo según facturación derivada si aplica (misma sede que el admin).
     */
    private function mergeFacturacionDerivadaIntoAnimalReactiveRow(array &$row, int $instCobradora): void {
        $idf = (int)($row['idformA'] ?? 0);
        if ($idf <= 0) {
            return;
        }
        $ffd = $this->findFacturacionDerivadaForForm($idf, $instCobradora);
        if (!$ffd) {
            return;
        }
        $idUsr = $this->idUsuarioCobroFromFactDerivadaRow($ffd);
        $nomTit = trim((string) ($ffd['nombreTitularProtocoloParaCobro'] ?? ''));
        if ($nomTit !== '') {
            $row['titular_nombre'] = $nomTit;
        }
        $row['total_calculado'] = (float)$ffd['monto_total'];
        $row['totalpago'] = (float)$ffd['monto_pagado'];
        $row['saldoInv'] = $this->getSaldoByInvestigador($idUsr, $instCobradora);
        $row['es_facturacion_derivada'] = 1;
        $row['id_usr_protocolo'] = $idUsr;
    }

    private function mergeFacturacionDerivadaIntoInsumoRow(array &$r, int $instCobradora): void {
        $idf = (int)($r['id'] ?? 0);
        if ($idf <= 0) {
            return;
        }
        $ffd = $this->findFacturacionDerivadaForForm($idf, $instCobradora);
        if (!$ffd) {
            return;
        }
        $idUsr = $this->idUsuarioCobroFromFactDerivadaRow($ffd);
        $r['total_item'] = round((float) $ffd['monto_total'], 2);
        $r['pagado'] = round((float) $ffd['monto_pagado'], 2);
        $r['saldoInv'] = $this->getSaldoByInvestigador($idUsr, $instCobradora);
        $r['es_facturacion_derivada'] = 1;
        $r['id_usr_cobro_billetera'] = $idUsr;
        $exento = isset($r['is_exento']) && ($r['is_exento'] === true || $r['is_exento'] === 1 || $r['is_exento'] === '1');
        if (!$exento) {
            $exento = (int) ($r['exento'] ?? 0) === 1;
        }
        $r['debe'] = $exento ? 0.0 : max(0.0, round($r['total_item'] - $r['pagado'], 2));
    }

    /**
     * Por cada departamento de la institución cobradora, nombres de institución(es) de origen con
     * facturación derivada pendiente (para etiquetar el selector en facturación por depto/org).
     *
     * @return array<int, string> iddeptoA => "Inst A · Inst B"
     */
    public function getMapDeptoOrigenesDerivacionPendiente(int $instCobradora): array {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || !$this->tableExists('facturacion_formulario_derivado')
            || !$this->tableExists('formulario_derivacion')) {
            return [];
        }
        $deptoExpr = $this->hasDerivacionDeptoDestino()
            ? 'COALESCE(fd.depto_destino, p.departamento, f.depto)'
            : 'COALESCE(p.departamento, f.depto)';
        $sql = "
            SELECT DISTINCT
                {$deptoExpr} AS iddeptoA,
                TRIM(COALESCE(io.NombreInst, '')) AS origen_nombre
            FROM facturacion_formulario_derivado ffd
            INNER JOIN formularioe f ON f.idformA = ffd.idformA
            LEFT JOIN protformr pr ON pr.idformA = f.idformA
            LEFT JOIN protocoloexpe p ON p.idprotA = pr.idprotA
            INNER JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd.Activo = 1
            LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen
            WHERE ffd.IdInstitucionCobradora = ?
              AND (ffd.monto_total - COALESCE(ffd.monto_pagado, 0)) > 0.005
              AND {$deptoExpr} IS NOT NULL
              AND {$deptoExpr} > 0
              AND TRIM(COALESCE(io.NombreInst, '')) <> ''
            ORDER BY iddeptoA ASC, origen_nombre ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instCobradora]);
        $byDepto = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['iddeptoA'] ?? 0);
            $nom = trim((string) ($row['origen_nombre'] ?? ''));
            if ($id <= 0 || $nom === '') {
                continue;
            }
            if (!isset($byDepto[$id])) {
                $byDepto[$id] = [];
            }
            $byDepto[$id][$nom] = true;
        }
        $out = [];
        foreach ($byDepto as $id => $set) {
            $names = array_keys($set);
            sort($names, SORT_STRING);
            $out[$id] = implode(' · ', $names);
        }
        return $out;
    }

    /**
     * Departamentos con al menos un formulario entregado en la sede sin facturación derivada **pendiente**
     * (líneas que en liquidación se tratan como locales).
     *
     * @return array<int, int>
     */
    public function getIdsDeptosFacturacionLocalPendienteOEntregada(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            $sql = "
                SELECT DISTINCT COALESCE(p.departamento, f.depto) AS iddepto
                FROM formularioe f
                LEFT JOIN protformr pr ON pr.idformA = f.idformA
                LEFT JOIN protocoloexpe p ON p.idprotA = pr.idprotA
                WHERE f.IdInstitucion = ? AND f.estado = 'Entregado'
                  AND COALESCE(p.departamento, f.depto) IS NOT NULL AND COALESCE(p.departamento, f.depto) > 0
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idInstitucion]);
        } else {
            $sql = "
                SELECT DISTINCT COALESCE(p.departamento, f.depto) AS iddepto
                FROM formularioe f
                LEFT JOIN protformr pr ON pr.idformA = f.idformA
                LEFT JOIN protocoloexpe p ON p.idprotA = pr.idprotA
                WHERE f.IdInstitucion = ? AND f.estado = 'Entregado'
                  AND COALESCE(p.departamento, f.depto) IS NOT NULL AND COALESCE(p.departamento, f.depto) > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM facturacion_formulario_derivado x
                      WHERE x.idformA = f.idformA AND x.IdInstitucionCobradora = ?
                        AND (x.monto_total - COALESCE(x.monto_pagado, 0)) > 0.005
                  )
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idInstitucion, $idInstitucion]);
        }
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['iddepto'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * Investigadores con al menos un formulario entregado en la sede sin derivación **pendiente** (misma regla que deptos).
     *
     * @return array<int, int>
     */
    public function getIdsUsuariosFacturacionLocalPendienteOEntregada(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            $sql = "
                SELECT DISTINCT f.IdUsrA AS id
                FROM formularioe f
                WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.IdUsrA IS NOT NULL AND f.IdUsrA > 0
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idInstitucion]);
        } else {
            $sql = "
                SELECT DISTINCT f.IdUsrA AS id
                FROM formularioe f
                WHERE f.IdInstitucion = ? AND f.estado = 'Entregado' AND f.IdUsrA IS NOT NULL AND f.IdUsrA > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM facturacion_formulario_derivado x
                      WHERE x.idformA = f.idformA AND x.IdInstitucionCobradora = ?
                        AND (x.monto_total - COALESCE(x.monto_pagado, 0)) > 0.005
                  )
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idInstitucion, $idInstitucion]);
        }
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * Protocolos con al menos un formulario entregado vinculado sin derivación **pendiente** en esta sede.
     *
     * @return array<int, int>
     */
    public function getIdsProtocolosFacturacionLocalPendienteOEntregada(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            $sql = "
                SELECT DISTINCT p.idprotA AS id
                FROM protocoloexpe p
                INNER JOIN protformr pr ON p.idprotA = pr.idprotA
                INNER JOIN formularioe f ON pr.idformA = f.idformA
                WHERE p.IdInstitucion = ? AND f.estado = 'Entregado' AND p.idprotA IS NOT NULL AND p.idprotA > 0
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idInstitucion]);
        } else {
            $sql = "
                SELECT DISTINCT p.idprotA AS id
                FROM protocoloexpe p
                INNER JOIN protformr pr ON p.idprotA = pr.idprotA
                INNER JOIN formularioe f ON pr.idformA = f.idformA
                WHERE p.IdInstitucion = ? AND f.estado = 'Entregado' AND p.idprotA IS NOT NULL AND p.idprotA > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM facturacion_formulario_derivado x
                      WHERE x.idformA = f.idformA AND x.IdInstitucionCobradora = ?
                        AND (x.monto_total - COALESCE(x.monto_pagado, 0)) > 0.005
                  )
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$idInstitucion, $idInstitucion]);
        }
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * Investigadores con al menos un formulario en facturación derivada pendiente (misma sede cobradora).
     *
     * @return array<int, int> lista de IdUsrA
     */
    public function getIdsUsuariosDerivacionPendiente(int $instCobradora): array {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || !$this->tableExists('facturacion_formulario_derivado')
            || !$this->tableExists('formulario_derivacion')) {
            return [];
        }
        $sql = "
            SELECT DISTINCT x.IdUsrA AS id
            FROM (
                SELECT p.IdUsrA
                FROM facturacion_formulario_derivado ffd
                INNER JOIN formularioe f ON f.idformA = ffd.idformA
                INNER JOIN protformr pr ON pr.idformA = f.idformA
                INNER JOIN protocoloexpe p ON p.idprotA = pr.idprotA
                INNER JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd.Activo = 1
                WHERE ffd.IdInstitucionCobradora = ?
                  AND (ffd.monto_total - COALESCE(ffd.monto_pagado, 0)) > 0.005
                  AND p.IdUsrA IS NOT NULL AND p.IdUsrA > 0
                UNION
                SELECT f.IdUsrA
                FROM facturacion_formulario_derivado ffd
                INNER JOIN formularioe f ON f.idformA = ffd.idformA
                LEFT JOIN protformr pr ON pr.idformA = f.idformA
                INNER JOIN formulario_derivacion fd2 ON fd2.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd2.Activo = 1
                WHERE ffd.IdInstitucionCobradora = ?
                  AND (ffd.monto_total - COALESCE(ffd.monto_pagado, 0)) > 0.005
                  AND (pr.idprotA IS NULL OR pr.idprotA = 0)
                  AND f.IdUsrA IS NOT NULL AND f.IdUsrA > 0
            ) x
            ORDER BY x.IdUsrA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instCobradora, $instCobradora]);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return $out;
    }

    /**
     * Protocolos con al menos un formulario en facturación derivada pendiente (cobro en esta sede).
     *
     * @return array<int, int> lista de idprotA
     */
    public function getIdsProtocolosDerivacionPendiente(int $instCobradora): array {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || !$this->tableExists('facturacion_formulario_derivado')
            || !$this->tableExists('formulario_derivacion')) {
            return [];
        }
        $sql = "
            SELECT DISTINCT pr.idprotA AS id
            FROM facturacion_formulario_derivado ffd
            INNER JOIN formularioe f ON f.idformA = ffd.idformA
            INNER JOIN protformr pr ON pr.idformA = f.idformA
            INNER JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd.Activo = 1
            WHERE ffd.IdInstitucionCobradora = ?
              AND (ffd.monto_total - COALESCE(ffd.monto_pagado, 0)) > 0.005
              AND pr.idprotA IS NOT NULL AND pr.idprotA > 0
            ORDER BY pr.idprotA ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instCobradora]);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return $out;
    }

    /**
     * IdUsrA => nombres de institución(es) de origen con derivación pendiente (selector facturación por investigador).
     *
     * @return array<int, string>
     */
    public function getMapUsuarioOrigenesDerivacionPendiente(int $instCobradora): array {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || !$this->tableExists('facturacion_formulario_derivado')
            || !$this->tableExists('formulario_derivacion')) {
            return [];
        }
        $sql = "
            SELECT DISTINCT
                COALESCE(p.IdUsrA, f.IdUsrA) AS IdUsrA,
                TRIM(COALESCE(io.NombreInst, '')) AS origen_nombre
            FROM facturacion_formulario_derivado ffd
            INNER JOIN formularioe f ON f.idformA = ffd.idformA
            LEFT JOIN protformr pr ON pr.idformA = f.idformA
            LEFT JOIN protocoloexpe p ON p.idprotA = pr.idprotA
            INNER JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd.Activo = 1
            LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen
            WHERE ffd.IdInstitucionCobradora = ?
              AND (ffd.monto_total - COALESCE(ffd.monto_pagado, 0)) > 0.005
              AND TRIM(COALESCE(io.NombreInst, '')) <> ''
              AND COALESCE(p.IdUsrA, f.IdUsrA) IS NOT NULL AND COALESCE(p.IdUsrA, f.IdUsrA) > 0
            ORDER BY IdUsrA ASC, origen_nombre ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instCobradora]);
        $byUsr = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['IdUsrA'] ?? 0);
            $nom = trim((string) ($row['origen_nombre'] ?? ''));
            if ($id <= 0 || $nom === '') {
                continue;
            }
            if (!isset($byUsr[$id])) {
                $byUsr[$id] = [];
            }
            $byUsr[$id][$nom] = true;
        }
        $out = [];
        foreach ($byUsr as $id => $set) {
            $names = array_keys($set);
            sort($names, SORT_STRING);
            $out[$id] = implode(' · ', $names);
        }
        return $out;
    }

    /**
     * idprotA => nombres de institución(es) de origen con derivación pendiente (selector facturación por protocolo).
     *
     * @return array<int, string>
     */
    public function getMapProtocoloOrigenesDerivacionPendiente(int $instCobradora): array {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || !$this->tableExists('facturacion_formulario_derivado')
            || !$this->tableExists('formulario_derivacion')) {
            return [];
        }
        $sql = "
            SELECT DISTINCT
                pr.idprotA AS idprotA,
                TRIM(COALESCE(io.NombreInst, '')) AS origen_nombre
            FROM facturacion_formulario_derivado ffd
            INNER JOIN formularioe f ON f.idformA = ffd.idformA
            INNER JOIN protformr pr ON pr.idformA = f.idformA
            INNER JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd.Activo = 1
            LEFT JOIN institucion io ON io.IdInstitucion = fd.IdInstitucionOrigen
            WHERE ffd.IdInstitucionCobradora = ?
              AND (ffd.monto_total - COALESCE(ffd.monto_pagado, 0)) > 0.005
              AND pr.idprotA IS NOT NULL AND pr.idprotA > 0
              AND TRIM(COALESCE(io.NombreInst, '')) <> ''
            ORDER BY pr.idprotA ASC, origen_nombre ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instCobradora]);
        $byProt = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['idprotA'] ?? 0);
            $nom = trim((string) ($row['origen_nombre'] ?? ''));
            if ($id <= 0 || $nom === '') {
                continue;
            }
            if (!isset($byProt[$id])) {
                $byProt[$id] = [];
            }
            $byProt[$id][$nom] = true;
        }
        $out = [];
        foreach ($byProt as $id => $set) {
            $names = array_keys($set);
            sort($names, SORT_STRING);
            $out[$id] = implode(' · ', $names);
        }
        return $out;
    }

    /**
     * Departamentos con al menos un formulario entregado en la sede (base selector liquidación).
     *
     * @return array<int, int>
     */
    public function getIdsDeptosConFormularioEntregadoEnInstitucion(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        $sql = "
            SELECT DISTINCT COALESCE(p.departamento, f.depto) AS iddepto
            FROM formularioe f
            LEFT JOIN protformr pr ON pr.idformA = f.idformA
            LEFT JOIN protocoloexpe p ON p.idprotA = pr.idprotA
            WHERE f.IdInstitucion = ? AND f.estado = 'Entregado'
              AND COALESCE(p.departamento, f.depto) IS NOT NULL AND COALESCE(p.departamento, f.depto) > 0
        ";
        if ($this->hasDerivacionDeptoDestino()) {
            $sql .= "
            UNION
            SELECT DISTINCT fd.depto_destino AS iddepto
            FROM formulario_derivacion fd
            INNER JOIN formularioe f ON f.idformA = fd.idformA
            WHERE fd.Activo = 1 AND fd.IdInstitucionDestino = ?
              AND f.estado = 'Entregado'
              AND fd.depto_destino IS NOT NULL AND fd.depto_destino > 0
            ";
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($this->hasDerivacionDeptoDestino() ? [$idInstitucion, $idInstitucion] : [$idInstitucion]);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['iddepto'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * Usuarios con al menos un formulario entregado o actividad equivalente al selector de investigadores.
     *
     * @return array<int, int>
     */
    public function getIdsUsuariosConFormularioEntregadoEnInstitucion(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        $sql = "
            SELECT DISTINCT x.id FROM (
                SELECT p.IdUsrA AS id
                FROM protocoloexpe p
                INNER JOIN protformr pf ON p.idprotA = pf.idprotA
                INNER JOIN formularioe f ON pf.idformA = f.idformA
                WHERE f.estado = 'Entregado' AND p.IdInstitucion = ?
                  AND p.IdUsrA IS NOT NULL AND p.IdUsrA > 0
                UNION
                SELECT p.IdUsrA AS id
                FROM protocoloexpe p
                INNER JOIN alojamiento a ON p.idprotA = a.idprotA
                WHERE p.IdInstitucion = ?
                  AND p.IdUsrA IS NOT NULL AND p.IdUsrA > 0
                UNION
                SELECT f.IdUsrA AS id
                FROM formularioe f
                WHERE f.estado = 'Entregado' AND f.IdInstitucion = ?
                  AND f.tipoA IN (SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario LIKE '%insumo%')
                  AND f.IdUsrA IS NOT NULL AND f.IdUsrA > 0
            ) x
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idInstitucion, $idInstitucion, $idInstitucion]);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * Protocolos con al menos un formulario entregado en la sede.
     *
     * @return array<int, int>
     */
    public function getIdsProtocolosConFormularioEntregadoEnInstitucion(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        $sql = "
            SELECT DISTINCT p.idprotA AS id
            FROM protocoloexpe p
            INNER JOIN protformr pf ON p.idprotA = pf.idprotA
            INNER JOIN formularioe f ON pf.idformA = f.idformA
            WHERE p.IdInstitucion = ? AND f.estado = 'Entregado'
              AND p.idprotA IS NOT NULL AND p.idprotA > 0
        ";
        if ($this->tableExists('formulario_derivacion')) {
            $sql .= "
            UNION
            SELECT DISTINCT p.idprotA AS id
            FROM formulario_derivacion fd
            INNER JOIN formularioe f ON f.idformA = fd.idformA
            INNER JOIN protformr pf ON pf.idformA = f.idformA
            INNER JOIN protocoloexpe p ON p.idprotA = pf.idprotA
            WHERE fd.Activo = 1 AND fd.IdInstitucionDestino = ?
              AND f.estado = 'Entregado'
              AND p.idprotA IS NOT NULL AND p.idprotA > 0
            ";
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($this->tableExists('formulario_derivacion') ? [$idInstitucion, $idInstitucion] : [$idInstitucion]);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * IdUsrA => 1 si tiene al menos un protocolo en la sede cuyo departamento/organismo es externo.
     *
     * @return array<int, int>
     */
    public function getMapInvestigadorProtocoloAmbitoExterno(int $idInstitucion): array {
        $idInstitucion = (int) $idInstitucion;
        if ($idInstitucion <= 0) {
            return [];
        }
        $sql = "
            SELECT p.IdUsrA,
                MAX(CASE WHEN (de.externodepto = 2 OR COALESCE(org.externoorganismo, 0) = 2) THEN 1 ELSE 0 END) AS es_ext
            FROM protocoloexpe p
            INNER JOIN departamentoe de ON p.departamento = de.iddeptoA
            LEFT JOIN organismoe org ON de.organismopertenece = org.IdOrganismo
            WHERE p.IdInstitucion = ?
              AND p.IdUsrA IS NOT NULL AND p.IdUsrA > 0
            GROUP BY p.IdUsrA
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idInstitucion]);
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int) ($row['IdUsrA'] ?? 0);
            if ($id > 0) {
                $out[$id] = (int) ($row['es_ext'] ?? 0);
            }
        }
        return $out;
    }

    /**
     * Ajusta totales/pagado/debe de filas de insumos cuando existe facturación derivada (misma sede cobradora).
     */
    public function applyFacturacionDerivadaToInsumoRows(array &$rows, int $instCobradora): void {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || $rows === []) {
            return;
        }
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            return;
        }
        foreach ($rows as &$r) {
            $idf = (int) ($r['id'] ?? 0);
            if ($idf <= 0) {
                continue;
            }
            if ($this->findFacturacionDerivadaForForm($idf, $instCobradora)) {
                $this->mergeFacturacionDerivadaIntoInsumoRow($r, $instCobradora);
            } else {
                $this->mergeFacturacionDerivadaSalienteIntoInsumoRow($r, $instCobradora);
            }
        }
        unset($r);
    }

    /**
     * Filas de getPedidosProtocolo / getPedidosDeptoSinProtocolo: alinea total/pagado/debe con facturacion_formulario_derivado
     * cuando la sede cobradora liquida por RED (misma regla que insumos y modal animal/reactivo).
     */
    /**
     * Derivación saliente: el pedido se liquida en otra sede (institución cobradora distinta de la que ve el informe).
     */
    private function findFacturacionDerivadaSalienteForForm(int $idformA, int $instViewer): ?array {
        $idformA = (int) $idformA;
        $instViewer = (int) $instViewer;
        if ($idformA <= 0 || $instViewer <= 0 || !$this->tableExists('facturacion_formulario_derivado')
            || !$this->tableExists('formulario_derivacion')) {
            return null;
        }
        $sql = 'SELECT ffd.IdFacturacionFormularioDerivado, ffd.IdInstitucionCobradora,
                       COALESCE(ic.NombreInst, CONCAT(\'Institución #\', ffd.IdInstitucionCobradora)) AS institucion_cobradora_nombre
                FROM facturacion_formulario_derivado ffd
                INNER JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion AND fd.Activo = 1
                LEFT JOIN institucion ic ON ic.IdInstitucion = ffd.IdInstitucionCobradora
                WHERE ffd.idformA = ?
                  AND ffd.IdInstitucionCobradora <> ?
                  AND fd.IdInstitucionOrigen = ?
                ORDER BY ffd.IdFacturacionFormularioDerivado DESC
                LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA, $instViewer, $instViewer]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * En sede origen: el pedido derivado no suma deuda local; se muestra informativo (exento / liquida en destino).
     */
    private function mergeFacturacionDerivadaSalienteIntoPedidoFacturacionRow(array &$r, int $instViewer): void {
        if (!empty($r['es_pedido_depto_sin_protocolo'])) {
            return;
        }
        $idf = (int) ($r['id'] ?? 0);
        if ($idf <= 0) {
            return;
        }
        $sal = $this->findFacturacionDerivadaSalienteForForm($idf, $instViewer);
        if (!$sal) {
            return;
        }
        $r['total'] = 0.0;
        $r['pagado'] = 0.0;
        $r['debe'] = 0.0;
        $r['precioformulario'] = 0.0;
        $r['total_ins'] = 0.0;
        $r['pago_ani'] = 0.0;
        $r['pago_ins'] = 0.0;
        $r['is_exento'] = true;
        $r['exento'] = 1;
        $r['es_facturacion_derivada'] = 0;
        $r['es_facturacion_derivada_saliente'] = 1;
        $r['derivacion_liquida_en_institucion'] = trim((string) ($sal['institucion_cobradora_nombre'] ?? ''));
    }

    private function mergeFacturacionDerivadaSalienteIntoInsumoRow(array &$r, int $instViewer): void {
        $idf = (int) ($r['id'] ?? 0);
        if ($idf <= 0) {
            return;
        }
        $sal = $this->findFacturacionDerivadaSalienteForForm($idf, $instViewer);
        if (!$sal) {
            return;
        }
        $r['total_item'] = 0.0;
        $r['pagado'] = 0.0;
        $r['debe'] = 0.0;
        $r['is_exento'] = true;
        $r['exento'] = 1;
        $r['es_facturacion_derivada'] = 0;
        $r['es_facturacion_derivada_saliente'] = 1;
        $r['derivacion_liquida_en_institucion'] = trim((string) ($sal['institucion_cobradora_nombre'] ?? ''));
    }

    private function mergeFacturacionDerivadaIntoPedidoFacturacionRow(array &$r, int $instCobradora): void {
        if (!empty($r['es_pedido_depto_sin_protocolo'])) {
            return;
        }
        $idf = (int) ($r['id'] ?? 0);
        if ($idf <= 0) {
            return;
        }
        $ffd = $this->findFacturacionDerivadaForForm($idf, $instCobradora);
        if (!$ffd) {
            $this->mergeFacturacionDerivadaSalienteIntoPedidoFacturacionRow($r, $instCobradora);
            return;
        }
        $mt = round((float) ($ffd['monto_total'] ?? 0), 2);
        $mp = round((float) ($ffd['monto_pagado'] ?? 0), 2);
        $exento = isset($r['is_exento']) && ($r['is_exento'] === true || $r['is_exento'] === 1 || $r['is_exento'] === '1');
        if (!$exento) {
            $exento = (int) ($r['exento'] ?? 0) === 1;
        }
        $r['precioformulario'] = $mt;
        $r['total_ins'] = 0.0;
        $r['pago_ani'] = $mp;
        $r['pago_ins'] = 0.0;
        $r['total'] = $mt;
        $r['pagado'] = $mp;
        $r['debe'] = $exento ? 0.0 : max(0.0, round($mt - $mp, 2));
        $r['es_facturacion_derivada'] = 1;
        $idUsr = $this->idUsuarioCobroFromFactDerivadaRow($ffd);
        if ($idUsr > 0) {
            $r['id_usr_cobro_billetera'] = $idUsr;
        }
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function applyFacturacionDerivadaToPedidoFacturacionRows(array &$rows, int $instCobradora): void {
        $instCobradora = (int) $instCobradora;
        if ($instCobradora <= 0 || $rows === []) {
            return;
        }
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            return;
        }
        foreach ($rows as &$r) {
            $this->mergeFacturacionDerivadaIntoPedidoFacturacionRow($r, $instCobradora);
        }
        unset($r);
    }

    /**
     * PAGAR/QUITAR desde modal cuando el cobro es por facturacion_formulario_derivado.
     */
    public function procesarAjustePagoDerivada(int $idformA, float $monto, $accion, int $instCobradora, int $adminId): bool {
        $monto = round((float)$monto, 2);
        if ($monto <= 0) {
            throw new \InvalidArgumentException('Monto inválido.');
        }
        $ffd = $this->findFacturacionDerivadaForForm($idformA, $instCobradora);
        if (!$ffd) {
            throw new \RuntimeException('No hay facturación derivada para este formulario en su institución.');
        }
        $idUsr = $this->idUsuarioCobroFromFactDerivadaRow($ffd);
        if ($idUsr <= 0) {
            throw new \RuntimeException('No se puede registrar el cobro: falta titular de protocolo o investigador original asociado al pedido.');
        }
        $idFact = (int)$ffd['IdFacturacionFormularioDerivado'];
        $total = round((float)$ffd['monto_total'], 2);
        $pagado = round((float)$ffd['monto_pagado'], 2);
        $debe = max(0, $total - $pagado);

        $this->db->beginTransaction();
        try {
            if ($accion === 'PAGAR') {
                if ($monto - $debe > 0.009) {
                    throw new \RuntimeException('El monto supera la deuda pendiente en esta facturación derivada.');
                }
                $stmtUp = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ? AND SaldoDinero >= ?'
                );
                $stmtUp->execute([$monto, $idUsr, $instCobradora, $monto]);
                if ($stmtUp->rowCount() !== 1) {
                    throw new \RuntimeException('Saldo insuficiente en la billetera del investigador en esta institución.');
                }
                $nuevoPagado = round($pagado + $monto, 2);
                $estadoCobro = ($nuevoPagado >= $total - 0.009) ? 3 : (($nuevoPagado > 0) ? 2 : 1);
                $tipoHist = 'PAGO_INDIVIDUAL_DERIV';
            } elseif ($accion === 'QUITAR') {
                if ($monto - $pagado > 0.009) {
                    throw new \RuntimeException('No se puede quitar más de lo registrado como pagado en esta facturación derivada.');
                }
                $stmtUp = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?'
                );
                $stmtUp->execute([$monto, $idUsr, $instCobradora]);
                if ($stmtUp->rowCount() === 0) {
                    $this->db->prepare('INSERT INTO dinero (IdUsrA, IdInstitucion, SaldoDinero) VALUES (?, ?, ?)')
                        ->execute([$idUsr, $instCobradora, $monto]);
                }
                $nuevoPagado = round(max(0, $pagado - $monto), 2);
                $estadoCobro = ($nuevoPagado <= 0.009) ? 1 : (($nuevoPagado >= $total - 0.009) ? 3 : 2);
                $tipoHist = 'DEVOLUCION_DERIV';
            } else {
                throw new \InvalidArgumentException('Acción no válida.');
            }

            $this->db->prepare(
                'UPDATE facturacion_formulario_derivado SET monto_pagado = ?, estado_cobro = ? WHERE IdFacturacionFormularioDerivado = ?'
            )->execute([$nuevoPagado, $estadoCobro, $idFact]);

            $this->db->prepare(
                "INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion)
                 VALUES (?, ?, ?, ?, NOW(), ?, ?)"
            )->execute([$adminId, $monto, $idUsr, $idformA, $tipoHist, $instCobradora]);

            Auditoria::log($this->db, $tipoHist, 'facturacion_formulario_derivado', "Ajuste modal $accion derivado #$idformA: $monto");
            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function procesarAjustePago($id, $monto, $accion, $adminId, $instId = null) {
        $monto = round((float) $monto, 2);
        if ($monto <= 0) {
            throw new \InvalidArgumentException('Monto inválido.');
        }
        if ($instId !== null && $this->tableExists('facturacion_formulario_derivado')) {
            $ffd = $this->findFacturacionDerivadaForForm((int) $id, (int) $instId);
            if ($ffd) {
                return $this->procesarAjustePagoDerivada((int) $id, $monto, $accion, (int) $instId, (int) $adminId);
            }
        }
        try {
            $this->db->beginTransaction();
            $sql = 'SELECT f.IdUsrA, f.IdInstitucion FROM formularioe f WHERE f.idformA = ?';
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id]);
            $data = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$data) {
                throw new \RuntimeException('Formulario no encontrado.');
            }

            if ($accion === 'PAGAR') {
                $sqlPago = 'UPDATE precioformulario SET totalpago = totalpago + ? WHERE idformA = ?';
                $tipoHist = 'PAGO_INDIVIDUAL';
            } elseif ($accion === 'QUITAR') {
                $sqlPago = 'UPDATE precioformulario SET totalpago = totalpago - ? WHERE idformA = ?';
                $tipoHist = 'DEVOLUCION';
            } else {
                throw new \InvalidArgumentException('Acción no válida.');
            }

            $this->db->prepare($sqlPago)->execute([$monto, $id]);

            if ($accion === 'PAGAR') {
                $stmtS = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ? AND SaldoDinero >= ?'
                );
                $stmtS->execute([$monto, $data['IdUsrA'], $data['IdInstitucion'], $monto]);
                if ($stmtS->rowCount() !== 1) {
                    $chk = $this->db->prepare('SELECT 1 FROM dinero WHERE IdUsrA = ? AND IdInstitucion = ?');
                    $chk->execute([$data['IdUsrA'], $data['IdInstitucion']]);
                    if (!$chk->fetch()) {
                        throw new \RuntimeException(
                            'No hay billetera de saldo para el titular del formulario en esa institución.'
                        );
                    }
                    throw new \RuntimeException('Saldo insuficiente en la billetera para registrar este pago.');
                }
            } else {
                $stmtS = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?'
                );
                $stmtS->execute([$monto, $data['IdUsrA'], $data['IdInstitucion']]);
                if ($stmtS->rowCount() === 0) {
                    $this->db->prepare('INSERT INTO dinero (IdUsrA, IdInstitucion, SaldoDinero) VALUES (?, ?, ?)')
                        ->execute([$data['IdUsrA'], $data['IdInstitucion'], $monto]);
                }
            }

            Auditoria::log($this->db, $tipoHist, 'precioformulario', "Ajuste $accion de $$monto en Formulario #$id");

            $this->db->prepare(
                'INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion)
                                VALUES (?, ?, ?, ?, NOW(), ?, ?)'
            )->execute([$adminId, $monto, $data['IdUsrA'], $id, $tipoHist, $data['IdInstitucion']]);

            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Ajuste de pago insumos generales (precioinsumosformulario) o facturación derivada si aplica.
     */
    public function procesarAjustePagoInsumo($idformA, $monto, $accion, $adminId, $instId = null) {
        $monto = round((float)$monto, 2);
        if ($monto <= 0) {
            return false;
        }
        if ($instId !== null && $this->tableExists('facturacion_formulario_derivado')) {
            $ffd = $this->findFacturacionDerivadaForForm((int)$idformA, (int)$instId);
            if ($ffd) {
                return $this->procesarAjustePagoDerivada((int)$idformA, $monto, $accion, (int)$instId, (int)$adminId);
            }
        }
        try {
            $this->db->beginTransaction();
            $stmt = $this->db->prepare("SELECT f.IdUsrA, f.IdInstitucion FROM formularioe f WHERE f.idformA = ?");
            $stmt->execute([(int)$idformA]);
            $data = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$data) {
                throw new \RuntimeException('Formulario no encontrado.');
            }

            if ($accion === 'PAGAR') {
                $this->db->prepare('UPDATE precioinsumosformulario SET totalpago = totalpago + ? WHERE idformA = ?')->execute([$monto, (int)$idformA]);
                $stmtS = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ? AND SaldoDinero >= ?'
                );
                $stmtS->execute([$monto, $data['IdUsrA'], $data['IdInstitucion'], $monto]);
                if ($stmtS->rowCount() !== 1) {
                    throw new \RuntimeException('Saldo insuficiente en la billetera.');
                }
                $tipoHist = 'PAGO_INS_INDIV';
            } elseif ($accion === 'QUITAR') {
                $this->db->prepare('UPDATE precioinsumosformulario SET totalpago = totalpago - ? WHERE idformA = ?')->execute([$monto, (int)$idformA]);
                $stmtS = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?'
                );
                $stmtS->execute([$monto, $data['IdUsrA'], $data['IdInstitucion']]);
                if ($stmtS->rowCount() === 0) {
                    $this->db->prepare('INSERT INTO dinero (IdUsrA, IdInstitucion, SaldoDinero) VALUES (?, ?, ?)')
                        ->execute([$data['IdUsrA'], $data['IdInstitucion'], $monto]);
                }
                $tipoHist = 'DEVOLUCION_INS_INDIV';
            } else {
                throw new \InvalidArgumentException('Acción no válida.');
            }

            $this->db->prepare(
                "INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion)
                 VALUES (?, ?, ?, ?, NOW(), ?, ?)"
            )->execute([$adminId, $monto, $data['IdUsrA'], (int)$idformA, $tipoHist, $data['IdInstitucion']]);

            Auditoria::log($this->db, $tipoHist, 'precioinsumosformulario', "Ajuste insumo $accion form #$idformA: $monto");
            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }


public function procesarAjustePagoAloj($historiaId, $monto, $accion, $adminId) {
        try {
            $this->db->beginTransaction();
            
            // CORRECCIÓN CRÍTICA: Traemos el IdTitular del protocolo, no el IdUsrA del alojamiento (que es el técnico)
            $sqlInfo = "SELECT a.IdInstitucion, p.IdUsrA as IdTitular 
                        FROM alojamiento a 
                        INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA 
                        WHERE a.historia = ? LIMIT 1";
            $stmtInfo = $this->db->prepare($sqlInfo); $stmtInfo->execute([$historiaId]);
            $data = $stmtInfo->fetch(\PDO::FETCH_ASSOC);

            if (!$data) throw new \Exception("Historia no encontrada");
            
            $idPagador = $data['IdTitular'];

            if ($accion === 'PAGAR') {
                $sqlAloj = "UPDATE alojamiento SET totalpago = totalpago + ? WHERE historia = ?";
                $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ?";
                $tipoHist = "PAGO_ALOJ";
            } else {
                $sqlAloj = "UPDATE alojamiento SET totalpago = totalpago - ? WHERE historia = ?";
                $sqlSaldo = "UPDATE dinero SET SaldoDinero = SaldoDinero + ? WHERE IdUsrA = ? AND IdInstitucion = ?";
                $tipoHist = "DEVOLUCION_ALOJ";
            }

            $this->db->prepare($sqlAloj)->execute([$monto, $historiaId]);
            $this->db->prepare($sqlSaldo)->execute([$monto, $idPagador, $data['IdInstitucion']]);

            Auditoria::log($this->db, $tipoHist, 'alojamiento', "Ajuste $accion de $$monto en Historia #$historiaId");

            $this->db->prepare("INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion) 
                                VALUES (?, ?, ?, ?, NOW(), ?, ?)")
                     ->execute([$adminId, $monto, $idPagador, $historiaId, $tipoHist, $data['IdInstitucion']]);

            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); return false; }
    }

    // ... [TODO EL RESTO DEL BLOQUE DE GETTERS SIGUE IGUAL] ...
    public function getSaldosPorInstitucion($instId) {
        $sql = "SELECT IdUsrA, SaldoDinero FROM dinero WHERE IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    /**
     * Lista organizaciones de la institución con sus departamentos (para facturación por organización).
     * Incluye fila "(Sin organización)" para departamentos con organismopertenece IS NULL.
     */
    public function getOrganizacionesConDeptos($instId) {
        $out = [];
        $stmtOrg = $this->db->prepare("SELECT IdOrganismo, NombreOrganismoSimple FROM organismoe WHERE IdInstitucion = ? ORDER BY NombreOrganismoSimple ASC");
        $stmtOrg->execute([$instId]);
        $orgs = $stmtOrg->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($orgs as $o) {
            $stmtD = $this->db->prepare("SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ? AND organismopertenece = ? ORDER BY NombreDeptoA ASC");
            $stmtD->execute([$instId, $o['IdOrganismo']]);
            $deptos = $stmtD->fetchAll(\PDO::FETCH_ASSOC);
            $out[] = [
                'idOrganismo'   => (int)$o['IdOrganismo'],
                'nombre'        => $o['NombreOrganismoSimple'],
                'departamentos' => $deptos
            ];
        }

        $stmtNull = $this->db->prepare("SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ? AND (organismopertenece IS NULL OR organismopertenece = 0) ORDER BY NombreDeptoA ASC");
        $stmtNull->execute([$instId]);
        $deptosSinOrg = $stmtNull->fetchAll(\PDO::FETCH_ASSOC);
        if (!empty($deptosSinOrg)) {
            $out[] = [
                'idOrganismo'   => null,
                'nombre'        => '(Sin organización)',
                'departamentos' => $deptosSinOrg
            ];
        }

        return $out;
    }

    public function getAnimalDetailById($id, $instCobradora = null) {
        $sql = "SELECT f.idformA, p.idprotA as id_protocolo, p.IdUsrA as id_usr_protocolo, f.tipoA as id_tipo_form, tf.nombreTipo as nombre_tipo, CONCAT(p.nprotA, ' - ', p.tituloA) as protocolo_info, CONCAT(e.EspeNombreA, ' : ', COALESCE(se.SubEspeNombreA, 'N/A')) as taxonomia, f.edadA as edad, f.pesoa as peso, tf.exento as is_exento, COALESCE(s.machoA, 0) as machos, COALESCE(s.hembraA, 0) as hembras, COALESCE(s.indistintoA, 0) as indistintos, COALESCE(s.totalA, 0) as cantidad, f.fechainicioA as fecha_inicio, f.fecRetiroA as fecha_fin, f.aclaraA as aclaracion_usuario, COALESCE(f.aclaracionadm, 'No hay aclaraciones del administrador.') as nota_admin, COALESCE(pf.precioanimalmomento, 0) as precio_unitario, COALESCE(pf.precioformulario, 0) as total_calculado, COALESCE(pf.totalpago, 0) as totalpago, COALESCE(tf.descuento, 0) as descuento, COALESCE(d.SaldoDinero, 0) as saldoInv, CONCAT(u_tit.ApellidoA, ', ', u_tit.NombreA) as titular_nombre, CONCAT(u_sol.ApellidoA, ', ', u_sol.NombreA) as solicitante FROM formularioe f INNER JOIN personae u_sol ON f.IdUsrA = u_sol.IdUsrA LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario LEFT JOIN protformr rf ON f.idformA = rf.idformA LEFT JOIN protocoloexpe p ON rf.idprotA = p.idprotA LEFT JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA LEFT JOIN precioformulario pf ON f.idformA = pf.idformA LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN formespe fe ON f.idformA = fe.idformA LEFT JOIN especiee e ON fe.idespA = e.idespA LEFT JOIN subespecie se ON f.idsubespA = se.idsubespA LEFT JOIN dinero d ON p.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion WHERE f.idformA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($row && $instCobradora) {
            $this->mergeFacturacionDerivadaIntoAnimalReactiveRow($row, (int)$instCobradora);
        }

        return $row;
    }

    public function getReactiveDetailById($id, $instCobradora = null) {
        $cxc = $this->protocoloCirugiaColumnName();
        $sqlProtCir = $cxc
            ? ", COALESCE(p.`{$cxc}`, 0) AS protocolo_con_cirugia"
            : ', NULL AS protocolo_con_cirugia';
        $sql = "SELECT f.idformA, p.idprotA as id_protocolo, p.IdUsrA as id_usr_protocolo, f.tipoA as id_tipo_form, tf.nombreTipo as nombre_tipo, CONCAT(p.nprotA, ' - ', p.tituloA) as protocolo_info, ie.NombreInsumo as nombre_reactivo, ie.CantidadInsumo as presentacion_reactivo, ie.TipoInsumo as unidad_medida, COALESCE(s.organo, 0) as cantidad_organos, COALESCE(s.totalA, 0) as cantidad_animales_vinculados, f.fechainicioA as fecha_inicio, f.fecRetiroA as fecha_fin, COALESCE(f.aclaracionadm, 'No hay aclaraciones del administrador.') as nota_admin, COALESCE(pif.precioformulario, 0) as total_calculado, COALESCE(pif.totalpago, 0) as totalpago, COALESCE(tf.descuento, 0) as descuento, tf.exento as is_exento, COALESCE(d.SaldoDinero, 0) as saldoInv, CONCAT(u_tit.ApellidoA, ', ', u_tit.NombreA) as titular_nombre, CONCAT(u_sol.ApellidoA, ', ', u_sol.NombreA) as solicitante{$sqlProtCir} FROM formularioe f INNER JOIN personae u_sol ON f.IdUsrA = u_sol.IdUsrA LEFT JOIN protformr rf ON f.idformA = rf.idformA LEFT JOIN protocoloexpe p ON rf.idprotA = p.idprotA INNER JOIN personae u_tit ON p.IdUsrA = u_tit.IdUsrA LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp LEFT JOIN sexoe s ON f.idformA = s.idformA LEFT JOIN precioformulario pif ON f.idformA = pif.idformA LEFT JOIN dinero d ON u_tit.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion WHERE f.idformA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($row && $instCobradora) {
            $this->mergeFacturacionDerivadaIntoAnimalReactiveRow($row, (int)$instCobradora);
        }

        return $row;
    }

// 4. DETALLE DE INSUMO (MODAL): Matemática detallada en el texto
    public function getInsumoDetailById($id, $instCobradora = null) {
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante, MAX(d.SaldoDinero) as saldoInv, 
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo, 
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado, MAX(COALESCE(tf.exento, 0)) as exento
                FROM formularioe f 
                JOIN personae u ON f.IdUsrA = u.IdUsrA 
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion 
                LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario 
                JOIN insumo i ON fi.IdInsumo = i.idInsumo 
                WHERE f.idformA = ? GROUP BY f.idformA";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $r = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($r) {
            $r['total_item'] = round((float) $r['total_item'], 2);
            $r['pagado'] = round((float) $r['pagado'], 2);
            $r['is_exento'] = ((int)($r['exento'] ?? 0) === 1);
            $r['debe'] = $r['is_exento'] ? 0.0 : max(0.0, round($r['total_item'] - $r['pagado'], 2));
            if ($instCobradora) {
                $this->mergeFacturacionDerivadaIntoInsumoRow($r, (int)$instCobradora);
            }
            $idForm = (int)$id;
            $r['lineas'] = $this->fetchInsumoLineItemsForForm($idForm);
            $deriv = (int)($r['es_facturacion_derivada'] ?? 0) === 1;
            $instForPerm = (int)($instCobradora ?? 0);
            $r['puede_editar_precios_linea'] = !$r['is_exento']
                && !$deriv
                && ($instForPerm <= 0 || !$this->formInsumoEsDerivacionDestino($idForm, $instForPerm));
        }

        return $r;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchInsumoLineItemsForForm(int $idformA): array {
        $sql = 'SELECT fi.IdForminsumo AS id_forminsumo,
                       fi.IdInsumo AS id_insumo,
                       i.NombreInsumo AS nombre_insumo,
                       COALESCE(i.TipoInsumo, \'\') AS unidad_medida,
                       fi.cantidad AS cantidad,
                       ROUND(COALESCE(fi.PrecioMomentoInsumo, 0), 4) AS precio_unitario,
                       ROUND(fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0), 2) AS subtotal_linea
                FROM precioinsumosformulario pif
                INNER JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario
                INNER JOIN insumo i ON fi.IdInsumo = i.idInsumo
                WHERE pif.idformA = ?
                ORDER BY fi.IdForminsumo ASC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row['cantidad'] = round((float)($row['cantidad'] ?? 0), 4);
            $row['precio_unitario'] = round((float)($row['precio_unitario'] ?? 0), 4);
            $row['subtotal_linea'] = round((float)($row['subtotal_linea'] ?? 0), 2);
        }
        unset($row);

        return $rows;
    }

    private function formInsumoEsDerivacionDestino(int $idformA, int $instId): bool {
        if ($idformA <= 0 || $instId <= 0 || !$this->tableExists('formulario_derivacion')) {
            return false;
        }
        $sql = 'SELECT 1 FROM formulario_derivacion WHERE idformA = ? AND Activo = 1 AND IdInstitucionDestino = ? LIMIT 1';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA, $instId]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public function updateInsumoLinePrecioMomento(int $idForminsumo, float $precioUnitario, int $instId, int $adminId): void {
        $idForminsumo = (int)$idForminsumo;
        $instId = (int)$instId;
        if ($idForminsumo <= 0 || $instId <= 0) {
            throw new \InvalidArgumentException('Identificadores inválidos.');
        }
        $precioUnitario = round((float)$precioUnitario, 4);
        if ($precioUnitario < 0) {
            throw new \InvalidArgumentException('El precio unitario no puede ser negativo.');
        }

        $sql = 'SELECT fi.IdForminsumo, fi.idPrecioinsumosformulario, fi.cantidad,
                       pif.idformA, pif.preciototal, pif.totalpago,
                       f.IdInstitucion, COALESCE(tf.exento, 0) AS exento
                FROM forminsumo fi
                INNER JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                INNER JOIN formularioe f ON pif.idformA = f.idformA
                LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                WHERE fi.IdForminsumo = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idForminsumo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \RuntimeException('Línea de insumo no encontrada.');
        }
        if ((int)$row['IdInstitucion'] !== $instId) {
            throw new \RuntimeException('No tiene permiso para modificar este pedido.');
        }
        if ((int)($row['exento'] ?? 0) === 1) {
            throw new \RuntimeException('No se puede editar precios en formularios exentos.');
        }
        $idformA = (int)$row['idformA'];
        if ($this->findFacturacionDerivadaForForm($idformA, $instId)) {
            throw new \RuntimeException('Use la gestión de cobro por derivación para este pedido.');
        }
        if ($this->formInsumoEsDerivacionDestino($idformA, $instId)) {
            throw new \RuntimeException('No se puede editar líneas en el formulario copia en institución destino.');
        }

        $this->db->beginTransaction();
        try {
            $upd = $this->db->prepare('UPDATE forminsumo SET PrecioMomentoInsumo = ? WHERE IdForminsumo = ?');
            $upd->execute([$precioUnitario, $idForminsumo]);

            $idPif = (int)$row['idPrecioinsumosformulario'];
            $sumStmt = $this->db->prepare(
                'SELECT ROUND(COALESCE(SUM(fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), 0), 2) FROM forminsumo fi WHERE fi.idPrecioinsumosformulario = ?'
            );
            $sumStmt->execute([$idPif]);
            $nuevoTotal = round((float)$sumStmt->fetchColumn(), 2);
            $totalpago = round((float)($row['totalpago'] ?? 0), 2);

            if ($nuevoTotal + 0.0001 < $totalpago) {
                throw new \RuntimeException('El total del pedido no puede quedar por debajo del monto ya pagado.');
            }

            $this->db->prepare('UPDATE precioinsumosformulario SET preciototal = ? WHERE idPrecioinsumosformulario = ?')
                ->execute([$nuevoTotal, $idPif]);

            Auditoria::log($this->db, 'UPDATE', 'forminsumo', "Precio unitario línea IdForminsumo={$idForminsumo} form #{$idformA} → {$precioUnitario}; preciototal pif #{$idPif}={$nuevoTotal}");
            $this->db->commit();
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function getBasicUserInfo($idUsr, $idInst) {
        $sql = "SELECT p.IdUsrA, CONCAT(p.ApellidoA, ', ', p.NombreA) as NombreCompleto, COALESCE(d.SaldoDinero, 0) as SaldoDinero FROM personae p LEFT JOIN dinero d ON p.IdUsrA = d.IdUsrA AND d.IdInstitucion = ? WHERE p.IdUsrA = ? LIMIT 1";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idInst, $idUsr]); return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    public function getProtocolosByInvestigador($idUsr, $idInst) {
        $sql = "SELECT idprotA, nprotA, tituloA, CONCAT(u.ApellidoA, ', ', u.NombreA) as Investigador FROM protocoloexpe p JOIN personae u ON p.IdUsrA = u.IdUsrA WHERE p.IdUsrA = ? AND p.IdInstitucion = ?";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idUsr, $idInst]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
// 3. INSUMOS POR INVESTIGADOR: Matemática detallada en el texto
    public function getInsumosByUser($idUsr, $idInst, $desde = null, $hasta = null) {
        $gDeriv = $this->billingSqlDerivacionCamposSelectGrouped('f.idformA');
        $sql = "SELECT f.idformA as id, f.IdUsrA, MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) as solicitante, {$gDeriv}, MAX(d.SaldoDinero) as saldoInv,
                MAX(tf.categoriaformulario) AS categoria,
                MAX(f.fechainicioA) AS fecha,
                MAX(f.fecRetiroA) AS fecRetiroA,
                GROUP_CONCAT(CONCAT(i.NombreInsumo, ': <b>', fi.cantidad, ' ', COALESCE(i.TipoInsumo, 'un.'), '</b> <span class=\"text-muted\">[ $', COALESCE(fi.PrecioMomentoInsumo, 0), ' x 1 ', COALESCE(i.TipoInsumo, 'un.'), ' ]</span> = <b>$', (fi.cantidad * COALESCE(fi.PrecioMomentoInsumo, 0)), '</b>') SEPARATOR ' | ') as detalle_completo,
                MAX(pif.preciototal) as total_item, MAX(pif.totalpago) as pagado, MAX(tf.exento) as is_exento
                FROM formularioe f 
                JOIN personae u ON f.IdUsrA = u.IdUsrA 
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND f.IdInstitucion = d.IdInstitucion 
                JOIN precioinsumosformulario pif ON f.idformA = pif.idformA 
                JOIN forminsumo fi ON pif.idPrecioinsumosformulario = fi.idPrecioinsumosformulario 
                JOIN insumo i ON fi.IdInsumo = i.idInsumo 
                JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario 
                WHERE f.IdUsrA = ? AND f.IdInstitucion = ? AND f.estado = 'Entregado' AND (f.depto = 0 OR f.depto IS NULL)";
        $params = [$idUsr, $idInst];
        if ($desde && $hasta) { $sql .= " AND f.fechainicioA BETWEEN ? AND ?"; array_push($params, $desde, $hasta); }
        $sql .= " GROUP BY f.idformA";
        $stmt = $this->db->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['total_item'] = round((float) $r['total_item'], 2);
            $r['pagado'] = round((float) $r['pagado'], 2);
            $r['is_exento'] = ((int)($r['is_exento'] ?? 0) === 1);
            $r['debe'] = $r['is_exento'] ? 0.0 : max(0.0, round($r['total_item'] - $r['pagado'], 2));
        }
        return $rows;
    }
    public function getActiveInvestigators($idInst) {
        $sql = "SELECT DISTINCT u.IdUsrA, u.ApellidoA, u.NombreA FROM personae u WHERE u.IdUsrA IN ( SELECT p.IdUsrA FROM protocoloexpe p JOIN protformr pf ON p.idprotA = pf.idprotA JOIN formularioe f ON pf.idformA = f.idformA WHERE f.estado = 'Entregado' AND p.IdInstitucion = ? UNION SELECT p.IdUsrA FROM protocoloexpe p JOIN alojamiento a ON p.idprotA = a.idprotA WHERE p.IdInstitucion = ? UNION SELECT f.IdUsrA FROM formularioe f WHERE f.estado = 'Entregado' AND f.IdInstitucion = ? AND f.tipoA IN (SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario LIKE '%insumo%') ) ORDER BY u.ApellidoA ASC";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idInst, $idInst, $idInst]); return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Misma lista que `getActiveInvestigators` con saldo de billetera en la sede (para facturación / historial). */
    public function getActiveInvestigatorsWithSaldo($idInst) {
        $idInst = (int) $idInst;
        $sql = "SELECT DISTINCT u.IdUsrA, u.ApellidoA, u.NombreA, COALESCE(d.SaldoDinero, 0) AS SaldoDinero
                FROM personae u
                LEFT JOIN dinero d ON u.IdUsrA = d.IdUsrA AND d.IdInstitucion = ?
                WHERE u.IdUsrA IN (
                    SELECT p.IdUsrA FROM protocoloexpe p
                    JOIN protformr pf ON p.idprotA = pf.idprotA
                    JOIN formularioe f ON pf.idformA = f.idformA
                    WHERE f.estado = 'Entregado' AND p.IdInstitucion = ?
                    UNION
                    SELECT p.IdUsrA FROM protocoloexpe p
                    JOIN alojamiento a ON p.idprotA = a.idprotA
                    WHERE p.IdInstitucion = ?
                    UNION
                    SELECT f.IdUsrA FROM formularioe f
                    WHERE f.estado = 'Entregado' AND f.IdInstitucion = ?
                      AND f.tipoA IN (SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario LIKE '%insumo%')
                )
                ORDER BY u.ApellidoA ASC, u.NombreA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idInst, $idInst, $idInst, $idInst]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $mapExt = $this->getMapInvestigadorProtocoloAmbitoExterno($idInst);
        foreach ($rows as &$r) {
            $r['SaldoDinero'] = isset($r['SaldoDinero']) ? (float) $r['SaldoDinero'] : 0.0;
            $uid = (int) ($r['IdUsrA'] ?? 0);
            $r['ambitoProtExterno'] = ($uid > 0 && !empty($mapExt[$uid])) ? 1 : 0;
        }
        return $rows;
    }
    public function getActiveProtocols($idInst) {
        $sql = "SELECT p.idprotA, MAX(p.nprotA) AS nprotA, MAX(p.tituloA) AS tituloA,
                MAX(CONCAT(u.ApellidoA, ', ', u.NombreA)) AS Investigador,
                MAX(TRIM(COALESCE(dep.NombreDeptoA, ''))) AS nombreDepartamento,
                MAX(CASE WHEN (dep.externodepto = 2 OR COALESCE(org.externoorganismo, 0) = 2) THEN 1 ELSE 0 END) AS ambitoProtExterno
                FROM protocoloexpe p
                INNER JOIN personae u ON p.IdUsrA = u.IdUsrA
                INNER JOIN protformr pf ON p.idprotA = pf.idprotA
                INNER JOIN formularioe f ON pf.idformA = f.idformA
                LEFT JOIN departamentoe dep ON p.departamento = dep.iddeptoA
                LEFT JOIN organismoe org ON dep.organismopertenece = org.IdOrganismo
                WHERE p.IdInstitucion = ? AND f.estado = 'Entregado'
                GROUP BY p.idprotA
                ORDER BY MAX(p.nprotA) DESC";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idInst]); return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    public function getProtocolHeaderInfo($idProt) {
        $sql = "SELECT p.idprotA, p.nprotA, p.tituloA, p.IdUsrA, CONCAT(u.ApellidoA, ', ', u.NombreA) as Responsable, d.NombreDeptoA as Departamento, COALESCE(din.SaldoDinero, 0) as SaldoPI FROM protocoloexpe p JOIN personae u ON p.IdUsrA = u.IdUsrA JOIN departamentoe d ON p.departamento = d.iddeptoA LEFT JOIN dinero din ON u.IdUsrA = din.IdUsrA AND p.IdInstitucion = din.IdInstitucion WHERE p.idprotA = ? LIMIT 1";
        $stmt = $this->db->prepare($sql); $stmt->execute([$idProt]); return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    /**
     * Saldo del usuario en una institución (billetera de esa sede).
     */
    public function getSaldoByInvestigador($idUsuario, $institucionId = null) {
        if ($institucionId !== null && $institucionId !== '') {
            $sql = "SELECT COALESCE(SaldoDinero, 0) as saldo FROM dinero WHERE IdUsrA = ? AND IdInstitucion = ? LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([(int)$idUsuario, (int)$institucionId]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            return $res ? (float)$res['saldo'] : 0.0;
        }
        $sql = "SELECT COALESCE(SaldoDinero, 0) as saldo FROM dinero WHERE IdUsrA = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$idUsuario]);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        return $res ? (float)$res['saldo'] : 0.0;
    }
    public function getFinancialAudit($instId) {
        $hasTransfer = $this->hasColumn('historialpago', 'IdentificadorTransferencia');
        $hasComment = $this->hasColumn('historialpago', 'Comentario');
        $selExtra = '';
        if ($hasTransfer) {
            $selExtra .= ", h.IdentificadorTransferencia";
        } else {
            $selExtra .= ", NULL as IdentificadorTransferencia";
        }
        if ($hasComment) {
            $selExtra .= ", h.Comentario";
        } else {
            $selExtra .= ", NULL as Comentario";
        }
        $sql = "SELECT h.IdHistoPago, h.IdUsrA, h.Monto, h.IdFormA, h.fecha, h.TipoHistorial{$selExtra},
                       CONCAT(a.NombreA, ' ', a.ApellidoA) as AdminCompleto,
                       CONCAT(u.NombreA, ' ', u.ApellidoA) as UsrCompleto
                FROM historialpago h
                LEFT JOIN personae a ON h.IdUsrAAdmin = a.IdUsrA
                LEFT JOIN personae u ON h.IdUsrA = u.IdUsrA
                WHERE h.IdInstitucion = ?
                ORDER BY h.fecha DESC, h.IdHistoPago DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Lista instituciones que han enviado formularios derivados (para selector).
     */
    public function getInstitutionsWithDerivedForms($instId) {
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            return [];
        }
        $sql = "SELECT DISTINCT ffd.IdInstitucionSolicitante as id,
                COALESCE(i.NombreInst, CONCAT('Institución #', ffd.IdInstitucionSolicitante)) as nombre
                FROM facturacion_formulario_derivado ffd
                LEFT JOIN formularioe f ON f.idformA = ffd.idformA
                LEFT JOIN institucion i ON i.IdInstitucion = ffd.IdInstitucionSolicitante
                WHERE ffd.IdInstitucionCobradora = ?
                ORDER BY nombre ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Instituciones solicitantes en facturación derivada + la propia sede si hay formularios “comunes” (sin fila en facturacion_formulario_derivado).
     */
    public function getInstitutionsForInstitutionBillingReport($instId) {
        $instId = (int) $instId;
        $list = $this->getInstitutionsWithDerivedForms($instId);
        $seen = [];
        foreach ($list as $r) {
            $seen[(int) ($r['id'] ?? 0)] = true;
        }
        if ($this->hasCommonBillingForInstitution($instId) && empty($seen[$instId])) {
            $stmt = $this->db->prepare('SELECT IdInstitucion as id, NombreInst as nombre FROM institucion WHERE IdInstitucion = ? LIMIT 1');
            $stmt->execute([$instId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                array_unshift($list, ['id' => (int) $row['id'], 'nombre' => $row['nombre']]);
            }
        }
        return $list;
    }

    private function hasCommonBillingForInstitution(int $instId): bool {
        $rows = $this->fetchInstitutionCommonBillingRows($instId, null, null, 'all');
        return $rows !== [];
    }

    /**
     * Formularios entregados en la sede cobradora con deuda/pagos vía precioformulario, excluyendo los que liquidan por facturacion_formulario_derivado.
     * @return array<int, array<string, mixed>>
     */
    private function fetchInstitutionCommonBillingRows(int $instId, $desde = null, $hasta = null, $estadoCobro = 'all'): array {
        $instId = (int) $instId;
        $hasExtDepto = $this->hasColumn('departamentoe', 'externodepto');
        $extExpr = $hasExtDepto ? 'COALESCE(d.externodepto, 0)' : '0';
        $notFfd = $this->tableExists('facturacion_formulario_derivado')
            ? 'AND NOT EXISTS (SELECT 1 FROM facturacion_formulario_derivado ffd WHERE ffd.idformA = f.idformA AND ffd.IdInstitucionCobradora = ?)'
            : '';
        $sql = "SELECT
                    f.idformA,
                    f.IdUsrA,
                    f.fechainicioA,
                    f.IdInstitucion,
                    tf.categoriaformulario,
                    tf.nombreTipo,
                    tf.exento,
                    tf.descuento,
                    COALESCE(pf.precioformulario, 0) + COALESCE(pif.preciototal, 0) AS monto_total,
                    COALESCE(pf.totalpago, 0) + COALESCE(pif.totalpago, 0) AS monto_pagado,
                    d.NombreDeptoA AS nombre_depto,
                    d.IdInstitucion AS id_inst_depto,
                    {$extExpr} AS externodepto_val,
                    (SELECT pe.nprotA FROM protformr pfx INNER JOIN protocoloexpe pe ON pe.idprotA = pfx.idprotA WHERE pfx.idformA = f.idformA ORDER BY pfx.idprotA ASC LIMIT 1) AS nprot,
                    (SELECT pe.tituloA FROM protformr pfx INNER JOIN protocoloexpe pe ON pe.idprotA = pfx.idprotA WHERE pfx.idformA = f.idformA ORDER BY pfx.idprotA ASC LIMIT 1) AS titulo_prot,
                    (SELECT pe.IdInstitucion FROM protformr pfx INNER JOIN protocoloexpe pe ON pe.idprotA = pfx.idprotA WHERE pfx.idformA = f.idformA ORDER BY pfx.idprotA ASC LIMIT 1) AS id_inst_prot,
                    (SELECT instp.NombreInst FROM protformr pfx INNER JOIN protocoloexpe pe ON pe.idprotA = pfx.idprotA INNER JOIN institucion instp ON instp.IdInstitucion = pe.IdInstitucion WHERE pfx.idformA = f.idformA ORDER BY pfx.idprotA ASC LIMIT 1) AS nombre_inst_prot,
                    TRIM(CONCAT(COALESCE(u.NombreA, ''), ' ', COALESCE(u.ApellidoA, ''))) AS solicitante,
                    ins_depto.NombreInst AS nombre_inst_depto,
                    ins_form.NombreInst AS nombre_inst_form
                FROM formularioe f
                INNER JOIN personae u ON u.IdUsrA = f.IdUsrA
                INNER JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA AND tf.IdInstitucion = f.IdInstitucion
                LEFT JOIN precioformulario pf ON pf.idformA = f.idformA
                LEFT JOIN precioinsumosformulario pif ON pif.idformA = f.idformA
                LEFT JOIN departamentoe d ON d.iddeptoA = f.depto
                LEFT JOIN institucion ins_depto ON ins_depto.IdInstitucion = d.IdInstitucion
                LEFT JOIN institucion ins_form ON ins_form.IdInstitucion = f.IdInstitucion
                WHERE f.IdInstitucion = ?
                  AND f.estado = 'Entregado'
                  {$notFfd}";
        $params = $this->tableExists('facturacion_formulario_derivado') ? [$instId, $instId] : [$instId];
        if (!empty($desde) && !empty($hasta)) {
            $sql .= ' AND DATE(f.fechainicioA) BETWEEN ? AND ?';
            $params[] = $desde;
            $params[] = $hasta;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($raw as $r) {
            $exento = (int) ($r['exento'] ?? 0) === 1;
            $mTotal = round((float) ($r['monto_total'] ?? 0), 2);
            $mPagado = round((float) ($r['monto_pagado'] ?? 0), 2);
            $mDebe = $exento ? 0.0 : max(0.0, round($mTotal - $mPagado, 2));
            if ($mTotal <= 0 && !$exento) {
                continue;
            }
            $estado = 1;
            if ($exento || $mDebe <= 0.009) {
                $estado = 3;
            } elseif ($mPagado > 0.009) {
                $estado = 2;
            }
            if ($estadoCobro !== 'all' && $estadoCobro !== '' && is_numeric($estadoCobro)) {
                if ((int) $estadoCobro !== (int) $estado) {
                    continue;
                }
            } elseif ((int) $estado === 4) {
                continue;
            }
            $r['_monto_total'] = $mTotal;
            $r['_monto_pagado'] = $mPagado;
            $r['_monto_debe'] = $mDebe;
            $r['_estado_cobro'] = $estado;
            $r['_exento'] = $exento;
            $out[] = $r;
        }
        return $out;
    }

    /**
     * Reporte por institución con paginación: totales globales vía agregados + detalle solo para instituciones de la página.
     * Devuelve null para delegar al flujo monolítico (p. ej. filtro una sola institución).
     */
    private function getInstitutionDerivedReportPaginatedOptimized(
        int $instId,
        $desde,
        $hasta,
        $estadoCobro,
        $idInstitucionSolicitante,
        string $origenFacturacion,
        int $instPage,
        int $instPerPage
    ): array {
        $instId = (int) $instId;
        $hasFfd = $this->tableExists('facturacion_formulario_derivado');
        $empty = [
            'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
            'instituciones' => [],
            'meta' => ['origenFacturacion' => $origenFacturacion],
        ];

        $solInstFilter = ($idInstitucionSolicitante !== null && $idInstitucionSolicitante !== '' && is_numeric($idInstitucionSolicitante))
            ? (int) $idInstitucionSolicitante
            : null;

        $globalTotales = ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0];

        if ($hasFfd && ($origenFacturacion === 'todos' || $origenFacturacion === 'derivado')) {
            $w = 'ffd.IdInstitucionCobradora = ? AND COALESCE(f.estado, \'\') = \'Entregado\'';
            $pAgg = [$instId];
            if (!empty($desde) && !empty($hasta)) {
                $w .= ' AND DATE(ffd.FechaCreado) BETWEEN ? AND ?';
                $pAgg[] = $desde;
                $pAgg[] = $hasta;
            }
            if ($estadoCobro !== 'all' && $estadoCobro !== '' && is_numeric($estadoCobro)) {
                $w .= ' AND ffd.estado_cobro = ?';
                $pAgg[] = (int) $estadoCobro;
            } else {
                $w .= ' AND COALESCE(ffd.estado_cobro, 1) <> 4';
            }
            $sqlAgg = "SELECT COALESCE(SUM(ffd.monto_total),0) AS mt, COALESCE(SUM(ffd.monto_pagado),0) AS mp,
                    COALESCE(SUM(GREATEST(0, ffd.monto_total - ffd.monto_pagado)),0) AS md, COUNT(*) AS c
                FROM facturacion_formulario_derivado ffd
                LEFT JOIN formularioe f ON f.idformA = ffd.idformA
                WHERE {$w}";
            $st = $this->db->prepare($sqlAgg);
            $st->execute($pAgg);
            $ag = $st->fetch(PDO::FETCH_ASSOC) ?: [];
            $globalTotales['montoTotal'] += (float) ($ag['mt'] ?? 0);
            $globalTotales['montoPagado'] += (float) ($ag['mp'] ?? 0);
            $globalTotales['montoDebe'] += (float) ($ag['md'] ?? 0);
            $globalTotales['cantidad'] += (int) ($ag['c'] ?? 0);
        }

        $rowsComAll = [];
        if ($origenFacturacion === 'todos' || $origenFacturacion === 'comun') {
            if ($solInstFilter === null || $solInstFilter === $instId) {
                $rowsComAll = $this->fetchInstitutionCommonBillingRows($instId, $desde, $hasta, $estadoCobro);
                foreach ($rowsComAll as $cr) {
                    $mTotal = (float) ($cr['_monto_total'] ?? 0);
                    $mPagado = (float) ($cr['_monto_pagado'] ?? 0);
                    $mDebe = (float) ($cr['_monto_debe'] ?? 0);
                    $globalTotales['montoTotal'] += $mTotal;
                    $globalTotales['montoPagado'] += $mPagado;
                    $globalTotales['montoDebe'] += $mDebe;
                    $globalTotales['cantidad'] += 1;
                }
            }
        }

        if ($globalTotales['cantidad'] <= 0) {
            return $empty;
        }

        $orderedIds = [];
        if ($hasFfd && ($origenFacturacion === 'todos' || $origenFacturacion === 'derivado')) {
            $wD = 'ffd.IdInstitucionCobradora = ? AND COALESCE(f.estado, \'\') = \'Entregado\'';
            $pD = [$instId];
            if (!empty($desde) && !empty($hasta)) {
                $wD .= ' AND DATE(ffd.FechaCreado) BETWEEN ? AND ?';
                $pD[] = $desde;
                $pD[] = $hasta;
            }
            if ($estadoCobro !== 'all' && $estadoCobro !== '' && is_numeric($estadoCobro)) {
                $wD .= ' AND ffd.estado_cobro = ?';
                $pD[] = (int) $estadoCobro;
            } else {
                $wD .= ' AND COALESCE(ffd.estado_cobro, 1) <> 4';
            }
            $sqlIds = "SELECT ffd.IdInstitucionSolicitante AS id,
                    MIN(COALESCE(i.NombreInst, CONCAT('Institución #', ffd.IdInstitucionSolicitante))) AS nom_sort
                FROM facturacion_formulario_derivado ffd
                LEFT JOIN institucion i ON i.IdInstitucion = ffd.IdInstitucionSolicitante
                LEFT JOIN formularioe f ON f.idformA = ffd.idformA
                WHERE {$wD}
                GROUP BY ffd.IdInstitucionSolicitante
                ORDER BY nom_sort ASC, ffd.IdInstitucionSolicitante ASC";
            $stIds = $this->db->prepare($sqlIds);
            $stIds->execute($pD);
            foreach ($stIds->fetchAll(PDO::FETCH_ASSOC) as $rId) {
                $orderedIds[] = (int) $rId['id'];
            }
        }

        if (($origenFacturacion === 'todos' || $origenFacturacion === 'comun')
            && ($solInstFilter === null || $solInstFilter === $instId)
            && $rowsComAll !== []
            && !in_array($instId, $orderedIds, true)
        ) {
            $orderedIds[] = $instId;
        }

        $totalInst = count($orderedIds);
        if ($totalInst === 0) {
            return $empty;
        }

        $per = min(50, max(1, (int) $instPerPage));
        $totalPages = max(1, (int) ceil($totalInst / $per));
        $page = max(1, (int) $instPage);
        if ($page > $totalPages) {
            $page = $totalPages;
        }
        $offset = ($page - 1) * $per;
        $pageIds = array_slice($orderedIds, $offset, $per);
        if ($pageIds === []) {
            return $empty;
        }

        $out = [
            'totales' => $globalTotales,
            'instituciones' => [],
            'meta' => [
                'origenFacturacion' => $origenFacturacion,
                'instPagination' => [
                    'page' => $page,
                    'perPage' => $per,
                    'totalInstitutions' => $totalInst,
                    'totalPages' => $totalPages,
                ],
            ],
        ];

        $rows = [];
        if ($hasFfd && ($origenFacturacion === 'todos' || $origenFacturacion === 'derivado')) {
            $orgFormFo = $this->hasColumn('formulario_derivacion', 'idformAOrigen')
                ? 'COALESCE(NULLIF(fd.idformAOrigen, 0), ffd.idformA)'
                : 'ffd.idformA';
            $idTitCobSql = 'COALESCE(NULLIF(pe_o.IdUsrA, 0), NULLIF(fo.IdUsrA, 0), NULLIF(ffd.IdUsrSolicitante, 0))';
            $hasDeptDestCol = $this->hasColumn('formulario_derivacion', 'depto_destino');
            $selDeptoDest = $hasDeptDestCol
                ? 'd_dd.NombreDeptoA AS depto_destino_derivacion'
                : 'NULL AS depto_destino_derivacion';
            $joinDeptoDest = $hasDeptDestCol
                ? 'LEFT JOIN departamentoe d_dd ON d_dd.iddeptoA = fd.depto_destino AND d_dd.IdInstitucion = ffd.IdInstitucionCobradora'
                : '';
            $sql = "SELECT
                    ffd.IdFacturacionFormularioDerivado,
                    ffd.idformA,
                    ffd.IdUsrSolicitante,
                    ffd.IdInstitucionSolicitante,
                    ffd.IdInstitucionCobradora,
                    COALESCE(i.NombreInst, CONCAT('Institución #', ffd.IdInstitucionSolicitante)) as institucion_solicitante,
                    COALESCE(ic.NombreInst, CONCAT('Institución #', ffd.IdInstitucionCobradora)) as institucion_cobradora,
                    ffd.tipo_formulario,
                    ffd.monto_total,
                    ffd.monto_pagado,
                    ffd.estado_cobro,
                    ffd.FechaCreado,
                    f.estado as estado_formulario,
                    fd.estado_origen,
                    fd.estado_destino,
                    COALESCE(tf_dest.nombreTipo, tf.nombreTipo, '-') as nombre_tipo,
                    COALESCE(tf_dest.categoriaformulario, tf.categoriaformulario, ffd.tipo_formulario, '-') as categoria,
                    CONCAT(COALESCE(p.NombreA, ''), ' ', COALESCE(p.ApellidoA, '')) as investigador_solicitante,
                    CONCAT(COALESCE(po.NombreA, ''), ' ', COALESCE(po.ApellidoA, '')) as investigador_origen_pedido,
                    CONCAT(COALESCE(pd.NombreA, ''), ' ', COALESCE(pd.ApellidoA, '')) as investigador_responsable_destino,
                    d_o.NombreDeptoA AS depto_original_form,
                    pe_o.nprotA AS nprot_original_form,
                    pe_o.tituloA AS titulo_protocolo_original,
                    TRIM(CONCAT(COALESCE(in_o.NombreA, ''), ' ', COALESCE(in_o.ApellidoA, ''))) AS inv_original_form,
                    {$idTitCobSql} AS IdUsrTitularCobro,
                    TRIM(CONCAT(COALESCE(pt_c.ApellidoA, ''), ', ', COALESCE(pt_c.NombreA, ''))) AS nombre_titular_cobro,
                    TRIM(CONCAT(COALESCE(pt_c.NombreA, ''), ' ', COALESCE(pt_c.ApellidoA, ''))) AS inv_nombre_protocolo_titular,
                    {$selDeptoDest},
                    d_fdest.NombreDeptoA AS depto_destino_formulario
                FROM facturacion_formulario_derivado ffd
                LEFT JOIN institucion i ON i.IdInstitucion = ffd.IdInstitucionSolicitante
                LEFT JOIN institucion ic ON ic.IdInstitucion = ffd.IdInstitucionCobradora
                LEFT JOIN formularioe f ON f.idformA = ffd.idformA
                LEFT JOIN departamentoe d_fdest ON d_fdest.iddeptoA = f.depto AND d_fdest.IdInstitucion = ffd.IdInstitucionCobradora
                LEFT JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion
                LEFT JOIN formularioe fo ON fo.idformA = {$orgFormFo}
                LEFT JOIN departamentoe d_o ON d_o.iddeptoA = fo.depto
                LEFT JOIN protformr pf_o ON pf_o.idformA = fo.idformA
                LEFT JOIN protocoloexpe pe_o ON pe_o.idprotA = pf_o.idprotA
                LEFT JOIN personae in_o ON in_o.IdUsrA = fo.IdUsrA
                LEFT JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA AND tf.IdInstitucion = COALESCE(f.IdInstitucionOrigen, f.IdInstitucion)
                LEFT JOIN tipoformularios tf_dest ON tf_dest.IdTipoFormulario = fd.tipoA_destino AND tf_dest.IdInstitucion = ffd.IdInstitucionCobradora
                LEFT JOIN personae p ON p.IdUsrA = ffd.IdUsrSolicitante
                LEFT JOIN personae po ON po.IdUsrA = fd.IdUsrOrigen
                LEFT JOIN personae pd ON pd.IdUsrA = fd.IdUsrDestinoResponsable
                LEFT JOIN personae pt_c ON pt_c.IdUsrA = {$idTitCobSql}
                {$joinDeptoDest}
                WHERE ffd.IdInstitucionCobradora = ?
                  AND COALESCE(f.estado, '') = 'Entregado'";
            $params = [$instId];
            if (!empty($desde) && !empty($hasta)) {
                $sql .= " AND DATE(ffd.FechaCreado) BETWEEN ? AND ?";
                $params[] = $desde;
                $params[] = $hasta;
            }
            if ($estadoCobro !== 'all' && $estadoCobro !== '' && is_numeric($estadoCobro)) {
                $sql .= " AND ffd.estado_cobro = ?";
                $params[] = (int) $estadoCobro;
            } else {
                $sql .= " AND COALESCE(ffd.estado_cobro, 1) <> 4";
            }
            $inPh = implode(',', array_fill(0, count($pageIds), '?'));
            $sql .= " AND ffd.IdInstitucionSolicitante IN ({$inPh})";
            foreach ($pageIds as $pid) {
                $params[] = (int) $pid;
            }
            $sql .= " ORDER BY institucion_solicitante ASC, ffd.FechaCreado DESC, ffd.IdFacturacionFormularioDerivado DESC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        foreach ($rows as $r) {
            $idInstSol = (int) $r['IdInstitucionSolicitante'];
            if (!isset($out['instituciones'][$idInstSol])) {
                $out['instituciones'][$idInstSol] = [
                    'idInstitucionSolicitante' => $idInstSol,
                    'institucion' => $r['institucion_solicitante'],
                    'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
                    'items' => [],
                ];
            }

            $mTotal = (float) $r['monto_total'];
            $mPagado = (float) $r['monto_pagado'];
            $mDebe = max(0, $mTotal - $mPagado);

            $sol = trim((string) ($r['investigador_solicitante'] ?? ''));
            $orig = trim((string) ($r['investigador_origen_pedido'] ?? ''));
            $dest = trim((string) ($r['investigador_responsable_destino'] ?? ''));
            $inicial = $orig !== '' ? $orig : $sol;
            $invInst = $dest !== '' ? $dest : '-';

            $io = trim((string) ($r['institucion_solicitante'] ?? ''));
            if ($io === '') {
                $io = 'Institución #' . (int) ($r['IdInstitucionSolicitante'] ?? 0);
            }
            $sufOrigen = ' --> ' . $io;
            $deptoO = trim((string) ($r['depto_original_form'] ?? ''));
            $deptoD = trim((string) ($r['depto_destino_derivacion'] ?? ''));
            if ($deptoD === '') {
                $deptoD = trim((string) ($r['depto_destino_formulario'] ?? ''));
            }
            $nprotO = trim((string) ($r['nprot_original_form'] ?? ''));
            $titO = trim((string) ($r['titulo_protocolo_original'] ?? ''));
            $invO = trim((string) ($r['inv_original_form'] ?? ''));
            $invProtTit = trim((string) ($r['inv_nombre_protocolo_titular'] ?? ''));
            $protoLine = $nprotO;
            if ($titO !== '') {
                $protoLine = ($protoLine !== '' ? $protoLine . ' — ' : '') . $titO;
            }
            $protoLine = trim((string) $protoLine);
            if ($invProtTit !== '') {
                $invO = $invProtTit;
            } elseif ($invO === '') {
                $invO = $inicial;
            }

            $idTitularCobro = isset($r['IdUsrTitularCobro']) ? (int) $r['IdUsrTitularCobro'] : 0;
            if ($idTitularCobro <= 0) {
                $idTitularCobro = isset($r['IdUsrSolicitante']) ? (int) $r['IdUsrSolicitante'] : 0;
            }
            $nomTitCob = trim((string) ($r['nombre_titular_cobro'] ?? ''));
            if ($nomTitCob === '') {
                $nomTitCob = $sol !== '' ? $sol : '-';
            }

            $item = [
                'idFacturacionDerivada' => (int) $r['IdFacturacionFormularioDerivado'],
                'idformA' => (int) $r['idformA'],
                'idInvestigador' => $idTitularCobro > 0 ? $idTitularCobro : null,
                'tipoFormulario' => $r['tipo_formulario'],
                'montoTotal' => $mTotal,
                'montoPagado' => $mPagado,
                'montoDebe' => $mDebe,
                'estadoCobro' => (int) $r['estado_cobro'],
                'fechaCreado' => $r['FechaCreado'],
                'estadoFormulario' => $r['estado_formulario'],
                'estadoOrigen' => $r['estado_origen'] ?? null,
                'estadoDestino' => $r['estado_destino'] ?? null,
                'nombreTipo' => $r['nombre_tipo'],
                'categoria' => $r['categoria'],
                'investigador' => $nomTitCob,
                'investigadorInicial' => $inicial !== '' ? $inicial : '-',
                'investigadorInstitucion' => $invInst,
                'institucionOrigen' => trim((string) ($r['institucion_solicitante'] ?? '')) !== '' ? trim((string) $r['institucion_solicitante']) : '-',
                'institucionDestino' => trim((string) ($r['institucion_cobradora'] ?? '')) !== '' ? trim((string) $r['institucion_cobradora']) : '-',
                'departamentoPedidoOriginal' => ($deptoO !== '' ? $deptoO : '-') . $sufOrigen,
                'departamentoPedidoDestino' => ($deptoD !== '' ? $deptoD : '-'),
                'protocoloPedidoOriginal' => ($protoLine !== '' ? $protoLine : '-') . $sufOrigen,
                'investigadorPedidoOriginal' => ($invO !== '' ? $invO : '-') . $sufOrigen,
                'origenFacturacion' => 'derivado',
                'esExternoFacturacion' => true,
            ];

            $out['instituciones'][$idInstSol]['items'][] = $item;
            $out['instituciones'][$idInstSol]['totales']['montoTotal'] += $mTotal;
            $out['instituciones'][$idInstSol]['totales']['montoPagado'] += $mPagado;
            $out['instituciones'][$idInstSol]['totales']['montoDebe'] += $mDebe;
            $out['instituciones'][$idInstSol]['totales']['cantidad'] += 1;
        }

        if (($origenFacturacion === 'todos' || $origenFacturacion === 'comun')
            && ($solInstFilter === null || $solInstFilter === $instId)
            && in_array($instId, $pageIds, true)
        ) {
            foreach ($rowsComAll as $cr) {
                $idInstSol = (int) ($cr['IdInstitucion'] ?? $instId);
                if ($solInstFilter !== null && $idInstSol !== $solInstFilter) {
                    continue;
                }
                if (!isset($out['instituciones'][$idInstSol])) {
                    $nomInst = trim((string) ($cr['nombre_inst_form'] ?? ''));
                    if ($nomInst === '') {
                        $nomInst = 'Institución #' . $idInstSol;
                    }
                    $out['instituciones'][$idInstSol] = [
                        'idInstitucionSolicitante' => $idInstSol,
                        'institucion' => $nomInst,
                        'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
                        'items' => [],
                    ];
                }

                $mTotal = (float) ($cr['_monto_total'] ?? 0);
                $mPagado = (float) ($cr['_monto_pagado'] ?? 0);
                $mDebe = (float) ($cr['_monto_debe'] ?? 0);
                $idInstForm = (int) ($cr['IdInstitucion'] ?? $instId);
                $idInstDept = (int) ($cr['id_inst_depto'] ?? 0);
                $idInstProt = (int) ($cr['id_inst_prot'] ?? 0);
                $extDept = (int) ($cr['externodepto_val'] ?? 0) === 2;
                $nombreInstDepto = trim((string) ($cr['nombre_inst_depto'] ?? ''));
                $deptoBase = trim((string) ($cr['nombre_depto'] ?? ''));
                $sufDept = ($idInstDept > 0 && $idInstDept !== $idInstForm) || $extDept;
                $deptoExterno = ($sufDept && $nombreInstDepto !== '' ? ' (' . $nombreInstDepto . ')' : '');
                $nomInstForm = trim((string) ($cr['nombre_inst_form'] ?? ''));
                $sufInstForm = ($nomInstForm !== '' ? ' --> ' . $nomInstForm : '');
                $deptoDisp = ($deptoBase !== '' ? $deptoBase : '-') . $deptoExterno . $sufInstForm;

                $nprot = trim((string) ($cr['nprot'] ?? ''));
                $titP = trim((string) ($cr['titulo_prot'] ?? ''));
                $protoLine = $nprot;
                if ($titP !== '') {
                    $protoLine = ($protoLine !== '' ? $protoLine . ' — ' : '') . $titP;
                }
                $protoLine = trim((string) $protoLine);
                $nombreInstProt = trim((string) ($cr['nombre_inst_prot'] ?? ''));
                $sufProt = $idInstProt > 0 && $idInstProt !== $idInstForm;
                $protoExterno = ($sufProt && $nombreInstProt !== '' ? ' (' . $nombreInstProt . ')' : '');
                $protoDisp = ($protoLine !== '' ? $protoLine : '-') . $protoExterno . $sufInstForm;

                $invBase = trim((string) ($cr['solicitante'] ?? ''));
                $invDisp = ($invBase !== '' ? $invBase : '-') . $sufInstForm;

                $itemC = [
                    'idFacturacionDerivada' => 0,
                    'idformA' => (int) ($cr['idformA'] ?? 0),
                    'idInvestigador' => isset($cr['IdUsrA']) ? (int) $cr['IdUsrA'] : null,
                    'tipoFormulario' => strtolower((string) ($cr['categoriaformulario'] ?? '')),
                    'montoTotal' => $mTotal,
                    'montoPagado' => $mPagado,
                    'montoDebe' => $mDebe,
                    'estadoCobro' => (int) ($cr['_estado_cobro'] ?? 1),
                    'fechaCreado' => $cr['fechainicioA'] ?? null,
                    'estadoFormulario' => 'Entregado',
                    'estadoOrigen' => null,
                    'estadoDestino' => null,
                    'nombreTipo' => $cr['nombreTipo'] ?? '-',
                    'categoria' => $cr['categoriaformulario'] ?? '-',
                    'investigador' => $invDisp,
                    'investigadorInicial' => $invDisp,
                    'investigadorInstitucion' => $invDisp,
                    'institucionOrigen' => trim((string) ($cr['nombre_inst_form'] ?? '')) !== '' ? trim((string) $cr['nombre_inst_form']) : '-',
                    'institucionDestino' => trim((string) ($cr['nombre_inst_form'] ?? '')) !== '' ? trim((string) $cr['nombre_inst_form']) : '-',
                    'departamentoPedidoOriginal' => $deptoDisp,
                    'departamentoPedidoDestino' => '-',
                    'protocoloPedidoOriginal' => $protoDisp,
                    'investigadorPedidoOriginal' => $invDisp,
                    'origenFacturacion' => 'comun',
                    'esExternoFacturacion' => (bool) ($sufDept || $sufProt),
                    'exento' => !empty($cr['_exento']) ? 1 : 0,
                    'is_exento' => !empty($cr['_exento']) ? 1 : 0,
                ];

                $out['instituciones'][$idInstSol]['items'][] = $itemC;
                $out['instituciones'][$idInstSol]['totales']['montoTotal'] += $mTotal;
                $out['instituciones'][$idInstSol]['totales']['montoPagado'] += $mPagado;
                $out['instituciones'][$idInstSol]['totales']['montoDebe'] += $mDebe;
                $out['instituciones'][$idInstSol]['totales']['cantidad'] += 1;
            }
        }

        foreach ($out['instituciones'] as &$grp) {
            if (!empty($grp['items'])) {
                usort($grp['items'], static function ($a, $b) {
                    $ta = strtotime((string) ($a['fechaCreado'] ?? '')) ?: 0;
                    $tb = strtotime((string) ($b['fechaCreado'] ?? '')) ?: 0;
                    return $tb <=> $ta;
                });
            }
        }
        unset($grp);

        $byInstId = [];
        foreach ($out['instituciones'] as $grp) {
            $byInstId[(int) ($grp['idInstitucionSolicitante'] ?? 0)] = $grp;
        }
        $orderedInst = [];
        foreach ($pageIds as $pid) {
            $pid = (int) $pid;
            if (isset($byInstId[$pid])) {
                $orderedInst[] = $byInstId[$pid];
            }
        }
        $out['instituciones'] = $orderedInst;

        return $out;
    }

    /**
     * Facturación por institución solicitante: derivados (facturacion_formulario_derivado) y/o comunes (precio en sede, sin fila derivada).
     * @param int|null $idInstitucionSolicitante Si se pasa, filtra solo esa institución.
     * @param string $origenFacturacion todos|derivado|comun
     * @param int|null $instPage Página 1-based de tarjetas por institución (solo si $instPerPage > 0).
     * @param int|null $instPerPage Máx. instituciones por respuesta (1–50). ≤0 = sin paginar (todas).
     */
    public function getInstitutionDerivedReport($instId, $desde = null, $hasta = null, $estadoCobro = 'all', $idInstitucionSolicitante = null, $origenFacturacion = 'todos', $instPage = null, $instPerPage = null) {
        $origenFacturacion = is_string($origenFacturacion) ? strtolower(trim($origenFacturacion)) : 'todos';
        if (!in_array($origenFacturacion, ['todos', 'derivado', 'comun'], true)) {
            $origenFacturacion = 'todos';
        }

        $ipp = $instPerPage !== null ? (int) $instPerPage : 0;
        $ipg = $instPage !== null ? (int) $instPage : 0;
        $singleInstFilter = ($idInstitucionSolicitante !== null && $idInstitucionSolicitante !== '' && is_numeric($idInstitucionSolicitante));
        if ($ipp > 0 && $ipg >= 1 && !$singleInstFilter) {
            return $this->getInstitutionDerivedReportPaginatedOptimized(
                (int) $instId,
                $desde,
                $hasta,
                $estadoCobro,
                $idInstitucionSolicitante,
                $origenFacturacion,
                $ipg,
                $ipp
            );
        }

        $empty = [
            'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
            'instituciones' => [],
            'meta' => ['origenFacturacion' => $origenFacturacion],
        ];
        $hasFfd = $this->tableExists('facturacion_formulario_derivado');
        if ($hasFfd && ($origenFacturacion === 'todos' || $origenFacturacion === 'derivado')) {
            $orgFormFo = $this->hasColumn('formulario_derivacion', 'idformAOrigen')
                ? 'COALESCE(NULLIF(fd.idformAOrigen, 0), ffd.idformA)'
                : 'ffd.idformA';
            $idTitCobSql = 'COALESCE(NULLIF(pe_o.IdUsrA, 0), NULLIF(fo.IdUsrA, 0), NULLIF(ffd.IdUsrSolicitante, 0))';
            $hasDeptDestColMono = $this->hasColumn('formulario_derivacion', 'depto_destino');
            $selDeptoDestMono = $hasDeptDestColMono
                ? 'd_dd.NombreDeptoA AS depto_destino_derivacion'
                : 'NULL AS depto_destino_derivacion';
            $joinDeptoDestMono = $hasDeptDestColMono
                ? 'LEFT JOIN departamentoe d_dd ON d_dd.iddeptoA = fd.depto_destino AND d_dd.IdInstitucion = ffd.IdInstitucionCobradora'
                : '';
            $sql = "SELECT
                    ffd.IdFacturacionFormularioDerivado,
                    ffd.idformA,
                    ffd.IdUsrSolicitante,
                    ffd.IdInstitucionSolicitante,
                    ffd.IdInstitucionCobradora,
                    COALESCE(i.NombreInst, CONCAT('Institución #', ffd.IdInstitucionSolicitante)) as institucion_solicitante,
                    COALESCE(ic.NombreInst, CONCAT('Institución #', ffd.IdInstitucionCobradora)) as institucion_cobradora,
                    ffd.tipo_formulario,
                    ffd.monto_total,
                    ffd.monto_pagado,
                    ffd.estado_cobro,
                    ffd.FechaCreado,
                    f.estado as estado_formulario,
                    fd.estado_origen,
                    fd.estado_destino,
                    COALESCE(tf_dest.nombreTipo, tf.nombreTipo, '-') as nombre_tipo,
                    COALESCE(tf_dest.categoriaformulario, tf.categoriaformulario, ffd.tipo_formulario, '-') as categoria,
                    CONCAT(COALESCE(p.NombreA, ''), ' ', COALESCE(p.ApellidoA, '')) as investigador_solicitante,
                    CONCAT(COALESCE(po.NombreA, ''), ' ', COALESCE(po.ApellidoA, '')) as investigador_origen_pedido,
                    CONCAT(COALESCE(pd.NombreA, ''), ' ', COALESCE(pd.ApellidoA, '')) as investigador_responsable_destino,
                    d_o.NombreDeptoA AS depto_original_form,
                    pe_o.nprotA AS nprot_original_form,
                    pe_o.tituloA AS titulo_protocolo_original,
                    TRIM(CONCAT(COALESCE(in_o.NombreA, ''), ' ', COALESCE(in_o.ApellidoA, ''))) AS inv_original_form,
                    {$idTitCobSql} AS IdUsrTitularCobro,
                    TRIM(CONCAT(COALESCE(pt_c.ApellidoA, ''), ', ', COALESCE(pt_c.NombreA, ''))) AS nombre_titular_cobro,
                    TRIM(CONCAT(COALESCE(pt_c.NombreA, ''), ' ', COALESCE(pt_c.ApellidoA, ''))) AS inv_nombre_protocolo_titular,
                    {$selDeptoDestMono},
                    d_fdest.NombreDeptoA AS depto_destino_formulario
                FROM facturacion_formulario_derivado ffd
                LEFT JOIN institucion i ON i.IdInstitucion = ffd.IdInstitucionSolicitante
                LEFT JOIN institucion ic ON ic.IdInstitucion = ffd.IdInstitucionCobradora
                LEFT JOIN formularioe f ON f.idformA = ffd.idformA
                LEFT JOIN departamentoe d_fdest ON d_fdest.iddeptoA = f.depto AND d_fdest.IdInstitucion = ffd.IdInstitucionCobradora
                LEFT JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ffd.IdFormularioDerivacion
                LEFT JOIN formularioe fo ON fo.idformA = {$orgFormFo}
                LEFT JOIN departamentoe d_o ON d_o.iddeptoA = fo.depto
                LEFT JOIN protformr pf_o ON pf_o.idformA = fo.idformA
                LEFT JOIN protocoloexpe pe_o ON pe_o.idprotA = pf_o.idprotA
                LEFT JOIN personae in_o ON in_o.IdUsrA = fo.IdUsrA
                LEFT JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA AND tf.IdInstitucion = COALESCE(f.IdInstitucionOrigen, f.IdInstitucion)
                LEFT JOIN tipoformularios tf_dest ON tf_dest.IdTipoFormulario = fd.tipoA_destino AND tf_dest.IdInstitucion = ffd.IdInstitucionCobradora
                LEFT JOIN personae p ON p.IdUsrA = ffd.IdUsrSolicitante
                LEFT JOIN personae po ON po.IdUsrA = fd.IdUsrOrigen
                LEFT JOIN personae pd ON pd.IdUsrA = fd.IdUsrDestinoResponsable
                LEFT JOIN personae pt_c ON pt_c.IdUsrA = {$idTitCobSql}
                {$joinDeptoDestMono}
                WHERE ffd.IdInstitucionCobradora = ?
                  AND COALESCE(f.estado, '') = 'Entregado'";
        $params = [(int)$instId];

        if (!empty($desde) && !empty($hasta)) {
            $sql .= " AND DATE(ffd.FechaCreado) BETWEEN ? AND ?";
            $params[] = $desde;
            $params[] = $hasta;
        }
        if ($estadoCobro !== 'all' && $estadoCobro !== '' && is_numeric($estadoCobro)) {
            $sql .= " AND ffd.estado_cobro = ?";
            $params[] = (int)$estadoCobro;
        } else {
            // En la vista por institución se excluyen anulados por defecto.
            $sql .= " AND COALESCE(ffd.estado_cobro, 1) <> 4";
        }
        if ($idInstitucionSolicitante !== null && $idInstitucionSolicitante !== '' && is_numeric($idInstitucionSolicitante)) {
            $sql .= " AND ffd.IdInstitucionSolicitante = ?";
            $params[] = (int)$idInstitucionSolicitante;
        }

        $sql .= " ORDER BY institucion_solicitante ASC, ffd.FechaCreado DESC, ffd.IdFacturacionFormularioDerivado DESC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $rows = [];
        }

        $out = [
            'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
            'instituciones' => [],
            'meta' => ['origenFacturacion' => $origenFacturacion],
        ];

        foreach ($rows as $r) {
            $idInstSol = (int)$r['IdInstitucionSolicitante'];
            if (!isset($out['instituciones'][$idInstSol])) {
                $out['instituciones'][$idInstSol] = [
                    'idInstitucionSolicitante' => $idInstSol,
                    'institucion' => $r['institucion_solicitante'],
                    'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
                    'items' => []
                ];
            }

            $mTotal = (float)$r['monto_total'];
            $mPagado = (float)$r['monto_pagado'];
            $mDebe = max(0, $mTotal - $mPagado);

            $sol = trim((string)($r['investigador_solicitante'] ?? ''));
            $orig = trim((string)($r['investigador_origen_pedido'] ?? ''));
            $dest = trim((string)($r['investigador_responsable_destino'] ?? ''));
            $inicial = $orig !== '' ? $orig : $sol;
            $invInst = $dest !== '' ? $dest : '-';

            $io = trim((string) ($r['institucion_solicitante'] ?? ''));
            if ($io === '') {
                $io = 'Institución #' . (int) ($r['IdInstitucionSolicitante'] ?? 0);
            }
            $sufOrigen = ' --> ' . $io;
            $deptoO = trim((string) ($r['depto_original_form'] ?? ''));
            $deptoD = trim((string) ($r['depto_destino_derivacion'] ?? ''));
            if ($deptoD === '') {
                $deptoD = trim((string) ($r['depto_destino_formulario'] ?? ''));
            }
            $nprotO = trim((string) ($r['nprot_original_form'] ?? ''));
            $titO = trim((string) ($r['titulo_protocolo_original'] ?? ''));
            $invO = trim((string) ($r['inv_original_form'] ?? ''));
            $invProtTit = trim((string) ($r['inv_nombre_protocolo_titular'] ?? ''));
            $protoLine = $nprotO;
            if ($titO !== '') {
                $protoLine = ($protoLine !== '' ? $protoLine . ' — ' : '') . $titO;
            }
            $protoLine = trim((string) $protoLine);
            if ($invProtTit !== '') {
                $invO = $invProtTit;
            } elseif ($invO === '') {
                $invO = $inicial;
            }

            $idTitularCobro = isset($r['IdUsrTitularCobro']) ? (int)$r['IdUsrTitularCobro'] : 0;
            if ($idTitularCobro <= 0) {
                $idTitularCobro = isset($r['IdUsrSolicitante']) ? (int)$r['IdUsrSolicitante'] : 0;
            }
            $nomTitCob = trim((string)($r['nombre_titular_cobro'] ?? ''));
            if ($nomTitCob === '') {
                $nomTitCob = $sol !== '' ? $sol : '-';
            }

            $item = [
                'idFacturacionDerivada' => (int)$r['IdFacturacionFormularioDerivado'],
                'idformA' => (int)$r['idformA'],
                'idInvestigador' => $idTitularCobro > 0 ? $idTitularCobro : null,
                'tipoFormulario' => $r['tipo_formulario'],
                'montoTotal' => $mTotal,
                'montoPagado' => $mPagado,
                'montoDebe' => $mDebe,
                'estadoCobro' => (int)$r['estado_cobro'],
                'fechaCreado' => $r['FechaCreado'],
                'estadoFormulario' => $r['estado_formulario'],
                'estadoOrigen' => $r['estado_origen'] ?? null,
                'estadoDestino' => $r['estado_destino'] ?? null,
                'nombreTipo' => $r['nombre_tipo'],
                'categoria' => $r['categoria'],
                /** Billetera / liquidaciones: titular protocolo/original */
                'investigador' => $nomTitCob,
                'investigadorInicial' => $inicial !== '' ? $inicial : '-',
                'investigadorInstitucion' => $invInst,
                'institucionOrigen' => trim((string)($r['institucion_solicitante'] ?? '')) !== '' ? trim((string)$r['institucion_solicitante']) : '-',
                'institucionDestino' => trim((string)($r['institucion_cobradora'] ?? '')) !== '' ? trim((string)$r['institucion_cobradora']) : '-',
                'departamentoPedidoOriginal' => ($deptoO !== '' ? $deptoO : '-') . $sufOrigen,
                'departamentoPedidoDestino' => ($deptoD !== '' ? $deptoD : '-'),
                'protocoloPedidoOriginal' => ($protoLine !== '' ? $protoLine : '-') . $sufOrigen,
                'investigadorPedidoOriginal' => ($invO !== '' ? $invO : '-') . $sufOrigen,
                'origenFacturacion' => 'derivado',
                'esExternoFacturacion' => true,
            ];

            $out['instituciones'][$idInstSol]['items'][] = $item;
            $out['instituciones'][$idInstSol]['totales']['montoTotal'] += $mTotal;
            $out['instituciones'][$idInstSol]['totales']['montoPagado'] += $mPagado;
            $out['instituciones'][$idInstSol]['totales']['montoDebe'] += $mDebe;
            $out['instituciones'][$idInstSol]['totales']['cantidad'] += 1;

            $out['totales']['montoTotal'] += $mTotal;
            $out['totales']['montoPagado'] += $mPagado;
            $out['totales']['montoDebe'] += $mDebe;
            $out['totales']['cantidad'] += 1;
        }

        if ($origenFacturacion === 'todos' || $origenFacturacion === 'comun') {
            $solInstFilter = ($idInstitucionSolicitante !== null && $idInstitucionSolicitante !== '' && is_numeric($idInstitucionSolicitante))
                ? (int) $idInstitucionSolicitante
                : null;
            if ($solInstFilter === null || $solInstFilter === (int) $instId) {
                $rowsCom = $this->fetchInstitutionCommonBillingRows((int) $instId, $desde, $hasta, $estadoCobro);
                foreach ($rowsCom as $cr) {
                    $idInstSol = (int) ($cr['IdInstitucion'] ?? $instId);
                    if ($solInstFilter !== null && $idInstSol !== $solInstFilter) {
                        continue;
                    }
                    if (!isset($out['instituciones'][$idInstSol])) {
                        $nomInst = trim((string) ($cr['nombre_inst_form'] ?? ''));
                        if ($nomInst === '') {
                            $nomInst = 'Institución #' . $idInstSol;
                        }
                        $out['instituciones'][$idInstSol] = [
                            'idInstitucionSolicitante' => $idInstSol,
                            'institucion' => $nomInst,
                            'totales' => ['montoTotal' => 0.0, 'montoPagado' => 0.0, 'montoDebe' => 0.0, 'cantidad' => 0],
                            'items' => [],
                        ];
                    }

                    $mTotal = (float) ($cr['_monto_total'] ?? 0);
                    $mPagado = (float) ($cr['_monto_pagado'] ?? 0);
                    $mDebe = (float) ($cr['_monto_debe'] ?? 0);
                    $idInstForm = (int) ($cr['IdInstitucion'] ?? $instId);
                    $idInstDept = (int) ($cr['id_inst_depto'] ?? 0);
                    $idInstProt = (int) ($cr['id_inst_prot'] ?? 0);
                    $extDept = (int) ($cr['externodepto_val'] ?? 0) === 2;
                    $nombreInstDepto = trim((string) ($cr['nombre_inst_depto'] ?? ''));
                    $deptoBase = trim((string) ($cr['nombre_depto'] ?? ''));
                    $sufDept = ($idInstDept > 0 && $idInstDept !== $idInstForm) || $extDept;
                    $deptoExterno = ($sufDept && $nombreInstDepto !== '' ? ' (' . $nombreInstDepto . ')' : '');
                    $nomInstForm = trim((string) ($cr['nombre_inst_form'] ?? ''));
                    $sufInstForm = ($nomInstForm !== '' ? ' --> ' . $nomInstForm : '');
                    $deptoDisp = ($deptoBase !== '' ? $deptoBase : '-') . $deptoExterno . $sufInstForm;

                    $nprot = trim((string) ($cr['nprot'] ?? ''));
                    $titP = trim((string) ($cr['titulo_prot'] ?? ''));
                    $protoLine = $nprot;
                    if ($titP !== '') {
                        $protoLine = ($protoLine !== '' ? $protoLine . ' — ' : '') . $titP;
                    }
                    $protoLine = trim((string) $protoLine);
                    $nombreInstProt = trim((string) ($cr['nombre_inst_prot'] ?? ''));
                    $sufProt = $idInstProt > 0 && $idInstProt !== $idInstForm;
                    $protoExterno = ($sufProt && $nombreInstProt !== '' ? ' (' . $nombreInstProt . ')' : '');
                    $protoDisp = ($protoLine !== '' ? $protoLine : '-') . $protoExterno . $sufInstForm;

                    $invBase = trim((string) ($cr['solicitante'] ?? ''));
                    $invDisp = ($invBase !== '' ? $invBase : '-') . $sufInstForm;

                    $itemC = [
                        'idFacturacionDerivada' => 0,
                        'idformA' => (int) ($cr['idformA'] ?? 0),
                        'idInvestigador' => isset($cr['IdUsrA']) ? (int) $cr['IdUsrA'] : null,
                        'tipoFormulario' => strtolower((string) ($cr['categoriaformulario'] ?? '')),
                        'montoTotal' => $mTotal,
                        'montoPagado' => $mPagado,
                        'montoDebe' => $mDebe,
                        'estadoCobro' => (int) ($cr['_estado_cobro'] ?? 1),
                        'fechaCreado' => $cr['fechainicioA'] ?? null,
                        'estadoFormulario' => 'Entregado',
                        'estadoOrigen' => null,
                        'estadoDestino' => null,
                        'nombreTipo' => $cr['nombreTipo'] ?? '-',
                        'categoria' => $cr['categoriaformulario'] ?? '-',
                        'investigador' => $invDisp,
                        'investigadorInicial' => $invDisp,
                        'investigadorInstitucion' => $invDisp,
                        'institucionOrigen' => trim((string) ($cr['nombre_inst_form'] ?? '')) !== '' ? trim((string) $cr['nombre_inst_form']) : '-',
                        'institucionDestino' => trim((string) ($cr['nombre_inst_form'] ?? '')) !== '' ? trim((string) $cr['nombre_inst_form']) : '-',
                        'departamentoPedidoOriginal' => $deptoDisp,
                        'departamentoPedidoDestino' => '-',
                        'protocoloPedidoOriginal' => $protoDisp,
                        'investigadorPedidoOriginal' => $invDisp,
                        'origenFacturacion' => 'comun',
                        'esExternoFacturacion' => (bool) ($sufDept || $sufProt),
                        'exento' => !empty($cr['_exento']) ? 1 : 0,
                        'is_exento' => !empty($cr['_exento']) ? 1 : 0,
                    ];

                    $out['instituciones'][$idInstSol]['items'][] = $itemC;
                    $out['instituciones'][$idInstSol]['totales']['montoTotal'] += $mTotal;
                    $out['instituciones'][$idInstSol]['totales']['montoPagado'] += $mPagado;
                    $out['instituciones'][$idInstSol]['totales']['montoDebe'] += $mDebe;
                    $out['instituciones'][$idInstSol]['totales']['cantidad'] += 1;

                    $out['totales']['montoTotal'] += $mTotal;
                    $out['totales']['montoPagado'] += $mPagado;
                    $out['totales']['montoDebe'] += $mDebe;
                    $out['totales']['cantidad'] += 1;
                }
            }
        }

        foreach ($out['instituciones'] as &$grp) {
            if (!empty($grp['items'])) {
                usort($grp['items'], static function ($a, $b) {
                    $ta = strtotime((string) ($a['fechaCreado'] ?? '')) ?: 0;
                    $tb = strtotime((string) ($b['fechaCreado'] ?? '')) ?: 0;
                    return $tb <=> $ta;
                });
            }
        }
        unset($grp);

        $out['instituciones'] = array_values($out['instituciones']);
        if ($out['totales']['cantidad'] <= 0) {
            return $empty;
        }

        $ipp = $instPerPage !== null ? (int) $instPerPage : 0;
        $ipg = $instPage !== null ? (int) $instPage : 0;
        if ($ipp > 0 && $ipg >= 1) {
            $allInst = $out['instituciones'];
            $totalInst = count($allInst);
            $per = min(50, max(1, $ipp));
            $page = max(1, $ipg);
            $totalPages = max(1, (int) ceil($totalInst / $per));
            if ($page > $totalPages) {
                $page = $totalPages;
            }
            $offset = ($page - 1) * $per;
            $out['instituciones'] = array_slice($allInst, $offset, $per);
            $out['meta']['instPagination'] = [
                'page' => $page,
                'perPage' => $per,
                'totalInstitutions' => $totalInst,
                'totalPages' => $totalPages,
            ];
        }

        return $out;
    }

    /**
     * Registra pago de ítems de facturacion_formulario_derivado.
     * @param array $items [{idFacturacionDerivada, monto_pago}, ...]
     * @param int $instCobradora IdInstitucion de quien cobra
     * @param int $adminId Usuario admin que registra
     */
    public function processPaymentInstitucionDerivada(array $items, $instCobradora, $adminId) {
        if (!$this->tableExists('facturacion_formulario_derivado')) {
            throw new \Exception('Tabla facturacion_formulario_derivado no existe.');
        }
        $instCobradora = (int)$instCobradora;
        $parsed = [];

        foreach ($items as $item) {
            $id = (int)($item['idFacturacionDerivada'] ?? 0);
            $monto = round((float)($item['monto_pago'] ?? 0), 2);
            if ($id <= 0 || $monto <= 0) {
                throw new \Exception('Cada ítem debe tener idFacturacionDerivada y monto_pago válidos.');
            }

            $p = $this->sqlFactDerivadaTitularCobroPieces();
            $stmt = $this->db->prepare(
                'SELECT ffd.IdFacturacionFormularioDerivado, ffd.idformA, ffd.monto_total, ffd.monto_pagado, ffd.IdInstitucionCobradora, ffd.IdUsrSolicitante,
                        ' . $p['selectTitular'] . '
                 FROM facturacion_formulario_derivado ffd
                 ' . $p['joins'] . '
                 WHERE ffd.IdFacturacionFormularioDerivado = ?'
            );
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                throw new \Exception('Facturación derivada no encontrada (ID ' . $id . ').');
            }
            if ((int)$row['IdInstitucionCobradora'] !== $instCobradora) {
                throw new \Exception('No autorizado a registrar pago para este ítem.');
            }
            $idUsr = $this->idUsuarioCobroFromFactDerivadaRow($row);
            if ($idUsr <= 0) {
                throw new \Exception('El ítem no tiene titular de cobro asociado (protocolo/original).');
            }

            $debe = max(0, round((float)$row['monto_total'] - (float)$row['monto_pagado'], 2));
            if ($monto - $debe > 0.009) {
                throw new \Exception('El monto a pagar supera la deuda pendiente del formulario #' . (int)$row['idformA'] . '.');
            }

            $parsed[] = [
                'idFact' => $id,
                'monto' => $monto,
                'idUsr' => $idUsr,
                'idformA' => (int)$row['idformA'],
                'nuevoPagado' => round((float)$row['monto_pagado'] + $monto, 2),
                'total' => round((float)$row['monto_total'], 2),
            ];
        }

        if ($parsed === []) {
            throw new \Exception('No hay ítems válidos para pagar.');
        }

        $byUser = [];
        foreach ($parsed as $p) {
            $u = $p['idUsr'];
            if (!isset($byUser[$u])) {
                $byUser[$u] = 0.0;
            }
            $byUser[$u] = round($byUser[$u] + $p['monto'], 2);
        }

        $this->db->beginTransaction();
        try {
            // Descuenta saldo por investigador (misma billetera que el resto de facturación).
            foreach ($byUser as $idUsr => $totalDebit) {
                $stmtUp = $this->db->prepare(
                    'UPDATE dinero SET SaldoDinero = SaldoDinero - ? WHERE IdUsrA = ? AND IdInstitucion = ? AND SaldoDinero >= ?'
                );
                $stmtUp->execute([$totalDebit, $idUsr, $instCobradora, $totalDebit]);
                if ($stmtUp->rowCount() !== 1) {
                    $saldoDisp = $this->getSaldoByInvestigador($idUsr, $instCobradora);
                    throw new \Exception(
                        'Saldo insuficiente para el investigador ID ' . $idUsr
                        . '. Requiere: $' . number_format($totalDebit, 2, ',', '.')
                        . ' — disponible: $' . number_format($saldoDisp, 2, ',', '.') . '.'
                    );
                }
            }

            foreach ($parsed as $p) {
                $estadoCobro = ($p['nuevoPagado'] >= $p['total'] - 0.009) ? 3 : (($p['nuevoPagado'] > 0) ? 2 : 1);
                $this->db->prepare(
                    'UPDATE facturacion_formulario_derivado SET monto_pagado = ?, estado_cobro = ? WHERE IdFacturacionFormularioDerivado = ?'
                )->execute([$p['nuevoPagado'], $estadoCobro, $p['idFact']]);

                $this->db->prepare(
                    "INSERT INTO historialpago (IdUsrAAdmin, Monto, IdUsrA, IdFormA, fecha, TipoHistorial, IdInstitucion)
                     VALUES (?, ?, ?, ?, NOW(), 'LIQUIDACION_INST_DERIV', ?)"
                )->execute([$adminId, $p['monto'], $p['idUsr'], $p['idformA'], $instCobradora]);
            }

            Auditoria::log($this->db, 'PAGO_INST_DERIV', 'facturacion_formulario_derivado', 'Liquidación fact. derivada; ítems: ' . count($parsed));
            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Suma por historia para el modal legacy de alojamiento (coherente con la grilla agrupada por historia).
     */
    public function getLegacyAlojamientoModalData($historia, $instId) {
        $check = $this->db->prepare(
            "SELECT COUNT(*) FROM alojamiento a
             INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
             WHERE a.historia = ? AND p.IdInstitucion = ?"
        );
        $check->execute([(int)$historia, (int)$instId]);
        if ((int)$check->fetchColumn() === 0) {
            return null;
        }
        $sql = "SELECT COALESCE(SUM(a.totaldiasdefinidos), 0) AS totaldiasdefinidos,
                       COALESCE(SUM(a.cuentaapagar), 0) AS cuentaapagar,
                       COALESCE(SUM(a.totalpago), 0) AS totalpago
                FROM alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                WHERE a.historia = ? AND p.IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([(int)$historia, (int)$instId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return [
            'totaldiasdefinidos' => (int)$row['totaldiasdefinidos'],
            'cuentaapagar' => (float)$row['cuentaapagar'],
            'totalpago' => (float)$row['totalpago'],
        ];
    }

    /**
     * Modal legacy: replica los valores en todos los tramos de la historia (mismo criterio que lectura por SUM).
     */
    public function updateLegacyAlojamientoModal($historia, $instId, $dias, $cuenta, $pago) {
        $sql = "UPDATE alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                SET a.totaldiasdefinidos = ?, a.cuentaapagar = ?, a.totalpago = ?
                WHERE a.historia = ? AND p.IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([(int)$dias, (float)$cuenta, (float)$pago, (int)$historia, (int)$instId]);
    }

    /**
     * Fija el total de alojamiento (suma de cuentaapagar por historia) repartiendo entre tramos; no modifica totalpago.
     *
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public function updateAlojamientoCuentaTotalPorHistoria(int $historia, float $nuevoTotal, int $instId, int $adminId): void {
        $historia = (int) $historia;
        $nuevoTotal = round((float) $nuevoTotal, 2);
        $instId = (int) $instId;
        $adminId = (int) $adminId;
        if ($historia <= 0 || $instId <= 0) {
            throw new \InvalidArgumentException('billing_fijar_invalido');
        }
        if ($nuevoTotal < 0) {
            throw new \InvalidArgumentException('billing_fijar_invalido');
        }

        $sql = "SELECT a.IdAlojamiento, COALESCE(a.cuentaapagar, 0) AS cuentaapagar, COALESCE(a.totalpago, 0) AS totalpago
                FROM alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                WHERE a.historia = ? AND p.IdInstitucion = ?
                ORDER BY a.IdAlojamiento ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$historia, $instId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if ($rows === []) {
            throw new \RuntimeException('billing_fijar_aloj_no_encontrado');
        }

        $maxPago = 0.0;
        foreach ($rows as $r) {
            $maxPago = max($maxPago, (float) ($r['totalpago'] ?? 0));
        }
        if ($nuevoTotal + 1e-6 < round($maxPago, 2)) {
            throw new \RuntimeException('billing_fijar_menor_pagado');
        }

        $weights = [];
        foreach ($rows as $r) {
            $w = (float) ($r['cuentaapagar'] ?? 0);
            $weights[] = $w > 0 ? $w : 0.0;
        }
        $sumW = array_sum($weights);
        $n = count($rows);
        $alloc = array_fill(0, $n, 0.0);
        if ($sumW <= 0) {
            $each = round($nuevoTotal / $n, 2);
            for ($i = 0; $i < $n - 1; $i++) {
                $alloc[$i] = $each;
            }
            $alloc[$n - 1] = round($nuevoTotal - $each * ($n - 1), 2);
        } else {
            $acc = 0.0;
            for ($i = 0; $i < $n - 1; $i++) {
                $part = round($nuevoTotal * ($weights[$i] / $sumW), 2);
                $alloc[$i] = $part;
                $acc += $part;
            }
            $alloc[$n - 1] = round($nuevoTotal - $acc, 2);
        }

        $this->db->beginTransaction();
        try {
            $upd = $this->db->prepare('UPDATE alojamiento SET cuentaapagar = ? WHERE IdAlojamiento = ?');
            foreach ($rows as $i => $r) {
                $upd->execute([max(0.0, (float) $alloc[$i]), (int) $r['IdAlojamiento']]);
            }
            Auditoria::log($this->db, 'UPDATE', 'alojamiento', "Fijar total cuenta historia={$historia} inst={$instId} → {$nuevoTotal} (admin {$adminId})");
            $this->db->commit();
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Fija precioformulario para pedidos animal/reactivo (misma tabla).
     *
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public function updateFormularioPrecioTotal(int $idformA, float $nuevoTotal, int $instId, int $adminId): void {
        $idformA = (int) $idformA;
        $nuevoTotal = round((float) $nuevoTotal, 2);
        $instId = (int) $instId;
        $adminId = (int) $adminId;
        if ($idformA <= 0 || $instId <= 0) {
            throw new \InvalidArgumentException('billing_fijar_invalido');
        }
        if ($nuevoTotal < 0) {
            throw new \InvalidArgumentException('billing_fijar_invalido');
        }

        $sql = "SELECT f.IdInstitucion, COALESCE(tf.exento, 0) AS exento
                FROM formularioe f
                LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                WHERE f.idformA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \RuntimeException('billing_fijar_form_no_encontrado');
        }
        if ((int) $row['IdInstitucion'] !== $instId) {
            throw new \RuntimeException('billing_fijar_sin_permiso');
        }
        if ((int) ($row['exento'] ?? 0) === 1) {
            throw new \RuntimeException('billing_fijar_exento');
        }
        if ($this->findFacturacionDerivadaForForm($idformA, $instId)) {
            throw new \RuntimeException('billing_fijar_derivada');
        }

        $stmtPf = $this->db->prepare('SELECT COALESCE(totalpago, 0) AS totalpago FROM precioformulario WHERE idformA = ?');
        $stmtPf->execute([$idformA]);
        $pfRow = $stmtPf->fetch(PDO::FETCH_ASSOC);
        $totalpago = $pfRow ? round((float) ($pfRow['totalpago'] ?? 0), 2) : 0.0;
        if ($nuevoTotal + 1e-6 < $totalpago) {
            throw new \RuntimeException('billing_fijar_menor_pagado');
        }

        $this->db->beginTransaction();
        try {
            if (!$pfRow) {
                $ins = $this->db->prepare(
                    'INSERT INTO precioformulario (idformA, precioanimalmomento, precioformulario, totalpago, fechaIniForm) VALUES (?, 0, ?, 0, CURDATE())'
                );
                $ins->execute([$idformA, $nuevoTotal]);
            } else {
                $this->db->prepare('UPDATE precioformulario SET precioformulario = ? WHERE idformA = ?')->execute([$nuevoTotal, $idformA]);
            }
            Auditoria::log($this->db, 'UPDATE', 'precioformulario', "Fijar total formulario #{$idformA} → {$nuevoTotal} (admin {$adminId})");
            $this->db->commit();
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Fija el total del pedido de insumos (preciototal) y reparte PrecioMomentoInsumo en las líneas.
     *
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public function updateInsumoPedidoPrecioTotal(int $idformA, float $nuevoTotal, int $instId, int $adminId): void {
        $idformA = (int) $idformA;
        $nuevoTotal = round((float) $nuevoTotal, 2);
        $instId = (int) $instId;
        $adminId = (int) $adminId;
        if ($idformA <= 0 || $instId <= 0) {
            throw new \InvalidArgumentException('billing_fijar_invalido');
        }
        if ($nuevoTotal < 0) {
            throw new \InvalidArgumentException('billing_fijar_invalido');
        }

        $sql = 'SELECT fi.IdForminsumo, fi.cantidad, COALESCE(fi.PrecioMomentoInsumo, 0) AS pu,
                       pif.idPrecioinsumosformulario, COALESCE(pif.totalpago, 0) AS totalpago,
                       f.IdInstitucion, COALESCE(tf.exento, 0) AS exento
                FROM formularioe f
                INNER JOIN precioinsumosformulario pif ON pif.idformA = f.idformA
                INNER JOIN forminsumo fi ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                WHERE f.idformA = ?
                ORDER BY fi.IdForminsumo ASC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA]);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if ($lines === []) {
            $chk = $this->db->prepare(
                'SELECT pif.idPrecioinsumosformulario, COALESCE(pif.totalpago, 0) AS totalpago, f.IdInstitucion, COALESCE(tf.exento, 0) AS exento
                 FROM precioinsumosformulario pif
                 INNER JOIN formularioe f ON f.idformA = pif.idformA
                 LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                 WHERE pif.idformA = ? LIMIT 1'
            );
            $chk->execute([$idformA]);
            $hdr = $chk->fetch(PDO::FETCH_ASSOC);
            if (!$hdr) {
                throw new \RuntimeException('billing_fijar_form_no_encontrado');
            }
            if ((int) $hdr['IdInstitucion'] !== $instId) {
                throw new \RuntimeException('billing_fijar_sin_permiso');
            }
            if ((int) ($hdr['exento'] ?? 0) === 1) {
                throw new \RuntimeException('billing_fijar_exento');
            }
            if ($this->findFacturacionDerivadaForForm($idformA, $instId)) {
                throw new \RuntimeException('billing_fijar_derivada');
            }
            if ($this->formInsumoEsDerivacionDestino($idformA, $instId)) {
                throw new \RuntimeException('billing_fijar_destino_derivacion');
            }
            $totalpago = round((float) ($hdr['totalpago'] ?? 0), 2);
            if ($nuevoTotal + 1e-6 < $totalpago) {
                throw new \RuntimeException('billing_fijar_menor_pagado');
            }
            $idPif = (int) $hdr['idPrecioinsumosformulario'];
            $this->db->prepare('UPDATE precioinsumosformulario SET preciototal = ? WHERE idPrecioinsumosformulario = ?')->execute([$nuevoTotal, $idPif]);
            Auditoria::log($this->db, 'UPDATE', 'precioinsumosformulario', "Fijar total insumo form #{$idformA} (sin líneas) → {$nuevoTotal} (admin {$adminId})");

            return;
        }

        $row0 = $lines[0];
        if ((int) ($row0['IdInstitucion'] ?? 0) !== $instId) {
            throw new \RuntimeException('billing_fijar_sin_permiso');
        }
        if ((int) ($row0['exento'] ?? 0) === 1) {
            throw new \RuntimeException('billing_fijar_exento');
        }
        if ($this->findFacturacionDerivadaForForm($idformA, $instId)) {
            throw new \RuntimeException('billing_fijar_derivada');
        }
        if ($this->formInsumoEsDerivacionDestino($idformA, $instId)) {
            throw new \RuntimeException('billing_fijar_destino_derivacion');
        }

        $totalpago = round((float) ($row0['totalpago'] ?? 0), 2);
        if ($nuevoTotal + 1e-6 < $totalpago) {
            throw new \RuntimeException('billing_fijar_menor_pagado');
        }

        $idPif = (int) $row0['idPrecioinsumosformulario'];
        $weights = [];
        foreach ($lines as $ln) {
            $c = (float) ($ln['cantidad'] ?? 0);
            $pu = (float) ($ln['pu'] ?? 0);
            $weights[] = max(0.0, round($c * $pu, 4));
        }
        $sumW = array_sum($weights);
        $n = count($lines);
        $newPu = array_fill(0, $n, 0.0);
        if ($sumW <= 0) {
            $each = round($nuevoTotal / $n, 2);
            for ($i = 0; $i < $n; $i++) {
                $c = max((float) ($lines[$i]['cantidad'] ?? 0), 1e-8);
                $newPu[$i] = round($each / $c, 4);
            }
        } else {
            $acc = 0.0;
            for ($i = 0; $i < $n - 1; $i++) {
                $lineTot = round($nuevoTotal * ($weights[$i] / $sumW), 2);
                $c = max((float) ($lines[$i]['cantidad'] ?? 0), 1e-8);
                $newPu[$i] = round($lineTot / $c, 4);
                $acc += round($c * $newPu[$i], 2);
            }
            $lastIdx = $n - 1;
            $lastTot = round($nuevoTotal - $acc, 2);
            $cLast = max((float) ($lines[$lastIdx]['cantidad'] ?? 0), 1e-8);
            $newPu[$lastIdx] = round($lastTot / $cLast, 4);
        }

        $this->db->beginTransaction();
        try {
            $upd = $this->db->prepare('UPDATE forminsumo SET PrecioMomentoInsumo = ? WHERE IdForminsumo = ?');
            foreach ($lines as $i => $ln) {
                $upd->execute([(float) $newPu[$i], (int) $ln['IdForminsumo']]);
            }
            $this->db->prepare('UPDATE precioinsumosformulario SET preciototal = ? WHERE idPrecioinsumosformulario = ?')->execute([$nuevoTotal, $idPif]);
            Auditoria::log($this->db, 'UPDATE', 'precioinsumosformulario', "Fijar total insumo form #{$idformA} → {$nuevoTotal} (admin {$adminId})");
            $this->db->commit();
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    private function tableExists($tableName) {
        $stmt = $this->db->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$tableName]);
        return (bool)$stmt->fetchColumn();
    }
}