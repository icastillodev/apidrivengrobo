import { API } from '../../../api.js';
import { hideLoader, showLoader } from '../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../components/MenuComponent.js';
import { renderDashboard } from './billingDashboard.js'; // Asegura que la ruta sea correcta
import './billingPayments.js';
import './Modals/manager.js';

let currentReportData = null;

export async function initBillingDepto() {
    try {
        aplicarEstilosTablas();
        showLoader();
        await refreshMenuNotifications();
        const hoy = new Date();
        const fDesde = document.getElementById('f-desde');
        const fHasta = document.getElementById('f-hasta');
        if (fDesde && fHasta) {
            fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
            fHasta.value = hoy.toISOString().split('T')[0];
        }
        await cargarListaDeptos();
    } catch (error) { console.error("Error en init:", error); } finally { hideLoader(); }
}

async function cargarListaDeptos() {
    const instId = localStorage.getItem('instId') || 1;
    try {
        const res = await API.request(`/deptos/list?inst=${instId}`);
        if (res.status === 'success' && res.data) {
            const select = document.getElementById('sel-depto');
            if (select) {
                select.innerHTML = '<option value="">-- SELECCIONAR --</option>' + 
                    res.data.map(d => `<option value="${d.iddeptoA}">${d.NombreDeptoA}</option>`).join('');
            }
        }
    } catch (e) { console.error(e); }
}

window.cargarFacturacionDepto = async () => {
    const deptoId = document.getElementById('sel-depto').value;
    const desde = document.getElementById('f-desde').value;
    const hasta = document.getElementById('f-hasta').value;
    
    const chkAni = document.getElementById('chk-animales').checked;
    const chkAlo = document.getElementById('chk-alojamiento').checked;
    const chkIns = document.getElementById('chk-insumos').checked;

    if (!chkAni && !chkAlo && !chkIns) {
        Swal.fire('Atención', 'Debe tener al menos un filtro activo (Animales, Alojamiento o Insumos).', 'warning');
        return;
    }

    if (!deptoId) { Swal.fire('Atención', 'Seleccione un departamento.', 'warning'); return; }

    try {
        showLoader();
        const res = await API.request('/billing/depto-report', 'POST', { depto: deptoId, desde, hasta, chkAni, chkAlo, chkIns });
        if (res.status === 'success') {
            // CAMBIO AQUÍ: Usamos window para que sea accesible en todas las funciones
            window.currentReportData = res.data; 
            renderizarResultados(window.currentReportData);
        } else { Swal.fire('Error', res.message, 'error'); }
    } catch (error) { console.error(error); } finally { hideLoader(); }
};
function renderizarResultados(data) {
    const container = document.getElementById('billing-results');

    // 1. Ejecutamos la lógica del Dashboard
    renderDashboard(data);


    const showIns = document.getElementById('chk-insumos').checked;
    const showAni = document.getElementById('chk-animales').checked;
    const showAlo = document.getElementById('chk-alojamiento').checked;
    
    let html = '';

    // 1. Sección Insumos (solo si el switch está activo)
    if (showIns && data.insumosGenerales) {
        html += getInsumosGeneralesTableHTML(data.insumosGenerales);
    }

    // 2. Sección Protocolos
    data.protocolos.forEach(prot => {
        // Determinamos si el protocolo tiene datos visibles según los filtros
        const hasVisibleForms = showAni && prot.formularios && prot.formularios.length > 0;
        const hasVisibleAloj = showAlo && prot.alojamientos && prot.alojamientos.length > 0;

        if (hasVisibleForms || hasVisibleAloj) {
            const header = getHeaderHTML(prot);
            const formsTable = hasVisibleForms ? getFormsTableHTML(prot.formularios, prot.idProt) : '';
            const alojTable = hasVisibleAloj ? getAlojTableHTML(prot.alojamientos, prot.idProt) : '';
            const footer = getFooterHTML(prot, showAni, showAlo); // Pasamos filtros al footer

            html += `
                <div class="card shadow-sm border-0 mb-5 card-protocolo" id="card-prot-${prot.idProt}">
                    ${header}
                    <div class="card-body p-3">
                        ${formsTable}
                        ${alojTable}
                    </div>
                    ${footer}
                </div>`;
        }
    });

    container.innerHTML = html || '<div class="alert alert-warning text-center">No hay movimientos que coincidan con los filtros seleccionados.</div>';
    vincularCheckboxes();
    vincularChecksPago();
    if (showIns) vincularCheckboxesInsumos();

    
}

