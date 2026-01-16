// ***************************************************
// GESTIÓN DE ALOJAMIENTOS - MÓDULO MAESTRO
// ***************************************************
// Arquitectura: API-Driven (Vanilla JS / Tailwind)
// Responsabilidad: Control de estadía animal, cronología y costos.

// dist/js/pages/admin/alojamientos.js
import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
// AGREGAR ESTA LÍNEA
import { refreshMenuNotifications } from '../../components/MenuComponent.js';

let dataFull = [];
let currentHistoryData = [];

// ***************************************************
// 1. INICIALIZACIÓN DE LA PÁGINA
// ***************************************************
export async function initAlojamientosPage() {
    // Configuración inicial de filtros y listeners
    const filterEstado = document.getElementById('filter-estado');
    if (filterEstado) filterEstado.value = "0";

    setupProtocolSearch();
    setupInvestigadorSearch();
    setupFechaLimite();
    
    await loadAlojamientos();
}

async function loadAlojamientos() {
    const instId = localStorage.getItem('instId');
    try {
        showLoader();
        const res = await API.request(`/alojamiento/list?inst=${instId}`);
        if (res.status === 'success') {
            dataFull = res.data;
            renderAlojamientosTable();
            // ACTUALIZAR NOTIFICACIONES AQUÍ
            refreshMenuNotifications(); 
        }
    } catch (e) {
        console.error("Error cargando alojamientos:", e);
    } finally {
        hideLoader();
    }
}

