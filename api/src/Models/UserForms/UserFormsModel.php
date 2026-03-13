<?php
namespace App\Models\UserForms;

use PDO;

class UserFormsModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllForms($userId, $currentInstId) {
        $stmtInst = $this->db->prepare("SELECT NombreInst, InstCorreo, InstContacto FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$currentInstId]);
        $institucion = $stmtInst->fetch(PDO::FETCH_ASSOC);

        $hasWorkflowCols = $this->hasColumn('formularioe', 'EstadoWorkflow')
            && $this->hasColumn('formularioe', 'DerivadoActivo')
            && $this->hasColumn('formularioe', 'IdInstitucionOrigen');
        $hasOwnerTable = $this->hasTable('formulario_owner_actual');

        $workflowSelect = $hasWorkflowCols
            ? "f.EstadoWorkflow, f.DerivadoActivo, f.IdInstitucionOrigen,"
            : "NULL as EstadoWorkflow, 0 as DerivadoActivo, NULL as IdInstitucionOrigen,";
        $ownerSelect = $hasOwnerTable
            ? "COALESCE(foa.IdInstitucionActual, f.IdInstitucion) as IdInstitucionActual, foa.IdFormularioDerivacionActiva"
            : "f.IdInstitucion as IdInstitucionActual, NULL as IdFormularioDerivacionActiva";
        $ownerJoin = $hasOwnerTable
            ? "LEFT JOIN formulario_owner_actual foa ON f.idformA = foa.idformA"
            : "";
        $originJoin = $hasWorkflowCols
            ? "LEFT JOIN institucion io ON io.IdInstitucion = f.IdInstitucionOrigen"
            : "";
        $originNameSelect = $hasWorkflowCols
            ? "io.NombreInst as NombreInstitucionOrigen,"
            : "NULL as NombreInstitucionOrigen,";
        $tipoInstFilter = $hasWorkflowCols
            ? "tf.IdInstitucion = COALESCE(f.IdInstitucionOrigen, f.IdInstitucion)"
            : "tf.IdInstitucion = f.IdInstitucion";
        $categoriaSubquery = $hasWorkflowCols
            ? "(SELECT categoriaformulario FROM tipoformularios WHERE IdTipoFormulario = f.tipoA AND IdInstitucion = COALESCE(f.IdInstitucionOrigen, f.IdInstitucion) LIMIT 1)"
            : "(SELECT categoriaformulario FROM tipoformularios WHERE IdTipoFormulario = f.tipoA AND IdInstitucion = f.IdInstitucion LIMIT 1)";
        $actualInstJoin = $hasOwnerTable
            ? "LEFT JOIN institucion ia ON ia.IdInstitucion = COALESCE(foa.IdInstitucionActual, f.IdInstitucion)"
            : "LEFT JOIN institucion ia ON ia.IdInstitucion = f.IdInstitucion";
        $actualInstSelect = "ia.NombreInst as InstitucionActualNombre,";

        $sql = "SELECT
                    f.idformA,
                    f.fechainicioA as Inicio,
                    f.fecRetiroA as Retiro,
                    f.estado,
                    {$workflowSelect}
                    i.NombreInst as NombreInstitucion,
                    {$originNameSelect}
                    {$actualInstSelect}
                    COALESCE(tf.nombreTipo, '—') as TipoPedido,
                    COALESCE(tf.categoriaformulario, {$categoriaSubquery}) as Categoria,
                    COALESCE(tf.color, '') as colorTipo,
                    COALESCE(px.nprotA, 'N/A') as Protocolo,
                    COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '---') as Departamento,
                    COALESCE(o.NombreOrganismoSimple, '') as Organizacion,
                    {$ownerSelect}
                FROM formularioe f
                INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario AND {$tipoInstFilter}
                {$ownerJoin}
                {$originJoin}
                {$actualInstJoin}
                LEFT JOIN protformr pf ON f.idformA = pf.idformA
                LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
                LEFT JOIN departamentoe dp ON pd.iddeptoA = dp.iddeptoA
                LEFT JOIN departamentoe d ON f.depto = d.iddeptoA
                LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                WHERE f.IdUsrA = ?
                ORDER BY f.idformA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $derivedIds = [];
        foreach ($list as $row) {
            if (!empty($row['IdInstitucionOrigen']) || (int)($row['DerivadoActivo'] ?? 0) === 1) {
                $derivedIds[] = (int)$row['idformA'];
            }
        }
        $originalMap = $this->getOriginalRowDataMap($derivedIds);

