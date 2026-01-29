import { API } from '../../../api.js';

let protocolsList = [];
let speciesData = []; // Cache para la cascada

export async function initAnimalForm() {
    const instId = localStorage.getItem('instId');
    const userId = localStorage.getItem('userId');

    // 1. Carga Inicial (Config y Protocolos)
    try {
        const res = await API.request(`/animals/search-protocols?inst=${instId}&user=${userId}`);
        if (res.status === 'success') {
            const { config, protocols } = res.data;
            protocolsList = protocols;

            // Configurar Botón PDF Precios
            if (config.tituloprecios) {
                const btnPrecio = document.getElementById('link-precios');
                btnPrecio.href = config.tituloprecios; // Asumimos que es URL completa o path relativo
                btnPrecio.classList.remove('d-none');
            }

            // Configurar Botón Otros CEUAS
            if (config.otrosceuas == 1) {
                const btnOtros = document.getElementById('btn-otros-ceuas');
                btnOtros.classList.remove('d-none');
                btnOtros.onclick = () => selectOtherCeuas();
            }

            setupSearch();
        }
    } catch (e) { console.error("Error init:", e); }

    // 2. Eventos de Cálculo Matemático
    const qtyInputs = document.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
        input.addEventListener('input', calculateTotal);
    });

    // 3. Evento Submit
    document.getElementById('animal-form').onsubmit = handleReview;
}

/* --- BÚSQUEDA Y SELECCIÓN --- */

