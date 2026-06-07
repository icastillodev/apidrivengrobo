import { API } from '../../../api.js';
import { AnimalFichaUI } from './animalFicha.js';
import { hasTrazabilidadAlojamientosForUser } from '../../../modulesAccess.js';

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

/** Escapa un string para usarlo dentro de comillas simples en atributo onclick. */
function __ubJsStr(s) {
    return String(s ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, '\\n');
}

function __ubParseNombreCaja(full) {
    const s = String(full ?? '');
    const idx = s.indexOf(' - ');
    if (idx === -1) return { prefijo: s, etiqueta: '' };
    return { prefijo: s.slice(0, idx), etiqueta: s.slice(idx + 3) };
}

function __ubParseNombreSujeto(full) {
    const m = String(full ?? '').match(/^(.*) - (S\d+) - (.*)$/s);
    if (!m) return { prefijoFijo: '', etiqueta: String(full ?? '') };
    return { prefijoFijo: `${m[1]} - ${m[2]} - `, etiqueta: m[3] };
}

/** Campo EAV según TipoDeDato (M9 sexo, M10 text → textarea). */
function __ubMapInputType(t) {
    const u = String(t || '').toLowerCase();
    const d = { int: 'number', text: 'text', date: 'date', varchar: 'text', var: 'text', decimal: 'text', bool: 'text', sexo: 'text', subespecie: 'text', cepa: 'text' };
    return d[u] || 'text';
}

function __ubCatsNeedCatalog(cats) {
    return (cats || []).some((c) => {
        const t = String(c?.TipoDeDato || '').toLowerCase();
        return t === 'subespecie' || t === 'cepa';
    });
}

const __ubEspecieCatalogCache = {};

async function __ubLoadEspecieCatalog(idEspecie) {
    const key = String(idEspecie);
    if (__ubEspecieCatalogCache[key]) return __ubEspecieCatalogCache[key];
    let cepas = [];
    let subesps = [];
    try {
        const [cr, sr] = await Promise.all([
            API.request(`/admin/config/cepas/all?idespA=${encodeURIComponent(key)}`, 'GET'),
            API.request(`/admin/config/subespecies/by-especie?idespA=${encodeURIComponent(key)}`, 'GET'),
        ]);
        if (cr.status === 'success' && Array.isArray(cr.data)) {
            cepas = cr.data.filter((c) => String(c.Habilitado) !== '2');
        }
        if (sr.status === 'success' && Array.isArray(sr.data)) {
            subesps = sr.data.filter((x) => String(x.Existe) !== '2');
        }
    } catch (_) {
        cepas = [];
        subesps = [];
    }
    __ubEspecieCatalogCache[key] = { cepas, subesps };
    return __ubEspecieCatalogCache[key];
}

function __ubValCampoTraz(cat, unidad, vin, idCat) {
    const t = String(cat?.TipoDeDato || '').toLowerCase();
    if (t === 'subespecie') {
        return unidad.idsubespA_sujeto != null && unidad.idsubespA_sujeto !== '' ? String(unidad.idsubespA_sujeto) : '';
    }
    if (t === 'cepa') {
        return unidad.idcepaA_sujeto != null && unidad.idcepaA_sujeto !== '' ? String(unidad.idcepaA_sujeto) : '';
    }
    const o = vin[idCat] || vin[String(idCat)];
    return o && o.Valor != null && o.Valor !== '' ? String(o.Valor) : '';
}

function __ubCollectBioPatchFromForm(formEl, namePrefix = 'inicio_') {
    const bio = {};
    if (!formEl) return bio;
    formEl.querySelectorAll(`[name^="${namePrefix}"][data-traz-bio-field]`).forEach((el) => {
        const f = el.getAttribute('data-traz-bio-field');
        if (f) bio[f] = el.value ?? '';
    });
    return bio;
}

function __ubCollectBioPatchFromSwal() {
    const bio = {};
    document.querySelectorAll('.swal2-html-container [data-traz-bio-field]').forEach((el) => {
        const f = el.getAttribute('data-traz-bio-field');
        if (f) bio[f] = el.value ?? '';
    });
    return bio;
}

