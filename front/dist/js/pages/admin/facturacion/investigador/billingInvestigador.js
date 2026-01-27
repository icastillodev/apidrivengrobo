/**
 * GESTIÓN DE FACTURACIÓN POR INVESTIGADOR - GECKO DEVS 2026
 * Módulo independiente para manejo de deudas por Titular de Protocolo.
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../../components/MenuComponent.js';
import { renderDashboard } from '../billingDashboard.js'; 
import '../billingPayments.js'; 
import '../Modals/manager.js';  

window.currentReportData = null;

/**
 * 1. INICIALIZACIÓN DE LA PÁGINA
 */
export async function initBillingInvestigador() {
    try {
        aplicarEstilosTablas();
        showLoader();
        await refreshMenuNotifications();
        
        // Fechas por defecto: mes actual
        const hoy = new Date();
        const fDesde = document.getElementById('f-desde');
        const fHasta = document.getElementById('f-hasta');
        if (fDesde && fHasta) {
            fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
            fHasta.value = hoy.toISOString().split('T')[0];
        }

        await cargarListaInvestigadores();
    } catch (error) { 
        console.error("Error en init:", error); 
    } finally { 
        hideLoader(); 
    }
}

/**
 * 2. CARGA DE SELECTOR DE INVESTIGADORES
 */
// Variable global para guardar los investigadores
window.investigadoresCache = [];

async function cargarListaInvestigadores() {
    const instId = localStorage.getItem('instId') || 1;
    try {
        const res = await API.request(`/users/list-investigators?inst=${instId}`);
        if (res.status === 'success' && res.data) {
            window.investigadoresCache = res.data; // Guardamos copia
            renderizarOpcionesInvestigador(res.data);
            vincularFiltroRealTime(); // Activamos el buscador
        }
    } catch (e) { console.error("Error cargando investigadores:", e); }
}

/**
 * Función que dibuja las opciones (con el formato solicitado)
 */
function renderizarOpcionesInvestigador(lista) {
    const select = document.getElementById('sel-investigador');
    if (!select) return;

    let html = '<option value="">-- SELECCIONAR INVESTIGADOR --</option>';
    html += lista.map(u => {
        // Formato: Apellido Nombre (ID: [id])
        return `<option value="${u.IdUsrA}">${u.ApellidoA} ${u.NombreA} (ID: ${u.IdUsrA})</option>`;
    }).join('');

    select.innerHTML = html;
}

/**
 * Lógica del buscador en tiempo real
 */
function vincularFiltroRealTime() {
    const inputBusqueda = document.getElementById('busqueda-investigador');
    if (!inputBusqueda) return;

    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        
        // Filtramos en el cache por Nombre, Apellido o ID
        const filtrados = window.investigadoresCache.filter(u => {
            const nombreCompleto = `${u.ApellidoA} ${u.NombreA}`.toLowerCase();
            const id = u.IdUsrA.toString();
            return nombreCompleto.includes(termino) || id.includes(termino);
        });

        renderizarOpcionesInvestigador(filtrados);
    });
}

/**
 * 3. BUSCADOR PRINCIPAL
 */
window.cargarFacturacionInvestigador = async () => {
    const idUsr = document.getElementById('sel-investigador').value;
    const desde = document.getElementById('f-desde').value;
    const hasta = document.getElementById('f-hasta').value;
    const chkAni = document.getElementById('chk-animales').checked;
    const chkIns = document.getElementById('chk-insumos').checked;

    if (!idUsr) return Swal.fire('Atención', 'Seleccione un investigador de la lista.', 'warning');

    try {
        showLoader();
        const res = await API.request('/billing/investigador-report', 'POST', { 
            idUsr, desde, hasta, chkAni, chkIns 
        });

        if (res.status === 'success') {
            window.currentReportData = res.data; 
            renderizarResultados(res.data);
        } else { 
            Swal.fire('Error', res.message, 'error'); 
        }
    } catch (error) { 
        console.error("Error en búsqueda:", error); 
    } finally { 
        hideLoader(); 
    }
};

/**
 * REEMPLAZAR EN billingInvestigador.js
 * Actualiza la interfaz con el Nombre (ID) y el Dashboard
 */
