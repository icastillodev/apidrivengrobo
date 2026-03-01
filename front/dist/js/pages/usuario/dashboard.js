export const DashboardUI = {
    async init() {
        this.renderUserDashboard();
    },

    renderUserDashboard() {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./formularios'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-plus-square-dotted fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Nuevo Formulario</h5>
                        <span class="small text-muted fw-semibold">Iniciar una nueva solicitud</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./formularios';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./mis-formularios'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-ui-checks fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Mis Formularios</h5>
                        <span class="small text-muted fw-semibold">Historial de solicitudes</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./misformularios';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./mis-protocolos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-file-medical fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Mis Protocolos</h5>
                        <span class="small text-muted fw-semibold">Protocolos experimentales</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./misprotocolos';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='./mis-alojamientos'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-houses fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">Mis Alojamientos</h5>
                        <span class="small text-muted fw-semibold">Trazabilidad y estadías</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='./misalojamientos';">
                            <span style="font-size: 11px;" class="tracking-widest">IR AL MÓDULO <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};