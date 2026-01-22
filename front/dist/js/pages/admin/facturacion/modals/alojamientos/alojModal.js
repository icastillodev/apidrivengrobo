/**
 * MODAL: Gestión Financiera de Alojamiento
 * Ubicación: js/pages/admin/facturacion/Modals/alojamientos/alojModal.js
 */
import { API } from '../../../../../api.js';
import { hideLoader, showLoader } from '../../../../../components/LoaderComponent.js';

/**
 * MODAL: Gestión Financiera de Alojamiento (Versión Blindada)
 * Ubicación: js/pages/admin/facturacion/Modals/alojamientos/alojModal.js
 */
export const openAlojModal = async (historiaId) => {
    try {
        showLoader();

        // 1. Obtener historial técnico
        const resAloj = await API.request(`/alojamiento/history?historia=${historiaId}`);
        
        if (resAloj.status !== 'success' || !resAloj.data.length) {
            hideLoader();
            return Swal.fire('Error', 'No se encontró la estadía.', 'error');
        }

        const history = resAloj.data;
        const first = history[0];

        // --- CLAVE: Pedimos el saldo del Titular del Protocolo ---
        // Usamos IdTitularProtocolo que acabamos de agregar al SQL
        const idPagador = first.IdTitularProtocolo; 

        const resSaldo = await API.request(`/billing/get-investigator-balance/${idPagador}`);
        hideLoader();

        // 3. PROCESAMIENTO FINANCIERO
        const saldoReal = (resSaldo.status === 'success' && resSaldo.data) 
            ? parseFloat(resSaldo.data.SaldoDinero || 0) 
            : 0;

        const { tramos, diasTotales, costoHistoricoTotal } = procesarTramosFinancieros(history);

        // --- SUMA MANUAL DE PAGOS PARA ACTUALIZACIÓN REAL ---
        let totalPagadoHistorico = 0;
        history.forEach(h => {
            totalPagadoHistorico += parseFloat(h.totalpago || 0);
        });

        const esChica = parseFloat(first.totalcajachica) > 0;
        const precioActual = esChica ? first.preciocajachica : first.preciocajagrande;

        // 4. CONSTRUCCIÓN DEL MODAL
        const html = `
        <div class="modal fade" id="modalAlojamiento" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    
                    ${renderHeader(historiaId, saldoReal)}

                    <div class="modal-body p-4 bg-light">
                        <div class="row">
                            <div class="col-lg-7 border-end pe-4">
                                <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Responsabilidades</h6>
                                <div class="row mb-4">
                                    <div class="col-6">
                                        <label class="small text-muted d-block">TITULAR (Paga):</label>
                                        <strong class="text-primary">${first.TitularProtocolo}</strong>
                                    </div>
                                    <div class="col-6">
                                        <label class="small text-muted d-block">RESP. ESTADÍA:</label>
                                        <span class="small">${first.ResponsableTecnico}</span>
                                    </div>
                                </div>
                                ${renderResumenTecnico(first, esChica, precioActual, tramos)}
                            </div>
                            <div class="col-lg-5 ps-lg-4">
                                ${renderGestionCobros(historiaId, diasTotales, costoHistoricoTotal, totalPagadoHistorico)}
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top-0 d-flex justify-content-between p-4">
                        <button class="btn btn-outline-danger btn-sm px-4 fw-bold" onclick="window.descargarFichaAlojPDF(${historiaId})">
                            <i class="bi bi-file-pdf me-2"></i>PDF
                        </button>
                        <button class="btn btn-secondary btn-sm px-4 fw-bold" data-bs-dismiss="modal">CERRAR</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalAlojamiento');

    } catch (e) { 
        console.error("Error en AlojModal:", e); 
        hideLoader(); 
    }
};
// --- SUB-COMPONENTES DE RENDERIZADO ---

function renderHeader(id, saldo) {
    return `
    <div class="modal-header bg-dark text-white py-3">
        <div class="d-flex align-items-center w-100 justify-content-between pe-4">
            <h5 class="modal-title fw-bold"><i class="bi bi-house-door me-2 text-info"></i>ALOJAMIENTO #${id}</h5>
            <div class="text-end">
                <small class="text-white-50 d-block fw-bold uppercase" style="font-size: 10px;">Dinero del Investigador:</small>
                <span class="badge bg-success fs-5" id="mdl-aloj-saldo-txt">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                <input type="hidden" id="mdl-aloj-saldo-val" value="${saldo}">
            </div>
        </div>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
    </div>`;
}

function renderResumenTecnico(first, esChica, precio, tramos) {
    return `
    <h6 class="text-info fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Resumen Técnico</h6>
    <div class="row g-3 mb-4">
        <div class="col-md-6">
            <label class="small fw-bold text-muted uppercase">Investigador</label>
            <div id="pdf-aloj-inv" class="form-control-plaintext border-bottom fw-bold text-primary">${first.Investigador}</div>
        </div>
        <div class="col-md-3 text-center">
            <label class="small fw-bold text-muted uppercase">Tipo Caja</label>
            <div id="pdf-aloj-tipo" class="form-control-plaintext border-bottom fw-bold">${esChica ? 'CHICA' : 'GRANDE'}</div>
        </div>
        <div class="col-md-3 text-center">
            <label class="small fw-bold text-muted text-primary uppercase">Precio Momento</label>
            <div class="form-control-plaintext border-bottom fw-bold text-primary">$ ${parseFloat(precio).toFixed(2)}</div>
        </div>
        <div class="col-12">
            <label class="small fw-bold text-muted uppercase">Protocolo</label>
            <div id="pdf-aloj-prot" class="form-control-plaintext border-bottom small">${first.nprotA}</div>
        </div>
    </div>
    <div class="table-responsive bg-white rounded border shadow-sm">
        <table id="table-aloj-tramos" class="table table-sm table-hover align-middle mb-0 text-center">
            <thead class="bg-light text-muted small uppercase">
                <tr><th>ID</th><th>Desde</th><th>Hasta</th><th>Cajas</th><th>Días</th><th class="text-end pe-2">Subtotal</th></tr>
            </thead>
            <tbody class="small">
                ${tramos.map(t => `
                    <tr>
                        <td class="ps-2 text-start text-muted">#${t.id}</td>
                        <td>${t.desde}</td>
                        <td class="${t.esVigente ? 'text-success fw-bold' : ''}">${t.hasta}</td>
                        <td>${t.cajas}</td>
                        <td class="fw-bold text-info">${t.dias}</td>
                        <td class="text-end pe-2 fw-bold">$ ${t.subtotal.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
}

function renderGestionCobros(historiaId, dias, total, pagado) {
    return `
    <h6 class="text-primary fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Control de Cobros</h6>
    <div class="p-3 bg-white border rounded mb-3 text-center shadow-sm">
        <label class="small fw-bold text-muted d-block uppercase">Días Totales de Estadía</label>
        <span id="pdf-aloj-dias" class="display-6 fw-bold text-info">${dias}</span>
    </div>
    <div class="p-3 bg-white border rounded mb-3 shadow-sm">
        <label class="form-label fw-bold text-primary small uppercase">Costo Total Acumulado</label>
        <div class="input-group input-group-lg">
            <span class="input-group-text">$</span>
            <input type="number" id="mdl-aloj-total" class="form-control fw-bold text-primary fs-4" value="${total.toFixed(2)}" readonly>
            <button class="btn btn-primary" onclick="window.toggleEditTotalAloj(${historiaId})"><i class="bi bi-pencil-fill"></i></button>
        </div>
    </div>
    <div class="p-3 border rounded bg-white shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="fw-bold text-muted small uppercase">TOTAL PAGADO:</span>
            <span class="fs-3 fw-bold text-success" id="mdl-aloj-pagado-txt">$ ${pagado.toFixed(2)}</span>
            <input type="hidden" id="mdl-aloj-pagado-val" value="${pagado}">
        </div>
        <div class="input-group">
            <input type="number" id="mdl-aloj-monto-accion" class="form-control form-control-lg" placeholder="Monto...">
            <button class="btn btn-success fw-bold px-4" onclick="window.ajustarPagoAloj('PAGAR', ${historiaId})">PAGAR</button>
            <button class="btn btn-danger fw-bold px-4" onclick="window.ajustarPagoAloj('QUITAR', ${historiaId})">QUITAR</button>
        </div>
    </div>`;
}

function procesarTramosFinancieros(history) {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    let diasTotales = 0;
    let costoHistoricoTotal = 0;

    const tramos = history.map(h => {
        const pIni = h.fechavisado.split('-');
        const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
        let fFin = !h.hastafecha ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1]-1, h.hastafecha.split('-')[2], 12, 0, 0);
        
        const dias = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
        const esChica = parseFloat(h.totalcajachica) > 0;
        const cant = esChica ? parseInt(h.totalcajachica) : parseInt(h.totalcajagrande);
        const precio = esChica ? parseFloat(h.preciocajachica) : parseFloat(h.preciocajagrande);
        const subtotal = (dias * precio * cant);

        diasTotales += dias;
        costoHistoricoTotal += subtotal;

        return {
            id: h.IdAlojamiento,
            desde: fIni.toLocaleDateString('es-UY'),
            hasta: !h.hastafecha ? 'VIGENTE' : fFin.toLocaleDateString('es-UY'),
            cajas: cant,
            dias: dias,
            subtotal: subtotal,
            esVigente: !h.hastafecha
        };
    });
    return { tramos, diasTotales, costoHistoricoTotal };
}
/**
 * GENERACIÓN DE PDF - ALOJAMIENTO (jsPDF + autoTable)
 */
window.descargarFichaAlojPDF = async (historiaId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    const getTxt = (id) => document.getElementById(id)?.innerText || '---';
    const getVal = (id) => document.getElementById(id)?.value || '0.00';

    const investigador = getTxt('pdf-aloj-inv');
    const tipoCaja = getTxt('pdf-aloj-tipo');
    const protocolo = getTxt('pdf-aloj-prot');
    const totalDias = getTxt('pdf-aloj-dias');
    const costoTotal = getVal('mdl-aloj-total');
    const pagadoTxt = getTxt('mdl-aloj-pagado-txt');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`HISTORIAL DE ALOJAMIENTO #${historiaId}`, 105, 28, { align: "center" });
    doc.line(20, 32, 190, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Investigador: ${investigador}`, 20, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipo de Caja: ${tipoCaja}`, 20, 48);
    doc.text(`Protocolo: ${protocolo}`, 20, 54);
    doc.text(`Días Totales Acumulados: ${totalDias}`, 20, 60);

    const rows = [];
    document.querySelectorAll('#table-aloj-tramos tbody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText, tds[4].innerText, tds[5].innerText]);
    });

    doc.autoTable({
        startY: 68,
        head: [['ID', 'Desde', 'Hasta', 'Cajas', 'Días', 'Subtotal']],
        body: rows,
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        columnStyles: { 0: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, finalY, 170, 22, 'F');
    doc.setFont("helvetica", "bold");
    doc.text(`COSTO TOTAL DE LA HISTORIA: $ ${costoTotal}`, 25, finalY + 8);
    doc.setTextColor(26, 93, 59);
    doc.text(`TOTAL ABONADO A LA FECHA: ${pagadoTxt}`, 25, finalY + 16);

    doc.save(`Ficha_Alojamiento_${historiaId}.pdf`);
};