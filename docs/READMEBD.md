# CONTEXTO TÉCNICO BASE DE DATOS: PROYECTO BIOTERIO CENTRAL (API-DRIVEN)

**Introducción:**

La plataforma **GROBO** se define como un ecosistema **SaaS (Software as a Service) Multi-Tenant** de alta complejidad, diseñado para la gestión integral, centralizada y escalable de múltiples instituciones de investigación (Bioterios). El sistema garantiza la independencia operativa y el aislamiento de datos entre las distintas sedes, permitiendo una gobernanza unificada pero flexible.

El núcleo de la lógica de negocio orquesta el ciclo de vida completo de la investigación científica:

1. **Cumplimiento Normativo:** Gestión legal y ética mediante Protocolos Experimentales.
2. **Logística Transaccional:** Control de stock y aprovisionamiento mediante Pedidos de Animales e Insumos.
3. **Gestión Operativa:** Trazabilidad biológica y administración de espacios mediante el módulo de Alojamiento Experimental.

Financieramente, el sistema opera bajo un modelo estricto de **facturación prepago y cuentas corrientes internas**, asegurando la solvencia de las operaciones antes de su ejecución.

A nivel tecnológico, la plataforma implementa una arquitectura **API-Driven totalmente desacoplada**. El Backend actúa como la fuente de verdad, procesando la "lógica pura" y exponiendo recursos a través de endpoints seguros, siguiendo el patrón de diseño **MVC (Model-View-Controller)**. El Frontend consume estos datos dinámicamente, delegando la renderización y la experiencia de usuario a la capa cliente, garantizando así escalabilidad y mantenibilidad.

---
### 1. CATÁLOGO DE ENTIDADES Y ATRIBUTOS LITERALES

A continuación, la definición de cada tabla con sus campos exactos:

donde se define en el primer punto la entidad separa un :

luego siguiente la descripcion de esa entidad

y luego los atributos donde en ( ) estan los tipos de datos

---

## **Módulo de Usuarios y Acceso**

- **usuarioe:**
    - Tipo entidad: Maestra
    - El usuario del sistema mas sus credenciales, tambien, tiene la institucion del usuario, es importante que cada usuario se crea en una institucion.. se pueden repetir los usuarios pero solo en distinttas instituciones.. en las mismas instituciones no.. tambien tiene un token de confirmacion para el correo y factor code para administradores, el passowrd es en hasheado en password_secure, hay otro passowrd por que se migro a uno mas seguro…
        - `*[***IdUsrA** *(int ai),* **UsrA** *(varchar(60)),* **PassA** *(deprecated),* **password_secure***(varchar(255)),***confirmado***(tinyint defualt=0) ,***hash_migrated***(tinyint default=0),* **IdInstitucion** *(int foranea institucion:IdInstitucion),* **token_confirmacion** *(varchar(100) null),* **two_factor_code** *(varchar(6) null),* **two_factor_expires** *(datetime null)]*`

- **tipousuarioe:**
    - Tipo entidad: Maestra
    - Roles del sistema no configurable por institucion.. sino que son los roles asignados que luego sirven para distintas funciones de la base de datos
        - - `*[***IdTipousrA** *(int ai),* **NombretipoA***(varchar(100)),* **NombreCompleto** *(varchar(100))]*`

- **tienetipor:**
    - Relacion (usuarioe, tipousuarioe)
    - Relación que asigna roles a usuarios…
        - -`*[***IdUsrA** *(int foranea usuarioe:IdUusrA),* **IdTipousrA** *(int foranea tipousuarioe:IdTipousrA),* **Idtienetipor***(int ai)]*`

- **actividade:**
    - Tipo entidad: Subordinada (usuarioe)
    - Registro de logs de entrada…
        - - `[**IdActividadA** *(int ai)*, **ActivoA** *(int)*, **UltentradaA***(date null)*, **IdUsrA***(int foranea usuarioe:IdUsrA)* ]`

- **personae:**
    - Tipo entidad: Maestra
    - Se albergan los datos personales de los usuarios y configuraciones personales de la app y pasos para la recuperacion de usuario/contraseña…
        - - `*[***IdPersonaA** *(int ai),* **NombreA***(varchar(100) null),* **ApellidoA***(varchar(100) null),* **EmailA***(varchar(100) null),* **PaisA***(varchar(100) null),* **CiudadA***(varchar(100) null),* **TelefonoA***(varchar(100) null),* **CelularA***(varchar(100) null),* **IdentificacionPA** *(deprecated),* **IdUsrA** *(int foranea usuarioe:IdUsrA),* **LabA***(deprecated), SaldoDinero(deprecated),***recuperar***(int),* **tema_preferido***(varchar(100) null),* **idioma_preferido***(varchar(100) null),* **letra_preferida***(varchar(100) null),* **menu_preferido***(varchar(100) null),* **gecko_ok** *(int null)]*`

- **menudistr:**
    - Tipo entidad: Relacion (institucion, tipousuarioe)
    - Distribucion de menu para los tiposdeusuarios .. cada tipo de usuario en instituciones si tienen activo o no una parte del menu para cada institucion por separado siendo asi la app lo mas configurable posible para los roles de usuarios que existen , Activo=1 es que esta activo , las demas es que no se muestra para ese rol, y NombreMenu es numerico ya que los menu estan formados en el javascript denominados por numeros y se registran asi teniendo sus nombrespropios en el programa…
        - - `*[***IdMenu** *(int ai),* **IdInstitucion** *(int foranea institucion:IdInstitucion),* **IdTipoUsrA** *(int foranea tipousuarioe:IdTipousrA),* **NombreMenu***(int),* **Activo***(int)]*`

- **notificacioncorreo:**
    - Tipo entidad: Subordinada(formularioe , alojamiento (o cualquiera) , depende de la categoria) institucion
    - Para los fromularios generalmente , pero es como el registro de correos que se envia desde la app.. donde tiene un identificado y tiponotificacion.. en realidad podria ser cualquier tipo de notificacion de la app pero mas que nada es para usarse de alojamiento o formulario para avisos, es el registro, osea cualquier correo se puede enviar en la app.. pero este registro es importante cuando se termina un formulario o se avisa un alojamiento para tener la prueba…
        - - `*[***IdNotificacionesCorreo** *(int ai),* **TipoNotificacion** *(varchar(50),* **fecha** *(date),***ID***(int),***IdInstitucion***(int foranea institucion:IdInstitucion),* **estado***(varchar(50) null)]*`

- **dinero:**
    - Tipo entidad: Subordinada (usuarioe, institucion)
    - Entidad que alberga el dinero de cada persona por institucion, para saber que saldo tiene para luego ser gastado en pagar formularios o alojamientos
        - -`[**IdDinero***(int ai)*, **IdUsrA** *(int foranea usuarioe:IdUsrA)*, **IdInstitucion** *(int foranea institucion:IdInstitucion)*,**SaldoDinero***(int)*]`

- bitacora
    - Tipo entidad: Maestra
    - Entidad donde se hace la auditoria completa de cada insercion, modificacion y eliminacion de la app
        - - `*[***id_bitacora** *(int ai),* **id_usuario** *(int foranea usuarioe:IdUsrA),* **accion***(varchar(50),* **tabla_afectada** *(varchar(100)),* **detalle** *(text),* **fecha_hora***(datetime)]*`

- login_attempts
    - Tipo entidad: Maestra
    - Entidad donde mira la ip de la persona y ve cuantas veces intenta loguear para saber si te da un parate
        - - `[ip_address (primary key varchar(45)), attempts (int(11)), last_attempt (datetime) ]`

## CÓMO FUNCIONA EL SISTEMA DE ACCESO Y USUARIOS:

### 1. Análisis del Modelo

Este módulo no solo maneja "Login", maneja **Contexto**. El usuario no existe en el vacío; existe dentro de una Institución y con unas preferencias visuales específicas.

- **Identidad Fragmentada:** Al tener `IdInstitucion` en la tabla `usuarioe`, el sistema permite que "Juan Perez" sea un simple *Investigador* en la Institución A, pero sea *Administrador* en la Institución B, usando credenciales distintas o gestionadas por separado.
- **Seguridad en Capas:**
    1. **Capa 1 (Auth):** `usuarioe` verifica quién eres (Password ).
    2. Capa 1 (Auth admin): usuarioe para Admin , Super admin (Password y  2FA)
    3. **Capa 2 (Role):** `tienetipor` verifica tu rango (Admin, User, etc.).
    4. **Capa 3 (Scope):** `menudistr` verifica qué botones puedes ver *hoy* en *esta* Institucion.

### 2. Lógica Operativa y Jerarquía de Datos

**A. El Login y la Personalización (Front-End Experience)**
Cuando un usuario se loguea:

1. Se valida `usuarioe`. Se crea el registro en `actividade`.
2. Inmediatamente se carga `personae`. El Frontend lee `tema_preferido` y `letra_preferida` para "pintar" la aplicación como al usuario le gusta (Modo oscuro, letra grande, etc.).

**B. La Construcción del Menú (Dynamic Rendering)**
El sistema no muestra el menú "hardcodeado". Lo construye en tiempo real:

- Consulta: *"¿Qué rol tiene este usuario?"* (Tabla `tienetipor` -> Ej: Rol 3).
- Consulta: *"¿En qué institución está?"* (Tabla `usuarioe` -> Ej: Inst 50).
- Consulta Maestra: *"Traeme de `menudistr` todos los registros donde Inst=50 y Rol=3 y Activo=1"*.
- Resultado: El sistema devuelve los IDs de los componentes (ej: menú 10, 15, 20) y solo esos se renderizan. Esto permite vender módulos por separado (ej: Si la institución no pagó el módulo de Alojamiento, simplemente se desactiva en `menudistr` y el botón desaparece).

**C. La Economía Interna**
La tabla `dinero` actúa como una cuenta corriente interna. Antes de permitir acciones que generan costo (como iniciar un Alojamiento complejo), el sistema puede verificar `dinero.SaldoDinero` vinculado al usuario e institución.

### 3. Roles Predefinidos (Jerarquía)

El sistema basa su lógica en 6 niveles estáticos (`tipousuarios`):

- **Nivel administradores (1-2):** Superadmin/Admin (Configuran la institución y usuarios).
- **Nivel Operativo (4-5):** SecAdmin/Asistente (Gestionan el día a día).
- **Nivel Cliente (3):** Investigador (Consume servicios, llena formularios).
- **Nivel Técnico (6):** Laboratorio (Procesa muestras/datos).

---

## Formulario de creacion de acceso de plataforma GROBO

- **form_registro_config:**
    - Tipo entidad: Maestra
    - Entidad que se crea para persona donde esta seria como el inicio para que pueda comenzar a editar el formulario que luego lo voy a utilizar para su primera configuracion de GROBO…
        - - `[**id_form_config** *(int ai)*, **slug_url***(varchar(100))*, **nombre_inst_previa***(varchar(255) null)*, **encargado_nombre***(varchar(255) null)*, **activo** *(tinyint(1))*, **creado_el***(datetime)*]`

- **form_registro_respuestas:**
    - Tipo entidad: Subordinada (form_registro_config)
    - En esta entidad se crean todas las categorias posibles que serian necesarias para el formulario… para que puedan contestar todo… yo tengo un formato que se crea y tienen para contestar osea esta entidad es la que crea todo el formulario y tiene una dependencia por si esta categoria necesita una dependecia de ella misma como categoria y subcategorias…
        - - `*[* **id_respuesta** *(int ai),* **id_form_config***(int foranea form_registro_config:id_form_config),* **categoria** *(varchar(50),* **campo** *(varchar(100)),* **valor***(text null),* **valor_extra***(varchar(255) null) ,* **dependencia_id** *(int null) ]*`

# Este seria lo necesario para el formulario

### 📋 GUÍA MAESTRA DE CONFIGURACIÓN INSTITUCIONAL (Flujo de Alta)

Si vas a crear un formulario para "Dar de Alta una Nueva Institución", este es el orden y los datos que necesitas pedir:

### 1. IDENTIDAD Y SERVICIOS (La Base)

*Lo primero es definir quiénes son y qué hacen.*

- **Datos Generales:**
    - Nombre Completo (Razón Social).
    - Logo Institucional (PNG).
    - Moneda Principal (USD, UYU, etc.).
    - Idioma predeterminado.
    - Configuraciones Globales: ¿Admite protocolos externos (Otros CEUAS)? ¿Logo en reportes PDF?
- **Catálogo de Servicios Generales:**
    - Lista de servicios que la institución "vende" o "presta" (Ej: Hospedaje, Microcirugía, Capacitación).
    - *Dato:* Nombre y Unidad de medida.

### 2. ESTRUCTURA ORGANIZATIVA (Usuarios)

*Para que los usuarios puedan registrarse, deben pertenecer a algo.*

- **Organismos:**
    - Entidades macro (Ej: Facultad de Medicina, Instituto Pasteur).
- **Departamentos:**
    - Áreas dentro de los organismos (Ej: Depto. Fisiología, Unidad de Animales Transgénicos).
- **Roles y Permisos:**
    - Definir qué menús pueden ver los roles intermedios (SecAdmin, Asistente, Laboratorio). *Nota: Admin y User suelen venir fijos.*

### 3. CATÁLOGO BIOLÓGICO (El Núcleo)

*Fundamental: Sin esto no hay alojamientos ni pedidos.*

- **Especies (Maestro):**
    - Crear las especies macro (Ej: Ratón, Rata, Conejo, Pez Cebra).
- **Subespecies / Cepas (Detalle):**
    - Para cada especie, sus variantes (Ej: Ratón -> C57BL/6, BALB/c).
    - *Dato crítico:* Unidad de medida (Animal, Jaula, Tanque) y Cantidad Base.

### 4. INFRAESTRUCTURA DE ALOJAMIENTO (Depende de 3)

*Una vez definidas las especies, definimos dónde viven y qué datos se miden.*

- **Tipos de Alojamiento (Por Especie):**
    - ¿En qué se aloja esta especie? (Ej: Ratón -> Caja Ventilada, Caja Convencional / Conejo -> Corral).
- **Variables de Historia Clínica (Por Especie):**
    - ¿Qué datos se deben registrar obligatoriamente para esta especie? (Ej: Peso, Temperatura, Consumo de agua).
    - *Config:* Tipo de dato (Texto, Número, Fecha).

### 5. ESPACIOS Y RESERVAS (Logística)

*Lugares físicos que los investigadores pueden reservar.*

- **Salas / Laboratorios:**
    - Nombre y Ubicación física.
    - **Matriz Horaria:** Definir hora de apertura y cierre para cada día de la semana.
    - **Tipo de Bloque:** ¿Se reserva por hora (1h) o media hora (30m)?
- **Instrumentos / Equipamiento:**
    - Cosas que se usan en las salas (Ej: Anestesia, Microscopio).
    - *Dato:* Stock disponible.

