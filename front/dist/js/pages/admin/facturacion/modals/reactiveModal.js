/**
 * Gestión de Modal para Reactivos / Órganos
 */
import { API } from '../../../../api.js';

export const openReactiveModal = async (idformA) => {
    const res = await API.request(`/billing/detail-reactive/${idformA}`);
    if (res.status !== 'success') return;
    const d = res.data;

    const html = `
    <div class="modal fade" id="modalReactive" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content border-0">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="bi bi-flask-fill me-2"></i>Reactivo: ID ${idformA}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="small text-muted mb-3"><b>Concepto:</b> ${d.detalle}</p>
                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label small fw-bold">Precio del Formulario ($)</label>
                            <input type="number" id="mdl-rea-total" class="form-control" value="${d.preciototal}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold">Monto Pagado ($)</label>
                            <input type="number" id="mdl-rea-pago" class="form-control" value="${d.totalpago}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button class="btn btn-outline-danger btn-sm" onclick="window.descargarFichaPDF(${idformA}, 'REACTIVO')"><i class="bi bi-file-pdf"></i> Ficha</button>
                    <button class="btn btn-primary btn-sm" onclick="window.updateReactive(${idformA})">Actualizar Costos</button>
                </div>
            </div>
        </div>
    </div>`;
    renderAndShowModal(html, 'modalReactive');
};

window.updateReactive = async (id) => {
    const payload = { id, total: document.getElementById('mdl-rea-total').value, pago: document.getElementById('mdl-rea-pago').value };
    const res = await API.request('/billing/update-reactive', 'POST', payload);
    if(res.status === 'success') {
        bootstrap.Modal.getInstance(document.getElementById('modalReactive')).hide();
        window.cargarFacturacionDepto();
    }
};