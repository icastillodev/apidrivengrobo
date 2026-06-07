import { API } from '../../../api.js';

let currentSpeciesId = null;
let currentSpeciesName = '';
/** @type {Array<{idespA:number, EspeNombreA:string, Habilitado?:string|number}>} */
let speciesCache = [];
let currentVarsInicio = [];
let currentVarsDatos = [];
/** @type {Array<any>} */
let protocolosCache = [];

function txtCfg() {
    return window.txt?.config_alojamientos || {};
}

function escAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getProtSelectValue() {
    const el = document.getElementById('sel-prot-traz');
    if (!el || el.value === '' || el.value === null) {
        return '';
    }
    return String(el.value);
}

function protQuerySuffix() {
    const v = getProtSelectValue();
    return v ? `&prot=${encodeURIComponent(v)}` : '';
}

function getProtSelectedId() {
    const v = getProtSelectValue();
    const n = parseInt(String(v || ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function ensureProtocolSelectedOrWarn() {
    const t = txtCfg();
    if (getProtSelectedId() > 0) {
        return true;
    }
    if (window.Swal) {
        window.Swal.fire({
            icon: 'warning',
            title: t.prot_warn_title || (window.txt?.generales?.atencion || 'Atención'),
            text: t.prot_warn_body || 'Seleccione un protocolo para configurar Trazabilidad (inicio/datos).',
        });
    }
    return false;
}

function setTrazTabsEnabled(enabled) {
    const a = document.getElementById('traz-inicio-tab');
    const b = document.getElementById('traz-datos-tab');
    [a, b].forEach((btn) => {
        if (!btn) return;
        btn.disabled = !enabled;
        btn.classList.toggle('disabled', !enabled);
        btn.setAttribute('aria-disabled', (!enabled).toString());
        if (!enabled && btn.classList.contains('active')) {
            document.getElementById('types-tab')?.click?.();
        }
    });
}

function getProtSearchTerm() {
    const el = document.getElementById('inp-prot-traz-search');
    return String(el?.value || '').trim().toLowerCase();
}

function applyProtocolFilter() {
    fillProtocolSelect(protocolosCache || []);
}

function wireProtocolSearchInput() {
    const inp = document.getElementById('inp-prot-traz-search');
    if (!inp) return;
    inp.oninput = () => applyProtocolFilter();
    inp.onkeydown = (e) => {
        if (e.key === 'Escape') {
            inp.value = '';
            applyProtocolFilter();
        }
    };
}

function fillProtocolSelect(protocolos) {
    const sel = document.getElementById('sel-prot-traz');
    if (!sel) {
        return;
    }
    sel.onchange = null;
    const prev = sel.value;
    const t = txtCfg();
    sel.innerHTML = '';

    const term = getProtSearchTerm();
    let filtered = (protocolos || []);
    if (term) {
        filtered = filtered.filter((p) => {
            const tit = String(p?.tituloA || '').toLowerCase();
            const cod = String(p?.nprotA || '').toLowerCase();
            const id = String(p?.idprotA || '').toLowerCase();
            return tit.includes(term) || cod.includes(term) || id.includes(term);
        });
    }

    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = t.prot_placeholder || '— Seleccione un protocolo —';
    opt0.disabled = true;
    opt0.selected = true;
    sel.appendChild(opt0);
    (filtered || []).forEach((p) => {
        const o = document.createElement('option');
        o.value = String(p.idprotA);
        const tit = (p.tituloA || '').trim();
        const cod = (p.nprotA || '').trim();
        o.textContent = cod ? `${cod} — ${tit.slice(0, 80)}` : tit.slice(0, 100) || `ID ${p.idprotA}`;
        sel.appendChild(o);
    });
    if (prev && [...sel.options].some((o) => o.value === prev)) {
        sel.value = prev;
    } else {
        sel.value = '';
    }
    setTrazTabsEnabled(getProtSelectedId() > 0);
    sel.onchange = () => loadDetails();
}

export async function initConfigAlojamientos() {
    await loadSpeciesList();
    wireProtocolSearchInput();
    document.getElementById('form-type').onsubmit = saveHousingType;
    document.getElementById('form-cat').onsubmit = saveClinicalVar;
    const tabs = ['traz-inicio-tab', 'traz-datos-tab'];
    tabs.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('show.bs.tab', (ev) => {
            if (!ensureProtocolSelectedOrWarn()) {
                ev.preventDefault();
            }
        });
    });
}

async function loadSpeciesList() {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('list-species');
    const t = txtCfg();
    const gen = window.txt?.generales || {};
    const loadMsg = escAttr(t.cargando || gen.msg_cargando || '…');
    container.innerHTML = `<div class="text-center p-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadMsg}</div></div>`;

    try {
        const res = await API.request(`/admin/config/especies/all?inst=${instId}`);
        container.innerHTML = '';

        if (res.status === 'success' && res.data.length > 0) {
            speciesCache = res.data.filter((esp) => esp.Habilitado != 2);
            speciesCache.forEach((esp) => {
                const item = document.createElement('button');
                item.className = 'list-group-item list-group-item-action species-item py-3';
                item.innerHTML = `<div class="fw-bold text-uppercase">${esp.EspeNombreA}</div>`;
                item.onclick = () => selectSpecies(esp.idespA, esp.EspeNombreA, item);
                container.appendChild(item);
            });
        } else {
            speciesCache = [];
            container.innerHTML = `<div class="p-3 text-muted small text-center">${escAttr(t.sin_especies_activas || '')}</div>`;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-danger p-3 small">${escAttr(t.error_cargar_especies || gen.error || '')}</div>`;
    }
}

function selectSpecies(id, name, element) {
    currentSpeciesId = id;
    currentSpeciesName = name;

    document.querySelectorAll('.species-item').forEach((el) => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('config-panel').classList.remove('d-none');
    document.getElementById('lbl-selected-species').innerText = name;

    loadDetails();
}

async function loadDetails() {
    if (!currentSpeciesId) {
        return;
    }

    const tLd = txtCfg();
    const genLd = window.txt?.generales || {};
    const rowMsg = escAttr(tLd.cargando || genLd.msg_cargando || '…');
    document.getElementById('table-types').innerHTML =
        `<tr><td colspan="4" class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${rowMsg}</div></td></tr>`;
    ['table-traz-inicio', 'table-traz-datos'].forEach((tid) => {
        const el = document.getElementById(tid);
        if (el) {
            el.innerHTML =
                `<tr><td colspan="5" class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${rowMsg}</div></td></tr>`;
        }
    });

    try {
        const res = await API.request(
            `/admin/config/alojamiento/details?esp=${currentSpeciesId}${protQuerySuffix()}&t=${Date.now()}`,
        );
        if (res.status === 'success') {
            protocolosCache = res.data.protocolos || [];
            fillProtocolSelect(protocolosCache);
            renderTypes(res.data.types);
            currentVarsInicio = res.data.categories_inicio || [];
            currentVarsDatos = res.data.categories_datos || res.data.categories || [];
            renderClinicalRows(currentVarsInicio, 'table-traz-inicio', 'inicio');
            renderClinicalRows(currentVarsDatos, 'table-traz-datos', 'datos');
            setTrazTabsEnabled(getProtSelectedId() > 0);
        }
    } catch (e) {
        console.error(e);
    }
}

function traducirTipoDato(tipo) {
    const t = window.txt?.config_alojamientos || {};
    const diccionario = {
        varchar: t.dt_varchar || 'Texto Breve',
        text: t.dt_text || 'Texto Largo',
        int: t.dt_int || 'Num. Entero',
        decimal: t.dt_decimal || 'Num. Decimal',
        date: t.dt_date || 'Fecha',
        bool: t.dt_bool || 'Sí / No',
        sexo: t.dt_sexo || 'Sexo',
        subespecie: t.dt_subespecie || 'Subespecie',
        cepa: t.dt_cepa || 'Cepa',
    };
    return diccionario[String(tipo || '').toLowerCase()] || tipo;
}

function renderTypes(list) {
    const tbody = document.getElementById('table-types');
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="text-center text-muted small fst-italic py-3">Sin tipos definidos.</td></tr>';
        return;
    }

    list.forEach((t) => {
        const isInactive = t.Habilitado == 2;
        tbody.innerHTML += `
            <tr class="${isInactive ? 'bg-light text-muted' : ''}">
                <td class="fw-bold ${isInactive ? 'text-muted' : 'text-dark'}">${t.NombreTipoAlojamiento}</td>
                <td class="small">${t.DetalleTipoAlojamiento || '-'}</td>
                <td class="text-center">
                    <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} rounded-pill" style="font-size: 10px; width: 80px;">
                        ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-danger' : 'btn-outline-success'} border-0"
                            onclick="window.toggleType(${t.IdTipoAlojamiento}, ${t.Habilitado})" title="Habilitar/Deshabilitar">
                        <i class="bi ${isInactive ? 'bi-toggle-off fs-5 text-danger' : 'bi-toggle-on fs-5 text-success'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1"
                            onclick="window.openModalType(${t.IdTipoAlojamiento}, '${String(t.NombreTipoAlojamiento || '').replace(/'/g, "\\'")}', '${String(t.DetalleTipoAlojamiento || '').replace(/'/g, "\\'")}', ${t.Habilitado})">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-link text-danger p-0 border-0 ms-1" onclick="window.deleteType(${t.IdTipoAlojamiento})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderClinicalRows(list, tbodyId, alcance) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
        return;
    }
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted small fst-italic py-3">Sin variables definidas.</td></tr>';
        return;
    }
    list.forEach((c, idx) => {
        let parentName = '-';
        if (c.dependencia_id) {
            const parent = list.find((p) => p.IdDatosUnidadAloj == c.dependencia_id);
            if (parent) {
                parentName = `<span class="badge bg-light text-secondary border">${parent.NombreCatAlojUnidad}</span>`;
            }
        }
        const tipoHumano = traducirTipoDato(c.TipoDeDato);
        const isInactive = c.Habilitado == 2;
        const protLbl = c.idprotA ? `<span class="badge bg-secondary-subtle text-secondary-emphasis border ms-1">#${c.idprotA}</span>` : '';

        tbody.innerHTML += `
            <tr class="${isInactive ? 'bg-light text-muted' : ''}">
                <td class="fw-bold ${isInactive ? 'text-muted' : 'text-dark'}">${c.NombreCatAlojUnidad}${protLbl}</td>
                <td><span class="badge bg-info-subtle text-info-emphasis border border-info">${tipoHumano}</span></td>
                <td>${parentName}</td>
                <td class="text-center">
                    <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} rounded-pill" style="font-size: 10px; width: 80px;">
                        ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-danger' : 'btn-outline-success'} border-0"
                            onclick="window.toggleCat(${c.IdDatosUnidadAloj}, ${c.Habilitado})" title="Habilitar/Deshabilitar">
                        <i class="bi ${isInactive ? 'bi-toggle-off fs-5 text-danger' : 'bi-toggle-on fs-5 text-success'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1"
                            onclick="window.openModalCatIdx(${idx}, '${alcance}')">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-link text-danger p-0 border-0 ms-1" onclick="window.deleteCat(${c.IdDatosUnidadAloj})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

window.openModalCatIdx = (idx, alcance) => {
    const list = alcance === 'inicio' ? currentVarsInicio : currentVarsDatos;
    const c = list[idx];
    if (!c) {
        return;
    }
    window.openModalCat(
        c.IdDatosUnidadAloj,
        c.NombreCatAlojUnidad,
        c.TipoDeDato,
        c.dependencia_id || '',
        c.DetalleCatAloj || '',
        c.Habilitado,
        alcance,
        c.idprotA || '',
    );
};

window.openModalType = (id = '', name = '', detail = '', status = 1) => {
    document.getElementById('form-type').reset();
    document.getElementById('type-id').value = id;
    document.getElementById('type-name').value = name;
    document.getElementById('type-detail').value = detail;

    const statusContainer = document.getElementById('type-status-container');
    const statusSelect = document.getElementById('type-habilitado');
    if (id !== '') {
        statusContainer.classList.remove('d-none');
        statusSelect.value = status;
    } else {
        statusContainer.classList.add('d-none');
    }
    new bootstrap.Modal(document.getElementById('modal-type')).show();
};

window.openModalCat = (
    id = '',
    name = '',
    type = '',
    parent = '',
    detail = '',
    status = 1,
    alcance = 'datos',
    idprotStored = '',
) => {
    document.getElementById('form-cat').reset();
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('cat-datatype').value = type || 'varchar';
    document.getElementById('cat-detail').value = detail;
    const alcEl = document.getElementById('cat-alcance');
    if (alcEl) {
        alcEl.value = alcance === 'inicio' ? 'inicio' : 'datos';
    }
    const protH = document.getElementById('cat-idprot');
    if (protH) {
        if (idprotStored !== '' && idprotStored !== null && idprotStored !== undefined) {
            protH.value = String(idprotStored);
        } else {
            protH.value = getProtSelectValue();
        }
    }

    const statusContainer = document.getElementById('cat-status-container');
    const statusSelect = document.getElementById('cat-habilitado');
    if (id !== '') {
        statusContainer.classList.remove('d-none');
        statusSelect.value = status;
    } else {
        statusContainer.classList.add('d-none');
    }

    const parentList = alcance === 'inicio' ? currentVarsInicio : currentVarsDatos;
    const sel = document.getElementById('cat-parent');
    sel.innerHTML = '<option value="">-- Ninguna --</option>';
    parentList.forEach((c) => {
        if (c.IdDatosUnidadAloj != id) {
            const selected = c.IdDatosUnidadAloj == parent ? 'selected' : '';
            sel.innerHTML += `<option value="${c.IdDatosUnidadAloj}" ${selected}>${c.NombreCatAlojUnidad}</option>`;
        }
    });
    new bootstrap.Modal(document.getElementById('modal-cat')).show();
};

window.openModalCatNew = (alcance) => {
    if ((alcance === 'inicio' || alcance === 'datos') && !ensureProtocolSelectedOrWarn()) {
        return;
    }
    window.openModalCat('', '', 'varchar', '', '', 1, alcance, '');
};

window.openImportCloneTraz = async (alcanceDest) => {
    const t = txtCfg();
    const destProt = getProtSelectValue();
    if (!ensureProtocolSelectedOrWarn()) {
        return;
    }
    if (!currentSpeciesId) {
        return;
    }
    const destProtPayload = destProt === '' ? null : parseInt(destProt, 10);
    const protQ = destProt ? `&prot=${encodeURIComponent(destProt)}` : '';
    let pool = [];
    try {
        const rPool = await API.request(
            `/admin/config/alojamiento/cat/pool-traer?esp=${encodeURIComponent(String(currentSpeciesId))}&alcance=${encodeURIComponent(alcanceDest)}${protQ}`,
        );
        if (rPool.status !== 'success' || !Array.isArray(rPool.data)) {
            throw new Error(rPool.message || t.clone_err_load || 'Error');
        }
        pool = rPool.data;
    } catch (e) {
        Swal.fire({ icon: 'error', title: t.clone_err || 'Error', text: String(e.message || e) });
        return;
    }

    const checksHtml = pool.length
        ? pool
              .map(
                  (c) =>
                      `<div class="form-check"><input class="form-check-input cl-pick" type="checkbox" value="${c.IdDatosUnidadAloj}" id="clc${c.IdDatosUnidadAloj}"><label class="form-check-label" for="clc${c.IdDatosUnidadAloj}"><span class="fw-semibold">${escAttr(c.NombreCatAlojUnidad)}</span> <span class="text-muted">(${escAttr(c.TipoDeDato)})</span></label></div>`,
              )
              .join('')
        : `<p class="text-muted mb-0 small">${escAttr(t.clone_empty_pool || t.clone_empty_src || '')}</p>`;

    const html = `
      <div class="text-start small">
        <p class="text-muted mb-2">${escAttr(t.clone_pool_hint || '')}</p>
        <div class="d-flex flex-wrap gap-2 mb-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" id="cl-sel-all">${escAttr(t.clone_select_all || '')}</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="cl-sel-none">${escAttr(t.clone_clear || '')}</button>
        </div>
        <div id="cl-cbs" class="border rounded p-2 bg-light" style="max-height:min(360px,55vh);overflow:auto;">${checksHtml}</div>
      </div>`;

    const result = await Swal.fire({
        title: t.clone_title || 'Traer datos',
        html,
        showCancelButton: true,
        confirmButtonText: t.clone_confirm_add || t.clone_ok || 'Agregar',
        width: 'min(40rem,96vw)',
        didOpen: () => {
            const all = () => document.querySelectorAll('.cl-pick');
            const btnAll = document.getElementById('cl-sel-all');
            const btnNone = document.getElementById('cl-sel-none');
            if (btnAll) {
                btnAll.onclick = () => all().forEach((x) => {
                    x.checked = true;
                });
            }
            if (btnNone) {
                btnNone.onclick = () => all().forEach((x) => {
                    x.checked = false;
                });
            }
        },
        preConfirm: () => {
            const ids = [...document.querySelectorAll('.cl-pick:checked')].map((x) => parseInt(x.value, 10));
            if (!ids.length) {
                Swal.showValidationMessage(t.clone_pick_one || 'Seleccione al menos una variable.');
                return false;
            }
            return { ids };
        },
    });
    if (!result.isConfirmed || !result.value?.ids?.length) {
        return;
    }
    try {
        const res = await API.request('/admin/config/alojamiento/cat/clone-traz', 'POST', {
            destIdEspA: currentSpeciesId,
            destIdprotA: destProtPayload,
            destAlcance: alcanceDest,
            sourceIds: result.value.ids,
        });
        if (res.status === 'success') {
            const nue = res.data?.nuevos ?? 0;
            const om = res.data?.omitidos ?? 0;
            const parts = [`${nue} ${t.clone_ok_vars || 'variables nuevas'}`];
            if (om > 0) {
                parts.push(`${om} ${t.clone_skipped_dup || 'omitidas (ya existían)'}`);
            }
            Swal.fire({ title: t.clone_ok || 'Listo', text: parts.join(' · '), icon: 'success', timer: 2200, showConfirmButton: false });
            loadDetails();
        } else {
            throw new Error(res.message);
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: t.clone_err || 'Error', text: String(e.message || e) });
    }
};

async function saveHousingType(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('idespA', currentSpeciesId);
    try {
        const res = await API.request('/admin/config/alojamiento/type/save', 'POST', fd);
        if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-type')).hide();
            loadDetails();
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo guardar', 'error');
    }
}

async function saveClinicalVar(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('IdEspA', currentSpeciesId);
    const protH = document.getElementById('cat-idprot');
    const alcH = document.getElementById('cat-alcance');
    if (protH) {
        fd.set('idprotA', protH.value || '');
    }
    if (alcH) {
        fd.set('alcance_traz', alcH.value === 'inicio' ? 'inicio' : 'datos');
    }
    try {
        const res = await API.request('/admin/config/alojamiento/cat/save', 'POST', fd);
        if (res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-cat')).hide();
            loadDetails();
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo guardar', 'error');
    }
}

window.toggleType = async (id, currentStatus) => {
    const newStatus = currentStatus == 2 ? 1 : 2;
    try {
        const res = await API.request('/admin/config/alojamiento/type/toggle', 'POST', { id, status: newStatus });
        if (res.status === 'success') {
            loadDetails();
        }
    } catch (e) {
        console.error(e);
    }
};

window.deleteType = async (id) => {
    if (
        (
            await Swal.fire({
                title: '¿Eliminar?',
                text: 'Si está en uso, deberá desactivarlo.',
                icon: 'warning',
                showCancelButton: true,
            })
        ).isConfirmed
    ) {
        try {
            const res = await API.request('/admin/config/alojamiento/type/delete', 'POST', { id });
            if (res.status === 'success') {
                loadDetails();
                Swal.fire('Eliminado', 'Tipo borrado correctamente.', 'success');
            } else {
                Swal.fire('Atención', res.message, 'warning');
            }
        } catch (e) {
            Swal.fire('Error', 'No se pudo eliminar.', 'error');
        }
    }
};

window.toggleCat = async (id, currentStatus) => {
    const newStatus = currentStatus == 2 ? 1 : 2;
    try {
        const res = await API.request('/admin/config/alojamiento/cat/toggle', 'POST', { id, status: newStatus });
        if (res.status === 'success') {
            loadDetails();
        }
    } catch (e) {
        console.error(e);
    }
};

window.deleteCat = async (id) => {
    if (
        (
            await Swal.fire({
                title: '¿Eliminar?',
                text: 'Si tiene datos históricos, deberá desactivarla.',
                icon: 'warning',
                showCancelButton: true,
            })
        ).isConfirmed
    ) {
        try {
            const res = await API.request('/admin/config/alojamiento/cat/delete', 'POST', { id });
            if (res.status === 'success') {
                loadDetails();
                Swal.fire('Eliminado', 'Variable borrada.', 'success');
            } else {
                Swal.fire('Atención', res.message, 'warning');
            }
        } catch (e) {
            Swal.fire('Error', 'No se pudo eliminar.', 'error');
        }
    }
};
