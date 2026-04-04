import { API } from '../../../api.js';
import { formatBillingMoney } from './billingLocale.js';

let editModalInstance = null;

function itemModalTpl(str, map) {
    if (!str) return '';
    return str.replace(/\{m\}/g, () => (map.m != null ? String(map.m) : ''));
}

const txI = () => window.txt?.facturacion?.billing_item_modal || {};

/**
 * Abre el modal de edición cargando los datos desde la API
 * @param {string} tipo - 'form' o 'alojamiento'
 * @param {number} id - ID del registro
 */
window.abrirEdicionIndividual = async (tipo, id) => {
    try {
        const res = await API.request(`/billing/get-item?tipo=${tipo}&id=${id}`);
        if (res.status === 'success') {
            const d = res.data;
            const im = txI();

            document.getElementById('edit-item-id').value = id;
            document.getElementById('edit-item-tipo').value = tipo;
            document.getElementById('txt-edit-id').innerText = id;
            document.getElementById('txt-edit-concepto').innerText = d.concepto;
            document.getElementById('input-edit-cant').value = d.cantidad;
            document.getElementById('input-edit-unit').value = d.p_unit.toFixed(2);
            document.getElementById('input-edit-total').value = d.total.toFixed(2);
            document.getElementById('input-edit-obs').value = d.observaciones || '';

            const header = document.getElementById('header-edit-item');
            const badge = document.getElementById('badge-edit-status');
            if (d.debe > 0) {
                header.className = 'modal-header bg-danger text-white py-2';
                badge.innerHTML = `<span class="badge bg-danger">${itemModalTpl(im.badge_deuda_tpl || 'DEUDA: $ {m}', { m: formatBillingMoney(d.debe) })}</span>`;
            } else {
                header.className = 'modal-header bg-success text-white py-2';
                badge.innerHTML = `<span class="badge bg-success">${im.badge_liquidado || 'LIQUIDADO'}</span>`;
            }

            setupCalculadora();

            editModalInstance = new bootstrap.Modal(document.getElementById('modal-edit-item'));
            editModalInstance.show();
        }
    } catch (e) { console.error(e); }
};

function setupCalculadora() {
    const inpCant = document.getElementById('input-edit-cant');
    const inpUnit = document.getElementById('input-edit-unit');
    const inpTotal = document.getElementById('input-edit-total');

    const recalcularTotal = () => {
        const c = parseFloat(inpCant.value) || 0;
        const u = parseFloat(inpUnit.value) || 0;
        inpTotal.value = (c * u).toFixed(2);
    };

    const recalcularUnitario = () => {
        const t = parseFloat(inpTotal.value) || 0;
        const c = parseFloat(inpCant.value) || 0;
        if (c > 0) inpUnit.value = (t / c).toFixed(2);
    };

    inpCant.oninput = recalcularTotal;
    inpUnit.oninput = recalcularTotal;
    inpTotal.oninput = recalcularUnitario;
}

window.guardarCambiosItem = async () => {
    const data = {
        id: document.getElementById('edit-item-id').value,
        tipo: document.getElementById('edit-item-tipo').value,
        cantidad: document.getElementById('input-edit-cant').value,
        p_unit: document.getElementById('input-edit-unit').value,
        total: document.getElementById('input-edit-total').value,
        obs: document.getElementById('input-edit-obs').value,
        inst: localStorage.getItem('instId')
    };

    try {
        const res = await API.request('/billing/update-item', 'POST', data);
        if (res.status === 'success') {
            editModalInstance.hide();
            Swal.fire({ title: txI().guardado_ok || 'Actualizado', icon: 'success', timer: 1000, showConfirmButton: false });

            if (window.cargarFacturacionDepto) window.cargarFacturacionDepto();
            if (window.cargarFacturacionPersona) window.cargarFacturacionPersona();
        }
    } catch (e) { console.error(e); }
};
