/**
 * GESTIÓN DE FACTURACIÓN POR PROTOCOLO - GECKO DEVS 2026
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../../components/MenuComponent.js';
import { renderDashboard } from '../billingDashboard.js'; 
import '../billingPayments.js'; 
import '../modals/manager.js';  

window.currentReportData = null;
window.protocolosCache = [];

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
    select.innerHTML = '<option value="">-- SELECCIONAR PROTOCOLO --</option>' + 
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
             Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { console.error(e); } finally { hideLoader(); }
};

function renderizarResultados(data) {
    const container = document.getElementById('billing-results');
    const dashboardArea = document.getElementById('dashboard-area');
    const headerInfo = document.getElementById('protocolo-info-header');
    const saldoContainer = document.getElementById('contenedor-saldo-maestro');
    
    dashboardArea.classList.remove('d-none');
    if(document.getElementById('empty-state')) document.getElementById('empty-state').classList.add('d-none');

    headerInfo.innerHTML = `
        <span class="badge bg-success mb-2 uppercase">Protocolo: ${data.info.nprotA}</span>
        <h3 class="fw-bold mb-1">${data.info.tituloA}</h3>
        <p class="text-muted mb-0">Responsable: <b>${data.info.Responsable}</b> | Depto: <b>${data.info.Departamento}</b></p>
    `;

    const saldo = parseFloat(data.info.SaldoPI || 0);
    const idUsr = data.info.IdUsrA;
    // Agregamos type="button"
    saldoContainer.innerHTML = `
        <div class="d-flex align-items-center gap-3 justify-content-end">
            <div class="text-end">
                <small class="text-muted fw-bold d-block uppercase" style="font-size: 9px;">Billetera de Titular:</small>
                <span class="badge bg-success fs-5 shadow-sm" id="investigador-saldo-global">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
            </div>
            <div class="input-group input-group-sm" style="width: 200px;">
                <input type="number" id="inp-saldo-${idUsr}" class="form-control" placeholder="Monto...">
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
                ${getInsumosProtocoloTableHTML(data.insumos)}
            </div>
            ${getFooterHTML(data)}
        </div>`;
    
    vincularEventosSeleccion();
}

function getFormsTableHTML(formularios, idProt) {
    if (!formularios || formularios.length === 0) return '<p class="text-center my-4 text-muted small">No hay pedidos vinculados a este protocolo.</p>';
    return `
        <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">Pedidos de Protocolo (Formularios)</h6>
        <div class="table-responsive">
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:2%"><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                        <th style="width:5%">ID</th>
                        <th style="width:8%">ESTADO</th>
                        <th style="width:12%">FECHAS</th>
                        <th style="width:15%">ESPECIE / TIPO</th>
                        <th style="width:15%">CONCEPTO</th>
                        <th style="width:18%">CANTIDAD / PRESENTACIÓN</th>
                        <th style="width:8%">TOTAL</th>
                        <th style="width:8%">PAGADO</th>
                        <th style="width:8%">DEBE</th>
                    </tr>
                </thead>
                <tbody>
                    ${formularios.map(f => {
                        const isExento = (f.is_exento == 1 || f.exento == 1);
                        const total = parseFloat(f.total || 0);
                        const pagado = parseFloat(f.pagado || 0);
                        const debe = isExento ? 0 : Math.max(0, total - pagado);

                        const isRea = f.categoria?.toLowerCase().includes('reactivo');
                        const tipoModal = isRea ? 'REACTIVO' : 'ANIMAL';

                        // 🚀 MAGIA VISUAL PARA CANTIDADES Y REACTIVOS
                        let cantidadDisplay = '';
                        if (isRea) {
                            cantidadDisplay = `
                                <div class="text-start lh-sm">
                                    <span class="text-info fw-bold">${f.NombreInsumo || 'Reactivo'}</span><br>
                                    <small class="text-muted" style="font-size: 10px;">Pres: <b>${f.CantidadInsumo || '-'} ${f.TipoInsumo || ''}</b></small><br>
                                    <span class="badge bg-light text-dark border mt-1 shadow-sm">Solicitadas: <b class="text-primary">${f.cant_organo || 0} un.</b></span>
                                </div>`;
                        } else {
                            cantidadDisplay = `<b class="fs-5 text-dark">${f.cant_animal || 0}</b> <small class="text-muted">un.</small>`;
                        }

                        // --- VISUAL: ESPECIE Y FECHAS ---
                        const espDisplay = f.nombre_especie + (f.nombre_subespecie && f.nombre_subespecie !== 'N/A' ? `<br><small class="text-muted">${f.nombre_subespecie}</small>` : '');
                        const fechasDisplay = `<div class="small"><b>In:</b> ${f.fecha || '-'}</div><div class="small text-danger"><b>Out:</b> ${f.fecRetiroA || '-'}</div>`;
                        const dctoHTML = (f.descuento > 0) ? `<br><span class="badge-discount mt-1 d-inline-block">-${f.descuento}%</span>` : '';
                        
                        let estadoBadge = isExento ? '<span class="badge bg-info text-dark shadow-sm">EXENTO</span>' : 
                                         (debe <= 0 ? '<span class="badge bg-success shadow-sm">PAGO COMPLETO</span>' : 
                                         (pagado > 0 ? '<span class="badge bg-warning text-dark shadow-sm">PAGO PARCIAL</span>' : 
                                         '<span class="badge bg-danger shadow-sm">SIN PAGAR</span>'));

                        const rowStyle = (debe <= 0 || isExento) ? 'background-color: #f8fff9 !important;' : '';

                        return `
                            <tr class="text-center align-middle pointer" style="${rowStyle}" 
                                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('${tipoModal}', ${f.id})">
                                <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debe}" data-id="${f.id}" ${(debe <= 0 || isExento) ? 'disabled' : ''}></td>
                                <td class="small text-muted fw-bold">#${f.id}</td>
                                <td>${estadoBadge}</td>
                                <td>${fechasDisplay}</td>
                                <td class="small text-secondary">${isRea ? '<span class="badge bg-light text-info border">REACTIVO BIOLÓGICO</span>' : espDisplay}</td>
                                <td class="text-start ps-3 small">${(f.detalle_display || '').replace(/<[^>]*>/g, "")} ${dctoHTML}</td>
                                <td>${cantidadDisplay}</td>
                                <td class="text-end fw-bold text-dark">$ ${total.toFixed(2)}</td>
                                <td class="text-end text-success fw-bold">$ ${pagado.toFixed(2)}</td>
                                <td class="text-end text-danger fw-bold">$ ${debe.toFixed(2)}</td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}
function getAlojTableHTML(alojamientos, idProt) {
    return `
        <h6 class="fw-bold text-muted mb-2 small uppercase">Alojamientos</h6>
        <table class="table table-bordered table-billing mb-0">
            <thead class="table-dark text-center">
                <tr>
                    <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                    <th>HISTORIA</th><th>ESPECIE</th><th>PERIODO</th><th>TOTAL</th><th>PAGADO</th><th>DEBE</th>
                </tr>
            </thead>
            <tbody>
                ${alojamientos.map(a => `
                    <tr class="text-center align-middle pointer" onclick="if(!event.target.closest('td:first-child')) window.abrirEdicionFina('ALOJ', ${a.historia})">
                        <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${a.debe <= 0 ? 'disabled' : ''}></td>
                        <td>#${a.historia}</td><td>${a.especie}</td><td class="small">${a.periodo}</td>
                        <td class="text-end">$ ${parseFloat(a.total).toFixed(2)}</td>
                        <td class="text-end text-success">$ ${parseFloat(a.pagado).toFixed(2)}</td>
                        <td class="text-end text-danger fw-bold">$ ${parseFloat(a.debe).toFixed(2)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

function getInsumosProtocoloTableHTML(insumos) {
    if (!insumos || insumos.length === 0) return '';
    const titulo = window.txt?.facturacion?.insumos_protocolo ?? 'Insumos del protocolo';
    const filas = insumos.map(i => {
        const total = parseFloat(i.total_item || 0);
        const pagado = parseFloat(i.pagado || 0);
        const debe = Math.max(0, total - pagado);
        const badge = (debe <= 0) ? '<span class="badge bg-success shadow-sm">PAGO</span>' :
            (pagado > 0 ? '<span class="badge bg-warning text-dark">PARCIAL</span>' : '<span class="badge bg-danger shadow-sm">PENDIENTE</span>');
        const detalleHTML = (i.detalle_completo || '').split(' | ').map(item => `• ${item}`).join('<br>');
        const rowStyle = (debe <= 0) ? 'background-color: #f0fff4 !important;' : '';
        return `
            <tr class="text-center align-middle pointer" style="${rowStyle}"
                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('INSUMO', ${i.id})">
                <td class="small text-muted">#${i.id}</td>
                <td>${badge}</td>
                <td class="small">${i.solicitante}</td>
                <td class="text-start ps-3 small" style="line-height: 1.2;">${detalleHTML}</td>
                <td class="text-end fw-bold">$ ${total.toFixed(2)}</td>
                <td class="text-end text-success">$ ${pagado.toFixed(2)}</td>
                <td class="text-end text-danger fw-bold">$ ${debe.toFixed(2)}</td>
            </tr>`;
    }).join('');

    return `
        <div class="mt-4">
            <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;"><i class="bi bi-box-seam me-1"></i>${titulo}</h6>
            <div class="table-responsive">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-light text-center">
                        <tr>
                            <th style="width:5%">ID</th>
                            <th style="width:8%">Estado</th>
                            <th style="width:12%">Solicitante</th>
                            <th>Concepto / Detalle</th>
                            <th style="width:10%">Total</th>
                            <th style="width:10%">Pagado</th>
                            <th style="width:10%">Debe</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        </div>`;
}

function getFooterHTML(data) {
    const p = data.info;
    // Agregamos type="button"
    return `
        <div class="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
            <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocoloPDF(${p.idprotA})">PDF FICHA</button>
            <div class="text-end">
                <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">Seleccionado para liquidar:</small>
                <span class="fs-4 fw-bold text-primary" id="pago-seleccionado-${p.idprotA}">$ 0.00</span>
                <button type="button" class="btn btn-primary fw-bold ms-3 px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${p.idprotA})">PAGAR SELECCIÓN</button>
            </div>
        </div>`;
}

function vincularEventosSeleccion() {
    document.querySelectorAll('.check-all-form, .check-all-aloj').forEach(master => {
        master.addEventListener('change', (e) => {
            const idProt = e.target.dataset.prot;
            const clase = e.target.classList.contains('check-all-form') ? '.check-item-form' : '.check-item-aloj';
            document.querySelectorAll(`${clase}[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = e.target.checked);
            actualizarSuma(idProt);
        });
    });

    document.addEventListener('change', (e) => {
        if (e.target.matches('.check-item-form, .check-item-aloj')) {
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
    if (visor) visor.innerText = `$ ${suma.toLocaleString('es-UY', {minimumFractionDigits: 2})}`;
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

    const f = (n) => `$ ${parseFloat(n || 0).toLocaleString('es-UY', {minimumFractionDigits: 2})}`;

    if (document.getElementById(ids.global)) document.getElementById(ids.global).innerText = f(totales.deudaTotal);
    if (document.getElementById(ids.animales)) document.getElementById(ids.animales).innerText = f(totales.deudaAnimales);
    if (document.getElementById(ids.reactivos)) document.getElementById(ids.reactivos).innerText = f(totales.deudaReactivos);
    if (document.getElementById(ids.alojamiento)) document.getElementById(ids.alojamiento).innerText = f(totales.deudaAlojamiento);
    if (document.getElementById(ids.insumos)) document.getElementById(ids.insumos).innerText = f(totales.deudaInsumos);
    if (document.getElementById(ids.pagado)) document.getElementById(ids.pagado).innerText = f(totales.totalPagado);
}

function getSelectedDateRangeLabelProt() {
    const desde = document.getElementById('f-desde')?.value || '';
    const hasta = document.getElementById('f-hasta')?.value || '';
    if (!desde && !hasta) return '-';
    if (desde && hasta) return `${desde} a ${hasta}`;
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
        doc.text("ESTADO DE CUENTA DETALLADO POR PROTOCOLO", 105, M + 7, { align: "center" });
        doc.setDrawColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]); doc.line(M, M + 10, right, M + 10);

        doc.setFontSize(10); doc.setTextColor(0);
        doc.text(`PROTOCOLO:`, M, M + 20);
        doc.setFont("helvetica", "normal"); doc.text(`${info.tituloA} (${info.nprotA})`, 50, M + 20);
        doc.setFont("helvetica", "bold"); doc.text(`RESPONSABLE:`, M, M + 26);
        doc.setFont("helvetica", "normal"); doc.text(`${info.Responsable} (ID: ${info.IdUsrA})`, 50, M + 26);
        doc.setFont("helvetica", "bold"); doc.text(`DEPARTAMENTO:`, M, M + 32);
        doc.setFont("helvetica", "normal"); doc.text(`${info.Departamento}`, 50, M + 32);
        doc.setFont("helvetica", "bold"); doc.text(`FECHA REPORTE:`, M, M + 38);
        doc.setFont("helvetica", "normal"); doc.text(`${new Date().toLocaleString()}`, 50, M + 38);
        doc.setFont("helvetica", "bold"); doc.text(`RANGO FILTRADO:`, M, M + 44);
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
                    `$ ${total.toFixed(2)}`,
                    `$ ${isEx ? total.toFixed(2) : pagadoReal.toFixed(2)}`,
                    `$ ${isEx ? '0.00' : (total - pagadoReal).toFixed(2)}`
                ];
            });

            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [['ID', 'Especie', 'Concepto', 'Total', 'Pagado', 'Debe']],
                body: bodyForms,
                theme: 'grid', headStyles: { fillColor: verdeGecko }, styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        if (data.alojamientos?.length > 0) {
            const bodyAloj = data.alojamientos.map(a => [
                `H-${a.historia}`, a.especie, `Alojamiento: ${a.periodo}`,
                `$ ${parseFloat(a.total).toFixed(2)}`, `$ ${parseFloat(a.pagado).toFixed(2)}`, `$ ${parseFloat(a.debe).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [['Hist.', 'Especie', 'Periodo Alojamiento', 'Total', 'Pagado', 'Debe']],
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
                return [`#${i.id}`, (i.solicitante || '').substring(0, 25), detalle, `$ ${total.toFixed(2)}`, `$ ${pagado.toFixed(2)}`, `$ ${debe.toFixed(2)}`];
            });
            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [['ID', 'Solicitante', 'Concepto', 'Total', 'Pagado', 'Debe']],
                body: bodyIns,
                theme: 'grid', headStyles: { fillColor: [80, 80, 80] }, styles: { fontSize: 7 },
                columnStyles: { 2: { cellWidth: 55 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        if (currentY > 250) { doc.addPage(); currentY = M; }

        doc.setDrawColor(200); doc.setFillColor(245, 245, 245); doc.rect(120, currentY, 70, 25, 'FD');
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text("SUBTOTAL PROTOCOLO:", 125, currentY + 7); doc.text("TOTAL PAGADO (+EX):", 125, currentY + 13); doc.text("DEUDA PENDIENTE:", 125, currentY + 19);
        
        doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(`$ ${(totales.deudaTotal + totales.totalPagado).toFixed(2)}`, 185, currentY + 7, { align: "right" });
        doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]); doc.text(`$ ${totales.totalPagado.toFixed(2)}`, 185, currentY + 13, { align: "right" });
        doc.setTextColor(200, 0, 0); doc.text(`$ ${totales.deudaTotal.toFixed(2)}`, 185, currentY + 19, { align: "right" });

        doc.save(`Ficha_Financiera_Prot_${info.nprotA}.pdf`);
    } catch (e) {
        console.error("Error generando PDF:", e);
        Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_pdf || 'No se pudo generar el documento PDF.', 'error');
    } finally { hideLoader(); }
};