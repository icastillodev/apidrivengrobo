# Checklist producto — Operación Gabriel / Diana / Mariela (GROBO / URBE)

**Estado:** lista viva — **backlog activo** (mayo 2026, lote 2).  
**Convención:** `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[?]` bloqueado / decisión pendiente.

**Checklist anterior (mismo mes):** [`CHECKLIST-PRODUCTO-2026-05-GROBO.md`](CHECKLIST-PRODUCTO-2026-05-GROBO.md) — búsqueda, hotkeys, Marie, G1–G3 parcial.

**Cambios de base de datos (solo inventario SQL):** **[`CHECKLIST-BD-2026-05-OPERACION-GDM.md`](CHECKLIST-BD-2026-05-OPERACION-GDM.md)** — cuando preguntes «qué tengo que ejecutar en la BD», usá ese doc (no este).

**QA sugerido:** ampliar [`CHECKLIST-QA-STAGING-2026-05-GROBO.md`](CHECKLIST-QA-STAGING-2026-05-GROBO.md) por épica al cerrar ítems.

---

## 0. Índice maestro

| ID | Pedido | Responsable | BD | Estado |
|----|--------|-------------|-----|--------|
| G1 | Cepa en formulario/protocolo **derivado** (especie de la sede actual) | Gabriel | — | [~] |
| G2 | Facturación **investigador** y **protocolo**: local vs derivado (como depto) | Gabriel | — | [~] |
| G3 | Etiqueta depto derivado: «- derivado (institución)» | Gabriel | — | [x] |
| G4 | Al abrir línea derivada: mostrar **origen** (depto / protocolo / persona) | Gabriel | — | [x] |
| G5 | Email mensajería: **solo link** a la app (sin cuerpo del mensaje) | Gabriel | — | [x] |
| G6 | Mensajería **móvil**: volver a lista, UI moderna, recordar contraseña | Gabriel | — | [~] |
| D1 | Usuario: **pedidos y alojamientos** no cargan (loader infinito) | Diana | — | [x] |
| M1 | Perilla activo/inactivo: **verde** activo, **rojo** inactivo (global) | Mariela | — | [x] |
| M2 | Config trazabilidad **inicio**: títulos/ayuda (ficha, sujeto, fecha) | Mariela | — | [x] |
| M3 | Precios: barra **Guardar** fija abajo de pantalla | Mariela | — | [x] |
| M4 | Alojamiento registro nuevo: **refrescar planilla** sin F5 | Mariela | — | [x] |
| M5 | Cobro alojamiento: **por sujeto** vs **por contenido** (especie/cant.) | Mariela | **BD-01** | [~] |
| M6 | Trazabilidad «+ nuevas salas»: texto botón (no «crear nombre alojamiento») | Mariela | — | [x] |
| M7 | Sin lugar físico: aviso + ocultar opciones + ayuda admin | Mariela | — | [x] |
| M8 | Nueva sala: **no** crear sujeto automático | Mariela | — | [x] |
| M9 | Tipo dato trazabilidad: **Sexo** (- / macho / hembra) | Mariela | **BD-02** | [~] |
| M10 | Tipo dato **texto largo**: textarea (inicio + trazabilidad) | Mariela | **BD-02** | [~] |
| M11 | Alta sujeto: nombre + **datos iniciales** opcionales | Mariela | — | [x] |
| M12 | Título protocolo: texto completo (no cortado) | Mariela | — | [x] |
| M13 | Ficha: mostrar arriba **tipo de cobro** (sujeto vs contenido) | Mariela | **BD-01** | [~] |
| M14 | Ficha alojamiento: variables por especie / categorías (marcaje) | Mariela | — | [ ] |
| M15 | Último alojamiento: etiqueta **tipo alojamiento** (no «Caja: …» genérico) | Mariela | — | [x] |
| M16 | PDF ficha animal: **no en blanco**; opción ficha simple vs completa | Mariela | — | [~] |
| M17 | Quitar tramo «datos del sujeto» que no sirve | Mariela | — | [x] |
| M18 | Config inicial: **subespecie** y **cepa** (dropdowns) | Mariela | **BD-03** | [~] |
| M19 | Por tramo alojamiento: **inicio local** (sin pisar inicio global) | Mariela | **BD-04** | [ ] |
| M20 | Trazabilidad: **tiene cirugía** (inicio + badge arriba) | Mariela | **BD-05** | [~] |
| M21 | Export **Excel** ficha completa por animal | Mariela | — | [~] |
| M22 | **QR** / pantalla extra: datos completos, responsive tablet/móvil | Mariela | — | [~] |
| M23 | PDF/Excel: **este tramo** vs **todos los tramos** | Mariela | — | [~] |

