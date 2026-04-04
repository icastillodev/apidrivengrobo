/**
 * GESTIÓN DE FACTURACIÓN POR INVESTIGADOR - GECKO DEVS
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../../components/MenuComponent.js';
import { renderDashboard } from '../billingDashboard.js';
import { formatBillingMoney } from '../billingLocale.js';
import '../billingPayments.js'; 
import '../modals/manager.js';

/** Textos facturación (incl. `billing_depto`, `billing_investigador`) */
function txF() {
    return window.txt?.facturacion || {};
}
function txBD() {
    return txF().billing_depto || {};
}
function txBI() {
    return txF().billing_investigador || {};
}

window.currentReportData = null;
window.investigadoresCache = [];

export async function initBillingInvestigador() {
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

        await cargarListaInvestigadores();
        autoLoadFromUrlParams();
    } catch (error) { 
        console.error("Error en init:", error); 
    } finally { hideLoader(); }
}

function autoLoadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const idUsr = params.get('idUsr');
    const all = params.get('all');
    if (!idUsr) return;

    const select = document.getElementById('sel-investigador');
    if (select) {
        // Si no existe opción en el select, la inyectamos para permitir carga directa desde Gestión de Usuarios
        const exists = Array.from(select.options).some(o => String(o.value) === String(idUsr));
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = idUsr;
            opt.textContent = (txBI().opt_investigador_id || 'Investigador ID {id}').replace(/\{id\}/g, idUsr);
            select.appendChild(opt);
        }
        select.value = idUsr;
    }

    if (String(all) === '1') {
        // Historial completo por defecto
        const fDesde = document.getElementById('f-desde');
        const fHasta = document.getElementById('f-hasta');
        if (fDesde) fDesde.value = '2000-01-01';
        if (fHasta) fHasta.value = new Date().toISOString().split('T')[0];
    }

    setTimeout(() => {
        window.cargarFacturacionInvestigador();
    }, 150);
}

async function cargarListaInvestigadores() {
    const instId = localStorage.getItem('instId') || 1;
    try {
        const res = await API.request(`/users/list-investigators?inst=${instId}`);
        if (res.status === 'success' && res.data) {
            window.investigadoresCache = res.data;
            renderizarOpcionesInvestigador(res.data);
            vincularFiltroRealTime(); 
        }
    } catch (e) { console.error("Error cargando investigadores:", e); }
}

function renderizarOpcionesInvestigador(lista) {
    const select = document.getElementById('sel-investigador');
    if (!select) return;
    const ph = txBI().ph_sel_investigador || '-- SELECCIONAR INVESTIGADOR --';
    let html = `<option value="">${ph}</option>`;
    html += lista.map(u => `<option value="${u.IdUsrA}">${u.ApellidoA} ${u.NombreA} (ID: ${u.IdUsrA})</option>`).join('');
    select.innerHTML = html;
}

function vincularFiltroRealTime() {
    const inputBusqueda = document.getElementById('busqueda-investigador');
    if (!inputBusqueda) return;
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = window.investigadoresCache.filter(u => {
            const nombreCompleto = `${u.ApellidoA} ${u.NombreA}`.toLowerCase();
            return nombreCompleto.includes(termino) || u.IdUsrA.toString().includes(termino);
        });
        renderizarOpcionesInvestigador(filtrados);
    });
}

window.cargarFacturacionInvestigador = async () => {
    const urlIdUsr = new URLSearchParams(window.location.search).get('idUsr');
    const idUsrSelected = document.getElementById('sel-investigador').value;
    const idUsr = idUsrSelected || urlIdUsr;
    const desde = document.getElementById('f-desde').value;
    const hasta = document.getElementById('f-hasta').value;
    const chkAni = document.getElementById('chk-animales').checked;
    const chkIns = document.getElementById('chk-insumos').checked;

    if (!idUsr) return Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.aviso_investigador || 'Seleccione un investigador de la lista.', 'warning');

    try {
        showLoader();
        const res = await API.request('/billing/investigador-report', 'POST', { idUsr, desde, hasta, chkAni, chkIns });
        if (res.status === 'success') {
            window.currentReportData = res.data; 
            renderizarResultados(res.data);
        } else { Swal.fire(window.txt?.generales?.error || 'Error', res.message || '', 'error'); }
    } catch (error) { console.error("Error en búsqueda:", error); } finally { hideLoader(); }
};

