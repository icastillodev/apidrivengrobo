import { API } from '../../../api.js';

let currentSpeciesId = null;
let currentSpeciesName = "";
let currentClinicalVars = []; 

export function initConfigAlojamientos() {
    loadSpeciesList();
    document.getElementById('form-type').onsubmit = saveHousingType;
    document.getElementById('form-cat').onsubmit = saveClinicalVar;
}

// 1. CARGA LISTA IZQUIERDA
async function loadSpeciesList() {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('list-species');
    container.innerHTML = '<div class="text-center p-3"><span class="spinner-border spinner-border-sm"></span></div>';

    try {
        const res = await API.request(`/admin/config/especies/all?inst=${instId}`);
        container.innerHTML = '';
        
        if (res.status === 'success' && res.data.length > 0) {
            res.data.forEach(esp => {
                if(esp.Habilitado != 2) {
                    const item = document.createElement('button');
                    item.className = 'list-group-item list-group-item-action species-item py-3';
                    item.innerHTML = `<div class="fw-bold text-uppercase">${esp.EspeNombreA}</div>`;
                    item.onclick = () => selectSpecies(esp.idespA, esp.EspeNombreA, item);
                    container.appendChild(item);
                }
            });
        } else {
            container.innerHTML = '<div class="p-3 text-muted small text-center">No hay especies activas.</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-danger p-3 small">Error al cargar especies.</div>';
    }
}

// 2. SELECCIÓN DE ESPECIE
function selectSpecies(id, name, element) {
    currentSpeciesId = id;
    currentSpeciesName = name;

    document.querySelectorAll('.species-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('config-panel').classList.remove('d-none');
    document.getElementById('lbl-selected-species').innerText = name;

    loadDetails();
}

// 3. CARGAR DETALLES
async function loadDetails() {
    if (!currentSpeciesId) return;
    
    document.getElementById('table-types').innerHTML = '<tr><td colspan="4" class="text-center py-3"><span class="spinner-border spinner-border-sm"></span></td></tr>';
    document.getElementById('table-clinical').innerHTML = '<tr><td colspan="5" class="text-center py-3"><span class="spinner-border spinner-border-sm"></span></td></tr>';

    try {
        const res = await API.request(`/admin/config/alojamiento/details?esp=${currentSpeciesId}&t=${Date.now()}`);
        if(res.status === 'success') {
            renderTypes(res.data.types);
            renderClinical(res.data.categories);
            currentClinicalVars = res.data.categories;
        }
    } catch (e) { console.error(e); }
}

// Helper para traducir tipos
function traducirTipoDato(tipo) {
    const diccionario = {
        'varchar': 'Texto Breve',
        'text':    'Texto Largo',
        'int':     'Num. Entero',
        'decimal': 'Num. Decimal',
        'date':    'Fecha',
        'bool':    'Sí / No'
    };
    return diccionario[tipo] || tipo;
}

// --- RENDERIZADO TIPOS ALOJAMIENTO ---
function renderTypes(list) {
    const tbody = document.getElementById('table-types');
    tbody.innerHTML = '';
    if(!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted small fst-italic py-3">Sin tipos definidos.</td></tr>';
        return;
    }
    
    list.forEach(t => {
        const isInactive = (t.Habilitado == 2);
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
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border-0" 
                            onclick="window.toggleType(${t.IdTipoAlojamiento}, ${t.Habilitado})" title="Habilitar/Deshabilitar">
                        <i class="bi ${isInactive ? 'bi-toggle-off fs-5' : 'bi-toggle-on fs-5'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1" 
                            onclick="window.openModalType(${t.IdTipoAlojamiento}, '${t.NombreTipoAlojamiento}', '${t.DetalleTipoAlojamiento || ''}', ${t.Habilitado})">
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

// --- RENDERIZADO VARIABLES CLINICAS ---
function renderClinical(list) {
    const tbody = document.getElementById('table-clinical');
    tbody.innerHTML = '';
    if(!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted small fst-italic py-3">Sin variables definidas.</td></tr>';
        return;
    }
    list.forEach(c => {
        let parentName = '-';
        if(c.dependencia_id) {
            const parent = list.find(p => p.IdDatosUnidadAloj == c.dependencia_id);
            if(parent) parentName = `<span class="badge bg-light text-secondary border">${parent.NombreCatAlojUnidad}</span>`;
        }

        const tipoHumano = traducirTipoDato(c.TipoDeDato);
        const isInactive = (c.Habilitado == 2);

        tbody.innerHTML += `
            <tr class="${isInactive ? 'bg-light text-muted' : ''}">
                <td class="fw-bold ${isInactive ? 'text-muted' : 'text-dark'}">${c.NombreCatAlojUnidad}</td>
                <td><span class="badge bg-info bg-opacity-10 text-info border border-info">${tipoHumano}</span></td>
                <td>${parentName}</td>
                <td class="text-center">
                    <span class="badge ${isInactive ? 'bg-secondary' : 'bg-success'} rounded-pill" style="font-size: 10px; width: 80px;">
                        ${isInactive ? 'INACTIVO' : 'ACTIVO'}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm ${isInactive ? 'btn-outline-success' : 'btn-outline-secondary'} border-0" 
                            onclick="window.toggleCat(${c.IdDatosUnidadAloj}, ${c.Habilitado})" title="Habilitar/Deshabilitar">
                        <i class="bi ${isInactive ? 'bi-toggle-off fs-5' : 'bi-toggle-on fs-5'}"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 ms-1" 
                            onclick="window.openModalCat(${c.IdDatosUnidadAloj}, '${c.NombreCatAlojUnidad}', '${c.TipoDeDato}', '${c.dependencia_id || ''}', '${c.DetalleCatAloj || ''}', ${c.Habilitado})">
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

// --- MODALES ---
window.openModalType = (id = '', name = '', detail = '', status = 1) => {
    document.getElementById('form-type').reset();
    document.getElementById('type-id').value = id;
    document.getElementById('type-name').value = name;
    document.getElementById('type-detail').value = detail;
    
    const statusContainer = document.getElementById('type-status-container');
    const statusSelect = document.getElementById('type-habilitado');
    if(id !== '') {
        statusContainer.classList.remove('d-none');
        statusSelect.value = status;
    } else {
        statusContainer.classList.add('d-none');
    }
    new bootstrap.Modal(document.getElementById('modal-type')).show();
};

window.openModalCat = (id = '', name = '', type = '', parent = '', detail = '', status = 1) => {
    document.getElementById('form-cat').reset();
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('cat-datatype').value = type || 'varchar';
    document.getElementById('cat-detail').value = detail;
    
    const statusContainer = document.getElementById('cat-status-container');
    const statusSelect = document.getElementById('cat-habilitado');
    if(id !== '') {
        statusContainer.classList.remove('d-none');
        statusSelect.value = status;
    } else {
        statusContainer.classList.add('d-none');
    }

    const sel = document.getElementById('cat-parent');
    sel.innerHTML = '<option value="">-- Ninguna --</option>';
    currentClinicalVars.forEach(c => {
        if(c.IdDatosUnidadAloj != id) {
            const selected = (c.IdDatosUnidadAloj == parent) ? 'selected' : '';
            sel.innerHTML += `<option value="${c.IdDatosUnidadAloj}" ${selected}>${c.NombreCatAlojUnidad}</option>`;
        }
    });
    new bootstrap.Modal(document.getElementById('modal-cat')).show();
};

// --- ACCIONES TIPO ---
async function saveHousingType(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('idespA', currentSpeciesId); 
    try {
        const res = await API.request('/admin/config/alojamiento/type/save', 'POST', fd);
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-type')).hide();
            loadDetails();
            Swal.fire({title:'Guardado', icon:'success', timer:1000, showConfirmButton:false});
        }
    } catch(err){ Swal.fire('Error', 'No se pudo guardar', 'error'); }
}

window.toggleType = async (id, currentStatus) => {
    const newStatus = (currentStatus == 2) ? 1 : 2;
    try {
        const res = await API.request('/admin/config/alojamiento/type/toggle', 'POST', { id, status: newStatus });
        if(res.status === 'success') loadDetails();
    } catch(e) { console.error(e); }
};

window.deleteType = async (id) => {
    if((await Swal.fire({title:'¿Eliminar?', text:"Si está en uso, deberá desactivarlo.", icon:'warning', showCancelButton:true})).isConfirmed) {
        try {
            const res = await API.request('/admin/config/alojamiento/type/delete', 'POST', { id });
            if(res.status === 'success') {
                loadDetails();
                Swal.fire('Eliminado', 'Tipo borrado correctamente.', 'success');
            } else {
                Swal.fire('Atención', res.message, 'warning'); // Mensaje de "En uso"
            }
        } catch(e) { Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
    }
}

// --- ACCIONES VARIABLES CLINICAS ---
async function saveClinicalVar(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('IdEspA', currentSpeciesId); 
    try {
        const res = await API.request('/admin/config/alojamiento/cat/save', 'POST', fd);
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-cat')).hide();
            loadDetails();
            Swal.fire({title:'Guardado', icon:'success', timer:1000, showConfirmButton:false});
        }
    } catch(err){ Swal.fire('Error', 'No se pudo guardar', 'error'); }
}

window.toggleCat = async (id, currentStatus) => {
    const newStatus = (currentStatus == 2) ? 1 : 2;
    try {
        const res = await API.request('/admin/config/alojamiento/cat/toggle', 'POST', { id, status: newStatus });
        if(res.status === 'success') loadDetails();
    } catch(e) { console.error(e); }
};

window.deleteCat = async (id) => {
    if((await Swal.fire({title:'¿Eliminar?', text:"Si tiene datos históricos, deberá desactivarla.", icon:'warning', showCancelButton:true})).isConfirmed) {
        try {
            const res = await API.request('/admin/config/alojamiento/cat/delete', 'POST', { id });
            if(res.status === 'success') {
                loadDetails();
                Swal.fire('Eliminado', 'Variable borrada.', 'success');
            } else {
                Swal.fire('Atención', res.message, 'warning'); // Mensaje de "En uso"
            }
        } catch(e) { Swal.fire('Error', 'No se pudo eliminar.', 'error'); }
    }
}