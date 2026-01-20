import { API } from '../../../api.js';

let editModalInstance = null;

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

            // Mapeo de datos al modal
            document.getElementById('edit-item-id').value = id;
            document.getElementById('edit-item-tipo').value = tipo;
            document.getElementById('txt-edit-id').innerText = id;
            document.getElementById('txt-edit-concepto').innerText = d.concepto;
            document.getElementById('input-edit-cant').value = d.cantidad;
            document.getElementById('input-edit-unit').value = d.p_unit.toFixed(2);
            document.getElementById('input-edit-total').value = d.total.toFixed(2);
            document.getElementById('input-edit-obs').value = d.observaciones || '';

            // Estética del Header según deuda
            const header = document.getElementById('header-edit-item');
            const badge = document.getElementById('badge-edit-status');
            if (d.debe > 0) {
                header.className = 'modal-header bg-danger text-white py-2';
                badge.innerHTML = `<span class="badge bg-danger">DEUDA: $ ${d.debe.toFixed(2)}</span>`;
            } else {
                header.className = 'modal-header bg-success text-white py-2';
                badge.innerHTML = `<span class="badge bg-success">LIQUIDADO</span>`;
            }

            // Inicializar eventos de calculadora
            setupCalculadora();

            editModalInstance = new bootstrap.Modal(document.getElementById('modal-edit-item'));
            editModalInstance.show();
        }
    } catch (e) { console.error(e); }
};

/**
 * Lógica de cálculo en tiempo real
 */
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

/**
 * Envía los cambios al servidor y refresca la vista activa
 */
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
            Swal.fire({ title: 'Actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
            
            // LLAMADA DINÁMICA: Refresca la tabla de la página donde estés
            if (window.cargarFacturacionDepto) window.cargarFacturacionDepto();
            if (window.cargarFacturacionPersona) window.cargarFacturacionPersona();
        }
    } catch (e) { console.error(e); }
};