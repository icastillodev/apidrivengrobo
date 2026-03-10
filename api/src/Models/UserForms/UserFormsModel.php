<?php
namespace App\Models\UserForms;

use PDO;

class UserFormsModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // ... (El método getAllForms queda IGUAL) ...
    public function getAllForms($userId, $currentInstId) {
        // (Copia el código anterior de getAllForms aquí)
        $stmtInst = $this->db->prepare("SELECT NombreInst, InstCorreo, InstContacto FROM institucion WHERE IdInstitucion = ?");
        $stmtInst->execute([$currentInstId]);
        $institucion = $stmtInst->fetch(PDO::FETCH_ASSOC);

        $sql = "SELECT f.idformA, f.fechainicioA as Inicio, f.fecRetiroA as Retiro, f.estado, i.NombreInst as NombreInstitucion, tf.nombreTipo as TipoPedido, tf.categoriaformulario as Categoria, tf.color as colorTipo, COALESCE(px.nprotA, 'N/A') as Protocolo, COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '---') as Departamento, COALESCE(o.NombreOrganismoSimple, '') as Organizacion FROM formularioe f INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario LEFT JOIN protformr pf ON f.idformA = pf.idformA LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA LEFT JOIN departamentoe dp ON pd.iddeptoA = dp.iddeptoA LEFT JOIN departamentoe d ON f.depto = d.iddeptoA LEFT JOIN organismoe o ON d.organismopertenece = o.IdOrganismo WHERE f.IdUsrA = ? ORDER BY f.idformA DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return ['info_inst' => $institucion, 'list' => $stmt->fetchAll(PDO::FETCH_ASSOC)];
    }

    public function getDetail($id) {
        // Cabecera (Igual que antes)
        $sqlHead = "SELECT f.*, tf.nombreTipo, tf.categoriaformulario, tf.categoriaformulario as Categoria, i.NombreInst as NombreInstitucion, i.InstCorreo, i.InstContacto, px.nprotA
                    FROM formularioe f
                    JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                    JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                    LEFT JOIN protformr pf ON f.idformA = pf.idformA
                    LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
                    WHERE f.idformA = ?";
        
        $stmtHead = $this->db->prepare($sqlHead);
        $stmtHead->execute([$id]);
        $head = $stmtHead->fetch(PDO::FETCH_ASSOC);

        if (!$head) throw new \Exception("Formulario no encontrado");

        $details = [];

        // 2. Ramificación con Campos Extra para el PDF
        if ($head['categoriaformulario'] === 'Insumos') {
            // INSUMOS: Agregamos i.CantidadInsumo y i.TipoInsumo
            $sqlItems = "SELECT 
                            i.NombreInsumo, 
                            i.CantidadInsumo as PresentacionCant, -- (Ej: 500)
                            i.TipoInsumo as PresentacionTipo,     -- (Ej: ml)
                            fi.cantidad                           -- Lo solicitado
                         FROM forminsumo fi
                         JOIN insumo i ON fi.IdInsumo = i.idInsumo
                         JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                         WHERE pif.idformA = ?";
            $stmtItems = $this->db->prepare($sqlItems);
            $stmtItems->execute([$id]);
            $details = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        } elseif ($head['categoriaformulario'] === 'Animal') {
            // ANIMALES (Sin cambios en estructura de datos)
            $sqlAni = "SELECT s.machoA, s.hembraA, s.indistintoA, s.totalA, e.EspeNombreA, sub.SubEspeNombreA
                       FROM sexoe s
                       LEFT JOIN formularioe f ON s.idformA = f.idformA
                       LEFT JOIN subespecie sub ON f.idsubespA = sub.idsubespA
                       LEFT JOIN especiee e ON sub.idespA = e.idespA
                       WHERE s.idformA = ?";
            $stmtAni = $this->db->prepare($sqlAni);
            $stmtAni->execute([$id]);
            $details = $stmtAni->fetch(PDO::FETCH_ASSOC);

        } else {
            // REACTIVOS: Agregamos ie.CantidadInsumo y ie.TipoInsumo
            $sqlRea = "SELECT 
                            ie.NombreInsumo, 
                            ie.CantidadInsumo as PresentacionCant, -- (Ej: 1)
                            ie.TipoInsumo as PresentacionTipo,     -- (Ej: Unidad)
                            s.organo as Cantidad                   -- Lo solicitado
                       FROM formularioe f
                       LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                       LEFT JOIN sexoe s ON f.idformA = s.idformA
                       WHERE f.idformA = ?";
            $stmtRea = $this->db->prepare($sqlRea);
            $stmtRea->execute([$id]);
            $details = $stmtRea->fetch(PDO::FETCH_ASSOC);
        }

        return [
            'header' => $head,
            'details' => $details
        ];
    }

    /**
     * Protocolos que el usuario utilizó en sus formularios.
     * animales_usados = solo formularios ENTREGADOS (sexoe.totalA).
     */
    public function getProtocolsUsedInForms($userId) {
        $sql = "SELECT p.idprotA, p.nprotA, p.tituloA, p.FechaFinProtA, p.CantidadAniA as cupo_restante,
                (SELECT COALESCE(SUM(s.totalA), 0) 
                 FROM protformr pf2 
                 JOIN formularioe f2 ON pf2.idformA = f2.idformA AND f2.estado = 'Entregado'
                 JOIN sexoe s ON f2.idformA = s.idformA 
                 WHERE pf2.idprotA = p.idprotA AND f2.IdUsrA = ?) as animales_usados
                FROM protocoloexpe p
                INNER JOIN protformr pf ON p.idprotA = pf.idprotA
                INNER JOIN formularioe f ON pf.idformA = f.idformA
                WHERE f.IdUsrA = ?
                GROUP BY p.idprotA, p.nprotA, p.tituloA, p.FechaFinProtA, p.CantidadAniA
                ORDER BY p.nprotA ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Insumos pedidos por el usuario (formularios categoría Insumos con ítems).
     * Incluye institución por formulario.
     */
    public function getInsumosPedidosByUser($userId) {
        $sql = "SELECT f.idformA, f.fechainicioA as Inicio, f.estado, f.IdInstitucion,
                i.NombreInst as NombreInstitucion
                FROM formularioe f
                INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                WHERE f.IdUsrA = ? AND tf.categoriaformulario = 'Insumos'
                ORDER BY f.idformA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $forms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($forms as $row) {
            $itemsSql = "SELECT i.NombreInsumo, fi.cantidad,
                         i.CantidadInsumo as PresentacionCant, i.TipoInsumo as PresentacionTipo
                         FROM forminsumo fi
                         JOIN insumo i ON fi.IdInsumo = i.idInsumo
                         JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                         WHERE pif.idformA = ?";
            $stItems = $this->db->prepare($itemsSql);
            $stItems->execute([$row['idformA']]);
            $row['items'] = $stItems->fetchAll(PDO::FETCH_ASSOC);
            $out[] = $row;
        }
        return $out;
    }

    /**
     * Insumos experimentales (reactivos) pedidos por el usuario.
     * Incluye institución. Campos: insumo, tipo/cantidad presentación, cantidad pedida, institución.
     */
    public function getInsumosExperimentalesPedidosByUser($userId) {
        $sql = "SELECT f.idformA, f.fechainicioA as Inicio, f.estado,
                ie.NombreInsumo, ie.CantidadInsumo as PresentacionCant, ie.TipoInsumo as PresentacionTipo,
                COALESCE(s.organo, 0) as Cantidad,
                f.IdInstitucion, i.NombreInst as NombreInstitucion
                FROM formularioe f
                INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario
                INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
                LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                LEFT JOIN sexoe s ON f.idformA = s.idformA
                WHERE f.IdUsrA = ? AND tf.categoriaformulario = 'Otros reactivos biologicos'
                ORDER BY f.idformA DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}