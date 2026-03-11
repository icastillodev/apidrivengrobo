import { API } from '../../../api.js';

let fullData = [];
let cepasCache = {};
let cepasInlineOpen = {};

export async function initConfigEspecies() {
    loadData();
    document.getElementById('form-especie').onsubmit = saveEspecie;
    document.getElementById('form-subespecie').onsubmit = saveSubespecie;
    const formCepa = document.getElementById('form-cepa');
    if (formCepa) formCepa.onsubmit = saveCepa;
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        // Timestamp para evitar caché
        const res = await API.request(`/admin/config/especies/all?inst=${instId}&t=${Date.now()}`);
        if (res.status === 'success') {
            fullData = res.data;
            renderTree();
        }
    } catch (e) { 
        console.error("Error al cargar especies:", e); 
    }
}

function renderTree() {
    const container = document.getElementById('especies-container');
    container.innerHTML = '';

    if (fullData.length === 0) {
        container.innerHTML = '<div class="alert alert-light border text-center p-5 shadow-sm"><h5><i class="bi bi-box-seam me-2"></i>Catálogo Vacío</h5><p class="text-muted">Comience agregando una nueva especie (Ej: Ratón).</p></div>';
        return;
    }

    fullData.forEach(esp => {
        // Especie Deshabilitada (Habilitado == 2)
        const isEspInactive = (esp.Habilitado == 2);
        const cardClass = isEspInactive ? "card border-0 shadow-sm mb-4 opacity-75" : "card border-0 shadow-sm mb-4";
        const headerClass = isEspInactive ? "card-header bg-light border-bottom py-3" : "card-header bg-white border-bottom py-3";

        const card = document.createElement('div');
        card.className = cardClass;
        
        const subRows = esp.subespecies.map(s => {
            // Subespecie Deshabilitada (Existe == 2)
            const isInactive = (s.Existe == 2);
            const medidaTexto = `${s.SubEspCantidad || 1} ${s.SubEspTipo || 'Unid.'}`;
            
            return `
            <tr class="${isInactive ? 'bg-light text-muted' : ''}">
                <td class="ps-4 fw-bold">
                    ${isInactive ? '<i class="bi bi-circle text-muted me-2" style="font-size:10px;"></i>' : '<i class="bi bi-circle-fill text-success me-2" style="font-size:10px;"></i>'} 
                    <div>${s.SubEspeNombreA}</div>
                    <div class="mt-1 ms-4 d-flex gap-2 flex-wrap">
                        <button class="btn btn-xs btn-outline-primary py-0 px-2 fw-bold"
                                style="font-size:10px;"
                                onclick="window.toggleCepasInline(${s.idsubespA})"
                                title="${(window.txt?.config_especies?.btn_cepas) || 'Cepas'}">
                            <i class="bi bi-list-ul me-1"></i> ${(window.txt?.config_especies?.btn_cepas) || 'Cepas'}
                        </button>
                        <button class="btn btn-xs btn-outline-success py-0 px-2 fw-bold"
                                style="font-size:10px;"
                                onclick="window.openModalCepas(${s.idsubespA})"
                                title="${(window.txt?.config_especies?.btn_agregar_cepa) || 'Agregar'}">
                            <i class="bi bi-plus-circle me-1"></i> ${(window.txt?.config_especies?.btn_agregar_cepa) || 'Agregar'}
                        </button>
                    </div>
                </td>
                <td class="text-center small font-monospace">${medidaTexto}</td>
                <td class="text-center">
                    <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} rounded-pill" style="font-size: 10px; font-weight: normal; width: 80px;">
                        ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border-0" 
                            onclick="window.toggleSub(${s.idsubespA}, ${s.Existe})" 
                            title="${isInactive ? 'Activar' : 'Desactivar'}">
                        <i class="bi ${isInactive ? 'bi-toggle-off fs-5' : 'bi-toggle-on fs-5'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1" 
                            onclick="window.openModalSub(${esp.idespA}, ${s.idsubespA}, '${s.SubEspeNombreA}', ${s.Existe}, '${s.SubEspTipo || ''}', ${s.SubEspCantidad || 1})">
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1" 
                            onclick="window.deleteSubespecie(${s.idsubespA})"
                            title="${(window.txt?.config_especies?.btn_eliminar_subespecie) || 'Eliminar'}">
                        <i class="bi bi-trash text-danger"></i>
                    </button>
                </td>
            </tr>
            <tr id="cepas-inline-row-${s.idsubespA}" class="${isInactive ? 'bg-light' : ''}" style="display:none;">
                <td colspan="4" class="ps-5 pe-4 py-2">
                    <div id="cepas-inline-${s.idsubespA}" class="border rounded bg-white p-2"></div>
                </td>
            </tr>`;
        }).join('');

        card.innerHTML = `
            <div class="${headerClass} d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <span class="badge bg-dark me-3 rounded-pill">${esp.idespA}</span>
                    <div>
                        <h5 class="mb-0 fw-bold text-dark text-uppercase">${esp.EspeNombreA}</h5>
                        ${isEspInactive ? '<span class="badge bg-danger ms-1" style="font-size:9px">DESHABILITADO</span>' : ''}
                    </div>
                </div>
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-light border fw-bold text-success" onclick="window.openModalSub(${esp.idespA})">
                        <i class="bi bi-plus-lg me-1"></i> ${(window.txt?.config_especies?.btn_agregar_categoria) || 'Categoría de especie'}
                    </button>
                    <button class="btn btn-sm btn-light border" onclick="window.openModalEspecie(${esp.idespA}, '${esp.EspeNombreA}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm ${isEspInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border" 
                            onclick="window.toggleEsp(${esp.idespA}, ${esp.Habilitado || 1})"
                            title="${isEspInactive ? 'Activar especie' : 'Desactivar especie'}">
                        <i class="bi ${isEspInactive ? 'bi-toggle-off fs-5' : 'bi-toggle-on fs-5'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border text-danger" onclick="window.deleteEspecie(${esp.idespA})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" style="font-size: 13px;">
                    <thead class="bg-light text-muted text-uppercase small">
                        <tr>
                            <th class="ps-4">${(window.txt?.config_especies?.th_categoria_cepa) || 'Categoría de especie'}</th>
                            <th class="text-center">Unidad Ref.</th>
                            <th class="text-center">Estado</th>
                            <th class="text-end pe-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subRows || `<tr><td colspan="4" class="text-center py-4 text-muted small fst-italic">${(window.txt?.config_especies?.empty_categorias) || 'No hay categorías registradas.'}</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- MODALES ---

window.openModalEspecie = (id = "", nombre = "") => {
    document.getElementById('esp-id').value = id;
    document.getElementById('esp-nombre').value = nombre;
    new bootstrap.Modal(document.getElementById('modal-especie')).show();
};

window.openModalSub = (espId, subId = "", nombre = "", estado = 1, tipo = "", cantidad = 1) => {
    document.getElementById('sub-esp-id-parent').value = espId;
    document.getElementById('sub-id').value = subId;
    document.getElementById('sub-nombre').value = nombre;
    document.getElementById('sub-tipo').value = tipo;
    document.getElementById('sub-cantidad').value = cantidad;

    const stateContainer = document.getElementById('sub-status-container');
    if (subId !== "") {
        stateContainer.innerHTML = `
            <label class="form-label small fw-bold">ESTADO</label>
            <select name="Existe" class="form-select fw-bold">
                <option value="1" ${estado != 2 ? 'selected' : ''}>ACTIVO</option>
                <option value="2" ${estado == 2 ? 'selected' : ''}>INACTIVO</option>
            </select>
        `;
    } else {
        stateContainer.innerHTML = '';
    }

    new bootstrap.Modal(document.getElementById('modal-subespecie')).show();
};

window.openModalCepas = async (idSubespA) => {
    document.getElementById('cepa-id-sub').value = idSubespA;
    document.getElementById('cepa-nombre').value = '';
    await loadCepas(idSubespA);
    new bootstrap.Modal(document.getElementById('modal-cepas')).show();
};

async function loadCepas(idSubespA) {
    const listEl = document.getElementById('cepas-list');
    const t = window.txt?.config_especies;
    if (!listEl) return;
    listEl.innerHTML = `<div class="text-center text-muted small py-3">${t?.cargando || 'Cargando...'}</div>`;
    try {
        const res = await API.request(`/admin/config/cepas/all?idsubespA=${idSubespA}&t=${Date.now()}`);
        if (res.status === 'success') {
            cepasCache[idSubespA] = res.data || [];
            renderCepasList(idSubespA);
        } else {
            listEl.innerHTML = `<div class="text-center text-danger small py-3">${t?.error || 'Error'}</div>`;
        }
    } catch (e) {
        console.error(e);
        listEl.innerHTML = `<div class="text-center text-danger small py-3">${t?.error_conexion || 'Error de conexión'}</div>`;
    }
}

function renderCepasList(idSubespA) {
    const listEl = document.getElementById('cepas-list');
    const t = window.txt?.config_especies;
    if (!listEl) return;
    const items = Array.isArray(cepasCache[idSubespA]) ? cepasCache[idSubespA] : [];
    if (!items.length) {
        listEl.innerHTML = `<div class="text-center text-muted small py-3">${t?.empty_cepas || 'No hay cepas registradas.'}</div>`;
        return;
    }
    listEl.innerHTML = items.map(c => {
        const hab = Number(c.Habilitado || 0) === 1;
        const badge = hab ? 'bg-success' : 'bg-secondary';
        const label = hab ? (t?.activo || 'ACTIVO') : (t?.inactivo || 'INACTIVO');
        const btnTitle = hab ? (t?.deshabilitar || 'Deshabilitar') : (t?.habilitar || 'Habilitar');
        const next = hab ? 0 : 1;
        return `
            <div class="d-flex align-items-center justify-content-between border-bottom py-2">
                <div class="fw-bold">${c.CepaNombreA || ''}</div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge ${badge} rounded-pill" style="font-size:10px; width: 80px;">${label}</span>
                    <button class="btn btn-sm ${hab ? 'btn-outline-secondary' : 'btn-outline-success'}" 
                            onclick="window.toggleCepa(${c.idcepaA}, ${next})"
                            title="${btnTitle}">
                        <i class="bi ${hab ? 'bi-toggle-on' : 'bi-toggle-off'}"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleCepasInline = async (idSubespA) => {
    const row = document.getElementById(`cepas-inline-row-${idSubespA}`);
    if (!row) return;
    const isOpen = !!cepasInlineOpen[idSubespA];
    if (isOpen) {
        row.style.display = 'none';
        cepasInlineOpen[idSubespA] = false;
        return;
    }
    cepasInlineOpen[idSubespA] = true;
    row.style.display = '';
    await loadCepasInline(idSubespA);
};

async function loadCepasInline(idSubespA) {
    const box = document.getElementById(`cepas-inline-${idSubespA}`);
    const t = window.txt?.config_especies;
    if (!box) return;
    box.innerHTML = `<div class="text-center text-muted small py-2">${t?.cargando || 'Cargando...'}</div>`;
    try {
        const res = await API.request(`/admin/config/cepas/all?idsubespA=${idSubespA}&t=${Date.now()}`);
        if (res.status === 'success') {
            cepasCache[idSubespA] = res.data || [];
            renderCepasInline(idSubespA);
        } else {
            box.innerHTML = `<div class="text-center text-danger small py-2">${t?.error || 'Error'}</div>`;
        }
    } catch (e) {
        console.error(e);
        box.innerHTML = `<div class="text-center text-danger small py-2">${t?.error_conexion || 'Error de conexión'}</div>`;
    }
}

function renderCepasInline(idSubespA) {
    const box = document.getElementById(`cepas-inline-${idSubespA}`);
    const t = window.txt?.config_especies;
    if (!box) return;
    const items = Array.isArray(cepasCache[idSubespA]) ? cepasCache[idSubespA] : [];
    if (!items.length) {
        box.innerHTML = `<div class="text-muted small">${t?.empty_cepas || 'No hay cepas registradas.'}</div>`;
        return;
    }
    box.innerHTML = items.map(c => {
        const hab = Number(c.Habilitado || 0) === 1;
        const next = hab ? 0 : 1;
        return `
            <div class="cepas-inline-item d-flex align-items-center justify-content-between py-1 border-bottom">
                <div class="cepas-inline-name small fw-bold">${c.CepaNombreA || ''}</div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge ${hab ? 'bg-success' : 'bg-secondary'} rounded-pill" style="font-size:10px; width: 80px;">${hab ? (t?.activo || 'ACTIVO') : (t?.inactivo || 'INACTIVO')}</span>
                    <button class="btn btn-sm ${hab ? 'btn-outline-secondary' : 'btn-outline-success'}"
                            style="padding: 1px 6px;"
                            onclick="window.toggleCepaInline(${idSubespA}, ${c.idcepaA}, ${next})"
                            title="${hab ? (t?.deshabilitar || 'Deshabilitar') : (t?.habilitar || 'Habilitar')}">
                        <i class="bi ${hab ? 'bi-toggle-on' : 'bi-toggle-off'}"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// --- GUARDAR ---

async function saveEspecie(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', localStorage.getItem('instId')); // Importante para insertar
    
    try {
        const res = await API.request('/admin/config/especies/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            loadData();
            bootstrap.Modal.getInstance(document.getElementById('modal-especie')).hide();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
}

async function saveSubespecie(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    try {
        const res = await API.request('/admin/config/subespecies/save', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
            loadData();
            bootstrap.Modal.getInstance(document.getElementById('modal-subespecie')).hide();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) { Swal.fire('Error', 'Fallo de conexión', 'error'); }
}

async function saveCepa(e) {
    e.preventDefault();
    const idSubespA = document.getElementById('cepa-id-sub').value;
    const nombre = document.getElementById('cepa-nombre').value;
    const t = window.txt?.config_especies;
    try {
        const fd = new FormData();
        fd.append('idsubespA', idSubespA);
        fd.append('CepaNombreA', nombre);
        const res = await API.request('/admin/config/cepas/save', 'POST', fd);
        if (res.status === 'success') {
            document.getElementById('cepa-nombre').value = '';
            await loadCepas(idSubespA);
            if (cepasInlineOpen[idSubespA]) {
                await loadCepasInline(idSubespA);
            }
        } else {
            Swal.fire(t?.error || 'Error', res.message || (t?.error_guardar_cepa || 'No se pudo guardar la cepa.'), 'error');
        }
    } catch (err) {
        Swal.fire(t?.error || 'Error', t?.error_conexion || 'Error de conexión', 'error');
    }
}

window.toggleCepa = async (idcepaA, status) => {
    const idSubespA = document.getElementById('cepa-id-sub').value;
    const t = window.txt?.config_especies;
    try {
        const fd = new FormData();
        fd.append('idcepaA', idcepaA);
        fd.append('Habilitado', status);
        const res = await API.request('/admin/config/cepas/toggle', 'POST', fd);
        if (res.status === 'success') {
            await loadCepas(idSubespA);
        } else {
            Swal.fire(t?.error || 'Error', res.message || (t?.error_toggle_cepa || 'No se pudo cambiar el estado de la cepa.'), 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire(t?.error || 'Error', t?.error_conexion || 'Error de conexión', 'error');
    }
};

window.toggleCepaInline = async (idSubespA, idcepaA, status) => {
    const t = window.txt?.config_especies;
    try {
        const fd = new FormData();
        fd.append('idcepaA', idcepaA);
        fd.append('Habilitado', status);
        const res = await API.request('/admin/config/cepas/toggle', 'POST', fd);
        if (res.status === 'success') {
            await loadCepasInline(idSubespA);
        } else {
            Swal.fire(t?.error || 'Error', res.message || (t?.error_toggle_cepa || 'No se pudo cambiar el estado de la cepa.'), 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire(t?.error || 'Error', t?.error_conexion || 'Error de conexión', 'error');
    }
};

window.toggleSub = async (id, currentStatus) => {
    // Si es 2 (Inactivo) pasa a 1 (Activo), sino a 2
    const newStatus = (currentStatus == 2) ? 1 : 2; 
    const fd = new FormData();
    fd.append('idSub', id);
    fd.append('status', newStatus);

    try {
        const res = await API.request('/admin/config/subespecies/toggle', 'POST', fd);
        if (res.status === 'success') loadData();
    } catch (e) { console.error(e); }
};

window.deleteEspecie = async (id) => {
    const t = window.txt?.config_especies;
    const confirm = await Swal.fire({
        title: t?.confirm_eliminar_esp_titulo || '¿Eliminar Especie?',
        text: t?.confirm_eliminar_esp_texto || 'Se eliminará o desactivará si tiene datos asociados.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: t?.btn_eliminar || 'Eliminar'
    });

    if (!confirm.isConfirmed) return;

    try {
        const fd = new FormData();
        fd.append('idEsp', id);
        const res = await API.request('/admin/config/especies/delete', 'POST', fd);
        if (res.status === 'success') {
            const msg = res.mode === 'deactivated' ? (t?.esp_desactivada || 'Especie desactivada por tener historial.') : (t?.esp_eliminada || 'Especie eliminada permanentemente.');
            Swal.fire(t?.procesado || 'Procesado', msg, 'success');
            loadData();
        } else {
            Swal.fire(t?.error || 'Error', res.message, 'error');
        }
    } catch (e) { Swal.fire(t?.error || 'Error', t?.error_conexion || 'Error de conexión', 'error'); }
};

window.deleteSubespecie = async (idSub) => {
    const t = window.txt?.config_especies;
    const confirm = await Swal.fire({
        title: t?.confirm_eliminar_sub_titulo || '¿Eliminar subespecie?',
        text: t?.confirm_eliminar_sub_texto || 'Se borrará de forma permanente. Si tiene formularios asociados no se podrá eliminar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: t?.btn_eliminar_subespecie || 'Eliminar'
    });

    if (!confirm.isConfirmed) return;

    try {
        const fd = new FormData();
        fd.append('idSub', idSub);
        const res = await API.request('/admin/config/subespecies/delete', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire({ title: t?.success_eliminar_sub || 'Subespecie eliminada.', icon: 'success', timer: 1500, showConfirmButton: false });
            loadData();
        } else {
            Swal.fire(t?.error || 'Error', res.message || (t?.error_eliminar_sub || 'No se pudo eliminar la subespecie.'), 'error');
        }
    } catch (e) {
        Swal.fire(t?.error || 'Error', t?.error_eliminar_sub || 'No se pudo eliminar la subespecie.', 'error');
    }
};

window.toggleEsp = async (id, currentStatus) => {
    // Si está inactiva (2) pasa a 1 (activa); si no, a 2
    const newStatus = (String(currentStatus) === "2") ? 1 : 2;
    const fd = new FormData();
    fd.append('idEsp', id);
    fd.append('status', newStatus);

    try {
        const res = await API.request('/admin/config/especies/toggle', 'POST', fd);
        if (res.status === 'success') {
            loadData();
        } else {
            Swal.fire('Error', res.message || 'No se pudo cambiar el estado de la especie.', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
};