function renderizarResultados(data) {
    const container = document.getElementById('billing-results');
    const dashboardArea = document.getElementById('dashboard-area');
    const saldoContainer = document.getElementById('contenedor-saldo-maestro');
    const tituloInvestigador = document.getElementById('dashboard-investigador-titulo');
    const bi = txBI();
    const tf = txF();
    
    dashboardArea.classList.remove('d-none');

    if (tituloInvestigador && data.perfil) {
        const lblInv = bi.lbl_investigador_colon || 'Investigador:';
        tituloInvestigador.innerHTML = `
            <i class="bi bi-person-check-fill text-primary me-2"></i>
            ${lblInv} <span class="text-primary">${data.perfil.NombreCompleto}</span> 
            <span class="text-muted" style="font-size: 0.8em;">(ID: ${data.perfil.IdUsrA})</span>
        `;
    }

    const saldo = parseFloat(data.perfil?.SaldoDinero || 0);
    const idUsr = data.perfil?.IdUsrA;
    const phMonto = tf.inv_placeholder_monto || tf.monto_ajustar || 'Monto';

    if (saldoContainer) {
        const saldoLbl = bi.saldo_billetera || 'Saldo en Billetera:';
        saldoContainer.innerHTML = `
            <div class="d-flex align-items-center gap-3 justify-content-end mb-4">
                <div class="text-end">
                    <small class="text-muted fw-bold d-block uppercase" style="font-size: 9px;">${saldoLbl}</small>
                    <span class="badge bg-success fs-5 shadow-sm" id="investigador-saldo-global">$ ${formatBillingMoney(saldo)}</span>
                </div>
                <div class="input-group input-group-sm shadow-sm" style="width: 210px;">
                    <input type="number" id="inp-saldo-${idUsr}" class="form-control border-primary" placeholder="${phMonto}...">
                    <button type="button" class="btn btn-success" onclick="window.updateBalance(${idUsr}, 'add', false)"><i class="bi bi-plus-lg"></i></button>
                    <button type="button" class="btn btn-danger" onclick="window.updateBalance(${idUsr}, 'sub', false)"><i class="bi bi-dash-lg"></i></button>
                </div>
            </div>
        `;
    }

    renderDashboard(data);

    let html = '';
    const showIns = document.getElementById('chk-insumos').checked;
    const showAni = document.getElementById('chk-animales').checked;

    if (showIns && data.insumosGenerales?.length > 0) {
        html += getInsumosGeneralesTableHTML(data.insumosGenerales);
    }

    const lblProt = tf.label_protocolo || 'Protocolo';
    (data.protocolos || []).forEach(prot => {
        const tieneInsProt = (prot.insumos?.length > 0);
        const tieneAniAloj = showAni && ((prot.formularios?.length > 0) || (prot.alojamientos?.length > 0));
        const mostrarTarjeta = (showAni && ((prot.formularios?.length > 0) || (prot.alojamientos?.length > 0) || tieneInsProt)) || (showIns && tieneInsProt);

        if (!mostrarTarjeta) return;

        html += `
                <div class="card shadow-sm border-0 mb-5 card-protocolo" id="card-prot-${prot.idProt}">
                    <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-primary mb-1 uppercase" style="font-size: 9px;">${lblProt}: ${prot.nprotA}</span>
                            <h5 class="fw-bold m-0 text-dark">${prot.tituloA}</h5>
                        </div>
                    </div>
                    <div class="card-body p-3">
                        ${showAni ? getFormsTableHTML(prot.formularios, prot.idProt) : ''}
                        ${showAni && prot.alojamientos?.length > 0 ? getAlojTableHTML(prot.alojamientos, prot.idProt) : ''}
                        ${showIns && tieneInsProt ? getInsumosProtocoloTableHTML(prot.insumos, prot.idProt) : ''}
                    </div>
                    ${getFooterHTML(prot)}
                </div>`;
    });

    const sinMov = bi.sin_movimientos || 'No se encontraron movimientos.';
    container.innerHTML = html || `<div class="alert alert-light text-center py-5 shadow-sm">${sinMov}</div>`;
    vincularEventosSeleccion();
}

