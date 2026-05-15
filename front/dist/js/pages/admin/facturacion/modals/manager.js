/**
 * MANAGER DE MODALES - BIOTERIOS GROBO
 * Ubicación: js/pages/admin/facturacion/Modals/manager.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js'; 
import { openAnimalModal } from './animalModal.js';
import { openAlojModal } from './alojamientos/alojModal.js';
import { openReactiveModal } from './reactiveModal.js';
import { openInsumoModal } from './insumoModal.js';
import { formatBillingMoney, pdfColsPrecioDebePagoTotal, billingPdfFormularioIdDisplay, billingPdfMarcaExentoLarga, billingInsumoMontoTotalCobrable } from '../billingLocale.js';

const txBM = () => window.txt?.facturacion?.billing_modal || {};
const txBIPdf = () => window.txt?.facturacion?.billing_investigador || {};
/** Mensaje genérico cuando falla un cobro / descargo (red, API, excepción). */
const txPayFail = () =>
    window.txt?.facturacion?.payment_error_procesar ||
    window.txt?.facturacion?.error_procesar_corto ||
    'No se pudo procesar el pago.';

function sleepBillingModal(ms) {
    const n = Math.max(0, Number(ms) || 0);
    return new Promise((resolve) => setTimeout(resolve, n));
}
function bmTpl(str, map) {
    if (!str) return '';
    return str.replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? String(map[k]) : `{${k}}`));
}

/** Plantilla `billing_modal`: objeto local `tx`, luego `window.txt`, último recurso EN (paridad con `en.js`). */
function bmTxt(tx, key, fallbackEn) {
    return tx[key] || window.txt?.facturacion?.billing_modal?.[key] || fallbackEn;
}

/** Mensaje traducido para errores al fijar total (API devuelve `error_code`). */
function bmErrFijarPrecio(res) {
    const tx = txBM();
    const code = res && res.error_code ? String(res.error_code) : '';
    if (code && tx[code]) return tx[code];
    if (res && res.message && String(res.message).trim() !== '') return String(res.message);
    return tx.billing_fijar_error_generico || 'Error';
}

/** Evita doble POST si blur y otro evento coinciden. */
let billingPersistTotalBusy = false;

/**
 * Guarda el total del modal (animal / reactivo / insumo / aloj) si cambió respecto a `data-billing-total-orig`.
 * @param {'ANIMAL'|'REACTIVO'|'INSUMO'|'ALOJ'} kind
 * @param {number|string} id idformA o historia (aloj)
 * @param {string} inputId id del input
 * @param {boolean} skipIfUnchanged si true, no llama API si el valor no cambió (blur); el botón azul usa el mismo criterio
 */
async function billingPersistTotalFromField(kind, id, inputId, skipIfUnchanged) {
    if (billingPersistTotalBusy) return;
    const inp = document.getElementById(inputId);
    if (!inp || inp.readOnly || inp.disabled) return;

    const orig = parseFloat(String(inp.dataset.billingTotalOrig ?? '').replace(',', '.'));
    const nuevo = parseFloat(String(inp.value ?? '').replace(',', '.'));
    if (!Number.isFinite(nuevo) || nuevo < 0) {
        if (window.Swal) {
            await Swal.fire(window.txt?.generales?.error || 'Error', bmErrFijarPrecio({ error_code: 'billing_fijar_invalido' }), 'warning');
        }
        if (Number.isFinite(orig)) inp.value = orig.toFixed(2);
        return;
    }
    if (skipIfUnchanged && Number.isFinite(orig) && Math.abs(nuevo - orig) < 0.009) return;

    let endpoint;
    /** @type {Record<string, unknown>} */
    let body;
    if (kind === 'ANIMAL') {
        endpoint = '/billing/update-animal';
        body = { id, total: nuevo };
    } else if (kind === 'REACTIVO') {
        endpoint = '/billing/update-reactive';
        body = { id, total: nuevo };
    } else if (kind === 'INSUMO') {
        endpoint = '/billing/update-insumo';
        body = { id, total: nuevo };
    } else if (kind === 'ALOJ') {
        endpoint = '/billing/update-alojamiento-precio';
        body = { historia: id, total: nuevo };
    } else {
        return;
    }

    billingPersistTotalBusy = true;
    showLoader();
    try {
        const res = await API.request(endpoint, 'POST', body);
        if (res.status !== 'success') {
            if (window.Swal) {
                await Swal.fire(window.txt?.generales?.error || 'Error', bmErrFijarPrecio(res), 'error');
            }
            if (Number.isFinite(orig)) inp.value = orig.toFixed(2);
            return;
        }
        inp.dataset.billingTotalOrig = nuevo.toFixed(2);
        if (typeof window.recargarGrillaActiva === 'function') {
            await window.recargarGrillaActiva();
        }
    } catch (e) {
        console.error(e);
        if (window.Swal) Swal.fire(window.txt?.generales?.error || 'Error', txPayFail(), 'error');
        if (Number.isFinite(orig)) inp.value = orig.toFixed(2);
    } finally {
        billingPersistTotalBusy = false;
        hideLoader();
    }
}

/** Desde HTML: `onblur="window.billingPersistTotalBlur('ANIMAL', id, 'mdl-ani-total')"` */
window.billingPersistTotalBlur = async (kind, id, inputId) => {
    await billingPersistTotalFromField(kind, id, inputId, true);
};

