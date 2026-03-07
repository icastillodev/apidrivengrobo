# Checklist – Pendientes principales

Estado de las tareas pendientes del proyecto.

---

## Pendiente principal

- [x] **QR / trazabilidad / ubicación de cajas** — Ubicación (Detalle) mostrada en cabecera de cada caja en trazabilidad (admin y vista QR).
- [x] **"Sacar historia PDF" en QR** — Exportación pública por token: botón "PDF COMPLETO" funciona sin login (API `/alojamiento/public-export?token=` + generación en front con jsPDF).
- [x] **Flujo de login desde QR (volver al QR)** — `redirectAfterLogin` en auth.js: tras login se redirige a la URL guardada (ej. página QR).
- [x] **Redirecciones login admin/superadmin + salida superadmin a groboapp.com** — SuperAuth.logout() redirige a https://groboapp.com; login ya diferenciaba admin/superadmin.
- [x] **Mejoras mobile** — Mis protocolos: filtros responsive, min-height 44px en controles, enlace "¿Cómo funciona?" bajo el filtro, CSS para tabla y tabs en móvil.
- [x] **Estadísticas ampliadas de alojamientos/trazabilidad** — Nueva sección en Estadísticas: Historias, Cajas físicas, Obs. trazabilidad, Aloj. activos; tabla "Alojamiento por especie"; API `alojamiento_trazabilidad` en StatisticsModel; export Excel incluye hoja y filas.

---

## Completado (referencia)

- [x] Fichas de usuario: 3 secciones (animales, insumos, insumos exp), PDF total/solo ficha, eliminar con contraseña (solo investigadores), tarifario desde dashboard, etc.

---

Cuando avancemos en cada ítem, se puede ir marcando aquí y detallar en el código o en docs si hace falta.
