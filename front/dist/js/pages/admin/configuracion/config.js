export function initConfigDashboard() {
    // 1. Nombre Institución
    const instName = localStorage.getItem('NombreInst') || 'la Institución';
    const lbl = document.getElementById('lbl-inst-name');
    if(lbl) lbl.innerText = instName;

    // 2. Definición de Módulos (Data Driven)
    const modules = [
        {
            title: "Institución",
            desc: "Datos generales, logo, correos de contacto y firma institucional.",
            icon: "bi-building",
            theme: "theme-primary",
            border: "border-primary",
            link: "institucion.html"
        },
        {
            title: "Usuarios y Roles",
            desc: "Gestión de permisos, alta de investigadores y roles de sistema.",
            icon: "bi-people-fill",
            theme: "theme-dark",
            border: "border-dark",
            link: "roles.html"
        },
        {
            title: "Departamentos",
            desc: "Administración de áreas, laboratorios y centros de costos.",
            icon: "bi-diagram-3",
            theme: "theme-info",
            border: "border-info",
            link: "departamentos.html"
        },
        {
            title: "Especies / Subespecies",
            desc: "Catálogo biológico, cepas disponibles y lista de precios.",
            icon: "bi-tencent-qq", // Icono similar a animal/mascota
            theme: "theme-success",
            border: "border-success",
            link: "especies.html"
        },
        {
            title: "Protocolos Config",
            desc: "Reglas de severidad, tipos de protocolos y validaciones.",
            icon: "bi-file-medical",
            theme: "theme-danger",
            border: "border-danger",
            link: "protocolos-config.html"
        },
        {
            title: "Tipos Formularios",
            desc: "Configuración de solicitudes, descuentos y exenciones.",
            icon: "bi-ui-checks",
            theme: "theme-warning",
            border: "border-warning",
            link: "tipos-form.html"
        },
        {
            title: "Insumos Grales.",
            desc: "Catálogo de insumos básicos (Cajas, viruta, alimento).",
            icon: "bi-box-seam",
            theme: "theme-teal",
            border: "border-secondary", // Teal border custom si quieres
            link: "insumos.html"
        },
        {
            title: "Insumos Exp.",
            desc: "Reactivos biológicos y materiales experimentales.",
            icon: "bi-eyedropper",
            theme: "theme-purple",
            border: "border-primary", // O un borde morado si defines la clase
            link: "insumos-exp.html"
        }
    ];

    renderGrid(modules);
}

function renderGrid(modules) {
    const container = document.getElementById('config-grid');
    container.innerHTML = '';

    modules.forEach(m => {
        // Usamos las clases de borde de bootstrap: border-primary, etc.
        const borderClass = m.border ? `border-top border-5 ${m.border}` : '';

        const col = document.createElement('div');
        col.className = "col-md-6 col-lg-4 col-xl-3"; // Responsive Grid
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm card-config-option p-4 text-center ${borderClass}" onclick="location.href='${m.link}'">
                <div class="icon-circle mx-auto ${m.theme}">
                    <i class="bi ${m.icon}"></i>
                </div>
                <h6 class="fw-bold uppercase mb-2 text-dark">${m.title}</h6>
                <p class="text-muted mb-4" style="font-size: 11px; line-height: 1.4;">
                    ${m.desc}
                </p>
                <div class="mt-auto">
                    <button class="btn btn-sm btn-light w-100 btn-select shadow-sm text-muted">
                        Configurar <i class="bi bi-arrow-right ms-1"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}