/**
 * Función Inteligente para Recargar la Vista Actual
 * Detecta en qué pestaña del facturador estamos para refrescar la grilla correcta.
 * @param {{ idUsr?: unknown, idProt?: unknown }} [restoreOpts] — foco tras pintar (opcional; por defecto solo conserva scroll Y).
 */
window.recargarGrillaActiva = async (restoreOpts) => {
    if (typeof window.refreshBillingReportAfterMutation === 'function') {
        await window.refreshBillingReportAfterMutation(restoreOpts);
    }
};

/**
 * Función Global: Decide qué modal abrir según el tipo
 */
window.abrirEdicionFina = (tipo, id) => {
    switch (tipo) {
        case 'ANIMAL':
            openAnimalModal(id);
            break;
        case 'ALOJ':
            openAlojModal(id);
            break;
        case 'REACTIVO':
            openReactiveModal(id);
            break;
        case 'INSUMO':
            openInsumoModal(id);
            break;
    }
};

/**
 * Clic en fila de alojamiento (grillas de facturación): evita error si `event.target` es nodo texto (sin `closest`)
 * y no abre el modal al pulsar el checkbox ni la primera columna.
 * @param {MouseEvent} ev
 * @param {string|number} historiaRaw id de historia (alojamiento)
 */
window.billingRowClickOpenAlojModal = (ev, historiaRaw) => {
    const hid = parseInt(String(historiaRaw ?? '').trim(), 10);
    if (!Number.isFinite(hid) || hid <= 0) return;
    let n = ev?.target;
    if (n && n.nodeType === 3) {
        n = n.parentElement;
    }
    if (!(n instanceof Element)) return;
    if (n.closest('input[type="checkbox"]')) return;
    if (n.closest('td:first-child')) return;
    window.abrirEdicionFina('ALOJ', hid);
};

/**
 * Bootstrap deja `modal-open` y `.modal-backdrop` en `body` si el nodo del modal se borra sin `dispose()`
 * (p. ej. `innerHTML` en `#modal-container`). Quitar restos evita pantalla oscura hasta F5.
 */
function billingStripOrphanModalUi() {
    document.querySelectorAll('.modal-backdrop').forEach((n) => {
        if (n && n.parentNode) n.parentNode.removeChild(n);
    });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
}

window.renderAndShowModal = (html, modalId) => {
    let container = document.getElementById('modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modal-container';
        document.body.appendChild(container);
    }
    container.querySelectorAll('.modal').forEach((el) => {
        const inst = typeof bootstrap !== 'undefined' && bootstrap.Modal ? bootstrap.Modal.getInstance(el) : null;
        if (inst) {
            try {
                inst.dispose();
            } catch (_) { /* ignore */ }
        }
    });
    billingStripOrphanModalUi();

    container.innerHTML = html;
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
        console.error('renderAndShowModal: no existe el elemento del modal', modalId);
        if (window.Swal) {
            window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.modal_no_encontrado || 'No se pudo abrir el modal. Recargue la página.', 'error');
        }
        return;
    }
    modalEl.addEventListener(
        'hidden.bs.modal',
        () => {
            billingStripOrphanModalUi();
        },
        { once: true }
    );
    const myModal = new bootstrap.Modal(modalEl);
    myModal.show();
};

// ==========================================
// LÓGICA DE PAGOS: ANIMALES (Formularios Vivos)
// ==========================================
window.ajustarPago = async (accion, id) => {
    let monto = parseFloat(document.getElementById('mdl-ani-monto-accion').value || 0);
    const total = parseFloat(document.getElementById('mdl-ani-total').value);
    const pagado = parseFloat(document.getElementById('mdl-ani-pagado-val').value);
    const saldo = parseFloat(document.getElementById('mdl-ani-saldo-val').value);
    const debe = Math.max(0, total - pagado);

    if (monto <= 0) return;

    let montoFinal = monto;
    let advertencia = '';

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const mStr = () => `$ ${formatBillingMoney(montoFinal)}`;

    if (accion === 'PAGAR') {
        if (montoFinal > debe) {
            montoFinal = debe;
            advertencia = bmTpl(bmTxt(tx, 'ajuste_max_deuda_tpl', 'Amount adjusted to {m} (maximum debt).'), { m: mStr() });
        }
        if (montoFinal > saldo) {
            montoFinal = saldo;
            advertencia = bmTpl(bmTxt(tx, 'ajuste_saldo_disp_tpl', 'Amount adjusted to {m} (available balance).'), { m: mStr() });
        }
    } else {
        if (montoFinal > pagado) {
            montoFinal = pagado;
            advertencia = bmTpl(bmTxt(tx, 'ajuste_ya_pagado_tpl', 'Amount adjusted to {m} (already paid).'), { m: mStr() });
        }
    }

    if (montoFinal <= 0) {
        return Swal.fire(window.txt?.facturacion?.operacion_cancelada || 'Operación cancelada', window.txt?.facturacion?.operacion_cancelada_msg || 'No hay montos pendientes o saldo suficiente para procesar.', 'warning');
    }

    const confirm = await Swal.fire({
        title: bmTpl(bmTxt(tx, 'confirm_title_tpl', 'Confirm {accion}?'), { accion: accionLabel }),
        text: advertencia || bmTpl(bmTxt(tx, 'confirm_procesar_tpl', 'Amount to process: {m}'), { m: mStr() }),
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || window.txt?.facturacion?.billing_modal?.btn_procesar || window.txt?.generales?.procesar || 'Process',
        cancelButtonText: window.txt?.facturacion?.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-individual', 'POST', { 
                id, 
                monto: montoFinal, 
                accion 
            });

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAnimal'));
                if (modalInstance) modalInstance.hide();
                await sleepBillingModal(300);
                await openAnimalModal(id);
                await window.recargarGrillaActiva();
            } else {
                Swal.fire(window.txt?.generales?.error || 'Error', res.message || txPayFail(), 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire(window.txt?.generales?.error || 'Error', txPayFail(), 'error');
        } finally {
            hideLoader();
        }
    }
};

