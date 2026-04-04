# Checklist final – Con ticks y sin ticks

Estado del proyecto GROBO / URBE-API-DRIVEN.  
`[x]` = hecho · `[ ]` = pendiente

---

## 1. Fichas de usuario, PDFs y eliminación

- [x] Mis formularios: botón "Ver animales utilizados en protocolos" + modal
- [x] Mis formularios: botón "Insumos pedidos" + modal (insumo, cantidad, institución)
- [x] Mis formularios: botón "Insumos experimentales pedidos" + modal (idem + institución)
- [x] Gestor usuarios (admin): 3 cuadraditos (animales en protocolos, insumos pedidos, insumos exp) con cantidades
- [x] Gestor usuarios: Eliminar usuario solo si investigador (IdTipousrA=3) y sin forms/protocolos/alojamientos
- [x] Eliminar usuario: Modal con ID, usuario, nombre/apellido + contraseña del admin → eliminación real en BD
- [x] PDF Total / Solo Ficha: generados desde HTML (no captura del modal); Solo Ficha = solo datos personales
- [x] PDF: Cerrar modal y quitar backdrop antes de generar para evitar hoja en blanco
- [x] Tarifario: "Ver tarifario" en dashboard con carga dinámica de html2pdf (evitar "html2pdf is not defined")
- [x] APIs: `/user/insumos-pedidos`, `/user/insumos-exp-pedidos`, `/users/...?id=` para admin

---

## 2. QR, trazabilidad, login y estadísticas

- [x] QR / trazabilidad: mostrar ubicación (campo Detalle) en cabecera de cada caja (admin y vista QR)
- [x] "Sacar historia PDF" en QR: botón "PDF COMPLETO" sin login (API public-export por token + jsPDF en front)
- [x] Flujo login desde QR: tras login, redirección a URL guardada (redirectAfterLogin en auth.js)
- [x] Redirecciones: SuperAdmin logout → https://groboapp.com
- [x] Redirecciones: Login ya diferenciaba admin vs superadmin (dashboard correspondiente)
- [x] Mejoras mobile (Mis protocolos): filtros responsive, min-height 44px, enlace "¿Cómo funciona?" bajo el filtro
- [x] Mejoras mobile: CSS para tabla y tabs en móvil
- [x] Estadísticas ampliadas: sección "Alojamientos y Trazabilidad" (Historias, Cajas físicas, Obs. trazabilidad, Aloj. activos)
- [x] Estadísticas ampliadas: tabla "Alojamiento por especie"
- [x] Estadísticas ampliadas: API alojamiento_trazabilidad en StatisticsModel; export Excel con hoja y filas nuevas

---

## 3. Lo que queda (pendientes / sugeridos)

- [x] PDF ficha/total en servidor (si en algún navegador sigue en blanco: TCPDF/Dompdf en PHP)
- [x] Insumos pedidos / experimentales: columna opcional "Total acumulado hasta hoy" por insumo
- [x] Auditoría al eliminar usuario: queda registrado en bitácora (DELETE_USER con ID, login, nombre y "confirmado con contraseña de admin"); log se escribe antes del DELETE
- [x] Personae al eliminar usuario: decidir si se borra/anonymiza personae o se deja para historial

---

**Traducción i18n (ES/EN/PT):** **[CHECKLIST-I18N-REGLA.md](CHECKLIST-I18N-REGLA.md)** (regla corta); inventario largo: **[CHECKLIST-I18N.md](CHECKLIST-I18N.md)**.

---

*Formato: [x] = hecho, [ ] = pendiente.*
