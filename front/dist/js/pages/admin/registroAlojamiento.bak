// ***************************************************
// MÓDULO: REGISTRO DE ALOJAMIENTOS (Paso a Paso)
// ***************************************************
// Responsabilidad: Gestionar el flujo de creación de nuevas historias.
// Arquitectura: Modular / API-Driven.

import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

// Variables de módulo (Caché local)
let protocolsCache = [];
let usersList = []; // <--- ESTA FALTABA DECLARAR
let pricesCache = []; // Para las especies y precios en el siguiente paso
let selectedSpeciesData = null;

// ***************************************************
// 1. APERTURA Y CARGA INICIAL
// ***************************************************

/**
 * Abre el modal y carga los datos desde la BD (usuarioe + personae)
 */
window.openModalRegistro = async () => {
    const instId = localStorage.getItem('instId');
    const step2 = document.getElementById('step-details');
    
    if (step2) step2.classList.add('d-none');
    
    showLoader();
    try {
        // Ejecutamos las peticiones en paralelo para mayor velocidad
        const [resProt, resUsr, resPrices] = await Promise.all([
            API.request(`/protocolos/search-alojamiento?inst=${instId}`),
            API.request(`/users/institution?inst=${instId}`), // Aquí vienen los datos de personae
            API.request(`/precios/all-data`)
        ]);

        if (resProt.status === 'success') protocolsCache = resProt.data || [];
        if (resUsr.status === 'success') usersList = resUsr.data || []; // Guardamos los investigadores
        if (resPrices.status === 'success') pricesCache = resPrices.data.animales || [];

        renderFilteredProtocols(''); 
    } catch (e) {
        console.error("Error cargando datos iniciales:", e);
    }
    hideLoader();

    inicializarFechaAlojamiento(); // <--- Llamar aquí
    
    const modalEl = document.getElementById('modal-registro');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
};

// ***************************************************
// 2. LÓGICA DE BÚSQUEDA Y RENDERIZADO
// ***************************************************

/**
 * Filtra el caché de protocolos y actualiza el dropdown.
 * @param {string} term - Término de búsqueda (ID, N° o Título)
 */
const renderFilteredProtocols = (term) => {
    const t = (term || '').toLowerCase().trim();
    const select = document.getElementById('reg-select-prot');
    if (!select) return;

    // Filtramos con blindaje contra nulos (|| '')
    const filtered = protocolsCache.filter(p => {
        const nprot = (p.nprotA || '').toLowerCase();
        const titulo = (p.tituloA || '').toLowerCase();
        const id = (p.idprotA || '').toString();
        
        return nprot.includes(t) || titulo.includes(t) || id.includes(t);
    });

    // Construimos las opciones del select
    if (filtered.length > 0) {
        select.innerHTML = filtered.map(p => {
            const label = `[${p.nprotA || 'S/N'}] ${p.tituloA || 'Sin Título'}`;
            return `<option value="${p.idprotA}">#${p.idprotA} | ${label}</option>`;
        }).join('');
    } else {
        select.innerHTML = '<option value="" disabled>No se encontraron resultados...</option>';
    }

    // Listener para cuando el usuario efectivamente elige uno
    select.onchange = (e) => handleProtocolSelection(e.target.value);
};

/**
 * Maneja la lógica cuando se selecciona un protocolo.
 * Muestra el siguiente paso y carga los datos dependientes.
 */
async function handleProtocolSelection(idProt) {
    if (!idProt) return;

    // Mostramos el contenedor de detalles
    const step2 = document.getElementById('step-details');
    if (step2) step2.classList.remove('d-none');

    // Cargamos la lista inicial de usuarios sin filtro
    renderFilteredUsers(''); 
    
    // El siguiente paso será cargar las especies específicas de este protocolo
    await cargarEspeciesDelProtocolo(idProt);
}
// ***************************************************
// 3. LISTENERS DE INTERFAZ
// ***************************************************

// Asignamos el evento de búsqueda al input del modal
document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'reg-search-prot') {
        renderFilteredProtocols(e.target.value);
    }
});

// ***************************************************
// 2. LÓGICA DE USUARIOS (RESPONSABLES)
// ***************************************************

