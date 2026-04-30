import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { formatBillingMoney, formatBillingMoneyLoose } from './billingLocale.js';

function txF() {
    return window.txt?.facturacion || {};
}

async function fetchSaldoHistorialData(opts) {
    const idUsr = parseInt(opts?.idUsr, 10) || 0;
    if (!idUsr) throw new Error('Usuario inválido.');
    const scope = (opts?.scope || 'investigador').toString();
    const refId = opts?.refId != null ? parseInt(opts.refId, 10) : null;
    const from = opts?.from ?? document.getElementById('f-desde')?.value ?? null;
    const to = opts?.to ?? document.getElementById('f-hasta')?.value ?? null;
    const qs = new URLSearchParams();
    qs.set('idUsr', String(idUsr));
    if (from) qs.set('from', String(from));
    if (to) qs.set('to', String(to));
    qs.set('scope', scope);
    if (refId && refId > 0) qs.set('refId', String(refId));
    const res = await API.request(`/billing/saldo-historial?${qs.toString()}`, 'GET');
    if (res.status !== 'success') {
        throw new Error(res.message || 'Error');
    }
    return res.data || {};
}

function buildSaldoHistorialInnerHtml(data) {
    const tf = txF();
    const gen = window.txt?.generales || {};
    const saldo = parseFloat(data.saldo || 0);
    const mov = Array.isArray(data.movimientos_saldo) ? data.movimientos_saldo : [];
    const pagos = Array.isArray(data.pagos) ? data.pagos : [];

    const fmtMonto = (m) => {
        const v = parseFloat(m || 0);
        const cls = v < 0 ? 'text-danger' : 'text-success';
        const sign = v < 0 ? '−' : '+';
        return `<span class="fw-bold ${cls}">${sign} $ ${formatBillingMoney(Math.abs(v))}</span>`;
    };
    const fmtFecha = (f) => (f ? String(f) : '—');
    const empty = (tf.saldo_hist_empty || 'Sin movimientos.');

    const htmlMov = mov.length ? mov.map((r) => `
            <tr>
                <td class="text-muted small">#${r.IdHistoPago}</td>
                <td class="small">${fmtFecha(r.fecha)}</td>
                <td>${fmtMonto(r.Monto)}</td>
                <td class="small text-muted">${(r.IdentificadorTransferencia || '—')}</td>
                <td class="small">${(r.Comentario || '—')}</td>
            </tr>
        `).join('') : `<tr><td colspan="5" class="text-center text-muted small py-3">${empty}</td></tr>`;

    const htmlPagos = pagos.length ? pagos.map((r) => `
            <tr>
                <td class="text-muted small">#${r.IdHistoPago}</td>
                <td class="small">${fmtFecha(r.fecha)}</td>
                <td class="small"><span class="badge bg-secondary">${r.TipoHistorial}</span></td>
                <td class="small text-muted">${(r.IdFormA && String(r.IdFormA) !== '0') ? '#' + r.IdFormA : '—'}</td>
                <td class="small text-muted">${(r.IdentificadorTransferencia || '—')}</td>
                <td class="small">${(r.Comentario || '—')}</td>
                <td>${fmtMonto(0 - Math.abs(parseFloat(r.Monto || 0)))}</td>
            </tr>
        `).join('') : `<tr><td colspan="7" class="text-center text-muted small py-3">${empty}</td></tr>`;

    return `
                    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div class="small text-muted">${tf.saldo_hist_sub || 'Movimientos de saldo vs pagos'}</div>
                        <div class="fw-bold">${tf.saldo_actual || 'Saldo Actual:'} <span class="badge bg-success">$ ${formatBillingMoney(saldo)}</span></div>
                    </div>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="fw-bold mb-1">${tf.saldo_hist_mov_lbl || 'Movimientos (suma / resta)'}</div>
                            <div class="table-responsive border rounded">
                                <table class="table table-sm mb-0 align-middle">
                                    <thead class="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>${gen.fecha || 'Fecha'}</th>
                                            <th>${tf.total || 'Total'}</th>
                                            <th>${tf.saldo_transfer_id_label || 'Transferencia'}</th>
                                            <th>${tf.saldo_comentario_label || 'Comentario'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>${htmlMov}</tbody>
                                </table>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="fw-bold mb-1">${tf.saldo_hist_pagos_lbl || 'Pagos (gastos)'}</div>
                            <div class="table-responsive border rounded">
                                <table class="table table-sm mb-0 align-middle">
                                    <thead class="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>${gen.fecha || 'Fecha'}</th>
                                            <th>${tf.hist_tipo || 'Tipo'}</th>
                                            <th>${tf.hist_ref || 'Ref.'}</th>
                                            <th>${tf.saldo_transfer_id_label || 'Transferencia'}</th>
                                            <th>${tf.saldo_comentario_label || 'Comentario'}</th>
                                            <th>${tf.pago || 'Pago'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>${htmlPagos}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>`;
}

