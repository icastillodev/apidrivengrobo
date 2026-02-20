// dist/js/pages/admin/alojamientos/HistorialUI.js
import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { AlojamientoState, loadAlojamientos } from '../alojamientos.js';

export const HistorialUI = {
    init() {
        window.verHistorial = this.verHistorial.bind(this);
        window.confirmarFinalizarRango = this.confirmarFinalizarRango.bind(this);
        window.confirmarDesfinalizar = this.confirmarDesfinalizar.bind(this);
        window.abrirConfiguracion = this.abrirConfiguracion.bind(this);
    },

    async verHistorial(historiaId, event = null) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        
        try {
            showLoader(); 
            const res = await API.request(`/alojamiento/history?historia=${historiaId}`);
            if (res.status === 'success') {
                AlojamientoState.currentHistoryData = res.data; 
                if (AlojamientoState.currentHistoryData.length === 0) return;

                this.renderSummary(historiaId);
                this.renderTable();
                this.renderFooter(historiaId);
                
                new bootstrap.Modal(document.getElementById('modal-historial')).show();
            }
        } catch (e) { console.error(e); } finally { hideLoader(); }
    },
// dist/js/pages/admin/alojamientos/HistorialUI.js
// Remplaza renderSummary y renderTable enteros por esto:

renderSummary(historiaId) {
        const summaryContainer = document.getElementById('historial-summary');
        if (summaryContainer && !document.getElementById('leyenda-trazabilidad')) {
            summaryContainer.insertAdjacentHTML('afterend', `
                <div id="leyenda-trazabilidad" class="alert alert-info py-2 small text-center mb-3 fw-bold shadow-sm" style="border-left: 4px solid #0dcaf0;">
                    <i class="bi bi-info-circle-fill me-1"></i> ${window.txt.alojamientos.legend_click_row || 'Haga clic en una fila para ver la trazabilidad.'}
                </div>
            `);
        }
        if (!summaryContainer) return;

        const history = AlojamientoState.currentHistoryData;
        const first = history[0];
        const hoy = new Date(); hoy.setHours(12,0,0,0);

        let totalCosto = 0, totalDias = 0;

        history.forEach(h => {
            const esAbierto = !h.hastafecha;
            const pIni = h.fechavisado.split('-');
            const fIni = new Date(pIni[0], pIni[1]-1, pIni[2], 12,0,0);
            let fFin = esAbierto ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1]-1, h.hastafecha.split('-')[2], 12,0,0);

            let dias = Math.max(0, Math.floor((fFin - fIni)/(1000*60*60*24)));
            const precio = parseFloat(h.PrecioCajaMomento || 0);
            const cant = parseInt(h.CantidadCaja || 0);
            
            totalCosto += esAbierto ? (dias * precio * cant) : parseFloat(h.totalpago || 0);
            totalDias += dias;
        });

        const txt = window.txt.alojamientos || {};
        const gen = window.txt.generales || {};
        const tipoCaja = first.NombreTipoAlojamiento || 'Tipo no definido';

        summaryContainer.innerHTML = `
            <div class="col-md-2 border-end text-center"><label class="d-block small text-muted fw-bold">${(txt.th_history || 'Historia').toUpperCase()}</label><span class="badge bg-dark fs-6">#${historiaId}</span></div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">${(gen.investigador || 'Investigador').toUpperCase()}</label><span class="text-dark small fw-bold text-uppercase">${first.Investigador}</span></div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">PROTOCOL N°</label><span class="text-dark small">${first.nprotA}</span></div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">${(gen.especie || 'Especie').toUpperCase()}</label><span class="text-dark small">${first.EspeNombreA}</span></div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">${(txt.box_name || 'Tipo').toUpperCase()}</label><span class="text-primary small fw-bold">${tipoCaja}</span></div> 
            <div class="col-md-1 border-end text-center"><label class="d-block small text-muted fw-bold text-primary">${(txt.total_days || 'Días').toUpperCase()}</label><span class="fw-bold fs-5">${totalDias}</span></div>
            <div class="col-md-1 text-center"><label class="d-block small text-muted fw-bold text-success">${(txt.total_cost || 'Costo').toUpperCase()}</label><span class="fw-bold fs-6 text-success">$ ${totalCosto.toFixed(2)}</span></div>
            
            <div class="col-12 mt-3 pt-2 border-top">
                <label class="d-block small text-muted fw-bold text-uppercase">${txt.protocol_title || 'TÍTULO DEL PROTOCOLO'}</label>
                <span class="fw-semibold fst-italic text-secondary">${first.tituloA || '---'}</span>
            </div>
        `;
    },