function renderizarResultados(data) {
    const container = document.getElementById('billing-results');
    const dashboardArea = document.getElementById('dashboard-area');
    const saldoContainer = document.getElementById('contenedor-saldo-maestro');
    const tituloInvestigador = document.getElementById('dashboard-investigador-titulo'); // <--- Nuevo selector
    
    dashboardArea.classList.remove('d-none');

    // 1. Inyectar Identidad en el Dashboard
    if (tituloInvestigador && data.perfil) {
        // Formato solicitado: Investigador: nombre apellido (id)
        tituloInvestigador.innerHTML = `
            <i class="bi bi-person-check-fill text-primary me-2"></i>
            Investigador: <span class="text-primary">${data.perfil.NombreCompleto}</span> 
            <span class="text-muted" style="font-size: 0.8em;">(ID: ${data.perfil.IdUsrA})</span>
        `;
    }

    // 2. Renderizar Saldo Maestro (sin duplicados)
    const saldo = parseFloat(data.perfil?.SaldoDinero || 0);
    const idUsr = data.perfil?.IdUsrA;

    if (saldoContainer) {
        saldoContainer.innerHTML = `
            <div class="d-flex align-items-center gap-3 justify-content-end mb-4">
                <div class="text-end">
                    <small class="text-muted fw-bold d-block uppercase" style="font-size: 9px;">Saldo en Billetera:</small>
                    <span class="badge bg-success fs-5 shadow-sm" id="investigador-saldo-global">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="input-group input-group-sm shadow-sm" style="width: 210px;">
                    <input type="number" id="inp-saldo-${idUsr}" class="form-control border-primary" placeholder="Monto...">
                    <button class="btn btn-success" onclick="window.updateBalance(${idUsr}, 'add', false)"><i class="bi bi-plus-lg"></i></button>
                    <button class="btn btn-danger" onclick="window.updateBalance(${idUsr}, 'sub', false)"><i class="bi bi-dash-lg"></i></button>
                </div>
            </div>
        `;
    }

    // 3. Renderizar las tarjetas de totales
    renderDashboard(data);

    // 4. Generar el HTML de las tablas (Protocolos e Insumos)
    let html = '';
    const showIns = document.getElementById('chk-insumos').checked;
    const showAni = document.getElementById('chk-animales').checked;

    if (showIns && data.insumosGenerales?.length > 0) {
        html += getInsumosGeneralesTableHTML(data.insumosGenerales);
    }

    data.protocolos.forEach(prot => {
        if (showAni) {
            html += `
                <div class="card shadow-sm border-0 mb-5 card-protocolo" id="card-prot-${prot.idProt}">
                    <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-primary mb-1 uppercase" style="font-size: 9px;">Protocolo: ${prot.nprotA}</span>
                            <h5 class="fw-bold m-0 text-dark">${prot.tituloA}</h5>
                        </div>
                    </div>
                    <div class="card-body p-3">
                        ${getFormsTableHTML(prot.formularios, prot.idProt)}
                        ${prot.alojamientos?.length > 0 ? getAlojTableHTML(prot.alojamientos, prot.idProt) : ''}
                    </div>
                    ${getFooterHTML(prot)}
                </div>`;
        }
    });

    container.innerHTML = html || '<div class="alert alert-light text-center py-5 shadow-sm">No se encontraron movimientos.</div>';
    
    // Vinculamos los eventos de checkbox y buscador real-time
    vincularEventosSeleccion();
}
/**
 * 5. TABLA DE FORMULARIOS (ANIMALES Y REACTIVOS)
 */
