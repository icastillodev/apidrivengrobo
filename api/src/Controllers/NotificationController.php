<?php
namespace App\Controllers;

use App\Models\Comunicacion\MensajeriaModel;
use App\Models\Comunicacion\NoticiaModel;
use App\Models\Reactivo\ReactivoModel;
use App\Utils\Auditoria;

class NotificationController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /**
     * Misma noción de “pendiente” que la bandeja admin: sin estado explícito, NULL o vacío.
     */
    private function sqlFormularioEstadoPendienteBadge(string $alias = 'f'): string {
        $e = "{$alias}.estado";
        return "({$e} IS NULL OR TRIM(COALESCE({$e},'')) = '' OR LOWER(TRIM({$e})) = 'sin estado' OR {$e} = 'Sin estado')";
    }

    public function getMenuNotifications() {
        if (ob_get_length()) ob_clean();
        header('Content-Type: application/json');

        try {
            try {
                $sesion = Auditoria::getDatosSesion();
                $instId = $sesion['instId'];
            } catch (\Throwable $authError) {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Sesión inválida o expirada']);
                exit;
            }

            $sqlProt = "SELECT COUNT(DISTINCT s.IdSolicitudProtocolo) as total
                        FROM solicitudprotocolo s
                        INNER JOIN protocoloexpe p ON s.idprotA = p.idprotA
                        LEFT JOIN protinstr pi ON p.idprotA = pi.idprotA
                        WHERE s.Aprobado = 3
                          AND (
                            (s.TipoPedido = 1 AND p.IdInstitucion = ?)
                            OR
                            (s.TipoPedido = 2 AND (
                                s.IdInstitucion = ?
                                OR (s.IdInstitucion IS NULL AND pi.IdInstitucion = ?)
                            ))
                          )";
            $stmtProt = $this->db->prepare($sqlProt);
            $stmtProt->execute([$instId, $instId, $instId]);
            $countProtSolicitudes = (int)($stmtProt->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);

            $sqlProtRedIncomplete = "SELECT COUNT(DISTINCT p.idprotA) as total
                                     FROM protocoloexpe p
                                     JOIN protinstr pi ON pi.idprotA = p.idprotA
                                     LEFT JOIN protocoloexpered pr ON pr.idprotA = p.idprotA AND pr.IdInstitucion = ?
                                     WHERE pi.IdInstitucion = ?
                                       AND p.IdInstitucion <> ?
                                       AND (
                                            NOT EXISTS (
                                                SELECT 1 FROM solicitudprotocolo sRedAny
                                                WHERE sRedAny.idprotA = p.idprotA
                                                  AND sRedAny.TipoPedido = 2
                                            )
                                            OR EXISTS (
                                                SELECT 1 FROM solicitudprotocolo sRedOk
                                                WHERE sRedOk.idprotA = p.idprotA
                                                  AND sRedOk.TipoPedido = 2
                                                  AND sRedOk.IdInstitucion = ?
                                                  AND sRedOk.Aprobado = 1
                                            )
                                       )
                                       AND (
                                            pr.IdProtocoloExpRed IS NULL
                                            OR pr.IdUsrA IS NULL
                                            OR pr.iddeptoA IS NULL
                                            OR pr.idtipoprotocolo IS NULL
                                            OR pr.IdSeveridadTipo IS NULL
                                            OR (
                                                SELECT COUNT(*)
                                                FROM protocoloexpered_especies prs
                                                WHERE prs.IdProtocoloExpRed = pr.IdProtocoloExpRed
                                            ) <= 0
                                       )";
            $stmtProtRedIncomplete = $this->db->prepare($sqlProtRedIncomplete);
            $stmtProtRedIncomplete->execute([$instId, $instId, $instId, $instId]);
            $countProtRedIncomplete = (int)($stmtProtRedIncomplete->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
            $countProt = $countProtSolicitudes + $countProtRedIncomplete;

            $pend = $this->sqlFormularioEstadoPendienteBadge('f');
            $sqlAni = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario AND t.IdInstitucion = f.IdInstitucion
                       WHERE f.IdInstitucion = ? AND {$pend}
                       AND LOWER(TRIM(t.categoriaformulario)) IN ('animal', 'animal vivo')";
            $stmtAni = $this->db->prepare($sqlAni);
            $stmtAni->execute([$instId]);
            $countAni = $stmtAni->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;
            if ($this->tableExists('formulario_derivacion')) {
                $sqlAniDeriv = "SELECT COUNT(DISTINCT d.idformA) as total
                                FROM formulario_derivacion d
                                INNER JOIN formularioe f ON f.idformA = d.idformA
                                INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario AND t.IdInstitucion = f.IdInstitucion
                                WHERE d.IdInstitucionDestino = ?
                                  AND d.estado_derivacion = 1
                                  AND d.Activo = 1
                                  AND LOWER(TRIM(t.categoriaformulario)) IN ('animal', 'animal vivo')";
                $stmtAniDeriv = $this->db->prepare($sqlAniDeriv);
                $stmtAniDeriv->execute([$instId]);
                $countAni += (int)($stmtAniDeriv->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
            }

            $reaPred = ReactivoModel::sqlPredicadoFormularioReactivo('t');
            $sqlRea = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       LEFT JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario AND t.IdInstitucion = f.IdInstitucion
                       WHERE f.IdInstitucion = ? AND {$pend}
                       AND {$reaPred}";
            $stmtRea = $this->db->prepare($sqlRea);
            $stmtRea->execute([$instId]);
            $countRea = $stmtRea->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;
            if ($this->tableExists('formulario_derivacion')) {
                $sqlReaDeriv = "SELECT COUNT(DISTINCT d.idformA) as total
                                FROM formulario_derivacion d
                                INNER JOIN formularioe f ON f.idformA = d.idformA
                                LEFT JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario AND t.IdInstitucion = f.IdInstitucion
                                WHERE d.IdInstitucionDestino = ?
                                  AND d.estado_derivacion = 1
                                  AND d.Activo = 1
                                  AND {$reaPred}";
                $stmtReaDeriv = $this->db->prepare($sqlReaDeriv);
                $stmtReaDeriv->execute([$instId]);
                $countRea += (int)($stmtReaDeriv->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
            }

            $sqlIns = "SELECT COUNT(f.idformA) as total 
                       FROM formularioe f 
                       INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario AND t.IdInstitucion = f.IdInstitucion
                       WHERE f.IdInstitucion = ? AND {$pend}
                       AND LOWER(TRIM(t.categoriaformulario)) = 'insumos'";
            $stmtIns = $this->db->prepare($sqlIns);
            $stmtIns->execute([$instId]);
            $countIns = $stmtIns->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0;
            if ($this->tableExists('formulario_derivacion')) {
                $sqlInsDeriv = "SELECT COUNT(DISTINCT d.idformA) as total
                                FROM formulario_derivacion d
                                INNER JOIN formularioe f ON f.idformA = d.idformA
                                INNER JOIN tipoformularios t ON f.tipoA = t.IdTipoFormulario AND t.IdInstitucion = f.IdInstitucion
                                WHERE d.IdInstitucionDestino = ?
                                  AND d.estado_derivacion = 1
                                  AND d.Activo = 1
                                  AND LOWER(TRIM(t.categoriaformulario)) = 'insumos'";
                $stmtInsDeriv = $this->db->prepare($sqlInsDeriv);
                $stmtInsDeriv->execute([$instId]);
                $countIns += (int)($stmtInsDeriv->fetch(\PDO::FETCH_ASSOC)['total'] ?? 0);
            }

            $countMensajes = 0;
            if ($this->tableExists('mensaje') && $this->tableExists('mensaje_hilo') && $this->tableExists('mensaje_leido')) {
                $countMensajes = $this->getMensajesNoLeidosCount((int)$sesion['userId'], (int)$instId);
            }

            $noticiasDesde = isset($_GET['noticias_desde']) ? trim((string)$_GET['noticias_desde']) : '';
            $countNoticiasNuevas = 0;
            $countBorradores = 0;
            if ($this->tableExists('noticia')) {
                try {
                    $nm = new NoticiaModel($this->db);
                    $desdeSql = $noticiasDesde !== ''
                        ? $noticiasDesde
                        : date('Y-m-d H:i:s', strtotime('-7 days'));
                    $tsDesde = strtotime($desdeSql);
                    if ($tsDesde === false) {
                        $desdeSql = date('Y-m-d H:i:s', strtotime('-7 days'));
                    } else {
                        $desdeSql = date('Y-m-d H:i:s', $tsDesde);
                    }
                    $countNoticiasNuevas = $nm->countPublicadasDesde((int)$instId, $desdeSql);
                    $countBorradores = $nm->countBorradores((int)$instId);
                } catch (\Throwable $e) {
                    $countNoticiasNuevas = 0;
                    $countBorradores = 0;
                }
            }

            echo json_encode([
                'status' => 'success',
                'data' => [
                    'protocolos' => (int)$countProt,
                    'protocolos_solicitudes' => (int)$countProtSolicitudes,
                    'protocolos_red_incompletos' => (int)$countProtRedIncomplete,
                    'animales'   => (int)$countAni,
                    'reactivos'  => (int)$countRea,
                    'insumos'    => (int)$countIns,
                    'reservas'   => (int)$this->getReservasPendientesCount($instId),
                    'mensajes'   => (int)$countMensajes,
                    'noticias_nuevas' => (int)$countNoticiasNuevas,
                    'noticias_borradores' => (int)$countBorradores
                ]
            ]);

        } catch (\Throwable $e) {
            // No expulsar sesión por errores de consulta de badges/menu.
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'protocolos' => 0,
                    'protocolos_solicitudes' => 0,
                    'protocolos_red_incompletos' => 0,
                    'animales' => 0,
                    'reactivos' => 0,
                    'insumos' => 0,
                    'reservas' => 0,
                    'mensajes' => 0,
                    'noticias_nuevas' => 0,
                    'noticias_borradores' => 0
                ],
                'warning' => 'No se pudieron calcular notificaciones'
            ]);
        }
        exit;
    }

    private function getMensajesNoLeidosCount(int $userId, int $instId): int {
        try {
            $model = new MensajeriaModel($this->db);

            return $model->countUnreadInstitucional($userId, $instId);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    private function getReservasPendientesCount($instId): int {
        try {
            $stmt = $this->db->prepare("SELECT COUNT(*) AS c FROM reserva WHERE IdInstitucion = ? AND Aprobada = 0");
            $stmt->execute([$instId]);
            return (int)($stmt->fetch(\PDO::FETCH_ASSOC)['c'] ?? 0);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    private function tableExists(string $tableName): bool {
        try {
            $stmt = $this->db->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$tableName]);
            return (bool)$stmt->fetch(\PDO::FETCH_NUM);
        } catch (\Throwable $e) {
            return false;
        }
    }
}