**Orden sugerido de implementación:** D1 (bloqueo usuarios) → G1–G4 (facturación/derivados) → G5–G6 (mensajería) → M1–M4 (UX rápida) → M5+ trazabilidad/alojamiento (épica grande, con BD primero).

---

## 1. Gabriel — Formularios derivados y facturación

### G1 — Cepa en protocolo derivado (animales / reactivos)

**Problema:** al modificar protocolo derivado o cambiar cepa, se bloquea aunque la especie exista en origen y destino; debe poder elegirse la **cepa de la institución donde se edita** el formulario.

- [~] Reproducir: derivar formulario con protocolo → abrir en **destino** → cambiar cepa con especie local.
- [~] Reproducir: crear/editar formulario nuevo ligado a protocolo derivado → cepa habilitada para subespecie de **sede actual**.
- [x] API: catálogo cepa/subespecie filtrado por `instId` receptor (`AnimalModel::getCepasBySubespecie` / `getCepasByEspecie`).
- [x] Front admin animales (+ reactivos si aplica): no bloquear selector cepa en destino derivado.
- [x] i18n mensajes de error si cepa inválida (es/en/pt): `mapAnimalFormCepaApiError` + `err_cepa_invalida_api`.
- [ ] QA: especie con cepas en **ambas** instituciones de la red.

**BD:** ninguna prevista (ver [`CHECKLIST-BD-2026-05-OPERACION-GDM.md`](CHECKLIST-BD-2026-05-OPERACION-GDM.md)).

---

### G2 — Facturación por investigador y por protocolo (derivados)

**Problema:** en **departamento** ya se ven derivados; en **persona** y **protocolo** no, o no con la misma separación local/derivado.

- [x] Misma regla que depto: sede **receptora** cobra; filtro local vs derivado (`billingDerivacionFiltros`).
- [x] `BillingModel` / `BillingController`: investigador y protocolo incluyen formularios con `depto_destino` / derivación activa hacia la sede.
- [x] Front `billingInvestigador.js` y `billingProtocolo.js`: badges y totales separados (local / derivado).
- [x] Exento / `facturacion_formulario_derivado` alineado con depto: hint saliente en tabla + marca exento en PDF protocolo.
- [ ] QA: pedido derivado entregado en destino visible en los tres informes (depto, inv, prot).

**BD:** ninguna prevista.

---

### G3 — Etiqueta departamento derivado

- [x] En selector/listado de departamentos (facturación): sufijo **«- derivado (NombreInst)»** cuando el depto entra por derivación pendiente/activa.
- [x] Consistente con `getMapDeptoOrigenesDerivacionPendiente` / filtros existentes.
- [x] i18n plantilla `derivacion_depto_suffix` o clave dedicada (es/en/pt).

**BD:** ninguna.

---

### G4 — Origen al abrir detalle derivado

- [x] Al abrir modal/fila de facturación derivada: mostrar **de dónde viene** — departamento, protocolo (nº/título) y/o persona (investigador).
- [x] API: campos mínimos en filas enriquecidas (`derivado_desde_*` o reutilizar metadatos actuales).
- [x] UI depto / inv / prot / org (donde aplique derivación).