const renderFilteredUsers = (term) => {
    const t = (term || '').toLowerCase().trim();
    const select = document.getElementById('reg-select-usr');
    if (!select) return;

    // Filtramos usando NombreA y ApellidoA de personae
    const filtered = usersList.filter(u => {
        const nombre = (u.NombreA || '').toLowerCase();
        const apellido = (u.ApellidoA || '').toLowerCase();
        const id = (u.IdUsrA || '').toString();
        return nombre.includes(t) || apellido.includes(t) || id.includes(t);
    });

    select.innerHTML = '<option value="">-- Seleccionar Responsable --</option>' + 
        filtered.map(u => {
            const display = `${(u.ApellidoA || '').toUpperCase()}, ${u.NombreA || ''}`;
            return `<option value="${u.IdUsrA}">ID:${u.IdUsrA} - ${display}</option>`;
        }).join('');
};



// ***************************************************
// 3. LISTENERS DE INTERFAZ (ACTUALIZADO)
// ***************************************************

document.addEventListener('input', (e) => {
    // Buscador de Protocolos (Paso 1)
    if (e.target && e.target.id === 'reg-search-prot') {
        renderFilteredProtocols(e.target.value);
    }
    
    // Buscador de Usuarios (Paso 2)
    if (e.target && e.target.id === 'reg-search-usr') {
        renderFilteredUsers(e.target.value);
    }
});
/**
 * 3. LÓGICA DE ESPECIES
 * Obtiene los IDs de protesper y los cruza con los nombres de especiee
 */