// ***************************************************
// 2. RENDERIZADO DE TABLA PRINCIPAL
// ***************************************************
window.renderAlojamientosTable = () => {
    const term = document.getElementById('search-alojamiento').value.toLowerCase().trim();
    const estadoFiltro = document.getElementById('filter-estado').value; 
    const tbody = document.getElementById('tbody-alojamientos');

    if (!tbody) return;
    tbody.innerHTML = '';

    const registrosFiltrados = dataFull.filter(a => {
        const matchesSearch = a.nprotA.toLowerCase().includes(term) || 
                             a.Investigador.toLowerCase().includes(term) ||
                             String(a.historia).includes(term);
        
        const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
        const valorEstado = isFinalizado ? "1" : "0";
        const matchesEstado = estadoFiltro === "" || valorEstado === String(estadoFiltro);
        
        return matchesSearch && matchesEstado;
    });

    tbody.innerHTML = registrosFiltrados.map(a => {
        const fechaInicio = new Date(a.fechavisado);
        const hoy = new Date();
        const diffDays = Math.floor(Math.abs(hoy - fechaInicio) / (1000 * 60 * 60 * 24));
        const infoCajas = a.totalcajachica > 0 ? `${a.totalcajachica} Chica(s)` : `${a.totalcajagrande} Grande(s)`;
        const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");

        return `
        <tr class="${isFinalizado ? 'status-finalizado' : 'status-vigente'} pointer" onclick="window.verHistorial(${a.historia}, event)">
            <td><span class="badge bg-dark">#${a.historia}</span></td>
            <td><div class="fw-bold">${a.nprotA}</div><small class="text-muted">${a.tituloA}</small></td>
            <td>${a.Investigador}</td>
            <td>${a.EspeNombreA}</td>
            <td class="text-center fw-bold">${infoCajas}</td>
            <td class="text-center"><span class="badge bg-info text-dark">${diffDays} Días</span></td>
            <td class="small text-muted" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${a.observaciones || '---'}
            </td>
            <td>
                <span class="badge ${isFinalizado ? 'bg-danger' : 'bg-success'}">
                    ${isFinalizado ? 'FINALIZADO' : 'VIGENTE'}
                </span>
            </td>
            <td class="text-end">
                <div class="d-flex gap-1 justify-content-end align-items-center">
                    ${!isFinalizado ? `
                        <button class="btn btn-success btn-sm fw-bold px-3 shadow-sm" 
                                onclick="event.stopPropagation(); window.openModalActualizar(${a.historia})">
                            <i class="bi bi-arrow-repeat me-1"></i> ACTUALIZAR
                        </button>
                    ` : ''}
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-sm btn-light border fw-bold" onclick="event.stopPropagation(); window.verPaginaQR(${a.historia})">
                            <i class="bi bi-qr-code me-1"></i> QR
                        </button>
                        <button class="btn btn-sm btn-light border fw-bold" onclick="event.stopPropagation(); window.verHistorial(${a.historia}, event)">
                            <i class="bi bi-clock-history me-1"></i> HISTORIAL
                        </button>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');

    if (registrosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4 text-muted">No se encontraron alojamientos con los criterios seleccionados.</td></tr>';
    }
};

// dist/js/pages/admin/alojamientos.js

let allProtocolsCache = []; // Para filtrar sin volver a la API constantemente

const setupProtocolSearch = () => {
    const input = document.getElementById('input-search-prot');
    const select = document.getElementById('select-protocolo-reg');

    if (!input || !select) return; // Seguridad para evitar el error "null"

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        // Filtramos sobre el caché que cargamos al abrir el modal
        const filtered = allProtocolsCache.filter(p => 
            p.idprotA.toString().includes(term) ||
            p.nprotA.toLowerCase().includes(term) ||
            p.tituloA.toLowerCase().includes(term) ||
            p.Investigador.toLowerCase().includes(term)
        );

        // Actualizamos el select (el dropdown normal)
        renderProtocolOptions(filtered);
    });

    // Evento cuando el usuario ELIGE una opción del dropdown normal
    select.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        const p = allProtocolsCache.find(prot => prot.idprotA == selectedId);
        if (p) {
            window.selectProtocolForReg(p.idprotA, p.nprotA, p.tituloA, p.IdUsrA, p.Investigador);
        }
    });
};

/**
 * LLENA EL SELECT DE PROTOCOLOS
 */
const renderProtocolOptions = (protocols) => {
    const select = document.getElementById('select-protocolo-reg');
    select.innerHTML = '<option value="">-- Seleccione un protocolo de la lista --</option>' + 
        protocols.map(p => `<option value="${p.idprotA}">#${p.idprotA} | ${p.nprotA} - ${p.tituloA} (${p.Investigador})</option>`).join('');
};


const setupInvestigadorSearch = () => {
    const input = document.getElementById('input-search-inv');
    const results = document.getElementById('results-inv');
    if(!input) return;

    input.addEventListener('input', async (e) => {
        const term = e.target.value.trim();
        if (term.length < 2) { results.innerHTML = ''; return; }
        try {
            const res = await API.request(`/investigadores/search?term=${term}`);
            results.innerHTML = res.data.map(i => `
                <button type="button" class="list-group-item list-group-item-action small" 
                    onclick="window.selectInvestigador(${i.IdUsrA}, '${i.NombreA} ${i.ApellidoA}')">
                    <div class="fw-bold">#${i.IdUsrA} - ${i.NombreA} ${i.ApellidoA}</div>
                </button>
            `).join('');
        } catch (e) { console.error(e); }
    });
};

window.selectProtocol = async (id, nprot, titulo, invNombre, invId) => {
    document.getElementById('reg-idprotA').value = id;
    document.getElementById('input-search-prot').value = `[${nprot}] ${titulo}`;
    document.getElementById('results-prot').innerHTML = '';
    window.selectInvestigador(invId, invNombre);
    await cargarEspeciesDinamicas(id);
};

window.selectInvestigador = (id, nombre) => {
    document.getElementById('reg-IdUsrA').value = id;
    document.getElementById('input-search-inv').value = nombre;
    document.getElementById('results-inv').innerHTML = '';
};





/**
 * ABRE EL MODAL DE REGISTRO
 * Limpia el formulario, oculta el paso 2 y carga la lista de protocolos
 */
window.openModalRegistro = async () => {
    const instId = localStorage.getItem('instId');
    const select = document.getElementById('select-protocolo-reg');
    const step2 = document.getElementById('registro-step-2');
    const form = document.getElementById('form-alojamiento');

    // Resetear formulario y ocultar paso 2
    form.reset();
    form.dataset.isUpdate = "false";
    step2.classList.add('d-none');
    select.innerHTML = '<option value="">Cargando protocolos...</option>';

    showLoader();
    try {
        // La consulta modificada sin LIMIT 10
        const res = await API.request(`/protocolos/search-alojamiento?term=&inst=${instId}`);
        if (res.status === 'success') {
            allProtocolsCache = res.data;
            renderProtocolOptions(res.data);
        }
    } catch (e) { console.error("Error cargando protocolos:", e); }
    hideLoader();

    setupFechaLimite(); // Configura fecha de hoy y tope de mañana
    new bootstrap.Modal(document.getElementById('modal-registro')).show();
};


/**
 * FILTRO EN TIEMPO REAL
 * Filtra las opciones del select basándose en el input de búsqueda
 */
document.getElementById('input-search-prot').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = allProtocolsCache.filter(p => 
        p.idprotA.toString().includes(term) ||
        p.nprotA.toLowerCase().includes(term) ||
        p.tituloA.toLowerCase().includes(term) ||
        p.Investigador.toLowerCase().includes(term)
    );
    renderProtocolOptions(filtered);
});