### 6. PARAMETRIZACIÓN DE PROYECTOS (Protocolos)

*Reglas para la creación de protocolos éticos.*

- **Tipos de Protocolo:**
    - Categorías de proyectos (Ej: Investigación, Docencia, Cría).
- **Niveles de Severidad:**
    - Escala de dolor/estrés (Ej: Leve, Moderado, Severo, Terminal).

### 7. ECONOMÍA Y MATERIALES (Pedidos)

*Qué se puede pedir en los formularios.*

- **Insumos Generales:**
    - Cosas genéricas (Viruta, Alimento estándar, Agujas).
- **Insumos Experimentales (Reactivos):**
    - Material biológico o drogas específicas.
    - *Opcional:* Se pueden vincular a una Especie específica (Ej: "Alimento especial para Peces").
- **Tipos de Formulario (El "Producto" final):**
    - Cómo se llama la solicitud que hace el usuario (Ej: "Solicitud de Animal Vivo", "Compra de Insumos").
    - *Config:* Categoría (Animal/Insumo), Descuentos por defecto, Exento de pago (Sí/No).

## COMO FUNCIONA Módulo de Onboarding y Configuración Semilla (GROBO)

**form_registro_config:**

- **Tipo entidad:** **Maestra (Staging / Sesión)**
- **Definición:** Es el **Contenedor de la Sesión de Configuración**. Representa el entorno temporal donde se "diseña" la nueva institución antes de que exista realmente.
    - Genera un espacio aislado (`slug_url`) donde el futuro administrador define no solo sus datos básicos, sino la arquitectura operativa completa de su sistema (qué animales manejan, qué insumos usan, qué roles tendrán).
    - Actúa como el "Carrito de Compras" de funcionalidades y configuraciones.
- **Estructura:** [`id_form_config` *(int ai)*, `slug_url` *(varchar)*, `nombre_inst_previa` *(varchar)*, `encargado_nombre` *(varchar)*, `activo` *(tinyint)*, `creado_el` *(datetime)*]

**form_registro_respuestas:**

- **Tipo entidad:** **Subordinada (Multiproposito / Semilla)**
- **Definición:** Es el **Repositorio de Definiciones (Blueprint)**.
    - Aquí se almacenan, de forma abstracta, todos los registros que luego poblarán las tablas operativas de la institución.
    - Cada fila aquí se convertirá en un registro real en el futuro:
        - Si `categoria = 'Especie'` -> Se insertará en la tabla `especies`.
        - Si `categoria = 'Rol'` -> Se insertará en la tabla `roles_permisos`.
        - Si `categoria = 'Insumo'` -> Se insertará en la tabla `insumos`.
    - La columna `dependencia_id` es crítica aquí: permite definir jerarquías complejas antes de insertarlas (ej: Definir la subespecie "Wistar" (`id_respuesta X`) que depende de la especie "Rata" (`id_respuesta Y`)).
- **Estructura:** [`id_respuesta` *(int ai)*, `id_form_config` *(FK)*, `categoria` *(varchar - Mapea a la tabla destino)*, `campo` *(varchar - Nombre del dato)*, `valor` *(text - Valor del dato)*, `valor_extra` *(varchar - Atributos extra)*, `dependencia_id` *(int null - Relación padre-hijo)*]

---

### LÓGICA DE PROCESAMIENTO (El "Big Bang"):

### 1. Concepto: La "Semilla" del Sistema

Este módulo no guarda datos finales, guarda **instrucciones de despliegue**. El formulario le pregunta al usuario: *"¿Qué vas a necesitar?"*.

- El usuario responde: "Necesito Ratones (Especie), Jaulas Metabólicas (TipoAlojamiento) y Rol de Veterinario Jefe (Rol)".
- Todo esto se guarda "plano" en `form_registro_respuestas`.

### 2. Jerarquía de Datos y Transformación

El sistema funciona en dos tiempos: **Recolección** y **Despliegue**.

**A. Fase de Recolección (El Árbol de Configuración):**
Gracias a `dependencia_id`, el formulario construye árboles de datos lógicos dentro de la misma tabla:

- **Nivel 1 (Raíz):** Especie "Ratón".
- **Nivel 2 (Hijo):** Subespecie "C57BL/6" (apunta al ID de Ratón).
- **Nivel 3 (Nieto):** TipoAlojamiento "Caja Ventilada para Ratones" (apunta al ID de Ratón).

**B. Fase de Despliegue (El Script de Instalación):**
Cuando el usuario finaliza la configuración, el sistema ejecuta un proceso masivo (Batch) que lee `form_registro_respuestas` y distribuye los datos:

1. **Crea la Institución.**
2. **Itera sobre `categoria = 'Especie'`:** Inserta los registros en la tabla real `especies` vinculados a la nueva institución.
3. **Itera sobre `categoria = 'Rol'`:** Crea los roles y asigna los permisos (Menú) que el usuario seleccionó en la configuración.
4. **Itera sobre `categoria = 'Insumo'`:** Llena el inventario inicial de `insumos` e `insumosexperimentales`.

### 3. Ejemplo de Flujo de Datos

Si el usuario configura su bioterio:

- **En el Formulario (`form_registro_respuestas`):**
    - Fila 10: Cat: `Especie`, Val: `Rata`.
    - Fila 11: Cat: `Subespecie`, Val: `Wistar`, Dep: `10`.
    - Fila 12: Cat: `Menu`, Val: `Acceso Total`, Dep: `Rol Admin`.
- **En la Base de Datos Real (Post-Proceso):**
    - Tabla `Institucion`: ID 500 "Lab Nuevo".
    - Tabla `Especies`: ID 1 "Rata" (Institucion 500).
    - Tabla `Subespecies`: ID 1 "Wistar" (Especie 1).
    - Tabla `Roles`: ID 1 "Admin" (Institucion 500) -> Permisos Full.

---

## **Módulo de Estructura Institucional**

- **institucion**:
    - Tipo entidad: Maestra
    - Sedes que operan en el sistema es la institucion que maneja el sistema, donde se alberga practicamente todo el sistema, por que es la dependencia donde se trabaja , ademas crea una slug donde se entra a la web con el NombreInst , otrosceuas = 1 activado, Activo=1 institucion activa ademas tiene varias entidades relaciones subordinadas que son necesarias para completar los requerimientos, pero esta seria como la MADRE, tambien tiene una Dependencia.. donde tiene un conjunto de instituciones que se ven entre si, es como una red agrupacion puede no tener dependencia y si MadreGrupo =1 es la madre del grupo que puede ver la estadistica de toda la red grupo.. puede que no haya madre en el grupo tampoco… tambien tiene varias cosas de contrato y el titulo que van a tener los precios y se van a mostrar…
        - - `*[***IdInstitucion** *(int ai) ,* **NombreInst** *(varchar(100)),* **PrecioJornadaTrabajoExp** *(deprecated),* **DependenciaInstitucion** *(varchar(60) null),* **Web** *(varchar(60) null),* **Detalle** *(text null),* **InstDir** *(text null),* **InstContacto***(varchar(20) null),* **InstCorreo** *(varchar(20) null),* **NombreCompletoInst***(varchar(100)),* **Logo***(varchar(150) null),* **TipoApp** *(deprecated),* **Moneda** *(varchar(50)),* **Pais***(varchar(100)),* **Localidad***(varchar(100) null),* **IdOrganismo***(deprecated),* **otrosceuas** *(int),* **FechaDepuracion** *(date null),* **Activo** *(int),* **UltimoPago** *(date null),* **TipoFacturacion** *(int null),* **FechaContrato** *(date null),* **tituloprecios** *(varchar(255) null),* **MadreGrupo** *(int null),* **LogoEnPdf**  *(int null),* **tipohorasalas** *(int null)]*`

- **modulosapp:**
    - Tipo entidad: Maestra
    - Los modulos que existen en la aplicacion para ser utilizados para luego ser relacionados por la institucion, para que partes pueda utilizar del programa o habilitar para el investigador…
        - `*- [***IdModulosApp** *(int ai),***NombreModulo***(varchar(100)),***DetalleModulo***(text null) ]*`

- **modulosactivosinst:**
    - Tipo entidad: Subordinada (modulosapp)
    - Entidad donde junta los modulos que tiene activos la institucion y en cuales puede trabajar y le muestra y tambien si esta habilitado para investigadores o no.. osea que solo puede ver los admin para realizar alguna accion… Habilitado=1 (activo), ActivoInvestigador = 1 (activo), el 2 para inactivo para habilitado o investigador.
        - `*- [***ModulosActivosInstId** *(int ai),* **IdModulosApp***(int foranea modulosapp:IdModulosApp),* **Habilitado***(int),* **ActivoInvestigador***(int),* **IdInstitucion***(int foranea institucion:IdInstitucion)]*`

- **serviciosinst:**
    - Tipo entidad: Maestra
    - Los servicios que tiene y ofrece la Institucion para agregarlos en los costos de precios, puede tener varios servicios habilitado = 1 (activo) la medida es la medida y cantidad por ejemplo 10kg  [medida][cantidad] puede haberse quedad y queda deshabilitado si ellos quieren , son de cada institucion, configurable…
        - `*- [***IdServicioInst** *(int ai) ,* **NombreServicioInst** *(varchar(100)) ,* **MedidaServicioInst***(varchar(100) null) ,* **CantidadPorMedidaInst***(int null) ,* **Precio** *(int) ,* **Habilitado** *(int) ,* **IdInstitucion** *(int foranea institucion:IdInstitucion)]*`

- **organismoe:**
    - Tipo entidad: Subordinada (departamentoe , institucion)
    - Entidad que sirve como dato extra para las estadisticas y detalles del departamento, muchas veces departamentos se repiten o necesitan de un tipo de institucion organismo mas grande.. este es el organismo por ejemplo: urbe  es el departamento, y Facultad de medicina seria el organismo, esto lo crea el administrador y lo anexa a los departamentos…
        - - `*[***IdOrganismo***(int ai) ,* **NombreOrganismoSimple** *(varchar(100)),* **ContactoOrgnismo** *(varchar(100) null),* **NombreOrganismoCompleto** *(varchar(100)),* **CorreoOrganismo** *(varchar(100) null),* **DireccionOrganismo***(varchar(100) null),* **PaisOrganismo***(varchar(100) null),* **LogoOrganismo***(varchar(100) null),* **IdInstitucion** *(int foranea institucion:IdInstitucion, externoorganismo(int null)]*`

- **departamentoe:**
    - Tipo entidad: Maestra
    - Divisiones internas de cada institucion que luego seran anexadas a los protocolos para saber de donde es cada persona o pedido, tambien se puede anexar al principio…
        - - `[**iddeptoA** *(int ai)*, **NombreDeptoA** *(varchar(100))*, **DetalledeptoA***(text null)*, **IdInstitucion** *(int foranea institucion:IdInstitucion)*, **organismopertenece***(int null foranea organismos:IdOrganismo),externodepto(int null)* ]`

Deprecated entidad (a borrar):

- institucionservicios: que servicios tiene la institucion habilitados , 1 : habilitado para todos, 2: habilitado solo admin, 3: dehabilitado
    - IdInstServicios, IdInstitucion, Alojamiento, Animales, Reactivos, Reservas, Insumos

## CÓMO FUNCIONA LA ESTRUCTURA (MODELO HÍBRIDO):

### 1. Análisis del Modelo

La arquitectura de la base de datos permite dos modos de operación simultáneos sin cambiar el código. Todo depende de cómo llenes los datos:

- **Escenario A: La Institución Independiente (90% de los casos)**
    - *Configuración:* `DependenciaInstitucion = NULL`, `MadreGrupo = 0` (o NULL).
    - *Comportamiento:* El sistema la trata como una entidad única. Sus reportes son solo suyos. Sus usuarios son solo suyos. Es un "SaaS Tenant" clásico.
    - *Ejemplo:* "Laboratorio Privado Pérez". No le rinde cuentas a nadie.
- **Escenario B: El Consorcio o Red Universitaria**
    - *Configuración:* Varias instituciones comparten el mismo string en `DependenciaInstitucion` (ej: "UDELAR_RED").
    - *Comportamiento:* Siguen siendo independientes operativamente (cada una tiene sus usuarios y presupuesto), pero el sistema ahora sabe que son "hermanas".
    - *La Madre:* Aquella que tenga `MadreGrupo = 1` dentro de ese grupo "UDELAR_RED", tendrá un dashboard especial habilitado para ver estadísticas consolidadas de todas sus hermanas.

### 2. Jerarquía Interna (Organismo / Departamento)

Independientemente de si la institución está en un grupo o sola, su estructura interna sigue siendo igual de robusta:

- **Organismo (Opcional):** Sirve para Facultades o Sedes grandes.
- **Departamento (Obligatorio/Núcleo):** Es la unidad mínima funcional.

---

## Especies e insumos

- **especiee:**
    - Tipo entidad: Maestra
    - Especies generales de instituciones , con rango de habilitado o no, es la categoria principal de animales si Habilitado esta en 1 o cualquier numero que no sea 2 esta habilitado el unico numero dehabilitado es el 2…
        - - `[**idespA** *(int ai)*, **EspeNombreA** *(varchar(100))*, **caracteristicasA** *(text null)*, **Panimal** *(deprecated)*, **PalojamientoChica***(deprecated)*, **PalojamientoGrande***(deprecated)*, **IdInstitucion** *(int foranea institucion:IdInstitucion*), Habilitado(int)]`

- cepa
    - Tipo entidad : Subordinada (especiee)
    - UNa categoria de cepa para especiee, ademas de la categoria es como el tipo de especie del animal a a elegir… si no tiene cepa la especie osea no se le agrego no pasa nada la app te deja continuar con subespecie (categoria de especie) a hacer el pedido generalmente de animales, pero si tiene cepa para seleccionar no te deja continuar el formulario si no elegiste la cepa, tambien la cepa puede estar habilitada o no.. si tiene cepas esa especie y no tiene ninguna habilitada , no hay para hacer pedidos en esa especie. , y depende de la especie
        - []

- **subespecie**:
    - Tipo entidad: Subordinada (especiee)
    - Son las subespecies de las especies… son las que le dan valora a los formularios practicamente , por que tienen caracteristicas diferentes de las especies dependen plenamente de la especie que es por institucion Psubanimal, es el precio de la subespecie, importante por cantidad tipo… como siempre el tipo es la medida por ejemplo 10kg , [SubEspCantidad] [SubEspTipo] , si Exsite esta en =2 , no hay existencia, todo lo demas existe la subespecie…
        - - `*[***idsubespA** *(int ai),* **idespA** *(int foranea especiee:idespA),* **SubEspeNombreA** *(varchar(120) null),* **Psubanimal** *(int null),* **PsubalojamientoChica** *(deprecated),* **PsubalojamientoGrande** *(deprecated),* **SubEspCantidad***(int),* **SubEspTipo***(varchar(50)),* **SubEspOrden***(deprecated),* **Existe***(int)]*`