function __ubRenderCampoTraz(cat, opts = {}) {
    const txt = window.txt?.alojamientos || {};
    const tipo = String(cat?.TipoDeDato || '').toLowerCase();
    const name = opts.name || `cat_${cat.IdDatosUnidadAloj}`;
    const id = opts.id || name;
    const value = opts.value != null ? String(opts.value) : '';
    const layout = opts.layout || 'stack';
    const label = opts.label != null ? opts.label : (cat.NombreCatAlojUnidad || '');
    const labelClass = opts.labelClass || 'form-label small text-start d-block mb-0';
    const labelStyle = opts.labelStyle || '';
    const inputClass = opts.inputClass || 'form-control form-control-sm border-secondary';
    const optional = opts.showOptional
        ? ` <span class="text-muted fw-normal">(${__ubEsc(txt.trace_campo_opcional || 'opcional')})</span>`
        : '';

    let control = '';
    if (tipo === 'text') {
        control = `<textarea name="${__ubEsc(name)}" id="${__ubEsc(id)}" class="${inputClass} mb-2" rows="3">${__ubEsc(value)}</textarea>`;
    } else if (tipo === 'sexo') {
        const v = value.trim().toLowerCase();
        control = `<select name="${__ubEsc(name)}" id="${__ubEsc(id)}" class="form-select form-select-sm mb-2">
            <option value=""${v === '' ? ' selected' : ''}>${__ubEsc(txt.trace_sexo_elegir || '—')}</option>
            <option value="macho"${v === 'macho' ? ' selected' : ''}>${__ubEsc(txt.trace_sexo_macho || 'Macho')}</option>
            <option value="hembra"${v === 'hembra' ? ' selected' : ''}>${__ubEsc(txt.trace_sexo_hembra || 'Hembra')}</option>
        </select>`;
    } else if (tipo === 'bool') {
        const v = value.trim().toLowerCase();
        const yes = v === '1' || v === 'si' || v === 'sí' || v === 'true' || v === 'yes';
        const no = v === '0' || v === 'no' || v === 'false';
        control = `<select name="${__ubEsc(name)}" id="${__ubEsc(id)}" class="form-select form-select-sm mb-2">
            <option value=""${!yes && !no ? ' selected' : ''}>—</option>
            <option value="1"${yes ? ' selected' : ''}>${__ubEsc(txt.trace_bool_si || 'Sí')}</option>
            <option value="0"${no ? ' selected' : ''}>${__ubEsc(txt.trace_bool_no || 'No')}</option>
        </select>`;
    } else if (tipo === 'subespecie' || tipo === 'cepa') {
        const catalog = opts.catalog || {};
        const list = tipo === 'subespecie' ? (catalog.subesps || []) : (catalog.cepas || []);
        const noneLabel = tipo === 'subespecie'
            ? (txt.trace_subject_subespecie_none || '—')
            : (txt.trace_subject_ficha_cepa_none || '—');
        const bioField = tipo === 'subespecie' ? 'idsubespA_sujeto' : 'idcepaA_sujeto';
        const optHtml = [`<option value="">${__ubEsc(noneLabel)}</option>`].concat(
            list.map((x) => {
                const optId = tipo === 'subespecie' ? x.idsubespA : x.idcepaA;
                const optNm = tipo === 'subespecie' ? x.SubEspeNombreA : x.CepaNombreA;
                return `<option value="${optId}"${String(optId) === value ? ' selected' : ''}>${__ubEsc(optNm)}</option>`;
            }),
        );
        const selClass = inputClass.includes('form-select') ? inputClass : inputClass.replace('form-control', 'form-select');
        control = `<select name="${__ubEsc(name)}" id="${__ubEsc(id)}" class="${selClass} mb-2" data-traz-bio-field="${bioField}">${optHtml.join('')}</select>`;
    } else {
        const inputType = __ubMapInputType(cat.TipoDeDato);
        const ph = opts.placeholder != null ? opts.placeholder : '—';
        control = `<input type="${__ubEsc(inputType)}" name="${__ubEsc(name)}" id="${__ubEsc(id)}" class="${inputClass} mb-2" value="${__ubEsc(value)}" placeholder="${__ubEsc(ph)}">`;
    }

    if (layout === 'inline') {
        return `<label style="${labelStyle}" class="${labelClass}">${__ubEsc(label)}</label>${control.replace(' mb-2', '')}`;
    }
    return `<label class="${labelClass}" style="${labelStyle}">${__ubEsc(label)}${optional}</label>${control}`;
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

function __ubCatalogHasPlaces(bundle) {
    if (!bundle) return false;
    return (bundle.ubicacionesFisicas || []).some(__ubAct);
}

function __ubIsAdminConfigUser() {
    const lv = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '99', 10);
    return [1, 2, 4, 5, 6].includes(lv);
}

function __ubNoCatalogHtml(txt) {
    const body = __ubEsc(txt.trace_sin_lugar_fisico_body || 'No hay lugares físicos configurados en esta institución.');
    const adminLink = txt.trace_sin_lugar_fisico_admin_link || 'Configurar ubicación';
    const userHint = __ubEsc(txt.trace_sin_lugar_fisico_user_hint || 'Contacte al administrador del bioterio para habilitar la ubicación física.');
    const adminPart = __ubIsAdminConfigUser()
        ? `<a href="configuracion/alojamientos-ubicacion.html" class="alert-link fw-bold">${__ubEsc(adminLink)}</a>`
        : userHint;
    return `<div class="alert alert-warning small py-2 mb-2 text-start">${body} ${adminPart}</div>`;
}

