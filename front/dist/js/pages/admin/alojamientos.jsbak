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
   
    // 2. ACTIVAR LAS NUEVAS FUNCIONES (ORDENAMIENTO Y AYUDA)
        setupTableFeatures();
    
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
        <td class="small fw-bold text-secondary">${a.fechavisado}</td> <td><div class="fw-bold">${a.nprotA}</div><small class="text-muted">${a.tituloA}</small></td>
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


window.openModalRegistro = (historiaId, desdeHistorial = false) => {
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
            // ASIGNACIÓN GLOBAL: Fundamental para que configuracionAlojamiento.js 
            // pueda leer los datos de la historia abierta.
            window.currentHistoryData = res.data; 

            if (window.currentHistoryData.length === 0) return;

            // Renderizado de los componentes del modal de historial
            window.renderHistorialSummary(window.currentHistoryData, historiaId);
            window.renderHistorialTable(window.currentHistoryData);
            window.renderHistorialFooter(window.currentHistoryData, historiaId);
            
            // Mostrar el modal de historial
            const modalHist = new bootstrap.Modal(document.getElementById('modal-historial'));
            modalHist.show();
        }
    } catch (e) { 
        console.error("Error al cargar historial:", e); 
    } finally {
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
                    <button class="btn btn-xs btn-outline-primary" onclick="window.modificarTramo(${h.IdAlojamiento})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-xs btn-outline-danger" onclick="window.eliminarTramo(${h.IdAlojamiento}, ${h.historia})">
                        <i class="bi bi-trash"></i>
                    </button>
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
    // 1. Validar datos en el caché global
    const row = currentHistoryData.find(h => h.IdAlojamiento == idAlojamiento);
    if (!row) return;

    // 2. Cerrar el modal de historial de forma segura
    const modalHistEl = document.getElementById('modal-historial');
    const modalHist = bootstrap.Modal.getInstance(modalHistEl);
    if (modalHist) modalHist.hide();

    // 3. INYECTAR DATOS DEL ALOJAMIENTO EN EL HEADER
    const header = document.getElementById('edit-header-data');
    if (header) {
        header.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span><b>ID Registro:</b> #${row.IdAlojamiento}</span>
                <span><b>ID Historia:</b> #${row.historia}</span>
            </div>
            <div class="text-truncate"><b>Protocolo:</b> ${row.nprotA}</div>
            <div class="text-truncate"><b>Investigador:</b> ${row.Investigador}</div>
        `;
    }

    // 4. LÓGICA DE VISIBILIDAD (Uso de IDs directos para evitar el error 'style')
    const esChica = parseInt(row.totalcajachica) > 0;
    const contChica = document.getElementById('cont-edit-chica');
    const contGrande = document.getElementById('cont-edit-grande');

    if (esChica) {
        contChica.style.display = 'block';
        contGrande.style.display = 'none';
        document.getElementById('edit-caja-ch').value = row.totalcajachica;
        document.getElementById('edit-caja-gr').value = 0;
    } else {
        contChica.style.display = 'none';
        contGrande.style.display = 'block';
        document.getElementById('edit-caja-gr').value = row.totalcajagrande;
        document.getElementById('edit-caja-ch').value = 0;
    }

    // 5. LLENAR LOS INPUTS DEL FORMULARIO
    document.getElementById('edit-id-alojamiento').value = row.IdAlojamiento;
    document.getElementById('edit-historia').value = row.historia;
    document.getElementById('edit-fecha-inicio').value = row.fechavisado;
    document.getElementById('edit-obs').value = row.observaciones || '';

    // 6. Abrir el modal de modificación
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

// ***************************************************
// EXPORTACIÓN A PDF: FICHA TÉCNICA DETALLADA
// ***************************************************
window.exportarFichaPDF = async () => {
    // 1. Validar datos
    if (!window.currentHistoryData || window.currentHistoryData.length === 0) {
        return Swal.fire('Error', 'No hay datos de historial para exportar.', 'error');
    }

    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const history = window.currentHistoryData;
    const first = history[0]; 

    showLoader();

    // 2. Determinar Tipo de Caja General (para el encabezado)
    const esChicaGral = parseFloat(first.totalcajachica) > 0;
    const tipoCajaGral = esChicaGral ? 'CAJA CHICA' : 'CAJA GRANDE';

    // 3. Generar filas con ID de alojamiento individual
    const tablaFilas = history.map(h => {
        const esChica = parseFloat(h.totalcajachica) > 0;
        const cant = esChica ? h.totalcajachica : h.totalcajagrande;
        return `
            <tr>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">#${h.IdAlojamiento}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${h.fechavisado}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${h.hastafecha || 'VIGENTE'}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${cant}</td>
                <td style="border: 1px solid #ddd; padding: 6px; font-style: italic;">${h.observaciones || '-'}</td>
            </tr>`;
    }).join('');

    // 4. Plantilla del PDF
    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 30px; color: #333;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; color: #555;">FICHA HISTÓRICA DE ALOJAMIENTO - HISTORIA #${first.historia}</h4>
            </div>
            
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 13px; line-height: 1.6;">
                    <tr>
                        <td><strong>Investigador:</strong> ${first.Investigador}</td>
                        <td><strong>Protocolo:</strong> [${first.nprotA}] ${first.tituloA || ''}</td>
                    </tr>
                    <tr>
                        <td><strong>Especie:</strong> ${first.EspeNombreA}</td>
                        <td style="color: #1a5d3b;"><strong>Tipo de Caja:</strong> ${tipoCajaGral}</td>
                    </tr>
                </table>
            </div>

            <h5 style="color: #1a5d3b; margin-bottom: 10px; text-transform: uppercase;">Cronología de Registros (Tramos)</h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="background-color: #1a5d3b; color: white;">
                        <th style="border: 1px solid #ddd; padding: 8px;">ID REG.</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">DESDE</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">HASTA</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">CANT.</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">OBSERVACIONES</th>
                    </tr>
                </thead>
                <tbody>
                    ${tablaFilas}
                </tbody>
            </table>

            <div style="margin-top: 30px; font-size: 9px; color: #888; text-align: right;">
                Generado el: ${new Date().toLocaleString()} | Bioterios Grobo System
            </div>
        </div>
    `;

    // 5. Configuración de descarga
    const opt = {
        margin: 0.5,
        filename: `Ficha_Grobo_H${first.historia}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(pdfTemplate).save();
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    } finally {
        hideLoader();
    }
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
}); */

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

window.verPaginaQR = (historiaId = null) => {
    // Tomamos el ID de la historia
    const id = historiaId || (window.currentHistoryData && window.currentHistoryData[0]?.historia);
    
    if (!id) {
        console.error("No se pudo identificar el número de historia.");
        return;
    }

    // NUEVA RUTA: Ahora subimos dos niveles y entramos a paginas/
    const url = `../../paginas/qr-alojamiento.html?historia=${id}`;
    
    // Abrir en una ventana tipo "Pop-up" para simular vista móvil
    window.open(url, 'Ficha QR', 'width=450,height=700,menubar=no,toolbar=no');
};

// ***************************************************
// 9. LÓGICA DE ORDENAMIENTO, PAGINACIÓN Y AYUDA
// ***************************************************

let currentPageAloj = 1;
const rowsPerPageAloj = 10;
let sortConfigAloj = { key: 'historia', direction: 'desc' };

/**
 * Inicialización de componentes de tabla
 * Llamar esta función dentro de initAlojamientosPage()
 */
function setupTableFeatures() {
    // Botón Ayuda
    const btnAyuda = document.getElementById('btn-ayuda-alojamiento');
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            new bootstrap.Modal(document.getElementById('modal-alojamiento-help')).show();
        };
    }

    // Configurar Headers Ordenables
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        th.style.cursor = 'pointer';
        th.setAttribute('data-label', th.innerText.trim());
        th.onclick = () => {
            const key = th.getAttribute('data-key');
            if (sortConfigAloj.key === key) {
                sortConfigAloj.direction = sortConfigAloj.direction === 'asc' ? 'desc' : (sortConfigAloj.direction === 'desc' ? 'none' : 'asc');
            } else { 
                sortConfigAloj.key = key; 
                sortConfigAloj.direction = 'asc'; 
            }
            window.renderAlojamientosTable();
        };
    });
}

function updateHeaderIconsAloj() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfigAloj.key === key 
            ? (sortConfigAloj.direction === 'asc' ? ' ▲' : (sortConfigAloj.direction === 'desc' ? ' ▼' : ' -')) 
            : ' -';
        th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
    });
}

/**
 * REFACTORIZACIÓN DEL RENDERIZADO (Motor Central)
 */
window.renderAlojamientosTable = () => {
    const term = document.getElementById('search-alojamiento').value.toLowerCase().trim();
    const estadoFiltro = document.getElementById('filter-estado').value; 
    const tbody = document.getElementById('tbody-alojamientos');

    if (!tbody) return;

    // 1. FILTRADO
    let data = dataFull.filter(a => {
        const matchesSearch = a.nprotA.toLowerCase().includes(term) || 
                             a.Investigador.toLowerCase().includes(term) ||
                             String(a.historia).includes(term);
        
        const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
        const valorEstado = isFinalizado ? "1" : "0";
        const matchesEstado = estadoFiltro === "" || valorEstado === String(estadoFiltro);
        
        return matchesSearch && matchesEstado;
    });

    // 2. ORDENAMIENTO
    if (sortConfigAloj.direction !== 'none') {
        data.sort((a, b) => {
            let valA = a[sortConfigAloj.key] || ''; 
            let valB = b[sortConfigAloj.key] || '';
            const factor = sortConfigAloj.direction === 'asc' ? 1 : -1;
            
            // Comparación inteligente (Números vs Strings)
            return isNaN(valA) || isNaN(valB) 
                ? valA.toString().localeCompare(valB.toString()) * factor 
                : (parseFloat(valA) - parseFloat(valB)) * factor;
        });
    }

    // 3. PAGINACIÓN
    const totalItems = data.length;
    const pageData = data.slice((currentPageAloj - 1) * rowsPerPageAloj, currentPageAloj * rowsPerPageAloj);

    // 4. RENDERIZADO FÍSICO
    updateHeaderIconsAloj();
    renderPaginationAloj(totalItems);

    tbody.innerHTML = pageData.map(a => {
        const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
        const infoCajas = a.totalcajachica > 0 ? `${a.totalcajachica} Chica(s)` : `${a.totalcajagrande} Grande(s)`;
        
        const fIni = new Date(a.fechavisado);
        const hoy = new Date();
        const diffDays = Math.floor(Math.abs(hoy - fIni) / (1000 * 60 * 60 * 24));

        return `
        <tr class="${isFinalizado ? 'status-finalizado' : 'status-vigente'} pointer" onclick="window.verHistorial(${a.historia}, event)">
            <td><span class="badge bg-dark">#${a.historia}</span></td>
            <td class="small fw-bold text-secondary">${a.fechavisado}</td> 
            <td><div class="fw-bold">${a.nprotA}</div><small class="text-muted">${a.tituloA || '---'}</small></td>
            <td>${a.Investigador}</td>
            <td>${a.EspeNombreA}</td>
            <td class="text-center fw-bold">${infoCajas}</td>
            <td class="text-center"><span class="badge bg-info text-dark">${diffDays} Días</span></td>
            <td class="small text-muted text-truncate" style="max-width:150px">${a.observaciones || '---'}</td>
            <td><span class="badge ${isFinalizado ? 'bg-danger' : 'bg-success'}">${isFinalizado ? 'FINALIZADO' : 'VIGENTE'}</span></td>
            <td class="text-end" onclick="event.stopPropagation()">
                <div class="btn-group shadow-sm">
                    ${!isFinalizado ? `<button class="btn btn-xs btn-success" onclick="window.openModalActualizar(${a.historia})"><i class="bi bi-arrow-repeat"></i></button>` : ''}
                    <button class="btn btn-xs btn-light border" onclick="window.verPaginaQR(${a.historia})"><i class="bi bi-qr-code"></i></button>
                    <button class="btn btn-xs btn-light border" onclick="window.verHistorial(${a.historia})"><i class="bi bi-clock-history"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');

    if (totalItems === 0) tbody.innerHTML = '<tr><td colspan="10" class="text-center p-4 text-muted">No se encontraron alojamientos.</td></tr>';
};

function renderPaginationAloj(totalItems) {
    const pagContainer = document.getElementById('pagination-alojamiento');
    const totalPages = Math.ceil(totalItems / rowsPerPageAloj);
    pagContainer.innerHTML = '';
    
    if (totalPages <= 1) return;

    const createBtn = (label, page, disabled, active = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link shadow-none" href="#">${label}</a>`;
        if (!disabled) li.onclick = (e) => { e.preventDefault(); currentPageAloj = page; window.renderAlojamientosTable(); };
        return li;
    };

    pagContainer.appendChild(createBtn('«', currentPageAloj - 1, currentPageAloj === 1));
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPageAloj - 2 && i <= currentPageAloj + 2)) {
            pagContainer.appendChild(createBtn(i, i, false, i === currentPageAloj));
        }
    }
    pagContainer.appendChild(createBtn('»', currentPageAloj + 1, currentPageAloj === totalPages));
}

