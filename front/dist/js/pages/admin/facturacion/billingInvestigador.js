import { API } from '../../../api.js';
import { formatBillingMoney } from './billingLocale.js';

const txF = () => window.txt?.facturacion || {};
const txL = () => window.txt?.facturacion?.billing_legacy || {};
const txBD = () => window.txt?.facturacion?.billing_depto || {};
const g = () => window.txt?.generales || {};

let currentData = null;
let currentInvestigadorId = null;

export async function initBillingPersona() {
    await cargarListaInvestigadores();
}

async function cargarListaInvestigadores() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/users/list-investigators?inst=${instId}`);
    if (res.status === 'success') {
        const select = document.getElementById('sel-investigador');
        const ph = txL().ph_investigador || txF().billing_investigador?.ph_sel_investigador || '-- Seleccionar Investigador --';
        select.innerHTML = `<option value="">${ph}</option>` +
            res.data.map(u => `<option value="${u.IdUsrA}">${u.ApellidoA}, ${u.NombreA}</option>`).join('');
    }
}

window.cargarFacturacionPersona = async () => {
    currentInvestigadorId = document.getElementById('sel-investigador').value;
    const tf = txF();
    if (!currentInvestigadorId) {
        return Swal.fire(g().error || 'Error', tf.aviso_investigador || 'Seleccione un investigador de la lista.', 'error');
    }

    try {
        const res = await API.request(`/billing/investigador-report?id=${currentInvestigadorId}`);
        if (res.status === 'success') {
            currentData = res.data;
            renderizarFicha();
        }
    } catch (e) { console.error(e); }
};

function renderizarFicha() {
    const panel = document.getElementById('balance-panel');
    const container = document.getElementById('investigador-results');
    const d = currentData;
    const leg = txL();
    const bd = txBD();

    panel.classList.remove('d-none');
    document.getElementById('txt-saldo-actual').innerText = `$ ${formatBillingMoney(d.saldo)}`;
    document.getElementById('lbl-total-sel').innerText = `$ ${formatBillingMoney(0)}`;

    if (d.protocolos.length === 0) {
        container.innerHTML = `<div class="alert alert-success text-center fw-bold">${leg.sin_deudas || 'EL INVESTIGADOR NO TIENE DEUDAS PENDIENTES.'}</div>`;
        return;
    }

    const thId = bd.th_id || 'ID';
    const thFecha = leg.th_fecha || 'FECHA';
    const thConcepto = leg.th_concepto || 'CONCEPTO';
    const thDebe = bd.th_debe_uc || 'DEBE';
    const thAcc = leg.th_acciones || 'ACCIONES';
    const protLbl = leg.prot_corto || 'Prot:';

    container.innerHTML = d.protocolos.map(p => `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-dark text-white py-2 d-flex justify-content-between align-items-center">
                <span class="small fw-bold uppercase">${protLbl} ${p.nprotA}</span>
                <span class="small opacity-75">${p.tituloA.substring(0, 60)}...</span>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-hover align-middle mb-0" style="font-size: 11px;">
                    <thead class="bg-light">
                        <tr class="text-center">
                            <th width="40"><input type="checkbox" class="form-check-input" onclick="window.toggleProtPersona(${p.idProt}, this.checked)"></th>
                            <th>${thId}</th><th>${thFecha}</th><th>${thConcepto}</th><th class="text-end">${thDebe}</th><th class="text-center">${thAcc}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${p.items.map(i => `
                            <tr class="text-center">
                                <td><input type="checkbox" class="form-check-input check-p-${p.idProt} check-persona-global"
                                           data-monto="${i.debe}" data-id="${i.id}" data-tipo="${i.tipo}" onchange="window.recalcularSeleccionPersona()"></td>
                                <td>#${i.id}</td>
                                <td>${i.fecha}</td>
                                <td class="text-start fw-bold">${i.concepto}</td>
                                <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(i.debe)}</td>
                                <td><button class="btn btn-xs btn-outline-primary" onclick="window.abrirEdicionIndividual('${i.tipo}', ${i.id})"><i class="bi bi-pencil"></i></button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

window.ajustarSaldoPersona = async (accion) => {
    const tf = txF();
    const monto = parseFloat(document.getElementById('input-ajuste-monto').value);
    if (!monto || monto <= 0) {
        return Swal.fire(g().swal_atencion || 'Atención', tf.monto_invalido || 'Ingrese un monto válido.', 'warning');
    }

    const fd = new FormData();
    fd.append('idUsr', currentInvestigadorId);
    fd.append('monto', accion === 'add' ? monto : -monto);

    const res = await API.request('/billing/ajustar-saldo', 'POST', fd);
    if (res.status === 'success') {
        Swal.fire(tf.exito_titulo || '¡Éxito!', tf.saldo_actualizado_ok || 'Saldo actualizado correctamente', 'success');
        window.cargarFacturacionPersona();
    }
};

window.recalcularSeleccionPersona = () => {
    let total = 0;
    const checks = document.querySelectorAll('.check-persona-global:checked');
    checks.forEach(c => total += parseFloat(c.dataset.monto));

    document.getElementById('lbl-total-sel').innerText = `$ ${formatBillingMoney(total)}`;
    document.getElementById('btn-pagar-masivo').disabled = total <= 0;
};

window.pagarSeleccionadosPersona = async () => {
    const tf = txF();
    const checks = document.querySelectorAll('.check-persona-global:checked');
    const items = Array.from(checks).map(c => ({ id: c.dataset.id, tipo: c.dataset.tipo }));

    const { isConfirmed } = await Swal.fire({
        title: tf.confirmar_pago_titulo || 'Confirmar Pago',
        text: txL().confirm_liquidar_saldo || '¿Desea liquidar los ítems seleccionados utilizando el saldo del investigador?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: tf.confirmar_pago_btn || 'Sí, pagar ahora',
        cancelButtonText: tf.btn_cancelar_swal || g().btn_cancelar_swal || 'Cancelar'
    });

    if (isConfirmed) {
        const res = await API.request('/billing/pagar-items-saldo', 'POST', {
            idUsr: currentInvestigadorId,
            items: items
        });
        if (res.status === 'success') {
            Swal.fire(tf.procesado_titulo || 'Procesado', tf.items_liquidados || 'Los ítems han sido liquidados', 'success');
            window.cargarFacturacionPersona();
        }
    }
};