function getFormsTableHTML(formularios, idProt) {
    const bd = txBD();
    const bi = txBI();
    const safeForms = formularios || [];

    if (safeForms.length === 0) return `<p class="text-center my-4 text-muted small">${bi.sin_pedidos_protocolo || 'No hay pedidos vinculados a este protocolo.'}</p>`;
    const secTit = bi.sec_pedidos_prot_form || 'Pedidos de Protocolo (Formularios)';
    return `
        <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">${secTit}</h6>
        <div class="table-responsive">
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:2%"><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                        <th style="width:5%">${bd.th_id || 'ID'}</th>
                        <th style="width:8%">${bd.th_estado || 'ESTADO'}</th>
                        <th style="width:12%">${bi.th_fechas || 'FECHAS'}</th>
                        <th style="width:15%">${bd.th_especie_cepa || 'ESPECIE / TIPO'}</th>
                        <th style="width:15%">${bd.th_detalle_concepto || 'CONCEPTO'}</th>
                        <th style="width:18%">${bd.th_cantidad_presentacion || 'CANTIDAD / PRESENTACIÓN'}</th>
                        <th style="width:8%">${bd.th_total_uc || 'TOTAL'}</th>
                        <th style="width:8%">${bd.th_pagado_uc || 'PAGADO'}</th>
                        <th style="width:8%">${bd.th_debe_uc || 'DEBE'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${safeForms.map(f => {
                        const isExento = (f.is_exento == 1 || f.exento == 1);
                        const total = parseFloat(f.total || 0);
                        const pagado = parseFloat(f.pagado || 0);
                        const debe = isExento ? 0 : Math.max(0, total - pagado);

                        const isRea = f.categoria?.toLowerCase().includes('reactivo');
                        const tipoModal = isRea ? 'REACTIVO' : 'ANIMAL';

                        let cantidadDisplay = '';
                        if (isRea) {
                            const nmRea = f.NombreInsumo || bi.reactivo_fallback || 'Reactivo';
                            cantidadDisplay = `
                                <div class="text-start lh-sm">
                                    <span class="text-info fw-bold">${nmRea}</span><br>
                                    <small class="text-muted" style="font-size: 10px;">${bd.lbl_pres || 'Pres:'} <b>${f.CantidadInsumo || '-'} ${f.TipoInsumo || ''}</b></small><br>
                                    <span class="badge bg-light text-dark border mt-1 shadow-sm">${bd.lbl_solicitadas || 'Solicitadas:'} <b class="text-primary">${f.cant_organo || 0} ${bd.un_abbr || 'un.'}</b></span>
                                </div>`;
                        } else {
                            cantidadDisplay = `<b class="fs-5 text-dark">${f.cant_animal || 0}</b> <small class="text-muted">${bd.un_abbr || 'un.'}</small>`;
                        }

                        const espDisplay = f.nombre_especie + (f.nombre_subespecie && f.nombre_subespecie !== 'N/A' ? `<br><small class="text-muted">${f.nombre_subespecie}</small>` : '');
                        const fi = bi.fecha_in || 'In:';
                        const fo = bi.fecha_out || 'Out:';
                        const fechasDisplay = `<div class="small"><b>${fi}</b> ${f.fecha || '-'}</div><div class="small text-danger"><b>${fo}</b> ${f.fecRetiroA || '-'}</div>`;
                        const dctoHTML = (f.descuento > 0) ? `<br><span class="badge-discount mt-1 d-inline-block">-${f.descuento}%</span>` : '';
                        
                        let estadoBadge = isExento ? `<span class="badge bg-info text-dark shadow-sm">${bd.badge_exento || 'EXENTO'}</span>` : 
                                         (debe <= 0 ? `<span class="badge bg-success shadow-sm">${bd.badge_pago_completo || 'PAGO COMPLETO'}</span>` : 
                                         (pagado > 0 ? `<span class="badge bg-warning text-dark shadow-sm">${bd.badge_pago_parcial || 'PAGO PARCIAL'}</span>` : 
                                         `<span class="badge bg-danger shadow-sm">${bd.badge_sin_pagar || 'SIN PAGAR'}</span>`));

                        const rowStyle = (debe <= 0 || isExento) ? 'background-color: #f8fff9 !important;' : '';

                        return `
                            <tr class="text-center align-middle pointer" style="${rowStyle}" 
                                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('${tipoModal}', ${f.id})">
                                <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debe}" data-id="${f.id}" ${(debe <= 0 || isExento) ? 'disabled' : ''}></td>
                                <td class="small text-muted fw-bold">#${f.id}</td>
                                <td>${estadoBadge}</td>
                                <td>${fechasDisplay}</td>
                                <td class="small text-secondary">${isRea ? `<span class="badge bg-light text-info border">${bd.badge_reactivo_bio || 'REACTIVO BIOLÓGICO'}</span>` : espDisplay}</td>
                                <td class="text-start ps-3 small">${(f.detalle_display || '').replace(/<[^>]*>/g, "")} ${dctoHTML}</td>
                                <td>${cantidadDisplay}</td>
                                <td class="text-end fw-bold text-dark">$ ${formatBillingMoney(total)}</td>
                                <td class="text-end text-success fw-bold">$ ${formatBillingMoney(pagado)}</td>
                                <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(debe)}</td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function getAlojTableHTML(alojamientos, idProt) {
    const bd = txBD();
    const bi = txBI();
    const tf = txF();
    const secA = bi.sec_alojamientos || 'Alojamientos';
    const lblAloj = bi.lbl_aloj_def || 'Alojamiento';
    return `
        <div class="mt-2 border-top pt-3">
            <h6 class="fw-bold text-muted mb-2 small uppercase">${secA}</h6>
            <table class="table table-bordered table-billing mb-0">
                <thead class="table-dark text-center">
                    <tr>
                        <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                        <th>${bi.th_historia || 'HISTORIA'}</th><th>${bd.th_especie_cepa || 'ESPECIE / TIPO'}</th><th>${tf.periodo || 'PERIODO'}</th><th>${tf.dias || 'DÍAS'}</th><th>${bd.th_total_uc || 'TOTAL'}</th><th>${bd.th_pagado_uc || 'PAGADO'}</th><th>${bd.th_debe_uc || 'DEBE'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${alojamientos.map(a => `
                        <tr onclick="if(!event.target.closest('td:first-child')) window.abrirEdicionFina('ALOJ', ${a.historia})" class="text-center align-middle pointer">
                            <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${a.debe <= 0 ? 'disabled' : ''}></td>
                            <td>#${a.historia}</td>
                            <td>${a.especie} <br><small class="text-muted">${a.caja || lblAloj}</small></td>
                            <td class="small">${a.periodo}</td>
                            <td class="fw-bold">${a.dias}</td>
                            <td class="text-end">$ ${formatBillingMoney(a.total)}</td>
                            <td class="text-end text-success fw-bold">$ ${formatBillingMoney(a.pagado || 0)}</td>
                            <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(a.debe)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

/** Insumos de pedido vinculados al protocolo (misma grilla que Facturación por Protocolo). */
function getInsumosProtocoloTableHTML(insumos, idProt) {
    if (!insumos || insumos.length === 0) return '';
    const bd = txBD();
    const tf = txF();
    const bi = txBI();
    const titulo = tf.insumos_protocolo ?? 'Insumos del protocolo';
    const filas = insumos.map(i => {
        const total = parseFloat(i.total_item || 0);
        const pagado = parseFloat(i.pagado || 0);
        const isExento = (i.is_exento == 1);
        const debe = isExento ? 0 : Math.max(0, total - pagado);
        const badge = (debe <= 0) ? `<span class="badge bg-success shadow-sm">${bd.aloj_estado_pago || 'PAGO'}</span>` :
            (pagado > 0 ? `<span class="badge bg-warning text-dark shadow-sm">${tf.estado_cobro_parcial || 'PARCIAL'}</span>` :
                `<span class="badge bg-danger shadow-sm">${tf.estado_cobro_pendiente || 'PENDIENTE'}</span>`);
        const detalleHTML = (i.detalle_completo || '').split(' | ').map(item => `• ${item}`).join('<br>');
        const rowStyle = (debe <= 0) ? 'background-color: #f0fff4 !important;' : '';
        return `
            <tr class="text-center align-middle pointer" style="${rowStyle}"
                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('INSUMO', ${i.id})">
                <td><input type="checkbox" class="check-item-insumo-prot" data-prot="${idProt}" data-id="${i.id}" data-monto="${debe}" ${debe <= 0 ? 'disabled' : ''}></td>
                <td class="small text-muted">#${i.id}</td>
                <td>${badge}</td>
                <td class="small">${i.solicitante || '-'}</td>
                <td class="text-start ps-3 small" style="line-height: 1.2;">${detalleHTML}</td>
                <td class="text-end fw-bold">$ ${formatBillingMoney(total)}</td>
                <td class="text-end text-success fw-bold">$ ${formatBillingMoney(pagado)}</td>
                <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(debe)}</td>
            </tr>`;
    }).join('');

    return `
        <div class="mt-4 border-top pt-3">
            <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;"><i class="bi bi-box-seam me-1"></i>${titulo}</h6>
            <div class="table-responsive">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-light text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" class="check-all-insumo-prot" data-prot="${idProt}"></th>
                            <th style="width:5%">${bd.th_id || 'ID'}</th>
                            <th style="width:8%">${bi.th_estado_cap || 'Estado'}</th>
                            <th style="width:12%">${bi.th_solicitante_cap || 'Solicitante'}</th>
                            <th>${bi.th_concepto_detalle || 'Concepto / Detalle'}</th>
                            <th style="width:10%">${tf.total || 'Total'}</th>
                            <th style="width:10%">${tf.pago || 'Pagado'}</th>
                            <th style="width:10%">${tf.falta || 'Debe'}</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        </div>`;
}

function getInsumosGeneralesTableHTML(insumos) {
    if (!insumos || insumos.length === 0) return '';

    const bd = txBD();
    const tf = txF();
    let sumTotal = 0, sumPagado = 0, sumDebe = 0;

    const filas = insumos.map(i => {
        const total = parseFloat(i.total_item || 0);
        const pagado = parseFloat(i.pagado || 0);
        const isExento = (i.is_exento == 1);
        const debe = isExento ? 0 : Math.max(0, total - pagado);

        sumTotal += total; sumPagado += pagado; sumDebe += debe;

        let badge = (debe <= 0) ? `<span class="badge bg-success shadow-sm">${bd.aloj_estado_pago || 'PAGO'}</span>` :
            (pagado > 0 ? `<span class="badge bg-warning text-dark shadow-sm">${tf.estado_cobro_parcial || 'PARCIAL'}</span>` :
                `<span class="badge bg-danger shadow-sm">${tf.estado_cobro_pendiente || 'PENDIENTE'}</span>`);

        const detalleHTML = (i.detalle_completo || '').split(' | ').map(item => `• ${item}`).join('<br>');
        const rowStyle = (debe <= 0) ? 'background-color: #f0fff4 !important;' : '';

        return `
            <tr class="text-center align-middle pointer" style="${rowStyle}"
                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('INSUMO', ${i.id})">
                <td><input type="checkbox" class="check-item-insumo-global" data-id="${i.id}" data-monto="${debe}" ${debe <= 0 ? 'disabled' : ''}></td>
                <td class="small text-muted">${i.id}</td>
                <td>${badge}</td>
                <td>${i.solicitante || '-'}</td>
                <td class="text-start ps-3 small" style="line-height: 1.2;">${detalleHTML}</td>
                <td class="text-end fw-bold">$ ${formatBillingMoney(total)}</td>
                <td class="text-end text-success fw-bold">$ ${formatBillingMoney(pagado)}</td>
                <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(debe)}</td>
            </tr>`;
    }).join('');

    const tituloSinProt = tf.insumos_sin_protocolo ?? 'Insumos sin protocolo (pedidos directos)';

    return `
        <div class="card shadow-sm border-0 mb-5 card-insumos-generales" style="border-left: 5px solid #0d6efd !important;">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="m-0 text-primary fw-bold"><i class="bi bi-box-seam-fill me-2"></i>${tituloSinProt}</h5>
                <button class="btn btn-link btn-sm text-danger p-0" onclick="window.downloadInsumosPDF && window.downloadInsumosPDF()">
                    <i class="bi bi-filetype-pdf fs-4"></i>
                </button>
            </div>
            <div class="card-body p-0">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" id="check-all-insumos-gen"></th>
                            <th style="width:5%">${bd.th_id || 'ID'}</th>
                            <th style="width:8%">${window.txt?.generales?.estado || 'Estado'}</th>
                            <th style="width:15%">${bd.th_solicitante || 'Solicitante'}</th>
                            <th>${bd.th_conceptos_cantidades || 'Conceptos y Cantidades (Agrupados)'}</th>
                            <th style="width:10%">${tf.total || 'Total'}</th>
                            <th style="width:10%">${tf.pago || 'Pago'}</th>
                            <th style="width:10%">${tf.falta || 'Falta'}</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
            <div class="card-footer bg-light py-3 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-5">
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_total || 'Total Insumos'}</small>
                            <b class="fs-6">$ ${formatBillingMoney(sumTotal)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_pagado || 'Total Pago'}</small>
                            <b class="fs-6 text-success">$ ${formatBillingMoney(sumPagado)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_falta || 'Total Falta'}</small>
                            <b class="fs-6 text-danger">$ ${formatBillingMoney(sumDebe)}</b>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fs-4 fw-bold text-primary" id="total-insumos-seleccionados">$ ${formatBillingMoney(0)}</span>
                        <button class="btn btn-primary btn-sm fw-bold ms-3 shadow-sm" onclick="window.procesarPagoInsumosGenerales()">
                            <i class="bi bi-wallet2 me-1"></i> ${tf.btn_pagar_sel || 'Pagar Selección'}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function getFooterHTML(prot) {
    const bi = txBI();
    const tf = txF();
    const mn = window.txt?.menu || {};
    const totAni = (prot.formularios || []).filter(f => !f.categoria?.toLowerCase().includes('reactivo')).reduce((s, f) => s + parseFloat(f.total || 0), 0);
    const totRea = (prot.formularios || []).filter(f => f.categoria?.toLowerCase().includes('reactivo')).reduce((s, f) => s + parseFloat(f.total || 0), 0);
    const totAlo = (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0);
    const totIns = (prot.insumos || []).reduce((s, i) => s + parseFloat(i.total_item || 0), 0);
    
    const numTotal = totAni + totRea + totAlo + totIns;
    const numDebe = parseFloat(prot.deudaAnimales || 0) + parseFloat(prot.deudaReactivos || 0) + parseFloat(prot.deudaAlojamiento || 0) + parseFloat(prot.deudaInsumos || 0);
    const numPago = numTotal - numDebe;
    const lblTot = tf.total || 'Total';
    const lblAloj = mn.accommodations || 'Alojamiento';
    const lblAni = mn.animals || 'Animales';
    const lblRea = mn.reagents || 'Reactivos';
    const lblIns = tf.filtro_insumos || 'Insumos';
    const lblPag = tf.pago || 'Pagado';
    const lblFal = tf.falta || 'Falta';
    const btnEc = bi.btn_estado_cuenta || 'ESTADO DE CUENTA';
    const selLiq = bi.seleccion_liquidar || 'Seleccionado para liquidar:';

    return `
        <div class="card-footer bg-white border-top py-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-4">
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocoloPDF(${prot.idProt})">
                        <i class="bi bi-file-earmark-pdf me-1"></i>${btnEc}
                    </button>
                    
                    <div class="d-flex gap-3 border-start ps-4">
                        <div class="small text-muted">${lblTot}: <b>$ ${formatBillingMoney(numTotal)}</b></div>
                        <div class="small text-muted">${lblAloj}: <b>$ ${formatBillingMoney(totAlo)}</b></div>
                        <div class="small text-muted">${lblAni}: <b>$ ${formatBillingMoney(totAni)}</b></div>
                        <div class="small text-muted">${lblRea}: <b>$ ${formatBillingMoney(totRea)}</b></div>
                        <div class="small text-muted">${lblIns}: <b>$ ${formatBillingMoney(totIns)}</b></div>
                        <div class="small text-success border-start ps-3">${lblPag}: <b>$ ${formatBillingMoney(numPago)}</b></div>
                        <div class="small text-danger border-start ps-3">${lblFal}: <b>$ ${formatBillingMoney(numDebe)}</b></div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <div class="text-end me-2">
                        <small class="text-muted d-block uppercase fw-bold" style="font-size: 9px;">${selLiq}</small>
                        <span class="fs-5 fw-bold text-primary" id="pago-seleccionado-${prot.idProt}">$ ${formatBillingMoney(0)}</span>
                    </div>
                    <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${prot.idProt})">
                        <i class="bi bi-wallet2 me-2"></i> ${tf.btn_pagar_sel || 'Pagar Selección'}
                    </button>
                </div>
            </div>
        </div>`;
}

function vincularEventosSeleccion() {
    document.querySelectorAll('.check-all-form, .check-all-aloj, .check-all-insumo-prot').forEach(master => {
        master.addEventListener('change', (e) => {
            const idProt = e.target.dataset.prot;
            let clase = '.check-item-aloj';
            if (e.target.classList.contains('check-all-form')) clase = '.check-item-form';
            else if (e.target.classList.contains('check-all-insumo-prot')) clase = '.check-item-insumo-prot';
            document.querySelectorAll(`${clase}[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = e.target.checked);
            actualizarSuma(idProt);
        });
    });

    document.addEventListener('change', (e) => {
        if (e.target.matches('.check-item-form, .check-item-aloj, .check-item-insumo-prot')) {
            actualizarSuma(e.target.dataset.prot);
        }
    });

    const masterIns = document.getElementById('check-all-insumos-gen');
    if (masterIns) {
        masterIns.addEventListener('change', (e) => {
            document.querySelectorAll('.check-item-insumo-global:not(:disabled)').forEach(c => c.checked = e.target.checked);
            actualizarSumaInsumos();
        });
    }
    document.querySelectorAll('.check-item-insumo-global').forEach(c => c.addEventListener('change', actualizarSumaInsumos));
}