renderTable() {
        const history = AlojamientoState.currentHistoryData;
        const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
        const txt = window.txt.alojamientos;
        const gen = window.txt.generales;

        const tbody = document.getElementById('tbody-historial');
        
        // BARRERA DE SEGURIDAD
        if (!tbody) {
            console.error("❌ CRÍTICO: No se encuentra el <tbody id='tbody-historial'> en el HTML.");
            return;
        }

        // Buscar el thead de forma segura (sin usar previousElementSibling)
        const thead = tbody.closest('table').querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>${gen.id}</th> 
                    <th>${gen.inicio}</th>
                    <th>${gen.retiro}</th>
                    <th>${txt.th_boxes}</th>
                    <th>${txt.days_tramo}</th>
                    <th>${txt.price}</th>
                    <th>${txt.subtotal}</th>
                    <th>${txt.th_obs}</th>
                    <th>${txt.th_actions}</th>
                </tr>
            `;
        }

        tbody.innerHTML = history.map(h => {
            const esAbierto = !h.hastafecha;
            const pIni = h.fechavisado.split('-');
            const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
            let fFin = esAbierto ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1]-1, h.hastafecha.split('-')[2], 12, 0, 0);

            let diasTramo = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
            
            // CÁLCULO EAV DINÁMICO
            const precioUnit = parseFloat(h.PrecioCajaMomento || 0);
            const cant = parseInt(h.CantidadCaja || 0);
            const subtotal = esAbierto ? (diasTramo * precioUnit * cant) : parseFloat(h.totalpago || 0);

            const trMaster = `
            <tr class="pointer table-light" onclick="window.toggleTrazabilidad(${h.IdAlojamiento}, ${h.TipoAnimal || h.idespA})">
                <td><span class="badge bg-secondary">#${h.IdAlojamiento}</span></td>
                <td>${fIni.toLocaleDateString()}</td> 
                <td class="${esAbierto ? 'text-primary fw-bold' : ''}">${esAbierto ? txt.status_active : fFin.toLocaleDateString()}</td>
                <td>${cant} <small class="text-muted">${h.NombreTipoAlojamiento || ''}</small></td>
                <td class="fw-bold">${diasTramo}</td>
                <td>$ ${precioUnit.toFixed(2)}</td>
                <td class="fw-bold">$ ${subtotal.toFixed(2)}</td>
                <td class="small italic text-muted">${h.observaciones || ''}</td>
            <td onclick="event.stopPropagation()">
                    <div class="btn-group">
                        <button class="btn btn-xs btn-outline-success" title="${txt.btn_edit_price || 'Editar Precio'}" onclick="window.modificarPrecioTramo(${h.IdAlojamiento}, ${h.PrecioCajaMomento})"><i class="bi bi-currency-dollar"></i></button>
                        <button class="btn btn-xs btn-outline-primary" title="${txt.btn_edit}" onclick="window.modificarTramo(${h.IdAlojamiento})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-xs btn-outline-danger" title="${txt.btn_delete}" onclick="window.eliminarTramo(${h.IdAlojamiento}, ${h.historia})"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>`;

            const trDetail = `
            <tr id="trazabilidad-row-${h.IdAlojamiento}" class="d-none bg-white">
                <td colspan="9" class="p-0 border-0">
                    <div id="trazabilidad-content-${h.IdAlojamiento}" class="p-3 border-start border-4 border-primary shadow-inner bg-light">
                        <div class="text-center text-muted small"><div class="spinner-border spinner-border-sm"></div> ${txt.traceability_loading}</div>
                    </div>
                </td>
            </tr>`;

            return trMaster + trDetail;
        }).join('');
    },

renderFooter(historiaId) {
        const history = AlojamientoState.currentHistoryData;
        const isFinalizado = history.some(h => String(h.finalizado) === "1");
        const footer = document.getElementById('historial-footer');
        const txt = window.txt.alojamientos;
        
        // Traducimos el título del modal dinámicamente aquí para aprovechar el flujo
        document.getElementById('historial-title').innerText = txt.history_record;

        if (isFinalizado) {
            footer.innerHTML = `
                <button type="button" class="btn btn-warning btn-sm fw-bold shadow-sm" onclick="window.confirmarDesfinalizar(${historiaId})">
                    <i class="bi bi-unlock-fill me-1"></i> ${txt.btn_unfinalize}
                </button>
                <span class="badge bg-danger px-3 py-2">${txt.badge_finished}</span>`;
        } else {
            const ultimaFecha = history[history.length - 1].fechavisado;
            footer.innerHTML = `
                <button type="button" class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.confirmarFinalizarRango(${historiaId}, '${ultimaFecha}')">
                    <i class="bi bi-check-circle-fill me-1"></i> ${txt.btn_finish}
                </button>
                <button type="button" class="btn btn-primary btn-sm fw-bold shadow-sm" onclick="window.openModalActualizar(${historiaId}, true)">
                    <i class="bi bi-plus-circle me-1"></i> ${txt.btn_update_stay}
                </button>`;
        }
    },

    async confirmarFinalizarRango(historiaId, ultimaFechaInicio) {
        const hoy = new Date().toISOString().split('T')[0];
        const { value: fechaFin, isConfirmed } = await Swal.fire({
            title: 'Finalizar Alojamiento',
            html: `<div class="text-start small alert alert-warning">Se marcará la estadía como <b>FINALIZADA</b>.<br>El sistema calculará el costo total.</div>
                   <label class="fw-bold small">FECHA DE RETIRO:</label>
                   <input type="date" id="swal-fecha-fin" class="form-control" value="${hoy}" min="${ultimaFechaInicio}">`,
            icon: 'info', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'CONFIRMAR FINALIZACIÓN',
            preConfirm: () => document.getElementById('swal-fecha-fin').value || Swal.showValidationMessage("La fecha es obligatoria")
        });

        if (isConfirmed) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/finalizar', 'POST', { historia: historiaId, hastafecha: fechaFin, finalizado: 1 });
                if (res.status === 'success') {
                    Swal.fire('¡Finalizado!', 'La estadía ha sido cerrada y facturada.', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('modal-historial'))?.hide();
                    await loadAlojamientos(); 
                } else Swal.fire('Error', res.message, 'error');
            } catch (e) { console.error(e); } finally { hideLoader(); }
        }
    },

    async confirmarDesfinalizar(historiaId) {
        const { isConfirmed } = await Swal.fire({
            title: '¿Reabrir esta estadía?',
            text: "El último tramo volverá a quedar como 'VIGENTE'.",
            icon: 'question', showCancelButton: true, confirmButtonColor: '#f39c12', confirmButtonText: 'SÍ, REABRIR'
        });

        if (isConfirmed) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/desfinalizar', 'POST', { historia: historiaId });
                if (res.status === 'success') {
                    Swal.fire('Reabierto', 'La estadía está vigente nuevamente.', 'success');
                    await loadAlojamientos();
                    setTimeout(() => this.verHistorial(historiaId), 500);
                }
            } catch (e) { console.error(e); } finally { hideLoader(); }
        }
    },

async abrirConfiguracion() {
        const first = AlojamientoState.currentHistoryData[0];
        const instId = AlojamientoState.instId;

        // 1. OBTENER PROTOCOLOS
        let protocols = [];
        try {
            const res = await API.request(`/protocoloexpe/list?inst=${instId}`);
            if (res.status === 'success') protocols = res.data;
        } catch(e) {}

        const txt = window.txt.alojamientos;

        // 2. HTML DEL MODAL (Muestra Valores Actuales por Defecto)
        const html = `
            <div class="text-start small p-2">
                <div class="alert alert-danger py-2 px-3 mb-3 fw-bold" style="font-size:11px;">
                    <i class="bi bi-exclamation-triangle-fill"></i> ${txt.cfg_warning || 'Se alterará toda la historia.'}
                </div>

                <label class="fw-bold text-muted text-uppercase mb-1">Buscar Protocolo Vigente</label>
                <input type="text" id="cfg-search-prot" class="form-control form-control-sm mb-1" placeholder="Buscar...">
                <select id="cfg-select-prot" class="form-select form-select-sm shadow-sm mb-3" size="3">
                    ${protocols.map(p => `<option value="${p.idprotA}" ${p.idprotA == first.idprotA ? 'selected' : ''}>[${p.nprotA}] ${p.tituloA}</option>`).join('')}
                </select>

                <label class="fw-bold text-muted text-uppercase mb-1">Especie y Tipo (Afectará Precios)</label>
                <select id="cfg-select-esp" class="form-select form-select-sm mb-1 disabled" disabled><option>Cargando...</option></select>
                <select id="cfg-select-tipo" class="form-select form-select-sm border-primary disabled" disabled><option>Cargando...</option></select>
            </div>
        `;

        const swalModal = await Swal.fire({
            title: `${txt.btn_config} #${first.historia}`,
            html: html,
            showCancelButton: true,
            confirmButtonText: 'SIGUIENTE <i class="bi bi-arrow-right"></i>',
            confirmButtonColor: '#0d6efd',
            target: document.getElementById('modal-historial'), // Para que no se bloquee
            didOpen: async () => {
                const selProt = document.getElementById('cfg-select-prot');
                const selEsp = document.getElementById('cfg-select-esp');
                const selTipo = document.getElementById('cfg-select-tipo');

                const loadEspecies = async (idProt, preselectId = null) => {
                    selEsp.innerHTML = '<option>Cargando...</option>';
                    selTipo.innerHTML = '<option>Esperando...</option>';
                    const res = await API.request(`/protocols/current-species?id=${idProt}`);
                    selEsp.innerHTML = res.data.map(s => `<option value="${s.idespA}" ${s.idespA == preselectId ? 'selected' : ''}>${s.EspeNombreA}</option>`).join('');
                    selEsp.disabled = false;
                    await loadTipos(selEsp.value, first.IdTipoAlojamiento);
                };

                const loadTipos = async (idEsp, preselectId = null) => {
                    const res = await API.request(`/precios/all-data`);
                    const tipos = res.data.alojamientos.filter(t => t.idespA == idEsp && t.Habilitado == 1);
                    selTipo.innerHTML = tipos.map(t => `<option value="${t.IdTipoAlojamiento}" ${t.IdTipoAlojamiento == preselectId ? 'selected' : ''}>${t.NombreTipoAlojamiento} ($${t.PrecioXunidad})</option>`).join('');
                    selTipo.disabled = false;
                };

                selProt.addEventListener('change', (e) => loadEspecies(e.target.value));
                selEsp.addEventListener('change', (e) => loadTipos(e.target.value));

                document.getElementById('cfg-search-prot').addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    Array.from(selProt.options).forEach(opt => { opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none'; });
                });

                // Cargar datos actuales preseleccionados
                await loadEspecies(selProt.value, first.TipoAnimal || first.idespA);
            },
            preConfirm: () => {
                const selProt = document.getElementById('cfg-select-prot');
                const selEsp = document.getElementById('cfg-select-esp');
                const selTipo = document.getElementById('cfg-select-tipo');
                return {
                    historia: first.historia,
                    idprotA: selProt.value,
                    idespA: selEsp.value,
                    IdTipoAlojamiento: selTipo.value,
                    // Capturamos el texto para la pantalla de confirmación final
                    txtProt: selProt.options[selProt.selectedIndex]?.text,
                    txtEsp: selEsp.options[selEsp.selectedIndex]?.text,
                    txtTipo: selTipo.options[selTipo.selectedIndex]?.text
                };
            }
        });

        // 3. PANTALLA DE CONFIRMACIÓN FINAL
        if (swalModal.isConfirmed) {
            const data = swalModal.value;
            const confirm = await Swal.fire({
                title: '¿Confirmar Modificación?',
                html: `
                    <div class="text-start bg-light p-3 rounded border">
                        <p class="mb-1"><b>Protocolo:</b> <span class="text-primary">${data.txtProt}</span></p>
                        <p class="mb-1"><b>Especie:</b> <span class="text-primary">${data.txtEsp}</span></p>
                        <p class="mb-0"><b>Tipo/Costo:</b> <span class="text-primary">${data.txtTipo}</span></p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-exclamation-triangle"></i> APLICAR CAMBIOS',
                confirmButtonColor: '#dc3545',
                target: document.getElementById('modal-historial')
            });

            if (confirm.isConfirmed) {
                showLoader();
                try {
                    await API.request('/alojamiento/update-config', 'POST', data);
                    Swal.fire({title: 'Éxito', text: 'Se actualizó la historia completa.', icon: 'success', target: document.getElementById('modal-historial')});
                    this.verHistorial(first.historia); // Refresca Modal Historial
                    loadAlojamientos(); // Refresca Grilla
                } catch(e) { console.error(e); } finally { hideLoader(); }
            }
        }
    }
};