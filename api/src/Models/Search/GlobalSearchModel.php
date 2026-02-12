<?php
namespace App\Models\Search;

class GlobalSearchModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function searchForAdmin($instId, $term, $scope = 'global') {
        $data = ['protocolos'=>[], 'usuarios'=>[], 'alojamientos'=>[], 'formularios'=>[], 'insumos'=>[]];

        // 1. FORMULARIOS / PEDIDOS
        if ($scope == 'global' || $scope == 'pedido') {
            $sql = "SELECT f.idformA, f.estado, f.tipoA, 
                           COALESCE(per.NombreA, 'Desconocido') as NombreA, 
                           COALESCE(per.ApellidoA, '') as ApellidoA
                    FROM formularioe f
                    LEFT JOIN usuarioe u ON f.IdUsrA = u.IdUsrA
                    LEFT JOIN personae per ON u.IdUsrA = per.IdUsrA
                    WHERE f.IdInstitucion = ? 
                    AND (f.idformA LIKE ? OR per.NombreA LIKE ? OR per.ApellidoA LIKE ?)
                    ORDER BY f.idformA DESC LIMIT 5";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term]);
            $data['formularios'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        // 2. PROTOCOLOS
        if ($scope == 'global' || $scope == 'protocolo') {
            $sql = "SELECT p.idprotA, p.tituloA, p.nprotA, per.ApellidoA, per.NombreA
                    FROM protocoloexpe p
                    LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                    LEFT JOIN personae per ON u.IdUsrA = per.IdUsrA
                    WHERE p.IdInstitucion = ? 
                    AND (p.tituloA LIKE ? OR p.nprotA LIKE ? OR per.NombreA LIKE ? OR per.ApellidoA LIKE ?) 
                    ORDER BY p.idprotA DESC LIMIT 5";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term, $term]);
            $data['protocolos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        // 3. ALOJAMIENTOS (CORREGIDO: ERROR 1055)
        // Usamos DISTINCT en lugar de GROUP BY incompleto para evitar el crash de SQL
        if ($scope == 'global' || $scope == 'alojamiento') {
            $sql = "SELECT DISTINCT a.idprotA, a.historia, p.nprotA, per.ApellidoA, per.NombreA
                    FROM alojamiento a
                    LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA
                    LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                    LEFT JOIN personae per ON u.IdUsrA = per.IdUsrA
                    WHERE a.IdInstitucion = ? 
                    AND (a.historia LIKE ? OR per.ApellidoA LIKE ? OR p.nprotA LIKE ?) 
                    LIMIT 5";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term]);
            $data['alojamientos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        // 4. USUARIOS
        if ($scope == 'global' || $scope == 'usuario') {
            $sql = "SELECT p.IdUsrA, p.NombreA, p.ApellidoA, p.EmailA 
                    FROM personae p 
                    INNER JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                    WHERE u.IdInstitucion = ? 
                    AND (p.NombreA LIKE ? OR p.ApellidoA LIKE ? OR p.EmailA LIKE ?) LIMIT 5";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term]);
            $data['usuarios'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        // 5. INSUMOS
        if ($scope == 'global' || $scope == 'insumo') {
            $sql = "SELECT idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo FROM insumo 
                    WHERE IdInstitucion = ? AND NombreInsumo LIKE ? 
                    UNION 
                    SELECT IdInsumoexp as idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo FROM insumoexperimental 
                    WHERE IdInstitucion = ? AND NombreInsumo LIKE ? LIMIT 5";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $instId, $term]);
            $data['insumos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        return $data;
    }

    public function searchForUser($instId, $userId, $term, $scope = 'global') {
        $data = ['protocolos'=>[], 'formularios'=>[], 'alojamientos'=>[], 'insumos'=>[]];

        // Mis Protocolos
        if ($scope == 'global' || $scope == 'protocolo') {
            $stmt = $this->db->prepare("SELECT idprotA, tituloA, nprotA FROM protocoloexpe WHERE IdInstitucion = ? AND IdUsrA = ? AND (tituloA LIKE ? OR nprotA LIKE ?) LIMIT 5");
            $stmt->execute([$instId, $userId, $term, $term]);
            $data['protocolos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }
        
        // Mis Formularios
        if ($scope == 'global' || $scope == 'pedido') {
            $stmt = $this->db->prepare("SELECT idformA, estado, tipoA FROM formularioe WHERE IdInstitucion = ? AND IdUsrA = ? AND (idformA LIKE ? OR tipoA LIKE ?) LIMIT 5");
            $stmt->execute([$instId, $userId, $term, $term]);
            $data['formularios'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }
        
        // Mis Alojamientos (CORREGIDO: ERROR 1055)
        // También aquí cambiamos GROUP BY por DISTINCT para evitar el error
        if ($scope == 'global' || $scope == 'alojamiento') {
            $stmt = $this->db->prepare("SELECT DISTINCT historia, idprotA FROM alojamiento WHERE IdInstitucion = ? AND IdUsrA = ? AND historia LIKE ? LIMIT 5");
            $stmt->execute([$instId, $userId, $term]);
            $data['alojamientos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        return $data;
    }
}