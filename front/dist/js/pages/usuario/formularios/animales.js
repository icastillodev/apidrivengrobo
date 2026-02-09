import { API } from '../../../api.js';

let protocolsList = [];
let speciesData = [];
let dataFull = null;
let currentUserEmail = "No disponible"; // Variable global para el email

export async function initAnimalForm() {
    const instId = localStorage.getItem('instId');
    const userId = localStorage.getItem('userId');
    const instName = localStorage.getItem('NombreInst') || 'Institución';

    const lblInst = document.getElementById('lbl-institution-name');
    if(lblInst) lblInst.innerText = instName;
    
    window.confirmOtrosCeuas = () => {
        const modalEl = document.getElementById('modal-otros-ceuas');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
        activateOtherCeuasMode();
    };

    window.resetSelection = () => {
        document.getElementById('step-2').classList.add('hidden-section');
        document.getElementById('step-1').classList.remove('hidden-section');
        const form = document.getElementById('animal-form');
        if(form) form.reset();
        document.getElementById('select-subespecie').innerHTML = '<option value="">Primero seleccione especie...</option>';
        document.getElementById('select-subespecie').disabled = true;
        document.getElementById('qty-total').value = 0;
    };

    try {
        const resPDF = await API.request(`/animals/pdf-data?inst=${instId}`);
        if (resPDF && resPDF.status === 'success') {
            dataFull = resPDF.data;
            setupPDFButton();
        }

        const resProt = await API.request(`/animals/search-protocols?inst=${instId}&user=${userId}`);
        if (resProt && resProt.status === 'success') {
            const { config, protocols, user_email, form_types } = resProt.data;
            protocolsList = protocols;
            if(user_email) currentUserEmail = user_email;

            // 1. LLENAR SELECTOR DE TIPOS (NUEVO)
            const typeSel = document.getElementById('select-tipo-form');
            if(typeSel) {
                typeSel.innerHTML = '<option value="">Seleccione tipo...</option>';
                if (form_types && form_types.length > 0) {
                    form_types.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.IdTipoFormulario;
                        opt.text = t.nombreTipo;
                        typeSel.appendChild(opt);
                    });
                    if (form_types.length === 1) typeSel.selectedIndex = 1;
                } else {
                    typeSel.innerHTML = '<option value="">Error: Sin tipos configurados</option>';
                    typeSel.disabled = true;
                }
            }

            if (config && config.otrosceuas == 1) {
                const btn = document.getElementById('btn-otros-ceuas');
                if(btn) {
                    btn.classList.remove('d-none');
                    btn.onclick = () => new bootstrap.Modal(document.getElementById('modal-otros-ceuas')).show();
                }
            }
            setupSearch();
        }
    } catch (e) { console.error("Error init:", e); }

    document.querySelectorAll('.qty-input').forEach(i => i.addEventListener('input', calculateTotal));
    const form = document.getElementById('animal-form');
    if(form) form.onsubmit = handleReview;
}
/* --- MÓDULO PDF (CORREGIDO) --- */
function setupPDFButton() {
    // Buscamos el elemento correcto del HTML nuevo: id="btn-tarifario"
    const btn = document.getElementById('btn-tarifario');
    const lbl = document.getElementById('lbl-tarifario-titulo');
    
    // Si no existe el botón o no llegaron datos, no hacemos nada (evita el error null)
    if (!btn || !dataFull) return;

    // Título dinámico desde BD
    const titulo = (dataFull.institucion && dataFull.institucion.tituloprecios) 
        ? dataFull.institucion.tituloprecios 
        : 'VER TARIFARIO';
        
    if (lbl) lbl.innerText = titulo;
    
    btn.classList.remove('d-none');
    // NO usamos .href, usamos onclick
    btn.onclick = exportPreciosPDF;
}

// TU FUNCIÓN DE PDF INTEGRADA
window.exportPreciosPDF = () => {
    if (!dataFull) return;

    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
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
};

/* --- BÚSQUEDA Y SELECCIÓN --- */

/* --- BÚSQUEDA Y SELECCIÓN (ACTUALIZADO) --- */

