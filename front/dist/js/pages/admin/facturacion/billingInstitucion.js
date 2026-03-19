import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { openAnimalModal } from './modals/animalModal.js';
import { openReactiveModal } from './modals/reactiveModal.js';
import { openInsumoModal } from './modals/insumoModal.js';
import './billingPayments.js';
import './modals/manager.js';

let currentReportDataInst = null;

export async function initBillingInstitucion() {
    const hoy = new Date();
    const fDesde = document.getElementById('f-desde-inst');
    const fHasta = document.getElementById('f-hasta-inst');
    if (fDesde && fHasta) {
        fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fHasta.value = hoy.toISOString().split('T')[0];
    }
    await cargarListaInstituciones();
    const btn = document.getElementById('btn-cargar-inst');
    if (btn) btn.addEventListener('click', cargarFacturacionInstitucion);
}

async function cargarListaInstituciones() {
    try {
        const res = await API.request('/billing/instituciones-derivadas');
        if (res.status === 'success' && Array.isArray(res.data)) {
            const sel = document.getElementById('sel-inst-solicitante');
            if (!sel) return;
            sel.innerHTML = '<option value="">' + (window.txt?.facturacion?.inst_todas || 'TODAS') + '</option>' +
                res.data.map(i => `<option value="${i.id}">${escapeHtml(i.nombre || '')} (ID: ${i.id})</option>`).join('');
        }
    } catch (e) { console.error(e); }
}

async function cargarFacturacionInstitucion() {
    const desde = document.getElementById('f-desde-inst')?.value || null;
    const hasta = document.getElementById('f-hasta-inst')?.value || null;
    const idInst = document.getElementById('sel-inst-solicitante')?.value || null;

    try {
        showLoader();
        const res = await API.request('/billing/institucion-report', 'POST', {
            desde, hasta, estadoCobro: 'all',
            idInstitucionSolicitante: idInst || undefined
        });
        if (res.status === 'success' && res.data) {
            window.currentReportDataInst = res.data;
            await renderResultadosInstitucion(res.data);
        } else {
            if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', res.message || 'No se obtuvieron datos.', 'error');
        }
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_cargar_reporte || 'Error al cargar el reporte.', 'error');
    } finally {
        hideLoader();
    }
}

window.cargarFacturacionInstitucion = cargarFacturacionInstitucion;

