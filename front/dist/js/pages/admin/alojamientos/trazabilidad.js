import { API } from '../../../api.js';
// AÑADE ESTA LÍNEA PARA SOLUCIONAR EL ERROR DEL LOADER
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

function __ubAct(r) {
    return Number(r?.Activo) === 1;
}

function __ubEsc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function __ubFetchBundle() {
    if (window.__alojUbicBundle) return window.__alojUbicBundle;
    const res = await API.request('/admin/config/alojamiento/ubicacion/bundle');
    if (res.status === 'success' && res.data) {
        window.__alojUbicBundle = res.data;
        return res.data;
    }
    return null;
}

function __ubFormatLine(caja) {
    const parts = [];
    if (caja.nombre_ubicacion_fisica) parts.push(String(caja.nombre_ubicacion_fisica).trim());
    if (caja.nombre_salon) parts.push(String(caja.nombre_salon).trim());
    if (caja.nombre_rack) parts.push(String(caja.nombre_rack).trim());
    if (caja.nombre_lugar_rack) parts.push(String(caja.nombre_lugar_rack).trim());
    if (caja.ComentarioUbicacion && String(caja.ComentarioUbicacion).trim()) parts.push(String(caja.ComentarioUbicacion).trim());
    if (!parts.length && caja.Detalle) return String(caja.Detalle).trim();
    return parts.filter(Boolean).join(' · ');
}

/** Resumen vacío: no hay texto útil para mostrar como ubicación (ni catálogo ni Detalle legacy). */
function __ubSinUbicacionParaMostrar(caja) {
    return !(__ubFormatLine(caja) || '').trim();
}

function __ubHtmlFields(bundle) {
    const L = bundle.labels || {};
    const optUf = (bundle.ubicacionesFisicas || []).filter(__ubAct)
        .map(u => `<option value="${u.IdUbicacionFisica}">${__ubEsc(u.Nombre)}</option>`).join('');
    return `
    <hr class="my-2"/>
    <div class="text-start small">
      <label class="form-label mb-0">${__ubEsc(L.LabelLugarFisico || 'Lugar físico')}</label>
      <select id="swal-u-uf" class="form-select form-select-sm mb-1"><option value="">--</option>${optUf}</select>
      <label class="form-label mb-0">${__ubEsc(L.LabelSalon || 'Salón')}</label>
      <select id="swal-u-salon" class="form-select form-select-sm mb-1"><option value="">--</option></select>
      <label class="form-label mb-0">${__ubEsc(L.LabelRack || 'Rack')}</label>
      <select id="swal-u-rack" class="form-select form-select-sm mb-1"><option value="">--</option></select>
      <label class="form-label mb-0">${__ubEsc(L.LabelLugarRack || 'Posición')}</label>
      <select id="swal-u-lugar" class="form-select form-select-sm mb-1"><option value="">--</option></select>
      <label class="form-label mb-0">${__ubEsc(L.LabelComentarioUbicacion || 'Comentario')}</label>
      <textarea id="swal-u-com" class="form-control form-control-sm" rows="2"></textarea>
    </div>`;
}

