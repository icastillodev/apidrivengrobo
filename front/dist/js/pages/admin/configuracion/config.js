export function initConfigDashboard() {
    const t = window.txt?.config_hub_dashboard || {};
    const tHub = window.txt?.config_aloj_ubicacion || {};
    const instName = localStorage.getItem('NombreInst') || t.inst_fallback_display || 'la Institución';
    const lbl = document.getElementById('lbl-inst-name');
    if (lbl) lbl.innerText = instName;

    // Calculamos el path base dinámicamente
    const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '/URBE-API-DRIVEN/front/admin/configuracion/'
        : '/admin/configuracion/';

    const btnCfg = t.btn_configurar || 'Configurar';

    const modules = [
        {
            title: t.card_institucion_title || 'Institución',
            desc: t.card_institucion_desc || 'Datos generales, Logos, Correos, Servicios/Procesos y configuración de reportes PDF.',
            icon: 'bi-building', theme: 'theme-primary', border: 'border-primary',
            link: `${basePath}institucion`
        },
        {
            title: t.card_roles_title || 'Usuarios y Roles',
            desc: t.card_roles_desc || 'Gestión de permisos, alta de investigadores y roles de sistema.',
            icon: 'bi-people-fill', theme: 'theme-dark', border: 'border-dark',
            link: `${basePath}roles`
        },
        {
            title: t.card_departamentos_title || 'Departamentos',
            desc: t.card_departamentos_desc || 'Administración de áreas, laboratorios y centros de costos.',
            icon: 'bi-diagram-3', theme: 'theme-info', border: 'border-info',
            link: `${basePath}departamentos`
        },
        {
            title: t.card_especies_title || 'Especies y Cepas',
            desc: t.card_especies_desc || 'Catálogo de especies, subespecies (cepas) y sus precios base.',
            icon: 'bi-tencent-qq', theme: 'theme-success', border: 'border-success',
            link: `${basePath}especies`
        },
        {
            title: t.card_alojamientos_title || 'Alojamientos y Clínica',
            desc: t.card_alojamientos_desc || 'Tipos de cajas/jaulas por especie y variables de Historia Clínica (HC).',
            icon: 'bi-hospital', theme: 'theme-orange', border: 'border-warning',
            link: `${basePath}alojamientos`
        },
        {
            title: tHub.hub_card_title || t.card_alojamientos_title || 'Ubicación física de cajas',
            desc: tHub.hub_card_desc || t.card_alojamientos_desc || 'Catálogo jerárquico de ubicación para trazabilidad.',
            icon: 'bi-geo-alt', theme: 'theme-info', border: 'border-info',
            link: `${basePath}alojamientos-ubicacion`
        },
        {
            title: t.card_reservas_title || 'Reservas y Espacios',
            desc: t.card_reservas_desc || 'Gestión de Salones, Instrumentos y horarios disponibles (L-V).',
            icon: 'bi-calendar-range', theme: 'theme-pink', border: 'border-danger',
            link: `${basePath}reservas`
        },
        {
            title: t.card_protocolos_config_title || 'Protocolos Config',
            desc: t.card_protocolos_config_desc || 'Reglas de severidad, tipos de protocolos y validaciones.',
            icon: 'bi-file-medical', theme: 'theme-danger', border: 'border-danger',
            link: `${basePath}protocolos-config`
        },
        {
            title: t.card_tipos_form_title || 'Tipos Formularios',
            desc: t.card_tipos_form_desc || 'Configuración de solicitudes, descuentos y exenciones.',
            icon: 'bi-ui-checks', theme: 'theme-warning', border: 'border-warning',
            link: `${basePath}tipos-form`
        },
        {
            title: t.card_insumos_title || 'Insumos Grales.',
            desc: t.card_insumos_desc || 'Catálogo de insumos básicos (Cajas, viruta, alimento).',
            icon: 'bi-box-seam', theme: 'theme-teal', border: 'border-secondary',
            link: `${basePath}insumos`
        },
        {
            title: t.card_insumos_exp_title || 'Insumos Exp.',
            desc: t.card_insumos_exp_desc || 'Reactivos biológicos y materiales experimentales.',
            icon: 'bi-eyedropper', theme: 'theme-purple', border: 'border-primary',
            link: `${basePath}insumos-exp`
        }
    ];

    renderGrid(modules, btnCfg);
}

function renderGrid(modules, btnConfigurar) {
    const container = document.getElementById('config-grid');
    container.innerHTML = '';

    modules.forEach(m => {
        const borderClass = m.border ? `border-top border-5 ${m.border}` : '';

        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 col-xl-3';

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
                        ${btnConfigurar} <i class="bi bi-arrow-right ms-1"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}