window.toggleEditTotal = async (id) => {
    await billingPersistTotalFromField('ANIMAL', id, 'mdl-ani-total', true);
};

// ==========================================
// LÓGICA DE PAGOS: ALOJAMIENTO
// ==========================================
window.ajustarPagoAloj = async (accion, id) => {
    const inputMonto = document.getElementById('mdl-aloj-monto-accion');
    let montoIngresado = parseFloat(inputMonto.value || 0);
    
    const totalCosto = parseFloat(document.getElementById('mdl-aloj-total').value);
    const yaPagado = parseFloat(document.getElementById('mdl-aloj-pagado-val').value);
    const saldoInvestigador = parseFloat(document.getElementById('mdl-aloj-saldo-val').value);
    
    const deudaPendiente = Math.max(0, totalCosto - yaPagado);

    if (montoIngresado <= 0) return;

    let montoAProcesar = montoIngresado;
    let notaAjuste = '';

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const mStr = () => `$ ${formatBillingMoney(montoAProcesar)}`;

    if (accion === 'PAGAR') {
        if (montoAProcesar > deudaPendiente) {
            montoAProcesar = deudaPendiente;
            notaAjuste = bmTpl(bmTxt(tx, 'aloj_nota_deuda_max_tpl', 'Adjusted to maximum debt: {m}.'), { m: mStr() });
        }
        if (montoAProcesar > saldoInvestigador) {
            montoAProcesar = saldoInvestigador;
            notaAjuste = bmTpl(bmTxt(tx, 'aloj_nota_saldo_tpl', 'Adjusted to available balance: {m}.'), { m: mStr() });
        }
    } else {
        if (montoAProcesar > yaPagado) {
            montoAProcesar = yaPagado;
            notaAjuste = bmTpl(bmTxt(tx, 'aloj_nota_ya_pagado_tpl', 'Adjusted to amount paid: {m}.'), { m: mStr() });
        }
    }

    if (montoAProcesar <= 0) {
        return Swal.fire(window.txt?.facturacion?.operacion_no_requerida || 'Operación no requerida', window.txt?.facturacion?.operacion_no_requerida_msg || 'El monto resultante es 0 o no hay saldo/deuda para procesar.', 'info');
    }

    const confirm = await Swal.fire({
        title: bmTpl(bmTxt(tx, 'confirm_title_tpl', 'Confirm {accion}?'), { accion: accionLabel }),
        text: notaAjuste || bmTpl(bmTxt(tx, 'confirm_procesar_tpl', 'Amount to process: {m}'), { m: mStr() }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || window.txt?.facturacion?.billing_modal?.btn_procesar || window.txt?.generales?.procesar || 'Process',
        cancelButtonText: window.txt?.facturacion?.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-aloj', 'POST', { 
                id, 
                monto: montoAProcesar, 
                accion 
            });

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAlojamiento'));
                if (modalInstance) modalInstance.hide();
                await sleepBillingModal(300);
                await openAlojModal(id);
                await window.recargarGrillaActiva();
            } else {
                Swal.fire(window.txt?.generales?.error || 'Error', res.message || txPayFail(), 'error');
            }
        } catch (e) { 
            console.error(e); 
            Swal.fire(window.txt?.generales?.error || 'Error', txPayFail(), 'error');
        } finally {
            hideLoader();
        }
    }
};

window.toggleEditTotalAloj = async (id) => {
    await billingPersistTotalFromField('ALOJ', id, 'mdl-aloj-total', true);
};

// ==========================================
// LÓGICA DE PAGOS: REACTIVOS
// ==========================================
window.ajustarPagoRea = async (accion, id) => {
    let monto = parseFloat(document.getElementById('mdl-rea-monto-accion').value || 0);
    const total = parseFloat(document.getElementById('mdl-rea-total').value);
    const pagado = parseFloat(document.getElementById('mdl-rea-pagado-val').value);
    const saldo = parseFloat(document.getElementById('mdl-rea-saldo-val').value);
    const debe = Math.max(0, total - pagado);

    if (monto <= 0) return;

    let montoFinal = monto;
    if (accion === 'PAGAR') {
        if (montoFinal > debe) montoFinal = debe;
        if (montoFinal > saldo) montoFinal = saldo;
    } else {
        if (montoFinal > pagado) montoFinal = pagado;
    }

    if (montoFinal <= 0) return Swal.fire(window.txt?.generales?.swal_aviso || 'Aviso', window.txt?.facturacion?.monto_invalido_saldo || 'Monto no válido o sin saldo/deuda.', 'info');

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const confirm = await Swal.fire({
        title: bmTpl(bmTxt(tx, 'confirm_title_tpl', 'Confirm {accion}?'), { accion: accionLabel }),
        text: bmTpl(bmTxt(tx, 'ins_monto_confirm_tpl', 'Amount: {m}'), { m: `$ ${formatBillingMoney(montoFinal)}` }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || window.txt?.facturacion?.billing_modal?.btn_procesar || window.txt?.generales?.procesar || 'Process',
        cancelButtonText: window.txt?.facturacion?.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-individual', 'POST', { 
                id, monto: montoFinal, accion, modulo: 'REACTIVO' 
            });

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalReactivo'));
                if (modalInstance) modalInstance.hide();
                await sleepBillingModal(300);
                await openReactiveModal(id);
                await window.recargarGrillaActiva();
            } else {
                Swal.fire(window.txt?.generales?.error || 'Error', res.message || txPayFail(), 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire(window.txt?.generales?.error || 'Error', txPayFail(), 'error');
        } finally {
            hideLoader();
        }
    }
};