function getFormsTableHTML(formularios, idProt) {
    if (!formularios || formularios.length === 0) return '';
    return `
        <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">Pedidos de Protocolo (Formularios)</h6>
        <div class="table-responsive">
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:2%"><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                        <th style="width:7%">ID</th>
                        <th style="width:10%">INICIO</th>
                        <th style="width:10%">RETIRO</th>
                        <th style="width:12%">ESPECIE</th>
                        <th>CONCEPTO</th>
                        <th style="width:15%">CANTIDAD</th>
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
                        const espDisplay = f.nombre_especie + (f.nombre_subespecie && f.nombre_subespecie !== 'N/A' ? `:${f.nombre_subespecie}` : '');
                        
                        return `
                            <tr class="text-center align-middle pointer" onclick="if(event.target.type !== 'checkbox') window.abrirEdicionFina('${isRea ? 'REACTIVO' : 'ANIMAL'}', ${f.id})">
                                <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debe}" data-id="${f.id}" ${(debe <= 0 || isExento) ? 'disabled' : ''}></td>
                                <td class="fw-bold">#${f.id} ${isExento ? '<br><span class="badge bg-info text-dark" style="font-size:7px">EXENTO</span>' : ''}</td>
                                <td class="small">${f.fecha || '---'}</td>
                                <td class="small text-danger fw-bold">${f.fecRetiroA || '---'}</td>
                                <td class="small text-secondary">${espDisplay}</td>
                                <td class="text-start small">${f.detalle_display.replace(/<[^>]*>/g, "")}</td>
                                <td class="small">${isRea ? f.NombreInsumo : f.cant_animal + ' un.'}</td>
                                <td class="text-end">$ ${total.toFixed(2)}</td>
                                <td class="text-end text-success fw-bold">$ ${pagado.toFixed(2)}</td>
                                <td class="text-end text-danger fw-bold">$ ${debe.toFixed(2)}</td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}
/**
 * 6. TABLA DE ALOJAMIENTOS
 */
