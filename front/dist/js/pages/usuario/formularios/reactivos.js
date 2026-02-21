import { API } from '../../../api.js';

let protocolsList = [];
let insumosList = [];
let userEmail = "";
let dataFull = null; // Para el PDF
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
/* --- HELPER: Obtener Institución del Contexto --- */
function getContextInstId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('targetInst') || localStorage.getItem('instId');
}

export async function initReactivosForm() {
    // 1. Usamos el ID correcto
    const instId = getContextInstId();
    const userId = localStorage.getItem('userId');
    
    // Fallback visual inicial
    const lblInst = document.getElementById('lbl-institution-name');
    if(lblInst) lblInst.innerText = localStorage.getItem('NombreInst') || '...';

    window.resetSelection = () => {
        document.getElementById('step-2').classList.add('hidden-section');
        document.getElementById('step-1').classList.remove('hidden-section');
        document.getElementById('reactivos-form').reset();
        document.getElementById('lbl-medida-disp').innerText = "---"; 
        document.getElementById('qty-total').value = 0;
        document.querySelectorAll('.qty-input').forEach(i => i.value = 0);
    };

    try {
        // 2. Cargar Data para PDF con el ID correcto
        const resPDF = await API.request(`/reactivos/pdf-data?inst=${instId}`);
        if(resPDF.status === 'success') {
            dataFull = resPDF.data;
            setupPDFButton();

            // --- CORRECCIÓN VISUAL ---
            // Actualizamos el nombre con el que vino de la API
            if (dataFull.institucion && dataFull.institucion.NombreInst) {
                if(lblInst) lblInst.innerText = dataFull.institucion.NombreInst;
            }
        }

        // 3. Cargar Datos Iniciales (Protocolos e Insumos) con el ID correcto
        const res = await API.request(`/reactivos/init?inst=${instId}&user=${userId}`);
        if (res.status === 'success') {
            const data = res.data;
            protocolsList = data.protocols;
            insumosList = data.insumos; 
            userEmail = data.user_email;
            
            if(data.id_tipo_default) {
                document.getElementById('id-tipo-form').value = data.id_tipo_default;
            }

            setupSearch();
            setupInsumosDropdown();
        }
    } catch (e) { console.error("Error init:", e); }

    document.querySelectorAll('.qty-input').forEach(i => i.addEventListener('input', calculateTotal));
    document.getElementById('reactivos-form').onsubmit = handleReview;
}