function __ubWireUbicacion(bundle, initial) {
    const uf = document.getElementById('swal-u-uf');
    const salon = document.getElementById('swal-u-salon');
    const rack = document.getElementById('swal-u-rack');
    const lugar = document.getElementById('swal-u-lugar');
    if (!uf || !salon || !rack || !lugar) return;

    const refillSalon = () => {
        const ufVal = uf.value;
        const list = __ubFilterSalon(bundle, ufVal || null);
        const cur = salon.value;
        salon.innerHTML = '<option value="">--</option>' + list.map(s => `<option value="${s.IdSalon}">${__ubEsc(s.Nombre)}</option>`).join('');
        salon.value = [...salon.options].some(o => o.value === cur) ? cur : '';
    };
    const refillRack = () => {
        const salonVal = salon.value;
        const list = __ubFilterRack(bundle, salonVal || null);
        const cur = rack.value;
        rack.innerHTML = '<option value="">--</option>' + list.map(r => `<option value="${r.IdRack}">${__ubEsc(r.Nombre)}</option>`).join('');
        rack.value = [...rack.options].some(o => o.value === cur) ? cur : '';
    };
    const refillLugar = () => {
        const rackVal = rack.value;
        const list = __ubFilterLugar(bundle, rackVal || null);
        const cur = lugar.value;
        lugar.innerHTML = '<option value="">--</option>' + list.map(l => `<option value="${l.IdLugarRack}">${__ubEsc(l.Nombre)}</option>`).join('');
        lugar.value = [...lugar.options].some(o => o.value === cur) ? cur : '';
    };

    uf.onchange = () => { refillSalon(); refillRack(); refillLugar(); };
    salon.onchange = () => { refillRack(); refillLugar(); };
    rack.onchange = () => { refillLugar(); };

    refillSalon();
    refillRack();
    refillLugar();

    if (initial) {
        if (initial.IdUbicacionFisica) uf.value = String(initial.IdUbicacionFisica);
        refillSalon();
        if (initial.IdSalon) salon.value = String(initial.IdSalon);
        refillRack();
        if (initial.IdRack) rack.value = String(initial.IdRack);
        refillLugar();
        if (initial.IdLugarRack) lugar.value = String(initial.IdLugarRack);
        const com = document.getElementById('swal-u-com');
        if (com) com.value = initial.ComentarioUbicacion ? String(initial.ComentarioUbicacion) : '';
    }
}

function __ubReadUbicacionFromForm(full) {
    const vuf = document.getElementById('swal-u-uf')?.value;
    const vs = document.getElementById('swal-u-salon')?.value;
    const vr = document.getElementById('swal-u-rack')?.value;
    const vl = document.getElementById('swal-u-lugar')?.value;
    const comEl = document.getElementById('swal-u-com');
    const com = comEl ? comEl.value.trim() : '';
    if (!full) {
        const o = {};
        if (vuf) o.IdUbicacionFisica = parseInt(vuf, 10);
        if (vs) o.IdSalon = parseInt(vs, 10);
        if (vr) o.IdRack = parseInt(vr, 10);
        if (vl) o.IdLugarRack = parseInt(vl, 10);
        if (com) o.ComentarioUbicacion = com;
        return o;
    }
    return {
        IdUbicacionFisica: vuf ? parseInt(vuf, 10) : null,
        IdSalon: vs ? parseInt(vs, 10) : null,
        IdRack: vr ? parseInt(vr, 10) : null,
        IdLugarRack: vl ? parseInt(vl, 10) : null,
        ComentarioUbicacion: com || null
    };
}

/** Sin padre elegido → lista vacía (cascada: no mostrar todo el catálogo a la vez). */
function __ubFilterSalon(bundle, ufVal) {
    const base = (bundle.salones || []).filter(__ubAct);
    if (ufVal == null || ufVal === '') return [];
    return base.filter(s => s.IdUbicacionFisica == null || s.IdUbicacionFisica === '' || String(s.IdUbicacionFisica) === String(ufVal));
}

function __ubFilterRack(bundle, salonVal) {
    const base = (bundle.racks || []).filter(__ubAct);
    if (salonVal == null || salonVal === '') return [];
    return base.filter(r => r.IdSalon == null || r.IdSalon === '' || String(r.IdSalon) === String(salonVal));
}

function __ubFilterLugar(bundle, rackVal) {
    const base = (bundle.lugaresRack || []).filter(__ubAct);
    if (rackVal == null || rackVal === '') return [];
    return base.filter(l => String(l.IdRack) === String(rackVal));
}

function __ubGetValFromField(idCaja, level) {
    const el = document.getElementById(`ub-${level}-${idCaja}`);
    if (!el) return '';
    return el.value || '';
}

function __ubRenderFieldControl(level, idCaja, items, idKey, nameKey, selectedId, labelText) {
    const active = (items || []).filter(__ubAct);
    const sid = `ub-${level}-${idCaja}`;
    if (active.length === 0) {
        return '';
    }
    // Siempre <select> (aunque haya 1 sola opción) para poder cambiar nivel o dejar en "--"
    let opts = '<option value="">--</option>' + active.map(o => {
        const v = o[idKey];
        const sel = selectedId != null && String(selectedId) === String(v) ? ' selected' : '';
        return `<option value="${v}"${sel}>${__ubEsc(o[nameKey])}</option>`;
    }).join('');
    return `<div style="min-width:90px;max-width:200px;"><label class="small text-white-50 mb-0 d-block text-uppercase" style="font-size:9px">${__ubEsc(labelText)}</label><select id="${sid}" class="form-select form-select-sm bg-white text-dark">${opts}</select></div>`;
}