- **insumo :**
    - Tipo entidad: Maestra
    - El listado de insumos que existen para la institucion, donde se le puede dar de baja o de alta con existencia =1 existe, =2 no hay stock y no se muestra, el TipoInsumo seria la medida del insumo y la CantidadInsumo seria como la cantidad por tipo por ejemplo 5kg = [CantidadInsumo] [TipoInsumo] , es mas que nada para que cada insumo tenga sus propios valores y precio por valor, esto es para hacer pedido de insumos…
        - - `*[***idInsumo** *(int ai),* **NombreInsumo** *(varchar(100)) ,* **CantidadInsumo** *(int null),* **TipoInsumo** *(varchar(30) null),* **PrecioInsumo** *(int),* **OrdenInsumos** *(deprecated),* **CategoriaInsumo** *(int null),* **IdInstitucion** *(int foranea institucion:IdInstitucion),* **Existencia***(int null)]*`

- **insumoexperimental**:
    - Tipo entidad: Maestra
    - Listado de materiales y reactivos para experimentacion donde esto se utiliza en el formulario animales, son para hacer pedido de reactivos que se trabaja con animales  que existen para la institucion, donde se le puede dar de baja o de alta con habilitado =1 habilitado, =2 no hay stock y no se muestra, el TipoInsumo seria la medida del insumo y la CantidadInsumo seria como la cantidad por tipo por ejemplo 5kg = [CantidadInsumo] [TipoInsumo] , es mas que nada para que cada insumo tenga sus propios valores y precio por valor, hay algunos insumos de experimentacion que tienen animales anexados hay otros que no...
        - `*- [***IdInsumoexp** *(int ai),* **NombreInsumo** *(varchar(100),* **PrecioInsumo** *(int null),* **CantidadInsumo** *(int null),* **TipoInsumo** *(varchar(50) null),* **IdespA** *(int foranea especiee:idespA),* **IdInstitucion***(int foranea institucion:IdInstitucion),* **habilitado** *(int)]*`

## CÓMO FUNCIONA EL CATÁLOGO DE RECURSOS:

### 1. Análisis del Modelo

Este módulo separa claramente lo "Vivo" (`subespecie`) de lo "Inerte" (`insumo`), pero utiliza una lógica de precios y presentación idéntica para ambos, lo que simplifica la facturación.

- **La Lógica de la Unidad (El "Combo"):**
El sistema no asume la unidad "1". Siempre pregunta: *¿Qué es esto?*
    - Campos: `[Cantidad]` + `[Tipo/Medida]`.
    - *Ejemplo Subespecie:* Cantidad: 1, Tipo: "Animal" (Precio por unidad).
    - *Ejemplo Insumo:* Cantidad: 25, Tipo: "Kg" (Precio por bolsa de 25kg).
    - Esto es fundamental para que el investigador sepa si está pidiendo "10 kilos" o "10 bolsas".
- **El Estado "Negativo" (Lógica del 2):**
A diferencia de sistemas booleanos (1/0), aquí se usa una lógica específica donde el **2** es el "Kill Switch". Cualquier otro valor podría interpretarse como estados intermedios o activos, pero el 2 es la desaparición del catálogo público.

### 2. Jerarquía y Relación con el Formulario

El sistema utiliza estas tablas para poblar los `SELECT` desplegables en los formularios de solicitud.

**A. El Árbol Biológico:**
No pides "Una Especie". Pides una "Subespecie".

1. **Selección:** El usuario elige "Ratón" (`especiee`).
2. **Filtrado:** El sistema carga solo las `subespecie` hijas de "Ratón" que tengan `Existe != 2`.
3. **Resultado:** El usuario ve "C57BL/6", "Nude", etc.

**B. El Insumo Contextual (`insumoexperimental`):**
Esta es la tabla más inteligente del grupo.

- Si estoy llenando una solicitud para **Conejos**, el sistema busca en `insumoexperimental` aquellos ítems donde `IdespA` sea igual al ID de Conejo (o sea NULL para insumos genéricos de laboratorio).
- Esto evita errores médicos/experimentales al impedir pedir reactivos incompatibles con la especie trabajada.

---

## **Protocolos**

- **protocoloexpe**:
    - Taipo entidad: Maestra
    - Documento legal que autoriza el uso de animales, es parte del todo… con este protocolo es el que permite basicamente que los usuarios pidan formularios de animales, reactivos y puedan tener alojamientos, ademas aca el IdUsrA es el que paga el que tiene el dinero para pagar los formularios… por que la app no paga por formulario (osea si) pero del protocolo el dueño del protocolo paga las cuentas , por eso es tan importante el IdUsrA seria como el encargado del protocolo, el responsable… y luego esta el investigador a cargo del proyecto.. que es solo un nombre puede ser la misma persona como no.. pero esa no paga las cuentas , los protocolos se pueden compartir con confirmaciones de la app , tambien tiene una cantidad asignada de animales que no puede pasarse de esa cantidad ni hacer pedidos luego de que termine el periodo del protocolo, si variasInst =1 es que es propia y no esta en la red , si variasinst = 2 es que esta en la red , entonces envez de fijarse la institucion en esta entidad pasa a mirar protinstr , y ahi estan todos las instituciones que pertenecen al protocolo , si protocoloexpe = 1 es de otros ceuas y en tipoprotocolo es el id de tipoprotocolo y departamento tambien es el iddeptoA, tambien en severidad pasa lo mismo es la id de tiposeveridad , es una entidad vieja y quedaron los nombres viejos que fui agregando entidades y antes no tenia las id esta entidad, pero claro variasInst… es solo para la notificacion hay que trabajar con la notificacion para menu y dentro de la pagina de protocolos.. ya que es el aviso que tiene protocolos a confirmar …
        - - `*[idprotA (int ai), tituloA(varchar(100) null), nprotA(varchar(50)), InvestigadorACargA(varchar(50) null), CantidadAniA (int null), FechaIniProtA(date null), FechaFinProtA (date null), especie (deprecated), protocoloexpe (int null), departamento (int foranea departamentoe:iddeptoA, tipoprotocolo(int foranea tipoprotocoloe:idtipoprotocoloe), encargaprot (varchar(50) null), severidad (int foranea tiposeveridad:IdSeveridadTipo), IdUsrA (int foranea usuarioe:IdUsrA), IdInstitucion (int foranea institucion:IdInstitucion), variasInst(int null)]*`
    
- **protinstr:**
    - Tipo entidad: Relacion (protocoloexpe, institucion)
    - Entidad que te permite tener varias instituciones en un protocolo…
        - - `*[***IdProtinstr** *(int ai),* **idprotA***(int foranea protocoloexpe:idprotA),* **IdInstitucion***(int foranea IdInstitucion)]*`

- **tipoprotocolo:**
    - Tipo entidad: Maestra
    - Entidad donde podes crear el tipo de protocolo, categorias que va a ser el protocolo que utiliza la foranea de protocoloexpe tipoprotocolo , se elige una id de esta entidad, tambien esta es una configuracion para institucion
        - - `*[***idtipoprotocolo** *(int ai),* **NombreTipoprotocolo** *(varchar(100)),* **IdInstitucion***(int foranea institucion:IdInstitucion)]*`

- **protesper :**
    - Tipo entidad: Relacion (especiee, protocoloexpe)
    - Relaciones del protocolo con especies , es la cantidad de especies en un protocolo , osea la cantidad de tipo especies osea… el protocolo puede tener de especies, rata, raton, rana , puede tener mas de 1, y obviamente las especies pueden tener varios protocolos anexados...
        - - `*[***idespA** *(int foranea especiee:idespA),* **idprotA***(int foranea protocoloexpe:idprotA),* **idprotesper***(int ai) ]*`

- **protdeptor:**
    - Tipo entidad: Relacion (especiee, protocoloexpe)
    - Es la relacion de los departamentos y protocolos que pueden tener varios de los 2, un protocolo puede tener varios departamentos y un departamento puede tener varios protocolos (el protocolo tiene varios departamentos si y solo si pertenece a una red , esto se hace en la aplicacion igual. osea las 2 instituciones tienen que pertenecer en la red y hacer una verificacion)…
        - - `*[***iddeptoA** *(int foranea departamentoe:iddeptoA),* **idprotA** *(int foranea protocoloexpe:idprotA),* **IdProtDeptor***(int ai) ]*`
    
- **tiposeveridad :**
    - Tipo entidad: Madre
    - Entidad donde se crea la categoria de severidad para protocoloexpe, obviamente esta es una configuracion para instituciones , donde aparece dropdown , para elegir para protocoloexpe, importante , pero son nombres que se crean configuracion para institucion
        - - `*[***IdSeveridadTipo** *(int ai),* **NombreSeveridad** *(varchar(50)),* **detalle** *(text null),* **IdInstitucion** *(int foranea institucion:IdInstitucion)]*`

- **solicitudprotocolo:**
    - Tipo entidad: Subordinada( protocoloexpe)
    - Solicitud que puede hacer un usuario a la institucion para que el admin lo apruebe y quede ok en el total de protocolos y pueda comenzar a consumirlo todavia lo de adjunto no esta definido.. no quiero que suba imagenes ni nada a la app que consume espacio, probablemente eso lo tengan que hacer aparte por correo si Aprobado: 1: aprobado, 2: desaprobado, 3: sin estado , 4 : desaprobado a modificar y en el tipopedido deciframos como es que le piden a la institucion que serian por ahora , tambien tiene la idinstitucion cuando es red para hacer la solicitud:
    - 1: Pedido institucional (normal)
    - 2: Pedido de actualizacion de red (por la red grupos)…
- - `*[***IdSolicitudProtocolo** *(int ai),* **idprotA***(int foranea protocoloexpe:idprotA),* **DetalleUsr***(text null),* **DetalleAdm***(text null) ,* **Aprobado***(int) ,* **TipoPedido** *(int null),* **IdInstitucion** *(int foranea institucion:IdInstitucion null),* **FechaAprobado** *(date null)]*`

- **solicitudadjuntosprotocolos**
    - Tipo entidad : Subordinada (solicitudprotocolo)
    - Aca donde se guardan los adjuntos en el bucket de cloud storage b2 para tener archivos que enviar en protocolos. donde tipoadjunto es: 1:protocolo 2:aval 3: otro.  la idea es que solo se pueda enviar 3 por solicitud de protocolo. nombre_original , es el nombre que ellos tienen en el documento, file_key es el linkeo con el bucket
        - `[**Id_adjuntos_protocolos**(id ai), **nombre_original**(varchar(100)), **file_key**(text),**IdSolicitudProtocolo**(int foranea solicitudprotocolo:IdSolicitudProtocolo),**tipoadjunto**(int)]`

