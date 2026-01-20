import { API } from '../../../api.js';
import { hideLoader, showLoader } from '../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../components/MenuComponent.js';
import { renderDashboard } from './billingDashboard.js'; // Asegura que la ruta sea correcta
import './billingPayments.js';


let currentReportData = null;

export async function initBillingDepto() {
    try {
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
    
    // Captura de filtros
    const chkAni = document.getElementById('chk-animales').checked;
    const chkAlo = document.getElementById('chk-alojamiento').checked;
    const chkIns = document.getElementById('chk-insumos').checked;

    // Validación: Al menos uno debe estar activo
    if (!chkAni && !chkAlo && !chkIns) {
        Swal.fire('Atención', 'Debe tener al menos un filtro activo (Animales, Alojamiento o Insumos).', 'warning');
        return;
    }

    if (!deptoId) { Swal.fire('Atención', 'Seleccione un departamento.', 'warning'); return; }

    try {
        showLoader();
        const res = await API.request('/billing/depto-report', 'POST', { depto: deptoId, desde, hasta, chkAni, chkAlo, chkIns });
        if (res.status === 'success') {
            currentReportData = res.data;
            renderizarResultados(currentReportData);
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
 * Cabezal del Protocolo con Gestión de Saldo integrada
 */
function getHeaderHTML(prot) {
    return `
        <div class="card-header bg-white py-3 border-bottom">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="badge bg-success mb-2 uppercase" style="font-size: 9px; background-color: #1a5d3b !important;">
                        Protocolo: ${prot.nprotA}
                    </span>
                    <h5 class="fw-bold m-0 text-dark">${prot.tituloA}</h5>
                    <div class="small text-muted mt-1">
                        <i class="bi bi-person-circle me-1"></i>Investigador: <b class="text-dark">${prot.investigador} (ID: ${prot.idUsr})</b>
                    </div>
                </div>
                
                <div class="text-end">
                    <div class="d-flex flex-column align-items-end gap-1">
                        <div class="d-flex align-items-center gap-2">
                            <small class="text-muted fw-bold uppercase" style="font-size: 10px;">Saldo Actual:</small>
                            <input type="text" class="form-control form-control-sm text-center fw-bold bg-light border-0 shadow-none" 
                                   value="$ ${parseFloat(prot.saldoInv).toLocaleString('es-UY', {minimumFractionDigits: 2})}" 
                                   readonly style="width: 120px; font-size: 14px; color: #1a5d3b;">
                        </div>
                        
                        <div class="input-group input-group-sm shadow-sm" style="width: 210px;">
                            <span class="input-group-text bg-white border-end-0"><i class="bi bi-pencil-square"></i></span>
                            <input type="number" id="inp-saldo-prot-${prot.idUsr}" class="form-control border-start-0 border-end-0" placeholder="Monto a ajustar...">
                            <button class="btn btn-success" onclick="window.updateBalance(${prot.idUsr}, 'add', true)"><i class="bi bi-plus-lg"></i></button>
                            <button class="btn btn-danger" onclick="window.updateBalance(${prot.idUsr}, 'sub', true)"><i class="bi bi-dash-lg"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}
function getFormsTableHTML(formularios, idProt) {
    if (!formularios || formularios.length === 0) return '';
    return `<h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">Pedidos (Formularios)</h6>
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:3%"><input type="checkbox" class="check-all-prot" data-prot="${idProt}"></th>
                        <th style="width:5%">ID</th><th style="width:12%">Solicitante</th><th style="width:10%">F. Entrega</th>
                        <th style="width:12%">Especie:Sub</th><th style="width:18%">Detalle / Concepto</th><th style="width:12%">Cantidad</th>
                        <th style="width:8%">P. Momento</th><th style="width:8%">Total</th><th style="width:8%">Pagado</th><th style="width:8%">Debe</th>
                    </tr>
                </thead>
                <tbody>
                    ${formularios.map(f => {
                        const isFinished = f.is_exento || parseFloat(f.debe) <= 0;
                        const rowStyle = isFinished ? 'style="background-color: #f0fff4 !important;"' : '';
                        return `<tr class="text-center align-middle" ${rowStyle}>
                                    <td><input type="checkbox" class="check-item-prot" data-prot="${idProt}" ${isFinished ? 'disabled' : ''}></td>
                                    <td class="small text-muted">${f.id}</td><td>${f.solicitante}</td><td>${f.fecha}</td>
                                    <td class="fw-bold text-start ps-2">${f.taxonomia}</td><td class="text-start ps-3">${f.detalle_display}</td>
                                    <td class="text-primary">${f.cantidad_display}</td><td class="text-end">$ ${parseFloat(f.p_unit).toFixed(2)}</td>
                                    <td class="text-end fw-bold">$ ${parseFloat(f.total).toFixed(2)}</td>
                                    <td class="text-end text-success">$ ${parseFloat(f.pagado).toFixed(2)}</td>
                                    <td class="text-end text-danger fw-bold">$ ${parseFloat(f.debe).toFixed(2)}</td>
                                </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
}

function getAlojTableHTML(alojamientos, idProt) {
    if (!alojamientos || alojamientos.length === 0) return '';
    
    const filas = alojamientos.map(a => {
        const isDone = (a.debe <= 0);
        return `
            <tr class="text-center align-middle" ${isDone ? 'style="background-color: #f0fff4 !important;"' : ''}>
                <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${isDone ? 'disabled' : ''}></td>
                <td>${a.historia}</td>
                <td class="text-start ps-3 small">${currentReportData.protocolos.find(p => p.idProt == idProt)?.investigador || 'N/A'} (ID: ${a.IdUsrA})</td>
                <td>${a.especie}</td>
                <td>${a.caja} ($ ${parseFloat(a.p_caja).toFixed(2)})</td>
                <td class="small">${a.periodo}</td>
                <td class="fw-bold">${a.dias}</td>
                <td class="text-end">$ ${parseFloat(a.total).toFixed(2)}</td>
                <td class="text-end text-success">$ ${parseFloat(a.pagado).toFixed(2)}</td>
                <td class="text-end text-danger fw-bold">$ ${parseFloat(a.debe).toFixed(2)}</td>
            </tr>`;
    }).join('');

    return `
        <div class="mt-4">
            <h6 class="fw-bold text-muted mb-3 uppercase" style="font-size: 10px;"><i class="bi bi-house-door me-2"></i>Detalle de Alojamientos</h6>
            <table class="table table-bordered table-billing mb-0">
                <thead class="table-dark">
                    <tr class="text-center">
                        <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                        <th style="width:8%">Historia</th>
                        <th>Investigador</th> <th style="width:10%">Especie</th>
                        <th style="width:12%">Caja</th>
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
 * EXPORTACIONES
 */
/**
 * Genera una ficha PDF detallada del protocolo seleccionado
 * Versión corregida: Evita hojas en blanco mediante validación de nulos
 */
/**
 * Genera la ficha PDF individual del protocolo
 * Corrección: Blindaje contra recursos faltantes (404) y errores de renderizado
 */
/**
 * Generación Programática de PDF (jsPDF + autoTable)
 * Más robusto, sin errores de renderizado y con control total de tablas.
 */
window.downloadProtocoloPDF = async (idProt) => {
    const prot = currentReportData.protocolos.find(p => p.idProt == idProt);
    if (!prot) return;

    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    // 1. Configuración de Estilo Inicial
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59); // Verde Bioterio
    doc.text(`GROBO - ${inst}`, 105, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("ESTADO DE CUENTA POR PROTOCOLO", 105, 22, { align: "center" });

    // Línea separadora
    doc.setDrawColor(26, 93, 59);
    doc.line(20, 25, 190, 25);

    // 2. Información del Protocolo
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Protocolo: ${prot.tituloA} (N° ${prot.nprotA})`, 20, 35);
    doc.text(`Investigador: ${prot.investigador}`, 20, 41);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 47);

    let currentY = 55;

    // 3. Tabla de Pedidos (Formularios)
    if (prot.formularios && prot.formularios.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("PEDIDOS Y FORMULARIOS", 20, currentY);
        
        const bodyForms = prot.formularios.map(f => [
            f.id,
            f.fecha,
            (f.detalle_display || "").replace(/<\/?[^>]+(>|$)/g, ""),
            (f.cantidad_display || "").replace(/<\/?[^>]+(>|$)/g, ""),
            `$ ${parseFloat(f.total).toFixed(2)}`,
            `$ ${parseFloat(f.debe).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: currentY + 2,
            head: [['ID', 'Fecha', 'Concepto', 'Cant.', 'Total', 'Falta']],
            body: bodyForms,
            theme: 'striped',
            headStyles: { fillColor: [26, 93, 59] },
            styles: { fontSize: 8 },
            columnStyles: { 
                4: { halign: 'right' }, 
                5: { halign: 'right', fontStyle: 'bold', textColor: [200, 0, 0] } 
            }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // 4. Tabla de Alojamientos
    if (prot.alojamientos && prot.alojamientos.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("HISTORIAL DE ALOJAMIENTO", 20, currentY);

        const bodyAloj = prot.alojamientos.map(a => [
            `#${a.historia}`,
            a.especie,
            a.periodo,
            a.dias,
            `$ ${parseFloat(a.total).toFixed(2)}`,
            `$ ${parseFloat(a.debe).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: currentY + 2,
            head: [['Hist', 'Especie', 'Período', 'Días', 'Total', 'Falta']],
            body: bodyAloj,
            theme: 'grid',
            headStyles: { fillColor: [70, 70, 70] },
            styles: { fontSize: 8 },
            columnStyles: { 
                4: { halign: 'right' }, 
                5: { halign: 'right', fontStyle: 'bold', textColor: [200, 0, 0] } 
            }
        });
        currentY = doc.lastAutoTable.finalY + 15;
    }

    // 5. Resumen Financiero Final
    const sumTotal = parseFloat(prot.formularios.reduce((s, f) => s + parseFloat(f.total || 0), 0) + 
                               prot.alojamientos.reduce((s, a) => s + parseFloat(a.total || 0), 0)).toFixed(2);
    
    const sumDebe = parseFloat(prot.deudaAnimales + prot.deudaAlojamiento).toFixed(2);
    const sumPago = (parseFloat(sumTotal) - parseFloat(sumDebe)).toFixed(2);

    // Dibujar cuadro de totales
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(120, currentY, 70, 30, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("TOTAL PROTOCOLO:", 125, currentY + 7);
    doc.text("TOTAL PAGADO:", 125, currentY + 15);
    doc.text("TOTAL FALTA:", 125, currentY + 23);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`$ ${sumTotal}`, 185, currentY + 7, { align: "right" });
    doc.setTextColor(26, 93, 59);
    doc.text(`$ ${sumPago}`, 185, currentY + 15, { align: "right" });
    doc.setTextColor(200, 0, 0);
    doc.text(`$ ${sumDebe}`, 185, currentY + 23, { align: "right" });

    // Guardar archivo
    doc.save(`Ficha_Financiera_${prot.nprotA}.pdf`);
    hideLoader();
};


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
window.procesarPagoProtocolo = (idProt) => { 
    const total = document.getElementById(`total-seleccionado-${idProt}`).innerText;
    if (total === '$ 0.00') { Swal.fire('Atención', 'Seleccione ítems para pagar.', 'info'); return; }
    Swal.fire({ title: '¿Confirmar Pago?', text: `Se liquidará un total de ${total}`, icon: 'question', showCancelButton: true, confirmButtonColor: '#198754' }).then((r) => {
        if (r.isConfirmed) console.log("Procesando pago...");
    });
};

function getInsumosGeneralesTableHTML(insumos) {
    if (!insumos || insumos.length === 0) return '';
    let sumTotal = 0, sumPagado = 0, sumDebe = 0;

    const filas = insumos.map(i => {
        const total = parseFloat(i.total_item || 0), pagado = parseFloat(i.pagado || 0), debe = parseFloat(i.debe || 0);
        sumTotal += total; sumPagado += pagado; sumDebe += debe;
        
        // Formateamos el detalle para que cada insumo aparezca en una línea distinta
        const detalleHTML = i.detalle_completo.split(' | ').map(item => `• ${item}`).join('<br>');

        return `
            <tr class="text-center align-middle" ${(i.is_exento || debe <= 0) ? 'style="background-color: #f0fff4 !important;"' : ''}>
                <td><input type="checkbox" class="check-item-insumo" data-id="${i.id}" data-monto="${debe}" ${debe <= 0 ? 'disabled' : ''}></td>
                <td class="small text-muted">${i.id}</td>
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
                            <th style="width:5%">ID</th><th style="width:15%">Solicitante</th>
                            <th>Conceptos y Cantidades (Agrupados)</th> <th style="width:10%">Total</th><th style="width:10%">Pago</th><th style="width:10%">Falta</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
            <div class="card-footer bg-light py-3 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-5">
                        <div class="text-center"><small class="d-block text-muted uppercase" style="font-size:9px">Total Insumos</small><b class="fs-6">$ ${sumTotal.toFixed(2)}</b></div>
                        <div class="text-center"><small class="d-block text-muted uppercase" style="font-size:9px">Total Pago</small><b class="fs-6 text-success">$ ${sumPagado.toFixed(2)}</b></div>
                        <div class="text-center"><small class="d-block text-muted uppercase" style="font-size:9px">Total Falta</small><b class="fs-6 text-danger">$ ${sumDebe.toFixed(2)}</b></div>
                    </div>
                    <div class="text-end">
                        <span class="fs-4 fw-bold text-primary" id="total-insumos-seleccionados">$ 0.00</span>
                        <button class="btn btn-primary btn-sm fw-bold ms-3" onclick="procesarPagoInsumosGenerales()">Pagar Selección</button>
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

window.downloadInsumosPDF = async () => {
    const insumos = currentReportData.insumosGenerales;
    if (!insumos || insumos.length === 0) return;

    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuración del cuerpo con saltos de línea para los agrupados
    const body = insumos.map(i => [
        i.id,
        i.solicitante,
        i.detalle_completo.split(' | ').join('\n'), // Convierte el separador en salto de línea para el PDF
        `$ ${parseFloat(i.total_item).toFixed(2)}`,
        `$ ${parseFloat(i.debe).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 30,
        head: [['ID', 'Solicitante', 'Detalle de Insumos (Concepto + Cantidad)', 'Total', 'Falta']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [13, 110, 253] },
        styles: { fontSize: 8, overflow: 'linebreak' }, // Importante: linebreak para múltiples ítems
        columnStyles: { 2: { cellWidth: 80 } } 
    });

    doc.save(`Reporte_Insumos_Depto.pdf`);
    hideLoader();
};



/**
 * Genera el reporte PDF Global del Departamento
 * Requiere jsPDF y autoTable cargados en el HTML
 */
window.downloadGlobalPDF = async () => {
    if (!currentReportData) return;
    
    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    // 1. Cabezal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("REPORTE FINANCIERO GLOBAL DEL DEPARTAMENTO", 105, 22, { align: "center" });
    doc.line(20, 25, 190, 25);

    // 2. Resumen Dashboard
    const t = currentReportData.totales;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("RESUMEN DE TOTALES", 20, 35);
    
    doc.autoTable({
        startY: 38,
        head: [['DEUDA TOTAL', 'ANIMALES', 'ALOJAMIENTO', 'INSUMOS', 'PAGADO']],
        body: [[`$ ${t.globalDeuda}`, `$ ${t.deudaAnimales}`, `$ ${t.deudaAlojamiento}`, `$ ${t.deudaInsumos}`, `$ ${t.totalPagado}`]],
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70] },
        styles: { halign: 'center', fontSize: 9 }
    });

    // 3. Tabla Investigadores
    let currentY = doc.lastAutoTable.finalY + 10;
    doc.text("SALDOS POR INVESTIGADOR", 20, currentY);

    const invMap = {}; // Re-agrupamos para el PDF
    currentReportData.insumosGenerales?.forEach(i => {
        if (!invMap[i.IdUsrA]) invMap[i.IdUsrA] = { n: i.solicitante, d: 0, s: i.saldoInv || 0 };
        invMap[i.IdUsrA].d += i.debe;
    });
    currentReportData.protocolos.forEach(p => {
        if (!invMap[p.idUsr]) invMap[p.idUsr] = { n: p.investigador, d: 0, s: p.saldoInv || 0 };
        invMap[p.idUsr].d += (p.deudaAnimales + p.deudaAlojamiento);
    });

    const bodyInv = Object.keys(invMap).map(id => [id, invMap[id].n, `$ ${invMap[id].d.toFixed(2)}`, `$ ${parseFloat(invMap[id].s).toFixed(2)}`]);

    doc.autoTable({
        startY: currentY + 3,
        head: [['ID', 'Investigador', 'Deuda', 'Saldo']],
        body: bodyInv,
        theme: 'striped',
        headStyles: { fillColor: [26, 93, 59] },
        styles: { fontSize: 8 }
    });

    // 4. Detalle Protocolos
    currentY = doc.lastAutoTable.finalY + 12;
    currentReportData.protocolos.forEach(prot => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(9);
        doc.text(`Prot. ${prot.nprotA} - ${prot.investigador}`, 20, currentY);
        
        const items = [
            ...prot.formularios.map(f => ["FORM", f.id, f.detalle_display.replace(/<[^>]*>/g, ""), `$ ${f.total}`, `$ ${f.debe}`]),
            ...prot.alojamientos.map(a => ["ALOJ", a.historia, `Alojamiento ${a.especie}`, `$ ${a.total}`, `$ ${a.debe}`])
        ];

        doc.autoTable({
            startY: currentY + 2,
            head: [['Tipo', 'ID', 'Detalle', 'Total', 'Falta']],
            body: items,
            margin: { left: 25 },
            styles: { fontSize: 7 },
            headStyles: { fillColor: [100, 100, 100] }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    });

    doc.save("Reporte_Global.pdf");
    hideLoader();
};
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