function __ubHtmlFields(bundle) {
    if (!__ubCatalogHasPlaces(bundle)) return __ubNoCatalogHtml(window.txt?.alojamientos || {});
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
    if (!__ubCatalogHasPlaces(bundle)) {
        return __ubNoCatalogHtml(txt);
    }
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
        const roleOpen = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
        if (!hasTrazabilidadAlojamientosForUser(roleOpen)) return;

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
        const loadTrace = __ubEsc(window.txt?.alojamientos?.trace_loading || window.txt?.generales?.msg_cargando || '…');
        contentDiv.innerHTML = `<div class="text-center text-muted small py-2"><div class="spinner-border spinner-border-sm mb-2" role="status"></div><div>${loadTrace}</div></div>`;
        
        try {
            const instId = localStorage.getItem('instId_temp_qr') || localStorage.getItem('instId') || 1;
        const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${idAlojamiento}&idEspecie=${idEspecie}&instId=${instId}`);
            if (res.status === 'success') await this.renderArbol(contentDiv, res.data, idAlojamiento, idEspecie);
            else throw new Error(res.message);
        } catch (error) { contentDiv.innerHTML = `<div class="alert alert-danger small">Error: ${error.message}</div>`; }
    },

    /** Tras crear un sujeto: desplazar la vista dentro del panel y remarcar brevemente la tarjeta. */
    highlightUnidadCard(idAlojamiento, idEspecieAlojUnidad) {
        const id = parseInt(String(idEspecieAlojUnidad || ''), 10);
        if (!id || !idAlojamiento) return;
        const contentDiv = document.getElementById(`trazabilidad-content-${idAlojamiento}`);
        if (!contentDiv) return;
        requestAnimationFrame(() => {
            const el = contentDiv.querySelector(`[data-traz-unidad-id="${id}"]`);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            el.classList.add('border-success', 'border-2');
            window.setTimeout(() => {
                el.classList.remove('border-success', 'border-2');
            }, 2600);
        });
    },

    async renderArbol(container, data, idAlojamiento, idEspecie) {
        this._lastArbolData[idAlojamiento] = data;
        const txt = window.txt?.alojamientos || {};
        const tipoNombre = data.tipoAlojamiento || txt.box_name;
        const hoy = new Date().toISOString().split('T')[0];
        const limite = data.limiteCajas || 1;
        const cajasActuales = data.cajas ? data.cajas.length : 0;
        const canAddBox = cajasActuales < limite;
        const catsDatos = data.categorias_datos || data.categorias || [];
        const catsInicio = data.categorias_inicio || [];
        const faltaCfgProt = Number(data.faltante_config_traz_protocolo || 0) === 1;
        const faltaCfgInicioProt = Number(data.faltante_config_traz_protocolo_inicio || 0) === 1;
        const faltaCfgDatosProt = Number(data.faltante_config_traz_protocolo_datos || 0) === 1;
        const idProt = Number(data.idprotA || 0);
        const allowTraz = !faltaCfgProt;
        
        // MAGIA DE PERMISOS: Verificamos si estamos en modo lectura
        const isReadOnly = this.isReadOnly || false;
        const needCatalog = __ubCatsNeedCatalog([...catsInicio, ...catsDatos]);
        const especieCatalog = needCatalog ? await __ubLoadEspecieCatalog(idEspecie) : { cepas: [], subesps: [] };
        let ubicBundle = null;
        if (!isReadOnly) {
            ubicBundle = await __ubFetchBundle();
        }

        let html = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 border-bottom pb-2">
                <div class="d-flex align-items-center flex-wrap gap-2">
                    <h6 class="text-primary fw-bold m-0"><i class="bi bi-diagram-3"></i> ${txt.trace_physical || 'Trazabilidad Física'} <span class="badge bg-secondary ms-2">${cajasActuales} / ${limite}</span></h6>
                    <div class="dropdown">
                        <button type="button" class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false" title="${__ubEsc(txt.animal_ficha_dropdown_aloj_title || '')}">
                            <i class="bi bi-collection"></i> ${__ubEsc(txt.animal_ficha_dropdown_aloj_toggle || '')}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                            <li>
                                <button type="button" class="dropdown-item" onclick="window.AnimalFichaUI.openAlojamiento(${idAlojamiento})">
                                    <i class="bi bi-card-heading me-2"></i>${__ubEsc(txt.animal_ficha_btn_tramo || '')}
                                </button>
                            </li>
                            <li>
                                <button type="button" class="dropdown-item text-danger" onclick="window.AnimalFichaUI.downloadPdfAlojamiento(${idAlojamiento})">
                                    <i class="bi bi-file-pdf me-2"></i>${__ubEsc(txt.animal_ficha_btn_tramo_pdf || '')}
                                </button>
                            </li>
                            <li>
                                <button type="button" class="dropdown-item text-success" onclick="window.AnimalFichaUI.downloadExcelAlojamiento(${idAlojamiento})">
                                    <i class="bi bi-file-earmark-spreadsheet me-2"></i>${__ubEsc(txt.animal_ficha_btn_tramo_excel || '')}
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
                <div>
                    ${!isReadOnly ? `
                        <button class="btn btn-sm btn-outline-secondary fw-bold me-2" onclick="window.TrazabilidadUI.importarCajaExistente(${idAlojamiento}, ${idEspecie}, ${limite}, ${cajasActuales})">
                            <i class="bi bi-box-arrow-in-down"></i> ${(txt.trace_bring_previous || 'Traer {tipo} Anterior').replace('{tipo}', tipoNombre)}
                        </button>
                        ${canAddBox 
                            ? `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="window.TrazabilidadUI.addCaja(${idAlojamiento}, ${idEspecie})"><i class="bi bi-plus-lg"></i> ${__ubEsc(txt.trace_btn_add_structure || 'Agregar unidad')}</button>` 
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
                                    ${!isReadOnly ? `<button type="button" class="btn btn-xs btn-link text-white p-0 ms-1" title="${__ubEsc(txt.trace_renombrar || 'Renombrar')}" onclick="window.TrazabilidadUI.renameBox(${caja.IdCajaAlojamiento}, '${__ubJsStr(caja.NombreCaja)}', ${idAlojamiento}, ${idEspecie})"><i class="bi bi-pencil"></i></button>` : ''}
                                    <div class="dropdown d-inline-block ms-1">
                                        <button type="button" class="btn btn-sm btn-outline-light py-0 dropdown-toggle" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false" title="${__ubEsc(txt.animal_ficha_dropdown_caja_title || '')}">
                                            <i class="bi bi-card-heading"></i> ${__ubEsc(txt.animal_ficha_dropdown_caja_toggle || '')}
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                            <li>
                                                <button type="button" class="dropdown-item" onclick="window.AnimalFichaUI.openCaja(${caja.IdCajaAlojamiento})">
                                                    <i class="bi bi-card-heading me-2"></i>${__ubEsc(txt.animal_ficha_btn_caja || '')}
                                                </button>
                                            </li>
                                            <li>
                                                <button type="button" class="dropdown-item text-danger" onclick="window.AnimalFichaUI.downloadPdfCaja(${caja.IdCajaAlojamiento})">
                                                    <i class="bi bi-file-pdf me-2"></i>${__ubEsc(txt.animal_ficha_btn_caja_pdf || '')}
                                                </button>
                                            </li>
                                            <li>
                                                <button type="button" class="dropdown-item text-success" onclick="window.AnimalFichaUI.downloadExcelCaja(${caja.IdCajaAlojamiento})">
                                                    <i class="bi bi-file-earmark-spreadsheet me-2"></i>${__ubEsc(txt.animal_ficha_btn_caja_excel || '')}
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                ${!isReadOnly ? `<button type="button" class="btn btn-xs btn-danger" onclick="window.TrazabilidadUI.deleteBox(${caja.IdCajaAlojamiento}, '${__ubJsStr(caja.NombreCaja)}', ${caja.unidades ? caja.unidades.length : 0}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-trash"></i></button>` : ''}
                            </div>
                            ${headerUbicacion}
                            ${filaUbicacionEditable}
                        </div>
                        <div class="card-body p-2 bg-light">`;
                
                if (caja.unidades && caja.unidades.length > 0) {
                    caja.unidades.forEach(unidad => {
                        const cxOn = Number(unidad.con_cirugia) === 1;
                        html += `
                        <div class="border rounded p-3 mb-2 bg-white shadow-sm" data-traz-unidad-id="${unidad.IdEspecieAlojUnidad}">
                            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3 flex-wrap gap-2">
                                <span class="fw-bold small text-dark"><i class="bi bi-bug-fill text-success"></i> ${unidad.NombreEspecieAloj}${cxOn ? ` <span class="badge bg-warning text-dark ms-1">${__ubEsc(txt.trace_surgery_badge || 'Cirugía')}</span>` : ''}</span>
                                <div class="d-flex align-items-center flex-wrap gap-1">
                                    <div class="dropdown">
                                        <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false" title="${__ubEsc(txt.animal_ficha_dropdown_toggle_title || txt.animal_ficha_title || '')}">
                                            <i class="bi bi-card-heading"></i> ${__ubEsc(txt.animal_ficha_dropdown_toggle || txt.animal_ficha_title || 'Ficha')}
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                            <li>
                                                <button type="button" class="dropdown-item" onclick="window.AnimalFichaUI.open(${unidad.IdEspecieAlojUnidad})">
                                                    <i class="bi bi-card-heading me-2"></i>${__ubEsc(txt.animal_ficha_btn || '')}
                                                </button>
                                            </li>
                                            <li>
                                                <button type="button" class="dropdown-item text-danger" onclick="window.AnimalFichaUI.downloadPdf(${unidad.IdEspecieAlojUnidad})">
                                                    <i class="bi bi-file-pdf me-2"></i>${__ubEsc(txt.animal_ficha_pdf || 'PDF')}
                                                </button>
                                            </li>
                                            <li>
                                                <button type="button" class="dropdown-item text-success" onclick="window.AnimalFichaUI.downloadExcel(${unidad.IdEspecieAlojUnidad})">
                                                    <i class="bi bi-file-earmark-spreadsheet me-2"></i>${__ubEsc(txt.animal_ficha_excel || 'Excel')}
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                    ${!isReadOnly && allowTraz ? `
                                    <button type="button" class="btn btn-xs border ${cxOn ? 'btn-warning text-dark' : 'btn-outline-secondary'}" title="${__ubEsc(txt.trace_surgery_btn_title || '')}" onclick="window.TrazabilidadUI.toggleCirugia(${unidad.IdEspecieAlojUnidad}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-heart-pulse"></i></button>
                                    ${!faltaCfgInicioProt ? `<button type="button" class="btn btn-xs btn-light border text-secondary" title="${__ubEsc(txt.trace_subject_ficha_btn_title || '')}" onclick="window.TrazabilidadUI.editSubjectFicha(${unidad.IdEspecieAlojUnidad}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-clipboard2-pulse"></i></button>` : ''}
                                    <button class="btn btn-xs btn-light border text-primary" onclick="window.TrazabilidadUI.renameSubject(${unidad.IdEspecieAlojUnidad}, '${__ubJsStr(unidad.NombreEspecieAloj)}', ${idAlojamiento}, ${idEspecie})"><i class="bi bi-pencil-square"></i></button>
                                    <button class="btn btn-xs btn-light border text-danger" onclick="window.TrazabilidadUI.deleteSubject(${unidad.IdEspecieAlojUnidad}, '${__ubJsStr(unidad.NombreEspecieAloj)}', ${unidad.observaciones_pivot ? unidad.observaciones_pivot.length : 0}, ${idAlojamiento}, ${idEspecie})"><i class="bi bi-x-circle"></i></button>` : ''}
                                </div>
                            </div>`;
                        
                        if (!isReadOnly && faltaCfgProt) {
                            const missingBits = []
                            if (faltaCfgInicioProt) missingBits.push(__ubEsc(txt.trace_falta_cfg_missing_inicio || 'Inicio (ficha del animal)'));
                            if (faltaCfgDatosProt) missingBits.push(__ubEsc(txt.trace_falta_cfg_missing_datos || 'Datos'));
                            const missingTxt = missingBits.length ? ('<br><span class="text-muted">' + __ubEsc(txt.trace_falta_cfg_missing_prefix || 'Falta:') + ' ' + missingBits.join(', ') + '</span>') : '';
                            html += `
                            <div class="alert alert-warning small py-2 mb-3">
                                <div class="fw-bold">${__ubEsc(txt.trace_falta_cfg_title || 'Falta configuración de trazabilidad')}</div>
                                <div>${__ubEsc((txt.trace_falta_cfg_body || 'Este protocolo no tiene trazabilidad configurada para esta especie. Debe configurarla para poder registrar Inicio/Datos.').replace('{idprotA}', String(idProt || '')))}${missingTxt}</div>
                            </div>`;
                        }

                        const vin = unidad.valores_inicio || {};
                        const valIni = (idCat, cat) => __ubValCampoTraz(cat, unidad, vin, idCat);
                        if (!isReadOnly && allowTraz && !faltaCfgInicioProt) {
                            const cxInicioChecked = cxOn ? ' checked' : '';
                            html += `
                            <form class="mb-3 pb-2 border-bottom border-secondary border-opacity-25" onsubmit="event.preventDefault(); window.guardarInicioTraz(${unidad.IdEspecieAlojUnidad}, ${idAlojamiento}, ${idEspecie}, this)">
                                <div class="small fw-bold text-secondary mb-2 text-uppercase" style="font-size:10px">${__ubEsc(txt.trace_inicio_title || '')}</div>
                                <p class="small text-muted mb-2" style="font-size:10px">${__ubEsc(txt.trace_inicio_hint || '')}</p>
                                <div class="row g-2 align-items-end">
                                <div class="col-auto">
                                    <div class="form-check mb-1">
                                        <input class="form-check-input" type="checkbox" name="inicio_con_cirugia" id="inicio-cirugia-${unidad.IdEspecieAlojUnidad}"${cxInicioChecked}>
                                        <label class="form-check-label small" for="inicio-cirugia-${unidad.IdEspecieAlojUnidad}">${__ubEsc(txt.trace_subject_ficha_con_cirugia || '')}</label>
                                    </div>
                                </div>`;
                            catsInicio.forEach((cat) => {
                                html += `<div class="col-auto">${__ubRenderCampoTraz(cat, {
                                    name: `inicio_${cat.IdDatosUnidadAloj}`,
                                    value: valIni(cat.IdDatosUnidadAloj, cat),
                                    layout: 'inline',
                                    catalog: especieCatalog,
                                    labelClass: 'text-uppercase text-secondary fw-bold',
                                    labelStyle: 'font-size: 9px;',
                                    inputClass: 'form-control form-control-sm border-secondary',
                                })}</div>`;
                            });
                            html += `<div class="col-auto"><button type="submit" class="btn btn-sm btn-outline-primary fw-bold shadow-sm">${__ubEsc(txt.trace_inicio_guardar || 'Guardar')}</button></div></div></form>`;
                        }
                        // Ocultamos el formulario EAV si es solo lectura
                        if (!isReadOnly && allowTraz) {
                            html += `
                            <form onsubmit="event.preventDefault(); window.guardarObservacion(${unidad.IdEspecieAlojUnidad}, ${idAlojamiento}, ${idEspecie}, this)">
                                    <div class="row g-2 align-items-end">
                                    <div class="col-auto">
                                        <label style="font-size: 9px;" class="text-uppercase text-primary fw-bold">${txt.trace_fecha || 'Fecha'}</label>
                                        <input type="date" name="fechaObs" class="form-control form-control-sm border-primary" value="${hoy}" title="${__ubEsc(txt.trace_fecha_hoy_hint || '')}">
                                    </div>`;
                            
                            if (catsDatos.length > 0) {
                                catsDatos.forEach(cat => {
                                    html += `<div class="col-auto">${__ubRenderCampoTraz(cat, {
                                        name: `cat_${cat.IdDatosUnidadAloj}`,
                                        layout: 'inline',
                                        catalog: especieCatalog,
                                        labelClass: 'text-uppercase text-muted fw-bold',
                                        labelStyle: 'font-size: 9px;',
                                        inputClass: 'form-control form-control-sm border-secondary',
                                        placeholder: '—',
                                    })}</div>`;
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
                                            ${catsDatos.length ? catsDatos.map(c => `<th>${c.NombreCatAlojUnidad}</th>`).join('') : ''}
                                        </tr>
                                    </thead>
                                    <tbody>${this.renderPivotTable(unidad.observaciones_pivot, catsDatos)}</tbody>
                                </table>
                            </div>
                        </div>`;
                    });
                }
                
                // Para crear sujetos se requiere configuración completa del protocolo (inicio + datos).
                if (!isReadOnly && allowTraz && catsInicio.length > 0 && catsDatos.length > 0) {
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
    mapInputType(t) {
        return __ubMapInputType(t);
    },

    renderPivotTable(obsPivot, categorias) {
        const txt = window.txt?.alojamientos || {};
        if (!obsPivot || obsPivot.length === 0) return `<tr><td colspan="${(categorias?categorias.length:0)+1}" class="text-muted fst-italic">${txt.trace_sin_registros || 'Sin registros'}</td></tr>`;
        return obsPivot.map(row => `
            <tr>
                <td class="fw-bold text-secondary">${row.fechaObs}</td>
                ${categorias.map(c => {
                    const raw = row.valores[c.NombreCatAlojUnidad] || '-';
                    const isLong = String(c.TipoDeDato || '').toLowerCase() === 'text';
                    return `<td class="${isLong ? 'text-start text-break' : ''}">${raw}</td>`;
                }).join('')}
            </tr>
        `).join('');
    },

    // ---------------------- MUTACIONES CRUD -----------------------
    async addCaja(idAlojamiento, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const bundle = await __ubFetchBundle();
        const hasPlaces = bundle && __ubCatalogHasPlaces(bundle);
        let html = `
            <p class="text-muted small text-start mb-2">${__ubEsc(txt.trace_crear_estructura_hint || 'Indique una etiqueta visible. Los sujetos se agregan después manualmente.')}</p>
            <input id="swal-box-name" class="form-control mb-2" placeholder="${__ubEsc(txt.trace_nombre_placeholder || 'Nombre')}">`;
        if (hasPlaces) {
            html += __ubHtmlFields(bundle);
        } else if (bundle) {
            html += __ubNoCatalogHtml(txt);
        } else {
            html += `<p class="text-muted small mb-0">${__ubEsc(txt.trace_ubicacion_bundle_error || '')}</p>`;
        }

        const { value: formValues } = await Swal.fire({
            title: txt.trace_crear_estructura || 'Agregar unidad',
            target: document.getElementById('modal-historial') || 'body',
            html,
            showCancelButton: true,
            confirmButtonText: txt.trace_crear_btn || 'Crear',
            width: '32rem',
            didOpen: () => { if (hasPlaces) __ubWireUbicacion(bundle, null); },
            preConfirm: () => {
                const name = document.getElementById('swal-box-name').value;
                const ubic = hasPlaces ? __ubReadUbicacionFromForm(false) : {};
                return { name, ubicacion: Object.keys(ubic).length ? ubic : null };
            }
        });
        if (formValues) {
            const body = {
                idAlojamiento,
                nombreCaja: formValues.name,
                cantidadUnidades: 0,
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
        try {
            const res = await API.request('/trazabilidad/update-caja-ubicacion', 'POST', { idCaja, ubicacion });
            if (res.status !== 'success') throw new Error(res.message || 'Error');
            await this.refreshArbol(idAlojamiento, idEspecie);
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: txt.trace_error || 'Error', text: String(e.message || e), target: document.getElementById('modal-historial') || 'body' });
        }
    },

async toggleCirugia(idEspecieAlojUnidad, idAlojamiento, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const target = document.getElementById('modal-historial') || 'body';
        try {
            const res = await API.request('/trazabilidad/toggle-con-cirugia', 'POST', { idEspecieAlojUnidad });
            if (res.status !== 'success') {
                throw new Error(res.message || txt.trace_error || 'Error');
            }
            await this.refreshArbol(idAlojamiento, idEspecie);
        } catch (e) {
            console.error(e);
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: txt.trace_error || 'Error', text: String(e.message || e), target });
            }
        }
    },

