/**
 * Gestión de Modal para Alojamientos (Estadía)
 */
import { API } from '../../../../api.js';

export const openAlojamientoModal = async (historia) => {
    const res = await API.request(`/billing/detail-alojamiento/${historia}`);
    if (res.status !== 'success') return;
    const d = res.data;

    const html = `
    <div class="modal fade" id="modalAloj" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content border-0">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title"><i class="bi bi-calendar-check me-2"></i>Alojamiento: Hist. ${historia}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold">Días Totales</label>
                            <input type="number" id="mdl-aloj-dias" class="form-control" value="${d.totaldiasdefinidos}">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold">Cuenta a Pagar ($)</label>
                            <input type="number" id="mdl-aloj-total" class="form-control" value="${d.cuentaapagar}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold">Monto Liquidado ($)</label>
                            <input type="number" id="mdl-aloj-pago" class="form-control" value="${d.totalpago}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button class="btn btn-outline-danger btn-sm" onclick="window.descargarFichaPDF(${historia}, 'ALOJ')"><i class="bi bi-file-pdf"></i> Ficha</button>
                    <button class="btn btn-dark btn-sm" onclick="window.updateAlojamiento(${historia})">Guardar Registro</button>
                </div>
            </div>
        </div>
    </div>`;
    renderAndShowModal(html, 'modalAloj');
};

window.updateAlojamiento = async (historia) => {
    const payload = { historia, dias: document.getElementById('mdl-aloj-dias').value, total: document.getElementById('mdl-aloj-total').value, pago: document.getElementById('mdl-aloj-pago').value };
    await API.request('/billing/update-alojamiento', 'POST', payload);
    bootstrap.Modal.getInstance(document.getElementById('modalAloj')).hide();
    window.cargarFacturacionDepto();
};