function setupSearch() {
    const input = document.getElementById('protocol-search');
    const list = document.getElementById('protocol-list');
    
    if (!input || !list) return;

    // Función unificada de renderizado
    const renderList = (items) => {
        list.innerHTML = '';
        
        if (!items || items.length === 0) {
            // Mensaje opcional si no hay nada
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
            item.style.cursor = "pointer"; // Asegura cursor de mano
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
            
            // Al hacer click: Seleccionar y cerrar lista
            item.onmousedown = (e) => { 
                e.preventDefault(); // Evita que el 'blur' del input cierre la lista antes de tiempo
                selectProtocol(p);
                list.classList.add('d-none');
                input.value = ''; // Limpiar buscador (opcional)
            };
            
            list.appendChild(item);
        });
        list.classList.remove('d-none');
    };

    // LOGICA PRINCIPAL: Filtrar o Mostrar Todo
    const handleInput = () => {
        const term = input.value.toLowerCase().trim();
        
        // Si está vacío, mostramos TODOS
        if (term === '') {
            renderList(protocolsList);
            return;
        }

        // Si hay texto, filtramos
        const filtered = protocolsList.filter(p => 
            p.nprotA.toLowerCase().includes(term) || 
            p.tituloA.toLowerCase().includes(term) ||
            p.Responsable.toLowerCase().includes(term)
        );
        renderList(filtered);
    };

    // Eventos:
    // 1. Al escribir (input)
    input.addEventListener('input', handleInput);
    
    // 2. Al hacer click/foco (focus) -> Muestra todo si está vacío
    input.addEventListener('focus', handleInput);

    // 3. Cerrar al hacer click fuera
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

            // Datos Básicos
            document.getElementById('info-titulo').innerText = info.tituloA;
            document.getElementById('info-nprot').innerText = `Protocolo N° ${info.nprotA}`;
            document.getElementById('info-nprot').className = "badge bg-success";
            document.getElementById('info-investigador').innerText = info.Responsable;
            document.getElementById('info-depto').innerText = info.Depto;

            // Fecha de Vencimiento
            if (info.FechaFinProtA) {
                const [y, m, d] = info.FechaFinProtA.split('-');
                document.getElementById('info-vencimiento').innerText = `Vence: ${d}/${m}/${y}`;
            } else {
                document.getElementById('info-vencimiento').innerText = 'Sin fecha fin';
            }

            // Matemática de Cupos
            const saldo = parseInt(info.saldo) || 0;
            const usados = parseInt(info.usados) || 0;
            const totalOriginal = saldo + usados;

            document.getElementById('info-saldo').innerText = saldo;
            document.getElementById('info-total-orig').innerText = totalOriginal;

            populateSpeciesSelect();
        }
    } catch (e) { console.error(e); }
}
async function activateOtherCeuasMode() {
    const instId = localStorage.getItem('instId');
    const userName = localStorage.getItem('userName') || 'Usuario'; // Corregido key storage

    document.getElementById('step-1').classList.add('hidden-section');
    document.getElementById('step-2').classList.remove('hidden-section');
    
    document.getElementById('selected-prot-id').value = "";
    document.getElementById('is-otros-ceuas').value = "1";

    document.getElementById('info-vencimiento').innerText = 'Externo';
    document.getElementById('info-total-orig').innerText = "---";
    document.getElementById('info-saldo').innerText = "∞";  


    // Info Card Mock
    document.getElementById('info-titulo').innerText = "SOLICITUD EXTERNA / OTROS CEUAS";
    document.getElementById('info-nprot').innerText = "SIN PROTOCOLO VINCULADO";
    document.getElementById('info-nprot').className = "badge bg-warning text-dark mb-2";
    document.getElementById('info-investigador').innerText = userName;
    document.getElementById('info-depto').innerText = "Responsable Financiero";
    document.getElementById('info-saldo').innerText = "∞";

    try {
        const res = await API.request(`/animals/protocol-details?otros_ceuas=1&inst=${instId}`);
        if (res.status === 'success') {
            speciesData = res.data;
            populateSpeciesSelect();
        }
    } catch (e) { console.error(e); }
}

/* --- LOGICA FORMULARIO --- */
/* --- CASCADA INTELIGENTE Y CÁLCULOS --- */

function populateSpeciesSelect() {
    const sel = document.getElementById('select-especie');
    const subSel = document.getElementById('select-subespecie');
    const instName = localStorage.getItem('NombreInst') || 'la institución';

    // Limpieza inicial
    sel.innerHTML = '<option value="">Seleccione...</option>';
    subSel.innerHTML = '<option value="">Primero seleccione especie...</option>';
    sel.disabled = false;
    subSel.disabled = true;

    // CASO 0: No hay especies asignadas (o todas están Existe=2)
    if (!speciesData || speciesData.length === 0) {
        sel.innerHTML = `<option value="">Sin especie asignada, hablar con admin ${instName}</option>`;
        sel.classList.add('text-danger', 'fw-bold'); // Alerta visual roja
        sel.disabled = true;
        return;
    } else {
        sel.classList.remove('text-danger', 'fw-bold');
    }

    // CASO NORMAL: Llenar el Dropdown
    speciesData.forEach(s => {
        const opt = document.createElement('option');
        // Guardamos todo el array de subespecies en el value para no volver a consultar la API
        // Usamos encodeURIComponent por seguridad si hay caracteres raros, aunque JSON.stringify suele bastar
        opt.value = JSON.stringify(s.subs); 
        opt.text = s.name;
        sel.appendChild(opt);
    });

    // EVENTO DE CAMBIO (Cascada Especie -> Subespecie)
    sel.onchange = (e) => {
        subSel.innerHTML = '<option value="">Seleccione Subespecie...</option>';
        subSel.disabled = true;

        if (e.target.value) {
            const subs = JSON.parse(e.target.value);
            
            subs.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id; // idsubespA
                opt.text = sub.name;
                subSel.appendChild(opt);
            });
            
            subSel.disabled = false;

            // AUTO-SELECT SUBESPECIE (Si es única)
            if (subs.length === 1) {
                subSel.selectedIndex = 1;
                // Efecto visual flash para que note que se seleccionó sola
                subSel.style.backgroundColor = "#e8f5e9"; 
                setTimeout(() => subSel.style.backgroundColor = "", 500);
            }
        }
    };

    // AUTO-SELECT ESPECIE (Si es única)
    if (speciesData.length === 1) {
        sel.selectedIndex = 1;
        // Disparamos el evento manualmente para que se ejecute el onchange de arriba
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

    // VALIDACIÓN TIPO DE FORMULARIO
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
                    <tr><td class="bg-light fw-bold text-muted">Raza/Línea</td><td>${raza}</td></tr>
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
    
    // Obtenemos targetInst de la URL si existe (Selector Multi-Sede)
    const urlParams = new URLSearchParams(window.location.search);
    const targetInst = urlParams.get('targetInst') || localStorage.getItem('instId');

    const fd = {
        instId: targetInst,
        userId: localStorage.getItem('userId'),
        
        // NUEVO CAMPO IMPORTANTE
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
            // Redirección corregida
            window.location.href = '../misformularios.html';
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { 
        console.error(e);
        Swal.fire('Error', 'Fallo de conexión con el servidor', 'error'); 
    }
}