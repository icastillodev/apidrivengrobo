# Checklist – Ubicación de cajas (alojamientos)

Script SQL base: `sql/alojamiento_ubicacion_cajas.sql`

Marca cada ítem cuando esté hecho. Podés agregar filas nuevas bajo “Notas / cambios sobre la marcha”.

---

## Fase 0 – Base de datos

- [ ] Backup de la BD antes de migrar _(recomendado; no automatizado en repo)_.
- [x] Ejecutar `sql/alojamiento_ubicacion_cajas.sql` (si falla `ADD COLUMN`, comentar columnas ya existentes y re-ejecutar). _Confirmado por equipo._
- [ ] Verificar FKs y que `aloj_config_ubicacion` tenga una fila por institución _(probar en BD tras migración)_.

---

## Fase 1 – API (PHP) — implementado (requiere BD migrada)

- [x] Modelo `AlojamientoUbicacionModel`: etiquetas, catálogos, `getBundle`, validación jerárquica.
- [x] CRUD vía `saveCatalog` con `tipo`: `uf` | `salon` | `rack` | `lugar` + `toggleCatalog`.
- [x] `assertUbicacionParaCaja` (coherencia lugar/salón/rack/posición).
- [x] `alojamiento_caja`: crear con `ubicacion`, `updateCajaUbicacion`, árbol con JOINs, clonado en tramos con ubicación.
- [x] Rutas registradas en `api/routes.php`.
- [ ] Probar con Postman/Thunder tras ejecutar el SQL _(opcional si ya se validó vía UI / trazabilidad)_.

**Referencia rápida**

| Método | Ruta |
|--------|------|
| GET | `/admin/config/alojamiento/ubicacion/bundle` |
| POST | `/admin/config/alojamiento/ubicacion/labels` |
| POST | `/admin/config/alojamiento/ubicacion/catalog/save` |
| POST | `/admin/config/alojamiento/ubicacion/catalog/toggle` |
| POST | `/trazabilidad/add-caja` (body opcional `ubicacion`) |
| POST | `/trazabilidad/update-caja-ubicacion` (`idCaja` + `ubicacion`) |

---

## Fase 2 – Admin – Configuración

- [x] Pantalla `front/paginas/admin/configuracion/alojamientos-ubicacion.html` + `config_alojamientos_ubicacion.js`; entrada desde hub `config` (tarjeta “Ubicación física de cajas”).
- [x] Editor de **etiquetas** (`LabelLugarFisico`, `LabelSalon`, etc.) por institución (textos en `i18n` es/en/pt).
- [x] ABM de lugares físicos, salones, racks y posiciones en rack (listas, orden, activar/desactivar, modales).
- [ ] Probar con dos instituciones: nombres distintos en etiquetas y datos independientes _(pendiente QA manual)_.

---

## Fase 3 – Alojamientos (operación)

- [x] Al **crear** caja: selectores en cascada + comentario en `trazabilidad.js` (`add-caja` con `ubicacion` opcional).
- [x] Al **editar** caja: mismos campos; `update-caja-ubicacion` envía `null` en FKs para limpiar.
- [x] Mostrar ubicación resumida en trazabilidad (JOINs + comentario, fallback a `Detalle`).
- [x] Exportaciones: CSV/API (`AlojamientoExportModel` + columna `UbicacionCaja`); PDF ficha (`ExportUI.js` línea por caja); Excel plano (columna `export_col_ubicacion_caja`).

---

## Fase 4 – Calidad

- [ ] Pruebas manuales: caja sin ubicación, solo lugar físico, cadena completa, cambio de rack.
- [ ] Revisar rendimiento con índices existentes.
- [ ] Texto de ayuda breve en pantalla de usuario final (solo si el producto lo exige; la pantalla admin ya tiene subtítulo descriptivo).

---

## Notas / cambios sobre la marcha

- **2025-03-25**: Export CSV (`AlojamientoExportController`), PDF y Excel (`ExportUI.js`) incluyen resumen de ubicación por caja. Columna i18n en Excel: `alojamientos.export_col_ubicacion_caja`.

---

## Otro – Registro de alojamientos (lista de usuarios institución)

_(No forma parte del alcance “ubicación de cajas”; registro de mejora UX.)_

- [x] Al registrar alojamiento y al listar usuarios de la institución (paso “Responsable”): orden **alfabético por apellido** (y nombre como desempate); texto mostrado **Apellido, Nombre** (no “Nombre Apellido”). Misma lógica en modal de configuración de historia (`HistorialUI`). Implementación: `front/dist/js/pages/admin/alojamientos/institutionUsersList.js` usado por `RegistroUI.js` y `HistorialUI.js`.

_(Añadir aquí lo que vayas pidiendo: campos extra, obligatoriedad, códigos de barras, etc.)_