        foreach ($list as &$row) {
            $row['institucionesParticipantes'] = $this->getInstitucionesParticipantes((int)$row['idformA']);
            $id = (int)$row['idformA'];
            if (isset($originalMap[$id])) {
                $orig = $originalMap[$id];
                if (!empty($orig['nombreTipo'])) $row['TipoPedido'] = $orig['nombreTipo'];
                if (!empty($orig['categoria'])) $row['Categoria'] = $orig['categoria'];
                if (isset($orig['Inicio']) && $orig['Inicio'] !== null && $orig['Inicio'] !== '') $row['Inicio'] = $orig['Inicio'];
                if (isset($orig['Retiro']) && $orig['Retiro'] !== null && $orig['Retiro'] !== '') $row['Retiro'] = $orig['Retiro'];
                if (!empty($orig['Protocolo'])) $row['Protocolo'] = $orig['Protocolo'];
                if (!empty($orig['Departamento'])) $row['Departamento'] = $orig['Departamento'];
                if (isset($orig['Organizacion']) && $orig['Organizacion'] !== null && $orig['Organizacion'] !== '') $row['Organizacion'] = $orig['Organizacion'];
                if (!empty($orig['NombreInstitucion'])) $row['NombreInstitucion'] = $orig['NombreInstitucion'];
            }
        }
        return ['info_inst' => $institucion, 'list' => $list];
    }

    public function getDetail($id, $userId = null) {
        $hasWorkflow = $this->hasColumn('formularioe', 'EstadoWorkflow') && $this->hasColumn('formularioe', 'DerivadoActivo');
        $hasOwner = $this->hasTable('formulario_owner_actual');
        $wfCols = $hasWorkflow ? "f.EstadoWorkflow, f.DerivadoActivo, f.IdInstitucionOrigen," : "NULL as EstadoWorkflow, 0 as DerivadoActivo, NULL as IdInstitucionOrigen,";
        $originJoin = $hasWorkflow ? "LEFT JOIN institucion io ON io.IdInstitucion = f.IdInstitucionOrigen" : "";
        $originSelect = $hasWorkflow ? "io.NombreInst as NombreInstitucionOrigen," : "NULL as NombreInstitucionOrigen,";
        $ownerJoin = $hasOwner ? "LEFT JOIN formulario_owner_actual foa ON f.idformA = foa.idformA" : "";
        $actualJoin = $hasOwner ? "LEFT JOIN institucion ia ON ia.IdInstitucion = COALESCE(foa.IdInstitucionActual, f.IdInstitucion)" : "LEFT JOIN institucion ia ON ia.IdInstitucion = f.IdInstitucion";
        $actualSelect = "ia.NombreInst as InstitucionActualNombre";

        $idInstOrigen = $hasWorkflow ? "COALESCE(f.IdInstitucionOrigen, f.IdInstitucion)" : "f.IdInstitucion";
        $instOrigenJoin = "LEFT JOIN institucion iorig ON iorig.IdInstitucion = ({$idInstOrigen})";
        $tipoOrigenJoin = "LEFT JOIN tipoformularios tf_orig ON tf_orig.IdTipoFormulario = f.tipoA AND tf_orig.IdInstitucion = ({$idInstOrigen})";
        $sqlHead = "SELECT f.*,
                    COALESCE(tf_orig.nombreTipo, tf.nombreTipo, '—') as nombreTipo,
                    COALESCE(tf_orig.categoriaformulario, tf.categoriaformulario, (SELECT categoriaformulario FROM tipoformularios WHERE IdTipoFormulario = f.tipoA LIMIT 1)) as categoriaformulario,
                    COALESCE(tf_orig.categoriaformulario, tf.categoriaformulario, (SELECT categoriaformulario FROM tipoformularios WHERE IdTipoFormulario = f.tipoA LIMIT 1)) as Categoria,
                    COALESCE(iorig.NombreInst, i.NombreInst) as NombreInstitucion,
                    COALESCE(iorig.InstCorreo, i.InstCorreo) as InstCorreo,
                    COALESCE(iorig.InstContacto, i.InstContacto) as InstContacto,
                    COALESCE(px.nprotA, '') as nprotA, COALESCE(px.tituloA, '') as TituloProtocolo,
                    COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '') as NombreDeptoA,
                    COALESCE(o.NombreOrganismoSimple, '') as NombreOrganismoSimple,
                    {$wfCols} {$originSelect} {$actualSelect}
                    FROM formularioe f
                    LEFT JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                    {$instOrigenJoin}
                    LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                    {$tipoOrigenJoin}
                    {$ownerJoin} {$originJoin} {$actualJoin}
                    LEFT JOIN protformr pf ON f.idformA = pf.idformA
                    LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                    LEFT JOIN departamentoe d ON f.depto = d.iddeptoA
                    LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
                    LEFT JOIN departamentoe dp ON pd.iddeptoA = dp.iddeptoA
                    LEFT JOIN organismoe o ON COALESCE(d.organismopertenece, dp.organismopertenece) = o.IdOrganismo
                    WHERE f.idformA = ?";
        
        $stmtHead = $this->db->prepare($sqlHead);
        $stmtHead->execute([$id]);
        $head = $stmtHead->fetch(PDO::FETCH_ASSOC);

        if (!$head) throw new \Exception("Formulario no encontrado");
        if ($userId !== null && (int)($head['IdUsrA'] ?? 0) !== (int)$userId) {
            throw new \Exception("Formulario no encontrado");
        }

        // Instituciones que participan (origen + todas las del historial de derivación)
        $institucionesParticipantes = $this->getInstitucionesParticipantes($id);

        // Para formularios derivados: usar datos originales si existen (snapshot al derivar)
        $isDerived = !empty($head['IdInstitucionOrigen']) || (int)($head['DerivadoActivo'] ?? 0) === 1;
        $snapshot = $isDerived ? $this->getDatosOriginalesSnapshot($id) : null;

        // Para derivados con snapshot: usar todos los datos originales del pedido
        if ($snapshot) {
            if (!empty($snapshot['nombreTipo'])) {
                $head['nombreTipo'] = $snapshot['nombreTipo'];
            }
            if (!empty($snapshot['categoria'])) {
                $head['categoriaformulario'] = $snapshot['categoria'];
                $head['Categoria'] = $snapshot['categoria'];
            }
            if (!empty($snapshot['header']) && is_array($snapshot['header'])) {
                $orig = $snapshot['header'];
                foreach (['fechainicioA', 'fecRetiroA', 'aclaraA', 'NombreInstitucion', 'InstCorreo', 'InstContacto', 'nprotA', 'TituloProtocolo', 'NombreDeptoA', 'NombreOrganismoSimple'] as $k) {
                    if (array_key_exists($k, $orig) && ($orig[$k] !== null && $orig[$k] !== '')) {
                        $head[$k] = $orig[$k];
                    }
                }
                if (!empty($orig['NombreInstitucion'])) {
                    $head['NombreInstitucionOrigen'] = $orig['NombreInstitucion'];
                }
            }
        }

        $details = [];

        // 2. Ramificación con Campos Extra para el PDF
        if ($snapshot && isset($snapshot['details'])) {
            $details = $snapshot['details'];
        } elseif ($head['categoriaformulario'] === 'Insumos') {
            // INSUMOS: Agregamos i.CantidadInsumo y i.TipoInsumo
            $sqlItems = "SELECT 
                            i.NombreInsumo, 
                            i.CantidadInsumo as PresentacionCant, -- (Ej: 500)
                            i.TipoInsumo as PresentacionTipo,     -- (Ej: ml)
                            fi.cantidad                           -- Lo solicitado
                         FROM forminsumo fi
                         JOIN insumo i ON fi.IdInsumo = i.idInsumo
                         JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                         WHERE pif.idformA = ?";
            $stmtItems = $this->db->prepare($sqlItems);
            $stmtItems->execute([$id]);
            $details = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        } elseif ($head['categoriaformulario'] === 'Animal') {
            // ANIMALES (Sin cambios en estructura de datos)
            $sqlAni = "SELECT s.machoA, s.hembraA, s.indistintoA, s.totalA, e.EspeNombreA, sub.SubEspeNombreA
                       FROM sexoe s
                       LEFT JOIN formularioe f ON s.idformA = f.idformA
                       LEFT JOIN subespecie sub ON f.idsubespA = sub.idsubespA
                       LEFT JOIN especiee e ON sub.idespA = e.idespA
                       WHERE s.idformA = ?";
            $stmtAni = $this->db->prepare($sqlAni);
            $stmtAni->execute([$id]);
            $details = $stmtAni->fetch(PDO::FETCH_ASSOC) ?: ['machoA' => 0, 'hembraA' => 0, 'indistintoA' => 0, 'totalA' => 0, 'EspeNombreA' => '', 'SubEspeNombreA' => ''];

        } else {
            // REACTIVOS: Agregamos ie.CantidadInsumo y ie.TipoInsumo
            $sqlRea = "SELECT 
                            ie.NombreInsumo, 
                            ie.CantidadInsumo as PresentacionCant, -- (Ej: 1)
                            ie.TipoInsumo as PresentacionTipo,     -- (Ej: Unidad)
                            s.organo as Cantidad                   -- Lo solicitado
                       FROM formularioe f
                       LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                       LEFT JOIN sexoe s ON f.idformA = s.idformA
                       WHERE f.idformA = ?";
            $stmtRea = $this->db->prepare($sqlRea);
            $stmtRea->execute([$id]);
            $details = $stmtRea->fetch(PDO::FETCH_ASSOC) ?: ['NombreInsumo' => '', 'PresentacionCant' => '', 'PresentacionTipo' => '', 'Cantidad' => 0];
        }

        $head['institucionesParticipantes'] = $institucionesParticipantes;

        return [
            'header' => $head,
            'details' => $details
        ];
    }

    /**
     * Obtiene mapa idformA => {nombreTipo, categoria, Inicio, Retiro, Protocolo, Departamento, Organizacion, NombreInstitucion}
     * desde snapshots para formularios derivados (datos del formulario original que creó el usuario).
     */
    private function getOriginalRowDataMap(array $idformAs): array {
        if (empty($idformAs) || !$this->hasTable('formulario_datos_originales')) {
            return [];
        }
        $hasIdformAOrigen = $this->hasTable('formulario_derivacion') && $this->hasColumn('formulario_derivacion', 'idformAOrigen');
        $placeholders = implode(',', array_fill(0, count($idformAs), '?'));
        if ($hasIdformAOrigen) {
            $stmt = $this->db->prepare("SELECT fd.idformA, fdo.datos_json FROM formulario_derivacion fd
                JOIN formulario_datos_originales fdo ON fdo.IdFormularioDerivacion = fd.IdFormularioDerivacion
                WHERE fd.idformA IN ($placeholders) AND fd.idformAOrigen IS NOT NULL AND fdo.idformA = fd.idformAOrigen
                ORDER BY fd.IdFormularioDerivacion DESC");
        } else {
            $stmt = $this->db->prepare("SELECT idformA, datos_json FROM formulario_datos_originales 
                WHERE idformA IN ($placeholders) ORDER BY IdFormularioDerivacion DESC");
        }
        $stmt->execute($idformAs);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $map = [];
        foreach ($rows as $r) {
            $id = (int)$r['idformA'];
            if (isset($map[$id])) continue;
            $decoded = json_decode($r['datos_json'], true);
            if (!is_array($decoded)) continue;
            $header = $decoded['header'] ?? [];
            $nprot = $header['nprotA'] ?? '';
            $titulo = $header['TituloProtocolo'] ?? '';
            $protocolo = $nprot . ($titulo ? ' - ' . $titulo : '');
            $map[$id] = [
                'nombreTipo' => $decoded['nombreTipo'] ?? '',
                'categoria' => $decoded['categoria'] ?? '',
                'Inicio' => $header['fechainicioA'] ?? null,
                'Retiro' => $header['fecRetiroA'] ?? null,
                'Protocolo' => trim($protocolo) ?: null,
                'Departamento' => $header['NombreDeptoA'] ?? null,
                'Organizacion' => $header['NombreOrganismoSimple'] ?? null,
                'NombreInstitucion' => $header['NombreInstitucion'] ?? null
            ];
        }
        return $map;
    }

    /**
     * Obtiene el snapshot de datos originales del formulario (guardado al derivar).
     */
    private function getDatosOriginalesSnapshot($idformA): ?array {
        if (!$this->hasTable('formulario_datos_originales')) {
            return null;
        }
        $hasIdformAOrigen = $this->hasTable('formulario_derivacion') && $this->hasColumn('formulario_derivacion', 'idformAOrigen');
        if ($hasIdformAOrigen) {
            $stmt = $this->db->prepare("SELECT fdo.datos_json FROM formulario_derivacion fd
                JOIN formulario_datos_originales fdo ON fdo.IdFormularioDerivacion = fd.IdFormularioDerivacion AND fdo.idformA = fd.idformAOrigen
                WHERE fd.idformA = ? ORDER BY fd.IdFormularioDerivacion DESC LIMIT 1");
        } else {
            $stmt = $this->db->prepare("SELECT datos_json FROM formulario_datos_originales WHERE idformA = ? ORDER BY IdFormularioDerivacion DESC LIMIT 1");
        }
        $stmt->execute([(int)$idformA]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['datos_json'])) {
            return null;
        }
        $decoded = json_decode($row['datos_json'], true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Obtiene todas las instituciones que participan en un formulario (origen + derivaciones).
     */
    private function getInstitucionesParticipantes($idformA): array {
        if (!$this->hasTable('formulario_derivacion')) {
            $stmt = $this->db->prepare("SELECT i.IdInstitucion, i.NombreInst FROM formularioe f JOIN institucion i ON f.IdInstitucion = i.IdInstitucion WHERE f.idformA = ?");
            $stmt->execute([(int)$idformA]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ? [['IdInstitucion' => $row['IdInstitucion'], 'NombreInst' => $row['NombreInst']]] : [];
        }
        $hasIdformAOrigen = $this->hasColumn('formulario_derivacion', 'idformAOrigen');
        $whereClause = $hasIdformAOrigen ? "(idformA = ? OR idformAOrigen = ?)" : "idformA = ?";
        $params = $hasIdformAOrigen ? [(int)$idformA, (int)$idformA] : [(int)$idformA];
        $stmt = $this->db->prepare("SELECT IdInstitucionOrigen, IdInstitucionDestino FROM formulario_derivacion WHERE {$whereClause} ORDER BY IdFormularioDerivacion ASC");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $ids = [];
        foreach ($rows as $r) {
            if (!empty($r['IdInstitucionOrigen']) && !in_array((int)$r['IdInstitucionOrigen'], $ids)) {
                $ids[] = (int)$r['IdInstitucionOrigen'];
            }
            if (!empty($r['IdInstitucionDestino']) && !in_array((int)$r['IdInstitucionDestino'], $ids)) {
                $ids[] = (int)$r['IdInstitucionDestino'];
            }
        }
        if (empty($ids)) {
            $stmt = $this->db->prepare("SELECT f.IdInstitucion FROM formularioe f WHERE f.idformA = ?");
            $stmt->execute([(int)$idformA]);
            $id = $stmt->fetchColumn();
            if ($id) $ids = [(int)$id];
        }
        if (empty($ids)) return [];
        $byId = [];
        foreach ($ids as $idInst) {
            $st = $this->db->prepare("SELECT IdInstitucion, NombreInst FROM institucion WHERE IdInstitucion = ?");
            $st->execute([$idInst]);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if ($r) $byId[] = $r;
        }
        return $byId;
    }

    /**
     * Protocolos que el usuario utilizó en sus formularios.
     * animales_usados = solo formularios ENTREGADOS (sexoe.totalA).
     */
    public function getProtocolsUsedInForms($userId) {
        $sql = "SELECT p.idprotA, p.nprotA, p.tituloA, p.FechaFinProtA, p.CantidadAniA as cupo_restante,
                (SELECT COALESCE(SUM(s.totalA), 0) 
                 FROM protformr pf2 
                 JOIN formularioe f2 ON pf2.idformA = f2.idformA AND f2.estado = 'Entregado'
                 JOIN sexoe s ON f2.idformA = s.idformA 
                 WHERE pf2.idprotA = p.idprotA AND f2.IdUsrA = ?) as animales_usados
                FROM protocoloexpe p
                INNER JOIN protformr pf ON p.idprotA = pf.idprotA
                INNER JOIN formularioe f ON pf.idformA = f.idformA
                WHERE f.IdUsrA = ?
                GROUP BY p.idprotA, p.nprotA, p.tituloA, p.FechaFinProtA, p.CantidadAniA
                ORDER BY p.nprotA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Insumos pedidos por el usuario (formularios categoría Insumos con ítems).
     * Incluye institución por formulario.
     */
    public function getInsumosPedidosByUser($userId) {
        $sql = "SELECT f.idformA, f.fechainicioA as Inicio, f.estado, f.IdInstitucion,
                i.NombreInst as NombreInstitucion
                FROM formularioe f
                INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                WHERE f.IdUsrA = ? AND tf.categoriaformulario = 'Insumos'
                ORDER BY f.idformA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $forms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($forms as $row) {
            $itemsSql = "SELECT i.NombreInsumo, fi.cantidad,
                         i.CantidadInsumo as PresentacionCant, i.TipoInsumo as PresentacionTipo
                         FROM forminsumo fi
                         JOIN insumo i ON fi.IdInsumo = i.idInsumo
                         JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                         WHERE pif.idformA = ?";
            $stItems = $this->db->prepare($itemsSql);
            $stItems->execute([$row['idformA']]);
            $row['items'] = $stItems->fetchAll(PDO::FETCH_ASSOC);
            $out[] = $row;
        }
        return $out;
    }

    /**
     * Insumos experimentales (reactivos) pedidos por el usuario.
     * Incluye institución. Campos: insumo, tipo/cantidad presentación, cantidad pedida, institución.
     */
    public function getInsumosExperimentalesPedidosByUser($userId) {
        $sql = "SELECT f.idformA, f.fechainicioA as Inicio, f.estado,
                ie.NombreInsumo, ie.CantidadInsumo as PresentacionCant, ie.TipoInsumo as PresentacionTipo,
                COALESCE(s.organo, 0) as Cantidad,
                f.IdInstitucion, i.NombreInst as NombreInstitucion
                FROM formularioe f
                INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                LEFT JOIN sexoe s ON f.idformA = s.idformA
                WHERE f.IdUsrA = ? AND tf.categoriaformulario = 'Otros reactivos biologicos'
                ORDER BY f.idformA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function hasTable(string $tableName): bool {
        try {
            $stmt = $this->db->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$tableName]);
            return (bool)$stmt->fetch(PDO::FETCH_NUM);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function hasColumn(string $tableName, string $columnName): bool {
        try {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM {$tableName} LIKE ?");
            $stmt->execute([$columnName]);
            return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return false;
        }
    }
}