export const DashboardSuperUI = {
    init() {
        this.renderGrid();
    },

    renderGrid() {
        const grid = document.getElementById('superadmin-grid');
        if(!grid) return;

        grid.innerHTML = `
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden transition-hover" style="cursor:pointer;" onclick="window.location.href='./instituciones'">
                    <div class="card-body p-4 text-center">
                        <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-buildings-fill fs-2"></i>
                        </div>
                        <h6 class="fw-bold text-dark text-uppercase">Instituciones</h6>
                        <span class="small text-muted">Gestión de Bioterios</span>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden transition-hover" style="cursor:pointer;" onclick="window.location.href='./usuario-global'">
                    <div class="card-body p-4 text-center">
                        <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-globe fs-2"></i>
                        </div>
                        <h6 class="fw-bold text-dark text-uppercase">Usuarios Globales</h6>
                        <span class="small text-muted">Directorio Maestro</span>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden transition-hover" style="cursor:pointer;" onclick="window.location.href='./formularioinstitucion'">
                    <div class="card-body p-4 text-center">
                        <div class="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-ui-checks-grid fs-2"></i>
                        </div>
                        <h6 class="fw-bold text-dark text-uppercase">Formularios</h6>
                        <span class="small text-muted">Plantillas y Secciones</span>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden transition-hover" style="cursor:pointer;" onclick="window.location.href='./bitacora'">
                    <div class="card-body p-4 text-center">
                        <div class="bg-dark-subtle text-dark rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-shield-lock-fill fs-2"></i>
                        </div>
                        <h6 class="fw-bold text-dark text-uppercase">Bitácora</h6>
                        <span class="small text-muted">Auditoría y Logs</span>
                    </div>
                </div>
            </div>
        `;
    }
};