function actualizarSuma(idProt) {
    let suma = 0;
    document.querySelectorAll(`input[data-prot="${idProt}"]:checked:not([class*="check-all"])`).forEach(chk => {
        suma += parseFloat(chk.dataset.monto || 0);
    });
    const visor = document.getElementById(`pago-seleccionado-${idProt}`);
    if (visor) visor.innerText = `$ ${formatBillingMoney(suma)}`;
}

function actualizarSumaInsumos() {
    let suma = 0;
    document.querySelectorAll('.check-item-insumo-global:checked').forEach(chk => suma += parseFloat(chk.dataset.monto || 0));
    const visor = document.getElementById('total-insumos-seleccionados');
    if (visor) visor.innerText = `$ ${formatBillingMoney(suma)}`;
}

function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-inv')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-inv';
    style.innerHTML = `
        /* Cursor y Hover estilo Departamento */
        .table-billing tbody tr { transition: all 0.2s; }
        .table-billing tbody tr:hover td { background-color: #f0f7ff !important; color: #000 !important; }
        
        .pointer { cursor: pointer !important; }
        .pointer:hover { background-color: #f0f7ff !important; }
        
        /* MAGIA: Anular manito en checkbox */
        .pointer td:first-child { cursor: default !important; }
        .pointer td:first-child input[type="checkbox"] { cursor: pointer !important; }
        
        .table-billing thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; }
        .tabla-finanzas tbody td { font-size: 11px; }
    `;
    document.head.appendChild(style);
}