window.openModalActualizar = (historiaId, desdeHistorial = false) => {
    const actual = dataFull.find(a => a.historia == historiaId);
    if (!actual) return;

    if (desdeHistorial) {
        const modalHist = bootstrap.Modal.getInstance(document.getElementById('modal-historial'));
        if (modalHist) modalHist.hide();
    }

    const form = document.getElementById('form-alojamiento');
    document.getElementById('modal-registro-title').innerText = `ACTUALIZAR HISTORIA #${historiaId}`;
    
    document.getElementById('reg-idprotA').value = actual.idprotA;
    document.getElementById('input-search-prot').value = actual.nprotA;
    document.getElementById('input-search-prot').readOnly = true;

    document.getElementById('reg-IdUsrA').value = actual.IdUsrA;
    document.getElementById('input-search-inv').value = actual.Investigador;
    document.getElementById('input-search-inv').readOnly = true;

    const selectEspecie = document.getElementById('reg-especie');
    selectEspecie.innerHTML = `<option value="${actual.idespA}">${actual.EspeNombreA}</option>`;
    selectEspecie.disabled = true;

    const selectCaja = document.getElementById('reg-tipo-caja');
    const esChica = parseFloat(actual.totalcajachica) > 0;
    selectCaja.innerHTML = `
        <option value="chica" ${esChica ? 'selected' : ''}>Caja Chica</option>
        <option value="grande" ${!esChica ? 'selected' : ''}>Caja Grande</option>
    `;
    selectCaja.disabled = true; 
    
    document.getElementById('reg-cantidad').value = esChica ? actual.totalcajachica : actual.totalcajagrande;
    document.getElementById('reg-obs').value = "";
    document.getElementById('reg-fecha').valueAsDate = new Date();

    form.dataset.historia = historiaId;
    form.dataset.isUpdate = "true";
    new bootstrap.Modal(document.getElementById('modal-registro')).show();
};

window.saveAlojamiento = async (event) => {
    if (event) event.preventDefault();
    const form = document.getElementById('form-alojamiento');
    const historiaId = parseInt(form.dataset.historia) || 0;
    const isUpdate = form.dataset.isUpdate === "true";
    const actual = dataFull.find(a => a.historia == historiaId) || {};
    
    const data = {
        fechavisado: document.getElementById('reg-fecha').value,
        totalcajachica: document.getElementById('reg-tipo-caja').value === 'chica' ? (parseInt(document.getElementById('reg-cantidad').value) || 0) : 0,
        totalcajagrande: document.getElementById('reg-tipo-caja').value === 'grande' ? (parseInt(document.getElementById('reg-cantidad').value) || 0) : 0,
        preciocajachica: parseFloat(actual.preciocajachica) || 0,
        preciocajagrande: parseFloat(actual.preciocajagrande) || 0,
        IdUsrA: parseInt(document.getElementById('reg-IdUsrA').value),
        idprotA: parseInt(document.getElementById('reg-idprotA').value),
        observaciones: document.getElementById('reg-obs').value || "",
        historia: historiaId,
        is_update: isUpdate,
        IdInstitucion: parseInt(localStorage.getItem('instId')) || 1,
        coloniapropia: 0,
        TipoAnimal: 1
    };

    if (!data.idprotA || !data.IdUsrA) return window.Swal.fire('Error', 'Complete Protocolo e Investigador', 'error');

    showLoader();
    try {
        const res = await API.request('/alojamiento/save', 'POST', data);
        if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-registro')).hide();
            window.Swal.fire({ title: 'Éxito', text: 'Registro Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            await loadAlojamientos();
            if (isUpdate) setTimeout(() => window.verHistorial(data.historia), 600);
        }
    } catch (e) { console.error(e); }
    hideLoader();
};

// ***************************************************
// 6. GESTIÓN DE HISTORIAL (MODAL)
// ***************************************************
window.verHistorial = async (historiaId, event = null) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    try {
        showLoader();
        const res = await API.request(`/alojamiento/history?historia=${historiaId}`);
        if (res.status === 'success') {
            currentHistoryData = res.data;
            if (currentHistoryData.length === 0) return;
            window.renderHistorialSummary(currentHistoryData, historiaId);
            window.renderHistorialTable(currentHistoryData);
            window.renderHistorialFooter(currentHistoryData, historiaId);
            new bootstrap.Modal(document.getElementById('modal-historial')).show();
        }
    } catch (e) { console.error(e); } finally {
        hideLoader();
    }
};

