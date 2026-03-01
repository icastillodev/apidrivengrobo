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
        } catch (error) {
            console.error("Error cargando el Dashboard:", error);
            document.getElementById('dashboard-grid').innerHTML = `
                <div class="col-12 alert alert-danger text-center shadow-sm border-0 font-bold">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i> No se pudieron cargar las métricas.
                </div>
            `;
        }
    },

    renderAdminDashboard() {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./protocolos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-file-earmark-medical fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Protocolos</h5>
                        <span class="small text-muted fw-semibold">Gestión de protocolos experimentales</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./protocolos';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./animales'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-bug fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Pedidos de Animales</h5>
                        <span class="small text-muted fw-semibold">Solicitudes y seguimiento</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./animales';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./reactivos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-eyedropper fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Reactivos Biológicos</h5>
                        <span class="small text-muted fw-semibold">Gestión de sustancias y pedidos</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./reactivos';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./insumos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-box-seam fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Insumos</h5>
                        <span class="small text-muted fw-semibold">Materiales y equipamiento</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./insumos';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./alojamientos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-secondary bg-opacity-10 text-secondary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-houses-fill fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Alojamientos</h5>
                        <span class="small text-muted fw-semibold">Gestión de estadías y jaulas</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./alojamientos';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden bg-dark text-white pointer transition-hover" onclick="window.location.href='./estadisticas'">
                    <div class="card-body p-4 d-flex flex-column justify-content-center align-items-center text-center h-100">
                        <div class="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-bar-chart-fill fs-1"></i>
                        </div>
                        <h5 class="fw-bold mb-1 tracking-tight">Estadísticas</h5>
                        <span class="small opacity-75">Métricas operativas y financieras</span>
                    </div>
                </div>
            </div>
        `;
    },


    // 🎯 Motor Inteligente: Si hay pedidos, rojo urgente. Si no, gris de navegación.
    generarBoton(cantidad, urlUrgente, urlNormal) {
        if (cantidad > 0) {
            return `
                <div class="card-footer bg-danger bg-opacity-10 border-0 p-0 position-relative" style="z-index: 2;">
                    <button class="btn btn-link text-danger text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-between align-items-center px-4" 
                            onclick="event.stopPropagation(); window.location.href='${urlUrgente}';">
                        <span style="font-size: 11px;" class="tracking-widest">PEDIDOS PARA RESPONDER</span>
                        <span class="badge bg-danger rounded-pill fs-6 px-3 shadow-sm">${cantidad}</span>
                    </button>
                </div>
            `;
        }
        
        // Si no hay pedidos pendientes (0), mostramos el botón gris neutro
        return `
            <div class="card-footer bg-light border-0 p-0 position-relative" style="z-index: 2;">
                <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center px-4" 
                        onclick="event.stopPropagation(); window.location.href='${urlNormal}';">
                    <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                </button>
            </div>
        `;
    }
};