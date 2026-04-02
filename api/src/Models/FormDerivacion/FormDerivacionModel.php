<?php
namespace App\Models\FormDerivacion;

use PDO;
use Exception;
use App\Utils\Auditoria;

class FormDerivacionModel
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public static function assertInstitutionCanMutate($db, $idformA, $instId)
    {
        if (!self::tableExists($db, 'formulario_owner_actual')) {
            // Si no está aplicada la migración de derivaciones, no bloquear edición legacy.
            return;
        }
        $sql = "SELECT COALESCE(foa.IdInstitucionActual, f.IdInstitucion) as InstActual
                FROM formularioe f
                LEFT JOIN formulario_owner_actual foa ON foa.idformA = f.idformA
                WHERE f.idformA = ?
                LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([(int)$idformA]);
        $actual = (int)($stmt->fetchColumn() ?: 0);

        if ($actual <= 0) {
            throw new Exception("Formulario no encontrado.");
        }
        if ((int)$instId !== $actual) {
            throw new Exception("El formulario está derivado y no pertenece a la institución actual.");
        }

        // Si la derivación está pendiente, la institución destino aún no puede editar:
        // primero debe aceptar la derivación.
        if (self::tableExists($db, 'formulario_derivacion')) {
            $sqlPend = "SELECT 1
                        FROM formulario_derivacion
                        WHERE idformA = ?
                          AND Activo = 1
                          AND estado_derivacion = 1
                          AND IdInstitucionDestino = ?
                        LIMIT 1";
            $stmtPend = $db->prepare($sqlPend);
            $stmtPend->execute([(int)$idformA, (int)$instId]);
            if ($stmtPend->fetchColumn()) {
                throw new Exception("Debe aceptar la derivación antes de comenzar a trabajar este formulario.");
            }
        }
    }

    private static function tableExists($db, string $tableName): bool
    {
        try {
            $stmt = $db->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$tableName]);
            return (bool)$stmt->fetch(\PDO::FETCH_NUM);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function derive(array $data)
    {
        $idformA = (int)($data['idformA'] ?? 0);
        $instOrigen = (int)($data['instOrigen'] ?? 0);
        $instDestino = (int)($data['instDestino'] ?? 0);
        $usrOrigen = (int)($data['usrOrigen'] ?? 0);
        $usrDestino = !empty($data['usrDestino']) ? (int)$data['usrDestino'] : null;
        $mensaje = trim((string)($data['mensaje'] ?? ''));

        if ($idformA <= 0 || $instOrigen <= 0 || $instDestino <= 0 || $usrOrigen <= 0) {
            throw new Exception("Faltan datos obligatorios para derivar.");
        }
        if ($instOrigen === $instDestino) {
            throw new Exception("La institución destino debe ser distinta a la actual.");
        }

        $this->db->beginTransaction();
        try {
            $form = $this->getFormBase($idformA);
            if (!$form) {
                throw new Exception("Formulario no encontrado.");
            }

            $owner = $this->ensureOwnerRow($idformA, (int)$form['IdInstitucion'], (int)$form['IdUsrA']);
            if ((int)$owner['IdInstitucionActual'] !== $instOrigen) {
                throw new Exception("Solo la institución dueña actual puede derivar este formulario.");
            }

            $this->assertInstitucionesMismaRed($instOrigen, $instDestino);
            if ($usrDestino !== null) {
                $this->assertUserBelongsToInstitution($usrDestino, $instDestino);
            }

            $activeDeriv = $this->getActiveDerivation($idformA);
            if ($activeDeriv) {
                throw new Exception("El formulario ya tiene una derivación activa.");
            }

            $snapshotData = $this->getFormDataForSnapshot($idformA, $form['categoriaformulario'] ?? '');

            // Modelo sin copia: misma idformA; derivación en formulario_derivacion.
            // No se crea nuevo formularioe; origen y destino ven el mismo formulario.
            $hasIdformAOrigen = $this->columnExists('formulario_derivacion', 'idformAOrigen');
            if ($hasIdformAOrigen) {
                $sqlDeriv = "INSERT INTO formulario_derivacion
                            (idformA, idformAOrigen, IdFormularioDerivacionPadre, IdInstitucionOrigen, IdInstitucionDestino, IdUsrOrigen, IdUsrDestinoResponsable,
                             estado_derivacion, mensaje_origen, FechaCreado, Activo)
                             VALUES (?, ?, NULL, ?, ?, ?, ?, 1, ?, NOW(), 1)";
                $stmtDeriv = $this->db->prepare($sqlDeriv);
                $stmtDeriv->execute([$idformA, $idformA, $instOrigen, $instDestino, $usrOrigen, $usrDestino, $mensaje !== '' ? $mensaje : null]);
            } else {
                $sqlDeriv = "INSERT INTO formulario_derivacion
                            (idformA, IdFormularioDerivacionPadre, IdInstitucionOrigen, IdInstitucionDestino, IdUsrOrigen, IdUsrDestinoResponsable,
                             estado_derivacion, mensaje_origen, FechaCreado, Activo)
                             VALUES (?, NULL, ?, ?, ?, ?, 1, ?, NOW(), 1)";
                $stmtDeriv = $this->db->prepare($sqlDeriv);
                $stmtDeriv->execute([$idformA, $instOrigen, $instDestino, $usrOrigen, $usrDestino, $mensaje !== '' ? $mensaje : null]);
            }
            $idDeriv = (int)$this->db->lastInsertId();

            if ($snapshotData && self::tableExists($this->db, 'formulario_datos_originales')) {
                $json = json_encode($snapshotData);
                $this->db->prepare("INSERT INTO formulario_datos_originales (idformA, IdFormularioDerivacion, datos_json) VALUES (?, ?, ?)")
                    ->execute([$idformA, $idDeriv, $json]);
            }

            // Marcar formulario original como derivado (pendiente). Owner sigue en origen hasta que destino acepte.
            $setParts = [];
            if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                $setParts[] = "EstadoWorkflow = 'DERIVADO_PENDIENTE'";
            }
            if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                $setParts[] = "DerivadoActivo = 1";
            }
            if ($this->columnExists('formularioe', 'IdInstitucionOrigen')) {
                $setParts[] = "IdInstitucionOrigen = " . (int)$instOrigen;
            }
            if (!empty($setParts)) {
                $this->db->prepare("UPDATE formularioe SET " . implode(', ', $setParts) . " WHERE idformA = ?")->execute([$idformA]);
            }
            $this->upsertOwner($idformA, $instOrigen, $usrOrigen, $idDeriv, 1);

            $this->insertHistorial(
                $idformA,
                $form['estado'] ?? null,
                'DERIVADO_PENDIENTE',
                'Derivado desde institución ' . $instOrigen . ' a institución ' . $instDestino,
                $usrOrigen,
                $instOrigen,
                $idDeriv
            );

            if (self::tableExists($this->db, 'facturacion_formulario_derivado')) {
                $tipo = $this->mapTipoFormulario($form['categoriaformulario'] ?? '');
                $montoTotal = $this->getFormTotalForFacturacionDerivada($idformA, $form['categoriaformulario'] ?? '');
                $stmtFac = $this->db->prepare("INSERT INTO facturacion_formulario_derivado
                                              (idformA, IdFormularioDerivacion, IdInstitucionCobradora, IdInstitucionSolicitante,
                                               IdUsrSolicitante, tipo_formulario, monto_total, monto_pagado, estado_cobro)
                                               VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)");
                $stmtFac->execute([$idformA, $idDeriv, $instDestino, $instOrigen, $usrOrigen, $tipo, $montoTotal]);
            }

            Auditoria::logManual($this->db, $usrOrigen, 'FORM_DERIVE', 'formulario_derivacion', "Formulario #{$idformA} derivado a institución #{$instDestino} (misma id)");

            $this->db->commit();
            return ['idDerivacion' => $idDeriv];
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function accept(array $data)
    {
        return $this->resolveDerivation($data, 'accept');
    }

    public function returnToOrigin(array $data)
    {
        return $this->resolveDerivation($data, 'return');
    }

    public function reject(array $data)
    {
        return $this->resolveDerivation($data, 'reject');
    }

    public function cancel(array $data)
    {
        return $this->resolveDerivation($data, 'cancel');
    }

    /**
     * Obtiene la derivación activa de un formulario y determina si instId es origen o destino.
     * @return array|null {IdFormularioDerivacion, IdInstitucionOrigen, IdInstitucionDestino, estado_origen?, estado_destino?, is_origin, is_destination} o null si no hay derivación activa
     */
    public function getDerivationByFormAndInst($idformA, $instId)
    {
        $deriv = $this->getActiveDerivation((int)$idformA);
        if (!$deriv) {
            return null;
        }
        $instId = (int)$instId;
        $isOrigin = (int)($deriv['IdInstitucionOrigen'] ?? 0) === $instId;
        $isDestination = (int)($deriv['IdInstitucionDestino'] ?? 0) === $instId;
        return array_merge($deriv, ['is_origin' => $isOrigin, 'is_destination' => $isDestination]);
    }

    public function getHistory($idformA, $instId)
    {
        $idformA = (int)$idformA;
        $instId = (int)$instId;
        if ($idformA <= 0) {
            throw new Exception("Falta idformA.");
        }

        $this->assertCanSeeForm($idformA, $instId);

        $sql = "SELECT
                    d.IdFormularioDerivacion,
                    d.idformA,
                    d.IdInstitucionOrigen,
                    io.NombreInst as InstitucionOrigenNombre,
                    d.IdInstitucionDestino,
                    idst.NombreInst as InstitucionDestinoNombre,
                    d.IdUsrOrigen,
                    d.IdUsrDestinoResponsable,
                    d.estado_derivacion,
                    d.mensaje_origen,
                    d.mensaje_destino,
                    d.motivo_rechazo,
                    d.FechaCreado,
                    d.FechaRespondido,
                    d.FechaCerrado,
                    d.Activo
                FROM formulario_derivacion d
                LEFT JOIN institucion io ON io.IdInstitucion = d.IdInstitucionOrigen
                LEFT JOIN institucion idst ON idst.IdInstitucion = d.IdInstitucionDestino
                WHERE d.idformA = ?" . ($this->columnExists('formulario_derivacion', 'idformAOrigen') ? " OR d.idformAOrigen = ?" : "") . "
                ORDER BY d.IdFormularioDerivacion DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($this->columnExists('formulario_derivacion', 'idformAOrigen') ? [$idformA, $idformA] : [$idformA]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPendingForInstitution($instId)
    {
        $instId = (int)$instId;
        $sql = "SELECT
                    d.IdFormularioDerivacion,
                    d.idformA,
                    d.IdInstitucionOrigen,
                    io.NombreInst as InstitucionOrigenNombre,
                    d.FechaCreado
                FROM formulario_derivacion d
                LEFT JOIN institucion io ON io.IdInstitucion = d.IdInstitucionOrigen
                WHERE d.IdInstitucionDestino = ?
                  AND d.estado_derivacion = 1
                  AND d.Activo = 1
                ORDER BY d.IdFormularioDerivacion DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTargetsForInstitution($instId)
    {
        $instId = (int)$instId;
        if ($instId <= 0) {
            return [];
        }

        $hasRed = $this->columnExists('institucion', 'red');
        $hasDep = $this->columnExists('institucion', 'DependenciaInstitucion');
        $hasMadreGrupo = $this->columnExists('institucion', 'madre_grupo');
        $hasActivo = $this->columnExists('institucion', 'Activo');

        if (!$hasRed && !$hasDep && !$hasMadreGrupo) {
            return [];
        }

        $fields = [];
        if ($hasRed) {
            $fields[] = "TRIM(COALESCE(red, '')) as red_val";
        }
        if ($hasDep) {
            $fields[] = "TRIM(COALESCE(DependenciaInstitucion, '')) as dep_val";
        }
        if ($hasMadreGrupo) {
            $fields[] = "TRIM(COALESCE(madre_grupo, '')) as madre_grupo_val";
        }
        $sqlMeta = "SELECT " . implode(', ', $fields) . " FROM institucion WHERE IdInstitucion = ? LIMIT 1";
        $stmtMeta = $this->db->prepare($sqlMeta);
        $stmtMeta->execute([$instId]);
        $meta = $stmtMeta->fetch(PDO::FETCH_ASSOC) ?: [];

        $redVal = $hasRed ? trim((string)($meta['red_val'] ?? '')) : '';
        $depVal = $hasDep ? trim((string)($meta['dep_val'] ?? '')) : '';
        $madreGrupoVal = $hasMadreGrupo ? trim((string)($meta['madre_grupo_val'] ?? '')) : '';

        $sql = "SELECT IdInstitucion, NombreInst FROM institucion WHERE IdInstitucion <> ?";
        $params = [$instId];

        if ($redVal !== '') {
            $sql .= " AND TRIM(COALESCE(red, '')) = ?";
            $params[] = $redVal;
        } elseif ($depVal !== '') {
            $sql .= " AND TRIM(COALESCE(DependenciaInstitucion, '')) = ?";
            $params[] = $depVal;
        } elseif ($madreGrupoVal !== '' && $madreGrupoVal !== '0') {
            $sql .= " AND TRIM(COALESCE(madre_grupo, '')) = ?";
            $params[] = $madreGrupoVal;
        } else {
            return [];
        }

        if ($hasActivo) {
            $sql .= " AND Activo = 1";
        }

        $sql .= " ORDER BY NombreInst ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function columnExists(string $table, string $column): bool
    {
        try {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM {$table} LIKE ?");
            $stmt->execute([$column]);
            return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function resolveDerivation(array $data, $action)
    {
        $idDeriv = (int)($data['idDerivacion'] ?? 0);
        $instAccion = (int)($data['instAccion'] ?? 0);
        $usrAccion = (int)($data['usrAccion'] ?? 0);
        $mensaje = trim((string)($data['mensaje'] ?? ''));

        if ($idDeriv <= 0 || $instAccion <= 0 || $usrAccion <= 0) {
            throw new Exception("Faltan datos obligatorios.");
        }

        $this->db->beginTransaction();
        try {
            $deriv = $this->getDerivationByIdForUpdate($idDeriv);
            if (!$deriv) {
                throw new Exception("Derivación no encontrada.");
            }
            if ((int)$deriv['Activo'] !== 1) {
                throw new Exception("La derivación ya está cerrada.");
            }

            $idformADerivado = (int)$deriv['idformA'];
            $idformAOrigen = isset($deriv['idformAOrigen']) && $deriv['idformAOrigen'] !== null && $deriv['idformAOrigen'] !== '' ? (int)$deriv['idformAOrigen'] : null;
            $instOrigen = (int)$deriv['IdInstitucionOrigen'];
            $instDestino = (int)$deriv['IdInstitucionDestino'];
            // Solo eliminar copia si existía formulario derivado distinto (modelo antiguo con copia).
            // Modelo sin copia: idformA = idformAOrigen → no eliminar.
            $esNuevaDerivacion = $idformAOrigen !== null && $idformAOrigen > 0 && $idformAOrigen !== $idformADerivado;

            $owner = $this->ensureOwnerRow($idformADerivado);
            if ((int)$owner['IdFormularioDerivacionActiva'] !== $idDeriv) {
                throw new Exception("La derivación no coincide con el owner actual del formulario.");
            }

            $form = $this->getFormBase($idformADerivado);

            if ($action === 'accept') {
                if ($instAccion !== $instDestino) {
                    throw new Exception("Solo la institución destino puede aceptar la derivación.");
                }
                if ((int)$deriv['estado_derivacion'] !== 1) {
                    throw new Exception("Solo se pueden aceptar derivaciones pendientes.");
                }

                $this->db->prepare("UPDATE formulario_derivacion
                                    SET estado_derivacion = 2, mensaje_destino = ?, FechaRespondido = NOW()
                                    WHERE IdFormularioDerivacion = ?")
                         ->execute([$mensaje !== '' ? $mensaje : null, $idDeriv]);

                $this->upsertOwner($idformADerivado, $instDestino, $usrAccion, $idDeriv, 1);
                $setParts = [];
                if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                    $setParts[] = "EstadoWorkflow = 'DERIVADO_ACEPTADO'";
                }
                if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                    $setParts[] = "DerivadoActivo = 1";
                }
                if (!empty($setParts)) {
                    $this->db->prepare("UPDATE formularioe SET " . implode(', ', $setParts) . " WHERE idformA = ?")
                             ->execute([$idformADerivado]);
                }
                $this->insertHistorial($idformADerivado, $form['estado'] ?? null, 'DERIVADO_ACEPTADO', 'Derivación aceptada por institución destino', $usrAccion, $instAccion, $idDeriv);
                Auditoria::logManual($this->db, $usrAccion, 'FORM_DERIVE_ACCEPT', 'formulario_derivacion', "Derivación #{$idDeriv} aceptada");
            } elseif ($action === 'return' || $action === 'reject' || $action === 'cancel') {
                if ($action === 'cancel') {
                    if ($instAccion !== $instOrigen) {
                        throw new Exception("Solo la institución origen puede cancelar/retirar la derivación.");
                    }
                    if (!in_array((int)$deriv['estado_derivacion'], [1, 2], true)) {
                        throw new Exception("Solo se pueden cancelar derivaciones pendientes o aceptadas.");
                    }
                    $newEstado = 5;
                    $workflow = 'DERIVACION_CANCELADA';
                    $detalle = 'Derivación cancelada por institución origen';
                    $colMsg = 'mensaje_origen';
                    $colRechazo = null;
                } else {
                    if ($instAccion !== $instDestino) {
                        throw new Exception("Solo la institución destino puede devolver o rechazar.");
                    }
                    if ((int)$deriv['estado_derivacion'] !== 1 && !((int)$deriv['estado_derivacion'] === 2 && $action === 'return')) {
                        throw new Exception("Estado de derivación inválido para esta acción.");
                    }
                    $newEstado = ($action === 'return') ? 3 : 4;
                    $workflow = ($action === 'return') ? 'DERIVADO_DEVUELTO' : 'DERIVADO_RECHAZADO';
                    $detalle = ($action === 'return') ? 'Derivación devuelta a origen' : 'Derivación rechazada por destino';
                    $colMsg = ($action === 'return') ? 'mensaje_destino' : null;
                    $colRechazo = ($action === 'reject') ? 'motivo_rechazo' : null;
                }

                $set = "estado_derivacion = ?, FechaRespondido = NOW(), FechaCerrado = NOW(), Activo = 0";
                $params = [$newEstado];
                if ($colMsg !== null) {
                    $set .= ", {$colMsg} = ?";
                    $params[] = $mensaje !== '' ? $mensaje : null;
                }
                if ($colRechazo !== null) {
                    $set .= ", {$colRechazo} = ?";
                    $params[] = $mensaje !== '' ? $mensaje : null;
                }
                $params[] = $idDeriv;

                $this->db->prepare("UPDATE formulario_derivacion SET {$set} WHERE IdFormularioDerivacion = ?")
                         ->execute($params);

                if ($esNuevaDerivacion) {
                    $this->deleteFormularioAndRelated($idformADerivado);
                } else {
                    $this->upsertOwner($idformADerivado, $instOrigen, (int)$deriv['IdUsrOrigen'], null, 0);
                    $setParts = [];
                    $paramsForm = [];
                    if ($idformAOrigen === $idformADerivado) {
                        // Modelo sin copia: no cambiar IdInstitucion (ya es origen)
                        if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                            $setParts[] = "EstadoWorkflow = ?";
                            $paramsForm[] = $workflow;
                        }
                        if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                            $setParts[] = "DerivadoActivo = 0";
                        }
                        if ($this->columnExists('formularioe', 'IdInstitucionOrigen')) {
                            $setParts[] = "IdInstitucionOrigen = NULL";
                        }
                    } else {
                        $setParts[] = "IdInstitucion = ?";
                        $paramsForm[] = $instOrigen;
                        if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                            $setParts[] = "EstadoWorkflow = ?";
                            $paramsForm[] = $workflow;
                        }
                        if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                            $setParts[] = "DerivadoActivo = 0";
                        }
                    }
                    $paramsForm[] = $idformADerivado;
                    if (!empty($setParts)) {
                        $this->db->prepare("UPDATE formularioe SET " . implode(', ', $setParts) . " WHERE idformA = ?")
                                 ->execute($paramsForm);
                    }
                    $this->insertHistorial($idformADerivado, $form['estado'] ?? null, $workflow, $detalle, $usrAccion, $instAccion, $idDeriv);
                }

                if (self::tableExists($this->db, 'facturacion_formulario_derivado') && $action !== 'return') {
                    $this->db->prepare("UPDATE facturacion_formulario_derivado
                                        SET estado_cobro = 4
                                        WHERE IdFormularioDerivacion = ?")
                             ->execute([$idDeriv]);
                }

                $bitacoraAccion = ($action === 'return') ? 'FORM_DERIVE_RETURN' : (($action === 'reject') ? 'FORM_DERIVE_REJECT' : 'FORM_DERIVE_CANCEL');
                Auditoria::logManual($this->db, $usrAccion, $bitacoraAccion, 'formulario_derivacion', "Derivación #{$idDeriv} resuelta");
            } else {
                throw new Exception("Acción de derivación no soportada.");
            }

            $this->db->commit();
            return ['ok' => true];
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function getFormBase($idformA)
    {
        $hasWorkflow = $this->columnExists('formularioe', 'EstadoWorkflow');
        $hasDerivado = $this->columnExists('formularioe', 'DerivadoActivo');
        $extraCols = [];
        $extraCols[] = $hasWorkflow ? "f.EstadoWorkflow" : "NULL as EstadoWorkflow";
        $extraCols[] = $hasDerivado ? "f.DerivadoActivo" : "0 as DerivadoActivo";
        $sql = "SELECT f.idformA, f.IdInstitucion, f.IdUsrA, f.estado, " . implode(', ', $extraCols) . ",
                       tf.categoriaformulario
                FROM formularioe f
                LEFT JOIN tipoformularios tf ON tf.IdTipoFormulario = f.tipoA
                WHERE f.idformA = ?
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene los datos del formulario para guardar como snapshot al derivar (datos originales).
     * Incluye header completo y details para mostrar siempre el pedido original en mis formularios.
     */
    private function getFormDataForSnapshot($idformA, $categoria): array
    {
        $header = [];
        $stmtHead = $this->db->prepare("SELECT f.fechainicioA, f.fecRetiroA, f.aclaraA, f.estado,
            COALESCE(tf.nombreTipo, '') as nombreTipo,
            COALESCE(tf.categoriaformulario, '') as categoria,
            COALESCE(tf.color, '') as colorTipo,
            f.tipoA as idTipoFormulario,
            i.NombreInst as NombreInstitucion,
            i.InstCorreo, i.InstContacto,
            COALESCE(px.nprotA, '') as nprotA,
            COALESCE(px.tituloA, '') as TituloProtocolo,
            COALESCE(d.NombreDeptoA, dp.NombreDeptoA, '') as NombreDeptoA,
            COALESCE(f.depto, pd.iddeptoA) as idDepto,
            f.idsubespA as idsubespA,
            f.idcepaA as idcepaA,
            COALESCE(o.NombreOrganismoSimple, '') as NombreOrganismoSimple
            FROM formularioe f
            LEFT JOIN institucion i ON f.IdInstitucion = i.IdInstitucion
            LEFT JOIN tipoformularios tf ON f.tipoA = tf.IdTipoFormulario AND tf.IdInstitucion = f.IdInstitucion
            LEFT JOIN protformr pf ON f.idformA = pf.idformA
            LEFT JOIN protocoloexpe px ON pf.idprotA = px.idprotA
            LEFT JOIN protdeptor pd ON px.idprotA = pd.idprotA
            LEFT JOIN departamentoe dp ON pd.iddeptoA = dp.iddeptoA
            LEFT JOIN departamentoe d ON f.depto = d.iddeptoA
            LEFT JOIN organismoe o ON COALESCE(d.organismopertenece, dp.organismopertenece) = o.IdOrganismo
            WHERE f.idformA = ? LIMIT 1");
        $stmtHead->execute([$idformA]);
        $header = $stmtHead->fetch(\PDO::FETCH_ASSOC) ?: [];

        $nombreTipo = (string)($header['nombreTipo'] ?? '');
        $headerCategoria = (string)($header['categoria'] ?? $categoria);

        $details = [];
        if ($categoria === 'Insumos') {
            $stmt = $this->db->prepare("SELECT i.NombreInsumo, i.CantidadInsumo as PresentacionCant, i.TipoInsumo as PresentacionTipo, fi.cantidad
                FROM forminsumo fi JOIN insumo i ON fi.IdInsumo = i.idInsumo
                JOIN precioinsumosformulario pif ON fi.idPrecioinsumosformulario = pif.idPrecioinsumosformulario
                WHERE pif.idformA = ?");
            $stmt->execute([$idformA]);
            $details = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } elseif ($categoria === 'Animal') {
            $stmt = $this->db->prepare("SELECT s.machoA, s.hembraA, s.indistintoA, s.totalA, e.EspeNombreA, sub.SubEspeNombreA, c.CepaNombreA
                FROM sexoe s LEFT JOIN formularioe f ON s.idformA = f.idformA
                LEFT JOIN subespecie sub ON f.idsubespA = sub.idsubespA
                LEFT JOIN especiee e ON sub.idespA = e.idespA
                LEFT JOIN cepa c ON f.idcepaA = c.idcepaA
                WHERE s.idformA = ?");
            $stmt->execute([$idformA]);
            $details = $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['machoA' => 0, 'hembraA' => 0, 'indistintoA' => 0, 'totalA' => 0, 'EspeNombreA' => '', 'SubEspeNombreA' => '', 'CepaNombreA' => ''];
        } else {
            $stmt = $this->db->prepare("SELECT ie.NombreInsumo, ie.CantidadInsumo as PresentacionCant, ie.TipoInsumo as PresentacionTipo, COALESCE(s.organo, 0) as Cantidad
                FROM formularioe f LEFT JOIN insumoexperimental ie ON f.reactivo = ie.IdInsumoexp
                LEFT JOIN sexoe s ON f.idformA = s.idformA WHERE f.idformA = ?");
            $stmt->execute([$idformA]);
            $details = $stmt->fetch(\PDO::FETCH_ASSOC) ?: ['NombreInsumo' => '', 'PresentacionCant' => '', 'PresentacionTipo' => '', 'Cantidad' => 0];
        }
        return [
            'categoria' => $headerCategoria ?: $categoria,
            'nombreTipo' => $nombreTipo,
            'header' => $header,
            'details' => $details
        ];
    }

    /**
     * Copia el formulario y sus tablas relacionadas a la institución destino.
     * El original NO se modifica. Retorna el idformA del nuevo formulario.
     */
    private function copyFormularioToInstitution($idformAOrigen, $instDestino, $instOrigen, $categoria): int
    {
        $stmt = $this->db->prepare("SELECT * FROM formularioe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idformAOrigen]);
        $orig = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$orig) {
            throw new Exception("Formulario original no encontrado.");
        }

        $cols = array_keys($orig);
        $cols = array_diff($cols, ['idformA']);
        $placeholders = array_fill(0, count($cols), '?');
        $values = [];
        foreach ($cols as $c) {
            $v = $orig[$c];
            if ($c === 'IdInstitucion') {
                $v = $instDestino;
            } elseif ($c === 'estado') {
                $v = 'Sin estado';
            } elseif ($c === 'IdInstitucionOrigen' && $this->columnExists('formularioe', 'IdInstitucionOrigen')) {
                $v = $instOrigen;
            } elseif ($c === 'EstadoWorkflow' && $this->columnExists('formularioe', 'EstadoWorkflow')) {
                $v = 'DERIVADO_PENDIENTE';
            } elseif ($c === 'DerivadoActivo' && $this->columnExists('formularioe', 'DerivadoActivo')) {
                $v = 1;
            } elseif ($c === 'FechaDerivado' && $this->columnExists('formularioe', 'FechaDerivado')) {
                $v = date('Y-m-d H:i:s');
            } elseif ($c === 'visto') {
                $v = 0;
            }
            $values[] = $v;
        }
        $sql = "INSERT INTO formularioe (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $this->db->prepare($sql)->execute($values);
        $idformADerivado = (int)$this->db->lastInsertId();

        $this->copySexoe($idformAOrigen, $idformADerivado);
        $this->copyProtformr($idformAOrigen, $idformADerivado);
        $this->copyPrecioformulario($idformAOrigen, $idformADerivado);

        $cat = strtolower(trim((string)$categoria));
        if (in_array($cat, ['insumos', 'insumo'], true)) {
            $this->copyPrecioInsumosFormulario($idformAOrigen, $idformADerivado);
        }
        if ($this->hasFormespe($idformAOrigen)) {
            $this->copyFormespe($idformAOrigen, $idformADerivado);
        }

        return $idformADerivado;
    }

    private function copySexoe($idOrig, $idNew): void
    {
        $stmt = $this->db->prepare("SELECT * FROM sexoe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idOrig]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return;
        $this->db->prepare("INSERT INTO sexoe (idformA, machoA, hembraA, indistintoA, totalA, organo) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$idNew, $row['machoA'] ?? 0, $row['hembraA'] ?? 0, $row['indistintoA'] ?? 0, $row['totalA'] ?? 0, $row['organo'] ?? null]);
    }

    private function copyProtformr($idOrig, $idNew): void
    {
        $stmt = $this->db->prepare("SELECT idprotA FROM protformr WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idOrig]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['idprotA'])) return;
        $this->db->prepare("INSERT INTO protformr (idformA, idprotA) VALUES (?, ?)")->execute([$idNew, $row['idprotA']]);
    }

    private function copyPrecioformulario($idOrig, $idNew): void
    {
        $stmt = $this->db->prepare("SELECT precioanimalmomento, precioformulario, totalpago, fechaIniForm FROM precioformulario WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idOrig]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return;
        $this->db->prepare("INSERT INTO precioformulario (idformA, precioanimalmomento, precioformulario, totalpago, fechaIniForm) VALUES (?, ?, ?, ?, ?)")
            ->execute([$idNew, $row['precioanimalmomento'] ?? 0, $row['precioformulario'] ?? 0, 0, $row['fechaIniForm'] ?? date('Y-m-d')]);
    }

    private function copyPrecioInsumosFormulario($idOrig, $idNew): void
    {
        $stmt = $this->db->prepare("SELECT idPrecioinsumosformulario FROM precioinsumosformulario WHERE idformA = ?");
        $stmt->execute([$idOrig]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) return;
        foreach ($rows as $pif) {
            $idPrecioOrig = (int)$pif['idPrecioinsumosformulario'];
            $this->db->prepare("INSERT INTO precioinsumosformulario (idformA, totalpago) VALUES (?, 0)")->execute([$idNew]);
            $idPrecioNew = (int)$this->db->lastInsertId();
            $stmtFi = $this->db->prepare("SELECT IdInsumo, cantidad, PrecioMomentoInsumo FROM forminsumo WHERE idPrecioinsumosformulario = ?");
            $stmtFi->execute([$idPrecioOrig]);
            foreach ($stmtFi->fetchAll(PDO::FETCH_ASSOC) as $fi) {
                $this->db->prepare("INSERT INTO forminsumo (idPrecioinsumosformulario, IdInsumo, cantidad, PrecioMomentoInsumo) VALUES (?, ?, ?, ?)")
                    ->execute([$idPrecioNew, $fi['IdInsumo'], $fi['cantidad'], $fi['PrecioMomentoInsumo'] ?? 0]);
            }
        }
    }

    private function hasFormespe($idformA): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM formespe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idformA]);
        return (bool)$stmt->fetchColumn();
    }

    private function copyFormespe($idOrig, $idNew): void
    {
        $stmt = $this->db->prepare("SELECT idespA FROM formespe WHERE idformA = ?");
        $stmt->execute([$idOrig]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $this->db->prepare("INSERT INTO formespe (idformA, idespA) VALUES (?, ?)")->execute([$idNew, $r['idespA']]);
        }
    }

    private function deleteFormularioAndRelated($idformA): void
    {
        $idformA = (int)$idformA;
        if (self::tableExists($this->db, 'facturacion_formulario_derivado')) {
            $this->db->prepare("DELETE FROM facturacion_formulario_derivado WHERE idformA = ?")->execute([$idformA]);
        }
        if (self::tableExists($this->db, 'formulario_datos_originales')) {
            $this->db->prepare("DELETE FROM formulario_datos_originales WHERE idformA = ?")->execute([$idformA]);
        }
        if (self::tableExists($this->db, 'formulario_estado_historial')) {
            $this->db->prepare("DELETE FROM formulario_estado_historial WHERE idformA = ?")->execute([$idformA]);
        }
        if (self::tableExists($this->db, 'formulario_owner_actual')) {
            $this->db->prepare("DELETE FROM formulario_owner_actual WHERE idformA = ?")->execute([$idformA]);
        }
        if (self::tableExists($this->db, 'formulario_derivacion')) {
            if ($this->columnExists('formulario_derivacion', 'idformAOrigen')) {
                $this->db->prepare("DELETE FROM formulario_derivacion WHERE idformA = ? OR idformAOrigen = ?")
                         ->execute([$idformA, $idformA]);
            } else {
                $this->db->prepare("DELETE FROM formulario_derivacion WHERE idformA = ?")->execute([$idformA]);
            }
        }
        $this->db->prepare("DELETE FROM sexoe WHERE idformA = ?")->execute([$idformA]);
        $this->db->prepare("DELETE FROM protformr WHERE idformA = ?")->execute([$idformA]);
        $this->db->prepare("DELETE FROM precioformulario WHERE idformA = ?")->execute([$idformA]);
        $pifRows = $this->db->prepare("SELECT idPrecioinsumosformulario FROM precioinsumosformulario WHERE idformA = ?");
        $pifRows->execute([$idformA]);
        foreach ($pifRows->fetchAll(PDO::FETCH_NUM) as $r) {
            $this->db->prepare("DELETE FROM forminsumo WHERE idPrecioinsumosformulario = ?")->execute([$r[0]]);
        }
        $this->db->prepare("DELETE FROM precioinsumosformulario WHERE idformA = ?")->execute([$idformA]);
        $this->db->prepare("DELETE FROM formespe WHERE idformA = ?")->execute([$idformA]);
        $this->db->prepare("DELETE FROM formularioe WHERE idformA = ?")->execute([$idformA]);
    }

    /**
     * Borrado en cascada del formulario y tablas relacionadas (derivación, precios, etc.).
     * Llamar dentro de transacción cuando el flujo lo requiera.
     */
    public function deleteFormularioCompletely(int $idformA): void
    {
        $this->deleteFormularioAndRelated($idformA);
    }

    /**
     * Comprueba que la institución de sesión pueda operar sobre el formulario (dueño actual o fila legacy).
     */
    public static function assertSessionInstMayDeleteForm(\PDO $db, int $idformA, int $instId): void
    {
        if (self::tableExists($db, 'formulario_owner_actual')) {
            self::assertInstitutionCanMutate($db, $idformA, $instId);
            return;
        }
        $stmt = $db->prepare("SELECT IdInstitucion FROM formularioe WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idformA]);
        $ownInst = (int)($stmt->fetchColumn() ?: 0);
        if ($ownInst <= 0) {
            throw new Exception("Formulario no encontrado.");
        }
        if ($ownInst !== (int)$instId) {
            throw new Exception("Formulario no pertenece a esta institución.");
        }
    }

    private function getActiveDerivation($idformA)
    {
        if ($this->columnExists('formulario_derivacion', 'idformAOrigen')) {
            $stmt = $this->db->prepare("SELECT * FROM formulario_derivacion WHERE (idformA = ? OR idformAOrigen = ?) AND Activo = 1 ORDER BY IdFormularioDerivacion DESC LIMIT 1");
            $stmt->execute([$idformA, $idformA]);
        } else {
            $stmt = $this->db->prepare("SELECT * FROM formulario_derivacion WHERE idformA = ? AND Activo = 1 ORDER BY IdFormularioDerivacion DESC LIMIT 1");
            $stmt->execute([$idformA]);
        }
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getDerivationByIdForUpdate($idDeriv)
    {
        $stmt = $this->db->prepare("SELECT * FROM formulario_derivacion WHERE IdFormularioDerivacion = ? LIMIT 1");
        $stmt->execute([$idDeriv]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function ensureOwnerRow($idformA, $defaultInst = null, $defaultUsr = null)
    {
        $stmt = $this->db->prepare("SELECT * FROM formulario_owner_actual WHERE idformA = ? LIMIT 1");
        $stmt->execute([$idformA]);
        $owner = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($owner) {
            return $owner;
        }

        if ($defaultInst === null || $defaultUsr === null) {
            $base = $this->getFormBase($idformA);
            if (!$base) {
                throw new Exception("Formulario no encontrado para inicializar owner.");
            }
            $defaultInst = (int)$base['IdInstitucion'];
            $defaultUsr = (int)$base['IdUsrA'];
        }

        $ins = $this->db->prepare("INSERT INTO formulario_owner_actual
                                  (idformA, IdInstitucionActual, IdUsrPropietarioActual, IdFormularioDerivacionActiva, EsDerivado)
                                  VALUES (?, ?, ?, NULL, 0)");
        $ins->execute([$idformA, (int)$defaultInst, (int)$defaultUsr]);

        $stmt->execute([$idformA]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function upsertOwner($idformA, $instActual, $usrActual, $idDerivActiva, $esDerivado)
    {
        $this->db->prepare("INSERT INTO formulario_owner_actual
                           (idformA, IdInstitucionActual, IdUsrPropietarioActual, IdFormularioDerivacionActiva, EsDerivado)
                           VALUES (?, ?, ?, ?, ?)
                           ON DUPLICATE KEY UPDATE
                             IdInstitucionActual = VALUES(IdInstitucionActual),
                             IdUsrPropietarioActual = VALUES(IdUsrPropietarioActual),
                             IdFormularioDerivacionActiva = VALUES(IdFormularioDerivacionActiva),
                             EsDerivado = VALUES(EsDerivado)")
                 ->execute([(int)$idformA, (int)$instActual, (int)$usrActual, $idDerivActiva, (int)$esDerivado]);
    }

    private function assertCanSeeForm($idformA, $instId)
    {
        $joinClause = $this->columnExists('formulario_derivacion', 'idformAOrigen')
            ? "LEFT JOIN formulario_derivacion d ON (d.idformA = f.idformA OR d.idformAOrigen = f.idformA)"
            : "LEFT JOIN formulario_derivacion d ON d.idformA = f.idformA";
        $stmt = $this->db->prepare("SELECT 1
                                    FROM formularioe f
                                    {$joinClause}
                                    WHERE f.idformA = ?
                                      AND (f.IdInstitucion = ? OR d.IdInstitucionOrigen = ? OR d.IdInstitucionDestino = ?)
                                    LIMIT 1");
        $stmt->execute([(int)$idformA, (int)$instId, (int)$instId, (int)$instId]);
        if (!$stmt->fetchColumn()) {
            throw new Exception("No tiene permisos para ver la derivación de este formulario.");
        }
    }

    private function assertInstitucionesMismaRed($instA, $instB)
    {
        $hasRed = $this->columnExists('institucion', 'red');
        $hasDep = $this->columnExists('institucion', 'DependenciaInstitucion');
        $hasMadreGrupo = $this->columnExists('institucion', 'madre_grupo');
        if (!$hasRed && !$hasDep && !$hasMadreGrupo) {
            throw new Exception("No existe un campo de red en la tabla institucion.");
        }

        $fields = ["IdInstitucion"];
        if ($hasRed) {
            $fields[] = "TRIM(COALESCE(red, '')) as red_val";
        }
        if ($hasDep) {
            $fields[] = "TRIM(COALESCE(DependenciaInstitucion, '')) as dep_val";
        }
        if ($hasMadreGrupo) {
            $fields[] = "TRIM(COALESCE(madre_grupo, '')) as madre_grupo_val";
        }
        $stmt = $this->db->prepare("SELECT " . implode(', ', $fields) . " FROM institucion WHERE IdInstitucion IN (?, ?)");
        $stmt->execute([(int)$instA, (int)$instB]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($rows) !== 2) {
            throw new Exception("No se pudieron validar las instituciones de la derivación.");
        }

        $networkA = null;
        $networkB = null;
        foreach ($rows as $r) {
            $val = '';
            if ($hasRed) {
                $val = trim((string)($r['red_val'] ?? ''));
            }
            if ($val === '' && $hasDep) {
                $val = trim((string)($r['dep_val'] ?? ''));
            }
            if (($val === '' || $val === '0') && $hasMadreGrupo) {
                $val = trim((string)($r['madre_grupo_val'] ?? ''));
            }
            if ((int)$r['IdInstitucion'] === (int)$instA) {
                $networkA = $val;
            } elseif ((int)$r['IdInstitucion'] === (int)$instB) {
                $networkB = $val;
            }
        }

        if ($networkA === null || $networkB === null || $networkA === '' || $networkB === '' || (string)$networkA !== (string)$networkB) {
            throw new Exception("Solo se puede derivar entre instituciones de la misma red.");
        }
    }

    private function assertUserBelongsToInstitution($userId, $instId)
    {
        $stmt = $this->db->prepare("SELECT 1 FROM usuarioe WHERE IdUsrA = ? AND IdInstitucion = ? LIMIT 1");
        $stmt->execute([(int)$userId, (int)$instId]);
        if (!$stmt->fetchColumn()) {
            throw new Exception("El responsable destino no pertenece a la institución destino.");
        }
    }

    private function insertHistorial($idformA, $estadoAnterior, $estadoNuevo, $detalle, $usrAccion, $instAccion, $idDeriv = null)
    {
        if (!self::tableExists($this->db, 'formulario_estado_historial')) {
            // Entorno sin migración completa: no bloquear derivaciones por historial faltante.
            return;
        }
        $sql = "INSERT INTO formulario_estado_historial
                (idformA, estado_anterior, estado_nuevo, detalle, IdUsrAccion, IdInstitucionAccion, IdFormularioDerivacion)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            (int)$idformA,
            $estadoAnterior !== null ? (string)$estadoAnterior : null,
            (string)$estadoNuevo,
            $detalle !== null ? (string)$detalle : null,
            $usrAccion !== null ? (int)$usrAccion : null,
            $instAccion !== null ? (int)$instAccion : null,
            $idDeriv !== null ? (int)$idDeriv : null
        ]);
    }

    private function mapTipoFormulario($categoria)
    {
        $c = strtolower(trim((string)$categoria));
        if ($c === 'insumos') {
            return 'insumo';
        }
        if ($c === 'otros reactivos biologicos') {
            return 'reactivo';
        }
        return 'animal';
    }

    /**
     * Obtiene el monto total del formulario para facturacion_formulario_derivado.
     * Animal/Reactivo: precioformulario; Insumos: preciototal de precioinsumosformulario.
     */
    private function getFormTotalForFacturacionDerivada($idformA, $categoria): float
    {
        $cat = strtolower(trim((string)$categoria));
        if (in_array($cat, ['insumos', 'insumo'], true)) {
            $stmt = $this->db->prepare("SELECT COALESCE(SUM(pif.preciototal), 0) FROM precioinsumosformulario pif WHERE pif.idformA = ?");
            $stmt->execute([(int)$idformA]);
            return (float)$stmt->fetchColumn();
        }
        $stmt = $this->db->prepare("SELECT COALESCE(pf.precioformulario, 0) FROM precioformulario pf WHERE pf.idformA = ? LIMIT 1");
        $stmt->execute([(int)$idformA]);
        $pf = (float)$stmt->fetchColumn();
        if ($pf > 0) {
            return $pf;
        }
        $stmt = $this->db->prepare("SELECT COALESCE(SUM(pif.preciototal), 0) FROM precioinsumosformulario pif WHERE pif.idformA = ?");
        $stmt->execute([(int)$idformA]);
        return (float)$stmt->fetchColumn();
    }

    /**
     * Verifica si el formulario derivado en destino tiene la config local completa.
     * Si falta: departamento, especie, categoria, cepa (si aplica), precio → no se puede cambiar estado.
     * @return array {completa: bool, faltantes: string[], enviadoPor: {nombre, institucion, correo, telefono}}
     */
    public function checkDestinoConfigCompleta($idformA, $instId, $categoria = '')
    {
        $idformA = (int)$idformA;
        $instId = (int)$instId;
        $result = ['completa' => true, 'faltantes' => [], 'enviadoPor' => null];

        $deriv = $this->getDerivationByFormAndInst($idformA, $instId);
        if (!$deriv || empty($deriv['is_destination'])) {
            return $result;
        }

        $idDeriv = (int)($deriv['IdFormularioDerivacion'] ?? 0);
        $useRedCfg = $idDeriv > 0
            && $this->columnExists('formulario_derivacion', 'tipoA_destino')
            && $this->columnExists('formulario_derivacion', 'depto_destino')
            && $this->columnExists('formulario_derivacion', 'idsubespA_destino')
            && $this->columnExists('formulario_derivacion', 'idcepaA_destino');

        $tipoExpr = $useRedCfg ? "COALESCE(fd.tipoA_destino, f.tipoA)" : "f.tipoA";
        $subespExpr = $useRedCfg ? "COALESCE(fd.idsubespA_destino, f.idsubespA)" : "f.idsubespA";
        $cepaExpr = $useRedCfg ? "COALESCE(fd.idcepaA_destino, f.idcepaA)" : "f.idcepaA";
        $deptoExpr = $useRedCfg ? "COALESCE(fd.depto_destino, f.depto, pd.iddeptoA)" : "COALESCE(f.depto, pd.iddeptoA)";
        $fdJoin = $useRedCfg ? "LEFT JOIN formulario_derivacion fd ON fd.IdFormularioDerivacion = ?" : "";

        $stmt = $this->db->prepare("SELECT f.depto, {$subespExpr} as idsubespA, {$tipoExpr} as tipoA, {$cepaExpr} as idcepaA, pf.idprotA,
            {$deptoExpr} as idDeptoEfectivo,
            tf.categoriaformulario as categoria
            FROM formularioe f
            LEFT JOIN protformr pf ON f.idformA = pf.idformA
            LEFT JOIN protdeptor pd ON pf.idprotA = pd.idprotA
            {$fdJoin}
            LEFT JOIN tipoformularios tf ON {$tipoExpr} = tf.IdTipoFormulario
            WHERE f.idformA = ? LIMIT 1");
        $stmt->execute($useRedCfg ? [$idDeriv, $idformA] : [$idformA]);
        $form = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$form) {
            return $result;
        }
        if ($categoria === '' && !empty($form['categoria'])) {
            $categoria = $form['categoria'];
        }

        $faltantes = [];

        if ($this->columnExists('departamentoe', 'IdInstitucion')) {
            $idDepto = (int)($form['idDeptoEfectivo'] ?? $form['depto'] ?? 0);
            if ($idDepto > 0) {
                $st = $this->db->prepare("SELECT 1 FROM departamentoe WHERE iddeptoA = ? AND IdInstitucion = ?");
                $st->execute([$idDepto, $instId]);
                if (!$st->fetchColumn()) {
                    $faltantes[] = 'departamento';
                }
            } else {
                $faltantes[] = 'departamento';
            }
        }

        $cat = strtolower(trim((string)$categoria));
        if (in_array($cat, ['animal', 'animal vivo', 'otros reactivos biologicos', 'reactivo'], true)) {
            $idsubesp = (int)($form['idsubespA'] ?? 0);
            if ($idsubesp > 0 && $this->columnExists('subespecie', 'idespA')) {
                $st = $this->db->prepare("SELECT 1 FROM subespecie s JOIN especiee e ON s.idespA = e.idespA WHERE s.idsubespA = ? AND e.IdInstitucion = ?");
                $st->execute([$idsubesp, $instId]);
                if (!$st->fetchColumn()) {
                    $faltantes[] = 'especie';
                }
            } elseif ($idsubesp <= 0) {
                $faltantes[] = 'especie';
            }

            $idcepa = (int)($form['idcepaA'] ?? 0);
            if ($idsubesp > 0 && self::tableExists($this->db, 'cepa')) {
                $st = $this->db->prepare("SELECT COUNT(*) FROM cepa c JOIN especiee e ON c.idespA = e.idespA JOIN subespecie s ON s.idespA = e.idespA WHERE s.idsubespA = ? AND e.IdInstitucion = ? AND c.Habilitado = 1");
                $st->execute([$idsubesp, $instId]);
                if ((int)$st->fetchColumn() > 0 && $idcepa <= 0) {
                    $faltantes[] = 'cepa';
                }
            }
        }

        $idtipo = (int)($form['tipoA'] ?? 0);
        if ($idtipo > 0 && $this->columnExists('tipoformularios', 'IdInstitucion')) {
            $st = $this->db->prepare("SELECT 1 FROM tipoformularios WHERE IdTipoFormulario = ? AND IdInstitucion = ?");
            $st->execute([$idtipo, $instId]);
            if (!$st->fetchColumn()) {
                $faltantes[] = 'categoria';
            }
        } elseif ($idtipo <= 0) {
            $faltantes[] = 'categoria';
        }

        if (self::tableExists($this->db, 'facturacion_formulario_derivado')) {
            if ($idDeriv > 0) {
                $st = $this->db->prepare("SELECT 1 FROM facturacion_formulario_derivado WHERE IdFormularioDerivacion = ? AND IdInstitucionCobradora = ? AND (monto_total IS NOT NULL AND monto_total > 0)");
                $st->execute([$idDeriv, $instId]);
                if (!$st->fetchColumn()) {
                    $st2 = $this->db->prepare("SELECT 1 FROM precioformulario WHERE idformA = ?");
                    $st2->execute([$idformA]);
                    $hasPf = $st2->fetchColumn();
                    if (!$hasPf && in_array($cat, ['insumos', 'insumo'], true) && self::tableExists($this->db, 'precioinsumosformulario')) {
                        $st3 = $this->db->prepare("SELECT 1 FROM precioinsumosformulario WHERE idformA = ?");
                        $st3->execute([$idformA]);
                        $hasPf = $st3->fetchColumn();
                    }
                    if (!$hasPf) {
                        $faltantes[] = 'precio';
                    }
                }
            }
        }

        $result['completa'] = empty($faltantes);
        $result['faltantes'] = $faltantes;

        $idUsrOrigen = (int)($deriv['IdUsrOrigen'] ?? 0);
        $idInstOrigen = (int)($deriv['IdInstitucionOrigen'] ?? 0);
        if ($idUsrOrigen > 0 || $idInstOrigen > 0) {
            $usrId = $idUsrOrigen > 0 ? $idUsrOrigen : null;
            if ($usrId) {
                $st = $this->db->prepare("SELECT CONCAT(COALESCE(p.ApellidoA,''), ' ', COALESCE(p.NombreA,'')) as nombre, COALESCE(p.EmailA,'') as correo, COALESCE(p.CelularA, p.TelefonoA, '') as telefono FROM personae p WHERE p.IdUsrA = ?");
                $st->execute([$usrId]);
                $pers = $st->fetch(PDO::FETCH_ASSOC);
            } else {
                $pers = null;
            }
            $stInst = $this->db->prepare("SELECT NombreInst, InstCorreo, InstContacto FROM institucion WHERE IdInstitucion = ?");
            $stInst->execute([$idInstOrigen]);
            $inst = $stInst->fetch(PDO::FETCH_ASSOC);
            $correo = trim((string)($inst['InstCorreo'] ?? ''));
            if ($correo === '' && $pers) {
                $correo = trim((string)($pers['correo'] ?? ''));
            }
            $telefono = trim((string)($inst['InstContacto'] ?? ''));
            if ($telefono === '' && $pers) {
                $telefono = trim((string)($pers['telefono'] ?? ''));
            }
            $result['enviadoPor'] = [
                'nombre' => $pers ? trim((string)($pers['nombre'] ?? '')) : '',
                'institucion' => $inst ? trim((string)($inst['NombreInst'] ?? '')) : '',
                'correo' => $correo,
                'telefono' => $telefono
            ];
        }

        return $result;
    }

    /**
     * Marca el formulario como visto (quienvisto) sin cambiar estado.
     */
    public function markFormAsViewed($idformA, $quienvisto)
    {
        $idformA = (int)$idformA;
        if ($idformA <= 0 || trim((string)$quienvisto) === '') {
            return;
        }
        $this->db->prepare("UPDATE formularioe SET quienvisto = ? WHERE idformA = ?")
            ->execute([trim((string)$quienvisto), $idformA]);
    }
}
