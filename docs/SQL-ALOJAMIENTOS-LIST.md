# SQL listado de alojamientos (IdInstitucion = 1)

Consulta usada por `AlojamientoModel::getAllGrouped($instId)` para el listado principal. **No usa cepa**; solo tablas: `alojamiento`, `protocoloexpe`, `especiee`, `tipoalojamiento`, `personae`.

Para probar en tu cliente SQL (MySQL/MariaDB) con **institución 1**:

```sql
SELECT a.*, p.nprotA, p.tituloA, e.EspeNombreA, e.idespA,
       t.NombreTipoAlojamiento,
       COALESCE(CONCAT(pers.NombreA, ' ', pers.ApellidoA), 'Sin Asignar') AS Investigador
FROM alojamiento a
INNER JOIN (
    SELECT historia, MAX(IdAlojamiento) AS max_id
    FROM alojamiento
    GROUP BY historia
) last_a ON a.IdAlojamiento = last_a.max_id
INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
INNER JOIN especiee e ON a.TipoAnimal = e.idespA
LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento
LEFT JOIN personae pers ON a.IdUsrA = pers.IdUsrA
WHERE a.IdInstitucion = 1
ORDER BY a.historia DESC;
```

- Si esta consulta **no devuelve filas**, el problema está en los datos (no hay alojamientos con `IdInstitucion = 1`) o en los JOINs (falta protocolo/especie/tipo/persona).
- Si **devuelve filas** y la API sigue sin mostrar nada, el fallo está en el front (petición, token, o cómo se pinta la respuesta).
