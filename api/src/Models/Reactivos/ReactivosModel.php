<?php
namespace App\Models\Reactivos;

use PDO;
use Exception;

class ReactivosModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // 1. DATOS PDF (Reutilizado de Animales)
    public function getDataForTarifario($instId) {
        // Datos Institución
        $stmtInst = $this->db->prepare("SELECT NombreInst, PrecioJornadaTrabajoExp, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$instId]);
        $institucion = $stmtInst->fetch(PDO::FETCH_ASSOC);

        // Especies
        $stmtEsp = $this->db->prepare("SELECT idespA, EspeNombreA, Panimal, PalojamientoChica, PalojamientoGrande FROM especiee WHERE IdInstitucion = ? ORDER BY EspeNombreA");
        $stmtEsp->execute([$instId]);
        $especies = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);

        // Subespecies
        $stmtSub = $this->db->prepare("SELECT idsubespA, idespA, SubEspeNombreA, Psubanimal, Existe FROM subespecie WHERE Existe != 2");
        $stmtSub->execute();
        $subespecies = $stmtSub->fetchAll(PDO::FETCH_ASSOC);

        // Insumos
        $stmtInsExp = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumoexperimental WHERE IdInstitucion = ? AND habilitado = 1");
        $stmtInsExp->execute([$instId]);
        
        $stmtIns = $this->db->prepare("SELECT NombreInsumo, PrecioInsumo, CantidadInsumo, TipoInsumo FROM insumo WHERE IdInstitucion = ? AND Existencia = 1");
        $stmtIns->execute([$instId]);

        return [
            'institucion' => $institucion,
            'especies' => $especies,
            'subespecies' => $subespecies,
            'insumosExp' => $stmtInsExp->fetchAll(PDO::FETCH_ASSOC),
            'insumos' => $stmtIns->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    // 2. CARGA INICIAL
    public function getInitialData($instId, $userId) {
        // Config y Email
        $stmtConfig = $this->db->prepare("SELECT otrosceuas, tituloprecios FROM institucion WHERE IdInstitucion = ?");
        $stmtConfig->execute([$instId]);
        $config = $stmtConfig->fetch(PDO::FETCH_ASSOC);

        $stmtUser = $this->db->prepare("SELECT EmailA FROM personae WHERE IdUsrA = ?");
        $stmtUser->execute([$userId]);
        $userEmail = $stmtUser->fetchColumn();

        // Protocolos Activos
        $sqlProt = "SELECT p.idprotA, p.nprotA, p.tituloA, CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable
                    FROM protocoloexpe p
                    INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
                    WHERE p.IdInstitucion = ? AND p.FechaFinProtA >= CURDATE()
                    ORDER BY p.nprotA DESC";
        $stmtProt = $this->db->prepare($sqlProt);
        $stmtProt->execute([$instId]);

        // Insumos
        $sqlInsumos = "SELECT IdInsumoexp, NombreInsumo, PrecioInsumo, CantidadInsumo , TipoInsumo
                       FROM insumoexperimental 
                       WHERE IdInstitucion = ? AND habilitado = 1 
                       ORDER BY NombreInsumo ASC";
        $stmtIns = $this->db->prepare($sqlInsumos);
        $stmtIns->execute([$instId]);

        // Tipo Formulario Default
        $stmtType = $this->db->prepare("SELECT IdTipoFormulario FROM tipoformularios WHERE categoriaformulario = 'Otros reactivos biologicos' AND IdInstitucion = ? LIMIT 1");
        $stmtType->execute([$instId]);
        $idTipo = $stmtType->fetchColumn();

        return [
            'config' => $config,
            'user_email' => $userEmail,
            'protocols' => $stmtProt->fetchAll(PDO::FETCH_ASSOC),
            'insumos' => $stmtIns->fetchAll(PDO::FETCH_ASSOC),
            'id_tipo_default' => $idTipo
        ];
    }

    // 3. DETALLES PROTOCOLO
    public function getProtocolDetails($protId) {
        $stmt = $this->db->prepare("
            SELECT p.idprotA, p.tituloA, p.nprotA, p.FechaFinProtA,
            CONCAT(per.NombreA, ' ', per.ApellidoA) as Responsable,
            COALESCE(d.NombreDeptoA, 'Sin departamento') as Depto
            FROM protocoloexpe p
            INNER JOIN personae per ON p.IdUsrA = per.IdUsrA
            LEFT JOIN protdeptor pd ON p.idprotA = pd.idprotA
            LEFT JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA
            WHERE p.idprotA = ?
        ");
        $stmt->execute([$protId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // 4. GUARDAR PEDIDO (Lógica Completa)
public function saveOrder($data) {
        $this->db->beginTransaction();
        try {
            // A. Validar Stock Insumo
            $stmtStock = $this->db->prepare("SELECT CantidadInsumo, NombreInsumo FROM insumoexperimental WHERE IdInsumoexp = ?");
            $stmtStock->execute([$data['idInsumoExp']]);
            $insumo = $stmtStock->fetch(\PDO::FETCH_ASSOC);

            if (!$insumo || $insumo['CantidadInsumo'] < $data['cantidad']) {
                throw new \Exception("Stock insuficiente para: " . ($insumo['NombreInsumo'] ?? 'Insumo desconocido'));
            }

            // B. Recuperar Depto
            $finalDepto = 0;
            if (!empty($data['idprotA'])) {
                $stmtDepto = $this->db->prepare("SELECT iddeptoA FROM protdeptor WHERE idprotA = ? LIMIT 1");
                $stmtDepto->execute([$data['idprotA']]);
                $finalDepto = $stmtDepto->fetchColumn() ?: 0;
            }

            // C. Insertar FORMULARIOE (Incluyendo Raza, Peso, Edad)
            // 'reactivo' = ID Insumo
            $sqlForm = "INSERT INTO formularioe (
                tipoA, reactivo, fechainicioA, fecRetiroA, 
                aclaraA, IdUsrA, IdInstitucion, estado, visto, depto,
                raza, pesoA, edadA 
            ) VALUES (
                ?, ?, NOW(), ?, ?, ?, ?, 'Sin estado', 0, ?,
                ?, ?, ?
            )";
            
            $stmt = $this->db->prepare($sqlForm);
            $stmt->execute([
                $data['idTipoFormulario'],
                $data['idInsumoExp'], 
                $data['fecha_retiro'],
                $data['aclaracion'],
                $data['userId'],
                $data['instId'],
                $finalDepto,
                $data['raza'],  // <--- NUEVO
                $data['peso'],  // <--- NUEVO
                $data['edad']   // <--- NUEVO
            ]);
            $idForm = $this->db->lastInsertId();

            // D. Insertar SEXOE
            // 'organo' = Cantidad Insumo
            // 'totalA' = Total Animales (Puede ser 0)
            $sqlSex = "INSERT INTO sexoe (idformA, organo, machoA, hembraA, indistintoA, totalA) VALUES (?, ?, ?, ?, ?, ?)";
            $this->db->prepare($sqlSex)->execute([
                $idForm, 
                $data['cantidad'],      // Cantidad de Reactivo
                $data['macho'],         // Animales Macho
                $data['hembra'],        // Animales Hembra
                $data['indistinto'],    // Animales Indistinto
                $data['totalAnimales']  // Total Animales
            ]);

            // E. Vincular Protocolo
            if (empty($data['is_external']) || $data['is_external'] == 0) {
                $this->db->prepare("INSERT INTO protformr (idformA, idprotA) VALUES (?, ?)")
                         ->execute([$idForm, $data['idprotA']]);
            
                // F. DESCONTAR STOCK ANIMALES (Solo si hay animales involucrados)
                if ($data['totalAnimales'] > 0) {
                    $this->db->prepare("UPDATE protocoloexpe SET CantidadAniA = CantidadAniA - ? WHERE idprotA = ?")
                             ->execute([$data['totalAnimales'], $data['idprotA']]);
                }
            }

            // G. DESCONTAR STOCK INSUMO
            $this->db->prepare("UPDATE insumoexperimental SET CantidadInsumo = CantidadInsumo - ? WHERE IdInsumoexp = ?")
                     ->execute([$data['cantidad'], $data['idInsumoExp']]);

            $this->db->commit();
            
            return [
                'id' => $idForm,
                'insumoName' => $insumo['NombreInsumo']
            ];

        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // Helper para el mail
    public function getUserAndInstInfo($userId, $instId) {
        $sql = "SELECT p.EmailA, p.NombreA, i.NombreInst 
                FROM personae p 
                JOIN institucion i ON i.IdInstitucion = ?
                WHERE p.IdUsrA = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId, $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}