function vincularChecksPago() {
    const checkboxes = document.querySelectorAll('.check-item-form, .check-item-aloj');
    
    checkboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const idProt = chk.dataset.prot;
            const container = document.getElementById(`pago-seleccionado-${idProt}`);
            
            let total = 0;
            document.querySelectorAll(`.check-item-form[data-prot="${idProt}"]:checked, .check-item-aloj[data-prot="${idProt}"]:checked`)
                .forEach(selected => {
                    total += parseFloat(selected.dataset.monto || 0);
                });
                
            if (container) {
                container.innerText = `$ ${total.toLocaleString('es-UY', {minimumFractionDigits: 2})}`;
                // Efecto visual de cambio
                container.classList.add('text-success');
                setTimeout(() => container.classList.remove('text-success'), 500);
            }
        });
    });
}
/**
 * Cabezal del Protocolo - Corregido con IDs únicos por Protocolo
 */
function getHeaderHTML(prot) {
    return `
        <div class="card-header bg-white py-3 border-bottom">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="badge bg-success mb-2 uppercase" style="font-size: 9px;">Protocolo: ${prot.nprotA}</span>
                    <h5 class="fw-bold m-0 text-dark">${prot.tituloA}</h5>
                    <div class="small text-muted mt-1">
                        <i class="bi bi-person-circle me-1"></i>Investigador: <b class="text-dark">${prot.investigador} (ID: ${prot.idUsr})</b>
                    </div>
                </div>
                
                <div class="text-end">
                    <div class="d-flex flex-column align-items-end gap-1">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <small class="text-muted fw-bold uppercase" style="font-size: 10px;">Saldo Actual:</small>
                            <span class="badge bg-light text-success border fs-6 fw-bold">$ ${parseFloat(prot.saldoInv).toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                        </div>
                        
                        <div class="input-group input-group-sm shadow-sm" style="width: 210px;">
                            <span class="input-group-text bg-white border-end-0"><i class="bi bi-pencil-square"></i></span>
                            <input type="number" id="inp-saldo-prot-${prot.idProt}" class="form-control border-start-0 border-end-0" placeholder="Monto a ajustar...">
                            <button class="btn btn-success" onclick="window.updateBalance(${prot.idUsr}, 'add', true, ${prot.idProt})"><i class="bi bi-plus-lg"></i></button>
                            <button class="btn btn-danger" onclick="window.updateBalance(${prot.idUsr}, 'sub', true, ${prot.idProt})"><i class="bi bi-dash-lg"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}
function getFormsTableHTML(formularios, idProt) {
    if (!formularios || formularios.length === 0) return '';
    aplicarEstilosTablas(); 

    return `
        <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">Pedidos (Formularios)</h6>
        <div class="table-responsive">
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:2%"><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                        <th style="width:5%">ID</th>
                        <th style="width:8%">Estado</th> 
                        <th style="width:12%">Solicitante</th>
                        <th style="width:15%">Especie</th>
                        <th style="width:15%">Detalle / Concepto</th>
                        <th style="width:18%">Cantidad</th>
                        <th style="width:8%">Total</th>
                        <th style="width:8%">Pagado</th>
                        <th style="width:8%">Debe</th>
                    </tr>
                </thead>
                <tbody>
                    ${formularios.map(f => {
                        const total = parseFloat(f.total || 0);
                        const pagado = parseFloat(f.pagado || 0);
                        const isExento = (f.is_exento == 1 || f.exento == 1);
                        const debe = isExento ? 0 : Math.max(0, total - pagado);

                        const isReactivo = (f.categoria && f.categoria.toLowerCase().includes('reactivo'));
                        const tipoModal = isReactivo ? 'REACTIVO' : 'ANIMAL';

                        // --- 1. LÓGICA COLUMNA ESPECIE (nombre_especie:nombre_subespecie) ---
                        const especie = f.nombre_especie || '---';
                        const subespecie = (f.nombre_subespecie && f.nombre_subespecie !== 'N/A') ? `:${f.nombre_subespecie}` : '';
                        const especieDisplay = especie + subespecie;

                        // --- 2. LÓGICA COLUMNA CANTIDAD ---
                        let cantidadDisplay = '';
                        if (isReactivo) {
                            /** * Formato: NombreInsumo (TipoInsumo) CantidadInsumo - cant_organo un.
                             */
                            const nombre = f.NombreInsumo || 'Insumo';
                            const tipo = f.TipoInsumo || ''; // ej: ml, gr
                            const cantInsumo = f.CantidadInsumo || 0;
                            const organos = f.cant_organo || 0;
                            
                            cantidadDisplay = `<span class="text-info fw-bold">${nombre}</span>  <b>${cantInsumo}</b><small class="text-muted">(${tipo})</small> - ${organos} un.`;
                        } else {
                            /** * Formato: cant_animal un.
                             */
                            const totalA = f.cant_animal || 0;
                            cantidadDisplay = `<b class="fs-6">${totalA}</b> <small class="text-muted">un.</small>`;
                        }

                        const dctoHTML = (f.descuento > 0) ? `<span class="badge-discount">-${f.descuento}%</span>` : '';

                        let estadoBadge = isExento ? '<span class="badge bg-info text-dark">EXENTO</span>' : 
                                         (debe <= 0 ? '<span class="badge bg-success shadow-sm">PAGO COMPLETO</span>' : 
                                         (pagado > 0 ? '<span class="badge bg-warning text-dark">PAGO PARCIAL</span>' : 
                                         '<span class="badge bg-danger">SIN PAGAR</span>'));

                        const rowStyle = (debe <= 0 || isExento) ? 'background-color: #f8fff9 !important;' : '';

                        return `
                            <tr class="text-center align-middle" style="${rowStyle}" 
                                onclick="if(event.target.type !== 'checkbox') window.abrirEdicionFina('${tipoModal}', ${f.id})">
                                <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debe}" data-id="${f.id}" ${(debe <= 0 || isExento) ? 'disabled' : ''}></td>
                                <td class="small text-muted fw-bold">${f.id}</td>
                                <td>${estadoBadge}</td>
                                <td class="small">${f.solicitante}</td>
                                <td class="small text-secondary">${especieDisplay}</td>
                                <td class="text-start ps-3 small">${f.detalle_display || '---'}</td>
                                <td class="small text-dark">${cantidadDisplay}</td>
                                <td class="text-end fw-bold">$ ${total.toFixed(2)} ${dctoHTML}</td>
                                <td class="text-end text-success">$ ${pagado.toFixed(2)}</td>
                                <td class="text-end text-danger fw-bold">$ ${debe.toFixed(2)}</td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}
function getAlojTableHTML(alojamientos, idProt) {
    if (!alojamientos || alojamientos.length === 0) return '';
    
    const filas = alojamientos.map(a => {
        const total = parseFloat(a.total || 0);
        const pagado = parseFloat(a.pagado || 0);
        const debe = parseFloat(a.debe || 0);

        let estadoHTML = '';
        if (debe <= 0) {
            estadoHTML = '<span class="badge bg-success">PAGO</span>';
        } else if (pagado > 0) {
            estadoHTML = '<span class="badge bg-warning text-dark">PARCIAL</span>';
        } else {
            estadoHTML = '<span class="badge bg-danger">PENDIENTE</span>';
        }

        const isDone = (debe <= 0);
        const investigador = window.currentReportData.protocolos.find(p => p.idProt == idProt)?.investigador || 'N/A';

    return `
        <tr onclick="window.abrirEdicionFina('ALOJ', ${a.historia})" class="pointer text-center align-middle" ${isDone ? 'style="background-color: #f0fff4 !important;"' : ''}>
            <td>
                <input type="checkbox" class="check-item-aloj" 
                    onclick="event.stopPropagation();" 
                    data-prot="${idProt}" data-id="${a.historia}" data-monto="${debe}" 
                    ${isDone ? 'disabled' : ''}>
            </td>
            <td>${a.historia}</td>
            <td>${estadoHTML}</td> 
            <td class="text-start ps-3 small">${investigador}</td>
            <td>${a.especie}</td>
            <td class="small">${a.periodo}</td>
            <td class="fw-bold">${a.dias}</td>
            <td class="text-end">$ ${total.toFixed(2)}</td>
            <td class="text-end text-success">$ ${pagado.toFixed(2)}</td>
            <td class="text-end text-danger fw-bold">$ ${debe.toFixed(2)}</td>
        </tr>`;
    }).join('');

    return `
        <div class="mt-4">
            <h6 class="fw-bold text-muted mb-3 uppercase" style="font-size: 10px;">Detalle de Alojamientos</h6>
            <table class="table table-bordered table-billing mb-0">
                <thead class="table-dark text-center">
                    <tr>
                        <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                        <th style="width:7%">Hist.</th>
                        <th style="width:8%">Estado</th>
                        <th>Investigador</th>
                        <th style="width:10%">Especie</th>
                        <th style="width:12%">Periodo</th>
                        <th style="width:5%">Días</th>
                        <th style="width:8%">Total</th>
                        <th style="width:8%">Pago</th>
                        <th style="width:8%">Falta</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>`;
}

function getFooterHTML(prot, showAni, showAlo) {
    let totAni = 0, totRea = 0, totOtr = 0, totAlo = 0;
    let sumTotal = 0, sumPagado = 0, sumDebe = 0;

    // 1. Cálculos de Formularios (Animales y Reactivos)
    if (showAni && prot.formularios) {
        prot.formularios.forEach(f => {
            const t = parseFloat(f.total || 0), p = parseFloat(f.pagado || 0), d = parseFloat(f.debe || 0);
            sumTotal += t; sumPagado += p; sumDebe += d;
            const cat = f.categoria.toLowerCase();
            if (cat.includes('otros reactivos biologicos')) totOtr += t;
            else if (cat.includes('reactivo')) totRea += t;
            else totAni += t;
        });
    }

    // 2. Cálculos de Alojamiento
    if (showAlo && prot.alojamientos) {
        prot.alojamientos.forEach(a => {
            const t = parseFloat(a.total || 0), p = parseFloat(a.pagado || 0), d = parseFloat(a.debe || 0);
            totAlo += t; sumTotal += t; sumPagado += p; sumDebe += d;
        });
    }

return `
        <div class="card-footer bg-white border-top py-3 shadow-sm">
            <div class="row mb-3">
                <div class="col-md-12 d-flex gap-4 border-bottom pb-2">
                    ${totAlo > 0 ? `<div class="small text-muted">Alojamiento: <b>$ ${totAlo.toFixed(2)}</b></div>` : ''}
                    ${totAni > 0 ? `<div class="small text-muted">Animales: <b>$ ${totAni.toFixed(2)}</b></div>` : ''}
                    ${totRea > 0 ? `<div class="small text-muted">Reactivos: <b>$ ${totRea.toFixed(2)}</b></div>` : ''}
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex gap-5 align-items-center">
                    <div class="text-center">
                        <small class="text-muted text-uppercase fw-bold" style="font-size:9px">Total Protocolo</small>
                        <b class="fs-6 d-block text-dark">$ ${sumTotal.toFixed(2)}</b>
                    </div>
                    <div class="text-center">
                        <small class="text-muted text-uppercase fw-bold" style="font-size:10px">Falta</small>
                        <b class="fs-6 text-danger d-block">$ ${sumDebe.toFixed(2)}</b>
                    </div>
                    <button class="btn btn-link btn-sm text-danger p-0 ms-2" onclick="window.downloadProtocoloPDF(${prot.idProt})">
                        <i class="bi bi-file-earmark-pdf fs-4"></i>
                    </button>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <div class="text-end me-2">
                        <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">Seleccionado:</small>
                        <span class="fs-5 fw-bold text-primary" id="pago-seleccionado-${prot.idProt}">$ 0.00</span>
                    </div>
                    <button class="btn btn-primary fw-bold px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${prot.idProt})">
                        <i class="bi bi-wallet2 me-2"></i> Pagar Selección
                    </button>
                </div>
            </div>
        </div>`;
}



/**
 * AUXILIARES
 */
function vincularCheckboxes() {
    document.querySelectorAll('.check-all-prot, .check-all-aloj').forEach(chkAll => {
        chkAll.addEventListener('change', (e) => {
            const protId = e.target.dataset.prot;
            const selector = e.target.classList.contains('check-all-prot') ? `.check-item-prot[data-prot="${protId}"]` : `.check-item-aloj[data-prot="${protId}"]`;
            document.querySelectorAll(selector).forEach(item => { if (!item.disabled) item.checked = e.target.checked; });
            actualizarSumaPago(protId);
        });
    });
    document.querySelectorAll('.check-item-prot, .check-item-aloj').forEach(item => {
        item.addEventListener('change', function() { actualizarSumaPago(this.dataset.prot); });
    });
}

function actualizarSumaPago(protId) {
    let suma = 0;
    const card = document.getElementById(`card-prot-${protId}`);
    card.querySelectorAll('input[type="checkbox"]:checked:not(.check-all-prot):not(.check-all-aloj)').forEach(chk => {
        const row = chk.closest('tr');
        const debeCell = row.querySelector('.text-danger.fw-bold');
        if (debeCell) suma += parseFloat(debeCell.innerText.replace('$ ', '').replace(',', ''));
    });
    const txtTotal = document.getElementById(`total-seleccionado-${protId}`);
    if (txtTotal) txtTotal.innerText = `$ ${suma.toFixed(2)}`;
}

window.abrirAyudaBilling = () => { new bootstrap.Modal(document.getElementById('modal-billing-help')).show(); };

/**
 * Renderiza la tabla de Insumos Generales con integración al Manager de Modales.
 */
function getInsumosGeneralesTableHTML(insumos) {
    if (!insumos || insumos.length === 0) return '';
    let sumTotal = 0, sumPagado = 0, sumDebe = 0;

    const filas = insumos.map(i => {
    const total = parseFloat(i.total_item || 0);
    const pagado = parseFloat(i.pagado || 0);
    const isExento = (i.is_exento == 1); 
    const debe = isExento ? 0 : Math.max(0, total - pagado);
        
        sumTotal += total; 
        sumPagado += pagado; 
        sumDebe += debe;
        
        // Lógica de Estados (Badges)
        let badge = '';
        if (debe <= 0) {
            badge = '<span class="badge bg-success shadow-sm">PAGO</span>';
        } else if (pagado > 0) {
            badge = '<span class="badge bg-warning text-dark">PARCIAL</span>';
        } else {
            badge = '<span class="badge bg-danger shadow-sm">PENDIENTE</span>';
        }

        const detalleHTML = i.detalle_completo.split(' | ').map(item => `• ${item}`).join('<br>');
        const rowStyle = (debe <= 0) ? 'background-color: #f0fff4 !important;' : '';

        return `
            <tr class="text-center align-middle" 
                style="${rowStyle} cursor: pointer;" 
                onclick="if(event.target.type !== 'checkbox') window.abrirEdicionFina('INSUMO', ${i.id})">
                <td>
                    <input type="checkbox" class="check-item-insumo" 
                           data-id="${i.id}" 
                           data-monto="${debe}" 
                           ${debe <= 0 ? 'disabled' : ''}>
                </td>
                <td class="small text-muted">${i.id}</td>
                <td>${badge}</td>
                <td>${i.solicitante}</td>
                <td class="text-start ps-3 small" style="line-height: 1.2;">${detalleHTML}</td>
                <td class="text-end fw-bold">$ ${total.toFixed(2)}</td>
                <td class="text-end text-success">$ ${pagado.toFixed(2)}</td>
                <td class="text-end text-danger fw-bold">$ ${debe.toFixed(2)}</td>
            </tr>`;
    }).join('');

    return `
        <div class="card shadow-sm border-0 mb-5 card-insumos-generales" style="border-left: 5px solid #0d6efd !important;">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="m-0 text-primary fw-bold"><i class="bi bi-box-seam-fill me-2"></i>Insumos Generales del Departamento</h5>
                <button class="btn btn-link btn-sm text-danger p-0" onclick="window.downloadInsumosPDF()"><i class="bi bi-filetype-pdf fs-4"></i></button>
            </div>
            <div class="card-body p-0">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" id="check-all-insumos-gen"></th>
                            <th style="width:5%">ID</th>
                            <th style="width:8%">Estado</th>
                            <th style="width:15%">Solicitante</th>
                            <th>Conceptos y Cantidades (Agrupados)</th> 
                            <th style="width:10%">Total</th>
                            <th style="width:10%">Pago</th>
                            <th style="width:10%">Falta</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
            <div class="card-footer bg-light py-3 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-5">
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">Total Insumos</small>
                            <b class="fs-6">$ ${sumTotal.toFixed(2)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">Total Pago</small>
                            <b class="fs-6 text-success">$ ${sumPagado.toFixed(2)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">Total Falta</small>
                            <b class="fs-6 text-danger">$ ${sumDebe.toFixed(2)}</b>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fs-4 fw-bold text-primary" id="total-insumos-seleccionados">$ 0.00</span>
                        <button class="btn btn-primary btn-sm fw-bold ms-3 shadow-sm" onclick="window.procesarPagoInsumosGenerales()">
                            <i class="bi bi-wallet2 me-1"></i> Pagar Selección
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}
function vincularCheckboxesInsumos() {
    const master = document.getElementById('check-all-insumos-gen');
    if (!master) return;

    master.addEventListener('change', (e) => {
        const items = document.querySelectorAll('.check-item-insumo:not(:disabled)');
        items.forEach(chk => chk.checked = e.target.checked);
        actualizarSumaInsumos();
    });

    document.querySelectorAll('.check-item-insumo').forEach(chk => {
        chk.addEventListener('change', actualizarSumaInsumos);
    });
}

function actualizarSumaInsumos() {
    let suma = 0;
    document.querySelectorAll('.check-item-insumo:checked').forEach(chk => {
        suma += parseFloat(chk.dataset.monto || 0);
    });
    const display = document.getElementById('total-insumos-seleccionados');
    if (display) display.innerText = `$ ${suma.toFixed(2)}`;
}





/**
 * Exportación a CSV/Excel con datos de saldos y IDs
 */
window.exportExcelDeptoGlobal = () => {
    if (!currentReportData) return;
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const headers = ["Protocolo/Depto", "ID Usuario", "Investigador", "Tipo", "ID Mov", "Concepto", "Total", "Pagado", "Debe", "Saldo Disponible"];
    const rows = [headers.join(";")];

    if (currentReportData.insumosGenerales) {
        currentReportData.insumosGenerales.forEach(i => {
            rows.push(["GENERAL", i.IdUsrA, i.solicitante, "INSUMO", i.id, i.detalle_completo.replace(/\|/g, "-"), i.total_item, i.pagado, i.debe, i.saldoInv].join(";"));
        });
    }

    currentReportData.protocolos.forEach(prot => {
        prot.formularios.forEach(f => rows.push([prot.nprotA, prot.idUsr, prot.investigador, "FORM", f.id, f.detalle_display.replace(/<[^>]*>/g,''), f.total, f.pagado, f.debe, prot.saldoInv].join(";")));
        prot.alojamientos.forEach(a => rows.push([prot.nprotA, prot.idUsr, prot.investigador, "ALOJ", a.historia, `Alojamiento ${a.especie}`, a.total, a.pagado, a.debe, prot.saldoInv].join(";")));
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Excel_Global_${inst}.csv`;
    link.click();
};
/**
 * Vincula los checkboxes para actualizar el total seleccionado
 */

/**
 * GESTIÓN ÚNICA DE SELECCIÓN Y PAGOS
 * Una sola función para controlar checkboxes y sumas.
 */
document.addEventListener('change', (e) => {
    // Detectamos si el cambio viene de un checkbox de este módulo
    const t = e.target;
    if (!t.matches('.check-item-form, .check-item-aloj, .check-all-form, .check-all-aloj')) return;

    const idProt = t.dataset.prot;

    // LÓGICA DE SELECCIONAR TODO: Solo marca los que NO están deshabilitados (los que deben)
    if (t.classList.contains('check-all-form')) {
        document.querySelectorAll(`.check-item-form[data-prot="${idProt}"]:not(:disabled)`)
                .forEach(c => c.checked = t.checked);
    }
    if (t.classList.contains('check-all-aloj')) {
        document.querySelectorAll(`.check-item-aloj[data-prot="${idProt}"]:not(:disabled)`)
                .forEach(c => c.checked = t.checked);
    }

    // Actualizamos el monto visual una sola vez
    actualizarMontoVisual(idProt);
});

/**
 * Calcula el monto de los ítems seleccionados para pagar
 */
function actualizarMontoVisual(idProt) {
    const visor = document.getElementById(`pago-seleccionado-${idProt}`);
    if (!visor) return;

    let total = 0;
    // Buscamos solo los marcados que son ítems reales (no los "Select All")
    const seleccionados = document.querySelectorAll(`input[data-prot="${idProt}"]:checked:not(.check-all-form):not(.check-all-aloj)`);
    
    seleccionados.forEach(chk => {
        total += parseFloat(chk.dataset.monto || 0);
    });

    // Actualización estética del visor
    visor.innerText = `$ ${total.toLocaleString('es-UY', {minimumFractionDigits: 2})}`;
    
    if (total > 0) {
        visor.classList.replace('text-primary', 'text-success');
        visor.classList.add('fw-bold');
    } else {
        visor.classList.replace('text-success', 'text-primary');
        visor.classList.remove('fw-bold');
    }
}

/**
 * Inyecta los estilos visuales para el resaltado de filas
 */
function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-hover')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-hover';
    style.innerHTML = `
        /* Resaltado de fila Gecko */
        .table-billing tbody tr { transition: all 0.2s; }
        .table-billing tbody tr:hover td { 
            background-color: #e8f5e9 !important; /* Verde muy clarito */
            color: #000 !important;
        }
        /* Manito solo en celdas de datos, no en el checkbox */
        .table-billing tbody tr td:not(:first-child) { cursor: pointer; }
        
        /* Badge de descuento */
        .badge-discount {
            font-size: 0.7rem;
            padding: 2px 5px;
            background-color: #d1e7dd;
            color: #0f5132;
            border: 1px solid #badbcc;
            border-radius: 4px;
            margin-left: 5px;
        }
    `;
    document.head.appendChild(style);
}


/**
 * Genera la ficha PDF individual del protocolo
 * Corrección: Blindaje contra currentReportData null y mapeo de variables real
 */
window.downloadProtocoloPDF = async (idProt) => {
    // 1. Validar que la data exista (Evita el error que mencionaste)
    if (!window.currentReportData || !window.currentReportData.protocolos) {
        return Swal.fire('Error', 'Los datos aún no se han cargado. Por favor, espera un segundo.', 'warning');
    }

    const prot = window.currentReportData.protocolos.find(p => p.idProt == idProt);
    if (!prot) return Swal.fire('Error', 'No se encontró la información del protocolo.', 'error');

    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const verdeBioterio = [26, 93, 59];

    // --- ENCABEZADO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(verdeBioterio[0], verdeBioterio[1], verdeBioterio[2]);
    doc.text(`GROBO - ${inst}`, 105, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("ESTADO DE CUENTA POR PROTOCOLO", 105, 22, { align: "center" });
    doc.line(20, 25, 190, 25);

    // --- INFO DEL PROTOCOLO ---
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Protocolo: ${prot.tituloA} (N° ${prot.nprotA})`, 20, 35);
    doc.text(`Investigador: ${prot.investigador}`, 20, 41);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 47);

    let currentY = 55;

    // --- TABLA DE PEDIDOS (FORMULARIOS) ---
    if (prot.formularios && prot.formularios.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("PEDIDOS Y FORMULARIOS", 20, currentY);
        
        const bodyForms = prot.formularios.map(f => {
            const isRea = f.categoria?.toLowerCase().includes('reactivo');
            
            // Lógica de Especie (Misma que en la tabla)
            const esp = f.nombre_especie || '---';
            const sub = (f.nombre_subespecie && f.nombre_subespecie !== 'N/A') ? `:${f.nombre_subespecie}` : '';
            
            // Lógica de Cantidad Real (Usando tus variables cant_animal, NombreInsumo, etc.)
            const cantStr = isRea 
                ? `${f.NombreInsumo} (${f.TipoInsumo}) ${f.CantidadInsumo} - ${f.cant_organo} un.`
                : `${f.cant_animal} un.`;

            return [
                f.id,
                esp + sub,
                (f.detalle_display || "").replace(/<\/?[^>]+(>|$)/g, ""), // Limpiar HTML
                cantStr,
                `$ ${parseFloat(f.total).toFixed(2)}`,
                `$ ${parseFloat(f.debe).toFixed(2)}`
            ];
        });

        doc.autoTable({
            startY: currentY + 2,
            head: [['ID', 'Especie', 'Concepto', 'Cant.', 'Total', 'Falta']],
            body: bodyForms,
            theme: 'striped',
            headStyles: { fillColor: verdeBioterio },
            styles: { fontSize: 7 },
            columnStyles: { 
                4: { halign: 'right' }, 
                5: { halign: 'right', fontStyle: 'bold', textColor: [200, 0, 0] } 
            }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // --- TABLA DE ALOJAMIENTOS ---
    if (prot.alojamientos && prot.alojamientos.length > 0) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("HISTORIAL DE ALOJAMIENTO", 20, currentY);

        const bodyAloj = prot.alojamientos.map(a => [
            `#${a.historia}`,
            a.especie,
            a.periodo || `${a.fecha_ingreso} / ${a.fecha_salida || '...' }`,
            a.dias || '-',
            `$ ${parseFloat(a.total).toFixed(2)}`,
            `$ ${parseFloat(a.debe).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: currentY + 2,
            head: [['Hist', 'Especie', 'Período', 'Días', 'Total', 'Falta']],
            body: bodyAloj,
            theme: 'grid',
            headStyles: { fillColor: [70, 70, 70] },
            styles: { fontSize: 7 },
            columnStyles: { 
                4: { halign: 'right' }, 
                5: { halign: 'right', fontStyle: 'bold', textColor: [200, 0, 0] } 
            }
        });
        currentY = doc.lastAutoTable.finalY + 15;
    }

    // --- RESUMEN FINANCIERO DEL PROTOCOLO ---
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    const sumTotal = parseFloat(
        (prot.formularios || []).reduce((s, f) => s + parseFloat(f.total || 0), 0) + 
        (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0)
    ).toFixed(2);
    
    const sumDebe = parseFloat(prot.deudaAnimales + prot.deudaReactivos + prot.deudaAlojamiento).toFixed(2);
    const sumPago = (parseFloat(sumTotal) - parseFloat(sumDebe)).toFixed(2);

    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(120, currentY, 70, 25, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("SUBTOTAL ACUMULADO:", 125, currentY + 7);
    doc.text("TOTAL ABONADO:", 125, currentY + 13);
    doc.text("SALDO DEUDOR:", 125, currentY + 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`$ ${sumTotal}`, 185, currentY + 7, { align: "right" });
    doc.setTextColor(verdeBioterio[0], verdeBioterio[1], verdeBioterio[2]);
    doc.text(`$ ${sumPago}`, 185, currentY + 13, { align: "right" });
    doc.setTextColor(200, 0, 0);
    doc.text(`$ ${sumDebe}`, 185, currentY + 19, { align: "right" });

    doc.save(`Ficha_Protocolo_${prot.nprotA}.pdf`);
    hideLoader();
};


/**
 * Genera el reporte PDF de todos los Insumos Generales del departamento
 * Corrección: Blindaje de datos y estilo institucional.
 */
window.downloadInsumosPDF = async () => {
    // 1. Blindaje contra datos nulos
    if (!window.currentReportData || !window.currentReportData.insumosGenerales) {
        return Swal.fire('Aviso', 'No hay datos de insumos cargados para este periodo.', 'info');
    }

    const insumos = window.currentReportData.insumosGenerales;
    if (insumos.length === 0) return Swal.fire('Aviso', 'No hay insumos para reportar.', 'info');

    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(); // Vertical está bien aquí porque son menos columnas
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const deptoNombre = document.getElementById('select-depto')?.selectedOptions[0]?.text || 'GENERAL';
    const azulInsumos = [13, 110, 253]; // Azul para identificar el módulo de insumos

    // --- ENCABEZADO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(azulInsumos[0], azulInsumos[1], azulInsumos[2]);
    doc.text(`GROBO - ${inst}`, 105, 15, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("REPORTE DE INSUMOS GENERALES Y SUMINISTROS", 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text(`DEPARTAMENTO: ${deptoNombre.toUpperCase()}`, 105, 27, { align: "center" });
    doc.line(20, 30, 190, 30);

    // --- PROCESAMIENTO DE DATOS ---
    const body = insumos.map(i => [
        i.id,
        i.solicitante,
        // Convertimos el separador de la base de datos en saltos de línea reales para la celda
        (i.detalle_completo || "").split(' | ').join('\n'), 
        `$ ${parseFloat(i.total_item || 0).toFixed(2)}`,
        `$ ${parseFloat(i.pagado || 0).toFixed(2)}`,
        `$ ${parseFloat(i.debe || 0).toFixed(2)}`
    ]);

    // --- TABLA ---
    doc.autoTable({
        startY: 35,
        head: [['ID', 'Solicitante', 'Detalle de Productos / Cantidades', 'Total', 'Pagado', 'Debe']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: azulInsumos },
        styles: { 
            fontSize: 8, 
            overflow: 'linebreak', // Permite que el detalle largo salte de línea
            cellPadding: 3 
        },
        columnStyles: { 
            2: { cellWidth: 70 }, // Ancho generoso para la descripción de insumos
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // --- TOTALES AL FINAL DE LA TABLA ---
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalDeudaInsumos = insumos.reduce((acc, curr) => acc + parseFloat(curr.debe || 0), 0);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL DEUDA PENDIENTE INSUMOS: $ ${totalDeudaInsumos.toFixed(2)}`, 190, finalY, { align: "right" });

    // --- PIE DE PÁGINA ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 20, 285);
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: "right" });
    }

    doc.save(`Reporte_Insumos_${deptoNombre}.pdf`);
    hideLoader();
};