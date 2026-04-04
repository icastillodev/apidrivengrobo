import { formatBillingMoney } from './billingLocale.js';

/**
 * Orquestador del Dashboard
 */
export function renderDashboard(data) {
    const area = document.getElementById('dashboard-area');
    area.classList.remove('d-none');

    const sep = window.txt?.facturacion?.billing_investigador?.fecha_rango_sep ?? ' a ';
    const desde = document.getElementById('f-desde')?.value || '';
    const hasta = document.getElementById('f-hasta')?.value || '';
    document.getElementById('txt-periodo').innerText =
        desde && hasta ? `${desde}${sep}${hasta}` : `${desde}${hasta}`;

    renderStatsCards(data);
    renderInvestigadoresTable(data);
}

/**
 * Renderiza tarjetas solo si tienen valores > 0
 */
function renderStatsCards(data) {
    const container = document.getElementById('stats-container');
    const t = data.totales || {};
    const f = window.txt?.facturacion || {};

    const configs = [
        { key: 'deuda', always: true, label: f.deuda_total || 'DEUDA TOTAL', val: t.globalDeuda, col: '#dc3545' },
        { key: 'pagado', always: false, label: f.total_pagado_lbl || 'TOTAL PAGADO', val: t.totalPagado || 0, col: '#198754' },
        { key: 'anim', always: false, label: f.debe_animales || 'DEBE ANIMALES', val: t.deudaAnimales || 0, col: '#ffc107' },
        { key: 'react', always: false, label: f.debe_reactivos || 'DEBE REACTIVOS', val: t.deudaReactivos || 0, col: '#0dcaf0' },
        { key: 'aloj', always: false, label: f.debe_alojamiento || 'DEBE ALOJAMIENTO', val: t.deudaAlojamiento || 0, col: '#6610f2' },
        { key: 'ins', always: false, label: f.debe_insumos || 'DEBE INSUMOS', val: t.deudaInsumos || 0, col: '#0d6efd' }
    ];

    container.innerHTML = configs
        .filter(c => c.val > 0 || c.always)
        .map(c => `
            <div class="col-md-2">
                <div class="card stat-card border-0 shadow-sm p-3 text-center" style="border-top: 5px solid ${c.col} !important;">
                    <span class="small text-muted fw-bold uppercase" style="font-size: 9px; letter-spacing: 1px;">${c.label}</span>
                    <h4 class="fw-bold m-0 mt-2" style="color: ${c.col}; font-family: 'Lato';">$ ${formatBillingMoney(parseFloat(c.val))}</h4>
                </div>
            </div>`).join('');
}

export function renderInvestigadoresTable(data) {
    const tbody = document.getElementById('tbody-investigadores');
    if (!tbody) return;

    const invMap = {};

    // 1. Mapeamos Insumos
    if (data.insumosGenerales) {
        data.insumosGenerales.forEach(ins => {
            const uid = ins.IdUsrA;
            if (uid && !invMap[uid]) {
                invMap[uid] = { 
                    nombre: ins.solicitante, 
                    deuda: 0, pagado: 0, 
                    saldo: parseFloat(ins.saldoInv || 0) 
                };
            }
            if (uid) {
                invMap[uid].deuda += parseFloat(ins.debe || 0);
                invMap[uid].pagado += parseFloat(ins.pagado || 0); // SUMAMOS LO PAGADO EN INSUMOS
            }
        });
    }

    // 2. Mapeamos Protocolos
    (data.protocolos || []).forEach(p => {
        const uid = p.idUsr; 
        if (!invMap[uid]) {
            invMap[uid] = { 
                nombre: p.investigador, 
                deuda: 0, pagado: 0, 
                saldo: parseFloat(p.saldoInv || 0) 
            };
        }
        invMap[uid].deuda += (parseFloat(p.deudaAnimales || 0) + parseFloat(p.deudaAlojamiento || 0) + parseFloat(p.deudaReactivos || 0) + parseFloat(p.deudaInsumos || 0));
        
        let pagadoProt = 0;
        (p.formularios || []).forEach(f => pagadoProt += parseFloat(f.pagado || 0));
        (p.alojamientos || []).forEach(a => pagadoProt += parseFloat(a.pagado || 0));
        (p.insumos || []).forEach(i => pagadoProt += parseFloat(i.pagado || 0));
        
        invMap[uid].pagado += pagadoProt;
    });

    tbody.innerHTML = Object.keys(invMap).map(uid => {
        const i = invMap[uid];
        return `
            <tr class="text-center align-middle">
                <td class="text-start ps-4">
                    <div class="fw-bold">${i.nombre} <span class="text-muted small">(ID: ${uid})</span></div>
                </td>
                <td class="text-danger fw-bold">$ ${formatBillingMoney(i.deuda)}</td>
                <td class="text-success fw-bold">$ ${formatBillingMoney(i.pagado)}</td>
                <td>
                    <input type="text" class="form-control form-control-sm text-center fw-bold bg-light shadow-none border-0" 
                           value="$ ${formatBillingMoney(i.saldo)}" 
                           readonly style="width: 130px; margin: 0 auto;">
                </td>
                <td>
                    <div class="input-group input-group-sm shadow-sm" style="width: 220px; margin: 0 auto;">
                        <input type="number" id="inp-saldo-${uid}" class="form-control border-primary" placeholder="${window.txt?.facturacion?.inv_placeholder_monto || 'Monto'}">
                        <button class="btn btn-success" onclick="window.updateBalance(${uid}, 'add')"><i class="bi bi-plus-lg"></i></button>
                        <button class="btn btn-danger" onclick="window.updateBalance(${uid}, 'sub')"><i class="bi bi-dash-lg"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}
