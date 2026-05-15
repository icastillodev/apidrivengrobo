/**
 * MODAL: Insumos Experimentales (Uso Directo de Datos)
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { formatBillingMoney, billingPdfFormularioIdDisplay, billingPdfMarcaExentoLarga, billingInsumoMontoTotalCobrable } from '../billingLocale.js';

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
        const tituloIdIns = billingPdfFormularioIdDisplay(d, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() });
        const total = billingInsumoMontoTotalCobrable(d);
        const pagado = parseFloat(d.pagado || 0);
        const saldo = parseFloat(d.saldoInv || 0);
        const debe = Math.max(0, total - pagado);

        const derIns = d.es_facturacion_derivada === true || d.es_facturacion_derivada == 1 || d.es_facturacion_derivada === '1';
        const puedeTotalIns = d.puede_editar_precios_linea === true || d.puede_editar_precios_linea === 1;
        const blockTotalIns = (d.is_exento === true || d.is_exento == 1 || d.exento == 1) || derIns || !puedeTotalIns;
        const hintAutoSaveIns = String(t.hint_total_auto_save || '').replace(/"/g, '&quot;');
        const hintGuardarBtnIns = String(t.hint_guardar_total_btn || '').replace(/"/g, '&quot;');
        const totalInputAttrsIns = blockTotalIns
            ? 'readonly disabled step="0.01" min="0" inputmode="decimal"'
            : `data-billing-total-orig="${total.toFixed(2)}" step="0.01" min="0" inputmode="decimal" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="window.billingPersistTotalBlur('INSUMO',${idformA},'mdl-ins-total')" title="${hintAutoSaveIns}"`;

        const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        const lineas = Array.isArray(d.lineas) ? d.lineas : [];
        const puedeLineas = d.puede_editar_precios_linea === true || d.puede_editar_precios_linea === 1;
        const thIns = t.ins_th_insumo || 'Insumo';
        const thCant = t.ins_th_cant || 'Cant.';
        const thPu = t.ins_th_precio_unit || 'P. unit.';
        const thSub = t.ins_th_subtotal || 'Subtotal';

        let detalleBloque;
        if (lineas.length > 0) {
            const hint = puedeLineas && t.ins_hint_precio_linea
                ? `<p class="small text-muted mb-2">${esc(t.ins_hint_precio_linea)}</p>`
                : '';
            const theadExtra = puedeLineas ? `<th class="text-center" style="width:52px"></th>` : '';
            const filas = lineas.map((ln) => {
                const pid = Number(ln.id_forminsumo);
                const nom = esc(ln.nombre_insumo);
                const um = esc(ln.unidad_medida || '');
                const cant = esc(String(ln.cantidad));
                const sub = formatBillingMoney(ln.subtotal_linea);
                const pNum = Number(ln.precio_unitario || 0);
                const pVal = pNum.toFixed(2);
                if (puedeLineas) {
                    return `<tr>
                        <td class="text-start small">${nom}${um ? `<br><span class="text-muted">${um}</span>` : ''}</td>
                        <td class="text-end small">${cant}</td>
                        <td class="text-end" style="min-width:108px">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text">$</span>
                                <input type="number" step="0.01" min="0" class="form-control" id="mdl-ins-line-precio-${pid}" value="${pVal}">
                            </div>
                        </td>
                        <td class="text-end small fw-bold">$ ${sub}</td>
                        <td class="text-center">
                            <button type="button" class="btn btn-sm btn-success" onclick="window.guardarPrecioLineaInsumo(${pid}, ${idformA})" title="${esc(t.ins_btn_aplicar_precio || 'Aplicar')}">
                                <i class="bi bi-check-lg"></i>
                            </button>
                        </td>
                    </tr>`;
                }
                return `<tr>
                    <td class="text-start small">${nom}${um ? `<br><span class="text-muted">${um}</span>` : ''}</td>
                    <td class="text-end small">${cant}</td>
                    <td class="text-end small">$ ${formatBillingMoney(ln.precio_unitario)}</td>
                    <td class="text-end small fw-bold">$ ${sub}</td>
                </tr>`;
            }).join('');
            detalleBloque = `${hint}<div class="table-responsive"><table class="table table-sm table-bordered align-middle mb-0 bg-white">
                <thead class="table-light"><tr>
                    <th>${thIns}</th>
                    <th class="text-end">${thCant}</th>
                    <th class="text-end">${thPu}</th>
                    <th class="text-end">${thSub}</th>
                    ${theadExtra}
                </tr></thead>
                <tbody>${filas}</tbody>
            </table></div>`;
        } else {
            detalleBloque = (String(d.detalle_completo || '').split('|').map((item) =>
                `<div class="border-bottom py-1 small"><i class="bi bi-check2 text-warning me-2"></i>${esc(item.trim())}</div>`
            ).join(''));
        }

        const html = `
        <div class="modal fade" id="modalInsumo" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-dark text-white py-2">
                        <h5 class="modal-title small fw-bold">${(t.titulo_insumos_tpl || 'INSUMOS {id}').replace(/\{id\}/g, tituloIdIns)}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${g.aria_cerrar_dialogo || 'Close'}"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <div class="row g-4">
                            <div class="col-md-7">
                                <label class="small fw-bold text-muted uppercase">${t.lbl_solicitante || 'Solicitante'}</label>
                                <div class="fw-bold text-primary mb-3">${d.solicitante}</div>
                                
                                <label class="small fw-bold text-muted uppercase">${t.lbl_detalle_pedido || 'Detalle del Pedido'}</label>
                                <div class="bg-white border rounded p-3 shadow-sm mb-3">
                                    ${detalleBloque}
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
                                        <input type="number" id="mdl-ins-total" class="form-control fw-bold" value="${total.toFixed(2)}" ${totalInputAttrsIns}>
                                        <button class="btn btn-primary" type="button" ${blockTotalIns ? 'disabled' : ''} onclick="window.toggleEditTotalIns(${idformA})" title="${hintGuardarBtnIns}"><i class="bi bi-pencil"></i></button>
                                    </div>
                                </div>

                                <div class="p-3 border rounded bg-white">
                                    <div class="d-flex justify-content-between mb-2">
                                        <span class="small fw-bold text-muted">${t.lbl_pagado_line || 'PAGADO:'}</span>
                                        <span class="fw-bold text-success" id="mdl-ins-pagado-txt">$ ${formatBillingMoney(pagado)}</span>
                                        <input type="hidden" id="mdl-ins-pagado-val" value="${pagado}">
                                        <input type="hidden" id="mdl-ins-exento" value="${(d.is_exento === true || d.is_exento == 1 || d.exento == 1) ? '1' : '0'}">
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