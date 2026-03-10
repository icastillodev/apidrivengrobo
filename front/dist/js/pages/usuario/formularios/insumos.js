import { API } from '../../../api.js';

let deptosList = [];
let catalogInsumos = [];
let selectedItems = []; 
let dataFull = null; // Almacén para el PDF de precios e info institucional
let protocolosList = [];
let protocolHelpConfig = { has_network: false, has_approved_vigent: false };
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
/* --- HELPER: Obtener Institución del Contexto (SEGURO) --- */
function getContextInstId() {
    // 1. Buscamos el ID secreto en la memoria (NO lo borramos aquí porque se usa al enviar)
    let instId = sessionStorage.getItem('target_inst_secreto');
    
    // 2. Si no existe, usamos su sede por defecto.
    if (!instId) {
        instId = localStorage.getItem('instId');
    }
    
    return instId;
}

export async function initInsumosForm() {
    // 1. Usamos el ID correcto
    const instId = getContextInstId();
    const userId = localStorage.getItem('userId');
    
    // Referencia al título (Ponemos el del storage temporalmente)
    const lblInst = document.getElementById('lbl-institution-name');
    if(lblInst) lblInst.innerText = localStorage.getItem('NombreInst') || '...';

    // Resetear formulario
    window.resetSelection = () => {
        document.getElementById('step-2').classList.add('hidden-section');
        document.getElementById('step-1').classList.remove('hidden-section');
        const search = document.getElementById('prot-search');
        if (search) search.value = "";
        const list = document.getElementById('prot-list');
        if (list) list.classList.add('d-none');
        const protInfo = document.getElementById('info-prot');
        const deptInfo = document.getElementById('info-depto');
        if (protInfo) protInfo.innerText = '---';
        if (deptInfo) deptInfo.innerText = '---';
        const hidProt = document.getElementById('selected-prot-id');
        if (hidProt) hidProt.value = "";
        const hidDepto = document.getElementById('selected-depto-id');
        if (hidDepto) hidDepto.value = "";
        selectedItems = [];
    };

    try {
        // 2. Carga de datos con el ID correcto
        const res = await API.request(`/insumos-form/init?inst=${instId}`);
        
        if (res.status === 'success') {
            const data = res.data;
            deptosList = data.departamentos || [];
            catalogInsumos = data.insumos;
            dataFull = data; // Guardamos todo para el PDF

            // --- CORRECCIÓN VISUAL ---
            // Actualizamos el nombre con el que vino de la API (la institución target)
            if (data.institucion && data.institucion.NombreInst) {
                if(lblInst) lblInst.innerText = data.institucion.NombreInst;
            }

            document.getElementById('id-tipo-form').value = data.id_tipo_default;
            
            setupPDFButton();
        }
    } catch (e) { console.error("Error en init:", e); }

    try {
        // Configuración de protocolos e información de ayuda (igual que animales/reactivos)
        const resProt = await API.request(`/animals/search-protocols?inst=${instId}`);
        if (resProt && resProt.status === 'success' && resProt.data) {
            const { config, protocols } = resProt.data;
            protocolosList = Array.isArray(protocols) ? protocols : [];
            protocolHelpConfig.has_approved_vigent = protocolosList.length > 0;
            // otrosceuas viene en config, por si en el futuro se usa
        }

        // Info de red (misma fuente que otros módulos)
        const resConfig = await API.request(`/user/protocols/config?inst=${instId}`);
        if (resConfig && resConfig.status === 'success' && resConfig.data) {
            protocolHelpConfig.has_network = !!resConfig.data.has_network;
        }

        setupProtocolSearch();
        setupProtocolHelpModal();
    } catch (e) {
        console.error("Error cargando protocolos para insumos:", e);
    }

    document.getElementById('btn-add-row').onclick = () => {
        if (selectedItems.length < catalogInsumos.length) {
            selectedItems.push({ idInsumo: "", cantidad: 1 });
            renderRows();
        }
    };

    document.getElementById('insumos-form').onsubmit = handleSubmit;
}

/* --- BÚSQUEDA DE PROTOCOLO --- */
function setupProtocolSearch() {
    const input = document.getElementById('prot-search');
    const list = document.getElementById('prot-list');

    if (!input || !list) return;

    const renderList = (items) => {
        list.innerHTML = '';
        if (!items || items.length === 0) {
            list.classList.add('d-none');
            return;
        }

        items.forEach(p => {
            const item = document.createElement('div');
            item.className = "list-group-item list-group-item-action result-item p-3";
            const numero = p.nprotA ? `#${p.nprotA} - ` : '';
            const titulo = p.tituloA || '';
            const resp = p.ResponsableName || '';
            const depto = p.DeptoFormat || '';

            item.innerHTML = `
                <div class="d-flex flex-column">
                    <div class="fw-bold mb-1">${numero}${titulo}</div>
                    <div class="small text-muted">
                        ${resp ? `<span>${resp}</span>` : ''}
                        ${depto ? `<span class="ms-2">· ${depto}</span>` : ''}
                    </div>
                </div>`;

            item.onclick = () => {
                const step1 = document.getElementById('step-1');
                const step2 = document.getElementById('step-2');
                if (step1 && step2) {
                    step1.classList.add('hidden-section');
                    step2.classList.remove('hidden-section');
                }

                const hidProt = document.getElementById('selected-prot-id');
                if (hidProt) hidProt.value = p.idprotA;

                const infoProt = document.getElementById('info-prot');
                const infoDepto = document.getElementById('info-depto');
                if (infoProt) infoProt.innerText = `${numero}${titulo}`;
                if (infoDepto) infoDepto.innerText = depto || '---';

                selectedItems = [{ idInsumo: "", cantidad: 1 }];
                renderRows();

                list.classList.add('d-none');
            };

            list.appendChild(item);
        });

    list.classList.remove('d-none');
    };

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = protocolosList.filter(p =>
            String(p.nprotA || '').toLowerCase().includes(term) ||
            String(p.tituloA || '').toLowerCase().includes(term) ||
            String(p.ResponsableName || '').toLowerCase().includes(term)
        );
        renderList(filtered);
    });

    input.addEventListener('focus', () => renderList(protocolosList));

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) list.classList.add('d-none');
    });
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

