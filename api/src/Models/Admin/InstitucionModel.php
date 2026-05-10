<?php
namespace App\Models\Admin;

use PDO;
use Exception;
use App\Utils\Auditoria;
use App\Utils\ModulosInstitucion;

class InstitucionModel {
    private $db;

    /** @var string|false|null false = aún no resuelto; null = no existe columna de madre */
    private $madreGrupoColumnCache = false;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Nombre físico de la columna madre del grupo (p. ej. MadreGrupo o madre_grupo).
     */
    private function resolveMadreGrupoColumnName(): ?string {
        if ($this->madreGrupoColumnCache !== false) {
            return $this->madreGrupoColumnCache;
        }
        try {
            $stmt = $this->db->query('SHOW COLUMNS FROM `institucion`');
            $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            foreach ($rows as $r) {
                $field = (string)($r['Field'] ?? '');
                if ($field === '' || !preg_match('/^[a-zA-Z0-9_]+$/', $field)) {
                    continue;
                }
                // MadreGrupo, madre_grupo, MADREGRUPO, Madre, etc.
                if (preg_match('/^madre(_?grupo)?$/i', $field)) {
                    $this->madreGrupoColumnCache = $field;

                    return $field;
                }
            }
        } catch (\Throwable $e) {
            $this->madreGrupoColumnCache = null;

            return null;
        }
        $this->madreGrupoColumnCache = null;

        return null;
    }

    /** Misma lista que `AuthModel::sqlSelectInstitucionAllColumns` con prefijo `i.` */
    private function sqlSelectInstitucionAllColumnsIPrefixed(): string {
        $cols = 'IdInstitucion, NombreInst, PrecioJornadaTrabajoExp, DependenciaInstitucion, Web, Detalle, InstDir, '
            . 'InstContacto, InstCorreo, NombreCompletoInst, Logo, TipoApp, Moneda, Pais, Localidad, IdOrganismo, '
            . 'otrosceuas, FechaDepuracion, Activo, UltimoPago, TipoFacturacion, FechaContrato, tituloprecios, idioma, '
            . 'MadreGrupo, LogoEnPdf, ReservasRequierenAprobacion, ReservaQrTokenGeneral';
        $parts = array_map('trim', explode(',', $cols));

        return 'i.' . implode(', i.', $parts);
    }

