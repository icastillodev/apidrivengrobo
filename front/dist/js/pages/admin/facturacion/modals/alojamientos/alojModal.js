/**
 * MODAL: Gestión Financiera de Alojamiento
 * Ubicación: js/pages/admin/facturacion/Modals/alojamientos/alojModal.js
 */
import { API } from '../../../../../api.js';
import { hideLoader, showLoader } from '../../../../../components/LoaderComponent.js';
import { formatBillingMoney, getBillingDateLocale } from '../../billingLocale.js';

function bmTpl(str, map) {
    if (!str) return '';
    return str.replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? String(map[k]) : `{${k}}`));
}

export const openAlojModal = async (historiaId) => {
    try {
        showLoader();
        const t = window.txt?.facturacion?.billing_modal || {};
        const g = window.txt?.generales || {};
        const dateLoc = localeParaFechasFacturacion();

        const resAloj = await API.request(`/alojamiento/history?historia=${historiaId}`);

        if (resAloj.status !== 'success' || !resAloj.data.length) {
            hideLoader();
            return Swal.fire(g.error || 'Error', t.err_aloj_no_estadia || 'No se encontró la estadía.', 'error');
        }

        const history = resAloj.data;
        const first = history[0];

        const idPagador = first.IdTitularProtocolo || first.idprotA;
        const titularNombre = first.TitularNombre || bmTpl(t.aloj_titular_fallback_tpl || 'Titular (ID: {id})', { id: idPagador });
        const respEstadia = first.Investigador || t.aloj_sin_asignar || 'Sin asignar';

        const resSaldo = await API.request(`/billing/get-investigator-balance/${idPagador}`);
        hideLoader();

        const saldoReal = (resSaldo.status === 'success' && resSaldo.data)
            ? parseFloat(resSaldo.data.SaldoDinero || 0)
            : 0;

        const tipoAlojamiento = first.NombreTipoAlojamiento || t.aloj_estructura_default || 'Estructura Estándar';
        const precioActual = parseFloat(first.PrecioCajaMomento || 0);

        const { tramos, diasTotales, costoHistoricoTotal } = procesarTramosFinancieros(history, dateLoc, t.aloj_estado_vigente || 'VIGENTE');

        let totalPagadoHistorico = 0;
        history.forEach(h => {
            totalPagadoHistorico += parseFloat(h.totalpago || 0);
        });

        const html = `
        <div class="modal fade" id="modalAlojamiento" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    
                    ${renderHeader(historiaId, saldoReal, titularNombre, t, g)}

                    <div class="modal-body p-4 bg-light">
                        <div class="row">
                            <div class="col-lg-7 border-end pe-4">
                                <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.aloj_sec_responsabilidades || 'Responsabilidades'}</h6>
                                <div class="row mb-4 bg-white p-2 rounded shadow-sm border">
                                    <div class="col-6 border-end">
                                        <label class="small text-muted d-block uppercase fw-bold" style="font-size: 10px;">${t.aloj_lbl_titular_paga_c || 'Titular (Paga):'}</label>
                                        <strong class="text-primary fs-6">${titularNombre}</strong>
                                    </div>
                                    <div class="col-6">
                                        <label class="small text-muted d-block uppercase fw-bold" style="font-size: 10px;">${t.aloj_lbl_resp_estadia_c || 'Resp. Estadía:'}</label>
                                        <span class="fs-6 fw-semibold text-secondary">${respEstadia}</span>
                                    </div>
                                </div>
                                ${renderResumenTecnico(first, tipoAlojamiento, precioActual, tramos, t)}
                            </div>
                            <div class="col-lg-5 ps-lg-4">
                                ${renderGestionCobros(historiaId, diasTotales, costoHistoricoTotal, totalPagadoHistorico, t)}
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top-0 d-flex justify-content-between p-4">
                        <button class="btn btn-outline-danger btn-sm px-4 fw-bold" onclick="window.descargarFichaAlojPDF(${historiaId})">
                            <i class="bi bi-file-pdf me-2"></i>${t.btn_pdf || 'PDF'}
                        </button>
                        <button class="btn btn-secondary btn-sm px-4 fw-bold" data-bs-dismiss="modal">${t.btn_cerrar || 'CERRAR'}</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalAlojamiento');

    } catch (e) {
        console.error("Error en AlojModal:", e);
        hideLoader();
    }
};

function renderHeader(id, saldo, titularNombre, t, g) {
    const gen = g || window.txt?.generales || {};
    const titulo = (t.aloj_modal_titulo_tpl || 'ALOJAMIENTO {id}').replace(/\{id\}/g, String(id));
    const dineroLbl = bmTpl(t.aloj_dinero_de_tpl || 'Dinero de {nombre}:', { nombre: titularNombre });
    return `
    <div class="modal-header bg-dark text-white py-3">
        <div class="d-flex align-items-center w-100 justify-content-between pe-4">
            <h5 class="modal-title fw-bold"><i class="bi bi-house-door me-2 text-info"></i>${titulo}</h5>
            <div class="text-end">
                <small class="text-white-50 d-block fw-bold uppercase" style="font-size: 10px;">${dineroLbl}</small>
                <span class="badge bg-success fs-5" id="mdl-aloj-saldo-txt">$ ${formatBillingMoney(saldo)}</span>
                <input type="hidden" id="mdl-aloj-saldo-val" value="${saldo}">
            </div>
        </div>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${gen.aria_cerrar_dialogo || 'Close'}"></button>
    </div>`;
}

function renderResumenTecnico(first, tipoAlojamiento, precio, tramos, t) {
    return `
    <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.aloj_sec_resumen_tecnico || 'Resumen Técnico'}</h6>
    <div class="row g-3 mb-4">
        <div class="col-md-6">
            <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.aloj_lbl_inv_resp_estadia || 'Investigador Resp. Estadía'}</label>
            <div id="pdf-aloj-inv" class="form-control-plaintext border-bottom fw-bold text-dark">${first.Investigador || (t.na || 'N/A')}</div>
        </div>
        <div class="col-md-3 text-center">
            <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.aloj_lbl_tipo_alojamiento || 'Tipo Alojamiento'}</label>
            <div id="pdf-aloj-tipo" class="form-control-plaintext border-bottom fw-bold text-secondary text-truncate">${tipoAlojamiento}</div>
        </div>
        <div class="col-md-3 text-center">
            <label class="small fw-bold text-muted text-primary uppercase" style="font-size: 10px;">${t.aloj_lbl_precio_momento || 'Precio Momento'}</label>
            <div class="form-control-plaintext border-bottom fw-bold text-primary">$ ${formatBillingMoney(precio)}</div>
        </div>
        <div class="col-12 mt-1">
            <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.aloj_lbl_protocolo || 'Protocolo'}</label>
            <div id="pdf-aloj-prot" class="form-control-plaintext border-bottom small">${first.nprotA}</div>
        </div>
    </div>
    <div class="table-responsive bg-white rounded border shadow-sm">
        <table id="table-aloj-tramos" class="table table-sm table-hover align-middle mb-0 text-center">
            <thead class="bg-light text-muted small uppercase">
                <tr><th>${t.aloj_th_id || 'ID'}</th><th>${t.aloj_th_desde || 'Desde'}</th><th>${t.aloj_th_hasta || 'Hasta'}</th><th>${t.aloj_th_cant || 'Cant.'}</th><th>${t.aloj_th_dias || 'Días'}</th><th class="text-end pe-2">${t.aloj_th_subtotal || 'Subtotal'}</th></tr>
            </thead>
            <tbody class="small">
                ${tramos.map(tr => `
                    <tr>
                        <td class="ps-2 text-start text-muted">#${tr.id}</td>
                        <td>${tr.desde}</td>
                        <td class="${tr.esVigente ? 'text-success fw-bold' : ''}">${tr.hasta}</td>
                        <td class="fw-bold">${tr.cajas}</td>
                        <td class="fw-bold text-info">${tr.dias}</td>
                        <td class="text-end pe-2 fw-bold text-dark">$ ${formatBillingMoney(tr.subtotal)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
}

function renderGestionCobros(historiaId, dias, total, pagado, t) {
    return `
    <h6 class="text-primary fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.aloj_sec_control_cobros || 'Control de Cobros'}</h6>
    <div class="p-3 bg-white border rounded mb-3 text-center shadow-sm">
        <label class="small fw-bold text-muted d-block uppercase">${t.aloj_lbl_dias_totales || 'Días Totales de Estadía'}</label>
        <span id="pdf-aloj-dias" class="display-6 fw-bold text-info">${dias}</span>
    </div>
    <div class="p-3 bg-white border rounded mb-3 shadow-sm">
        <label class="form-label fw-bold text-primary small uppercase">${t.aloj_lbl_costo_total_pagar || 'Costo Total a Pagar'}</label>
        <div class="input-group input-group-lg">
            <span class="input-group-text">$</span>
            <input type="number" id="mdl-aloj-total" class="form-control fw-bold text-primary fs-4" value="${total.toFixed(2)}" readonly>
            <button class="btn btn-primary" onclick="window.toggleEditTotalAloj(${historiaId})"><i class="bi bi-pencil-fill"></i></button>
        </div>
    </div>
    <div class="p-3 border rounded bg-white shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="fw-bold text-muted small uppercase">${t.aloj_lbl_total_pagado_uc || 'TOTAL PAGADO:'}</span>
            <span class="fs-3 fw-bold text-success" id="mdl-aloj-pagado-txt">$ ${formatBillingMoney(pagado)}</span>
            <input type="hidden" id="mdl-aloj-pagado-val" value="${pagado}">
        </div>
        <div class="input-group">
            <input type="number" id="mdl-aloj-monto-accion" class="form-control form-control-lg" placeholder="${t.ph_monto || 'Monto...'}">
            <button class="btn btn-success fw-bold px-4" onclick="window.ajustarPagoAloj('PAGAR', ${historiaId})">${t.btn_pagar || 'PAGAR'}</button>
            <button class="btn btn-danger fw-bold px-4" onclick="window.ajustarPagoAloj('QUITAR', ${historiaId})">${t.btn_quitar || 'QUITAR'}</button>
        </div>
    </div>`;
}

function procesarTramosFinancieros(history, locale, vigenteLabel) {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    let diasTotales = 0;
    let costoHistoricoTotal = 0;

    const tramos = history.map(h => {
        const pIni = h.fechavisado.split('-');
        const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
        let fFin = !h.hastafecha ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1] - 1, h.hastafecha.split('-')[2], 12, 0, 0);

        const dias = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));

        const cant = parseInt(h.CantidadCaja || 0);
        const precio = parseFloat(h.PrecioCajaMomento || 0);

        const subtotal = parseFloat(h.cuentaapagar) > 0 ? parseFloat(h.cuentaapagar) : (dias * precio * cant);

        diasTotales += dias;
        costoHistoricoTotal += subtotal;

        return {
            id: h.IdAlojamiento,
            desde: fIni.toLocaleDateString(locale),
            hasta: !h.hastafecha ? vigenteLabel : fFin.toLocaleDateString(locale),
            cajas: cant,
            dias: dias,
            subtotal: subtotal,
            esVigente: !h.hastafecha
        };
    });
    return { tramos, diasTotales, costoHistoricoTotal };
}