function __ubBuildInlineUbicacionHtml(bundle, caja, txt, idAlojamiento, idEspecie) {
    const L = bundle.labels || {};
    const id = caja.IdCajaAlojamiento;
    const ufList = bundle.ubicacionesFisicas || [];
    const ufv = caja.IdUbicacionFisica;
    const salonList = __ubFilterSalon(bundle, ufv);
    const salonv = caja.IdSalon;
    const rackList = __ubFilterRack(bundle, salonv);
    const rackv = caja.IdRack;
    const lugarList = __ubFilterLugar(bundle, rackv);
    const lugarv = caja.IdLugarRack;
    const lblUf = L.LabelLugarFisico || txt.trace_ubic_lbl_uf || 'Lugar';
    const lblS = L.LabelSalon || txt.trace_ubic_lbl_salon || 'Salón';
    const lblR = L.LabelRack || txt.trace_ubic_lbl_rack || 'Rack';
    const lblL = L.LabelLugarRack || txt.trace_ubic_lbl_lugar || 'Posición';
    const lblCom = L.LabelComentarioUbicacion || txt.trace_comentario_ubic || 'Comentario';
    const avisoSinUbic = __ubSinUbicacionParaMostrar(caja)
        ? `<div class="small text-white-50 mb-2 fst-italic">${__ubEsc(txt.trace_sin_ubicacion_actual || 'Sin ubicación asignada.')}</div>`
        : '';
    return `
<div class="ubicacion-row w-100 mt-2 pt-2 border-top border-white border-opacity-25" data-caja-id="${id}">
  ${avisoSinUbic}
  <div class="d-flex flex-wrap align-items-end gap-2">
    <div id="ub-wrap-uf-${id}">${__ubRenderFieldControl('uf', id, ufList, 'IdUbicacionFisica', 'Nombre', ufv, lblUf)}</div>
    <div id="ub-wrap-salon-${id}">${__ubRenderFieldControl('salon', id, salonList, 'IdSalon', 'Nombre', salonv, lblS)}</div>
    <div id="ub-wrap-rack-${id}">${__ubRenderFieldControl('rack', id, rackList, 'IdRack', 'Nombre', rackv, lblR)}</div>
    <div id="ub-wrap-lugar-${id}">${__ubRenderFieldControl('lugar', id, lugarList, 'IdLugarRack', 'Nombre', lugarv, lblL)}</div>
    <div style="min-width:120px;max-width:240px;flex:1;"><label class="small text-white-50 mb-0 d-block text-uppercase" style="font-size:9px">${__ubEsc(lblCom)}</label>
      <input type="text" class="form-control form-control-sm bg-white text-dark" id="ub-com-${id}" value="${__ubEsc(caja.ComentarioUbicacion || '')}" placeholder="">
    </div>
    <button type="button" class="btn btn-sm btn-light text-primary fw-bold" onclick="window.TrazabilidadUI.guardarUbicacionInline(${id},${idAlojamiento},${idEspecie})">${__ubEsc(txt.trace_ubicacion_guardar || 'Guardar')}</button>
  </div>
</div>`;
}

function __ubAttachCascadeListeners(idCaja, bundle) {
    const s = document.getElementById(`ub-salon-${idCaja}`);
    if (s && s.tagName === 'SELECT') {
        s.onchange = () => __ubCascadeFromSalon(idCaja, bundle);
    }
    const r = document.getElementById(`ub-rack-${idCaja}`);
    if (r && r.tagName === 'SELECT') {
        r.onchange = () => __ubCascadeFromRack(idCaja, bundle);
    }
}

