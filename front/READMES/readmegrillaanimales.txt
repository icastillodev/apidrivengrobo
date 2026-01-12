📜 Documentación Técnica: Módulo Animales Vivos - GROBO

Este módulo gestiona las solicitudes de animales vivos en el Bioterio, permitiendo la administración de estados, edición de protocolos/especies, cálculos automatizados de costos y generación de reportes legales (PDF/Excel).
🛠️ 1. Arquitectura y Tecnologías

    Arquitectura: API-Driven (Separación total de Frontend y Backend).

    Frontend: HTML5, Bootstrap 5.3, JavaScript Modular (ES6).

    Backend: PHP Procedural migrado a API REST con PDO.

    Librerías Clave:

        SweetAlert2: Notificaciones y popups de entrada de datos.

        html2pdf.js: Generación de fichas técnicas en PDF.

        PHPMailer: Motor de envío de correos electrónicos (Configurado para SMTP).

🗄️ 2. Entidades y Base de Datos (Relaciones)

El sistema se basa en una estructura relacional que garantiza que solo se puedan pedir especies aprobadas por el comité de ética (CEUA).
Tablas Principales:

    formularioe: Cabecera del pedido (ID, Usuario, Estado, Fecha Inicio/Retiro, Aclaraciones).

    protesper: Tabla intermedia que vincula los Protocolos con las Especies aprobadas para ese proyecto específico.

    especiee: Definición de la especie (ej: Ratón, Rata, Cobayo) y sus precios base.

    subespecie: Variedades específicas (ej: Ratona con camada, Adulto). Regla de negocio: Si existe = 2, la especie está inactiva y no aparece en el sistema.

    tipoformularios: Define si el pedido es de "Docencia", "Investigación", etc. Contiene los campos exento (1/0) y descuento (valor numérico).

    notificacione: Historial de correos enviados al investigador.

💻 3. Lógica del Frontend (animales.js)
A. Gestión de Precios y Totales

El sistema calcula el costo en tiempo real mediante el evento oninput en los campos de Machos, Hembras e Indistintos.

    Fórmula: Total=Machos+Hembras+Indistintos.

    Exención: Si el tipo de formulario tiene exento = 1, el precio final se fuerza a 0.00 y se muestra un aviso visual.

    Descuento: Si existe un porcentaje de descuento, se aplica sobre el subtotal (Total×PrecioUnitario).

B. Solución de Conflictos de Foco (Escritura en Popups)

Se detectó que el "enforce focus" de Bootstrap bloqueaba el teclado en SweetAlert2.

    Solución: Al abrir la notificación, se cambia temporalmente la configuración del modal de Bootstrap: modalInstance._config.focus = false.

C. Generación de PDF Personalizado

Para evitar errores con imágenes SVG y buscadores, el PDF se genera mediante un Template de String HTML propio.

    Seguridad: Se limpian los estilos de backgroundImage para evitar el error "Unsupported image type" de html2canvas.

    Identidad: El encabezado se construye dinámicamente como GROBO - [NOMBRE_INSTITUCIÓN].

D. Exportación a Excel (CSV)

    Separador: Se utiliza punto y coma (;) para compatibilidad con Excel en español.

    Formato de Fecha: Se utiliza el prefijo ="texto" para evitar que las fechas se muestren como numerales (####).

📩 4. Servicio de Notificaciones (Backend)

    Modelo: saveNotificationAndGetMailDetails registra la nota en la base de datos y recupera los correos del Investigador y del Administrador logueado.

    Servicio de Mail: Se utiliza PHPMailer con autenticación SMTP (TLS) para garantizar la entrega.

    Plantilla: El correo se envía en formato HTML con diseño responsivo, incluyendo los detalles del pedido y el estado actual.

🎨 5. Estilos y UI (Interfaz GROBO)

    Barra de Acciones: Se implementó un contenedor d-flex donde los buscadores ocupan el espacio izquierdo y los botones de acción (Excel/Ayuda) se empujan a la derecha con ms-auto.

    Estados (Badges): Cada estado tiene un color distintivo (Proceso: azul, Entregado: verde, Suspendido: rojo, Reservado: cian).

    Ayuda: El modal de ayuda utiliza el verde institucional #1a5d3b y una estructura de ítems con bordes inferiores para máxima legibilidad.

    Nota para el programador: Siempre que se realice una recarga de página tras un guardado exitoso, el sistema utiliza sessionStorage.setItem('reopenAnimalId', id) para que el módulo de inicio vuelva a disparar automáticamente el modal del pedido que se estaba editando.