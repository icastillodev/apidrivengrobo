# Checklist activo – Tareas en curso

Checklist principal para el trabajo actual.  
`[x]` = hecho · `[ ]` = pendiente

**Archivos históricos finalizados:** ver carpeta `docs/checklist-finalizados/`

---

## Lo nuevo (prioridad actual)

### Estadísticas
- [x] **Estadísticas se queda el cosito de carga y no carga la página.**  
  Añadido `gecko-loaded` al body; `loadStats()` se ejecuta automáticamente al iniciar (antes requería clic en "Actualizar").

### Alojamientos
- [x] **En alojamientos no actualiza cuando se toca.**  
  Añadido `gecko-loaded` al body; al cerrar el modal de historial se llama `loadAlojamientos()` para refrescar la tabla.

### Facturación – Formularios transmitidos/derivados
- [x] **Cuando tiene el otro formulario (transmitido): no se muestra lo que debe.**  
  BillingModel: JOIN con personae por IdUsrSolicitante (usuario que envió); añadidas institucionOrigen e institucionDestino. Front: columna "Instituciones (Origen → Destino)" en facturación por institución. i18n col_instituciones_derivado en ES, EN, PT.

### Transmisión / Derivación – Modelo de datos
- [x] **Transmisión no crea formularioe nuevo; crea derivado en la entidad nueva.**  
  FormDerivacionModel::derive() ya no crea copia; usa la misma idformA. formulario_derivacion guarda idformA = original, idformAOrigen = original. formularioe se marca con EstadoWorkflow/DerivadoActivo; owner sigue en origen hasta que destino acepte. UserFormsModel: usuarios destino ven el formulario (IdUsrDestinoResponsable o institución destino si no asignado). Compatible con derivaciones antiguas (copia): al devolver/rechazar/cancelar, solo se elimina si idformAOrigen ≠ idformA.

### Usuario – Pedido transmitido
- [x] **En el usuario el pedido ve todo como lo que mandó (formularioe) y el precio ese también.**  
  Con el modelo sin copia, origen y destino ven el mismo formulario (misma idformA). Los datos y precio vienen de formularioe, precioformulario, precioinsumosformulario; el snapshot en formulario_datos_originales preserva la vista original para la lista. getDetail permite ver a IdUsrDestinoResponsable o usuarios de institución destino.

### Derivación – Botón Guardar deshabilitado
- [x] **Cuando el formulario está en derivación, el botón Guardar queda deshabilitado.**  
  En animales, insumos y reactivos: botón deshabilitado cuando (origen que derivó) o (destino con derivación pendiente). Destino que ya aceptó puede guardar. i18n derivacion_guardar_bloqueado ES/EN/PT.

### Precio para formulario transmitido
- [x] **Crear nuevo precio para el derivado/transmitido; atributo "es pasado" si no existe.**  
  FormDerivacionModel::derive() crea facturacion_formulario_derivado con monto_total (factura proveedor→cliente). Al editar en destino: AnimalModel, ReactivoModel, InsumoModel NO sobrescriben precioformulario/precioinsumosformulario (original); solo actualizan facturacion_formulario_derivado.monto_total. Tramite cliente→proveedor.

### Derivación – Entregado, visibilidad y dos estados
- [x] **Al marcar Entregado en ambos lados: animales se descuentan solo una vez.**  
  El protocolo se descuenta al crear el formulario. Al cambiar estado (Entregado, etc.) no se vuelve a descontar. Solo Suspendido suma/resta del protocolo.
- [x] **Formulario derivado visible en lista de ambos (origen y destino) siempre.**  
  UserFormsModel getAllForms: destino ve el formulario aunque la derivación esté cerrada. getDetail: isUsuarioDestinoEnCualquierDerivacion permite ver el detalle.
- [x] **Formularios derivados: 2 estados (origen + destino); comunes: 1 estado.**  
  Migración `docs/migrations/add_estado_origen_destino_formulario_derivacion.sql`. AnimalModel, ReactivoModel, InsumoModel updateStatus actualizan estado_origen o estado_destino según instId. Listas y detalle incluyen ambos. Front: getStatusWithWorkflow muestra Origen/Destino para derivados. i18n estado_origen_label, estado_destino_label ES/EN/PT.

### Protocolo – Transmisión a otra institución de red
- [ ] **El administrador puede enviar el protocolo a otra institución de la red para que la confirme.**  
  Similar a la derivación de formularios: el admin de la institución origen envía el protocolo a otra institución de la misma red; la institución destino debe poder confirmar (aceptar) o rechazar. Flujo: enviar → pendiente en destino → confirmar/rechazar.

### Configuración de usuario (idioma, tema, tamaño de letra)
- [x] **Guardar y persistir configuraciones del usuario: idioma, dark/light, tamaño de letra.**  
  Implementado: (1) `loadLanguage` aplica theme y fontSize desde localStorage al inicio; (2) `UserPreferences.init` recarga idioma y traduce tras cargar config de BD; (3) `loadLanguage` guarda también `idioma` en localStorage; (4) `applyStoredThemeAndFont()` evita flash al cargar. Si no persiste, verificar que `personae` tenga columnas `tema_preferido`, `idioma_preferido`, `letra_preferida`, `menu_preferido`, `gecko_ok`.

---

## Check atrasados (pendientes del checklist anterior)

- [ ] **Correos sin botones de acción (revisión global).**  
  Revisar todos los correos HTML y eliminar botones clickeables ("CTA"), reemplazándolos por texto informativo cuando corresponda.

- [ ] **Reservas (módulo completo).**

- [ ] **Tickets de soporte.**

- [ ] **Biblioteca de ayuda por rol de usuario.**

- [ ] **Primeros pasos para usuario nuevo.**

- [ ] **Mejorar búsqueda con IA (respuestas y ayuda).**

- [ ] **Mejorar funcionalidad de voz (rellenar formularios y acciones en la app).**

- [ ] **FAQ: lugar para ver preguntas, rellenar BD y destacar las mejores en un FAQ público.**

- [ ] **Limitar el uso de IA en la app (sin preguntas cotidianas / fuera de contexto).**

- [ ] **Limitar la IA en usuarios (según rol / permisos).**

- [ ] **Entrenamiento de voz y mejoras de interacción por voz.**

---

*Cada check se puede ir marcando [x] cuando la tarea esté implementada y probada.*