async function renderResultadosInstitucion(data) {
    const container = document.getElementById('billing-results-inst');
    const dashboardArea = document.getElementById('dashboard-area-inst');
    if (!container) return;

    const t = window.txt || {};
    const fmt = (v) => `$ ${parseFloat(v || 0).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;

    const tot = data.totales || {};
    const instituciones = Array.isArray(data.instituciones) ? data.instituciones : [];

    // Título dinámico
    const selInst = document.getElementById('sel-inst-solicitante');
    const tituloEl = document.getElementById('titulo-institucion-dinamico');
    const periodoEl = document.getElementById('txt-periodo-inst');
    if (tituloEl) {
        tituloEl.innerText = selInst?.selectedIndex > 0 && selInst?.value
            ? (selInst.options[selInst.selectedIndex]?.text || '')
            : (t.facturacion?.inst_todas || 'TODAS LAS INSTITUCIONES');
    }
    if (periodoEl) {
        const desde = document.getElementById('f-desde-inst')?.value || '';
        const hasta = document.getElementById('f-hasta-inst')?.value || '';
        periodoEl.innerText = (desde && hasta) ? `${desde} a ${hasta}` : '-';
    }

    // Stats cards (formato departamento)
    if (dashboardArea) {
        dashboardArea.classList.remove('d-none');
        const statsContainer = document.getElementById('stats-container-inst');
        if (statsContainer) {
            const configs = [
                { label: t.facturacion?.deuda_total || 'DEUDA TOTAL', val: tot.montoDebe || 0, col: '#dc3545' },
                { label: t.facturacion?.total_pagado_lbl || 'TOTAL PAGADO', val: tot.montoPagado || 0, col: '#198754' },
                { label: t.facturacion?.total || 'TOTAL', val: tot.montoTotal || 0, col: '#0d6efd' },
                { label: t.facturacion?.estado_cobro_todos || 'CANTIDAD', val: tot.cantidad || 0, col: '#6f42c1' }
            ];
            statsContainer.innerHTML = configs
                .filter(c => c.val > 0 || c.label.includes('DEUDA') || c.label.includes('TOTAL'))
                .map(c => `
                    <div class="col-md-2">
                        <div class="card stat-card border-0 shadow-sm p-3 text-center" style="border-top: 5px solid ${c.col} !important;">
                            <span class="small text-muted fw-bold uppercase" style="font-size: 9px; letter-spacing: 1px;">${c.label}</span>
                            <h4 class="fw-bold m-0 mt-2" style="color: ${c.col}; font-family: 'Lato';">${typeof c.val === 'number' && c.label.includes('CANTIDAD') ? c.val : fmt(c.val)}</h4>
                        </div>
                    </div>`).join('');
        }
    }

    if (!instituciones.length) {
        container.innerHTML = `<div class="alert alert-info">${t.facturacion?.sin_datos_institucion || 'No hay facturación derivada para los filtros seleccionados.'}</div>`;
        return;
    }

    // Tabla formato departamento: ID, Estado, Solicitante, Especie/Tipo, Detalle, Total, Pagado, Debe + PDF por fila
    let html = '';
    instituciones.forEach(inst => {
        const items = inst.items || [];
        const ti = inst.totales || {};
        const instNombre = escapeHtml(inst.institucion || '-');

        const grouped = {
            animal: [],
            reactivo: [],
            insumo: [],
            otros: []
        };
        items.forEach((item) => {
            const tipoKey = normalizeTipoFormulario(item.tipoFormulario || item.categoria || item.nombreTipo || '');
            if (grouped[tipoKey]) grouped[tipoKey].push(item);
            else grouped.otros.push(item);
        });

        html += `
            <div class="card card-inst shadow-sm border-0 mb-5" id="card-inst-${inst.idInstitucionSolicitante}">
                <div class="card-header bg-white py-3 border-bottom">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge mb-2 uppercase" style="font-size: 9px; background-color: #6f42c1;">${t.facturacion?.por_institucion || 'Institución'}: ${instNombre}</span>
                            <div class="small text-muted">
                                <span class="me-3">${t.facturacion?.total || 'Total'}: <b class="text-dark">${fmt(ti.montoTotal)}</b></span>
                                <span class="me-3 text-success">${t.facturacion?.total_pagado || 'Pagado'}: ${fmt(ti.montoPagado)}</span>
                                <span class="text-danger fw-bold">${t.facturacion?.falta || 'Debe'}: ${fmt(ti.montoDebe)}</span>
                            </div>
                        </div>
                        <button class="btn btn-link btn-sm text-danger p-0" onclick="window.downloadInstItemPDF(${inst.idInstitucionSolicitante})" title="${t.facturacion?.pdf_global || 'PDF'}">
                            <i class="bi bi-file-earmark-pdf fs-4"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body p-3">
                    <div class="mb-3 border-bottom pb-3">
                        <h6 class="small fw-bold text-uppercase text-muted mb-2" style="letter-spacing:.5px;">${t.facturacion?.inst_investigadores_billetera || 'Investigadores (billetera en esta institución)'}</h6>
                        <p class="small text-muted mb-2">${t.facturacion?.inst_investigadores_ayuda || 'Cargue saldo aquí; luego use la fila del formulario para abrir el modal y pagar con el saldo disponible (PAGAR / QUITAR).'}</p>
                        <div class="row g-2" id="inv-saldos-inst-${inst.idInstitucionSolicitante}"><div class="col-12 small text-muted">${window.txt?.misformularios?.cargando || '...'}</div></div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-bordered table-billing mb-0 tabla-finanzas-inst">
                            <thead class="table-light text-center">
                                <tr>
                                    <th style="width:3%"><input type="checkbox" class="check-all-inst" data-inst="${inst.idInstitucionSolicitante}"></th>
                                    <th style="width:5%">ID</th>
                                    <th style="width:8%">${t.facturacion?.filtro_estado_cobro || 'ESTADO'}</th>
                                    <th style="width:12%">${t.generales?.investigador || 'SOLICITANTE'}</th>
                                    <th style="width:14%">${t.facturacion?.col_instituciones_derivado || 'INSTITUCIONES'}</th>
                                    <th style="width:10%">${t.generales?.especie || 'TIPO'}</th>
                                    <th style="width:14%">${t.facturacion?.col_formulario || 'DETALLE'}</th>
                                    <th style="width:8%">${t.facturacion?.total || 'TOTAL'}</th>
                                    <th style="width:8%">${t.facturacion?.total_pagado || 'PAGADO'}</th>
                                    <th style="width:8%">${t.facturacion?.falta || 'DEBE'}</th>
                                    <th style="width:5%">PDF</th>
                                </tr>
                            </thead>
                            <tbody>${renderTipoSectionRows(grouped, fmt, inst, t)}</tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer bg-white border-top py-3 shadow-sm">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                        <div class="d-flex gap-5 align-items-center">
                            <div class="text-center">
                                <small class="text-muted text-uppercase fw-bold" style="font-size:9px">${t.facturacion?.total || 'Total'}</small>
                                <b class="fs-6 d-block text-dark">${fmt(ti.montoTotal)}</b>
                            </div>
                            <div class="text-center">
                                <small class="text-muted text-uppercase fw-bold" style="font-size:9px">${t.facturacion?.falta || 'Debe'}</small>
                                <b class="fs-6 text-danger d-block">${fmt(ti.montoDebe)}</b>
                            </div>
                            <button type="button" class="btn btn-link btn-sm text-danger p-0" onclick="window.downloadInstItemPDF(${inst.idInstitucionSolicitante})">
                                <i class="bi bi-file-earmark-pdf fs-4 me-1"></i> ${t.facturacion?.pdf_global || 'PDF'}
                            </button>
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <div class="text-end">
                                <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">${t.facturacion?.seleccionado_lbl || 'Seleccionado'}:</small>
                                <span class="fs-5 fw-bold text-primary" id="pago-seleccionado-inst-${inst.idInstitucionSolicitante}">$ 0.00</span>
                            </div>
                            <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" style="background-color: #6f42c1; border-color: #6f42c1;" onclick="window.procesarPagoInstitucion(${inst.idInstitucionSolicitante})">
                                <i class="bi bi-wallet2 me-2"></i> ${t.facturacion?.btn_pagar_sel || 'Pagar Selección'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
    vincularCheckboxesInst();
    await hydrateInvestigadoresSaldosInst(instituciones);
}

/**
 * Bloques por investigador: saldo + cargar/quitar (misma lógica que facturación por investigador).
 */
async function hydrateInvestigadoresSaldosInst(instituciones) {
    const t = window.txt?.facturacion || {};
    for (const inst of instituciones) {
        const host = document.getElementById(`inv-saldos-inst-${inst.idInstitucionSolicitante}`);
        if (!host) continue;
        const map = new Map();
        (inst.items || []).forEach((it) => {
            const id = it.idInvestigador;
            if (!id) return;
            if (!map.has(id)) map.set(id, { id, name: it.investigador || `#${id}` });
        });
        if (!map.size) {
            host.innerHTML = `<div class="col-12 small text-muted">${t.inst_sin_investigadores || 'Sin investigadores en este resumen.'}</div>`;
            continue;
        }
        const rows = [...map.values()].map((v) => `
            <div class="col-md-6 col-lg-4">
                <div class="border rounded p-2 bg-white shadow-sm small">
                    <div class="fw-bold text-truncate" title="${escapeHtml(v.name)}">${escapeHtml(v.name)}</div>
                    <div class="text-muted mb-1">ID: ${v.id}</div>
                    <div class="mb-2"><span class="badge bg-success inv-saldo-badge-inst" data-idusr="${v.id}">${t.cargando_saldos || '...'}</span></div>
                    <div class="input-group input-group-sm">
                        <input type="number" step="0.01" class="form-control" id="inp-saldo-${v.id}" placeholder="${window.txt?.facturacion?.inv_placeholder_monto || 'Monto'}">
                        <button type="button" class="btn btn-success" onclick="window.updateBalance(${v.id}, 'add', false)"><i class="bi bi-plus-lg"></i></button>
                        <button type="button" class="btn btn-danger" onclick="window.updateBalance(${v.id}, 'sub', false)"><i class="bi bi-dash-lg"></i></button>
                    </div>
                </div>
            </div>`).join('');
        host.innerHTML = rows;
        await Promise.all([...map.values()].map(async (v) => {
            try {
                const res = await API.request(`/billing/get-investigator-balance/${v.id}`);
                const saldo = res.status === 'success' ? parseFloat(res.data.SaldoDinero || 0) : 0;
                const badge = host.querySelector(`.inv-saldo-badge-inst[data-idusr="${v.id}"]`);
                if (badge) {
                    badge.textContent = `$ ${saldo.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
                }
            } catch (e) {
                const badge = host.querySelector(`.inv-saldo-badge-inst[data-idusr="${v.id}"]`);
                if (badge) badge.textContent = '$ —';
            }
        }));
    }
}

function renderTipoSectionRows(grouped, fmt, inst, t) {
    const sections = [
        { key: 'animal', label: getTipoSectionLabel('animal', t) },
        { key: 'reactivo', label: getTipoSectionLabel('reactivo', t) },
        { key: 'insumo', label: getTipoSectionLabel('insumo', t) },
        { key: 'otros', label: getTipoSectionLabel('otros', t) }
    ];
    const rows = [];
    sections.forEach((section) => {
        const list = grouped[section.key] || [];
        if (!list.length) return;
        rows.push(`<tr class="table-secondary"><td colspan="11" class="text-start fw-bold uppercase" style="font-size:10px; letter-spacing:.5px;">${escapeHtml(section.label)}</td></tr>`);
        list.forEach((item) => {
            const debe = parseFloat(item.montoDebe || 0);
            const estadoBadge = estadoWorkflowCell(item, t);
            const rowStyle = debe <= 0 ? 'background-color: #f8fff9 !important;' : '';
            const idFact = item.idFacturacionDerivada || item.IdFacturacionFormularioDerivado || 0;
            const chkDisabled = debe <= 0 ? 'disabled' : '';
            const tipoKey = normalizeTipoFormulario(item.tipoFormulario || item.categoria || item.nombreTipo || '');
            const tipoModal = getTipoModal(tipoKey);
            const idInv = item.idInvestigador != null && item.idInvestigador !== '' ? parseInt(item.idInvestigador, 10) : '';
            rows.push(`
                <tr class="text-center align-middle pointer" style="${rowStyle}" onclick="if(event.target.tagName!=='INPUT' && event.target.tagName!=='BUTTON' && !event.target.closest('button')) window.openBillingInstModal('${tipoModal}', ${item.idformA})">
                    <td><input type="checkbox" class="check-item-inst" data-inst="${inst.idInstitucionSolicitante}" data-id="${idFact}" data-idusr="${idInv}" data-monto="${debe}" ${chkDisabled}></td>
                    <td class="small text-muted fw-bold">#${item.idformA}</td>
                    <td>${estadoBadge}</td>
                    <td class="small fw-bold text-start ps-2">${escapeHtml(item.investigador || '-')}</td>
                    <td class="small text-start ps-2" title="${escapeHtml((item.institucionOrigen || '') + ' → ' + (item.institucionDestino || ''))}">${escapeHtml((item.institucionOrigen || '-') + ' → ' + (item.institucionDestino || '-'))}</td>
                    <td class="small text-secondary">${escapeHtml(item.nombreTipo || getTipoSectionLabel(tipoKey, t) || '-')}</td>
                    <td class="text-start ps-3 small">${escapeHtml(item.nombreTipo || item.categoria || '-')}</td>
                    <td class="text-end fw-bold text-dark">${fmt(item.montoTotal)}</td>
                    <td class="text-end text-success fw-bold">${fmt(item.montoPagado)}</td>
                    <td class="text-end text-danger fw-bold">${fmt(item.montoDebe)}</td>
                    <td>
                        <button class="btn btn-link btn-sm text-danger p-0" onclick="event.stopPropagation(); window.downloadInstFilaPDF(${item.idformA}, ${inst.idInstitucionSolicitante})" title="PDF">
                            <i class="bi bi-file-earmark-pdf"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    });
    return rows.join('');
}

function normalizeTipoFormulario(v) {
    const s = String(v || '').toLowerCase();
    if (s.includes('reactiv')) return 'reactivo';
    if (s.includes('insumo')) return 'insumo';
    if (s.includes('animal')) return 'animal';
    return 'otros';
}

function getTipoModal(tipoKey) {
    if (tipoKey === 'reactivo') return 'REACTIVO';
    if (tipoKey === 'insumo') return 'INSUMO';
    return 'ANIMAL';
}

function getTipoSectionLabel(tipoKey, t) {
    if (tipoKey === 'animal') return t.generales?.animales || 'ANIMALES';
    if (tipoKey === 'reactivo') return t.generales?.reactivos || 'REACTIVOS';
    if (tipoKey === 'insumo') return t.generales?.insumos || 'INSUMOS';
    return t.generales?.otros || 'OTROS';
}

function vincularCheckboxesInst() {
    document.querySelectorAll('.check-all-inst').forEach(chkAll => {
        chkAll.addEventListener('change', (e) => {
            const instId = e.target.dataset.inst;
            document.querySelectorAll(`.check-item-inst[data-inst="${instId}"]:not(:disabled)`).forEach(c => c.checked = e.target.checked);
            actualizarMontoVisualInst(instId);
        });
    });
    document.querySelectorAll('.check-item-inst').forEach(chk => {
        chk.addEventListener('change', function() { actualizarMontoVisualInst(this.dataset.inst); });
    });
}

function actualizarMontoVisualInst(instId) {
    const visor = document.getElementById(`pago-seleccionado-inst-${instId}`);
    if (!visor) return;
    let total = 0;
    document.querySelectorAll(`.check-item-inst[data-inst="${instId}"]:checked`).forEach(chk => {
        total += parseFloat(chk.dataset.monto || 0);
    });
    visor.innerText = `$ ${total.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
    visor.classList.toggle('text-success', total > 0);
    visor.classList.toggle('text-primary', total <= 0);
}

window.procesarPagoInstitucion = async (idInstSol) => {
    const seleccionados = document.querySelectorAll(`.check-item-inst[data-inst="${idInstSol}"]:checked`);
    if (!seleccionados.length) {
        if (window.Swal) window.Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.seleccione_que_pagar || 'Seleccione qué desea pagar o revise que tengan deuda.', 'info');
        return;
    }
    const t = window.txt?.facturacion || {};
    const gen = window.txt?.generales || {};

    let totalAPagar = 0;
    const items = [];
    const porInv = new Map();
    for (const chk of seleccionados) {
        const idUsr = parseInt(chk.dataset.idusr || '0', 10);
        const monto = parseFloat(chk.dataset.monto || 0);
        if (!idUsr) {
            if (window.Swal) {
                window.Swal.fire(gen.swal_atencion || 'Atención', t.inst_sin_id_investigador || 'Un ítem seleccionado no tiene investigador asociado. Recargue el reporte e intente de nuevo.', 'warning');
            }
            return;
        }
        totalAPagar += monto;
        items.push({ idFacturacionDerivada: parseInt(chk.dataset.id, 10), monto_pago: monto });
        porInv.set(idUsr, (porInv.get(idUsr) || 0) + monto);
    }

    // Misma regla que facturación por protocolo: saldo en billetera de esta institución por investigador.
    const insuf = [];
    await Promise.all([...porInv.entries()].map(async ([idUsr, montoRequerido]) => {
        try {
            const res = await API.request(`/billing/get-investigator-balance/${idUsr}`);
            const saldo = res.status === 'success' ? parseFloat(res.data.SaldoDinero || 0) : 0;
            if (montoRequerido > saldo + 0.009) {
                insuf.push({ idUsr, montoRequerido, saldo });
            }
        } catch (e) {
            insuf.push({ idUsr, montoRequerido, saldo: 0 });
        }
    }));

    if (insuf.length) {
        const fmtM = (v) => `$ ${parseFloat(v || 0).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
        const reqL = t.inst_requiere || 'Requiere';
        const dispL = t.inst_disponible || 'Disponible';
        const filas = insuf.map((r) =>
            `<div class="small mb-2"><b>ID ${r.idUsr}</b> — ${reqL} ${fmtM(r.montoRequerido)}; ${dispL} ${fmtM(r.saldo)}</div>`
        ).join('');
        if (window.Swal) {
            window.Swal.fire({
                title: t.saldo_insuficiente || 'Saldo insuficiente',
                html: `<div class="alert alert-danger text-start small">${t.saldo_insuficiente_inst_desc || 'No hay saldo suficiente en la billetera (esta institución) para uno o más investigadores.'}</div><div class="text-start">${filas}</div>`,
                icon: 'error'
            });
        }
        return;
    }

    const resumenInv = [...porInv.entries()].map(([idUsr, m]) => {
        return `<div class="d-flex justify-content-between small"><span>ID ${idUsr}</span><span class="fw-bold">$ ${m.toLocaleString('es-UY', { minimumFractionDigits: 2 })}</span></div>`;
    }).join('');

    const confirm = await Swal.fire({
        title: t.confirm_pago || 'Confirmar Liquidación',
        html: `
            <div class="text-start">
                <p>${t.inst_confirm_debito_desc || 'Se descontará el saldo de cada investigador en esta institución (como en las demás facturaciones).'}</p>
                <p class="mb-2">Estás por registrar pago de <b>${items.length}</b> formularios derivados.</p>
                <div class="p-3 bg-light rounded border shadow-sm mb-2">
                    <div class="d-flex justify-content-between mb-2">
                        <span>${t.total_a_debitar || 'Total a debitar de billeteras'}:</span>
                        <span class="fw-bold">$ ${totalAPagar.toLocaleString('es-UY', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="border-top pt-2 mt-2">${resumenInv}</div>
                </div>
            </div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: t.confirmar_pago_btn || 'Sí, pagar ahora',
        confirmButtonColor: '#6f42c1',
        cancelButtonText: window.txt?.generales?.cancelar || 'Cancelar'
    });
    if (confirm.isConfirmed) {
        try {
            showLoader();
            const res = await API.request('/billing/process-payment-institucion', 'POST', { items });
            hideLoader();
            if (res.status === 'success') {
                if (window.Swal) window.Swal.fire(t.pago_procesado || '¡Pago Procesado!', res.message || 'El pago ha sido registrado.', 'success');
                cargarFacturacionInstitucion();
            } else {
                if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', res.message || 'No se pudo procesar.', 'error');
            }
        } catch (e) {
            console.error(e);
            hideLoader();
            if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_cargar_reporte || 'Error al procesar el pago.', 'error');
        }
    }
};

function estadoCobroBadge(estado) {
    const n = Number(estado);
    const t = window.txt?.facturacion || {};
    if (n === 1) return `<span class="badge bg-danger shadow-sm">${t.estado_cobro_pendiente || 'PENDIENTE'}</span>`;
    if (n === 2) return `<span class="badge bg-warning text-dark shadow-sm">${t.estado_cobro_parcial || 'PARCIAL'}</span>`;
    if (n === 3) return `<span class="badge bg-success shadow-sm">${t.estado_cobro_pagado || 'PAGADO'}</span>`;
    if (n === 4) return `<span class="badge bg-secondary shadow-sm">${t.estado_cobro_anulado || 'ANULADO'}</span>`;
    return '<span class="badge bg-light text-dark">-</span>';
}

function estadoWorkflowCell(item, t) {
    const origen = String(item.estadoOrigen || '').trim();
    const destino = String(item.estadoDestino || '').trim();
    if (origen || destino) {
        const o = escapeHtml(origen || '-');
        const d = escapeHtml(destino || '-');
        return `<div class="small lh-sm text-start"><div><b>${o}</b></div><div class="text-muted"><b>${d}</b></div></div>`;
    }
    return estadoCobroBadge(item.estadoCobro);
}

function openBillingInstModal(tipo, id) {
    if (tipo === 'REACTIVO') {
        openReactiveModal(id);
        return;
    }
    if (tipo === 'INSUMO') {
        openInsumoModal(id);
        return;
    }
    openAnimalModal(id);
}

window.openBillingInstModal = openBillingInstModal;

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
}

function getInstSelectedDateRangeLabel() {
    const desde = document.getElementById('f-desde-inst')?.value || '';
    const hasta = document.getElementById('f-hasta-inst')?.value || '';
    if (!desde && !hasta) return '-';
    if (desde && hasta) return `${desde} a ${hasta}`;
    return desde || hasta;
}

function getInstNombreSeleccionada() {
    const sel = document.getElementById('sel-inst-solicitante');
    if (!sel || sel.selectedIndex < 1) return (window.txt?.facturacion?.inst_todas || 'TODAS');
    return sel.options[sel.selectedIndex]?.text || 'INSTITUCIÓN';
}

window.downloadInstFilaPDF = async (idformA, idInstSol) => {
    if (!window.currentReportDataInst?.instituciones) return;
    const inst = window.currentReportDataInst.instituciones.find(i => i.idInstitucionSolicitante == idInstSol);
    if (!inst) return;
    const item = (inst.items || []).find(it => it.idformA == idformA);
    if (!item) return;

    showLoader();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const instNombre = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const violeta = [111, 66, 193];

        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(violeta[0], violeta[1], violeta[2]);
        doc.text(`GROBO - ${instNombre}`, 105, M, { align: 'center' });
        doc.setFontSize(11); doc.setTextColor(100);
        doc.text('FICHA FINANCIERA - FORMULARIO DERIVADO', 105, M + 7, { align: 'center' });
        doc.line(M, M + 10, 195, M + 10);

        doc.setFontSize(10); doc.setTextColor(0);
        doc.setFont('helvetica', 'bold'); doc.text('ID Formulario:', M, M + 22);
        doc.setFont('helvetica', 'normal'); doc.text(`#${item.idformA}`, 50, M + 22);
        doc.setFont('helvetica', 'bold'); doc.text('Institución:', M, M + 28);
        doc.setFont('helvetica', 'normal'); doc.text(inst.institucion || '-', 50, M + 28);
        doc.setFont('helvetica', 'bold'); doc.text('Investigador:', M, M + 34);
        doc.setFont('helvetica', 'normal'); doc.text(item.investigador || '-', 50, M + 34);
        doc.setFont('helvetica', 'bold'); doc.text('Tipo:', M, M + 40);
        doc.setFont('helvetica', 'normal'); doc.text(item.nombreTipo || item.categoria || '-', 50, M + 40);
        doc.setFont('helvetica', 'bold'); doc.text('Total:', M, M + 46);
        doc.setFont('helvetica', 'normal'); doc.text(`$ ${parseFloat(item.montoTotal || 0).toFixed(2)}`, 50, M + 46);
        doc.setFont('helvetica', 'bold'); doc.text('Pagado:', M, M + 52);
        doc.setFont('helvetica', 'normal'); doc.text(`$ ${parseFloat(item.montoPagado || 0).toFixed(2)}`, 50, M + 52);
        doc.setFont('helvetica', 'bold'); doc.text('Debe:', M, M + 58);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 0, 0); doc.text(`$ ${parseFloat(item.montoDebe || 0).toFixed(2)}`, 50, M + 58);

        doc.save(`Ficha_Form_${item.idformA}_Inst.pdf`);
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.facturacion?.error_pdf || 'Error', 'No se pudo generar el PDF.', 'error');
    } finally { hideLoader(); }
};

window.downloadInstItemPDF = async (idInstSol) => {
    if (!window.currentReportDataInst?.instituciones) return;
    const inst = window.currentReportDataInst.instituciones.find(i => i.idInstitucionSolicitante == idInstSol);
    if (!inst || !(inst.items || []).length) return;

    showLoader();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const instNombre = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const violeta = [111, 66, 193];
        const rango = getInstSelectedDateRangeLabel();

        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(violeta[0], violeta[1], violeta[2]);
        doc.text(`GROBO - ${instNombre}`, 105, M, { align: 'center' });
        doc.setFontSize(11); doc.setTextColor(100);
        doc.text('REPORTE FACTURACIÓN POR INSTITUCIÓN', 105, M + 7, { align: 'center' });
        doc.setFontSize(9); doc.text(`INSTITUCIÓN: ${(inst.institucion || '').toUpperCase()}`, 105, M + 12, { align: 'center' });
        doc.setFontSize(9); doc.text(`RANGO: ${rango}`, 105, M + 16, { align: 'center' });
        doc.line(M, M + 19, 195, M + 19);

        const body = (inst.items || []).map(i => [
            `#${i.idformA}`,
            i.investigador || '-',
            (i.nombreTipo || i.categoria || '-').substring(0, 40),
            `$ ${parseFloat(i.montoTotal || 0).toFixed(2)}`,
            `$ ${parseFloat(i.montoPagado || 0).toFixed(2)}`,
            `$ ${parseFloat(i.montoDebe || 0).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: M + 24, margin: { left: M, right: M },
            head: [['ID', 'Investigador', 'Tipo', 'Total', 'Pagado', 'Debe']],
            body, theme: 'grid', headStyles: { fillColor: violeta },
            styles: { fontSize: 8 },
            columnStyles: { 2: { cellWidth: 60 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
        });

        const ti = inst.totales || {};
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL DEUDA: $ ${parseFloat(ti.montoDebe || 0).toFixed(2)}`, 195, finalY, { align: 'right' });

        doc.save(`Facturacion_Inst_${idInstSol}.pdf`);
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.facturacion?.error_pdf || 'Error', 'No se pudo generar el PDF.', 'error');
    } finally { hideLoader(); }
};

window.downloadInstGlobalPDF = async () => {
    if (!window.currentReportDataInst) {
        if (window.Swal) window.Swal.fire(window.txt?.facturacion?.sin_datos_cargados || 'Aviso', 'No hay datos cargados.', 'info');
        return;
    }
    showLoader();
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const M = 18;
        const instNombre = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const violeta = [111, 66, 193];
        const rango = getInstSelectedDateRangeLabel();
        const titulo = getInstNombreSeleccionada();

        doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(violeta[0], violeta[1], violeta[2]);
        doc.text('REPORTE FACTURACIÓN POR INSTITUCIÓN', 148, M, { align: 'center' });
        doc.setFontSize(12); doc.setTextColor(100); doc.text(`INSTITUCIÓN: ${titulo.toUpperCase()}`, 148, M + 7, { align: 'center' });
        doc.setFontSize(10); doc.text(`RANGO: ${rango}`, 148, M + 12, { align: 'center' });
        doc.line(M, M + 15, 277, M + 15);

        const t = window.currentReportDataInst.totales || {};
        doc.autoTable({
            startY: M + 22, margin: { left: M, right: M },
            head: [[(window.txt?.facturacion?.total || 'TOTAL'), (window.txt?.facturacion?.total_pagado || 'PAGADO'), (window.txt?.facturacion?.falta || 'DEBE'), (window.txt?.facturacion?.estado_cobro_todos || 'CANTIDAD')]],
            body: [[`$ ${parseFloat(t.montoTotal || 0).toFixed(2)}`, `$ ${parseFloat(t.montoPagado || 0).toFixed(2)}`, `$ ${parseFloat(t.montoDebe || 0).toFixed(2)}`, t.cantidad || 0]],
            theme: 'grid', headStyles: { fillColor: [40, 40, 40], halign: 'center' }, styles: { halign: 'center', fontSize: 10 }
        });

        let currentY = doc.lastAutoTable.finalY + 12;
        (window.currentReportDataInst.instituciones || []).forEach(inst => {
            if (currentY > 160) { doc.addPage('l'); currentY = M; }
            doc.setFillColor(245, 245, 245); doc.rect(M, currentY, 259, 8, 'F');
            doc.setFontSize(10); doc.setTextColor(violeta[0], violeta[1], violeta[2]);
            doc.text(`${inst.institucion || '-'}`, M + 3, currentY + 6);
            currentY += 12;

            const body = (inst.items || []).map(i => [
                `#${i.idformA}`, i.investigador || '-', (i.nombreTipo || i.categoria || '-').substring(0, 35),
                `$ ${parseFloat(i.montoTotal || 0).toFixed(2)}`, `$ ${parseFloat(i.montoDebe || 0).toFixed(2)}`
            ]);
            if (body.length) {
                doc.autoTable({
                    startY: currentY, margin: { left: M, right: M },
                    head: [['ID', 'Investigador', 'Tipo', 'Total', 'Debe']],
                    body, theme: 'grid', headStyles: { fillColor: violeta },
                    styles: { fontSize: 7 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }
        });

        const pages = doc.internal.getNumberOfPages();
        for (let j = 1; j <= pages; j++) {
            doc.setPage(j); doc.setFontSize(8); doc.setTextColor(150);
            doc.text(`Institución: ${instNombre} | ${new Date().toLocaleString()}`, 15, 202);
            doc.text(`Página ${j} de ${pages}`, 277, 202, { align: 'right' });
        }

        const safeName = `Facturacion_Inst_${titulo}_${instNombre}`.replace(/[^a-zA-Z0-9_ \-\(\)]/g, '_');
        doc.save(`${safeName}.pdf`);
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.facturacion?.error_pdf || 'Error', 'No se pudo generar el PDF.', 'error');
    } finally { hideLoader(); }
};

window.exportExcelInstGlobal = () => {
    if (!window.currentReportDataInst) {
        if (window.Swal) window.Swal.fire(window.txt?.facturacion?.sin_datos_cargados || 'Aviso', 'No hay datos cargados.', 'info');
        return;
    }
    const instNombre = (localStorage.getItem('NombreInst') || 'BIOTERIO').toUpperCase();
    const titulo = getInstNombreSeleccionada();
    const dataMatrix = [];

    (window.currentReportDataInst.instituciones || []).forEach(inst => {
        (inst.items || []).forEach(item => {
            dataMatrix.push({
                'Institución': inst.institucion || '-',
                'ID Formulario': item.idformA,
                'Investigador': item.investigador || '-',
                'Tipo': item.nombreTipo || item.categoria || '-',
                'Categoría': item.categoria || '-',
                'Total': parseFloat(item.montoTotal || 0),
                'Pagado': parseFloat(item.montoPagado || 0),
                'Debe': parseFloat(item.montoDebe || 0)
            });
        });
    });

    if (!dataMatrix.length) {
        if (window.Swal) window.Swal.fire('Aviso', 'No hay datos para exportar.', 'info');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataMatrix);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturación');
    const safeName = `Facturacion_Inst_${titulo}_${instNombre}`.replace(/[^a-zA-Z0-9_ \-\(\)]/g, '_');
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
};
