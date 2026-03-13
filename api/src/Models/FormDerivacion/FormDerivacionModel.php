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

            $sqlDeriv = "INSERT INTO formulario_derivacion
                        (idformA, IdFormularioDerivacionPadre, IdInstitucionOrigen, IdInstitucionDestino, IdUsrOrigen, IdUsrDestinoResponsable,
                         estado_derivacion, mensaje_origen, FechaCreado, Activo)
                         VALUES (?, NULL, ?, ?, ?, ?, 1, ?, NOW(), 1)";
            $stmtDeriv = $this->db->prepare($sqlDeriv);
            $stmtDeriv->execute([$idformA, $instOrigen, $instDestino, $usrOrigen, $usrDestino, $mensaje !== '' ? $mensaje : null]);
            $idDeriv = (int)$this->db->lastInsertId();

            $newOwnerUser = $usrDestino ?: $usrOrigen;
            $this->upsertOwner($idformA, $instDestino, $newOwnerUser, $idDeriv, 1);

            $setParts = ["IdInstitucion = ?"];
            $paramsForm = [$instDestino];
            if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                $setParts[] = "EstadoWorkflow = 'DERIVADO_PENDIENTE'";
            }
            if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                $setParts[] = "DerivadoActivo = 1";
            }
            if ($this->columnExists('formularioe', 'FechaDerivado')) {
                $setParts[] = "FechaDerivado = NOW()";
            }
            if ($this->columnExists('formularioe', 'IdInstitucionOrigen')) {
                $setParts[] = "IdInstitucionOrigen = COALESCE(IdInstitucionOrigen, ?)";
                $paramsForm[] = $instOrigen;
            }
            $paramsForm[] = $idformA;
            $stmtForm = $this->db->prepare("UPDATE formularioe SET " . implode(', ', $setParts) . " WHERE idformA = ?");
            $stmtForm->execute($paramsForm);

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
                $stmtFac = $this->db->prepare("INSERT INTO facturacion_formulario_derivado
                                              (idformA, IdFormularioDerivacion, IdInstitucionCobradora, IdInstitucionSolicitante,
                                               IdUsrSolicitante, tipo_formulario, monto_total, monto_pagado, estado_cobro)
                                               VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1)");
                $stmtFac->execute([$idformA, $idDeriv, $instDestino, $instOrigen, $usrOrigen, $tipo]);
            }

            Auditoria::logManual($this->db, $usrOrigen, 'FORM_DERIVE', 'formulario_derivacion', "Formulario #{$idformA} derivado a institución #{$instDestino}");

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
                WHERE d.idformA = ?
                ORDER BY d.IdFormularioDerivacion DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idformA]);
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

            $idformA = (int)$deriv['idformA'];
            $instOrigen = (int)$deriv['IdInstitucionOrigen'];
            $instDestino = (int)$deriv['IdInstitucionDestino'];

            $owner = $this->ensureOwnerRow($idformA);
            if ((int)$owner['IdFormularioDerivacionActiva'] !== $idDeriv) {
                throw new Exception("La derivación no coincide con el owner actual del formulario.");
            }

            $form = $this->getFormBase($idformA);

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

                $this->upsertOwner($idformA, $instDestino, $usrAccion, $idDeriv, 1);
                $setParts = [];
                if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                    $setParts[] = "EstadoWorkflow = 'DERIVADO_ACEPTADO'";
                }
                if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                    $setParts[] = "DerivadoActivo = 1";
                }
                if (!empty($setParts)) {
                    $this->db->prepare("UPDATE formularioe SET " . implode(', ', $setParts) . " WHERE idformA = ?")
                             ->execute([$idformA]);
                }
                $this->insertHistorial($idformA, $form['estado'] ?? null, 'DERIVADO_ACEPTADO', 'Derivación aceptada por institución destino', $usrAccion, $instAccion, $idDeriv);
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

                $this->upsertOwner($idformA, $instOrigen, (int)$deriv['IdUsrOrigen'], null, 0);
                $setParts = ["IdInstitucion = ?"];
                $paramsForm = [$instOrigen];
                if ($this->columnExists('formularioe', 'EstadoWorkflow')) {
                    $setParts[] = "EstadoWorkflow = ?";
                    $paramsForm[] = $workflow;
                }
                if ($this->columnExists('formularioe', 'DerivadoActivo')) {
                    $setParts[] = "DerivadoActivo = 0";
                }
                $paramsForm[] = $idformA;
                $this->db->prepare("UPDATE formularioe SET " . implode(', ', $setParts) . " WHERE idformA = ?")
                         ->execute($paramsForm);
                $this->insertHistorial($idformA, $form['estado'] ?? null, $workflow, $detalle, $usrAccion, $instAccion, $idDeriv);

                if (self::tableExists($this->db, 'facturacion_formulario_derivado')) {
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

    private function getActiveDerivation($idformA)
    {
        $stmt = $this->db->prepare("SELECT * FROM formulario_derivacion WHERE idformA = ? AND Activo = 1 ORDER BY IdFormularioDerivacion DESC LIMIT 1");
        $stmt->execute([$idformA]);
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
        $stmt = $this->db->prepare("SELECT 1
                                    FROM formularioe f
                                    LEFT JOIN formulario_derivacion d ON d.idformA = f.idformA
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
}
