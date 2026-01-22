/**
 * MODAL: Edición Fina de Reactivos
 * Ubicación: js/pages/admin/facturacion/Modals/reactivos/reactiveModal.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';

export const openReactiveModal = async (idformA) => {
    try {
        showLoader();
        // 1. Pedimos el detalle del reactivo
        const res = await API.request(`/billing/detail-reactive/${idformA}`);
        
        if (res.status !== 'success') {
            hideLoader();
            return Swal.fire('Error', 'No se pudo cargar el detalle del reactivo', 'error');
        }

        const d = res.data;

        // 2. PETICIÓN DE SALDO INDEPENDIENTE (Al dueño del dinero)
        const resSaldo = await API.request(`/billing/get-investigator-balance/${d.id_usr_protocolo}`);
        hideLoader();

        const total = parseFloat(d.total_calculado || 0);
        const pagado = parseFloat(d.totalpago || 0);
        const saldo = (resSaldo.status === 'success') ? parseFloat(resSaldo.data.SaldoDinero || 0) : 0;
        const debe = Math.max(0, total - pagado);

        // --- LÓGICA DE BADGES ---
        let badgeEstado = d.is_exento == 1 ? '<span class="badge bg-info text-dark shadow-sm">EXENTO</span>' : 
                          (debe <= 0 ? '<span class="badge bg-success shadow-sm">PAGO COMPLETO</span>' : 
                          (pagado > 0 ? '<span class="badge bg-warning text-dark shadow-sm">PAGO PARCIAL</span>' : 
                          '<span class="badge bg-danger shadow-sm">SIN PAGAR</span>'));

        const html = `
        <div class="modal fade" id="modalReactivo" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    
                    <div class="modal-header bg-dark text-white py-3">
                        <div class="d-flex align-items-center w-100 justify-content-between pe-4">
                            <h5 class="modal-title fw-bold"><i class="bi bi-vial me-2 text-info"></i>REACTIVO #${idformA}</h5>
                            <div class="text-end">
                                <small class="text-white-50 d-block fw-bold uppercase" style="font-size: 10px;">Saldo Disponible Titular:</small>
                                <span class="badge bg-success fs-5" id="mdl-rea-saldo-txt">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                                <input type="hidden" id="mdl-rea-saldo-val" value="${saldo}">
                            </div>
                        </div>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="modal-body p-4 bg-light">
                        <div class="row">
                            <div class="col-lg-7 border-end pe-4">
                                <div class="mb-3">${badgeEstado}</div>
                                
                                <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Información del Protocolo e Investigador</h6>
                                <div class="row g-3 mb-4">
                                    <div class="col-12">
                                        <label class="small fw-bold text-muted uppercase">Investigador Titular (Pagador)</label>
                                        <div class="form-control-plaintext border-bottom fw-bold text-primary">${d.titular_nombre || 'N/A'}</div>
                                    </div>
                                    <div class="col-12">
                                        <label class="small fw-bold text-muted uppercase">Protocolo Aprobado</label>
                                        <div class="form-control-plaintext border-bottom small">${d.protocolo_info || 'N/A'}</div>
                                    </div>
                                </div>

                                <h6 class="text-success fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Detalles del Insumo Biológico</h6>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted uppercase">Reactivo</label>
                                        <div class="form-control-plaintext border-bottom fw-bold">${d.nombre_reactivo || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="small fw-bold text-muted uppercase">Cant. (${d.presentacion_reactivo || 0} ${d.unidad_medida || 0})</label>
                                        <div class="form-control-plaintext border-bottom">${d.cantidad_organos || 0}</div>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="small fw-bold text-muted uppercase">Animales</label>
                                        <div class="form-control-plaintext border-bottom">${d.animales_usados || 0}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted uppercase">Retiro</label>
                                        <div class="form-control-plaintext border-bottom text-danger fw-bold">${d.fecha_fin || '-'}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted uppercase">Inicio</label>
                                        <div class="form-control-plaintext border-bottom text-danger fw-bold">${d.fecha_inicio || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-5 ps-lg-4">
                                <h6 class="text-primary fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Control Financiero</h6>
                                
                                <div class="p-3 bg-white border rounded shadow-sm mb-4">
                                    <label class="fw-bold small text-warning-emphasis uppercase" style="font-size: 10px;">Nota Administrativa</label>
                                    <p class="mb-0 mt-1 small text-muted">${d.nota_admin}</p>
                                </div>

                                <div class="p-3 bg-white border rounded shadow-sm mb-4">
                                    <label class="form-label fw-bold text-primary small uppercase">Costo Total</label>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input type="number" id="mdl-rea-total" class="form-control fw-bold text-primary fs-4" value="${total.toFixed(2)}" readonly>
                                        <button class="btn btn-primary" onclick="window.toggleEditTotalRea(${idformA})"><i class="bi bi-pencil-fill"></i></button>
                                    </div>
                                </div>

                                <div class="p-3 border rounded bg-white shadow-sm">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <span class="fw-bold text-muted small uppercase">PAGADO:</span>
                                        <span class="fs-3 fw-bold text-success" id="mdl-rea-pagado-txt">$ ${pagado.toFixed(2)}</span>
                                        <input type="hidden" id="mdl-rea-pagado-val" value="${pagado}">
                                    </div>
                                    <div class="input-group">
                                        <input type="number" id="mdl-rea-monto-accion" class="form-control" placeholder="Monto...">
                                        <button class="btn btn-success fw-bold px-3" onclick="window.ajustarPagoRea('PAGAR', ${idformA})">PAGAR</button>
                                        <button class="btn btn-danger fw-bold px-3" onclick="window.ajustarPagoRea('QUITAR', ${idformA})">QUITAR</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top-0 d-flex justify-content-between p-4">
                        <button class="btn btn-outline-danger btn-sm px-4 fw-bold" onclick="window.descargarFichaReaPDF(${idformA})">
                            <i class="bi bi-file-pdf me-2"></i>PDF
                        </button>
                        <button class="btn btn-secondary btn-sm px-4 fw-bold" data-bs-dismiss="modal">CERRAR</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalReactivo');

    } catch (e) { 
        console.error("Error en ReactiveModal:", e); 
        hideLoader(); 
    }
};