CREATE TABLE IF NOT EXISTS protocoloexpered (
IdProtocoloExpRed INT AUTO_INCREMENT PRIMARY KEY,
idprotA INT NOT NULL,
IdInstitucion INT NOT NULL,
IdUsrA INT NULL,
iddeptoA INT NULL,
idtipoprotocolo INT NULL,
IdSeveridadTipo INT NULL,
FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
FechaActualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT fk_protored_protocolo FOREIGN KEY (idprotA) REFERENCES protocoloexpe(idprotA) ON DELETE CASCADE,
CONSTRAINT fk_protored_inst FOREIGN KEY (IdInstitucion) REFERENCES institucion(IdInstitucion) ON DELETE CASCADE,
CONSTRAINT fk_protored_usr FOREIGN KEY (IdUsrA) REFERENCES usuarioe(IdUsrA) ON DELETE SET NULL,
CONSTRAINT fk_protored_depto FOREIGN KEY (iddeptoA) REFERENCES departamentoe(iddeptoA) ON DELETE SET NULL,
CONSTRAINT fk_protored_tipo FOREIGN KEY (idtipoprotocolo) REFERENCES tipoprotocolo(idtipoprotocolo) ON DELETE SET NULL,
CONSTRAINT fk_protored_sev FOREIGN KEY (IdSeveridadTipo) REFERENCES tiposeveridad(IdSeveridadTipo) ON DELETE SET NULL,
UNIQUE KEY uq_protored_protocol_inst (idprotA, IdInstitucion),
INDEX idx_protored_inst (IdInstitucion),
INDEX idx_protored_protocol (idprotA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS protocoloexpered_especies (
IdProtocoloExpRedEspecie INT AUTO_INCREMENT PRIMARY KEY,
IdProtocoloExpRed INT NOT NULL,
idespA INT NOT NULL,
CONSTRAINT fk_protoredesp_protored FOREIGN KEY (IdProtocoloExpRed) REFERENCES protocoloexpered(IdProtocoloExpRed) ON DELETE CASCADE,
CONSTRAINT fk_protoredesp_especie FOREIGN KEY (idespA) REFERENCES especiee(idespA) ON DELETE CASCADE,
UNIQUE KEY uq_protoredesp_pair (IdProtocoloExpRed, idespA),
INDEX idx_protoredesp_protored (IdProtocoloExpRed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

```sql
-- Adjuntos de protocolos manuales (sin solicitud local).
-- Uso: gestión admin de protocoloexpe para protocolos creados manualmente.

CREATE TABLE IF NOT EXISTS protocoloexpeadjuntos (
    IdProtocoloAdjunto INT AUTO_INCREMENT PRIMARY KEY,
    idprotA INT NOT NULL,
    tipoadjunto TINYINT NOT NULL COMMENT '1=adjunto1, 2=adjunto2, 3=adjunto3',
    nombre_original VARCHAR(255) NOT NULL,
    file_key VARCHAR(1024) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    size_bytes INT NOT NULL DEFAULT 0,
    FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FechaActualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_protadj_protocolo FOREIGN KEY (idprotA)
        REFERENCES protocoloexpe(idprotA)
        ON DELETE CASCADE,
    CONSTRAINT chk_protadj_tipo CHECK (tipoadjunto IN (1,2,3)),
    UNIQUE KEY uq_protadj_slot (idprotA, tipoadjunto),
    INDEX idx_protadj_protocolo (idprotA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

```

## CÓMO FUNCIONAN LOS PROTOCOLOS (Lógica de Negocio):

### 1. El Doble Rol del Usuario (Científico vs. Pagador)

El sistema hace una distinción crítica en la tabla `protocoloexpe`:

- **Campo `InvestigadorACargA`:** Es un campo de texto libre. Es quien firma el papel (el Catedrático, el Jefe de Grupo). Puede no usar el software nunca.
- **Campo `IdUsrA`:** Es el usuario logueado en GROBO. **Es el Responsable Financiero**.
    - *Regla de Oro:* Todo gasto generado (alojamiento diario, pedido de insumos) se debita de la cuenta/saldo de este `IdUsrA`. Si el investigador cambia, se debe migrar el protocolo a otro usuario pagador.

### 2. La Lógica de "Excepción" (Otros CEUAS)

A veces llegan investigadores con protocolos aprobados en *otra* institución que no usa GROBO. El sistema debe permitir cargarlos sin romper la base de datos.

- **El Flag:** Columna `protocoloexpe = 1`.
- **El Comportamiento:**
    - El sistema ignora las claves foráneas de `departamento` y `tipoprotocolo`.
    - En el Frontend, en lugar de mostrar "Dpto de Fisiología" (búsqueda en BD), muestra el texto tal cual se escribió ("Dpto Externo X").
    - Se marca visualmente con una alerta (Danger/Warning) para indicar que es un registro externo con validación manual.

### 3. El Control de Cupos y Fechas (El Candado)

El protocolo actúa como un "semáforo" para el resto de la App:

1. **Validación de Fecha:** Si `HOY > FechaFinProtA`, el botón "Nuevo Pedido" desaparece.
2. **Validación de Saldo Biológico:** Cada vez que se piden animales, se resta de `CantidadAniA`. Si llega a 0, no se pueden pedir más animales (aunque sí insumos, generalmente).

### 4. Flujo de Aprobación

El protocolo no nace activo. Nace a través de `solicitudprotocolo`.

1. Usuario crea borrador (`Estado 3`).
2. Admin revisa.
3. Si falta algo -> Admin pone `Estado 4` (A modificar). Usuario edita.
4. Si todo OK -> Admin pone `Estado 1`.
    - **Efecto Disparador:** Al pasar a `Estado 1`, el protocolo se vuelve visible en los selectores de "Nuevo Alojamiento" y "Nuevo Pedido". Antes de eso, no existe operativamente.

---

## **Módulo de Pedidos - Formularios (Animales, Reactivos, Insumos)**

- **formularioe**:
    - Tipo entidad: Maestro
    - El pedido formal del investigador. que puede tener tipo Animales , Reactivos o Insumos… donde se le pasa la id del tipo que tiene en tipoA, tiene la subespecie de pedido en idsubespA, y el departamento en depto , esas son ids… que luego en la bd se maracara.. que se relacionan a las propias… este seria el formulario principal que hacen los investigadores , donde se detallan y se crea practicamente todo menos los alojamientos. Tambien tiene varias relaciones, subordinadas (que depende del tipo es que las utiliza o no) , tambien reactivo para cuando es del tipo reactivo experimental.. el reactivo es la foranea de insumosexperimentales.. tiene todos los tipos de formularios practicamente…
        - - `[**idformA** *(int ai)*, **tipoA** *(int foranea tipofurmularios:IdTipoFormulario)*, **edadA** *(varchar(50) null)*, **pesoA***(varchar(50) null)*, **fecRetiroA** *(date)*, **aclaraA***(text null)*, **fechainicioA** *(date)*, **IdUsrA** *(int foranea usuarioe:IdUsrA)*, **estado** *(varchar(50))*, **raza***(varchar(50) null)*, **reactivo** *(int foranea insumoexperimental:IdInsumoesp)*, **visto** *(int)*, **quienvisto** *(varchar(70) null)*, **aclaracionadm** *(text null)*, **viruta** *(deprecated)*, **alimento** *(deprecated)*, **idsubespA** *(int foranea subespecie:idsubespA)*, **nocuenta** *(deprecated)*, **depto** *(int foranea departamentoe:iddeptoA)*, **otroinsumo** *(deprecated)*, **IdInstitucion** *(int foranea institucion:IdInstitucion)*]`

- **tipoformularios:**
    - Tipo entidad: Madre
    - Entidad donde se crea la categoria de tipos de pedidos que el usuario puede hacer de formularios que cuenta con las categorias: Animal vivo, Otros reactivos biologicos , Insumos , esas son las 3 categorias que pueden aparecer en categoriaformulario.. y estando en cualquiera de esa categoria se puede crear un tipo de formulario para pedir, con su nombre, y que tiene descuentos o exento, todo esto es por Institucion.. si exento es 1 , es que esta exento de pagar, 2 o cualquier otro numero no esta exento… el color del badge es el color
        - - `*[***IdTipoFormulario** *(int ai),* **nombreTipo***(varchar(50)),* **exento** *(int),***descuento** *(int),* **IdInstitucion***(int foranea institucion:IdInstitucion),* **categoriaformulario***(varchar(50)), color(varchar(100) null)]*`

- **sexoe**:
    - Tipo entidad: Subordinada (formularioe)
    - Es la entidad donde se le pone la cantidad de animales al formulario.. cuando hace reactivos o animales… los que cuentan para descontar de los protocolos son: macho, hembra y indistinto… que el total de esos 3… se suma para que quede el total en totalA, que es el total que se descuenta en el protocolo.. cuando se hace de animales vivos SIEMPRE se descuetna.. por que van a ser de esos 3 tipos animales… pero cuando es reactivo.. la cantidad de reactivo que pone en el formulario va en organo , pero no se suma en totalA, por que generalmente no consume animales cuando haces reactivo para el protocolo.. aveces si.. pero se suman aparte en el totalA, entonces para reactivos se cuenta en organo para los insumosexperimentales la cantidad para el formulario.. y casos especiales tiene un totalA, pero se pone a mano…
        - - `*[***idsexoA** *(int ai),* **idformA** *(int foranea formularioe:idformA),* **machoA***(int null),* **hembraA***(int null),* **indistintoA***(int null),* **totalA***(int),* **organo***(int null)]*`

- **formespe:**
    - Tipo entidad: Relacion [formularioe, especiee]
    - La categoria de animal que tiene el formulario, siempre tiene categoria cuando es animal vivo, reactivo puede tener o no animal de categoria, cuando es insumo no es necesario que exista este vinculo…
        - - `[ **idformA** *(int foranea formularioe:IdFromA)*, **idespA** *(int foranea especiee:idespA)*, **idformespe** *(int ai)* ]`

- **protformr:**
    - Tipo entidad: Relacion(formularioe, protocoloexpe)
    - Relaciones entre formularioe y protocoloexpe… yo siento que esta relacion no deberia existir , pero como el programa esta asi hace tiempo, y ya tiene muchisimos datos no se puede cambiar… por que en realidad el formulario solo puede tener 1 protocolo , no mas. no puede tener varios protocolos… entonces el protocolo va a tener muchos formularios , pero el formulario solo 1 protocolo, tendria que ser totalidad y idprotA embebido en formularioe… pero queda asi.. va a tener uno , pero esta bien, es la unica relacion que no coincido, pero seguira asi.
        - - `****[idprotA** *(int foranea protocoloexpe:idprotA) ,***idformA** *(int foranea formularioe:idformA),* **idprotform** *(int ai)]*`

```sql
-- ============================================================
-- DERIVACION DE FORMULARIOS EN RED (ANIMALES / REACTIVOS / INSUMOS)
-- ============================================================
-- Objetivo:
-- 1) Permitir derivar formularios entre instituciones de la misma red.
-- 2) Registrar propietario actual (usuario + institucion) del formulario.
-- 3) Mantener historial completo de estados y movimientos.
-- 4) Preparar facturacion por institucion derivada.
--
-- Nota:
-- - Se mantiene formularioe como entidad principal del formulario ("el mismo formulario").
-- - El protocolo asociado no cambia; la derivacion mueve la responsabilidad operativa/financiera.
-- - Este script no borra ni altera datos existentes.
-- ============================================================

START TRANSACTION;

-- ------------------------------------------------------------
-- 1) BITACORA DE DERIVACIONES (cada envio/devolucion/rechazo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formulario_derivacion (
    IdFormularioDerivacion INT AUTO_INCREMENT PRIMARY KEY,
    idformA INT NOT NULL,
    IdFormularioDerivacionPadre INT NULL,

    IdInstitucionOrigen INT NOT NULL,
    IdInstitucionDestino INT NOT NULL,

    IdUsrOrigen INT NOT NULL COMMENT 'Usuario que deriva',
    IdUsrDestinoResponsable INT NULL COMMENT 'Responsable asignado en destino (opcional)',

    estado_derivacion TINYINT NOT NULL DEFAULT 1 COMMENT '1=PENDIENTE,2=ACEPTADA,3=DEVUELTA,4=RECHAZADA,5=CANCELADA',
    mensaje_origen VARCHAR(1000) NULL,
    mensaje_destino VARCHAR(1000) NULL,
    motivo_rechazo VARCHAR(1000) NULL,

    FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FechaRespondido DATETIME NULL,
    FechaCerrado DATETIME NULL,
    Activo TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=derivacion vigente para ese nodo',

    CONSTRAINT fk_fder_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
    CONSTRAINT fk_fder_parent FOREIGN KEY (IdFormularioDerivacionPadre) REFERENCES formulario_derivacion(IdFormularioDerivacion) ON DELETE SET NULL,
    CONSTRAINT fk_fder_inst_origen FOREIGN KEY (IdInstitucionOrigen) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
    CONSTRAINT fk_fder_inst_destino FOREIGN KEY (IdInstitucionDestino) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
    CONSTRAINT fk_fder_usr_origen FOREIGN KEY (IdUsrOrigen) REFERENCES usuarioe(IdUsrA) ON DELETE RESTRICT,
    CONSTRAINT fk_fder_usr_destino FOREIGN KEY (IdUsrDestinoResponsable) REFERENCES usuarioe(IdUsrA) ON DELETE SET NULL,

    INDEX idx_fder_form (idformA),
    INDEX idx_fder_origen (IdInstitucionOrigen),
    INDEX idx_fder_destino (IdInstitucionDestino),
    INDEX idx_fder_estado (estado_derivacion),
    INDEX idx_fder_activo (Activo),
    INDEX idx_fder_form_activo (idformA, Activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2) PROPIEDAD/POSESION ACTUAL DEL FORMULARIO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formulario_owner_actual (
    idformA INT PRIMARY KEY,
    IdInstitucionActual INT NOT NULL,
    IdUsrPropietarioActual INT NOT NULL,
    IdFormularioDerivacionActiva INT NULL,
    EsDerivado TINYINT(1) NOT NULL DEFAULT 0,
    FechaActualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_fown_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
    CONSTRAINT fk_fown_inst FOREIGN KEY (IdInstitucionActual) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
    CONSTRAINT fk_fown_usr FOREIGN KEY (IdUsrPropietarioActual) REFERENCES usuarioe(IdUsrA) ON DELETE RESTRICT,
    CONSTRAINT fk_fown_deriv FOREIGN KEY (IdFormularioDerivacionActiva) REFERENCES formulario_derivacion(IdFormularioDerivacion) ON DELETE SET NULL,

    INDEX idx_fown_inst (IdInstitucionActual),
    INDEX idx_fown_usr (IdUsrPropietarioActual),
    INDEX idx_fown_deriv (EsDerivado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3) HISTORIAL DE ESTADOS DEL FORMULARIO (auditoria funcional)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formulario_estado_historial (
    IdFormularioEstadoHistorial INT AUTO_INCREMENT PRIMARY KEY,
    idformA INT NOT NULL,
    estado_anterior VARCHAR(60) NULL,
    estado_nuevo VARCHAR(60) NOT NULL,
    detalle VARCHAR(1000) NULL,

    IdUsrAccion INT NULL,
    IdInstitucionAccion INT NULL,
    IdFormularioDerivacion INT NULL,

    FechaAccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fhist_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
    CONSTRAINT fk_fhist_usr FOREIGN KEY (IdUsrAccion) REFERENCES usuarioe(IdUsrA) ON DELETE SET NULL,
    CONSTRAINT fk_fhist_inst FOREIGN KEY (IdInstitucionAccion) REFERENCES institucion(IdInstitucion) ON DELETE SET NULL,
    CONSTRAINT fk_fhist_deriv FOREIGN KEY (IdFormularioDerivacion) REFERENCES formulario_derivacion(IdFormularioDerivacion) ON DELETE SET NULL,

    INDEX idx_fhist_form (idformA),
    INDEX idx_fhist_estado (estado_nuevo),
    INDEX idx_fhist_fecha (FechaAccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4) FACTURACION DE FORMULARIOS DERIVADOS (por institucion)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturacion_formulario_derivado (
    IdFacturacionFormularioDerivado INT AUTO_INCREMENT PRIMARY KEY,
    idformA INT NOT NULL,
    IdFormularioDerivacion INT NOT NULL,

    IdInstitucionCobradora INT NOT NULL COMMENT 'Institucion que atiende/cobra',
    IdInstitucionSolicitante INT NOT NULL COMMENT 'Institucion que deriva/solicita',
    IdUsrSolicitante INT NOT NULL COMMENT 'Usuario propietario que deriva',

    tipo_formulario VARCHAR(40) NOT NULL COMMENT 'animal|reactivo|insumo',
    monto_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado_cobro TINYINT NOT NULL DEFAULT 1 COMMENT '1=PENDIENTE,2=PARCIAL,3=PAGADO,4=ANULADO',

    FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FechaActualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ffd_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
    CONSTRAINT fk_ffd_deriv FOREIGN KEY (IdFormularioDerivacion) REFERENCES formulario_derivacion(IdFormularioDerivacion) ON DELETE CASCADE,
    CONSTRAINT fk_ffd_inst_cob FOREIGN KEY (IdInstitucionCobradora) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
    CONSTRAINT fk_ffd_inst_sol FOREIGN KEY (IdInstitucionSolicitante) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
    CONSTRAINT fk_ffd_usr_sol FOREIGN KEY (IdUsrSolicitante) REFERENCES usuarioe(IdUsrA) ON DELETE RESTRICT,

    UNIQUE KEY uq_ffd_deriv (IdFormularioDerivacion),
    INDEX idx_ffd_form (idformA),
    INDEX idx_ffd_inst_cob (IdInstitucionCobradora),
    INDEX idx_ffd_inst_sol (IdInstitucionSolicitante),
    INDEX idx_ffd_estado (estado_cobro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5) AJUSTES MINIMOS SOBRE formularioe (estado derivado + trazas)
-- ------------------------------------------------------------
-- Nota: si alguna columna ya existe, ajustar manualmente.
-- Estas columnas simplifican filtros y compatibilidad con UI actual.

ALTER TABLE formularioe
    ADD COLUMN IF NOT EXISTS EstadoWorkflow VARCHAR(40) NULL AFTER estado,
    ADD COLUMN IF NOT EXISTS IdInstitucionOrigen INT NULL AFTER EstadoWorkflow,
    ADD COLUMN IF NOT EXISTS DerivadoActivo TINYINT(1) NOT NULL DEFAULT 0 AFTER IdInstitucionOrigen,
    ADD COLUMN IF NOT EXISTS FechaDerivado DATETIME NULL AFTER DerivadoActivo;

ALTER TABLE formularioe
    ADD INDEX IF NOT EXISTS idx_form_estado_workflow (EstadoWorkflow),
    ADD INDEX IF NOT EXISTS idx_form_derivado_activo (DerivadoActivo),
    ADD INDEX IF NOT EXISTS idx_form_inst_origen (IdInstitucionOrigen);

-- Opcional: FK de institucion origen (siempre que tu schema lo soporte sin datos sucios)
-- ALTER TABLE formularioe
--     ADD CONSTRAINT fk_form_inst_origen FOREIGN KEY (IdInstitucionOrigen) REFERENCES institucion(IdInstitucion) ON DELETE SET NULL;

COMMIT;

```

ALTER TABLE formularioe ADD COLUMN EstadoWorkflow VARCHAR(40) NULL AFTER estado;
ALTER TABLE formularioe ADD COLUMN IdInstitucionOrigen INT NULL AFTER EstadoWorkflow;
ALTER TABLE formularioe ADD COLUMN DerivadoActivo TINYINT(1) NOT NULL DEFAULT 0 AFTER IdInstitucionOrigen;
ALTER TABLE formularioe ADD COLUMN FechaDerivado DATETIME NULL AFTER DerivadoActivo;
ALTER TABLE formularioe ADD INDEX idx_form_estado_workflow (EstadoWorkflow);
ALTER TABLE formularioe ADD INDEX idx_form_derivado_activo (DerivadoActivo);
ALTER TABLE formularioe ADD INDEX idx_form_inst_origen (IdInstitucionOrigen);

CREATE TABLE IF NOT EXISTS formulario_derivacion (
IdFormularioDerivacion INT AUTO_INCREMENT PRIMARY KEY,
idformA INT NOT NULL,
IdFormularioDerivacionPadre INT NULL,
IdInstitucionOrigen INT NOT NULL,
IdInstitucionDestino INT NOT NULL,
IdUsrOrigen INT NOT NULL,
IdUsrDestinoResponsable INT NULL,
estado_derivacion TINYINT NOT NULL DEFAULT 1,
mensaje_origen VARCHAR(1000) NULL,
mensaje_destino VARCHAR(1000) NULL,
motivo_rechazo VARCHAR(1000) NULL,
FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
FechaRespondido DATETIME NULL,
FechaCerrado DATETIME NULL,
Activo TINYINT(1) NOT NULL DEFAULT 1,
CONSTRAINT fk_fder_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
CONSTRAINT fk_fder_parent FOREIGN KEY (IdFormularioDerivacionPadre) REFERENCES formulario_derivacion(IdFormularioDerivacion) ON DELETE SET NULL,
CONSTRAINT fk_fder_inst_origen FOREIGN KEY (IdInstitucionOrigen) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
CONSTRAINT fk_fder_inst_destino FOREIGN KEY (IdInstitucionDestino) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
CONSTRAINT fk_fder_usr_origen FOREIGN KEY (IdUsrOrigen) REFERENCES usuarioe(IdUsrA) ON DELETE RESTRICT,
CONSTRAINT fk_fder_usr_destino FOREIGN KEY (IdUsrDestinoResponsable) REFERENCES usuarioe(IdUsrA) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS formulario_owner_actual (
idformA INT PRIMARY KEY,
IdInstitucionActual INT NOT NULL,
IdUsrPropietarioActual INT NOT NULL,
IdFormularioDerivacionActiva INT NULL,
EsDerivado TINYINT(1) NOT NULL DEFAULT 0,
FechaActualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT fk_fown_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
CONSTRAINT fk_fown_inst FOREIGN KEY (IdInstitucionActual) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
CONSTRAINT fk_fown_usr FOREIGN KEY (IdUsrPropietarioActual) REFERENCES usuarioe(IdUsrA) ON DELETE RESTRICT,
INDEX idx_fown_inst (IdInstitucionActual),
INDEX idx_fown_usr (IdUsrPropietarioActual),
INDEX idx_fown_deriv (EsDerivado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE formulario_owner_actual
ADD CONSTRAINT fk_fown_deriv
FOREIGN KEY (IdFormularioDerivacionActiva)
REFERENCES formulario_derivacion(IdFormularioDerivacion)
ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS formulario_estado_historial (
IdFormularioEstadoHistorial INT AUTO_INCREMENT PRIMARY KEY,
idformA INT NOT NULL,
estado_anterior VARCHAR(60) NULL,
estado_nuevo VARCHAR(60) NOT NULL,
detalle VARCHAR(1000) NULL,
IdUsrAccion INT NULL,
IdInstitucionAccion INT NULL,
IdFormularioDerivacion INT NULL,
FechaAccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
INDEX idx_fhist_form (idformA),
INDEX idx_fhist_estado (estado_nuevo),
INDEX idx_fhist_fecha (FechaAccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS facturacion_formulario_derivado (
IdFacturacionFormularioDerivado INT AUTO_INCREMENT PRIMARY KEY,
idformA INT NOT NULL,
IdFormularioDerivacion INT NOT NULL,
IdInstitucionCobradora INT NOT NULL,
IdInstitucionSolicitante INT NOT NULL,
IdUsrSolicitante INT NOT NULL,
tipo_formulario VARCHAR(40) NOT NULL,
monto_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
estado_cobro TINYINT NOT NULL DEFAULT 1,
FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
FechaActualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT fk_ffd_form FOREIGN KEY (idformA) REFERENCES formularioe(idformA) ON DELETE CASCADE,
CONSTRAINT fk_ffd_deriv FOREIGN KEY (IdFormularioDerivacion) REFERENCES formulario_derivacion(IdFormularioDerivacion) ON DELETE CASCADE,
CONSTRAINT fk_ffd_inst_cob FOREIGN KEY (IdInstitucionCobradora) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
CONSTRAINT fk_ffd_inst_sol FOREIGN KEY (IdInstitucionSolicitante) REFERENCES institucion(IdInstitucion) ON DELETE RESTRICT,
CONSTRAINT fk_ffd_usr_sol FOREIGN KEY (IdUsrSolicitante) REFERENCES usuarioe(IdUsrA) ON DELETE RESTRICT,
UNIQUE KEY uq_ffd_deriv (IdFormularioDerivacion),
INDEX idx_ffd_form (idformA),
INDEX idx_ffd_inst_cob (IdInstitucionCobradora),
INDEX idx_ffd_inst_sol (IdInstitucionSolicitante),
INDEX idx_ffd_estado (estado_cobro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

- - =============================================================================
-- MIGRACIÓN COMPLETA: Derivación con formulario original intacto
-- Ejecutar en orden. Si alguna tabla/columna ya existe, omitir esa sentencia.
-- =============================================================================

---

- - 1. Tabla formulario_datos_originales (snapshot del formulario al derivar)
-- Solo si no existe

---

CREATE TABLE IF NOT EXISTS formulario_datos_originales (
id INT AUTO_INCREMENT PRIMARY KEY,
idformA INT NOT NULL,
IdFormularioDerivacion INT NOT NULL,
datos_json LONGTEXT NOT NULL COMMENT 'JSON: header + details del formulario al derivar',
FechaCreado DATETIME DEFAULT CURRENT_TIMESTAMP,
UNIQUE KEY uk_form_deriv (idformA, IdFormularioDerivacion),
INDEX idx_idform (idformA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

---

- - 2. Columna idformAOrigen en formulario_derivacion
-- Formulario original que permanece en institución origen (no se modifica)
-- Si la columna ya existe, omitir esta línea.

---

ALTER TABLE formulario_derivacion
ADD COLUMN idformAOrigen INT NULL
COMMENT 'Formulario original en institución origen (no se modifica al derivar)'
AFTER idformA;

---

- - 3. Índice para búsquedas por formulario original
-- Si el índice ya existe, omitir esta línea.

---

CREATE INDEX idx_formulario_derivacion_idformAOrigen
ON formulario_derivacion(idformAOrigen);

CREATE TABLE IF NOT EXISTS formulario_datos_originales (
id INT AUTO_INCREMENT PRIMARY KEY,
idformA INT NOT NULL,
IdFormularioDerivacion INT NOT NULL,
datos_json LONGTEXT NOT NULL COMMENT 'JSON: header + details del formulario al derivar',
FechaCreado DATETIME DEFAULT CURRENT_TIMESTAMP,
UNIQUE KEY uk_form_deriv (idformA, IdFormularioDerivacion),
INDEX idx_idform (idformA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

- - Ejecutar en la base correcta
-- USE groboapp_geckos;

SET @db := DATABASE();

- - 1) estado_origen
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db
AND TABLE_NAME = 'formulario_derivacion'
AND COLUMN_NAME = 'estado_origen'
),
'SELECT "estado_origen ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN estado_origen VARCHAR(60) NULL AFTER estado_derivacion'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 2) estado_destino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'estado_destino'
),
'SELECT "estado_destino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN estado_destino VARCHAR(60) NULL AFTER estado_origen'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 3) tipoA_destino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'tipoA_destino'
),
'SELECT "tipoA_destino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN tipoA_destino INT NULL AFTER estado_destino'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 4) depto_destino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'depto_destino'
),
'SELECT "depto_destino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN depto_destino INT NULL AFTER tipoA_destino'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 5) idsubespA_destino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'idsubespA_destino'
),
'SELECT "idsubespA_destino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN idsubespA_destino INT NULL AFTER depto_destino'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 6) idcepaA_destino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'idcepaA_destino'
),
'SELECT "idcepaA_destino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN idcepaA_destino INT NULL AFTER idsubespA_destino'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 7) FechaConfigDestino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'FechaConfigDestino'
),
'SELECT "FechaConfigDestino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN FechaConfigDestino DATETIME NULL AFTER idcepaA_destino'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - 8) IdUsrConfigDestino
SET @sql := (
SELECT IF(
EXISTS(
SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'formulario_derivacion' AND COLUMN_NAME = 'IdUsrConfigDestino'
),
'SELECT "IdUsrConfigDestino ya existe" AS msg',
'ALTER TABLE formulario_derivacion ADD COLUMN IdUsrConfigDestino INT NULL AFTER FechaConfigDestino'
)
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
- - Índices (si ya existen, comentá esas líneas)
ALTER TABLE formulario_derivacion
ADD INDEX idx_fd_tipoA_destino (tipoA_destino),
ADD INDEX idx_fd_depto_destino (depto_destino),
ADD INDEX idx_fd_subesp_destino (idsubespA_destino),
ADD INDEX idx_fd_cepa_destino (idcepaA_destino),
ADD INDEX idx_fd_usr_config_destino (IdUsrConfigDestino);

## CÓMO FUNCIONAN LOS PEDIDOS (Formularios):

### 1. Análisis del Modelo: El Formulario Polimórfico

La tabla `formularioe` funciona como un "camaleón". Dependiendo de qué seleccione el usuario en `tipoformularios` (campo `tipoA`), la entidad activa o ignora ciertas columnas y relaciones. No es un simple pedido, son tres flujos distintos en una sola tabla:

- **A. Flujo de Animales Vivos:**
    - **Datos Clave:** Utiliza `idsubespA` (para saber la cepa) y se apoya fuertemente en `sexoe` y `protformr`.
    - **Validación Crítica:** Antes de guardar, el sistema verifica que `protocoloexpe.CantidadAniA` sea suficiente para cubrir el `sexoe.totalA` solicitado. Si no hay cupo en el protocolo, el pedido rebota.
    - **Impacto:** Al pasar a "Entregado", descuenta irreversiblemente del saldo del protocolo.
- **B. Flujo de Reactivos / Tejidos:**
    - **Datos Clave:** Utiliza la columna `reactivo` (que apunta a `insumoexperimental`).
    - **Cuantificación:** No usa `macho/hembra` en `sexoe`, sino que utiliza la columna `organo` para definir la cantidad (ej: "5 ml" o "3 muestras").
    - **Validación:** Verifica stock en `insumoexperimental` (si aplica) y vigencia del protocolo, pero la lógica de descuento de cupo animal es opcional o nula dependiendo de la configuración institucional.
- **C. Flujo de Insumos Generales:**
    - **Datos Clave:** Ignora las columnas de especies. Utiliza la tabla subordinada `forminsumo` para listar ítems (viruta, alimento).
    - **Precios:** Al crear el pedido, el sistema toma el precio actual de la tabla maestra `insumo` y lo copia a `forminsumo.PrecioMomentoInsumo`. Esto "congela" el costo: si el precio de la viruta sube mañana, este pedido respeta el precio de hoy.

### 2. La Lógica de `sexoe` (La Calculadora)

Esta entidad subordinada es el cerebro matemático del pedido. No solo guarda números, define la **demanda biológica**.

- **Fórmula:** `machoA` + `hembraA` + `indistintoA` = `totalA`.
- Este `totalA` es el número sagrado. Es lo que se comunica al stock para reservar jaulas y al protocolo para descontar cupo.

### 3. El Ciclo de Vida del Pedido (Workflow de Estados)

El campo `estado` no es solo una etiqueta; dispara acciones en el inventario y en la logística del bioterio. Debido a la naturaleza histórica de los datos, el sistema normaliza el texto (ignora mayúsculas/minúsculas) para procesar estos 5 hitos:

1. **Sin estado / Borrador:**
    - *Acción:* El investigador guarda cambios parciales.
    - *Sistema:* Invisible para el bioterio. No reserva nada.
2. **Proceso / Solicitado:**
    - *Acción:* El investigador pulsa "Enviar".
    - *Sistema:* Aparece en el Dashboard del Admin. Se verifican las reglas de negocio (Vigencia de protocolo, Deudas del usuario).
3. **Reservado:**
    - *Acción:* El Admin confirma que tiene los animales/insumos.
    - *Sistema (Hard Lock):* El stock se "compromete". Los animales siguen físicamente en la sala, pero virtualmente ya no existen para otros usuarios. El cupo del protocolo se retiene preventivamente.
4. **Listo para entrega:**
    - *Acción:* El técnico del bioterio separa físicamente el pedido y lo lleva a la zona de despacho.
    - *Sistema:* Es un estado de transición interno. Sirve para notificar al investigador: *"Tu pedido te está esperando en la puerta"*.
5. **Entregado:**
    - *Acción:* El investigador se lleva el pedido.
    - *Sistema (Cierre):* Se confirma la baja definitiva del stock. Se genera el registro de deuda en la cuenta corriente del usuario (`IdUsrA`). El pedido se cierra y no se puede editar.
6. **Suspendido:**
    - *Acción:* Cancelación (por falta de pago, error, muerte súbita de animales, etc.).
    - *Sistema (Rollback):* **Crítico.** El sistema debe liberar la reserva. Los animales vuelven al stock disponible y el cupo vuelve al protocolo.

### 4. La "Deuda Técnica" de `protformr`

Es importante documentar por qué existe esta tabla.

- **Realidad:** Un formulario pertenece a un solo protocolo.
- **Estructura:** La tabla `protformr` permite técnicamente muchos protocolos por formulario (N:M).
- **Regla de Negocio:** El código de la aplicación fuerza una relación 1:1. Se mantiene la estructura por compatibilidad con datos antiguos, pero la lógica actual asegura que `idformA` sea único en esta tabla.

---

## **Módulo de Alojamiento**

- **alojamiento:**
    - Tipo entidad: Maestra
    - Registro de cajas y estadía animal seria la entidad donde se registra la unidad de alojamiento principal, pero luego tiene derivaciones…
        - - `[**IdAlojamiento** *(id ia)*, **fechavisado** *(date null)*, **totalcajachica** *(deprecated)*, **totalcajagrande***(deprecated)*, **preciocajachica***(deprecated)*, **preciocajagrande***(deprecated)*, **cuentaapagar***(int null)*, **IdUsrA***(int foranea usuarioe:IdUsrA)*, **observaciones***(text null)*, **TipoAnimal***(int foranea especiee:idespA)*, **idprotA***(int foranea protocoloexpe:idprotA)*, **hastafecha***(date null)*, **historia***(int)*, **totaldiasdefinidos***(int null)*, **totalpago***(int null)*, **detallepago***(text null)*, **finalizado***(int null)*, **coloniapropia***(deprecated)*, **IdInstitucion***(int foranea institucion:IdInstitucion)*, **IdTipoAlojamiento** *(int foranea tipoalojamiento:IdTipoAlojamiento), **CantidadCaja**(int), **PrecioCajaMomento**(int)*]`

- **tipoalojamiento:**
    - Tipo entidad: Subordinada (especiee)
    - Entidad donde se crean los tipos de alojamiento que va a existir por especie… hay que crear los que tengan se utilizan aca, cada especie puede tener los tipos que queria de alojamiento, osea el ejemplo anterior que las especies tenian caja chica y caja grande.. algunas especies y ponia para todas.. bueno ahora por especie habria que crear cada una de esas esto es obviamente por especie, que luego se utilizara en alojamiento y el precio es por unidad de estas si fuera caja por ejemplo luego por cada caja se cobra o por lo que se pida en el alojamiento , Habilitado = 1 , esta habilitado , cualquier otra no…
        - - `[**IdTipoAlojamiento** *(int ai)*, **NombreTipoAlojamiento** *(varchar(100))*, **DetalleTipoAlojamiento***(text null)*, **idespA***(int foranea especiee:idespA)*, **PrecioXunidad***(int null), Habilitado (int)*]`

- **categoriadatosunidadalojamiento:**
    - Tipo entidad: Subordinada (especiee)
    - Entidad donde se crean las categorias que luego tiene que llenar por animal en alojamiento.. esto sirve para especie.. osea la especie que tenga esto.. y haga un alojamiento para saber la vida de cada animal en esa caja… tiene categorias para luego llenarlas.. es por especie que existe en la institucion, hasta se pone que tipo  tambien el tipo de dato que se va a poner en la observacion y tiene una dependencia_id que es una dependencia que queda null pero es como para utilizar si hay una categoria y subcategoria es como para que se referencie a ella misma tipo de categoria…
        - - `[**IdDatosUnidadAloj** *(int ai)*, **NombreCatAlojUnidad** *(varchar(100))*, **DetalleCatAloj***(text null)* ,**IdEspA***(int foranea especiee:idespA)*, **TipoDeDato***(varchar(20)),* **dependencia_id** *(int null)*]`

- **alojamiento_caja:**
    - Tipo entidad: Subordinada (alojamiento)
    - Esta seria como la caja dentro del numero de la cantidad de alojamiento (puede ser caja como cualquier otra cosa… en este caso le pongo nombre de caja por que es mas facil y se entiende… a lo que este se desencadena en cada animal de esta caja o habitacion…
        - - `[**IdCajaAlojamiento***(int ai)*, **FechaInicio***(date)*, **Detalle***(text null)*, **NombreCaja***(varchar(100) null)*, **IdAlojamiento***(int foranea alojamiento:IdAlojamiento),ubicacion(varchar[100] null)* ]`

- **especie_alojamiento_unidad:**
    - Tipo entidad: Subordinada (alojamiento_caja)
    - Entidad donde se apunta a el animal en si del alojamiento que pertenece a una unidad de caja donde se le puede poner un detalle y nombre al animal (la especie se trae …
        - - `[**IdEspecieAlojUnidad***(int ai)*, **NombreEspecieAloj***(varchar(100)*, **DetalleEspecieAloj***(text null)*, **IdCajaAlojamiento***(int foranea alojamiento_caja:IdCajaAlojamiento)*]`

- **observacion_alojamiento_unidad:**
    - Tipo entidad: Subordinada (especie_alojamiento_unidad, categoriadatosunidadalojamiento)
    - Aqui es la entidad donde se llena cada cosa del animal de la caja , que tiene la especie con categoriadatosunidadalojamiento…
        - - `[**IdObservacionAlojUnidad***(int ai)*, **fechaObs***(date null)*, **DatoObsVar***(varchar(100 null)*, **DatoObsText***(text null)*, **DatoObsInt***(int null)*, **DatoObsFecha***(date null)*, **IdEspecieAlojUnidad***(int foranea especie_alojamiento_unidad:IdEspecieAlojUnidad)*, **IdDatosUnidadAloj** *(int categoriadatosunidadalojamiento:IdDatosUnidadAloj),* **id_fila_obs** *(int null)* ]`

- **registroalojamiento:**
    - Subordinada: (IdAlojamiento)
    - Historial de movimientos de los animales en alojamiento…
        - - `[**registroalojamiento** *(int ai)*, **IdUsrA***(int foranea usuarioe:IdUsrA)*, **IdAlojamiento** *(int foranea alojamiento:IdAlojamiento)*, **TipoRegistro***(varchar(60) null)*, **FechaRegistro***(date)*]`

- qralojamiento:
    - Tipo entidad: subordinada (historia)
    - Sirve para crear un codigo de 6 letras y numeros de alojamiento del qr para dar acceso en las instituciones
        - - [id_qr(int ai), codigo (varchar(6)), historia(int foranea alojamientos:historia), IdUsrA(int foranea usuarioe:IdUsrA) fecha_creacion(datetime) ]

- *- =============================================================================*
- *- URBE – Ubicación física de cajas de alojamiento (por institución)*
- *- Motor: InnoDB | Charset: utf8mb4*
- *- Ejecutar UNA VEZ en la base de datos del proyecto (tras backup).*
- *- Requiere existir la tabla: institucion (IdInstitucion) y alojamiento_caja (IdCajaAlojamiento)*
- *- =============================================================================*

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

- *- -----------------------------------------------------------------------------*
- *- 1) Etiquetas personalizables por institución (nombres distintos por sede)*
- *- -----------------------------------------------------------------------------*

CREATE TABLE IF NOT EXISTS `aloj_config_ubicacion` (

`IdInstitucion` INT NOT NULL,

`LabelLugarFisico`       VARCHAR(120) NOT NULL *DEFAULT* 'Lugar físico',

`LabelSalon`             VARCHAR(120) NOT NULL *DEFAULT* 'Salón / sala',

`LabelRack`              VARCHAR(120) NOT NULL *DEFAULT* 'Rack',

`LabelLugarRack`       VARCHAR(120) NOT NULL *DEFAULT* 'Posición en rack',

`LabelComentarioUbicacion` VARCHAR(120) NOT NULL *DEFAULT* 'Comentario de ubicación',

*PRIMARY KEY* (`IdInstitucion`),

*CONSTRAINT* `fk_aloj_cfg_inst`

*FOREIGN KEY* (`IdInstitucion`) *REFERENCES* `institucion` (`IdInstitucion`)

*ON DELETE CASCADE* ON UPDATE CASCADE

) ENGINE=InnoDB *DEFAULT* CHARSET=utf8mb4 *COLLATE*=utf8mb4_unicode_ci

COMMENT='Etiquetas de UI para ubicación de cajas (por institución)';

- *- -----------------------------------------------------------------------------*
- *- 2) Catálogo: lugar físico (ej. interior / exterior / edificio A)*
- *- -----------------------------------------------------------------------------*

CREATE TABLE IF NOT EXISTS `aloj_ubicacion_fisica` (

`IdUbicacionFisica` INT NOT NULL AUTO_INCREMENT,

`IdInstitucion` INT NOT NULL,

`Nombre` VARCHAR(160) NOT NULL,

`Orden` INT NOT NULL *DEFAULT* 0,

`Activo` TINYINT(1) NOT NULL *DEFAULT* 1,

*PRIMARY KEY* (`IdUbicacionFisica`),

KEY `idx_aloj_uf_inst` (`IdInstitucion`),

KEY `idx_aloj_uf_inst_activo` (`IdInstitucion`, `Activo`),

*CONSTRAINT* `fk_aloj_uf_inst`

*FOREIGN KEY* (`IdInstitucion`) *REFERENCES* `institucion` (`IdInstitucion`)

*ON DELETE CASCADE* ON UPDATE CASCADE

) ENGINE=InnoDB *DEFAULT* CHARSET=utf8mb4 *COLLATE*=utf8mb4_unicode_ci;

- *- -----------------------------------------------------------------------------*
- *- 3) Catálogo: salón / sala (opcionalmente ligado a un lugar físico)*
- *- -----------------------------------------------------------------------------*

