import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { formatBillingMoney, formatBillingMoneyLoose } from './billingLocale.js';
import { billingArmScrollRestore, billingApplyScrollRestore } from './billingScrollRestore.js';

function txF() {
    return window.txt?.facturacion || {};
}

/** Paneles de historial bajo cada protocolo (facturación por depto): invalidar caché si cambia el departamento. */
window.invalidateDeptoSaldoHistorialPanelsCache = () => {
    document.querySelectorAll('[id^="saldo-hist-inner-"]').forEach((el) => {
        el.dataset.histLoaded = '0';
        delete el.dataset.histRefDepto;
    });
};

/**
 * Tras pagos o cambios de saldo: recarga el informe de la vista activa (no usa el orden antiguo protocolo→investigador).
 * @param {{ idUsr?: unknown, idProt?: unknown }} [restoreOpts]
 */
window.refreshBillingReportAfterMutation = async function refreshBillingReportAfterMutation(restoreOpts) {
    const ro = restoreOpts && typeof restoreOpts === 'object' ? restoreOpts : {};
    if (ro.armScroll !== false) {
        billingArmScrollRestore(ro);
    }
    try {
        if (typeof window.invalidateDeptoSaldoHistorialPanelsCache === 'function' && document.getElementById('sel-depto')) {
            window.invalidateDeptoSaldoHistorialPanelsCache();
        }
        if (document.getElementById('sel-depto') && typeof window.cargarFacturacionDepto === 'function') {
            await window.cargarFacturacionDepto();
        } else if (
            document.getElementById('investigador-results') &&
            document.getElementById('sel-investigador') &&
            typeof window.cargarFacturacionPersona === 'function'
        ) {
            await window.cargarFacturacionPersona();
        } else if (document.getElementById('sel-investigador') && typeof window.cargarFacturacionInvestigador === 'function') {
            await window.cargarFacturacionInvestigador();
        } else if (document.getElementById('sel-protocolo') && typeof window.cargarFacturacionProtocolo === 'function') {
            await window.cargarFacturacionProtocolo();
        } else if (document.getElementById('billing-results-inst') && typeof window.cargarFacturacionInstitucion === 'function') {
            await window.cargarFacturacionInstitucion();
        }
        billingApplyScrollRestore();
    } catch (e) {
        console.error(e);
    }
};

async function fetchSaldoHistorialData(opts) {
    const idUsr = parseInt(opts?.idUsr, 10) || 0;
    if (!idUsr) throw new Error(txF().saldo_hist_err_id_usuario || 'Usuario inválido.');
    const scope = (opts?.scope || 'investigador').toString();
    const refId = opts?.refId != null ? parseInt(opts.refId, 10) : null;
    let from = null;
    let to = null;
    if (opts && typeof opts === 'object') {
        if ('from' in opts) from = opts.from;
        else from = document.getElementById('f-desde')?.value ?? null;
        if ('to' in opts) to = opts.to;
        else to = document.getElementById('f-hasta')?.value ?? null;
    } else {
        from = document.getElementById('f-desde')?.value ?? null;
        to = document.getElementById('f-hasta')?.value ?? null;
    }
    const qs = new URLSearchParams();
    qs.set('idUsr', String(idUsr));
    if (from) qs.set('from', String(from));
    if (to) qs.set('to', String(to));
    qs.set('scope', scope);
    if (refId && refId > 0) qs.set('refId', String(refId));
    const res = await API.request(`/billing/saldo-historial?${qs.toString()}`, 'GET');
    if (res.status !== 'success') {
        throw new Error(res.message || window.txt?.generales?.error || 'Error');
    }
    return res.data || {};
}

