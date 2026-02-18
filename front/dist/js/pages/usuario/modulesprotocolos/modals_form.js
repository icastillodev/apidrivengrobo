import { store } from './store.js';
import { fetchSpeciesDetails, loadData } from './api_service.js';
import { API } from '../../../api.js';
import { Auth } from '../../../auth.js';

// ... (saveProtocol IGUAL AL ANTERIOR, NO CAMBIA) ...
export async function saveProtocol(e) { e.preventDefault(); const fd = new FormData(e.target); const userId = Auth.getVal('userId'); if (!userId) { window.Swal.fire('Error de Sesión', 'No se pudo identificar al usuario. Intente recargar.', 'error'); return; } fd.append('currentUserId', userId); if(!fd.get('IdInstitucion')) { fd.append('IdInstitucion', Auth.getVal('instId')); } const isUpdate = fd.get('idprotA') ? true : false; const url = isUpdate ? '/user/protocols/update-internal' : '/user/protocols/create-internal'; try { const res = await API.request(url, 'POST', fd); if(res.status==='success') { bootstrap.Modal.getInstance(document.getElementById('modal-new-prot')).hide(); window.Swal.fire('Éxito', 'Solicitud procesada correctamente.', 'success'); loadData(); } else { window.Swal.fire('Error', res.message, 'error'); } } catch(e) { console.error(e); } }

export function openNewProtocolModal() {
    prepareModal('NUEVA SOLICITUD INTERNA', false);
    document.getElementById('form-new-prot').reset();
    document.getElementById('edit-prot-id').value = "";
    document.getElementById('external-inst-selector').classList.add('d-none');
    document.getElementById('external-mode-flag').value = "0";
    
    // Interna: Usar InstID de sesión
    document.getElementById('form-inst-id').value = Auth.getVal('instId');
    document.getElementById('user-info-badge').classList.remove('d-none');
    
    // Cargar selects desde caché (que es la inst local)
    fillFormSelects(store.formDataCache);
    document.getElementById('new-species-container').innerHTML = '';
    addNewSpeciesRow();
    
    new bootstrap.Modal(document.getElementById('modal-new-prot')).show();
}

export function openCreateExternalModal() {
    prepareModal('SOLICITUD EN OTRA INSTITUCIÓN (RED)', false);
    document.getElementById('form-new-prot').reset();
    document.getElementById('edit-prot-id').value = "";
    document.getElementById('external-inst-selector').classList.remove('d-none');
    document.getElementById('external-mode-flag').value = "1";
    document.getElementById('user-info-badge').classList.remove('d-none');
    
    const sel = document.getElementById('select-target-inst');
    sel.innerHTML = '<option value="">-- Seleccione Institución --</option>';
    if(store.formDataCache.network_institutions) {
        store.formDataCache.network_institutions.forEach(i => sel.innerHTML += `<option value="${i.IdInstitucion}">${i.NombreInst}</option>`);
    }
    
    // Limpiar selects dependientes
    fillSelect('new-depto', [], '', ''); 
    fillSelect('new-tipo', [], '', ''); 
    fillSelect('new-sev', [], '', ''); 
    
    // LISTENER PARA RECARGAR TIPOS AL CAMBIAR INSTITUCIÓN
    sel.onchange = function() {
        const targetId = this.value;
        if(targetId) loadExternalConfig(targetId);
    };
    
    document.getElementById('new-species-container').innerHTML = '';
    new bootstrap.Modal(document.getElementById('modal-new-prot')).show();
}