**BD:** ninguna.

---

### G5 — Email de mensajería solo con enlace

**Objetivo:** fomentar respuesta **en la app**; el correo no debe repetir el texto escrito.

- [x] Plantilla email: asunto + link al hilo/mensaje (`mensajes*.html?hilo=`).
- [x] Sin cuerpo del mensaje en el mail (o solo snippet genérico i18n).
- [x] Link con JWT/sesión o flujo login → redirect al hilo.
- [ ] QA: enviar mensaje con notificación email activada.

**BD:** ninguna (salvo plantilla en código / config institución).

---

### G6 — Mensajería móvil y acceso

- [x] Vista hilo: botón **volver** a lista de conversaciones (no quedar atrapado en un mensaje).
- [x] UI tipo chat moderno (burbujas, lista, estados) — revisar `mensajes.js` usuario/panel/institucional.
- [x] Copy visible: **recordar contraseña** / recuperación para no ingresar usuario y clave cada vez (login + enlace recuperación).
- [x] i18n es/en/pt.
- [x] CSS móvil: lista/hilo exclusivos, barra respuesta sticky, `viewport-fit=cover`, safe-area.
- [ ] Probar viewport móvil y PWA si aplica.

**BD:** ninguna.

---

## 2. Diana — Pedidos usuario (bloqueante)

### D1 — Lista pedidos y alojamientos no carga

**Reporte:** usuarios no ven sus pedidos; queda cargando. Ejemplo: **Andrea Bo**.

- [ ] Reproducir con usuario de ejemplo en staging (rol investigador / permisos menú).
- [ ] API usuario pedidos + alojamientos: timeout, 401, SQL, paginación.
- [ ] Front panel usuario: loader infinito vs error silencioso.
- [ ] Corregir y verificar lista **pedidos** y **alojamientos**.
- [ ] Regresión: admin sigue viendo los mismos formularios.

**BD:** ninguna prevista (salvo índice si diagnóstico lo exige — documentar en checklist BD).

---

## 3. Mariela — Alojamiento, trazabilidad, precios, UI

### M1 — Perillas activo / inactivo

- [x] Global: estado **activo = verde**, **inactivo = rojo** (todos los toggles del producto que usen el mismo patrón).
- [x] CSS/componente compartido si existe.
- [x] i18n accesibilidad (aria) si aplica.

**BD:** ninguna.

---

### M2 — Ayudas en configuración trazabilidad (inicio)

- [x] Título/ayuda: bloque es la **ficha del animal** — cómo inicia el alojamiento.
- [x] Aclarar: **nombre del sujeto** se carga en trazabilidad.
- [x] Ejemplo de fecha inicial; nota: la **fecha ya queda incluida** en trazabilidad (la que van cambiando en alojamiento).
- [x] i18n es/en/pt.

**BD:** ninguna.

---

### M3 — Barra Guardar en precios (sticky)

- [x] Barra «Guardar cambios» **fija al pie** del viewport en pantalla precios (no solo al scroll final).
- [x] Sin tapar contenido en móvil.

**BD:** ninguna.

---

### M4 — Planilla alojamiento tras registro nuevo

- [x] Tras **alta** de registro de alojamiento, la tabla/planilla se **actualiza sola** (misma sesión, sin F5).
- [x] Mismo criterio si edición borra/agrega filas visibles.

**BD:** ninguna.

---

### M5 — Modo de cobro alojamiento (sujeto vs contenido) — **requiere BD**

**Reglas de negocio:**

- Solo si **trazabilidad habilitada** en la institución.
- En **precios**: botón/opción visible solo con trazabilidad ON.
- Cobrar **por sujeto** (trazabilidad con sujetos obligatoria) **o** por **cantidad de lo que contiene** (especie/cantidad del periodo).
- Si modo contenido: no exige trazabilidad de cajas; cobro automático por cantidad.
- Si modo sujeto: sin sujetos en el periodo → **$0**.
- Puede haber **varias tarifas** elegibles (precio por sujeto o por unidad de contenido).

