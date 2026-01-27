/**
 * GESTIÓN DE FACTURACIÓN POR PROTOCOLO - GECKO DEVS 2026
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../../components/MenuComponent.js';
import { renderDashboard } from '../billingDashboard.js'; 
import '../billingPayments.js'; 
import '../Modals/manager.js';  

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
    if (!idProt) return;
    try {
        showLoader();
        const res = await API.request('/billing/protocol-report', 'POST', {
            idProt,
            desde: document.getElementById('f-desde').value,
            hasta: document.getElementById('f-hasta').value
        });
        if (res.status === 'success') {
            window.currentReportData = { protocolos: [res.data] }; // Adaptamos para compartir funciones
            renderizarResultados(res.data);
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

    // Identidad del Protocolo
    headerInfo.innerHTML = `
        <span class="badge bg-success mb-2 uppercase">Protocolo: ${data.info.nprotA}</span>
        <h3 class="fw-bold mb-1">${data.info.tituloA}</h3>
        <p class="text-muted mb-0">Responsable: <b>${data.info.Responsable}</b> | Depto: <b>${data.info.Departamento}</b></p>
    `;

    // Saldo (Billetera PI) - Usamos innerHTML para limpiar duplicados
    const saldo = parseFloat(data.info.SaldoPI || 0);
    const idUsr = data.info.IdUsrA;
    saldoContainer.innerHTML = `
        <div class="d-flex align-items-center gap-3 justify-content-end">
            <div class="text-end">
                <small class="text-muted fw-bold d-block uppercase" style="font-size: 9px;">Billetera de ${data.info.Responsable.split(',')[1]}:</small>
                <span class="badge bg-success fs-5 shadow-sm" id="investigador-saldo-global">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
            </div>
            <div class="input-group input-group-sm" style="width: 200px;">
                <input type="number" id="inp-saldo-${idUsr}" class="form-control" placeholder="Monto...">
                <button class="btn btn-success" onclick="window.updateBalance(${idUsr}, 'add', false)">+</button>
                <button class="btn btn-danger" onclick="window.updateBalance(${idUsr}, 'sub', false)">-</button>
            </div>
        </div>
    `;

    // Llamada al Dashboard específico
    renderDashboardProtocolo(data.totales);

    // Tablas
    container.innerHTML = `
        <div class="card shadow-sm border-0 mb-5">
            <div class="card-body p-3">
                ${getFormsTableHTML(data.formularios, data.info.idprotA)}
                ${data.alojamientos?.length > 0 ? getAlojTableHTML(data.alojamientos, data.info.idprotA) : ''}
            </div>
            ${getFooterHTML(data)}
        </div>`;
    
    vincularEventosSeleccion();
}

function getFormsTableHTML(formularios, idProt) {
    if (!formularios || formularios.length === 0) return '<p class="text-center my-4">No hay pedidos.</p>';
    return `
        <table class="table table-bordered table-billing mb-4">
            <thead class="table-light">
                <tr class="text-center">
                    <th><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                    <th>ID</th><th>INICIO</th><th>RETIRO</th><th>ESPECIE</th><th>DETALLE</th><th>TOTAL</th><th>PAGADO</th><th>DEBE</th>
                </tr>
            </thead>
            <tbody>
                ${formularios.map(f => {
                    const isEx = (f.is_exento == 1 || f.exento == 1);
                    const total = parseFloat(f.total || 0);
                    const pagadoReal = parseFloat(f.pagado || 0);
                    
                    // Lógica contable para Exentos:
                    const pagadoMostrar = isEx ? total : pagadoReal;
                    const debeMostrar = isEx ? 0 : (total - pagadoReal);

                    return `
                        <tr class="text-center align-middle pointer" onclick="if(event.target.type !== 'checkbox') window.abrirEdicionFina('ANIMAL', ${f.id})">
                            <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debeMostrar}" data-id="${f.id}" ${debeMostrar <= 0 ? 'disabled' : ''}></td>
                            <td class="fw-bold">#${f.id} ${isEx ? '<br><span class="badge bg-info text-dark" style="font-size:7px">EXENTO</span>' : ''}</td>
                            <td>${f.fecha || '---'}</td>
                            <td class="text-danger fw-bold">${f.fecRetiroA || '---'}</td>
                            <td class="small">${f.nombre_especie}</td>
                            <td class="text-start small">${f.detalle_display.replace(/<[^>]*>/g, "")}</td>
                            <td class="text-end">$ ${total.toFixed(2)}</td>
                            <td class="text-end text-success fw-bold">$ ${pagadoMostrar.toFixed(2)}</td>
                            <td class="text-end text-danger fw-bold">$ ${debeMostrar.toFixed(2)}</td>
                        </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

function getAlojTableHTML(alojamientos, idProt) {
    return `
        <h6 class="fw-bold text-muted mb-2 small uppercase">Alojamientos</h6>
        <table class="table table-bordered table-billing mb-0">
            <thead class="table-dark text-center">
                <tr>
                    <th><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                    <th>HISTORIA</th><th>ESPECIE</th><th>PERIODO</th><th>TOTAL</th><th>PAGADO</th><th>DEBE</th>
                </tr>
            </thead>
            <tbody>
                ${alojamientos.map(a => `
                    <tr class="text-center align-middle pointer" onclick="window.abrirEdicionFina('ALOJ', ${a.historia})">
                        <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${a.debe <= 0 ? 'disabled' : ''}></td>
                        <td>#${a.historia}</td><td>${a.especie}</td><td class="small">${a.periodo}</td>
                        <td class="text-end">$ ${parseFloat(a.total).toFixed(2)}</td>
                        <td class="text-end text-success">$ ${parseFloat(a.pagado).toFixed(2)}</td>
                        <td class="text-end text-danger fw-bold">$ ${parseFloat(a.debe).toFixed(2)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

function getFooterHTML(data) {
    const p = data.info;
    return `
        <div class="card-footer bg-white border-top py-3 d-flex justify-content-between align-items-center">
            <button class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocoloPDF(${p.idprotA})">PDF FICHA</button>
            <div class="text-end">
                <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">Seleccionado para liquidar:</small>
                <span class="fs-4 fw-bold text-primary" id="pago-seleccionado-${p.idprotA}">$ 0.00</span>
                <button class="btn btn-primary fw-bold ms-3 px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${p.idprotA})">PAGAR SELECCIÓN</button>
            </div>
        </div>`;
}

function vincularEventosSeleccion() {
    document.addEventListener('change', (e) => {
        if (!e.target.dataset.prot) return;
        const idProt = e.target.dataset.prot;
        if (e.target.classList.contains('check-all-form')) document.querySelectorAll(`.check-item-form[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = e.target.checked);
        if (e.target.classList.contains('check-all-aloj')) document.querySelectorAll(`.check-item-aloj[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = e.target.checked);
        let suma = 0;
        document.querySelectorAll(`input[data-prot="${idProt}"]:checked:not([class*="check-all"])`).forEach(chk => suma += parseFloat(chk.dataset.monto || 0));
        document.getElementById(`pago-seleccionado-${idProt}`).innerText = `$ ${suma.toLocaleString('es-UY', {minimumFractionDigits: 2})}`;
    });
}

function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-prot')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-prot';
    style.innerHTML = `.pointer { cursor: pointer; } .table-billing tr:hover td { background-color: #f0f7ff !important; }`;
    document.head.appendChild(style);
}

function renderDashboardProtocolo(totales) {
    // Referencias a los IDs del HTML
    const ids = {
        global: 'total-deuda-global',
        animales: 'total-deuda-animales',
        reactivos: 'total-deuda-reactivos',
        alojamiento: 'total-deuda-alojamiento',
        pagado: 'total-pagado'
    };

    // Formateador de moneda
    const f = (n) => `$ ${parseFloat(n || 0).toLocaleString('es-UY', {minimumFractionDigits: 2})}`;

    // Actualizamos solo si el elemento existe en el HTML
    if (document.getElementById(ids.global)) document.getElementById(ids.global).innerText = f(totales.deudaTotal);
    if (document.getElementById(ids.animales)) document.getElementById(ids.animales).innerText = f(totales.deudaAnimales);
    if (document.getElementById(ids.reactivos)) document.getElementById(ids.reactivos).innerText = f(totales.deudaReactivos);
    if (document.getElementById(ids.alojamiento)) document.getElementById(ids.alojamiento).innerText = f(totales.deudaAlojamiento);
    if (document.getElementById(ids.pagado)) document.getElementById(ids.pagado).innerText = f(totales.totalPagado);
}


/**
 * 4. GENERACIÓN DE PDF - FICHA DE PROTOCOLO
 * CORRECCIÓN: Acceso correcto a la estructura de datos envuelta
 */