function __ubCascadeFromUf(idCaja, bundle) {
    const ufVal = __ubGetValFromField(idCaja, 'uf');
    const salonList = __ubFilterSalon(bundle, ufVal || null);
    const txt = window.txt?.alojamientos || {};
    const L = bundle.labels || {};
    const lblS = L.LabelSalon || txt.trace_ubic_lbl_salon || 'Salón';
    const lblR = L.LabelRack || txt.trace_ubic_lbl_rack || 'Rack';
    const lblL = L.LabelLugarRack || txt.trace_ubic_lbl_lugar || 'Posición';
    document.getElementById(`ub-wrap-salon-${idCaja}`).innerHTML = __ubRenderFieldControl('salon', idCaja, salonList, 'IdSalon', 'Nombre', null, lblS);
    document.getElementById(`ub-wrap-rack-${idCaja}`).innerHTML = __ubRenderFieldControl('rack', idCaja, [], 'IdRack', 'Nombre', null, lblR);
    document.getElementById(`ub-wrap-lugar-${idCaja}`).innerHTML = __ubRenderFieldControl('lugar', idCaja, [], 'IdLugarRack', 'Nombre', null, lblL);
    __ubAttachCascadeListeners(idCaja, bundle);
}

function __ubCascadeFromSalon(idCaja, bundle) {
    const salonVal = __ubGetValFromField(idCaja, 'salon');
    const rackList = __ubFilterRack(bundle, salonVal || null);
    const txt = window.txt?.alojamientos || {};
    const L = bundle.labels || {};
    const lblR = L.LabelRack || txt.trace_ubic_lbl_rack || 'Rack';
    const lblL = L.LabelLugarRack || txt.trace_ubic_lbl_lugar || 'Posición';
    document.getElementById(`ub-wrap-rack-${idCaja}`).innerHTML = __ubRenderFieldControl('rack', idCaja, rackList, 'IdRack', 'Nombre', null, lblR);
    document.getElementById(`ub-wrap-lugar-${idCaja}`).innerHTML = __ubRenderFieldControl('lugar', idCaja, [], 'IdLugarRack', 'Nombre', null, lblL);
    __ubAttachCascadeListeners(idCaja, bundle);
}

function __ubCascadeFromRack(idCaja, bundle) {
    const rackVal = __ubGetValFromField(idCaja, 'rack');
    const lugarList = __ubFilterLugar(bundle, rackVal || null);
    const txt = window.txt?.alojamientos || {};
    const L = bundle.labels || {};
    const lblL = L.LabelLugarRack || txt.trace_ubic_lbl_lugar || 'Posición';
    document.getElementById(`ub-wrap-lugar-${idCaja}`).innerHTML = __ubRenderFieldControl('lugar', idCaja, lugarList, 'IdLugarRack', 'Nombre', null, lblL);
    __ubAttachCascadeListeners(idCaja, bundle);
}

function __ubWireInlineUbicacion(idCaja, bundle) {
    const uf = document.getElementById(`ub-uf-${idCaja}`);
    if (uf && uf.tagName === 'SELECT') {
        uf.addEventListener('change', () => __ubCascadeFromUf(idCaja, bundle));
    }
    __ubAttachCascadeListeners(idCaja, bundle);
}

function __ubReadUbicacionInlineFull(idCaja) {
    const g = (level) => {
        const el = document.getElementById(`ub-${level}-${idCaja}`);
        if (!el) return null;
        const v = el.value;
        if (v === '' || v === null || v === undefined) return null;
        const n = parseInt(v, 10);
        return Number.isNaN(n) ? null : n;
    };
    const com = document.getElementById(`ub-com-${idCaja}`)?.value?.trim() ?? '';
    return {
        IdUbicacionFisica: g('uf'),
        IdSalon: g('salon'),
        IdRack: g('rack'),
        IdLugarRack: g('lugar'),
        ComentarioUbicacion: com === '' ? null : com
    };
}