**Checklist implementación:** ver ítem **BD-01** en [`CHECKLIST-BD-2026-05-OPERACION-GDM.md`](CHECKLIST-BD-2026-05-OPERACION-GDM.md).

- [x] Spec cerrada (columnas BD-01, enum SUJETO/CONTENIDO).
- [x] API facturación alojamiento respeta modo + trazabilidad (`AlojamientoCobro`, `BillingModel`).
- [x] UI precios + ficha (M13).
- [x] i18n es/en/pt.
- [ ] QA staging tras migración SQL en servidor.

---

### M6 — Botón «+ nuevas salas»

- [x] No usar texto tipo «Crear (nombre del alojamiento…)»; etiqueta neutra i18n (ej. «Agregar sala»).

**BD:** ninguna.

---

### M7 — Sin lugar físico configurado

- [x] Si no hay lugar físico: mensaje claro, **ocultar** acciones que lo requieran.
- [x] Para admin: texto «cómo configurarlo» (enlace o pasos).

**BD:** ninguna.

---

### M8 — Nueva sala sin sujeto auto

- [x] Crear sala **no** inserta sujeto; el usuario lo crea después manualmente.

**BD:** ninguna (puede ser solo lógica API).

---

### M9 — Tipo dato Sexo en trazabilidad — **BD-02**

- [x] En configuración inicial de trazabilidad (no la plantilla fija): tipo **Sexo** (`TipoDeDato=sexo`) con valores **-**, **macho**, **hembra** (dropdown).
- [x] Render en inicio, datos diarios y alta sujeto (`__ubRenderCampoTraz` en `trazabilidad.js`).
- [ ] Estadísticas futuras: valor persistido por sujeto/tramo.
- [ ] QA en staging con variable Sexo configurada.

**BD:** no requiere migración (`TipoDeDato` es `varchar`); ver nota en **BD-02**.

---

### M10 — Texto largo — **BD-02**

- [x] Tipo dato «texto largo» (`TipoDeDato=text`) = **textarea** (inicio sujeto + campos trazabilidad + pivot con word-wrap).
- [ ] QA con notas largas en inicio y seguimiento.

**BD:** no requiere migración; ver nota en **BD-02**.

---

### M11 — Alta sujeto con datos iniciales

- [x] Modal/paso: nombre + campos iniciales del sujeto (opcionales, no todos obligatorios).
- [x] Tras crear sujeto, guarda inicio vía `/trazabilidad/save-inicio-traz` si hay valores.
- [ ] QA con categorías inicio configuradas por protocolo/especie.

**BD:** puede usar campos existentes de trazabilidad; si faltan columnas → **BD-03/04**.

---

### M12 — Título protocolo completo

- [x] En ficha/UI alojamiento: título del protocolo **sin truncar** (tooltip o multilínea).

**BD:** ninguna.

---

### M13 — Tipo de cobro visible en ficha

- [x] Encabezado ficha: badge **cobro por sujeto** vs **por contenido/cantidad** (según M5 / modo institución).
- [ ] QA staging con trazabilidad ON y ambos modos.

**BD:** depende **BD-01**.

---

### M14 — Variables por especie (ficha)

- [ ] Sugerencia producto: en variables por especie, categorías extra (ej. **marcaje**) para ficha y PDF.

**BD:** posible extensión JSON config — ver **BD-02/03** al implementar.

---

### M15 — Último alojamiento: nombre tipo

- [x] Línea «Último alojamiento»: mostrar **nombre del tipo de alojamiento** configurado, no etiqueta genérica «Caja: …».

**BD:** ninguna.

---

### M16 — PDF ficha animal (crítico)