window.downloadProtocoloPDF = async (idProt) => {
    // 1. Validaciones de seguridad
    if (!window.currentReportData || !window.currentReportData.protocolos || window.currentReportData.protocolos.length === 0) {
        return Swal.fire('Aviso', 'Primero debe realizar una consulta para exportar los datos.', 'info');
    }

    // 2. Extraemos el protocolo del array (siempre es el primero en esta vista)
    const data = window.currentReportData.protocolos[0];
    const info = data.info;
    const totales = data.totales;

    // Verificación extra por si la API no devolvió info
    if (!info) {
        console.error("Data.info está indefinido:", data);
        return Swal.fire('Error', 'No se encontró la información del cabezal del protocolo.', 'error');
    }

    showLoader();

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const verdeGecko = [25, 135, 84];

        // --- ENCABEZADO ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]);
        doc.text(`GROBO - ${inst}`, 105, 15, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text("ESTADO DE CUENTA DETALLADO POR PROTOCOLO", 105, 22, { align: "center" });
        doc.setDrawColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]);
        doc.line(20, 25, 190, 25);

        // --- INFO DEL RESPONSABLE Y PROTOCOLO ---
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`PROTOCOLO:`, 20, 35);
        doc.setFont("helvetica", "normal");
        doc.text(`${info.tituloA} (${info.nprotA})`, 50, 35);

        doc.setFont("helvetica", "bold");
        doc.text(`RESPONSABLE:`, 20, 41);
        doc.setFont("helvetica", "normal");
        doc.text(`${info.Responsable} (ID: ${info.IdUsrA})`, 50, 41);

        doc.setFont("helvetica", "bold");
        doc.text(`DEPARTAMENTO:`, 20, 47);
        doc.setFont("helvetica", "normal");
        doc.text(`${info.Departamento}`, 50, 47);

        doc.setFont("helvetica", "bold");
        doc.text(`FECHA REPORTE:`, 20, 53);
        doc.setFont("helvetica", "normal");
        doc.text(`${new Date().toLocaleString()}`, 50, 53);

        let currentY = 60;

        // --- TABLA DE PEDIDOS (ANIMALES Y REACTIVOS) ---
        if (data.formularios?.length > 0) {
            const bodyForms = data.formularios.map(f => {
                const isEx = (f.is_exento == 1 || f.exento == 1);
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                
                return [
                    isEx ? `#${f.id} (EX)` : `#${f.id}`,
                    f.nombre_especie,
                    f.detalle_display.replace(/<[^>]*>/g, ""),
                    `$ ${total.toFixed(2)}`,
                    `$ ${isEx ? total.toFixed(2) : pagadoReal.toFixed(2)}`,
                    `$ ${isEx ? '0.00' : (total - pagadoReal).toFixed(2)}`
                ];
            });

            doc.autoTable({
                startY: currentY,
                head: [['ID', 'Especie', 'Concepto', 'Total', 'Pagado', 'Debe']],
                body: bodyForms,
                theme: 'grid',
                headStyles: { fillColor: verdeGecko },
                styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        // --- TABLA DE ALOJAMIENTOS ---
        if (data.alojamientos?.length > 0) {
            const bodyAloj = data.alojamientos.map(a => [
                `H-${a.historia}`,
                a.especie,
                `Alojamiento: ${a.periodo}`,
                `$ ${parseFloat(a.total).toFixed(2)}`,
                `$ ${parseFloat(a.pagado).toFixed(2)}`,
                `$ ${parseFloat(a.debe).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: currentY,
                head: [['Hist.', 'Especie', 'Periodo Alojamiento', 'Total', 'Pagado', 'Debe']],
                body: bodyAloj,
                theme: 'grid',
                headStyles: { fillColor: [40, 40, 40] },
                styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        // --- CUADRO DE RESUMEN FINAL ---
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(120, currentY, 70, 25, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("SUBTOTAL PROTOCOLO:", 125, currentY + 7);
        doc.text("TOTAL PAGADO (+EX):", 125, currentY + 13);
        doc.text("DEUDA PENDIENTE:", 125, currentY + 19);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        // El total es la suma de lo que debe + lo que ya pagó
        doc.text(`$ ${(totales.deudaTotal + totales.totalPagado).toFixed(2)}`, 185, currentY + 7, { align: "right" });
        doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]);
        doc.text(`$ ${totales.totalPagado.toFixed(2)}`, 185, currentY + 13, { align: "right" });
        doc.setTextColor(200, 0, 0);
        doc.text(`$ ${totales.deudaTotal.toFixed(2)}`, 185, currentY + 19, { align: "right" });

        doc.save(`Ficha_Financiera_Prot_${info.nprotA}.pdf`);

    } catch (e) {
        console.error("Error generando PDF:", e);
        Swal.fire('Error', 'No se pudo generar el documento PDF.', 'error');
    } finally {
        hideLoader();
    }
};