import { API } from '../../api.js';

export const DashboardUI = {
    async init() {
        try {
            // 🔜 Mockup de datos. Luego lo conectaremos al backend.
            const stats = {
                protocolos: { total: 45, solicitudes: 3 },
                animales: { total: 120, solicitudes: 8 },
                reactivos: { total: 34, solicitudes: 0 }, // 0 = Mostrará botón gris
                insumos: { total: 89, solicitudes: 2 }
            };

            this.renderAdminDashboard(stats);
            try {
                const { injectDashboardNoticias } = await import('../../components/dashboardNoticias.js');
                await injectDashboardNoticias('dashboard-noticias-mount');
            } catch (e) {
                console.warn('Dashboard noticias:', e);
            }
        } catch (error) {
            console.error("Error cargando el Dashboard:", error);
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

        grid.innerHTML = `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='../panel/mensajes'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-chat-dots fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_mensajes || 'Mensajes'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_mensajes_desc || ''}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='../panel/mensajes';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./comunicacion/noticias'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-newspaper fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_noticias_admin || 'Noticias (administración)'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_noticias_admin_desc || ''}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./comunicacion/noticias';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./protocolos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-file-earmark-medical fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_protocolos || 'Protocolos'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_protocolos_desc || 'Gestión de protocolos experimentales'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./protocolos';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./animales'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-bug fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_animales || 'Pedidos de Animales'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_animales_desc || 'Solicitudes y seguimiento'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./animales';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./reactivos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-eyedropper fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_reactivos || 'Reactivos Biológicos'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_reactivos_desc || 'Gestión de sustancias y pedidos'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./reactivos';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./insumos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-info-subtle text-info rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-box-seam fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_insumos || 'Insumos'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_insumos_desc || 'Materiales y equipamiento'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./insumos';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./alojamientos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-houses-fill fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_alojamientos || 'Alojamientos'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_alojamientos_desc || 'Gestión de estadías y jaulas'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./alojamientos';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./precios'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-danger-subtle text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-currency-dollar fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t?.card_precios || 'Precios'}</h5>
                        <span class="small text-muted fw-semibold">${t?.card_precios_desc || 'Tarifas y valores del sistema'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./precios';">
                            <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden bg-dark text-white pointer transition-hover" onclick="window.location.href='./estadisticas'">
                    <div class="card-body p-4 d-flex flex-column justify-content-center align-items-center text-center h-100">
                        <div class="rounded-circle d-flex align-items-center justify-content-center mb-3" style="background-color: rgba(255, 255, 255, 0.25); width: 65px; height: 65px;">
                            <i class="bi bi-bar-chart-fill fs-1"></i>
                        </div>
                        <h5 class="fw-bold mb-1 tracking-tight">${t?.card_estadisticas || 'Estadísticas'}</h5>
                        <span class="small opacity-75">${t?.card_estadisticas_desc || 'Métricas operativas y financieras'}</span>
                    </div>
                </div>
            </div>
        `;
    },


    // 🎯 Motor Inteligente: Si hay pedidos, rojo urgente. Si no, gris de navegación.
    generarBoton(cantidad, urlUrgente, urlNormal) {
        const t = window.txt?.admin_dashboard;
        if (cantidad > 0) {
            return `
                <div class="card-footer bg-danger-subtle border-0 p-0 position-relative" style="z-index: 2;">
                    <button class="btn btn-link text-danger text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-between align-items-center px-4" 
                            onclick="event.stopPropagation(); window.location.href='${urlUrgente}';">
                        <span style="font-size: 11px;" class="tracking-widest">${t?.btn_pedidos_responder || 'PEDIDOS PARA RESPONDER'}</span>
                        <span class="badge bg-danger rounded-pill fs-6 px-3 shadow-sm">${cantidad}</span>
                    </button>
                </div>
            `;
        }

        return `
            <div class="card-footer bg-light border-0 p-0 position-relative" style="z-index: 2;">
                <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center px-4" 
                        onclick="event.stopPropagation(); window.location.href='${urlNormal}';">
                    <span style="font-size: 11px;" class="tracking-widest">${t?.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                </button>
            </div>
        `;
    }
};