/* --- BÚSQUEDA --- */
function setupSearch() {
    const input = document.getElementById('protocol-search');
    const list = document.getElementById('protocol-list');

    const render = (items) => {
        list.innerHTML = '';
        if (items.length === 0) { list.classList.add('d-none'); return; }
        items.forEach(p => {
            const item = document.createElement('div');
            item.className = "list-group-item list-group-item-action protocol-result-item p-3";
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="fw-bold text-success mb-0">${p.nprotA}</h6>
                        <small class="text-muted text-uppercase">${p.Responsable}</small>
                    </div>
                    <span class="small text-truncate" style="max-width: 200px;">${p.tituloA}</span>
                </div>`;
            item.onclick = () => selectProtocol(p);
            list.appendChild(item);
        });
        list.classList.remove('d-none');
    };

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if(!term) return render(protocolsList); 
        const filtered = protocolsList.filter(p => 
            p.nprotA.toLowerCase().includes(term) || 
            p.tituloA.toLowerCase().includes(term) ||
            p.Responsable.toLowerCase().includes(term)
        );
        render(filtered);
    });

    input.addEventListener('focus', () => render(protocolsList));
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) list.classList.add('d-none');
    });
}

async function selectProtocol(p) {
    document.getElementById('step-1').classList.add('hidden-section');
    document.getElementById('step-2').classList.remove('hidden-section');
    document.getElementById('selected-prot-id').value = p.idprotA;

    try {
        const res = await API.request(`/reactivos/protocol-info?id=${p.idprotA}`);
        if(res.status === 'success') {
            const info = res.data;
            document.getElementById('info-titulo').innerText = info.tituloA;
            document.getElementById('info-nprot').innerText = `N° ${info.nprotA}`;
            document.getElementById('info-investigador').innerText = info.Responsable;
            
            if (info.FechaFinProtA) {
                const [y, m, d] = info.FechaFinProtA.split('-');
                document.getElementById('info-vencimiento').innerText = `Vence: ${d}/${m}/${y}`;
            }
        }
    } catch(e) { console.error(e); }
}

/* --- LOGICA INSUMOS --- */
function setupInsumosDropdown() {
    const sel = document.getElementById('select-insumo');
    const medidaLbl = document.getElementById('lbl-medida-disp');
    
    sel.innerHTML = '<option value="">Seleccione...</option>';

    if(insumosList.length === 0) {
        sel.innerHTML = '<option value="">No habilitado</option>';
        sel.classList.add('text-danger', 'fw-bold');
        sel.disabled = true;
        return;
    }

    insumosList.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.IdInsumoexp;
        
        const cant = i.CantidadInsumo || '';
        const tipo = i.TipoInsumo || '';
        
        opt.text = `${i.NombreInsumo} ${cant} ${tipo}`.trim();
        opt.dataset.medida = `cada ${cant} ${tipo}`.trim();
        sel.appendChild(opt);
    });

    sel.onchange = () => {
        const opt = sel.options[sel.selectedIndex];
        if(opt.value) {
            medidaLbl.innerText = opt.dataset.medida;
        } else {
            medidaLbl.innerText = "---";
        }
    };
}

function calculateTotal() {
    const m = parseInt(document.getElementById('qty-macho').value) || 0;
    const f = parseInt(document.getElementById('qty-hembra').value) || 0;
    const i = parseInt(document.getElementById('qty-indistinto').value) || 0;
    document.getElementById('qty-total').value = m + f + i;
}

/* --- LOGICA PDF (GLOBAL) --- */
function setupPDFButton() {
    const btn = document.getElementById('btn-tarifario');
    const lbl = document.getElementById('lbl-tarifario-titulo');
    if (!btn || !dataFull) return;

    const titulo = (dataFull.institucion && dataFull.institucion.tituloprecios) 
        ? dataFull.institucion.tituloprecios : 'VER TARIFARIO';
    if(lbl) lbl.innerText = titulo;
    
    btn.classList.remove('d-none');
    btn.onclick = generateGlobalPDF;
}

function generateGlobalPDF() {
    if (!dataFull) return;

    // Usamos el nombre real de la institución target
    const inst = (dataFull.institucion && dataFull.institucion.NombreInst) 
                 ? dataFull.institucion.NombreInst.toUpperCase() 
                 : (localStorage.getItem('NombreInst') || 'INSTITUCIÓN');

    const fechaActual = new Date().toLocaleDateString();
    const tituloDoc = (dataFull.institucion && dataFull.institucion.tituloprecios) 
        ? dataFull.institucion.tituloprecios 
        : 'TARIFARIO OFICIAL';

    let animalRows = '';
    
    if (dataFull.especies) {
        dataFull.especies.forEach(e => {
            const pAni = parseFloat(e.Panimal) || 0;
            const pChi = parseFloat(e.PalojamientoChica) || 0;
            const pGra = parseFloat(e.PalojamientoGrande) || 0;

            if (pAni > 0 || pChi > 0 || pGra > 0) {
                animalRows += `
                    <tr style="background-color: #f2f2f2; font-weight: bold;">
                        <td style="padding: 8px; border: 1px solid #ddd;">${e.EspeNombreA}</td>
                        <td style="text-align: center; border: 1px solid #ddd;">${pAni > 0 ? '$ ' + pAni : '---'}</td>
                        <td style="text-align: center; border: 1px solid #ddd;">${pChi > 0 ? '$ ' + pChi : '---'}</td>
                        <td style="text-align: center; border: 1px solid #ddd;">${pGra > 0 ? '$ ' + pGra : '---'}</td>
                    </tr>`;

                if (dataFull.subespecies) {
                    const sub = dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA) && parseFloat(s.Psubanimal) > 0 && String(s.Existe) !== "2");
                    sub.forEach(s => {
                        animalRows += `
                            <tr>
                                <td style="padding: 6px 6px 6px 30px; border: 1px solid #ddd; font-size: 11px;">└ ${s.SubEspeNombreA}</td>
                                <td style="text-align: center; border: 1px solid #ddd; font-size: 11px;">$ ${s.Psubanimal}</td>
                                <td colspan="2" style="border: 1px solid #ddd; background: #fafafa;"></td>
                            </tr>`;
                    });
                }
            }
        });
    }

    const renderInsumoPDF = (lista) => {
        if (!lista) return '';
        return lista.filter(i => parseFloat(i.PrecioInsumo) > 0).map(i => `
        <tr>
            <td style="padding: 6px; border: 1px solid #ddd;">${i.NombreInsumo}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold;">$ ${i.PrecioInsumo}</td>
        </tr>`).join('');
    };

    const template = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; margin-bottom: 20px;">
                <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; text-transform: uppercase;">${tituloDoc}</h4>
                <p style="font-size: 11px; color: #666;">Fecha: ${fechaActual}</p>
            </div>
            <div style="margin-bottom: 10px; font-weight: bold; color: #1a5d3b;">ALOJAMIENTO: CAJA CHICA Y CAJA GRANDE</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
                <thead>
                    <tr style="background: #1a5d3b; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ESPECIE / VARIEDAD</th>
                        <th>PRECIO ANIMAL</th><th>CAJA CHICA</th><th>CAJA GRANDE</th>
                    </tr>
                </thead>
                <tbody>${animalRows}</tbody>
            </table>
            <h4 style="font-size: 14px; color: #0d6efd; border-bottom: 1px solid #eee;">INSUMOS EXPERIMENTALES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Cantidad/Tipo</th><th>Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumosExp)}
            </table>
            <h4 style="font-size: 14px; color: #6c757d; border-bottom: 1px solid #eee;">INSUMOS COMUNES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Cantidad/Tipo</th><th>Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumos)}
            </table>
            <div style="padding: 10px; background: #fff4f4; border: 1px solid #f5c2c2; font-size: 14px;">
                <strong>JORNAL DE TRABAJO EXPERIMENTAL:</strong> 
                <span style="color: #d9534f; font-weight: bold; float: right;">$ ${dataFull.institucion.PrecioJornadaTrabajoExp || 0}</span>
            </div>
        </div>`;

    html2pdf().set({ margin: 10, filename: `Tarifario_${inst}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
}

/* --- SUBMIT --- */
async function handleReview(e) {
    e.preventDefault();
    const cantInsumo = parseInt(document.getElementById('input-cantidad').value);
    const totalAnimales = parseInt(document.getElementById('qty-total').value) || 0;

    if(cantInsumo <= 0) return Swal.fire('Error', 'Ingrese una cantidad válida.', 'warning');

    const sel = document.getElementById('select-insumo');
    const nombreInsumo = sel.options[sel.selectedIndex].text;
    const medida = document.getElementById('lbl-medida-disp').innerText;

    const alertaAnimales = totalAnimales > 0 
        ? `<div class="alert alert-warning py-1 mt-2 mb-0 small"><i class="bi bi-exclamation-triangle"></i> Se descontarán <b>${totalAnimales}</b> animales del protocolo.</div>`
        : `<div class="text-muted small mt-2">No se descontarán animales.</div>`;

    const html = `
        <div class="text-start bg-light p-3 rounded small" style="font-size: 0.9rem;">
            <h6 class="border-bottom pb-2 mb-2 text-success fw-bold">Resumen de Solicitud</h6>
            
            <div class="mb-2">
                <strong>Insumo:</strong><br>
                ${nombreInsumo}
            </div>
            <div class="d-flex justify-content-between mb-2">
                <span>Cantidad a pedir:</span>
                <strong class="fs-5 text-dark">${cantInsumo}</strong>
            </div>
            <div class="text-end text-muted fst-italic mb-2" style="font-size: 0.8rem;">
                (${cantInsumo} unidades de ${medida})
            </div>
            
            <hr class="my-2">
            
            <div class="mb-2">
                <strong>Detalles Muestra:</strong><br>
                Raza: <b>${document.getElementById('input-raza').value || '-'}</b> | 
                Peso: <b>${document.getElementById('input-peso').value || '-'}</b> | 
                Edad: <b>${document.getElementById('input-edad').value || '-'}</b>
            </div>

            ${alertaAnimales}

            <div class="alert alert-success py-1 mt-3 mb-0 small text-center">
                 Copia a: <strong>${userEmail}</strong>
            </div>
        </div>
    `;

    const res = await Swal.fire({
        title: 'Confirmar Pedido',
        html: html,
        showCancelButton: true,
        confirmButtonText: 'ENVIAR PEDIDO',
        confirmButtonColor: '#1a5d3b',
        width: '500px'
    });

    if (res.isConfirmed) submitOrder();
}

async function submitOrder() {
    Swal.fire({ title: 'Enviando...', didOpen: () => Swal.showLoading() });
    
    // 3. Obtenemos el targetInst correcto para el envío
    const targetInst = getContextInstId();

    const fd = {
        instId: targetInst, // <--- Correcto
        userId: localStorage.getItem('userId'),
        
        idTipoFormulario: document.getElementById('id-tipo-form').value,
        idprotA: document.getElementById('selected-prot-id').value,
        
        idInsumoExp: document.getElementById('select-insumo').value,
        cantidad: document.getElementById('input-cantidad').value,
        
        raza: document.getElementById('input-raza').value,
        peso: document.getElementById('input-peso').value,
        edad: document.getElementById('input-edad').value,

        macho: document.getElementById('qty-macho').value,
        hembra: document.getElementById('qty-hembra').value,
        indistinto: document.getElementById('qty-indistinto').value,
        totalAnimales: document.getElementById('qty-total').value,
        
        fecha_retiro: document.getElementById('input-fecha').value,
        aclaracion: document.getElementById('input-aclaracion').value
    };

    try {
        const res = await API.request('/reactivos/create', 'POST', fd);
        if (res.status === 'success') {
            await Swal.fire({
                title: '¡Solicitud Creada!',
                text: `Pedido #${res.id} generado exitosamente.`,
                icon: 'success',
                confirmButtonColor: '#1a5d3b',
                confirmButtonText: 'IR A MIS FORMULARIOS'
            });
            window.location.href = `${basePath}pages/usuario/misformularios.html`;
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch(e) { 
        console.error(e);
        Swal.fire('Error', 'Fallo de conexión.', 'error'); 
    }
}