async addSubject(idCaja, idAlojamiento, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const tCom = window.txt?.comunicacion || {};
        const Swal = window.Swal;
        const target = document.getElementById('modal-historial') || 'body';
        const arbol = this._lastArbolData[idAlojamiento] || {};
        const catsInicio = (arbol.categorias_inicio || []).filter((c) => Number(c.Habilitado) !== 2);
        const needCatalog = __ubCatsNeedCatalog(catsInicio);
        const especieCatalog = needCatalog ? await __ubLoadEspecieCatalog(idEspecie) : { cepas: [], subesps: [] };

        let html = `<label class="form-label small text-start d-block fw-bold mb-1">${__ubEsc(txt.trace_nombre_sujeto || 'Nombre del Sujeto')}</label>
            <input id="swal-subject-name" class="form-control mb-2" placeholder="${__ubEsc(txt.trace_nombre_placeholder || '')}">
            <div class="form-check text-start mb-2">
                <input class="form-check-input" type="checkbox" id="swal-subject-cirugia">
                <label class="form-check-label small" for="swal-subject-cirugia">${__ubEsc(txt.trace_subject_ficha_con_cirugia || '')}</label>
            </div>`;
        if (catsInicio.length) {
            html += `<hr class="my-2"><p class="small text-muted text-start mb-2">${__ubEsc(txt.trace_add_inicio_hint || '')}</p>`;
            catsInicio.forEach((cat) => {
                html += __ubRenderCampoTraz(cat, {
                    name: `swal-inicio-${cat.IdDatosUnidadAloj}`,
                    id: `swal-inicio-${cat.IdDatosUnidadAloj}`,
                    layout: 'stack',
                    catalog: especieCatalog,
                    showOptional: true,
                });
            });
        }

        const rSub = await Swal.fire({
            title: txt.trace_add_subject || 'Añadir Sujeto',
            html,
            target,
            showCancelButton: true,
            confirmButtonText: txt.trace_crear_btn || 'Crear',
            width: catsInicio.length ? '28rem' : undefined,
            focusConfirm: false,
            preConfirm: () => {
                const nombre = document.getElementById('swal-subject-name')?.value;
                const nombreTrim = nombre != null ? String(nombre).trim() : '';
                if (!nombreTrim) {
                    Swal.showValidationMessage(txt.trace_nombre_requerido || 'El nombre es obligatorio');
                    return false;
                }
                const valores = [];
                catsInicio.forEach((cat) => {
                    const el = document.getElementById(`swal-inicio-${cat.IdDatosUnidadAloj}`);
                    const t = String(cat.TipoDeDato || '').toLowerCase();
                    if (t === 'subespecie' || t === 'cepa') return;
                    const v = el ? String(el.value ?? '').trim() : '';
                    if (v) {
                        valores.push({ IdDatosUnidadAloj: cat.IdDatosUnidadAloj, valor: v });
                    }
                });
                return {
                    nombre: nombreTrim,
                    valores,
                    conCirugia: !!document.getElementById('swal-subject-cirugia')?.checked,
                    bio: __ubCollectBioPatchFromSwal(),
                };
            },
        });
        if (!rSub.isConfirmed || !rSub.value) return;
        const { nombre: nombreTrim, valores: valoresInicio, conCirugia, bio: bioInicio } = rSub.value;
        try {
            const res = await API.request('/trazabilidad/add-subject', 'POST', {
                idCaja,
                idAlojamiento,
                nombreSujeto: nombreTrim,
            });
            if (res.status !== 'success') {
                throw new Error(res.message || txt.trace_error || 'Error');
            }
            const idEu = parseInt(res.data?.IdEspecieAlojUnidad, 10) || 0;
            if (idEu > 0 && valoresInicio.length) {
                await API.request('/trazabilidad/save-inicio-traz', 'POST', {
                    IdEspecieAlojUnidad: idEu,
                    valores: valoresInicio,
                });
            }
            if (idEu > 0 && conCirugia) {
                await API.request('/trazabilidad/toggle-con-cirugia', 'POST', { idEspecieAlojUnidad: idEu });
            }
            if (idEu > 0 && bioInicio && Object.keys(bioInicio).length) {
                await API.request('/trazabilidad/update-subject-ficha-bio', 'POST', {
                    IdEspecieAlojUnidad: idEu,
                    ...bioInicio,
                });
            }
            await this.refreshArbol(idAlojamiento, idEspecie);
            if (idEu > 0) {
                const follow = await Swal.fire({
                    icon: 'success',
                    title: txt.trace_subject_added_ok || '',
                    html: `<p class="text-start small mb-0">${__ubEsc(txt.trace_subject_added_hint || '')}</p>`,
                    target,
                    showCancelButton: true,
                    confirmButtonText: txt.trace_subject_open_ficha_btn || '',
                    cancelButtonText: tCom.modal_cerrar || '',
                });
                this.highlightUnidadCard(idAlojamiento, idEu);
                if (follow.isConfirmed) {
                    await this.editSubjectFicha(idEu, idAlojamiento, idEspecie);
                }
            } else if (Swal) {
                await Swal.fire({
                    icon: 'success',
                    title: txt.trace_subject_added_ok || '',
                    timer: 1400,
                    showConfirmButton: false,
                    target,
                });
            }
        } catch (e) {
            console.error(e);
            if (Swal) {
                Swal.fire({
                    icon: 'error',
                    title: txt.trace_error || 'Error',
                    text: String(e.message || e),
                    target,
                });
            }
        }
    },

    async renameSubject(idUnidad, nombreActual, idAlojamiento, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        const target = document.getElementById('modal-historial') || 'body';
        const { prefijoFijo, etiqueta } = __ubParseNombreSujeto(nombreActual);
        const html = `
            <p class="small text-muted mb-1 text-start">${__ubEsc(txt.trace_id_fijo_readonly || '')}</p>
            <div class="form-control form-control-sm mb-2 text-start font-monospace text-break bg-light" style="white-space:pre-wrap">${__ubEsc(prefijoFijo || '—')}</div>
            <label class="form-label small mb-0 text-start d-block">${__ubEsc(txt.trace_etiqueta || '')}</label>
            <input id="swal-rename-sub-etq" class="form-control" value="${__ubEsc(etiqueta)}">`;
        const rSub = await Swal.fire({
            title: txt.trace_editar_nombre || 'Editar nombre',
            html,
            target,
            showCancelButton: true,
            confirmButtonText: txt.trace_guardar || 'Guardar',
            focusConfirm: false,
            preConfirm: () => document.getElementById('swal-rename-sub-etq')?.value ?? '',
        });
        if (!rSub.isConfirmed) return;
        const newEtq = String(rSub.value ?? '').trim();
        if (newEtq === etiqueta.trim()) return;
        await API.request('/trazabilidad/rename-subject', 'POST', { idUnidad, nombre: newEtq });
        await this.refreshArbol(idAlojamiento, idEspecie);
    },

    async editSubjectFicha(idEspecieAlojUnidad, idAlojamiento, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        const target = document.getElementById('modal-historial') || 'body';
        try {
            const res = await API.request(`/trazabilidad/ficha-animal?idEspecieAlojUnidad=${encodeURIComponent(String(idEspecieAlojUnidad))}`, 'GET');
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || txt.animal_ficha_error || 'Error');
            }
            const s = res.data.sujeto || {};
            let cepas = [];
            try {
                const cr = await API.request(`/admin/config/cepas/all?idespA=${encodeURIComponent(String(idEspecie))}`, 'GET');
                if (cr.status === 'success' && Array.isArray(cr.data)) {
                    cepas = cr.data.filter((c) => String(c.Habilitado) !== '2');
                }
            } catch (e) {
                cepas = [];
            }
            let subesps = [];
            try {
                const sr = await API.request(`/admin/config/subespecies/by-especie?idespA=${encodeURIComponent(String(idEspecie))}`, 'GET');
                if (sr.status === 'success' && Array.isArray(sr.data)) {
                    subesps = sr.data.filter((x) => String(x.Existe) !== '2');
                }
            } catch (e) {
                subesps = [];
            }
            const selCepa = String(s.idcepaA_sujeto ?? '');
            const cepaOpts = [`<option value="">${__ubEsc(txt.trace_subject_ficha_cepa_none || '—')}</option>`].concat(
                cepas.map((c) => `<option value="${c.idcepaA}"${String(c.idcepaA) === selCepa ? ' selected' : ''}>${__ubEsc(c.CepaNombreA)}</option>`),
            );
            const selSub = String(s.idsubespA_sujeto ?? '');
            const subOpts = [`<option value="">${__ubEsc(txt.trace_subject_subespecie_none || '—')}</option>`].concat(
                subesps.map((x) => `<option value="${x.idsubespA}"${String(x.idsubespA) === selSub ? ' selected' : ''}>${__ubEsc(x.SubEspeNombreA)}</option>`),
            );
            const cirugiaChecked = Number(s.con_cirugia) === 1 ? ' checked' : '';
            const pesoVal = s.PesoSujetoKg !== null && s.PesoSujetoKg !== undefined && s.PesoSujetoKg !== '' ? String(s.PesoSujetoKg) : '';
            const fn = s.FechaNacimientoSujeto ? String(s.FechaNacimientoSujeto).slice(0, 10) : '';
            const rawSex = String(s.SexoSujeto || '').toUpperCase().trim();
            let sexSel = '';
            if (rawSex === 'M' || rawSex === 'MACHO' || rawSex === 'MALE') sexSel = 'M';
            else if (rawSex === 'H' || rawSex === 'F' || rawSex === 'HEMBRA' || rawSex === 'FEMALE') sexSel = 'H';
            else if (rawSex === 'I' || rawSex === 'INDISTINTO' || rawSex === 'IND') sexSel = 'I';
            const html = `
                <div class="text-start small">
                  <label class="form-label mb-0">${__ubEsc(txt.animal_ficha_peso || '')}</label>
                  <input type="number" step="0.001" id="sf-peso" class="form-control form-control-sm mb-2" value="${__ubEsc(pesoVal)}">
                  <label class="form-label mb-0">${__ubEsc(txt.animal_ficha_nacimiento || '')}</label>
                  <input type="date" id="sf-fn" class="form-control form-control-sm mb-2" value="${__ubEsc(fn)}">
                  <label class="form-label mb-0">${__ubEsc(txt.animal_ficha_sexo || '')}</label>
                  <select id="sf-sexo" class="form-select form-select-sm mb-2">
                    <option value="">${__ubEsc(txt.trace_sexo_elegir || '—')}</option>
                    <option value="M"${sexSel === 'M' ? ' selected' : ''}>${__ubEsc(txt.trace_sexo_macho || '')}</option>
                    <option value="H"${sexSel === 'H' ? ' selected' : ''}>${__ubEsc(txt.trace_sexo_hembra || '')}</option>
                    <option value="I"${sexSel === 'I' ? ' selected' : ''}>${__ubEsc(txt.trace_sexo_indistinto || '')}</option>
                  </select>
                  <label class="form-label mb-0">${__ubEsc(txt.animal_ficha_cepa_catalogo || '')}</label>
                  <select id="sf-cepa" class="form-select form-select-sm mb-2">${cepaOpts.join('')}</select>
                  <label class="form-label mb-0">${__ubEsc(txt.animal_ficha_subespecie || '')}</label>
                  <select id="sf-subesp" class="form-select form-select-sm mb-2">${subOpts.join('')}</select>
                  <div class="form-check mb-0">
                    <input class="form-check-input" type="checkbox" id="sf-cirugia"${cirugiaChecked}>
                    <label class="form-check-label" for="sf-cirugia">${__ubEsc(txt.trace_subject_ficha_con_cirugia || '')}</label>
                  </div>
                </div>`;

            const { value: formValues } = await Swal.fire({
                title: txt.trace_edit_subject_ficha || 'Datos del sujeto',
                html,
                target,
                showCancelButton: true,
                confirmButtonText: txt.trace_subject_ficha_save || 'Guardar',
                width: 'min(32rem, 96vw)',
                preConfirm: () => ({
                    PesoSujetoKg: document.getElementById('sf-peso').value,
                    FechaNacimientoSujeto: document.getElementById('sf-fn').value,
                    SexoSujeto: document.getElementById('sf-sexo').value,
                    idcepaA_sujeto: document.getElementById('sf-cepa').value,
                    idsubespA_sujeto: document.getElementById('sf-subesp').value,
                    con_cirugia: document.getElementById('sf-cirugia')?.checked ? 1 : 0,
                }),
            });
            if (!formValues) return;
            const body = {
                IdEspecieAlojUnidad: idEspecieAlojUnidad,
                PesoSujetoKg: formValues.PesoSujetoKg,
                FechaNacimientoSujeto: formValues.FechaNacimientoSujeto,
                SexoSujeto: formValues.SexoSujeto,
                idcepaA_sujeto: formValues.idcepaA_sujeto,
                idsubespA_sujeto: formValues.idsubespA_sujeto,
                con_cirugia: formValues.con_cirugia,
            };
            const saveRes = await API.request('/trazabilidad/update-subject-ficha-bio', 'POST', body);
            if (saveRes.status !== 'success') {
                throw new Error(saveRes.message || txt.trace_error || 'Error');
            }
            await this.refreshArbol(idAlojamiento, idEspecie);
        } catch (e) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: txt.trace_error || 'Error', text: String(e.message || e), target });
            }
        }
    },

    async renameBox(idCaja, nombre, idAloj, idEspecie) {
        const txt = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        const target = document.getElementById('modal-historial') || 'body';
        const { prefijo, etiqueta } = __ubParseNombreCaja(nombre);
        const html = `
            <p class="small text-muted mb-1 text-start">${__ubEsc(txt.trace_id_fijo_readonly || '')}</p>
            <div class="input-group input-group-sm mb-2">
              <span class="input-group-text font-monospace">${__ubEsc(prefijo || '—')}</span>
            </div>
            <label class="form-label small mb-0 text-start d-block">${__ubEsc(txt.trace_etiqueta || '')}</label>
            <input id="swal-rename-box-etq" class="form-control" value="${__ubEsc(etiqueta)}">`;
        const rBox = await Swal.fire({
            title: txt.trace_renombrar_caja || txt.trace_renombrar || 'Renombrar',
            html,
            target,
            showCancelButton: true,
            confirmButtonText: txt.trace_guardar || 'Guardar',
            focusConfirm: false,
            preConfirm: () => document.getElementById('swal-rename-box-etq')?.value ?? '',
        });
        if (!rBox.isConfirmed) return;
        const newEtq = String(rBox.value ?? '').trim();
        if (newEtq === etiqueta.trim()) return;
        await API.request('/trazabilidad/rename-box', 'POST', { idCaja, nombre: newEtq });
        await this.refreshArbol(idAloj, idEspecie);
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
                try {
                    await API.request('/trazabilidad/clone-past-boxes', 'POST', { idAlojamientoActual, cajas, unidades });
                    await this.refreshArbol(idAlojamientoActual, idEspecie);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }
};

