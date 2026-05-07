<?php
namespace App\Models\Alojamiento;
use PDO;
use App\Utils\Auditoria;

class TrazabilidadModel {
    public const TRAZ_ALCANCE_DATOS = 'datos';
    public const TRAZ_ALCANCE_INICIO = 'inicio';

    private $db;
    public function __construct($db) { $this->db = $db; }

    /**
     * Categorías de trazabilidad visibles para una especie y tramo de alojamiento (protocolo opcional).
     * idprotA NULL en fila = aplica a cualquier protocolo; si hay protocolo, también entran las filas específicas de ese idprotA.
     */
    public function listCategoriasTrazPorContexto(int $idEspA, ?int $idProtA, string $alcance): array {
        $alcance = $alcance === self::TRAZ_ALCANCE_INICIO ? self::TRAZ_ALCANCE_INICIO : self::TRAZ_ALCANCE_DATOS;
        if ($idProtA === null || $idProtA <= 0) {
            $stmt = $this->db->prepare(
                'SELECT * FROM categoriadatosunidadalojamiento c
                 WHERE c.IdEspA = ? AND c.alcance_traz = ? AND c.Habilitado != 2 AND c.idprotA IS NULL
                 ORDER BY c.IdDatosUnidadAloj ASC'
            );
            $stmt->execute([$idEspA, $alcance]);
        } else {
            $stmt = $this->db->prepare(
                'SELECT * FROM categoriadatosunidadalojamiento c
                 WHERE c.IdEspA = ? AND c.alcance_traz = ? AND c.Habilitado != 2
                   AND (c.idprotA IS NULL OR c.idprotA = ?)
                 ORDER BY c.IdDatosUnidadAloj ASC'
            );
            $stmt->execute([$idEspA, $alcance, $idProtA]);
        }

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    private function hasCategoriasConfigForProtocolo(int $idEspA, int $idProtA, string $alcance): bool {
        $alcance = $alcance === self::TRAZ_ALCANCE_INICIO ? self::TRAZ_ALCANCE_INICIO : self::TRAZ_ALCANCE_DATOS;
        if ($idProtA <= 0) {
            return false;
        }
        $st = $this->db->prepare(
            'SELECT 1 FROM categoriadatosunidadalojamiento c
             WHERE c.IdEspA = ? AND c.alcance_traz = ? AND c.Habilitado != 2 AND c.idprotA = ?
             LIMIT 1'
        );
        $st->execute([$idEspA, $alcance, $idProtA]);
        return (bool) $st->fetchColumn();
    }

    public function getUnidadTrazContext(int $idEspecieAlojUnidad, int $idInstitucion): ?array {
        $stmt = $this->db->prepare(
            'SELECT a.TipoAnimal AS idEspA, a.idprotA, a.IdAlojamiento
             FROM especie_alojamiento_unidad eu
             INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
             INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
             WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?
             LIMIT 1'
        );
        $stmt->execute([$idEspecieAlojUnidad, $idInstitucion]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /** Valores actuales de variables de inicio (una fila por categoría). */
    public function fetchValoresInicioForUnidad(int $idEspecieAlojUnidad): array {
        $stmtObs = $this->db->prepare(
            "SELECT o.IdDatosUnidadAloj, c.NombreCatAlojUnidad,
                    COALESCE(o.DatoObsVar, o.DatoObsText, CAST(o.DatoObsInt AS CHAR), CAST(o.DatoObsFecha AS CHAR)) AS Valor
             FROM observacion_alojamiento_unidad o
             INNER JOIN categoriadatosunidadalojamiento c ON o.IdDatosUnidadAloj = c.IdDatosUnidadAloj
             WHERE o.IdEspecieAlojUnidad = ? AND COALESCE(o.es_inicio_traz, 0) = 1"
        );
        $stmtObs->execute([$idEspecieAlojUnidad]);
        $out = [];
        foreach ($stmtObs->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
            $out[(int)$r['IdDatosUnidadAloj']] = $r;
        }

        return $out;
    }

    /** Sexo en ficha: M macho, H hembra, I indistinto (compatible con texto previo). */
    private function normalizeSexoSujeto(?string $raw): ?string {
        if ($raw === null) {
            return null;
        }
        $s = strtoupper(trim((string)$raw));
        if ($s === '') {
            return null;
        }
        if (in_array($s, ['M', 'MACHO', 'MALE'], true)) {
            return 'M';
        }
        if (in_array($s, ['H', 'F', 'HEMBRA', 'FEMALE'], true)) {
            return 'H';
        }
        if (in_array($s, ['I', 'INDISTINTO', 'IND'], true)) {
            return 'I';
        }
        return substr($s, 0, 24);
    }

    /** Prefijo fijo de caja: "A" + letra del tipo de protocolo + número de caja en el tramo. */
    private function construirPrefijoCaja(string $letra, int $numeroEnTramo): string {
        $L = strtoupper(trim($letra));
        if ($L === '') {
            $L = 'A';
        }
        if (function_exists('mb_substr')) {
            $L = mb_substr($L, 0, 1, 'UTF-8');
        } else {
            $L = substr($L, 0, 1);
        }
        if ($L === '') {
            $L = 'A';
        }

        return 'A' . $L . $numeroEnTramo;
    }

    private function primeraLetraIdentificadora(string $nombreTipo): string {
        $s = trim($nombreTipo);
        if ($s === '') {
            return 'A';
        }
        if (preg_match('/\p{L}/u', $s, $m)) {
            return function_exists('mb_strtoupper') ? mb_strtoupper($m[0], 'UTF-8') : strtoupper($m[0]);
        }
        if (preg_match('/[0-9]/', $s, $m)) {
            return $m[0];
        }

        return 'A';
    }

    private function letraTipoProtocoloPorIdprot(?int $idprotA, int $idInstitucion): string {
        if ($idprotA === null || $idprotA <= 0) {
            return 'A';
        }
        $st = $this->db->prepare(
            'SELECT COALESCE(tp.NombreTipoprotocolo, \'\') AS nt
             FROM protocoloexpe p
             LEFT JOIN tipoprotocolo tp ON p.tipoprotocolo = tp.idtipoprotocolo
             WHERE p.idprotA = ? AND p.IdInstitucion = ?
             LIMIT 1'
        );
        $st->execute([$idprotA, $idInstitucion]);
        $row = $st->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return 'A';
        }
        $nt = trim((string)($row['nt'] ?? ''));
        if ($nt === '') {
            return 'A';
        }

        return $this->primeraLetraIdentificadora($nt);
    }

    /** Parte fija del nombre de caja (antes de la primera " - "), p.ej. IA1 o A1 (histórico). */
    private function prefijoCajaDesdeNombreCompleto(string $nombreCaja): string {
        $parts = explode(' - ', $nombreCaja, 2);
        $p = trim($parts[0] ?? '');

        return $p !== '' ? $p : 'A0';
    }

    private function normalizarEtiquetaCajaRecibida(string $input, string $prefijoFijo, string $nombreCompletoActual): string {
        $t = trim($input);
        if ($t === '') {
            return 'Sin Etiqueta';
        }
        $prefijoConSep = $prefijoFijo . ' - ';
        if ($t === $nombreCompletoActual) {
            $parts = explode(' - ', $nombreCompletoActual, 2);

            return isset($parts[1]) ? (trim($parts[1]) !== '' ? trim($parts[1]) : 'Sin Etiqueta') : 'Sin Etiqueta';
        }
        if (strpos($t, $prefijoConSep) === 0) {
            $rest = trim(substr($t, strlen($prefijoConSep)));

            return $rest !== '' ? $rest : 'Sin Etiqueta';
        }

        return $t;
    }

    /** @return array{prefijo_fijo:string, etiqueta:string}|null */
    private function parseNombreSujetoTrazas(?string $nombreCompleto): ?array {
        $n = (string)$nombreCompleto;
        if (preg_match('/^(.*) - (S\d+) - (.*)$/su', $n, $m)) {
            return [
                'prefijo_fijo' => $m[1] . ' - ' . $m[2] . ' - ',
                'etiqueta' => $m[3],
            ];
        }

        return null;
    }

    /**
     * Observaciones agrupadas por fila (misma lógica que el árbol de trazabilidad).
     */
    private function fetchObservacionesPivotForUnidad(int $idEspecieAlojUnidad): array {
        $stmtObs = $this->db->prepare("
            SELECT o.fechaObs, o.id_fila_obs, c.NombreCatAlojUnidad as CategoriaNombre,
                   COALESCE(o.DatoObsVar, o.DatoObsText, CAST(o.DatoObsInt AS CHAR), CAST(o.DatoObsFecha AS CHAR)) as Valor
            FROM observacion_alojamiento_unidad o
            INNER JOIN categoriadatosunidadalojamiento c ON o.IdDatosUnidadAloj = c.IdDatosUnidadAloj
            WHERE o.IdEspecieAlojUnidad = ? AND COALESCE(o.es_inicio_traz, 0) = 0
            ORDER BY o.fechaObs DESC, o.id_fila_obs DESC
        ");
        $stmtObs->execute([$idEspecieAlojUnidad]);
        $obsFlat = $stmtObs->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $obsGrouped = [];
        foreach ($obsFlat as $o) {
            $key = $o['id_fila_obs'] ?: $o['fechaObs'] . '_' . uniqid('', true);
            if (!isset($obsGrouped[$key])) {
                $obsGrouped[$key] = ['fechaObs' => $o['fechaObs'], 'valores' => []];
            }
            $obsGrouped[$key]['valores'][$o['CategoriaNombre']] = $o['Valor'];
        }
        return array_values($obsGrouped);
    }

    /**
     * Ficha completa de un sujeto (animal) en alojamiento: datos + último tramo + historial de tramos y registros.
     */
    public function getFichaAnimalCompleta(int $idEspecieAlojUnidad, int $idInstitucion): ?array {
        $stmtBase = $this->db->prepare("
            SELECT eu.IdEspecieAlojUnidad, eu.IdUnidadAlojamiento, eu.NombreEspecieAloj, eu.DetalleEspecieAloj,
                   eu.PesoSujetoKg, eu.FechaNacimientoSujeto, eu.SexoSujeto, eu.idcepaA_sujeto, eu.CategoriaRazaSujeto, eu.idsubespA_sujeto,
                   COALESCE(eu.con_cirugia, 0) AS con_cirugia,
                   c0.CepaNombreA AS CepaNombreSujeto,
                   sp0.SubEspeNombreA AS SubespecieNombreSujeto,
                   a.IdAlojamiento AS IdAlojamientoTramoActual, a.historia, a.TipoAnimal, a.idprotA, a.IdInstitucion,
                   esp.EspeNombreA AS NombreEspecie,
                   inst.NombreInst AS NombreInstitucion
            FROM especie_alojamiento_unidad eu
            INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            LEFT JOIN especiee esp ON esp.idespA = a.TipoAnimal
            LEFT JOIN institucion inst ON inst.IdInstitucion = a.IdInstitucion
            LEFT JOIN cepa c0 ON eu.idcepaA_sujeto = c0.idcepaA
            LEFT JOIN subespecie sp0 ON eu.idsubespA_sujeto = sp0.idsubespA
            WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?
            LIMIT 1
        ");
        $stmtBase->execute([$idEspecieAlojUnidad, $idInstitucion]);
        $base = $stmtBase->fetch(\PDO::FETCH_ASSOC);
        if (!$base) {
            return null;
        }

        $historia = (int)$base['historia'];
        $idUnidadAloj = (int)$base['IdUnidadAlojamiento'];
        $idEspA = (int)($base['TipoAnimal'] ?? 0);

        $idProtFicha = isset($base['idprotA']) && $base['idprotA'] !== null && $base['idprotA'] !== ''
            ? (int)$base['idprotA'] : null;
        $categoriasDatos = $this->listCategoriasTrazPorContexto($idEspA, $idProtFicha, self::TRAZ_ALCANCE_DATOS);
        $categoriasInicio = $this->listCategoriasTrazPorContexto($idEspA, $idProtFicha, self::TRAZ_ALCANCE_INICIO);
        $valoresInicio = $this->fetchValoresInicioForUnidad((int)$base['IdEspecieAlojUnidad']);

        $stmtTr = $this->db->prepare("
            SELECT eu.IdEspecieAlojUnidad,
                   eu.PesoSujetoKg, eu.FechaNacimientoSujeto, eu.SexoSujeto, eu.idcepaA_sujeto, eu.CategoriaRazaSujeto, eu.idsubespA_sujeto,
                   COALESCE(eu.con_cirugia, 0) AS con_cirugia,
                   cj.CepaNombreA AS CepaNombreSujeto,
                   spj.SubEspeNombreA AS SubespecieNombreSujeto,
                   a.IdAlojamiento, a.fechavisado, a.hastafecha, a.observaciones AS aloj_obs,
                   a.finalizado,
                   t.NombreTipoAlojamiento,
                   ac.NombreCaja, ac.Detalle AS cajaDetalle, ac.FechaInicio AS cajaFechaInicio,
                   uf.Nombre AS nombre_ubicacion_fisica,
                   s.Nombre AS nombre_salon,
                   r.Nombre AS nombre_rack,
                   lr.Nombre AS nombre_lugar_rack,
                   ac.ComentarioUbicacion,
                   p.tituloA AS protocolo_titulo, p.nprotA AS protocolo_codigo
            FROM especie_alojamiento_unidad eu
            INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento
            LEFT JOIN aloj_ubicacion_fisica uf ON ac.IdUbicacionFisica = uf.IdUbicacionFisica
            LEFT JOIN aloj_salon s ON ac.IdSalon = s.IdSalon
            LEFT JOIN aloj_rack r ON ac.IdRack = r.IdRack
            LEFT JOIN aloj_lugar_rack lr ON ac.IdLugarRack = lr.IdLugarRack
            LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA
            LEFT JOIN cepa cj ON eu.idcepaA_sujeto = cj.idcepaA
            LEFT JOIN subespecie spj ON eu.idsubespA_sujeto = spj.idsubespA
            WHERE a.IdInstitucion = ? AND a.historia = ? AND eu.IdUnidadAlojamiento = ?
            ORDER BY a.fechavisado ASC, a.IdAlojamiento ASC
        ");
        $stmtTr->execute([$idInstitucion, $historia, $idUnidadAloj]);
        $rows = $stmtTr->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $tramos = [];
        foreach ($rows as $row) {
            $idEu = (int)$row['IdEspecieAlojUnidad'];
            $ubic = $this->formatUbicacionResumen($row);
            $tramos[] = [
                'IdAlojamiento' => (int)$row['IdAlojamiento'],
                'fechavisado' => $row['fechavisado'],
                'hastafecha' => $row['hastafecha'],
                'finalizado' => $row['finalizado'],
                'NombreTipoAlojamiento' => $row['NombreTipoAlojamiento'],
                'aloj_obs' => $row['aloj_obs'],
                'NombreCaja' => $row['NombreCaja'],
                'cajaDetalle' => $row['cajaDetalle'],
                'cajaFechaInicio' => $row['cajaFechaInicio'],
                'ubicacionResumen' => $ubic,
                'protocolo_titulo' => $row['protocolo_titulo'],
                'protocolo_codigo' => $row['protocolo_codigo'],
                'IdEspecieAlojUnidad' => $idEu,
                'PesoSujetoKg' => $row['PesoSujetoKg'],
                'FechaNacimientoSujeto' => $row['FechaNacimientoSujeto'],
                'SexoSujeto' => $row['SexoSujeto'],
                'idcepaA_sujeto' => $row['idcepaA_sujeto'],
                'CategoriaRazaSujeto' => $row['CategoriaRazaSujeto'],
                'idsubespA_sujeto' => $row['idsubespA_sujeto'],
                'SubespecieNombreSujeto' => $row['SubespecieNombreSujeto'],
                'CepaNombreSujeto' => $row['CepaNombreSujeto'],
                'con_cirugia' => (int)$row['con_cirugia'],
                'observaciones_pivot' => $this->fetchObservacionesPivotForUnidad($idEu),
            ];
        }

        $fechaInicio = null;
        if (!empty($tramos)) {
            $fechaInicio = $tramos[0]['fechavisado'] ?? null;
        }

        $ultimo = !empty($tramos) ? $tramos[count($tramos) - 1] : null;

        $fechaNacDeclarada = $base['FechaNacimientoSujeto'] ?? null;
        $fechaNacSugerida = $fechaNacDeclarada ?: $this->inferirFechaNacimiento($tramos);

        return [
            'IdAlojamientoFicha' => (int)($base['IdAlojamientoTramoActual'] ?? 0),
            'IdEspecieFicha' => $idEspA,
            'sujeto' => [
                'IdUnidadAlojamiento' => $idUnidadAloj,
                'IdEspecieAlojUnidad' => (int)$base['IdEspecieAlojUnidad'],
                'NombreEspecieAloj' => $base['NombreEspecieAloj'],
                'DetalleEspecieAloj' => $base['DetalleEspecieAloj'],
                'PesoSujetoKg' => $base['PesoSujetoKg'],
                'FechaNacimientoSujeto' => $base['FechaNacimientoSujeto'],
                'SexoSujeto' => $base['SexoSujeto'],
                'idcepaA_sujeto' => $base['idcepaA_sujeto'],
                'CategoriaRazaSujeto' => $base['CategoriaRazaSujeto'],
                'idsubespA_sujeto' => $base['idsubespA_sujeto'],
                'SubespecieNombreSujeto' => $base['SubespecieNombreSujeto'],
                'CepaNombreSujeto' => $base['CepaNombreSujeto'],
                'con_cirugia' => (int)($base['con_cirugia'] ?? 0),
            ],
            'NombreEspecie' => $base['NombreEspecie'],
            'NombreInstitucion' => $base['NombreInstitucion'],
            'historia' => $historia,
            'fechaInicioSeguimiento' => $fechaInicio,
            'fechaNacimientoSugerida' => $fechaNacSugerida,
            'ultimoTramo' => $ultimo,
            'tramos' => $tramos,
            'categorias' => $categoriasDatos,
            'categorias_datos' => $categoriasDatos,
            'categorias_inicio' => $categoriasInicio,
            'valores_inicio' => $valoresInicio,
        ];
    }

    private function formatUbicacionResumen(array $caja): string {
        $parts = [];
        if (!empty($caja['nombre_ubicacion_fisica'])) {
            $parts[] = trim((string)$caja['nombre_ubicacion_fisica']);
        }
        if (!empty($caja['nombre_salon'])) {
            $parts[] = trim((string)$caja['nombre_salon']);
        }
        if (!empty($caja['nombre_rack'])) {
            $parts[] = trim((string)$caja['nombre_rack']);
        }
        if (!empty($caja['nombre_lugar_rack'])) {
            $parts[] = trim((string)$caja['nombre_lugar_rack']);
        }
        if (!empty($caja['ComentarioUbicacion']) && trim((string)$caja['ComentarioUbicacion']) !== '') {
            $parts[] = trim((string)$caja['ComentarioUbicacion']);
        }
        if (!$parts && !empty($caja['cajaDetalle'])) {
            return trim((string)$caja['cajaDetalle']);
        }
        return implode(' · ', array_filter($parts));
    }

    /**
     * Busca en variables clínicas un valor asociado a categorías cuyo nombre sugiere fecha de nacimiento.
     */
    private function inferirFechaNacimiento(array $tramos): ?string {
        foreach ($tramos as $t) {
            foreach ($t['observaciones_pivot'] ?? [] as $fila) {
                foreach ($fila['valores'] ?? [] as $nombreCat => $valor) {
                    if ($valor === null || $valor === '' || $valor === '-') {
                        continue;
                    }
                    if (preg_match('/nacimiento|birth|fecha\s*de\s*nac|date\s*of\s*birth/i', (string)$nombreCat)) {
                        return (string)$valor;
                    }
                }
            }
        }
        return null;
    }

    public function getArbolBiologico($idAlojamiento, $idEspecie, $idInstitucion) {
        $stmtAloj = $this->db->prepare('SELECT TipoAnimal, idprotA FROM alojamiento WHERE IdAlojamiento = ? AND IdInstitucion = ? LIMIT 1');
        $stmtAloj->execute([$idAlojamiento, $idInstitucion]);
        $alojRow = $stmtAloj->fetch(\PDO::FETCH_ASSOC);
        if (!$alojRow || (int)($alojRow['TipoAnimal'] ?? 0) !== (int)$idEspecie) {
            throw new \Exception('Alojamiento no encontrado o la especie no coincide con el tramo.');
        }
        $idProtA = isset($alojRow['idprotA']) && $alojRow['idprotA'] !== null && $alojRow['idprotA'] !== ''
            ? (int)$alojRow['idprotA'] : null;

        $stmtCajas = $this->db->prepare("
            SELECT ac.*,
                uf.Nombre AS nombre_ubicacion_fisica,
                s.Nombre AS nombre_salon,
                r.Nombre AS nombre_rack,
                lr.Nombre AS nombre_lugar_rack
            FROM alojamiento_caja ac
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            LEFT JOIN aloj_ubicacion_fisica uf ON ac.IdUbicacionFisica = uf.IdUbicacionFisica
            LEFT JOIN aloj_salon s ON ac.IdSalon = s.IdSalon
            LEFT JOIN aloj_rack r ON ac.IdRack = r.IdRack
            LEFT JOIN aloj_lugar_rack lr ON ac.IdLugarRack = lr.IdLugarRack
            WHERE ac.IdAlojamiento = ? AND a.IdInstitucion = ?
        ");
        $stmtCajas->execute([$idAlojamiento, $idInstitucion]);
        $cajas = $stmtCajas->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $categoriasDatos = $this->listCategoriasTrazPorContexto((int)$idEspecie, $idProtA, self::TRAZ_ALCANCE_DATOS);
        $categoriasInicio = $this->listCategoriasTrazPorContexto((int)$idEspecie, $idProtA, self::TRAZ_ALCANCE_INICIO);

        $protIdInt = $idProtA !== null ? (int) $idProtA : 0;
        $tieneInicioProt = $protIdInt > 0
            ? $this->hasCategoriasConfigForProtocolo((int)$idEspecie, $protIdInt, self::TRAZ_ALCANCE_INICIO)
            : false;
        $tieneDatosProt = $protIdInt > 0
            ? $this->hasCategoriasConfigForProtocolo((int)$idEspecie, $protIdInt, self::TRAZ_ALCANCE_DATOS)
            : false;
        // Regla estricta: para poder operar trazabilidad en alojamientos, el protocolo debe tener
        // configuradas categorías específicas (idprotA=protocolo) en ambos alcances.
        $faltaCfgInicio = ($protIdInt > 0 && !$tieneInicioProt);
        $faltaCfgDatos = ($protIdInt > 0 && !$tieneDatosProt);
        $tieneConfigProtocolo = ($protIdInt > 0 && !$faltaCfgInicio && !$faltaCfgDatos);

        $stmtTipo = $this->db->prepare("
            SELECT t.NombreTipoAlojamiento, a.CantidadCaja 
            FROM alojamiento a 
            LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento 
            WHERE a.IdAlojamiento = ?
        ");
        $stmtTipo->execute([$idAlojamiento]);
        $infoAloj = $stmtTipo->fetch(\PDO::FETCH_ASSOC);
        
        $tipoAlojamiento = $infoAloj['NombreTipoAlojamiento'] ?? 'Caja';
        $limiteCajas = (int)($infoAloj['CantidadCaja'] ?? 1);

        foreach ($cajas as &$caja) {
            $stmtUnidades = $this->db->prepare("SELECT * FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
            $stmtUnidades->execute([$caja['IdCajaAlojamiento']]);
            $caja['unidades'] = $stmtUnidades->fetchAll(\PDO::FETCH_ASSOC) ?: []; 

            foreach ($caja['unidades'] as &$unidad) {
                $idEu = (int)$unidad['IdEspecieAlojUnidad'];
                $unidad['observaciones_pivot'] = $this->fetchObservacionesPivotForUnidad($idEu);
                $unidad['valores_inicio'] = $this->fetchValoresInicioForUnidad($idEu);
            }
        }
        return [
            'cajas' => $cajas,
            'categorias' => $categoriasDatos,
            'categorias_datos' => $categoriasDatos,
            'categorias_inicio' => $categoriasInicio,
            'tipoAlojamiento' => $tipoAlojamiento,
            'limiteCajas' => $limiteCajas,
            'idprotA' => $protIdInt,
            'faltante_config_traz_protocolo' => ($protIdInt > 0 && !$tieneConfigProtocolo) ? 1 : 0,
            'faltante_config_traz_protocolo_inicio' => $faltaCfgInicio ? 1 : 0,
            'faltante_config_traz_protocolo_datos' => $faltaCfgDatos ? 1 : 0,
        ];
    }

    public function crearCajaYUnidades($idAlojamiento, $nombreCaja, $cantidadUnidades, $idInstitucion, array $ubicacion = null) {
        $stmtCheck = $this->db->prepare(
            'SELECT IdAlojamiento, fechavisado, historia, idprotA FROM alojamiento WHERE IdAlojamiento = ? AND IdInstitucion = ?'
        );
        $stmtCheck->execute([$idAlojamiento, $idInstitucion]);
        $aloj = $stmtCheck->fetch(\PDO::FETCH_ASSOC);

        if (!$aloj) throw new \Exception("El alojamiento no existe o no pertenece a su institución.");

        $idUf = null;
        $idSalon = null;
        $idRack = null;
        $idLugarRack = null;
        $comUbic = null;
        if (is_array($ubicacion)) {
            $idUf = isset($ubicacion['IdUbicacionFisica']) && $ubicacion['IdUbicacionFisica'] !== '' ? (int)$ubicacion['IdUbicacionFisica'] : null;
            $idSalon = isset($ubicacion['IdSalon']) && $ubicacion['IdSalon'] !== '' ? (int)$ubicacion['IdSalon'] : null;
            $idRack = isset($ubicacion['IdRack']) && $ubicacion['IdRack'] !== '' ? (int)$ubicacion['IdRack'] : null;
            $idLugarRack = isset($ubicacion['IdLugarRack']) && $ubicacion['IdLugarRack'] !== '' ? (int)$ubicacion['IdLugarRack'] : null;
            if (!empty($ubicacion['ComentarioUbicacion'])) {
                $comUbic = substr(trim((string)$ubicacion['ComentarioUbicacion']), 0, 500);
            }
            if ($idUf !== null || $idSalon !== null || $idRack !== null || $idLugarRack !== null) {
                $ubModel = new AlojamientoUbicacionModel($this->db);
                $ubModel->assertUbicacionParaCaja((int)$idInstitucion, $idUf, $idSalon, $idRack, $idLugarRack);
            }
        }

        $this->db->beginTransaction();
        try {
            $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM alojamiento_caja WHERE IdAlojamiento = ?");
            $stmtCount->execute([$idAlojamiento]);
            $numeroSiguiente = $stmtCount->fetchColumn() + 1;

            $idProtA = isset($aloj['idprotA']) && $aloj['idprotA'] !== null && $aloj['idprotA'] !== ''
                ? (int)$aloj['idprotA'] : null;
            $letra = $this->letraTipoProtocoloPorIdprot($idProtA, $idInstitucion);
            $prefijoCaja = $this->construirPrefijoCaja($letra, (int)$numeroSiguiente);
            $nombreFinalCaja = $prefijoCaja . " - " . ($nombreCaja ?: "Sin Etiqueta");

            $stmtCaja = $this->db->prepare(
                "INSERT INTO alojamiento_caja (FechaInicio, NombreCaja, IdAlojamiento, IdUbicacionFisica, IdSalon, IdRack, IdLugarRack, ComentarioUbicacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmtCaja->execute([$aloj['fechavisado'], $nombreFinalCaja, $idAlojamiento, $idUf, $idSalon, $idRack, $idLugarRack, $comUbic]);
            $idNuevaCaja = $this->db->lastInsertId();

            $stmtMaxAnimal = $this->db->prepare("
                SELECT MAX(eu.IdUnidadAlojamiento) FROM especie_alojamiento_unidad eu
                INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.historia = ?
            ");
            $stmtMaxAnimal->execute([$aloj['historia']]);
            $ultimoIdAnimal = (int)$stmtMaxAnimal->fetchColumn();

            $stmtUnidad = $this->db->prepare("INSERT INTO especie_alojamiento_unidad (IdUnidadAlojamiento, NombreEspecieAloj, IdCajaAlojamiento) VALUES (?, ?, ?)");
            
            for ($i = 1; $i <= $cantidadUnidades; $i++) {
                $ultimoIdAnimal++; 
                $nombreAnimal = "{$prefijoCaja} - S{$ultimoIdAnimal} - Sujeto {$i}"; 
                $stmtUnidad->execute([$ultimoIdAnimal, $nombreAnimal, $idNuevaCaja]);
            }

            Auditoria::log($this->db, 'INSERT', 'alojamiento_caja', "Creó Caja Físca: $nombreFinalCaja");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw new \Exception("Error BD: " . $e->getMessage()); }
    }

    /**
     * Solo cambia la etiqueta final; el prefijo "{caja} - S{n} -" no es modificable.
     *
     * @param string $nombreOEtiqueta etiqueta libre, o nombre completo (compatibilidad con clientes antiguos)
     */
    public function renameSujeto(int $idUnidad, int $idInstitucion, string $nombreOEtiqueta): bool {
        $stmt = $this->db->prepare(
            'SELECT eu.NombreEspecieAloj FROM especie_alojamiento_unidad eu
             INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
             INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
             WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?
             LIMIT 1'
        );
        $stmt->execute([$idUnidad, $idInstitucion]);
        $actual = $stmt->fetchColumn();
        if ($actual === false) {
            throw new \Exception('Sujeto no encontrado o sin permiso.');
        }
        $parsed = $this->parseNombreSujetoTrazas((string)$actual);
        if ($parsed === null) {
            throw new \Exception('El nombre del sujeto no tiene el formato de trazabilidad esperado.');
        }
        $prefijoFijo = $parsed['prefijo_fijo'];
        $t = trim($nombreOEtiqueta);
        if ($t === (string)$actual) {
            $etiqueta = $parsed['etiqueta'];
        } elseif (strpos($t, $prefijoFijo) === 0) {
            $etiqueta = trim(substr($t, strlen($prefijoFijo)));
            if ($etiqueta === '') {
                $etiqueta = 'Sujeto';
            }
        } else {
            $etiqueta = $t !== '' ? $t : 'Sujeto';
        }
        $nuevo = $prefijoFijo . $etiqueta;
        $stmtUp = $this->db->prepare('UPDATE especie_alojamiento_unidad SET NombreEspecieAloj = ? WHERE IdEspecieAlojUnidad = ?');
        $res = $stmtUp->execute([$nuevo, $idUnidad]);
        Auditoria::log($this->db, 'UPDATE', 'especie_alojamiento_unidad', "Renombró sujeto ID: $idUnidad");
        return (bool)$res;
    }

    /**
     * Actualiza datos de ficha del sujeto para este tramo (fila especie_alojamiento_unidad).
     * Cualquier clave omitida en $payload conserva el valor ya guardado.
     */
    public function updateSujetoFichaBio(int $idEspecieAlojUnidad, int $idInstitucion, array $payload): bool {
        $stmtCtx = $this->db->prepare("
            SELECT a.TipoAnimal, a.IdInstitucion, eu.PesoSujetoKg, eu.FechaNacimientoSujeto, eu.SexoSujeto, eu.idcepaA_sujeto, eu.idsubespA_sujeto,
                   COALESCE(eu.con_cirugia, 0) AS con_cirugia
            FROM especie_alojamiento_unidad eu
            INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?
            LIMIT 1
        ");
        $stmtCtx->execute([$idEspecieAlojUnidad, $idInstitucion]);
        $cur = $stmtCtx->fetch(\PDO::FETCH_ASSOC);
        if (!$cur) {
            throw new \Exception('Sujeto no encontrado o sin permiso.');
        }
        $tipoAnimal = (int)$cur['TipoAnimal'];
        $idInstCur = (int)$cur['IdInstitucion'];

        $peso = $cur['PesoSujetoKg'];
        if (array_key_exists('PesoSujetoKg', $payload)) {
            $raw = $payload['PesoSujetoKg'];
            $peso = ($raw === '' || $raw === null) ? null : (float)$raw;
        }

        $fechaNac = $cur['FechaNacimientoSujeto'];
        if (array_key_exists('FechaNacimientoSujeto', $payload)) {
            $raw = $payload['FechaNacimientoSujeto'];
            if ($raw === '' || $raw === null) {
                $fechaNac = null;
            } else {
                $fechaNac = substr(preg_replace('/[^0-9\-]/', '', (string)$raw), 0, 10);
                if ($fechaNac === '') {
                    $fechaNac = null;
                }
            }
        }

        $sexo = $cur['SexoSujeto'];
        if (array_key_exists('SexoSujeto', $payload)) {
            $sexo = $this->normalizeSexoSujeto($payload['SexoSujeto'] !== null && $payload['SexoSujeto'] !== ''
                ? (string)$payload['SexoSujeto'] : null);
        }

        $idCepa = $cur['idcepaA_sujeto'] !== null && $cur['idcepaA_sujeto'] !== '' ? (int)$cur['idcepaA_sujeto'] : null;
        if (array_key_exists('idcepaA_sujeto', $payload)) {
            $raw = $payload['idcepaA_sujeto'];
            $idCepa = ($raw === '' || $raw === null) ? null : (int)$raw;
        }

        if ($idCepa) {
            $st = $this->db->prepare("SELECT 1 FROM cepa WHERE idcepaA = ? AND idespA = ? LIMIT 1");
            $st->execute([$idCepa, $tipoAnimal]);
            if (!$st->fetchColumn()) {
                throw new \Exception('La cepa no corresponde a la especie del alojamiento.');
            }
        }

        $idSub = $cur['idsubespA_sujeto'] !== null && $cur['idsubespA_sujeto'] !== '' ? (int)$cur['idsubespA_sujeto'] : null;
        if (array_key_exists('idsubespA_sujeto', $payload)) {
            $raw = $payload['idsubespA_sujeto'];
            $idSub = ($raw === '' || $raw === null) ? null : (int)$raw;
        }

        if ($idSub) {
            $st = $this->db->prepare("
                SELECT 1 FROM subespecie s
                INNER JOIN especiee e ON s.idespA = e.idespA
                WHERE s.idsubespA = ? AND s.idespA = ? AND e.IdInstitucion = ?
                LIMIT 1
            ");
            $st->execute([$idSub, $tipoAnimal, $idInstCur]);
            if (!$st->fetchColumn()) {
                throw new \Exception('La subespecie no corresponde a la especie o institución del alojamiento.');
            }
        }

        $conCir = (int)($cur['con_cirugia'] ?? 0);
        if (array_key_exists('con_cirugia', $payload)) {
            $raw = $payload['con_cirugia'];
            $conCir = ($raw === true || $raw === 1 || $raw === '1' || $raw === 'on' || $raw === 'yes') ? 1 : 0;
        }

        $sql = "UPDATE especie_alojamiento_unidad eu
                INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
                SET eu.PesoSujetoKg = ?, eu.FechaNacimientoSujeto = ?, eu.SexoSujeto = ?, eu.idcepaA_sujeto = ?, eu.idsubespA_sujeto = ?, eu.con_cirugia = ?
                WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$peso, $fechaNac, $sexo, $idCepa, $idSub, $conCir, $idEspecieAlojUnidad, $idInstitucion]);
        Auditoria::log($this->db, 'UPDATE', 'especie_alojamiento_unidad', "Ficha bio sujeto IdEspecieAlojUnidad: $idEspecieAlojUnidad");
        return true;
    }

    /** Alterna con_cirugia (0/1) para el sujeto en el tramo actual. */
    public function toggleConCirugia(int $idEspecieAlojUnidad, int $idInstitucion): int {
        $stmt = $this->db->prepare(
            'SELECT COALESCE(eu.con_cirugia, 0) FROM especie_alojamiento_unidad eu
             INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
             INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
             WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?
             LIMIT 1'
        );
        $stmt->execute([$idEspecieAlojUnidad, $idInstitucion]);
        $cur = $stmt->fetchColumn();
        if ($cur === false) {
            throw new \Exception('Sujeto no encontrado o sin permiso.');
        }
        $next = ((int)$cur) ? 0 : 1;
        $sql = 'UPDATE especie_alojamiento_unidad eu
                INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
                SET eu.con_cirugia = ?
                WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?';
        $this->db->prepare($sql)->execute([$next, $idEspecieAlojUnidad, $idInstitucion]);
        Auditoria::log($this->db, 'UPDATE', 'especie_alojamiento_unidad', "Toggle cirugía IdEspecieAlojUnidad: $idEspecieAlojUnidad -> $next");
        return $next;
    }

    /**
     * Solo cambia la etiqueta tras " - "; el prefijo de caja no es modificable.
     *
     * @param string $nombreOEtiqueta etiqueta libre o nombre completo (compatibilidad)
     */
    public function renameCaja(int $id, int $idInstitucion, string $nombreOEtiqueta): bool {
        $stmt = $this->db->prepare(
            'SELECT ac.NombreCaja FROM alojamiento_caja ac
             INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
             WHERE ac.IdCajaAlojamiento = ? AND a.IdInstitucion = ?
             LIMIT 1'
        );
        $stmt->execute([$id, $idInstitucion]);
        $actual = $stmt->fetchColumn();
        if ($actual === false) {
            throw new \Exception('La caja no existe o no pertenece a su institución.');
        }
        $actualStr = (string)$actual;
        $prefijo = $this->prefijoCajaDesdeNombreCompleto($actualStr);
        $etiqueta = $this->normalizarEtiquetaCajaRecibida($nombreOEtiqueta, $prefijo, $actualStr);
        $nuevo = $prefijo . ' - ' . $etiqueta;
        $res = $this->db->prepare('UPDATE alojamiento_caja SET NombreCaja = ? WHERE IdCajaAlojamiento = ?')->execute([$nuevo, $id]);
        Auditoria::log($this->db, 'UPDATE', 'alojamiento_caja', "Renombró caja ID: $id");
        return (bool)$res;
    }

    /**
     * Actualiza solo ubicación física de la caja (FKs opcionales + comentario).
     */
    public function updateCajaUbicacion(int $idCaja, int $idInstitucion, array $ubicacion): bool {
        $stmt = $this->db->prepare("
            SELECT ac.IdCajaAlojamiento FROM alojamiento_caja ac
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            WHERE ac.IdCajaAlojamiento = ? AND a.IdInstitucion = ?
        ");
        $stmt->execute([$idCaja, $idInstitucion]);
        if (!$stmt->fetchColumn()) {
            throw new \Exception('La caja no existe o no pertenece a su institución.');
        }

        $idUf = array_key_exists('IdUbicacionFisica', $ubicacion) && $ubicacion['IdUbicacionFisica'] !== '' && $ubicacion['IdUbicacionFisica'] !== null
            ? (int)$ubicacion['IdUbicacionFisica'] : null;
        $idSalon = array_key_exists('IdSalon', $ubicacion) && $ubicacion['IdSalon'] !== '' && $ubicacion['IdSalon'] !== null
            ? (int)$ubicacion['IdSalon'] : null;
        $idRack = array_key_exists('IdRack', $ubicacion) && $ubicacion['IdRack'] !== '' && $ubicacion['IdRack'] !== null
            ? (int)$ubicacion['IdRack'] : null;
        $idLugarRack = array_key_exists('IdLugarRack', $ubicacion) && $ubicacion['IdLugarRack'] !== '' && $ubicacion['IdLugarRack'] !== null
            ? (int)$ubicacion['IdLugarRack'] : null;
        $comUbic = array_key_exists('ComentarioUbicacion', $ubicacion)
            ? substr(trim((string)$ubicacion['ComentarioUbicacion']), 0, 500) : null;
        if ($comUbic === '') {
            $comUbic = null;
        }

        if ($idUf !== null || $idSalon !== null || $idRack !== null || $idLugarRack !== null) {
            $ubModel = new AlojamientoUbicacionModel($this->db);
            $ubModel->assertUbicacionParaCaja($idInstitucion, $idUf, $idSalon, $idRack, $idLugarRack);
        }

        $sql = "UPDATE alojamiento_caja SET IdUbicacionFisica = ?, IdSalon = ?, IdRack = ?, IdLugarRack = ?, ComentarioUbicacion = ? WHERE IdCajaAlojamiento = ?";
        $res = $this->db->prepare($sql)->execute([$idUf, $idSalon, $idRack, $idLugarRack, $comUbic, $idCaja]);
        Auditoria::log($this->db, 'UPDATE', 'alojamiento_caja', "Ubicación caja ID: $idCaja");
        return (bool)$res;
    }

    public function deleteCaja($idCaja) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("DELETE o FROM observacion_alojamiento_unidad o INNER JOIN especie_alojamiento_unidad e ON o.IdEspecieAlojUnidad = e.IdEspecieAlojUnidad WHERE e.IdCajaAlojamiento = ?")->execute([$idCaja]);
            $this->db->prepare("DELETE FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?")->execute([$idCaja]);
            $this->db->prepare("DELETE FROM alojamiento_caja WHERE IdCajaAlojamiento = ?")->execute([$idCaja]);
            
            Auditoria::log($this->db, 'DELETE', 'alojamiento_caja', "Eliminó caja ID: $idCaja");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function deleteSujeto($idUnidad) {
        $this->db->beginTransaction();
        try {
            $this->db->prepare("DELETE FROM observacion_alojamiento_unidad WHERE IdEspecieAlojUnidad = ?")->execute([$idUnidad]);
            $this->db->prepare("DELETE FROM especie_alojamiento_unidad WHERE IdEspecieAlojUnidad = ?")->execute([$idUnidad]);
            
            Auditoria::log($this->db, 'DELETE', 'especie_alojamiento_unidad', "Eliminó sujeto ID: $idUnidad");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    private function valorObservacionClinicaVacio($raw): bool {
        if ($raw === null) {
            return true;
        }
        if (is_string($raw)) {
            return trim($raw) === '';
        }

        return false;
    }

    private function columnaValorObservacionPorTipo(?string $tipo): string {
        $t = strtolower(trim((string)$tipo));
        if ($t === 'int') {
            return 'DatoObsInt';
        }
        if ($t === 'date') {
            return 'DatoObsFecha';
        }
        if ($t === 'varchar' || $t === 'var') {
            return 'DatoObsVar';
        }

        return 'DatoObsText';
    }

    public function insertarObservaciones($idUnidad, $fechaObs, $valores, $idInstitucion) {
        $ctx = $this->getUnidadTrazContext((int)$idUnidad, $idInstitucion);
        if (!$ctx) {
            throw new \Exception('Sujeto no encontrado o sin permiso.');
        }
        $idEsp = (int)$ctx['idEspA'];
        $idProt = isset($ctx['idprotA']) && $ctx['idprotA'] !== null && $ctx['idprotA'] !== ''
            ? (int)$ctx['idprotA'] : null;
        $permitidas = $this->listCategoriasTrazPorContexto($idEsp, $idProt, self::TRAZ_ALCANCE_DATOS);
        $permitidasIds = [];
        foreach ($permitidas as $c) {
            $permitidasIds[(int)$c['IdDatosUnidadAloj']] = true;
        }

        $this->db->beginTransaction();
        try {
            $stmtMax = $this->db->query('SELECT MAX(id_fila_obs) FROM observacion_alojamiento_unidad');
            $newFilaId = (int)$stmtMax->fetchColumn() + 1;

            $insertados = 0;
            foreach ($valores as $item) {
                $idCat = (int)($item['IdDatosUnidadAloj'] ?? 0);
                if ($idCat <= 0) {
                    continue;
                }
                if (empty($permitidasIds[$idCat])) {
                    throw new \Exception('Variable clínica no permitida para este protocolo y especie.');
                }
                $valorRaw = $item['valor'] ?? null;
                if ($this->valorObservacionClinicaVacio($valorRaw)) {
                    continue;
                }

                $stmt = $this->db->prepare('SELECT TipoDeDato FROM categoriadatosunidadalojamiento WHERE IdDatosUnidadAloj = ?');
                $stmt->execute([$idCat]);
                $tipo = $stmt->fetchColumn();
                $columna = $this->columnaValorObservacionPorTipo($tipo ? (string)$tipo : null);

                $sql = "INSERT INTO observacion_alojamiento_unidad (fechaObs, IdEspecieAlojUnidad, IdDatosUnidadAloj, {$columna}, id_fila_obs, es_inicio_traz)
                        VALUES (?, ?, ?, ?, ?, 0)";
                $this->db->prepare($sql)->execute([$fechaObs, $idUnidad, $idCat, $valorRaw, $newFilaId]);
                ++$insertados;
            }

            if ($insertados === 0) {
                throw new \Exception('Indique al menos un dato clínico para guardar (el resto puede quedar vacío).');
            }

            Auditoria::log($this->db, 'INSERT', 'observacion_alojamiento_unidad', "Cargó métricas al sujeto ID: $idUnidad");
            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Guarda o actualiza valores de variables de inicio (una fila por categoría y sujeto).
     *
     * @param array<int, array{IdDatosUnidadAloj:int|string, valor:mixed}> $valores
     */
    public function upsertObservacionesInicio(int $idUnidad, array $valores, int $idInstitucion): bool {
        $ctx = $this->getUnidadTrazContext($idUnidad, $idInstitucion);
        if (!$ctx) {
            throw new \Exception('Sujeto no encontrado o sin permiso.');
        }
        $idEsp = (int)$ctx['idEspA'];
        $idProt = isset($ctx['idprotA']) && $ctx['idprotA'] !== null && $ctx['idprotA'] !== ''
            ? (int)$ctx['idprotA'] : null;
        $permitidas = $this->listCategoriasTrazPorContexto($idEsp, $idProt, self::TRAZ_ALCANCE_INICIO);
        $permitidasIds = [];
        foreach ($permitidas as $c) {
            $permitidasIds[(int)$c['IdDatosUnidadAloj']] = true;
        }

        $this->db->beginTransaction();
        try {
            $del = $this->db->prepare(
                'DELETE FROM observacion_alojamiento_unidad WHERE IdEspecieAlojUnidad = ? AND IdDatosUnidadAloj = ? AND COALESCE(es_inicio_traz, 0) = 1'
            );
            $stmtTipo = $this->db->prepare('SELECT TipoDeDato FROM categoriadatosunidadalojamiento WHERE IdDatosUnidadAloj = ?');

            foreach ($valores as $item) {
                $idCat = (int)($item['IdDatosUnidadAloj'] ?? 0);
                if ($idCat <= 0 || empty($permitidasIds[$idCat])) {
                    continue;
                }
                $valorRaw = $item['valor'] ?? null;
                if ($valorRaw === null || $valorRaw === '') {
                    continue;
                }

                $stmtTipo->execute([$idCat]);
                $tipo = $stmtTipo->fetchColumn();
                $columna = $this->columnaValorObservacionPorTipo($tipo ? (string)$tipo : null);

                $del->execute([$idUnidad, $idCat]);
                $fechaIni = date('Y-m-d');
                $sql = "INSERT INTO observacion_alojamiento_unidad (fechaObs, IdEspecieAlojUnidad, IdDatosUnidadAloj, {$columna}, id_fila_obs, es_inicio_traz)
                        VALUES (?, ?, ?, ?, NULL, 1)";
                $this->db->prepare($sql)->execute([$fechaIni, $idUnidad, $idCat, $valorRaw]);
            }

            Auditoria::log($this->db, 'INSERT', 'observacion_alojamiento_unidad', "Actualizó variables de inicio trazabilidad sujeto ID: $idUnidad");
            $this->db->commit();

            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function addSujeto(int $idCaja, int $idAlojamiento, string $nombreSujetoInput, int $idInstitucion) {
        $stmtOk = $this->db->prepare(
            'SELECT ac.NombreCaja FROM alojamiento_caja ac
             INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
             WHERE ac.IdCajaAlojamiento = ? AND ac.IdAlojamiento = ? AND a.IdInstitucion = ?
             LIMIT 1'
        );
        $stmtOk->execute([$idCaja, $idAlojamiento, $idInstitucion]);
        $nombreCajaRow = $stmtOk->fetchColumn();
        if ($nombreCajaRow === false) {
            throw new \Exception('La caja no corresponde al alojamiento o no tiene permiso.');
        }

        $stmtHist = $this->db->prepare('SELECT historia FROM alojamiento WHERE IdAlojamiento = ? AND IdInstitucion = ?');
        $stmtHist->execute([$idAlojamiento, $idInstitucion]);
        $historia = $stmtHist->fetchColumn();
        if ($historia === false) {
            throw new \Exception('Alojamiento no encontrado o sin permiso.');
        }

        $stmtMaxAnimal = $this->db->prepare("
            SELECT MAX(eu.IdUnidadAlojamiento) FROM especie_alojamiento_unidad eu
            INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.historia = ?
        ");
        $stmtMaxAnimal->execute([$historia]);
        $ultimoIdAnimal = (int)$stmtMaxAnimal->fetchColumn() + 1;

        $prefijoCaja = $this->prefijoCajaDesdeNombreCompleto((string)$nombreCajaRow);

        $nombreFinal = "{$prefijoCaja} - S{$ultimoIdAnimal} - {$nombreSujetoInput}";

        $res = $this->db->prepare("INSERT INTO especie_alojamiento_unidad (IdUnidadAlojamiento, NombreEspecieAloj, IdCajaAlojamiento) VALUES (?, ?, ?)")
                        ->execute([$ultimoIdAnimal, $nombreFinal, $idCaja]);
        
        Auditoria::log($this->db, 'INSERT', 'especie_alojamiento_unidad', "Agregó Sujeto $nombreFinal a la caja ID: $idCaja");
        return $res;
    }

    public function getCajasTramoAnterior($idAlojamientoActual) {
        $stmtHist = $this->db->prepare("SELECT historia FROM alojamiento WHERE IdAlojamiento = ?");
        $stmtHist->execute([$idAlojamientoActual]);
        $historia = $stmtHist->fetchColumn();

        $stmtCajasHist = $this->db->prepare("
            SELECT ac.IdCajaAlojamiento, ac.NombreCaja, ac.Detalle 
            FROM alojamiento_caja ac
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            WHERE a.historia = ? AND a.IdAlojamiento < ?
            ORDER BY ac.IdCajaAlojamiento DESC
        ");
        $stmtCajasHist->execute([$historia, $idAlojamientoActual]);
        $allCajas = $stmtCajasHist->fetchAll(\PDO::FETCH_ASSOC);

        $stmtCajasAct = $this->db->prepare("SELECT NombreCaja FROM alojamiento_caja WHERE IdAlojamiento = ?");
        $stmtCajasAct->execute([$idAlojamientoActual]);
        $cajasActuales = $stmtCajasAct->fetchAll(\PDO::FETCH_COLUMN);

        $cajasUnicas = [];
        $nombresVistos = [];

        foreach($allCajas as $caja) {
            if (!in_array($caja['NombreCaja'], $nombresVistos)) {
                $nombresVistos[] = $caja['NombreCaja'];
                $caja['ya_existe'] = in_array($caja['NombreCaja'], $cajasActuales);
                
                $stmtU = $this->db->prepare("SELECT IdEspecieAlojUnidad, IdUnidadAlojamiento, NombreEspecieAloj FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
                $stmtU->execute([$caja['IdCajaAlojamiento']]);
                $unidades = $stmtU->fetchAll(\PDO::FETCH_ASSOC);

                $stmtUAct = $this->db->prepare("
                    SELECT 1 FROM especie_alojamiento_unidad eu 
                    INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                    WHERE ac.IdAlojamiento = ? AND eu.IdUnidadAlojamiento = ?
                ");
                
                foreach($unidades as &$u) {
                    $stmtUAct->execute([$idAlojamientoActual, $u['IdUnidadAlojamiento']]);
                    $u['ya_existe'] = (bool)$stmtUAct->fetchColumn();
                }

                $caja['unidades'] = $unidades;
                $cajasUnicas[] = $caja;
            }
        }
        return $cajasUnicas;
    }

    public function clonarCajasBajoDemanda($idAlojamientoActual, $cajasIds, $unidadesIds) {
        $this->db->beginTransaction();
        try {
            $stmtAloj = $this->db->prepare("SELECT fechavisado FROM alojamiento WHERE IdAlojamiento = ?");
            $stmtAloj->execute([$idAlojamientoActual]);
            $fecha = $stmtAloj->fetchColumn();

            foreach ($cajasIds as $oldIdCaja) {
                $stmtCaja = $this->db->prepare("SELECT * FROM alojamiento_caja WHERE IdCajaAlojamiento = ?");
                $stmtCaja->execute([$oldIdCaja]);
                $oldCaja = $stmtCaja->fetch(\PDO::FETCH_ASSOC);

                if ($oldCaja) {
                    $this->db->prepare(
                        "INSERT INTO alojamiento_caja (FechaInicio, Detalle, NombreCaja, IdAlojamiento, IdUbicacionFisica, IdSalon, IdRack, IdLugarRack, ComentarioUbicacion)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                    )->execute([
                        $fecha,
                        $oldCaja['Detalle'] ?? null,
                        $oldCaja['NombreCaja'],
                        $idAlojamientoActual,
                        $oldCaja['IdUbicacionFisica'] ?? null,
                        $oldCaja['IdSalon'] ?? null,
                        $oldCaja['IdRack'] ?? null,
                        $oldCaja['IdLugarRack'] ?? null,
                        $oldCaja['ComentarioUbicacion'] ?? null,
                    ]);
                    $newIdCaja = $this->db->lastInsertId();

                    $stmtU = $this->db->prepare("SELECT * FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ?");
                    $stmtU->execute([$oldIdCaja]);
                    $unidades = $stmtU->fetchAll(\PDO::FETCH_ASSOC);

                    foreach ($unidades as $u) {
                        if (in_array($u['IdEspecieAlojUnidad'], $unidadesIds)) {
                            $this->db->prepare(
                                "INSERT INTO especie_alojamiento_unidad (
                                    IdUnidadAlojamiento, NombreEspecieAloj, DetalleEspecieAloj, IdCajaAlojamiento,
                                    PesoSujetoKg, FechaNacimientoSujeto, SexoSujeto, idcepaA_sujeto, CategoriaRazaSujeto, idsubespA_sujeto, con_cirugia
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                            )->execute([
                                $u['IdUnidadAlojamiento'],
                                $u['NombreEspecieAloj'],
                                $u['DetalleEspecieAloj'] ?? null,
                                $newIdCaja,
                                $u['PesoSujetoKg'] ?? null,
                                $u['FechaNacimientoSujeto'] ?? null,
                                $u['SexoSujeto'] ?? null,
                                $u['idcepaA_sujeto'] ?? null,
                                $u['CategoriaRazaSujeto'] ?? null,
                                $u['idsubespA_sujeto'] ?? null,
                                isset($u['con_cirugia']) ? (int)$u['con_cirugia'] : 0,
                            ]);
                        }
                    }
                }
            }
            Auditoria::log($this->db, 'CLONADO', 'alojamiento_caja', "Clonó cajas previas al tramo ID: $idAlojamientoActual");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    /**
     * Fichas de todos los sujetos de una caja en el tramo actual (misma API que sujeto, agrupadas).
     */
    public function getFichaCajaAgrupada(int $idCajaAlojamiento, int $idInstitucion): ?array {
        $stmt = $this->db->prepare("
            SELECT ac.IdCajaAlojamiento, ac.NombreCaja, a.IdAlojamiento, a.historia, a.TipoAnimal,
                   i.NombreInst AS NombreInstitucion, esp.EspeNombreA AS NombreEspecie
            FROM alojamiento_caja ac
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
            INNER JOIN institucion i ON a.IdInstitucion = i.IdInstitucion
            LEFT JOIN especiee esp ON esp.idespA = a.TipoAnimal
            WHERE ac.IdCajaAlojamiento = ? AND a.IdInstitucion = ?
            LIMIT 1
        ");
        $stmt->execute([$idCajaAlojamiento, $idInstitucion]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $stmtU = $this->db->prepare("SELECT IdEspecieAlojUnidad FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ? ORDER BY IdEspecieAlojUnidad ASC");
        $stmtU->execute([$idCajaAlojamiento]);
        $ids = $stmtU->fetchAll(\PDO::FETCH_COLUMN) ?: [];
        $fichas = [];
        foreach ($ids as $idEu) {
            $f = $this->getFichaAnimalCompleta((int)$idEu, $idInstitucion);
            if ($f) {
                $fichas[] = $f;
            }
        }

        return [
            'scope' => 'caja',
            'IdCajaAlojamiento' => (int)$row['IdCajaAlojamiento'],
            'NombreCaja' => $row['NombreCaja'],
            'historia' => (int)$row['historia'],
            'IdAlojamiento' => (int)$row['IdAlojamiento'],
            'NombreInstitucion' => $row['NombreInstitucion'],
            'NombreEspecie' => $row['NombreEspecie'],
            'IdEspecieFicha' => (int)($row['TipoAnimal'] ?? 0),
            'fichasSujetos' => $fichas,
        ];
    }

    /**
     * Fichas de todos los sujetos de todas las cajas de un tramo de alojamiento.
     */
    public function getFichaAlojamientoAgrupada(int $idAlojamiento, int $idInstitucion): ?array {
        $stmt = $this->db->prepare("
            SELECT a.IdAlojamiento, a.historia, a.TipoAnimal,
                   i.NombreInst AS NombreInstitucion, esp.EspeNombreA AS NombreEspecie
            FROM alojamiento a
            INNER JOIN institucion i ON a.IdInstitucion = i.IdInstitucion
            LEFT JOIN especiee esp ON esp.idespA = a.TipoAnimal
            WHERE a.IdAlojamiento = ? AND a.IdInstitucion = ?
            LIMIT 1
        ");
        $stmt->execute([$idAlojamiento, $idInstitucion]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $stmtC = $this->db->prepare("SELECT IdCajaAlojamiento, NombreCaja FROM alojamiento_caja WHERE IdAlojamiento = ? ORDER BY IdCajaAlojamiento ASC");
        $stmtC->execute([$idAlojamiento]);
        $cajas = $stmtC->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $grupos = [];
        foreach ($cajas as $c) {
            $idCaja = (int)$c['IdCajaAlojamiento'];
            $stmtU = $this->db->prepare("SELECT IdEspecieAlojUnidad FROM especie_alojamiento_unidad WHERE IdCajaAlojamiento = ? ORDER BY IdEspecieAlojUnidad ASC");
            $stmtU->execute([$idCaja]);
            $ids = $stmtU->fetchAll(\PDO::FETCH_COLUMN) ?: [];
            $fichas = [];
            foreach ($ids as $idEu) {
                $f = $this->getFichaAnimalCompleta((int)$idEu, $idInstitucion);
                if ($f) {
                    $fichas[] = $f;
                }
            }
            $grupos[] = [
                'IdCajaAlojamiento' => $idCaja,
                'NombreCaja' => $c['NombreCaja'],
                'fichasSujetos' => $fichas,
            ];
        }

        return [
            'scope' => 'alojamiento',
            'IdAlojamiento' => (int)$row['IdAlojamiento'],
            'historia' => (int)$row['historia'],
            'NombreInstitucion' => $row['NombreInstitucion'],
            'NombreEspecie' => $row['NombreEspecie'],
            'IdEspecieFicha' => (int)($row['TipoAnimal'] ?? 0),
            'grupos' => $grupos,
        ];
    }
}