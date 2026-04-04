# Checklist de Pruebas – Reservas (Local)

> Base URL local: `http://localhost:8080/URBE-API-DRIVEN/front/`
>
> Nota: en local el frontend consume API bajo `/URBE-API-DRIVEN/api/*`.

## 0) Precondiciones

- Docker levantado:
  - Web: `http://localhost:8080`
  - phpMyAdmin: `http://localhost:8081`
- Existe al menos:
  - 1 sala habilitada con horarios (`reserva_sala` + `reserva_horariospordiasala`)
  - 1 instrumento habilitado (opcional)
  - 1 usuario investigador (rol 3)
  - 1 usuario admin (rol 1/2/4/5/6)

## 1) Login y navegación (smoke)

- Ir al login institucional:
  - `http://localhost:8080/URBE-API-DRIVEN/front/<SLUG_INSTITUCION>/`
- Loguear como admin.
- Abrir **Admin → Reservas**:
  - ruta esperada: `admin/reservas`

## 2) Admin – crear reserva única (a nombre de otro)

- En `admin/reservas`:
  - seleccionar sala
  - rango desde/hasta (ej. mes actual)
  - click **NUEVA RESERVA**
- En el modal:
  - titular: seleccionar investigador
  - fecha: hoy o mañana
  - hora inicio/fin: dentro del horario operativo de la sala
  - instrumentos (si hay): poner cantidad > 0
  - modo: **Reserva única**
  - guardar
- Esperado:
  - aparece en la tabla agenda como **RESERVADO**
  - si intentás crear otra reserva que solape mismo horario/sala → debe rechazar

## 3) Usuario – Mis Reservas (solo a mi nombre)

- Loguear como investigador (en otra ventana o cerrando sesión).
- Ir a:
  - `usuario/misreservas`
- Esperado:
  - en la tabla “Mis reservas” aparece la reserva creada por el admin
  - si el investigador crea una reserva nueva desde el calendario:
    - se agrega a la tabla “Mis reservas”

## 4) Admin – crear serie (recurrencia)

- Volver como admin a `admin/reservas`
- Click **NUEVA RESERVA**
- Elegir:
  - modo: **Reserva repetida (serie)**
  - tipo:
    - semanal: seleccionar días + “cada N semanas” + rango
    - o fechas específicas: pegar lista `YYYY-MM-DD, YYYY-MM-DD`
  - instrumentos: opcional
- Guardar
- Esperado:
  - alerta con conteo (creadas/omitidas)
  - en la agenda del rango aparecen varias reservas

## 5) QR Sala – Etiqueta + privacidad + reservar con login

### 5.1 Generar etiqueta (admin)

- Ir a `qr-sala` con token (si no tenés token aún, entrá igual y generá desde botón admin):
  - `http://localhost:8080/URBE-API-DRIVEN/front/qr-sala.html?token=<TOKEN>`
- Logueado como admin:
  - debe verse botón **ETIQUETA QR**
  - generar PDF (se descarga)

### 5.2 Vista puerta (sin login)

- Abrir el link del QR en incógnito / sin token de sesión:
  - Debe mostrar reservas como **RESERVADO** (sin nombres)

### 5.3 Vista puerta (con login del titular)

- Loguear como el titular (investigador) y volver al link QR.
- Esperado:
  - los bloques reservados por ese usuario deben decir **“Reservado por vos”**
  - reservar desde QR:
    - elegir día y slot libre
    - click **Reservar**
    - al recargar, aparece como ocupado

## 6) Instrumentos – validación por stock (cantidad)

- Crear varias reservas solapadas que consuman instrumentos hasta agotar stock.
- Esperado:
  - cuando el stock se agota, el sistema rechaza “Instrumento sin disponibilidad en ese horario”.

