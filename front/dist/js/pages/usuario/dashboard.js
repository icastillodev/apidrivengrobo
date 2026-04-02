import { getCorrectPath } from '../../components/menujs/MenuConfig.js';

function dashboardModuleBase() {
    const p = window.location.pathname || '';
    return /\/panel\//.test(p) ? 'panel' : 'usuario';
}

export const DashboardUI = {
    async init() {
        this.renderUserDashboard();
        try {
            const { injectDashboardNoticias } = await import('../../components/dashboardNoticias.js');
            await injectDashboardNoticias('dashboard-noticias-mount');
        } catch (e) {
            console.warn('Dashboard noticias:', e);
        }
    },

    renderUserDashboard() {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;
        const t = window.txt?.dashboard || {};
        const base = dashboardModuleBase();
        const hrefForm = getCorrectPath(`${base}/formularios`);
        const hrefMisForm = getCorrectPath(`${base}/misformularios`);
        const hrefMisProt = getCorrectPath(`${base}/misprotocolos`);
        const hrefMisAloj = getCorrectPath(`${base}/misalojamientos`);
        const hrefMensajes = getCorrectPath('panel/mensajes');

        grid.innerHTML = `
            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='${hrefMensajes}'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-chat-dots fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t.card_mensajes || 'Mensajes'}</h5>
                        <span class="small text-muted fw-semibold">${t.card_mensajes_desc || ''}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='${hrefMensajes}';">
                            <span style="font-size: 11px;" class="tracking-widest">${t.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='${hrefForm}'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-plus-square-dotted fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t.card_nuevo_form || 'Nuevo Formulario'}</h5>
                        <span class="small text-muted fw-semibold">${t.card_nuevo_form_desc || 'Iniciar una nueva solicitud'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='${hrefForm}';">
                            <span style="font-size: 11px;" class="tracking-widest">${t.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='${hrefMisForm}'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-ui-checks fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t.card_mis_form || 'Mis Formularios'}</h5>
                        <span class="small text-muted fw-semibold">${t.card_mis_form_desc || 'Historial de solicitudes'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='${hrefMisForm}';">
                            <span style="font-size: 11px;" class="tracking-widest">${t.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='${hrefMisProt}'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-info-subtle text-info rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-file-medical fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t.card_mis_prot || 'Mis Protocolos'}</h5>
                        <span class="small text-muted fw-semibold">${t.card_mis_prot_desc || 'Protocolos experimentales'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='${hrefMisProt}';">
                            <span style="font-size: 11px;" class="tracking-widest">${t.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.location.href='${hrefMisAloj}'">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-houses fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t.card_mis_aloj || 'Mis Alojamientos'}</h5>
                        <span class="small text-muted fw-semibold">${t.card_mis_aloj_desc || 'Trazabilidad y estadías'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.location.href='${hrefMisAloj}';">
                            <span style="font-size: 11px;" class="tracking-widest">${t.btn_ir_modulo || 'IR AL MÓDULO'} <i class="bi bi-arrow-right ms-1"></i></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden pointer transition-hover" onclick="window.openTarifarioPDFDashboard()">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
                        <div class="bg-danger-subtle text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 65px; height: 65px;">
                            <i class="bi bi-file-earmark-pdf fs-2"></i>
                        </div>
                        <h5 class="fw-black text-dark mb-1">${t.card_precios || 'Precios'}</h5>
                        <span class="small text-muted fw-semibold">${t.card_precios_desc || 'Tarifario vigente'}</span>
                    </div>
                    <div class="card-footer bg-light border-0 p-0">
                        <button class="btn btn-link text-muted text-decoration-none w-100 rounded-0 fw-bold py-3 d-flex justify-content-center align-items-center" onclick="event.stopPropagation(); window.openTarifarioPDFDashboard();">
                            <i class="bi bi-file-earmark-pdf me-2"></i><span style="font-size: 11px;" class="tracking-widest">${t.btn_ver_tarifario || 'VER TARIFARIO'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};

window.openTarifarioPDFDashboard = async () => {
    try {
        const mod = await import('../../services/PreciosService.js');
        if (mod?.PreciosService?.downloadUniversalPDF) {
            mod.PreciosService.downloadUniversalPDF();
        }
    } catch (error) {
        console.error('No se pudo abrir el tarifario PDF:', error);
    }
};