CREATE TABLE IF NOT EXISTS `aloj_salon` (

`IdSalon` INT NOT NULL AUTO_INCREMENT,

`IdInstitucion` INT NOT NULL,

`IdUbicacionFisica` INT NULL COMMENT 'NULL = mismo lugar global / no aplica',

`Nombre` VARCHAR(160) NOT NULL,

`Orden` INT NOT NULL *DEFAULT* 0,

`Activo` TINYINT(1) NOT NULL *DEFAULT* 1,

*PRIMARY KEY* (`IdSalon`),

KEY `idx_aloj_salon_inst` (`IdInstitucion`),

KEY `idx_aloj_salon_uf` (`IdUbicacionFisica`),

*CONSTRAINT* `fk_aloj_salon_inst`

*FOREIGN KEY* (`IdInstitucion`) *REFERENCES* `institucion` (`IdInstitucion`)

*ON DELETE CASCADE* ON UPDATE CASCADE,

*CONSTRAINT* `fk_aloj_salon_uf`

*FOREIGN KEY* (`IdUbicacionFisica`) *REFERENCES* `aloj_ubicacion_fisica` (`IdUbicacionFisica`)

*ON DELETE* SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB *DEFAULT* CHARSET=utf8mb4 *COLLATE*=utf8mb4_unicode_ci;

- *- -----------------------------------------------------------------------------*
- *- 4) Catálogo: rack (opcionalmente ligado a un salón)*
- *- -----------------------------------------------------------------------------*

