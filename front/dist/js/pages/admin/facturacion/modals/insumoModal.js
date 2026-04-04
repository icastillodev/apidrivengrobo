/**
 * MODAL: Insumos Experimentales (Uso Directo de Datos)
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { formatBillingMoney } from '../billingLocale.js';

export const openInsumoModal = async (idformA) => {
    try {
        showLoader();
        const res = await API.request(`/billing/detail-insumo/${idformA}`);
        hideLoader();

        const t = window.txt?.facturacion?.billing_modal || {};
        const g = window.txt?.generales || {};
        if (res.status !== 'success') {
            return Swal.fire(g.error || 'Error', t.err_insumo || 'No se pudo cargar', 'error');
        }

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
                        <h5 class="modal-title small fw-bold">${(t.titulo_insumos_tpl || 'INSUMOS {id}').replace(/\{id\}/g, idformA)}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${g.aria_cerrar_dialogo || 'Close'}"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <div class="row g-4">
                            <div class="col-md-7">
                                <label class="small fw-bold text-muted uppercase">${t.lbl_solicitante || 'Solicitante'}</label>
                                <div class="fw-bold text-primary mb-3">${d.solicitante}</div>
                                
                                <label class="small fw-bold text-muted uppercase">${t.lbl_detalle_pedido || 'Detalle del Pedido'}</label>
                                <div class="bg-white border rounded p-3 shadow-sm mb-3">
                                    ${listaHtml}
                                </div>
                            </div>

                            <div class="col-md-5">
                                <div class="card border-0 shadow-sm mb-3">
                                    <div class="card-body p-3">
                                        <label class="small fw-bold text-muted d-block mb-2">${t.lbl_saldo_disponible_uc || 'SALDO DISPONIBLE'}</label>
                                        <div class="h4 fw-bold text-success">$ ${formatBillingMoney(saldo)}</div>
                                        <input type="hidden" id="mdl-ins-saldo-val" value="${saldo}">
                                    </div>
                                </div>

                                <div class="p-3 bg-white border rounded mb-3">
                                    <label class="small fw-bold text-primary mb-1">${(t.lbl_costo_total_uc || 'COSTO TOTAL').toUpperCase()}</label>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input type="number" id="mdl-ins-total" class="form-control fw-bold" value="${total.toFixed(2)}" readonly>
                                        <button class="btn btn-primary" onclick="window.toggleEditTotalIns(${idformA})"><i class="bi bi-pencil"></i></button>
                                    </div>
                                </div>

                                <div class="p-3 border rounded bg-white">
                                    <div class="d-flex justify-content-between mb-2">
                                        <span class="small fw-bold text-muted">${t.lbl_pagado_line || 'PAGADO:'}</span>
                                        <span class="fw-bold text-success" id="mdl-ins-pagado-txt">$ ${formatBillingMoney(pagado)}</span>
                                        <input type="hidden" id="mdl-ins-pagado-val" value="${pagado}">
                                    </div>
                                    <input type="number" id="mdl-ins-monto-accion" class="form-control mb-2" placeholder="${t.ph_monto || 'Monto...'}">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-success btn-sm fw-bold" onclick="window.ajustarPagoIns('PAGAR', ${idformA})">${t.btn_pagar || 'PAGAR'}</button>
                                        <button class="btn btn-danger btn-sm fw-bold" onclick="window.ajustarPagoIns('QUITAR', ${idformA})">${t.btn_quitar || 'QUITAR'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top d-flex justify-content-between p-3">
                        <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.descargarFichaInsPDF(${idformA})">
                            <i class="bi bi-file-pdf me-2"></i>${t.btn_pdf || 'PDF'}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm fw-bold" data-bs-dismiss="modal">${t.btn_cerrar || 'CERRAR'}</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalInsumo');
    } catch (e) { console.error(e); hideLoader(); }
};