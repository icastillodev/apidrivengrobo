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

    async openModalActualizar(historiaId, desdeHistorial = false) {
        let actual;
        
        // MAGIA: Si venimos del historial, extraemos estrictamente el ÚLTIMO tramo activo de la lista
        if (desdeHistorial && AlojamientoState.currentHistoryData && AlojamientoState.currentHistoryData.length > 0) {
            actual = AlojamientoState.currentHistoryData[AlojamientoState.currentHistoryData.length - 1];
            bootstrap.Modal.getInstance(document.getElementById('modal-historial'))?.hide();
        } else {
            actual = AlojamientoState.dataFull.find(a => a.historia == historiaId);
        }

        if (!actual) return;

        document.getElementById('act-info-header').innerHTML = `
            <div class="d-flex justify-content-between mb-1"><span class="fw-bold text-dark">HISTORIA #${actual.historia}</span><span class="badge bg-primary">${actual.EspeNombreA}</span></div>
            <div class="text-truncate"><b>Protocolo:</b> ${actual.nprotA}</div>
        `;

        document.getElementById('reg-fecha-qr').valueAsDate = new Date();
        document.getElementById('reg-cantidad-qr').value = actual.CantidadCaja || 1;
        const tipoInput = document.getElementById('reg-tipo-nombre-qr');
        if (tipoInput) tipoInput.value = actual.NombreTipoAlojamiento || window.txt.alojamientos.box_name;
        document.getElementById('reg-obs-qr').value = "";

        const modalEl = document.getElementById('modal-actualizar-qr');
        modalEl.dataset.historia = historiaId;
        modalEl.dataset.idTramoActual = actual.IdAlojamiento; 
        new bootstrap.Modal(modalEl).show();

        // Carga el árbol físico usando el ID correcto del último tramo
        await this.loadContinuityTree(actual.IdAlojamiento, actual.TipoAnimal || actual.idespA);
    },

    async loadContinuityTree(idAlojamiento, idEspecie) {
        const container = document.getElementById('arbol-continuidad-container');
        if (!container) return;

        container.innerHTML = `<div class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm"></div> Buscando animales en el alojamiento actual...</div>`;
        
        try {
            const instId = localStorage.getItem('instId') || 1;
            const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${idAlojamiento}&idEspecie=${idEspecie}&instId=${instId}`);
            
            if (res.status === 'success' && res.data.cajas && res.data.cajas.length > 0) {
                let html = `<label class="small fw-bold text-primary mb-3"><i class="bi bi-diagram-3-fill"></i> DESMARQUE LOS ANIMALES O CAJAS QUE NO CONTINUARÁN EN ESTE NUEVO TRAMO:</label>`;
                html += `<div class="accordion accordion-flush border rounded" id="acc-continuidad">`; 
                
                res.data.cajas.forEach(caja => {
                    html += `
                    <div class="accordion-item mb-1 shadow-sm border-bottom">
                        <h2 class="accordion-header d-flex align-items-center bg-light px-3 py-2">
                            <div class="form-check form-switch m-0 me-3">
                                <input class="form-check-input check-caja-continuidad" type="checkbox" id="cont_caja_${caja.IdCajaAlojamiento}" value="${caja.IdCajaAlojamiento}" checked onchange="window.toggleCajaCheckbox(${caja.IdCajaAlojamiento})">
                            </div>
                            <button class="accordion-button collapsed py-1 px-2 bg-light fw-bold small text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#col-caja-${caja.IdCajaAlojamiento}">
                                ${caja.NombreCaja || 'Caja #' + caja.IdCajaAlojamiento} <span class="badge bg-secondary ms-2">${caja.unidades ? caja.unidades.length : 0} Sujetos</span>
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
                        html += `<div class="text-muted small fst-italic px-3 py-2">No hay sujetos asignados a esta caja.</div>`;
                    }
                    html += `</div></div></div>`;
                });
                html += `</div>`;
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div class="alert alert-warning small m-0"><i class="bi bi-info-circle me-1"></i> No hay cajas físicas registradas en el tramo actual. Se generará un nuevo tramo limpio.</div>`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="text-danger small py-2">Error cargando el layout físico.</div>`;
        }
    },

    async guardarNuevoTramo() {
        const modalEl = document.getElementById('modal-actualizar-qr');
        const historiaId = modalEl.dataset.historia;
        const idTramoViejo = modalEl.dataset.idTramoActual;
        const f = AlojamientoState.dataFull.find(a => a.historia == historiaId);

        if (!f) return Swal.fire('Error', 'No se pudo recuperar información base.', 'error');

        const nuevaFecha = document.getElementById('reg-fecha-qr').value;
        const nuevaCantidad = parseInt(document.getElementById('reg-cantidad-qr').value) || 0;
        
        if (!nuevaFecha || nuevaCantidad <= 0) return Swal.fire('Atención', 'Fecha y Cantidad son obligatorias.', 'warning');

        // Capturar los IDs de lo que está checkeado
        const cajasClonar = Array.from(document.querySelectorAll('.check-caja-continuidad:checked')).map(cb => parseInt(cb.value));
        const unidadesClonar = Array.from(document.querySelectorAll('.check-unidad-continuidad:checked:not(:disabled)')).map(cb => parseInt(cb.value));

        if (nuevaCantidad < cajasClonar.length) {
            return Swal.fire('Atención', `Has marcado ${cajasClonar.length} cajas para continuar, pero indicaste un total físico de ${nuevaCantidad} cajas.`, 'warning');
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
            // Mandamos el motor de clonación
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
                Swal.fire({ title: '¡Tramo Generado!', text: 'Se ha abierto el nuevo periodo contable.', icon: 'success', timer: 1500, showConfirmButton: false });
                await loadAlojamientos();
                setTimeout(() => window.verHistorial(historiaId), 500);
            } else Swal.fire('Error', res.message, 'error');
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
            <div class="d-flex justify-content-between mb-1"><span><b>Reg:</b> #${row.IdAlojamiento}</span><span><b>Hist:</b> #${row.historia}</span></div>
            <div class="text-truncate"><b>Protocolo:</b> ${row.nprotA}</div>
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
        const data = {
            IdAlojamiento: parseInt(document.getElementById('edit-id-alojamiento').value),
            historia: parseInt(hId), 
            fechavisado: document.getElementById('edit-fecha-inicio').value,
            CantidadCaja: parseInt(document.getElementById('edit-caja-cant').value) || 0,
            observaciones: document.getElementById('edit-obs').value || "",
            IdInstitucion: AlojamientoState.instId
        };

        if (!data.fechavisado) return Swal.fire('Atención', 'Fecha requerida.', 'warning');

        showLoader();
        try {
            const res = await API.request('/alojamiento/update-row', 'POST', data);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modal-modificar-tramo'))?.hide();
                Swal.fire({ title: 'Éxito', text: 'Tramo actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
                await loadAlojamientos();
                setTimeout(() => window.verHistorial(hId), 600);
            } else Swal.fire('Error', res.message, 'error');
        } catch (e) { console.error(e); } finally { hideLoader(); }
    },

    async eliminarTramo(idAlojamiento, historiaId) {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar?', text: "Se borrará este tramo y sus observaciones.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545'
        });

        if (isConfirmed) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/delete-row', 'POST', { IdAlojamiento: idAlojamiento, historia: historiaId });
                if (res.status === 'success') {
                    Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
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
            confirmButtonText: 'Guardar Precio',
            inputValidator: (value) => {
                if (!value || value < 0) return 'Ingrese un precio válido';
            }
        });

        if (nuevoPrecio && nuevoPrecio != precioActual) {
            showLoader();
            try {
                const res = await API.request('/alojamiento/update-price', 'POST', { IdAlojamiento: idAlojamiento, precio: nuevoPrecio });
                if (res.status === 'success') {
                    const historiaId = AlojamientoState.currentHistoryData[0].historia;
                    window.verHistorial(historiaId);
                }
            } catch (e) { console.error(e); } finally { hideLoader(); }
        }
    }
};