CREATE TABLE IF NOT EXISTS `aloj_rack` (

`IdRack` INT NOT NULL AUTO_INCREMENT,

`IdInstitucion` INT NOT NULL,

`IdSalon` INT NULL COMMENT 'NULL = rack sin salón específico',

`Nombre` VARCHAR(160) NOT NULL,

`Orden` INT NOT NULL *DEFAULT* 0,

`Activo` TINYINT(1) NOT NULL *DEFAULT* 1,

*PRIMARY KEY* (`IdRack`),

KEY `idx_aloj_rack_inst` (`IdInstitucion`),

KEY `idx_aloj_rack_salon` (`IdSalon`),

*CONSTRAINT* `fk_aloj_rack_inst`

*FOREIGN KEY* (`IdInstitucion`) *REFERENCES* `institucion` (`IdInstitucion`)

*ON DELETE CASCADE* ON UPDATE CASCADE,

*CONSTRAINT* `fk_aloj_rack_salon`

*FOREIGN KEY* (`IdSalon`) *REFERENCES* `aloj_salon` (`IdSalon`)

*ON DELETE* SET NULL ON UPDATE CASCADE

) ENGINE=InnoDB *DEFAULT* CHARSET=utf8mb4 *COLLATE*=utf8mb4_unicode_ci;

- *- -----------------------------------------------------------------------------*
- *- 5) Catálogo: posición / lugar dentro del rack*
- *- -----------------------------------------------------------------------------*

CREATE TABLE IF NOT EXISTS `aloj_lugar_rack` (

`IdLugarRack` INT NOT NULL AUTO_INCREMENT,

`IdRack` INT NOT NULL,

`Nombre` VARCHAR(160) NOT NULL,

`Orden` INT NOT NULL *DEFAULT* 0,

`Activo` TINYINT(1) NOT NULL *DEFAULT* 1,

*PRIMARY KEY* (`IdLugarRack`),

KEY `idx_aloj_lr_rack` (`IdRack`),

*CONSTRAINT* `fk_aloj_lr_rack`

*FOREIGN KEY* (`IdRack`) *REFERENCES* `aloj_rack` (`IdRack`)

*ON DELETE CASCADE* ON UPDATE CASCADE

) ENGINE=InnoDB *DEFAULT* CHARSET=utf8mb4 *COLLATE*=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

- *- -----------------------------------------------------------------------------*
- *- 6) Extender alojamiento_caja (ubicación por caja)*
- *- Si alguna columna ya existe, comentar solo esa línea y volver a ejecutar.*
- *- -----------------------------------------------------------------------------*

ALTER TABLE `alojamiento_caja`

ADD COLUMN `IdUbicacionFisica` INT NULL *DEFAULT* NULL COMMENT 'Opcional' AFTER `Detalle`,

ADD COLUMN `IdSalon` INT NULL *DEFAULT* NULL AFTER `IdUbicacionFisica`,

ADD COLUMN `IdRack` INT NULL *DEFAULT* NULL AFTER `IdSalon`,

ADD COLUMN `IdLugarRack` INT NULL *DEFAULT* NULL AFTER `IdRack`,

ADD COLUMN `ComentarioUbicacion` VARCHAR(500) NULL *DEFAULT* NULL COMMENT 'Texto libre del lugar' AFTER `IdLugarRack`;

ALTER TABLE `alojamiento_caja`

ADD KEY `idx_acaja_uf` (`IdUbicacionFisica`),

ADD KEY `idx_acaja_salon` (`IdSalon`),

ADD KEY `idx_acaja_rack` (`IdRack`),

ADD KEY `idx_acaja_lr` (`IdLugarRack`);

ALTER TABLE `alojamiento_caja`

ADD *CONSTRAINT* `fk_acaja_uf`

*FOREIGN KEY* (`IdUbicacionFisica`) *REFERENCES* `aloj_ubicacion_fisica` (`IdUbicacionFisica`)

*ON DELETE* SET NULL ON UPDATE CASCADE,

