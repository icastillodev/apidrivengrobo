<!--
  CHECKLIST MAESTRO — Capacitación GROBO
  Objetivo: seguimiento de trabajo, calidad del manual y coherencia con el producto.
  Convención: [x] hecho · [ ] pendiente · marcar fecha/nombre en comentarios internos del equipo si lo desean.
-->

<div align="center">

# 📚 Checklist maestro — Capacitación

**Manual por rol · biblioteca `panel/capacitacion` · barra inferior (documento de ayuda + tutorial interactivo) · menú Ayuda junto a Excel**

*Documento vivo: marcar casillas a medida que se avanza. Prioridad: claridad para el usuario final.*

</div>

---

## 📖 Índice rápido

| Sección | Contenido |
|--------|-----------|
| [1. Leyenda e iconos](#1--leyenda-e-iconos) | Estados, símbolos y colores semánticos |
| [2. Mapas visuales](#2--mapas-visuales-flujos) | Diagramas de flujo (Mermaid) |
| [3. Patrones de pantalla](#3--patrones-de-ui-en-grobo-listas-popups-crear--editar) | Listas, popups, crear/modificar |
| [4. Para qué sirve cada menú](#4--tabla-maestra-para-qué-sirve-cada-ruta-del-menú) | Tabla maestra por ruta |
| [5. Checklist por módulo](#5--checklist-por-módulo-contenido-del-manual) | Detalle por tema / slug |
| [6. Infraestructura técnica](#6--infraestructura-técnica) | Archivos, i18n, barra ayuda, deep links |
| [7. Calidad y medios](#7--calidad-contenido-capturas-glosario) | Capturas, glosario, revisión |
| [8. QA y accesibilidad](#8--qa-manual-y-accesibilidad) | Pruebas por rol e idioma |
| [9. Extras](#9--extras-superadmin-registro-público-páginas-huérfanas) | QR, registro público, sub-rutas config |
| [10. Roles GROBO (1–6)](#10--roles-grobo-visibilidad-en-capacitación) | **No todos ven lo mismo** · matriz menú/capacitación |
| [11. RED multi-sede](#11--red-multi-sede-checklist-por-rol-y-área) | Protocolos, formularios, mensajes… por rol |
| [12. Seguimiento por release](#12--seguimiento-por-release) | Cierre de versión, prioridades, bloqueadores |
| [13. Tutorial interactivo](#13--tutorial-interactivo-spotlight--checklist) | Pasos por ruta, i18n, selectores, botón contextual |
| [13.5–13.6](#135--tour-solo-con-modal-bootstrap-y-backlog-por-modal) | Tour `__modals__` solo con modal abierto · backlog campo a campo |

---

## 1 · Leyenda e iconos

### Estados del checklist

| Icono | Significado |
|:-----:|-------------|
| ✅ / `[x]` | Completado en código o contenido base |
| ⬜ / `[ ]` | Pendiente — **acción requerida** |
| 🔄 | En curso (asignar responsable en el equipo) |
| 👀 | Revisión funcional / texto con sede piloto |
| 🖼 | Falta captura, GIF o anotación visual |
| 🌐 | Revisar traducción EN / PT |

### Iconos de menú (referencia rápida)

| Icono | Uso en este doc |
|:-----:|-----------------|
| 🏠 | Dashboard / inicio |
| 👥 | Usuarios |
| 📄 | Protocolos / documentos |
| 🐾 | Animales |
| 🧪 | Reactivos / insumos |
| 📅 | Reservas |
| 🏠‍🔬 | Alojamientos |
| 📊 | Estadísticas |
| ⚙️ | Configuración |
| 📝 | Formularios / pedidos |
| 💬 | Mensajes |
| 📰 | Noticias |
| 💰 | Facturación / precios |
| ❓ | Ayuda (capacitación, soporte, ventas) |
| 🧩 | RED / multi-sede |

---

## 2 · Mapas visuales (flujos)

### 2.1 Vista general: dónde vive la capacitación

```mermaid
flowchart LR
  subgraph Usuario["👤 Usuario en panel"]
    M["Menú lateral"]
    P["Cualquier pantalla"]
  end
  subgraph Ayuda["❓ Ayuda"]
    C["Ayuda → Capacitación"]
    FAB["Barra inferior: documento de ayuda + tutorial interactivo"]
  end
  subgraph Biblio["📚 Biblioteca"]
    L["Lista izquierda temas"]
    R["Contenido: cinta + acordeón"]
    H["#t=slug deep link"]
  end
  M --> C
  P --> FAB
  C --> Biblio
  FAB --> Biblio
  H --> Biblio
```

### 2.2 Qué ve el usuario dentro de un tema

```mermaid
flowchart TB
  T["Tema seleccionado"] --> A["💡 Cinta: cómo leer el tutorial"]
  T --> S["📌 Resumen (lead)"]
  T --> RO["🏷 Alcance por rol"]
  T --> AC["📂 Acordeón: apartados"]
  AC --> B1["Bloque 1: vista general…"]
  AC --> B2["Bloque 2: listas / acciones…"]
  AC --> B3["Bloque 3: popups / estados…"]
```

### 2.3 Archivos clave (mantenimiento)

```mermaid
flowchart TB
  subgraph Front["Front"]
    cap["capacitacion.js"]
    paths["capacitacionPaths.js · capacitacionMenuPaths.js"]
    fab["CapacitacionHelpFab.js"]
    tour["CapacitacionInteractiveTour.js · capacitacionTours.js"]
    phm["CapacitacionPageHelpMenu.js"]
    html["paginas/panel/capacitacion.html"]
    manES["capacitacionManual.es.js"]
    manEN["capacitacionManual.en.js"]
    manPT["capacitacionManual.pt.js"]
    i18n["i18n/es.js · en.js · pt.js"]
  end
  cap --> paths
  cap --> manES
  cap --> manEN
  cap --> manPT
  cap --> i18n
  fab --> paths
  fab --> tour
  tour --> paths
  phm --> tour
  phm --> paths
  html --> cap
```

### 2.4 Cómo se decide “qué temas ve cada usuario” (por rol + módulos)

> **Regla de oro:** la lista izquierda de capacitación **no es** el manual completo para todos: es la **intersección** entre (a) rutas que el rol tiene en el menú, (b) filtros por **módulos contratados** (`instModulos`, `filterMenuIdsByModulos`), (c) reglas de `modulesAccess` para rutas `panel/*`, y (d) el orden `CAPACITACION_PATH_ORDER`, más rutas forzadas (`admin/dashboard` o `panel/dashboard`, `panel/capacitacion`, `capacitacion/tema/red`).

```mermaid
flowchart TB
  subgraph Entrada["🔑 Sesión"]
    R["userLevel = rol 1…6"]
    I["instId + instModulos"]
  end
  subgraph Menu["📋 Menú permitido"]
    A["Roles 1, 2, 4: plantilla amplia + filtro módulos"]
    B["Roles 3, 5, 6: GET /menu + filtro módulos"]
  end
  subgraph Cap["📚 Capacitación"]
    C["collectMenuPathsFromIds → Set de paths"]
    O["CAPACITACION_PATH_ORDER + extras"]
    L["Lista final = orden ∩ permitidos"]
  end
  R --> A
  R --> B
  I --> A
  I --> B
  A --> C
  B --> C
  C --> L
  O --> L
```

| Símbolo en tablas siguientes | Significado |
|:----------------------------:|-------------|
| **●** | Suele ver el tema en capacitación (plantilla o panel estándar) |
| **◐** | **Condicional:** `menudistr`, módulo desactivado, o `invHasData` (investigador con historial en ese módulo) |
| **○** | No suele aparecer: ese rol no tiene esa ruta en menú |

**Nombres oficiales** (clave `window.txt.roles` en i18n):

| ID | Nombre UI | Perfil operativo (resumen) |
|:--:|-----------|----------------------------|
| **1** | GeckoDev | Maestro / implementación; menú tipo admin amplio + filtros módulo |
| **2** | Superadmin | Administración de sede / institución (alto alcance) |
| **4** | Admin | Administrador de sede |
| **3** | Investigador | Carga protocolos/pedidos; menú **panel** + dropdown investigación |
| **5** | Asistente | Apoyo a investigación; mismo esquema **panel** con permisos según `menudistr` |
| **6** | Laboratorio | Operación bioterio lado “usuario”; panel con módulos acordes |

> Un **investigador** o **laboratorio** **no** ve la misma biblioteca que **Admin** o **GeckoDev**: si falta un tema, en casi todos los casos es **correcto** (no es bug), salvo error de configuración de menú o módulo.

---

## 3 · Patrones de UI en GROBO (listas, popups, crear / editar)

> **Objetivo del manual:** que quien lee sepa *qué es cada cosa en pantalla* y *para qué sirve*, no solo el nombre del menú.

### 3.1 Listas y tablas (grillas)

| Qué suele verse | Para qué sirve | Qué documentar en el manual |
|-----------------|----------------|-----------------------------|
| **Lista / tabla** principal | Ver muchos registros a la vez; ordenar, filtrar | Columnas clave, filtros superiores, paginación si existe |
| **Clic en fila** | Abrir detalle, ficha o modal | “Al hacer clic…” |
| **Botones en toolbar** | Crear, exportar (Excel/PDF), refrescar | Cada botón y cuándo usarlo |
| **Badges / estados** | Saber en qué etapa está un trámite | Tabla “estado → significado” si la sede lo personaliza |

- [ ] ⬜ En cada tema administrativo: ¿el manual nombra **filtros** y **columnas críticas**?
- [ ] ⬜ En temas de pedidos: ¿se explica la **lista** vs el **detalle** del ítem?

### 3.2 Popups, modales y alertas (SweetAlert2, Bootstrap modal, etc.)

| Tipo | Uso típico en GROBO | Qué poner en capacitación |
|------|---------------------|---------------------------|
| **Confirmación** | “¿Seguro que desea…?” antes de borrar o cerrar | Advertir consecuencias (facturación, irreversibilidad) |
| **Formulario en modal** | Crear/editar rápido sin salir de la lista | Campos obligatorios y validaciones visibles |
| **Mensaje de éxito / error** | Feedback tras guardar o fallo API | “Verá un mensaje de…” + qué hacer si falla |
| **Carga (loader)** | Mientras la API responde | Indicar que puede tardar en listas grandes |

**Plantilla sugerida para un bloque del acordeón (popups):**

1. **Disparador:** qué botón o acción abre el popup.  
2. **Campos:** qué debe completar el usuario.  
3. **Guardar / Cancelar:** qué cambia en la lista al confirmar.  
4. **Errores:** mensajes típicos (validación, permiso, sesión).

- [ ] ⬜ Temas con flujos críticos: ¿incluyen sub-apartado **“Ventanas emergentes”** o **“Confirmaciones”**?

### 3.3 Crear y modificar (flujo típico)

```text
┌─────────────────────────────────────────────────────────┐
│  LISTA                         →  [Nuevo] o clic fila   │
├─────────────────────────────────────────────────────────┤
│  FORMULARIO / FICHA / MODAL    →  campos + Guardar      │
├─────────────────────────────────────────────────────────┤
│  FEEDBACK (toast / Swal)       →  éxito o error         │
├─────────────────────────────────────────────────────────┤
│  LISTA actualizada             →  registro nuevo o      │
│                                →  datos actualizados    │
└─────────────────────────────────────────────────────────┘
```

- [ ] ⬜ ¿El manual describe **crear** y **editar** por separado cuando el flujo difiere?
- [ ] ⬜ ¿Se indica si la edición es solo **admin** o también **investigador**?

---

## 4 · Tabla maestra: para qué sirve cada ruta del menú

> Rutas alineadas a `CAPACITACION_PATH_ORDER` + menú `MenuTemplates`.  
> **Slug** = `menuPath` con `/` → `__` (ej. `admin/usuarios` → `admin__usuarios`).

| Ruta `path` | Slug (hash `#t=`) | Para qué sirve (resumen operativo) | Rol típico |
|-------------|-------------------|-----------------------------------|------------|
| `admin/dashboard` | `admin__dashboard` | Punto de entrada admin: atajos y visión del día | Admin sede, superadmin contexto |
| `panel/dashboard` | `panel__dashboard` | Inicio investigador: enlaces a pedidos y actividad | Investigador |
| `capacitacion/tema/red` | `capacitacion__tema__red` | Conceptos RED: sedes, mensajes, facturación cruzada | Todos (lectura) |
| `admin/usuarios` | `admin__usuarios` | Directorio de personas, roles, ficha, exportaciones | Admin |
| `admin/protocolos` | `admin__protocolos` | **Protocolos en operación** (vigencia, especies, vínculo pedidos) | Admin / bioterio |
| `admin/solicitud_protocolo` | `admin__solicitud_protocolo` | **Trámites** de alta/renovación (cola de solicitudes) | Admin / comité (según sede) |
| `admin/animales` | `admin__animales` | Bandeja de pedidos de animales vivos | Bioterio |
| `admin/reactivos` | `admin__reactivos` | Pedidos de reactivos | Lab / depósito |
| `admin/insumos` | `admin__insumos` | Pedidos de insumos | Depósito |
| `admin/reservas` | `admin__reservas` | Agenda salas/equipos (admin) | Infraestructura |
| `admin/alojamientos` | `admin__alojamientos` | Estadías, cajas, cierre facturable | Bioterio |
| `admin/estadisticas` | `admin__estadisticas` | Indicadores y reportes agregados | Dirección / calidad |
| `admin/configuracion/config` | `admin__configuracion__config` | **Hub** de parámetros (submenús múltiples) | Admin configuración |
| `panel/formularios` | `panel__formularios` | Entrada a **animales / reactivos / insumos** (según módulos) | Investigador |
| `panel/misformularios` | `panel__misformularios` | Historial unificado de pedidos propios | Investigador |
| `panel/misalojamientos` | `panel__misalojamientos` | Consulta de alojamientos vinculados | Investigador |
| `panel/misreservas` | `panel__misreservas` | Reservas propias | Investigador |
| `panel/misprotocolos` | `panel__misprotocolos` | Protocolos en los que participa; vigencia | Investigador |
| `admin/precios` | `admin__precios` | Tarifas y listas para facturación | Finanzas / admin |
| `admin/facturacion/index` | `admin__facturacion__index` | Informes contables (subvistas) | Finanzas |
| `admin/historialcontable` | `admin__historialcontable` | Movimientos y auditoría contable | Finanzas |
| `panel/mensajes` | `panel__mensajes` | Mensajería 1:1 | Todos (con módulo) |
| `panel/mensajes_institucion` | `panel__mensajes_institucion` | Canal institucional / RED | Todos (con módulo) |
| `admin/comunicacion/noticias` | `admin__comunicacion__noticias` | **Publicar** noticias del portal | Comunicación / admin |
| `panel/noticias` | `panel__noticias` | **Leer** noticias | Todos (con módulo) |
| `panel/perfil` | `panel__perfil` | Datos personales; barra del menú (tema claro/oscuro, idioma, letra, layout, mic); Gecko Search/IA/voz | Todos |
| `panel/soporte` | `panel__soporte` | Tickets técnicos Gecko (turnos) | Todos (con módulo) |
| `panel/ventas` | `panel__ventas` | Consulta comercial por correo a ventas | Todos (con módulo) |
| `panel/capacitacion` | `panel__capacitacion` | Esta biblioteca de ayuda | Todos (con módulo) |

**Submenús que no son una ruta única en el orden del manual (documentar dentro del padre):**

| Agrupación | Ítems hijos | Notas |
|------------|-------------|--------|
| **Investigación** (id `55`) | Mis formularios, alojamientos, reservas, protocolos, mensajes | Visibilidad por `pathVisibleForModules` |
| **Contable** (id `202`) | Precios, facturación, historial | Ya listados como rutas propias arriba |
| **Ayuda** (id `998`) | Capacitación, ticket, ventas | Rutas `panel/…` |
| **Perfil** (id `999`) | Mi perfil, salir | `logout` no entra al manual |

---

## 5 · Checklist por módulo (contenido del manual)

> Para **cada** fila: marcar 👀 revisión sede, 🖼 si faltan capturas, 🌐 si hay que pulir EN/PT.  
> **Cruce obligatorio:** antes de dar por cerrado un tema, contrastar con **[§10](#10--roles-grobo-visibilidad-en-capacitación)** (¿ese rol lo ve en la lista?) y, si aplica RED, con **[§11](#11--red-multi-sede-checklist-por-rol-y-área)**.

### 5.1 Infraestructura del producto capacitación

| # | Tarea | Estado |
|---|--------|--------|
| 1 | Página `panel/capacitacion` (lista + contenido + Bootstrap bundle) | [x] |
| 2 | Catálogo alineado a `MenuTemplates` + tema `capacitacion/tema/red` | [x] |
| 3 | `admin/dashboard` y `panel/dashboard` inyectados según rol | [x] |
| 4 | Filtrado por `/menu` + `filterMenuIdsByModulos` | [x] |
| 5 | Deep link `#t=slug` | [x] |
| 6 | `CapacitacionHelpFab` (barra inferior: documento + tour + ocultar) | [x] |
| 7 | Manuales `capacitacionManual.{es,en,pt}.js` | [x] |
| 8 | Acordeones + cinta “cómo leer” + fallback `bodies` | [x] |
| 9 | i18n UI capacitación (banner, barra, roles_label, tour_*, RED…) | [x] |
| 10 | `CapacitacionInteractiveTour.js` + `capacitacionTours.js` (spotlight) | [x] |
| 11 | `CapacitacionPageHelpMenu.js` (`data-gecko-cap-help` / modal opcional) | [x] |
| 12 | Preferencia `gecko_hide_capacitacion_fab` + tarjeta en `capacitacion.html` | [x] |

### 5.2 Administración — contenido por tema

| Ruta | Slug | Contenido base | 👀 Revisión sede | 🖼 Medios | Listas / popups documentados |
|------|------|----------------|------------------|-----------|------------------------------|
| `admin/dashboard` | `admin__dashboard` | [x] | [ ] | [ ] | [ ] |
| `admin/usuarios` | `admin__usuarios` | [x] | [ ] | [ ] | [ ] |
| `admin/protocolos` | `admin__protocolos` | [x] | [ ] | [ ] | [ ] |
| `admin/solicitud_protocolo` | `admin__solicitud_protocolo` | [x] | [ ] | [ ] | [ ] |
| `admin/animales` | `admin__animales` | [x] | [ ] | [ ] | [ ] |
| `admin/reactivos` | `admin__reactivos` | [x] | [ ] | [ ] | [ ] |
| `admin/insumos` | `admin__insumos` | [x] | [ ] | [ ] | [ ] |
| `admin/reservas` | `admin__reservas` | [x] | [ ] | [ ] | [ ] |
| `admin/alojamientos` | `admin__alojamientos` | [x] | [ ] | [ ] | [ ] |
| `admin/estadisticas` | `admin__estadisticas` | [x] | [ ] | [ ] | [ ] |
| `admin/configuracion/config` | `admin__configuracion__config` | [x] | [ ] | [ ] | [x] |
| `admin/precios` | `admin__precios` | [x] | [ ] | [ ] | [ ] |
| `admin/facturacion/index` | `admin__facturacion__index` | [x] | [ ] | [ ] | [x] modal ayuda en página |
| `admin/historialcontable` | `admin__historialcontable` | [x] | [ ] | [ ] | [x] modal ayuda en página |
| `admin/comunicacion/noticias` | `admin__comunicacion__noticias` | [x] | [ ] | [ ] | [x] modal ayuda en página (+ modal edición noticia) |

### 5.3 Panel investigador / usuario

| Ruta | Slug | Contenido base | 👀 | 🖼 | Listas / popups |
|------|------|----------------|----|----|-----------------|
| `panel/dashboard` | `panel__dashboard` | [x] | [ ] | [ ] | [ ] |
| `panel/formularios` | `panel__formularios` | [x] | [ ] | [ ] | [ ] |
| `panel/misformularios` | `panel__misformularios` | [x] | [ ] | [ ] | [ ] |
| `panel/misalojamientos` | `panel__misalojamientos` | [x] | [ ] | [ ] | [ ] |
| `panel/misreservas` | `panel__misreservas` | [x] | [ ] | [ ] | [ ] |
| `panel/misprotocolos` | `panel__misprotocolos` | [x] | [ ] | [ ] | [ ] |
| `panel/mensajes` | `panel__mensajes` | [x] | [ ] | [ ] | [ ] |
| `panel/mensajes_institucion` | `panel__mensajes_institucion` | [x] | [ ] | [ ] | [ ] |
| `panel/noticias` | `panel__noticias` | [x] | [ ] | [ ] | [ ] |
| `panel/perfil` | `panel__perfil` | [x] | [ ] | [ ] | [ ] |
| `panel/soporte` | `panel__soporte` | [x] | [ ] | [ ] | [ ] |
| `panel/ventas` | `panel__ventas` | [x] | [ ] | [ ] | [x] |
| `panel/capacitacion` | `panel__capacitacion` | [x] | [ ] | [ ] | [ ] |

### 5.4 Transversal

| Ruta | Slug | Contenido base | 👀 | 🖼 |
|------|------|----------------|----|-----|
| `capacitacion/tema/red` | `capacitacion__tema__red` | [x] | [ ] | [ ] |

---

## 6 · Infraestructura técnica

### 6.1 Archivos — checklist de mantenimiento

| Archivo | Responsabilidad | Verificar |
|---------|-----------------|-----------|
| `front/paginas/panel/capacitacion.html` | Layout, Bootstrap CSS+JS, banner i18n | [x] |
| `front/dist/js/pages/usuario/capacitacion.js` | Lista temas, `topicHtml` (+ `cat` / `icon` por bloque), hash, idioma manual | [x] |
| `front/dist/js/utils/capacitacionPaths.js` | `pathnameToMenuPath`, `menuPathToSlug` | [x] |
| `front/dist/js/utils/capacitacionLabels.js` | Etiquetas menú → i18n (lista capacitación, FAB) | [x] |
| `front/dist/js/utils/capacitacionMenuPaths.js` | `CAPACITACION_PATH_ORDER`, `collectMenuPathsFromIds` | [x] |
| `front/dist/js/components/CapacitacionHelpFab.js` | Barra inferior contextual + `FAB_HIDDEN_KEY` | [x] |
| `front/dist/js/components/CapacitacionInteractiveTour.js` | Overlay spotlight, pasos, teclado | [x] |
| `front/dist/js/utils/capacitacionTours.js` | `CAPACITACION_TOUR_STEPS` por `menuPath` | [x] |
| `front/dist/js/components/CapacitacionPageHelpMenu.js` | Menú flotante Ayuda + Excel | [x] |
| `front/dist/js/utils/capacitacionManual.es.js` | Capítulos ES | [x] |
| `front/dist/js/utils/capacitacionManual.en.js` | Capítulos EN | [x] |
| `front/dist/js/utils/capacitacionManual.pt.js` | Capítulos PT | [x] |
| `front/dist/js/utils/i18n/{es,en,pt}.js` | `capacitacion.*`, `titulos_pagina`, menú ayuda | [x] |

### 6.2 Reglas al añadir una pantalla nueva al producto

- [ ] ⬜ Añadir `path` en `MenuTemplates.js` (o venir del backend si aplica).
- [ ] ⬜ Si aplica a investigador: registro en `modulesAccess.js` (`PATH_RULES`).
- [ ] ⬜ Incluir ruta en `CAPACITACION_PATH_ORDER` (posición lógica).
- [ ] ⬜ Crear slug y capítulo en **los tres** `capacitacionManual.*.js`.
- [ ] ⬜ Añadir `titulos_pagina` + `PATH_TO_TITLE_KEY` en `i18n.js` si hay `data-page-title-key`.
- [ ] ⬜ Probar barra inferior: `pathnameToMenuPath` debe resolver la nueva página.
- [ ] ⬜ Añadir la ruta en `capacitacionLabels.js` (`CAPACITACION_MENU_LABEL_KEYS`) para título coherente en lista y barra.
- [ ] ⬜ **Tutorial interactivo (§13):** añadir entradas en `capacitacionTours.js` + claves `capacitacion.tour_*` en ES/EN/PT (o marcar ruta como pendiente en la tabla §13.2).
- [ ] ⬜ Opcional: botón Ayuda de la grilla con `data-gecko-cap-help="<menuPath>"` y `data-gecko-cap-modal="#…"` si hay modal local.
- [ ] ⬜ Actualizar **esta tabla maestra** (sección 4) y la sub-sección 5 correspondiente.

### 6.3 Deep links de ejemplo (para pruebas)

```text
…/paginas/panel/capacitacion.html#t=admin__protocolos
…/paginas/panel/capacitacion.html#t=admin__solicitud_protocolo
…/paginas/panel/capacitacion.html#t=capacitacion__tema__red
…/paginas/panel/capacitacion.html#t=panel__ventas
…/paginas/panel/capacitacion.html#t=panel__soporte
…/paginas/panel/capacitacion.html#t=admin__configuracion__config
```

---

## 7 · Calidad, contenido, capturas, glosario

### 7.1 Estándar mínimo por capítulo (`CHAPTERS[slug]`)

- [ ] ⬜ **`summary`:** 1–3 frases; responde “¿qué es esta pantalla?”
- [ ] ⬜ **`roles`:** quién debería leerlo; quién **no** debería asumir permisos
- [ ] ⬜ **Cada `block`:** título claro (`h`) + HTML con `<ul>` / pasos donde proceda
- [ ] ⬜ Mención explícita de **lista principal** vs **detalle** / **ficha**
- [ ] ⬜ Si hay **SweetAlert** o **modal Bootstrap**: apartado o viñeta dedicada
- [ ] ⬜ Enlace o referencia a **pantallas relacionadas** (ej. protocolos ↔ solicitud ↔ pedidos)

### 7.2 Glosario sugerido (ampliar en manual o wiki interna)

| Término | Definición corta para el manual |
|---------|----------------------------------|
| **Sede / institución** | Unidad en la que opera el usuario y sus datos |
| **RED** | Varias sedes bajo misma dependencia; flujos pueden cruzarse |
| **Protocolo (operativo)** | Entidad autorizada para pedidos y alojamiento |
| **Solicitud de protocolo** | Trámite para alta/cambio ante comité o admin |
| **Módulo** | Funcionalidad contratable; puede ocultar menús |
| **Slug** | Identificador estable del tema en la URL `#t=` |
| **menudistr** | Distribución de ítems de menú por usuario/institución (excepciones a la plantilla estándar) |
| **invHasData** | Lógica que puede mostrar módulos al investigador si ya tiene historial aunque el menú base sea más restrictivo |
| **Plantilla admin (1, 2, 4)** | Menú amplio generado en front + filtro por módulos contratados |
| **Menú panel (3, 5, 6)** | Menú obtenido vía API (`/menu`) + mismos filtros de módulos |
| **modulesAccess** | Reglas de acceso a rutas `panel/*` según path y rol |

### 7.4 Convención «control por control» (botones, iconos, categorías)

> **Objetivo:** documentación muy detallada, categorizada, con iconos de referencia (Bootstrap Icons) alineados a zonas reales de la UI.

| Regla | Detalle |
|--------|---------|
| **Categorías (`cat`)** | Valores estándar: `navigation`, `toolbar`, `filters`, `table`, `row`, `bulk`, `modals`, `forms`, `detail`, `sidebar`, `dashboard`, `content`, `comms`, `hub`, `profile`, `links`, `help`. Se traducen vía `capacitacion.cat_*` en i18n ES/EN/PT. |
| **Icono del apartado (`icon`)** | Nombre Bootstrap Icons **sin** prefijo `bi-` (ej. `funnel`). Aparece junto al título del acordeón. |
| **Glosario de controles** | En `blocks[].html`, usar `<dl class="manual-glossary">` con `<dt>` (control + `<i class="bi bi-…">`) y `<dd>` (qué hace, cuándo usarlo, advertencias). |
| **Variación por sede** | Redactar con «suele», «típico», «si su sede muestra…»; el producto puede personalizar etiquetas. |
| **Paridad de idiomas** | Mismos `id` de bloque y mismas claves `cat`/`icon` en `capacitacionManual.es.js`, `.en.js`, `.pt.js`; solo cambian `h` y `html`. |
| **Render** | `capacitacion.js` inserta cabeceras de categoría y soporta `icon`/`cat`; estilos en `capacitacion.html` (`.manual-glossary`, `.manual-cat-heading`). |

> **Avance:** `admin__configuracion__config` ya sigue §7.4 (hub, mapa, riesgos, bloque `modals` con glosario) y §13 (tour 3 pasos + modal Ayuda en `config.html`).

- [ ] ⬜ Resto de capítulos del manual: aplicar §7.4 al mismo nivel que los piloto (dashboard admin/panel, usuarios, protocolos, animales, centro de solicitudes, mis formularios, tema capacitación).

### 7.3 Capturas y GIFs (opcional pero recomendado)

- [ ] ⬜ Definir carpeta única: ej. `docs/img/capacitacion/` o CDN institucional
- [ ] ⬜ Nombrar archivos: `{slug}-{pantalla}-{lang}.png`
- [ ] ⬜ En `blocks[].html`, insertar `<figure>` o `<img>` con `alt` descriptivo
- [ ] ⬜ GIF solo para flujos de **más de 3 clics** (crear pedido, enviar formulario)
- [ ] ⬜ **Anonimizar** datos personales en capturas

---

## 8 · QA manual y accesibilidad

### 8.1 Matriz de pruebas rápidas

| Caso | Pasos | Esperado | ⬜ |
|------|--------|----------|---|
| Investigador | Login rol **3**, abrir capacitación | Solo temas de su menú + `capacitacion__tema__red` si aplica; **sin** bandejas admin salvo excepción real | [ ] |
| Asistente | Login rol **5** | Misma familia de menú que investigador; validar **permisos extra** de la sede vs matriz §10.1 | [ ] |
| Laboratorio | Login rol **6** | Temas panel acordes a operación (pedidos, alojamientos, etc.); **no** narrar como “titular de protocolo” si no aplica | [ ] |
| Admin sede | Login rol **4** (y **2** si aplica) | Temas admin + contable + comunicación según módulos; lista ≠ investigador | [ ] |
| GeckoDev | Login rol **1** (solo entorno prueba) | Coherencia barra inferior + lista; textos no asumen una sola sede | [ ] |
| Barra inferior | Abrir `admin/usuarios` | **Ver documento de ayuda** → `#t=admin__usuarios` | [ ] |
| Barra + tour | Misma pantalla | **Tutorial interactivo** → 4 pasos (título, filtro, Excel, tabla) sin errores de consola | [ ] |
| Barra panel | Abrir `panel/misformularios` | Documento de ayuda resuelve a `#t=panel__misformularios` (o slug vigente) | [ ] |
| Ocultar barra | Pulsar “No mostrar más…” | `localStorage` `gecko_hide_capacitacion_fab`; barra desaparece en otras páginas | [ ] |
| Reactivar barra | `panel/capacitacion` | Interruptor + `refreshCapacitacionHelpFab` muestra de nuevo la barra al navegar | [ ] |
| Ayuda + Excel | `admin/usuarios` → Ayuda | Menú: ayuda modal + documento + tour + mostrar barra (si oculta) | [ ] |
| Tour biblioteca | `panel/capacitacion` | Botón “Tutorial interactivo de esta biblioteca” → 3 pasos | [ ] |
| Soporte | `panel/soporte`: enviar ticket de prueba | Correo / confirmación según backend; manual alineado al flujo real | [ ] |
| Ventas | `panel/ventas`: enviar consulta | Mensaje de éxito con destino; categoría venta | [ ] |
| Tema RED | Abrir `capacitacion__tema__red` desde lista | Visible para roles que deben verlo; contenido coherente con §11 | [ ] |
| Acordeón | Abrir un tema largo, expandir/colapsar | Bootstrap JS funciona | [ ] |
| Idioma | Cambiar ES → EN → PT | Textos UI + capítulos coherentes | [ ] |
| Hash | Pegar URL con `#t=` | Se selecciona el tema correcto | [ ] |
| Sin tema | Institución **sin** módulo (ej. reactivos) | Ese ítem **no** aparece en la lista izquierda | [ ] |
| Hash huérfano | `#t=admin__precios` con rol investigador | Aviso traducido + primer tema de la biblioteca + hash corregido (`replaceState`) | [x] |

### 8.2 Accesibilidad (mejoras futuras)

- [x] Lista de temas: `role="navigation"`, `aria-label`, `aria-current` en el ítem activo, `aria-controls` → región de contenido; `<main>` con `aria-label`; región contenido `aria-labelledby` + `aria-live="polite"`; barra inferior: `aria-label` en región + enlace al documento de ayuda.
- [x] Tutorial interactivo: foco visible en botones Anterior/Siguiente (`CapacitacionInteractiveTour.js`); `role="dialog"` + `aria-modal` en la tarjeta del tour; cierre con clic en overlay (§13.3).
- [ ] ⬜ Contraste de la cinta verde y badges en tema claro/oscuro
- [x] Navegación por teclado en lista lateral: botones nativos (Tab / Enter); acordeón Bootstrap (foco en cabeceras)

---

## 9 · Extras: superadmin, registro público, páginas huérfanas

| Área | Situación | Acción sugerida |
|------|-----------|-----------------|
| **Superadmin** | Barra inferior suele no aplicar o rutas distintas | [ ] ⬜ Documentar exclusión o mapeo en `pathnameToMenuPath` |
| **Registro / login público** | Sin menú panel | [ ] ⬜ Manual aparte o enlace a groboapp.com |
| **QR / salas** | Pueden no pasar por menú estándar | [ ] ⬜ Entrada “padre” en checklist o FAQ interno |
| **Configuración sub-rutas** | Muchas URLs bajo `admin/configuracion/*` | [ ] ⬜ Ampliar `pathnameToMenuPath` o capítulos hijos en el manual del hub |

---

## 10 · Roles GROBO: visibilidad en capacitación

### 10.1 Matriz **ruta × rol** (lista izquierda del manual)

> Leyenda: **●** típico · **◐** según institución/módulos/menú · **○** no aplica.  
> Ajustar celdas si su `menudistr` otorga excepciones reales.

| Ruta / tema | 1 Gecko | 2 Super | 4 Admin | 3 Inv | 5 Asist | 6 Lab |
|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| `admin/dashboard` | ● | ● | ● | ○ | ○ | ○ |
| `panel/dashboard` | ○ | ○ | ○ | ● | ● | ● |
| `capacitacion/tema/red` | ● | ● | ● | ● | ● | ● |
| `admin/usuarios` | ● | ● | ● | ○ | ○ | ○ |
| `admin/protocolos` | ● | ● | ● | ○ | ○ | ○ |
| `admin/solicitud_protocolo` | ● | ● | ● | ○ | ○ | ○ |
| `admin/animales` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/reactivos` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/insumos` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/reservas` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/alojamientos` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/estadisticas` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/configuracion/config` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `panel/formularios` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/misformularios` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/misalojamientos` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/misreservas` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/misprotocolos` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `admin/precios` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/facturacion/index` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `admin/historialcontable` | ◐ | ◐ | ◐ | ○ | ○ | ○ |
| `panel/mensajes` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/mensajes_institucion` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `admin/comunicacion/noticias` | ◐ | ◐ | ◐ | ◐ | ◐ | ○ |
| `panel/noticias` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/perfil` | ● | ● | ● | ● | ● | ● |
| `panel/soporte` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/ventas` | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| `panel/capacitacion` | ● | ● | ● | ● | ● | ● |

### 10.2 Checklist de redacción **por perfil** (qué debe aclarar el manual)

#### 🦎 Rol 1 — GeckoDev
- [ ] ⬜ Textos que no asuman **una sola sede** si prueban con `instId` 0 o varias.
- [ ] ⬜ Distinguir “lo que ve un Gecko en soporte” vs “lo que ve un usuario institucional”.
- [ ] ⬜ Si comparten capturas: etiquetar **rol** y **sede** en el pie de figura.

#### 🏛 Rol 2 — Superadmin
- [ ] ⬜ Misma base que Admin (4) pero mencionar **alcance** (varias sedes / políticas) donde aplique.
- [ ] ⬜ Noticias (admin) y mensajería institucional: visibilidad según **menú real** de la sede (`MenuController` / `menudistr`), no asumir ítems que la API no devuelve.

#### ⚙️ Rol 4 — Admin
- [ ] ⬜ Cada tema **admin/** debe explicar **impacto en investigadores** (estados de pedido, facturación).
- [ ] ⬜ Configuración: remitir a subsecciones reales (institución, especies, reservas…).
- [ ] ⬜ Contable (202): precios, facturación, historial como **flujo** (orden de uso).

#### 🔬 Rol 3 — Investigador
- [ ] ⬜ Énfasis en **Mis formularios**, **Mis protocolos**, **Centro de solicitudes** y vínculo con admin.
- [ ] ⬜ Dejar claro qué **no** puede tocar (bandejas admin, facturación).
- [ ] ⬜ RED: derivación de formularios / mensajes si su sede lo usa.

#### 📎 Rol 5 — Asistente
- [ ] ⬜ Igual que investigador + **qué permisos extra** puede tener según institución (documentar en sede piloto).
- [ ] ⬜ Si puede enviar formularios a nombre de equipo: indicarlo en manual **Mis formularios**.

#### 🧪 Rol 6 — Laboratorio
- [ ] ⬜ Enfocado en **pedidos entrantes**, **reservas**, **alojamientos** en vista panel si los tiene.
- [ ] ⬜ No mezclar narrativa de “titular de protocolo” si el rol es puramente operativo (validar con RR.HH. / sede).

### 10.3 QA específico “por rol” (marcar en cada release de contenido)

| ⬜ | Acción |
|---|--------|
| [ ] | Iniciar sesión como **3, 5, 6** y anotar lista exacta de temas mostrados; comparar con matriz 10.1 |
| [ ] | Iniciar sesión como **4** (y **2** si aplica) y repetir |
| [ ] | Iniciar sesión como **1** solo en entorno de prueba; validar barra inferior + capacitación + §13 |
| [ ] | Desactivar un módulo (ej. reactivos) en una sede de prueba: confirmar que **desaparece** el tema correspondiente |
| [ ] | Campo `chapter.roles` en `capacitacionManual.*.js` alineado con la matriz (sin prometer pantallas admin a investigador) |

---

## 11 · RED multi-sede: checklist por rol y área

> En RED coexisten **varias sedes** bajo una dependencia. El manual global (`capacitacion__tema__red`) da el marco; **cada área** debe tener matices por rol en los capítulos que correspondan.

### 11.1 Áreas funcionales en RED (inventario para documentar)

| Área | Archivos / módulos típicos (referencia código) | Qué debe explicar el manual |
|------|-----------------------------------------------|-----------------------------|
| **A. Protocolos** | `user/protocols/network-*`, `protocols/transmit`, solicitudes internas | Transmisión entre sedes, estados, **Mis protocolos** vs **Protocolos admin** |
| **B. Formularios y envíos** | `forms/derivation/*`, centro de solicitudes | Derivación, aceptar/devolver, historial; **quién** en cada sede actúa |
| **C. Mensajes** | `comunicacion/mensajes/*` | Mensajes **personales** vs **institucionales** y alcance RED |
| **D. Noticias** | `comunicacion/noticias`, admin noticias | Noticias de sede vs comunicación transversal |
| **E. Facturación / costos** | `admin/facturacion/*`, `historialcontable` | Consolidación por sede, evitar doble imputación entre sedes |
| **F. Alojamientos / logística** | alojamientos, QR, trazabilidad | Si la red comparte políticas de caja o solo datos de lectura |

### 11.2 Matriz **área RED × rol** (contenido a revisar / ampliar)

| Área ↓ / Rol → | 1 Gecko | 2 Super | 4 Admin | 3 Inv | 5 Asist | 6 Lab |
|----------------|:---:|:---:|:---:|:---:|:---:|:---:|
| **A. Protocolos RED** | ◐ | ● | ● | ● | ◐ | ◐ |
| **B. Formularios / derivación** | ◐ | ● | ● | ● | ● | ◐ |
| **C. Mensajes (institucional)** | ◐ | ● | ◐ | ● | ● | ◐ |
| **D. Noticias** | ◐ | ● | ◐ | ● | ● | ● |
| **E. Facturación multi-sede** | ◐ | ● | ● | ○ | ○ | ○ |
| **F. Alojamientos / trazabilidad** | ◐ | ● | ● | ◐ | ◐ | ● |

- **●** = el capítulo del rol debe cubrir explícitamente el matiz RED (o enlace al tema `capacitacion__tema__red`).
- **◐** = solo si la institución contrata / habilita; validar con sede piloto.

### 11.3 Checklist de profundidad RED (por área)

**A. Protocolos**
- [ ] ⬜ Investigador: solicitudes de red, adjuntos, estados “pendiente en sede X”.
- [ ] ⬜ Admin: bandeja que recibe o envía trámites; coherencia con **Solicitud de protocolo** local.
- [ ] ⬜ Diferencia **protocolo operativo** vs **tramitación RED** en textos y capturas.

**B. Formularios / pedidos**
- [ ] ⬜ Flujo **origen → derivación → sede destino** en un diagrama (Mermaid o figura).
- [ ] ⬜ Lista de estados visibles en **Mis formularios** cuando hay derivación.
- [ ] ⬜ Popups de confirmación al derivar / aceptar / rechazar.

**C. Mensajes**
- [ ] ⬜ Cuándo usar mensaje 1:1 vs mensajería institucional en contexto RED.
- [ ] ⬜ “Responder a” y notificaciones por correo si aplica.

**D. Noticias**
- [ ] ⬜ Redactor (admin noticias): segmentación o convención por sede.
- [ ] ⬜ Lector: cómo saber si la noticia afecta solo a su sede.

**E. Facturación**
- [ ] ⬜ Informes por sede / departamento; riesgo de duplicar costos entre sedes.
- [ ] ⬜ Solo roles 2/4 (y 1 en soporte): no mezclar con narrativa de investigador.

**F. Alojamientos**
- [ ] ⬜ Si hay códigos o QR compartidos entre sedes: permisos de lectura.
- [ ] ⬜ Laboratorio (6): qué ve frente a pedidos de otra sede (si aplica).

### 11.4 Diagrama conceptual RED (referencia para documentación)

```mermaid
flowchart TB
  subgraph SedeA["🏢 Sede A"]
    PA["Protocolos / solicitudes"]
    FA["Formularios enviados"]
    MA["Mensajes / noticias"]
  end
  subgraph SedeB["🏢 Sede B"]
    PB["Bandeja admin / lab"]
    FB["Recepción derivación"]
  end
  FA -->|"derivación / red"| FB
  PA -->|"tramitación acordada"| PB
  MA -.->|"institucional / anuncios"| SedeB
```

---

## 12 · Seguimiento por release

> Usar esta sección como **cierre de sprint o versión** de contenido/código. Copiar la tabla a un comentario de issue o nota interna con fecha.

### 12.1 Criterios de “listo para publicar” (contenido capacitación)

| # | Criterio | ⬜ |
|---|----------|---|
| 1 | Todos los temas **listados** en §5.2–5.4 tienen `summary` + `roles` coherentes con §10 | [ ] |
| 2 | §10.3 ejecutado en al menos **un** usuario de cada familia: panel (3/5/6) y admin (4 o 2) | [ ] |
| 3 | Institución de prueba **sin** un módulo: temas ocultos verificados (§8.1 “Sin tema”) | [ ] |
| 4 | EN/PT: pasada rápida 🌐 en temas tocados en el release | [ ] |
| 5 | RED: si la sede usa red, §11.3 áreas A–F revisadas o explícitamente N/A documentado | [ ] |
| 6 | §9: QR / registro público / superadmin — decidido (documentado o fuera de alcance) | [ ] |

### 12.2 Bloqueadores frecuentes (check rápido)

- [ ] ⬜ Nueva pantalla en menú **sin** entrada en `CAPACITACION_PATH_ORDER` o sin capítulo en los tres idiomas.
- [ ] ⬜ `pathnameToMenuPath` no resuelve la URL → barra inferior rota o enlace incorrecto.
- [ ] ⬜ Selectores en `capacitacionTours.js` desalineados con el HTML → pasos saltados o tour vacío (revisar §13.2).
- [ ] ⬜ Texto del manual promete permisos **admin** a rol **investigador** (revisar `chapter.roles`).

### 12.3 Priorización sugerida (cuando falte tiempo)

1. Temas con **mayor tráfico** o tickets de soporte (pedidos, protocolos, formularios).  
2. **RED** solo en sedes que contratan multi-sede.  
3. Capturas y GIF (§7.3) después de estabilizar textos.

---

## 13 · Tutorial interactivo (spotlight) — checklist

> **Objetivo:** completar el recorrido guiado **pantalla a pantalla**, alineado al **mismo `menuPath`** que capacitación (`pathnameToMenuPath`). Cada fila de §13.2 es el “contrato” entre código (`capacitacionTours.js`), textos i18n y QA.

### 13.1 Convenciones (antes de marcar [x])

| Regla | Detalle |
|--------|---------|
| **Datos** | `front/dist/js/utils/capacitacionTours.js` → objeto `CAPACITACION_TOUR_STEPS[menuPath]` = array de `{ selector, titleKey, bodyKey }`. |
| **i18n** | Claves bajo `window.txt.capacitacion.*` en `es.js`, `en.js`, `pt.js` (`tour_*` por pantalla + genéricas `tour_prev`, `tour_next`, …). |
| **Selectores** | Deben existir en el DOM **después** de `DOMContentLoaded` / datos cargados; preferir `id` estables. Probar en tema claro y oscuro. |
| **Sin pasos** | Si la ruta no está en el objeto, el usuario ve diálogo informativo + opción de abrir el **documento de ayuda** en Capacitación. |
| **Ayuda en grilla** | Opcional: `data-gecko-cap-help="<menuPath>"` y `data-gecko-cap-modal="#idModal"` en el botón Ayuda (ver `admin/usuarios.html`). |
| **Barra inferior** | `CapacitacionHelpFab.js` llama al mismo motor; no duplicar lógica en páginas. |

### 13.2 Matriz por ruta (estado del tutorial interactivo)

Marcar **[x]** en **Pasos** cuando exista entrada en `CAPACITACION_TOUR_STEPS` y textos en **los tres** idiomas. Marcar **[x]** en **Ayuda+Excel** cuando el HTML tenga `data-gecko-cap-help` (y modal si aplica).

| Ruta `menuPath` | # Pasos | Pasos | i18n ES/EN/PT | Ayuda+Excel | QA manual ⬜ |
|-----------------|:-------:|:-----:|:-------------:|:-----------:|:-------------:|
| `panel/capacitacion` | 3 | [x] | [x] | N/A (biblioteca) | [ ] |
| `admin/usuarios` | 4 | [x] | [x] | [x] (`usuarios.html`) | [ ] |
| `admin/dashboard` | 4 | [x] | [x] | [x] solo ayuda (`admin/dashboard.html`) | [ ] |
| `panel/dashboard` | 4 | [x] | [x] | [x] solo ayuda (`panel/dashboard.html`) | [ ] |
| `usuario/dashboard` | 4 | [x] | [x] | [x] solo ayuda (`usuario/dashboard.html`, misma plantilla) | [ ] |
| `admin/protocolos` | 4 | [x] | [x] | [x] (`protocolos.html`) | [ ] |
| `admin/solicitud_protocolo` | 4 | [x] | [x] | [x] solo ayuda (`admin/solicitud_protocolo.html`) | [ ] |
| `admin/animales` | 4 | [x] | [x] | [x] (`animales.html`) | [ ] |
| `admin/reactivos` | 4 | [x] | [x] | [x] (`reactivos.html`) | [ ] |
| `admin/insumos` | 4 | [x] | [x] | [x] (`insumos.html`) | [ ] |
| `admin/reservas` | 4 | [x] | [x] | [x] (`admin/reservas.html`, informes/QR + ayuda) | [ ] |
| `admin/alojamientos` | 4 | [x] | [x] | [x] (`alojamientos.html`) | [ ] |
| `admin/estadisticas` | 4 | [x] | [x] | [x] (`admin/estadisticas.html`, Excel/PDF + ayuda) | [ ] |
| `admin/configuracion/config` | 3 | [x] | [x] | [x] solo ayuda (`admin/configuracion/config.html`) | [ ] |
| `panel/formularios` | 3 | [x] | [x] | [x] solo ayuda (`panel/formularios.html`; `usuario/formularios.html` → mismo `menuPath`) | [ ] |
| `panel/misformularios` | 4 | [x] | [x] | [x] (`panel/misformularios.html`) | [ ] |
| `usuario/misformularios` | 4 | [x] | [x] | [x] (`usuario/misformularios.html`, misma plantilla) | [ ] |
| `panel/misalojamientos` | 4 | [x] | [x] | [x] (`panel/misalojamientos.html`, Excel + ayuda) | [ ] |
| `usuario/misalojamientos` | 4 | [x] | [x] | [x] (`usuario/misalojamientos.html`, Excel + ayuda) | [ ] |
| `panel/misreservas` | 4 | [x] | [x] | [x] solo ayuda (`panel/misreservas.html`) | [ ] |
| `usuario/misreservas` | 4 | [x] | [x] | [x] solo ayuda (`usuario/misreservas.html`) | [ ] |
| `panel/misprotocolos` | 4 | [x] | [x] | [x] solo ayuda (`modal-ayuda-protocolos`; `usuario/misprotocolos.html` → mismo `menuPath`) | [ ] |
| `panel/mensajes` | 4 | [x] | [x] | [x] solo ayuda (`panel/mensajes.html`, `usuario/mensajes.html` → mismo `menuPath`) | [ ] |
| `panel/mensajes_institucion` | 4 | [x] | [x] | [x] solo ayuda (`panel/mensajes_institucion.html`, `usuario/mensajes_institucion.html` → mismo `menuPath`) | [ ] |
| `panel/noticias` | 4 | [x] | [x] | [x] solo ayuda (`panel/noticias.html`) | [ ] |
| `panel/perfil` | 4 | [x] | [x] | [x] solo ayuda (`panel/perfil.html`, `usuario/perfil.html` → mismo `menuPath`) | [ ] |
| `panel/soporte` | 4 | [x] | [x] | [x] solo ayuda (`panel/soporte.html`) | [ ] |
| `panel/ventas` | 4 | [x] | [x] | [x] solo ayuda (`panel/ventas.html`) | [ ] |
| `admin/precios` | 4 | [x] | [x] | [x] (`admin/precios.html`, Excel/PDF + ayuda) | [ ] |
| `admin/facturacion/index` | 4 | [x] | [x] | [x] solo ayuda (`admin/facturacion/index.html`) | [ ] |
| `admin/historialcontable` | 4 | [x] | [x] | [x] ayuda + botón Excel en franja de filtros (`historialcontable.html`) | [ ] |
| `admin/comunicacion/noticias` | 4 | [x] | [x] | [x] solo ayuda (`admin/comunicacion/noticias.html`) | [ ] |
| `capacitacion/tema/red` | 4 | [x] | [x] | N/A (misma `capacitacion.html`; deep link `#t=capacitacion__tema__red` vía `pathnameToMenuPath`) | [ ] |
| `__modals__` (tour genérico cabecera/cuerpo/pie) | 4 | [x] | [x] | Solo con `.modal.show`; botón barra + menú Ayuda + franja modal | [ ] |

### 13.5 · Tour solo con modal (Bootstrap) y backlog por modal

**Regla de producto:** el tour `__modals__` **no se ofrece** sin un `.modal.show` (Bootstrap). Entradas ocultas hasta entonces:

- Fila del menú **Ayuda** (?): `<li class="gecko-help-modals-tour-item d-none">` — visibilidad vía `syncModalsTourEntrypoints()` en `CapacitacionHelpFab.js` (eventos `shown.bs.modal` / `hidden.bs.modal`).
- Botón en la **barra inferior** (`.gecko-fab-tour-modals d-none` por defecto).
- Menú contextual **Ayuda junto a Excel**: la fila del tutorial de modal solo se inserta si hay modal abierto al abrir el menú (`CapacitacionPageHelpMenu.js`).
- **Doble seguridad:** `startCapacitacionInteractiveTour('__modals__')` aborta con mensaje i18n si no hay modal.

**Pasos actuales** (`TOUR_STEPS_MODALES` en `capacitacionTours.js`): diálogo → cabecera → cuerpo → pie. Si un modal **no tiene** `.modal-footer`, el último paso se omite (comportamiento del motor al no encontrar selector).

**UX tour (todos los recorridos):** las opciones «no mostrar tutorial automático» solo en el **último paso**; en pasos intermedios texto corto que indica que esas opciones vienen al final. Al cerrar el último paso, párrafo i18n `tour_end_where_hint` (barra, Excel, menú Ayuda, reactivar barra).

### 13.6 · Backlog: tour interactivo por ventana (campo a campo)

> **Objetivo incremental:** además del tour genérico `__modals__`, documentar **cada ventana relevante** con pasos que nombren controles editables y su función. No rellenar “de rebote”: marcar fila y cerrar cuando existan pasos + i18n en los tres idiomas.

**Convención propuesta (cuando se implemente un modal concreto):**

| Opción | Descripción |
|--------|-------------|
| **A** | Nuevo `menuPath` ficticio, p. ej. `__modal__admin_animal_detail__`, registrado en `CAPACITACION_TOUR_STEPS` solo si conviene separar del tour de página. |
| **B** | Ampliar el tour de la **ruta de página** (`admin/animales`, …) con pasos extra cuyos `selector` apunten a `#idModal .campo` (solo visibles con modal abierto; el motor salta si no existen). |

**Tabla de seguimiento (ampliar filas según inventario de modales):**

| ID / selector modal | `menuPath` pantalla | Estado | Pasos / notas |
|---------------------|---------------------|--------|----------------|
| Ej. `#modal-animal` | `admin/animales` | ⬜ | Inventariar inputs; claves `tour_*` ES/EN/PT |
| … | … | ⬜ | … |

**Referencia para redacción:** mismo tono que el manual en `capacitacionManual.*.js` y glosario §7.

### 13.3 QA mínimo del tour (cada vez que se añadan pasos)

> Comprobación **en navegador** (no automatizada en repo). Tras implementar pasos nuevos, validar una vez y anotar fecha/equipo si el proceso lo exige.

- [ ] ⬜ **Chrome/Edge:** micrófono no requerido; sin errores en consola al abrir/cerrar tour.
- [ ] ⬜ **Anterior / Siguiente:** el spotlight se reposiciona; el elemento resaltado es el esperado.
- [ ] ⬜ **Último paso:** “Terminar” cierra overlay y restaura scroll del `body`; en el **último** paso deben verse las opciones de desactivar tutorial automático y el texto de dónde volver a abrir ayuda (no en el primer paso).
- [ ] ⬜ **Clic en fondo oscuro:** cierra el tour (comportamiento actual del producto).
- [ ] ⬜ **EN/PT:** textos de pasos no quedan en clave cruda (`tour_*`).

### 13.4 Orden recomendado de implementación (siguiente backlog)

1. Pantallas con **barra inferior** ya visible para más usuarios (`panel/misformularios`, `admin/protocolos`, …).  
2. Módulos con **botón Ayuda + Excel** ya maquetado (reutilizar patrón `usuarios`).  
3. Pantallas solo panel investigador (menos selectores compartidos con admin).

---

<div align="center">

### 📌 Recordatorio para el equipo de redacción

**Un buen tema de capacitación responde en este orden:**  
**1)** ¿Para qué entro aquí? → **2)** ¿Qué veo (lista, botones)? → **3)** ¿Qué pasa si creo/edito/cierro (popups)? → **4)** ¿A qué otra pantalla me lleva esto?

*Última ampliación: barra inferior “documento de ayuda” + tutorial interactivo, §13 matriz tour, `capacitacionTours.js`, menú Ayuda+Excel, i18n y manuales alineados (ES/EN/PT).*

</div>