// ESTA FUNCIÓN TRAE LOS TIPOS DE LA INSTITUCIÓN SELECCIONADA
export async function loadExternalConfig(targetInstId) {
    if(!targetInstId) return;
    document.getElementById('form-inst-id').value = targetInstId;
    
    // Indicador visual de carga en los selects
    const loadingOpt = '<option>Cargando datos...</option>';
    document.getElementById('new-depto').innerHTML = loadingOpt;
    document.getElementById('new-tipo').innerHTML = loadingOpt;
    
    try {
        // Llama al backend pidiendo config de la ID externa
        const res = await API.request(`/user/protocols/config?inst=${targetInstId}`);
        const conf = res.data;
        
        // Llena los selects con los datos de esa institución
        fillFormSelects(conf);
        
        store.externalSpecies = conf.species;
        document.getElementById('new-species-container').innerHTML = '';
        addNewSpeciesRow(true);
    } catch(e){ console.error(e); }
}

// ... (Resto de funciones igual: openEditProtocolModal, etc.) ...
export async function openEditProtocolModal(id) { const p = store.allData.my.find(x => x.idprotA == id); if(!p) return; prepareModal('CORREGIR SOLICITUD', true); document.getElementById('external-inst-selector').classList.add('d-none'); document.getElementById('edit-prot-id').value = p.idprotA; document.getElementById('form-inst-id').value = Auth.getVal('instId'); document.getElementById('inp-titulo').value = p.tituloA; document.getElementById('inp-nprot').value = p.nprotA; document.getElementById('inp-inv').value = p.InvestigadorACargA; document.getElementById('inp-cant').value = p.CantidadAniA; document.getElementById('inp-ini').value = p.FechaIniProtA; document.getElementById('inp-fin').value = p.Vencimiento; fillFormSelects(store.formDataCache); if(p.departamento) document.getElementById('new-depto').value = p.departamento; if(p.tipoprotocolo) document.getElementById('new-tipo').value = p.tipoprotocolo; if(p.severidad) document.getElementById('new-sev').value = p.severidad; const container = document.getElementById('new-species-container'); container.innerHTML = ''; const species = await fetchSpeciesDetails(id); if(species.length > 0) { species.forEach(e => createSpeciesRow(container, store.formDataCache.species, e.idespA)); } else { addNewSpeciesRow(); } new bootstrap.Modal(document.getElementById('modal-new-prot')).show(); }
export function addNewSpeciesRow(useExternal = false) { const container = document.getElementById('new-species-container'); const list = useExternal ? store.externalSpecies : store.formDataCache.species; createSpeciesRow(container, list); }
function createSpeciesRow(container, list, selectedId = null) { const opts = list ? list.map(e => `<option value="${e.idespA}" ${e.idespA == selectedId ? 'selected' : ''}>${e.EspeNombreA}</option>`).join('') : ''; const div = document.createElement('div'); div.className='row g-2 mb-2 species-row'; div.innerHTML = `<div class="col-10"><select name="especies[]" class="form-select form-select-sm" required><option value="">-- Seleccionar --</option>${opts}</select></div><div class="col-2"><button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="this.closest('.species-row').remove()">X</button></div>`; container.appendChild(div); }
function prepareModal(title, isEdit) { document.getElementById('modal-new-prot-title').innerText = title; const alert = document.getElementById('alert-edit-mode'); const btn = document.getElementById('btn-save-prot'); if(isEdit) { alert.classList.remove('d-none'); btn.innerText = "REENVIAR CORRECCIÓN"; btn.classList.replace('btn-primary', 'btn-warning'); } else { alert.classList.add('d-none'); btn.innerText = "ENVIAR SOLICITUD"; btn.classList.replace('btn-warning', 'btn-primary'); } }
function fillFormSelects(conf) { fillSelect('new-depto', conf.depts, 'iddeptoA', 'NombreDeptoA'); fillSelect('new-tipo', conf.types, 'idtipoprotocolo', 'NombreTipoprotocolo'); fillSelect('new-sev', conf.severities, 'IdSeveridadTipo', 'NombreSeveridad'); }
function fillSelect(id, data, val, txt) { const s = document.getElementById(id); s.innerHTML = '<option value="">-- Seleccionar --</option>'; if(data) data.forEach(i => s.innerHTML += `<option value="${i[val]}">${i[txt]}</option>`); }