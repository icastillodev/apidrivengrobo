<?php
namespace App\Models\Protocol;

use PDO;

class ProtocolModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * 1. MÉTODO PARA LA TABLA PRINCIPAL (GRILLA)
     */

    // api/src/Models/Protocol/ProtocolModel.php

    public function getByInstitution($instId) {
        $sql = "SELECT 
                    pe.*, 
                    pe.idprotA, pe.nprotA, pe.tituloA, pe.CantidadAniA as AniAprob, 
                    pe.encargaprot as RespProt, 
                    ts.NombreSeveridad as SeveridadNombre,
                    pe.FechaFinProtA as Vencimiento,
                    pe.protocoloexpe as IsExterno,
                    pe.departamento as DeptoOriginal, -- Texto manual si es externo
                    tp.NombreTipoprotocolo as TipoNombre, 
                    p.NombreA, p.ApellidoA,
                    -- Lógica para obtener el nombre del departamento interno vía protdeptor
                    (SELECT d.NombreDeptoA 
                    FROM protdeptor pd 
                    JOIN departamentoe d ON pd.iddeptoA = d.iddeptoA 
                    WHERE pd.idprotA = pe.idprotA LIMIT 1) as DeptoInterno,
                    COALESCE(
                        (SELECT GROUP_CONCAT(e.EspeNombreA SEPARATOR ', ') 
                        FROM protesper pre 
                        JOIN especiee e ON pre.idespA = e.idespA 
                        WHERE pre.idprotA = pe.idprotA),
                        pe.especie
                    ) as EspeciesList
                FROM protocoloexpe pe
                LEFT JOIN personae p ON pe.IdUsrA = p.IdUsrA
                LEFT JOIN tipoprotocolo tp ON pe.tipoprotocolo = tp.idtipoprotocolo
                LEFT JOIN tiposeveridad ts ON pe.severidad = ts.IdSeveridadTipo
                WHERE pe.IdInstitucion = ?
                ORDER BY pe.idprotA DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    /**
     * 2. MÉTODO PARA EL FORMULARIO (MODAL)
     */
    public function getFormData($instId) {
        // Usuarios filtrados: Nombre/Apellido >= 3 letras y sin caracteres especiales
        $sqlUsers = "SELECT p.IdUsrA, p.ApellidoA, p.NombreA, 
                            d.NombreDeptoA, o.NombreOrganismoSimple 
                     FROM personae p
                     JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                     LEFT JOIN departamentoe d ON p.LabA = d.iddeptoA
                     LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo
                     WHERE u.IdInstitucion = ? 
                       AND TRIM(p.NombreA) NOT REGEXP '^[., ]*$' 
                       AND LENGTH(TRIM(p.NombreA)) >= 3 
                       AND LENGTH(TRIM(p.ApellidoA)) >= 3
                     ORDER BY p.ApellidoA ASC";
        $stmtUser = $this->db->prepare($sqlUsers);
        $stmtUser->execute([$instId]);
        $users = $stmtUser->fetchAll(PDO::FETCH_ASSOC);

        // Especies principales
        $stmtEsp = $this->db->prepare("SELECT idespA, EspeNombreA FROM especiee WHERE IdInstitucion = ?");
        $stmtEsp->execute([$instId]);
        $species = $stmtEsp->fetchAll(PDO::FETCH_ASSOC);

        // Severidades
        $stmtSev = $this->db->query("SELECT IdSeveridadTipo, NombreSeveridad FROM tiposeveridad");
        $severities = $stmtSev->fetchAll(PDO::FETCH_ASSOC);

        // Tipos de Protocolo
        $stmtTipos = $this->db->prepare("SELECT idtipoprotocolo, NombreTipoprotocolo FROM tipoprotocolo WHERE IdInstitucion = ?");
        $stmtTipos->execute([$instId]);
        $types = $stmtTipos->fetchAll(PDO::FETCH_ASSOC);

        // Departamentos
        $stmtDepto = $this->db->prepare("SELECT iddeptoA, NombreDeptoA FROM departamentoe WHERE IdInstitucion = ?");
        $stmtDepto->execute([$instId]);
        $depts = $stmtDepto->fetchAll(PDO::FETCH_ASSOC);

        $stmtInst = $this->db->prepare("SELECT otrosceuas, NombreCompletoInst FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$instId]);
        $instConfig = $stmtInst->fetch(PDO::FETCH_ASSOC);

        return [
            'users' => $users,
            'species' => $species,
            'severities' => $severities,
            'types' => $types,
            'depts' => $depts,
            'otrosceuas_enabled' => ($instConfig && $instConfig['otrosceuas'] != 2),
            'NombreCompletoInst' => $instConfig['NombreCompletoInst'] ?? 'Institución' // Nuevo dato
        ];
    }
    /**
     * Obtiene los detalles completos de las especies autorizadas para un protocolo.
     * Relaciona protocoloexpe -> protesper -> especiee
     */
    public function getProtocolSpecies($idprotA) {
        $sql = "SELECT 
                    e.idespA, 
                    e.EspeNombreA, 
                    e.PalojamientoChica, 
                    e.PalojamientoGrande
                FROM protesper pe
                INNER JOIN especiee e ON pe.idespA = e.idespA
                WHERE pe.idprotA = ?";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idprotA]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC); // Ahora devuelve objetos completos
    }

// api/src/Models/Protocolo/ProtocoloModel.php

public function searchForAlojamiento($term, $instId) {
    // Usamos IFNULL en el CONCAT para evitar que un NULL rompa la cadena
    $sql = "SELECT 
                p.idprotA, 
                p.tituloA, 
                p.nprotA, 
                p.IdUsrA,
                CONCAT(IFNULL(pers.NombreA, ''), ' ', IFNULL(pers.ApellidoA, '')) as Investigador
            FROM protocoloexpe p
            LEFT JOIN personae pers ON p.IdUsrA = pers.IdUsrA
            LEFT JOIN solicitudprotocolo s ON p.idprotA = s.idprotA
            WHERE p.IdInstitucion = ? 
              AND (
                  p.tituloA LIKE ? 
                  OR p.nprotA LIKE ? 
                  OR pers.NombreA LIKE ? 
                  OR pers.ApellidoA LIKE ?
              )
              -- Filtro: Si no hay registro en solicitudprotocolo (NULL) o es 0/1, está OK
              AND (s.Aprobado IS NULL OR s.Aprobado IN (0, 1))
            ORDER BY p.idprotA DESC ";

    $stmt = $this->db->prepare($sql);
    $searchTerm = "%$term%";

    // DEBES ENVIAR LOS 5 PARÁMETROS AQUÍ:
    $stmt->execute([
        (int)$instId, // 1. IdInstitucion
        $searchTerm,  // 2. tituloA
        $searchTerm,  // 3. nprotA
        $searchTerm,  // 4. NombreA
        $searchTerm   // 5. ApellidoA
    ]);

    return $stmt->fetchAll(\PDO::FETCH_ASSOC);
}
// api/src/Models/Alojamiento/AlojamientoModel.php

public function updateHistoryConfig($data) {
    $this->db->beginTransaction();
    try {
        // Actualizamos todos los tramos de la historia con el nuevo contexto
        $sql = "UPDATE alojamiento SET 
                idprotA = ?, 
                IdUsrA = ?,
                preciocajachica = ?,
                preciocajagrande = ?
                WHERE historia = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['idprotA'], 
            $data['IdUsrA'], 
            $data['precioChica'], 
            $data['precioGrande'],
            $data['historia']
        ]);

        // Al cambiar precios o protocolo, es vital recalcular para que los subtotales se actualicen
        $this->recalculateHistory($data['historia']);

        $this->db->commit();
        return true;
    } catch (\Exception $e) {
        $this->db->rollBack();
        throw $e;
    }
}
}