window.renderHistorialSummary = (history, historiaId) => {
    const first = history[0];
    const hoy = new Date();
    hoy.setHours(12,0,0,0);

    let totalCosto = 0;
    let totalDias = 0;

    history.forEach(h => {
        const esAbierto = !h.hastafecha;
        const pIni = h.fechavisado.split('-');
        const fIni = new Date(pIni[0], pIni[1]-1, pIni[2], 12,0,0);
        let fFin = hoy;
        if(!esAbierto) {
            const pFin = h.hastafecha.split('-');
            fFin = new Date(pFin[0], pFin[1]-1, pFin[2], 12,0,0);
        }

        let dias = Math.max(0, Math.floor((fFin - fIni)/(1000*60*60*24)));
        const precio = parseFloat(h.totalcajachica > 0 ? h.preciocajachica : h.preciocajagrande);
        const cant = parseInt(h.totalcajachica > 0 ? h.totalcajachica : h.totalcajagrande);
        
        totalCosto += esAbierto ? (dias * precio * cant) : parseFloat(h.totalpago || 0);
        totalDias += dias;
    });

    const tipoCaja = first.totalcajachica > 0 ? 'Caja Chica' : 'Caja Grande';

    document.getElementById('historial-summary').innerHTML = `
        <div class="col-md-2 border-end text-center"><label class="d-block small text-muted fw-bold">ID HISTORIA</label><span class="badge bg-dark fs-6">#${historiaId}</span></div>
        <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">INVESTIGADOR</label><span class="text-dark small fw-bold text-uppercase">${first.Investigador || '---'}</span></div>
        <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">PROTOCOLO</label><span class="text-dark small">${first.nprotA}</span></div>
        <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">ESPECIE</label><span class="text-dark small">${first.EspeNombreA}</span></div>
        <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">TIPO CAJA</label><span class="text-primary small fw-bold">${tipoCaja}</span></div> 
        <div class="col-md-1 border-end text-center"><label class="d-block small text-muted fw-bold text-primary">DÍAS</label><span class="fw-bold fs-5">${totalDias}</span></div>
        <div class="col-md-1 text-center"><label class="d-block small text-muted fw-bold text-success">TOTAL</label><span class="fw-bold fs-6 text-success">$ ${totalCosto.toFixed(2)}</span></div>
    `;
};

