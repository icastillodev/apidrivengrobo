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

        $sql = "SELECT f.idformA, f.fechainicioA as Inicio, f.fecRetiroA as Retiro, f.estado, i.NombreInst as NombreInstitucion, tf.nombreTipo as TipoPedido, tf.categoriaformulario as Categoria, COALESCE(px.nprotA, 'N/A') as Protocolo, COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '---') as Departamento FROM formularioe f INNER JOIN institucion i ON f.IdInstitucion = i.IdInstitucion INNER JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario LEFT JOIN protformr pf ON f.idformA = pf.idformA LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA LEFT JOIN departamentoe dp ON pd.iddeptoA = dp.iddeptoA LEFT JOIN departamentoe d ON f.depto = d.iddeptoA WHERE f.IdUsrA = ? ORDER BY f.idformA DESC";

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

        } elseif ($head['categoriaformulario'] === 'Animal vivo') {
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
}