ADD *CONSTRAINT* `fk_acaja_salon`

*FOREIGN KEY* (`IdSalon`) *REFERENCES* `aloj_salon` (`IdSalon`)

*ON DELETE* SET NULL ON UPDATE CASCADE,

ADD *CONSTRAINT* `fk_acaja_rack`

*FOREIGN KEY* (`IdRack`) *REFERENCES* `aloj_rack` (`IdRack`)

*ON DELETE* SET NULL ON UPDATE CASCADE,

ADD *CONSTRAINT* `fk_acaja_lr`

*FOREIGN KEY* (`IdLugarRack`) *REFERENCES* `aloj_lugar_rack` (`IdLugarRack`)

*ON DELETE* SET NULL ON UPDATE CASCADE;

- *- -----------------------------------------------------------------------------*
- *- 7) Semilla: una fila de etiquetas por cada institución existente*
- *- -----------------------------------------------------------------------------*

INSERT INTO `aloj_config_ubicacion` (

`IdInstitucion`,

`LabelLugarFisico`,

`LabelSalon`,

`LabelRack`,

`LabelLugarRack`,

`LabelComentarioUbicacion`

)

SELECT

i.`IdInstitucion`,

'Lugar físico',

'Salón / sala',

'Rack',

'Posición en rack',

'Comentario de ubicación'

FROM `institucion` i

LEFT JOIN `aloj_config_ubicacion` c ON c.`IdInstitucion` = i.`IdInstitucion`

WHERE c.`IdInstitucion` IS NULL;

- *- =============================================================================*
- *- FIN. Verificar:*
- *- SHOW CREATE TABLE alojamiento_caja;*
- *- SELECT * FROM aloj_config_ubicacion;*
- *- =============================================================================*

## COMO FUNCIONAN LOS ALOJAMIENTOS:

### 1. Análisis del Modelo

La base de datos ahora tiene una **jerarquía mucho más profunda**. Ya no es solo "Un alojamiento tiene X cajas". Ahora es un árbol:

1. **Configuración Previa (Blueprint):** Antes de alojar nada, el sistema define *qué es posible* hacer con una Especie.
    - **`tipoalojamiento`**: Define el contenedor y el precio base (ej: "Jaula Rata Estándar" a $100).
    - **`categoriadatosunidadalojamiento`**: Define qué métricas se van a medir (ej: "Peso", "Temperatura", "Comportamiento"). Son las **plantillas de observación**.
2. **El Contrato (`alojamiento`):** Es la cabecera administrativa. Define quién paga (`IdInstitucion`), quién es responsable (`IdUsrA`) y las fechas generales. *Nota: Los campos deprecated confirman que ya no guardas totales "a fuego", sino que los calculas por las relaciones.*
3. **La Realidad Física (`alojamiento_caja`):** Aquí materializas el alojamiento. Si el contrato dice "10 cajas", aquí habrá 10 registros. Es el contenedor físico temporal.
4. **El Habitante (`especie_alojamiento_unidad`):** Es el animal (o grupo de animales) específico viviendo dentro de esa caja. Aquí le das identidad ("Ratón #45").
5. **La Bitácora (`observacion_alojamiento_unidad`):** Es el "diario de vida". Aquí se cruza el **Habitante** con la **Categoría de Dato**. Si definiste que a las ratas se les mide el peso, aquí guardas "200g" el día "24/02".

---

### 2. Texto Actualizado: CÓMO FUNCIONAN LOS ALOJAMIENTOS

Aquí tienes la versión completa, fusionando la lógica de cobro (que ya tenías) con la nueva lógica operativa de cajas y unidades.

---

### CÓMO FUNCIONAN LOS ALOJAMIENTOS:

El módulo de alojamiento opera en dos capas simultáneas: la **Capa Administrativa** (Cobros y Fechas) y la **Capa Operativa** (Vida del animal y Trazabilidad).

### A. La Estructura Jerárquica (Nivel Operativo)

A diferencia del modelo anterior, ahora el alojamiento no es solo un número total de cajas. Se estructura como un árbol de contenedores y habitantes para permitir un seguimiento detallado:

1. **Definición por Especie (Configuración):**
Antes de crear un alojamiento, el sistema ya "sabe" qué tipos de vivienda existen para esa especie (tabla `tipoalojamiento`) y qué datos clínicos o de control se deben registrar (tabla `categoriadatosunidadalojamiento`), como peso, ingesta o síntomas.
2. **La Caja (`alojamiento_caja`):**
El alojamiento se desglosa en unidades físicas individuales (cajas, jaulas o habitaciones). Cada una tiene su propia existencia dentro del periodo de estadía.
3. **La Unidad Animal (`especie_alojamiento_unidad`):**
Dentro de cada caja reside la "Unidad". Aquí identificamos al animal específico.
4. **La Bitácora de Vida (`observacion_alojamiento_unidad`):**
Es el historial diario. Utilizando las categorías predefinidas para la especie, el investigador carga datos variables (texto, números, fechas) asociados a ese animal específico en esa caja específica.

### B. La Lógica de Intervalos Cronológicos (Nivel Administrativo)

Para el cálculo de costos y estadías generales, el sistema utiliza una lógica de resta de fechas puras, equivalente a contar "noches de hotel".

**1. Cálculo de Días:**
Se calcula el tiempo transcurrido mediante la fórmula:
`Días = Fecha Hasta - Fecha Desde`

**2. El "Día de Transición" (Actualizaciones):**
Cuando ocurre un cambio administrativo (ej. se cambian los animales de tipo de alojamiento o se cierra un periodo parcial):

- **Tramo Viejo:** Cobra desde su inicio hasta el día del cambio (sin incluir ese día completo).
- **Tramo Nuevo:** Comienza a contar desde el día del cambio en adelante.
- *Resultado:* El día del cambio siempre se atribuye a la nueva fila, evitando el cobro doble.

### C. Ejemplo Práctico de Flujo de Datos

Imagina un alojamiento para la especie **Ratones**:

1. **Setup:** El sistema tiene configurado el `TipoAlojamiento`: "Caja Metabólica" ($50/día) y la `CategoriaDato`: "Nivel de Glucosa".
2. **Ingreso:** Se crea el `Alojamiento` principal.
3. **Distribución:** Se generan 2 registros en `alojamiento_caja` (Caja A y Caja B).
4. **Identificación:** En la Caja A, registramos en `especie_alojamiento_unidad` al "Sujeto Alfa".
5. **Seguimiento:** El día 5, el investigador registra en `observacion_alojamiento_unidad` que el "Sujeto Alfa" tiene una glucosa de 110.

**Resultado:** Al finalizar, no solo sabemos que se deben cobrar X días de "Caja Metabólica", sino que tenemos la historia clínica completa de qué sucedió dentro de esa caja con el "Sujeto Alfa".

Tengo claro estos 3 pilares fundamentales para cuando empecemos a trabajar en el código o las consultas SQL:

1. **La Lógica de Negocio (El Cobro):**
    - Sé que el cobro no sale de sumar "items", sino de calcular **intervalos de tiempo** (noches de hotel).
    - Entiendo que la tabla `alojamiento` actúa como un "snapshot" o estado temporal: si cambian las condiciones (cantidad de cajas, tipo de animal), se cierra un registro (fecha hasta) y se abre uno nuevo.
2. **La Lógica Científica (La Trazabilidad):**
    - Entiendo que ya no nos importa solo el "bulto" (la caja), sino el **individuo** (la unidad).
    - El sistema es **dinámico**: No hay columnas fijas para "Peso" o "Temperatura". Tú defines *qué* medir en `categoriadatosunidadalojamiento` (metadatos) y luego guardas el valor en `observacion_alojamiento_unidad`. Esto es clave para que el sistema sirva para ratones, conejos o cualquier especie sin reprogramar la base de datos.
3. **La Jerarquía de Datos:**
    - `Institución` -> `Especie` -> `Tipo de Alojamiento` (Configuración).
    - `Alojamiento` (Contrato) -> `Caja` (Físico) -> `Unidad` (Animal) -> `Observación` (Dato).

---

## Reservas

- **reserva:**
    - Tipo entidad: Madre
    - Entidad principal de reservas donde se pone la fecha tiempo , horariocomienzo, idsala y la institucion y si dura dias…
        - - `*[***idReserva***(int ai) ,* **fechaini***(date null),* **fechafin***(date null),* **tiempo***(int null),* **IdSalaReserva***( int foranea reserva_sala:IdSalaReserva),* **IdInstitucion** *(int foranea institucion:IdInstitucion),* **Horacomienzo***(time) ,***Horafin***(time) ]*`

- **reserva_instrumento:**
    - Tipo entidad: Madre
    - Entidad donde se agregan instrumentos a la institucion para utilizar en la sala de la reserva, pueden tener varios e inclusive va haber una relacion que utilicen varios pero tiene que poner la cantidad de instrumentos… ya que en la reserva se van a ir consumiendo la cantidad disponibles y tambien si esta habilitado, osea pueden deshabiltiarlo si no hay mas…
        - - `*[* **IdReservaInstrumento** *(int ai) ,* **NombreInstrumento** *(varchar(100)),* **habilitado***(int),* **cantidad** *(int),* **detalleInstrumento** *(text null) ,* **IdInstitucion** *(int foranea institucion:IdInstitucion) ]*`

- **reserva_instrumento_sala:**
    - Tipo entidad: Relacion (reserva_instrumento, IdReserva)
    - Son la cantidad de instrumentos que van a utilizar en la reserva, es una relacion…
        - - `*[***IdReservaInstrumentoSala** *(int ai),* **IdReservaInstrumento***( int foranea reserva_instrumento:IdReservaInstrumento),* **IdReserva***(int foranea reserva:IdReserva)]*`

- **reserva_sala:**
    - Tipo entidad: Madre
    - Las salas habilitadas por institucion , poniendo su nombre y lugar…
        - - `*[* **IdSalaReserva** *(int ai) ,* **Nombre** *(varchar(100) null),* **Lugar** *(varchar(100 null),* **IdInstitucion** *(int foranea institucion:IdInstitucion),* **habilitado***(int),***tipohorasalas***(int null) ]*`

- reserva_f**echadeshabilitada**
    - Tipo entidad: Subordinada (reserva_sala, institucion)
    - Entidad que define deshabilitacion de fechas para reservar por alguna razon, detalle
        - - **`[IdFechadeshabilitada** *(int ai),* **fechades** *(date),* **detalle***(text null),* **IdSalaReserva***(id foranea reserva_sala:IdSalaReserva)]*`

- **reserva_horariospordiasala:**
    - Tipo entidad: Subordinada(reserva_diasala)
    - Es el lugar donde se le pone los horarios a cada dia de que hora que hora esta habilitada la sala para reservar IdDiaSala:
    
    1: Lunes
    
    2: Martes
    
    3: Miercoles
    
    4: Jueves:
    
    5: Viernes
    
    6: Sabado
    
    7: Domingo…
    
    - - `*[***IdHorarioDiaSala***(int ai), IdDiaSala(int),* **HoraIni***(time),* **HoraFin***(time),* **IdSalaReserva** *(int foranea reserva_sala:IdSalaReserva)]*`
    
- reserva_instrumento_sala_permitida:
    - Tipo entidad: Relacion (reserva_instrumento, reserva_sala)
    - Entidad que define en qué salas específicas está permitido usar un instrumento. Si un instrumento no tiene registros en esta tabla, significa que tiene disponibilidad global y se puede utilizar en cualquier sala libremente…
        - `*[***IdInstrumentoSalaPermitida***(int ai),***IdReservaInstrumento**(int foranea reserva_instrumento:IdReservaInstrumento),**IdSalaReserva**(int foranea reserva_sala:IdSalaReserva)]`


ALTER TABLE reserva_instrumento_sala
ADD COLUMN IF NOT EXISTS cantidad INT NOT NULL DEFAULT 1 AFTER IdReservaInstrumento;

ALTER TABLE reserva_instrumento_sala
ADD UNIQUE KEY IF NOT EXISTS uq_reserva_inst (IdReserva, IdReservaInstrumento);

ALTER TABLE reserva
ADD COLUMN IF NOT EXISTS IdUsrA INT NULL AFTER IdInstitucion,
ADD INDEX IF NOT EXISTS idx_reserva_usr (IdUsrA);

ALTER TABLE reserva
ADD CONSTRAINT fk_reserva_usr
FOREIGN KEY (IdUsrA) REFERENCES usuarioe(IdUsrA)
ON DELETE SET NULL;

ALTER TABLE reserva
ADD INDEX IF NOT EXISTS idx_reserva_sala_fecha (IdSalaReserva, fechaini, Horacomienzo, Horafin);

ALTER TABLE reserva_instrumento_sala
ADD INDEX IF NOT EXISTS idx_ris_inst (IdReservaInstrumento),
ADD INDEX IF NOT EXISTS idx_ris_reserva (IdReserva);

ALTER TABLE reserva
ADD COLUMN IF NOT EXISTS IdUsrCreador INT NOT NULL AFTER IdInstitucion,
ADD COLUMN IF NOT EXISTS IdUsrTitular INT NOT NULL AFTER IdUsrCreador,
ADD INDEX IF NOT EXISTS idx_reserva_titular (IdUsrTitular),
ADD INDEX IF NOT EXISTS idx_reserva_creador (IdUsrCreador);

CREATE TABLE IF NOT EXISTS reserva_serie (
IdReservaSerie INT AUTO_INCREMENT PRIMARY KEY,
IdInstitucion INT NOT NULL,
IdUsrCreador INT NOT NULL,
IdUsrTitular INT NOT NULL,
IdSalaReserva INT NOT NULL,

HoraInicio TIME NOT NULL,
HoraFin TIME NOT NULL,

FechaInicio DATE NOT NULL,
FechaFin DATE NOT NULL,

TipoRepeat TINYINT NOT NULL COMMENT '1=semanal,2=dias_especificos',
CadaNSemanas INT NOT NULL DEFAULT 1,
DiasSemana VARCHAR(20) NULL COMMENT 'Ej: 1,3,5 (Lun,Mie,Vie) si semanal',
FechasEspecificas TEXT NULL COMMENT 'JSON array de fechas YYYY-MM-DD si dias_especificos',

Activa TINYINT(1) NOT NULL DEFAULT 1,
FechaCreado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

INDEX idx_serie_inst_sala (IdInstitucion, IdSalaReserva),
INDEX idx_serie_rango (FechaInicio, FechaFin)
);

ALTER TABLE reserva
ADD COLUMN IF NOT EXISTS IdReservaSerie INT NULL AFTER idReserva,
ADD INDEX IF NOT EXISTS idx_reserva_serie (IdReservaSerie);

ALTER TABLE reserva_sala
ADD COLUMN IF NOT EXISTS QrToken VARCHAR(80) NULL,
ADD UNIQUE KEY IF NOT EXISTS uq_reserva_sala_qr (QrToken);



