# Proyecto aparte — correos masivos (GROBO / URBE)

**Qué es:** feature de producto distinta al flujo de **mensajería 1:1** (hilos, respuestas, `MailService` al recibir mensaje). Aquí se documenta un posible **envío masivo** («comunicado a todos los usuarios de la sede», campañas, avisos institucionales).

**Estado:** no implementado; **proyecto independiente** del checklist de producto ya cerrado (`docs/CHECKLIST-BACKLOG-PRODUCTO-GROBO.md`).

**Relación con el repo actual**

- Hoy existen notificaciones por correo al **recibir** mensajes en hilos (`MailService`, reglas en mensajería). Eso **no** es envío masivo.
- Un envío masivo implicaría **nuevo** flujo de UI, permisos, posible cola, auditoría y revisión **legal/operativa** (spam, preferencias, RGPD u normativa local).

**Base de datos**

- No hay migración obligatoria solo por “tener el botón”; según diseño podría añadirse cola, historial de campañas, etc. Cuando haya SQL concreto, documentarlo en **`docs/BACKLOG-BASE-DATOS.md`** + `docs/migrations/` como cualquier otro cambio de esquema.

---

## Factibilidad (resumen)

**Sí puede hacerse** a nivel técnico: típicamente un job que envía a una lista de emails de usuarios activos de la sede (con permisos de administración), reutilizando el mismo proveedor SMTP/API que `MailService`, con:

- Envío por **lotes** o **pausa** entre mensajes para no saturar el proveedor.
- **Auditoría:** quién disparó el envío y cuándo; totales éxito/fallo sin exponer emails en logs públicos.
- Opcional: techo diario por sede, plantillas alineadas a correos ya existentes, enlace de baja o categorías de suscripción.

La decisión de **si** se hace y **con qué alcance** es de producto/legal, no solo de desarrollo.

---

<a id="checklist-implementacion"></a>

## Checklist de implementación *(marcar al avanzar)*

Lista guía cuando producto/legal apruebe la iniciativa. No sustituye una especificación formal ni un DPIA si aplica.

- [ ] **Alcance:** destinatarios (p. ej. usuarios activos de la sede con email, filtros por rol, exclusiones).
- [ ] **Permisos:** roles que pueden enviar; doble confirmación en UI si lo exige compliance.
- [ ] **API:** endpoint ligado a `instId` de sesión; validación de asunto/cuerpo; respuesta con totales agregados.
- [ ] **Envío:** `MailService` (o capa similar) + lotes o pausa entre mensajes; límites de tamaño/adjuntos coherentes con política actual.
- [ ] **Auditoría:** `Auditoria::log` u equivalente (usuario, institución, asunto, cantidad enviados/fallidos); tabla histórica opcional si hace falta reporting.
- [ ] **Front + i18n (ES/EN/PT):** pantalla o flujo en admin; mensaje del tipo «Se notificará a N usuarios» antes de confirmar; errores traducidos.
- [ ] **Operación:** techo diario por sede (opcional); procedimiento para rebotes y soporte.

---

## Referencias útiles en el repo

- Mensajería y correos transaccionales: modelos/controladores bajo comunicación, `MailService`.
- Convención de migraciones: `docs/migrations/README.md`.
- Backlog de BD (solo cuando este proyecto genere SQL): `docs/BACKLOG-BASE-DATOS.md`.

---

*Documento creado al separar «correos masivos» del checklist maestro de producto (2026-05). Mantener este archivo como fuente única para la iniciativa.*