function escapeHtmlBillingTxt(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttrBilling(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

/** Fecha + hora corta en historial (API puede devolver DATE o DATETIME). */
function fmtFechaHistorialCell(f, dash) {
    if (f == null || String(f).trim() === '') return dash;
    const raw = String(f).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return escapeHtmlBillingTxt(raw);
    }
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (m) {
        return escapeHtmlBillingTxt(`${m[1]} ${m[2]}`);
    }
    return escapeHtmlBillingTxt(raw);
}

async function fetchTransferCommentSuggestionsFromHistorial(idUsr, extraOpts = {}) {
    const uid = parseInt(String(idUsr), 10) || 0;
    if (!uid) return { transfers: [], comments: [] };
    try {
        const data = await fetchSaldoHistorialData({ idUsr: uid, ...extraOpts });
        const transferSet = new Set();
        const commentSet = new Set();
        const push = (set, v) => {
            const t = String(v ?? '').trim();
            if (t) set.add(t);
        };
        (data.movimientos_saldo || []).forEach((r) => {
            push(transferSet, r.IdentificadorTransferencia);
            push(commentSet, r.Comentario);
        });
        (data.pagos || []).forEach((r) => {
            push(transferSet, r.IdentificadorTransferencia);
            push(commentSet, r.Comentario);
        });
        return {
            transfers: [...transferSet].slice(0, 24),
            comments: [...commentSet].slice(0, 24),
        };
    } catch (_) {
        return { transfers: [], comments: [] };
    }
}

function buildPaymentMetaSwalFragment(tf, suggestions, uid) {
    const transfers = suggestions?.transfers || [];
    const comments = suggestions?.comments || [];
    const dlT = `dl-pay-tr-${uid}`;
    const dlC = `dl-pay-cm-${uid}`;
    const optT = transfers.map((t) => `<option value="${escapeAttrBilling(t)}"></option>`).join('');
    const optC = comments.map((t) => `<option value="${escapeAttrBilling(t)}"></option>`).join('');
    const hint = (tf.payment_meta_hint || '').trim();
    const sec = (tf.payment_meta_section || '').trim();
    return `
        <div class="border-top pt-3 mt-3 text-start">
            ${sec ? `<div class="small fw-bold text-secondary mb-2">${escapeHtmlBillingTxt(sec)}</div>` : ''}
            ${hint ? `<p class="small text-muted mb-2">${escapeHtmlBillingTxt(hint)}</p>` : ''}
            <label class="form-label small mb-1">${escapeHtmlBillingTxt(tf.saldo_transfer_id_label || 'Identificador de transferencia')}</label>
            <input id="swal-pay-transfer-${uid}" class="form-control form-control-sm mb-2" maxlength="120" list="${dlT}"
                placeholder="${escapeAttrBilling(tf.saldo_transfer_id_ph || '')}">
            <datalist id="${dlT}">${optT}</datalist>
            <label class="form-label small mb-1">${escapeHtmlBillingTxt(tf.saldo_comentario_label || 'Comentario')}</label>
            <input id="swal-pay-comment-${uid}" class="form-control form-control-sm" maxlength="255" list="${dlC}"
                placeholder="${escapeAttrBilling(tf.saldo_comentario_ph || '')}">
            <datalist id="${dlC}">${optC}</datalist>
        </div>`;
}

/** Etiqueta legible para códigos `TipoHistorial` de `historialpago` (i18n `saldo_hist_tipo_*`). */
function saldoHistorialTipoDisplay(raw) {
    const code = String(raw ?? '').trim();
    if (!code) return '—';
    const tf = txF();
    const v = tf[`saldo_hist_tipo_${code}`];
    return (typeof v === 'string' && v.trim()) ? v.trim() : code;
}

function buildSaldoHistorialInnerHtml(data, histOpts = {}) {
    const tf = txF();
    const scopeHist = String(histOpts?.scope || 'investigador').toLowerCase();
    const hintParts = [];
    if (scopeHist === 'depto') {
        const h = (tf.saldo_hist_hint_filtrado_depto || '').trim();
        if (h) hintParts.push(h);
    } else if (scopeHist === 'protocolo') {
        const h = (tf.saldo_hist_hint_filtrado_proto || '').trim();
        if (h) hintParts.push(h);
    } else if (scopeHist === 'investigador') {
        const h = (tf.saldo_hist_hint_investigador || '').trim();
        if (h) hintParts.push(h);
    }

    const saldo = parseFloat(data.saldo || 0);
    const mov = Array.isArray(data.movimientos_saldo) ? data.movimientos_saldo : [];
    const pagos = Array.isArray(data.pagos) ? data.pagos : [];

    if (mov.length === 0 && pagos.length === 0) {
        const hEmpty = (tf.saldo_hist_hint_sin_movimientos || '').trim();
        if (hEmpty) hintParts.push(hEmpty);
    }

    const hintHtml = hintParts.length
        ? `<div class="small text-muted mt-3 mb-0 border-top pt-2">${hintParts
              .map((t) => `<p class="mb-2">${escapeHtmlBillingTxt(t)}</p>`)
              .join('')}</div>`
        : '';

    const dash = tf.saldo_hist_placeholder_empty || '—';

    const cellHistorialApiText = (val) => {
        if (val == null || String(val).trim() === '') return dash;
        return escapeHtmlBillingTxt(String(val));
    };

    const fmtMonto = (m) => {
        const v = parseFloat(m || 0);
        const cls = v < 0 ? 'text-danger' : 'text-success';
        const sign = v < 0 ? '−' : '+';
        return `<span class="fw-bold ${cls}">${sign} $ ${formatBillingMoney(Math.abs(v))}</span>`;
    };
    const fmtFecha = (f) => fmtFechaHistorialCell(f, dash);
    const empty = (tf.saldo_hist_empty || 'Sin movimientos.');

    const htmlMov = mov.length ? mov.map((r) => `
            <tr>
                <td class="text-muted small">#${parseInt(String(r.IdHistoPago ?? ''), 10) || 0}</td>
                <td class="small">${fmtFecha(r.fecha)}</td>
                <td>${fmtMonto(r.Monto)}</td>
                <td class="small text-muted">${cellHistorialApiText(r.IdentificadorTransferencia)}</td>
                <td class="small">${cellHistorialApiText(r.Comentario)}</td>
            </tr>
        `).join('') : `<tr><td colspan="5" class="text-center text-muted small py-3">${empty}</td></tr>`;

    const htmlPagos = pagos.length ? pagos.map((r) => {
        const tipoCode = String(r.TipoHistorial ?? '').trim();
        const tipoLbl = saldoHistorialTipoDisplay(tipoCode);
        const tipoTitle = tipoCode ? escapeHtmlBillingTxt(tipoCode) : '';
        const tipoHtml = `<span class="badge bg-secondary"${tipoTitle ? ` title="${tipoTitle}"` : ''}>${escapeHtmlBillingTxt(tipoLbl)}</span>`;
        const idFormNum = parseInt(String(r.IdFormA ?? ''), 10);
        const refForm = Number.isFinite(idFormNum) && idFormNum > 0 ? `#${idFormNum}` : dash;
        return `
            <tr>
                <td class="text-muted small">#${parseInt(String(r.IdHistoPago ?? ''), 10) || 0}</td>
                <td class="small">${fmtFecha(r.fecha)}</td>
                <td class="small">${tipoHtml}</td>
                <td class="small text-muted">${refForm === dash ? dash : escapeHtmlBillingTxt(refForm)}</td>
                <td class="small text-muted">${cellHistorialApiText(r.IdentificadorTransferencia)}</td>
                <td class="small">${cellHistorialApiText(r.Comentario)}</td>
                <td>${fmtMonto(0 - Math.abs(parseFloat(r.Monto || 0)))}</td>
            </tr>
        `;
    }).join('') : `<tr><td colspan="7" class="text-center text-muted small py-3">${empty}</td></tr>`;

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
                                            <th>${tf.saldo_hist_col_id || 'ID'}</th>
                                            <th>${tf.saldo_hist_col_fecha || 'Fecha'}</th>
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
                                            <th>${tf.saldo_hist_col_id || 'ID'}</th>
                                            <th>${tf.saldo_hist_col_fecha || 'Fecha'}</th>
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
                    </div>${hintHtml}`;
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
                confirmButtonText: tf.saldo_ajuste_confirm || window.txt?.generales?.confirmar || 'Confirmar',
                cancelButtonText: tf.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar',
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

        const pidFocus = isFromProtocol && idProt != null ? parseInt(String(idProt), 10) : NaN;

        billingArmScrollRestore({
            idUsr,
            idProt: Number.isFinite(pidFocus) ? pidFocus : null,
        });

        showLoader();
        const res = await API.request('/billing/balance', 'POST', {
            idUsr: idUsr,
            instId: localStorage.getItem('instId') || 1,
            monto: monto,
            transferId,
            comment
        });
        hideLoader();

        if (res.status === 'success') {
            input.value = '';
            if (typeof window.refreshBillingReportAfterMutation === 'function') {
                await window.refreshBillingReportAfterMutation({
                    idUsr,
                    idProt: Number.isFinite(pidFocus) ? pidFocus : null,
                    armScroll: false,
                });
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
    } catch (e) {
        hideLoader();
        console.error(e);
    }
};

window.openSaldoHistorialPopup = async (opts) => {
    const tf = txF();
    const gen = window.txt?.generales || {};
    const idUsr = parseInt(opts?.idUsr, 10) || 0;
    if (!idUsr) return;

    const scope = (opts?.scope || 'investigador').toString().toLowerCase();
    const refId = opts?.refId != null ? parseInt(opts.refId, 10) : null;

    if (scope === 'depto' && (!refId || refId <= 0)) {
        await Swal.fire(
            gen.swal_atencion || gen.error || 'Atención',
            tf.saldo_hist_err_depto_ref || 'Seleccione un departamento para ver el historial filtrado por área.',
            'warning'
        );
        return;
    }
    if (scope === 'protocolo' && (!refId || refId <= 0)) {
        await Swal.fire(
            gen.swal_atencion || gen.error || 'Atención',
            tf.saldo_hist_err_proto_ref || 'Protocolo no válido para el historial.',
            'warning'
        );
        return;
    }

    const histTitle = tf.saldo_hist_title || 'Historial de saldo';
    const loadingMsg =
        tf.billing_loading_inline ||
        gen.msg_cargando ||
        '…';
    const loadingHtml = `<div class="d-flex flex-column align-items-center justify-content-center py-4 text-muted" role="status" aria-live="polite"><div class="spinner-border text-secondary mb-2"></div><span class="small">${escapeHtmlBillingTxt(loadingMsg)}</span></div>`;

    try {
        Swal.fire({
            title: histTitle,
            html: loadingHtml,
            width: 980,
            showConfirmButton: false,
            allowOutsideClick: false,
        });
        const data = await fetchSaldoHistorialData({
            idUsr,
            scope,
            refId,
            from: opts?.from !== undefined ? opts.from : null,
            to: opts?.to !== undefined ? opts.to : null,
        });
        Swal.close();
        await Swal.fire({
            title: histTitle,
            width: 980,
            html: `<div class="text-start">${buildSaldoHistorialInnerHtml(data, { scope })}</div>`,
            showConfirmButton: true,
            confirmButtonText: gen.cerrar || 'Cerrar',
        });
    } catch (e) {
        console.error(e);
        Swal.close();
        await Swal.fire(gen.error || 'Error', String(e?.message || e), 'error');
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
    if (!refId) {
        const tf = txF();
        inner.innerHTML = `<div class="alert alert-warning small mb-0">${tf.saldo_hist_err_depto_ref || 'Seleccione un departamento.'}</div>`;
        inner.dataset.histLoaded = '0';
        const instWarn = bootstrap.Collapse.getInstance(collapseEl) || bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
        instWarn.show();
        return;
    }
    const refKey = String(refId);
    const cacheOk = inner.dataset.histLoaded === '1' && inner.dataset.histRefDepto === refKey;
    if (!cacheOk) {
        inner.innerHTML = `<div class="text-center py-3"><span class="spinner-border spinner-border-sm text-secondary"></span></div>`;
        try {
            const data = await fetchSaldoHistorialData({ idUsr, scope: 'depto', refId, from: null, to: null });
            inner.innerHTML = buildSaldoHistorialInnerHtml(data, { scope: 'depto' });
            inner.dataset.histLoaded = '1';
            inner.dataset.histRefDepto = refKey;
        } catch (e) {
            console.error(e);
            inner.dataset.histLoaded = '0';
            delete inner.dataset.histRefDepto;
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
        `.check-item-form[data-prot="${idProt}"]:checked, .check-item-aloj[data-prot="${idProt}"]:checked`
    );
    seleccionados.forEach(chk => {
        const montoItem = parseFloat(chk.dataset.monto || 0);
        totalAPagar += montoItem;
        let tipo = 'ALOJ';
        if (chk.classList.contains('check-item-form')) tipo = 'FORM';
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
    const idUsrPago = prot.idUsr ?? prot.info?.IdUsrA;
    const sug = await fetchTransferCommentSuggestionsFromHistorial(idUsrPago);
    const swUid = `prot${idProt}_${Date.now()}`;
    const intro = (tf.payment_confirm_items || 'Se liquidarán <b>{n}</b> ítems.').replace(/\{n\}/g, String(items.length));
    const metaFrag = buildPaymentMetaSwalFragment(tf, sug, swUid);
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
                ${metaFrag}
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tf.confirmar_pago_btn || 'Sí, pagar ahora',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: tf.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar',
        preConfirm: () => {
            const c = Swal.getHtmlContainer();
            const tid = c?.querySelector(`#swal-pay-transfer-${swUid}`)?.value ?? '';
            const com = c?.querySelector(`#swal-pay-comment-${swUid}`)?.value ?? '';
            return { transferId: String(tid).trim(), comment: String(com).trim() };
        },
    });

    if (confirm.isConfirmed) {
        await ejecutarPagoFinal(idUsrPago, totalAPagar, items, idProt, confirm.value || {});
    }
};
/**
 * Envío real a la base de datos
 */