// IMPORTANTE: Asegúrate de llamar a setupTableFeatures() en tu export async function initAlojamientosPage()

// ***************************************************
// 10. EXPORTACIÓN A EXCEL (CSV)
// ***************************************************

/**
 * Abre el modal de selección de fechas
 */
window.exportExcelAlojamientos = () => {
    new bootstrap.Modal(document.getElementById('modal-excel-alojamiento')).show();
};

/**
 * Procesa los datos y genera el archivo de descarga
 */
window.processExcelExportAlojamientos = () => {
    const start = document.getElementById('excel-start-date-aloj').value;
    const end = document.getElementById('excel-end-date-aloj').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    if (!start || !end) {
        return Swal.fire('Atención', 'Seleccione un rango de fechas para continuar.', 'warning');
    }

    // Obtenemos los datos actuales (usando la misma lógica de filtrado de la tabla)
    const term = document.getElementById('search-alojamiento').value.toLowerCase().trim();
    const estadoFiltro = document.getElementById('filter-estado').value; 

    let data = dataFull.filter(a => {
        // Filtro de búsqueda y estado
        const matchesSearch = a.nprotA.toLowerCase().includes(term) || 
                             a.Investigador.toLowerCase().includes(term) ||
                             String(a.historia).includes(term);
        const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
        const matchesEstado = estadoFiltro === "" || (isFinalizado ? "1" : "0") === String(estadoFiltro);
        
        // Filtro por rango de fechas (basado en fechavisado)
        const fechaAloj = a.fechavisado || '0000-00-00';
        const matchesDate = fechaAloj >= start && fechaAloj <= end;

        return matchesSearch && matchesEstado && matchesDate;
    });

    if (data.length === 0) {
        return Swal.fire('Sin resultados', 'No hay registros de alojamiento en ese rango.', 'info');
    }

    // Definición de Columnas
    const headers = ["ID Historia", "Fecha Inicio", "Protocolo", "Investigador", "Especie", "Cajas", "Dias Aloj.", "Estado"];
    const csvRows = [headers.join(";")];

    data.forEach(a => {
        const infoCajas = a.totalcajachica > 0 ? `${a.totalcajachica} Chica(s)` : `${a.totalcajagrande} Grande(s)`;
        const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
        
        // Cálculo de días similar al de la tabla
        const fIni = new Date(a.fechavisado);
        const diffDays = Math.floor(Math.abs(new Date() - fIni) / (1000 * 60 * 60 * 24));

        const row = [
            `#${a.historia}`,
            a.fechavisado,
            a.nprotA,
            a.Investigador,
            a.EspeNombreA,
            infoCajas,
            diffDays,
            isFinalizado ? 'FINALIZADO' : 'VIGENTE'
        ];
        
        // Limpiar puntos y comas para no romper el CSV
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // Generar y descargar el archivo
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM para Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `ALOJAMIENTOS_${nombreInst}_${start}_al_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cerrar modal
    bootstrap.Modal.getInstance(document.getElementById('modal-excel-alojamiento')).hide();
};
// ***************************************************
// ELIMINAR TRAMO DE ALOJAMIENTO (Sincronizado con Historial)
// ***************************************************
// Esta función borra una fila específica de la estadía y actualiza los cálculos.
window.eliminarTramo = async (idAlojamiento, historiaId) => {
    // 1. Confirmación de seguridad con SweetAlert2
    const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar este tramo?',
        text: "Se borrará este registro de la historia y afectará los costos totales.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'SÍ, ELIMINAR',
        cancelButtonText: 'CANCELAR'
    });

    if (isConfirmed) {
        showLoader();
        try {
            // 2. Petición a la API (Ruta definida en routes.php)
            const res = await API.request('/alojamiento/delete-row', 'POST', { 
                IdAlojamiento: idAlojamiento,
                historia: historiaId 
            });

            if (res.status === 'success') {
                Swal.fire({
                    title: 'Eliminado',
                    text: 'El tramo ha sido borrado correctamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });

                // 3. Recargar datos de la tabla principal en segundo plano
                await loadAlojamientos();

                // 4. Refrescar el modal de historial para mostrar los cambios
                setTimeout(() => window.verHistorial(historiaId), 500);
            } else {
                Swal.fire('Error', res.message || 'No se pudo eliminar el tramo.', 'error');
            }
        } catch (error) {
            console.error("Error crítico al eliminar tramo:", error);
            Swal.fire('Error', 'Fallo de conexión con el servidor.', 'error');
        } finally {
            hideLoader();
        }
    }
};



// ***************************************************
// FUNCIÓN: openModalActualizar (CON CABECERA E INFO DE TIPO)
// ***************************************************
window.openModalActualizar = (historiaId, desdeHistorial = false) => {
    // 1. Buscamos los datos maestros en el caché principal
    const actual = dataFull.find(a => a.historia == historiaId);
    if (!actual) return;

    // 2. Si venimos del historial, cerramos ese modal
    if (desdeHistorial) {
        const modalHistEl = document.getElementById('modal-historial');
        const modalHist = bootstrap.Modal.getInstance(modalHistEl);
        if (modalHist) modalHist.hide();
    }

    // 3. INYECTAR DATOS DEL ALOJAMIENTO EN EL HEADER
    const header = document.getElementById('act-info-header');
    if (header) {
        header.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span class="fw-bold text-dark">HISTORIA #${actual.historia}</span>
                <span class="badge bg-primary">${actual.EspeNombreA}</span>
            </div>
            <div class="text-truncate"><b>Protocolo:</b> ${actual.nprotA}</div>
            <div class="text-truncate"><b>Investigador:</b> ${actual.Investigador}</div>
        `;
    }

    // 4. LÓGICA DE TIPO DE CAJA Y ETIQUETA
    const esChica = parseFloat(actual.totalcajachica) > 0;
    const labelTipo = document.getElementById('act-label-tipo');
    
    if (labelTipo) {
        labelTipo.innerText = esChica ? "CANT. CAJAS CHICAS" : "CANT. CAJAS GRANDES";
    }

    // 5. MAPEO DE VALORES INICIALES
    document.getElementById('reg-fecha-qr').valueAsDate = new Date();
    document.getElementById('reg-cantidad-qr').value = esChica ? actual.totalcajachica : actual.totalcajagrande;
    document.getElementById('reg-obs-qr').value = "";

    // 6. PERSISTENCIA Y APERTURA
    const modalEl = document.getElementById('modal-actualizar-qr');
    modalEl.dataset.historia = historiaId;

    new bootstrap.Modal(modalEl).show();
};
// ***************************************************
// GUARDAR NUEVO TRAMO (Corrección de error 'f is undefined')
// ***************************************************
window.guardarNuevoTramo = async () => {
    const modalEl = document.getElementById('modal-actualizar-qr');
    const historiaId = modalEl.dataset.historia;

    // BUSQUEDA SEGURA: En lugar de currentHistoryData[0], buscamos en dataFull
    // que es la fuente de verdad de la tabla principal.
    const f = dataFull.find(a => a.historia == historiaId);

    // Validación de seguridad para evitar el error 'undefined'
    if (!f) {
        console.error("❌ Error: No se encontraron datos maestros para la historia:", historiaId);
        return Swal.fire('Error', 'No se pudo recuperar la información base del alojamiento.', 'error');
    }

    // Capturamos los valores de TU modal
    const nuevaFecha = document.getElementById('reg-fecha-qr').value;
    const nuevaCantidad = document.getElementById('reg-cantidad-qr').value;
    const nuevaObs = document.getElementById('reg-obs-qr').value;

    if (!nuevaFecha || !nuevaCantidad) {
        return Swal.fire('Atención', 'Fecha y Cantidad son obligatorias.', 'warning');
    }

    // Identificamos el tipo de caja para mantener la consistencia
    const esChica = parseFloat(f.totalcajachica) > 0;

    const payload = {
        fechavisado: nuevaFecha,
        // Si el registro original era caja chica, actualizamos caja chica
        totalcajachica: esChica ? nuevaCantidad : 0,
        totalcajagrande: !esChica ? nuevaCantidad : 0,
        observaciones: nuevaObs,
        // Datos técnicos heredados (obligatorios para la BD)
        idprotA: f.idprotA,
        IdUsrA: f.IdUsrA,
        historia: historiaId,
        IdInstitucion: localStorage.getItem('instId'),
        is_update: true // <--- Clave para que el backend cierre el tramo anterior
    };

    showLoader();
    try {
        const res = await API.request('/alojamiento/save', 'POST', payload);
        
        if (res.status === 'success') {
            // Cerrar el modal de Bootstrap
            const instModal = bootstrap.Modal.getInstance(modalEl);
            if (instModal) instModal.hide();

            Swal.fire({
                title: '¡Actualizado!',
                text: 'Nuevo tramo registrado correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            // Recargamos la tabla principal para ver los cambios
            await loadAlojamientos();
        } else {
            Swal.fire('Error', res.message || 'Error en el servidor', 'error');
        }
    } catch (e) {
        console.error("Error crítico en guardarNuevoTramo:", e);
        Swal.fire('Error', 'Fallo de conexión.', 'error');
    } finally {
        hideLoader();
    }
};

// ***************************************************
// 1. ABRIR MODAL DE EDICIÓN (Carga de datos)
// ***************************************************
// Localiza el tramo específico en el historial y rellena el modal de edición.
// ***************************************************
// 7. MODIFICACIÓN DE TRAMOS INDIVIDUALES
// ***************************************************



// ***************************************************
// 7. MODIFICACIÓN DE TRAMOS INDIVIDUALES
// ***************************************************
// ***************************************************
// 7. MODIFICACIÓN DE TRAMOS INDIVIDUALES
// ***************************************************
window.modificarTramo = (idAlojamiento) => {
    // 1. Buscamos el registro en el caché global del historial
    const row = window.currentHistoryData.find(h => h.IdAlojamiento == idAlojamiento);
    if (!row) return;

    // 2. Cerramos el historial para evitar conflictos visuales
    const modalHistEl = document.getElementById('modal-historial');
    const modalHist = bootstrap.Modal.getInstance(modalHistEl);
    if (modalHist) modalHist.hide();

    // 3. INYECTAR DATOS DEL ALOJAMIENTO (HEADER)
    const infoHeader = document.getElementById('edit-info-header');
    if (infoHeader) {
        infoHeader.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span><b>Reg:</b> #${row.IdAlojamiento}</span>
                <span><b>Hist:</b> #${row.historia}</span>
            </div>
            <div class="text-truncate"><b>Protocolo:</b> ${row.nprotA}</div>
            <div class="text-truncate"><b>Investigador:</b> ${row.Investigador}</div>
            <div><b>Especie:</b> ${row.EspeNombreA}</div>
        `;
    }

    // 4. LÓGICA DE VISIBILIDAD (Uso de IDs directos para evitar errores)
    const esChica = parseInt(row.totalcajachica) > 0;
    const divChica = document.getElementById('div-chica');
    const divGrande = document.getElementById('div-grande');

    if (esChica) {
        divChica.style.display = 'block';
        divGrande.style.display = 'none';
        document.getElementById('edit-caja-ch').value = row.totalcajachica;
        document.getElementById('edit-caja-gr').value = 0;
    } else {
        divChica.style.display = 'none';
        divGrande.style.display = 'block';
        document.getElementById('edit-caja-gr').value = row.totalcajagrande;
        document.getElementById('edit-caja-ch').value = 0;
    }

    // 5. LLENAR LOS CAMPOS DEL FORMULARIO
    document.getElementById('edit-id-alojamiento').value = row.IdAlojamiento;
    document.getElementById('edit-historia').value = row.historia;
    document.getElementById('edit-fecha-inicio').value = row.fechavisado;
    document.getElementById('edit-obs').value = row.observaciones || '';

    // 6. Abrir el modal
    new bootstrap.Modal(document.getElementById('modal-modificar-tramo')).show();
};
// ***************************************************
// 2. GUARDAR EDICIÓN (Petición API)
// ***************************************************
// Procesa los cambios, mantiene el tipo de caja original y actualiza la BD.
window.updateTramoData = async () => {
    // Recopilamos los datos del formulario de edición
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

    // Validación mínima
    if (!data.fechavisado) {
        return Swal.fire('Atención', 'La fecha de inicio es obligatoria.', 'warning');
    }

    showLoader();
    try {
        const res = await API.request('/alojamiento/update-row', 'POST', data);
        
        if (res.status === 'success') {
            // Cerramos el modal de edición
            const modalEdit = bootstrap.Modal.getInstance(document.getElementById('modal-modificar-tramo'));
            if (modalEdit) modalEdit.hide();

            Swal.fire({
                title: '¡Actualizado!',
                text: 'Los datos del tramo se han modificado correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            // Recargamos la tabla principal y re-abrimos el historial actualizado
            await loadAlojamientos();
            setTimeout(() => window.verHistorial(hId), 600);
        } else {
            Swal.fire('Error', res.message || 'No se pudo actualizar el tramo.', 'error');
        }
    } catch (e) {
        console.error("Error en updateTramoData:", e);
        Swal.fire('Error', 'Fallo de conexión con el servidor.', 'error');
    } finally {
        hideLoader();
    }
};


// ***************************************************
// FINALIZAR ESTADÍA (Cerrar Historia)
// ***************************************************
window.confirmarFinalizarRango = async (historiaId, ultimaFechaInicio) => {
    // 1. Configurar fecha de hoy para el cierre
    const hoy = new Date().toISOString().split('T')[0];

    // 2. Diálogo de confirmación
    const { value: fechaFin, isConfirmed } = await Swal.fire({
        title: 'Finalizar Alojamiento',
        html: `
            <div class="text-start small alert alert-warning">
                Se marcará la estadía como <b>FINALIZADA</b>. <br>
                El sistema calculará el costo total desde el último tramo hasta la fecha de retiro.
            </div>
            <label class="fw-bold small">FECHA DE RETIRO:</label>
            <input type="date" id="swal-fecha-fin" class="form-control" value="${hoy}" min="${ultimaFechaInicio}">
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR FINALIZACIÓN',
        confirmButtonColor: '#dc3545',
        preConfirm: () => {
            const f = document.getElementById('swal-fecha-fin').value;
            if (!f) return Swal.showValidationMessage("La fecha es obligatoria");
            return f;
        }
    });

    if (isConfirmed) {
        showLoader();
        try {
            // Enviamos el ID de historia y la fecha final
            const res = await API.request('/alojamiento/finalizar', 'POST', { 
                historia: historiaId,
                hastafecha: fechaFin,
                finalizado: 1 // Tu requerimiento: poner en 1 este atributo
            });

            if (res.status === 'success') {
                Swal.fire('¡Finalizado!', 'La estadía ha sido cerrada y facturada.', 'success');
                
                // Cerramos el historial y recargamos la tabla principal
                const modalHist = bootstrap.Modal.getInstance(document.getElementById('modal-historial'));
                if (modalHist) modalHist.hide();

                await loadAlojamientos(); 
            } else {
                Swal.fire('Error', res.message || 'No se pudo finalizar', 'error');
            }
        } catch (e) {
            console.error("Error al finalizar historia:", e);
        } finally {
            hideLoader();
        }
    }
};

// ***************************************************
// DESFINALIZAR (Re-abrir Historia)
// ***************************************************
window.confirmarDesfinalizar = async (historiaId) => {
    const { isConfirmed } = await Swal.fire({
        title: '¿Reabrir esta estadía?',
        text: "El último tramo volverá a quedar como 'VIGENTE' y se eliminará su fecha de cierre.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'SÍ, REABRIR',
        confirmButtonColor: '#f39c12'
    });

    if (isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/alojamiento/desfinalizar', 'POST', { historia: historiaId });
            if (res.status === 'success') {
                Swal.fire('Reabierto', 'La estadía está vigente nuevamente.', 'success');
                await loadAlojamientos();
                setTimeout(() => window.verHistorial(historiaId), 500);
            }
        } catch (e) { console.error(e); } finally { hideLoader(); }
    }
};