/**
 * MODAL: Ficha de Animales (Versión Final con Titular vs Solicitante)
 * Ubicación: js/pages/admin/facturacion/Modals/animalModal.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { formatBillingMoney } from '../billingLocale.js';

export const openAnimalModal = async (idformA) => {
    try {
        showLoader();
        const res = await API.request(`/billing/detail-animal/${idformA}`);
        hideLoader();

        const t = window.txt?.facturacion?.billing_modal || {};
        const g = window.txt?.generales || {};
        if (res.status !== 'success') {
            return Swal.fire(g.error || 'Error', t.err_animal || 'No se pudo cargar el detalle', 'error');
        }

        const d = res.data;
        const total = parseFloat(d.total_calculado || 0);
        const pagado = parseFloat(d.totalpago || 0);
        const saldo = parseFloat(d.saldoInv || 0);
        const descuento = parseFloat(d.descuento || 0);
        const debe = Math.max(0, total - pagado);

        // --- LÓGICA DE BADGES DE ESTADO Y BENEFICIOS ---
        let badgesHTML = '';
        if (d.is_exento == 1) {
            badgesHTML = `<span class="badge bg-info text-dark shadow-sm">${t.badge_exento || 'EXENTO'}</span>`;
        } else {
            if (debe <= 0 ) {
                badgesHTML += `<span class="badge bg-success shadow-sm">${t.badge_pago_completo || 'PAGO COMPLETO'}</span>`;
            } else if (pagado > 0) {
                badgesHTML += `<span class="badge bg-warning text-dark shadow-sm">${t.badge_pago_parcial || 'PAGO PARCIAL'}</span>`;
            } else {
                badgesHTML += `<span class="badge bg-danger shadow-sm">${t.badge_sin_pagar || 'SIN PAGAR'}</span>`;
            }
            if (descuento > 0) {
                const descTxt = (t.badge_desc_tpl || '-{pct}% DESC.').replace(/\{pct\}/g, String(descuento));
                badgesHTML += `<span class="badge bg-dark ms-1 shadow-sm">${descTxt}</span>`;
            }
        }

        const html = `
        <div class="modal fade" id="modalAnimal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    <div class="modal-header bg-dark text-white py-3">
                        <div class="d-flex align-items-center w-100 justify-content-between pe-4">
                            <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-medical me-2 text-success"></i>${(t.titulo_pedido_tpl || 'PEDIDO {id}').replace(/\{id\}/g, idformA)}</h5>
                            <div class="text-end">
                                <small class="text-white-50 d-block fw-bold uppercase" style="font-size: 10px;">${t.lbl_saldo_titular_protocolo || 'Saldo del Titular del Protocolo:'}</small>
                                <span class="badge bg-success fs-5" id="mdl-ani-saldo-txt">$ ${formatBillingMoney(saldo)}</span>
                                <input type="hidden" id="mdl-ani-saldo-val" value="${saldo}">
                            </div>
                        </div>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${g.aria_cerrar_dialogo || 'Close'}"></button>
                    </div>

                    <div class="modal-body p-4 bg-light">
                        <div class="row">
                            <div class="col-lg-7 border-end pe-4">
                                
                                <div class="mb-2 d-flex gap-1">
                                    ${badgesHTML}
                                </div>

                                <h6 class="text-success fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.sec_resp_prot || 'Información de Responsables y Protocolo'}</h6>
                                
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.lbl_titular_paga || 'Titular del Protocolo (Paga)'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 fw-bold text-primary fs-5">${d.titular_nombre || t.na || 'N/A'}</div>
                                        <div class="mt-1">
                                            <small class="text-muted"><i class="bi bi-person-badge me-1"></i>${t.lbl_hizo_pedido || 'Hizo el pedido:'} <b>${d.solicitante || t.na || 'N/A'}</b></small>
                                        </div>
                                    </div>

                                    <div class="col-md-7">
                                        <label class="small fw-bold text-muted">${t.lbl_tipo_pedido || 'TIPO DE PEDIDO'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0">${d.nombre_tipo || t.na || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-5">
                                        <label class="small fw-bold text-muted">${t.lbl_id_protocolo || 'ID PROTOCOLO:'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 fw-bold">${d.id_protocolo || '-'}</div>
                                    </div>
                                    <div class="col-12">
                                        <label class="small fw-bold text-muted">${t.lbl_nombre_protocolo || 'NOMBRE PROTOCOLO'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small text-truncate">${d.protocolo_info || t.na || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted">${t.lbl_especie_sub || 'ESPECIE / SUBESPECIE'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0">${d.taxonomia || '-'}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted">${t.lbl_edad_peso || 'EDAD / PESO'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small">${d.edad || '-'} / ${d.peso || '-'}</div>
                                    </div>

                                    <div class="col-12 mt-4">
                                        <div class="row g-2 text-center">
                                            <div class="col-3">
                                                <div class="p-2 bg-white border rounded shadow-sm">
                                                    <small class="d-block text-muted fw-bold" style="font-size: 9px;">${t.lbl_machos || 'MACHOS'}</small>
                                                    <span class="fs-5 fw-bold">${d.machos}</span>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="p-2 bg-white border rounded shadow-sm">
                                                    <small class="d-block text-muted fw-bold" style="font-size: 9px;">${t.lbl_hembras || 'HEMBRAS'}</small>
                                                    <span class="fs-5 fw-bold">${d.hembras}</span>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="p-2 bg-white border rounded shadow-sm">
                                                    <small class="d-block text-muted fw-bold" style="font-size: 9px;">${t.lbl_indistintos || 'INDISTINTOS'}</small>
                                                    <span class="fs-5 fw-bold">${d.indistintos}</span>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="p-2 bg-success text-white border rounded shadow-sm">
                                                    <small class="d-block fw-bold" style="font-size: 9px;">${t.lbl_total_animales || 'TOTAL ANIMALES'}</small>
                                                    <span class="fs-5 fw-bold">${d.cantidad}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-md-6 mt-3">
                                        <label class="small fw-bold text-muted">${t.lbl_fecha_inicio || 'FECHA INICIO'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small">${d.fecha_inicio || '-'}</div>
                                    </div>
                                    <div class="col-md-6 mt-3">
                                        <label class="small fw-bold text-muted">${t.lbl_fecha_retiro || 'FECHA RETIRO (REAL)'}</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small">${d.fecha_fin || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-5 ps-lg-4">
                                <h6 class="text-primary fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.sec_gestion_cobros || 'Gestión de Cobros'}</h6>
                                
                                <div class="mb-4 p-3 rounded" style="background-color: #fffde7; border: 1px solid #fff59d;">
                                    <label class="fw-bold small text-warning-emphasis uppercase" style="font-size: 10px;"><i class="bi bi-sticky me-1"></i>${t.lbl_aclaracion_admin || 'Aclaración Administrativa'}</label>
                                    <p class="mb-0 mt-2 small text-dark">${d.nota_admin}</p>
                                </div>

                                <div class="p-4 bg-white border rounded shadow-sm mb-4">
                                    <label class="form-label fw-bold text-primary small uppercase">Costo Total del Formulario</label>
                                    <div class="input-group input-group-lg">
                                        <span class="input-group-text bg-white border-end-0 fw-bold text-muted">$</span>
                                        <input type="number" id="mdl-ani-total" class="form-control border-start-0 fw-bold text-primary fs-4" value="${total.toFixed(2)}" readonly>
                                        <button class="btn btn-primary" type="button" onclick="window.toggleEditTotal(${idformA})">
                                            <i class="bi bi-pencil-fill"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="p-4 border rounded bg-white shadow-sm">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <span class="fw-bold text-muted small uppercase">${t.lbl_pagado_actualmente || 'PAGADO ACTUALMENTE:'}</span>
                                        <span class="fs-3 fw-bold text-success" id="mdl-ani-pagado-txt">$ ${formatBillingMoney(pagado)}</span>
                                        <input type="hidden" id="mdl-ani-pagado-val" value="${pagado}">
                                    </div>

                                    <div class="input-group">
                                        <input type="number" id="mdl-ani-monto-accion" class="form-control form-control-lg" placeholder="${t.ph_monto_mover || 'Monto a mover...'}">
                                        <button class="btn btn-success fw-bold px-4" onclick="window.ajustarPago('PAGAR', ${idformA})">${t.btn_pagar || 'PAGAR'}</button>
                                        <button class="btn btn-danger fw-bold px-4" onclick="window.ajustarPago('QUITAR', ${idformA})">${t.btn_quitar || 'QUITAR'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top-0 d-flex justify-content-between p-4">
                        <button class="btn btn-outline-danger btn-sm px-4 fw-bold" onclick="window.descargarFichaPDF(${idformA}, 'ANIMAL')">
                            <i class="bi bi-file-pdf me-2"></i>PDF
                        </button>
                        <button class="btn btn-secondary btn-sm px-4 fw-bold" data-bs-dismiss="modal">${t.btn_cerrar || 'CERRAR'}</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalAnimal');

    } catch (e) { console.error(e); }
};