/**
 * 1. Actualiza el saldo (Suma o Resta)
 * Busca el input dinámicamente según si es el Dashboard o un Protocolo específico.
 */
window.updateBalance = async (idUsr, action, isFromProtocol = false, idProt = null) => {
    const inputSelector = isFromProtocol ? `#inp-saldo-prot-${idProt}` : `#inp-saldo-${idUsr}`;
    const input = document.querySelector(inputSelector);
    
    if (!input || !input.value) {
        Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', txF().ingrese_monto_antes || 'Ingrese un monto antes de operar.', 'warning');
        return;
    }

    let monto = parseFloat(input.value);
    if (action === 'sub') monto = monto * -1;

    try {
        const tf = txF();
        let transferId = null;
        let comment = null;
        if (typeof Swal !== 'undefined') {
            const title = (action === 'sub')
                ? (tf.saldo_ajuste_restar_title || 'Restar saldo')
                : (tf.saldo_ajuste_sumar_title || 'Sumar saldo');
            const r = await Swal.fire({
                title,
                html: `
                    <div class="text-start">
                        <label class="form-label small mb-1">${tf.saldo_transfer_id_label || 'Identificador de transferencia'}</label>
                        <input id="swal-saldo-transfer" class="form-control form-control-sm mb-2" maxlength="120" placeholder="${tf.saldo_transfer_id_ph || 'Ej.: TRANSF-123 / comprobante…'}">
                        <label class="form-label small mb-1">${tf.saldo_comentario_label || 'Comentario'}</label>
                        <input id="swal-saldo-comment" class="form-control form-control-sm" maxlength="255" placeholder="${tf.saldo_comentario_ph || 'Ej.: ajuste, reintegro, origen…'}">
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: tf.saldo_ajuste_confirm || 'Confirmar',
                cancelButtonText: tf.btn_cancelar_swal || 'Cancelar',
                confirmButtonColor: '#1a5d3b',
                preConfirm: () => {
                    const c = Swal.getHtmlContainer();
                    return {
                        transferId: c?.querySelector('#swal-saldo-transfer')?.value || '',
                        comment: c?.querySelector('#swal-saldo-comment')?.value || '',
                    };
                }
            });
            if (!r.isConfirmed) return;
            transferId = (r.value?.transferId || '').trim() || null;
            comment = (r.value?.comment || '').trim() || null;
        }

        showLoader();
        const res = await API.request('/billing/balance', 'POST', {
            idUsr: idUsr,
            instId: localStorage.getItem('instId') || 1,
            monto: monto,
            transferId,
            comment
        });

        if (res.status === 'success') {
            input.value = ''; 
            
            if (typeof window.cargarFacturacionProtocolo === "function") {
                await window.cargarFacturacionProtocolo();
            } else if (typeof window.cargarFacturacionInvestigador === "function") {
                await window.cargarFacturacionInvestigador();
            } else if (typeof window.cargarFacturacionDepto === "function") {
                await window.cargarFacturacionDepto();
            } else if (typeof window.cargarFacturacionInstitucion === "function") {
                await window.cargarFacturacionInstitucion();
            }

            Swal.fire({
                title: txF().saldo_act || 'Saldo Actualizado',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } else {
            await Swal.fire(
                window.txt?.generales?.error || 'Error',
                res.message || txF().error_balance || 'No se pudo actualizar el saldo.',
                'error'
            );
        }
    } catch (e) { console.error(e); } finally { hideLoader(); }
};

window.openSaldoHistorialPopup = async (opts) => {
    const tf = txF();
    const gen = window.txt?.generales || {};
    const idUsr = parseInt(opts?.idUsr, 10) || 0;
    if (!idUsr) return;

    const scope = (opts?.scope || 'investigador').toString();
    const refId = opts?.refId != null ? parseInt(opts.refId, 10) : null;
    const from = opts?.from ?? document.getElementById('f-desde')?.value ?? null;
    const to = opts?.to ?? document.getElementById('f-hasta')?.value ?? null;

    try {
        showLoader();
        const data = await fetchSaldoHistorialData({ idUsr, scope, refId, from, to });
        hideLoader();
        await Swal.fire({
            title: tf.saldo_hist_title || 'Historial de saldo',
            width: 980,
            html: `<div class="text-start">${buildSaldoHistorialInnerHtml(data)}</div>`,
            showConfirmButton: true,
            confirmButtonText: gen.cerrar || 'Cerrar',
        });
    } catch (e) {
        console.error(e);
        hideLoader();
        await Swal.fire(gen.error || 'Error', String(e?.message || e), 'error');
    } finally {
        hideLoader();
    }
};

/**
 * Facturación por departamento: despliega/oculta el historial bajo la fila del protocolo.
 */
window.toggleDeptoSaldoHistorialPanel = async (idProt, idUsr) => {
    const collapseEl = document.getElementById(`saldo-hist-${idProt}`);
    const inner = document.getElementById(`saldo-hist-inner-${idProt}`);
    if (!collapseEl || !inner) return;
    const gen = window.txt?.generales || {};
    const isOpen = collapseEl.classList.contains('show');
    if (isOpen) {
        const inst = bootstrap.Collapse.getInstance(collapseEl) || bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
        inst.hide();
        return;
    }
    const refId = parseInt(document.getElementById('sel-depto')?.value || '0', 10) || 0;
    if (inner.dataset.histLoaded !== '1') {
        inner.innerHTML = `<div class="text-center py-3"><span class="spinner-border spinner-border-sm text-secondary"></span></div>`;
        try {
            const data = await fetchSaldoHistorialData({ idUsr, scope: 'depto', refId, from: null, to: null });
            inner.innerHTML = buildSaldoHistorialInnerHtml(data);
            inner.dataset.histLoaded = '1';
        } catch (e) {
            console.error(e);
            inner.innerHTML = `<div class="alert alert-danger small mb-0">${gen.error || 'Error'}: ${String(e?.message || e)}</div>`;
            return;
        }
    }
    const inst = bootstrap.Collapse.getInstance(collapseEl) || bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
    inst.show();
};

window.procesarPagoProtocolo = async (idProt) => {
    const prot = window.currentReportData.protocolos.find(p =>
        p.idProt == idProt || p.info?.idprotA == idProt
    );
    if (!prot) return;

    let totalAPagar = 0;
    const items = [];

    // Recolectamos selección y EL MONTO EXACTO (incluye insumos de pedido del protocolo)
    const seleccionados = document.querySelectorAll(
        `input[data-prot="${idProt}"]:checked:not(.check-all-form):not(.check-all-aloj):not(.check-all-insumo-prot)`
    );
    seleccionados.forEach(chk => {
        const montoItem = parseFloat(chk.dataset.monto || 0);
        totalAPagar += montoItem;
        let tipo = 'ALOJ';
        if (chk.classList.contains('check-item-form')) tipo = 'FORM';
        else if (chk.classList.contains('check-item-insumo-prot')) tipo = 'INSUMO_GRAL';
        items.push({
            tipo,
            id: chk.dataset.id,
            monto_pago: montoItem
        });
    });

    if (totalAPagar <= 0) {
        Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', txF().seleccione_que_pagar || 'Seleccione qué desea pagar o revise que tengan deuda.', 'info');
        return;
    }

    const saldoActual = parseFloat(prot.saldoInv ?? prot.info?.SaldoPI ?? 0);

    if (totalAPagar > saldoActual) {
        const tf = txF();
        const m1 = `<b>$ ${formatBillingMoneyLoose(totalAPagar)}</b>`;
        const m2 = `<b>$ ${formatBillingMoneyLoose(saldoActual)}</b>`;
        const alerta = (tf.payment_exceso_cuerpo || 'El monto seleccionado ({m1}) es mayor al saldo disponible ({m2}).')
            .replace(/\{m1\}/g, m1).replace(/\{m2\}/g, m2);
        Swal.fire({
            title: tf.saldo_insuficiente || 'Saldo Insuficiente',
            html: `
                <div class="alert alert-danger">${alerta}</div>
                <p>${tf.payment_exceso_sugerencia || 'Por favor, agregue saldo o seleccione menos ítems.'}</p>`,
            icon: 'error'
        });
        return;
    }

    const tf = txF();
    const intro = (tf.payment_confirm_items || 'Se liquidarán <b>{n}</b> ítems.').replace(/\{n\}/g, String(items.length));
    const confirm = await Swal.fire({
        title: tf.confirm_pago || 'Confirmar Liquidación',
        html: `
            <div class="text-start">
                <p>${intro}</p>
                <div class="p-3 bg-light rounded border shadow-sm">
                    <div class="d-flex justify-content-between mb-2">
                        <span>${tf.payment_total_a_pagar_lbl || 'Total a pagar:'}</span> 
                        <span class="fw-bold">$ ${formatBillingMoney(totalAPagar)}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between text-success fw-bold">
                        <span>${tf.payment_saldo_despues_lbl || 'Saldo después del pago:'}</span> 
                        <span>$ ${formatBillingMoney(saldoActual - totalAPagar)}</span>
                    </div>
                </div>
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tf.confirmar_pago_btn || 'Sí, pagar ahora',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: tf.btn_cancelar_swal || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        const idUsrPago = prot.idUsr ?? prot.info?.IdUsrA;
        ejecutarPagoFinal(idUsrPago, totalAPagar, items);
    }
};
/**
 * Envío real a la base de datos
 */
async function ejecutarPagoFinal(idUsr, monto, items) {
    try {
        showLoader();
        const res = await API.request('/billing/process-payment', 'POST', {
            idUsr, monto, items, instId: localStorage.getItem('instId') || 1
        });

        if (res.status === 'success') {
            const tf = txF();
            await Swal.fire(tf.pago_procesado || '¡Pago Procesado!', tf.payment_saldo_actualizado_msg || 'El saldo ha sido actualizado.', 'success');

            if (typeof window.cargarFacturacionProtocolo === "function") {
                await window.cargarFacturacionProtocolo();
            } else if (typeof window.cargarFacturacionInvestigador === "function") {
                await window.cargarFacturacionInvestigador();
            } else if (typeof window.cargarFacturacionDepto === "function") {
                await window.cargarFacturacionDepto();
            }
        } else {
            await Swal.fire(window.txt?.generales?.error || 'Error', res.message || txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
        }
    } catch (e) {
        console.error(e);
        await Swal.fire(window.txt?.generales?.error || 'Error', txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
    } finally {
        hideLoader();
    }
}
/**
 * 3. Ejecución final del pago en la API
 */
window.ejecutarPagoAPI = async (idUsr, monto, items) => {
    try {
        showLoader();
        const res = await API.request('/billing/process-payment', 'POST', {
            idUsr,
            monto,
            items,
            instId: localStorage.getItem('instId') || 1
        });

        if (res.status === 'success') {
            const tf = txF();
            await Swal.fire(tf.payment_exitoso_titulo || 'Pago exitoso', tf.payment_exitoso_msg || 'Los ítems han sido liquidados y el saldo actualizado.', 'success');
            await window.cargarFacturacionDepto(); // Refresca tablas y dashboard
        }
    } catch (e) { 
        console.error(e); 
        Swal.fire(window.txt?.generales?.error || 'Error', txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
    } finally { 
        hideLoader(); 
    }
};

window.procesarPagoInsumosGenerales = async () => {
    const seleccionados = document.querySelectorAll('.check-item-insumo-global:checked');
    
    if (seleccionados.length === 0) return Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', txF().seleccione_insumo_pagar || 'Seleccione al menos un insumo para pagar.', 'info');

    let totalAPagar = 0;
    const items = [];
    let htmlItems = '<ul class="list-group list-group-flush mb-3 small shadow-sm">';

    seleccionados.forEach(chk => {
        const fila = chk.closest('tr');
        const concepto = fila.cells[3].innerText; 
        const monto = parseFloat(chk.dataset.monto || 0);
        
        totalAPagar += monto;
        items.push({ tipo: 'INSUMO_GRAL', id: chk.dataset.id, monto_pago: monto });
        htmlItems += `<li class="list-group-item d-flex justify-content-between">
                        <span class="text-truncate" style="max-width: 200px;">${concepto}</span>
                        <b>$ ${formatBillingMoneyLoose(monto)}</b>
                      </li>`;
    });
    htmlItems += '</ul>';

    const primerItem = window.currentReportData.insumosGenerales.find(i => i.id == items[0].id);
    const saldoActual = parseFloat(primerItem.saldoInv || 0);
    const nombreInvestigador = primerItem.solicitante;

    if (totalAPagar > saldoActual) {
        const tf = txF();
        const s1 = `$ ${formatBillingMoneyLoose(saldoActual)}`;
        const s2 = `$ ${formatBillingMoneyLoose(totalAPagar)}`;
        const msg = (tf.payment_insumos_sin_saldo || 'El saldo disponible ({s1}) no es suficiente para cubrir el total ({s2}).')
            .replace(/\{s1\}/g, s1).replace(/\{s2\}/g, s2);
        Swal.fire({
            title: tf.saldo_insuficiente || 'Saldo Insuficiente',
            html: `
                <div class="text-start">
                    <p><b>${tf.payment_insumos_inv_swal_b || 'Investigador:'}</b> ${nombreInvestigador}</p>
                    <p class="text-danger">${msg}</p>
                </div>`,
            icon: 'error'
        });
        return;
    }

    const tf = txF();
    const confirm = await Swal.fire({
        title: tf.payment_insumos_confirm_titulo || 'Confirmar liquidación de insumos',
        width: '500px',
        html: `
            <div class="text-start">
                <div class="mb-2 small text-muted text-uppercase fw-bold">${tf.payment_insumos_resp_lbl || 'Investigador responsable:'}</div>
                <h6 class="fw-bold mb-3">${nombreInvestigador}</h6>
                ${htmlItems}
                <div class="p-3 bg-light rounded border">
                    <div class="d-flex justify-content-between mb-1">
                        <span>${tf.payment_insumos_saldo_actual || 'Saldo actual:'}</span> <b>$ ${formatBillingMoneyLoose(saldoActual)}</b>
                    </div>
                    <div class="d-flex justify-content-between text-primary">
                        <span>${tf.payment_insumos_total_pagar || 'Total a pagar:'}</span> <b>- $ ${formatBillingMoneyLoose(totalAPagar)}</b>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between text-success fw-bold">
                        <span>${tf.payment_insumos_saldo_restante || 'Saldo restante:'}</span> <span>$ ${formatBillingMoneyLoose(saldoActual - totalAPagar)}</span>
                    </div>
                </div>
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tf.payment_insumos_confirm_btn || 'Sí, liquidar insumos',
        confirmButtonColor: '#0d6efd',
        cancelButtonText: tf.btn_cancelar_swal || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        ejecutarPagoFinal(primerItem.IdUsrA, totalAPagar, items);
    }
};