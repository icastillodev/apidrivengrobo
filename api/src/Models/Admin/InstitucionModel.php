<?php
namespace App\Models\Admin;

use PDO;
use Exception;
use App\Utils\Auditoria; // <-- Seguridad Inyectada

class InstitucionModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAllInstitutions() {
        $sql = "SELECT i.*, 
                       s.Alojamiento, s.Animales, s.Reactivos, s.Reservas, s.Insumos 
                FROM institucion i
                LEFT JOIN institucionservicios s ON i.IdInstitucion = s.IdInstitucion
                ORDER BY i.IdInstitucion DESC";
        return $this->db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function crearInstitucionCompleta($data) {
        try {
            $this->db->beginTransaction();

            // 1. Insertar Institución
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

            // 2. Insertar Servicios (Por defecto llegan desde el JS)
            $servicios = [
                'Alojamiento' => (int)($data['Serv_Alojamiento'] ?? 1),
                'Animales'    => (int)($data['Serv_Animales'] ?? 1),
                'Reactivos'   => (int)($data['Serv_Reactivos'] ?? 1),
                'Reservas'    => (int)($data['Serv_Reservas'] ?? 1),
                'Insumos'     => (int)($data['Serv_Insumos'] ?? 1)
            ];

            $sqlServ = "INSERT INTO institucionservicios (IdInstitucion, Alojamiento, Animales, Reactivos, Reservas, Insumos) 
                        VALUES (?, ?, ?, ?, ?, ?)";
            $this->db->prepare($sqlServ)->execute([
                $idNew, $servicios['Alojamiento'], $servicios['Animales'], 
                $servicios['Reactivos'], $servicios['Reservas'], $servicios['Insumos']
            ]);

            // 3. Crear Menús Base (Todos en Activo=1 inicialmente)
            $menusFull = [1, 2, 3, 4, 5, 6, 7, 8, 9, 55, 202];
            $menusInvestigador = [11, 12, 14, 15];

            $sqlMenu = "INSERT INTO menudistr (IdInstitucion, IdTipoUsrA, NombreMenu, Activo) VALUES (?, ?, ?, 1)";
            $stmtMenu = $this->db->prepare($sqlMenu);

            for ($role = 1; $role <= 6; $role++) {
                $lista = ($role == 3) ? $menusInvestigador : $menusFull;
                foreach ($lista as $numMenu) {
                    $stmtMenu->execute([$idNew, $role, (int)$numMenu]); 
                }
            }

            $this->configurarSedesBase($idNew);
            $this->sincronizarMenus($idNew, $servicios);

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
                        TipoFacturacion = ?, FechaContrato = ?, Detalle = ?,
                        PrecioJornadaTrabajoExp = ?
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
                $data['PrecioJornadaTrabajoExp'] ?? 0,
                $id
            ]);

            $servicios = [
                'Alojamiento' => (int)($data['Serv_Alojamiento'] ?? 1),
                'Animales'    => (int)($data['Serv_Animales'] ?? 1),
                'Reactivos'   => (int)($data['Serv_Reactivos'] ?? 1),
                'Reservas'    => (int)($data['Serv_Reservas'] ?? 1),
                'Insumos'     => (int)($data['Serv_Insumos'] ?? 1)
            ];

            $check = $this->db->prepare("SELECT COUNT(*) FROM institucionservicios WHERE IdInstitucion = ?");
            $check->execute([$id]);
            
            if ($check->fetchColumn() > 0) {
                $sqlServ = "UPDATE institucionservicios SET 
                            Alojamiento = ?, Animales = ?, Reactivos = ?, Reservas = ?, Insumos = ? 
                            WHERE IdInstitucion = ?";
                $this->db->prepare($sqlServ)->execute([
                    $servicios['Alojamiento'], $servicios['Animales'], $servicios['Reactivos'], 
                    $servicios['Reservas'], $servicios['Insumos'], $id
                ]);
            } else {
                $sqlServ = "INSERT INTO institucionservicios (IdInstitucion, Alojamiento, Animales, Reactivos, Reservas, Insumos) 
                            VALUES (?, ?, ?, ?, ?, ?)";
                $this->db->prepare($sqlServ)->execute([
                    $id, $servicios['Alojamiento'], $servicios['Animales'], $servicios['Reactivos'], 
                    $servicios['Reservas'], $servicios['Insumos']
                ]);
            }

            $this->sincronizarMenus($id, $servicios);

            Auditoria::log($this->db, 'UPDATE', 'institucion', "SuperAdmin editó configuración de la sede ID: " . $id);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
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

    private function sincronizarMenus($idInst, $servicios) {
        $rolesAdmin = [2, 4, 5, 6]; 
        $roleInvestigador = 3;

        $updateMenu = function($menuId, $roles, $estado) use ($idInst) {
            $inQuery = implode(',', array_map('intval', is_array($roles) ? $roles : [$roles]));
            $sql = "UPDATE menudistr SET Activo = ? WHERE IdInstitucion = ? AND NombreMenu = ? AND IdTipoUsrA IN ($inQuery)";
            $this->db->prepare($sql)->execute([$estado, $idInst, $menuId]);
        };

        $sAloj = $servicios['Alojamiento'];
        $updateMenu(7, $rolesAdmin, ($sAloj == 3) ? 2 : 1);       
        $updateMenu(12, $roleInvestigador, ($sAloj == 1) ? 1 : 2); 

        $sAni = $servicios['Animales'];
        $updateMenu(3, $rolesAdmin, ($sAni == 3) ? 2 : 1);

        $sRea = $servicios['Reactivos'];
        $updateMenu(4, $rolesAdmin, ($sRea == 3) ? 2 : 1);

        $verForms = ($sAni == 1 || $sRea == 1) ? 1 : 2;
        $updateMenu(11, $roleInvestigador, $verForms);

        $sIns = $servicios['Insumos'];
        $updateMenu(5, $rolesAdmin, ($sIns == 3) ? 2 : 1);

        $sRes = $servicios['Reservas'];
        $updateMenu(6, $rolesAdmin, ($sRes == 3) ? 2 : 1);        
        $updateMenu(14, $roleInvestigador, ($sRes == 1) ? 1 : 2);  
    }
}