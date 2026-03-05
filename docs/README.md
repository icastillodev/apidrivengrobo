**Contexto del Proyecto (Bioterio Central):**
El sistema es una plataforma centralizada que gestiona múltiples Bioterios independientes pero interconectados.

- **Interconectividad:** Los bioterios pueden solicitarse formularios/insumos entre sí, realizar correcciones colaborativas y compartir recursos.
- **Dashboard Global:** Existe una capa de estadísticas avanzadas para ver el estado de todos los centros o de uno en particular.
- **Flujos de Trabajo:** Gestión de protocolos, pedidos, alojamientos y facturación, con un sistema de auditoría para las correcciones de formularios.

**Arquitectura y Estructura (Separación Estricta):**

- **`/api` (Backend):** Lógica pura de servidor.
    - `/config/database.php`: Conexión PDO y manejo de entorno.
    - `/src/Models`: Clases que representan las entidades (Bioterio, Usuario, Formulario, Insumo, etc.) y la lógica de datos. , obviamente esta separada.. por ejemplo estala carpeta Auth , en models… que tiene authmodel, authservice… como para separar las funciones del programa
    - `/src/Controllers`: Procesan las peticiones, validan permisos entre instituciones y devuelven **JSON**.
    - /src/Utils : aqui van todas las utilidades que vamos a utilizar… por ejemplo esta el router.php y tambien el envLoader, super necesarios
    - el programa tieneun inicio de autoload y routes para no cargar el index.php con todo… el routes.php se encuentra en la raiz donde se envian los get y post
    - `index.php`: Router principal de la API.
- **`/front` (Frontend):** Interfaz SPA (Single Page Application) conceptual.
    - Consumo de API mediante **Fetch API**.
    - Diseño con BOOSTRAP y un poco de **Tailwind CSS(solo el menu contiene)**.
    - Gestión de estados y UI dinámica con **JavaScript Vanilla**.
    - las carpeta se componen de index.html en root
    - carpetas: pages
    - assets: que contiene: js (aca van los js del sistema que traen los datos pero ademas tienen que estar estructurados por carpetas), multimedia(archivos,imagenes,videos) , style(css, sass)
    - resources: por ejemplo: tailwind, tipografia

**Requerimientos Técnicos:**

1. **Seguridad:** Validación de que un Bioterio "A" no pueda acceder a datos del Bioterio "B" a menos que haya una solicitud de interconexión activa.
2. **Escalabilidad:** Código modular y limpio (Clean Code) para permitir el crecimiento del sistema.
3. **Base de Datos:** Relaciones complejas (muchos a muchos) y optimización de consultas para estadísticas en tiempo real.

**Instrucciones de Interacción (Modo Escucha):**

1. **Respuesta Corta:** Por ahora, limítate a responder únicamente con la palabra "**OK**" a cada bloque de información que te envíe.
2. **Fase de Carga:** Te enviaré primero toda la estructura de la Base de Datos y las reglas de negocio de los formularios.
3. **Preguntas Críticas:** Al finalizar la carga de datos, antes de programar nada, deberás formular todas las preguntas técnicas o dudas sobre el flujo de trabajo (especialmente sobre la conexión entre bioterios) que necesites aclarar.

Introduccion al programa: GROBO

# **SISTEMA INTEGRAL DE GESTIÓN CIENTÍFICA (SRMS)**

*La plataforma definitiva para la gestión de Bioterios, Laboratorios y Redes Institucionales.*

---

## **1. GESTIÓN DE REDES Y MULTI-INSTITUCIÓN (NUEVO EJE CENTRAL)**

*Arquitectura diseñada no solo para instituciones aisladas, sino para ecosistemas científicos complejos.*