window.toggleEditTotalRea = async (id) => {
    await billingPersistTotalFromField('REACTIVO', id, 'mdl-rea-total', true);
};

// ==========================================
// LÓGICA DE PAGOS: INSUMOS GENERALES
// ==========================================
window.ajustarPagoIns = async (accion, id) => {
    const inputMonto = document.getElementById('mdl-ins-monto-accion');
    let montoIngresado = parseFloat(inputMonto.value || 0);
    
    const totalCosto = parseFloat(document.getElementById('mdl-ins-total').value);
    const yaPagado = parseFloat(document.getElementById('mdl-ins-pagado-val').value);
    const saldoTitular = parseFloat(document.getElementById('mdl-ins-saldo-val').value);
    
    const deudaPendiente = Math.max(0, totalCosto - yaPagado);

    if (montoIngresado <= 0) return;

    let montoAProcesar = montoIngresado;
    let notaAjuste = '';

    if (accion === 'PAGAR') {
        if (montoAProcesar > deudaPendiente) montoAProcesar = deudaPendiente;
        if (montoAProcesar > saldoTitular) montoAProcesar = saldoTitular;
    } else {
        if (montoAProcesar > yaPagado) montoAProcesar = yaPagado;
    }

    if (montoAProcesar <= 0) return;

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const confirm = await Swal.fire({
        title: bmTpl(bmTxt(tx, 'confirm_title_tpl', 'Confirm {accion}?'), { accion: accionLabel }),
        text: bmTpl(bmTxt(tx, 'ins_monto_confirm_tpl', 'Amount: {m}'), { m: `$ ${formatBillingMoney(montoAProcesar)}` }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || window.txt?.facturacion?.billing_modal?.btn_procesar || window.txt?.generales?.procesar || 'Process',
        cancelButtonText: window.txt?.facturacion?.btn_cancelar_swal || window.txt?.generales?.cerrar || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-insumo', 'POST', { 
                id, 
                monto: montoAProcesar, 
                accion
            });

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalInsumo'));
                if (modalInstance) modalInstance.hide();
                await sleepBillingModal(300);
                await openInsumoModal(id);
                await window.recargarGrillaActiva();
            } else {
                Swal.fire(window.txt?.generales?.error || 'Error', res.message || txPayFail(), 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire(window.txt?.generales?.error || 'Error', txPayFail(), 'error');
        } finally {
            hideLoader();
        }
    }
};

window.toggleEditTotalIns = async (id) => {
    await billingPersistTotalFromField('INSUMO', id, 'mdl-ins-total', true);
};

