/**
 * MODAL: Gestión Financiera de Alojamiento
 * Ubicación: js/pages/admin/facturacion/Modals/alojamientos/alojModal.js
 */
import { API } from '../../../../../api.js';
import { hideLoader, showLoader } from '../../../../../components/LoaderComponent.js';
import { formatBillingMoney, getBillingDateLocale, htmlAlojCobroBadge } from '../../billingLocale.js';

function bmTpl(str, map) {
    if (!str) return '';
    return str.replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? String(map[k]) : `{${k}}`));
}

export const openAlojModal = async (historiaId) => {
    try {
        showLoader();
        const t = window.txt?.facturacion?.billing_modal || {};
        const g = window.txt?.generales || {};
        const hid = parseInt(String(historiaId ?? '').trim(), 10);
        if (!Number.isFinite(hid) || hid <= 0) {
            hideLoader();
            return Swal.fire(g.error || 'Error', t.err_aloj_no_estadia || 'No se encontró la estadía.', 'error');
        }
        const res = await API.request(`/billing/detail-alojamiento/${hid}`, 'GET', null, { cache: 'no-store' });
        if (res.status !== 'success' || !res.data) {
            hideLoader();
            return Swal.fire(g.error || 'Error', res.message || t.err_aloj_no_estadia || 'No se encontró la estadía.', 'error');
        }
        hideLoader();

        const detalle = res.data;
        const first = detalle.estadia || {};
        const trazHabilitada = !!detalle.trazabilidad_habilitada;
        const modoEstadia = detalle.alojamiento_cobro_modo;
        const titularNombre = first.TitularNombre || bmTpl(t.aloj_titular_fallback_tpl || 'Titular (ID: {id})', { id: detalle.id_pagador });
        const respEstadia = first.Investigador || t.aloj_sin_asignar || 'Sin asignar';
        const tipoAlojamiento = first.NombreTipoAlojamiento || t.aloj_estructura_default || 'Estructura Estándar';
        const precioActual = Number(first.PrecioCajaMomento) || 0;
        const dateLoc = getBillingDateLocale();
        const tramos = detalle.tramos.map(tr => ({
            ...tr,
            desde: formatFechaTramo(tr.desde, dateLoc),
            hasta: tr.vigente ? (t.aloj_estado_vigente || 'VIGENTE') : formatFechaTramo(tr.hasta, dateLoc),
        }));

        const html = `
        <div class="modal fade" id="modalAlojamiento" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    
                    ${renderHeader(hid, detalle.saldo, titularNombre, t, g)}

                    <div class="modal-body p-4 bg-light">
                        <div class="row">
                            <div class="col-lg-7 border-end pe-4">
                                <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.aloj_sec_responsabilidades || 'Responsabilidades'}</h6>
                                <div class="row mb-4 bg-white p-2 rounded shadow-sm border">
                                    <div class="col-6 border-end">
                                        <label class="small text-muted d-block uppercase fw-bold" style="font-size: 10px;">${t.aloj_lbl_titular_paga_c || 'Titular (Paga):'}</label>
                                        <strong class="text-primary fs-6">${escapeAloj(titularNombre)}</strong>
                                    </div>
                                    <div class="col-6">
                                        <label class="small text-muted d-block uppercase fw-bold" style="font-size: 10px;">${t.aloj_lbl_resp_estadia_c || 'Resp. Estadía:'}</label>
                                        <span class="fs-6 fw-semibold text-secondary">${escapeAloj(respEstadia)}</span>
                                    </div>
                                </div>
                                ${renderResumenTecnico(first, tipoAlojamiento, precioActual, tramos, t, { trazabilidad_habilitada: trazHabilitada, alojamiento_cobro_modo: modoEstadia })}
                            </div>
                            <div class="col-lg-5 ps-lg-4">
                                ${renderGestionCobros(hid, detalle, t)}
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top-0 d-flex justify-content-between p-4">
                        <button class="btn btn-outline-danger btn-sm px-4 fw-bold" onclick="window.descargarFichaAlojPDF(${hid})">
                            <i class="bi bi-file-pdf me-2"></i>${t.btn_pdf || 'PDF'}
                        </button>
                        <button class="btn btn-secondary btn-sm px-4 fw-bold" data-bs-dismiss="modal">${t.btn_cerrar || 'CERRAR'}</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalAlojamiento');

    } catch (e) {
        console.error('Error en AlojModal:', e);
        hideLoader();
        const t = window.txt?.facturacion?.billing_modal || {};
        const g = window.txt?.generales || {};
        const msg = t.err_aloj_modal_error || 'No se pudo abrir el alojamiento. Recargue la página o intente de nuevo.';
        if (window.Swal) {
            Swal.fire(g.error || 'Error', msg, 'error');
        }
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
                <small class="text-white-50 d-block fw-bold uppercase" style="font-size: 10px;">${escapeAloj(dineroLbl)}</small>
                <span class="badge bg-success fs-5" id="mdl-aloj-saldo-txt">$ ${formatBillingMoney(saldo)}</span>
                <input type="hidden" id="mdl-aloj-saldo-val" value="${saldo}">
            </div>
        </div>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${gen.aria_cerrar_dialogo || 'Close'}"></button>
    </div>`;
}

function renderResumenTecnico(first, tipoAlojamiento, precio, tramos, t, cobro = {}) {
    const cobroBadge = cobro?.trazabilidad_habilitada
        ? `<div class="col-12"><span class="small text-muted me-2">${t.aloj_lbl_como_se_cobra || ''}</span>${htmlAlojCobroBadge(cobro.alojamiento_cobro_modo)}</div>`
        : '';
    const cantTh = cobro?.trazabilidad_habilitada && cobro.alojamiento_cobro_modo === 'SUJETO'
        ? (t.aloj_th_sujetos || 'Sujetos')
        : (t.aloj_th_cant || 'Cant.');
    return `
    <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.aloj_sec_resumen_tecnico || 'Resumen Técnico'}</h6>
    <div class="row g-3 mb-4">
        ${cobroBadge}
        <div class="col-md-6">
            <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.aloj_lbl_inv_resp_estadia || 'Investigador Resp. Estadía'}</label>
            <div id="pdf-aloj-inv" class="form-control-plaintext border-bottom fw-bold text-dark">${escapeAloj(first.Investigador || t.na || 'N/A')}</div>
        </div>
        <div class="col-md-3 text-center">
            <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.aloj_lbl_tipo_alojamiento || 'Tipo Alojamiento'}</label>
            <div id="pdf-aloj-tipo" class="form-control-plaintext border-bottom fw-bold text-secondary text-truncate">${escapeAloj(tipoAlojamiento)}</div>
        </div>
        <div class="col-md-3 text-center">
            <label class="small fw-bold text-muted text-primary uppercase" style="font-size: 10px;">${t.aloj_lbl_precio_momento || 'Precio Momento'}</label>
            <div class="form-control-plaintext border-bottom fw-bold text-primary">$ ${formatBillingMoney(precio)}</div>
        </div>
        <div class="col-12 mt-1">
            <label class="small fw-bold text-muted uppercase" style="font-size: 10px;">${t.aloj_lbl_protocolo || 'Protocolo'}</label>
            <div id="pdf-aloj-prot" class="form-control-plaintext border-bottom small">${escapeAloj(first.nprotA ?? '—')}</div>
        </div>
    </div>
    <div class="table-responsive bg-white rounded border shadow-sm">
        <table id="table-aloj-tramos" class="table table-sm table-hover align-middle mb-0 text-center">
            <thead class="bg-light text-muted small uppercase">
                <tr><th>${t.aloj_th_id || 'ID'}</th><th>${t.aloj_th_desde || 'Desde'}</th><th>${t.aloj_th_hasta || 'Hasta'}</th><th>${cantTh}</th><th>${t.aloj_th_dias || 'Días'}</th><th class="text-end pe-2">${t.aloj_th_subtotal || 'Subtotal'}</th></tr>
            </thead>
            <tbody class="small">
                ${tramos.map(tr => `
                    <tr>
                        <td class="ps-2 text-start text-muted">#${tr.id}</td>
                        <td>${tr.desde}</td>
                        <td class="${tr.vigente ? 'text-success fw-bold' : ''}">${tr.hasta}</td>
                        <td class="fw-bold">${tr.cantidad}</td>
                        <td class="fw-bold text-info">${tr.dias}</td>
                        <td class="text-end pe-2 fw-bold text-dark">$ ${formatBillingMoney(tr.subtotal)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
}

function renderGestionCobros(historiaId, detalle, t) {
    const { dias, total, totalpago: pagado, debe, id_pagador: idPagador, solo_lectura: soloLectura } = detalle;
    const decimales = Number(detalle.decimales) || 0;
    const paso = 10 ** -decimales;
    const hintAuto = escapeAloj(t.hint_total_auto_save || '');
    const hintBtn = escapeAloj(t.hint_guardar_total_btn || '');
    const totalInputAttrs = soloLectura ? 'readonly' : `data-billing-total-orig="${total.toFixed(2)}" step="0.01" min="0" inputmode="decimal" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="window.billingPersistTotalBlur('ALOJ',${historiaId},'mdl-aloj-total')" title="${hintAuto}"`;
    const puedePagar = debe >= paso && idPagador > 0;
    const puedeDevolver = pagado >= paso && idPagador > 0;
    const tf = window.txt?.facturacion || {};
    const nombreImporte = t.aloj_lbl_importe_abono || 'Importe a abonar';
    return `
    <h6 class="text-primary fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">${t.aloj_sec_control_cobros || 'Control de Cobros'}</h6>
    <div class="p-3 bg-white border rounded mb-3 text-center shadow-sm">
        <label class="small fw-bold text-muted d-block uppercase">${t.aloj_lbl_dias_totales || 'Días Totales de Estadía'}</label>
        <span id="pdf-aloj-dias" class="display-6 fw-bold text-info">${dias}</span>
    </div>
    <div class="p-3 bg-white border rounded mb-3 shadow-sm">
        <label for="mdl-aloj-total" class="form-label fw-bold text-primary small uppercase">${t.aloj_lbl_costo_total_pagar || 'Costo Total a Pagar'}</label>
        <div class="input-group input-group-lg">
            <span class="input-group-text">$</span>
            <input type="number" id="mdl-aloj-total" class="form-control fw-bold text-primary fs-4" value="${total.toFixed(2)}" ${totalInputAttrs}>
            ${soloLectura ? '' : `<button class="btn btn-primary" type="button" onclick="window.toggleEditTotalAloj(${historiaId})" title="${hintBtn}" aria-label="${hintBtn}"><i class="bi bi-pencil-fill"></i></button>`}
        </div>
    </div>
    <div class="p-3 border rounded bg-white shadow-sm">
        <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-muted small uppercase">${t.aloj_lbl_total_pagado_uc || 'TOTAL PAGADO:'}</span>
            <span class="fs-5 fw-bold text-success" id="mdl-aloj-pagado-txt">$ ${formatBillingMoney(pagado)}</span>
            <input type="hidden" id="mdl-aloj-pagado-val" value="${pagado}">
            <input type="hidden" id="mdl-aloj-exento" value="0">
        </div>
        <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2 mb-3">
            <span class="fw-bold small">${t.aloj_lbl_pendiente || 'Pendiente de pago'}</span>
            ${debe > 0 && pagado > 0 ? `<span class="badge bg-warning text-dark">${t.badge_pago_parcial || 'PAGO PARCIAL'}</span>` : ''}
            <span class="fs-5 fw-bold ${debe > 0 ? 'text-danger' : 'text-success'}">$ ${formatBillingMoney(debe)}</span>
            <input type="hidden" id="mdl-aloj-debe-val" value="${debe}">
        </div>
        ${soloLectura ? `<div class="small text-muted">${tf.billing_readonly_contador || 'El rol Contador es solo lectura.'}</div>` : `
        <label for="mdl-aloj-monto-accion" class="form-label fw-semibold small">${nombreImporte}</label>
        <div class="input-group">
            <span class="input-group-text">$</span>
            <input type="number" id="mdl-aloj-monto-accion" class="form-control" step="${paso}" min="${paso}" inputmode="${decimales ? 'decimal' : 'numeric'}" data-decimales="${decimales}" ${puedePagar || puedeDevolver ? '' : 'disabled'}>
            <button type="button" class="btn btn-success fw-bold" ${puedePagar ? '' : 'disabled'} onclick="window.ajustarPagoAloj('PAGAR', ${historiaId})">${t.aloj_btn_abonar || 'Abonar'}</button>
            <button type="button" class="btn btn-outline-danger fw-bold" ${puedeDevolver ? '' : 'disabled'} onclick="window.ajustarPagoAloj('QUITAR', ${historiaId})">${t.btn_quitar || 'QUITAR'}</button>
        </div>
        ${puedePagar ? `<p class="small text-muted mt-2 mb-0">${t.aloj_ayuda_abonos || 'Podés abonar una parte y pagar el resto más adelante.'}</p>` : ''}`}
    </div>`;
}

function formatFechaTramo(value, locale) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale);
}

function escapeAloj(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
