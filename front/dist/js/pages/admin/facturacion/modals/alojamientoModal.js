/**
 * Gestión de Modal para Alojamientos (Estadía) — vista legacy administrativa
 */
import { API } from '../../../../api.js';

export const openAlojamientoModal = async (historia) => {
    const t = window.txt?.facturacion?.billing_modal || {};
    const g = window.txt?.generales || {};
    const res = await API.request(`/billing/detail-alojamiento/${historia}`);
    if (res.status !== 'success') {
        return Swal.fire(g.error || 'Error', res.message || t.err_aloj_legacy_carga || 'No se pudo cargar el alojamiento.', 'error');
    }
    const d = res.data;
    const title = (t.aloj_legacy_modal_title_tpl || 'Alojamiento — Historia {id}').replace(/\{id\}/g, String(historia));

    const html = `
    <div class="modal fade" id="modalAloj" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content border-0">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title"><i class="bi bi-calendar-check me-2"></i>${title}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${g.aria_cerrar_dialogo || 'Cerrar'}"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold">${t.aloj_legacy_lbl_dias || 'Días totales'}</label>
                            <input type="number" id="mdl-aloj-dias" class="form-control" value="${d.totaldiasdefinidos}">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold">${t.aloj_legacy_lbl_cuenta || 'Cuenta a pagar ($)'}</label>
                            <input type="number" id="mdl-aloj-total" class="form-control" value="${d.cuentaapagar}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold">${t.aloj_legacy_lbl_liquidado || 'Monto liquidado ($)'}</label>
                            <input type="number" id="mdl-aloj-pago" class="form-control" value="${d.totalpago}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="window.descargarFichaPDF(${historia}, 'ALOJ')"><i class="bi bi-file-pdf"></i> ${t.aloj_legacy_btn_pdf || 'Ficha'}</button>
                    <button type="button" class="btn btn-dark btn-sm" onclick="window.updateAlojamiento(${historia})">${t.aloj_legacy_btn_guardar || 'Guardar registro'}</button>
                </div>
            </div>
        </div>
    </div>`;
    window.renderAndShowModal(html, 'modalAloj');
};

window.updateAlojamiento = async (historia) => {
    const t = window.txt?.facturacion?.billing_modal || {};
    const g = window.txt?.generales || {};
    const payload = {
        historia,
        dias: document.getElementById('mdl-aloj-dias').value,
        total: document.getElementById('mdl-aloj-total').value,
        pago: document.getElementById('mdl-aloj-pago').value
    };
    const res = await API.request('/billing/update-alojamiento', 'POST', payload);
    if (res.status !== 'success') {
        return Swal.fire(g.error || 'Error', res.message || t.err_aloj_legacy_guardar || 'No se pudo guardar el registro.', 'error');
    }
    bootstrap.Modal.getInstance(document.getElementById('modalAloj'))?.hide();
    if (typeof window.recargarGrillaActiva === 'function') window.recargarGrillaActiva();
    else if (typeof window.cargarFacturacionDepto === 'function') window.cargarFacturacionDepto();
    const okMsg = (t.aloj_legacy_ok_msg_tpl || '').replace(/\{id\}/g, String(historia));
    await Swal.fire({
        title: t.aloj_legacy_ok_titulo || window.txt?.facturacion?.billing_item_modal?.guardado_ok || g.swal_ok,
        text: okMsg || undefined,
        icon: 'success',
        timer: 1600,
        showConfirmButton: false
    });
};
