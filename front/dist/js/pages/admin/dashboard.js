import { getCorrectPath } from '../../components/menujs/MenuConfig.js';

export const DashboardUI = {
    async init() {
        try {
            this.renderAdminDashboard();
            try {
                const { injectDashboardNoticias } = await import('../../components/dashboardNoticias.js?v=20260712');
                await injectDashboardNoticias('dashboard-noticias-mount');
            } catch (e) {
                console.warn('Dashboard noticias:', e);
            }
        } catch (error) {
            console.error('Error cargando el Dashboard:', error);
            const t = window.txt?.admin_dashboard;
            document.getElementById('dashboard-grid').innerHTML = `
                <div class="col-12 alert alert-danger text-center shadow-sm border-0 font-bold">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i> ${t?.error_metricas || 'No se pudieron cargar las métricas.'}
                </div>
            `;
        }
    },

    renderAdminDashboard() {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;
        const t = window.txt?.admin_dashboard;

        const hrefMensajes = getCorrectPath('panel/mensajes');
        const hrefNoticias = getCorrectPath('admin/comunicacion/noticias');
        const hrefProtocolos = getCorrectPath('admin/protocolos');
        const hrefAnimales = getCorrectPath('admin/animales');
        const hrefReactivos = getCorrectPath('admin/reactivos');
        const hrefInsumos = getCorrectPath('admin/insumos');
        const hrefAlojamientos = getCorrectPath('admin/alojamientos');
        const hrefPrecios = getCorrectPath('admin/precios');
        const hrefEstadisticas = getCorrectPath('admin/estadisticas');

        const card = (href, iconWrap, icon, title, desc, dark = false) => `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden ${dark ? 'bg-dark text-white ' : ''}pointer transition-hover" onclick="window.location.href='${href}'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center ${dark ? 'align-items-center h-100' : ''}">
                        <div class="${dark ? 'rounded-circle d-flex align-items-center justify-content-center mb-3' : `${iconWrap} rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3`}" style="width: 65px; height: 65px;${dark ? ' background-color: rgba(255, 255, 255, 0.25);' : ''}">
                            <i class="bi ${icon} ${dark ? 'fs-1' : 'fs-2'}"></i>
                        </div>
                        <h5 class="fw-${dark ? 'bold' : 'black'} ${dark ? 'mb-1 tracking-tight' : 'text-dark mb-1'}">${title}</h5>
                        <span class="small ${dark ? 'opacity-75' : 'text-muted fw-semibold'}">${desc || ''}</span>
                    </div>
                    ${dark ? '' : `
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='${href}';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>`}
                </div>
            </div>`;

        grid.innerHTML = [
            card(hrefMensajes, 'bg-secondary-subtle text-secondary', 'bi-chat-dots', t?.card_mensajes || 'Mensajes', t?.card_mensajes_desc || ''),
            card(hrefNoticias, 'bg-success-subtle text-success', 'bi-newspaper', t?.card_noticias_admin || 'Noticias (administración)', t?.card_noticias_admin_desc || ''),
            card(hrefProtocolos, 'bg-primary-subtle text-primary', 'bi-file-earmark-medical', t?.card_protocolos || 'Protocolos', t?.card_protocolos_desc || 'Gestión de protocolos experimentales'),
            card(hrefAnimales, 'bg-success-subtle text-success', 'bi-bug', t?.card_animales || 'Pedidos de Animales', t?.card_animales_desc || 'Solicitudes y seguimiento'),
            card(hrefReactivos, 'bg-warning-subtle text-warning', 'bi-eyedropper', t?.card_reactivos || 'Reactivos Biológicos', t?.card_reactivos_desc || 'Gestión de sustancias y pedidos'),
            card(hrefInsumos, 'bg-info-subtle text-info', 'bi-box-seam', t?.card_insumos || 'Insumos', t?.card_insumos_desc || 'Materiales y equipamiento'),
            card(hrefAlojamientos, 'bg-secondary-subtle text-secondary', 'bi-houses-fill', t?.card_alojamientos || 'Alojamientos', t?.card_alojamientos_desc || 'Gestión de estadías y jaulas'),
            card(hrefPrecios, 'bg-danger-subtle text-danger', 'bi-currency-dollar', t?.card_precios || 'Precios', t?.card_precios_desc || 'Tarifas y valores del sistema'),
            card(hrefEstadisticas, '', 'bi-bar-chart-fill', t?.card_estadisticas || 'Estadísticas', t?.card_estadisticas_desc || 'Métricas operativas y financieras', true),
        ].join('');
    },
};