function __obsValorTieneContenido(v) {
    if (v === null || v === undefined) return false;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s !== '';
}

window.guardarObservacion = async (idUnidad, idAlojamiento, idEspecie, formEl) => {
    const txt = window.txt?.alojamientos || {};
    const fd = new FormData(formEl);
    let fechaObs = fd.get('fechaObs');
    if (!fechaObs || !String(fechaObs).trim()) {
        fechaObs = new Date().toISOString().split('T')[0];
    }
    const p = { IdEspecieAlojUnidad: idUnidad, fechaObs: String(fechaObs).trim(), IdInstitucion: localStorage.getItem('instId') || 1, valores: [] };
    fd.forEach((v, k) => {
        if (k.startsWith('cat_') && __obsValorTieneContenido(v)) {
            p.valores.push({ IdDatosUnidadAloj: k.replace('cat_', ''), valor: v });
        }
    });
    if (p.valores.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'info', title: txt.trace_obs_min_one_title || '', text: txt.trace_obs_min_one || '', target: document.getElementById('modal-historial') || 'body' });
        }
        return;
    }
    try {
        const res = await API.request('/trazabilidad/save-observation', 'POST', p);
        if (res.status !== 'success') {
            throw new Error(res.message || 'Error');
        }
        await TrazabilidadUI.refreshArbol(idAlojamiento, idEspecie);
    } catch (e) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: txt.trace_error || 'Error', text: String(e.message || e), target: document.getElementById('modal-historial') || 'body' });
        }
    }
};