window.renderHistorialTable = (history) => {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);

    document.getElementById('tbody-historial').innerHTML = history.map(h => {
        const esAbierto = !h.hastafecha;
        const pIni = h.fechavisado.split('-');
        const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
        let fFin = esAbierto ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1]-1, h.hastafecha.split('-')[2], 12, 0, 0);

        let diasTramo = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
        const esChica = parseFloat(h.totalcajachica) > 0;
        const precioUnit = esChica ? parseFloat(h.preciocajachica) : parseFloat(h.preciocajagrande);
        const cant = esChica ? parseInt(h.totalcajachica) : parseInt(h.totalcajagrande);
        const subtotal = (diasTramo * precioUnit * cant);

        return `
        <tr>
            <td><span class="badge bg-light text-dark">#${h.IdAlojamiento}</span></td>
            <td>${fIni.toLocaleDateString()}</td> 
            <td class="${esAbierto ? 'text-primary fw-bold' : ''}">${esAbierto ? 'VIGENTE' : fFin.toLocaleDateString()}</td>
            <td>${cant} ${esChica ? 'Ch.' : 'Gr.'}</td>
            <td class="fw-bold">${diasTramo}</td>
            <td>$ ${precioUnit.toFixed(2)}</td>
            <td class="fw-bold">$ ${subtotal.toFixed(2)}</td>
            <td class="small italic text-muted">${h.observaciones || ''}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-xs btn-outline-primary" onclick="window.modificarTramo(${h.IdAlojamiento})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-xs btn-outline-danger" onclick="window.eliminarTramo(${h.IdAlojamiento}, ${h.historia})"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.renderHistorialFooter = (history, historiaId) => {
    const isFinalizado = history.some(h => String(h.finalizado) === "1");
    const footer = document.getElementById('historial-footer');
    if (isFinalizado) {
        footer.innerHTML = `
            <button type="button" class="btn btn-warning btn-sm fw-bold shadow-sm" onclick="window.confirmarDesfinalizar(${historiaId})">
                <i class="bi bi-unlock-fill me-1"></i> DESFINALIZAR HISTORIAL
            </button>
            <span class="badge bg-danger px-3 py-2">ESTADÍA FINALIZADA</span>`;
    } else {
        const ultimaFecha = history[history.length - 1].fechavisado;
        footer.innerHTML = `
            <button type="button" class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.confirmarFinalizarRango(${historiaId}, '${ultimaFecha}')">
                <i class="bi bi-check-circle-fill me-1"></i> FINALIZAR
            </button>
            <button type="button" class="btn btn-primary btn-sm fw-bold shadow-sm" onclick="window.openModalActualizar(${historiaId}, true)">
                <i class="bi bi-plus-circle me-1"></i> ACTUALIZAR
            </button>`;
    }
};

// ***************************************************
// 7. MODIFICACIÓN DE TRAMOS INDIVIDUALES
// ***************************************************
window.modificarTramo = (idAlojamiento) => {
    const row = currentHistoryData.find(h => h.IdAlojamiento == idAlojamiento);
    if (!row) return;

    bootstrap.Modal.getInstance(document.getElementById('modal-historial')).hide();

    const esChica = parseInt(row.totalcajachica) > 0;
    const contChica = document.getElementById('edit-caja-ch').closest('.col-6');
    const contGrande = document.getElementById('edit-caja-gr').closest('.col-6');

    if (esChica) {
        contChica.classList.replace('d-none', 'd-block');
        contGrande.classList.replace('d-block', 'd-none');
        document.getElementById('edit-caja-ch').value = row.totalcajachica;
    } else {
        contChica.classList.replace('d-block', 'd-none');
        contGrande.classList.replace('d-none', 'd-block');
        document.getElementById('edit-caja-gr').value = row.totalcajagrande;
    }

    document.getElementById('edit-id-alojamiento').value = row.IdAlojamiento;
    document.getElementById('edit-historia').value = row.historia;
    document.getElementById('edit-fecha-inicio').value = row.fechavisado;
    document.getElementById('edit-obs').value = row.observaciones || '';

    new bootstrap.Modal(document.getElementById('modal-modificar-tramo')).show();
};

window.updateTramoData = async (event) => {
    if (event) event.preventDefault();
    const hId = document.getElementById('edit-historia').value;
    const data = {
        IdAlojamiento: parseInt(document.getElementById('edit-id-alojamiento').value),
        historia: parseInt(hId),
        fechavisado: document.getElementById('edit-fecha-inicio').value,
        totalcajachica: parseInt(document.getElementById('edit-caja-ch').value) || 0,
        totalcajagrande: parseInt(document.getElementById('edit-caja-gr').value) || 0,
        observaciones: document.getElementById('edit-obs').value || "",
        IdInstitucion: parseInt(localStorage.getItem('instId'))
    };

    showLoader();
    try {
        const res = await API.request('/alojamiento/update-row', 'POST', data);
        if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-modificar-tramo')).hide();
            window.Swal.fire({ title: 'Éxito', text: 'Tramo actualizado', icon: 'success', timer: 1000 });
            await loadAlojamientos();
            setTimeout(() => window.verHistorial(hId), 600);
        }
    } catch (e) { console.error(e); } finally { hideLoader(); }
};

// ***************************************************
// 8. CONFIGURACIÓN GLOBAL Y EXPORTACIÓN
// ***************************************************
window.abrirConfiguracion = () => {
    const first = currentHistoryData[0];
    window.Swal.fire({
        title: `Configurar Historia #${first.historia}`,
        html: `
            <div class="text-start small">
                <label class="fw-bold">ID Protocolo:</label>
                <input type="number" id="cfg-idprot" class="form-control mb-2" value="${first.idprotA}">
                <label class="fw-bold">ID Investigador:</label>
                <input type="number" id="cfg-idusr" class="form-control" value="${first.IdUsrA}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'ACTUALIZAR GLOBAL',
        preConfirm: () => ({
            historia: first.historia,
            idprotA: document.getElementById('cfg-idprot').value,
            IdUsrA: document.getElementById('cfg-idusr').value
        })
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoader();
            await API.request('/alojamiento/update-config', 'POST', result.value);
            window.Swal.fire('Éxito', 'Configuración actualizada', 'success');
            loadAlojamientos();
            hideLoader();
        }
    });
};

window.exportarFichaPDF = async () => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const first = currentHistoryData[0];
    const pdfTemplate = `
        <div style="font-family: Arial; padding: 20px;">
            <h2 style="color: #1a5d3b; text-align: center;">GROBO - ${inst}</h2>
            <h4 style="text-align: center;">FICHA HISTÓRICA DE ALOJAMIENTO #${first.historia}</h4>
            <hr>
            <p><strong>Investigador:</strong> ${first.Investigador}</p>
            <p><strong>Protocolo:</strong> ${first.nprotA}</p>
            <p><strong>Especie:</strong> ${first.EspeNombreA}</p>
        </div>
    `;
    html2pdf().from(pdfTemplate).save(`Ficha_H${first.historia}.pdf`);
};

window.verPaginaQR = (historiaId) => {
    window.open(`../../front/paginas/admin/qr_alojamiento.html?h=${historiaId}`, '_blank');
};

const getInstitucionSegura = () => parseInt(localStorage.getItem('instId')) || 1;


// front/dist/js/pages/admin/alojamientos.js



window.selectProtocolForReg = async (id, nprot, titulo, invId, invNombre) => {
    // 1. Llenar campos maestros
    const inputHidden = document.getElementById('reg-idprotA');
    const inputSearch = document.getElementById('input-search-prot');
    const inputInv = document.getElementById('input-search-inv');
    const step2 = document.getElementById('registro-step-2');

    if (inputHidden) inputHidden.value = id;
    if (inputSearch) inputSearch.value = `[${nprot}] ${titulo}`;
    if (inputInv) inputInv.value = invNombre;
    
    // IMPORTANTE: Ya no buscamos "results-prot" porque ya no existe en el HTML.
    // Eso es lo que causaba el error 500/null.

    // 2. MOSTRAR EL RESTO DEL FORMULARIO
    if (step2) {
        step2.classList.remove('d-none');
    }

    // 3. Cargar Especies y Cajas correspondientes
    await cargarEspeciesDinamicas(id);
};

// ***************************************************
// 3. LÓGICA DE ESPECIES Y CAJAS (SEGÚN PRECIOS)
// ***************************************************
async function cargarEspeciesYValidarCajas(protocolId) {
    const res = await API.request(`/protocols/current-species?id=${protocolId}`);
    const selectEsp = document.getElementById('reg-especie');
    const species = res.data;

    // Si solo hay 1 especie aprobada, se marca y se bloquea
    if (species.length === 1) {
        selectEsp.innerHTML = `<option value="${species[0].idespA}">${species[0].EspeNombreA}</option>`;
        selectEsp.disabled = true;
        await determinarTipoCaja(species[0].idespA);
    } else {
        selectEsp.innerHTML = '<option value="">-- Seleccionar Especie --</option>' + 
                              species.map(s => `<option value="${s.idespA}">${s.EspeNombreA}</option>`).join('');
        selectEsp.disabled = false;
        selectEsp.onchange = (e) => determinarTipoCaja(e.target.value);
    }
}

async function determinarTipoCaja(especieId) {
    // Consultamos el tarifario de especiee
    const res = await API.request(`/precios/all-data`);
    const esp = res.data.animales.find(e => e.idespA == especieId);
    const selectCaja = document.getElementById('reg-tipo-caja');

    const tieneChica = parseFloat(esp.PalojamientoChica) > 0;
    const tieneGrande = parseFloat(esp.PalojamientoGrande) > 0;

    // Lógica de dropdown según disponibilidad de precios
    if (tieneChica && tieneGrande) {
        selectCaja.innerHTML = '<option value="chica">Caja Chica</option><option value="grande">Caja Grande</option>';
        selectCaja.disabled = false;
    } else {
        const tipo = tieneChica ? 'chica' : 'grande';
        selectCaja.innerHTML = `<option value="${tipo}" selected>Caja ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</option>`;
        selectCaja.disabled = true;
    }
}


/**
 * EVENTO AL SELECCIONAR PROTOCOLO
 */
document.getElementById('select-protocolo-reg').addEventListener('change', async (e) => {
    const id = e.target.value;
    if (!id) return;

    const protocol = allProtocolsCache.find(p => p.idprotA == id);
    if (protocol) {
        // Llenar campos maestros
        document.getElementById('reg-idprotA').value = protocol.idprotA;
        document.getElementById('reg-IdUsrA').value = protocol.IdUsrA;
        document.getElementById('input-search-inv').value = protocol.Investigador;

        // MOSTRAR EL RESTO DEL FORMULARIO
        document.getElementById('registro-step-2').classList.remove('d-none');

        // Cargar especies aprobadas para este protocolo (protesper + especiee)
        await cargarEspeciesDinamicas(id);
    }
});

async function cargarEspeciesDinamicas(protocolId) {
    showLoader();
    try {
        const res = await API.request(`/protocols/current-species?id=${protocolId}`);
        const selectEsp = document.getElementById('reg-especie');
        const species = res.data;

        if (species.length === 1) {
            selectEsp.innerHTML = `<option value="${species[0].idespA}">${species[0].EspeNombreA}</option>`;
            selectEsp.disabled = true; // Si es única, queda fija
            await validarCajasPorEspecie(species[0].idespA);
        } else {
            selectEsp.innerHTML = '<option value="">-- Seleccionar Especie --</option>' + 
                                  species.map(s => `<option value="${s.idespA}">${s.EspeNombreA}</option>`).join('');
            selectEsp.disabled = false;
            selectEsp.onchange = (e) => validarCajasPorEspecie(e.target.value);
        }
    } catch (e) { console.error(e); }
    hideLoader();
}

async function validarCajasPorEspecie(especieId) {
    if (!especieId) return;
    try {
        const res = await API.request(`/precios/all-data`);
        const info = res.data.animales.find(e => e.idespA == especieId);
        const selectCaja = document.getElementById('reg-tipo-caja');

        const tieneChica = parseFloat(info.PalojamientoChica) > 0;
        const tieneGrande = parseFloat(info.PalojamientoGrande) > 0;

        if (tieneChica && tieneGrande) {
            selectCaja.innerHTML = `
                <option value="chica">Caja Chica ($${info.PalojamientoChica})</option>
                <option value="grande">Caja Grande ($${info.PalojamientoGrande})</option>`;
            selectCaja.disabled = false;
        } else {
            const tipo = tieneChica ? 'chica' : 'grande';
            const precio = tieneChica ? info.PalojamientoChica : info.PalojamientoGrande;
            selectCaja.innerHTML = `<option value="${tipo}" selected>Caja ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} ($${precio})</option>`;
            selectCaja.disabled = true;
        }
    } catch (e) { console.error(e); }
}

const setupFechaLimite = () => {
    const inputFecha = document.getElementById('reg-fecha');
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    inputFecha.valueAsDate = hoy;
    inputFecha.max = manana.toISOString().split('T')[0]; // Bloquea fechas más allá de mañana
};