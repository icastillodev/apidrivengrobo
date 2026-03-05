## 🦎 Metodología de Desarrollo: Gecko Dev (Bioterio Project)

Este documento define el estándar arquitectónico y técnico para el desarrollo del ecosistema "Bioterio".

### 1. Arquitectura del Sistema: API-Driven

El sistema se divide estrictamente en dos mundos que se comunican exclusivamente vía JSON:

- **Backend (PHP):** Actúa como una API pura. No renderiza HTML.
- **Frontend (JS/Bootstrap):** Es una aplicación desacoplada que consume la API, gestiona el estado y renderiza componentes dinámicamente.

### 2. Estándar de Backend: La Triple Capa (MVC + S)

Para garantizar la escalabilidad y el testeo, cada funcionalidad debe dividirse en tres responsabilidades:

1. **Controller (El Orquestador):**
    - Recibe la `Request` (POST/GET).
    - Limpia los buffers (`ob_clean`).
    - Llama al **Service**.
    - Devuelve la `Response` en formato JSON con un `status` y `message`.
2. **Service (El Cerebro / Business Logic):**
    - Aquí reside la inteligencia.
    - Valida reglas de negocio (ej: si un nombre está duplicado).
    - Procesa datos (ej: generar slugs, encriptar claves, calcular estadísticas).
    - Decide si la operación es lícita antes de tocar la base de datos.
3. **Model (La Persistencia):**
    - SQL Puro y duro usando PDO.
    - No sabe nada de lógica de negocio ni de sesiones.
    - Su única misión es ejecutar consultas (Select, Insert, Update, Delete) y devolver datos crudos.

### 3. Estándar de Frontend: Componentes e Interactividad

- **Bootstrap:** Se trabaja con full boostrap
- **Componentes JS:** El HTML se genera dinámicamente mediante plantillas en JavaScript (`MenuComponent.js`, etc.).
- **Gestión de Permisos:** El menú y las vistas se construyen según el `roleId` e `instId` almacenados en `localStorage`, session y cookie dependiendo el auth.

### 4. Flujo de Trabajo (Workflow)

1. **Definición de Rutas:** Se configura el `.htaccess` para manejar rutas amigables (ej: `/admingrobogecko`).
2. **API First:** Se construye el endpoint antes que la interfaz.

### 

**Interconectividad Financiera:** Cuando un Bioterio solicita recursos a otro, ¿el descuento de saldo en la tabla dinero se realiza en el contexto de la institución de origen o existe una cuenta corriente inter-institucional?

el dinero por persona es por institucion

**Validación de Stock vs. Saldo:** En los formularios de Reactivos/Animales, ¿el sistema debe impedir la creación del pedido si no hay saldo suficiente, o solo bloquea el cambio de estado a "Entregado"?

si no hay sdaldo suficiente de animales, debe impedirlo si.

**Lógica de Superadmin:** Para el Dashboard Global, ¿el Superadmin utiliza un IdInstitucion específico (ej: 0) para bypassar el aislamiento de datos y consolidar las estadísticas de todos los centros?

superadmin... no necesita estar en una institucion, es el unico que no necesita tener institucion.. los demas todos si.

**Nuevas Entidades:** ¿La nueva sección requiere la creación de tablas adicionales o se basará exclusivamente en las existentes (agregando quizás campos de relación en formularioe)?

esta seria la deifnitiva base de datos... pero siempre se esta abierto a nuevos atraibutos o entidades... pero asi esta bien.