- [x] Fix PDF **en blanco**: nodo off-screen visible + columnas Bootstrap forzadas a ancho completo para html2canvas.
- [x] Dos exportes: (A) **ficha inicio** simple; (B) **completa** con alojamiento + trazabilidad (selector radio al pulsar PDF).
- [x] i18n nombres de opciones (es/en/pt).
- [ ] QA descarga en navegador real (Chrome/Edge) con sujeto con trazabilidad.

**BD:** ninguna.

---

### M17 — Quitar tramo «datos del sujeto»

- [x] Eliminar UI/flujo del tramo que «no sirve»; limpiar referencias rotas.

**BD:** limpieza datos legacy opcional (no obligatorio día 1).

---

### M18 — Subespecie y cepa en config inicial — **BD-03**

- [x] Tipos `subespecie` y `cepa` en config trazabilidad (`TipoDeDato` + i18n es/en/pt).
- [x] Dropdowns en bloque **inicio** y alta sujeto; persisten en `idsubespA_sujeto` / `idcepaA_sujeto`.
- [x] Modal editar ficha sujeto ya tenía subesp/cepa (sin cambio).
- [ ] QA: protocolo con categorías inicio subesp+cepa; ver ficha animal/PDF.

**BD:** columnas ya en `especie_alojamiento_unidad` — ver nota BD-03 (sin migración).

---

### M19 — Inicio por tramo de alojamiento — **BD-04**

- [ ] Al cambiar de alojamiento (fila/tramo): poder editar **inicio local** de ese tramo.
- [ ] Si no se tocó: hereda inicio **global**; si se editó: solo ese tramo guarda override.
- [ ] Ver **BD-04**.

---

### M20 — Tiene cirugía — **BD-05**

- [x] Botón toggle + badge en cabecera sujeto y ficha animal (`toggleCirugia`, `animalFicha.js`).
- [x] Checkbox en modal **editar ficha sujeto** y en bloque **inicio** trazabilidad.
- [x] Checkbox al **alta sujeto** (opcional).
- [x] Migración SQL `con_cirugia` en `especie_alojamiento_unidad` — ver BD-05.
- [ ] QA staging tras ejecutar migración.

---

### M21 — Excel ficha animal (crítico)

- [x] Export Excel con resumen, variables de inicio y trazabilidad (SheetJS, hojas por sujeto).
- [x] Botones Excel en modal ficha, dropdowns trazabilidad (sujeto/caja/tramo).
- [ ] QA: sujeto con varios tramos y muchas observaciones.

**BD:** ninguna (generación client-side con datos API existente).

---

### M22 — QR y pantalla extra

- [x] QR / vista secundaria: título protocolo completo (sin truncar); observaciones con word-wrap.
- [x] Responsive tablet/móvil; escala en pantalla extra (`qr-kiosk-wrap`, toolbar táctil).
- [x] CSS Swal trazabilidad expandida (scroll, safe-area, tablas en móvil).
- [ ] QA en tablet/móvil y pantalla kiosk con trazabilidad expandida.

**BD:** ninguna.

---

### M23 — PDF/Excel por tramo

- [x] Opción export: **solo tramo actual** vs **todos los tramos** (selector al descargar; aplica si hay >1 tramo).
- [x] Aplica PDF ficha y Excel (M16/M21).
- [ ] QA con animal re-alojado en segunda estadía.

**BD:** ninguna.

---

## 4. Definición de hecho (común)

- [ ] Reproducible en **staging**.
- [ ] Textos nuevos en **es / en / pt**.
- [ ] Si ítem tiene **BD-XX**: SQL en `docs/migrations/` + bloque en [`BACKLOG-BASE-DATOS.md`](BACKLOG-BASE-DATOS.md) **antes** de marcar `[x]`.
- [ ] Rutas privadas: `Auditoria::getDatosSesion()`, filtro `instId`.
- [ ] Mutaciones sensibles: `Auditoria::log` según checklist seguridad.

---

## 5. Registro de cierre

| Fecha | ID | Notas |
|-------|-----|-------|
| | | |
