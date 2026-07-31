# SQL para ejecutar — 2026-07-26 (Gabriel / Martín)

Archivo ejecutable (mismo contenido):  
[`docs/migrations/2026-07-26-comprobante-pdf-historialpago-y-rol-contador.sql`](migrations/2026-07-26-comprobante-pdf-historialpago-y-rol-contador.sql)

## Qué hace

| # | Cambio | Tabla |
|---|--------|--------|
| 1 | PDF opcional de comprobante en cargas/líneas de historial | `historialpago.ComprobantePdfB2Key`, `ComprobantePdfNombre` |
| 2 | Rol **Contador** (solo lectura facturación) | `tipousuarioe` IdTipousrA = **7** |
| 3 | Menú Contable (202) + Perfil (999) para ese rol | `menudistr` |

## Backblaze (después del SQL)

### ¿Crear bucket nuevo o reusar?

Ya hay perfiles separados: `PROTOCOLOS`, `MENSAJES`, `NOTICIASPOPUP`, `POES`.  
Para **comprobantes / facturas PDF** el código usa el perfil **`FACTURACION`**.

**Recomendación:** crear un bucket nuevo (ej. `grobo-facturacion`) o, si preferís un solo bucket físico, igual configurá keys/vars `B2_*_FACTURACION` apuntando a ese bucket. No mezclar con POES/MENSAJES (cuotas, ACL y borrados distintos).

```env
B2_KEY_ID_FACTURACION=...
B2_APPLICATION_KEY_FACTURACION=...
B2_BUCKET_ID_FACTURACION=...
B2_BUCKET_NAME_FACTURACION=...
```

Límite app comprobante de saldo: **PDF ≤ 150 KB**, opcional.

### Reparar totalpago duplicado en alojamientos (opcional, datos viejos)

Si un alojamiento se pagó cuando había varios tramos, `totalpago` pudo quedar sumado de más. Esto normaliza cada historia al MAX:

```sql
UPDATE alojamiento a
JOIN (
  SELECT historia, MAX(COALESCE(totalpago, 0)) AS tp
  FROM alojamiento
  WHERE historia IS NOT NULL
  GROUP BY historia
) x ON a.historia = x.historia
SET a.totalpago = x.tp;
```

## Cómo asignar un usuario Contador

```sql
-- Ejemplo: usuario 333 en sede 12 → rol 7 (reemplazá IDs)
-- Opción A: cambiar rol (si no debe ser admin)
-- UPDATE tienetipor SET IdTipousrA = 7 WHERE IdUsrA = 333;

-- Opción B: alta de vínculo (si la PK lo permite / no hay fila previa)
-- INSERT INTO tienetipor (IdUsrA, IdTipousrA) VALUES (333, 7);
```

En la app, Contador podrá **ver** facturación/historial; el código bloqueará pagar / subir saldo / editar.

## 502 cupaeadm (producción)

No es SQL. Revisar en servidor: PHP-FPM (`php8.3-fpm`), nginx → socket, logs Cloudflare/host. Un 502 “Host Error” suele ser FPM caído o timeout, no la lógica de login.

## Pegar en phpMyAdmin

Abrí el `.sql` de `docs/migrations/` citado arriba y ejecutá. Si `ALTER` dice *Duplicate column*, esa parte ya está aplicada.
