import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

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
            renderResultadosInstitucion(res.data);
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

function renderResultadosInstitucion(data) {
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
                    <div class="table-responsive">
                        <table class="table table-bordered table-billing mb-0 tabla-finanzas-inst">
                            <thead class="table-light text-center">
                                <tr>
                                    <th style="width:3%"><input type="checkbox" class="check-all-inst" data-inst="${inst.idInstitucionSolicitante}"></th>
                                    <th style="width:5%">ID</th>
                                    <th style="width:8%">${t.facturacion?.filtro_estado_cobro || 'ESTADO'}</th>
                                    <th style="width:14%">${t.generales?.investigador || 'SOLICITANTE'}</th>
                                    <th style="width:14%">${t.generales?.especie || 'TIPO'}</th>
                                    <th style="width:20%">${t.facturacion?.col_formulario || 'DETALLE'}</th>
                                    <th style="width:10%">${t.facturacion?.total || 'TOTAL'}</th>
                                    <th style="width:10%">${t.facturacion?.total_pagado || 'PAGADO'}</th>
                                    <th style="width:10%">${t.facturacion?.falta || 'DEBE'}</th>
                                    <th style="width:6%">PDF</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => {
                                    const debe = parseFloat(item.montoDebe || 0);
                                    const total = parseFloat(item.montoTotal || 0);
                                    const pagado = parseFloat(item.montoPagado || 0);
                                    const estadoBadge = estadoCobroBadge(item.estadoCobro);
                                    const rowStyle = debe <= 0 ? 'background-color: #f8fff9 !important;' : '';
                                    const idFact = item.idFacturacionDerivada || item.IdFacturacionFormularioDerivado || 0;
                                    const chkDisabled = debe <= 0 ? 'disabled' : '';
                                    return `
                                        <tr class="text-center align-middle pointer" style="${rowStyle}">
                                            <td><input type="checkbox" class="check-item-inst" data-inst="${inst.idInstitucionSolicitante}" data-id="${idFact}" data-monto="${debe}" ${chkDisabled}></td>
                                            <td class="small text-muted fw-bold">#${item.idformA}</td>
                                            <td>${estadoBadge}</td>
                                            <td class="small fw-bold text-start ps-2">${escapeHtml(item.investigador || '-')}</td>
                                            <td class="small text-secondary">${escapeHtml(item.nombreTipo || item.categoria || '-')}</td>
                                            <td class="text-start ps-3 small">${escapeHtml(item.categoria || item.nombreTipo || '-')}</td>
                                            <td class="text-end fw-bold text-dark">${fmt(item.montoTotal)}</td>
                                            <td class="text-end text-success fw-bold">${fmt(item.montoPagado)}</td>
                                            <td class="text-end text-danger fw-bold">${fmt(item.montoDebe)}</td>
                                            <td>
                                                <button class="btn btn-link btn-sm text-danger p-0" onclick="event.stopPropagation(); window.downloadInstFilaPDF(${item.idformA}, ${inst.idInstitucionSolicitante})" title="PDF">
                                                    <i class="bi bi-file-earmark-pdf"></i>
                                                </button>
                                            </td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
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
    let totalAPagar = 0;
    const items = [];
    seleccionados.forEach(chk => {
        const monto = parseFloat(chk.dataset.monto || 0);
        totalAPagar += monto;
        items.push({ idFacturacionDerivada: parseInt(chk.dataset.id, 10), monto_pago: monto });
    });
    const t = window.txt?.facturacion || {};
    const confirm = await Swal.fire({
        title: t.confirm_pago || 'Confirmar Liquidación',
        html: `
            <div class="text-start">
                <p>Estás por registrar pago de <b>${items.length}</b> formularios derivados.</p>
                <div class="p-3 bg-light rounded border shadow-sm">
                    <div class="d-flex justify-content-between mb-2">
                        <span>Total a registrar:</span>
                        <span class="fw-bold">$ ${totalAPagar.toLocaleString('es-UY', { minimumFractionDigits: 2 })}</span>
                    </div>
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
