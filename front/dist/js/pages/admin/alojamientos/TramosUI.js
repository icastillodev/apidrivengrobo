// dist/js/pages/admin/alojamientos/TramosUI.js
import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { AlojamientoState, loadAlojamientos } from '../alojamientos.js';

export const TramosUI = {
    init() {
        window.openModalActualizar = this.openModalActualizar.bind(this);
        window.guardarNuevoTramo = this.guardarNuevoTramo.bind(this);
        window.modificarTramo = this.modificarTramo.bind(this);
        window.updateTramoData = this.updateTramoData.bind(this);
        window.eliminarTramo = this.eliminarTramo.bind(this);
        window.modificarPrecioTramo = this.modificarPrecioTramo.bind(this);
        
        // Función global para apagar/prender los checkboxes de los animales si se apaga la caja
        window.toggleCajaCheckbox = (idCaja) => {
            const cajaActiva = document.getElementById(`cont_caja_${idCaja}`).checked;
            document.querySelectorAll(`.child-of-caja-${idCaja}`).forEach(chk => {
                chk.checked = cajaActiva;
                chk.disabled = !cajaActiva; 
            });
            const cajasActivas = document.querySelectorAll('.check-caja-continuidad:checked').length;
            const inputCant = document.getElementById('reg-cantidad-qr');
            if (inputCant && parseInt(inputCant.value) > cajasActivas) {
                inputCant.value = cajasActivas;
            }
        };
    },

    /** Misma fuente que la grilla (TableUI) + comparación numérica por si historia viene string/number distinto */
    findRowByHistoria(historiaId) {
        const hid = Number(historiaId);
        if (!Number.isFinite(hid) || hid <= 0) return null;
        const raw = (typeof window !== 'undefined' && window.__AlojamientoState && window.__AlojamientoState.dataFull)
            ? window.__AlojamientoState.dataFull
            : (AlojamientoState.dataFull || []);
        return raw.find(a => Number(a.historia) === hid) || null;
    },

    async openModalActualizar(historiaId, desdeHistorial = false) {
        let actual;
        const hid = Number(historiaId);

        // Si venimos del modal de historial, usamos el último tramo cargado ahí
        if (desdeHistorial && AlojamientoState.currentHistoryData && AlojamientoState.currentHistoryData.length > 0) {
            actual = AlojamientoState.currentHistoryData[AlojamientoState.currentHistoryData.length - 1];
            bootstrap.Modal.getInstance(document.getElementById('modal-historial'))?.hide();
        } else {
            actual = this.findRowByHistoria(hid);
            // Fallback: la grilla puede estar desincronizada o el find fallar por tipos → mismo endpoint que el historial
            if (!actual) {
                try {
                    showLoader();
                    const res = await API.request(`/alojamiento/history?historia=${hid}`);
                    if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
                        actual = res.data[res.data.length - 1];
                    }
                } catch (e) {
                    console.error('openModalActualizar history fallback', e);
                } finally {
                    hideLoader();
                }
            }
        }

        if (!actual) {
            const t = window.txt?.alojamientos || {};
            const gen = window.txt?.generales || {};
            if (typeof Swal !== 'undefined') {
                Swal.fire(gen.atencion || 'Atención', t.upd_error_no_row || 'No se encontró la historia.', 'warning');
            }
            return;
        }

        document.getElementById('act-info-header').innerHTML = `
            <div class="d-flex justify-content-between mb-1"><span class="fw-bold text-dark">${(window.txt?.generales?.historia || 'HISTORIA')} #${actual.historia}</span><span class="badge bg-primary">${actual.EspeNombreA}</span></div>
            <div class="text-truncate"><b>${window.txt?.alojamientos?.reg_step1?.replace('1. ', '') || 'Protocolo'}:</b> ${actual.nprotA}</div>
        `;

        document.getElementById('reg-fecha-qr').valueAsDate = new Date();
        document.getElementById('reg-cantidad-qr').value = actual.CantidadCaja || 1;
        const tipoInput = document.getElementById('reg-tipo-nombre-qr');
        if (tipoInput) tipoInput.value = actual.NombreTipoAlojamiento || window.txt?.alojamientos?.box_name || 'Caja';
        document.getElementById('reg-obs-qr').value = "";

        const modalEl = document.getElementById('modal-actualizar-qr');
        if (!modalEl) return;
        modalEl.dataset.historia = String(actual.historia ?? hid);
        modalEl.dataset.idTramoActual = actual.IdAlojamiento;
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

        // Carga el árbol físico usando el ID correcto del último tramo
        await this.loadContinuityTree(actual.IdAlojamiento, actual.TipoAnimal || actual.idespA);
    },

    async loadContinuityTree(idAlojamiento, idEspecie) {
        const container = document.getElementById('arbol-continuidad-container');
        if (!container) return;

        const txt = window.txt?.alojamientos || {};
        container.innerHTML = `<div class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm"></div> ${txt.continuity_searching || 'Buscando animales...'}</div>`;
        
        try {
            const instId = localStorage.getItem('instId') || 1;
            const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${idAlojamiento}&idEspecie=${idEspecie}&instId=${instId}`);
            
            if (res.status === 'success' && res.data.cajas && res.data.cajas.length > 0) {
                let html = `<label class="small fw-bold text-primary mb-3"><i class="bi bi-diagram-3-fill"></i> ${txt.continuity_uncheck_label || 'DESMARQUE LOS ANIMALES O CAJAS...'}</label>`;
                html += `<div class="accordion accordion-flush border rounded" id="acc-continuidad">`; 
                
                res.data.cajas.forEach(caja => {
                    html += `
                    <div class="accordion-item mb-1 shadow-sm border-bottom">
                        <h2 class="accordion-header d-flex align-items-center bg-light px-3 py-2">
                            <div class="form-check form-switch m-0 me-3">
                                <input class="form-check-input check-caja-continuidad" type="checkbox" id="cont_caja_${caja.IdCajaAlojamiento}" value="${caja.IdCajaAlojamiento}" checked onchange="window.toggleCajaCheckbox(${caja.IdCajaAlojamiento})">
                            </div>
                            <button class="accordion-button collapsed py-1 px-2 bg-light fw-bold small text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#col-caja-${caja.IdCajaAlojamiento}">
                                ${caja.NombreCaja || (window.txt?.alojamientos?.box_name + ' #' + caja.IdCajaAlojamiento)} <span class="badge bg-secondary ms-2">${caja.unidades ? caja.unidades.length : 0} ${txt.continuity_subjects || 'Sujetos'}</span>
                            </button>
                        </h2>
                        <div id="col-caja-${caja.IdCajaAlojamiento}" class="accordion-collapse collapse" data-bs-parent="#acc-continuidad">
                            <div class="accordion-body p-2 bg-white" id="cont_unidades_caja_${caja.IdCajaAlojamiento}">`;
                    
                    if(caja.unidades && caja.unidades.length > 0) {
                        caja.unidades.forEach(u => {
                            html += `
                                <div class="form-check ps-4 py-2 border-bottom">
                                    <input class="form-check-input check-unidad-continuidad child-of-caja-${caja.IdCajaAlojamiento}" type="checkbox" id="cont_uni_${u.IdEspecieAlojUnidad}" value="${u.IdEspecieAlojUnidad}" checked>
                                    <label class="form-check-label small text-secondary fw-bold" for="cont_uni_${u.IdEspecieAlojUnidad}">🐾 ${u.NombreEspecieAloj}</label>
                                </div>`;
                        });
                    } else {
                        html += `<div class="text-muted small fst-italic px-3 py-2">${txt.continuity_no_subjects || 'No hay sujetos asignados a esta caja.'}</div>`;
                    }
                    html += `</div></div></div>`;
                });
                html += `</div>`;
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div class="alert alert-warning small m-0"><i class="bi bi-info-circle me-1"></i> ${txt.continuity_no_boxes || 'No hay cajas físicas registradas.'}</div>`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="text-danger small py-2">${txt.continuity_error_layout || 'Error cargando el layout físico.'}</div>`;
        }
    },

async guardarNuevoTramo() {
        const modalEl = document.getElementById('modal-actualizar-qr');
        const historiaId = modalEl.dataset.historia;
        const idTramoViejo = modalEl.dataset.idTramoActual;
        const f = this.findRowByHistoria(historiaId);
        const txt = window.txt?.alojamientos || {};

        if (!f) return Swal.fire('Error', txt.tramo_error_base || 'No se pudo recuperar información base.', 'error');

        const nuevaFecha = document.getElementById('reg-fecha-qr').value;
        const rawCantidad = document.getElementById('reg-cantidad-qr').value;
        const nuevaCantidad = rawCantidad !== "" ? parseInt(rawCantidad) : null;
        
        if (!nuevaFecha || nuevaCantidad === null || nuevaCantidad < 0) {
            return Swal.fire(window.txt?.generales?.atencion || 'Atención', txt.tramo_attention_date_qty || 'Fecha y Cantidad (puede ser 0) son obligatorias.', 'warning');
        }

        // Capturamos lo que está checkeado (usamos LET porque podríamos vaciarlos)
        let cajasClonar = Array.from(document.querySelectorAll('.check-caja-continuidad:checked')).map(cb => parseInt(cb.value));
        let unidadesClonar = Array.from(document.querySelectorAll('.check-unidad-continuidad:checked:not(:disabled)')).map(cb => parseInt(cb.value));

        // 🔥 MAGIA DE STAND BY AUTOMÁTICA 🔥
        if (nuevaCantidad === 0) {
            // Si declaran 0 cajas, vaciamos la clonación automáticamente sin molestar al usuario.
            cajasClonar = [];
            unidadesClonar = [];
        } else if (nuevaCantidad < cajasClonar.length) {
            // Solo validamos si es mayor a 0 pero intentan traer más cajas físicas de las que declararon.
            const txt = window.txt?.alojamientos || {};
            const msg = (txt.tramo_incoherence || 'Has marcado {n} caja(s) para continuar, pero indicaste un límite total de {max} cajas.').replace('{n}', cajasClonar.length).replace('{max}', nuevaCantidad);
            return Swal.fire(
                window.txt?.generales?.atencion || 'Incoherencia Física', 
                msg, 
                'warning'
            );
        }

        const tipoAlojamiento = parseInt(f.IdTipoAlojamiento) > 0 ? parseInt(f.IdTipoAlojamiento) : 1; 

        const payload = {
            fechavisado: nuevaFecha,
            CantidadCaja: nuevaCantidad,
            IdTipoAlojamiento: tipoAlojamiento,
            observaciones: document.getElementById('reg-obs-qr').value || "",
            idprotA: f.idprotA, 
            IdUsrA: f.IdUsrA, 
            historia: historiaId,
            TipoAnimal: f.TipoAnimal || f.idespA,
            IdInstitucion: AlojamientoState.instId, 
            is_update: true,
            continuidad: {
                idTramoOrigen: idTramoViejo,
                cajas: cajasClonar,
                unidades: unidadesClonar
            }
        };

        showLoader();
        try {
            const res = await API.request('/alojamiento/save', 'POST', payload);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(modalEl)?.hide();
                const txt = window.txt?.alojamientos || {};
                Swal.fire({ 
                    title: txt.tramo_success_title || '¡Tramo Generado!', 
                    text: nuevaCantidad === 0 ? (txt.tramo_standby || 'Tramo en Stand By iniciado.') : (txt.tramo_new_period || 'Nuevo periodo contable abierto.'), 
                    icon: 'success', 
                    timer: 1500, 
                    showConfirmButton: false 
                });
                await loadAlojamientos();
                setTimeout(() => window.verHistorial(historiaId), 500);
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (e) { console.error(e); } finally { hideLoader(); }
    },

    // ---------------------------------------------------------
    // FUNCIONES CLÁSICAS DE EDICIÓN
    // ---------------------------------------------------------

    modificarTramo(idAlojamiento) {
        const row = AlojamientoState.currentHistoryData.find(h => h.IdAlojamiento == idAlojamiento);
        if (!row) return;

        bootstrap.Modal.getInstance(document.getElementById('modal-historial'))?.hide();

        document.getElementById('edit-info-header').innerHTML = `
            <div class="d-flex justify-content-between mb-1"><span><b>${window.txt?.generales?.reg || 'Reg'}:</b> #${row.IdAlojamiento}</span><span><b>${window.txt?.alojamientos?.th_history || 'Hist'}:</b> #${row.historia}</span></div>
            <div class="text-truncate"><b>${window.txt?.alojamientos?.reg_step1?.replace('1. ', '') || 'Protocolo'}:</b> ${row.nprotA}</div>
        `;

        document.getElementById('edit-caja-cant').value = row.CantidadCaja || 0;
        document.getElementById('edit-id-alojamiento').value = row.IdAlojamiento;
        document.getElementById('edit-historia').value = row.historia;
        document.getElementById('edit-fecha-inicio').value = row.fechavisado;
        document.getElementById('edit-obs').value = row.observaciones || '';

        new bootstrap.Modal(document.getElementById('modal-modificar-tramo')).show();
    },

async updateTramoData(event) {
    if (event) event.preventDefault();
    const hId = document.getElementById('edit-historia').value;
    const rawCant = document.getElementById('edit-caja-cant').value;
    
    const data = {
        IdAlojamiento: parseInt(document.getElementById('edit-id-alojamiento').value),
        historia: parseInt(hId), 
        fechavisado: document.getElementById('edit-fecha-inicio').value,
        // Parseo seguro del 0
        CantidadCaja: rawCant !== "" ? parseInt(rawCant) : 0, 
        observaciones: document.getElementById('edit-obs').value || "",
        IdInstitucion: AlojamientoState.instId
    };

    if (!data.fechavisado) return Swal.fire(window.txt?.generales?.atencion || 'Atención', (window.txt?.alojamientos?.tramo_fecha_required || 'Fecha requerida.'), 'warning');

    showLoader();
    try {
        const res = await API.request('/alojamiento/update-row', 'POST', data);
        if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-modificar-tramo'))?.hide();
            const txt = window.txt?.alojamientos || {};
            Swal.fire({ title: txt.cfg_exito || 'Éxito', text: txt.tramo_success_updated || 'Tramo actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
            await loadAlojamientos();
            setTimeout(() => window.verHistorial(hId), 600);
        } else Swal.fire('Error', res.message, 'error');
    } catch (e) { console.error(e); } finally { hideLoader(); }
},

    async eliminarTramo(idAlojamiento, historiaId) {
        const txt = window.txt?.alojamientos || {};
        const { isConfirmed } = await Swal.fire({
            title: txt.tramo_delete_title || '¿Eliminar?', text: txt.tramo_delete_text || "Se borrará este tramo y sus observaciones.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545'
        });

        if (isConfirmed) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/delete-row', 'POST', { IdAlojamiento: idAlojamiento, historia: historiaId });
                if (res.status === 'success') {
                    Swal.fire({ title: txt.tramo_deleted || 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
                    await loadAlojamientos();
                    setTimeout(() => window.verHistorial(historiaId), 500);
                } else Swal.fire('Error', res.message, 'error');
            } catch (e) { console.error(e); } finally { hideLoader(); }
        }
    },

    async modificarPrecioTramo(idAlojamiento, precioActual) {
        const { value: nuevoPrecio } = await Swal.fire({
            title: window.txt.alojamientos.edit_price_title || 'Modificar Precio del Tramo',
            text: window.txt.alojamientos.edit_price_desc || 'Este cambio afectará solo al costo de este tramo específico.',
            input: 'number',
            inputValue: precioActual,
            target: document.getElementById('modal-historial') || 'body',
            showCancelButton: true,
            confirmButtonText: window.txt?.alojamientos?.tramo_guardar_precio || 'Guardar Precio',
            inputValidator: (value) => {
                if (!value || value < 0) return (window.txt?.alojamientos?.tramo_precio_invalido || 'Ingrese un precio válido');
            }
        });

        if (nuevoPrecio && nuevoPrecio != precioActual) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/update-price', 'POST', { IdAlojamiento: idAlojamiento, precio: nuevoPrecio });
                if (res.status === 'success') {
                    const historiaId = AlojamientoState.currentHistoryData[0].historia;
                    await loadAlojamientos();
                    setTimeout(() => window.verHistorial(historiaId), 500);
                }
            } catch (e) { console.error(e); } finally { hideLoader(); }
        }
    }
};