import { API } from '../../../api.js';

let protocolsList = [];
let insumosList = [];
let userEmail = "";
let dataFull = null; // Para el PDF
let protocolHelpConfig = { has_network: false, has_approved_vigent: false };
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

/* --- HELPER: Obtener Institución del Contexto (SEGURO) --- */
function getContextInstId() {
    let instId = sessionStorage.getItem('target_inst_secreto');
    if (!instId) {
        instId = localStorage.getItem('instId');
    }
    return instId;
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

        const resConfig = await API.request(`/user/protocols/config?inst=${instId}`);
        if (resConfig && resConfig.status === 'success' && resConfig.data) {
            protocolHelpConfig.has_network = !!resConfig.data.has_network;
        }
        const resLists = await API.request(`/user/protocols/all-lists?inst=${instId}&uid=${userId}`);
        if (resLists && resLists.status === 'success' && resLists.data && Array.isArray(resLists.data.my)) {
            const today = new Date().toISOString().split('T')[0];
            protocolHelpConfig.has_approved_vigent = resLists.data.my.some(p =>
                p.Aprobado == 1 && (!p.Vencimiento || p.Vencimiento >= today)
            );
        }
        setupProtocolHelpModal();
    } catch (e) { console.error("Error init:", e); }

    document.querySelectorAll('.qty-input').forEach(i => i.addEventListener('input', calculateTotal));
    document.getElementById('reactivos-form').onsubmit = handleReview;
}

function getMisProtocolosUrl(hash = '') {
    const url = `${window.location.origin}${basePath}paginas/usuario/misprotocolos.html`;
    return hash ? `${url}${hash}` : url;
}

function setupProtocolHelpModal() {
    const descEl = document.getElementById('protocol-help-desc');
    const leyendaEl = document.getElementById('protocol-help-leyenda-red');
    const btnVer = document.getElementById('btn-protocol-help-ver');
    const btnSolicitar = document.getElementById('btn-protocol-help-solicitar');
    if (!descEl || !btnVer || !btnSolicitar) return;

    if (protocolHelpConfig.has_network) {
        descEl.innerHTML = '<strong><i class="bi bi-globe me-1"></i> Tu institución forma parte de una red.</strong><br class="mb-1">Podés tener protocolos disponibles aquí de dos formas: <strong>solicitando que un protocolo ya aprobado en otra institución de la red</strong> quede disponible en esta sede, o <strong>creando una nueva solicitud de protocolo</strong> en esta institución. Ambas opciones se gestionan desde Mis Protocolos.';
        if (leyendaEl) {
            if (protocolHelpConfig.has_approved_vigent) {
                leyendaEl.classList.add('d-none');
                leyendaEl.innerHTML = '';
            } else {
                leyendaEl.classList.remove('d-none');
                leyendaEl.innerHTML = '<small class="text-muted"><i class="bi bi-info-circle me-1"></i> <strong>¿Por qué no podés usar la red?</strong> Solo podés solicitar un protocolo en la red si tenés al menos un protocolo <strong>propio aprobado y vigente</strong>. Creá uno nuevo (Solicitar Nuevo Interno) y, una vez aprobado, podrás solicitarlo en otras instituciones de la red desde Mis Protocolos.</small>';
            }
        }
    } else {
        descEl.innerHTML = '<strong>Tu institución no pertenece a una red.</strong><br class="mb-1">Para usar formularios necesitás un protocolo aprobado en esta institución. Creá uno nuevo desde Mis Protocolos o seguí el procedimiento de tu institución para solicitar la aprobación.';
        if (leyendaEl) { leyendaEl.classList.add('d-none'); leyendaEl.innerHTML = ''; }
    }

    btnVer.onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById('modal-protocol-help'))?.hide();
        window.location.href = getMisProtocolosUrl();
    };

    btnSolicitar.onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById('modal-protocol-help'))?.hide();
        if (protocolHelpConfig.has_network && protocolHelpConfig.has_approved_vigent) {
            if (typeof window.Swal !== 'undefined') {
                window.Swal.fire({
                    title: '¿Qué deseas hacer?',
                    html: 'Podés <strong>solicitar tu protocolo ya creado en otra institución de la red</strong> para usarlo aquí, o <strong>crear un nuevo protocolo</strong> en esta institución.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Solicitar en la red',
                    cancelButtonText: 'Crear nuevo protocolo',
                    confirmButtonColor: '#0d6efd',
                    cancelButtonColor: '#1a5d3b'
                }).then((res) => {
                    if (res.isConfirmed) window.location.href = getMisProtocolosUrl('#network');
                    else window.location.href = getMisProtocolosUrl('#new');
                });
            } else {
                window.location.href = getMisProtocolosUrl();
            }
        } else {
            window.location.href = getMisProtocolosUrl('#new');
        }
    };
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
        const filtered = protocolsList.filter(p => {
            const nprot = (p.nprotA || '').toLowerCase();
            const titulo = (p.tituloA || '').toLowerCase();
            const resp = (p.Responsable || '').toLowerCase();
            const idProt = String(p.idprotA || '').toLowerCase();
            const idInv = String(p.IdInvestigador || '').toLowerCase();
            return nprot.includes(term) ||
                   titulo.includes(term) ||
                   resp.includes(term) ||
                   idProt.includes(term) ||
                   idInv.includes(term);
        });
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

/* --- LOGICA PDF (tarifario completo igual que dashboard/animales/insumos) --- */
function setupPDFButton() {
    const btn = document.getElementById('btn-tarifario');
    const lbl = document.getElementById('lbl-tarifario-titulo');
    if (!btn) return;

    const titulo = (dataFull && dataFull.institucion && dataFull.institucion.tituloprecios)
        ? dataFull.institucion.tituloprecios : 'VER TARIFARIO';
    if (lbl) lbl.innerText = titulo;

    btn.classList.remove('d-none');
    btn.onclick = async () => {
        try {
            const mod = await import('../../../services/PreciosService.js');
            if (mod.PreciosService && mod.PreciosService.downloadUniversalPDF) {
                await mod.PreciosService.downloadUniversalPDF();
            }
        } catch (e) {
            console.error('Error al abrir tarifario:', e);
        }
    };
}

window.generateGlobalPDF = async () => {
    try {
        const mod = await import('../../../services/PreciosService.js');
        if (mod.PreciosService && mod.PreciosService.downloadUniversalPDF) {
            await mod.PreciosService.downloadUniversalPDF();
        }
    } catch (e) {
        console.error('Error al abrir tarifario:', e);
    }
};

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
            window.location.href = `${basePath}paginas/usuario/misformularios.html`;
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch(e) { 
        console.error(e);
        Swal.fire('Error', 'Fallo de conexión.', 'error'); 
    }
}