window.guardarInicioTraz = async (idUnidad, idAlojamiento, idEspecie, formEl) => {
    const p = { IdEspecieAlojUnidad: idUnidad, valores: [] };
    Array.from(formEl.elements || []).forEach((el) => {
        const k = el.name;
        if (!k || !k.startsWith('inicio_') || k === 'inicio_con_cirugia') return;
        if (el.getAttribute('data-traz-bio-field')) return;
        p.valores.push({ IdDatosUnidadAloj: k.replace('inicio_', ''), valor: el.value ?? '' });
    });
    const cirugiaEl = formEl.querySelector('[name="inicio_con_cirugia"]');
    const bioPatch = __ubCollectBioPatchFromForm(formEl);
    let didSave = false;
    if (p.valores.length > 0) {
        await API.request('/trazabilidad/save-inicio-traz', 'POST', p);
        didSave = true;
    }
    if (cirugiaEl || Object.keys(bioPatch).length) {
        const body = { IdEspecieAlojUnidad: idUnidad, ...bioPatch };
        if (cirugiaEl) body.con_cirugia = cirugiaEl.checked ? 1 : 0;
        await API.request('/trazabilidad/update-subject-ficha-bio', 'POST', body);
        didSave = true;
    }
    if (didSave) {
        await TrazabilidadUI.refreshArbol(idAlojamiento, idEspecie);
    }
};
window.TrazabilidadUI = TrazabilidadUI;
window.AnimalFichaUI = AnimalFichaUI;