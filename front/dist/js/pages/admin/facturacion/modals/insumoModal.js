/**
 * Gestión de Modal para Insumos Generales
 */
import { API } from '../../../../api.js';

export const openInsumoModal = async (idformA) => {
    const res = await API.request(`/billing/detail-insumo/${idformA}`);
    if (res.status !== 'success') return;
    const d = res.data;

    const html = `
    <div class="modal fade" id="modalInsumo" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content border-0">
                <div class="modal-header bg-info text-dark">
                    <h5 class="modal-title"><i class="bi bi-box-seam-fill me-2"></i>Insumo: ID ${idformA}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <label class="form-label small fw-bold">Costo Total del Insumo ($)</label>
                    <input type="number" id="mdl-ins-total" class="form-control mb-3" value="${d.preciototal}">
                    <label class="form-label small fw-bold">Pagado hasta la fecha ($)</label>
                    <input type="number" id="mdl-ins-pago" class="form-control" value="${d.totalpago}">
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button class="btn btn-outline-danger btn-sm" onclick="window.descargarFichaPDF(${idformA}, 'INSUMO')"><i class="bi bi-file-pdf"></i> Ficha</button>
                    <button class="btn btn-info btn-sm" onclick="window.updateInsumo(${idformA})">Guardar Cambios</button>
                </div>
            </div>
        </div>
    </div>`;
    renderAndShowModal(html, 'modalInsumo');
};

window.updateInsumo = async (id) => {
    const payload = { id, total: document.getElementById('mdl-ins-total').value, pago: document.getElementById('mdl-ins-pago').value };
    await API.request('/billing/update-insumo', 'POST', payload);
    bootstrap.Modal.getInstance(document.getElementById('modalInsumo')).hide();
    window.cargarFacturacionDepto();
};