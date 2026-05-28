<?php
namespace App\Models\Search;

class GlobalSearchModel {
    private const LIMIT_PER_BUCKET = 20;

    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function searchForAdmin($instId, $term, $scope = 'global') {
        $instId = (int) $instId;
        $data = [
            'protocolos' => [],
            'usuarios' => [],
            'alojamientos' => [],
            'formularios' => [],
            'insumos' => [],
            'departamentos' => [],
            'organismos' => [],
        ];

        if ($scope === 'global' || $scope === 'pedido') {
            $sql = "SELECT f.idformA, f.estado,
                           COALESCE(tf.nombreTipo, f.tipoA, '') AS tipoA,
                           COALESCE(tf.nombreTipo, '') AS categoria_nombre,
                           COALESCE(per.NombreA, '') AS NombreA,
                           COALESCE(per.ApellidoA, '') AS ApellidoA,
                           COALESCE(p.nprotA, '') AS nprotA,
                           COALESCE(p.tituloA, '') AS titulo_protocolo
                    FROM formularioe f
                    LEFT JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA
                    LEFT JOIN usuarioe u ON f.IdUsrA = u.IdUsrA
                    LEFT JOIN personae per ON u.IdUsrA = per.IdUsrA
                    LEFT JOIN protformr pf ON pf.idformA = f.idformA
                    LEFT JOIN protocoloexpe p ON p.idprotA = pf.idprotA
                    WHERE f.IdInstitucion = ?
                      AND (
                          CAST(f.idformA AS CHAR) LIKE ?
                          OR per.NombreA LIKE ?
                          OR per.ApellidoA LIKE ?
                          OR tf.nombreTipo LIKE ?
                          OR p.nprotA LIKE ?
                          OR p.tituloA LIKE ?
                      )
                    ORDER BY
                      CASE WHEN CAST(f.idformA AS CHAR) = ? THEN 0 ELSE 1 END,
                      f.idformA DESC
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $exact = trim(str_replace('%', '', $term));
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $instId, $term, $term, $term, $term, $term, $term, $exact,
            ]);
            $data['formularios'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'protocolo') {
            $sql = "SELECT p.idprotA, p.tituloA, p.nprotA,
                           COALESCE(per.ApellidoA, '') AS ApellidoA,
                           COALESCE(per.NombreA, '') AS NombreA,
                           COALESCE(de.NombreDeptoA, '') AS nombre_depto
                    FROM protocoloexpe p
                    LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                    LEFT JOIN personae per ON u.IdUsrA = per.IdUsrA
                    LEFT JOIN departamentoe de ON de.iddeptoA = p.departamento
                    WHERE p.IdInstitucion = ?
                      AND (
                          p.tituloA LIKE ?
                          OR p.nprotA LIKE ?
                          OR per.NombreA LIKE ?
                          OR per.ApellidoA LIKE ?
                          OR de.NombreDeptoA LIKE ?
                      )
                    ORDER BY
                      CASE WHEN p.nprotA = ? THEN 0 ELSE 1 END,
                      p.idprotA DESC
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $exactProt = trim(str_replace('%', '', $term));
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term, $term, $term, $exactProt]);
            $data['protocolos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'alojamiento') {
            $sql = "SELECT DISTINCT a.historia, a.idprotA,
                           COALESCE(p.nprotA, '') AS nprotA,
                           COALESCE(per.ApellidoA, '') AS ApellidoA,
                           COALESCE(per.NombreA, '') AS NombreA
                    FROM alojamiento a
                    LEFT JOIN protocoloexpe p ON a.idprotA = p.idprotA
                    LEFT JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                    LEFT JOIN personae per ON u.IdUsrA = per.IdUsrA
                    WHERE a.IdInstitucion = ?
                      AND (
                          CAST(a.historia AS CHAR) LIKE ?
                          OR per.ApellidoA LIKE ?
                          OR per.NombreA LIKE ?
                          OR p.nprotA LIKE ?
                      )
                    ORDER BY a.historia DESC
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term, $term]);
            $data['alojamientos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'usuario') {
            $sql = "SELECT p.IdUsrA, p.NombreA, p.ApellidoA, p.EmailA
                    FROM personae p
                    INNER JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                    WHERE u.IdInstitucion = ?
                      AND (
                          p.NombreA LIKE ?
                          OR p.ApellidoA LIKE ?
                          OR p.EmailA LIKE ?
                          OR CAST(p.IdUsrA AS CHAR) LIKE ?
                      )
                    ORDER BY p.ApellidoA, p.NombreA
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $term, $term, $term]);
            $data['usuarios'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'insumo') {
            $sql = "SELECT idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo, 'catalogo' AS origen
                    FROM insumo
                    WHERE IdInstitucion = ? AND NombreInsumo LIKE ?
                    UNION
                    SELECT IdInsumoexp AS idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo, 'experimental' AS origen
                    FROM insumoexperimental
                    WHERE IdInstitucion = ? AND NombreInsumo LIKE ?
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term, $instId, $term]);
            $data['insumos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'departamento') {
            $sql = "SELECT de.iddeptoA, de.NombreDeptoA,
                           COALESCE(org.NombreOrganismo, '') AS nombre_organismo
                    FROM departamentoe de
                    LEFT JOIN organismoe org ON org.IdOrganismo = de.organismopertenece
                    WHERE de.IdInstitucion = ?
                      AND de.NombreDeptoA LIKE ?
                    ORDER BY de.NombreDeptoA
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term]);
            $data['departamentos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'organismo') {
            $sql = "SELECT org.IdOrganismo, org.NombreOrganismo
                    FROM organismoe org
                    INNER JOIN departamentoe de ON de.organismopertenece = org.IdOrganismo
                    WHERE de.IdInstitucion = ?
                      AND org.NombreOrganismo LIKE ?
                    GROUP BY org.IdOrganismo, org.NombreOrganismo
                    ORDER BY org.NombreOrganismo
                    LIMIT " . self::LIMIT_PER_BUCKET;
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$instId, $term]);
            $data['organismos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        return $data;
    }

    public function searchForUser($instId, $userId, $term, $scope = 'global') {
        $instId = (int) $instId;
        $userId = (int) $userId;
        $data = [
            'protocolos' => [],
            'formularios' => [],
            'alojamientos' => [],
            'insumos' => [],
        ];

        if ($scope === 'global' || $scope === 'protocolo') {
            $stmt = $this->db->prepare(
                "SELECT idprotA, tituloA, nprotA FROM protocoloexpe
                 WHERE IdInstitucion = ? AND IdUsrA = ?
                   AND (tituloA LIKE ? OR nprotA LIKE ?)
                 ORDER BY idprotA DESC LIMIT " . self::LIMIT_PER_BUCKET
            );
            $stmt->execute([$instId, $userId, $term, $term]);
            $data['protocolos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'pedido') {
            $stmt = $this->db->prepare(
                "SELECT f.idformA, f.estado,
                        COALESCE(tf.nombreTipo, f.tipoA, '') AS tipoA,
                        COALESCE(tf.nombreTipo, '') AS categoria_nombre
                 FROM formularioe f
                 LEFT JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA
                 WHERE f.IdInstitucion = ? AND f.IdUsrA = ?
                   AND (CAST(f.idformA AS CHAR) LIKE ? OR tf.nombreTipo LIKE ? OR f.tipoA LIKE ?)
                 ORDER BY f.idformA DESC LIMIT " . self::LIMIT_PER_BUCKET
            );
            $stmt->execute([$instId, $userId, $term, $term, $term]);
            $data['formularios'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if ($scope === 'global' || $scope === 'alojamiento') {
            $stmt = $this->db->prepare(
                "SELECT DISTINCT historia, idprotA FROM alojamiento
                 WHERE IdInstitucion = ? AND IdUsrA = ? AND CAST(historia AS CHAR) LIKE ?
                 ORDER BY historia DESC LIMIT " . self::LIMIT_PER_BUCKET
            );
            $stmt->execute([$instId, $userId, $term]);
            $data['alojamientos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        return $data;
    }
}
