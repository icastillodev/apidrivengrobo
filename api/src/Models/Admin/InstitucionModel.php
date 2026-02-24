<?php
namespace App\Models\Admin;

use PDO;
use Exception;
use App\Utils\Auditoria; 

class InstitucionModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Trae los módulos existentes en la app
    public function getModulosMaestros() {
        return $this->db->query("SELECT IdModulosApp, NombreModulo FROM modulosapp")->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAllInstitutions() {
        $sql = "SELECT i.* FROM institucion i ORDER BY i.IdInstitucion DESC";
        $instituciones = $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        // Por cada institución, traemos sus módulos y los comprimimos al "estado lógico" (1, 2, 3)
        $sqlMod = "SELECT ma.IdModulosApp, app.NombreModulo, ma.Habilitado, ma.ActivoInvestigador 
                   FROM modulosactivosinst ma 
                   JOIN modulosapp app ON ma.IdModulosApp = app.IdModulosApp
                   WHERE ma.IdInstitucion = ?";
        $stmtMod = $this->db->prepare($sqlMod);

        foreach ($instituciones as &$inst) {
            $stmtMod->execute([$inst['IdInstitucion']]);
            $mods = $stmtMod->fetchAll(PDO::FETCH_ASSOC);
            
            // Transformamos las dos variables binarias al estado lógico de tu dropdown
            foreach ($mods as &$m) {
                if ($m['Habilitado'] == 2) {
                    $m['estado_logico'] = 1; // Desactivado total
                } else if ($m['Habilitado'] == 1 && $m['ActivoInvestigador'] == 2) {
                    $m['estado_logico'] = 2; // Solo Admin
                } else if ($m['Habilitado'] == 1 && $m['ActivoInvestigador'] == 1) {
                    $m['estado_logico'] = 3; // Full Admin y User
                }
            }
            $inst['modulos'] = $mods;
        }

        return $instituciones;
    }

    public function crearInstitucionCompleta($data) {
        try {
            $this->db->beginTransaction();

            $sql = "INSERT INTO institucion (
                        NombreInst, NombreCompletoInst, InstCorreo, Pais, Localidad, 
                        Moneda, Web, Logo, DependenciaInstitucion, otrosceuas, 
                        TipoApp, Activo, UltimoPago, PrecioJornadaTrabajoExp,
                        TipoFacturacion, FechaContrato, Detalle
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
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
                $data['Detalle'] ?? ''
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

            $sql = "UPDATE institucion SET 
                        NombreInst = ?, NombreCompletoInst = ?, InstCorreo = ?, 
                        Pais = ?, Localidad = ?, Moneda = ?, Web = ?, 
                        Logo = ?, DependenciaInstitucion = ?, otrosceuas = ?, 
                        TipoApp = ?, Activo = ?, UltimoPago = ?,
                        TipoFacturacion = ?, FechaContrato = ?, Detalle = ?
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

        // Validamos si ya existe el registro para saber si hacer UPDATE o INSERT
        $checkStmt = $this->db->prepare("SELECT ModulosActivosInstId FROM modulosactivosinst WHERE IdInstitucion = ? AND IdModulosApp = ?");
        $updateStmt = $this->db->prepare("UPDATE modulosactivosinst SET Habilitado = ?, ActivoInvestigador = ? WHERE IdInstitucion = ? AND IdModulosApp = ?");
        $insertStmt = $this->db->prepare("INSERT INTO modulosactivosinst (IdInstitucion, IdModulosApp, Habilitado, ActivoInvestigador) VALUES (?, ?, ?, ?)");

        foreach ($modulosList as $mod) {
            $idModulo = $mod['IdModulosApp'];
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
        $frms = [['Animal vivo', 0, 'Animal vivo'], ['Otros reactivos', 0, 'Otros reactivos biologicos'], ['Insumos', 0, 'Insumos']];
        $sf = $this->db->prepare("INSERT INTO tipoformularios (nombreTipo, exento, IdInstitucion, categoriaformulario, descuento) VALUES (?, ?, ?, ?, 0)");
        foreach ($frms as $f) $sf->execute([$f[0], $f[1], $idInst, $f[2]]);
    }
}