// dist/js/pages/admin/alojamientos/trazabilidad.js
import { API } from '../../../api.js';

export const TrazabilidadUI = {
    openRows: new Set(),

    async toggleRow(idAlojamiento, idEspecie) {
        const detailRow = document.getElementById(`trazabilidad-row-${idAlojamiento}`);
        const contentDiv = document.getElementById(`trazabilidad-content-${idAlojamiento}`);
        
        if (!detailRow || !contentDiv) return;

        if (this.openRows.has(idAlojamiento)) {
            detailRow.classList.add('d-none');
            this.openRows.delete(idAlojamiento);
            return;
        }

        detailRow.classList.remove('d-none');
        this.openRows.add(idAlojamiento);

        try {
            const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${idAlojamiento}&idEspecie=${idEspecie}`);
            if (res.status === 'success') {
                this.renderArbol(contentDiv, res.data, idAlojamiento, idEspecie);
            }
        } catch (error) {
            contentDiv.innerHTML = `<div class="alert alert-danger small">${window.txt.alojamientos.trace_error}</div>`;
        }
    },

    renderArbol(container, data, idAlojamiento, idEspecie) {
        if (!data.cajas || data.cajas.length === 0) {
            container.innerHTML = `<button class="btn btn-sm btn-outline-success" onclick="TrazabilidadUI.addCaja(${idAlojamiento})"><i class="bi bi-plus"></i> ${window.txt.alojamientos.init_box}</button>`;
            return;
        }

        let html = `<div class="row g-3">`;
        
        data.cajas.forEach(caja => {
            html += `
            <div class="col-md-12 mb-3">
                <div class="card border-primary shadow-sm">
                    <div class="card-header bg-primary text-white py-1 small fw-bold">
                        <i class="bi bi-box-seam me-1"></i> ${caja.NombreCaja || window.txt.alojamientos.box_name + ' #' + caja.IdCajaAlojamiento}
                    </div>
                    <div class="card-body p-2 bg-light">`;
            
            caja.unidades.forEach(unidad => {
                html += `
                <div class="border rounded p-3 mb-2 bg-white shadow-sm">
                    <div class="d-flex justify-content-between border-bottom pb-2 mb-3">
                        <span class="fw-bold small text-dark"><i class="bi bi-bug-fill text-success"></i> ${unidad.NombreEspecieAloj}</span>
                    </div>
                    
                    <form onsubmit="event.preventDefault(); window.guardarObservacion(${unidad.IdEspecieAlojUnidad}, this)">
                        <div class="row g-2 align-items-end">`;
                
                data.categorias.forEach(cat => {
                    const inputType = this.mapInputType(cat.TipoDeDato);
                    html += `
                            <div class="col-auto">
                                <label style="font-size: 9px;" class="text-uppercase text-muted fw-bold">${cat.NombreCatAlojUnidad}</label>
                                <input type="${inputType}" name="cat_${cat.IdDatosUnidadAloj}" class="form-control form-control-sm border-secondary" required>
                            </div>`;
                });

                html += `
                            <div class="col-auto">
                                <button type="submit" class="btn btn-sm btn-success fw-bold shadow-sm"><i class="bi bi-save"></i> ${window.txt.alojamientos.btn_save}</button>
                            </div>
                        </div>
                    </form>
                    
                    <div class="mt-3 table-responsive">
                        <table class="table table-sm table-hover text-center mb-0 border" style="font-size: 11px;">
                            <thead class="bg-light text-muted">
                                <tr><th>${window.txt.generales.inicio} (Data)</th><th>Métrica Registrada</th></tr>
                            </thead>
                            <tbody>
                                ${this.renderHistorialObservaciones(unidad.observaciones)}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            });

            html += `</div></div></div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    mapInputType(tipoDB) {
        const types = { 'int': 'number', 'text': 'text', 'date': 'date', 'var': 'text' };
        return types[tipoDB] || 'text';
    },

    renderHistorialObservaciones(obsArray) {
        if (!obsArray || obsArray.length === 0) {
            return `<tr><td colspan="2" class="text-muted fst-italic py-2">${window.txt.alojamientos.no_clinical_records}</td></tr>`;
        }
        return obsArray.map(o => `<tr><td class="fw-bold text-secondary">${o.fechaObs}</td><td><span class="badge bg-light text-dark border">${o.CategoriaNombre}</span> : <b class="text-primary">${o.Valor}</b></td></tr>`).join('');
    }
};

window.guardarObservacion = async (idUnidad, formElement) => {
    const formData = new FormData(formElement);
    const payload = {
        IdEspecieAlojUnidad: idUnidad,
        fechaObs: new Date().toISOString().split('T')[0],
        valores: []
    };

    formData.forEach((value, key) => {
        if (key.startsWith('cat_')) {
            payload.valores.push({ IdDatosUnidadAloj: key.replace('cat_', ''), valor: value });
        }
    });

    try {
        const res = await API.request('/trazabilidad/save-observation', 'POST', payload);
        if (res.status === 'success') {
            Swal.fire({
                title: window.txt.alojamientos.alert_success_title,
                text: window.txt.alojamientos.saved_record,
                icon: 'success', timer: 1000, showConfirmButton: false
            });
            // Opcional: Recargar el acordeón o actualizar la vista.
        }
    } catch (e) { console.error(e); }
};