function getAlojTableHTML(alojamientos, idProt) {
    return `
        <div class="mt-2 border-top pt-3">
            <h6 class="fw-bold text-muted mb-3 uppercase" style="font-size: 10px;">Detalle de Alojamientos</h6>
            <table class="table table-bordered table-billing mb-0">
                <thead class="table-dark text-center">
                    <tr>
                        <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                        <th>HISTORIA</th><th>ESPECIE</th><th>PERIODO</th><th>DÍAS</th><th>TOTAL</th><th>PAGADO</th><th>DEBE</th>
                    </tr>
                </thead>
                <tbody>
                    ${alojamientos.map(a => `
                        <tr onclick="window.abrirEdicionFina('ALOJ', ${a.historia})" class="text-center align-middle pointer">
                            <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${a.debe <= 0 ? 'disabled' : ''}></td>
                            <td>#${a.historia}</td><td>${a.especie}</td><td class="small">${a.periodo}</td>
                            <td class="fw-bold">${a.dias}</td>
                            <td class="text-end">$ ${parseFloat(a.total).toFixed(2)}</td>
                            <td class="text-end text-success fw-bold">$ ${parseFloat(a.pagado || 0).toFixed(2)}</td>
                            <td class="text-end text-danger fw-bold">$ ${parseFloat(a.debe).toFixed(2)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

/**
 * 7. TABLA DE INSUMOS GENERALES
 */
function getInsumosGeneralesTableHTML(insumos) {
    return `
        <div class="card shadow-sm border-0 mb-5" style="border-left: 5px solid #0d6efd !important;">
            <div class="card-header bg-white py-3 d-flex justify-content-between">
                <h5 class="m-0 text-primary fw-bold"><i class="bi bi-box-seam me-2"></i>Insumos y Suministros (Directos)</h5>
            </div>
            <div class="table-responsive">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" id="check-all-insumos-gen"></th>
                            <th style="width:8%">ID</th>
                            <th>Conceptos Agrupados</th> 
                            <th style="width:10%">Total</th>
                            <th style="width:10%">Pagado</th>
                            <th style="width:10%">Falta</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insumos.map(i => `
                            <tr class="text-center align-middle pointer" onclick="if(event.target.type !== 'checkbox') window.abrirEdicionFina('INSUMO', ${i.id})">
                                <td><input type="checkbox" class="check-item-insumo" data-id="${i.id}" data-monto="${i.debe}" ${i.debe <= 0 ? 'disabled' : ''}></td>
                                <td class="small text-muted">#${i.id}</td>
                                <td class="text-start ps-3 small">${i.detalle_completo.split('|').join('<br>• ')}</td>
                                <td class="text-end">$ ${parseFloat(i.total_item).toFixed(2)}</td>
                                <td class="text-end text-success fw-bold">$ ${parseFloat(i.pagado || 0).toFixed(2)}</td>
                                <td class="text-end text-danger fw-bold">$ ${parseFloat(i.debe).toFixed(2)}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div class="card-footer bg-light py-3 text-end">
                <span class="fs-5 fw-bold text-primary me-3" id="total-insumos-seleccionados">$ 0.00</span>
                <button class="btn btn-primary fw-bold px-4" onclick="window.procesarPagoInsumosGenerales()">Pagar Selección</button>
            </div>
        </div>`;
}

/**
 * 8. FOOTER DE PROTOCOLO (PAGOS MASIVOS)
 */
function getFooterHTML(prot) {
    // 1. Cálculos de Subtotales
    const totAni = (prot.formularios || [])
        .filter(f => !f.categoria?.toLowerCase().includes('reactivo'))
        .reduce((s, f) => s + parseFloat(f.total || 0), 0);
    
    const totRea = (prot.formularios || [])
        .filter(f => f.categoria?.toLowerCase().includes('reactivo'))
        .reduce((s, f) => s + parseFloat(f.total || 0), 0);
        
    const totAlo = (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0);
    
    const sumTotal = (totAni + totRea + totAlo).toFixed(2);
    const sumDebe = (parseFloat(prot.deudaAnimales || 0) + parseFloat(prot.deudaReactivos || 0) + parseFloat(prot.deudaAlojamiento || 0)).toFixed(2);
    const sumPago = (parseFloat(sumTotal) - parseFloat(sumDebe)).toFixed(2);

    return `
        <div class="card-footer bg-white border-top py-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-4">
                    <button class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocoloPDF(${prot.idProt})">
                        <i class="bi bi-file-earmark-pdf me-1"></i>ESTADO DE CUENTA
                    </button>
                    
                    <div class="d-flex gap-3 border-start ps-4">
                        <div class="small text-muted">Total: <b>$ ${sumTotal}</b></div>
                        <div class="small text-muted">Alojamiento: <b>$ ${totAlo.toFixed(2)}</b></div>
                        <div class="small text-muted">Animales: <b>$ ${totAni.toFixed(2)}</b></div>
                        <div class="small text-muted">Reactivos: <b>$ ${totRea.toFixed(2)}</b></div>
                        <div class="small text-success border-start ps-3">Pagado: <b>$ ${sumPago}</b></div>
                        <div class="small text-danger border-start ps-3">Falta: <b>$ ${sumDebe}</b></div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <div class="text-end me-2">
                        <small class="text-muted d-block uppercase fw-bold" style="font-size: 9px;">Seleccionado para pagar:</small>
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
 * 9. GESTIÓN DE SELECCIÓN
 */
function vincularEventosSeleccion() {
    // Checkboxes de Protocolos
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

    // Checkboxes de Insumos
    const masterIns = document.getElementById('check-all-insumos-gen');
    if (masterIns) {
        masterIns.addEventListener('change', (e) => {
            document.querySelectorAll('.check-item-insumo:not(:disabled)').forEach(c => c.checked = e.target.checked);
            actualizarSumaInsumos();
        });
    }
    document.querySelectorAll('.check-item-insumo').forEach(c => c.addEventListener('change', actualizarSumaInsumos));
}

function actualizarSuma(idProt) {
    let suma = 0;
    document.querySelectorAll(`input[data-prot="${idProt}"]:checked:not([class*="check-all"])`).forEach(chk => {
        suma += parseFloat(chk.dataset.monto || 0);
    });
    const visor = document.getElementById(`pago-seleccionado-${idProt}`);
    if (visor) visor.innerText = `$ ${suma.toLocaleString('es-UY', {minimumFractionDigits: 2})}`;
}

function actualizarSumaInsumos() {
    let suma = 0;
    document.querySelectorAll('.check-item-insumo:checked').forEach(chk => suma += parseFloat(chk.dataset.monto || 0));
    const visor = document.getElementById('total-insumos-seleccionados');
    if (visor) visor.innerText = `$ ${suma.toFixed(2)}`;
}

function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-inv')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-inv';
    style.innerHTML = `
        .pointer { cursor: pointer; } 
        .table-billing tr:hover td { background-color: #f0f7ff !important; transition: 0.2s; }
        .table-billing thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; }
        .tabla-finanzas tbody td { font-size: 11px; }
    `;
    document.head.appendChild(style);
}

window.abrirAyudaBilling = () => { new bootstrap.Modal(document.getElementById('modal-billing-help')).show(); };


/**
 * 10. GENERACIÓN DE PDF GLOBAL DEL INVESTIGADOR (Reporte Individual Completo)
 * Corregido: Encabezado con Nombre del Investigador y Columna Pagado
 */
window.downloadGlobalPDF = async () => {
    if (!window.currentReportData) return Swal.fire('Aviso', 'No hay datos cargados.', 'info');
    
    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const invNombre = window.currentReportData.perfil?.NombreCompleto || 'INVESTIGADOR';
    const azulGecko = [13, 110, 253];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(azulGecko[0], azulGecko[1], azulGecko[2]);
    doc.text("ESTADO DE CUENTA INTEGRAL", 148, 15, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`INVESTIGADOR: ${invNombre.toUpperCase()}`, 148, 22, { align: "center" });
    doc.line(15, 25, 282, 25);

    const t = window.currentReportData.totales;
    doc.autoTable({
        startY: 30,
        head: [['DEUDA ANIMALES', 'DEUDA REACTIVOS', 'DEUDA ALOJAMIENTO', 'DEUDA INSUMOS', 'TOTAL PAGADO (+EX)', 'DEUDA TOTAL']],
        body: [[
            `$ ${t.deudaAnimales.toFixed(2)}`, `$ ${t.deudaReactivos.toFixed(2)}`, 
            `$ ${t.deudaAlojamiento.toFixed(2)}`, `$ ${t.deudaInsumos.toFixed(2)}`, 
            `$ ${t.totalPagado.toFixed(2)}`,
            { content: `$ ${t.globalDeuda.toFixed(2)}`, styles: { textColor: [180, 0, 0], fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { halign: 'center' }
    });

    let currentY = doc.lastAutoTable.finalY + 10;

    window.currentReportData.protocolos.forEach((prot) => {
        if (currentY > 160) { doc.addPage(); currentY = 20; }

        doc.setFillColor(245, 245, 245);
        doc.rect(15, currentY, 267, 8, 'F');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`PROT: ${prot.nprotA} - ${prot.tituloA}`, 18, currentY + 6);
        
        // Mapeo de items con lógica de EXENTO
        const bodyItems = [
            ...(prot.formularios || []).map(f => {
                const isEx = (f.is_exento == 1 || f.exento == 1);
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                // Si es exento, mostramos el total como pagado
                const pagadoMostrar = isEx ? total : pagadoReal;
                const debeMostrar = isEx ? 0 : (total - pagadoReal);

                return [
                    isEx ? `${f.id} (EX)` : f.id,
                    f.fecha,
                    f.nombre_especie,
                    f.detalle_display.replace(/<[^>]*>/g, ""),
                    `$ ${total.toFixed(2)}`,
                    `$ ${pagadoMostrar.toFixed(2)}`,
                    `$ ${debeMostrar.toFixed(2)}`
                ];
            }),
            ...(prot.alojamientos || []).map(a => [
                a.historia, a.periodo, a.especie, 'Alojamiento', 
                `$ ${parseFloat(a.total).toFixed(2)}`, 
                `$ ${parseFloat(a.pagado || 0).toFixed(2)}`, 
                `$ ${parseFloat(a.debe).toFixed(2)}`
            ])
        ];

        doc.autoTable({
            startY: currentY + 8,
            head: [['ID', 'Fecha', 'Especie', 'Detalle', 'Total', 'Pagado', 'Debe']],
            body: bodyItems,
            theme: 'striped',
            headStyles: { fillColor: azulGecko },
            styles: { fontSize: 7 },
            columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
        });

        // Totales del protocolo (El exento suma en pPago)
        const pTotal = (prot.formularios || []).reduce((s, f) => s + parseFloat(f.total || 0), 0) + (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0);
        const pDebe = parseFloat(prot.deudaAnimales || 0) + parseFloat(prot.deudaReactivos || 0) + parseFloat(prot.deudaAlojamiento || 0);
        const pPago = pTotal - pDebe;

        currentY = doc.lastAutoTable.finalY;
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(`SUBTOTAL PROTOCOLO:`, 215, currentY + 5, { align: "right" });
        doc.text(`$ ${pTotal.toFixed(2)}`, 238, currentY + 5, { align: "right" });
        doc.text(`$ ${pPago.toFixed(2)}`, 260, currentY + 5, { align: "right" });
        doc.setTextColor(200, 0, 0);
        doc.text(`$ ${pDebe.toFixed(2)}`, 282, currentY + 5, { align: "right" });

        currentY += 15;
    });

    doc.save(`Reporte_Integral_${invNombre.replace(/ /g, '_')}.pdf`);
    hideLoader();
};
/**
 * 11. FICHA PDF INDIVIDUAL POR PROTOCOLO (Botón en cada tarjeta)
 * Corregido: Inclusión de columna PAGADO y alineación
 */
window.downloadProtocoloPDF = async (idProt) => {
    if (!window.currentReportData) return;
    const prot = window.currentReportData.protocolos.find(p => p.idProt == idProt);
    if (!prot) return;

    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(); 
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const invNombre = window.currentReportData.perfil?.NombreCompleto || 'INVESTIGADOR';

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 15, { align: "center" });

    doc.setFontSize(11); doc.setTextColor(100);
    doc.text("ESTADO DE CUENTA INDIVIDUAL POR PROTOCOLO", 105, 22, { align: "center" });
    doc.line(20, 25, 190, 25);

    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(`Protocolo: ${prot.tituloA}`, 20, 35);
    doc.text(`Investigador: ${invNombre}`, 20, 41);

    const bodyAll = [
        ...(prot.formularios || []).map(f => {
            const isEx = (f.is_exento == 1 || f.exento == 1);
            const total = parseFloat(f.total || 0);
            return [
                isEx ? `${f.id} (EX)` : f.id,
                f.nombre_especie,
                f.detalle_display.replace(/<[^>]*>/g, ""),
                `$ ${total.toFixed(2)}`,
                `$ ${isEx ? total.toFixed(2) : parseFloat(f.pagado || 0).toFixed(2)}`,
                `$ ${isEx ? '0.00' : parseFloat(f.debe).toFixed(2)}`
            ];
        }),
        ...(prot.alojamientos || []).map(a => [`H-${a.historia}`, a.especie, 'Alojamiento', `$ ${parseFloat(a.total).toFixed(2)}`, `$ ${parseFloat(a.pagado || 0).toFixed(2)}`, `$ ${parseFloat(a.debe).toFixed(2)}`]),
    ];

    doc.autoTable({
        startY: 55,
        head: [['ID', 'Especie', 'Concepto', 'Total', 'Pagado', 'Debe']],
        body: bodyAll,
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] },
        styles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
    });

    const pTotal = (prot.formularios || []).reduce((s, f) => s + parseFloat(f.total || 0), 0) + (prot.alojamientos || []).reduce((s, a) => s + parseFloat(a.total || 0), 0);
    const pDebe = parseFloat(prot.deudaAnimales || 0) + parseFloat(prot.deudaReactivos || 0) + parseFloat(prot.deudaAlojamiento || 0);
    const pPago = pTotal - pDebe;

    let currentY = doc.lastAutoTable.finalY + 10;
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(120, currentY, 70, 25, 'FD');

    doc.setFontSize(9); doc.setTextColor(100);
    doc.text("SUBTOTAL PROTOCOLO:", 125, currentY + 7);
    doc.text("TOTAL PAGADO (+EX):", 125, currentY + 13);
    doc.text("DEUDA PENDIENTE:", 125, currentY + 19);

    doc.setFont("helvetica", "bold"); doc.setTextColor(0);
    doc.text(`$ ${pTotal.toFixed(2)}`, 185, currentY + 7, { align: "right" });
    doc.setTextColor(26, 93, 59);
    doc.text(`$ ${pPago.toFixed(2)}`, 185, currentY + 13, { align: "right" });
    doc.setTextColor(200, 0, 0);
    doc.text(`$ ${pDebe.toFixed(2)}`, 185, currentY + 19, { align: "right" });

    doc.save(`Ficha_Protocolo_${prot.nprotA}.pdf`);
    hideLoader();
};