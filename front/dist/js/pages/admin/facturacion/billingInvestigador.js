import { API } from '../../../api.js';

let currentData = null;
let currentInvestigadorId = null;

export async function initBillingPersona() {
    await cargarListaInvestigadores();
}

async function cargarListaInvestigadores() {
    const instId = localStorage.getItem('instId');
    // Reutilizamos el endpoint de personas filtrando por los que tienen protocolos o formularios
    const res = await API.request(`/users/list-investigators?inst=${instId}`);
    if (res.status === 'success') {
        const select = document.getElementById('sel-investigador');
        select.innerHTML = '<option value="">-- Seleccionar Investigador --</option>' + 
            res.data.map(u => `<option value="${u.IdUsrA}">${u.ApellidoA}, ${u.NombreA}</option>`).join('');
    }
}

window.cargarFacturacionPersona = async () => {
    currentInvestigadorId = document.getElementById('sel-investigador').value;
    if (!currentInvestigadorId) return Swal.fire('Error', 'Seleccione un investigador', 'error');

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

    panel.classList.remove('d-none');
    document.getElementById('txt-saldo-actual').innerText = `$ ${d.saldo.toFixed(2)}`;
    document.getElementById('lbl-total-sel').innerText = `$ 0.00`;

    if (d.protocolos.length === 0) {
        container.innerHTML = '<div class="alert alert-success text-center fw-bold">EL INVESTIGADOR NO TIENE DEUDAS PENDIENTES.</div>';
        return;
    }

    container.innerHTML = d.protocolos.map(p => `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-dark text-white py-2 d-flex justify-content-between align-items-center">
                <span class="small fw-bold uppercase">Prot: ${p.nprotA}</span>
                <span class="small opacity-75">${p.tituloA.substring(0, 60)}...</span>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-hover align-middle mb-0" style="font-size: 11px;">
                    <thead class="bg-light">
                        <tr class="text-center">
                            <th width="40"><input type="checkbox" class="form-check-input" onclick="window.toggleProtPersona(${p.idProt}, this.checked)"></th>
                            <th>ID</th><th>FECHA</th><th>CONCEPTO</th><th class="text-end">DEUDA</th><th class="text-center">ACCIONES</th>
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
                                <td class="text-end text-danger fw-bold">$ ${i.debe.toFixed(2)}</td>
                                <td><button class="btn btn-xs btn-outline-primary" onclick="window.abrirEdicionIndividual('${i.tipo}', ${i.id})"><i class="bi bi-pencil"></i></button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

// --- GESTIÓN DE SALDOS ---

window.ajustarSaldoPersona = async (accion) => {
    const monto = parseFloat(document.getElementById('input-ajuste-monto').value);
    if (!monto || monto <= 0) return Swal.fire('Atención', 'Ingrese un monto válido', 'warning');

    const fd = new FormData();
    fd.append('idUsr', currentInvestigadorId);
    fd.append('monto', accion === 'add' ? monto : -monto);

    const res = await API.request('/billing/ajustar-saldo', 'POST', fd);
    if (res.status === 'success') {
        Swal.fire('¡Éxito!', 'Saldo actualizado correctamente', 'success');
        window.cargarFacturacionPersona(); // Recargar datos
    }
};

window.recalcularSeleccionPersona = () => {
    let total = 0;
    const checks = document.querySelectorAll('.check-persona-global:checked');
    checks.forEach(c => total += parseFloat(c.dataset.monto));

    document.getElementById('lbl-total-sel').innerText = `$ ${total.toFixed(2)}`;
    document.getElementById('btn-pagar-masivo').disabled = total <= 0;
};

window.pagarSeleccionadosPersona = async () => {
    const checks = document.querySelectorAll('.check-persona-global:checked');
    const items = Array.from(checks).map(c => ({ id: c.dataset.id, tipo: c.dataset.tipo }));
    
    const { isConfirmed } = await Swal.fire({
        title: 'Confirmar Pago',
        text: `¿Desea liquidar los ítems seleccionados utilizando el saldo del investigador?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754'
    });

    if (isConfirmed) {
        const res = await API.request('/billing/pagar-items-saldo', 'POST', {
            idUsr: currentInvestigadorId,
            items: items
        });
        if (res.status === 'success') {
            Swal.fire('Procesado', 'Los ítems han sido liquidados', 'success');
            window.cargarFacturacionPersona();
        }
    }
};