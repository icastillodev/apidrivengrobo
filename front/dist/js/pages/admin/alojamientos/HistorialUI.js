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
        window.cfgSelectProtocolo = this.cfgSelectProtocolo.bind(this);
        window.cfgSelectUsuario = this.cfgSelectUsuario.bind(this);
        window.cfgSelectEspecie = this.cfgSelectEspecie.bind(this);
        window.cfgSelectTipo = this.cfgSelectTipo.bind(this);
        window.guardarConfiguracionHistoria = this.guardarConfiguracionHistoria.bind(this);

        // Listeners de búsqueda en vivo para Configuración
        document.getElementById('cfg-search-prot')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#cfg-grid-protocolos tr').forEach(tr => {
                tr.style.display = tr.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
        document.getElementById('cfg-search-user')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#cfg-list-usuarios .list-group-item').forEach(li => {
                li.style.display = li.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
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

renderSummary(historiaId) {
        const summaryContainer = document.getElementById('historial-summary');
        if (summaryContainer && !document.getElementById('leyenda-trazabilidad')) {
            summaryContainer.insertAdjacentHTML('afterend', `
                <div id="leyenda-trazabilidad" class="alert alert-info py-2 small text-center mb-3 fw-bold shadow-sm" style="border-left: 4px solid #0dcaf0;">
                    <i class="bi bi-info-circle-fill me-1"></i> ${window.txt.alojamientos?.legend_click_row || 'Haga clic en una fila para ver la trazabilidad.'}
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
            
            let dias;

            if (esAbierto) {
                // TRAMO VIGENTE: Los días se calculan en vivo hasta HOY
                dias = Math.max(0, Math.floor((hoy - fIni)/(1000*60*60*24)));
            } else {
                // TRAMO CERRADO: Días fijos cerrados
                const pFin = h.hastafecha.split('-');
                const fFin = new Date(pFin[0], pFin[1]-1, pFin[2], 12,0,0);
                dias = Math.max(0, Math.floor((fFin - fIni)/(1000*60*60*24)));
            }
            
            // LA CLAVE: El Costo Total Superior es LA SUMA ESTRICTA DE LA BD (cuentaapagar). 
            // Si el tramo está abierto, sumará 0 porque aún no se cerró contablemente.
            totalCosto += parseFloat(h.cuentaapagar || 0);
            
            totalDias += dias; // Los días sí se siguen sumando todos
        });

        const txt = window.txt.alojamientos || {};
        const gen = window.txt.generales || {};
        const tipoCaja = first.NombreTipoAlojamiento || 'Tipo no definido';

        summaryContainer.innerHTML = `
            <div class="col-md-2 border-end text-center"><label class="d-block small text-muted fw-bold">${(txt.th_history || 'Historia').toUpperCase()}</label><span class="badge bg-dark fs-6">#${historiaId}</span></div>
            <div class="col-md-2 border-end">
                <label class="d-block small text-muted fw-bold mb-0">${(gen.investigador || 'Investigador').toUpperCase()}</label>
                <span class="text-dark small fw-bold text-uppercase d-block lh-1 mb-1" style="font-size: 11px;">${first.Investigador}</span>
                <div class="text-muted text-truncate" style="font-size: 9px;" title="${first.EmailInvestigador}">
                    <i class="bi bi-envelope-at-fill text-primary"></i> ${first.EmailInvestigador}
                </div>
                <div class="text-muted text-truncate" style="font-size: 9px;" title="${first.CelularInvestigador}">
                    <i class="bi bi-telephone-fill text-success"></i> ${first.CelularInvestigador}
                </div>
            </div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">PROTOCOL N°</label><span class="text-dark small">${first.nprotA}</span></div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">${(gen.especie || 'Especie').toUpperCase()}</label><span class="text-dark small">${first.EspeNombreA}</span></div>
            <div class="col-md-2 border-end"><label class="d-block small text-muted fw-bold">${(txt.type_box || 'Tipo').toUpperCase()}</label><span class="text-primary small fw-bold">${tipoCaja}</span></div> 
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
        const txt = window.txt.alojamientos || {};
        const gen = window.txt.generales || {};

        const tbody = document.getElementById('tbody-historial');
        if (!tbody) return;

        const thead = tbody.closest('table').querySelector('thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>${gen.id || 'ID'}</th> 
                    <th>${gen.inicio || 'Inicio'}</th>
                    <th>${gen.retiro || 'Retiro'}</th>
                    <th>${txt.th_boxes || 'Cant. (Tipo)'}</th>
                    <th>${txt.days_tramo || 'Días'}</th>
                    <th>${txt.price || 'Precio U.'}</th>
                    <th>${txt.subtotal || 'Subtotal'}</th>
                    <th>${txt.th_obs || 'Obs.'}</th>
                    <th>${txt.th_actions || 'Acciones'}</th>
                </tr>
            `;
        }

        tbody.innerHTML = history.map(h => {
            const esAbierto = !h.hastafecha;
            const pIni = h.fechavisado.split('-');
            const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
            
            const precioUnit = parseFloat(h.PrecioCajaMomento || 0);
            const cant = parseInt(h.CantidadCaja || 0);
            let diasTramo, subtotal, txtFin;

            if (esAbierto) {
                // TRAMO VIGENTE
                txtFin = txt.status_active || 'Vigente';
                diasTramo = Math.max(0, Math.floor((hoy - fIni) / (1000 * 60 * 60 * 24)));
                subtotal = (diasTramo * precioUnit * cant);
            } else {
                // TRAMO CERRADO
                const pFin = h.hastafecha.split('-');
                const fFin = new Date(pFin[0], pFin[1]-1, pFin[2], 12,0,0);
                txtFin = fFin.toLocaleDateString();
                diasTramo = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
                subtotal = parseFloat(h.cuentaapagar) > 0 ? parseFloat(h.cuentaapagar) : (diasTramo * precioUnit * cant);
            }

            const trMaster = `
            <tr class="pointer table-light" onclick="window.toggleTrazabilidad(${h.IdAlojamiento}, ${h.TipoAnimal || h.idespA})">
                <td><span class="badge bg-secondary">#${h.IdAlojamiento}</span></td>
                <td>${fIni.toLocaleDateString()}</td> 
                <td class="${esAbierto ? 'text-primary fw-bold' : ''}">${txtFin}</td>
                <td>${cant} <small class="text-muted">${h.NombreTipoAlojamiento || ''}</small></td>
                <td class="fw-bold">${diasTramo}</td>
                <td>$ ${precioUnit.toFixed(2)}</td>
                <td class="fw-bold text-dark">$ ${subtotal.toFixed(2)}</td>
                <td class="small italic text-muted">${h.observaciones || ''}</td>
                <td onclick="event.stopPropagation()">
                    <div class="btn-group">
                        <button class="btn btn-xs btn-outline-success" title="${txt.btn_edit_price || 'Editar Precio'}" onclick="window.modificarPrecioTramo(${h.IdAlojamiento}, ${h.PrecioCajaMomento})"><i class="bi bi-currency-dollar"></i></button>
                        <button class="btn btn-xs btn-outline-primary" title="${txt.btn_edit || 'Editar'}" onclick="window.modificarTramo(${h.IdAlojamiento})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-xs btn-outline-danger" title="${txt.btn_delete || 'Borrar'}" onclick="window.eliminarTramo(${h.IdAlojamiento}, ${h.historia})"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>`;

            const trDetail = `
            <tr id="trazabilidad-row-${h.IdAlojamiento}" class="d-none bg-white">
                <td colspan="9" class="p-0 border-0">
                    <div id="trazabilidad-content-${h.IdAlojamiento}" class="p-3 border-start border-4 border-primary shadow-inner bg-light">
                        <div class="text-center text-muted small"><div class="spinner-border spinner-border-sm"></div> ${txt.traceability_loading || 'Cargando trazabilidad...'}</div>
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

    // =========================================================
    // MODAL DE CONFIGURACIÓN DE HISTORIA (Edición Maestra)
    // =========================================================
    cfgSelections: { historia: null, idprotA: null, IdUsrA: null, idespA: null, IdTipoAlojamiento: null, departamento: null },
    cfgData: { protocolos: [], usuarios: [], deptos: [] },

    async abrirConfiguracion() {
        const first = AlojamientoState.currentHistoryData[0];
        if(!first) return;

        this.cfgSelections = {
            historia: first.historia,
            idprotA: parseInt(first.idprotA),
            IdUsrA: parseInt(first.IdUsrA),
            departamento: parseInt(first.departamento), // AGREGADO
            idespA: parseInt(first.TipoAnimal || first.idespA),
            IdTipoAlojamiento: parseInt(first.IdTipoAlojamiento)
        };

        document.getElementById('modal-cfg-title').innerText = `CONFIGURACIÓN MAESTRA - HISTORIA #${first.historia}`;

        showLoader();
        try {
            const [resProt, resUsr, resDepto] = await Promise.all([
                API.request(`/protocoloexpe/list?inst=${AlojamientoState.instId}`),
                API.request(`/users/institution`),
                API.request(`/deptos/list`) // AGREGADO
            ]);
            
            if (resProt.status === 'success') this.cfgData.protocolos = resProt.data;
            if (resUsr.status === 'success') this.cfgData.usuarios = resUsr.data;
            if (resDepto.status === 'success') this.cfgData.deptos = resDepto.data; // AGREGADO
            
        } catch(e) { console.error(e); }

        this.renderCfgProtocolos();
        this.renderCfgUsuarios();

        // AGREGADO: Renderizar y llenar select departamento
        const selDepto = document.getElementById('cfg-select-depto');
        if (selDepto) {
            selDepto.innerHTML = this.cfgData.deptos.map(d => 
                `<option value="${d.iddeptoA}">${d.NombreDeptoA} ${d.NombreOrganismoSimple ? `(${d.NombreOrganismoSimple})` : ''}</option>`
            ).join('');
            selDepto.value = this.cfgSelections.departamento || '';
            selDepto.onchange = (e) => { this.cfgSelections.departamento = parseInt(e.target.value); };
        }
        
        await this.loadCfgEspecies(this.cfgSelections.idprotA);
        hideLoader();

        const modalEl = document.getElementById('modal-config-historia');
        const modalObj = new bootstrap.Modal(modalEl);

        modalEl.addEventListener('shown.bs.modal', () => {
            this.cfgSelectProtocolo(this.cfgSelections.idprotA, true); 
            this.cfgSelectUsuario(this.cfgSelections.IdUsrA, true);
            if(this.cfgSelections.idespA) this.cfgSelectEspecie(this.cfgSelections.idespA, false);
            if(this.cfgSelections.IdTipoAlojamiento) this.cfgSelectTipo(this.cfgSelections.IdTipoAlojamiento);
        }, { once: true }); 

        modalObj.show();
    },

    cfgSelectProtocolo(id, isInit = false) {
        this.cfgSelections.idprotA = parseInt(id);
        
        document.querySelectorAll('#cfg-grid-protocolos tr').forEach(tr => tr.classList.remove('table-primary', 'border-primary'));
        const row = document.getElementById(`cfg-row-prot-${id}`);
        
        if (row) {
            row.classList.add('table-primary', 'border-primary');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        }

        // AGREGADO: Autoseleccionar departamento basado en el protocolo
        const prot = this.cfgData.protocolos.find(p => p.idprotA == id);
        if (prot && prot.departamento) {
            this.cfgSelections.departamento = parseInt(prot.departamento);
            const selDepto = document.getElementById('cfg-select-depto');
            if (selDepto) selDepto.value = prot.departamento;
        }

        if (!isInit) {
            this.cfgSelections.idespA = null;
            this.cfgSelections.IdTipoAlojamiento = null;
            this.loadCfgEspecies(id);
        }
    },

    cfgSelectUsuario(id, isInit = false) {
        this.cfgSelections.IdUsrA = parseInt(id);
        document.querySelectorAll('#cfg-list-usuarios .list-group-item').forEach(li => {
            li.classList.remove('active', 'bg-success', 'text-white', 'border-success');
            li.querySelector('b')?.classList.replace('text-white', 'text-dark');
        });
        
        const sel = document.getElementById(`cfg-item-usr-${id}`);
        if (sel) {
            sel.classList.add('active', 'bg-success', 'text-white', 'border-success');
            sel.querySelector('b')?.classList.replace('text-dark', 'text-white');
            sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        }
    },

    async loadCfgProtocolos() {
        try {
            const res = await API.request(`/protocoloexpe/list?inst=${AlojamientoState.instId}`);
            if (res.status === 'success') {
                this.cfgData.protocolos = res.data;
                this.renderCfgProtocolos(); // Reutiliza la funcion de render
            }
        } catch (e) { console.error(e); }
    },

    // Nueva funcion separada para renderizar
    renderCfgProtocolos() {
        const tbody = document.getElementById('cfg-grid-protocolos');
        if (!tbody) return;
        tbody.innerHTML = this.cfgData.protocolos.map(p => `
            <tr id="cfg-row-prot-${p.idprotA}" onclick="window.cfgSelectProtocolo(${p.idprotA})" class="transition-colors ${p.idprotA == this.cfgSelections.idprotA ? 'table-primary border-primary' : ''}">
                <td class="fw-bold text-muted">#${p.idprotA}</td>
                <td class="fw-bold text-primary">${p.nprotA}</td>
                <td class="text-truncate" style="max-width: 150px;">${p.tituloA || 'Sin Título'}</td>
                <td class="text-info fw-bold" style="font-size: 10px;">${p.DeptoProtocoloFormat || '---'}</td>
                <td class="text-muted"><i class="bi bi-person-fill"></i> ${p.ResponsableFormat || p.Investigador || 'Sin Asignar'}</td>
            </tr>
        `).join('');
    },

    async loadCfgUsuarios() {
        try {
            const res = await API.request(`/users/institution`);
            if (res.status === 'success') {
                this.cfgData.usuarios = res.data;
                this.renderCfgUsuarios(); // Reutiliza la funcion
            }
        } catch (e) { console.error(e); }
    },

    // Nueva funcion separada para renderizar
    renderCfgUsuarios() {
        const list = document.getElementById('cfg-list-usuarios');
        if (!list) return;
        list.innerHTML = this.cfgData.usuarios.map(u => `
            <div id="cfg-item-usr-${u.IdUsrA}" class="list-group-item list-group-item-action py-2 border-0 border-bottom ${u.IdUsrA == this.cfgSelections.IdUsrA ? 'active bg-success text-white border-success' : ''}" onclick="window.cfgSelectUsuario(${u.IdUsrA})">
                <div class="d-flex justify-content-between align-items-center">
                    <span><b class="${u.IdUsrA == this.cfgSelections.IdUsrA ? 'text-white' : 'text-dark'}">ID: ${u.IdUsrA}</b> | <span class="fw-bold">${u.NombreA || ''} ${u.ApellidoA || ''}</span></span>
                    <small class="badge bg-light text-dark border fst-italic">@${u.Usuario}</small>
                </div>
            </div>
        `).join('');
    },

    async loadCfgEspecies(idProt) {
        const container = document.getElementById('cfg-list-especies');
        container.innerHTML = '<div class="spinner-border spinner-border-sm text-warning"></div> Cargando...';
        
        document.getElementById('cfg-list-tipos').innerHTML = '<span class="small text-muted fst-italic">Seleccione una especie primero.</span>';

        try {
            const res = await API.request(`/protocols/current-species?id=${idProt}`);
            if (res.status === 'success' && res.data.length > 0) {
                container.innerHTML = res.data.map(s => `
                    <button type="button" id="cfg-btn-esp-${s.idespA}" class="btn btn-outline-secondary btn-sm fw-bold" onclick="window.cfgSelectEspecie(${s.idespA})">
                        <i class="bi bi-check-circle me-1 d-none" id="cfg-icon-esp-${s.idespA}"></i> ${s.EspeNombreA}
                    </button>
                `).join('');

                if (res.data.length === 1) {
                    this.cfgSelectEspecie(res.data[0].idespA);
                }
            } else {
                container.innerHTML = '<div class="alert alert-danger small p-2 w-100">Este protocolo no tiene especies asignadas.</div>';
            }
        } catch (e) { console.error(e); }
    },

    cfgSelectEspecie(id, reloadTipos = true) {
        this.cfgSelections.idespA = id;
        document.querySelectorAll('#cfg-list-especies button').forEach(btn => {
            btn.classList.remove('btn-warning', 'text-dark');
            btn.classList.add('btn-outline-secondary');
            btn.querySelector('i').classList.add('d-none');
        });
        
        const btn = document.getElementById(`cfg-btn-esp-${id}`);
        if(btn) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-warning', 'text-dark');
            btn.querySelector('i').classList.remove('d-none');
        }

        if(reloadTipos) {
            this.cfgSelections.IdTipoAlojamiento = null;
            this.loadCfgTipos(id);
        } else {
            this.loadCfgTipos(id);
        }
    },

    async loadCfgTipos(idEsp) {
        const container = document.getElementById('cfg-list-tipos');
        container.innerHTML = '<div class="spinner-border spinner-border-sm text-danger"></div> Buscando estructuras...';

        try {
            const res = await API.request(`/alojamiento/tipos-por-especie?idEsp=${idEsp}`);
            
            if (res.status === 'success') {
                const tipos = res.data;
                
                if (tipos.length > 0) {
                    container.innerHTML = tipos.map(t => `
                        <button type="button" id="cfg-btn-tipo-${t.IdTipoAlojamiento}" class="btn btn-outline-secondary btn-sm text-start" onclick="window.cfgSelectTipo(${t.IdTipoAlojamiento})">
                            <i class="bi bi-check-circle me-1 d-none" id="cfg-icon-tipo-${t.IdTipoAlojamiento}"></i> 
                            <b>${t.NombreTipoAlojamiento}</b> <span class="text-success ms-2">$${t.PrecioXunidad || 0}</span>
                        </button>
                    `).join('');

                    if(this.cfgSelections.IdTipoAlojamiento) {
                        this.cfgSelectTipo(this.cfgSelections.IdTipoAlojamiento);
                    }
                } else {
                    container.innerHTML = '<div class="alert alert-danger small p-2 m-0"><i class="bi bi-exclamation-circle"></i> No hay estructuras tarifadas para esta especie.</div>';
                }
            }
        } catch (e) { console.error("Error cargando tipos:", e); }
    },

    cfgSelectTipo(id) {
        this.cfgSelections.IdTipoAlojamiento = id;
        document.querySelectorAll('#cfg-list-tipos button').forEach(btn => {
            btn.classList.remove('btn-danger', 'text-white');
            btn.classList.add('btn-outline-secondary');
            btn.querySelector('i').classList.add('d-none');
        });
        
        const btn = document.getElementById(`cfg-btn-tipo-${id}`);
        if(btn) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-danger', 'text-white');
            btn.querySelector('i').classList.remove('d-none');
        }
    },

    async guardarConfiguracionHistoria() {
        // AGREGADO: Asegurar captura final del departamento
        const selDepto = document.getElementById('cfg-select-depto');
        if (selDepto) this.cfgSelections.departamento = parseInt(selDepto.value);

        const data = this.cfgSelections;
        if (!data.idprotA || !data.IdUsrA || !data.idespA || !data.IdTipoAlojamiento || !data.departamento) {
            return Swal.fire('Faltan Datos', 'Asegúrese de tener seleccionado un Protocolo, Usuario, Departamento, Especie y Estructura.', 'warning');
        }

        const confirm = await Swal.fire({
            title: '¿Confirmar Modificación?',
            text: `Se recalcularán los precios y se actualizará toda la historia #${data.historia}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'SÍ, APLICAR',
            confirmButtonColor: '#dc3545',
            target: document.getElementById('modal-config-historia')
        });

        if (confirm.isConfirmed) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/update-config', 'POST', data);
                if (res.status === 'success') {
                    bootstrap.Modal.getInstance(document.getElementById('modal-config-historia')).hide();
                    Swal.fire({title: 'Éxito', text: 'Se reconfiguró toda la historia.', icon: 'success', timer: 1500});
                    this.verHistorial(data.historia); 
                    loadAlojamientos(); 
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            } catch(e) { console.error(e); } finally { hideLoader(); }
        }
    }
}