/* --- TABLA DINÁMICA --- */
function renderRows() {
    const container = document.getElementById('insumos-table-body');
    container.innerHTML = '';

    const usedIds = selectedItems.map(si => si.idInsumo).filter(id => id !== "");

    selectedItems.forEach((si, index) => {
        const tr = document.createElement('tr');
        
        let options = `<option value="">-- Seleccionar Insumo --</option>`;
        catalogInsumos.forEach(ins => {
            const isUsed = usedIds.includes(String(ins.idInsumo));
            const isCurrent = String(ins.idInsumo) === String(si.idInsumo);
            
            if (!isUsed || isCurrent) {
                options += `<option value="${ins.idInsumo}" ${isCurrent ? 'selected' : ''}>
                    ${ins.NombreInsumo} (${ins.CantidadInsumo} ${ins.TipoInsumo})
                </option>`;
            }
        });

        tr.innerHTML = `
            <td class="ps-4">
                <select class="form-select border-0 bg-transparent fw-bold row-insumo" data-index="${index}">
                    ${options}
                </select>
            </td>
            <td>
                <div class="input-group input-group-sm justify-content-center">
                    <input type="number" class="form-control text-center fw-bold row-qty" data-index="${index}" min="1" value="${si.cantidad}" style="max-width: 100px;">
                </div>
            </td>
            <td class="pe-4 text-end">
                ${selectedItems.length > 1 ? `
                    <button type="button" class="btn btn-link text-danger p-0" onclick="window.removeRow(${index})">
                        <i class="bi bi-trash"></i>
                    </button>` : ''}
            </td>
        `;
        container.appendChild(tr);
    });

    document.querySelectorAll('.row-insumo').forEach(el => el.onchange = (e) => {
        selectedItems[e.target.dataset.index].idInsumo = e.target.value;
        renderRows(); 
    });
    document.querySelectorAll('.row-qty').forEach(el => el.onchange = (e) => {
        selectedItems[e.target.dataset.index].cantidad = e.target.value;
    });

    const btnAdd = document.getElementById('btn-add-row');
    if (usedIds.length >= catalogInsumos.length) btnAdd.classList.add('d-none');
    else btnAdd.classList.remove('d-none');
}

window.removeRow = (index) => {
    selectedItems.splice(index, 1);
    renderRows();
};

/* --- PDF: mismo tarifario completo que dashboard / animales / reactivos --- */
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

/* --- ENVÍO --- */
async function handleSubmit(e) {
    e.preventDefault();
    const cleanItems = selectedItems.filter(i => i.idInsumo !== "");
    
    const fechaRetiro = document.getElementById('fecha-retiro').value;
    const aclaracion = document.getElementById('aclaracion-pedido').value;
    const idProt = (document.getElementById('selected-prot-id') || {}).value || '';

    if(cleanItems.length === 0) {
        return Swal.fire('Atención', 'Seleccione al menos un insumo válido.', 'warning');
    }
    if(!fechaRetiro) {
        return Swal.fire('Atención', 'Debe indicar una fecha estimada de retiro.', 'warning');
    }
    if(!idProt) {
        const msg = (window.txt?.form_insumos?.seleccione_prot_msg) || 'Debe seleccionar un protocolo para asociar este pedido.';
        return Swal.fire('Atención', msg, 'warning');
    }

    const confirm = await Swal.fire({
        title: '¿Confirmar Pedido?',
        text: `Se enviará una solicitud de ${cleanItems.length} insumo(s).`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'SÍ, ENVIAR',
        confirmButtonColor: '#0d6efd'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
        
        // 3. CAMBIO IMPORTANTE: Usamos el ID correcto para el envío
        const targetInst = getContextInstId();

        const payload = {
            instId: targetInst, // <--- Correcto
            userId: localStorage.getItem('userId'),
            idProt: idProt,
            idDepto: document.getElementById('selected-depto-id')?.value || null,
            idTipoFormulario: document.getElementById('id-tipo-form').value,
            fecRetiroA: fechaRetiro,
            aclaraA: aclaracion,
            items: cleanItems
        };

        try {
            const res = await API.request('/insumos-form/save', 'POST', payload);
            if (res.status === 'success') {
                await Swal.fire('¡Enviado!', `El pedido #${res.id} ha sido registrado.`, 'success');
                window.location.href = `${basePath}paginas/usuario/misformularios.html`;
            } else {
                 Swal.fire('Error', res.message || 'Error desconocido', 'error');
            }
        } catch(err) {
            Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
        }
    }
}