window.guardarPrecioLineaInsumo = async (idForminsumo, idformA) => {
    const inp = document.getElementById(`mdl-ins-line-precio-${idForminsumo}`);
    if (!inp) return;
    const precio = parseFloat(inp.value);
    const tx = txBM();
    if (Number.isNaN(precio) || precio < 0) {
        return Swal.fire(window.txt?.generales?.error || 'Error', tx.ins_err_precio_invalido || 'Precio inválido.', 'warning');
    }
    showLoader();
    try {
        const res = await API.request('/billing/update-insumo-line-precio', 'POST', {
            idForminsumo,
            precio_unitario: precio
        });
        if (res.status === 'success') {
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalInsumo'));
            if (modalInstance) modalInstance.hide();
            await sleepBillingModal(200);
            await openInsumoModal(idformA);
            await window.recargarGrillaActiva();
        } else {
            Swal.fire(window.txt?.generales?.error || 'Error', res.message || txPayFail(), 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire(window.txt?.generales?.error || 'Error', txPayFail(), 'error');
    } finally {
        hideLoader();
    }
};

// ==========================================
// PDF modal alojamiento legacy (`alojamientoModal.js` — #modalAloj)
// ==========================================
window.descargarFichaAlojLegacyPDF = async (historiaId) => {
    const tx = txBM();
    const g = window.txt?.generales || {};
    const diasEl = document.getElementById('mdl-aloj-dias');
    const totalEl = document.getElementById('mdl-aloj-total');
    const pagoEl = document.getElementById('mdl-aloj-pago');
    if (!diasEl || !totalEl || !pagoEl) {
        return Swal.fire(
            window.txt?.generales?.swal_atencion || g.swal_atencion || 'Attention',
            bmTxt(tx, 'err_aloj_legacy_modal', 'Open the housing modal and try again.'),
            'info'
        );
    }
    const dias = String(diasEl.value ?? '');
    const total = parseFloat(totalEl.value || 0);
    const pagado = parseFloat(pagoEl.value || 0);
    const debe = Math.max(0, total - pagado);
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, M + 2, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(bmTpl(bmTxt(tx, 'pdf_aloj_legacy_titulo_tpl', 'HOUSING SUMMARY — HISTORY {id}'), { id: historiaId }), 105, M + 10, { align: 'center' });
    doc.setDrawColor(26, 93, 59);
    doc.line(M, M + 14, right, M + 14);

    let y = M + 24;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bmTxt(tx, 'pdf_aloj_legacy_dias', 'Total days:')} ${dias}`, M, y);
    y += 7;
    doc.text(`${bmTxt(tx, 'pdf_aloj_legacy_cuenta', 'Amount due:')} $ ${formatBillingMoney(total)}`, M, y);
    y += 7;
    doc.text(`${bmTxt(tx, 'pdf_aloj_legacy_liquidado', 'Amount settled:')} $ ${formatBillingMoney(pagado)}`, M, y);
    y += 7;
    doc.setTextColor(200, 0, 0);
    doc.text(`${bmTxt(tx, 'pdf_aloj_legacy_debe', 'Outstanding balance:')} $ ${formatBillingMoney(debe)}`, M, y);
    doc.setTextColor(0);

    const footerY = 265;
    doc.setDrawColor(150);
    doc.line(30, footerY, 85, footerY);
    doc.line(125, footerY, 180, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(bmTxt(tx, 'pdf_firma_resp', 'Facility manager signature'), 57, footerY + 5, { align: 'center' });
    doc.text(bmTxt(tx, 'pdf_sello_fecha', 'Institutional stamp / date'), 152, footerY + 5, { align: 'center' });

    doc.save(`Alojamiento_Legacy_${historiaId}.pdf`);
};

// ==========================================
// GENERACIÓN DE PDF DESDE MODAL (Formularios)
// ==========================================
window.descargarFichaPDF = async (id, tipo) => {
    if (tipo === 'ALOJ') return window.descargarFichaAlojLegacyPDF(id);
    if (tipo !== 'ANIMAL') return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const tx = txBM();
    const na = bmTxt(tx, 'na', 'N/A');

    const findValue = (labelTxt) => {
        if (!labelTxt) return na;
        const labels = Array.from(document.querySelectorAll('#modalAnimal label'));
        const target = labels.find(l => (l.innerText || '').includes(labelTxt));
        return target ? target.nextElementSibling?.innerText || na : na;
    };

    const investigador = document.querySelector('#modalAnimal .text-primary.fw-bold')?.innerText || na;
    const protocoloID = findValue(bmTxt(tx, 'lbl_id_protocolo', 'PROTOCOL ID:'));
    const protocoloNom = findValue(bmTxt(tx, 'lbl_nombre_protocolo', 'PROTOCOL NAME'));
    const tipoPedido = findValue(bmTxt(tx, 'lbl_tipo_pedido', 'ORDER TYPE'));
    const especie = findValue(bmTxt(tx, 'lbl_especie_sub', 'SPECIES / SUBSPECIES'));
    const fechaEntregado = findValue(bmTxt(tx, 'lbl_fecha_retiro', 'PICKUP DATE (ACTUAL)'));

    const counts = Array.from(document.querySelectorAll('#modalAnimal .row.g-2.text-center b, #modalAnimal .row.g-2.text-center span'));
    const m = counts[0]?.innerText || '0';
    const h = counts[1]?.innerText || '0';
    const i = counts[2]?.innerText || '0';
    const total = counts[3]?.innerText || '0';

    const costoTotalNum = parseFloat(document.getElementById('mdl-ani-total')?.value || 0);
    const pagadoNum = parseFloat(document.getElementById('mdl-ani-pagado-val')?.value || 0);
    const isExAnimal = document.getElementById('mdl-ani-exento')?.value === '1';
    const derivadaAnimal = document.getElementById('mdl-ani-derivada')?.value === '1';
    const idPdfAnimal = billingPdfFormularioIdDisplay(
        { id, is_exento: isExAnimal, es_facturacion_derivada: derivadaAnimal },
        { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() }
    );
    const biPdf = txBIPdf();
    const exL = biPdf.pdf_monto_exento || window.txt?.facturacion?.billing_investigador?.pdf_monto_exento || 'Exempt';
    const montosRow = pdfColsPrecioDebePagoTotal(isExAnimal, costoTotalNum, pagadoNum, exL);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, M + 2, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(bmTxt(tx, 'pdf_pedido_animal_titulo', 'ORDER FORM: LABORATORY ANIMALS'), 105, M + 10, { align: "center" });
    doc.setDrawColor(26, 93, 59);
    doc.line(M, M + 14, right, M + 14);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(bmTpl(bmTxt(tx, 'pdf_id_solicitud_tpl', 'REQUEST ID: {id}'), { id: idPdfAnimal }), 20, 42);

    doc.text(bmTxt(tx, 'pdf_sec_datos_inv_prot', 'RESEARCHER AND PROTOCOL DATA'), 20, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${bmTxt(tx, 'pdf_investigador_lbl', 'Researcher:')} ${investigador}`, 20, 58);
    doc.text(bmTpl(bmTxt(tx, 'pdf_protocolo_nom_id_tpl', 'Protocol: {nom} (ID: {id})'), { nom: protocoloNom, id: protocoloID }), 20, 64);

    doc.setFont("helvetica", "bold");
    doc.text(bmTxt(tx, 'pdf_sec_detalle_pedido', 'ORDER DETAILS'), 20, 74);
    doc.setFont("helvetica", "normal");
    doc.text(`${bmTxt(tx, 'pdf_tipo_pedido_lbl', 'Order type:')} ${tipoPedido}`, 20, 80);
    doc.text(`${bmTxt(tx, 'pdf_especie_lbl', 'Species / subspecies:')} ${especie}`, 20, 86);
    doc.setTextColor(200, 0, 0);
    doc.text(`${bmTxt(tx, 'pdf_fecha_retiro_entregado', 'Pickup date (delivered):')} ${fechaEntregado}`, 20, 92);
    doc.setTextColor(0);

    doc.autoTable({
        startY: 98, margin: { left: M, right: M },
        head: [[bmTxt(tx, 'lbl_machos', 'MALES'), bmTxt(tx, 'lbl_hembras', 'FEMALES'), bmTxt(tx, 'lbl_indistintos', 'UNSEXED'), bmTxt(tx, 'lbl_total_animales', 'TOTAL ANIMALES')]],
        body: [[m, h, i, total]],
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        styles: { halign: 'center', fontSize: 11, fontStyle: 'bold' },
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(bmTxt(tx, 'pdf_control_fin', 'FINANCIAL SUMMARY'), M, finalY);
    doc.autoTable({
        startY: finalY + 4,
        margin: { left: M, right: M },
        head: [[
            biPdf.pdf_col_precio || window.txt?.facturacion?.billing_investigador?.pdf_col_precio || 'Price',
            biPdf.pdf_col_debe || window.txt?.facturacion?.billing_investigador?.pdf_col_debe || 'Owing',
            biPdf.pdf_col_pago_total || window.txt?.facturacion?.billing_investigador?.pdf_col_pago_total || 'Total paid'
        ]],
        body: [[montosRow[0], montosRow[1], montosRow[2]]],
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { halign: 'right' }, 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } }
    });

    const footerY = 265;
    doc.setDrawColor(150);
    doc.line(30, footerY, 85, footerY);
    doc.line(125, footerY, 180, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(bmTxt(tx, 'pdf_firma_resp', 'Facility manager signature'), 57, footerY + 5, { align: "center" });
    doc.text(bmTxt(tx, 'pdf_sello_fecha', 'Institutional stamp / date'), 152, footerY + 5, { align: "center" });

    doc.save(`Pedido_Animal_${id}.pdf`);
};

// ==========================================
// GENERACIÓN DE PDF DESDE MODAL (Alojamiento)
// ==========================================
window.descargarFichaAlojPDF = async (historiaId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const tx = txBM();
    const na = bmTxt(tx, 'na', 'N/A');

    const getTxt = (id) => document.getElementById(id)?.innerText || na;
    const getVal = (id) => document.getElementById(id)?.value || '0.00';

    const investigador = getTxt('pdf-aloj-inv');
    const tipoCaja = getTxt('pdf-aloj-tipo');
    const protocolo = getTxt('pdf-aloj-prot');
    const totalDias = getTxt('pdf-aloj-dias');
    const costoTotalNum = parseFloat(getVal('mdl-aloj-total')) || 0;
    const pagadoNum = parseFloat(document.getElementById('mdl-aloj-pagado-val')?.value || 0);
    const isExAloj = document.getElementById('mdl-aloj-exento')?.value === '1';
    const biPdf = txBIPdf();
    const exL = biPdf.pdf_monto_exento || window.txt?.facturacion?.billing_investigador?.pdf_monto_exento || 'Exempt';
    const montosAloj = pdfColsPrecioDebePagoTotal(isExAloj, costoTotalNum, pagadoNum, exL);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(bmTpl(bmTxt(tx, 'pdf_ficha_aloj_titulo_tpl', 'HOUSING HISTORY #{id}'), { id: historiaId }), 105, 28, { align: "center" });
    doc.line(20, 32, 190, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`${bmTxt(tx, 'pdf_ficha_aloj_investigador', 'Investigator:')} ${investigador}`, 20, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${bmTxt(tx, 'pdf_ficha_aloj_tipo_estructura', 'Box/structure type:')} ${tipoCaja}`, 20, 48);
    doc.text(`${bmTxt(tx, 'pdf_ficha_aloj_protocolo', 'Protocol:')} ${protocolo}`, 20, 54);
    doc.text(`${bmTxt(tx, 'pdf_ficha_aloj_dias_acumulados', 'Total accumulated days:')} ${totalDias}`, 20, 60);

    const rows = [];
    document.querySelectorAll('#table-aloj-tramos tbody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText, tds[4].innerText, tds[5].innerText]);
    });

    doc.autoTable({
        startY: 68,
        head: [[
            bmTxt(tx, 'aloj_th_id', 'ID'),
            bmTxt(tx, 'aloj_th_desde', 'From'),
            bmTxt(tx, 'aloj_th_hasta', 'To'),
            bmTxt(tx, 'aloj_th_cant', 'Qty.'),
            bmTxt(tx, 'aloj_th_dias', 'Days'),
            bmTxt(tx, 'aloj_th_subtotal', 'Subtotal')
        ]],
        body: rows,
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        columnStyles: { 0: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(bmTxt(tx, 'pdf_control_fin', 'FINANCIAL SUMMARY'), 20, finalY);
    doc.autoTable({
        startY: finalY + 4,
        margin: { left: 20, right: 20 },
        head: [[
            biPdf.pdf_col_precio || window.txt?.facturacion?.billing_investigador?.pdf_col_precio || 'Price',
            biPdf.pdf_col_debe || window.txt?.facturacion?.billing_investigador?.pdf_col_debe || 'Owing',
            biPdf.pdf_col_pago_total || window.txt?.facturacion?.billing_investigador?.pdf_col_pago_total || 'Total paid'
        ]],
        body: [[montosAloj[0], montosAloj[1], montosAloj[2]]],
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { halign: 'right' }, 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } }
    });

    doc.save(`Ficha_Alojamiento_${historiaId}.pdf`);
};

window.descargarFichaReaPDF = async (idformA) => {
    const tx = txBM();
    const g = window.txt?.generales || {};
    const errPdf = window.txt?.facturacion?.error_pdf || 'Could not generate PDF document.';
    showLoader();
    try {
        const res = await API.request(`/billing/detail-reactive/${idformA}`);
        if (res.status !== 'success') {
            hideLoader();
            return Swal.fire(window.txt?.generales?.error || g.error || 'Error', bmTxt(tx, 'err_reactivo', 'Could not load reactive details.'), 'error');
        }
        const d = res.data;
        hideLoader();

        const rowPdfIdRea = { ...d, id: d.idformA ?? idformA };
        const idSolicitudPdfRea = billingPdfFormularioIdDisplay(rowPdfIdRea, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() });

        const total = parseFloat(d.total_calculado || 0);
        const pagado = parseFloat(d.totalpago || 0);
        const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const biPdf = txBIPdf();
        const exL = biPdf.pdf_monto_exento || window.txt?.facturacion?.billing_investigador?.pdf_monto_exento || 'Exempt';
        const montosRea = pdfColsPrecioDebePagoTotal(d.is_exento == 1, total, pagado, exL);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const pageW = doc.internal.pageSize.getWidth();
        const right = pageW - M;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(26, 93, 59);
        doc.text(`GROBO - ${inst}`, 105, M + 2, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(bmTxt(tx, 'pdf_ficha_rea_titulo', 'ORDER FORM: BIOLOGICAL REAGENT'), 105, M + 10, { align: 'center' });
        doc.setDrawColor(26, 93, 59);
        doc.line(M, M + 14, right, M + 14);

        let y = M + 22;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(bmTpl(bmTxt(tx, 'pdf_id_solicitud_tpl', 'REQUEST ID: {id}'), { id: idSolicitudPdfRea }), M, y);

        y += 10;
        doc.text(bmTxt(tx, 'pdf_sec_datos_inv_prot', 'RESEARCHER AND PROTOCOL DATA'), M, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        doc.text(`${bmTxt(tx, 'pdf_investigador_lbl', 'Researcher:')} ${d.titular_nombre || bmTxt(tx, 'na', 'N/A')}`, M, y);
        y += 6;
        const protTxt = String(d.protocolo_info || bmTxt(tx, 'na', 'N/A')).replace(/\s+/g, ' ');
        const protLines = doc.splitTextToSize(`${bmTxt(tx, 'pdf_rea_protocolo_lbl', 'Protocol:')} ${protTxt}`, right - M);
        doc.text(protLines, M, y);
        y += protLines.length * 5 + 4;

        doc.setFont('helvetica', 'bold');
        doc.text(bmTxt(tx, 'sec_det_bio', 'Biological supply details'), M, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        doc.text(`${bmTxt(tx, 'lbl_reactivo', 'Reactive')}: ${d.nombre_reactivo || bmTxt(tx, 'na', 'N/A')}`, M, y);
        y += 6;
        const cantLbl = bmTpl(bmTxt(tx, 'lbl_cant_present_tpl', 'Qty ({pres} {um})'), {
            pres: String(d.presentacion_reactivo ?? 0),
            um: String(d.unidad_medida ?? '')
        });
        doc.text(`${cantLbl}: ${d.cantidad_organos ?? 0}`, M, y);
        y += 6;
        doc.text(`${bmTxt(tx, 'lbl_animales', 'Animals')}: ${d.animales_usados ?? 0}`, M, y);
        y += 6;
        doc.text(`${bmTxt(tx, 'lbl_inicio', 'Start')}: ${d.fecha_inicio || '-'}`, M, y);
        y += 6;
        doc.text(`${bmTxt(tx, 'lbl_retiro', 'Pickup')}: ${d.fecha_fin || '-'}`, M, y);
        y += 6;
        if (d.is_exento == 1) {
            doc.setTextColor(0, 120, 180);
            doc.text(bmTxt(tx, 'badge_exento', 'EXEMPT'), M, y);
            doc.setTextColor(0);
            y += 6;
        }
        if (d.nota_admin && String(d.nota_admin).trim()) {
            doc.setFont('helvetica', 'bold');
            doc.text(bmTxt(tx, 'pdf_rea_nota_admin_pdf', 'Administrative note:'), M, y);
            doc.setFont('helvetica', 'normal');
            y += 5;
            const noteLines = doc.splitTextToSize(String(d.nota_admin), right - M);
            doc.text(noteLines, M, y);
            y += noteLines.length * 5 + 6;
        } else {
            y += 4;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.text(bmTxt(tx, 'pdf_control_fin', 'FINANCIAL SUMMARY'), M, y);
        doc.autoTable({
            startY: y + 4,
            margin: { left: M, right: M },
            head: [[
                biPdf.pdf_col_precio || window.txt?.facturacion?.billing_investigador?.pdf_col_precio || 'Price',
                biPdf.pdf_col_debe || window.txt?.facturacion?.billing_investigador?.pdf_col_debe || 'Owing',
                biPdf.pdf_col_pago_total || window.txt?.facturacion?.billing_investigador?.pdf_col_pago_total || 'Total paid'
            ]],
            body: [[montosRea[0], montosRea[1], montosRea[2]]],
            theme: 'grid',
            headStyles: { fillColor: [26, 93, 59] },
            styles: { fontSize: 9 },
            columnStyles: { 0: { halign: 'right' }, 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } }
        });

        const footerY = 265;
        doc.setDrawColor(150);
        doc.line(30, footerY, 85, footerY);
        doc.line(125, footerY, 180, footerY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(bmTxt(tx, 'pdf_firma_resp', 'Facility manager signature'), 57, footerY + 5, { align: 'center' });
        doc.text(bmTxt(tx, 'pdf_sello_fecha', 'Institutional stamp / date'), 152, footerY + 5, { align: 'center' });

        doc.save(`Pedido_Reactivo_${idformA}.pdf`);
    } catch (e) {
        hideLoader();
        console.error(e);
        Swal.fire(window.txt?.generales?.error || g.error || 'Error', errPdf, 'error');
    }
};

window.descargarFichaInsPDF = async (idformA) => {
    const tx = txBM();
    const g = window.txt?.generales || {};
    const errPdf = window.txt?.facturacion?.error_pdf || 'Could not generate PDF document.';
    showLoader();
    try {
        const res = await API.request(`/billing/detail-insumo/${idformA}`);
        if (res.status !== 'success') {
            hideLoader();
            return Swal.fire(window.txt?.generales?.error || g.error || 'Error', bmTxt(tx, 'err_insumo', 'Could not load details.'), 'error');
        }
        const d = res.data;
        hideLoader();

        const rowPdfIdIns = { ...d, id: d.id ?? idformA };
        const idSolicitudPdfIns = billingPdfFormularioIdDisplay(rowPdfIdIns, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() });

        const total = billingInsumoMontoTotalCobrable(d);
        const pagado = parseFloat(d.pagado || 0);
        const saldo = parseFloat(d.saldoInv || 0);
        const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const biPdf = txBIPdf();
        const exL = biPdf.pdf_monto_exento || window.txt?.facturacion?.billing_investigador?.pdf_monto_exento || 'Exempt';
        const montosIns = pdfColsPrecioDebePagoTotal(d.is_exento == 1, total, pagado, exL);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const pageW = doc.internal.pageSize.getWidth();
        const right = pageW - M;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(26, 93, 59);
        doc.text(`GROBO - ${inst}`, 105, M + 2, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(bmTxt(tx, 'pdf_ficha_ins_titulo', 'ORDER FORM: SUPPLIES'), 105, M + 10, { align: 'center' });
        doc.setDrawColor(26, 93, 59);
        doc.line(M, M + 14, right, M + 14);

        let y = M + 22;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(bmTpl(bmTxt(tx, 'pdf_id_solicitud_tpl', 'REQUEST ID: {id}'), { id: idSolicitudPdfIns }), M, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text(`${bmTxt(tx, 'lbl_solicitante', 'Requester')}: ${d.solicitante || bmTxt(tx, 'na', 'N/A')}`, M, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text(bmTxt(tx, 'pdf_ins_detalle_sec', 'Order detail'), M, y);
        doc.setFont('helvetica', 'normal');
        y += 5;
        const bullets = String(d.detalle_completo || '').split('|').map(s => s.trim()).filter(Boolean);
        const detalleTxt = bullets.length ? bullets.map(b => `• ${b}`).join('\n') : bmTxt(tx, 'na', 'N/A');
        const detLines = doc.splitTextToSize(detalleTxt, right - M);
        doc.text(detLines, M, y);
        y += detLines.length * 5 + 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.text(`${bmTxt(tx, 'lbl_saldo_disponible_uc', 'AVAILABLE BALANCE')}: $ ${formatBillingMoney(saldo)}`, M, y);
        y += 6;
        doc.text(bmTxt(tx, 'pdf_control_fin', 'FINANCIAL SUMMARY'), M, y);
        doc.autoTable({
            startY: y + 4,
            margin: { left: M, right: M },
            head: [[
                biPdf.pdf_col_precio || window.txt?.facturacion?.billing_investigador?.pdf_col_precio || 'Price',
                biPdf.pdf_col_debe || window.txt?.facturacion?.billing_investigador?.pdf_col_debe || 'Owing',
                biPdf.pdf_col_pago_total || window.txt?.facturacion?.billing_investigador?.pdf_col_pago_total || 'Total paid'
            ]],
            body: [[montosIns[0], montosIns[1], montosIns[2]]],
            theme: 'grid',
            headStyles: { fillColor: [26, 93, 59] },
            styles: { fontSize: 9 },
            columnStyles: { 0: { halign: 'right' }, 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } }
        });

        const footerY = 265;
        doc.setDrawColor(150);
        doc.line(30, footerY, 85, footerY);
        doc.line(125, footerY, 180, footerY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(bmTxt(tx, 'pdf_firma_resp', 'Facility manager signature'), 57, footerY + 5, { align: 'center' });
        doc.text(bmTxt(tx, 'pdf_sello_fecha', 'Institutional stamp / date'), 152, footerY + 5, { align: 'center' });

        doc.save(`Pedido_Insumo_${idformA}.pdf`);
    } catch (e) {
        hideLoader();
        console.error(e);
        Swal.fire(window.txt?.generales?.error || g.error || 'Error', errPdf, 'error');
    }
};