<?php
namespace App\Models\Admin;

use PDO;
use Exception;

class InstitucionModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllInstitutions() {
        return $this->db->query("SELECT * FROM institucion ORDER BY IdInstitucion DESC")->fetchAll(PDO::FETCH_ASSOC);
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
                $data['PrecioJornadaTrabajoExp'] ?? 0, 
                (int)($data['TipoFacturacion'] ?? 1), 
                $data['FechaContrato'] ?: null, 
                $data['Detalle'] ?? ''
            ]);
            
            $idNew = $this->db->lastInsertId();

            // Configuración de menús
            $menusFull = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10,55,202,203];
            $menusInvestigador = [11, 12, 14,203];

            $sqlMenu = "INSERT INTO menudistr (IdInstitucion, IdTipoUsrA, NombreMenu, Activo) VALUES (?, ?, ?, 1)";
            $stmtMenu = $this->db->prepare($sqlMenu);

            for ($role = 1; $role <= 6; $role++) {
                $lista = ($role == 3) ? $menusInvestigador : $menusFull;
                foreach ($lista as $numMenu) {
                    $stmtMenu->execute([$idNew, $role, (int)$numMenu]); 
                }
            }

            $this->configurarSedesBase($idNew);
            $this->db->commit();
            return $idNew;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public function updateInstitucion($id, $data) {
        $sql = "UPDATE institucion SET 
                    NombreInst = ?, NombreCompletoInst = ?, InstCorreo = ?, 
                    Pais = ?, Localidad = ?, Moneda = ?, Web = ?, 
                    Logo = ?, DependenciaInstitucion = ?, otrosceuas = ?, 
                    TipoApp = ?, Activo = ?, UltimoPago = ?,
                    TipoFacturacion = ?, FechaContrato = ?, Detalle = ?,
                    PrecioJornadaTrabajoExp = ?
                WHERE IdInstitucion = ?";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
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
            $data['PrecioJornadaTrabajoExp'] ?? 0,
            $id
        ]);
    }

    private function configurarSedesBase($idInst) {
        $this->db->prepare("INSERT INTO tipoprotocolo (NombreTipoprotocolo, IdInstitucion) VALUES ('Investigación', ?)")->execute([$idInst]);
        
        $sev = [['Severo', 'Nivel máximo'], ['Leve', 'Dolor breve'], ['Moderada', 'Dolor moderado'], ['Sin recuperación', 'Anestesia']];
        $st = $this->db->prepare("INSERT INTO tiposeveridad (NombreSeveridad, detalle, IdInstitucion) VALUES (?, ?, ?)");
        foreach ($sev as $s) $st->execute([$s[0], $s[1], $idInst]);
        
        $frms = [['Animal vivo', 0, 1], ['Otros reactivos', 0, 2], ['Insumos', 1, 3]];
        $sf = $this->db->prepare("INSERT INTO tipoformularios (nombreTipo, exento, IdInstitucion, categoriaformulario, descuento) VALUES (?, ?, ?, ?, 0)");
        foreach ($frms as $f) $sf->execute([$f[0], $f[1], $idInst, $f[2]]);
    }
}