import { API } from '../../../api.js';

let protocolsList = [];
let speciesData = [];
let dataFull = null;
let currentUserEmail = "No disponible";
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
export async function initAnimalForm() {
    // 1. Usamos el ID correcto (URL o Storage)
    const instId = getContextInstId();
    const userId = localStorage.getItem('userId');
    
    // Referencia al label del título
    const lblInst = document.getElementById('lbl-institution-name');
    
    // Inicialmente ponemos "Cargando..." o el del storage temporalmente para que no se vea vacío
    if(lblInst) lblInst.innerText = localStorage.getItem('NombreInst') || '...';

    window.resetSelection = () => {
        document.getElementById('step-2').classList.add('hidden-section');
        document.getElementById('step-1').classList.remove('hidden-section');
        const form = document.getElementById('animal-form');
        if(form) form.reset();
        document.getElementById('select-subespecie').innerHTML = '<option value="">' + (window.txt?.form_animales?.primero_especie || 'Primero seleccione especie...') + '</option>';
        document.getElementById('select-subespecie').disabled = true;
        document.getElementById('qty-total').value = 0;
    };

    try {
        // 2. Llamamos a la API con el ID correcto
        const resPDF = await API.request(`/animals/pdf-data?inst=${instId}`);
        
        if (resPDF && resPDF.status === 'success') {
            dataFull = resPDF.data;
            setupPDFButton();

            // --- CORRECCIÓN VISUAL ---
            // Actualizamos el nombre con el que vino REALMENTE de la base de datos
            if (dataFull.institucion && dataFull.institucion.NombreInst) {
                if(lblInst) lblInst.innerText = dataFull.institucion.NombreInst;
            }
        }

        const resProt = await API.request(`/animals/search-protocols?inst=${instId}&user=${userId}`);
        if (resProt && resProt.status === 'success') {
            const { config, protocols, user_email, form_types } = resProt.data;
            protocolsList = protocols;
            if(user_email) currentUserEmail = user_email;

            // LLENAR SELECTOR DE TIPOS
            const typeSel = document.getElementById('select-tipo-form');
            if(typeSel) {
                typeSel.innerHTML = '<option value="">' + (window.txt?.form_animales?.seleccione_tipo || 'Seleccione tipo...') + '</option>';
                if (form_types && form_types.length > 0) {
                    form_types.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.IdTipoFormulario;
                        opt.text = t.nombreTipo;
                        typeSel.appendChild(opt);
                    });
                    if (form_types.length === 1) typeSel.selectedIndex = 1;
                } else {
                    typeSel.innerHTML = '<option value="">' + (window.txt?.form_animales?.error_sin_tipos || 'Error: Sin tipos configurados') + '</option>';
                    typeSel.disabled = true;
                }
            }

            setupSearch();
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
    const form = document.getElementById('animal-form');
    if(form) form.onsubmit = handleReview;
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

/* --- MÓDULO PDF (CORREGIDO) --- */
function setupPDFButton() {
    const btn = document.getElementById('btn-tarifario');
    const lbl = document.getElementById('lbl-tarifario-titulo');

    if (!btn) return;

    const titulo = (dataFull && dataFull.institucion && dataFull.institucion.tituloprecios)
        ? dataFull.institucion.tituloprecios
        : 'VER TARIFARIO';

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

window.exportPreciosPDF = async () => {
    try {
        const mod = await import('../../../services/PreciosService.js');
        if (mod.PreciosService && mod.PreciosService.downloadUniversalPDF) {
            await mod.PreciosService.downloadUniversalPDF();
        }
    } catch (e) {
        console.error('Error al abrir tarifario:', e);
    }
};

/* Mantenido por compatibilidad si algo llama exportPreciosPDF; el tarifario completo se abre con PreciosService */

/* --- BÚSQUEDA Y SELECCIÓN --- */
function setupSearch() {
    const input = document.getElementById('protocol-search');
    const list = document.getElementById('protocol-list');
    
    if (!input || !list) return;

    const renderList = (items) => {
        list.innerHTML = '';
        if (!items || items.length === 0) {
            if (protocolsList.length > 0) {
                list.innerHTML = '<div class="list-group-item text-muted small">No se encontraron coincidencias.</div>';
                list.classList.remove('d-none');
            } else {
                list.classList.add('d-none');
            }
            return;
        }

        items.forEach(p => {
            const item = document.createElement('div');
            item.className = "list-group-item list-group-item-action protocol-result-item p-3";
            item.style.cursor = "pointer";
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="fw-bold text-success mb-0">${p.nprotA}</h6>
                        <small class="text-muted text-uppercase">${p.Responsable}</small>
                    </div>
                    <span class="small text-truncate text-end" style="max-width: 200px;">
                        ${p.tituloA}
                    </span>
                </div>`;
            
            item.onmousedown = (e) => { 
                e.preventDefault();
                selectProtocol(p);
                list.classList.add('d-none');
                input.value = '';
            };
            
            list.appendChild(item);
        });
        list.classList.remove('d-none');
    };

    const handleInput = () => {
        const term = input.value.toLowerCase().trim();
        if (term === '') {
            renderList(protocolsList);
            return;
        }
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
        renderList(filtered);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleInput);
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.classList.add('d-none');
        }
    });
}

async function selectProtocol(p) {
    document.getElementById('step-1').classList.add('hidden-section');
    document.getElementById('step-2').classList.remove('hidden-section');
    document.getElementById('selected-prot-id').value = p.idprotA;
    document.getElementById('is-otros-ceuas').value = "0";

    try {
        const res = await API.request(`/animals/protocol-details?id=${p.idprotA}`);
        if (res.status === 'success') {
            const { info, species } = res.data;
            speciesData = species;

            document.getElementById('info-titulo').innerText = info.tituloA;
            document.getElementById('info-nprot').innerText = `Protocolo N° ${info.nprotA}`;
            document.getElementById('info-nprot').className = "badge bg-success";
            document.getElementById('info-investigador').innerText = info.Responsable;
            document.getElementById('info-depto').innerText = info.Depto;

            if (info.FechaFinProtA) {
                const [y, m, d] = info.FechaFinProtA.split('-');
                document.getElementById('info-vencimiento').innerText = `Vence: ${d}/${m}/${y}`;
            } else {
                document.getElementById('info-vencimiento').innerText = 'Sin fecha fin';
            }

            const saldo = parseInt(info.saldo) || 0;
            const usados = parseInt(info.usados) || 0;
            const totalOriginal = saldo + usados;

            document.getElementById('info-saldo').innerText = saldo;
            document.getElementById('info-total-orig').innerText = totalOriginal;

            populateSpeciesSelect();
        }
    } catch (e) { console.error(e); }
}

function populateSpeciesSelect() {
    const sel = document.getElementById('select-especie');
    const subSel = document.getElementById('select-subespecie');
    
    // Obtenemos el nombre dinámicamente si ya cargó dataFull, si no fallback
    const instName = (dataFull && dataFull.institucion) ? dataFull.institucion.NombreInst : 'la institución';

    sel.innerHTML = '<option value="">Seleccione...</option>';
    subSel.innerHTML = '<option value="">Primero seleccione especie...</option>';
    sel.disabled = false;
    subSel.disabled = true;

    if (!speciesData || speciesData.length === 0) {
        sel.innerHTML = `<option value="">Sin especie asignada, hablar con admin ${instName}</option>`;
        sel.classList.add('text-danger', 'fw-bold');
        sel.disabled = true;
        return;
    } else {
        sel.classList.remove('text-danger', 'fw-bold');
    }

    speciesData.forEach(s => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify(s.subs); 
        opt.text = s.name;
        sel.appendChild(opt);
    });

    sel.onchange = (e) => {
        subSel.innerHTML = '<option value="">Seleccione Subespecie...</option>';
        subSel.disabled = true;

        if (e.target.value) {
            const subs = JSON.parse(e.target.value);
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id; 
                opt.text = sub.name;
                subSel.appendChild(opt);
            });
            subSel.disabled = false;
            if (subs.length === 1) {
                subSel.selectedIndex = 1;
                subSel.style.backgroundColor = "#e8f5e9"; 
                setTimeout(() => subSel.style.backgroundColor = "", 500);
            }
        }
    };

    if (speciesData.length === 1) {
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change'));
    }
}

function calculateTotal() {
    const m = parseInt(document.getElementById('qty-macho').value) || 0;
    const f = parseInt(document.getElementById('qty-hembra').value) || 0;
    const i = parseInt(document.getElementById('qty-indistinto').value) || 0;
    
    const totalInput = document.getElementById('qty-total');
    if (totalInput) totalInput.value = m + f + i;
}

async function handleReview(e) {
    e.preventDefault();
    const totalEl = document.getElementById('qty-total');
    const total = totalEl ? parseInt(totalEl.value) : 0;
    
    if (total <= 0) return Swal.fire('Error', 'Debe solicitar al menos 1 animal.', 'warning');

    const typeSel = document.getElementById('select-tipo-form');
    if (!typeSel.value) return Swal.fire('Falta Información', 'Debe seleccionar el Tipo de Solicitud.', 'warning');
    const typeText = typeSel.options[typeSel.selectedIndex].text;

    const isExt = document.getElementById('is-otros-ceuas').value === "1";
    if (!isExt) {
        const saldoEl = document.getElementById('info-saldo');
        const saldo = saldoEl ? parseInt(saldoEl.innerText) : 0;
        if (total > saldo) return Swal.fire('Sin Cupo', `El protocolo solo dispone de ${saldo} animales.`, 'error');
    }

    const fecha = document.getElementById('input-fecha').value;
    const aclaracion = document.getElementById('input-aclaracion').value || 'Sin observaciones.';
    
    const selEspecie = document.getElementById('select-especie');
    const txtEspecie = selEspecie.options[selEspecie.selectedIndex].text;
    const selSub = document.getElementById('select-subespecie');
    const txtSub = selSub.options[selSub.selectedIndex].text;

    const raza = document.getElementById('input-raza').value;
    const peso = document.getElementById('input-peso').value;
    const edad = document.getElementById('input-edad').value;

    const protocoloTxt = document.getElementById('info-nprot').innerText;
    const tituloProt = document.getElementById('info-titulo').innerText;

    const resumenHtml = `
        <div class="text-start bg-light p-3 rounded" style="font-size: 0.9rem;">
            <div class="mb-3 border-bottom pb-2">
                <span class="badge bg-success mb-1">${typeText}</span><br>
                <strong class="text-dark">${protocoloTxt}</strong><br>
                <small class="text-muted d-block text-truncate">${tituloProt}</small>
            </div>
            
            <table class="table table-sm table-bordered mb-2 bg-white small">
                <tbody>
                    <tr><td class="bg-light fw-bold text-muted" width="30%">Especie</td><td>${txtEspecie}</td></tr>
                    <tr><td class="bg-light fw-bold text-muted">Cepa</td><td>${txtSub}</td></tr>
                    <tr><td class="bg-light fw-bold text-muted">Cepa/Línea</td><td>${raza}</td></tr>
                    <tr><td class="bg-light fw-bold text-muted">Peso</td><td>${peso}</td></tr>
                    <tr><td class="bg-light fw-bold text-muted">Edad</td><td>${edad}</td></tr>
                </tbody>
            </table>

            <div class="bg-white p-2 border rounded mb-2 text-center">
                <div class="row g-1">
                    <div class="col-3 border-end"><small class="d-block text-muted" style="font-size:10px">MACHOS</small><b>${document.getElementById('qty-macho').value}</b></div>
                    <div class="col-3 border-end"><small class="d-block text-muted" style="font-size:10px">HEMBRAS</small><b>${document.getElementById('qty-hembra').value}</b></div>
                    <div class="col-3 border-end"><small class="d-block text-muted" style="font-size:10px">INDIST.</small><b>${document.getElementById('qty-indistinto').value}</b></div>
                    <div class="col-3"><small class="d-block text-success" style="font-size:10px">TOTAL</small><b class="text-success fs-6">${total}</b></div>
                </div>
            </div>

            <div class="d-flex justify-content-between border-bottom pb-2 mb-2 small">
                <span>Retiro:</span> <strong>${fecha}</strong>
            </div>
            
            <div class="mb-2 p-2 bg-warning bg-opacity-10 border border-warning rounded">
                <span class="text-muted small fw-bold">Aclaraciones:</span><br>
                <em class="small text-dark">${aclaracion}</em>
            </div>

            <div class="alert alert-success py-2 mt-3 mb-0 small text-center">
                <i class="bi bi-envelope-check me-1"></i> Se enviará copia a su correo:<br>
                <strong class="text-dark">${currentUserEmail}</strong>
            </div>
        </div>
    `;

    const result = await Swal.fire({
        title: 'Confirmar Solicitud',
        html: resumenHtml,
        icon: null,
        width: '600px',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR Y ENVIAR',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: 'Corregir'
    });

    if (result.isConfirmed) submitOrder();
}

async function submitOrder() {
    Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
    
    // Usamos el Helper para asegurar consistencia
    const targetInst = getContextInstId();

    const fd = {
        instId: targetInst,
        userId: localStorage.getItem('userId'),
        
        idTipoFormulario: document.getElementById('select-tipo-form').value,
        idprotA: document.getElementById('selected-prot-id').value,
        is_external: document.getElementById('is-otros-ceuas').value,
        idsubespA: document.getElementById('select-subespecie').value,
        raza: document.getElementById('input-raza').value,
        peso: document.getElementById('input-peso').value,
        edad: document.getElementById('input-edad').value,
        fecha_retiro: document.getElementById('input-fecha').value,
        aclaracion: document.getElementById('input-aclaracion').value,
        macho: document.getElementById('qty-macho').value,
        hembra: document.getElementById('qty-hembra').value,
        indistinto: document.getElementById('qty-indistinto').value,
        total: document.getElementById('qty-total').value
    };

    try {
        const res = await API.request('/animals/create-order', 'POST', fd);
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
    } catch (e) { 
        console.error(e);
        Swal.fire('Error', 'Fallo de conexión con el servidor', 'error'); 
    }
}