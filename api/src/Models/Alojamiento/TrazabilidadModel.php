<?php
namespace App\Models\Alojamiento;
use PDO;
use App\Utils\Auditoria;

class TrazabilidadModel {
    private $db;
    public function __construct($db) { $this->db = $db; }

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

    /**
     * Observaciones agrupadas por fila (misma lógica que el árbol de trazabilidad).
     */
    private function fetchObservacionesPivotForUnidad(int $idEspecieAlojUnidad): array {
        $stmtObs = $this->db->prepare("
            SELECT o.fechaObs, o.id_fila_obs, c.NombreCatAlojUnidad as CategoriaNombre,
                   COALESCE(o.DatoObsVar, o.DatoObsText, CAST(o.DatoObsInt AS CHAR), CAST(o.DatoObsFecha AS CHAR)) as Valor
            FROM observacion_alojamiento_unidad o
            INNER JOIN categoriadatosunidadalojamiento c ON o.IdDatosUnidadAloj = c.IdDatosUnidadAloj
            WHERE o.IdEspecieAlojUnidad = ?
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
                   c0.CepaNombreA AS CepaNombreSujeto,
                   sp0.SubEspeNombreA AS SubespecieNombreSujeto,
                   a.IdAlojamiento AS IdAlojamientoTramoActual, a.historia, a.TipoAnimal, a.IdInstitucion,
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

        $stmtCat = $this->db->prepare("SELECT * FROM categoriadatosunidadalojamiento WHERE IdEspA = ? ORDER BY IdDatosUnidadAloj ASC");
        $stmtCat->execute([$idEspA]);
        $categorias = $stmtCat->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $stmtTr = $this->db->prepare("
            SELECT eu.IdEspecieAlojUnidad,
                   eu.PesoSujetoKg, eu.FechaNacimientoSujeto, eu.SexoSujeto, eu.idcepaA_sujeto, eu.CategoriaRazaSujeto, eu.idsubespA_sujeto,
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
            ],
            'NombreEspecie' => $base['NombreEspecie'],
            'NombreInstitucion' => $base['NombreInstitucion'],
            'historia' => $historia,
            'fechaInicioSeguimiento' => $fechaInicio,
            'fechaNacimientoSugerida' => $fechaNacSugerida,
            'ultimoTramo' => $ultimo,
            'tramos' => $tramos,
            'categorias' => $categorias,
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

        $stmtCat = $this->db->prepare("SELECT * FROM categoriadatosunidadalojamiento WHERE IdEspA = ?");
        $stmtCat->execute([$idEspecie]);
        $categorias = $stmtCat->fetchAll(\PDO::FETCH_ASSOC) ?: []; 

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
                $unidad['observaciones_pivot'] = $this->fetchObservacionesPivotForUnidad((int)$unidad['IdEspecieAlojUnidad']);
            }
        }
        return ['cajas' => $cajas, 'categorias' => $categorias, 'tipoAlojamiento' => $tipoAlojamiento, 'limiteCajas' => $limiteCajas];
    }

    public function crearCajaYUnidades($idAlojamiento, $nombreCaja, $cantidadUnidades, $idInstitucion, array $ubicacion = null) {
        $stmtCheck = $this->db->prepare("SELECT IdAlojamiento, fechavisado, historia FROM alojamiento WHERE IdAlojamiento = ? AND IdInstitucion = ?");
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
            
            $prefijoCaja = "A" . $numeroSiguiente;
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

    public function renameSujeto($idUnidad, $nuevoNombre) {
        $stmt = $this->db->prepare("UPDATE especie_alojamiento_unidad SET NombreEspecieAloj = ? WHERE IdEspecieAlojUnidad = ?");
        $res = $stmt->execute([$nuevoNombre, $idUnidad]);
        Auditoria::log($this->db, 'UPDATE', 'especie_alojamiento_unidad', "Renombró sujeto ID: $idUnidad");
        return $res;
    }

    /**
     * Actualiza datos de ficha del sujeto para este tramo (fila especie_alojamiento_unidad).
     * Cualquier clave omitida en $payload conserva el valor ya guardado.
     */
    public function updateSujetoFichaBio(int $idEspecieAlojUnidad, int $idInstitucion, array $payload): bool {
        $stmtCtx = $this->db->prepare("
            SELECT a.TipoAnimal, a.IdInstitucion, eu.PesoSujetoKg, eu.FechaNacimientoSujeto, eu.SexoSujeto, eu.idcepaA_sujeto, eu.idsubespA_sujeto
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

        $sql = "UPDATE especie_alojamiento_unidad eu
                INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
                SET eu.PesoSujetoKg = ?, eu.FechaNacimientoSujeto = ?, eu.SexoSujeto = ?, eu.idcepaA_sujeto = ?, eu.idsubespA_sujeto = ?
                WHERE eu.IdEspecieAlojUnidad = ? AND a.IdInstitucion = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$peso, $fechaNac, $sexo, $idCepa, $idSub, $idEspecieAlojUnidad, $idInstitucion]);
        Auditoria::log($this->db, 'UPDATE', 'especie_alojamiento_unidad', "Ficha bio sujeto IdEspecieAlojUnidad: $idEspecieAlojUnidad");
        return true;
    }

    public function renameCaja($id, $nombre) {
        $res = $this->db->prepare("UPDATE alojamiento_caja SET NombreCaja = ? WHERE IdCajaAlojamiento = ?")->execute([$nombre, $id]);
        Auditoria::log($this->db, 'UPDATE', 'alojamiento_caja', "Renombró caja ID: $id");
        return $res;
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

    public function insertarObservaciones($idUnidad, $fechaObs, $valores, $idInstitucion) {
        $this->db->beginTransaction();
        try {
            $stmtMax = $this->db->query("SELECT MAX(id_fila_obs) FROM observacion_alojamiento_unidad");
            $newFilaId = (int)$stmtMax->fetchColumn() + 1;

            foreach ($valores as $item) {
                $idCat = $item['IdDatosUnidadAloj'];
                $valorRaw = $item['valor'];

                $stmt = $this->db->prepare("SELECT TipoDeDato FROM categoriadatosunidadalojamiento WHERE IdDatosUnidadAloj = ?");
                $stmt->execute([$idCat]);
                $tipo = $stmt->fetchColumn();

                $columna = 'DatoObsText';
                if ($tipo == 'int') $columna = 'DatoObsInt';
                if ($tipo == 'date') $columna = 'DatoObsFecha';
                if ($tipo == 'var') $columna = 'DatoObsVar';

                $sql = "INSERT INTO observacion_alojamiento_unidad (fechaObs, IdEspecieAlojUnidad, IdDatosUnidadAloj, {$columna}, id_fila_obs) 
                        VALUES (?, ?, ?, ?, ?)";
                $this->db->prepare($sql)->execute([$fechaObs, $idUnidad, $idCat, $valorRaw, $newFilaId]);
            }
            
            Auditoria::log($this->db, 'INSERT', 'observacion_alojamiento_unidad', "Cargó métricas al sujeto ID: $idUnidad");
            $this->db->commit();
            return true;
        } catch (\Exception $e) { $this->db->rollBack(); throw $e; }
    }

    public function addSujeto($idCaja, $idAlojamiento, $nombreSujetoInput) {
        $stmtHist = $this->db->prepare("SELECT historia FROM alojamiento WHERE IdAlojamiento = ?");
        $stmtHist->execute([$idAlojamiento]);
        $historia = $stmtHist->fetchColumn();

        $stmtMaxAnimal = $this->db->prepare("
            SELECT MAX(eu.IdUnidadAlojamiento) FROM especie_alojamiento_unidad eu
            INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
            INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento WHERE a.historia = ?
        ");
        $stmtMaxAnimal->execute([$historia]);
        $ultimoIdAnimal = (int)$stmtMaxAnimal->fetchColumn() + 1;

        $stmtCaja = $this->db->prepare("SELECT NombreCaja FROM alojamiento_caja WHERE IdCajaAlojamiento = ?");
        $stmtCaja->execute([$idCaja]);
        $prefijoCaja = explode(' - ', $stmtCaja->fetchColumn())[0] ?? 'A0'; 

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
                                    PesoSujetoKg, FechaNacimientoSujeto, SexoSujeto, idcepaA_sujeto, CategoriaRazaSujeto, idsubespA_sujeto
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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