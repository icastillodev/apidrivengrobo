import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

/**
 * 1. Actualiza el saldo (Suma o Resta)
 * Busca el input dinámicamente según si es el Dashboard o un Protocolo específico.
 */
window.updateBalance = async (idUsr, action, isFromProtocol = false, idProt = null) => {
    const inputSelector = isFromProtocol ? `#inp-saldo-prot-${idProt}` : `#inp-saldo-${idUsr}`;
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
            input.value = ''; 
            
            if (typeof window.cargarFacturacionProtocolo === "function") {
                await window.cargarFacturacionProtocolo();
            } else if (typeof window.cargarFacturacionInvestigador === "function") {
                await window.cargarFacturacionInvestigador();
            } else if (typeof window.cargarFacturacionDepto === "function") {
                await window.cargarFacturacionDepto();
            }

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

window.procesarPagoProtocolo = async (idProt) => {
    const prot = window.currentReportData.protocolos.find(p => p.idProt == idProt);
    if (!prot) return;

    let totalAPagar = 0;
    const items = [];

    // Recolectamos selección y EL MONTO EXACTO
    const seleccionados = document.querySelectorAll(`input[data-prot="${idProt}"]:checked:not(.check-all-form):not(.check-all-aloj)`);
    seleccionados.forEach(chk => {
        const montoItem = parseFloat(chk.dataset.monto || 0);
        totalAPagar += montoItem;
        items.push({ 
            tipo: chk.classList.contains('check-item-form') ? 'FORM' : 'ALOJ', 
            id: chk.dataset.id,
            monto_pago: montoItem // CRUCIAL: Se envía al backend
        });
    });

    if (totalAPagar <= 0) {
        Swal.fire('Atención', 'Seleccione qué desea pagar o revise que tengan deuda.', 'info');
        return;
    }

    const saldoActual = parseFloat(prot.saldoInv || 0);

    if (totalAPagar > saldoActual) {
        Swal.fire({
            title: 'Saldo Insuficiente',
            html: `
                <div class="alert alert-danger">
                    El monto seleccionado (<b>$ ${totalAPagar.toLocaleString('es-UY')}</b>) 
                    es mayor al saldo disponible (<b>$ ${saldoActual.toLocaleString('es-UY')}</b>).
                </div>
                <p>Por favor, agregue saldo o seleccione menos ítems.</p>`,
            icon: 'error'
        });
        return;
    }

    const confirm = await Swal.fire({
        title: 'Confirmar Liquidación',
        html: `
            <div class="text-start">
                <p>Estás por liquidar <b>${items.length}</b> ítems.</p>
                <div class="p-3 bg-light rounded border shadow-sm">
                    <div class="d-flex justify-content-between mb-2">
                        <span>Total a pagar:</span> 
                        <span class="fw-bold">$ ${totalAPagar.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between text-success fw-bold">
                        <span>Saldo después del pago:</span> 
                        <span>$ ${(saldoActual - totalAPagar).toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, pagar ahora',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        ejecutarPagoFinal(prot.idUsr, totalAPagar, items);
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
            hideLoader();
            await Swal.fire('¡Pago Procesado!', 'El saldo ha sido actualizado.', 'success');

            if (typeof window.cargarFacturacionProtocolo === "function") {
                await window.cargarFacturacionProtocolo();
            } else if (typeof window.cargarFacturacionInvestigador === "function") {
                await window.cargarFacturacionInvestigador();
            } else if (typeof window.cargarFacturacionDepto === "function") {
                await window.cargarFacturacionDepto();
            }
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) {
        console.error(e);
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
            await Swal.fire('Pago Exitoso', 'Los ítems han sido liquidados y el saldo actualizado.', 'success');
            await window.cargarFacturacionDepto(); // Refresca tablas y dashboard
        }
    } catch (e) { 
        console.error(e); 
        Swal.fire('Error', 'No se pudo procesar el pago.', 'error');
    } finally { 
        hideLoader(); 
    }
};

window.procesarPagoInsumosGenerales = async () => {
    const seleccionados = document.querySelectorAll('.check-item-insumo:checked');
    
    if (seleccionados.length === 0) return Swal.fire('Atención', 'Seleccione al menos un insumo para pagar.', 'info');

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
                        <b>$ ${monto.toLocaleString('es-UY')}</b>
                      </li>`;
    });
    htmlItems += '</ul>';

    const primerItem = window.currentReportData.insumosGenerales.find(i => i.id == items[0].id);
    const saldoActual = parseFloat(primerItem.saldoInv || 0);
    const nombreInvestigador = primerItem.solicitante;

    if (totalAPagar > saldoActual) {
        Swal.fire({
            title: 'Saldo Insuficiente',
            html: `
                <div class="text-start">
                    <p><b>Investigador:</b> ${nombreInvestigador}</p>
                    <p class="text-danger">El saldo disponible ($ ${saldoActual.toLocaleString('es-UY')}) 
                    no es suficiente para cubrir el total ($ ${totalAPagar.toLocaleString('es-UY')}).</p>
                </div>`,
            icon: 'error'
        });
        return;
    }

    const confirm = await Swal.fire({
        title: 'Confirmar Liquidación de Insumos',
        width: '500px',
        html: `
            <div class="text-start">
                <div class="mb-2 small text-muted text-uppercase fw-bold">Investigador Responsable:</div>
                <h6 class="fw-bold mb-3">${nombreInvestigador}</h6>
                ${htmlItems}
                <div class="p-3 bg-light rounded border">
                    <div class="d-flex justify-content-between mb-1">
                        <span>Saldo Actual:</span> <b>$ ${saldoActual.toLocaleString('es-UY')}</b>
                    </div>
                    <div class="d-flex justify-content-between text-primary">
                        <span>Total a Pagar:</span> <b>- $ ${totalAPagar.toLocaleString('es-UY')}</b>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between text-success fw-bold">
                        <span>Saldo Restante:</span> <span>$ ${(saldoActual - totalAPagar).toLocaleString('es-UY')}</span>
                    </div>
                </div>
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, liquidar insumos',
        confirmButtonColor: '#0d6efd',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        ejecutarPagoFinal(primerItem.IdUsrA, totalAPagar, items);
    }
};