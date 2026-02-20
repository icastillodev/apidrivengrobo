import { API } from '../../../api.js';
// AÑADE ESTA LÍNEA PARA SOLUCIONAR EL ERROR DEL LOADER
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

export const TrazabilidadUI = {
    openRows: new Set(),

async toggleRow(idAlojamiento, idEspecie) {
        const detailRow = document.getElementById(`trazabilidad-row-${idAlojamiento}`);
        const contentDiv = document.getElementById(`trazabilidad-content-${idAlojamiento}`);
        // Fila maestra (la que tocaste)
        const masterRow = detailRow ? detailRow.previousElementSibling : null;

        if (!detailRow || !contentDiv) return;

        if (this.openRows.has(idAlojamiento)) {
            detailRow.classList.add('d-none');
            if (masterRow) masterRow.classList.remove('table-primary'); // Quita el resaltado
            this.openRows.delete(idAlojamiento);
            return;
        }

        detailRow.classList.remove('d-none');
        if (masterRow) masterRow.classList.add('table-primary'); // Resalta la fila
        this.openRows.add(idAlojamiento);

        await this.refreshArbol(idAlojamiento, idEspecie);
    },

    async refreshArbol(idAlojamiento, idEspecie) {
        const contentDiv = document.getElementById(`trazabilidad-content-${idAlojamiento}`);
        if (!contentDiv) return;
        contentDiv.innerHTML = `<div class="text-center text-muted small"><div class="spinner-border spinner-border-sm"></div> Cargando...</div>`;
        
        try {
            const instId = localStorage.getItem('instId_temp_qr') || localStorage.getItem('instId') || 1;
        const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${idAlojamiento}&idEspecie=${idEspecie}&instId=${instId}`);
            if (res.status === 'success') this.renderArbol(contentDiv, res.data, idAlojamiento, idEspecie);
            else throw new Error(res.message);
        } catch (error) { contentDiv.innerHTML = `<div class="alert alert-danger small">Error: ${error.message}</div>`; }
    },

// DENTRO DE renderArbol, al principio:
    renderArbol(container, data, idAlojamiento, idEspecie) {
        const tipoNombre = data.tipoAlojamiento || window.txt.alojamientos.box_name;
        const hoy = new Date().toISOString().split('T')[0];
        const limite = data.limiteCajas || 1;
        const cajasActuales = data.cajas ? data.cajas.length : 0;
        const canAddBox = cajasActuales < limite;
        
        // MAGIA DE PERMISOS: Verificamos si estamos en modo lectura
        const isReadOnly = this.isReadOnly || false;

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <h6 class="text-primary fw-bold m-0"><i class="bi bi-diagram-3"></i> Trazabilidad Física <span class="badge bg-secondary ms-2">${cajasActuales} / ${limite}</span></h6>
                <div>
                    ${!isReadOnly ? `
                        <button class="btn btn-sm btn-outline-secondary fw-bold me-2" onclick="window.TrazabilidadUI.importarCajaExistente(${idAlojamiento}, ${idEspecie}, ${limite}, ${cajasActuales})">
                            <i class="bi bi-box-arrow-in-down"></i> Traer ${tipoNombre} Anterior
                        </button>
                        ${canAddBox 
                            ? `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="window.TrazabilidadUI.addCaja(${idAlojamiento}, ${idEspecie})"><i class="bi bi-plus-lg"></i> Nueva ${tipoNombre}</button>` 
                            : `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle"></i> Límite alcanzado</span>`
                        }
                    ` : ''}
                </div>
            </div>
            <div class="row g-3">
        `;

        if (cajasActuales === 0) {
            html += `<div class="col-12 text-center text-muted fst-italic">No hay estructuras instanciadas en este tramo.</div>`;
        } else {
            data.cajas.forEach(caja => {
                html += `
                <div class="col-md-12 mb-3">
                    <div class="card border-primary shadow-sm">
                        <div class="card-header bg-primary text-white py-1 small fw-bold d-flex justify-content-between align-items-center">
                            <span>
                                <i class="bi bi-box-seam me-1"></i> ${caja.NombreCaja}
                                ${!isReadOnly ? `<button class="btn btn-xs btn-link text-white p-0 ms-2" onclick="window.TrazabilidadUI.renameBox(${caja.IdCajaAlojamiento}, '${caja.NombreCaja}', ${idAlojamiento}, ${idEspecie})"><i class="bi bi-pencil"></i></button>` : ''}
                            </span>
                            ${!isReadOnly ? `<button class="btn btn-xs btn-danger" onclick="window.TrazabilidadUI.deleteBox(${caja.IdCajaAlojamiento}, '${caja.NombreCaja}', ${caja.unidades ? caja.unidades.length : 0}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-trash"></i></button>` : ''}
                        </div>
                        <div class="card-body p-2 bg-light">`;
                
                if (caja.unidades && caja.unidades.length > 0) {
                    caja.unidades.forEach(unidad => {
                        html += `
                        <div class="border rounded p-3 mb-2 bg-white shadow-sm">
                            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                                <span class="fw-bold small text-dark"><i class="bi bi-bug-fill text-success"></i> ${unidad.NombreEspecieAloj}</span>
                                ${!isReadOnly ? `
                                <div>
                                    <button class="btn btn-xs btn-light border text-primary me-1" onclick="window.TrazabilidadUI.renameSubject(${unidad.IdEspecieAlojUnidad}, '${unidad.NombreEspecieAloj}', ${idAlojamiento}, ${idEspecie})"><i class="bi bi-pencil-square"></i></button>
                                    <button class="btn btn-xs btn-light border text-danger" onclick="window.TrazabilidadUI.deleteSubject(${unidad.IdEspecieAlojUnidad}, '${unidad.NombreEspecieAloj}', ${unidad.observaciones_pivot ? unidad.observaciones_pivot.length : 0}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-x-circle"></i></button>
                                </div>` : ''}
                            </div>`;
                        
                        // Ocultamos el formulario EAV si es solo lectura
                        if (!isReadOnly) {
                            html += `
                            <form onsubmit="event.preventDefault(); window.guardarObservacion(${unidad.IdEspecieAlojUnidad}, ${idAlojamiento}, ${idEspecie}, this)">
                                <div class="row g-2 align-items-end">
                                    <div class="col-auto">
                                        <label style="font-size: 9px;" class="text-uppercase text-primary fw-bold">Fecha</label>
                                        <input type="date" name="fechaObs" class="form-control form-control-sm border-primary" value="${hoy}" required>
                                    </div>`;
                            
                            if (data.categorias && data.categorias.length > 0) {
                                data.categorias.forEach(cat => {
                                    const inputType = this.mapInputType(cat.TipoDeDato);
                                    html += `<div class="col-auto"><label style="font-size: 9px;" class="text-uppercase text-muted fw-bold">${cat.NombreCatAlojUnidad}</label><input type="${inputType}" name="cat_${cat.IdDatosUnidadAloj}" class="form-control form-control-sm border-secondary" required></div>`;
                                });
                                html += `<div class="col-auto"><button type="submit" class="btn btn-sm btn-success fw-bold shadow-sm"><i class="bi bi-save"></i></button></div>`;
                            }
                            html += `</div></form>`;
                        }
                            
                        html += `
                            <div class="mt-3 table-responsive">
                                <table class="table table-sm table-bordered text-center mb-0" style="font-size: 11px;">
                                    <thead class="bg-light text-muted">
                                        <tr>
                                            <th>Fecha</th>
                                            ${data.categorias ? data.categorias.map(c => `<th>${c.NombreCatAlojUnidad}</th>`).join('') : ''}
                                        </tr>
                                    </thead>
                                    <tbody>${this.renderPivotTable(unidad.observaciones_pivot, data.categorias)}</tbody>
                                </table>
                            </div>
                        </div>`;
                    });
                }
                
                if (!isReadOnly) {
                    html += `
                        <div class="text-center mt-2">
                            <button class="btn btn-sm btn-outline-success fw-bold shadow-sm" onclick="window.TrazabilidadUI.addSubject(${caja.IdCajaAlojamiento}, ${idAlojamiento}, ${idEspecie})">
                                <i class="bi bi-plus-circle"></i> Añadir Sujeto
                            </button>
                        </div>`;
                }
                html += `</div></div></div>`;
            });
        }
        html += `</div>`;
        container.innerHTML = html;
    },
    mapInputType(t) { const d = {'int':'number','text':'text','date':'date','var':'text'}; return d[t]||'text'; },

    renderPivotTable(obsPivot, categorias) {
        if (!obsPivot || obsPivot.length === 0) return `<tr><td colspan="${(categorias?categorias.length:0)+1}" class="text-muted fst-italic">Sin registros</td></tr>`;
        return obsPivot.map(row => `
            <tr>
                <td class="fw-bold text-secondary">${row.fechaObs}</td>
                ${categorias.map(c => `<td>${row.valores[c.NombreCatAlojUnidad] || '-'}</td>`).join('')}
            </tr>
        `).join('');
    },

    // ---------------------- MUTACIONES CRUD -----------------------
    async addCaja(idAlojamiento, idEspecie) {
        const { value: formValues } = await Swal.fire({
            title: 'Crear Caja',
            target: document.getElementById('modal-historial') || 'body',
            html: `<input id="swal-box-name" class="form-control mb-3" placeholder="Nombre (Ej: Grupo A)"><input id="swal-box-units" type="number" class="form-control" value="1" min="1" placeholder="Cant. Animales">`,
            showCancelButton: true, confirmButtonText: 'Crear',
            preConfirm: () => ({ name: document.getElementById('swal-box-name').value, units: parseInt(document.getElementById('swal-box-units').value)||1 })
        });
        if (formValues) {
            await API.request('/trazabilidad/add-caja', 'POST', { idAlojamiento, nombreCaja: formValues.name, cantidadUnidades: formValues.units, instId: localStorage.getItem('instId')||1 });
            await this.refreshArbol(idAlojamiento, idEspecie);
        }
    },

async addSubject(idCaja, idAlojamiento, idEspecie) {
        const { value: nombre } = await Swal.fire({ 
            title: 'Nombre del Sujeto', 
            input: 'text', 
            target: document.getElementById('modal-historial') || 'body', // <-- ESTO EVITA QUE QUEDE INVISIBLE
            showCancelButton: true 
        });
        if (nombre) {
            try {
                await API.request('/trazabilidad/add-subject', 'POST', { idCaja, idAlojamiento, nombreSujeto: nombre });
                await this.refreshArbol(idAlojamiento, idEspecie);
            } catch (e) { console.error(e); }
        }
    },

    async renameSubject(idUnidad, nombreActual, idAlojamiento, idEspecie) {
        // Separar el prefijo "A1 - S1 -" del nombre editable
        let parts = nombreActual.split(' - ');
        let prefijo = parts.length >= 3 ? parts.slice(0, 2).join(' - ') + ' - ' : '';
        let nombreEditable = parts.length >= 3 ? parts.slice(2).join(' - ') : nombreActual;

        const { value: newName } = await Swal.fire({ title: 'Editar Nombre', input: 'text', inputValue: nombreEditable, target: document.getElementById('modal-historial') || 'body', showCancelButton: true });
        if (newName && newName.trim() !== nombreEditable) {
            await API.request('/trazabilidad/rename-subject', 'POST', { idUnidad, nombre: prefijo + newName.trim() });
            await this.refreshArbol(idAlojamiento, idEspecie);
        }
    },

    async renameBox(idCaja, nombre, idAloj, idEspecie) {
        const { value: val } = await Swal.fire({ title: 'Renombrar', input: 'text', inputValue: nombre, target: document.getElementById('modal-historial') || 'body', showCancelButton: true });
        if (val) { await API.request('/trazabilidad/rename-box', 'POST', { idCaja, nombre: val }); await this.refreshArbol(idAloj, idEspecie); }
    },

async deleteBox(idCaja, nombreCaja, numAnimales, idAloj, idEspecie) {
        const warning = numAnimales > 0 ? `<br><b class='text-danger'>Se borrarán ${numAnimales} animales y TODAS sus observaciones clínicas.</b>` : '';
        if ((await Swal.fire({ 
            title: `¿Borrar ${nombreCaja}?`, 
            html: `Se eliminará de este tramo.${warning}`, 
            icon: 'warning', target: document.getElementById('modal-historial') || 'body', showCancelButton: true 
        })).isConfirmed) {
            await API.request('/trazabilidad/delete-box', 'POST', { idCaja }); await this.refreshArbol(idAloj, idEspecie);
        }
    },

    async deleteSubject(idUnidad, nombreUnidad, numObs, idAloj, idEspecie) {
        const warning = numObs > 0 ? `<br><b class='text-danger'>Se perderán ${numObs} registros de mediciones clínicas.</b>` : '';
        if ((await Swal.fire({ 
            title: `¿Borrar sujeto ${nombreUnidad}?`, 
            html: `Se eliminará físicamente de este tramo.${warning}`, 
            icon: 'warning', target: document.getElementById('modal-historial') || 'body', showCancelButton: true 
        })).isConfirmed) {
            await API.request('/trazabilidad/delete-subject', 'POST', { idUnidad }); await this.refreshArbol(idAloj, idEspecie);
        }
    },

async importarCajaExistente(idAlojamientoActual, idEspecie, limite, actuales) {
        if (actuales >= limite) {
            return Swal.fire('Límite Alcanzado', `El alojamiento permite máximo ${limite} cajas.`, 'warning');
        }

        const res = await API.request(`/trazabilidad/get-past-boxes?idAlojamiento=${idAlojamientoActual}`);
        if (res.status !== 'success' || !res.data || res.data.length === 0) {
            return Swal.fire({title: 'Sin Historial', text: 'No hay cajas previas.', icon: 'info', target: document.getElementById('modal-historial')});
        }

        let html = `<div class="accordion text-start" id="acc-import">`;
        res.data.forEach(c => {
            const disabledCaja = c.ya_existe ? 'disabled checked' : '';
            const txtCaja = c.ya_existe ? '<span class="badge bg-success ms-2">Ya en este tramo</span>' : '';
            
            html += `
            <div class="accordion-item mb-2 border shadow-sm">
                <h2 class="accordion-header d-flex bg-light p-2 align-items-center">
                    <input class="form-check-input me-2 check-caja-imp" type="checkbox" value="${c.IdCajaAlojamiento}" id="cb_cj_${c.IdCajaAlojamiento}" ${disabledCaja}>
                    <label for="cb_cj_${c.IdCajaAlojamiento}" class="mb-0 fw-bold ${c.ya_existe ? 'text-success' : 'text-dark'}">
                        <i class="bi bi-box-seam me-1"></i> ${c.NombreCaja} ${txtCaja}
                    </label>
                </h2>
                <div class="p-2 bg-white">`;
            
            c.unidades.forEach(u => {
                const disabledU = u.ya_existe ? 'disabled checked' : '';
                const txtU = u.ya_existe ? '<small class="text-success ms-1">(Instanciado)</small>' : '';
                html += `
                <div class="form-check ms-3 border-bottom py-1">
                    <input class="form-check-input check-unidad-imp" type="checkbox" value="${u.IdEspecieAlojUnidad}" data-caja="${c.IdCajaAlojamiento}" id="cb_u_${u.IdEspecieAlojUnidad}" ${disabledU}>
                    <label class="small fw-bold ${u.ya_existe ? 'text-success' : 'text-secondary'}" for="cb_u_${u.IdEspecieAlojUnidad}">
                        🐾 ${u.NombreEspecieAloj} ${txtU}
                    </label>
                </div>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;

const { isConfirmed } = await Swal.fire({
            title: 'Rescatar del Historial', 
            html: html, 
            target: document.getElementById('modal-historial') || 'body', 
            showCancelButton: true, 
            confirmButtonColor: '#0d6efd',
            confirmButtonText: '<i class="bi bi-cloud-download"></i> Importar Seleccionados',
            preConfirm: () => {
                // 1. VALIDACIÓN MATEMÁTICA: ¿Supera el límite de cajas del tramo?
                const checkedBoxes = document.querySelectorAll('.check-caja-imp:checked:not(:disabled)').length;
                if ((actuales + checkedBoxes) > limite) {
                    Swal.showValidationMessage(`Límite excedido: Solo puedes agregar ${limite - actuales} caja(s) más según la configuración del tramo.`);
                    return false;
                }

                // 2. VALIDACIÓN ESTRICTA FÍSICA: ¿Marcó el animal pero no la caja?
                const selectedUnits = Array.from(document.querySelectorAll('.check-unidad-imp:checked:not(:disabled)'));
                for (let unitCb of selectedUnits) {
                    const cajaId = unitCb.getAttribute('data-caja');
                    const cajaCb = document.querySelector(`.check-caja-imp[value="${cajaId}"]`);
                    if (!cajaCb || !cajaCb.checked) {
                        Swal.showValidationMessage(`Error Físico: Seleccionaste un animal pero no marcaste su caja contenedora.`);
                        return false;
                    }
                }
                return true;
            }
        });

        if (isConfirmed) {
            const cajas = Array.from(document.querySelectorAll('.check-caja-imp:checked:not(:disabled)')).map(x => x.value);
            const unidades = Array.from(document.querySelectorAll('.check-unidad-imp:checked:not(:disabled)')).map(x => x.value);
            
            if (cajas.length > 0) {
                showLoader();
                try {
                    await API.request('/trazabilidad/clone-past-boxes', 'POST', { idAlojamientoActual, cajas, unidades });
                    await this.refreshArbol(idAlojamientoActual, idEspecie);
                } catch (e) { console.error(e); } finally { hideLoader(); }
            }
        }
    }
};

window.guardarObservacion = async (idUnidad, idAlojamiento, idEspecie, formEl) => {
    const fd = new FormData(formEl);
    const p = { IdEspecieAlojUnidad: idUnidad, fechaObs: fd.get('fechaObs'), IdInstitucion: localStorage.getItem('instId')||1, valores: [] };
    fd.forEach((v, k) => { if (k.startsWith('cat_')) p.valores.push({ IdDatosUnidadAloj: k.replace('cat_', ''), valor: v }); });
    if (p.valores.length > 0) {
        await API.request('/trazabilidad/save-observation', 'POST', p);
        await TrazabilidadUI.refreshArbol(idAlojamiento, idEspecie);
    }
};
window.TrazabilidadUI = TrazabilidadUI;