va a tener los dias de la semana

donde el primer numero es el Lunes , cuando se trae de la base de datos a la app.. se pasa literalmente los dias para configurar y ta…

deprecated a borrar

- reserva_horasala

- **reserva_diasala:**
    - Tipo entidad: Madre
    - Los dias que se van a relacionar con reserva_horariospordiasala para que se sepa bien que horarios hace cada dia la sala para reservar…
        - - `*[***IdDiaSala** *(id ai),* **NombreDia***(varchar(100) ]*`

## CÓMO FUNCIONA EL MOTOR DE RESERVAS:

### 1. Análisis del Modelo: La Triple Validación

Para crear un registro en `reserva`, el sistema debe pasar tres filtros lógicos secuenciales:

- **Filtro 1: Disponibilidad de Sala (Horario Operativo)**
    - El usuario pide "Lunes 10:00 AM".
    - El sistema consulta `reserva_horariospordiasala`: ¿La sala elegida abre los lunes a esa hora?
    - Si la sala abre solo de tarde, el bloqueo es inmediato.
- **Filtro 2: Disponibilidad de Sala (Conflicto de Agenda)**
    - El sistema busca en la tabla `reserva`: ¿Existe ya un registro para esa `IdSalaReserva` que se solape con `fechaini` + `Horacomienzo`/`Horafin`?
    - Lógica: `(NuevaIni < ExistenteFin) AND (NuevaFin > ExistenteIni)`.
- **Filtro 3: Disponibilidad de Instrumentos (Cupo de Equipos)**
    - Si la reserva incluye instrumentos (`reserva_instrumento_sala`), el sistema cuenta cuántas reservas activas hay en ese mismo horario para ese instrumento.
    - Si `ReservasActivas >= reserva_instrumento.cantidad`, rebota la reserva. *Ejemplo:* Si hay 2 microscopios y ya hay 2 reservados a esa hora en otras salas, no se puede pedir un tercero.

### 2. La Configuración de la Agenda (`reserva_horariospordiasala`)

Esta es la parte más flexible. Al separar los días en entidades (`reserva_diasala`), permites que cada institución o sala tenga su propio "Bio-ritmo".

- **Mantenimiento:** Si una sala entra en limpieza los viernes, simplemente se borra o edita el registro de ese día en esta tabla, y el sistema automáticamente bloquea todas las solicitudes futuras para viernes.

### 3. Instrumentos vs. Insumos

Es vital distinguir esto en la lógica de negocio:

- **Insumo (Módulo Pedidos):** Se gasta (Agujas, Guantes). Se pide cantidad y *desaparece* del stock.
- **Instrumento (Módulo Reservas):** Se ocupa (Anestesiadora). Se pide por *tiempo* y *vuelve* al stock al terminar la `Horafin`.

---

## Contabilidad

- **precioformulario:**
    - Tipo entidad: Subordinada (formularioe)
    - El precio total para los formularios de categoria reactivos o de animales vivos , donde se guarda el precio que tenia ese subespecie o reactivo en el momento se guarda y luego del actumulable del pedido * precioanimalmomento se hace el precioformulario, y el totalpago es el total de lo que va pagando la persona del formulario
        - - `*[***IdPrecioForm** *(int ai),* **idformA** *(int foranea formularioe:IdFormA),* **precioformulario***(int) ,***fechaIniForm***(date),* **estaba***(int null),* **precioanimalmomento***(int null),***totalpago***(int)]*`

- precioinsumosformulario:
    - Tipo entidad: Subordinada(formularioe)
    - Es la entidad donde se hace una madre relacionada con el formulario para anexar a todos los insumos y precios y cantidad , donde el valor de esa cantidad e precios de insumos multiplicados de pediso se suman y da el resultado de preciototal , y tiene totalpago que es lo que pago del fomrulario, esta entidad tiene mucho deprecated, el forminsumo es el que trae todos los insumos para este precio
        - - `*[***idPrecioinsumosformulario** *(int ai) ,* **idformA** *( int foranea formularioe:IdFormA) , precioformviruta(deprecated) , precioformalimento(deprecated) , fechaini (date null) ,* **estaba***(int null) , precioformotros(deprecated) , cantalimento(deprecated) , cantviruta (deprecated) , cantotros(deprecated) , preciomomentoalimento(deprecated) , preciomomentoviruta(deprecated) , preciomomentootros(deprecated) ,* **preciototal***(int null),***totalpago** *(int default=0)]*`

- **forminsumo** :
    - Tipo entidad: Subordinada (precioinsumosformulario, IdInsumo)
    - Entidad donde se anexa la entidad de la categoria de insumo que esta en el formulario.. osea es el nexo donde se ponene todos los insumos, cantidades , que insumo y el preico que tiene en el momento (con esto te da el precio total que pidio de este insumo que te ayuda a crear el precio total tambien) , pero en deifnitiva son los insumos que pidio que esta relacionada al formulario de insumos , no al formulario maestro…
        - - `[**IdForminsumo** *(int ai)*, **idPrecioinsumosformulario** *(int foranea precioinsumosformulario:idPrecioinsumosformulario)*, **IdInsumo** *(int foranea insumo:IdInsumo)*,**cantidad***(int)*,**PrecioMomentoInsumo***(int)*]`

- **historialpago:**
    - Tipo entidad: Subordinada (usuarioe x2, formularioe, institucion)
    - Auditoría financiera y estados de pago, se registran todos los movimientos de pagos que se haga en la parte de facturacion tiene 2 veces la foranea de IdUsrA, pero es por que tiene 2 usuarios el adminsitrador y al que se lo ejecuta…
        - - `*[***IdHistoPago** *(int ai),* **IdUsrAAdmin** *(int foreanea usuarioe:IdUsrA null),* **Monto** *(int),* **IdUsrA** *(int foranea usuarioe:IdUsrA null),* **IdFormA** *(int foranea formularioe:IdFormA),* **fecha** *(date),* **TipoHistorial** *(varchar(40)),* **IdInstitucion** *(int foranea institucion:IdInstitucion)]*`

deprecated para eliminar:

- **pagoformulario** :
    - idpagoform, idformA, detallepago, TotalPago, PagoCompleto

## CÓMO FUNCIONA EL MOTOR DE COBROS:

### 1. Análisis del Modelo: La Deuda Separada

El sistema separa las aguas financieras en dos tablas distintas según la naturaleza del pedido, aunque ambas apuntan al mismo `formularioe`.

- **Ruta A (Animales):** El sistema mira `precioformulario`. Multiplica la cantidad de animales entregados por el precio unitario del momento.
- **Ruta B (Insumos):** El sistema mira `precioinsumosformulario`. Suma el total de líneas de insumos.
- **Resultado:** Esto permite que un pedido mixto pueda gestionarse contablemente por separado si es necesario (ej: fondos distintos para animales vs. materiales), aunque lo normal es que un formulario sea de un solo tipo.

### 2. El Concepto de "Snapshot" (La Memoria Financiera)

El sistema evita el error clásico de recalcular deuda con precios actuales.

- Al pasar el pedido a estado "Entregado" (o "Proceso", según tu regla), se **copia** el precio del catálogo maestro (`subespecie` o `insumo`) a las tablas de precio (`precioformulario`).
- A partir de ese instante, la deuda es **inmutable** ante cambios de inflación o ajustes de tarifas en el futuro.

### 3. Gestión de Saldos (Pagos Parciales)

Las columnas `totalpago` en las tablas de precio funcionan como acumuladores.

- *Deuda:* $1000 (`precioformulario`).
- *Pago 1:* El usuario paga $500. Se crea un `historialpago` por $500. Se actualiza `totalpago` a $500. (Estado: Deudor).
- *Pago 2:* El usuario paga $500. Se crea otro `historialpago`. Se actualiza `totalpago` a $1000.
- *Cierre:* Como `totalpago` == `precioformulario`, la deuda está saldada.

### 4. Auditoría de Doble Punta (`historialpago`)

Esta entidad resuelve el problema de "¿Quién aceptó este pago?".

- Si hay un error de caja, no solo sabes qué usuario "pagó", sino qué administrador estaba logueado y dio el clic para aceptar ese dinero. Es un mecanismo de seguridad interno muy robusto.

---

# FIN DE ENTIDADES DE LA BASE DE DATOS.

---

## Detalles aclaraciones de la base de datos:

- Que sean null quiere decir que si no hay nada no pasa nada en ese atributo en la fila
- Los atributos deprecated no se utilizan mas pero quedan por tema de migraciones y obviamente son todos null.
- ai significa auto incremental son las primary key.
- dentro de () se encuentran los tipos de datos y si son foraneas y siguiente se pone la entidad:atributoforaneo en cada tabla para relacionarse.

### Definiciones de Modelado

Te sugiero un pequeño ajuste en la de "Maestra" para resolver lo de la Institución:

- **Entidad Maestra (Dominante):** Representa los objetos o procesos núcleo. Posee identidad propia y, aunque contenga llaves foráneas de contexto (como `IdInstitucion` o `IdUsuario`), su existencia define una acción principal en el sistema.
- **Entidad Subordinada (Débil):** Entidad que detalla, configura o registra movimientos de una Maestra. Su información pierde sentido lógico si se elimina el registro "Padre" al que hace referencia en su jerarquía inmediata.
- **Relación (Asociativa/Puente):** Tabla técnica encargada de unir dos entidades independientes (Muchos a Muchos). No suele tener datos descriptivos, solo los IDs de las partes que conecta.

cuando es subordinada o relacion las dependencias las pongo en un () si es maestra puede que tenga foraneas tambien. pero es para dar mas detalles.

---

# FUNCIONAMIENTO GLOBAL DE LA BASE DE DATOS (Arquitectura y Lógica de Negocio)

El sistema **Bioterio Central (API-Driven)** opera bajo una arquitectura de **Jerarquía Relacional Institucional Multi-Tenant**. No es simplemente un registro de datos, sino un motor de estados que gestiona recursos biológicos, espacios físicos y flujos financieros en tiempo real.

A continuación, se detalla la orquestación de los datos en 6 pilares fundamentales:

### 1. Arquitectura de Identidad y Contexto (El "Quién" y el "Dónde")

El sistema disocia a la persona humana de sus credenciales y roles, permitiendo una existencia ubicua en la red de bioterios.

- **Identidad Fragmentada:** La entidad `personae` almacena al individuo (preferencias UI, datos de contacto), mientras que `usuarioe` almacena su credencial para una `institucion` específica. Esto permite que un mismo usuario sea "Administrador" en la Sede A y "Investigador" en la Sede B sin conflictos de seguridad.
- **Renderizado Dinámico:** La interfaz de usuario no es estática. El cruce de `tienetipor` (Rol) + `modulosactivosinst` (Licencia de la Institución) + `menudistr` (Configuración fina) determina en tiempo real qué endpoints y botones son accesibles, construyendo el menú al vuelo (`Dynamic Rendering`).

### 2. El Motor de Despliegue "Semilla" (GROBO Onboarding)

El sistema posee la capacidad de auto-construirse para nuevos clientes mediante el módulo GROBO.

- **Abstracción y Materialización:** Las tablas `form_registro_config` y `form_registro_respuestas` actúan como un entorno de *Staging*. El usuario define su arquitectura ideal (especies, roles, insumos) en un árbol lógico abstracto.
- **El "Big Bang":** Al finalizar la configuración, un proceso batch lee este árbol y realiza inserciones masivas en las tablas maestras (`especiee`, `insumo`, `tipousuarioe`), transformando "respuestas de texto" en "entidades relacionales operativas".

### 3. El "Gatekeeper" Legal y Financiero (Protocolos)

El `protocoloexpe` es la entidad rectora. Ninguna operación que implique gasto o uso de animales puede existir sin referenciar un protocolo válido.

- **Responsabilidad Dual:** El sistema distingue entre el Responsable Científico (texto libre) y el Responsable Financiero (`IdUsrA`). Todos los débitos automáticos atacan la billetera (`dinero`) de este usuario específico.
- **Candado de Cupos:** El sistema aplica una validación estricta de saldo biológico. Cada pedido validado descuenta del `CantidadAniA` del protocolo. Si el cupo es 0 o la fecha actual supera `FechaFinProtA`, el sistema bloquea la creación de nuevos `formularioe`.

### 4. Operativa Transaccional: El Pedido Polimórfico

La entidad `formularioe` actúa como un camaleón transaccional, cambiando su comportamiento y relaciones según el `tipoformularios` seleccionado:

- **Si es Animal Vivo:** Activa la calculadora biológica `sexoe`. La suma de `machoA` + `hembraA` + `indistintoA` genera el `totalA`, que es el valor que impacta en el stock y en el cupo del protocolo.
- **Si es Reactivo/Insumo:** Ignora la taxonomía y utiliza `forminsumo` o `reactivo` para gestionar cantidades físicas sin impactar (necesariamente) el cupo de vidas del protocolo.
- **Ciclo de Vida:** El campo `estado` gestiona la logística física mediante un flujo de 5 pasos: *Borrador -> Proceso -> Reservado (Hard Lock de Stock) -> Listo para Entrega -> Entregado (Generación de Deuda).*

### 5. Gestión de Larga Estancia (Alojamiento Jerárquico)

A diferencia de los pedidos (que son puntuales), el `alojamiento` gestiona tiempo y espacio mediante una estructura de árbol profundo:

- **Contrato vs. Realidad:** La entidad `alojamiento` define las reglas generales y quién paga. La entidad `alojamiento_caja` materializa el espacio físico ocupado.
- **Trazabilidad Unitaria:** La entidad `especie_alojamiento_unidad` permite identificar a cada animal individualmente dentro de una caja, y `observacion_alojamiento_unidad` permite registrar variables clínicas dinámicas (definidas previamente en `categoriadatosunidadalojamiento`) sin alterar la estructura de la base de datos (Modelo EAV simplificado).

### 6. Contabilidad de "Snapshot" (Congelamiento de Precios)

El sistema financiero está diseñado para ser inmune a la inflación o cambios de precios futuros sobre deudas pasadas.

- **Congelamiento:** En el momento en que un pedido pasa a "Entregado" o un alojamiento se cierra, el sistema copia el valor actual de los catálogos maestros (`precioanimalmomento`, `PreciomomentoInsumo`) y lo guarda en las tablas de deuda (`precioformulario`, `precioinsumosformulario`).
- **Deuda Segregada:** Se mantienen canales de deuda separados para "Biológicos" y "Logísticos", permitiendo imputaciones de pago parciales y específicas.
- **Auditoría de Doble Punta:** Cada transacción en `historialpago` registra obligatoriamente quién pagó (`IdUsrA`) y qué administrador ejecutó el cobro (`IdUsrAAdmin`), garantizando trazabilidad total ante arqueos de caja.