    // Trae los módulos existentes en la app
    public function getModulosMaestros() {
        $rows = $this->db->query("SELECT IdModulosApp, NombreModulo FROM modulosapp")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $k = ModulosInstitucion::nombreModuloToKey($r['NombreModulo'] ?? '');
            $r['clave_modulo'] = $k ?? '';
        }
        unset($r);
        return $rows;
    }

    /**
     * @return array{0: string, 1: array<int, mixed>}
     */
    private function institutionSearchWhere(?string $q): array {
        if ($q === null || trim($q) === '') {
            return ['', []];
        }
        $needle = strtolower(trim($q));
        $qq = '%' . addcslashes($needle, '%_\\') . '%';
        $sql = ' AND (
            LOWER(CAST(i.IdInstitucion AS CHAR)) LIKE ?
            OR LOWER(COALESCE(i.NombreInst,\'\')) LIKE ?
            OR LOWER(COALESCE(i.Localidad,\'\')) LIKE ?
        )';

        return [$sql, [$qq, $qq, $qq]];
    }

    public function countInstitutionsFiltered(?string $q): int {
        [$w, $params] = $this->institutionSearchWhere($q);
        $sql = 'SELECT COUNT(*) FROM institucion i WHERE 1=1' . $w;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Asigna `modulos` y `estado_logico` por sede vía una query IN (…).
     *
     * @param array<int, array<string,mixed>> $instituciones
     */
    private function hydrateInstitucionesModulos(array &$instituciones): void {
        $ids = [];
        foreach ($instituciones as $inst) {
            $id = (int) ($inst['IdInstitucion'] ?? 0);
            if ($id > 0) {
                $ids[$id] = true;
            }
        }
        $idList = array_keys($ids);

        /** @var array<int, list<array<string,mixed>>> */
        $modsByInst = [];
        if ($idList !== []) {
            $placeholders = implode(',', array_fill(0, count($idList), '?'));
            $sqlMod = "SELECT ma.IdInstitucion, ma.IdModulosApp, app.NombreModulo, ma.Habilitado, ma.ActivoInvestigador
                       FROM modulosactivosinst ma
                       JOIN modulosapp app ON ma.IdModulosApp = app.IdModulosApp
                       WHERE ma.IdInstitucion IN ({$placeholders})";
            $stmtMod = $this->db->prepare($sqlMod);
            $stmtMod->execute($idList);
            while ($row = $stmtMod->fetch(PDO::FETCH_ASSOC)) {
                $iid = (int) ($row['IdInstitucion'] ?? 0);
                unset($row['IdInstitucion']);
                if ($iid <= 0) {
                    continue;
                }
                if (!isset($modsByInst[$iid])) {
                    $modsByInst[$iid] = [];
                }
                $modsByInst[$iid][] = $row;
            }
        }

        foreach ($instituciones as &$inst) {
            $iid = (int) ($inst['IdInstitucion'] ?? 0);
            $mods = $modsByInst[$iid] ?? [];

            foreach ($mods as &$m) {
                if ($m['Habilitado'] == 2) {
                    $m['estado_logico'] = 1;
                } elseif ($m['Habilitado'] == 1 && $m['ActivoInvestigador'] == 2) {
                    $m['estado_logico'] = 2;
                } elseif ($m['Habilitado'] == 1 && $m['ActivoInvestigador'] == 1) {
                    $m['estado_logico'] = 3;
                }
            }
            unset($m);
            $inst['modulos'] = $mods;
        }
        unset($inst);
    }

    /**
     * Una sede con la misma forma que filas del listado paginado (incl. `modulos`).
     */
    public function getInstitutionByIdForSuperadmin(int $id): ?array {
        if ($id <= 0) {
            return null;
        }
        $iCols = $this->sqlSelectInstitucionAllColumnsIPrefixed();
        $sql = "SELECT {$iCols} FROM institucion i WHERE i.IdInstitucion = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $list = [$row];
        $this->hydrateInstitucionesModulos($list);

        return $list[0];
    }

    /** Listado paginado + filtros (misma forma que filas del listado paginado). */
    public function getInstitutionsPaged(int $limit, int $offset, ?string $q): array {
        $iCols = $this->sqlSelectInstitucionAllColumnsIPrefixed();
        [$w, $params] = $this->institutionSearchWhere($q);
        $limit = max(0, $limit);
        $offset = max(0, $offset);
        $sql = "SELECT {$iCols} FROM institucion i WHERE 1=1 {$w} ORDER BY i.IdInstitucion DESC LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $instituciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->hydrateInstitucionesModulos($instituciones);

        return $instituciones;
    }

    /** Lista completa (tope 50 000 filas) — selects sin `limit` en API, exports. */
    public function getAllInstitutions() {
        return $this->getInstitutionsPaged(50000, 0, null);
    }

    public function crearInstitucionCompleta($data) {
        try {
            $this->db->beginTransaction();

            $mgCol = $this->resolveMadreGrupoColumnName();
            if ($mgCol === null || !preg_match('/^[a-zA-Z0-9_]+$/', $mgCol)) {
                throw new Exception('La tabla institucion no tiene columna MadreGrupo ni madre_grupo; no se puede guardar el flag de sede madre.');
            }

            $sql = "INSERT INTO institucion (
                        NombreInst, NombreCompletoInst, InstCorreo, Pais, Localidad, 
                        Moneda, Web, Logo, DependenciaInstitucion, otrosceuas, 
                        TipoApp, Activo, UltimoPago, PrecioJornadaTrabajoExp,
                        TipoFacturacion, FechaContrato, Detalle, `{$mgCol}`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $data['NombreInst'] ?? '', 
                $data['NombreCompletoInst'] ?? '', 
                $data['InstCorreo'] ?? '', 
                $data['Pais'] ?? 'Uruguay', 
                $data['Localidad'] ?? '', 
                $data['Moneda'] ?? 'UYU', 
                $data['Web'] ?? '', 
                $data['Logo'] ?? '', 
                $data['DependenciaInstitucion'] ?? '',
                (int)($data['otrosceuas'] ?? 2), 
                (int)($data['TipoApp'] ?? 1), 
                (int)($data['Activo'] ?? 1), 
                $data['UltimoPago'] ?: null, 
                0, 
                (int)($data['TipoFacturacion'] ?? 1), 
                $data['FechaContrato'] ?: null, 
                $data['Detalle'] ?? '',
                (int)($data['madre_grupo'] ?? 0),
            ]);
            
            $idNew = $this->db->lastInsertId();

            // Guardamos los módulos
            $this->procesarModulos($idNew, $data['modulos']);

            $this->configurarSedesBase($idNew);
            // $this->sincronizarMenus($idNew, $data['modulos']); // Lo dejo comentado porque la sincro de menús cambia con la nueva tabla, lo podemos hacer luego.

            Auditoria::log($this->db, 'INSERT', 'institucion', "SuperAdmin registró la sede: " . $data['NombreInst']);

            $this->db->commit();
            return $idNew;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function updateInstitucion($id, $data) {
        try {
            $this->db->beginTransaction();

            $mgCol = $this->resolveMadreGrupoColumnName();
            if ($mgCol === null || !preg_match('/^[a-zA-Z0-9_]+$/', $mgCol)) {
                throw new Exception('La tabla institucion no tiene columna MadreGrupo ni madre_grupo; no se puede guardar el flag de sede madre.');
            }

            $sql = "UPDATE institucion SET 
                        NombreInst = ?, NombreCompletoInst = ?, InstCorreo = ?, 
                        Pais = ?, Localidad = ?, Moneda = ?, Web = ?, 
                        Logo = ?, DependenciaInstitucion = ?, otrosceuas = ?, 
                        TipoApp = ?, Activo = ?, UltimoPago = ?,
                        TipoFacturacion = ?, FechaContrato = ?, Detalle = ?,
                        `{$mgCol}` = ?
                    WHERE IdInstitucion = ?";

            $this->db->prepare($sql)->execute([
                $data['NombreInst'] ?? '',
                $data['NombreCompletoInst'] ?? '',
                $data['InstCorreo'] ?? '',
                $data['Pais'] ?? 'Uruguay',
                $data['Localidad'] ?? '',
                $data['Moneda'] ?? 'UYU',
                $data['Web'] ?? '',
                $data['Logo'] ?? '',
                $data['DependenciaInstitucion'] ?? '',
                (int)($data['otrosceuas'] ?? 2),
                (int)($data['TipoApp'] ?? 1),
                (int)($data['Activo'] ?? 1),
                $data['UltimoPago'] ?: null,
                (int)($data['TipoFacturacion'] ?? 1),
                $data['FechaContrato'] ?: null,
                $data['Detalle'] ?? '',
                (int)($data['madre_grupo'] ?? 0),
                $id
            ]);

            // Upsert de los Módulos
            $this->procesarModulos($id, $data['modulos']);

            Auditoria::log($this->db, 'UPDATE', 'institucion', "SuperAdmin editó sede ID: " . $id);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    // --- NUEVO: Procesador de Módulos (Insert o Update) ---
    private function procesarModulos($idInst, $modulosList) {
        if (!$modulosList || !is_array($modulosList)) return;

        $validIds = $this->db->query('SELECT IdModulosApp FROM modulosapp')->fetchAll(PDO::FETCH_COLUMN);
        $validSet = array_map('intval', $validIds ?: []);

        // Validamos si ya existe el registro para saber si hacer UPDATE o INSERT
        $checkStmt = $this->db->prepare("SELECT ModulosActivosInstId FROM modulosactivosinst WHERE IdInstitucion = ? AND IdModulosApp = ?");
        $updateStmt = $this->db->prepare("UPDATE modulosactivosinst SET Habilitado = ?, ActivoInvestigador = ? WHERE IdInstitucion = ? AND IdModulosApp = ?");
        $insertStmt = $this->db->prepare("INSERT INTO modulosactivosinst (IdInstitucion, IdModulosApp, Habilitado, ActivoInvestigador) VALUES (?, ?, ?, ?)");

        foreach ($modulosList as $mod) {
            $idModulo = (int)($mod['IdModulosApp'] ?? 0);
            if ($idModulo <= 0 || !in_array($idModulo, $validSet, true)) {
                continue;
            }
            $estadoLogico = $mod['estado_logico']; // 1, 2 o 3

            // Traducción del estado lógico a las columnas físicas
            $habilitado = 2; // Default (Desactivado)
            $activoInv = 2;
            
            if ($estadoLogico == 2) {
                $habilitado = 1; 
                $activoInv = 2;
            } else if ($estadoLogico == 3) {
                $habilitado = 1;
                $activoInv = 1;
            }

            $checkStmt->execute([$idInst, $idModulo]);
            if ($checkStmt->fetchColumn() > 0) {
                // Ya existe, hacemos UPDATE
                $updateStmt->execute([$habilitado, $activoInv, $idInst, $idModulo]);
            } else {
                // No existe, hacemos INSERT
                $insertStmt->execute([$idInst, $idModulo, $habilitado, $activoInv]);
            }
        }
    }

    private function configurarSedesBase($idInst) {
        $this->db->prepare("INSERT INTO tipoprotocolo (NombreTipoprotocolo, IdInstitucion) VALUES ('Investigación', ?)")->execute([$idInst]);
        $sev = [['Severo', 'Nivel máximo'], ['Leve', 'Dolor breve'], ['Moderada', 'Dolor moderado'], ['Sin recuperación', 'Anestesia']];
        $st = $this->db->prepare("INSERT INTO tiposeveridad (NombreSeveridad, detalle, IdInstitucion) VALUES (?, ?, ?)");
        foreach ($sev as $s) $st->execute([$s[0], $s[1], $idInst]);
        $frms = [['Animal', 0, 'Animal'], ['Otros reactivos', 0, 'Otros reactivos biologicos'], ['Insumos', 0, 'Insumos']];
        $sf = $this->db->prepare("INSERT INTO tipoformularios (nombreTipo, exento, IdInstitucion, categoriaformulario, descuento) VALUES (?, ?, ?, ?, 0)");
        foreach ($frms as $f) $sf->execute([$f[0], $f[1], $idInst, $f[2]]);
    }
}