async function ejecutarPagoFinal(idUsr, monto, items, focusProtId = null, paymentMeta = null) {
    const fp = focusProtId != null ? parseInt(String(focusProtId), 10) : NaN;
    const tid = paymentMeta && typeof paymentMeta === 'object' ? String(paymentMeta.transferId || '').trim() : '';
    const com = paymentMeta && typeof paymentMeta === 'object' ? String(paymentMeta.comment || '').trim() : '';
    try {
        billingArmScrollRestore({
            idUsr,
            idProt: Number.isFinite(fp) && fp >= 0 ? fp : null,
        });
        showLoader();
        const payload = {
            idUsr,
            monto,
            items,
            instId: localStorage.getItem('instId') || 1,
        };
        if (tid) payload.transferId = tid;
        if (com) payload.comment = com;
        const res = await API.request('/billing/process-payment', 'POST', payload);
        // El overlay global va por encima de SweetAlert2: hay que quitarlo antes de cualquier Swal con await.
        hideLoader();

        if (res.status === 'success') {
            const tf = txF();
            await Swal.fire(tf.pago_procesado || '¡Pago Procesado!', tf.payment_saldo_actualizado_msg || 'El saldo ha sido actualizado.', 'success');

            if (typeof window.refreshBillingReportAfterMutation === 'function') {
                await window.refreshBillingReportAfterMutation({
                    idUsr,
                    idProt: Number.isFinite(fp) && fp >= 0 ? fp : null,
                    armScroll: false,
                });
            }
        } else {
            await Swal.fire(window.txt?.generales?.error || 'Error', res.message || txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
        }
    } catch (e) {
        hideLoader();
        console.error(e);
        await Swal.fire(window.txt?.generales?.error || 'Error', txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
    }
}
/**
 * 3. Ejecución final del pago en la API
 */
window.ejecutarPagoAPI = async (idUsr, monto, items, focusProtId = null, paymentMeta = null) => {
    const fp = focusProtId != null ? parseInt(String(focusProtId), 10) : NaN;
    const tid = paymentMeta && typeof paymentMeta === 'object' ? String(paymentMeta.transferId || '').trim() : '';
    const com = paymentMeta && typeof paymentMeta === 'object' ? String(paymentMeta.comment || '').trim() : '';
    try {
        billingArmScrollRestore({
            idUsr,
            idProt: Number.isFinite(fp) && fp >= 0 ? fp : null,
        });
        showLoader();
        const payload = {
            idUsr,
            monto,
            items,
            instId: localStorage.getItem('instId') || 1,
        };
        if (tid) payload.transferId = tid;
        if (com) payload.comment = com;
        const res = await API.request('/billing/process-payment', 'POST', payload);
        hideLoader();

        if (res.status === 'success') {
            const tf = txF();
            await Swal.fire(tf.payment_exitoso_titulo || 'Pago exitoso', tf.payment_exitoso_msg || 'Los ítems han sido liquidados y el saldo actualizado.', 'success');
            if (typeof window.refreshBillingReportAfterMutation === 'function') {
                await window.refreshBillingReportAfterMutation({
                    idUsr,
                    idProt: Number.isFinite(fp) && fp >= 0 ? fp : null,
                    armScroll: false,
                });
            }
        } else {
            await Swal.fire(window.txt?.generales?.error || 'Error', res.message || txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
        }
    } catch (e) {
        hideLoader();
        console.error(e);
        await Swal.fire(window.txt?.generales?.error || 'Error', txF().payment_error_procesar || 'No se pudo procesar el pago.', 'error');
    }
};

window.procesarPagoInsumosProtocolo = async (idProt) => {
    const prot = window.currentReportData?.protocolos?.find((p) =>
        p.idProt == idProt || p.info?.idprotA == idProt
    );
    if (!prot) return;

    const seleccionados = document.querySelectorAll(`.check-item-insumo-prot[data-prot="${idProt}"]:checked`);
    if (seleccionados.length === 0) {
        Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', txF().seleccione_insumo_pagar || 'Seleccione al menos un insumo para pagar.', 'info');
        return;
    }

    let totalAPagar = 0;
    const items = [];
    seleccionados.forEach((chk) => {
        const monto = parseFloat(chk.dataset.monto || 0);
        totalAPagar += monto;
        items.push({ tipo: 'INSUMO_GRAL', id: chk.dataset.id, monto_pago: monto });
    });

    const saldoActual = parseFloat(prot.saldoInv ?? prot.info?.SaldoPI ?? 0);
    if (totalAPagar > saldoActual) {
        const tf = txF();
        Swal.fire({
            title: tf.saldo_insuficiente || 'Saldo Insuficiente',
            html: (tf.payment_exceso_cuerpo || 'El monto seleccionado ({m1}) es mayor al saldo disponible ({m2}).')
                .replace(/\{m1\}/g, `<b>$ ${formatBillingMoneyLoose(totalAPagar)}</b>`)
                .replace(/\{m2\}/g, `<b>$ ${formatBillingMoneyLoose(saldoActual)}</b>`),
            icon: 'error',
        });
        return;
    }

    const tf = txF();
    const idUsrPago = prot.idUsr ?? prot.info?.IdUsrA;
    const sug = await fetchTransferCommentSuggestionsFromHistorial(idUsrPago);
    const swUid = `protins${idProt}_${Date.now()}`;
    const confirm = await Swal.fire({
        title: tf.payment_insumos_prot_confirm_titulo || 'Confirmar liquidación de insumos del protocolo',
        html: `
            <div class="text-start">
                <p>${(tf.payment_confirm_items || 'Se liquidarán <b>{n}</b> ítems.').replace(/\{n\}/g, String(items.length))}</p>
                <div class="p-3 bg-light rounded border">
                    <div class="d-flex justify-content-between fw-bold">
                        <span>${tf.payment_insumos_total_pagar || 'Total a pagar:'}</span>
                        <span>$ ${formatBillingMoney(totalAPagar)}</span>
                    </div>
                </div>
                ${buildPaymentMetaSwalFragment(tf, sug, swUid)}
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tf.confirmar_pago_btn || 'Sí, pagar ahora',
        cancelButtonText: tf.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar',
        preConfirm: () => {
            const c = Swal.getHtmlContainer();
            return {
                transferId: String(c?.querySelector(`#swal-pay-transfer-${swUid}`)?.value ?? '').trim(),
                comment: String(c?.querySelector(`#swal-pay-comment-${swUid}`)?.value ?? '').trim(),
            };
        },
    });

    if (confirm.isConfirmed) {
        await ejecutarPagoFinal(idUsrPago, totalAPagar, items, idProt, confirm.value || {});
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
    const idInv = primerItem.IdUsrA;
    const sug = await fetchTransferCommentSuggestionsFromHistorial(idInv);
    const swUid = `insg_${Date.now()}`;
    const metaFrag = buildPaymentMetaSwalFragment(tf, sug, swUid);
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
                ${metaFrag}
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tf.payment_insumos_confirm_btn || 'Sí, liquidar insumos',
        confirmButtonColor: '#0d6efd',
        cancelButtonText: tf.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar',
        preConfirm: () => {
            const c = Swal.getHtmlContainer();
            const tid = c?.querySelector(`#swal-pay-transfer-${swUid}`)?.value ?? '';
            const com = c?.querySelector(`#swal-pay-comment-${swUid}`)?.value ?? '';
            return { transferId: String(tid).trim(), comment: String(com).trim() };
        },
    });

    if (confirm.isConfirmed) {
        await ejecutarPagoFinal(idInv, totalAPagar, items, null, confirm.value || {});
    }
};