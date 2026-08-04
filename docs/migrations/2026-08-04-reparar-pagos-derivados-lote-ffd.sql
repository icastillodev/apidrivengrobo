-- Reparación: pagos derivados liquidados con "Pagar selección" antes del fix
-- que actualiza facturacion_formulario_derivado en processPaymentTransaction.
--
-- Síntoma: historialpago tiene LIQUIDACION, precioformulario.totalpago > 0,
-- pero ffd.monto_pagado = 0 → dashboard/reporte siguen en SIN PAGAR.
--
-- Estrategia: alinear monto_pagado / estado_cobro con el mayor entre
-- (a) totalpago clásico de precioformulario / precioinsumosformulario
-- (b) suma de historial LIQUIDACION / LIQUIDACION_INST_DERIV / PAGO_INDIVIDUAL_DERIV
-- topeado a monto_total.
--
-- Revisar el SELECT de diagnóstico antes de correr el UPDATE en producción.

-- Diagnóstico (no modifica):
SELECT
  ffd.IdFacturacionFormularioDerivado,
  ffd.idformA,
  ffd.IdInstitucionCobradora,
  ffd.monto_total,
  ffd.monto_pagado AS pagado_ffd,
  COALESCE(pf.totalpago, 0) AS pagado_precio_form,
  COALESCE(pif.totalpago, 0) AS pagado_precio_ins,
  (
    SELECT COALESCE(SUM(h.Monto), 0)
    FROM historialpago h
    WHERE h.IdFormA = ffd.idformA
      AND h.IdInstitucion = ffd.IdInstitucionCobradora
      AND h.TipoHistorial IN ('LIQUIDACION', 'LIQUIDACION_INST_DERIV', 'PAGO_INDIVIDUAL_DERIV')
  ) AS pagado_historial,
  ffd.estado_cobro
FROM facturacion_formulario_derivado ffd
LEFT JOIN precioformulario pf ON pf.idformA = ffd.idformA
LEFT JOIN precioinsumosformulario pif ON pif.idformA = ffd.idformA
WHERE COALESCE(ffd.monto_pagado, 0) < 0.01
  AND (
    COALESCE(pf.totalpago, 0) > 0.01
    OR COALESCE(pif.totalpago, 0) > 0.01
    OR EXISTS (
      SELECT 1 FROM historialpago h
      WHERE h.IdFormA = ffd.idformA
        AND h.IdInstitucion = ffd.IdInstitucionCobradora
        AND h.TipoHistorial IN ('LIQUIDACION', 'LIQUIDACION_INST_DERIV', 'PAGO_INDIVIDUAL_DERIV')
        AND h.Monto > 0
    )
  );

-- Reparación (idempotente en lo posible):
UPDATE facturacion_formulario_derivado ffd
LEFT JOIN precioformulario pf ON pf.idformA = ffd.idformA
LEFT JOIN precioinsumosformulario pif ON pif.idformA = ffd.idformA
SET
  ffd.monto_pagado = LEAST(
    ffd.monto_total,
    GREATEST(
      COALESCE(ffd.monto_pagado, 0),
      COALESCE(pf.totalpago, 0),
      COALESCE(pif.totalpago, 0),
      COALESCE((
        SELECT SUM(h.Monto)
        FROM historialpago h
        WHERE h.IdFormA = ffd.idformA
          AND h.IdInstitucion = ffd.IdInstitucionCobradora
          AND h.TipoHistorial IN ('LIQUIDACION', 'LIQUIDACION_INST_DERIV', 'PAGO_INDIVIDUAL_DERIV')
      ), 0)
    )
  ),
  ffd.estado_cobro = CASE
    WHEN LEAST(
      ffd.monto_total,
      GREATEST(
        COALESCE(ffd.monto_pagado, 0),
        COALESCE(pf.totalpago, 0),
        COALESCE(pif.totalpago, 0),
        COALESCE((
          SELECT SUM(h.Monto)
          FROM historialpago h
          WHERE h.IdFormA = ffd.idformA
            AND h.IdInstitucion = ffd.IdInstitucionCobradora
            AND h.TipoHistorial IN ('LIQUIDACION', 'LIQUIDACION_INST_DERIV', 'PAGO_INDIVIDUAL_DERIV')
        ), 0)
      )
    ) >= ffd.monto_total - 0.009 THEN 3
    WHEN LEAST(
      ffd.monto_total,
      GREATEST(
        COALESCE(ffd.monto_pagado, 0),
        COALESCE(pf.totalpago, 0),
        COALESCE(pif.totalpago, 0),
        COALESCE((
          SELECT SUM(h.Monto)
          FROM historialpago h
          WHERE h.IdFormA = ffd.idformA
            AND h.IdInstitucion = ffd.IdInstitucionCobradora
            AND h.TipoHistorial IN ('LIQUIDACION', 'LIQUIDACION_INST_DERIV', 'PAGO_INDIVIDUAL_DERIV')
        ), 0)
      )
    ) > 0.009 THEN 2
    ELSE 1
  END
WHERE COALESCE(ffd.monto_pagado, 0) < LEAST(
  ffd.monto_total,
  GREATEST(
    COALESCE(pf.totalpago, 0),
    COALESCE(pif.totalpago, 0),
    COALESCE((
      SELECT SUM(h.Monto)
      FROM historialpago h
      WHERE h.IdFormA = ffd.idformA
        AND h.IdInstitucion = ffd.IdInstitucionCobradora
        AND h.TipoHistorial IN ('LIQUIDACION', 'LIQUIDACION_INST_DERIV', 'PAGO_INDIVIDUAL_DERIV')
    ), 0)
  )
) - 0.009;

-- Diagnóstico alojamientos con sobrepago (totalpago > SUM(cuentaapagar) por historia):
-- SELECT historia,
--        SUM(cuentaapagar) AS debe,
--        MAX(totalpago) AS pagado,
--        MAX(totalpago) - SUM(cuentaapagar) AS exceso
-- FROM alojamiento
-- GROUP BY historia
-- HAVING MAX(totalpago) > SUM(cuentaapagar) + 0.01;
-- Para devolver el exceso: en facturación → modal alojamiento → botón QUITAR (devuelve saldo al investigador).