function setupSearch() {
    const input = document.getElementById('protocol-search');
    const list = document.getElementById('protocol-list');

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        list.innerHTML = '';
        
        if (term.length < 1) { list.classList.add('d-none'); return; }

        const filtered = protocolsList.filter(p => 
            p.nprotA.toLowerCase().includes(term) || 
            p.tituloA.toLowerCase().includes(term) ||
            p.Responsable.toLowerCase().includes(term)
        );

        if (filtered.length === 0) {
            list.classList.add('d-none');
            return;
        }

        filtered.forEach(p => {
            const item = document.createElement('a');
            item.className = "list-group-item list-group-item-action";
            item.style.cursor = "pointer";
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-bold text-success">${p.nprotA}</span>
                        <span class="d-block small text-muted text-truncate" style="max-width: 300px;">${p.tituloA}</span>
                    </div>
                    <span class="badge bg-light text-dark border">${p.Responsable}</span>
                </div>`;
            item.onclick = () => selectProtocol(p);
            list.appendChild(item);
        });

        list.classList.remove('d-none');
    });

    // Cerrar lista al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            list.classList.add('d-none');
        }
    });
}

async function selectProtocol(p) {
    // UI: Ocultar buscador, Mostrar Formulario
    document.getElementById('step-1-protocol').style.display = 'none';
    document.getElementById('step-2-form').classList.remove('hidden-step');
    document.getElementById('step-2-form').classList.add('visible-step');

    // Llenar datos ocultos
    document.getElementById('selected-prot-id').value = p.idprotA;
    document.getElementById('is-otros-ceuas').value = "0";

    // Cargar Detalles del Protocolo (Especies y Cupo)
    try {
        const res = await API.request(`/animals/protocol-details?id=${p.idprotA}`);
        if (res.status === 'success') {
            const { info, species } = res.data;
            speciesData = species; // Guardar para cascada

            // Llenar Info Card
            document.getElementById('info-titulo').innerText = info.tituloA;
            document.getElementById('info-nprot').innerText = `Protocolo N° ${info.nprotA}`;
            document.getElementById('info-investigador').innerText = info.Responsable;
            document.getElementById('info-depto').innerText = info.Depto;
            document.getElementById('info-saldo').innerText = info.saldo;

            populateSpeciesSelect();
        }
    } catch (e) { console.error(e); }
}

async function selectOtherCeuas() {
    const instId = localStorage.getItem('instId');
    const userName = localStorage.getItem('userFull'); // Asumiendo que guardamos nombre en login

    // UI
    document.getElementById('step-1-protocol').style.display = 'none';
    document.getElementById('step-2-form').classList.remove('hidden-step');
    document.getElementById('step-2-form').classList.add('visible-step');

    // Datos Ocultos
    document.getElementById('selected-prot-id').value = ""; // Sin ID
    document.getElementById('is-otros-ceuas').value = "1";

    // Info Card Ficticia
    document.getElementById('info-titulo').innerText = "SOLICITUD EXTERNA / OTROS CEUAS";
    document.getElementById('info-nprot').innerText = "SIN PROTOCOLO VINCULADO";
    document.getElementById('info-nprot').className = "badge bg-warning text-dark";
    document.getElementById('info-investigador').innerText = userName + " (Responsable)";
    document.getElementById('info-depto').innerText = "N/A";
    document.getElementById('info-saldo').innerText = "∞"; // Sin límite técnico

    // Cargar Todas las Especies
    try {
        const res = await API.request(`/animals/protocol-details?otros_ceuas=1&inst=${instId}`);
        if (res.status === 'success') {
            speciesData = res.data; // Viene directo el array de especies
            populateSpeciesSelect();
        }
    } catch (e) { console.error(e); }

    // Alerta visual
    Swal.fire({
        icon: 'info',
        title: 'Modo Otros CEUAS',
        text: 'Usted quedará registrado como responsable administrativo de este pedido.',
        confirmButtonColor: '#ffc107',
        confirmButtonText: 'Entendido'
    });
}

/* --- CASCADA Y CÁLCULOS --- */

function populateSpeciesSelect() {
    const sel = document.getElementById('select-especie');
    sel.innerHTML = '<option value="">Seleccione...</option>';
    sel.disabled = false;

    speciesData.forEach(s => {
        // Asumiendo que structure es: { id, name, subs: [] } o similar según tu modelo
        // En el PHP lo estructure como array values, asi que s es el objeto
        // Accedemos a las llaves 'name' (PHP EspeNombreA) -> Revisa tu modelo PHP
        // En el modelo PHP: $speciesTree[$id]['name']
        
        // Ajuste segun respuesta PHP:
        // El PHP devuelve array de objetos { name: 'Rata', subs: [...] }
        const opt = document.createElement('option');
        opt.value = JSON.stringify(s.subs); // Truco: Guardamos los hijos en el value
        opt.text = s.name;
        sel.appendChild(opt);
    });

    // Auto-select si es única
    if (speciesData.length === 1) {
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change'));
    }

    sel.onchange = (e) => {
        const subSel = document.getElementById('select-subespecie');
        subSel.innerHTML = '<option value="">Seleccione...</option>';
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

            // Auto-select subespecie única
            if (subs.length === 1) {
                subSel.selectedIndex = 1;
            }
        }
    };
}

function calculateTotal() {
    const m = parseInt(document.getElementById('qty-macho').value) || 0;
    const f = parseInt(document.getElementById('qty-hembra').value) || 0;
    const i = parseInt(document.getElementById('qty-indistinto').value) || 0;
    document.getElementById('qty-total').value = m + f + i;
}

/* --- ENVÍO --- */

async function handleReview(e) {
    e.preventDefault();
    const total = parseInt(document.getElementById('qty-total').value);
    
    // Validación Stock (Solo si no es Otros Ceuas)
    const isExternal = document.getElementById('is-otros-ceuas').value === "1";
    if (!isExternal) {
        const saldo = parseInt(document.getElementById('info-saldo').innerText);
        if (total > saldo) {
            return Swal.fire('Error de Cupo', `Solicita ${total} animales pero el protocolo solo dispone de ${saldo}.`, 'error');
        }
    }

    if (total === 0) {
        return Swal.fire('Error', 'La cantidad total debe ser mayor a 0.', 'warning');
    }

    // Datos para el resumen
    const email = localStorage.getItem('userEmail') || 'su correo'; // Asumiendo que guardaste email
    
    const result = await Swal.fire({
        title: 'Revisar Pedido',
        html: `
            <div class="text-start bg-light p-3 rounded small">
                <p><strong>Total Animales:</strong> ${total}</p>
                <p><strong>Fecha Retiro:</strong> ${document.getElementById('input-fecha').value}</p>
                <hr>
                <p class="mb-0 text-muted">Se enviará una copia del pedido a: <b>${email}</b></p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR Y ENVIAR',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: 'Corregir'
    });

    if (result.isConfirmed) {
        submitOrder();
    }
}

async function submitOrder() {
    Swal.fire({ title: 'Enviando...', didOpen: () => Swal.showLoading() });

    const payload = {
        instId: localStorage.getItem('instId'),
        userId: localStorage.getItem('userId'),
        idprotA: document.getElementById('selected-prot-id').value,
        is_external: document.getElementById('is-otros-ceuas').value,
        
        // Datos Form
        idsubespA: document.getElementById('select-subespecie').value,
        raza: document.getElementById('input-raza').value,
        peso: document.getElementById('input-peso').value,
        edad: document.getElementById('input-edad').value,
        fecha_retiro: document.getElementById('input-fecha').value,
        aclaracion: document.getElementById('input-aclaracion').value,
        
        // Cantidades
        macho: document.getElementById('qty-macho').value,
        hembra: document.getElementById('qty-hembra').value,
        indistinto: document.getElementById('qty-indistinto').value,
        total: document.getElementById('qty-total').value
    };

    try {
        const res = await API.request('/animals/create-order', 'POST', payload);
        if (res.status === 'success') {
            await Swal.fire('¡Éxito!', `Pedido #${res.id} generado correctamente.`, 'success');
            window.location.href = '../dashboard.html'; // Volver al dashboard o lista
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Fallo de conexión', 'error');
    }
}