export const TrazabilidadUI = {
    openRows: new Set(),
    _lastArbolData: {},

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
        contentDiv.innerHTML = `<div class="text-center text-muted small"><div class="spinner-border spinner-border-sm"></div> ${(window.txt?.alojamientos?.trace_loading || 'Cargando...')}</div>`;
        
        try {
            const instId = localStorage.getItem('instId_temp_qr') || localStorage.getItem('instId') || 1;
        const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${idAlojamiento}&idEspecie=${idEspecie}&instId=${instId}`);
            if (res.status === 'success') await this.renderArbol(contentDiv, res.data, idAlojamiento, idEspecie);
            else throw new Error(res.message);
        } catch (error) { contentDiv.innerHTML = `<div class="alert alert-danger small">Error: ${error.message}</div>`; }
    },

    async renderArbol(container, data, idAlojamiento, idEspecie) {
        this._lastArbolData[idAlojamiento] = data;
        const txt = window.txt?.alojamientos || {};
        const tipoNombre = data.tipoAlojamiento || txt.box_name;
        const hoy = new Date().toISOString().split('T')[0];
        const limite = data.limiteCajas || 1;
        const cajasActuales = data.cajas ? data.cajas.length : 0;
        const canAddBox = cajasActuales < limite;
        
        // MAGIA DE PERMISOS: Verificamos si estamos en modo lectura
        const isReadOnly = this.isReadOnly || false;
        let ubicBundle = null;
        if (!isReadOnly) {
            ubicBundle = await __ubFetchBundle();
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <h6 class="text-primary fw-bold m-0"><i class="bi bi-diagram-3"></i> ${txt.trace_physical || 'Trazabilidad Física'} <span class="badge bg-secondary ms-2">${cajasActuales} / ${limite}</span></h6>
                <div>
                    ${!isReadOnly ? `
                        <button class="btn btn-sm btn-outline-secondary fw-bold me-2" onclick="window.TrazabilidadUI.importarCajaExistente(${idAlojamiento}, ${idEspecie}, ${limite}, ${cajasActuales})">
                            <i class="bi bi-box-arrow-in-down"></i> ${(txt.trace_bring_previous || 'Traer {tipo} Anterior').replace('{tipo}', tipoNombre)}
                        </button>
                        ${canAddBox 
                            ? `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="window.TrazabilidadUI.addCaja(${idAlojamiento}, ${idEspecie})"><i class="bi bi-plus-lg"></i> ${(txt.trace_new_box || 'Nueva {tipo}').replace('{tipo}', tipoNombre)}</button>` 
                            : `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle"></i> ${txt.trace_limit_reached || 'Límite alcanzado'}</span>`
                        }
                    ` : ''}
                </div>
            </div>
            <div class="row g-3">
        `;

        if (cajasActuales === 0) {
            html += `<div class="col-12 text-center text-muted fst-italic">${txt.trace_no_structures || 'No hay estructuras instanciadas en este tramo.'}</div>`;
        } else {
            if (!isReadOnly && !ubicBundle) {
                html += `<div class="col-12"><div class="alert alert-warning small py-2 mb-2">${__ubEsc(txt.trace_ubicacion_bundle_error || '')}</div></div>`;
            }
            data.cajas.forEach(caja => {
                const ubicacionResumen = (__ubFormatLine(caja) || '').trim();
                const headerUbicacion = isReadOnly
                    ? (ubicacionResumen
                        ? `<div class="small mt-1 opacity-90 ps-1">📍 ${__ubEsc(ubicacionResumen)}</div>`
                        : `<div class="small mt-1 opacity-75 ps-1 fst-italic">${__ubEsc(txt.trace_sin_ubicacion_actual || '')}</div>`)
                    : '';
                const filaUbicacionEditable = !isReadOnly && ubicBundle
                    ? __ubBuildInlineUbicacionHtml(ubicBundle, caja, txt, idAlojamiento, idEspecie)
                    : '';
                html += `
                <div class="col-md-12 mb-3">
                    <div class="card border-primary shadow-sm">
                        <div class="card-header bg-primary text-white py-2 px-2">
                            <div class="d-flex justify-content-between align-items-center flex-wrap gap-1">
                                <div class="d-flex align-items-center flex-wrap gap-1">
                                    <span class="fw-bold"><i class="bi bi-box-seam me-1"></i>${caja.NombreCaja}</span>
                                    ${!isReadOnly ? `<button type="button" class="btn btn-xs btn-link text-white p-0 ms-1" title="${__ubEsc(txt.trace_renombrar || 'Renombrar')}" onclick="window.TrazabilidadUI.renameBox(${caja.IdCajaAlojamiento}, '${caja.NombreCaja}', ${idAlojamiento}, ${idEspecie})"><i class="bi bi-pencil"></i></button>` : ''}
                                </div>
                                ${!isReadOnly ? `<button type="button" class="btn btn-xs btn-danger" onclick="window.TrazabilidadUI.deleteBox(${caja.IdCajaAlojamiento}, '${caja.NombreCaja}', ${caja.unidades ? caja.unidades.length : 0}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-trash"></i></button>` : ''}
                            </div>
                            ${headerUbicacion}
                            ${filaUbicacionEditable}
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
                                        <label style="font-size: 9px;" class="text-uppercase text-primary fw-bold">${txt.trace_fecha || 'Fecha'}</label>
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
                                <i class="bi bi-plus-circle"></i> ${(window.txt?.alojamientos?.trace_add_subject || 'Añadir Sujeto')}
                            </button>
                        </div>`;
                }
                html += `</div></div></div>`;
            });
        }
        html += `</div>`;
        container.innerHTML = html;
        if (!isReadOnly && ubicBundle && data.cajas && data.cajas.length) {
            data.cajas.forEach(caja => {
                __ubWireInlineUbicacion(caja.IdCajaAlojamiento, ubicBundle);
            });
        }
    },
    mapInputType(t) { const d = {'int':'number','text':'text','date':'date','var':'text'}; return d[t]||'text'; },

    renderPivotTable(obsPivot, categorias) {
        const txt = window.txt?.alojamientos || {};
        if (!obsPivot || obsPivot.length === 0) return `<tr><td colspan="${(categorias?categorias.length:0)+1}" class="text-muted fst-italic">${txt.trace_sin_registros || 'Sin registros'}</td></tr>`;
        return obsPivot.map(row => `
            <tr>
                <td class="fw-bold text-secondary">${row.fechaObs}</td>
                ${categorias.map(c => `<td>${row.valores[c.NombreCatAlojUnidad] || '-'}</td>`).join('')}
            </tr>
        `).join('');
    },

    // ---------------------- MUTACIONES CRUD -----------------------
    async addCaja(idAlojamiento, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const bundle = await __ubFetchBundle();
        let html = `
            <input id="swal-box-name" class="form-control mb-2" placeholder="${__ubEsc(txt.trace_nombre_placeholder || 'Nombre')}">
            <input id="swal-box-units" type="number" class="form-control mb-2" value="1" min="1" placeholder="${__ubEsc(txt.trace_cant_animales || '')}">`;
        if (bundle) html += __ubHtmlFields(bundle);
        else html += `<p class="text-muted small mb-0">${__ubEsc(txt.trace_ubicacion_bundle_error || '')}</p>`;

        const { value: formValues } = await Swal.fire({
            title: txt.trace_crear_caja || 'Crear Caja',
            target: document.getElementById('modal-historial') || 'body',
            html,
            showCancelButton: true,
            confirmButtonText: txt.trace_crear_btn || 'Crear',
            width: '32rem',
            didOpen: () => { if (bundle) __ubWireUbicacion(bundle, null); },
            preConfirm: () => {
                const name = document.getElementById('swal-box-name').value;
                const units = parseInt(document.getElementById('swal-box-units').value, 10) || 1;
                const ubic = bundle ? __ubReadUbicacionFromForm(false) : {};
                return { name, units, ubicacion: Object.keys(ubic).length ? ubic : null };
            }
        });
        if (formValues) {
            const body = {
                idAlojamiento,
                nombreCaja: formValues.name,
                cantidadUnidades: formValues.units,
                instId: localStorage.getItem('instId') || 1
            };
            if (formValues.ubicacion && Object.keys(formValues.ubicacion).length) body.ubicacion = formValues.ubicacion;
            await API.request('/trazabilidad/add-caja', 'POST', body);
            await this.refreshArbol(idAlojamiento, idEspecie);
        }
    },

    async guardarUbicacionInline(idCaja, idAlojamiento, idEspecie) {
        const ubicacion = __ubReadUbicacionInlineFull(idCaja);
        const txt = window.txt?.alojamientos || {};
        showLoader();
        try {
            const res = await API.request('/trazabilidad/update-caja-ubicacion', 'POST', { idCaja, ubicacion });
            if (res.status !== 'success') throw new Error(res.message || 'Error');
            await this.refreshArbol(idAlojamiento, idEspecie);
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: txt.trace_error || 'Error', text: String(e.message || e), target: document.getElementById('modal-historial') || 'body' });
        } finally {
            hideLoader();
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