function getSelectedDateRangeLabelInv() {
    const sep = txBI().fecha_rango_sep || ' a ';
    const desde = document.getElementById('f-desde')?.value || '';
    const hasta = document.getElementById('f-hasta')?.value || '';
    if (!desde && !hasta) return '-';
    if (desde && hasta) return `${desde}${sep}${hasta}`;
    return desde || hasta;
}

window.abrirAyudaBilling = () => { new bootstrap.Modal(document.getElementById('modal-billing-help')).show(); };

// =====================================
// EXPORTADOR DE PDF GLOBAL
// =====================================
window.downloadGlobalPDF = async () => {
    if (!window.currentReportData) return Swal.fire(window.txt?.generales?.swal_atencion || 'Aviso', window.txt?.facturacion?.sin_datos_cargados || 'No hay datos cargados.', 'info');
    
    showLoader();
    const bi = txBI();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const invNombre = window.currentReportData.perfil?.NombreCompleto || bi.pdf_investigador_upper || 'INVESTIGADOR';
    const azulGecko = [13, 110, 253];
    const rangoFechas = getSelectedDateRangeLabelInv();
    const invPfx = ((bi.lbl_investigador_colon || 'Investigador:').replace(/\s*:?\s*$/, '') || 'Investigador').toUpperCase();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(azulGecko[0], azulGecko[1], azulGecko[2]);
    doc.text(bi.pdf_cuenta_integral || 'ESTADO DE CUENTA INTEGRAL', 148, M, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${invPfx}: ${invNombre.toUpperCase()}`, 148, M + 7, { align: "center" });
    doc.setFontSize(10);
    doc.text(`${bi.pdf_rango_filtrado || 'RANGO FILTRADO:'} ${rangoFechas}`, 148, M + 12, { align: "center" });
    doc.line(M, M + 15, right, M + 15);

    const t = window.currentReportData.totales;
    doc.autoTable({
        startY: M + 20, margin: { left: M, right: M },
        head: [[
            bi.pdf_deu_animales || 'DEUDA ANIMALES',
            bi.pdf_deu_reactivos || 'DEUDA REACTIVOS',
            bi.pdf_deu_aloj || 'DEUDA ALOJAMIENTO',
            bi.pdf_deu_insumos || 'DEUDA INSUMOS',
            bi.pdf_tot_pagado_ex || 'TOTAL PAGADO (+EX)',
            bi.pdf_deu_total || 'DEUDA TOTAL'
        ]],
        body: [[
            `$ ${formatBillingMoney(t.deudaAnimales)}`, `$ ${formatBillingMoney(t.deudaReactivos)}`, 
            `$ ${formatBillingMoney(t.deudaAlojamiento)}`, `$ ${formatBillingMoney(t.deudaInsumos)}`, 
            `$ ${formatBillingMoney(t.totalPagado)}`,
            { content: `$ ${formatBillingMoney(t.globalDeuda)}`, styles: { textColor: [180, 0, 0], fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { halign: 'center' }
    });

    let currentY = doc.lastAutoTable.finalY + 10;

    (window.currentReportData.protocolos || []).forEach((prot) => {
        if (currentY > 160) { doc.addPage(); currentY = M; }

        doc.setFillColor(245, 245, 245);
        doc.rect(M, currentY, right - M, 8, 'F');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`${bi.pdf_prot || 'PROT:'} ${prot.nprotA} - ${prot.tituloA}`, M + 3, currentY + 6);
        const pAloj = bi.pdf_prefijo_aloj || 'Alojamiento';
        const pEstr = bi.pdf_aloj_estructura || 'Estructura';
        const pIns = (bi.pdf_prefijo_insumo || 'Insumo:').replace(/\s*:?\s*$/, '');
        
        const bodyItems = [
            ...(prot.formularios || []).map(f => {
                const isEx = (f.is_exento == 1 || f.exento == 1);
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                const pagadoMostrar = isEx ? total : pagadoReal;
                const debeMostrar = isEx ? 0 : (total - pagadoReal);

                return [
                    isEx ? `${f.id} (EX)` : f.id,
                    f.fecha,
                    f.nombre_especie,
                    f.detalle_display.replace(/<[^>]*>/g, ""),
                    `$ ${formatBillingMoney(total)}`,
                    `$ ${formatBillingMoney(pagadoMostrar)}`,
                    `$ ${formatBillingMoney(debeMostrar)}`
                ];
            }),
            ...(prot.alojamientos || []).map(a => [
                a.historia, a.periodo, a.especie, `${pAloj} (${a.caja || pEstr})`, 
                `$ ${formatBillingMoney(a.total)}`, 
                `$ ${formatBillingMoney(a.pagado || 0)}`, 
                `$ ${formatBillingMoney(a.debe)}`
            ]),
            ...(prot.insumos || []).map(i => {
                const total = parseFloat(i.total_item || 0);
                const pagado = parseFloat(i.pagado || 0);
                const debe = Math.max(0, total - pagado);
                const det = (i.detalle_completo || '').replace(/<[^>]*>/g, '').substring(0, 40);
                return [`I-${i.id}`, '-', `${pIns}: ${det}`, `$ ${formatBillingMoney(total)}`, `$ ${formatBillingMoney(pagado)}`, `$ ${formatBillingMoney(debe)}`];
            })
        ];

        doc.autoTable({
            startY: currentY + 8, margin: { left: M, right: M },
            head: [[
                bi.pdf_col_id || 'ID',
                bi.pdf_col_fecha || 'Fecha',
                bi.pdf_col_especie || 'Especie',
                bi.pdf_col_detalle || 'Detalle',
                bi.pdf_col_total || 'Total',
                bi.pdf_col_pagado || 'Pagado',
                bi.pdf_col_debe || 'Debe'
            ]],
            body: bodyItems,
            theme: 'striped',
            headStyles: { fillColor: azulGecko },
            styles: { fontSize: 7 },
            columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
        });

        const pTotal = (prot.formularios || []).reduce((s, f) => s + parseFloat(f.total || 0), 0)
            + (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0)
            + (prot.insumos || []).reduce((s, i) => s + parseFloat(i.total_item || 0), 0);
        const pDebe = parseFloat(prot.deudaAnimales || 0) + parseFloat(prot.deudaReactivos || 0) + parseFloat(prot.deudaAlojamiento || 0) + parseFloat(prot.deudaInsumos || 0);
        const pPago = pTotal - pDebe;

        currentY = doc.lastAutoTable.finalY;
        doc.setFontSize(8); doc.setTextColor(0);
        doc.text(bi.pdf_subtotal_protocolo || 'SUBTOTAL PROTOCOLO:', 215, currentY + 5, { align: "right" });
        doc.text(`$ ${formatBillingMoney(pTotal)}`, 238, currentY + 5, { align: "right" });
        doc.text(`$ ${formatBillingMoney(pPago)}`, 260, currentY + 5, { align: "right" });
        doc.setTextColor(200, 0, 0);
        doc.text(`$ ${formatBillingMoney(pDebe)}`, 282, currentY + 5, { align: "right" });

        currentY += 15;
    });

    doc.save(`Reporte_Integral_${invNombre.replace(/ /g, '_')}.pdf`);
    hideLoader();
};

window.downloadProtocoloPDF = async (idProt) => {
    if (!window.currentReportData) return;
    const prot = window.currentReportData.protocolos.find(p => p.idProt == idProt || String(p.idProt) === String(idProt));
    if (!prot) return;

    showLoader();
    const bi = txBI();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const invNombre = window.currentReportData.perfil?.NombreCompleto || bi.pdf_investigador_upper || 'INVESTIGADOR';
    const rangoFechas = getSelectedDateRangeLabelInv();
    const pEstr = bi.pdf_aloj_estructura || 'Estructura';
    const alojAb = bi.pdf_aloj_abrev || 'Aloj.';
    const pIns = (bi.pdf_prefijo_insumo || 'Insumo:').replace(/\s*:?\s*$/, '');

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, M, { align: "center" });

    doc.setFontSize(11); doc.setTextColor(100);
    doc.text(bi.pdf_cuenta_individual_prot || 'ESTADO DE CUENTA INDIVIDUAL POR PROTOCOLO', 105, M + 7, { align: "center" });
    doc.line(M, M + 10, right, M + 10);

    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(`${bi.pdf_lbl_protocolo || 'Protocolo:'} ${prot.tituloA}`, M, M + 20);
    doc.text(`${bi.pdf_lbl_investigador || 'Investigador:'} ${invNombre}`, M, M + 26);
    doc.text(`${bi.pdf_lbl_rango || 'Rango filtrado:'} ${rangoFechas}`, M, M + 32);

    const bodyAll = [
        ...(prot.formularios || []).map(f => {
            const isEx = (f.is_exento == 1 || f.exento == 1);
            const total = parseFloat(f.total || 0);
            return [
                isEx ? `${f.id} (EX)` : f.id,
                f.nombre_especie,
                f.detalle_display.replace(/<[^>]*>/g, ""),
                `$ ${formatBillingMoney(total)}`,
                `$ ${formatBillingMoney(isEx ? total : parseFloat(f.pagado || 0))}`,
                `$ ${isEx ? formatBillingMoney(0) : formatBillingMoney(parseFloat(f.debe || 0))}`
            ];
        }),
        ...(prot.alojamientos || []).map(a => [`H-${a.historia}`, a.especie, `${alojAb} (${a.caja || pEstr})`, `$ ${formatBillingMoney(a.total)}`, `$ ${formatBillingMoney(a.pagado || 0)}`, `$ ${formatBillingMoney(a.debe)}`]),
        ...(prot.insumos || []).map(i => {
            const total = parseFloat(i.total_item || 0);
            const pagado = parseFloat(i.pagado || 0);
            const debe = Math.max(0, total - pagado);
            const det = (i.detalle_completo || '').replace(/<[^>]*>/g, '').substring(0, 35);
            return [`I-${i.id}`, (i.solicitante || '-').substring(0, 20), `${pIns}: ${det}`, `$ ${formatBillingMoney(total)}`, `$ ${formatBillingMoney(pagado)}`, `$ ${formatBillingMoney(debe)}`];
        }),
    ];

    doc.autoTable({
        startY: M + 38, margin: { left: M, right: M }, head: [[
            bi.pdf_col_id || 'ID',
            bi.pdf_col_especie || 'Especie',
            bi.pdf_col_concepto || 'Concepto',
            bi.pdf_col_total || 'Total',
            bi.pdf_col_pagado || 'Pagado',
            bi.pdf_col_debe || 'Debe'
        ]],
        body: bodyAll, theme: 'grid', headStyles: { fillColor: [26, 93, 59] },
        styles: { fontSize: 8 }, columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
    });

    const pTotal = (prot.formularios || []).reduce((s, f) => s + parseFloat(f.total || 0), 0)
        + (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0)
        + (prot.insumos || []).reduce((s, i) => s + parseFloat(i.total_item || 0), 0);
    const pDebe = parseFloat(prot.deudaAnimales || 0) + parseFloat(prot.deudaReactivos || 0) + parseFloat(prot.deudaAlojamiento || 0) + parseFloat(prot.deudaInsumos || 0);
    const pPago = pTotal - pDebe;

    let currentY = doc.lastAutoTable.finalY + 10;
    if (currentY > 250) { doc.addPage(); currentY = M; }

    doc.setDrawColor(200); doc.setFillColor(245, 245, 245); doc.rect(120, currentY, 70, 25, 'FD');
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(bi.pdf_subtotal_protocolo || 'SUBTOTAL PROTOCOLO:', 125, currentY + 7);
    doc.text(bi.pdf_box_tot_pag || 'TOTAL PAGADO (+EX):', 125, currentY + 13);
    doc.text(bi.pdf_box_deuda || 'DEUDA PENDIENTE:', 125, currentY + 19);

    doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text(`$ ${formatBillingMoney(pTotal)}`, 185, currentY + 7, { align: "right" });
    doc.setTextColor(26, 93, 59); doc.text(`$ ${formatBillingMoney(pPago)}`, 185, currentY + 13, { align: "right" });
    doc.setTextColor(200, 0, 0); doc.text(`$ ${formatBillingMoney(pDebe)}`, 185, currentY + 19, { align: "right" });

    doc.save(`Ficha_Protocolo_${prot.nprotA}.pdf`);
    hideLoader();
};