async function cargarEspeciesDelProtocolo(idProt) {
    const container = document.getElementById('container-especie');
    if (!container) return;

    try {
        const res = await API.request(`/protocols/current-species?id=${idProt}`);
        const especiesDetalladas = res.data; // Ahora recibimos [ {idespA: 1, EspeNombreA: 'Ratón', ...}, ... ]

        if (!especiesDetalladas || especiesDetalladas.length === 0) {
            container.innerHTML = '<span class="text-danger small fw-bold">No hay especies aprobadas en este protocolo.</span>';
            return;
        }

        if (especiesDetalladas.length === 1) {
            const esp = especiesDetalladas[0];
            container.innerHTML = `
                <input type="text" class="form-control form-control-sm bg-light fw-bold" value="${esp.EspeNombreA}" readonly>
                <input type="hidden" id="reg-select-esp" value="${esp.idespA}">`;
            
            // Pasamos directamente el objeto de la especie para validar cajas
            validarCajasConDatos(esp);
        } else {
            container.innerHTML = `
                <select id="reg-select-esp" class="form-select form-select-sm shadow-sm">
                    <option value="">-- Seleccionar Especie --</option>
                    ${especiesDetalladas.map(e => `<option value="${e.idespA}">${e.EspeNombreA}</option>`).join('')}
                </select>`;
            
            document.getElementById('reg-select-esp').onchange = (e) => {
                const seleccionada = especiesDetalladas.find(esp => esp.idespA == e.target.value);
                validarCajasConDatos(seleccionada);
            };
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

// MODIFICAR: Función que valida las cajas
function validarCajasConDatos(info) {
    const container = document.getElementById('container-caja');
    if (!container || !info) return;

    // GUARDAMOS LOS DATOS: Así registrarAlojamientoFinal siempre los tendrá a mano
    selectedSpeciesData = info; 

    const tieneChica = parseFloat(info.PalojamientoChica) > 0;
    const tieneGrande = parseFloat(info.PalojamientoGrande) > 0;

    if (tieneChica && tieneGrande) {
        container.innerHTML = `
            <select id="reg-tipo-caja" class="form-select form-select-sm shadow-sm">
                <option value="chica">Caja Chica ($${info.PalojamientoChica})</option>
                <option value="grande">Caja Grande ($${info.PalojamientoGrande})</option>
            </select>`;
    } else if (tieneChica || tieneGrande) {
        const tipo = tieneChica ? 'chica' : 'grande';
        const precio = tieneChica ? info.PalojamientoChica : info.PalojamientoGrande;
        container.innerHTML = `
            <input type="text" class="form-control form-control-sm bg-light fw-bold" value="Caja ${tipo.toUpperCase()} ($${precio})" readonly>
            <input type="hidden" id="reg-tipo-caja" value="${tipo}">`;
    }
}

/**
 * Configura la fecha por defecto (hoy) y establece el límite 
 * de máximo 2 días hacia adelante.
 */
const inicializarFechaAlojamiento = () => {
    const inputFecha = document.getElementById('reg-fecha-ini');
    if (!inputFecha) return;

    const hoy = new Date();
    // Ajuste de zona horaria para que no cambie la fecha al convertir a ISO
    const offset = hoy.getTimezoneOffset() * 60000;
    const localHoy = new Date(hoy.getTime() - offset);
    
    // Seteamos el valor por defecto
    inputFecha.value = localHoy.toISOString().split("T")[0];

    // Calculamos el máximo (Hoy + 2 días)
    const maxDate = new Date();
    maxDate.setDate(hoy.getDate() + 2);
    const localMax = new Date(maxDate.getTime() - offset);
    inputFecha.max = localMax.toISOString().split("T")[0];
};

// ***************************************************
// REGISTRO DE ALOJAMIENTO - LÓGICA DE PRECIOS E HISTORIA
// ***************************************************

// registroAlojamiento.js
window.registrarAlojamientoFinal = async () => {
    if (!selectedSpeciesData) {
        return Swal.fire('Error', 'No se han seleccionado datos de la especie.', 'error');
    }

    const instId = localStorage.getItem('instId');
    const idProt = document.getElementById('reg-select-prot').value;
    const idUsr = document.getElementById('reg-select-usr').value;
    const tipoCaja = document.getElementById('reg-tipo-caja').value;
    const cantidad = parseInt(document.getElementById('reg-cant-cajas').value) || 0;
    const fechaIni = document.getElementById('reg-fecha-ini').value;
    const obs = document.getElementById('reg-observaciones').value;

    showLoader();
    try {
        // 1. CÁLCULO DE HISTORIA CORRELATIVA (Consultando la realidad actual de la BD)
        const resAloj = await API.request(`/alojamiento/list?inst=${instId}`);
        const alojamientosExistentes = resAloj.data || [];
        const maxHist = alojamientosExistentes.reduce((max, a) => Math.max(max, parseInt(a.historia || 0)), 0);
        const nuevaHistoria = maxHist + 1;

        // 2. PRECIO APLICADO SEGÚN TIPO DE CAJA SELECCIONADO
        const precioUnitario = tipoCaja === 'chica' 
            ? parseFloat(selectedSpeciesData.PalojamientoChica) 
            : parseFloat(selectedSpeciesData.PalojamientoGrande);

        if (!idProt || !idUsr || cantidad <= 0) {
            hideLoader();
            return Swal.fire('Atención', 'Por favor, complete los campos obligatorios.', 'warning');
        }

        // 3. MODAL DE CONFIRMACIÓN CON RESUMEN TÉCNICO
        hideLoader();
        const { isConfirmed } = await Swal.fire({
            title: `Nueva Historia #${nuevaHistoria}`,
            html: `
                <div class="text-start small bg-light p-3 border rounded shadow-sm">
                    <p class="mb-1"><strong>Investigador:</strong> ${document.getElementById('reg-select-usr').selectedOptions[0].text}</p>
                    <p class="mb-1"><strong>Especie:</strong> ${selectedSpeciesData.EspeNombreA}</p>
                    <p class="mb-1"><strong>Caja:</strong> ${tipoCaja.toUpperCase()} ($${precioUnitario} c/u)</p>
                    <p class="mb-1"><strong>Total Diario:</strong> $${(cantidad * precioUnitario).toFixed(2)}</p>
                    <hr>
                    <p class="mb-0 text-center fw-bold text-success">¿Confirmar alta de este alojamiento?</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR REGISTRO',
            confirmButtonColor: '#1a5d3b'
        });

        if (isConfirmed) {
            showLoader();
            const payload = {
                idprotA: idProt,
                IdUsrA: idUsr,
                idespA: selectedSpeciesData.idespA,
                fechavisado: fechaIni,
                totalcajachica: tipoCaja === 'chica' ? cantidad : 0,
                totalcajagrande: tipoCaja === 'grande' ? cantidad : 0,
                // Registramos los precios capturados del tarifario en este momento
                preciocajachica: parseFloat(selectedSpeciesData.PalojamientoChica),
                preciocajagrande: parseFloat(selectedSpeciesData.PalojamientoGrande),
                observaciones: obs,
                IdInstitucion: instId,
                historia: nuevaHistoria, // El nuevo ID correlativo
                is_update: false
            };

            const res = await API.request('/alojamiento/save', 'POST', payload);
            if (res.status === 'success') {
                Swal.fire('Éxito', `Alojamiento #${nuevaHistoria} creado correctamente.`, 'success')
                    .then(() => location.reload());
            }
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo procesar el registro en el servidor.', 'error');
    } finally {
        hideLoader();
    }
};