- **Integración de Redes Institucionales:** Capacidad única de conectar múltiples sedes bajo una misma red lógica (Ej: Red de Bioterios UDELAR). Permite la estandarización de procesos y la gestión centralizada manteniendo la independencia de cada nodo.
- **Movilidad del Investigador:** Un usuario puede pertenecer a una "Red" y realizar solicitudes o reservas en cualquiera de las instituciones vinculadas sin cambiar de usuario ni perder su historial.
- **Visión Global para Directores:** Los administradores de la red pueden obtener métricas consolidadas de todas las instituciones agrupadas, facilitando la toma de decisiones a nivel macro.

## **2. INTELIGENCIA DE NEGOCIOS Y ESTADÍSTICAS PROFUNDAS**

*Transformamos datos en decisiones. El módulo de análisis más potente del mercado.*

- **Dashboard de Alto Nivel:** Visualización gráfica e interactiva del estado real de la institución o de la red completa.
- **Proyecciones y Tendencias:** Análisis predictivo de consumo de animales y stock de insumos para evitar desabastecimiento.
- **Reportes de Eficiencia:** Comparativas de uso por protocolo, investigador o departamento. Detecta cuellos de botella y optimiza el uso de recursos.
- **Auditoría Total:** Exportación inmediata de cualquier gráfico o tabla a **Excel** (para análisis crudo) y **PDF** (para presentaciones ejecutivas y memorias anuales).

## **3. MÓDULO DE ALOJAMIENTO Y TRAZABILIDAD DINÁMICA**

*Control total desde la macro-gestión de salas hasta la micro-gestión del individuo.*

- **Micro-Tracking Individual:** Trazabilidad profunda de cada animal dentro de la caja. Registro de vida completo para garantizar la validez de los datos en *Papers*.
- **Ecosistema QR Móvil:** Etiquetas inteligentes (3 tamaños) para gestión al pie del rack con tablets o celulares.
- **Motor de Costos Automático:** Cálculo preciso de días de alojamiento y costos asociados en tiempo real.

## **4. MÓDULO DE ÉTICA Y PROTOCOLOS (CEUA)**

*El escudo legal de la institución. Garantiza el cumplimiento normativo.*

- **Validación en Tiempo Real:** Bloqueo automático de pedidos que no estén amparados por un protocolo ético vigente y con cupo disponible.
- **Workflow de Aprobación Digital:** Flujo ágil para la solicitud, revisión y aprobación de nuevos protocolos y enmiendas.

## **5. LOGÍSTICA DE ESPACIOS Y RESERVAS**

*Optimización de recursos físicos.*

- **Reservas Inteligentes:** Agenda digital para quirófanos y laboratorios.
- **Check-in por QR:** Escaneo en puerta para validar uso de sala o reservar en el momento si está libre.
- **Solicitud de Insumos:** Control de stock y dispensación de materiales fungibles asociada a proyectos.

## **6. ADMINISTRACIÓN FINANCIERA Y FACTURACIÓN**

*Transparencia total en el uso de fondos públicos y privados.*

- **Facturación Multinivel:** Motor contable flexible que permite liquidar gastos por:
    - **Investigador**
    - **Departamento/Cátedra**
    - **Protocolo** (Financiamiento específico)
- **Gestión de Roles Granular:** 4 niveles de seguridad (Admin, Secretaría, Técnico, Investigador) con menús 100% configurables.

## **7. EXPERIENCIA DE USUARIO (UX) Y ACCESIBILIDAD**

*Tecnología inclusiva y moderna.*

- **Comandos de Voz:** Operación "Manos Libres" para áreas estériles.
- **Accesibilidad Visual:** Tipografía ajustable (Grande/Mediana/Chica) y modos Dark/Light.
- **Buscador Global:** Localización instantánea de cualquier activo o dato en toda la red.
- **Soporte Multilingüe:** Nativo en Español, Inglés y Portugués.

---

### **AVAL INSTITUCIONAL**

*Software desarrollado y validado en colaboración con la **Unidad de Bioterios de la Universidad de la República (Udelar)**, garantizando excelencia académica y operativa.*