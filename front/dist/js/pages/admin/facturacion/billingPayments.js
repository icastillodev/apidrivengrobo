import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

/**
 * Ajuste manual de saldo (Agregar/Quitar)
 */
window.updateBalance = async (idUsr, action, isFromProtocol = false) => {
    // Seleccionamos el input basándonos en si es dashboard o protocolo
    const inputSelector = isFromProtocol ? `#inp-saldo-prot-${idUsr}` : `#inp-saldo-${idUsr}`;
    const input = document.querySelector(inputSelector);
    
    if (!input || !input.value) {
        Swal.fire('Atención', 'Ingrese un monto antes de operar.', 'warning');
        return;
    }

    let monto = parseFloat(input.value);
    if (action === 'sub') monto = monto * -1;

    try {
        showLoader();
        const res = await API.request('/billing/balance', 'POST', {
            idUsr: idUsr,
            instId: localStorage.getItem('instId') || 1,
            monto: monto
        });

        if (res.status === 'success') {
            input.value = ''; // Limpiamos el campo
            // RECARGA GLOBAL: Esto es vital para ver los cambios
            await window.cargarFacturacionDepto(); 
            
            Swal.fire({
                title: 'Saldo Actualizado',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
    } catch (e) { console.error(e); } finally { hideLoader(); }
};

/**
 * Procesa el pago de los ítems seleccionados en un protocolo
 */
window.procesarPagoProtocolo = async (idProt) => {
    const prot = currentReportData.protocolos.find(p => p.idProt == idProt);
    if (!prot) return;

    let totalAPagar = 0;
    const items = [];

    // Capturamos lo seleccionado
    document.querySelectorAll(`.check-item-form[data-prot="${idProt}"]:checked, .check-item-aloj[data-prot="${idProt}"]:checked`).forEach(chk => {
        totalAPagar += parseFloat(chk.dataset.monto);
        items.push({
            tipo: chk.classList.contains('check-item-form') ? 'FORM' : 'ALOJ',
            id: chk.dataset.id
        });
    });

    if (items.length === 0) {
        Swal.fire('Atención', 'Selecciona qué quieres pagar.', 'warning');
        return;
    }

    const saldoActual = parseFloat(prot.saldoInv);

    // Validación de Saldo
    if (totalAPagar > saldoActual) {
        Swal.fire({
            title: 'Saldo Insuficiente',
            html: `Intentas pagar <b>$ ${totalAPagar.toFixed(2)}</b> pero solo tienes <b>$ ${saldoActual.toFixed(2)}</b>.`,
            icon: 'error'
        });
        return;
    }

    // El "Cartelito" de confirmación
    const confirm = await Swal.fire({
        title: 'Confirmar Liquidación',
        html: `
            <div class="text-start">
                <p>Estás por pagar <b>${items.length}</b> ítems.</p>
                <ul class="list-group list-group-flush mb-3">
                    <li class="list-group-item d-flex justify-content-between">Total a pagar: <span>$ ${totalAPagar.toFixed(2)}</span></li>
                    <li class="list-group-item d-flex justify-content-between">Saldo después: <span>$ ${(saldoActual - totalAPagar).toFixed(2)}</span></li>
                </ul>
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, pagar ahora',
        confirmButtonColor: '#1a5d3b'
    });

    if (confirm.isConfirmed) {
        ejecutarPagoAPI(prot.idUsr, totalAPagar, items);
    }
};

/**
 * Ejecución de la API de Pago
 */
async function ejecutarTransaccionPago(idUsr, monto, items) {
    try {
        showLoader();
        const res = await API.request('/billing/process-payment', 'POST', {
            idUsr,
            monto,
            items, // Array con IDs y Tipos
            instId: localStorage.getItem('instId') || 1
        });

        if (res.status === 'success') {
            await Swal.fire('Pago Exitoso', 'Los ítems han sido liquidados y el saldo actualizado.', 'success');
            window.cargarFacturacionDepto(); // Refresca la vista
        }
    } catch (e) { console.error(e); } finally { hideLoader(); }
}