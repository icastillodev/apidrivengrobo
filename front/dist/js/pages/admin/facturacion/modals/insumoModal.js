/**
 * MODAL: Insumos Experimentales (Uso Directo de Datos)
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';

export const openInsumoModal = async (idformA) => {
    try {
        showLoader();
        const res = await API.request(`/billing/detail-insumo/${idformA}`);
        hideLoader();

        if (res.status !== 'success') return Swal.fire('Error', 'No se pudo cargar', 'error');

        const d = res.data;
        const total = parseFloat(d.total_item || 0);
        const pagado = parseFloat(d.pagado || 0);
        const saldo = parseFloat(d.saldoInv || 0);
        const debe = Math.max(0, total - pagado);

        // Convertimos el separador "|" en una lista visual limpia
        const listaHtml = d.detalle_completo.split('|').map(item => 
            `<div class="border-bottom py-1 small"><i class="bi bi-check2 text-warning me-2"></i>${item.trim()}</div>`
        ).join('');

        const html = `
        <div class="modal fade" id="modalInsumo" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-dark text-white py-2">
                        <h5 class="modal-title small fw-bold">INSUMOS #${idformA}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <div class="row g-4">
                            <div class="col-md-7">
                                <label class="small fw-bold text-muted uppercase">Solicitante</label>
                                <div class="fw-bold text-primary mb-3">${d.solicitante}</div>
                                
                                <label class="small fw-bold text-muted uppercase">Detalle del Pedido</label>
                                <div class="bg-white border rounded p-3 shadow-sm mb-3">
                                    ${listaHtml}
                                </div>
                            </div>

                            <div class="col-md-5">
                                <div class="card border-0 shadow-sm mb-3">
                                    <div class="card-body p-3">
                                        <label class="small fw-bold text-muted d-block mb-2">SALDO DISPONIBLE</label>
                                        <div class="h4 fw-bold text-success">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</div>
                                        <input type="hidden" id="mdl-ins-saldo-val" value="${saldo}">
                                    </div>
                                </div>

                                <div class="p-3 bg-white border rounded mb-3">
                                    <label class="small fw-bold text-primary mb-1">COSTO TOTAL</label>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input type="number" id="mdl-ins-total" class="form-control fw-bold" value="${total.toFixed(2)}" readonly>
                                        <button class="btn btn-primary" onclick="window.toggleEditTotalIns(${idformA})"><i class="bi bi-pencil"></i></button>
                                    </div>
                                </div>

                                <div class="p-3 border rounded bg-white">
                                    <div class="d-flex justify-content-between mb-2">
                                        <span class="small fw-bold text-muted">PAGADO:</span>
                                        <span class="fw-bold text-success" id="mdl-ins-pagado-txt">$ ${pagado.toFixed(2)}</span>
                                        <input type="hidden" id="mdl-ins-pagado-val" value="${pagado}">
                                    </div>
                                    <input type="number" id="mdl-ins-monto-accion" class="form-control mb-2" placeholder="Monto...">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-success btn-sm fw-bold" onclick="window.ajustarPagoIns('PAGAR', ${idformA})">PAGAR</button>
                                        <button class="btn btn-danger btn-sm fw-bold" onclick="window.ajustarPagoIns('QUITAR', ${idformA})">QUITAR</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalInsumo');
    } catch (e) { console.error(e); hideLoader(); }
};