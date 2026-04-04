/**
 * GESTIÓN DE FACTURACIÓN POR PROTOCOLO - GECKO DEVS 2026
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../../components/MenuComponent.js';
import { renderDashboard } from '../billingDashboard.js';
import { formatBillingMoney, formatBillingDateTime } from '../billingLocale.js';
import '../billingPayments.js'; 
import '../modals/manager.js';  

window.currentReportData = null;
window.protocolosCache = [];

function txF() {
    return window.txt?.facturacion || {};
}
function txBD() {
    return txF().billing_depto || {};
}
function txBI() {
    return txF().billing_investigador || {};
}
function txBP() {
    return txF().billing_protocolo || {};
}

export async function initBillingProtocolo() {
    try {
        aplicarEstilosTablas();
        showLoader();
        await refreshMenuNotifications();
        
        const hoy = new Date();
        document.getElementById('f-desde').value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        document.getElementById('f-hasta').value = hoy.toISOString().split('T')[0];

        await cargarListaProtocolos();
    } catch (e) { console.error(e); } finally { hideLoader(); }
}

async function cargarListaProtocolos() {
    const instId = localStorage.getItem('instId') || 1;
    const res = await API.request(`/billing/list-active-protocols?inst=${instId}`);
    if (res.status === 'success') {
        window.protocolosCache = res.data;
        renderizarOpciones(res.data);
        vincularFiltro();
    }
}

function renderizarOpciones(lista) {
    const select = document.getElementById('sel-protocolo');
    const ph = txBP().ph_sel_protocolo || '-- SELECCIONAR PROTOCOLO --';
    select.innerHTML = `<option value="">${ph}</option>` +
        lista.map(p => `<option value="${p.idprotA}">${p.nprotA} - ${p.tituloA} (ID: ${p.idprotA})</option>`).join('');
}

function vincularFiltro() {
    document.getElementById('busqueda-protocolo').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = window.protocolosCache.filter(p => 
            p.nprotA.toLowerCase().includes(term) || p.tituloA.toLowerCase().includes(term)
        );
        renderizarOpciones(filtrados);
    });
}

window.cargarFacturacionProtocolo = async () => {
    const idProt = document.getElementById('sel-protocolo').value;
    if (!idProt) return Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.aviso_protocolo || 'Seleccione un protocolo.', 'warning');
    try {
        showLoader();
        const res = await API.request('/billing/protocol-report', 'POST', {
            idProt,
            desde: document.getElementById('f-desde').value,
            hasta: document.getElementById('f-hasta').value
        });
        if (res.status === 'success') {
            window.currentReportData = { protocolos: [res.data] }; 
            renderizarResultados(res.data);
        } else {
            Swal.fire(window.txt?.generales?.error || 'Error', res.message || '', 'error');
        }
    } catch (e) { console.error(e); } finally { hideLoader(); }
};

function renderizarResultados(data) {
    const container = document.getElementById('billing-results');
    const dashboardArea = document.getElementById('dashboard-area');
    const headerInfo = document.getElementById('protocolo-info-header');
    const saldoContainer = document.getElementById('contenedor-saldo-maestro');
    const tf = txF();
    const bp = txBP();
    const lblProt = tf.label_protocolo || 'Protocolo';
    
    dashboardArea.classList.remove('d-none');
    if(document.getElementById('empty-state')) document.getElementById('empty-state').classList.add('d-none');

    headerInfo.innerHTML = `
        <span class="badge bg-success mb-2 uppercase">${lblProt}: ${data.info.nprotA}</span>
        <h3 class="fw-bold mb-1">${data.info.tituloA}</h3>
        <p class="text-muted mb-0">${bp.hdr_responsable || 'Responsable:'} <b>${data.info.Responsable}</b> | ${bp.hdr_depto || 'Depto:'} <b>${data.info.Departamento}</b></p>
    `;

    const saldo = parseFloat(data.info.SaldoPI || 0);
    const idUsr = data.info.IdUsrA;
    const phMonto = tf.inv_placeholder_monto || tf.monto_ajustar || 'Monto';
    const lblWallet = bp.lbl_billetera_titular || 'Billetera de Titular:';
    saldoContainer.innerHTML = `
        <div class="d-flex align-items-center gap-3 justify-content-end">
            <div class="text-end">
                <small class="text-muted fw-bold d-block uppercase" style="font-size: 9px;">${lblWallet}</small>
                <span class="badge bg-success fs-5 shadow-sm" id="investigador-saldo-global">$ ${formatBillingMoney(saldo)}</span>
            </div>
            <div class="input-group input-group-sm" style="width: 200px;">
                <input type="number" id="inp-saldo-${idUsr}" class="form-control" placeholder="${phMonto}...">
                <button type="button" class="btn btn-success" onclick="window.updateBalance(${idUsr}, 'add', false)">+</button>
                <button type="button" class="btn btn-danger" onclick="window.updateBalance(${idUsr}, 'sub', false)">-</button>
            </div>
        </div>
    `;

    renderDashboardProtocolo(data.totales);

    container.innerHTML = `
        <div class="card shadow-sm border-0 mb-5">
            <div class="card-body p-3">
                ${getFormsTableHTML(data.formularios, data.info.idprotA)}
                ${data.alojamientos?.length > 0 ? getAlojTableHTML(data.alojamientos, data.info.idprotA) : ''}
                ${getInsumosProtocoloTableHTML(data.insumos, data.info.idprotA)}
            </div>
            ${getFooterHTML(data)}
        </div>`;
    
    vincularEventosSeleccion();
}

function getFormsTableHTML(formularios, idProt) {
    const bd = txBD();
    const bi = txBI();
    const safeForms = formularios || [];

    if (!safeForms || safeForms.length === 0) return `<p class="text-center my-4 text-muted small">${bi.sin_pedidos_protocolo || 'No hay pedidos vinculados a este protocolo.'}</p>`;
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
    const bp = txBP();
    const tf = txF();
    const secA = bi.sec_alojamientos || 'Alojamientos';
    return `
        <h6 class="fw-bold text-muted mb-2 small uppercase">${secA}</h6>
        <table class="table table-bordered table-billing mb-0">
            <thead class="table-dark text-center">
                <tr>
                    <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                    <th>${bi.th_historia || 'HISTORIA'}</th><th>${bp.th_especie || 'ESPECIE'}</th><th>${tf.periodo || 'PERIODO'}</th><th>${bd.th_total_uc || 'TOTAL'}</th><th>${bd.th_pagado_uc || 'PAGADO'}</th><th>${bd.th_debe_uc || 'DEBE'}</th>
                </tr>
            </thead>
            <tbody>
                ${alojamientos.map(a => `
                    <tr class="text-center align-middle pointer" onclick="if(!event.target.closest('td:first-child')) window.abrirEdicionFina('ALOJ', ${a.historia})">
                        <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${a.debe <= 0 ? 'disabled' : ''}></td>
                        <td>#${a.historia}</td><td>${a.especie}</td><td class="small">${a.periodo}</td>
                        <td class="text-end">$ ${formatBillingMoney(a.total)}</td>
                        <td class="text-end text-success">$ ${formatBillingMoney(a.pagado)}</td>
                        <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(a.debe)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

function getInsumosProtocoloTableHTML(insumos, idProt) {
    if (!insumos || insumos.length === 0) return '';
    const bd = txBD();
    const tf = txF();
    const bi = txBI();
    const titulo = tf.insumos_protocolo ?? 'Insumos del protocolo';
    const filas = insumos.map(i => {
        const total = parseFloat(i.total_item || 0);
        const pagado = parseFloat(i.pagado || 0);
        const debe = Math.max(0, total - pagado);
        const badge = (debe <= 0) ? `<span class="badge bg-success shadow-sm">${bd.aloj_estado_pago || 'PAGO'}</span>` :
            (pagado > 0 ? `<span class="badge bg-warning text-dark">${tf.estado_cobro_parcial || 'PARCIAL'}</span>` : `<span class="badge bg-danger shadow-sm">${tf.estado_cobro_pendiente || 'PENDIENTE'}</span>`);
        const detalleHTML = (i.detalle_completo || '').split(' | ').map(item => `• ${item}`).join('<br>');
        const rowStyle = (debe <= 0) ? 'background-color: #f0fff4 !important;' : '';
        return `
            <tr class="text-center align-middle pointer" style="${rowStyle}"
                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('INSUMO', ${i.id})">
                <td><input type="checkbox" class="check-item-insumo-prot" data-prot="${idProt}" data-id="${i.id}" data-monto="${debe}" ${debe <= 0 ? 'disabled' : ''}></td>
                <td class="small text-muted">#${i.id}</td>
                <td>${badge}</td>
                <td class="small">${i.solicitante}</td>
                <td class="text-start ps-3 small" style="line-height: 1.2;">${detalleHTML}</td>
                <td class="text-end fw-bold">$ ${formatBillingMoney(total)}</td>
                <td class="text-end text-success">$ ${formatBillingMoney(pagado)}</td>
                <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(debe)}</td>
            </tr>`;
    }).join('');

    return `
        <div class="mt-4">
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

function getFooterHTML(data) {
    const p = data.info;
    const bp = txBP();
    const bi = txBI();
    const tf = txF();
    return `
        <div class="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
            <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocoloPDF(${p.idprotA})">${bp.btn_pdf_ficha || 'PDF ficha'}</button>
            <div class="text-end">
                <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">${bi.seleccion_liquidar || 'Seleccionado para liquidar:'}</small>
                <span class="fs-4 fw-bold text-primary" id="pago-seleccionado-${p.idprotA}">$ ${formatBillingMoney(0)}</span>
                <button type="button" class="btn btn-primary fw-bold ms-3 px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${p.idprotA})">${tf.btn_pagar_sel || 'Pagar Selección'}</button>
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
}

function actualizarSuma(idProt) {
    let suma = 0;
    document.querySelectorAll(`input[data-prot="${idProt}"]:checked:not([class*="check-all"])`).forEach(chk => {
        suma += parseFloat(chk.dataset.monto || 0);
    });
    const visor = document.getElementById(`pago-seleccionado-${idProt}`);
    if (visor) visor.innerText = `$ ${formatBillingMoney(suma)}`;
}

function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-prot')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-prot';
    style.innerHTML = `
        .table-billing tbody tr { transition: all 0.2s; }
        .table-billing tbody tr:hover td { background-color: #f0f7ff !important; color: #000 !important; }
        
        .pointer { cursor: pointer !important; }
        .pointer:hover { background-color: #f0f7ff !important; }
        
        .pointer td:first-child { cursor: default !important; }
        .pointer td:first-child input[type="checkbox"] { cursor: pointer !important; }
    `;
    document.head.appendChild(style);
}

function renderDashboardProtocolo(totales) {
    const ids = {
        global: 'total-deuda-global',
        animales: 'total-deuda-animales',
        reactivos: 'total-deuda-reactivos',
        alojamiento: 'total-deuda-alojamiento',
        insumos: 'total-deuda-insumos',
        pagado: 'total-pagado'
    };

    const f = (n) => `$ ${formatBillingMoney(parseFloat(n || 0))}`;

    if (document.getElementById(ids.global)) document.getElementById(ids.global).innerText = f(totales.deudaTotal);
    if (document.getElementById(ids.animales)) document.getElementById(ids.animales).innerText = f(totales.deudaAnimales);
    if (document.getElementById(ids.reactivos)) document.getElementById(ids.reactivos).innerText = f(totales.deudaReactivos);
    if (document.getElementById(ids.alojamiento)) document.getElementById(ids.alojamiento).innerText = f(totales.deudaAlojamiento);
    if (document.getElementById(ids.insumos)) document.getElementById(ids.insumos).innerText = f(totales.deudaInsumos);
    if (document.getElementById(ids.pagado)) document.getElementById(ids.pagado).innerText = f(totales.totalPagado);
}

function getSelectedDateRangeLabelProt() {
    const sep = txBI().fecha_rango_sep || ' a ';
    const desde = document.getElementById('f-desde')?.value || '';
    const hasta = document.getElementById('f-hasta')?.value || '';
    if (!desde && !hasta) return '-';
    if (desde && hasta) return `${desde}${sep}${hasta}`;
    return desde || hasta;
}

// =====================================
// EXPORTADOR PDF
// =====================================
window.downloadProtocoloPDF = async (idProt) => {
    if (!window.currentReportData || !window.currentReportData.protocolos || window.currentReportData.protocolos.length === 0) {
        return Swal.fire(window.txt?.generales?.swal_atencion || 'Aviso', window.txt?.facturacion?.sin_datos_cargados || 'No hay datos cargados.', 'info');
    }

    const data = window.currentReportData.protocolos[0];
    const info = data.info;
    const totales = data.totales;

    if (!info) return Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_info_no_encontrada || 'No se encontró la información.', 'error');

    showLoader();

    try {
        const bi = txBI();
        const bp = txBP();
        const bd = txBD();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const pageW = doc.internal.pageSize.getWidth();
        const right = pageW - M;
        const inst = (localStorage.getItem('NombreInst') || 'BIOTERIO').toUpperCase();
        const verdeGecko = [25, 135, 84];
        const rangoFechas = getSelectedDateRangeLabelProt();

        doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]);
        doc.text(`${inst}`, 105, M, { align: "center" });

        doc.setFontSize(11); doc.setTextColor(100);
        doc.text(bp.pdf_titulo_detalle_prot || 'ESTADO DE CUENTA DETALLADO POR PROTOCOLO', 105, M + 7, { align: "center" });
        doc.setDrawColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]); doc.line(M, M + 10, right, M + 10);

        doc.setFontSize(10); doc.setTextColor(0);
        doc.text(bp.pdf_uc_protocolo || 'PROTOCOLO:', M, M + 20);
        doc.setFont("helvetica", "normal"); doc.text(`${info.tituloA} (${info.nprotA})`, 50, M + 20);
        doc.setFont("helvetica", "bold"); doc.text(bp.pdf_uc_responsable || 'RESPONSABLE:', M, M + 26);
        doc.setFont("helvetica", "normal"); doc.text(`${info.Responsable} (ID: ${info.IdUsrA})`, 50, M + 26);
        doc.setFont("helvetica", "bold"); doc.text(bp.pdf_uc_departamento || 'DEPARTAMENTO:', M, M + 32);
        doc.setFont("helvetica", "normal"); doc.text(`${info.Departamento}`, 50, M + 32);
        doc.setFont("helvetica", "bold"); doc.text(bp.pdf_uc_fecha_reporte || 'FECHA REPORTE:', M, M + 38);
        doc.setFont("helvetica", "normal"); doc.text(`${formatBillingDateTime()}`, 50, M + 38);
        doc.setFont("helvetica", "bold"); doc.text(bi.pdf_rango_filtrado || 'RANGO FILTRADO:', M, M + 44);
        doc.setFont("helvetica", "normal"); doc.text(`${rangoFechas}`, 50, M + 44);

        let currentY = M + 51;

        if (data.formularios?.length > 0) {
            const bodyForms = data.formularios.map(f => {
                const isEx = (f.is_exento == 1 || f.exento == 1);
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                return [
                    isEx ? `#${f.id} (EX)` : `#${f.id}`,
                    f.nombre_especie,
                    (f.detalle_display || '').replace(/<[^>]*>/g, ""),
                    `$ ${formatBillingMoney(total)}`,
                    `$ ${formatBillingMoney(isEx ? total : pagadoReal)}`,
                    `$ ${isEx ? formatBillingMoney(0) : formatBillingMoney(total - pagadoReal)}`
                ];
            });

            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [[
                    bi.pdf_col_id || 'ID',
                    bi.pdf_col_especie || 'Especie',
                    bi.pdf_col_concepto || 'Concepto',
                    bi.pdf_col_total || 'Total',
                    bi.pdf_col_pagado || 'Pagado',
                    bi.pdf_col_debe || 'Debe'
                ]],
                body: bodyForms,
                theme: 'grid', headStyles: { fillColor: verdeGecko }, styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        if (data.alojamientos?.length > 0) {
            const prefAloj = (bp.pdf_pref_aloj_periodo || 'Alojamiento:').replace(/\s*:?\s*$/, '');
            const bodyAloj = data.alojamientos.map(a => [
                `H-${a.historia}`, a.especie, `${prefAloj}: ${a.periodo}`,
                `$ ${formatBillingMoney(a.total)}`, `$ ${formatBillingMoney(a.pagado)}`, `$ ${formatBillingMoney(a.debe)}`
            ]);

            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [[
                    bp.pdf_th_hist_abrev || 'Hist.',
                    bi.pdf_col_especie || 'Especie',
                    bp.pdf_col_periodo_aloj || 'Periodo alojamiento',
                    bi.pdf_col_total || 'Total',
                    bi.pdf_col_pagado || 'Pagado',
                    bi.pdf_col_debe || 'Debe'
                ]],
                body: bodyAloj,
                theme: 'grid', headStyles: { fillColor: [40, 40, 40] }, styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        if (data.insumos?.length > 0) {
            if (currentY > 200) { doc.addPage(); currentY = M; }
            const bodyIns = data.insumos.map(i => {
                const total = parseFloat(i.total_item || 0);
                const pagado = parseFloat(i.pagado || 0);
                const debe = Math.max(0, total - pagado);
                const detalle = (i.detalle_completo || '').replace(/<[^>]*>/g, '').substring(0, 60);
                return [`#${i.id}`, (i.solicitante || '').substring(0, 25), detalle, `$ ${formatBillingMoney(total)}`, `$ ${formatBillingMoney(pagado)}`, `$ ${formatBillingMoney(debe)}`];
            });
            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [[
                    bi.pdf_col_id || 'ID',
                    bd.th_solicitante || 'Solicitante',
                    bi.pdf_col_concepto || 'Concepto',
                    bi.pdf_col_total || 'Total',
                    bi.pdf_col_pagado || 'Pagado',
                    bi.pdf_col_debe || 'Debe'
                ]],
                body: bodyIns,
                theme: 'grid', headStyles: { fillColor: [80, 80, 80] }, styles: { fontSize: 7 },
                columnStyles: { 2: { cellWidth: 55 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        if (currentY > 250) { doc.addPage(); currentY = M; }

        doc.setDrawColor(200); doc.setFillColor(245, 245, 245); doc.rect(120, currentY, 70, 25, 'FD');
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(bi.pdf_subtotal_protocolo || 'SUBTOTAL PROTOCOLO:', 125, currentY + 7);
        doc.text(bi.pdf_box_tot_pag || 'TOTAL PAGADO (+EX):', 125, currentY + 13);
        doc.text(bi.pdf_box_deuda || 'DEUDA PENDIENTE:', 125, currentY + 19);
        
        doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(`$ ${formatBillingMoney(totales.deudaTotal + totales.totalPagado)}`, 185, currentY + 7, { align: "right" });
        doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]); doc.text(`$ ${formatBillingMoney(totales.totalPagado)}`, 185, currentY + 13, { align: "right" });
        doc.setTextColor(200, 0, 0); doc.text(`$ ${formatBillingMoney(totales.deudaTotal)}`, 185, currentY + 19, { align: "right" });

        doc.save(`Ficha_Financiera_Prot_${info.nprotA}.pdf`);
    } catch (e) {
        console.error("Error generando PDF:", e);
        Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_pdf || 'No se pudo generar el documento PDF.', 'error');
    } finally { hideLoader(); }
};